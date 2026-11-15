import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EnergyVad } from '../../src/voice/vad';
import { LegacyEnergyVad } from './legacy';
import { measure } from './measure';
import { FRAME_SAMPLES, syntheticScenarios, type Scenario } from './signals';
import { localScenarios } from './wav';

beforeEach(() => {
  const forbidden = () => {
    throw new Error('Network is forbidden in the offline VAD benchmark');
  };
  vi.stubGlobal('fetch', forbidden);
  vi.stubGlobal('WebSocket', forbidden);
  vi.stubGlobal('XMLHttpRequest', forbidden);
});
afterEach(() => vi.unstubAllGlobals());

function assertParity(scenario: Scenario): void {
  const old = new LegacyEnergyVad();
  const current = new EnergyVad();
  for (let offset = 0; offset < scenario.pcm.length; offset += FRAME_SAMPLES) {
    const frame = scenario.pcm.slice(offset, offset + FRAME_SAMPLES);
    const at = (offset + FRAME_SAMPLES) / 16;
    const before = old.push(frame, at);
    const after = current.push(frame, at);
    expect(after.type).toBe(before.type);
    if (
      (before.type === 'start' && after.type === 'start') ||
      (before.type === 'frame' && after.type === 'frame')
    ) {
      expect(after.frames.length).toBe(before.frames.length);
      // Identity/order checks compare actual retained PCM without serializing voice samples.
      for (let index = 0; index < before.frames.length; index++)
        if (after.frames[index] !== before.frames[index]) throw new Error('PCM retention diverged');
    }
    if (before.type === 'frame' && after.type === 'frame') {
      expect([after.speaking, after.endpointReason, after.lastVoicedAt]).toEqual([
        before.speaking,
        before.endpointReason,
        before.lastVoicedAt,
      ]);
      if (before.endpointReason) {
        old.reset();
        current.reset();
      }
    }
  }
}

it('measures legacy and extracted VAD on the same offline corpus with exact parity', () => {
  const rows: { before: ReturnType<typeof measure>; after: ReturnType<typeof measure> }[] = [];
  const repo = resolve('..');
  function run(scenario: Scenario) {
    assertParity(scenario);
    for (const mode of ['batch', 'realtime'] as const) {
      const before = measure(scenario, new LegacyEnergyVad(), mode);
      const after = measure(scenario, new EnergyVad(), mode);
      expect(after).toEqual(before);
      rows.push({ before, after });
    }
  }
  for (const scenario of syntheticScenarios()) run(scenario);
  if (process.env.VAD_BENCH_WAV_DIR)
    for (const scenario of localScenarios(process.env.VAD_BENCH_WAV_DIR, repo)) run(scenario);
  const report = {
    version: 1,
    seed: 20261113,
    frameMs: 100,
    scope: 'Offline synthetic/local PCM; virtual clock; no provider or browser AEC measurements',
    rows,
  };
  const output = resolve(repo, '.artifacts', 'voice-vad-baseline.json');
  mkdirSync(resolve(repo, '.artifacts'), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  expect(rows.length).toBeGreaterThanOrEqual(56);
}, 120_000);
