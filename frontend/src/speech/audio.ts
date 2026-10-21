import { apiFetch } from '../api/database';
/** Session-only speech cache; stopping playback does not discard reusable audio. */
const MAX_CLIPS = 32;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const CACHE_TTL_MS = 15 * 60_000;
const REQUEST_TIMEOUT_MS = 95_000;
interface Clip {
  blob: Blob;
  expires: number;
  player: HTMLAudioElement;
  url: string;
}
const clips = new Map<string, Clip>();
const pending = new Map<string, AudioRequest>();
let cacheBytes = 0;
interface AudioRequest {
  controller: AbortController;
  promise: Promise<Blob>;
  users: number;
}

let active: AbortController | null = null;
let audio: HTMLAudioElement | null = null;
let audioUrl = '';

function boAudio() {
  audio?.pause();
  if (audio && audioUrl) audio.removeAttribute('src');
  audio = null;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = '';
}

export function dungDoc() {
  active?.abort();
  active = null;
  boAudio();
}

function loiSpeech(status: number): string {
  if (status === 401) return 'Vui lòng đăng nhập để sử dụng giọng nói.';
  if (status === 413) return 'Bản ghi quá lớn. Hãy ghi một đoạn ngắn hơn.';
  if (status === 503) return 'Dịch vụ giọng nói chưa sẵn sàng. Vui lòng thử lại sau.';
  if (status === 504) return 'Xử lý giọng nói quá lâu. Vui lòng thử lại.';
  return 'Không xử lý được giọng nói. Vui lòng thử lại.';
}

function speechBody(text: string, rate: number) {
  const preference = Number(document.documentElement.dataset.speechRate ?? 1);
  const language = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(
    text.normalize('NFC'),
  )
    ? 'vi'
    : 'en';
  return {
    text: text.trim(),
    language,
    speed: Math.min(
      2,
      Math.max(0.5, rate * ([0.75, 1, 1.25].includes(preference) ? preference : 1)),
    ),
    speaker_id:
      language === 'vi'
        ? document.documentElement.dataset.speechVoiceVi || 'HN-Nam-1-BL'
        : document.documentElement.dataset.speechVoice || 'UK-Nu-1-TM',
  };
}

function removeClip(key: string) {
  const clip = clips.get(key);
  if (clip) {
    cacheBytes -= clip.blob.size;
    clip.player.pause();
    clip.player.removeAttribute('src');
    URL.revokeObjectURL(clip.url);
  }
  clips.delete(key);
}

/** Returns prepared audio for exactly this text, voice and effective speed. */
export function layAmThanhDaLuu(text: string, rate = 1): Blob | undefined {
  const key = JSON.stringify(speechBody(text, rate));
  const clip = clips.get(key);
  if (!clip) return;
  if (clip.expires <= Date.now()) {
    removeClip(key);
    return;
  }
  clips.delete(key);
  clips.set(key, clip);
  return clip.blob;
}

