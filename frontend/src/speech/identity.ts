export type VoiceGender = 'male' | 'female';

/** Prefer catalog metadata; older Blaze catalogs encode gender in the speaker ID. */
export function voiceGender(id: string, gender?: VoiceGender | null): VoiceGender | null {
  if (gender) return gender;
  if (/^(HN|SG|UK|US)-Nu-/i.test(id)) return 'female';
  if (/^(HN|SG|UK|US)-Nam-/i.test(id)) return 'male';
  return null;
}
