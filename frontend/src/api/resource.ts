/** Small session-scoped single-flight cache with independent subscriber cancellation. */
export class Resource<T> {
  private value?: { data: T; expires: number };
  private pending?: { controller: AbortController; promise: Promise<T>; users: number };

  constructor(
    private readonly load: (signal: AbortSignal) => Promise<T>,
    private readonly ttl = 0,
  ) {
    window.addEventListener('engmate-account-changed', () => this.clear());
  }

  clear(): void {
    this.value = undefined;
    this.pending?.controller.abort();
    this.pending = undefined;
  }

  get(signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (this.value && this.value.expires > Date.now()) return Promise.resolve(this.value.data);
    if (!this.pending) {
      const controller = new AbortController();
      const promise = this.load(controller.signal)
        .then((data) => {
          if (controller.signal.aborted) throw controller.signal.reason;
          this.value = { data, expires: Date.now() + this.ttl };
          return data;
        })
        .finally(() => {
          if (this.pending?.controller === controller) this.pending = undefined;
        });
      this.pending = { controller, promise, users: 0 };
    }
    const shared = this.pending;
    shared.users++;
    return new Promise<T>((resolve, reject) => {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        signal?.removeEventListener('abort', cancel);
        shared.users--;
        if (!shared.users && this.pending === shared) {
          this.pending = undefined;
          shared.controller.abort();
        }
      };
      const cancel = () => {
        release();
        reject(signal?.reason);
      };
      signal?.addEventListener('abort', cancel, { once: true });
      shared.promise.then(
        (data) => {
          release();
          resolve(data);
        },
        (error: unknown) => {
          release();
          reject(error);
        },
      );
    });
  }
}
