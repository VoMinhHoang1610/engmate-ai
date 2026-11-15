import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EnergyVad } from '../../src/voice/vad';
import { ResilientVad } from '../../src/voice/adaptiveVad';
import { measure, percentiles } from './measure';
import { syntheticScenarios, type Scenario } from './signals';
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

it('compares opt-in adaptive VAD against EnergyVad on the unchanged labeled corpus', () => {
  const repo = resolve('..');
  const rows: object[] = [];
  function run(scenario: Scenario, synthetic: boolean) {
    for (const mode of ['batch', 'realtime'] as const) {
      const before = measure(scenario, new EnergyVad(), mode);
      const after = measure(scenario, new ResilientVad(), mode);
      const paired = before.segmentLatencies.flatMap((old) => {
        const current = after.segmentLatencies.find((segment) => segment.startMs === old.startMs);
        return current
          ? [{ endpoint: current.endpointMs - old.endpointMs, stt: current.sttMs - old.sttMs }]
          : [];
      });
      const reductionPct = before.falseStarts
        ? (100 * (before.falseStarts - after.falseStarts)) / before.falseStarts
        : null;
      rows.push({
        before,
        after,
        falseStartReductionPct: reductionPct,
        missRateDeltaPp:
          before.missRatePct === null ? null : after.missRatePct! - before.missRatePct,
        pairedEndpointDeltaMs: percentiles(paired.map((item) => item.endpoint)),
        pairedSTTDeltaMs: percentiles(paired.map((item) => item.stt)),
      });
      if (synthetic && /^(white|pink|hum)-/.test(scenario.name)) {
        expect(after.forcedEndpoints).toBe(0);
        expect(after.openCaptureAtEnd).toBe(false);
        expect(after.longestCaptureMs).toBeLessThan(30_000);
      }
      if (synthetic && scenario.speech.length) {
        expect(after.missed).toBeLessThanOrEqual(before.missed);
        const endpointDelta = percentiles(paired.map((item) => item.endpoint));
        if (endpointDelta.p50 !== null) expect(endpointDelta.p50).toBeLessThanOrEqual(150);
      }
    }
  }
  for (const scenario of syntheticScenarios()) run(scenario, true);
  if (process.env.VAD_BENCH_WAV_DIR)
    for (const scenario of localScenarios(process.env.VAD_BENCH_WAV_DIR, repo))
      run(scenario, false);
  mkdirSync(resolve(repo, '.artifacts'), { recursive: true });
  writeFileSync(
    resolve(repo, '.artifacts/voice-vad-adaptive.json'),
    `${JSON.stringify({ version: 1, seed: 20261113, frameMs: 100, rows }, null, 2)}\n`,
  );
  expect(rows.length).toBeGreaterThanOrEqual(56);
});
