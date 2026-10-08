import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chepLoi,
  chuanBiAmThanh,
  docTiengAnh,
  dungDoc,
  layAmThanhDaLuu,
  xoaBoNhoAmThanh,
} from './amThanh';

let players: AudioMock[] = [];
class AudioMock {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  load = vi.fn();
  pause = vi.fn();
  removeAttribute = vi.fn();
  constructor(public src: string) {
    players.push(this);
  }
}
const audioResponse = () => ({
  ok: true,
  blob: async () => new Blob(['mp3'], { type: 'audio/mpeg' }),
});

beforeEach(() => {
  xoaBoNhoAmThanh();
  players = [];
  vi.stubGlobal('Audio', AudioMock);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:speech');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  delete document.documentElement.dataset.speechRate;
  delete document.documentElement.dataset.speechVoice;
});
afterEach(() => {
  xoaBoNhoAmThanh();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Blaze speech in the browser', () => {
  function nativeSpeech() {
    class Utterance {
      voice: unknown;
      lang = '';
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const localVoice = { lang: 'en-US', localService: true };
    const native = {
      getVoices: vi.fn().mockReturnValue([{ lang: 'en-GB', localService: false }, localVoice]),
      speak: vi.fn((utterance: Utterance) => utterance.onstart?.()),
      cancel: vi.fn(),
      resume: vi.fn(),
    };
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', native);
    return { native, localVoice };
  }
  it('starts a local English voice in the click call without waiting for the network', async () => {
    const { native, localVoice } = nativeSpeech();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    document.documentElement.dataset.speechRate = '0.75';
    const request = new AbortController();
    const playback = docTiengAnh(' Hello ', 1, request.signal);
    expect(native.speak).toHaveBeenCalledOnce();
    expect(native.speak.mock.calls[0][0]).toMatchObject({
      text: 'Hello',
      voice: localVoice,
      rate: 0.75,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await playback;
    request.abort();
    expect(native.cancel).toHaveBeenCalledOnce();
  });
  it('never plays a late Blaze response over an utterance already started locally', async () => {
    const { native } = nativeSpeech();
    let deliver!: (value: ReturnType<typeof audioResponse>) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            deliver = resolve;
          }),
      ),
    );
    const preparation = chuanBiAmThanh('Hello');
    await docTiengAnh('Hello');
    deliver(audioResponse());
    await preparation;
    expect(players[0].play).not.toHaveBeenCalled();
    await docTiengAnh('Hello');
    expect(native.cancel).toHaveBeenCalledOnce();
    expect(players[0].play).toHaveBeenCalledOnce();
    expect(native.speak).toHaveBeenCalledOnce();
  });
  it('keeps voice previews on Blaze and falls back to Blaze when local English is unavailable', async () => {
    const { native } = nativeSpeech();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
    await docTiengAnh('Preview', 1, undefined, false);
    expect(native.speak).not.toHaveBeenCalled();
    expect(players[0].play).toHaveBeenCalledOnce();
    native.getVoices.mockReturnValue([{ lang: 'vi-VN', localService: true }]);
    await docTiengAnh('New clip');
    expect(native.speak).not.toHaveBeenCalled();
    expect(players[1].play).toHaveBeenCalledOnce();
  });
  it('stops a pending local start on navigation and reports native engine errors', async () => {
    const { native } = nativeSpeech();
    native.speak.mockImplementation(() => undefined);
    const playback = docTiengAnh('Hello');
    dungDoc();
    await playback;
    expect(native.cancel).toHaveBeenCalledOnce();
    native.speak.mockImplementation((utterance) => utterance.onerror?.());
    await expect(docTiengAnh('Again')).rejects.toThrow('Không phát được giọng tiếng Anh');
  });
  it('prepares silently and plays prepared clips immediately without another request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(audioResponse());
    vi.stubGlobal('fetch', fetchMock);
    await chuanBiAmThanh(' Hello ');
    expect(players).toHaveLength(1);
    expect(players[0].load).toHaveBeenCalledOnce();
    expect(players[0].play).not.toHaveBeenCalled();
    const playback = docTiengAnh('Hello');
    expect(players[0].play).toHaveBeenCalledOnce();
    await playback;
    dungDoc();
    await docTiengAnh('Hello');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(players).toHaveLength(1);
    expect(players[0].play).toHaveBeenCalledTimes(2);
  });
  it('keeps different voices and speeds separate while reusing equivalent settings', async () => {
    const fetchMock = vi.fn().mockResolvedValue(audioResponse());
    vi.stubGlobal('fetch', fetchMock);
    await chuanBiAmThanh('Hello');
    document.documentElement.dataset.speechVoice = 'UK-Nu-2-BL';
    await chuanBiAmThanh('Hello');
    await chuanBiAmThanh('Hello', 0.75);
    document.documentElement.dataset.speechRate = '0.75';
    await docTiengAnh('Hello');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
      speed: 0.75,
      speaker_id: 'UK-Nu-2-BL',
    });
  });
  it('shares an unfinished preload with a click and does not cancel playback when preload ends', async () => {
    let resolve!: (value: ReturnType<typeof audioResponse>) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const preparation = chuanBiAmThanh('Hello', 1, controller.signal).catch(
      (error: unknown) => error,
    );
    const playback = docTiengAnh('Hello');
    controller.abort();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(
      false,
    );
    resolve(audioResponse());
    await Promise.all([preparation, playback]);
    expect(players[0].play).toHaveBeenCalledOnce();
  });
  it('stops waiting playback independently while another caller prepares the same clip', async () => {
    let resolve!: (value: ReturnType<typeof audioResponse>) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const preparation = chuanBiAmThanh('Hello');
    const playback = docTiengAnh('Hello');
    dungDoc();
    await playback;
    resolve(audioResponse());
    await preparation;
    expect(players).toHaveLength(1);
    expect(players[0].play).not.toHaveBeenCalled();
    await docTiengAnh('Hello');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('aborts unused generation and never caches its late response', async () => {
    let resolve!: (value: ReturnType<typeof audioResponse>) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const preparation = chuanBiAmThanh('Hello', 1, controller.signal);
    const rejected = expect(preparation).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(
      true,
    );
    resolve(audioResponse());
    await new Promise((done) => setTimeout(done, 0));
    expect(layAmThanhDaLuu('Hello')).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
    await docTiengAnh('Hello');
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('retries a failed preparation on click rather than caching the failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue(audioResponse());
    vi.stubGlobal('fetch', fetchMock);
    await expect(chuanBiAmThanh('Hello')).rejects.toThrow();
    await docTiengAnh('Hello');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('evicts the least recently used clips and expires old audio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
    for (let i = 0; i < 32; i++) await chuanBiAmThanh(`Word ${i}`);
    expect(layAmThanhDaLuu('Word 0')).toBeDefined();
    await chuanBiAmThanh('Word 32');
    expect(layAmThanhDaLuu('Word 1')).toBeUndefined();
    expect(layAmThanhDaLuu('Word 0')).toBeDefined();
    const future = Date.now() + 15 * 60_000;
    vi.spyOn(Date, 'now').mockReturnValue(future);
    expect(layAmThanhDaLuu('Word 0')).toBeUndefined();
  });
  it('bounds cached bytes and does not retain a single clip over the memory limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'audio/mpeg' }),
      }),
    );
    await chuanBiAmThanh('One');
    await chuanBiAmThanh('Two');
    expect(layAmThanhDaLuu('One')).toBeUndefined();
    expect(layAmThanhDaLuu('Two')).toBeDefined();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob([new Uint8Array(17 * 1024 * 1024)], { type: 'audio/mpeg' }),
      }),
    );
    await chuanBiAmThanh('Too big');
    expect(layAmThanhDaLuu('Too big')).toBeUndefined();
  });
  it('clears session audio and aborts outstanding generation on logout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
    await chuanBiAmThanh('Cached');
    let resolve!: (value: ReturnType<typeof audioResponse>) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      ),
    );
    const preparation = chuanBiAmThanh('Pending');
    const rejected = expect(preparation).rejects.toMatchObject({ name: 'AbortError' });
    xoaBoNhoAmThanh();
    resolve(audioResponse());
    await rejected;
    expect(layAmThanhDaLuu('Cached')).toBeUndefined();
    expect(layAmThanhDaLuu('Pending')).toBeUndefined();
  });
  it('does not send an already cancelled preload', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    await expect(chuanBiAmThanh('Hello', 1, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('reports generation timeout and releases the clip for retry', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal!.addEventListener('abort', () =>
                reject(new DOMException('Cancelled', 'AbortError')),
              );
            }),
        ),
      );
      const preparation = chuanBiAmThanh('Hello');
      const rejected = expect(preparation).rejects.toThrow('Tạo giọng nói quá lâu');
      await vi.advanceTimersByTimeAsync(95_000);
      await rejected;
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
      await chuanBiAmThanh('Hello');
      expect(layAmThanhDaLuu('Hello')).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });
  it('posts text to the backend and plays a blob without any provider key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(audioResponse());
    vi.stubGlobal('fetch', fetchMock);
    await docTiengAnh('Hello', 0.85);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/speech/tts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello',
          language: 'en',
          speed: 0.85,
          speaker_id: 'UK-Nu-1-TM',
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(players[0].play).toHaveBeenCalledOnce();
    players[0].onended?.();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    xoaBoNhoAmThanh();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:speech');
  });
  it('stops the previous clip and bounds the configured speed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
    document.documentElement.dataset.speechRate = '1.25';
    await docTiengAnh('One', 1.8);
    await docTiengAnh('Two');
    expect(players[0].pause).toHaveBeenCalled();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).speed).toBe(2);
  });
  it('sends the selected voice to every TTS request', async () => {
    const request = vi.fn().mockResolvedValue(audioResponse());
    vi.stubGlobal('fetch', request);
    document.documentElement.dataset.speechVoice = 'UK-Nam-1-DT';
    await docTiengAnh('Hello');
    expect(JSON.parse(request.mock.calls[0][1].body).speaker_id).toBe('UK-Nam-1-DT');
  });
  it('does not play a late response after Stop', async () => {
    let resolve!: (value: ReturnType<typeof audioResponse>) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      ),
    );
    const pending = docTiengAnh('Hello');
    dungDoc();
    resolve(audioResponse());
    await pending;
    expect(players).toHaveLength(0);
  });
  it('stops audio when the page request is aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(audioResponse()));
    const request = new AbortController();
    await docTiengAnh('Hello', 1, request.signal);
    request.abort();
    expect(players[0].pause).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    xoaBoNhoAmThanh();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:speech');
  });
  it.each([401, 503, 504, 502])(
    'reports HTTP %s without exposing provider error bodies',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
      await expect(docTiengAnh('Hello')).rejects.toThrow();
      expect(players).toHaveLength(0);
    },
  );
  it('rejects non-audio responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['oops']) }),
    );
    await expect(docTiengAnh('Hello')).rejects.toThrow();
  });
  it('uploads recorded audio as multipart and returns the transcript', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ text: 'Hello.' }) });
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    expect(await chepLoi(new Blob(['voice'], { type: 'audio/webm;codecs=opus' }), signal)).toBe(
      'Hello.',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/speech/stt?language=en',
      expect.objectContaining({ method: 'POST', signal }),
    );
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('file')).toBeInstanceOf(File);
    expect((form.get('file') as File).type).toBe('audio/webm;codecs=opus');
  });
  it('rejects empty and oversized recordings before uploading', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    await expect(chepLoi(new Blob(), signal)).rejects.toThrow();
    await expect(
      chepLoi(new Blob([new Uint8Array(8 * 1024 * 1024 + 1)]), signal),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ text: 123 }, {}, { text: '' }])('rejects invalid transcript %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    await expect(chepLoi(new Blob(['voice']), new AbortController().signal)).rejects.toThrow();
  });
});
