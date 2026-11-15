import * as fs from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnergyVad } from '../../src/voice/vad';
import { AdaptiveVad } from '../../src/voice/adaptiveVad';
import { measure } from './measure';
import { decodeWav, localScenarios } from './wav';
import type { Scenario } from './signals';

vi.mock('node:fs', () => {
  const filesystem = { realpathSync: vi.fn(), statSync: vi.fn(), readFileSync: vi.fn() };
  return { default: filesystem, ...filesystem };
});

function fixture(speech = true): Scenario {
  const pcm = new Int16Array(16000 * 3);
  pcm.fill(2000, 16000, 16000 + 3200);
  return {
    name: 'fixture',
    pcm,
    speech: speech ? [{ startMs: 1000, endMs: 1200 }] : [],
    playback: [{ startMs: 500, endMs: 2500 }],
  };
}

describe('offline scoring sanity checks', () => {
  it('distinguishes batch requests after endpoint from realtime requests before noise discard', () => {
    const scenario = fixture(false);
    scenario.pcm.fill(2000);
    const batch = measure(scenario, new AdaptiveVad(), 'batch');
    const realtime = measure(scenario, new AdaptiveVad(), 'realtime');
    expect(batch).toMatchObject({
      sttRequests: 0,
      sttRequestsPerMinute: 0,
      captureStateMs: 800,
      activeNoiseMs: 900,
      discardedBeforeSTT: 1,
      discardedAfterSTT: 0,
      captureOutcomes: [
        { activatedAtMs: 200, closedAtMs: 1000, reason: 'stationary_noise', sttRequested: false },
      ],
    });
    expect(realtime).toMatchObject({
      sttRequests: 1,
      sttRequestsPerMinute: 20,
      captureStateMs: 800,
      discardedBeforeSTT: 0,
      discardedAfterSTT: 1,
      captureOutcomes: [
        { activatedAtMs: 200, closedAtMs: 1000, reason: 'stationary_noise', sttRequested: true },
      ],
    });
  });

  it('counts completed batch turns and realtime onsets, using full audio minutes', () => {
    for (const mode of ['batch', 'realtime'] as const) {
      const complete = measure(fixture(), new EnergyVad(), mode);
      expect(complete).toMatchObject({
        sttRequests: 1,
        sttRequestsPerMinute: 20,
        captureStateMs: 900,
      });
      const open = fixture();
      open.pcm.fill(2000);
      expect(measure(open, new EnergyVad(), mode)).toMatchObject({
        sttRequests: mode === 'batch' ? 0 : 1,
        captureStateMs: 2800,
        openCaptureAtEnd: true,
      });
    }
  });
  it('counts rejected captures as false starts and missed speech, never as completed turns', () => {
    const scenario = fixture();
    scenario.pcm.fill(2000);
    expect(measure(scenario, new AdaptiveVad(), 'batch')).toMatchObject({
      starts: 1,
      falseStarts: 1,
      discardedCaptures: 1,
      longestCaptureMs: 1000,
      missed: 1,
      forcedEndpoints: 0,
      openCaptureAtEnd: false,
      endpointFromLabelMs: { samples: 0 },
    });
  });
  it('measures 900 ms endpoint delay and signed realtime request offset through VoiceLatencyTrace', () => {
    for (const mode of ['batch', 'realtime'] as const) {
      const result = measure(fixture(), new EnergyVad(), mode);
      expect(result).toMatchObject({
        starts: 1,
        falseStarts: 0,
        missed: 0,
        falseInterruptions: 0,
        endpointFromLabelMs: { samples: 1, p50: 900, p95: 900 },
        sttFromLabelMs: { samples: 1, p50: mode === 'batch' ? 900 : 0 },
        endpointFromLastVoicedMs: { samples: 1, p50: 900 },
      });
    }
    const longer = fixture();
    longer.pcm.fill(2000, 16000, 32000);
    longer.speech = [{ startMs: 1000, endMs: 2000 }];
    expect(measure(longer, new EnergyVad(), 'realtime').sttFromLabelMs.p50).toBe(-800);
  });

  it('counts false starts per non-speech minute and one interruption per playback window', () => {
    expect(measure(fixture(false), new EnergyVad(), 'batch')).toMatchObject({
      falseStarts: 1,
      falseStartsPerMinute: 20,
      falseInterruptions: 1,
      speechSegments: 0,
      missRatePct: null,
      endpointFromLabelMs: { samples: 0, p50: null, p95: null },
    });
  });

  it('reports missed speech and unfinished capture instead of inventing latency samples', () => {
    const quiet = fixture();
    quiet.pcm.fill(0);
    expect(measure(quiet, new EnergyVad(), 'batch')).toMatchObject({
      missed: 1,
      missRatePct: 100,
      endpointFromLabelMs: { samples: 0 },
    });
    quiet.pcm.fill(2000);
    expect(measure(quiet, new EnergyVad(), 'batch')).toMatchObject({
      openCaptureAtEnd: true,
      endpointFromLabelMs: { samples: 0 },
    });
  });
});

