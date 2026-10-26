interface Clip {
  blob: Blob;
  text: string;
}

/** One playing clip and at most one prepared/in-flight clip; no parallel playback. */
export class SpeechQueue {
  readonly completion: Promise<void>;
  private resolve!: () => void;
  private reject!: (error: unknown) => void;
  private pending: string[] = [];
  private ready: Clip | null = null;
  private preparing = false;
  private playing = false;
  private closed = false;
  private stopped = false;

  constructor(
    private readonly signal: AbortSignal,
    private readonly prepare: (text: string) => Promise<Blob | null>,
    private readonly play: (blob: Blob, text: string) => Promise<void>,
  ) {
    this.completion = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    // A prefetched job may fail before the consumer starts awaiting completion.
    void this.completion.catch(() => undefined);
    signal.addEventListener('abort', this.stop, { once: true });
    if (signal.aborted) this.stop();
  }

  push(chunks: string[]): void {
    if (this.stopped || this.closed) return;
    this.pending.push(...chunks);
    this.pump();
  }

  finish(): void {
    this.closed = true;
    this.pump();
  }

  private stop = (): void => {
    this.stopped = true;
    this.pending = [];
    this.ready = null;
    this.signal.removeEventListener('abort', this.stop);
    this.resolve();
  };

  private fail = (error: unknown): void => {
    if (this.stopped) return;
    this.reject(error);
    this.stop();
  };

  private pump(): void {
    if (this.stopped) return;
    if (!this.playing && this.ready) {
      const clip = this.ready;
      this.ready = null;
      this.playing = true;
      void this.play(clip.blob, clip.text).then(() => {
        this.playing = false;
        this.pump();
      }, this.fail);
    }
    if (!this.preparing && !this.ready && this.pending.length) {
      const text = this.pending.shift()!;
      this.preparing = true;
      void this.prepare(text).then((blob) => {
        this.preparing = false;
        if (this.stopped) return;
        if (!blob) return this.stop();
        this.ready = { blob, text };
        this.pump();
      }, this.fail);
    }
    if (this.closed && !this.pending.length && !this.preparing && !this.playing && !this.ready)
      this.stop();
  }
}
