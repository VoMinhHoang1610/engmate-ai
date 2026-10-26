import { api } from '../api/database';

const FRAME_BYTES = 3200;
const MAX_BACKLOG_BYTES = 160000;

// App-owned codes only: neither upstream text nor an arbitrary server message is UI copy.
const STT_ERRORS: Record<string, string> = {
  provider_auth: 'Blaze từ chối xác thực STT. Kiểm tra API key trên backend.',
  insufficient_credits: 'Tài khoản Blaze không đủ credit để nhận dạng giọng nói.',
  invoice_not_paid: 'Blaze yêu cầu thanh toán hóa đơn trước khi dùng STT.',
  subscription_missing: 'Tài khoản Blaze chưa có gói dịch vụ STT realtime.',
  plan_upgrade_required: 'Gói Blaze hiện tại chưa hỗ trợ STT realtime.',
  provider_rate_limited: 'Blaze đang giới hạn lượt STT. Hãy thử lại sau.',
  provider_error: 'Blaze báo lỗi dịch vụ STT. Hãy thử lại hoặc kiểm tra dịch vụ Blaze.',
  provider_timeout: 'Blaze STT phản hồi quá thời gian. Hãy thử lại.',
  provider_unavailable: 'Kết nối tới Blaze STT bị gián đoạn. Hãy thử lại.',
  protocol_error: 'Phản hồi Blaze STT không đúng giao thức. Kiểm tra phiên bản backend.',
  audio_limit: 'Audio STT vượt giới hạn kích thước, tốc độ hoặc thời lượng.',
  transcript_limit: 'Bản chép lời vượt giới hạn. Hãy nói thành các lượt ngắn hơn.',
};

/** One utterance: stream PCM early, retain final segments and never promote a partial. */
export class RealtimeSTT {
  readonly requestedAt = performance.now();
  readonly traceId = crypto.randomUUID();
  private readonly controller = new AbortController();
  private socket: WebSocket | null = null;
  private ready = false;
  private closed = false;
  private ending = false;
  private unsettled = true;
  private segments: string[] = [];
  private backlog: ArrayBuffer[] = [];
  private resolve!: (text: string) => void;
  private reject!: (error: Error) => void;
  private readonly result: Promise<string>;
  private readonly setupTimer: ReturnType<typeof setTimeout>;
  private finalTimer?: ReturnType<typeof setTimeout>;
  private paddingTimer?: ReturnType<typeof setInterval>;

  constructor(
    identity: number,
    language: 'en' | 'vi',
    private readonly caption: (text: string) => void,
    private readonly failure?: (message: string) => void,
  ) {
    this.result = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    // Connection/provider failures can occur before VAD calls finish().
    void this.result.catch(() => undefined);
    this.setupTimer = setTimeout(() => this.fail('Kết nối Blaze STT quá thời gian.'), 10000);
    void this.connect(identity, language).catch(() => {
      if (!this.closed) this.fail('Không kết nối được Blaze realtime STT. Hãy thử lại.');
    });
  }

