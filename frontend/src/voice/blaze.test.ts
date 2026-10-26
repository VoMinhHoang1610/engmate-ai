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
  onplaying: (() => void) | null = null;
  currentTime = 0;
  play = vi.fn(async () => this.onplaying?.());
  pause = vi.fn();
  removeAttribute = vi.fn();
  constructor(readonly src: string) {
    Player.instances.push(this);
  }
}
class STTSocket {
  static OPEN = 1;
  static instances: STTSocket[] = [];
  readyState = 1;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() {
    STTSocket.instances.push(this);
  }
  event(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
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
  STTSocket.instances = [];
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
      emit({
        type: 'start',
        response_id: 2,
        message: answer().message,
        reply: { ...answer().reply, content: '', status: 'pending' },
      });
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
  it('keeps a nine-minute realtime conversation bounded across 24 complete turns', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockImplementation(async (path) =>
      path.includes('speech-ticket')
        ? { session_id: crypto.randomUUID(), ticket: 't'.repeat(43) }
        : undefined,
    );
    const { instance, callbacks } = session({ sttMode: 'realtime' });
    await instance.start();
    const capture = Capture.instances[0];
    for (let turn = 0; turn < 24; turn++) {
      capture.frame(5000);
      capture.frame(5000);
      await flush();
      const socket = STTSocket.instances[turn];
      socket.onopen?.();
      socket.event({ type: 'ready' });
      socket.event({ type: 'partial', text: `Question ${turn}` });
      for (let frame = 0; frame < 9; frame++) capture.frame();
      socket.event({ type: 'final', text: `Question ${turn}.` });
      await flush();
      expect(streamTurn).toHaveBeenCalledTimes(turn + 1);
      expect(vi.mocked(streamTurn).mock.calls[turn][1].message).toBe(`Question ${turn}.`);
      for (let clip = 0; clip < 2; clip++) {
        const player = Player.instances[turn * 2 + clip];
        expect(player.play).toHaveBeenCalledOnce();
        player.onended?.();
        await flush();
        expect(player.onended).toBeNull();
        expect(player.onplaying).toBeNull();
      }
      expect(instance.currentState).toBe('listening');
      expect(socket.close).toHaveBeenCalledOnce();
      expect(socket.onmessage).toBeNull();
      expect(vi.getTimerCount()).toBe(1); // Only the session deadline survives.
      await vi.advanceTimersByTimeAsync(22_500);
      if (turn % 4 === 0) {
        instance.mute(true);
        capture.utterance();
        instance.mute(false);
      }
    }
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(callbacks.sync).toHaveBeenCalledTimes(24);
    expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/playback'))).toHaveLength(
      24,
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(48);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(48);
    expect(Context.instances).toHaveLength(1);
    await instance.stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(Context.instances[0].close).toHaveBeenCalledOnce();
  });

