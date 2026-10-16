import { api } from '../api/database';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'processing'
  | 'assistant_speaking'
  | 'interrupting'
  | 'reconnecting'
  | 'error';
export interface VoiceEvents {
  state: (state: VoiceState) => void;
  transcript: (role: 'user' | 'assistant', text: string) => void;
  error: (message: string) => void;
  sync: () => void;
}

/** Own one WebRTC media transport, response identity and all associated resources. */
export class VoiceSession {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private microphone: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private sessionId: string | null = null;
  private controller: AbortController | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private responseId: string | null = null;
  private blocked = new Set<string>();
  private assistantText = '';
  private ended = true;
  private attempts = 0;
  private muted = false;
  private reconnecting = false;
  private state: VoiceState = 'idle';

  constructor(
    private readonly identity: number,
    private readonly events: VoiceEvents,
  ) {}

  private status(state: VoiceState) {
    this.state = state;
    this.events.state(state);
  }

  async start(): Promise<void> {
    if (!this.ended) return;
    this.ended = false;
    this.attempts = 0;
    await this.connect();
  }

  private async connect(): Promise<void> {
    const generation = ++this.generation;
    this.status(this.attempts ? 'reconnecting' : 'connecting');
    this.controller = new AbortController();
    const signal = this.controller.signal;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined')
        throw new Error('Trình duyệt chưa hỗ trợ microphone/WebRTC.');
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (generation !== this.generation || this.ended) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      this.microphone = media;
      this.peer = new RTCPeerConnection();
      this.audio = new Audio();
      this.audio.autoplay = true;
      for (const track of media.getAudioTracks()) {
        track.enabled = !this.muted;
        track.onended = () => {
          if (!this.ended) void this.fail('Microphone đã ngắt kết nối.');
        };
        this.peer.addTrack(track, media);
      }
      this.peer.ontrack = (event) => {
        if (generation !== this.generation || !this.audio) return;
        this.audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void this.audio.play().catch(() => {
          if (!this.ended)
            void this.fail('Trình duyệt chặn phát âm thanh. Hãy bắt đầu lại phiên thoại.');
        });
      };
      this.channel = this.peer.createDataChannel('oai-events');
      this.channel.onmessage = (event) => {
        if (generation !== this.generation || this.ended) return;
        try {
          this.handle(JSON.parse(String(event.data)) as Record<string, unknown>);
        } catch {
          void this.fail('Sự kiện phiên thoại không hợp lệ.');
        }
      };
      this.channel.onerror = () => {
        void this.reconnect();
      };
      this.peer.onconnectionstatechange = () => {
        if (generation !== this.generation || !this.peer) return;
        if (this.peer.connectionState === 'connected') {
          if (this.connectTimer) clearTimeout(this.connectTimer);
          this.connectTimer = null;
          this.status('listening');
        }
        if (this.peer.connectionState === 'failed' || this.peer.connectionState === 'disconnected')
          void this.reconnect();
      };
      await this.peer.setLocalDescription(await this.peer.createOffer());
      const offer = this.peer.localDescription?.sdp;
      if (!offer) throw new Error('Không tạo được kết nối âm thanh.');
      const result = await api<{ session_id: string; sdp: string }>(
        `/conversations/${this.identity}/voice`,
        'POST',
        { sdp: offer },
        signal,
      );
      // The server may have created a paid call just before End Voice/route change.
      if (generation !== this.generation || this.ended) {
        await api(`/voice/${result.session_id}`, 'DELETE');
        return;
      }
      this.sessionId = result.session_id;
      await this.peer.setRemoteDescription({ type: 'answer', sdp: result.sdp });
      if (generation !== this.generation) return;
      if (this.peer.connectionState !== 'connected')
        this.connectTimer = setTimeout(() => {
          void this.reconnect();
        }, 15000);
      this.heartbeat = setInterval(() => {
        const id = this.sessionId;
        if (id)
          void api(`/voice/${id}/heartbeat`, 'POST', undefined, signal).catch(() =>
            this.reconnect(),
          );
      }, 12000);
    } catch (error) {
      if (generation !== this.generation || this.ended) return;
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Bạn chưa cấp quyền microphone.'
          : error instanceof DOMException && error.name === 'NotFoundError'
            ? 'Không tìm thấy microphone.'
            : error instanceof Error
              ? error.message
              : 'Chưa kết nối được phiên thoại.';
      if (this.attempts > 0 && this.attempts < 3) await this.reconnect();
      else await this.fail(message);
    }
  }

  private send(event: Record<string, unknown>): void {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event));
  }

  /** Provider VAD clears/truncates its WebRTC audio buffer; no local PCM queue is used. */
  private handle(event: Record<string, unknown>): void {
    const type = event.type;
    if (type === 'input_audio_buffer.speech_started') {
      if (this.responseId) {
        this.status('interrupting');
        this.blocked.add(this.responseId);
        this.responseId = null;
        this.audio?.pause();
        this.send({ type: 'output_audio_buffer.clear' });
      }
      this.status('user_speaking');
    } else if (type === 'input_audio_buffer.speech_stopped') this.status('processing');
    else if (type === 'response.created') {
      const response = event.response as { id: string };
      if (this.blocked.has(response.id)) return;
      this.responseId = response.id;
      this.assistantText = '';
      this.status('processing');
    } else if (
      type === 'response.output_audio_transcript.delta' ||
      type === 'response.output_text.delta'
    ) {
      if (event.response_id !== this.responseId || this.blocked.has(String(event.response_id)))
        return;
      this.assistantText += String(event.delta ?? '');
      this.events.transcript('assistant', this.assistantText);
    } else if (type === 'output_audio_buffer.started') {
      if (event.response_id !== this.responseId || this.blocked.has(String(event.response_id)))
        return;
      this.status('assistant_speaking');
      void this.audio?.play().catch(() => this.fail('Không phát được âm thanh AI.'));
    } else if (type === 'output_audio_buffer.stopped' || type === 'output_audio_buffer.cleared') {
      if (event.response_id === this.responseId) this.status('listening');
    } else if (type === 'conversation.item.input_audio_transcription.completed') {
      this.events.transcript('user', String(event.transcript ?? ''));
    } else if (type === 'response.done') {
      const response = event.response as { id: string; status: string };
      if (response.id !== this.responseId || this.blocked.has(response.id)) return;
      if (response.status === 'failed') {
        void this.fail('AI chưa hoàn tất phản hồi thoại.');
        return;
      }
      this.events.sync();
    } else if (type === 'error' || type === 'conversation.item.input_audio_transcription.failed')
      void this.fail('Dịch vụ AI báo lỗi phiên thoại. Hãy thử kết nối lại.');
    if (this.blocked.size > 200) void this.fail('Phiên thoại đã đạt giới hạn. Hãy tạo phiên mới.');
  }

  mute(value: boolean): void {
    this.muted = value;
    this.microphone?.getAudioTracks().forEach((track) => {
      track.enabled = !value;
    });
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
      this.reconnecting = false;
      await this.fail('Không đóng được phiên cũ để kết nối lại.');
    }
  }

  private async release(): Promise<void> {
    ++this.generation;
    this.controller?.abort();
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.heartbeat = this.retryTimer = null;
    this.audio?.pause();
    if (this.audio) this.audio.srcObject = null;
    this.audio = null;
    if (this.channel) this.channel.onmessage = this.channel.onerror = null;
    this.channel?.close();
    this.channel = null;
    if (this.peer) this.peer.ontrack = this.peer.onconnectionstatechange = null;
    this.peer?.close();
    this.peer = null;
    this.microphone?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.microphone = null;
    this.responseId = null;
    this.blocked.clear();
    const id = this.sessionId;
    this.sessionId = null;
    if (id) await api(`/voice/${id}`, 'DELETE');
  }

  private async fail(message: string): Promise<void> {
    this.ended = true;
    try {
      await this.release();
    } catch {
      message += ' Chưa xác nhận được việc đóng phiên trên server.';
    }
    this.status('error');
    this.events.error(message);
  }

  async stop(): Promise<void> {
    this.ended = true;
    try {
      await this.release();
      this.status('idle');
    } catch (error) {
      this.status('error');
      this.events.error('Đã dừng micro/âm thanh nhưng chưa xác nhận đóng phiên trên server.');
      throw error;
    } finally {
      this.events.sync();
    }
  }

  get currentState(): VoiceState {
    return this.state;
  }
}
