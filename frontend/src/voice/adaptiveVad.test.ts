import { describe, expect, it, vi } from 'vitest';
import { AdaptiveVad, ResilientVad } from './adaptiveVad';
import { EnergyVad, type VadResult, type VoiceVad } from './vad';

const frame = (rms = 0) => new Int16Array(1600).fill(Math.round(rms * 32768));
function feed(vad: VoiceVad, count: number, rms: number): VadResult {
  let result: VadResult = { type: 'pending' };
  for (let i = 0; i < count; i++) result = vad.push(frame(rms), i * 100);
  return result;
}

describe('adaptive energy capture', () => {
  it('ignores malformed frames and isolated impulses; retains pre-roll for a 200 ms answer', () => {
    const vad = new AdaptiveVad();
    const silence = frame();
    const first = frame(0.03);
    const second = frame(0.04);
    expect(vad.push(first).type).toBe('pending');
    expect(vad.push(new Int16Array(1)).type).toBe('invalid');
    expect(vad.push(silence).type).toBe('pending');
    expect(vad.push(first).type).toBe('pending');
    expect(vad.push(second)).toEqual({ type: 'start', frames: [silence, first, second] });
    const result = feed(vad, 9, 0);
    expect(result).toMatchObject({
      type: 'frame',
      endpointReason: 'silence',
      evidence: { voicedMs: 200, voicedRatio: 2 / 12 },
    });
  });

  it('uses a lower continuation threshold without admitting quiet onsets', () => {
    const vad = new AdaptiveVad();
    expect(feed(vad, 4, 0.015).type).toBe('pending');
    expect(feed(vad, 2, 0.03).type).toBe('start');
    expect(vad.push(frame(0.018), 500)).toMatchObject({
      type: 'frame',
      speaking: true,
      lastVoicedAt: 500,
    });
    expect(vad.push(frame(0.016))).toMatchObject({ type: 'frame', speaking: false });
    expect(feed(vad, 8, 0).type).toBe('frame');
  });

  it('ends stationary high noise in one second, remembers its floor, and clears it on mute/restart', () => {
    const vad = new AdaptiveVad();
    expect(feed(vad, 10, 0.03)).toEqual({ type: 'discard', reason: 'stationary_noise' });
    vad.reset();
    expect(feed(vad, 600, 0.03).type).toBe('pending');
    expect(feed(vad, 2, 0.06).type).toBe('start');
    vad.reset(true);
    expect(feed(vad, 2, 0.03).type).toBe('start');
  });

  it('keeps the original maximum duration for modulated speech and silence precedence', () => {
    for (const silentTail of [false, true]) {
      const vad = new AdaptiveVad();
      let result: VadResult = { type: 'pending' };
      for (let i = 0; i < 300; i++)
        result = vad.push(frame(silentTail && i >= 291 ? 0 : i % 2 ? 0.06 : 0.03), i * 100);
      expect(result).toMatchObject({
        type: 'frame',
        endpointReason: silentTail ? 'silence' : 'max_duration',
      });
    }
  });
});

describe('sticky energy fallback', () => {
  it('falls back after initialization failure and keeps the legacy endpoint', () => {
    const vad = new ResilientVad(() => {
      throw new Error('init');
    });
    expect(feed(vad, 2, 0.03).type).toBe('start');
    expect(feed(vad, 9, 0)).toMatchObject({ type: 'frame', endpointReason: 'silence' });
    vad.reset(true);
    expect(feed(vad, 2, 0.03).type).toBe('start');
  });

  it.each([1, 2, 3, 5])(
    'replays ordered pre-roll on frame %i failure without duplicating a capture start',
    (failureAt) => {
      const inner = new EnergyVad();
      let calls = 0;
      const push = vi.fn((pcm: Int16Array, at?: number) => {
        if (++calls === failureAt) throw new Error('runtime');
        return inner.push(pcm, at);
      });
      const vad = new ResilientVad(() => ({ push, reset: () => inner.reset() }));
      expect(vad.push(new Int16Array()).type).toBe('invalid');
      const samples = [frame(), frame(0.03), frame(0.04), frame(0.05), frame(0.06)];
      let starts = 0;
      let result: VadResult = { type: 'pending' };
      samples.forEach((pcm, i) => {
        result = vad.push(pcm, i * 100);
        if (result.type === 'start') starts++;
      });
      expect(starts).toBe(1);
      expect(result).toMatchObject({ type: 'frame', frames: samples, lastVoicedAt: 400 });
      expect(feed(vad, 9, 0)).toMatchObject({ type: 'frame', endpointReason: 'silence' });
      expect(push).toHaveBeenCalledTimes(failureAt);
    },
  );

  it('emits one start when replay catches an onset missed by the failed adaptive detector', () => {
    let calls = 0;
    const vad = new ResilientVad(() => ({
      reset: vi.fn(),
      push: () => {
        if (++calls === 3) throw new Error('runtime');
        return { type: 'pending' };
      },
    }));
    expect(feed(vad, 3, 0.03).type).toBe('start');
    expect(vad.push(frame(0.04)).type).toBe('frame');
  });

  it('clears retained PCM on discard and explicit reset, including a failing reset', () => {
    const vad = new ResilientVad();
    expect(feed(vad, 10, 0.03).type).toBe('discard');
    expect(feed(vad, 10, 0.03).type).toBe('pending');
    vad.reset(true);
    expect(feed(vad, 2, 0.03).type).toBe('start');
    const broken = new ResilientVad(() => ({
      push: vi.fn(),
      reset: () => {
        throw new Error('reset');
      },
    }));
    broken.reset(true);
    expect(feed(broken, 2, 0.03).type).toBe('start');
  });
});