  it('stops stalled audio without ending the session and never marks it as heard', async () => {
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    const player = Player.instances[0];
    expect(instance.currentState).toBe('assistant_speaking');
    await vi.advanceTimersByTimeAsync(15_000);
    await flush();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('Âm thanh Blaze bị treo'));
    expect(instance.currentState).toBe('listening');
    expect(player.pause).toHaveBeenCalled();
    expect(track.stop).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(api).toHaveBeenCalledWith('/conversations/7/messages/2/playback', 'POST', {
      heard_chars: 0,
    });
  });

  it('allows a long progressing clip and clears its watchdog on completion and barge-in', async () => {
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    const player = Player.instances[0];
    for (let second = 1; second <= 40; second++) {
      player.currentTime = second;
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('assistant_speaking');
    player.onended?.();
    await flush();
    Capture.instances[0].frame(6000);
    Capture.instances[0].frame(6000);
    await flush();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('user_speaking');
    expect(Player.instances[1].pause).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('streams audio before endpointing in realtime mode and sends only final text to Gemini', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockResolvedValue({
      session_id: '12345678-abcd-abcd-abcd-123456789abc',
      ticket: 't'.repeat(43),
    });
    const { instance, callbacks } = session({ sttMode: 'realtime', language: 'en' });
    await instance.start();
    const capture = Capture.instances[0];
    capture.frame(5000);
    capture.frame(5000);
    await flush();
    const socket = STTSocket.instances[0];
    socket.onopen?.();
    socket.event({ type: 'ready' });
    expect(socket.send.mock.calls.filter(([value]) => value instanceof ArrayBuffer)).toHaveLength(
      2,
    );
    expect(apiFetch).not.toHaveBeenCalled();
    socket.event({ type: 'partial', text: 'I would' });
    expect(callbacks.transcript).toHaveBeenCalledWith('user', 'I would');
    for (let i = 0; i < 9; i++) capture.frame();
    await flush();
    expect(streamTurn).not.toHaveBeenCalled();
    socket.event({ type: 'final', text: 'I would like to learn.' });
    await flush();
    expect(vi.mocked(streamTurn).mock.calls[0][1].message).toBe('I would like to learn.');
    expect(vi.mocked(apiFetch).mock.calls.every(([path]) => !path.includes('/stt'))).toBe(true);
    expect(Player.instances[0].play).toHaveBeenCalledOnce();
    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('cancels realtime capture on mute and ignores its late final', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockResolvedValue({
      session_id: '12345678-abcd-abcd-abcd-123456789abc',
      ticket: 't'.repeat(43),
    });
    const { instance, callbacks } = session({ sttMode: 'realtime' });
    await instance.start();
    Capture.instances[0].frame(5000);
    Capture.instances[0].frame(5000);
    await flush();
    const socket = STTSocket.instances[0];
    socket.onopen?.();
    socket.event({ type: 'ready' });
    const late = socket.onmessage!;
    instance.mute(true);
    late({ data: JSON.stringify({ type: 'final', text: 'Old voice' }) });
    await flush();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(streamTurn).not.toHaveBeenCalled();
    expect(callbacks.transcript).not.toHaveBeenCalledWith('user', 'Old voice');
    expect(instance.currentState).toBe('listening');
  });

  it('drops a realtime turn still awaiting final on barge-in without cancelling the new capture', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockResolvedValue({
      session_id: '12345678-abcd-abcd-abcd-123456789abc',
      ticket: 't'.repeat(43),
    });
    const { instance } = session({ sttMode: 'realtime' });
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    const old = STTSocket.instances[0];
    old.onopen?.();
    old.event({ type: 'ready' });
    old.event({ type: 'partial', text: 'Old' });
    Capture.instances[0].frame(5000);
    Capture.instances[0].frame(5000);
    await flush();
    expect(old.close).toHaveBeenCalledOnce();
    expect(STTSocket.instances).toHaveLength(2);
    expect(STTSocket.instances[1].close).not.toHaveBeenCalled();
    expect(streamTurn).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('user_speaking');
  });

  it('falls back to batch STT when realtime never finalizes', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockResolvedValue({
      session_id: '12345678-abcd-abcd-abcd-123456789abc',
      ticket: 't'.repeat(43),
    });
    const { instance, callbacks } = session({ sttMode: 'realtime' });
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    const socket = STTSocket.instances[0];
    socket.onopen?.();
    socket.event({ type: 'ready' });
    socket.event({ type: 'partial', text: 'Never finalized' });
    await vi.advanceTimersByTimeAsync(5000);
    await flush();
    expect(vi.mocked(apiFetch).mock.calls.some(([path]) => path.includes('/stt'))).toBe(true);
    expect(streamTurn).toHaveBeenCalledOnce();
    expect(vi.mocked(streamTurn).mock.calls[0][1].message).toBe('Giúp tôi học');
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('assistant_speaking');
  });

  it('falls back to batch STT when the realtime connection drops mid-utterance', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockResolvedValue({
      session_id: '12345678-abcd-abcd-abcd-123456789abc',
      ticket: 't'.repeat(43),
    });
    const { instance, callbacks } = session({ sttMode: 'realtime' });
    await instance.start();
    Capture.instances[0].frame(5000);
    Capture.instances[0].frame(5000);
    await flush();
    STTSocket.instances[0].onerror?.();
    await flush();
    expect(instance.currentState).toBe('user_speaking');
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(track.stop).not.toHaveBeenCalled();
    for (let i = 0; i < 9; i++) Capture.instances[0].frame();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls.some(([path]) => path.includes('/stt'))).toBe(true);
    expect(streamTurn).toHaveBeenCalledOnce();
    expect(vi.mocked(streamTurn).mock.calls[0][1].message).toBe('Giúp tôi học');
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('assistant_speaking');
  });

  it('recovers from a rejected realtime setup and can capture a fresh turn', async () => {
    vi.stubGlobal('WebSocket', STTSocket);
    vi.mocked(api).mockResolvedValue({
      session_id: '12345678-abcd-abcd-abcd-123456789abc',
      ticket: 't'.repeat(43),
    });
    vi.mocked(apiFetch).mockResolvedValueOnce(json({}, 503));
    const { instance, callbacks } = session({ sttMode: 'realtime' });
    await instance.start();
    Capture.instances[0].frame(5000);
    Capture.instances[0].frame(5000);
    await flush();
    const rejected = STTSocket.instances[0];
    rejected.onopen?.();
    rejected.event({
      type: 'error',
      code: 'insufficient_credits',
      phase: 'setup',
      message: 'PRIVATE',
    });
    await flush();
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('user_speaking');
    expect(rejected.close).toHaveBeenCalledOnce();

    for (let i = 0; i < 9; i++) Capture.instances[0].frame();
    await flush();
    expect(callbacks.error).toHaveBeenCalledWith(
      expect.stringContaining('Blaze chưa chuyển được lời nói'),
    );
    expect(instance.currentState).toBe('listening');
    expect(track.stop).not.toHaveBeenCalled();
    expect(streamTurn).not.toHaveBeenCalled();

    Capture.instances[0].utterance();
    await flush();
    const socket = STTSocket.instances.at(-1)!;
    socket.onopen?.();
    socket.event({ type: 'ready' });
    socket.event({ type: 'partial', text: 'Hello' });
    expect(streamTurn).not.toHaveBeenCalled();
    socket.event({ type: 'final', text: 'Hello Mate.' });
    await flush();
    expect(streamTurn).toHaveBeenCalledOnce();
    expect(vi.mocked(streamTurn).mock.calls[0][1].message).toBe('Hello Mate.');
    expect(Player.instances[0].play).toHaveBeenCalledOnce();
  });

  it('reads the lesson opening only after an explicit session start, then waits for the learner', async () => {
    const { instance, callbacks } = session({ opening: 'Hi! What is your name?' });
    expect(apiFetch).not.toHaveBeenCalled();
    const starting = instance.start();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/speech/tts');
    expect(callbacks.transcript).toHaveBeenCalledWith('assistant', 'Hi! What is your name?');
    expect(streamTurn).not.toHaveBeenCalled();
    Player.instances[0].onended?.();
    await flush();
    expect(Player.instances).toHaveLength(2);
    Player.instances[1].onended?.();
    await starting;
    expect(instance.currentState).toBe('listening');
    Capture.instances[0].utterance();
    await flush();
    expect(streamTurn).toHaveBeenCalledOnce();
  });
  it('keeps listening when the lesson opening audio fails', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(json({}, 503));
    const { instance, callbacks } = session({ opening: 'Hello there!' });
    await instance.start();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('lời mở đầu'));
    expect(instance.currentState).toBe('listening');
    expect(track.stop).not.toHaveBeenCalled();

    Capture.instances[0].utterance();
    await flush();
    expect(streamTurn).toHaveBeenCalledOnce();
    expect(instance.currentState).toBe('assistant_speaking');
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
  it('captures WAV and keeps one Blaze speaker across Vietnamese and English', async () => {
    const { instance, callbacks } = session({ voiceEn: 'UK-Nam-1-DT', voiceVi: 'HN-Nam-1-BL' });
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^\/api\/speech\/stt\?language=vi&voice_trace_id=[\da-f-]{36}$/),
      expect.any(Object),
    );
    const file = (vi.mocked(apiFetch).mock.calls[0][1]!.body as FormData).get('file') as File;
    expect(file.name).toBe('recording.wav');
    expect(file.type).toBe('audio/wav');
    expect(file.size).toBe(44 + 14 * 1600 * 2);
    expect(streamTurn).toHaveBeenCalledWith(
      7,
      {
        message: 'Giúp tôi học',
        voice: true,
        voice_gender: 'male',
        client_request_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      expect.any(AbortSignal),
      expect.any(Function),
      expect.stringMatching(/^[\da-f-]{36}$/),
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
      language: 'vi',
      speaker_id: 'HN-Nam-1-BL',
    });
    Player.instances[1].onended?.();
    await flush();
    expect(instance.currentState).toBe('listening');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
    expect(WebSocket).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledExactlyOnceWith('/conversations/7/messages/2/playback', 'POST', {
      heard_chars: Array.from(answer().reply.content).length,
    });
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

  it('records only fully ended phrases on interruption after text generation', async () => {
    const { instance } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    Player.instances[0].onended?.();
    await flush();
    expect(Player.instances).toHaveLength(2);
    Capture.instances[0].frame(5000);
    Capture.instances[0].frame(5000);
    await flush();
    expect(api).toHaveBeenCalledWith('/conversations/7/messages/2/playback', 'POST', {
      heard_chars: Array.from('Bạn hãy thử câu này. ').length,
    });
    Player.instances[1].onended?.();
    await flush();
    expect(api).toHaveBeenCalledTimes(1);
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
    expect(api).toHaveBeenCalledExactlyOnceWith('/conversations/7/messages/2/playback', 'POST', {
      heard_chars: 0,
    });
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
  it('keeps the selected speaker for English phrases regardless of recognition language', async () => {
    const { instance } = session(
      { language: 'en', speed: 8, voiceEn: 'UK-Nu-1-TM' },
      'HN-Nam-2-BL',
    );
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toMatch(
      /^\/api\/speech\/stt\?language=en&voice_trace_id=[\da-f-]{36}$/,
    );
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[1][1]!.body))).toMatchObject({
      language: 'vi',
      speaker_id: 'HN-Nam-2-BL',
      speed: 2,
    });
    Player.instances[0].onended?.();
    await flush();
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[2][1]!.body))).toMatchObject({
      language: 'vi',
      speaker_id: 'HN-Nam-2-BL',
    });
  });
  it.each([
    { id: 'HN-Nu-2-BL', language: 'vi' as const, gender: 'female' as const },
    { id: 'UK-Nam-1-DT', language: 'en' as const, gender: 'male' as const },
    { id: 'custom-voice', language: 'vi' as const, gender: 'female' as const },
    { id: 'unknown-voice', language: 'en' as const, gender: null },
  ])(
    'uses $id alone for the opening and mixed-language replies with matching persona',
    async (voice) => {
      const content = "Xin chào! I'm Mate, your English teacher. Hôm nay bạn muốn học gì?";
      vi.mocked(streamTurn).mockImplementation(async (_id, _payload, _signal, emit) => {
        for (const delta of [
          'Xin chào! ',
          "I'm Mate, your English teacher. ",
          'Hôm nay bạn muốn học gì?',
        ])
          emit({ type: 'delta', response_id: 2, delta });
        return answer(content);
      });
      const { instance, callbacks } = session(
        {
          opening: 'Xin chào! Hello there!',
          language: 'en',
          voiceEn: 'US-Nu-1-other',
          voiceVi: 'SG-Nam-1-other',
          voiceLanguage: voice.language,
          voiceGender: voice.gender,
        },
        voice.id,
      );
      const starting = instance.start();
      await flush();
      for (let i = 0; i < 2; i++) {
        Player.instances[i].onended?.();
        await flush();
      }
      await starting;
      Capture.instances[0].utterance();
      await flush();
      for (let i = 2; i < 5; i++) {
        Player.instances[i].onended?.();
        await flush();
      }
      const requests = vi
        .mocked(apiFetch)
        .mock.calls.filter(([path]) => path.startsWith('/api/speech/tts'))
        .map(([, init]) => JSON.parse(String(init!.body)));
      expect(requests).toHaveLength(5);
      for (const request of requests)
        expect(request).toMatchObject({ speaker_id: voice.id, language: voice.language });
      expect(vi.mocked(streamTurn).mock.calls[0][1]).toMatchObject({
        voice: true,
        voice_gender: voice.gender,
      });
      expect(instance.currentState).toBe('listening');
      expect(callbacks.error).not.toHaveBeenCalled();
    },
  );
  it('splits long replies into bounded Blaze jobs and strips formatting', async () => {
    vi.mocked(streamTurn).mockResolvedValueOnce(answer(`**${'word '.repeat(500)}**`));
    const { instance } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    const first = JSON.parse(String(vi.mocked(apiFetch).mock.calls[1][1]!.body));
    expect(first.text.length).toBeLessThanOrEqual(600);
    expect(first.text).not.toContain('*');
    // One clip is playing and one is prepared, but no third paid job is launched yet.
    expect(vi.mocked(apiFetch).mock.calls).toHaveLength(3);
    Player.instances[0].onended?.();
    await flush();
    expect(vi.mocked(apiFetch).mock.calls).toHaveLength(4);
  });
  it.each([json({ text: '' }), json({ text: 5 }), json({}, 503)])(
    'recovers safely from invalid recognition',
    async (response) => {
      vi.mocked(apiFetch).mockResolvedValueOnce(response);
      const { instance, callbacks } = session();
      await instance.start();
      Capture.instances[0].utterance();
      await flush();
      expect(callbacks.error).toHaveBeenCalled();
      expect(instance.currentState).toBe('listening');
      expect(track.stop).not.toHaveBeenCalled();
      expect(streamTurn).not.toHaveBeenCalled();
    },
  );
  it('keeps the text turn when TTS fails without falling back to another voice', async () => {
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
    expect(track.stop).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('listening');
    expect(api).toHaveBeenCalledWith('/conversations/7/messages/2/playback', 'POST', {
      heard_chars: 0,
    });

    Capture.instances[0].utterance();
    await flush();
    expect(streamTurn).toHaveBeenCalledTimes(2);
    expect(Player.instances[0].play).toHaveBeenCalledOnce();
    expect(instance.currentState).toBe('assistant_speaking');
    expect(track.stop).not.toHaveBeenCalled();
  });
  it('reports playback errors without closing the microphone', async () => {
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    Player.instances[0].onerror?.();
    await flush();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('Không phát được'));
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(track.stop).not.toHaveBeenCalled();
    expect(instance.currentState).toBe('listening');
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

  it('speaks a streamed sentence before Gemini completes and syncs the final turn once', async () => {
    let emit!: Parameters<typeof streamTurn>[3];
    let complete!: (turn: Turn) => void;
    vi.mocked(streamTurn).mockImplementationOnce(async (_id, _body, _signal, callback) => {
      emit = callback;
      return new Promise<Turn>((resolve) => (complete = resolve));
    });
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    emit({ type: 'delta', response_id: 2, delta: 'First sentence. Next ' });
    await flush();
    expect(Player.instances).toHaveLength(1);
    expect(Player.instances[0].play).toHaveBeenCalledOnce();
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[1][1]!.body)).text).toBe(
      'First sentence.',
    );
    expect(callbacks.sync).not.toHaveBeenCalled();
    const final = answer('First sentence. Next sentence.');
    emit({ type: 'done', response_id: 2, turn: final });
    complete(final);
    await flush();
    expect(callbacks.sync).toHaveBeenCalledOnce();
    expect(Player.instances).toHaveLength(1);
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[2][1]!.body)).text).toBe(
      'Next sentence.',
    );
    Player.instances[0].onended?.();
    await flush();
    expect(Player.instances).toHaveLength(2);
    Player.instances[1].onended?.();
    await flush();
    expect(instance.currentState).toBe('listening');
    expect(callbacks.sync).toHaveBeenCalledOnce();
  });

  it('clears prepared audio and ignores streamed deltas after barge-in', async () => {
    let emit!: Parameters<typeof streamTurn>[3];
    vi.mocked(streamTurn).mockImplementationOnce(async (_id, _body, signal, callback) => {
      emit = callback;
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason)),
      );
    });
    const { instance, callbacks } = session();
    await instance.start();
    const capture = Capture.instances[0];
    capture.utterance();
    await flush();
    emit({ type: 'delta', response_id: 2, delta: 'One. Two. Three. ' });
    await flush();
    expect(vi.mocked(apiFetch).mock.calls).toHaveLength(3);
    capture.frame(6000);
    capture.frame(6000);
    await flush();
    emit({ type: 'delta', response_id: 2, delta: 'Late sentence. ' });
    Player.instances[0].onended?.();
    await flush();
    expect(Player.instances[0].pause).toHaveBeenCalled();
    expect(Player.instances).toHaveLength(1);
    expect(vi.mocked(apiFetch).mock.calls).toHaveLength(3);
    expect(api).toHaveBeenCalledWith('/conversations/7/cancel', 'POST');
    expect(callbacks.transcript).not.toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('Late'),
    );
    expect(instance.currentState).toBe('user_speaking');
  });

  it('keeps Gemini streaming and stops only playback when a prefetched TTS job fails', async () => {
    let streamSignal!: AbortSignal;
    let complete!: (turn: Turn) => void;
    vi.mocked(streamTurn).mockImplementationOnce(async (_id, _body, signal, emit) => {
      streamSignal = signal;
      emit({ type: 'delta', response_id: 2, delta: 'One. Two. ' });
      return new Promise<Turn>((resolve) => (complete = resolve));
    });
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(json({ text: 'Hello' }))
      .mockResolvedValueOnce(new Response('mp3', { headers: { 'Content-Type': 'audio/mpeg' } }))
      .mockResolvedValueOnce(json({}, 503));
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(streamSignal.aborted).toBe(false);
    expect(Player.instances[0].pause).toHaveBeenCalled();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('Blaze'));

    const turn = answer('One. Two. ');
    complete(turn);
    await flush();
    expect(streamSignal.aborted).toBe(false);
    expect(api).not.toHaveBeenCalledWith('/conversations/7/cancel', 'POST');
    expect(instance.currentState).toBe('listening');
  });

  it('stops already-playing streamed speech but keeps the session if Gemini fails', async () => {
    let fail!: (error: Error) => void;
    vi.mocked(streamTurn).mockImplementationOnce(async (_id, _body, _signal, emit) => {
      emit({ type: 'delta', response_id: 2, delta: 'One sentence. ' });
      return new Promise<Turn>((_resolve, reject) => (fail = reject));
    });
    const { instance, callbacks } = session();
    await instance.start();
    Capture.instances[0].utterance();
    await flush();
    expect(Player.instances[0].play).toHaveBeenCalledOnce();
    fail(new Error('Gemini stream failed'));
    await flush();
    expect(Player.instances[0].pause).toHaveBeenCalled();
    expect(callbacks.error).toHaveBeenCalledWith('Gemini stream failed');
    expect(instance.currentState).toBe('listening');
    expect(track.stop).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith('/conversations/7/cancel', 'POST');
  });

  it('does not treat a rejected, interrupted opening request as a failure of the new turn', async () => {
    vi.mocked(apiFetch).mockImplementationOnce(async (_path, options) => {
      return new Promise((_resolve, reject) =>
        options!.signal!.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        ),
      );
    });
    const { instance, callbacks } = session({ opening: 'Hello there!' });
    const starting = instance.start();
    await flush();
    Capture.instances[0].frame(6000);
    Capture.instances[0].frame(6000);
    await starting;
    expect(instance.currentState).toBe('user_speaking');
    expect(callbacks.error).not.toHaveBeenCalled();
    expect(track.stop).not.toHaveBeenCalled();
  });

  it('records playback from playing events, not the call to play, and correlates all requests', async () => {
    vi.stubGlobal(
      'Audio',
      class extends Player {
        play = vi.fn().mockResolvedValue(undefined);
      },
    );
    const reports: CustomEvent[] = [];
    const listener = (event: Event) => reports.push(event as CustomEvent);
    window.addEventListener('engmate-voice-latency', listener);
    try {
      const { instance } = session();
      await instance.start();
      Capture.instances[0].utterance();
      await flush();
      expect(instance.currentState).toBe('processing');
      Player.instances[0].onplaying?.();
      expect(instance.currentState).toBe('assistant_speaking');
      Player.instances[0].onended?.();
      await flush();
      Player.instances[1].onended?.();
      await flush();
      expect(reports).toHaveLength(1);
      const report = reports[0].detail;
      expect(report.status).toBe('completed');
      expect(report.stages.playback_started).toEqual(expect.any(Number));
      const calls = vi.mocked(apiFetch).mock.calls;
      expect(calls.every(([path]) => path.includes(`voice_trace_id=${report.traceId}`))).toBe(true);
      expect(vi.mocked(streamTurn).mock.calls[0][4]).toBe(report.traceId);
    } finally {
      window.removeEventListener('engmate-voice-latency', listener);
    }
  });
});
