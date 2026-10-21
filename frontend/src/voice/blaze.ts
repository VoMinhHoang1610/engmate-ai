import { observeAudioLevel } from './visualLevel';
import { api, apiFetch } from '../api/database';
import { streamTurn } from '../api/chatStream';
import type { VoiceEvents, VoiceState } from './session';

interface BlazeVoiceOptions {
  language?: 'en' | 'vi';
  voiceEn?: string;
  voiceVi?: string;
  speed?: number;
  opening?: string;
}

const SAMPLE_RATE = 16000;
const FRAME_MS = 100;
const START_FRAMES = 2;
const SILENCE_FRAMES = 9;
const MAX_FRAMES = 300;
const PRE_ROLL_FRAMES = 3;
const RMS_THRESHOLD = 0.018;
const VIETNAMESE = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

function wav(frames: Int16Array[]): Blob {
  const length = frames.reduce((total, frame) => total + frame.length, 0);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  label(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  label(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, 'data');
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const frame of frames)
    for (const sample of frame) {
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  return new Blob([buffer], { type: 'audio/wav' });
}

function spokenChunks(text: string): string[] {
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, '')
    .trim();
  const result: string[] = [];
  // Sentence boundaries let Vietnamese explanations and English examples use their own voices.
  for (let sentence of plain.split(/(?<=[.!?…])\s+|\n+/).filter(Boolean)) {
    while (sentence.length > 2000) {
      const space = sentence.lastIndexOf(' ', 2000);
      const boundary = space > 0 ? space : 2000;
      result.push(sentence.slice(0, boundary));
      sentence = sentence.slice(boundary).trim();
    }
    if (sentence) {
      const previous = result.at(-1);
      if (
        previous &&
        previous.length + sentence.length + 1 <= 2000 &&
        VIETNAMESE.test(previous) === VIETNAMESE.test(sentence)
      )
        result[result.length - 1] += ` ${sentence}`;
      else result.push(sentence);
    }
  }
  return result;
}

/** Capture bounded speech turns; Gemini supplies text and Blaze alone supplies speech. */
export class BlazeVoiceSession {
  private context: AudioContext | null = null;
  private stopInputMeter: (() => void) | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private microphone: MediaStream | null = null;
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ended = true;
  private muted = false;
  private generation = 0;
  private turn = 0;
  private textActive = false;
  private cancellation: Promise<void> = Promise.resolve();
  private cancellationError: unknown;
  private preRoll: Int16Array[] = [];
  private frames: Int16Array[] = [];
  private voiced = 0;
  private silence = 0;
  private state: VoiceState = 'idle';

  constructor(
    private readonly identity: number,
    private readonly events: VoiceEvents,
    private readonly voiceId?: string,
    private readonly options: BlazeVoiceOptions = {},
  ) {}

  private status(state: VoiceState): void {
    this.state = state;
    this.events.state(state);
  }

