import { describe, expect, it } from 'vitest';
import { acceptsTranscript, speechEvidence } from './transcriptGate';

describe('conservative transcript gate', () => {
  const weak = { voicedMs: 200, voicedRatio: 0.18 };
  it.each(['Yes.', 'Vâng', 'Sales', '7', 'I I mean sales'])('keeps the short answer %s', (text) => {
    expect(acceptsTranscript(text, weak)).toBe(true);
  });
  it.each(['', '...', '♪'])('rejects empty or nonlinguistic text %s', (text) => {
    expect(acceptsTranscript(text, weak)).toBe(false);
  });
  it('requires both repetition and weak audio, including the ratio', () => {
    expect(acceptsTranscript('yes, YES! yes.', weak)).toBe(false);
    expect(acceptsTranscript('yes yes yes', { voicedMs: 500, voicedRatio: 0.3 })).toBe(true);
    expect(acceptsTranscript('yes yes yes', { voicedMs: 200, voicedRatio: 0.5 })).toBe(true);
    expect(acceptsTranscript('vâng vâng vâng', weak)).toBe(false);
  });
  it('aggregates audio evidence without retaining PCM', () => {
    const frames = [new Int16Array(1600).fill(590), new Int16Array(1600).fill(589)];
    expect(speechEvidence(frames)).toEqual({ voicedMs: 100, voicedRatio: 0.5 });
    expect(speechEvidence([])).toEqual({ voicedMs: 0, voicedRatio: 0 });
  });
});