  private async connect(identity: number, language: string): Promise<void> {
    const lease = await api<{ session_id: string; ticket: string }>(
      `/conversations/${identity}/speech-ticket?language=${language}&voice_trace_id=${this.traceId}`,
      'POST',
      undefined,
      this.controller.signal,
    );
    if (this.closed) return;
    if (
      !lease ||
      !/^[\da-f-]{36}$/.test(lease.session_id) ||
      typeof lease.ticket !== 'string' ||
      lease.ticket.length < 32 ||
      lease.ticket.length > 128
    )
      throw new Error('Invalid speech ticket');
    const url = new URL(`/api/speech/realtime/${lease.session_id}`, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      if (!this.closed) socket.send(JSON.stringify({ ticket: lease.ticket }));
    };
    socket.onmessage = (event: MessageEvent<unknown>) => {
      if (this.closed) return;
      try {
        if (typeof event.data !== 'string' || event.data.length > 16384)
          throw new Error('Invalid STT frame');
        const data: unknown = JSON.parse(event.data);
        if (!data || typeof data !== 'object' || !('type' in data))
          throw new Error('Invalid STT event');
        // Setup rejection is valid before ready and must not masquerade as bad speech.
        if (data.type === 'error') {
          const code = 'code' in data && typeof data.code === 'string' ? data.code : '';
          this.fail(Object.hasOwn(STT_ERRORS, code) ? STT_ERRORS[code] : STT_ERRORS.provider_error);
          return;
        }
        if (data.type === 'ready' && !this.ready) {
          this.ready = true;
          clearTimeout(this.setupTimer);
          const frames = this.backlog;
          this.backlog = [];
          for (const frame of frames) this.send(frame);
          return;
        }
        if (
          !this.ready ||
          (data.type !== 'partial' && data.type !== 'final') ||
          !('text' in data) ||
          typeof data.text !== 'string' ||
          data.text.length > 2000
        )
          throw new Error('Unexpected STT event');
        if (data.type === 'final' && data.text.trim()) {
          this.segments.push(data.text.trim());
          this.unsettled = false;
        } else this.unsettled = true;
        const text = [...this.segments, ...(data.type === 'partial' ? [data.text] : [])].join(' ');
        if (text.length > 2000) throw new Error('Transcript too long');
        this.caption(text);
        this.settle();
      } catch {
        this.fail(STT_ERRORS.protocol_error);
      }
    };
    socket.onerror = socket.onclose = () => {
      if (!this.closed) this.fail('Kết nối Blaze STT bị ngắt. Hãy thử lại.');
    };
  }

  push(frame: Int16Array, speaking: boolean): void {
    if (this.closed || this.ending) return;
    if (frame.byteLength !== FRAME_BYTES) return this.fail('Khung microphone không hợp lệ.');
    if (speaking) this.unsettled = true;
    // Explicit little-endian PCM; do not assume host byte order.
    const pcm = new ArrayBuffer(FRAME_BYTES);
    const view = new DataView(pcm);
    frame.forEach((sample, index) => view.setInt16(index * 2, sample, true));
    this.send(pcm);
  }

  private send(pcm: ArrayBuffer): void {
    if (this.closed) return;
    if (!this.ready) {
      if ((this.backlog.length + 1) * FRAME_BYTES > MAX_BACKLOG_BYTES)
        return this.fail('Kết nối STT chậm; audio chờ vượt giới hạn. Hãy thử lại.');
      this.backlog.push(pcm);
    } else if (
      this.socket?.readyState === WebSocket.OPEN &&
      this.socket.bufferedAmount + pcm.byteLength <= MAX_BACKLOG_BYTES
    ) {
      try {
        this.socket.send(pcm);
      } catch {
        this.fail('Kết nối Blaze STT bị ngắt. Hãy thử lại.');
      }
    } else this.fail('Mạng chậm; chưa gửi kịp audio tới Blaze STT. Hãy thử lại.');
  }

  finish(): Promise<string> {
    if (this.ending || this.closed) return this.result;
    this.ending = true;
    // Blaze documents auto-final via silence, not a flush command. Do not invent one.
    this.finalTimer = setTimeout(
      () => this.fail('Blaze STT chưa chốt lời nói. Hãy thử lại.'),
      5000,
    );
    this.paddingTimer = setInterval(() => this.send(new ArrayBuffer(FRAME_BYTES)), 100);
    this.settle();
    return this.result;
  }

  private settle(): void {
    if (!this.closed && this.ending && !this.unsettled && this.segments.length) {
      const text = this.segments.join(' ');
      this.dispose();
      this.resolve(text);
    }
  }

  private fail(message: string): void {
    if (this.closed) return;
    this.dispose();
    this.reject(new Error(message));
    this.failure?.(message);
  }

  cancel(): void {
    if (this.closed) return;
    this.dispose();
    this.reject(new DOMException('Speech turn cancelled', 'AbortError'));
  }

  private dispose(): void {
    this.closed = true;
    clearTimeout(this.setupTimer);
    clearTimeout(this.finalTimer);
    clearInterval(this.paddingTimer);
    this.controller.abort();
    this.backlog = [];
    if (this.socket) {
      this.socket.onopen = this.socket.onmessage = this.socket.onerror = this.socket.onclose = null;
      this.socket.close();
    }
    this.socket = null;
  }
}
