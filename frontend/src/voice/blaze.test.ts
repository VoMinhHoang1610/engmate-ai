import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiFetch } from '../api/database';
import { streamTurn } from '../api/chatStream';
import { BlazeVoiceSession } from './blaze';
import type { Turn } from '../types';

vi.mock('../api/database', () => ({ api: vi.fn(), apiFetch: vi.fn() }));
vi.mock('../api/chatStream', () => ({ streamTurn: vi.fn() }));

const track = { enabled: true, stop: vi.fn(), onended: null as (() => void) | null };
const media = { getTracks: () => [track], getAudioTracks: () => [track] };
class Node {
  connect = vi.fn();
  disconnect = vi.fn();
}
class Context {
  static instances: Context[] = [];
  destination = {};
  source = new Node();
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource = () => this.source;
  constructor() {
    Context.instances.push(this);
  }
}
class Capture extends Node {
  static instances: Capture[] = [];
  port = {
    onmessage: null as ((event: { data: ArrayBuffer }) => void) | null,
    postMessage: vi.fn(),
    close: vi.fn(),
  };
  constructor() {
    super();
    Capture.instances.push(this);
  }
  frame(volume = 0) {
    this.port.onmessage?.({ data: new Int16Array(1600).fill(volume).buffer });
  }
  utterance() {
    for (let i = 0; i < 5; i++) this.frame(5000);
    for (let i = 0; i < 9; i++) this.frame();
  }
}
class Player {
  static instances: Player[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  removeAttribute = vi.fn();
  constructor(readonly src: string) {
    Player.instances.push(this);
  }
}
const answer = (content = 'Bạn hãy thử câu này. Hello, how are you?'): Turn => ({
  message: { message_id: 1, role: 'user', content: 'Giúp tôi học', status: 'completed' },
  reply: { message_id: 2, role: 'assistant', content, status: 'completed' },
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const events = () => ({ state: vi.fn(), transcript: vi.fn(), error: vi.fn(), sync: vi.fn() });
async function flush() {
  for (let i = 0; i < 35; i++) await Promise.resolve();
}
const active: BlazeVoiceSession[] = [];
function session(options: ConstructorParameters<typeof BlazeVoiceSession>[3] = {}, voice?: string) {
  const callbacks = events();
  const instance = new BlazeVoiceSession(7, callbacks, voice, options);
  active.push(instance);
  return { instance, callbacks };
}
beforeEach(() => {
  vi.useFakeTimers();
  Context.instances = [];
  Capture.instances = [];
  Player.instances = [];
  track.enabled = true;
  track.onended = null;
  track.stop.mockReset();
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal('AudioWorkletNode', Capture);
  vi.stubGlobal('Audio', Player);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(media) } });
  vi.stubGlobal('speechSynthesis', { speak: vi.fn() });
  vi.stubGlobal('WebSocket', vi.fn());
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:blaze');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.mocked(api).mockReset().mockResolvedValue(undefined);
  vi.mocked(apiFetch)
    .mockReset()
    .mockImplementation(async (path) =>
      path.includes('/stt')
        ? json({ text: 'Giúp tôi học' })
        : new Response('mp3', { headers: { 'Content-Type': 'audio/mpeg' } }),
    );
  vi.mocked(streamTurn)
    .mockReset()
    .mockImplementation(async (_id, _payload, _signal, emit) => {
      emit({ type: 'delta', response_id: 2, delta: 'Bạn hãy thử câu này.' });
      emit({ type: 'done', response_id: 2, turn: answer() });
      return answer();
    });
});
afterEach(async () => {
  await Promise.all(active.splice(0).map((instance) => instance.stop().catch(() => undefined)));
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Blaze speech with a text-only Gemini brain', () => {
  it('reads the lesson opening only after an explicit session start, then waits for the learner', async () => {
    const { instance, callbacks } = session({ opening: 'Hi! What is your name?' });
    expect(apiFetch).not.toHaveBeenCalled();
    const starting = instance.start();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/speech/tts');
    expect(callbacks.transcript).toHaveBeenCalledWith('assistant', 'Hi! What is your name?');
    expect(streamTurn).not.toHaveBeenCalled();
    Player.instances[0].onended?.();
    await starting;
    expect(instance.currentState).toBe('listening');
    Capture.instances[0].utterance();
    await flush();
    expect(streamTurn).toHaveBeenCalledOnce();
  });
  it('lets the learner interrupt the lesson opening without creating a fake text turn', async () => {
    const { instance } = session({ opening: 'Hi! What is your name?' });
    const starting = instance.start();
    await flush();
    Capture.instances[0].frame(5000);
    Capture.instances[0].frame(5000);
    await starting;
    expect(Player.instances[0].pause).toHaveBeenCalled();
    expect(instance.currentState).toBe('user_speaking');
    expect(streamTurn).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });
  it('captures WAV, sends a persisted text turn, and plays only Blaze in each language', async () => {
    const { instance, callbacks } = session({ voiceEn: 'UK-Nam-1-DT', voiceVi: 'HN-Nam-1-BL' });
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/speech/stt?language=vi', expect.any(Object));
    const file = (vi.mocked(apiFetch).mock.calls[0][1]!.body as FormData).get('file') as File;
    expect(file.name).toBe('recording.wav');
    expect(file.type).toBe('audio/wav');
    expect(file.size).toBe(44 + 14 * 1600 * 2);
    expect(streamTurn).toHaveBeenCalledWith(
      7,
      {
        message: 'Giúp tôi học',
        client_request_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(callbacks.transcript).toHaveBeenCalledWith('user', 'Giúp tôi học');
    expect(callbacks.transcript).toHaveBeenCalledWith('assistant', answer().reply.content);
    let calls = vi.mocked(apiFetch).mock.calls;
    expect(JSON.parse(String(calls[1][1]!.body))).toMatchObject({
      language: 'vi',
      speaker_id: 'HN-Nam-1-BL',
    });
    expect(instance.currentState).toBe('assistant_speaking');
    expect(track.enabled).toBe(true);
    Player.instances[0].onended?.();
    await flush();
    calls = vi.mocked(apiFetch).mock.calls;
    expect(JSON.parse(String(calls[2][1]!.body))).toMatchObject({
      language: 'en',
      speaker_id: 'UK-Nam-1-DT',
    });
    Player.instances[1].onended?.();
    await flush();
    expect(instance.currentState).toBe('listening');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
    expect(WebSocket).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });
  it('ignores silence, one-frame noise and invalid frames without paid work', async () => {
    const { instance } = session();
    await instance.start();
    const capture = Capture.instances[0];
    for (let i = 0; i < 20; i++) {
      capture.frame();
      capture.frame(5000);
      capture.frame();
    }
    capture.port.onmessage?.({ data: new Int16Array(2).buffer });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(streamTurn).not.toHaveBeenCalled();
  });
  it('interrupts playback immediately and accepts the next spoken question', async () => {
    const { instance } = session();
    await instance.start();
    const capture = Capture.instances[0];
    capture.utterance();
    await flush();
    const old = Player.instances[0];
    capture.frame(6000);
    capture.frame(6000);
    await flush();
    expect(old.pause).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(instance.currentState).toBe('user_speaking');
    capture.utterance();
    await flush();
    expect(streamTurn).toHaveBeenCalledTimes(2);
    expect(api).not.toHaveBeenCalled();
  });
  it('waits for server cancellation before a new Gemini turn and ignores old deltas', async () => {
    const { instance, callbacks } = session();
    await instance.start();
    let emitOld!: Parameters<typeof streamTurn>[3];
    vi.mocked(streamTurn).mockImplementationOnce(async (_id, _body, signal, emit) => {
      emitOld = emit;
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason)),
      );
    });
    let finishCancel!: () => void;
    vi.mocked(api).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishCancel = resolve;
        }),
    );
    const capture = Capture.instances[0];
    capture.utterance();
    await flush();
    capture.utterance();
    await flush();
    expect(api).toHaveBeenCalledWith('/conversations/7/cancel', 'POST');
    expect(streamTurn).toHaveBeenCalledTimes(1);
    emitOld({ type: 'delta', response_id: 2, delta: 'Stale reply' });
    expect(callbacks.transcript).not.toHaveBeenCalledWith('assistant', 'Stale reply');
    finishCancel();
    await flush();
    expect(streamTurn).toHaveBeenCalledTimes(2);
  });
  it('drops partial speech on mute and stops all media and late callbacks on End Voice', async () => {
    const { instance } = session();
    await instance.start();
    const capture = Capture.instances[0];
    capture.frame(5000);
    capture.frame(5000);
    instance.mute(true);
    capture.utterance();
    await flush();
    expect(track.enabled).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
    instance.mute(false);
    capture.utterance();
    await flush();
    const late = capture.port.onmessage!;
    await instance.stop();
    late({ data: new Int16Array(1600).fill(5000).buffer });
    expect(track.stop).toHaveBeenCalled();
    expect(capture.disconnect).toHaveBeenCalled();
    expect(capture.port.close).toHaveBeenCalled();
    expect(Context.instances[0].close).toHaveBeenCalled();
    expect(Player.instances[0].pause).toHaveBeenCalled();
    expect(instance.currentState).toBe('idle');
  });
  it('discards a late STT response after stop', async () => {
    const { instance } = session();
    await instance.start();
    let deliver!: (value: Response) => void;
    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        }),
    );
    Capture.instances[0].utterance();
    await flush();
    await instance.stop();
    deliver(json({ text: 'Late recording' }));
    await flush();
    expect(streamTurn).not.toHaveBeenCalled();
    expect(Player.instances).toHaveLength(0);
  });
  it('releases a microphone granted after the user already ended the call', async () => {
    let grant!: (value: MediaStream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    const { instance } = session();
    const starting = instance.start();
    await flush();
    await instance.stop();
    grant(media as unknown as MediaStream);
    await starting;
    expect(track.stop).toHaveBeenCalled();
    expect(Capture.instances).toHaveLength(0);
  });
  it('keeps selected English and Vietnamese voices separate from recognition language', async () => {
    const { instance } = session(
      { language: 'en', speed: 8, voiceEn: 'UK-Nu-1-TM' },
      'HN-Nam-2-BL',
    );
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/speech/stt?language=en');
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[1][1]!.body))).toMatchObject({
      language: 'vi',
      speaker_id: 'HN-Nam-2-BL',
      speed: 2,
    });
    Player.instances[0].onended?.();
    await flush();
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[2][1]!.body))).toMatchObject({
      language: 'en',
      speaker_id: 'UK-Nu-1-TM',
    });
  });
  it('splits long replies into bounded Blaze jobs and strips formatting', async () => {
    vi.mocked(streamTurn).mockResolvedValueOnce(answer(`**${'word '.repeat(500)}**`));
    const { instance } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    const first = JSON.parse(String(vi.mocked(apiFetch).mock.calls[1][1]!.body));
    expect(first.text.length).toBeLessThanOrEqual(2000);
    expect(first.text).not.toContain('*');
    Player.instances[0].onended?.();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls).toHaveLength(3);
  });
  it.each([json({ text: '' }), json({ text: 5 }), json({}, 503)])(
    'fails safely for invalid recognition',
    async (response) => {
      vi.mocked(apiFetch).mockResolvedValueOnce(response);
      const { instance, callbacks } = session();
      await instance.start();
      Capture.instances[0].utterance();
      await flush();
      expect(callbacks.error).toHaveBeenCalled();
      expect(instance.currentState).toBe('error');
      expect(track.stop).toHaveBeenCalled();
      expect(streamTurn).not.toHaveBeenCalled();
    },
  );
  it('stops safely on TTS failure without falling back to another voice', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(json({ text: 'Hello' }))
      .mockResolvedValueOnce(json({}, 503));
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('Blaze'));
    expect(Player.instances).toHaveLength(0);
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });
  it('reports playback errors and closes its URL and microphone', async () => {
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    Player.instances[0].onerror?.();
    await flush();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('Không phát được'));
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });
  it('does not submit another Gemini turn if cancellation could not be confirmed', async () => {
    vi.mocked(streamTurn).mockImplementationOnce(
      async (_id, _body, signal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason)),
        ),
    );
    vi.mocked(api).mockRejectedValueOnce(new Error('offline'));
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    Capture.instances[0].utterance();
    await flush();
    expect(streamTurn).toHaveBeenCalledTimes(1);
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('hủy'));
    expect(track.stop).toHaveBeenCalled();
  });
  it('releases resources when permission is denied or microphone disconnects', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new DOMException('Denied', 'NotAllowedError'),
    );
    const first = session();
    await first.instance.start();
    expect(first.callbacks.error).toHaveBeenCalledWith('Bạn chưa cấp quyền microphone.');
    const second = session();
    await second.instance.start();
    track.onended?.();
    await flush();
    expect(second.callbacks.error).toHaveBeenCalledWith('Microphone đã ngắt kết nối.');
  });
  it('limits a long utterance and expires an idle session without an API call', async () => {
    const { instance } = session();
    await instance.start();
    for (let i = 0; i < 300; i++) Capture.instances[0].frame(5000);
    await flush();
    expect(streamTurn).toHaveBeenCalledOnce();
    await instance.stop();
    vi.mocked(apiFetch).mockClear();
    const idle = session();
    await idle.instance.start();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(idle.callbacks.error).toHaveBeenCalledWith(expect.stringContaining('10 phút'));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
