import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamTurn, type ChatEvent } from './chatStream';
import { apiFetch } from './database';

vi.mock('./database', () => ({ apiFetch: vi.fn() }));
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
const message = { message_id: 1, role: 'user', content: 'Hello', status: 'completed' };
const reply = { message_id: 2, role: 'assistant', content: 'Xin chào', status: 'completed' };
const payload = { client_request_id: 'request', message: 'Hello' };
const start = {
  type: 'start',
  response_id: 2,
  message,
  reply: { ...reply, content: '', status: 'pending' },
};
function wire(event: object) {
  return `data: ${JSON.stringify(event)}\n\n`;
}
function response(text: string) {
  return new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
}

describe('Chat SSE transport', () => {
  it('renders UTF-8 deltas before completion and discards another response identity', async () => {
    let control!: ReadableStreamDefaultController<Uint8Array>;
    const bytes = new TextEncoder();
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            control = controller;
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
    );
    const events: ChatEvent[] = [];
    const task = streamTurn(1, payload, new AbortController().signal, (event) =>
      events.push(event),
    );
    control.enqueue(
      bytes.encode(wire(start) + wire({ type: 'delta', response_id: 2, delta: 'Xin ' })),
    );
    await vi.waitFor(() => expect(events.map((event) => event.type)).toEqual(['start', 'delta']));
    const rest = bytes.encode(
      wire({ type: 'delta', response_id: 100, delta: 'stale' }) +
        wire({ type: 'delta', response_id: 2, delta: 'chào' }) +
        wire({ type: 'done', response_id: 2, turn: { message, reply } }),
    );
    // Split the multibyte Vietnamese data at every byte boundary.
    for (const byte of rest) control.enqueue(new Uint8Array([byte]));
    control.close();
    expect((await task).reply.content).toBe('Xin chào');
    expect(events.filter((event) => event.type === 'delta').map((event) => event.delta)).toEqual([
      'Xin ',
      'chào',
    ]);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/conversations/1/messages/stream',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('accepts idempotent completed turns without requiring a new stream start', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      response(wire({ type: 'done', turn: { message, reply } })),
    );
    expect((await streamTurn(1, payload, new AbortController().signal, vi.fn())).reply).toEqual(
      reply,
    );
  });

  it('does not turn a failed or truncated stream into fake success', async () => {
    for (const text of [
      wire(start),
      wire(start) +
        wire({ type: 'error', response_id: 2, status: 502, message: 'Provider failed' }),
      'data: invalid\n\n',
      wire(start) + wire({ type: 'delta', response_id: 2, delta: 3 }),
    ]) {
      vi.mocked(apiFetch).mockResolvedValue(response(text));
      await expect(streamTurn(1, payload, new AbortController().signal, vi.fn())).rejects.toThrow();
    }
  });

  it('cancels the response body when the caller aborts after HTTP headers', async () => {
    const cancelled = vi.fn();
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(new ReadableStream({ cancel: cancelled }), {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const controller = new AbortController();
    const task = streamTurn(1, payload, controller.signal, vi.fn());
    const assertion = expect(task).rejects.toThrow();
    await Promise.resolve();
    controller.abort(new Error('Stopped'));
    await assertion;
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('bounds stream lifetime and handles invalid HTTP/content types', async () => {
    vi.useFakeTimers();
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(new ReadableStream(), { headers: { 'Content-Type': 'text/event-stream' } }),
    );
    const task = streamTurn(1, payload, new AbortController().signal, vi.fn());
    const assertion = expect(task).rejects.toThrow(/quá lâu/);
    await vi.advanceTimersByTimeAsync(45000);
    await assertion;
    for (const status of [429, 503, 500]) {
      vi.mocked(apiFetch).mockResolvedValue(new Response('', { status }));
      await expect(streamTurn(1, payload, new AbortController().signal, vi.fn())).rejects.toThrow();
    }
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}'));
    await expect(streamTurn(1, payload, new AbortController().signal, vi.fn())).rejects.toThrow(
      /định dạng/,
    );
  });
});
