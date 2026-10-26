import { describe, expect, it, vi } from 'vitest';
import { summarizeVoiceLatency, VoiceLatencyTrace, type VoiceLatencyReport } from './latency';

describe('voice latency diagnostics', () => {
  it('includes endpoint waiting and emits only the first mark and one terminal report', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1900);
    const listener = vi.fn();
    window.addEventListener('engmate-voice-latency', listener);
    try {
      const trace = new VoiceLatencyTrace(1000, 'silence');
      clock.mockReturnValue(2400);
      trace.mark('playback_started');
      clock.mockReturnValue(9000);
      trace.mark('playback_started');
      trace.finish('completed');
      trace.finish('cancelled');
      expect(listener).toHaveBeenCalledOnce();
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
        traceId: trace.id,
        status: 'completed',
        endpointReason: 'silence',
        sttMode: 'batch',
        stages: { endpoint: 900, playback_started: 1400 },
      });
    } finally {
      window.removeEventListener('engmate-voice-latency', listener);
      clock.mockRestore();
    }
  });

  it('reports sample counts and percentiles without mixing failed or forced turns', () => {
    const reports: VoiceLatencyReport[] = Array.from({ length: 100 }, (_, index) => ({
      traceId: `${index}`,
      status: 'completed',
      endpointReason: 'silence',
      stages: { playback_started: index + 1 },
    }));
    reports.push({ ...reports[0], status: 'failed', stages: { playback_started: 9999 } });
    reports.push({ ...reports[0], endpointReason: 'max_duration' });
    reports.push({ ...reports[0], status: 'cancelled' });
    expect(summarizeVoiceLatency(reports)).toMatchObject({
      estimatedEndToPlaybackMs: { samples: 100, p50: 50, p95: 95 },
      sttMs: { samples: 0, p50: null, p95: null },
    });
    expect(summarizeVoiceLatency([]).estimatedEndToPlaybackMs).toEqual({
      samples: 0,
      p50: null,
      p95: null,
    });
  });

  it('retains negative STT offsets for recognition that started during speech', () => {
    const listener = vi.fn();
    window.addEventListener('engmate-voice-latency', listener);
    try {
      const trace = new VoiceLatencyTrace(5000, 'silence', 'realtime');
      trace.markAt('stt_requested', 1000);
      trace.markAt('stt_final', 6000);
      trace.finish('completed');
      const report = (listener.mock.calls[0][0] as CustomEvent<VoiceLatencyReport>).detail;
      expect(report.sttMode).toBe('realtime');
      expect(report.stages.stt_requested).toBe(-4000);
      expect(summarizeVoiceLatency([report]).sttMs).toEqual({ samples: 1, p50: 5000, p95: 5000 });
    } finally {
      window.removeEventListener('engmate-voice-latency', listener);
    }
  });

  it('calculates local durations without adding overlapping stage percentiles', () => {
    const reports: VoiceLatencyReport[] = [
      {
        traceId: 'one',
        status: 'completed',
        endpointReason: 'silence',
        stages: {
          endpoint: 900,
          stt_requested: 910,
          stt_final: 1200,
          llm_requested: 1210,
          llm_first_text: 1500,
          tts_requested: 1600,
          tts_first_byte: 1900,
          audio_ready: 2000,
          playback_started: 2020,
        },
      },
    ];
    expect(summarizeVoiceLatency(reports)).toMatchObject({
      sttMs: { samples: 1, p50: 290, p95: 290 },
      llmFirstTextMs: { samples: 1, p50: 290, p95: 290 },
      ttsFirstByteMs: { samples: 1, p50: 300, p95: 300 },
      playbackAfterAudioMs: { samples: 1, p50: 20, p95: 20 },
      estimatedEndToPlaybackMs: { samples: 1, p50: 2020, p95: 2020 },
    });
  });
});
