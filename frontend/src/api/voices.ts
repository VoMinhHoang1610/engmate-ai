import { apiFetch } from './database';
export interface GiongDoc {
  id: string;
  name: string;
  language: 'en';
  gender: 'male' | 'female' | null;
}

/** Load the server catalog; provider credentials stay in the backend. */
export async function layGiongDoc(signal: AbortSignal): Promise<GiongDoc[]> {
  const response = await apiFetch('/api/speech/voices?language=en', { signal });
  if (!response.ok) throw new Error('Chưa tải được danh sách giọng nói. Vui lòng thử lại.');
  const data: unknown = await response.json();
  if (
    !Array.isArray(data) ||
    !data.every(
      (voice: unknown) =>
        voice !== null &&
        typeof voice === 'object' &&
        'id' in voice &&
        typeof voice.id === 'string' &&
        /^[A-Za-z0-9_-]{1,120}$/.test(voice.id) &&
        'name' in voice &&
        typeof voice.name === 'string' &&
        voice.name.trim() &&
        'language' in voice &&
        voice.language === 'en' &&
        'gender' in voice &&
        (voice.gender === null || voice.gender === 'male' || voice.gender === 'female'),
    )
  )
    throw new Error('Danh sách giọng nói chưa hợp lệ. Vui lòng thử lại.');
  return data as GiongDoc[];
}
