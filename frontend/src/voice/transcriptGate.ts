export const UNCLEAR_SPEECH_NOTICE = 'Mình chưa nghe rõ, bạn nói lại nhé';

export interface SpeechEvidence {
  voicedMs: number;
  voicedRatio: number;
}

/** Local aggregate only. Pre-roll and the silence tail remain in the denominator. */
export function speechEvidence(frames: readonly Int16Array[]): SpeechEvidence {
  const voiced = frames.filter((frame) => {
    const power = frame.reduce((sum, sample) => sum + (sample / 32768) ** 2, 0);
    return Math.sqrt(power / frame.length) >= 0.018;
  }).length;
  return { voicedMs: voiced * 100, voicedRatio: frames.length ? voiced / frames.length : 0 };
}

/** Never reject an ordinary short answer by word count alone. */
export function acceptsTranscript(message: string, evidence: SpeechEvidence): boolean {
  if (!message || !/[\p{L}\p{N}]/u.test(message)) return false;
  const words = message.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const weakAudio = evidence.voicedMs < 300 && evidence.voicedRatio < 0.3;
  const repeated = words.length >= 3 && words.every((word) => word === words[0]);
  return !(weakAudio && repeated);
}
