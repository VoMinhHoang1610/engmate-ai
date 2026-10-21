import { api } from '../api/database';

export interface VoiceCatalog {
  provider: string;
  default_voice: string;
  voices: { id: string; name: string; language?: 'en' | 'vi' }[];
}

/** The speech catalog is independent of the text reasoning provider. */
export async function liveVoices(signal: AbortSignal): Promise<VoiceCatalog> {
  const data = await api<VoiceCatalog>('/voice/voices', 'GET', undefined, signal);
  if (
    !data ||
    typeof data.provider !== 'string' ||
    typeof data.default_voice !== 'string' ||
    !Array.isArray(data.voices) ||
    !data.voices.length ||
    !data.voices.every(
      (v) =>
        v &&
        typeof v.id === 'string' &&
        /^[A-Za-z0-9_-]{1,120}$/.test(v.id) &&
        typeof v.name === 'string' &&
        v.name.trim() &&
        (data.provider !== 'blaze' || v.language === 'vi' || v.language === 'en'),
    ) ||
    !data.voices.some((v) => v.id === data.default_voice)
  )
    throw new Error('Danh sách giọng đối thoại chưa hợp lệ.');
  return data;
}
