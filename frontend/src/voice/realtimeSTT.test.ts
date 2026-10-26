import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/database';
import { RealtimeSTT } from './realtimeSTT';

vi.mock('../api/database', () => ({ api: vi.fn() }));
const lease = { session_id: '12345678-abcd-abcd-abcd-123456789abc', ticket: 't'.repeat(43) };
class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor(readonly url: URL) {
    Socket.instances.push(this);
  }
  event(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
const turns: RealtimeSTT[] = [];
function turn() {
  const caption = vi.fn();
  const stt = new RealtimeSTT(7, 'en', caption);
  turns.push(stt);
  return { stt, caption };
}
async function connect() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const socket = Socket.instances.at(-1)!;
  socket.onopen?.();
  socket.event({ type: 'ready' });
  return socket;
}
beforeEach(() => {
  vi.useFakeTimers();
  Socket.instances = [];
  vi.stubGlobal('WebSocket', Socket);
  vi.mocked(api).mockReset().mockResolvedValue(lease);
});
afterEach(() => {
  turns.splice(0).forEach((stt) => stt.cancel());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('one-turn realtime STT transport', () => {
  it('buffers pre-roll until provider ready and streams PCM before endpointing', async () => {
    const { stt } = turn();
    const frame = new Int16Array(1600).fill(-5000);
    stt.push(frame, true);
    const socket = await connect();
    expect(api).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/conversations\/7\/speech-ticket\?language=en&voice_trace_id=[\da-f-]{36}$/,
      ),
      'POST',
      undefined,
      expect.any(AbortSignal),
    );
    expect(socket.url.pathname).toBe(`/api/speech/realtime/${lease.session_id}`);
    expect(socket.url.search).toBe('');
    expect(socket.send.mock.calls[0][0]).toBe(JSON.stringify({ ticket: lease.ticket }));
    const pcm = socket.send.mock.calls[1][0] as ArrayBuffer;
    expect(pcm.byteLength).toBe(3200);
    expect(new DataView(pcm).getInt16(0, true)).toBe(-5000);
    stt.push(frame, true);
    expect(socket.send).toHaveBeenCalledTimes(3);
    expect(socket.close).not.toHaveBeenCalled();
  });

  it('shows partial captions but resolves only a final after the local endpoint', async () => {
    const { stt, caption } = turn();
    const socket = await connect();
    stt.push(new Int16Array(1600), true);
    socket.event({ type: 'partial', text: 'I want' });
    expect(caption).toHaveBeenLastCalledWith('I want');
    let resolved = false;
    const result = stt.finish().then((text) => {
      resolved = true;
      return text;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(socket.send.mock.calls.filter(([value]) => value instanceof ArrayBuffer)).toHaveLength(
      3,
    );
    socket.event({ type: 'final', text: 'I want to learn.' });
    expect(await result).toBe('I want to learn.');
    expect(socket.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('accumulates final segments across a short pause without prematurely closing the turn', async () => {
    const { stt } = turn();
    const socket = await connect();
    stt.push(new Int16Array(1600), true);
    socket.event({ type: 'final', text: 'Hello.' });
    expect(socket.close).not.toHaveBeenCalled();
    stt.push(new Int16Array(1600), true);
    socket.event({ type: 'partial', text: 'Again' });
    const result = stt.finish();
    socket.event({ type: 'final', text: 'Hello.' });
    expect(await result).toBe('Hello. Hello.');
  });

  it('reuses a stable final at endpoint but invalidates it when the user continues speaking', async () => {
    const { stt } = turn();
    const socket = await connect();
    socket.event({ type: 'final', text: 'One.' });
    stt.push(new Int16Array(1600), false);
    expect(await stt.finish()).toBe('One.');
    const next = turn().stt;
    const other = await connect();
    other.event({ type: 'final', text: 'One.' });
    next.push(new Int16Array(1600), true);
    const pending = next.finish();
    other.event({ type: 'partial', text: 'Two' });
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).rejects.toThrow('chưa chốt');
    expect(api).toHaveBeenCalledTimes(2); // Never silently resend via paid batch STT.
  });

  it('cancels setup and ignores a ticket returned after cancellation', async () => {
    let deliver!: (value: typeof lease) => void;
    vi.mocked(api).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        }),
    );
    const { stt } = turn();
    stt.cancel();
    deliver(lease);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(Socket.instances).toHaveLength(0);
    await expect(stt.finish()).rejects.toThrow('cancelled');
    expect((vi.mocked(api).mock.calls[0][3] as AbortSignal).aborted).toBe(true);
  });

  it('ignores callbacks retained by an obsolete connection', async () => {
    const { stt, caption } = turn();
    const socket = await connect();
    const callback = socket.onmessage!;
    stt.cancel();
    callback({ data: JSON.stringify({ type: 'final', text: 'stale' }) });
    expect(caption).not.toHaveBeenCalled();
    await expect(stt.finish()).rejects.toThrow('cancelled');
  });

  it.each([
    { type: 'final', text: 123 },
    { type: 'partial', text: 'x'.repeat(2001) },
    { type: 'ready' },
  ])(
    'rejects invalid/provider error frames without echoing upstream data: $type',
    async (event) => {
      const { stt } = turn();
      const socket = await connect();
      socket.event(event);
      await expect(stt.finish()).rejects.toThrow('không đúng giao thức');
      expect(socket.close).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['provider_auth', 'xác thực'],
    ['insufficient_credits', 'không đủ credit'],
    ['invoice_not_paid', 'hóa đơn'],
    ['subscription_missing', 'chưa có gói'],
    ['plan_upgrade_required', 'chưa hỗ trợ'],
    ['provider_timeout', 'quá thời gian'],
    ['provider_rate_limited', 'giới hạn lượt'],
    ['provider_unavailable', 'gián đoạn'],
    ['provider_error', 'lỗi dịch vụ'],
    ['audio_limit', 'Audio STT vượt giới hạn'],
    ['transcript_limit', 'Bản chép lời vượt giới hạn'],
    ['__proto__', 'lỗi dịch vụ'],
    ['unknown', 'lỗi dịch vụ'],
  ])('preserves safe error cause %s before and after ready', async (code, expected) => {
    for (const ready of [false, true]) {
      const failure = vi.fn();
      const caption = vi.fn();
      const stt = new RealtimeSTT(7, 'vi', caption, failure);
      turns.push(stt);
      for (let i = 0; i < 10; i++) await Promise.resolve();
      const socket = Socket.instances.at(-1)!;
      socket.onopen?.();
      if (ready) socket.event({ type: 'ready' });
      socket.event({ type: 'error', code, message: 'PRIVATE-TOKEN', text: 'PRIVATE-TRANSCRIPT' });
      await expect(stt.finish()).rejects.toThrow(expected);
      expect(failure).toHaveBeenCalledOnce();
      expect(failure.mock.calls[0][0]).not.toContain('PRIVATE');
      expect(caption).not.toHaveBeenCalled();
      expect(socket.close).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('handles legacy backend error frames as service errors rather than bad transcripts', async () => {
    const { stt } = turn();
    const socket = await connect();
    socket.event({ type: 'error', message: 'PRIVATE' });
    await expect(stt.finish()).rejects.toThrow('lỗi dịch vụ STT');
  });

  it('bounds setup backlog and websocket buffered audio rather than dropping frames', async () => {
    const { stt } = turn();
    for (let i = 0; i < 51; i++) stt.push(new Int16Array(1600), true);
    await expect(stt.finish()).rejects.toThrow('vượt giới hạn');
    const next = turn().stt;
    const socket = await connect();
    socket.bufferedAmount = 160000;
    next.push(new Int16Array(1600), true);
    await expect(next.finish()).rejects.toThrow('Mạng chậm');
  });

  it('fails on a dropped connection or setup timeout without reconnecting', async () => {
    const { stt } = turn();
    const socket = await connect();
    socket.onclose?.();
    await expect(stt.finish()).rejects.toThrow('bị ngắt');
    const next = turn().stt;
    await vi.advanceTimersByTimeAsync(10000);
    await expect(next.finish()).rejects.toThrow('quá thời gian');
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('turns synchronous websocket send errors into a bounded turn failure', async () => {
    const { stt } = turn();
    const socket = await connect();
    socket.send.mockImplementation(() => {
      throw new Error('transport unavailable');
    });
    expect(() => stt.push(new Int16Array(1600), true)).not.toThrow();
    await expect(stt.finish()).rejects.toThrow('bị ngắt');
    expect(socket.close).toHaveBeenCalledOnce();
  });
});
