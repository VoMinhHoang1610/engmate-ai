export type VoiceStage =
  | 'endpoint'
  | 'stt_requested'
  | 'stt_final'
  | 'llm_requested'
  | 'llm_first_text'
  | 'first_phrase'
  | 'llm_completed'
  | 'tts_requested'
  | 'tts_headers'
  | 'tts_first_byte'
  | 'audio_ready'
  | 'playback_started';

export interface VoiceLatencyReport {
  traceId: string;
  status: 'completed' | 'cancelled' | 'failed';
  endpointReason: 'silence' | 'max_duration';
  sttMode?: 'batch' | 'realtime';
  /** Offsets from the last voiced frame delivery, NOT a physical speech-end measurement. */
  stages: Partial<Record<VoiceStage, number>>;
}

const intervals = {
  endpointMs: ['endpoint', null],
  sttMs: ['stt_final', 'stt_requested'],
  sttAfterEndpointMs: ['stt_final', 'endpoint'],
  llmFirstTextMs: ['llm_first_text', 'llm_requested'],
  llmCompleteMs: ['llm_completed', 'llm_requested'],
  firstPhraseMs: ['first_phrase', 'llm_requested'],
  ttsFirstByteMs: ['tts_first_byte', 'tts_requested'],
  ttsReadyMs: ['audio_ready', 'tts_requested'],
  playbackAfterAudioMs: ['playback_started', 'audio_ready'],
  estimatedEndToPlaybackMs: ['playback_started', null],
} as const satisfies Record<string, readonly [VoiceStage, VoiceStage | null]>;

/** Emit numeric, session-only diagnostics; never retain speech, user or account data. */
export class VoiceLatencyTrace {
  private stages: Partial<Record<VoiceStage, number>> = {};
  private ended = false;

  constructor(
    private readonly lastVoicedAt: number,
    private readonly endpointReason: VoiceLatencyReport['endpointReason'],
    private readonly sttMode: 'batch' | 'realtime' = 'batch',
    readonly id = crypto.randomUUID(),
  ) {
    this.mark('endpoint');
  }

  mark(stage: VoiceStage): void {
    this.markAt(stage, performance.now());
  }

  markAt(stage: VoiceStage, at: number): void {
    if (!this.ended && this.stages[stage] === undefined)
      this.stages[stage] = at - this.lastVoicedAt;
  }

  finish(status: VoiceLatencyReport['status']): void {
    if (this.ended) return;
    this.ended = true;
    const report: VoiceLatencyReport = {
      traceId: this.id,
      status,
      endpointReason: this.endpointReason,
      sttMode: this.sttMode,
      stages: { ...this.stages },
    };
    window.dispatchEvent(new CustomEvent('engmate-voice-latency', { detail: report }));
  }
}

/** Nearest-rank percentiles; cancelled, failed and forced endpoints are not normal turns. */
export function summarizeVoiceLatency(reports: VoiceLatencyReport[]) {
  const successful = reports.filter(
    (report) => report.status === 'completed' && report.endpointReason === 'silence',
  );
  return Object.fromEntries(
    Object.entries(intervals).map(([metric, [end, start]]) => {
      const values = successful
        .map((report) => {
          const endAt = report.stages[end];
          const startAt = start === null ? 0 : report.stages[start];
          return endAt === undefined || startAt === undefined ? undefined : endAt - startAt;
        })
        .filter(
          (value): value is number => value !== undefined && Number.isFinite(value) && value >= 0,
        )
        .sort((a, b) => a - b);
      return [
        metric,
        {
          samples: values.length,
          p50: values[Math.ceil(values.length * 0.5) - 1] ?? null,
          p95: values[Math.ceil(values.length * 0.95) - 1] ?? null,
        },
      ];
    }),
  );
}
