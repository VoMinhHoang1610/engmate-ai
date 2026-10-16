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
let localUtterance: SpeechSynthesisUtterance | null = null;
// Ask the browser to initialize its installed voice list before the first click.
window.speechSynthesis?.getVoices();

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
  if (localUtterance) {
    localUtterance = null;
    window.speechSynthesis.cancel();
  }
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
  return {
    text: text.trim(),
    language: 'en',
    speed: Math.min(
      2,
      Math.max(0.5, rate * ([0.75, 1, 1.25].includes(preference) ? preference : 1)),
    ),
    speaker_id: document.documentElement.dataset.speechVoice || 'UK-Nu-1-TM',
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

export async function docTiengAnh(
  text: string,
  rate = 1,
  signal?: AbortSignal,
  allowLocal = true,
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
    const prepared = layAmThanhDaLuu(text, rate);
    const voices = allowLocal && !prepared ? window.speechSynthesis?.getVoices() : undefined;
    const english = voices?.filter(
      (voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang),
    );
    const body = speechBody(text, rate);
    const accent = body.speaker_id.startsWith('UK-') ? 'en-GB' : 'en-US';
    const voice = english?.find((item) => item.lang === accent) ?? english?.[0];
    if (!prepared && voice && typeof SpeechSynthesisUtterance !== 'undefined') {
      if (request.signal.aborted || active !== request) return;
      const utterance = new SpeechSynthesisUtterance(body.text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = body.speed;
      localUtterance = utterance;
      // Never replace this utterance with a late MP3, which would speak twice.
      const finishLocal = () => {
        signal?.removeEventListener('abort', cancel);
        if (active === request) {
          active = null;
          localUtterance = null;
        }
      };
      let stopWaiting: () => void = () => undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          stopWaiting = resolve;
          request.signal.addEventListener('abort', stopWaiting, { once: true });
          utterance.onstart = () => resolve();
          utterance.onend = () => {
            finishLocal();
            resolve();
          };
          utterance.onerror = () => {
            finishLocal();
            if (request.signal.aborted) resolve();
            else reject(new Error('Không phát được giọng tiếng Anh trên máy.'));
          };
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        });
      } finally {
        request.signal.removeEventListener('abort', stopWaiting);
      }
      started = true;
      return;
    }
    // Cached clips reach play() in the click handler without a network round trip.
    const blob = prepared ?? (await chuanBiAmThanh(text, rate, request.signal));
    if (request.signal.aborted || active !== request) return;
    const cached = clips.get(JSON.stringify(speechBody(text, rate)));
    if (!cached) audioUrl = URL.createObjectURL(blob);
    const player = cached?.player ?? new Audio(audioUrl);
    player.currentTime = 0;
    audio = player;
    const finish = () => {
      signal?.removeEventListener('abort', cancel);
      if (active === request) {
        boAudio();
        active = null;
      }
    };
    player.onended = finish;
    player.onerror = finish;
    await player.play();
    started = true;
  } catch (error) {
    if (active === request) {
      boAudio();
      active = null;
      if (localUtterance) {
        localUtterance = null;
        window.speechSynthesis.cancel();
      }
    }
    if (!request.signal.aborted) {
      throw error instanceof Error ? error : new Error('Không phát được giọng nói.');
    }
  } finally {
    if (!started) signal?.removeEventListener('abort', cancel);
  }
}

export async function chepLoi(blob: Blob, signal: AbortSignal): Promise<string> {
  if (!blob.size) throw new Error('Bản ghi trống. Hãy thử ghi âm lại.');
  if (blob.size > 8 * 1024 * 1024) throw new Error('Bản ghi quá lớn. Hãy ghi một đoạn ngắn hơn.');
  const form = new FormData();
  const extension = blob.type.startsWith('audio/mp4')
    ? 'm4a'
    : blob.type.startsWith('audio/ogg')
      ? 'ogg'
      : 'webm';
  form.append('file', blob, `recording.${extension}`);
  const response = await apiFetch('/api/speech/stt?language=en', {
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
