import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceSession } from './session';
import { api } from '../api/database';

vi.mock('../api/database', () => ({ api: vi.fn() }));
const track = { enabled: true, stop: vi.fn(), onended: null as (() => void) | null };
const media = { getTracks: () => [track], getAudioTracks: () => [track] };
class Channel {
  readyState = 'open';
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
}
class Peer {
  static instances: Peer[] = [];
  connectionState = 'new';
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { streams: unknown[] }) => void) | null = null;
  localDescription: { sdp: string } | null = null;
  channel = new Channel();
  addTrack = vi.fn();
  close = vi.fn();
  constructor() {
    Peer.instances.push(this);
  }
  createDataChannel() {
    return this.channel;
  }
  async createOffer() {
    return { sdp: 'v=0\r\noffer' };
  }
  async setLocalDescription(value: { sdp: string }) {
    this.localDescription = value;
  }
  async setRemoteDescription() {
    this.connectionState = 'connected';
    this.onconnectionstatechange?.();
  }
}
class AudioPlayer {
  static instances: AudioPlayer[] = [];
  srcObject: unknown = null;
  autoplay = false;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor() {
    AudioPlayer.instances.push(this);
  }
}
const events = () => ({ state: vi.fn(), transcript: vi.fn(), error: vi.fn(), sync: vi.fn() });
function emit(peer: Peer, value: object) {
  peer.channel.onmessage?.({ data: JSON.stringify(value) });
}

