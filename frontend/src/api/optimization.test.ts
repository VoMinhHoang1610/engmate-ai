import { afterEach, describe, expect, it, vi } from 'vitest';
import { Resource } from './resource';
import { readJSON } from './readJSON';
import { mergeMessages, messageCursor } from './messages';
import type { Message } from '../types';

afterEach(() => {
  window.dispatchEvent(new Event('engmate-account-changed'));
  vi.useRealTimers();
});

describe('bounded body and session resources', () => {
  it('rejects a stalled body after headers and cancels its reader', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }));
    const result = readJSON(response);
    const assertion = expect(result).rejects.toThrow('quá thời gian');
    await vi.advanceTimersByTimeAsync(45000);
    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('cancels a body read immediately when its caller leaves', async () => {
    const caller = new AbortController();
    const result = readJSON(new Response(new ReadableStream()), caller.signal);
    const assertion = expect(result).rejects.toThrow();
    caller.abort();
    await assertion;
  });

  it('shares a request and TTL across subscribers without letting one abort the other', async () => {
    let finish!: (value: string) => void;
    const load = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          expect(signal.aborted).toBe(false);
          finish = resolve;
        }),
    );
    const cache = new Resource(load, 300000);
    const first = new AbortController();
    const a = cache.get(first.signal);
    const b = cache.get();
    const assertion = expect(a).rejects.toThrow();
    first.abort();
    await assertion;
    expect(load.mock.calls[0][0].aborted).toBe(false);
    finish('catalog');
    expect(await b).toBe('catalog');
    expect(await cache.get()).toBe('catalog');
    expect(load).toHaveBeenCalledOnce();
  });

  it('rejects late account data and reloads on account switch and expiry', async () => {
    vi.useFakeTimers();
    let finish!: (value: string) => void;
    const load = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          expect(signal.aborted).toBe(false);
          finish = resolve;
        }),
    );
    const cache = new Resource(load, 100);
    const first = cache.get();
    const assertion = expect(first).rejects.toThrow();
    window.dispatchEvent(new Event('engmate-account-changed'));
    finish('old');
    await assertion;
    const second = cache.get();
    finish('new');
    expect(await second).toBe('new');
    await vi.advanceTimersByTimeAsync(101);
    const third = cache.get();
    finish('fresh');
    expect(await third).toBe('fresh');
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('cancels underlying work when its last subscriber leaves and does not cache failures', async () => {
    const load = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
    );
    const cache = new Resource(load);
    const caller = new AbortController();
    const result = cache.get(caller.signal);
    const assertion = expect(result).rejects.toThrow();
    caller.abort();
    await assertion;
    expect(load.mock.calls[0][0].aborted).toBe(true);
    const again = cache.get();
    const rejected = expect(again).rejects.toThrow();
    cache.clear();
    await rejected;
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('incremental history', () => {
  it('reconciles 1000 stable rows and a pending tail without duplicating IDs or old row objects', () => {
    const rows: Message[] = Array.from({ length: 1000 }, (_, index) => ({
      message_id: index + 1,
      content: 'old',
      status: 'completed',
      role: 'assistant',
    }));
    rows[999] = { ...rows[999], status: 'pending' };
    expect(messageCursor(rows)).toBe(999);
    const merged = mergeMessages(rows, [
      { ...rows[999], content: 'done', status: 'completed' },
      { message_id: 1001, content: 'new', status: 'completed', role: 'user' },
    ]);
    expect(merged).toHaveLength(1001);
    expect(merged[0]).toBe(rows[0]);
    expect(merged[999].content).toBe('done');
    expect(messageCursor(merged)).toBe(1000);
    expect(mergeMessages(merged, merged)).toHaveLength(1001);
  });
});
