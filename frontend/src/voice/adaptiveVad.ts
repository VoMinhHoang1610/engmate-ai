import { EnergyVad, VAD_FRAME_MS, type VadDiagnostics, type VadResult, type VoiceVad } from './vad';

const FRAME_SAMPLES = 1600;
const MIN_VOICED_FRAMES = 2;
const PRE_ROLL_FRAMES = 3;
const SILENCE_FRAMES = 9;
const MAX_FRAMES = 300;
const START_FLOOR = 0.018;
const CONTINUE_FLOOR = START_FLOOR * 0.8;
const START_NOISE_RATIO = 1.25;
const CONTINUE_NOISE_RATIO = 1.15;
const STATIONARY_FRAMES = 10;

/** Opt-in energy heuristic, not a speech/echo/speaker classifier. */
export class AdaptiveVad implements VoiceVad {
  private noise = 0;
  private hasNoise = false;
  private preRoll: Int16Array[] = [];
  private frames: Int16Array[] = [];
  private onset = 0;
  private voiced = 0;
  private silence = 0;
  private lastVoicedAt = 0;
  private sustained: number[] = [];

  diagnostics(): VadDiagnostics {
    const startThresholdRms = Math.max(START_FLOOR, this.noise * START_NOISE_RATIO);
    const continueThresholdRms = Math.max(CONTINUE_FLOOR, this.noise * CONTINUE_NOISE_RATIO);
    return {
      detector: 'adaptive',
      fallback: false,
      noiseFloorRms: this.hasNoise ? this.noise : null,
      startThresholdRms,
      continueThresholdRms,
      currentThresholdRms: this.frames.length ? continueThresholdRms : startThresholdRms,
    };
  }

  push(frame: Int16Array, at = performance.now()): VadResult {
    if (frame.length !== FRAME_SAMPLES) return { type: 'invalid' };
    const rms = Math.sqrt(
      frame.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / frame.length,
    );
    const active = this.frames.length > 0;
    const threshold = active
      ? Math.max(CONTINUE_FLOOR, this.noise * CONTINUE_NOISE_RATIO)
      : Math.max(START_FLOOR, this.noise * START_NOISE_RATIO);
    const speaking = rms >= threshold;
    if (speaking) {
      this.lastVoicedAt = at;
      this.sustained.push(rms);
      if (this.sustained.length > STATIONARY_FRAMES) this.sustained.shift();
    } else this.sustained = [];

    // Only an uninterrupted, nearly level signal is reclassified as background.
    // This bounds stationary noise already above the initial floor without a UI calibration step.
    if (this.sustained.length === STATIONARY_FRAMES) {
      const mean = this.sustained.reduce((sum, value) => sum + value, 0) / STATIONARY_FRAMES;
      if (Math.max(...this.sustained) - Math.min(...this.sustained) <= mean * 0.3) {
        this.noise = mean;
        this.hasNoise = true;
        this.reset();
        return { type: 'discard', reason: 'stationary_noise' };
      }
    }

    if (!active) {
      if (!speaking) {
        this.noise = this.hasNoise ? this.noise + 0.1 * (rms - this.noise) : rms;
        this.hasNoise = true;
      }
      this.preRoll.push(frame);
      if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();
      this.onset = speaking ? this.onset + 1 : 0;
      if (this.onset < MIN_VOICED_FRAMES) return { type: 'pending' };
      this.frames = this.preRoll;
      this.preRoll = [];
      this.voiced = this.onset;
      return { type: 'start', frames: this.frames };
    }

    this.frames.push(frame);
    if (speaking) this.voiced++;
    this.silence = speaking ? 0 : this.silence + 1;
    const endpointReason =
      this.silence >= SILENCE_FRAMES
        ? 'silence'
        : this.frames.length >= MAX_FRAMES
          ? 'max_duration'
          : undefined;
    return {
      type: 'frame',
      speaking,
      frames: this.frames,
      lastVoicedAt: this.lastVoicedAt,
      endpointReason,
      evidence: {
        voicedMs: this.voiced * VAD_FRAME_MS,
        voicedRatio: this.voiced / this.frames.length,
      },
    };
  }

  reset(clearNoise = false): void {
    this.preRoll = [];
    this.frames = [];
    this.onset = this.voiced = this.silence = 0;
    this.sustained = [];
    if (clearNoise) {
      this.noise = 0;
      this.hasNoise = false;
    }
  }
}

type TimedFrame = { frame: Int16Array; at: number };

/** A failed adaptive detector is replaced for the session, replaying retained PCM locally. */
export class ResilientVad implements VoiceVad {
  private detector: VoiceVad;
  private failed = false;
  private active = false;
  private pending: TimedFrame[] = [];
  private captured: TimedFrame[] = [];

  constructor(factory: () => VoiceVad = () => new AdaptiveVad()) {
    try {
      this.detector = factory();
    } catch {
      this.detector = new EnergyVad();
      this.failed = true;
    }
  }

  diagnostics(): VadDiagnostics | undefined {
    const snapshot = this.detector.diagnostics?.();
    return snapshot && { ...snapshot, fallback: this.failed };
  }

  push(frame: Int16Array, at = performance.now()): VadResult {
    if (this.failed) return this.detector.push(frame, at);
    if (frame.length !== FRAME_SAMPLES) return { type: 'invalid' };
    if (this.active) this.captured.push({ frame, at });
    else {
      this.pending.push({ frame, at });
      if (this.pending.length > PRE_ROLL_FRAMES) this.pending.shift();
    }
    let result: VadResult;
    try {
      result = this.detector.push(frame, at);
    } catch {
      this.detector = new EnergyVad();
      this.failed = true;
      result = { type: 'pending' };
      for (const retained of this.active ? this.captured : this.pending)
        result = this.detector.push(retained.frame, retained.at);
      if (!this.active && result.type === 'frame')
        result = { type: 'start', frames: result.frames };
      this.pending = this.captured = [];
      return result;
    }
    if (result.type === 'start') {
      this.active = true;
      this.captured = this.pending;
      this.pending = [];
    } else if (result.type === 'discard') {
      this.active = false;
      this.pending = this.captured = [];
    }
    return result;
  }

  reset(clearNoise = false): void {
    this.active = false;
    this.pending = this.captured = [];
    try {
      this.detector.reset(clearNoise);
    } catch {
      this.detector = new EnergyVad();
      this.failed = true;
    }
  }
}
