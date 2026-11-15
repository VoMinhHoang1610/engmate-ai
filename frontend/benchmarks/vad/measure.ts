import { vi } from 'vitest';
import { VoiceLatencyTrace, type VoiceLatencyReport } from '../../src/voice/latency';
import { FRAME_MS, FRAME_SAMPLES, RATE, type Scenario, type Span } from './signals';
import type { VoiceVad } from '../../src/voice/vad';

function overlap(a: Span, b: Span): number {
  return Math.max(0, Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs));
}

export function percentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1] ?? null,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null,
  };
}

/** Virtual 100 ms delivery clock; no sleep, network, decoding, or fake provider latency. */
export function measure(scenario: Scenario, detector: VoiceVad, mode: 'batch' | 'realtime') {
  const turns: (Span & { requestedAt: number; report: VoiceLatencyReport })[] = [];
  const starts: number[] = [];
  let at = 0;
  let startMs = 0;
  let requestedAt = 0;
  let active = false;
  let falseStarts = 0;
  let falseInterruptions = 0;
  let activeNoiseMs = 0;
  let discardedCaptures = 0;
  let longestCaptureMs = 0;
  let captureStateMs = 0;
  const captureOutcomes: {
    activatedAtMs: number;
    closedAtMs: number;
    reason: 'silence' | 'max_duration' | 'stationary_noise';
    sttRequested: boolean;
  }[] = [];
  const interrupted = new Set<number>();
  const reports: VoiceLatencyReport[] = [];
  const listener = (event: Event) =>
    reports.push((event as CustomEvent<VoiceLatencyReport>).detail);
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => at);
  window.addEventListener('engmate-voice-latency', listener);
  try {
    for (let offset = 0; offset < scenario.pcm.length; offset += FRAME_SAMPLES) {
      at = ((offset + FRAME_SAMPLES) / RATE) * 1000;
      // State is entered at onset delivery, not at the beginning of its confirming PCM frame.
      if (active) captureStateMs += FRAME_MS;
      const result = detector.push(scenario.pcm.slice(offset, offset + FRAME_SAMPLES), at);
      if (result.type === 'start') {
        active = true;
        startMs = at - result.frames.length * FRAME_MS;
        requestedAt = at;
        starts.push(at);
        const startFrame = { startMs: at - FRAME_MS, endMs: at };
        const trueStart = scenario.speech.some((span) => overlap(span, startFrame) > 0);
        if (!trueStart) {
          falseStarts++;
          scenario.playback.forEach((span, index) => {
            if (overlap(span, startFrame) > 0 && !interrupted.has(index)) {
              interrupted.add(index);
              falseInterruptions++;
            }
          });
        }
      }
      if (active) {
        longestCaptureMs = Math.max(longestCaptureMs, at - startMs);
        const frameSpan = { startMs: at - FRAME_MS, endMs: at };
        activeNoiseMs +=
          FRAME_MS - scenario.speech.reduce((sum, span) => sum + overlap(span, frameSpan), 0);
      }
      if (result.type === 'discard') {
        discardedCaptures++;
        captureOutcomes.push({
          activatedAtMs: requestedAt,
          closedAtMs: at,
          reason: result.reason,
          sttRequested: mode === 'realtime',
        });
        active = false;
        detector.reset();
        continue;
      }
      if (result.type !== 'frame' || !result.endpointReason) continue;
      captureOutcomes.push({
        activatedAtMs: requestedAt,
        closedAtMs: at,
        reason: result.endpointReason,
        sttRequested: true,
      });
      const trace = new VoiceLatencyTrace(result.lastVoicedAt, result.endpointReason, mode);
      trace.markAt('stt_requested', mode === 'realtime' ? requestedAt : at);
      // Completed means this local measurement completed, NOT a successful provider turn.
      trace.finish('completed');
      turns.push({
        startMs,
        endMs: at,
        requestedAt: mode === 'realtime' ? requestedAt : at,
        report: reports.at(-1)!,
      });
      active = false;
      detector.reset();
    }
  } finally {
    detector.reset();
    clock.mockRestore();
    window.removeEventListener('engmate-voice-latency', listener);
  }
  let missed = 0;
  let unfinished = 0;
  const endToEndpoint: number[] = [];
  const endToSTT: number[] = [];
  const segmentLatencies: { startMs: number; endpointMs: number; sttMs: number }[] = [];
  for (const speech of scenario.speech) {
    // A captured segment needs >=50% overlap. Recognition/word accuracy is not measured.
    const turn = turns.find(
      (candidate) => overlap(candidate, speech) >= (speech.endMs - speech.startMs) * 0.5,
    );
    if (!turn) {
      missed++;
      continue;
    }
    if (turn.report.endpointReason !== 'silence' || turn.endMs < speech.endMs) {
      unfinished++;
      continue;
    }
    endToEndpoint.push(turn.endMs - speech.endMs);
    endToSTT.push(turn.requestedAt - speech.endMs);
    segmentLatencies.push({
      startMs: speech.startMs,
      endpointMs: turn.endMs - speech.endMs,
      sttMs: turn.requestedAt - speech.endMs,
    });
  }
  const durationMs = (scenario.pcm.length / RATE) * 1000;
  const noiseMs =
    durationMs - scenario.speech.reduce((sum, span) => sum + span.endMs - span.startMs, 0);
  const proxyEndpoints = reports.filter((report) => report.endpointReason === 'silence');
  // Local request opportunities, no transport failures/retries/provider billing simulation.
  const sttRequests = mode === 'realtime' ? starts.length : turns.length;
  return {
    name: scenario.name,
    mode,
    snrDb: scenario.snrDb ?? null,
    durationMs,
    noiseMs,
    starts: starts.length,
    falseStarts,
    falseStartsPerMinute: noiseMs ? (falseStarts * 60_000) / noiseMs : null,
    activeNoiseMs,
    captureStateMs,
    sttRequests,
    sttRequestsPerMinute: (sttRequests * 60_000) / durationMs,
    discardedBeforeSTT: mode === 'batch' ? discardedCaptures : 0,
    discardedAfterSTT: mode === 'realtime' ? discardedCaptures : 0,
    captureOutcomes,
    discardedCaptures,
    longestCaptureMs,
    segmentLatencies,
    falseInterruptions,
    playbackWindows: scenario.playback.length,
    speechSegments: scenario.speech.length,
    missed,
    missRatePct: scenario.speech.length ? (missed * 100) / scenario.speech.length : null,
    unfinishedSpeechSegments: unfinished,
    openCaptureAtEnd: active,
    forcedEndpoints: reports.filter((report) => report.endpointReason === 'max_duration').length,
    endpointFromLabelMs: percentiles(endToEndpoint),
    sttFromLabelMs: percentiles(endToSTT),
    endpointFromLastVoicedMs: percentiles(proxyEndpoints.map((report) => report.stages.endpoint!)),
    sttFromLastVoicedMs: percentiles(proxyEndpoints.map((report) => report.stages.stt_requested!)),
  };
}
