import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VoiceDebug } from './voiceDebug';
import { EnergyVad, type VadDiagnostics } from './vad';
import { AdaptiveVad, ResilientVad } from './adaptiveVad';

let at = 0;
const log = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
const diagnostics: VadDiagnostics = {
  detector: 'adaptive',
  fallback: false,
  noiseFloorRms: 0.02,
  startThresholdRms: 0.025,
  continueThresholdRms: 0.023,
  currentThresholdRms: 0.025,
};
beforeEach(() => {
  at = 0;
  log.mockClear();
  vi.spyOn(performance, 'now').mockImplementation(() => at);
});
afterEach(() => vi.mocked(performance.now).mockRestore());
afterAll(() => log.mockRestore());

it('prints only allowlisted scalar aggregates, throttles snapshots, and flushes on stop', () => {
  const debug = new VoiceDebug();
  debug.start();
  debug.observe({ type: 'invalid' }, undefined);
  expect(log).not.toHaveBeenCalled();
  at = 200;
  debug.observe({ type: 'start', frames: [new Int16Array([1234])] }, diagnostics);
  debug.request('realtime');
  at = 400;
  debug.observe({ type: 'pending' }, diagnostics);
  expect(log).toHaveBeenCalledTimes(1);
  at = 1000;
  debug.observe({ type: 'discard', reason: 'stationary_noise' }, diagnostics);
  at = 1200;
  debug.observe({ type: 'pending' }, diagnostics);
  expect(log).toHaveBeenCalledTimes(2);
  debug.request('batch');
  debug.discard('transcript_gate');
  at = 2000;
  debug.finish(diagnostics);
  expect(log).toHaveBeenLastCalledWith('[voice-debug]', {
    elapsedMs: 2000,
    activations: 1,
    discarded: 2,
    discardedByReason: { stationary_noise: 1, transcript_gate: 1 },
    sttRequests: { batch: 1, realtime: 1 },
    sttRequestsPerMinute: 60,
    captureStateMs: 800,
    activeCaptureMs: 0,
    ...diagnostics,
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain('1234');
  expect(log.mock.calls[0][1]).toMatchObject({ discarded: 0 });
});

it('accounts for active, completed and manually reset capture without double counting; resets per session', () => {
  const debug = new VoiceDebug();
  debug.start();
  debug.observe({ type: 'pending' }, undefined);
  expect(log.mock.calls[0][1]).toMatchObject({
    sttRequestsPerMinute: null,
    detector: null,
    noiseFloorRms: null,
  });
  at = 200;
  debug.observe({ type: 'start', frames: [] }, diagnostics);
  at = 1200;
  debug.observe(
    { type: 'frame', speaking: true, frames: [], lastVoicedAt: at, endpointReason: undefined },
    diagnostics,
  );
  expect(log.mock.calls.at(-1)?.[1]).toMatchObject({ activeCaptureMs: 1000, captureStateMs: 1000 });
  at = 1500;
  debug.observe(
    { type: 'frame', speaking: false, frames: [], lastVoicedAt: 1200, endpointReason: 'silence' },
    diagnostics,
  );
  debug.endCapture();
  at = 2000;
  debug.observe({ type: 'start', frames: [] }, diagnostics);
  at = 2200;
  debug.endCapture();
  debug.finish(undefined);
  expect(log.mock.calls.at(-1)?.[1]).toMatchObject({
    activations: 2,
    captureStateMs: 1500,
    discarded: 0,
  });
  debug.start();
  debug.finish(undefined);
  expect(log.mock.calls.at(-1)?.[1]).toMatchObject({
    activations: 0,
    captureStateMs: 0,
    sttRequests: { batch: 0, realtime: 0 },
  });
});

it('exposes noise and next-frame thresholds without returning buffers or changing detector decisions', () => {
  const vad = new AdaptiveVad();
  expect(vad.diagnostics()).toMatchObject({ noiseFloorRms: null, currentThresholdRms: 0.018 });
  for (let i = 0; i < 10; i++) vad.push(new Int16Array(1600).fill(1000));
  expect(vad.diagnostics()).toEqual({
    detector: 'adaptive',
    fallback: false,
    noiseFloorRms: 1000 / 32768,
    startThresholdRms: (1000 / 32768) * 1.25,
    continueThresholdRms: (1000 / 32768) * 1.15,
    currentThresholdRms: (1000 / 32768) * 1.25,
  });
  vad.push(new Int16Array(1600).fill(3000));
  vad.push(new Int16Array(1600).fill(3000));
  expect(vad.diagnostics().currentThresholdRms).toBe(vad.diagnostics().continueThresholdRms);
  const fallback = new ResilientVad(() => {
    throw new Error('init');
  });
  expect(fallback.diagnostics()).toEqual({ ...new EnergyVad().diagnostics(), fallback: true });
  expect(new ResilientVad().diagnostics()?.detector).toBe('adaptive');
  expect(
    new ResilientVad(() => ({
      push: () => ({ type: 'pending' }),
      reset: () => undefined,
    })).diagnostics(),
  ).toBeUndefined();
});
