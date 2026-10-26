import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeAudioLevel } from './visualLevel';

describe('optional voice visualization', () => {
  afterEach(() => vi.useRealTimers());

  it('measures actual samples and releases the analyser without disconnecting playback', () => {
    vi.useFakeTimers();
    let amplitude = 0.1;
    const analyser = {
      fftSize: 256,
      getFloatTimeDomainData: (samples: Float32Array) => samples.fill(amplitude),
      disconnect: vi.fn(),
    };
    const context = { createAnalyser: () => analyser } as unknown as AudioContext;
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const emit = vi.fn();
    const stop = observeAudioLevel(context, source as unknown as AudioNode, emit);
    vi.advanceTimersByTime(80);
    expect(emit.mock.lastCall?.[0]).toBeCloseTo(0.5);
    amplitude = 0;
    vi.advanceTimersByTime(80);
    expect(emit).toHaveBeenLastCalledWith(0);
    stop();
    stop();
    expect(source.disconnect).toHaveBeenCalledExactlyOnceWith(analyser);
    expect(analyser.disconnect).toHaveBeenCalledTimes(1);
    const calls = emit.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(emit).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps voice usable when analysis is unavailable', () => {
    const context = {
      createAnalyser: () => {
        throw new Error('Unavailable');
      },
    } as unknown as AudioContext;
    expect(() => observeAudioLevel(context, {} as AudioNode, vi.fn())()).not.toThrow();
  });
});
