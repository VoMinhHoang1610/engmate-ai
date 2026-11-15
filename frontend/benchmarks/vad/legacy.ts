// Frozen receive()/resetCapture() VAD logic from blaze.ts before the extraction.
// Deliberately independent constants and arithmetic: this is the comparison oracle,
// not an alternate production path. No transport, playback or provider calls.
export class LegacyEnergyVad {
  private preRoll: Int16Array[] = [];
  private frames: Int16Array[] = [];
  private voiced = 0;
  private silence = 0;
  private lastVoicedAt = 0;

  push(frame: Int16Array, at: number) {
    if (frame.length !== 1600) return { type: 'invalid' as const };
    const rms = Math.sqrt(
      frame.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0) / frame.length,
    );
    const speaking = rms >= 0.018;
    if (speaking) this.lastVoicedAt = at;
    if (!this.frames.length) {
      this.preRoll.push(frame);
      if (this.preRoll.length > 3) this.preRoll.shift();
      this.voiced = speaking ? this.voiced + 1 : 0;
      if (this.voiced < 2) return { type: 'pending' as const };
      this.frames = this.preRoll;
      this.preRoll = [];
      this.silence = 0;
      return { type: 'start' as const, frames: this.frames };
    }
    this.frames.push(frame);
    this.silence = speaking ? 0 : this.silence + 1;
    const endpointReason =
      this.silence < 9 && this.frames.length < 300
        ? undefined
        : this.silence >= 9
          ? ('silence' as const)
          : ('max_duration' as const);
    return {
      type: 'frame' as const,
      speaking,
      endpointReason,
      frames: this.frames,
      lastVoicedAt: this.lastVoicedAt,
    };
  }

  reset(): void {
    this.frames = [];
    this.preRoll = [];
    this.voiced = this.silence = 0;
  }
}
