import type { VadDiagnostics, VadResult } from './vad';

type DiscardReason = 'stationary_noise' | 'transcript_gate';

/** Opt-in, session-local scalar counters. No PCM/text, storage, events, timers or network. */
export class VoiceDebug {
  private since = performance.now();
  private lastLogAt = -Infinity;
  private starts = 0;
  private discarded = { stationary_noise: 0, transcript_gate: 0 };
  private requests = { batch: 0, realtime: 0 };
  private captureMs = 0;
  private captureSince: number | null = null;
  private vad: VadDiagnostics | undefined;

  start(): void {
    this.since = performance.now();
    this.lastLogAt = -Infinity;
    this.starts = this.captureMs = 0;
    this.captureSince = null;
    this.discarded = { stationary_noise: 0, transcript_gate: 0 };
    this.requests = { batch: 0, realtime: 0 };
    this.vad = undefined;
  }

  observe(result: VadResult, diagnostics: VadDiagnostics | undefined): void {
    if (result.type === 'invalid') return;
    this.vad = diagnostics;
    if (result.type === 'start') {
      this.starts++;
      this.captureSince = performance.now();
    } else if (result.type === 'discard') {
      this.discard(result.reason);
      this.endCapture();
    } else if (result.type === 'frame' && result.endpointReason) this.endCapture();
    this.publish();
  }

  discard(reason: DiscardReason): void {
    this.discarded[reason]++;
  }

  request(mode: 'batch' | 'realtime'): void {
    this.requests[mode]++;
  }

  endCapture(): void {
    if (this.captureSince === null) return;
    this.captureMs += performance.now() - this.captureSince;
    this.captureSince = null;
  }

  finish(diagnostics: VadDiagnostics | undefined): void {
    this.endCapture();
    this.vad = diagnostics;
    this.publish(true);
  }

  private publish(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastLogAt < 1000) return;
    this.lastLogAt = now;
    const activeCaptureMs = this.captureSince === null ? 0 : now - this.captureSince;
    const elapsedMs = now - this.since;
    // Explicit allowlist: never log a result/frame, transcript, error, URL or session identifier.
    console.debug('[voice-debug]', {
      elapsedMs: Math.round(elapsedMs),
      activations: this.starts,
      discarded: this.discarded.stationary_noise + this.discarded.transcript_gate,
      discardedByReason: { ...this.discarded },
      sttRequests: { ...this.requests },
      sttRequestsPerMinute:
        elapsedMs > 0
          ? ((this.requests.batch + this.requests.realtime) * 60_000) / elapsedMs
          : null,
      captureStateMs: Math.round(this.captureMs + activeCaptureMs),
      activeCaptureMs: Math.round(activeCaptureMs),
      detector: this.vad?.detector ?? null,
      fallback: this.vad?.fallback ?? false,
      noiseFloorRms: this.vad?.noiseFloorRms ?? null,
      startThresholdRms: this.vad?.startThresholdRms ?? null,
      continueThresholdRms: this.vad?.continueThresholdRms ?? null,
      currentThresholdRms: this.vad?.currentThresholdRms ?? null,
    });
  }
}
