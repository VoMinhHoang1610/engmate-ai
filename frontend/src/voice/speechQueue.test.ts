import { describe, expect, it, vi } from 'vitest';
import { SpeechQueue } from './speechQueue';

async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('bounded ordered speech queue', () => {
  it('prepares only one clip ahead and plays clips in order', async () => {
    const controller = new AbortController();
    const prepare = vi.fn(async (text: string) => new Blob([text]));
    const ends: (() => void)[] = [];
    const play = vi.fn(() => new Promise<void>((resolve) => ends.push(resolve)));
    const queue = new SpeechQueue(controller.signal, prepare, play);
    queue.push(['one', 'two', 'three']);
    queue.finish();
    await flush();
    expect(prepare.mock.calls.map(([text]) => text)).toEqual(['one', 'two']);
    expect(play).toHaveBeenCalledTimes(1);
    ends[0]();
    await flush();
    expect(prepare.mock.calls.map(([text]) => text)).toEqual(['one', 'two', 'three']);
    expect(play).toHaveBeenCalledTimes(2);
    ends[1]();
    await flush();
    ends[2]();
    await queue.completion;
  });

  it('starts preparing new text while a previous sentence is playing', async () => {
    const controller = new AbortController();
    const prepare = vi.fn(async () => new Blob(['audio']));
    const queue = new SpeechQueue(controller.signal, prepare, () => new Promise(() => undefined));
    queue.push(['one']);
    await flush();
    queue.push(['two', 'three']);
    await flush();
    expect(prepare).toHaveBeenCalledTimes(2);
    controller.abort();
    await queue.completion;
  });

  it('drops pending and late clips after cancellation', async () => {
    const controller = new AbortController();
    let deliver!: (blob: Blob) => void;
    const prepare = vi.fn(() => new Promise<Blob>((resolve) => (deliver = resolve)));
    const play = vi.fn();
    const queue = new SpeechQueue(controller.signal, prepare, play);
    queue.push(['old', 'never']);
    controller.abort();
    deliver(new Blob(['late']));
    await queue.completion;
    await flush();
    expect(play).not.toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it.each(['prepare', 'play'])('rejects on %s errors without starting more work', async (stage) => {
    const prepare = vi.fn(async () => {
      if (stage === 'prepare') throw new Error('prepare failure');
      return new Blob(['audio']);
    });
    const play = vi.fn(async () => {
      if (stage === 'play') throw new Error('play failure');
    });
    const queue = new SpeechQueue(new AbortController().signal, prepare, play);
    queue.push(['one', 'two', 'three']);
    await expect(queue.completion).rejects.toThrow('failure');
    const calls = prepare.mock.calls.length;
    queue.push(['late']);
    await flush();
    expect(prepare).toHaveBeenCalledTimes(calls);
  });
});