function wavFixture(): Uint8Array {
  const bytes = new Uint8Array(44 + 3200);
  const view = new DataView(bytes.buffer);
  const tag = (offset: number, text: string) =>
    [...text].forEach((value, i) => {
      bytes[offset + i] = value.charCodeAt(0);
    });
  tag(0, 'RIFF');
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  tag(36, 'data');
  view.setUint32(4, bytes.length - 8, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, 3200, true);
  view.setInt16(44, -1234, true);
  return bytes;
}

describe('private WAV input', () => {
  it('decodes signed little-endian PCM including a nonzero underlying buffer offset', () => {
    const wrapped = new Uint8Array(4000);
    wrapped.set(wavFixture(), 3);
    const result = decodeWav(wrapped.subarray(3, 3 + 3244));
    expect(result).toHaveLength(1600);
    expect(result[0]).toBe(-1234);
  });
  it.each([22, 24, 28, 32, 34, 40])('rejects incompatible format/data field %i', (offset) => {
    const bytes = wavFixture();
    bytes[offset] = 7;
    expect(() => decodeWav(bytes)).toThrow();
  });
  it('rejects truncated input', () => {
    expect(() => decodeWav(wavFixture().subarray(0, 40))).toThrow();
  });
});

describe('private corpus labels (filesystem doubles, no audio writes)', () => {
  afterEach(() => vi.resetAllMocks());

  function corpus(labels: unknown) {
    const repo = resolve('..');
    const root = resolve(repo, '.artifacts', 'private-vad-fixture');
    vi.mocked(fs.realpathSync).mockImplementation((path) => resolve(String(path)));
    vi.mocked(fs.statSync).mockReturnValue({ size: 4000 } as fs.Stats);
    vi.mocked(fs.readFileSync).mockImplementation((path) =>
      String(path).endsWith('labels.json')
        ? Buffer.from(JSON.stringify(labels))
        : Buffer.from(wavFixture()),
    );
    return { repo, root };
  }

  it('loads explicit labels without exposing filenames in report case names', () => {
    const { repo, root } = corpus([
      { file: 'private.wav', speech: [{ startMs: 0, endMs: 100 }], playback: [] },
    ]);
    const [scenario] = [...localScenarios(root, repo)];
    expect(scenario.name).toBe('local-1');
    expect(scenario.pcm[0]).toBe(-1234);
    expect(scenario.speech).toEqual([{ startMs: 0, endMs: 100 }]);
  });

  it.each([
    [{ file: '../escape.wav', speech: [], playback: [] }],
    [{ file: 'a.wav', speech: [{ startMs: 0, endMs: 101 }], playback: [] }],
    [
      {
        file: 'a.wav',
        speech: [
          { startMs: 0, endMs: 50 },
          { startMs: 40, endMs: 80 },
        ],
        playback: [],
      },
    ],
    [{ file: 'a.wav', speech: [], playback: null }],
    [],
  ])('rejects unsafe paths and invalid label entries %j', (...entries) => {
    const { repo, root } = corpus(entries);
    expect(() => [...localScenarios(root, repo)]).toThrow();
  });

  it('rejects a corpus in tracked source directories', () => {
    const { repo } = corpus([]);
    expect(() => [...localScenarios(resolve(repo, 'frontend', 'src'), repo)]).toThrow(
      'outside the repository or inside .artifacts',
    );
  });
});
