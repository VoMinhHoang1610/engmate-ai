export const VAD_SAMPLE_RATE = 16_000;
export const VAD_FRAME_MS = 100;
const START_FRAMES = 2;
const SILENCE_FRAMES = 9;
const MAX_FRAMES = 300;
const PRE_ROLL_FRAMES = 3;
const RMS_THRESHOLD = 0.018;

export type VadResult =
  | { type: 'invalid' }
  | { type: 'pending' }
  | { type: 'discard'; reason: 'stationary_noise' }
  | { type: 'start'; frames: readonly Int16Array[] }
  | {
      type: 'frame';
      speaking: boolean;
      frames: readonly Int16Array[];
      lastVoicedAt: number;
      endpointReason: 'silence' | 'max_duration' | undefined;
      evidence?: { voicedMs: number; voicedRatio: number };
    };

export interface VoiceVad {
  /** Consume PCM16. Optional delivery time supports offline replay on a virtual clock. */
  push(frame: Int16Array, at?: number): VadResult;
  /** Drop pending PCM; the session owns worklet reset, cancellation and transport cleanup. */
  reset(clearNoise?: boolean): void;
  /** Scalars only; queried exclusively by opt-in local diagnostics. */
  diagnostics?(): VadDiagnostics | undefined;
}

export interface VadDiagnostics {
  detector: 'energy' | 'adaptive';
  fallback: boolean;
  noiseFloorRms: number | null;
  startThresholdRms: number;
  continueThresholdRms: number;
  currentThresholdRms: number;
}

/** Original energy VAD, unchanged. No media, timers, network, callbacks or model loading. */
export class EnergyVad implements VoiceVad {
  private preRoll: Int16Array[] = [];
  private frames: Int16Array[] = [];
  private voiced = 0;
  private silence = 0;
  private lastVoicedAt = 0;

  diagnostics(): VadDiagnostics {
    return {
      detector: 'energy',
      fallback: false,
      noiseFloorRms: null,
      startThresholdRms: RMS_THRESHOLD,
      continueThresholdRms: RMS_THRESHOLD,
      currentThresholdRms: RMS_THRESHOLD,
    };
  }

  push(frame: Int16Array, at?: number): VadResult {
    if (frame.length !== (VAD_SAMPLE_RATE * VAD_FRAME_MS) / 1000) return { type: 'invalid' };
    const rms = Math.sqrt(
      frame.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / frame.length,
    );
    const speaking = rms >= RMS_THRESHOLD;
    // Preserve the original timestamp sampling point, after RMS, for live capture.
    if (speaking) this.lastVoicedAt = at ?? performance.now();
    if (!this.frames.length) {
      this.preRoll.push(frame);
      if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();
      this.voiced = speaking ? this.voiced + 1 : 0;
      if (this.voiced < START_FRAMES) return { type: 'pending' };
      this.frames = this.preRoll;
      this.preRoll = [];
      this.silence = 0;
      return { type: 'start', frames: this.frames };
    }
    this.frames.push(frame);
    this.silence = speaking ? 0 : this.silence + 1;
    return {
      type: 'frame',
      speaking,
      frames: this.frames,
      lastVoicedAt: this.lastVoicedAt,
      endpointReason:
        this.silence < SILENCE_FRAMES && this.frames.length < MAX_FRAMES
          ? undefined
          : this.silence >= SILENCE_FRAMES
            ? 'silence'
            : 'max_duration',
    };
  }

  reset(): void {
    this.frames = [];
    this.preRoll = [];
    this.voiced = this.silence = 0;
  }
}
