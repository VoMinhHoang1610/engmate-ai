interface TestScope {
  signal: AbortSignal;
  closing: boolean;
  pending: Set<Promise<void>>;
}

/** Opt-in test ownership; never changes React flags or the runner's deadlines. */
export class TestAsyncBoundary {
  private scope: TestScope | null = null;

  start(signal: AbortSignal): void {
    if (this.scope) throw new Error('The previous test async boundary has not been drained.');
    this.scope = { signal, closing: false, pending: new Set() };
  }

  assertActive(): void {
    this.requireScope();
  }

  private requireScope(): TestScope {
    const scope = this.scope;
    if (!scope) throw new Error('No test owns this async operation.');
    scope.signal.throwIfAborted();
    if (scope.closing) throw new Error('The test async boundary is closing.');
    return scope;
  }

  run<T>(operation: () => T | PromiseLike<T>): Promise<T> {
    const owner = this.requireScope();
    const result = Promise.resolve(operation());
    // Observe the underlying operation separately. The returned promise still rejects
    // with its original error, including when a caller forgets to await it.
    const settled = result.then(
      () => {
        owner.pending.delete(settled);
      },
      () => {
        owner.pending.delete(settled);
      },
    );
    owner.pending.add(settled);
    return result.then((value) => {
      owner.signal.throwIfAborted();
      if (owner.closing || this.scope !== owner)
        throw new Error('Async work completed after its test ended.');
      return value;
    });
  }

  /** Called after RTL cleanup, under the unchanged afterEach hook deadline. */
  async drain(): Promise<void> {
    const owner = this.scope;
    if (!owner) return;
    owner.closing = true;
    const abandoned = owner.pending.size > 0 && !owner.signal.aborted;
    while (owner.pending.size) await Promise.all([...owner.pending]);
    this.scope = null;
    if (abandoned) throw new Error('The test finished with pending async operations.');
  }
}

let cleanupDrain: (() => Promise<void>) | null = null;

/** Only an explicitly opted-in test file may register a cleanup drain. */
export function registerAsyncCleanup(drain: () => Promise<void>): () => void {
  if (cleanupDrain) throw new Error('A test async cleanup drain is already registered.');
  cleanupDrain = drain;
  return () => {
    if (cleanupDrain === drain) cleanupDrain = null;
  };
}

export async function drainAsyncCleanup(): Promise<void> {
  await cleanupDrain?.();
}
