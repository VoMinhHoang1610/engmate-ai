import { observeAudioLevel } from './visualLevel';
import { api, apiFetch } from '../api/database';
import { readJSON } from '../api/readJSON';
import { streamTurn } from '../api/chatStream';
import type { VoiceEvents, VoiceState } from './session';
import { SpokenText } from './spokenText';
import { SpeechQueue } from './speechQueue';
import { VoiceLatencyTrace } from './latency';
import { RealtimeSTT } from './realtimeSTT';
import { voiceGender, type VoiceGender } from '../speech/identity';

interface BlazeVoiceOptions {
  language?: 'en' | 'vi';
  voiceEn?: string;
  voiceVi?: string;
  voiceLanguage?: 'en' | 'vi';
  voiceGender?: VoiceGender | null;
  speed?: number;
  opening?: string;
  sttMode?: 'batch' | 'realtime';
}

const SAMPLE_RATE = 16000;
const FRAME_MS = 100;
const START_FRAMES = 2;
const SILENCE_FRAMES = 9;
const MAX_FRAMES = 300;
const PRE_ROLL_FRAMES = 3;
const RMS_THRESHOLD = 0.018;

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
  private lastVoicedAt = 0;
  private trace: VoiceLatencyTrace | null = null;
  private recognition: RealtimeSTT | null = null;
  private delivery: { id: number; heard: number } | null = null;

  private recordPlayback(delivery: { id: number; heard: number }): Promise<void> {
    return api<void>(`/conversations/${this.identity}/messages/${delivery.id}/playback`, 'POST', {
      heard_chars: delivery.heard,
    });
  }
  private state: VoiceState = 'idle';
  private readonly speaker: string;
  private readonly speechLanguage: 'en' | 'vi';
  private readonly gender: VoiceGender | null;

  constructor(
    private readonly identity: number,
    private readonly events: VoiceEvents,
    voiceId?: string,
    private readonly options: BlazeVoiceOptions = {},
  ) {
    const language = options.language ?? 'vi';
    this.speaker =
      voiceId ||
      (language === 'vi' ? options.voiceVi : options.voiceEn) ||
      (language === 'vi' ? 'HN-Nam-1-BL' : 'UK-Nu-1-TM');
    this.speechLanguage =
      options.voiceLanguage ??
      (/^(HN|SG)-/.test(this.speaker) ? 'vi' : /^(UK|US)-/.test(this.speaker) ? 'en' : language);
    this.gender = voiceGender(this.speaker, options.voiceGender);
  }

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
        const queue = this.speechQueue(opening.signal);
        try {
          queue.push(new SpokenText().finish(this.options.opening));
          queue.finish();
          await queue.completion;
        } catch {
          // Opening audio is optional: the transcript is already visible and
          // the learner can still continue with text or voice.
          if (!opening.signal.aborted && !this.ended)
            this.events.error('Không phát được lời mở đầu. Bạn vẫn có thể tiếp tục trò chuyện.');
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
    if (speaking) this.lastVoicedAt = performance.now();
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
      if (this.options.sttMode === 'realtime') {
        const recognition = new RealtimeSTT(
          this.identity,
          this.options.language ?? 'vi',
          (text) => {
            if (!this.ended && this.recognition === recognition)
              this.events.transcript('user', text);
          },
        );
        this.recognition = recognition;
        // Include pre-roll so connection setup never discards the start of a word.
        for (const initial of this.frames) recognition.push(initial, true);
      }
      return;
    }
    this.frames.push(frame);
    this.recognition?.push(frame, speaking);
    if (this.ended) return;
    this.silence = speaking ? 0 : this.silence + 1;
    if (this.silence < SILENCE_FRAMES && this.frames.length < MAX_FRAMES) return;
    const frames = this.frames;
    const recognition = this.recognition;
    this.recognition = null;
    const trace = new VoiceLatencyTrace(
      this.lastVoicedAt,
      this.silence >= SILENCE_FRAMES ? 'silence' : 'max_duration',
      this.options.sttMode ?? 'batch',
      recognition?.traceId,
    );
    this.resetCapture();
    void this.respond(recognition, wav(frames), trace);
  }

  private resetCapture(): void {
    this.frames = [];
    this.preRoll = [];
    this.voiced = this.silence = 0;
    this.capture?.port.postMessage({ reset: true });
  }

  private interrupt(): void {
    ++this.turn;
    this.recognition?.cancel();
    this.recognition = null;
    this.trace?.finish('cancelled');
    this.trace = null;
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
    const delivery = this.delivery;
    this.delivery = null;
    if (delivery) {
      this.cancellation = this.cancellation
        .then(() => this.recordPlayback(delivery))
        .catch((error: unknown) => {
          this.cancellationError = error;
        });
    }
  }

  private async respond(
    input: RealtimeSTT | null,
    recording: Blob,
    trace: VoiceLatencyTrace,
  ): Promise<void> {
    const turn = ++this.turn;
    const controller = new AbortController();
    this.controller = controller;
    this.trace = trace;
    const live = () => !this.ended && turn === this.turn && !controller.signal.aborted;
    this.status('processing');
    const cancelSTT = () => input?.cancel();
    controller.signal.addEventListener('abort', cancelSTT, { once: true });
    try {
      let transcript: string;
      if (input) {
        trace.markAt('stt_requested', input.requestedAt);
        try {
          transcript = await input.finish();
        } catch (error) {
          if (!live() || (error instanceof DOMException && error.name === 'AbortError')) return;
          // Realtime STT is an optimization, not a dependency. Re-transcribe the
          // captured PCM with the batch endpoint before ending the turn.
          transcript = await this.transcribe(recording, controller.signal, trace);
        }
      } else {
        transcript = await this.transcribe(recording, controller.signal, trace);
      }
      if (!live()) return;
      const message = transcript.trim();
      if (!message)
        throw new Error('Chưa nghe rõ lời nói. Hãy bắt đầu thoại lại và nói gần micro hơn.');
      if (message.length > 2000)
        throw new Error('Lời nói quá dài. Hãy chia thành câu hỏi ngắn hơn.');
      trace.mark('stt_final');
      this.events.transcript('user', message);
      await this.cancellation;
      if (!live()) return;
      if (this.cancellationError)
        throw new Error(
          'Chưa xác nhận hủy câu trả lời trước. Hãy tải lại hội thoại trước khi tiếp tục.',
        );
      let text = '';
      const spoken = new SpokenText();
      const delivery = { id: 0, heard: 0 };
      // Speech has its own cancel scope: a TTS/playback failure stops audio but
      // must not abort the Gemini response that is still producing useful text.
      const audioController = new AbortController();
      const audioSignal = AbortSignal.any([controller.signal, audioController.signal]);
      const queue = new SpeechQueue(
        audioSignal,
        (phrase) => this.prepareSpeech(phrase, audioSignal, trace),
        async (blob) => {
          const end = spoken.nextEnd();
          await this.playSpeech(blob, audioSignal, trace);
          if (live() && !audioSignal.aborted) delivery.heard = end;
        },
      );
      let audioNotified = false;
      const notifyAudioFailure = (error: unknown) => {
        if (audioNotified) return;
        audioNotified = true;
        const detail =
          error instanceof Error && error.message
            ? error.message
            : 'Không phát được giọng nói Blaze.';
        this.events.error(`${detail} Câu trả lời vẫn được lưu trong hội thoại.`);
      };
      const audioDone = queue.completion.catch((error: unknown) => {
        if (!controller.signal.aborted) {
          // Stop a clip that is already playing; the remaining reply stays text.
          audioController.abort();
          notifyAudioFailure(error);
        }
      });
      this.textActive = true;
      trace.mark('llm_requested');
      const streaming = streamTurn(
        this.identity,
        {
          client_request_id: crypto.randomUUID(),
          message,
          voice: true,
          voice_gender: this.gender,
        },
        controller.signal,
        (event) => {
          if (!live()) return;
          if (event.type === 'start') {
            delivery.id = event.response_id;
            this.delivery = delivery;
          }
          if (event.type === 'delta') {
            text += event.delta;
            if (event.delta) trace.mark('llm_first_text');
            const chunks = spoken.push(event.delta);
            if (chunks.length) trace.mark('first_phrase');
            // Start paid TTS preparation before React re-renders the growing caption.
            queue.push(chunks);
            this.events.transcript('assistant', text);
          }
        },
        trace.id,
      );
      let result: Awaited<ReturnType<typeof streamTurn>>;
      try {
        result = await streaming;
      } catch (error) {
        // The text turn failed; stop speech work that belongs to it. A speech
        // failure alone is handled below and must not cancel a useful reply.
        controller.abort();
        await audioDone;
        throw error;
      }
      if (!live()) return;
      this.textActive = false;
      if (!result || result.reply.status !== 'completed' || !result.reply.content.trim())
        throw new Error(
          'Gemini chưa hoàn tất câu trả lời. Hãy kiểm tra hội thoại trước khi thử lại.',
        );
      this.events.transcript('assistant', result.reply.content);
      delivery.id = result.reply.message_id;
      this.delivery = delivery;
      this.events.sync();
      trace.mark('llm_completed');
      const tail = spoken.finish(result.reply.content);
      if (tail.length) trace.mark('first_phrase');
      queue.push(tail);
      queue.finish();
      await audioDone;
      if (live()) {
        if (delivery.id) await this.recordPlayback({ ...delivery });
        if (!live()) return;
        this.delivery = null;
        trace.finish('completed');
        this.status('listening');
      }
    } catch (error) {
      if (!this.ended && turn === this.turn) {
        if (this.cancellationError) {
          trace.finish('failed');
          await this.fail(
            'Chưa xác nhận hủy câu trả lời trước. Hãy tải lại hội thoại trước khi tiếp tục.',
          );
          return;
        }
        if (error instanceof DOMException && error.name === 'AbortError') return;
        this.recoverTurn(trace, controller, error);
      }
    } finally {
      controller.signal.removeEventListener('abort', cancelSTT);
      cancelSTT();
      if (this.controller === controller) {
        this.controller = null;
        this.trace = null;
        this.textActive = false;
      }
    }
  }

  private async transcribe(
    recording: Blob,
    signal: AbortSignal,
    trace: VoiceLatencyTrace,
  ): Promise<string> {
    const form = new FormData();
    form.append('file', recording, 'recording.wav');
    trace.mark('stt_requested');
    const response = await apiFetch(
      `/api/speech/stt?language=${this.options.language ?? 'vi'}&voice_trace_id=${trace.id}`,
      { method: 'POST', body: form, signal },
    );
    if (signal.aborted) throw new DOMException('Speech turn cancelled', 'AbortError');
    if (!response.ok)
      throw new Error(
        'Blaze chưa chuyển được lời nói thành chữ. Kiểm tra dịch vụ giọng nói và thử lại.',
      );
    const data: unknown = await readJSON(response, signal);
    if (!data || typeof data !== 'object' || !('text' in data) || typeof data.text !== 'string')
      throw new Error('Bản chép lời Blaze không hợp lệ.');
    trace.mark('stt_final');
    return data.text;
  }

  /** Keep the microphone/session alive when one turn cannot complete. */
  private recoverTurn(trace: VoiceLatencyTrace, controller: AbortController, error: unknown): void {
    trace.finish('failed');
    if (!controller.signal.aborted) controller.abort();
    if (this.textActive) {
      this.textActive = false;
      this.cancellation = this.cancellation
        .then(() => api<void>(`/conversations/${this.identity}/cancel`, 'POST'))
        .catch((failure: unknown) => {
          this.cancellationError = failure;
        });
    }
    this.delivery = null;
    this.trace = null;
    this.status('listening');
    this.events.error(error instanceof Error ? error.message : 'Phiên thoại gặp lỗi.');
    this.events.sync();
  }

  private speechQueue(signal: AbortSignal, trace?: VoiceLatencyTrace): SpeechQueue {
    return new SpeechQueue(
      signal,
      (text) => this.prepareSpeech(text, signal, trace),
      (blob) => this.playSpeech(blob, signal, trace),
    );
  }

  private async prepareSpeech(
    text: string,
    signal: AbortSignal,
    trace?: VoiceLatencyTrace,
  ): Promise<Blob | null> {
    if (signal.aborted) return null;
    // Keep one speaker/model language for the whole call, including bilingual phrases.
    // Content detection used to switch to a different person between streamed chunks.
    trace?.mark('tts_requested');
    const timeout = new AbortController();
    const deadline = setTimeout(() => timeout.abort(), 95000);
    try {
      const response = await apiFetch(
        `/api/speech/tts${trace ? `?voice_trace_id=${trace.id}` : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.any([signal, timeout.signal]),
          body: JSON.stringify({
            text,
            language: this.speechLanguage,
            speaker_id: this.speaker,
            speed: Math.min(2, Math.max(0.5, this.options.speed ?? 1)),
          }),
        },
      );
      if (signal.aborted) return null;
      trace?.mark('tts_headers');
      if (!response.ok)
        throw new Error(
          'Blaze chưa tạo được giọng nói. Bạn có thể kiểm tra câu trả lời trong hội thoại.',
        );
      if (!response.body) throw new Error('Âm thanh Blaze không hợp lệ.');
      const reader = response.body.getReader();
      const parts: ArrayBuffer[] = [];
      let bytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (signal.aborted) return null;
          if (part.done) break;
          if (part.value.length) trace?.mark('tts_first_byte');
          bytes += part.value.length;
          if (bytes > 8 * 1024 * 1024) throw new Error('Âm thanh Blaze vượt giới hạn.');
          parts.push(part.value.slice().buffer);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const blob = new Blob(parts, { type: response.headers.get('Content-Type') ?? '' });
      if (signal.aborted) return null;
      if (!blob.size || !blob.type.startsWith('audio/'))
        throw new Error('Âm thanh Blaze không hợp lệ.');
      trace?.mark('audio_ready');
      return blob;
    } finally {
      clearTimeout(deadline);
    }
  }

  private async playSpeech(
    blob: Blob,
    signal: AbortSignal,
    trace?: VoiceLatencyTrace,
  ): Promise<void> {
    if (signal.aborted) return;
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
        let finished = false;
        let position = 0;
        let progressedAt = Date.now();
        // A media element can stop advancing without firing ended/error. Bound
        // inactivity rather than clip duration so long replies can still play.
        const watchdog = setInterval(() => {
          if (Number.isFinite(player.currentTime) && player.currentTime > position) {
            position = player.currentTime;
            progressedAt = Date.now();
          } else if (Date.now() - progressedAt >= 15_000) {
            finish(new Error('Âm thanh Blaze bị treo.'));
          }
        }, 1000);
        const finish = (error?: Error) => {
          if (finished) return;
          finished = true;
          clearInterval(watchdog);
          signal.removeEventListener('abort', cancel);
          player.onended = player.onerror = player.onplaying = null;
          if (error) reject(error);
          else resolve();
        };
        const cancel = () => {
          player.pause();
          finish();
        };
        signal.addEventListener('abort', cancel, { once: true });
        player.onplaying = () => {
          if (finished || signal.aborted) return;
          trace?.mark('playback_started');
          this.status('assistant_speaking');
        };
        player.onended = () => finish();
        player.onerror = () => finish(new Error('Không phát được âm thanh Blaze.'));
        if (signal.aborted) cancel();
        else {
          void player.play().catch(() => finish(new Error('Trình duyệt chặn phát âm thanh.')));
        }
      });
    } finally {
      stopMeter?.();
      visualSource?.disconnect();
      player.pause();
      player.removeAttribute('src');
      URL.revokeObjectURL(url);
      if (!signal.aborted && this.state === 'assistant_speaking') this.status('processing');
    }
  }

  mute(value: boolean): void {
    this.muted = value;
    this.microphone?.getAudioTracks().forEach((track) => {
      track.enabled = !value;
    });
    this.resetCapture();
    this.recognition?.cancel();
    this.recognition = null;
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