beforeEach(() => {
  vi.useFakeTimers();
  Peer.instances = [];
  AudioPlayer.instances = [];
  track.enabled = true;
  track.stop.mockReset();
  track.onended = null;
  vi.stubGlobal('RTCPeerConnection', Peer);
  vi.stubGlobal('Audio', AudioPlayer);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(media) } });
  vi.mocked(api)
    .mockReset()
    .mockImplementation(async (path) =>
      path.startsWith('/conversations/')
        ? { session_id: 'session', sdp: 'v=0\r\nanswer' }
        : undefined,
    );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Realtime voice lifecycle', () => {
  it('negotiates WebRTC, keeps mic on during AI speech, flushes interruption and ignores stale deltas', async () => {
    const callbacks = events();
    const session = new VoiceSession(1, callbacks);
    await session.start();
    await session.start();
    expect(Peer.instances).toHaveLength(1);
    const peer = Peer.instances[0];
    peer.ontrack?.({ streams: [media] });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    expect(session.currentState).toBe('listening');
    emit(peer, { type: 'response.created', response: { id: 'A' } });
    emit(peer, { type: 'output_audio_buffer.started', response_id: 'A' });
    expect(session.currentState).toBe('assistant_speaking');
    expect(track.enabled).toBe(true);
    emit(peer, { type: 'response.output_audio_transcript.delta', response_id: 'A', delta: 'Old' });
    emit(peer, { type: 'input_audio_buffer.speech_started' });
    expect(session.currentState).toBe('user_speaking');
    expect(peer.channel.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'output_audio_buffer.clear' }),
    );
    expect(AudioPlayer.instances[0].pause).toHaveBeenCalled();
    emit(peer, { type: 'response.output_audio_transcript.delta', response_id: 'A', delta: 'LATE' });
    emit(peer, { type: 'response.done', response: { id: 'A', status: 'completed' } });
    expect(callbacks.transcript).not.toHaveBeenCalledWith('assistant', 'OldLATE');
    emit(peer, { type: 'input_audio_buffer.speech_stopped' });
    emit(peer, {
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'Wait',
    });
    emit(peer, { type: 'response.created', response: { id: 'B' } });
    emit(peer, { type: 'response.output_text.delta', response_id: 'B', delta: 'New answer' });
    emit(peer, { type: 'output_audio_buffer.started', response_id: 'B' });
    emit(peer, { type: 'response.done', response: { id: 'B', status: 'completed' } });
    emit(peer, { type: 'output_audio_buffer.stopped', response_id: 'B' });
    expect(callbacks.transcript).toHaveBeenLastCalledWith('assistant', 'New answer');
    expect(callbacks.sync).toHaveBeenCalledOnce();
    expect(session.currentState).toBe('listening');
    session.mute(true);
    expect(track.enabled).toBe(false);
    session.mute(false);
    expect(track.enabled).toBe(true);
    await vi.advanceTimersByTimeAsync(12000);
    expect(api).toHaveBeenCalledWith(
      '/voice/session/heartbeat',
      'POST',
      undefined,
      expect.any(AbortSignal),
    );
    await session.stop();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(peer.close).toHaveBeenCalledOnce();
    expect(peer.channel.close).toHaveBeenCalledOnce();
    expect(AudioPlayer.instances[0].srcObject).toBeNull();
    expect(api).toHaveBeenCalledWith('/voice/session', 'DELETE');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases a microphone granted after End Voice without creating a paid session', async () => {
    let resolve!: (value: MediaStream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const session = new VoiceSession(1, events());
    const start = session.start();
    await session.stop();
    resolve(media as unknown as MediaStream);
    await start;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(api).not.toHaveBeenCalled();
    expect(session.currentState).toBe('idle');
  });

  it.each(['NotAllowedError', 'NotFoundError'])(
    'reports microphone error %s without crashing',
    async (name) => {
      const callbacks = events();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new DOMException('test', name),
      );
      const session = new VoiceSession(1, callbacks);
      await session.start();
      expect(session.currentState).toBe('error');
      expect(callbacks.error).toHaveBeenCalledOnce();
      expect(api).not.toHaveBeenCalled();
    },
  );

  it('handles unsupported browsers and signaling/API failure', async () => {
    const callbacks = events();
    vi.stubGlobal('RTCPeerConnection', undefined);
    await new VoiceSession(1, callbacks).start();
    expect(callbacks.error).toHaveBeenCalledWith(expect.stringMatching(/hỗ trợ/));
    vi.stubGlobal('RTCPeerConnection', Peer);
    vi.mocked(api).mockRejectedValueOnce(new Error('Provider unavailable'));
    const session = new VoiceSession(1, callbacks);
    await session.start();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(session.currentState).toBe('error');
  });

  it('reconnects a failed connection with new SDP and never replays old audio', async () => {
    const session = new VoiceSession(1, events());
    await session.start();
    const peer = Peer.instances[0];
    peer.connectionState = 'failed';
    peer.onconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(1000);
    expect(Peer.instances).toHaveLength(2);
    expect(peer.close).toHaveBeenCalledOnce();
    expect(session.currentState).toBe('listening');
    await session.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closes all resources for provider error and ignores data from an old connection', async () => {
    const callbacks = events();
    const session = new VoiceSession(1, callbacks);
    await session.start();
    const peer = Peer.instances[0];
    const late = peer.channel.onmessage!;
    emit(peer, { type: 'error' });
    await vi.waitFor(() => expect(session.currentState).toBe('error'));
    late({ data: JSON.stringify({ type: 'response.created', response: { id: 'late' } }) });
    expect(session.currentState).toBe('error');
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it('ends locally even when server cleanup fails and lets text chat recover', async () => {
    const callbacks = events();
    const session = new VoiceSession(1, callbacks);
    await session.start();
    vi.mocked(api).mockRejectedValueOnce(new Error('Server unavailable'));
    await expect(session.stop()).rejects.toThrow('Server unavailable');
    expect(session.currentState).toBe('error');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(callbacks.error).toHaveBeenCalledOnce();
    expect(callbacks.sync).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds reconnect attempts and clears all retry timers on End Voice', async () => {
    const callbacks = events();
    const session = new VoiceSession(1, callbacks);
    await session.start();
    const peer = Peer.instances[0];
    peer.connectionState = 'failed';
    peer.onconnectionstatechange?.();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      new Error('network unavailable'),
    );
    await vi.advanceTimersByTimeAsync(7000);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(4);
    expect(session.currentState).toBe('error');
    expect(callbacks.error).toHaveBeenCalledOnce();
    await session.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
