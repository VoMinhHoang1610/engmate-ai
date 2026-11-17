import { describe, expect, it, vi } from 'vitest';
import {
  drainAsyncCleanup,
  registerAsyncCleanup,
  TestAsyncBoundary,
} from '../../tests/asyncBoundary';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('test async ownership', () => {
  it('preserves successful values and releases an empty boundary', async () => {
    const boundary = new TestAsyncBoundary();
    boundary.start(new AbortController().signal);
    await expect(boundary.run(() => 42)).resolves.toBe(42);
    await boundary.drain();
    await boundary.drain();
    boundary.start(new AbortController().signal);
    boundary.assertActive();
    await boundary.drain();
  });

  it('keeps the timeout failure and prevents a late continuation from mutating the next test', async () => {
    const boundary = new TestAsyncBoundary();
    const controller = new AbortController();
    const response = deferred<string>();
    const mutate = vi.fn();
    const timeout = new Error('Original test timed out in 5000ms.');
    boundary.start(controller.signal);
    const continuation = boundary.run(() => response.promise).then(mutate);
    const failure = expect(continuation).rejects.toBe(timeout);
    controller.abort(timeout);
    const draining = boundary.drain();
    expect(() => boundary.start(new AbortController().signal)).toThrow('has not been drained');
    response.resolve('old response');
    await failure;
    await draining;
    boundary.start(new AbortController().signal);
    await expect(boundary.run(() => 'new response')).resolves.toBe('new response');
    expect(mutate).not.toHaveBeenCalled();
    await boundary.drain();
  });

  it('does not invoke work after the owning test has been aborted', async () => {
    const boundary = new TestAsyncBoundary();
    const controller = new AbortController();
    const reason = new Error('Cancelled by runner');
    const work = vi.fn();
    boundary.start(controller.signal);
    controller.abort(reason);
    expect(() => boundary.run(work)).toThrow(reason);
    expect(() => boundary.assertActive()).toThrow(reason);
    expect(work).not.toHaveBeenCalled();
    await boundary.drain();
  });

  it('preserves an operation rejection even when its owner later aborts', async () => {
    const boundary = new TestAsyncBoundary();
    const controller = new AbortController();
    const response = deferred<string>();
    const upstream = new Error('Original operation rejection');
    boundary.start(controller.signal);
    const failure = expect(boundary.run(() => response.promise)).rejects.toBe(upstream);
    controller.abort(new Error('Different timeout reason'));
    const draining = boundary.drain();
    response.reject(upstream);
    await failure;
    await draining;
  });

  it('fails cleanup for an unawaited operation instead of silently accepting it', async () => {
    const boundary = new TestAsyncBoundary();
    const response = deferred<number>();
    boundary.start(new AbortController().signal);
    const late = expect(boundary.run(() => response.promise)).rejects.toThrow(
      'after its test ended',
    );
    const cleanup = expect(boundary.drain()).rejects.toThrow('pending async operations');
    expect(() => boundary.run(() => 1)).toThrow('boundary is closing');
    response.resolve(1);
    await late;
    await cleanup;
    boundary.start(new AbortController().signal);
    await boundary.drain();
  });

  it('rejects unowned work and preserves synchronous exceptions', async () => {
    const boundary = new TestAsyncBoundary();
    expect(() => boundary.run(() => 1)).toThrow('No test owns');
    boundary.start(new AbortController().signal);
    const failure = new Error('Synchronous operation failure');
    expect(() =>
      boundary.run(() => {
        throw failure;
      }),
    ).toThrow(failure);
    await boundary.drain();
  });

  it('uses only the registered drain and never replaces another registration', async () => {
    await drainAsyncCleanup();
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);
    const releaseFirst = registerAsyncCleanup(first);
    try {
      expect(() => registerAsyncCleanup(second)).toThrow('already registered');
      await drainAsyncCleanup();
      expect(first).toHaveBeenCalledOnce();
      expect(second).not.toHaveBeenCalled();
    } finally {
      releaseFirst();
    }
    const releaseSecond = registerAsyncCleanup(second);
    try {
      releaseFirst();
      await drainAsyncCleanup();
      expect(second).toHaveBeenCalledOnce();
    } finally {
      releaseSecond();
    }
  });
});