async function fetchAudio(key: string, controller: AbortController): Promise<Blob> {
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    const response = await apiFetch('/api/speech/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: key,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(loiSpeech(response.status));
    const blob = await response.blob();
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (!blob.size || !blob.type.startsWith('audio/'))
      throw new Error('Không nhận được âm thanh hợp lệ.');
    if (blob.size <= MAX_CACHE_BYTES) {
      removeClip(key);
      const url = URL.createObjectURL(blob);
      const player = new Audio(url);
      player.preload = 'auto';
      player.load();
      clips.set(key, { blob, expires: Date.now() + CACHE_TTL_MS, player, url });
      cacheBytes += blob.size;
      while (clips.size > MAX_CLIPS || cacheBytes > MAX_CACHE_BYTES)
        removeClip(clips.keys().next().value!);
    }
    return blob;
  } catch (error) {
    if (timedOut) throw new Error('Tạo giọng nói quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Shares generation between preload and playback, with independent cancellation. */
export function chuanBiAmThanh(text: string, rate = 1, signal?: AbortSignal): Promise<Blob> {
  if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  const cached = layAmThanhDaLuu(text, rate);
  if (cached) return Promise.resolve(cached);
  const key = JSON.stringify(speechBody(text, rate));
  let request = pending.get(key);
  if (!request) {
    const controller = new AbortController();
    const promise = fetchAudio(key, controller).finally(() => {
      if (pending.get(key)?.controller === controller) pending.delete(key);
    });
    request = { controller, promise, users: 0 };
    pending.set(key, request);
  }
  const shared = request;
  shared.users++;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      signal?.removeEventListener('abort', cancel);
      shared.users--;
      if (!shared.users && pending.get(key) === shared) {
        pending.delete(key);
        shared.controller.abort();
      }
    };
    const cancel = () => {
      release();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    shared.promise.then(
      (blob) => {
        release();
        resolve(blob);
      },
      (error: unknown) => {
        release();
        reject(error);
      },
    );
  });
}

/** Clears private session audio and outstanding generation on logout. */
export function xoaBoNhoAmThanh() {
  dungDoc();
  for (const request of pending.values()) request.controller.abort();
  pending.clear();
  for (const key of clips.keys()) removeClip(key);
  cacheBytes = 0;
}

export async function docVanBan(
  text: string,
  rate = 1,
  signal?: AbortSignal,
  onFinished?: (error?: Error) => void,
): Promise<void> {
  dungDoc();
  const request = new AbortController();
  active = request;
  const cancel = () => {
    request.abort();
    if (active === request) dungDoc();
  };
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  let started = false;
  try {
    const key = JSON.stringify(speechBody(text, rate));
    const prepared = layAmThanhDaLuu(text, rate);
    // Cached clips reach play() in the click handler without a network round trip.
    const blob = prepared ?? (await chuanBiAmThanh(text, rate, request.signal));
    if (request.signal.aborted || active !== request) return;
    const cached = clips.get(key);
    if (!cached) audioUrl = URL.createObjectURL(blob);
    const player = cached?.player ?? new Audio(audioUrl);
    player.currentTime = 0;
    audio = player;
    const finish = (error?: Error) => {
      signal?.removeEventListener('abort', cancel);
      if (active === request && !request.signal.aborted) {
        boAudio();
        active = null;
        onFinished?.(error);
      }
    };
    player.onended = () => finish();
    player.onerror = () => finish(new Error('Không phát được giọng nói.'));
    await player.play();
    started = true;
  } catch (error) {
    if (active === request) {
      boAudio();
      active = null;
    }
    if (!request.signal.aborted) {
      throw error instanceof Error ? error : new Error('Không phát được giọng nói.');
    }
  } finally {
    if (!started) signal?.removeEventListener('abort', cancel);
  }
}

/** Compatibility export for earlier English-only callers. */
export const docTiengAnh = docVanBan;

export async function chepLoi(
  blob: Blob,
  signal: AbortSignal,
  language: 'en' | 'vi' = 'en',
): Promise<string> {
  if (!blob.size) throw new Error('Bản ghi trống. Hãy thử ghi âm lại.');
  if (blob.size > 8 * 1024 * 1024) throw new Error('Bản ghi quá lớn. Hãy ghi một đoạn ngắn hơn.');
  const form = new FormData();
  const extension = blob.type.startsWith('audio/mp4')
    ? 'm4a'
    : blob.type.startsWith('audio/ogg')
      ? 'ogg'
      : 'webm';
  form.append('file', blob, `recording.${extension}`);
  const response = await apiFetch(`/api/speech/stt?language=${language}`, {
    method: 'POST',
    body: form,
    signal,
  });
  if (!response.ok) throw new Error(loiSpeech(response.status));
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('text' in data) || typeof data.text !== 'string')
    throw new Error('Không nhận được bản chép lời hợp lệ.');
  if (!data.text.trim()) throw new Error('Chưa nghe rõ lời nói. Hãy thử ghi âm lại.');
  return data.text;
}
