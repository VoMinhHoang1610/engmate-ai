import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/database';
import { GeminiVoiceSession } from './gemini';

vi.mock('../api/database', () => ({ api: vi.fn() }));
const track = { enabled: true, stop: vi.fn(), onended: null as (() => void) | null };
const media = { getTracks: () => [track], getAudioTracks: () => [track] };
class Node {
  onended: (() => void) | null = null;
  buffer: unknown = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class Context {
  static instances: Context[] = [];
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  source = new Node();
  nodes: Node[] = [];
  constructor() {
    Context.instances.push(this);
  }
  createMediaStreamSource() {
    return this.source;
  }
  createBuffer(_channels: number, length: number, rate: number) {
    const samples = new Float32Array(length);
    return { duration: length / rate, getChannelData: () => samples };
  }
  createBufferSource() {
    const node = new Node();
    this.nodes.push(node);
    return node;
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
  pcm() {
    this.port.onmessage?.({ data: new Int16Array([0, 16384]).buffer });
  }
}
class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor(readonly url: URL) {
    Socket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  emit(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
const events = () => ({ state: vi.fn(), transcript: vi.fn(), error: vi.fn(), sync: vi.fn() });
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
async function boot(session: GeminiVoiceSession) {
  const start = session.start();
  await flush();
  const socket = Socket.instances.at(-1)!;
  socket.open();
  socket.emit({ type: 'ready' });
  await start;
  return socket;
}

beforeEach(() => {
  vi.useFakeTimers();
  Context.instances = [];
  Capture.instances = [];
  Socket.instances = [];
  track.enabled = true;
  track.onended = null;
  track.stop.mockReset();
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal('AudioWorkletNode', Capture);
  vi.stubGlobal('WebSocket', Socket);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(media) } });
  vi.mocked(api)
    .mockReset()
    .mockImplementation(async (path) =>
      path.startsWith('/conversations/')
        ? { session_id: 'session', transport: 'websocket', ticket: 'one-use-ticket' }
        : undefined,
    );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Gemini Live voice', () => {
  it('authenticates by ticket, captures PCM, plays audio, interrupts, mutes and cleans up', async () => {
    const callbacks = events();
    const session = new GeminiVoiceSession(1, callbacks);
    const pending = session.start();
    await flush();
    const socket = Socket.instances[0];
    socket.open();
    expect(socket.url.pathname).toBe('/api/voice/session/audio');
    expect(socket.url.search).toBe('');
    expect(socket.send).toHaveBeenLastCalledWith(JSON.stringify({ ticket: 'one-use-ticket' }));
    const capture = Capture.instances[0];
    capture.pcm();
    expect(socket.send).toHaveBeenCalledTimes(1);
    socket.emit({ type: 'ready' });
    await pending;
    await session.start();
    expect(Socket.instances).toHaveLength(1);
    expect(session.currentState).toBe('listening');
    capture.pcm();
    expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toEqual({ audio: 'AAAAQA==' });
    socket.emit({ type: 'transcript', role: 'user', text: 'Hello' });
    expect(callbacks.transcript).toHaveBeenLastCalledWith('user', 'Hello');
    socket.emit({ type: 'transcript', role: 'assistant', text: 'Hi!' });
    expect(session.currentState).toBe('processing');
    socket.emit({ type: 'audio', data: 'AIAAQAAA' });
    const context = Context.instances[0];
    const node = context.nodes[0];
    expect(node.start).toHaveBeenCalledWith(0.02);
    expect(session.currentState).toBe('assistant_speaking');
    expect(track.enabled).toBe(true);
    socket.emit({ type: 'done' });
    expect(callbacks.sync).toHaveBeenCalledOnce();
    socket.emit({ type: 'interrupted' });
    expect(node.stop).toHaveBeenCalledOnce();
    expect(session.currentState).toBe('user_speaking');
    session.mute(true);
    expect(track.enabled).toBe(false);
    expect(capture.port.postMessage).toHaveBeenCalledWith({ reset: true });
    expect(socket.send).toHaveBeenLastCalledWith('{"audio_end":true}');
    const sent = socket.send.mock.calls.length;
    capture.pcm();
    expect(socket.send).toHaveBeenCalledTimes(sent);
    session.mute(false);
    expect(track.enabled).toBe(true);
    socket.emit({ type: 'audio', data: 'AAAAAA==' });
    context.nodes[1].onended?.();
    expect(session.currentState).toBe('listening');
    socket.emit({ type: 'done' });
    await vi.advanceTimersByTimeAsync(12000);
    expect(api).toHaveBeenCalledWith(
      '/voice/session/heartbeat',
      'POST',
      undefined,
      expect.any(AbortSignal),
    );
    const late = socket.onmessage;
    await session.stop();
    late?.({ data: '{"type":"audio","data":"AAAAAA=="}' });
    expect(session.currentState).toBe('idle');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(capture.port.close).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(api).toHaveBeenCalledWith('/voice/session', 'DELETE');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops a microphone granted after End without opening a server session', async () => {
    let resolve!: (value: MediaStream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const session = new GeminiVoiceSession(1, events());
    const start = session.start();
    await flush();
    await session.stop();
    resolve(media as unknown as MediaStream);
    await start;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(api).not.toHaveBeenCalled();
  });

  it('deletes a late REST-created session after End and avoids opening the audio socket', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(api).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const session = new GeminiVoiceSession(1, events());
    const start = session.start();
    await flush();
    await session.stop();
    resolve({ session_id: 'late', transport: 'websocket', ticket: 'ticket' });
    await start;
    expect(api).toHaveBeenCalledWith('/voice/late', 'DELETE');
    expect(Socket.instances).toHaveLength(0);
  });

  it('reports denied permissions and unavailable browser APIs without paid sessions', async () => {
    const callbacks = events();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new DOMException('denied', 'NotAllowedError'),
    );
    const session = new GeminiVoiceSession(1, callbacks);
    await session.start();
    expect(callbacks.error).toHaveBeenLastCalledWith('Bạn chưa cấp quyền microphone.');
    expect(Context.instances[0].close).toHaveBeenCalledOnce();
    vi.stubGlobal('AudioContext', undefined);
    await session.start();
    expect(session.currentState).toBe('error');
    expect(api).not.toHaveBeenCalled();
  });

  it('bounds connection time and handles pre-ready server errors', async () => {
    const callbacks = events();
    const session = new GeminiVoiceSession(1, callbacks);
    let start = session.start();
    await flush();
    Socket.instances[0].onerror?.();
    await start;
    expect(session.currentState).toBe('error');
    start = session.start();
    await flush();
    Socket.instances[1].emit({ type: 'error', message: 'Quota unavailable' });
    await start;
    expect(callbacks.error).toHaveBeenLastCalledWith('Quota unavailable');
    start = session.start();
    await flush();
    await vi.advanceTimersByTimeAsync(20000);
    await start;
    expect(session.currentState).toBe('error');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reconnects on disconnect/backpressure, preserves mute and cancels retry on End', async () => {
    const session = new GeminiVoiceSession(1, events());
    let socket = await boot(session);
    session.mute(true);
    socket.onclose?.();
    await flush();
    expect(session.currentState).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1000);
    await flush();
    socket = Socket.instances[1];
    socket.open();
    socket.emit({ type: 'ready' });
    await flush();
    expect(track.enabled).toBe(false);
    session.mute(false);
    socket.bufferedAmount = 64001;
    Capture.instances[1].pcm();
    await flush();
    expect(session.currentState).toBe('reconnecting');
    await session.stop();
    await vi.advanceTimersByTimeAsync(8000);
    expect(Socket.instances).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { type: 'audio', data: 'bad' },
    { type: 'audio', data: 'AA==' },
    { type: 'transcript', role: 'system', text: 'forged' },
    { type: 'error', message: 'provider unavailable' },
  ])('stops safely on malformed or failed provider events: %j', async (event) => {
    const callbacks = events();
    const session = new GeminiVoiceSession(1, callbacks);
    const socket = await boot(session);
    socket.emit(event);
    await flush();
    expect(session.currentState).toBe('error');
    expect(callbacks.error).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('stops when microphone is revoked and reports uncertain server cleanup', async () => {
    const callbacks = events();
    const session = new GeminiVoiceSession(1, callbacks);
    await boot(session);
    track.onended?.();
    await flush();
    expect(session.currentState).toBe('error');
    await boot(session);
    vi.mocked(api).mockRejectedValueOnce(new Error('network'));
    await expect(session.stop()).rejects.toThrow('network');
    expect(session.currentState).toBe('error');
    expect(callbacks.sync).toHaveBeenCalled();
  });
});
