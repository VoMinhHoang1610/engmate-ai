import { api } from '../api/database';
import type { VoiceEvents, VoiceState } from './session';

/** Own microphone PCM, bounded playback and an authenticated same-origin relay. */
export class GeminiVoiceSession {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private microphone: MediaStream | null = null;
  private socket: WebSocket | null = null;
  private controller: AbortController | null = null;
  private sessionId: string | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private nodes = new Set<AudioBufferSourceNode>();
  private nextAudio = 0;
  private generation = 0;
  private ended = true;
  private ready = false;
  private muted = false;
  private reconnecting = false;
  private attempts = 0;
  private state: VoiceState = 'idle';

  constructor(
    private readonly identity: number,
    private readonly events: VoiceEvents,
  ) {}

  private status(state: VoiceState): void {
    this.state = state;
    this.events.state(state);
  }

  async start(): Promise<void> {
    if (!this.ended) return;
    this.ended = false;
    this.reconnecting = false;
    this.attempts = 0;
    await this.connect();
  }

  private async connect(): Promise<void> {
    const generation = ++this.generation;
    this.status(this.attempts ? 'reconnecting' : 'connecting');
    this.controller = new AbortController();
    const signal = this.controller.signal;
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
      this.capture = new AudioWorkletNode(context, 'engmate-pcm');
      this.source.connect(this.capture);
      // The processor emits no audible output; this keeps capture running without echo.
      this.capture.connect(context.destination);
      this.capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (generation !== this.generation || this.ended || this.muted || !this.ready) return;
        const socket = this.socket;
        if (socket?.readyState !== WebSocket.OPEN) return;
        if (socket.bufferedAmount > 64000) {
          void this.reconnect();
          return;
        }
        const bytes = new Uint8Array(event.data);
        const encoded = btoa(String.fromCharCode(...bytes));
        socket.send(JSON.stringify({ audio: encoded }));
      };
      const result = await api<{ session_id: string; transport: string; ticket: string }>(
        `/conversations/${this.identity}/voice`,
        'POST',
        {},
        signal,
      );
      if (this.ended || generation !== this.generation) {
        await api(`/voice/${result.session_id}`, 'DELETE');
        return;
      }
      this.sessionId = result.session_id;
      if (result.transport !== 'websocket' || !result.ticket)
        throw new Error('Server chưa hỗ trợ kết nối Gemini Live.');
      const url = new URL(
        `/api/voice/${encodeURIComponent(result.session_id)}/audio`,
        window.location.href,
      );
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(url);
      this.socket = socket;
      await new Promise<void>((resolve, reject) => {
        let ready = false;
        const abort = () => finish(new DOMException('Aborted', 'AbortError'));
        const timer = setTimeout(
          () => finish(new Error('Gemini Live kết nối quá thời gian.')),
          20000,
        );
        const finish = (error?: Error) => {
          clearTimeout(timer);
          signal.removeEventListener('abort', abort);
          if (error) reject(error);
          else resolve();
        };
        signal.addEventListener('abort', abort, { once: true });
        socket.onopen = () => {
          if (generation === this.generation && !this.ended)
            socket.send(JSON.stringify({ ticket: result.ticket }));
        };
        socket.onmessage = (event) => {
          if (generation !== this.generation || this.ended) return;
          try {
            const data = JSON.parse(String(event.data)) as Record<string, unknown>;
            if (data.type === 'ready') {
              ready = true;
              this.ready = true;
              finish();
              this.status('listening');
            } else if (data.type === 'error' && !ready)
              finish(new Error(String(data.message ?? 'Gemini Live chưa sẵn sàng.')));
            else if (ready) this.handle(data);
          } catch {
            if (ready) void this.fail('Phản hồi thoại không hợp lệ.');
            else finish(new Error('Phản hồi kết nối không hợp lệ.'));
          }
        };
        socket.onerror = () => {
          if (!ready) finish(new Error('Không kết nối được Gemini Live.'));
        };
        socket.onclose = () => {
          if (this.ended || generation !== this.generation) return;
          if (!ready) finish(new Error('Kết nối thoại đã đóng trước khi sẵn sàng.'));
          else void this.reconnect();
        };
      });
      if (generation !== this.generation || this.ended) return;
      this.heartbeat = setInterval(() => {
        const id = this.sessionId;
        if (id)
          void api(`/voice/${id}/heartbeat`, 'POST', undefined, signal).catch(() =>
            this.reconnect(),
          );
      }, 12000);
    } catch (error) {
      if (this.ended || generation !== this.generation) return;
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Bạn chưa cấp quyền microphone.'
          : error instanceof Error
            ? error.message
            : 'Chưa kết nối được Gemini Live.';
      if (this.attempts && this.attempts < 3) await this.reconnect();
      else await this.fail(message);
    }
  }

  private handle(event: Record<string, unknown>): void {
    if (event.type === 'interrupted') {
      this.status('interrupting');
      this.clearAudio();
      this.status('user_speaking');
    } else if (event.type === 'transcript') {
      if (typeof event.text !== 'string' || (event.role !== 'user' && event.role !== 'assistant'))
        throw new Error('Invalid transcript');
      this.events.transcript(event.role, event.text);
      if (event.role === 'user') this.status('user_speaking');
      else if (!this.nodes.size) this.status('processing');
    } else if (event.type === 'audio') this.play(String(event.data));
    else if (event.type === 'done') {
      this.events.sync();
      if (!this.nodes.size) this.status('listening');
    } else if (event.type === 'error')
      void this.fail(String(event.message ?? 'Gemini Live gặp lỗi.'));
  }

  private play(encoded: string): void {
    const context = this.context;
    if (
      !context ||
      encoded.length > 180000 ||
      encoded.length % 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
    )
      throw new Error('Invalid audio');
    const raw = atob(encoded);
    if (!raw.length || raw.length % 2) throw new Error('Invalid PCM');
    if (this.nextAudio - context.currentTime > 8) throw new Error('Playback queue full');
    const buffer = context.createBuffer(1, raw.length / 2, 24000);
    const view = new DataView(Uint8Array.from(raw, (char) => char.charCodeAt(0)).buffer);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);
    this.nodes.add(node);
    node.onended = () => {
      this.nodes.delete(node);
      node.disconnect();
      if (
        !this.ended &&
        this.context === context &&
        !this.nodes.size &&
        this.state === 'assistant_speaking'
      )
        this.status('listening');
    };
    const start = Math.max(context.currentTime + 0.02, this.nextAudio);
    this.nextAudio = start + buffer.duration;
    node.start(start);
    this.status('assistant_speaking');
  }

  private clearAudio(): void {
    for (const node of this.nodes) {
      node.onended = null;
      node.stop();
      node.disconnect();
    }
    this.nodes.clear();
    this.nextAudio = 0;
  }

  mute(value: boolean): void {
    this.muted = value;
    this.microphone?.getAudioTracks().forEach((track) => {
      track.enabled = !value;
    });
    this.capture?.port.postMessage({ reset: true });
    if (value && this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ audio_end: true }));
  }

  private async release(): Promise<void> {
    ++this.generation;
    this.ready = false;
    this.controller?.abort();
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.heartbeat = this.retryTimer = null;
    if (this.socket) {
      this.socket.onopen = this.socket.onmessage = this.socket.onerror = this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.clearAudio();
    if (this.capture) this.capture.port.onmessage = null;
    this.capture?.disconnect();
    this.capture?.port.close();
    this.source?.disconnect();
    this.capture = this.source = null;
    this.microphone?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.microphone = null;
    const context = this.context;
    this.context = null;
    const id = this.sessionId;
    this.sessionId = null;
    try {
      if (context) await context.close();
    } finally {
      if (id) await api(`/voice/${id}`, 'DELETE');
    }
  }

  private async reconnect(): Promise<void> {
    if (this.ended || this.reconnecting) return;
    this.reconnecting = true;
    this.status('reconnecting');
    try {
      await this.release();
      if (this.ended) return;
      if (++this.attempts > 3) {
        await this.fail('Mất kết nối sau ba lần thử lại.');
        return;
      }
      this.retryTimer = setTimeout(
        () => {
          this.reconnecting = false;
          if (!this.ended) void this.connect();
        },
        1000 * 2 ** (this.attempts - 1),
      );
    } catch {
      await this.fail('Chưa đóng được phiên cũ để kết nối lại.');
    } finally {
      if (this.ended) this.reconnecting = false;
    }
  }

  private async fail(message: string): Promise<void> {
    this.ended = true;
    this.reconnecting = false;
    try {
      await this.release();
    } catch {
      message += ' Chưa xác nhận đóng phiên trên server.';
    }
    this.status('error');
    this.events.error(message);
    this.events.sync();
  }

  async stop(): Promise<void> {
    this.ended = true;
    this.reconnecting = false;
    try {
      await this.release();
      this.status('idle');
    } catch (error) {
      this.status('error');
      this.events.error('Đã dừng micro nhưng chưa xác nhận đóng phiên.');
      throw error;
    } finally {
      this.events.sync();
    }
  }

  get currentState(): VoiceState {
    return this.state;
  }
}