  async start(): Promise<void> {
    if (!this.ended) return;
    this.ended = false;
    this.cancellationError = undefined;
    const generation = ++this.generation;
    this.status('connecting');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined')
        throw new Error('Trình duyệt chưa hỗ trợ microphone/Web Audio.');
      const context = new AudioContext();
      this.context = context;
      await context.resume();
      if (this.ended || generation !== this.generation) return;
      if (!context.audioWorklet || typeof AudioWorkletNode === 'undefined')
        throw new Error('Trình duyệt chưa hỗ trợ AudioWorklet. Hãy dùng HTTPS hoặc localhost.');
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (this.ended || generation !== this.generation) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      this.microphone = media;
      for (const track of media.getAudioTracks()) {
        track.enabled = !this.muted;
        track.onended = () => {
          if (!this.ended) void this.fail('Microphone đã ngắt kết nối.');
        };
      }
      await context.audioWorklet.addModule(new URL('./capture.worklet.js', import.meta.url));
      if (this.ended || generation !== this.generation) return;
      this.source = context.createMediaStreamSource(media);
      if (this.events.level)
        this.stopInputMeter = observeAudioLevel(context, this.source, (level) =>
          this.events.level?.(this.muted ? 0 : level, 'input'),
        );
      this.capture = new AudioWorkletNode(context, 'engmate-pcm');
      this.source.connect(this.capture);
      this.capture.connect(context.destination);
      this.capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (this.ended || generation !== this.generation || this.muted) return;
        this.receive(new Int16Array(event.data));
      };
      this.timer = setTimeout(
        () => void this.fail('Phiên thoại đã đủ 10 phút. Hãy bắt đầu phiên mới.'),
        600_000,
      );
      this.status('listening');
      if (this.options.opening) {
        const opening = new AbortController();
        this.controller = opening;
        this.events.transcript('assistant', this.options.opening);
        for (const chunk of spokenChunks(this.options.opening)) {
          if (opening.signal.aborted || this.ended) break;
          await this.speak(chunk, opening.signal);
        }
        if (this.controller === opening) {
          this.controller = null;
          if (!this.ended) this.status('listening');
        }
      }
    } catch (error) {
      if (this.ended || generation !== this.generation) return;
      await this.fail(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Bạn chưa cấp quyền microphone.'
          : error instanceof DOMException && error.name === 'NotFoundError'
            ? 'Không tìm thấy microphone.'
            : error instanceof Error
              ? error.message
              : 'Chưa bắt đầu được phiên thoại Blaze.',
      );
    }
  }

  private receive(frame: Int16Array): void {
    if (frame.length !== (SAMPLE_RATE * FRAME_MS) / 1000) return;
    const rms = Math.sqrt(
      frame.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / frame.length,
    );
    const speaking = rms >= RMS_THRESHOLD;
    if (!this.frames.length) {
      this.preRoll.push(frame);
      if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();
      this.voiced = speaking ? this.voiced + 1 : 0;
      if (this.voiced < START_FRAMES) return;
      if (this.controller) {
        this.status('interrupting');
        this.interrupt();
      }
      this.frames = this.preRoll;
      this.preRoll = [];
      this.silence = 0;
      this.status('user_speaking');
      return;
    }
    this.frames.push(frame);
    this.silence = speaking ? 0 : this.silence + 1;
    if (this.silence < SILENCE_FRAMES && this.frames.length < MAX_FRAMES) return;
    const frames = this.frames;
    this.resetCapture();
    void this.respond(wav(frames));
  }

  private resetCapture(): void {
    this.frames = [];
    this.preRoll = [];
    this.voiced = this.silence = 0;
    this.capture?.port.postMessage({ reset: true });
  }

  private interrupt(): void {
    ++this.turn;
    this.controller?.abort();
    this.controller = null;
    if (this.textActive) {
      this.textActive = false;
      // Never let cancellation of an old response target a newly submitted turn.
      this.cancellation = this.cancellation
        .then(() => api<void>(`/conversations/${this.identity}/cancel`, 'POST'))
        .catch((error: unknown) => {
          this.cancellationError = error;
        });
    }
  }

  private async respond(blob: Blob): Promise<void> {
    const turn = ++this.turn;
    const controller = new AbortController();
    this.controller = controller;
    const live = () => !this.ended && turn === this.turn && !controller.signal.aborted;
    this.status('processing');
    try {
      const form = new FormData();
      form.append('file', blob, 'recording.wav');
      const response = await apiFetch(`/api/speech/stt?language=${this.options.language ?? 'vi'}`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      if (!live()) return;
      if (!response.ok)
        throw new Error(
          'Blaze chưa chuyển được lời nói thành chữ. Kiểm tra dịch vụ giọng nói và thử lại.',
        );
      const data: unknown = await response.json();
      if (!live()) return;
      if (!data || typeof data !== 'object' || !('text' in data) || typeof data.text !== 'string')
        throw new Error('Bản chép lời Blaze không hợp lệ.');
      const message = data.text.trim();
      if (!message)
        throw new Error('Chưa nghe rõ lời nói. Hãy bắt đầu thoại lại và nói gần micro hơn.');
      if (message.length > 2000)
        throw new Error('Lời nói quá dài. Hãy chia thành câu hỏi ngắn hơn.');
      this.events.transcript('user', message);
      await this.cancellation;
      if (!live()) return;
      if (this.cancellationError)
        throw new Error(
          'Chưa xác nhận hủy câu trả lời trước. Hãy tải lại hội thoại trước khi tiếp tục.',
        );
      let text = '';
      this.textActive = true;
      const result = await streamTurn(
        this.identity,
        { client_request_id: crypto.randomUUID(), message },
        controller.signal,
        (event) => {
          if (!live()) return;
          if (event.type === 'delta') {
            text += event.delta;
            this.events.transcript('assistant', text);
          } else if (event.type === 'done') this.events.sync();
        },
      );
      if (!live()) return;
      this.textActive = false;
      if (result.reply.status !== 'completed' || !result.reply.content.trim())
        throw new Error(
          'Gemini chưa hoàn tất câu trả lời. Hãy kiểm tra hội thoại trước khi thử lại.',
        );
      this.events.transcript('assistant', result.reply.content);
      this.events.sync();
      if (result.reply.content.length > 20000)
        throw new Error('Câu trả lời quá dài để đọc. Bạn có thể xem nội dung trong hội thoại.');
      for (const chunk of spokenChunks(result.reply.content)) {
        if (!live()) return;
        await this.speak(chunk, controller.signal);
      }
      if (live()) this.status('listening');
    } catch (error) {
      if (live()) await this.fail(error instanceof Error ? error.message : 'Phiên thoại gặp lỗi.');
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        this.textActive = false;
      }
    }
  }

  private async speak(text: string, signal: AbortSignal): Promise<void> {
    const language = VIETNAMESE.test(text.normalize('NFC')) ? 'vi' : 'en';
    const selectedLanguage = this.voiceId?.match(/^(HN|SG)-/)
      ? 'vi'
      : this.voiceId?.match(/^(UK|US)-/)
        ? 'en'
        : null;
    const speaker =
      selectedLanguage === language
        ? this.voiceId
        : language === 'vi'
          ? this.options.voiceVi
          : this.options.voiceEn;
    const response = await apiFetch('/api/speech/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        text,
        language,
        speaker_id: speaker || (language === 'vi' ? 'HN-Nam-1-BL' : 'UK-Nu-1-TM'),
        speed: Math.min(2, Math.max(0.5, this.options.speed ?? 1)),
      }),
    });
    if (signal.aborted) return;
    if (!response.ok)
      throw new Error('Blaze chưa tạo được giọng nói. Câu trả lời đã được lưu trong hội thoại.');
    const blob = await response.blob();
    if (signal.aborted) return;
    if (!blob.size || !blob.type.startsWith('audio/'))
      throw new Error('Âm thanh Blaze không hợp lệ.');
    const url = URL.createObjectURL(blob);
    const player = new Audio(url);
    let stopMeter: (() => void) | undefined;
    let visualSource: MediaElementAudioSourceNode | undefined;
    if (this.events.level && this.context?.createMediaElementSource) {
      try {
        visualSource = this.context.createMediaElementSource(player);
        visualSource.connect(this.context.destination);
        stopMeter = observeAudioLevel(this.context, visualSource, (level) =>
          this.events.level?.(level, 'output'),
        );
      } catch {
        /* Keep native media playback if analysis is unavailable. */
      }
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          signal.removeEventListener('abort', cancel);
          player.onended = player.onerror = null;
          if (error) reject(error);
          else resolve();
        };
        const cancel = () => {
          player.pause();
          finish();
        };
        signal.addEventListener('abort', cancel, { once: true });
        player.onended = () => finish();
        player.onerror = () => finish(new Error('Không phát được âm thanh Blaze.'));
        if (signal.aborted) cancel();
        else {
          this.status('assistant_speaking');
          void player
            .play()
            .catch(() =>
              finish(new Error('Trình duyệt chặn phát âm thanh. Hãy bắt đầu thoại lại.')),
            );
        }
      });
    } finally {
      stopMeter?.();
      visualSource?.disconnect();
      player.pause();
      player.removeAttribute('src');
      URL.revokeObjectURL(url);
    }
  }

  mute(value: boolean): void {
    this.muted = value;
    this.microphone?.getAudioTracks().forEach((track) => {
      track.enabled = !value;
    });
    this.resetCapture();
    if (value && this.state === 'user_speaking') this.status('listening');
  }

  private async release(): Promise<void> {
    ++this.generation;
    this.interrupt();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.resetCapture();
    if (this.capture) this.capture.port.onmessage = null;
    this.capture?.disconnect();
    this.capture?.port.close();
    this.stopInputMeter?.();
    this.stopInputMeter = null;
    this.source?.disconnect();
    this.capture = this.source = null;
    this.microphone?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.microphone = null;
    const context = this.context;
    this.context = null;
    try {
      if (context) await context.close();
    } finally {
      await this.cancellation;
    }
    if (this.cancellationError) throw new Error('Chưa xác nhận hủy câu trả lời trên server.');
  }

  private async fail(message: string): Promise<void> {
    const cleanupGeneration = this.generation + 1;
    this.ended = true;
    try {
      await this.release();
    } catch {
      message += ' Micro đã dừng; hãy tải lại hội thoại để kiểm tra trạng thái.';
    }
    if (this.generation !== cleanupGeneration) return;
    this.status('error');
    this.events.error(message);
    this.events.sync();
  }

  async stop(): Promise<void> {
    this.ended = true;
    try {
      await this.release();
      this.status('idle');
    } catch (error) {
      this.status('error');
      this.events.error('Micro và âm thanh đã dừng; chưa xác nhận hủy câu trả lời trên server.');
      throw error;
    } finally {
      this.events.sync();
    }
  }

  get currentState(): VoiceState {
    return this.state;
  }
}
