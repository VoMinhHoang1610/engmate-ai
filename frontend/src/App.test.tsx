import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { saveSession, hasSession } from './api/database';
import { docTiengAnh, dungDoc } from './speech/audio';
import type { Capabilities, Conversation, Message } from './types';
import type { VoiceState } from './voice/session';

const voice = vi.hoisted(() => ({
  callbacks: null as null | {
    state: (value: VoiceState) => void;
    transcript: (role: 'user' | 'assistant', text: string) => void;
    error: (message: string) => void;
    sync: () => void;
  },
  start: vi.fn(),
  stop: vi.fn(),
  mute: vi.fn(),
  gemini: vi.fn(),
}));
vi.mock('./voice/session', () => ({
  VoiceSession: class {
    constructor(_identity: number, callbacks: NonNullable<typeof voice.callbacks>) {
      voice.callbacks = callbacks;
    }
    start = voice.start;
    stop = voice.stop;
    mute = voice.mute;
  },
}));
vi.mock('./voice/gemini', () => ({
  GeminiVoiceSession: class {
    constructor(identity: number, callbacks: NonNullable<typeof voice.callbacks>) {
      voice.gemini(identity);
      voice.callbacks = callbacks;
    }
    start = voice.start;
    stop = voice.stop;
    mute = voice.mute;
  },
}));

const recording = vi.hoisted(() => ({ active: false, recording: false, processing: false }));
vi.mock('./hooks/useThuAm', () => ({
  useThuAm: (onText: (text: string) => void) => ({
    ...recording,
    status: 'Đang ghi âm',
    toggle: () => onText('Hello from my microphone'),
  }),
}));
vi.mock('./speech/audio', () => ({
  docTiengAnh: vi.fn().mockResolvedValue(undefined),
  dungDoc: vi.fn(),
  xoaBoNhoAmThanh: vi.fn(),
}));

const caps: Capabilities = {
  provider: 'mock',
  is_mock: true,
  chat: true,
  speech: true,
  realtime: false,
  reason: null,
};
const row = (id: number): Conversation => ({
  conversation_id: id,
  title: `Chat ${id}`,
  status: 'in_progress',
  created_at: '2026-10-16T00:00:00Z',
});
const reply: Message = {
  message_id: 2,
  role: 'assistant',
  content: '[Mock/A2] Hello',
  status: 'completed',
};
let history: Conversation[];
let messages: Message[];
let calls: { path: string; body: Record<string, unknown> }[];
let intercept:
  ((path: string, options: RequestInit) => Promise<Response> | Response | undefined) | null;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  saveSession({
    access_token: 'access',
    refresh_token: 'refresh-token-long-enough-for-the-contract',
  });
  recording.active = false;
  recording.recording = false;
  recording.processing = false;
  vi.mocked(docTiengAnh).mockReset().mockResolvedValue(undefined);
  history = [row(1)];
  messages = [];
  calls = [];
  intercept = null;
  voice.start.mockReset().mockImplementation(async () => voice.callbacks?.state('listening'));
  voice.stop.mockReset().mockImplementation(async () => {
    voice.callbacks?.state('idle');
    voice.callbacks?.sync();
  });
  voice.mute.mockReset();
  voice.gemini.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, options: RequestInit = {}) => {
      const custom = intercept?.(path, options);
      if (custom) return custom;
      const body =
        options.body && typeof options.body === 'string'
          ? (JSON.parse(options.body) as Record<string, unknown>)
          : {};
      calls.push({ path, body });
      if (path === '/api/capabilities') return json(caps);
      if (path === '/api/me') return json({ username: 'learner', email: 'learner@example.test' });
      if (path.startsWith('/api/conversations?')) {
        const offset = Number(new URL(path, 'http://test').searchParams.get('offset'));
        return json(history.slice(offset, offset + 50));
      }
      if (path === '/api/conversations') {
        const created = row(200);
        history.unshift(created);
        return json(created, 201);
      }
      if (path.endsWith('/messages') && options.method === 'POST') {
        const user: Message = {
          message_id: 1,
          role: 'user',
          content: String(body.message),
          status: 'completed',
        };
        messages = [user, reply];
        return json({ message: user, reply });
      }
      if (path.includes('/messages?')) return json(messages);
      if (path.endsWith('/cancel')) {
        messages = messages.map((m) => ({ ...m, status: 'cancelled' }));
        return json({ status: 'cancelled' });
      }
      if (path.endsWith('/close')) return json({ status: 'completed' });
      if (path.startsWith('/api/speech/voices'))
        return json([{ id: 'en-voice', name: 'English voice', language: 'en', gender: 'female' }]);
      if (path === '/api/auth/logout') return new Response(null, { status: 204 });
      if (path === '/api/auth/refresh') return json({}, 401);
      if (path === '/api/auth/login' || path === '/api/auth/register')
        return json({
          access_token: 'new',
          refresh_token: 'new-refresh-token-long-enough-for-contract',
        });
      throw new Error('Unexpected API path: ' + path);
    }),
  );
});

async function open() {
  render(<App />);
  await screen.findByText('learner');
  await waitFor(() => expect(screen.queryByText('Đang tải tin nhắn…')).not.toBeInTheDocument());
}
async function send(text = 'Hello, Mate') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  await screen.findByText('[Mock/A2] Hello');
}

describe('conversation-only application', () => {
  it('scrolls new replies inside the message pane without scrolling page ancestors', async () => {
    const targets: HTMLElement[] = [];
    const scrollTo = vi.fn(function (this: HTMLElement) {
      targets.push(this);
    });
    const scrollIntoView = vi.fn();
    const oldScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');
    const oldScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    try {
      await open();
      const pane = document.querySelector<HTMLElement>('.chat-messages')!;
      Object.defineProperty(pane, 'scrollHeight', { configurable: true, value: 1200 });
      await send();
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 1200, behavior: 'smooth' });
      expect(targets.length).toBeGreaterThan(0);
      expect(targets.every((target) => target === pane)).toBe(true);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      for (const [name, descriptor] of [
        ['scrollTo', oldScrollTo],
        ['scrollIntoView', oldScrollIntoView],
      ] as const) {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
        else Reflect.deleteProperty(HTMLElement.prototype, name);
      }
    }
  });

  it('renders streamed text incrementally into the same durable assistant message', async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();
    intercept = (path) => {
      if (path === '/api/capabilities')
        return json({ ...caps, provider: 'openai', is_mock: false, streaming: true });
      if (path.endsWith('/messages/stream'))
        return new Response(
          new ReadableStream({
            start(controller) {
              stream = controller;
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
    };
    await open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' }), {
      target: { value: 'Live draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await waitFor(() => expect(stream).toBeDefined());
    const user: Message = {
      message_id: 1,
      role: 'user',
      content: 'Live draft',
      status: 'completed',
    };
    const assistant: Message = { ...reply, content: '', status: 'pending' };
    act(() =>
      stream.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'start', response_id: 2, message: user, reply: assistant })}\n\ndata: ${JSON.stringify({ type: 'delta', response_id: 2, delta: 'Generated first' })}\n\n`,
        ),
      ),
    );
    await screen.findByText('Generated first');
    expect(screen.getAllByText('Mate')).toHaveLength(1);
    messages = [user, { ...reply, content: 'Generated first and second' }];
    act(() => {
      stream.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'delta', response_id: 2, delta: ' and second' })}\n\ndata: ${JSON.stringify({ type: 'done', response_id: 2, turn: { message: user, reply: messages[1] } })}\n\n`,
        ),
      );
      stream.close();
    });
    await screen.findByText('Generated first and second');
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toHaveValue(''),
    );
    expect(screen.getAllByText('Generated first and second')).toHaveLength(1);
  });

  it('cancels an active stream, keeps its draft and exposes a new-turn recovery', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'openai', is_mock: false, streaming: true })
        : path.endsWith('/messages/stream')
          ? new Response(new ReadableStream(), { headers: { 'Content-Type': 'text/event-stream' } })
          : undefined;
    await open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' }), {
      target: { value: 'Keep my draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dừng phản hồi' }));
    await screen.findByRole('button', { name: 'Gửi thành lượt mới' });
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toHaveValue(
      'Keep my draft',
    );
  });

  it('uses the existing chat layout for realtime controls and synchronizes durable voice history', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'openai', is_mock: false, realtime: true, streaming: true })
        : undefined;
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tắt microphone' }));
    expect(voice.mute).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bật microphone' }));
    expect(voice.mute).toHaveBeenLastCalledWith(false);
    act(() => {
      voice.callbacks?.transcript('user', 'A spoken question');
      voice.callbacks?.state('assistant_speaking');
    });
    expect(screen.getByText('Bạn: A spoken question')).toBeInTheDocument();
    act(() => voice.callbacks?.transcript('assistant', 'Generated spoken answer'));
    expect(screen.getByText('Mate: Generated spoken answer')).toBeInTheDocument();
    messages = [{ ...reply, content: 'Saved spoken answer' }];
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await screen.findByText('Saved spoken answer');
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toBeEnabled();
    act(() => {
      voice.callbacks?.state('error');
      voice.callbacks?.error('Voice upstream failed');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Voice upstream failed');
  });

  it('preserves existing history when loading another page fails', async () => {
    history = Array.from({ length: 50 }, (_, index) => row(100 - index));
    intercept = (path) => (path.endsWith('offset=50') ? json({}, 503) : undefined);
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm hội thoại' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    expect(screen.getByRole('heading', { name: 'Chat 100' })).toBeInTheDocument();
  });

  it('allows returning to login after account loading fails', async () => {
    intercept = (path) => (path === '/api/me' ? json({}, 500) : undefined);
    render(<App />);
    await screen.findByRole('button', { name: 'Về đăng nhập' });
    fireEvent.click(screen.getByRole('button', { name: 'Về đăng nhập' }));
    await screen.findByRole('heading', { name: 'Đăng nhập' });
    expect(hasSession()).toBe(false);
  });

  it('keeps failed close recoverable and supports keyboard send', async () => {
    await open();
    intercept = (path) => (path.endsWith('/close') ? json({}, 503) : undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc hội thoại' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    const input = screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' });
    fireEvent.change(input, { target: { value: 'Keyboard message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(calls.filter((c) => c.path.endsWith('/messages'))).toHaveLength(0);
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('[Mock/A2] Hello');
  });

  it('shows one conversation workspace and none of the removed learning pages', async () => {
    await open();
    expect(screen.getByText('MOCK · KIỂM THỬ')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Hội thoại' })).toHaveClass('panel', 'chat-panel');
    expect(screen.getByRole('heading', { name: 'Hội thoại AI' })).toBeInTheDocument();
    expect(document.querySelector('.sidebar .logo-mark')).toHaveAttribute(
      'src',
      '/engmate-mark.svg',
    );
    expect(document.querySelector('.sidebar-mate [data-mate-mood="welcome"]')).toBeInTheDocument();
    for (const name of ['Flashcard', 'Lộ trình', 'Sổ từ vựng', 'Speaking', 'Reading', 'Tổng quan'])
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cuộc gọi trực tiếp/ })).toBeDisabled();
    await send();
    expect(screen.getByText('Hello, Mate')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toHaveValue('');
  });

  it('loads conversation history beyond the first page', async () => {
    history = Array.from({ length: 55 }, (_, index) => row(100 - index));
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm hội thoại' }));
    await screen.findByRole('button', { name: /Chat 46/ });
    expect(calls.some((c) => c.path.endsWith('offset=50'))).toBe(true);
  });

  it('creates new chats and supports the mobile history menu', async () => {
    history = [row(100), row(99)];
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
    expect(screen.getByRole('button', { name: 'Đóng danh sách hội thoại' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng danh sách hội thoại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('button', { name: 'Đóng danh sách hội thoại' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hội thoại mới/ }));
    await screen.findByRole('heading', { name: 'Chat 200' });
    fireEvent.click(screen.getByRole('button', { name: /Chat 99/ }));
    await screen.findByRole('heading', { name: 'Chat 99' });
  });

  it('handles an empty account and a failed create without changing the retry identity', async () => {
    history = [];
    let tries = 0;
    const ids: unknown[] = [];
    intercept = (path, options) => {
      if (path === '/api/conversations') {
        ids.push(
          (JSON.parse(String(options.body)) as { client_request_id: string }).client_request_id,
        );
        if (tries++ === 0) return json({}, 503);
      }
    };
    await open();
    expect(screen.getByText('Bắt đầu từ một lời chào.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hội thoại mới/ }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    fireEvent.click(screen.getByRole('button', { name: /Hội thoại mới/ }));
    await screen.findByRole('heading', { name: 'Chat 200' });
    expect(ids[0]).toBe(ids[1]);
  });

  it('keeps a network retry id and requires a new id after an explicit failed reply', async () => {
    let tries = 0;
    const ids: string[] = [];
    intercept = (path, options) => {
      if (path.endsWith('/messages') && options.method === 'POST') {
        const body = JSON.parse(String(options.body)) as { client_request_id: string };
        ids.push(body.client_request_id);
        if (tries++ === 0) return Promise.reject(new Error('Network disconnected'));
      }
    };
    await open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' }), {
      target: { value: 'Hello, Mate' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('Network disconnected');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('[Mock/A2] Hello');
    expect(ids[0]).toBe(ids[1]);
    intercept = (path, options) => {
      if (path.endsWith('/messages') && options.method === 'POST') {
        messages = [{ ...reply, content: '', status: 'failed' }];
        return json({ message: { message_id: 3 }, reply: messages[0] });
      }
    };
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' }), {
      target: { value: 'Another question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('Lượt trả lời chưa thành công. Bạn có thể gửi thành lượt mới.');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi thành lượt mới' }));
    intercept = null;
    await send('Try again');
  });

  it('cancels a pending reply, reloads it and closes a conversation', async () => {
    messages = [{ ...reply, content: '', status: 'pending' }];
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy phản hồi đang chờ' }));
    await screen.findByText('Đã hủy phản hồi.');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại tin nhắn' }));
    await screen.findByText('Đã hủy phản hồi.');
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc hội thoại' }));
    await screen.findByText('Hội thoại đã kết thúc. Bạn vẫn có thể đọc lại lịch sử.');
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toBeDisabled();
  });

  it('offers microphone draft, voice choice, playback and stopping without automatic paid calls', async () => {
    messages = [reply];
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi âm' }));
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toHaveValue(
      'Hello from my microphone',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giọng đọc' }));
    await screen.findByRole('option', { name: 'English voice' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Giọng đọc tiếng Anh' }), {
      target: { value: 'en-voice' },
    });
    expect(document.documentElement.dataset.speechVoice).toBe('en-voice');
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu trả lời' }));
    await waitFor(() =>
      expect(docTiengAnh).toHaveBeenCalledWith(reply.content, 1, expect.any(AbortSignal), false),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dừng giọng đọc' }));
    expect(dungDoc).toHaveBeenCalled();
    vi.mocked(docTiengAnh).mockRejectedValueOnce(new Error('Audio unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu trả lời' }));
    await screen.findByText('Audio unavailable');
  });

  it('reports voice and history failures and recovers account loading', async () => {
    let fail = true;
    intercept = (path) => (path === '/api/me' && fail ? json({}, 500) : undefined);
    render(<App />);
    await screen.findByRole('button', { name: 'Thử tải lại' });
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }));
    await screen.findByText('learner');
    intercept = (path) =>
      path.startsWith('/api/speech/voices')
        ? json({}, 502)
        : path.includes('/messages?')
          ? json({}, 503)
          : undefined;
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giọng đọc' }));
    await screen.findByText('Chưa tải được danh sách giọng nói. Vui lòng thử lại.');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại tin nhắn' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
  });

  it('keeps the session if server logout fails and clears it after revocation', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
    intercept = (path) => (path === '/api/auth/logout' ? json({}, 503) : undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    expect(hasSession()).toBe(true);
    intercept = null;
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await screen.findByRole('heading', { name: 'Đăng nhập' });
    expect(hasSession()).toBe(false);
  });

  it('shows provider configuration failure and never enables mock implicitly', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({
            ...caps,
            provider: 'blaze',
            is_mock: false,
            chat: false,
            reason: 'Cần hợp đồng Blaze Chat',
          })
        : undefined;
    await open();
    expect(screen.getByText('Cần hợp đồng Blaze Chat')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tin nhắn tiếng Anh' })).toBeDisabled();
  });

  it('shows Gemini and selects its voice transport in the existing conversation layout', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', is_mock: false, realtime: true, streaming: true })
        : undefined;
    await open();
    expect(screen.getByText('GEMINI')).toBeInTheDocument();
    expect(voice.gemini).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await screen.findByText('Sẵn sàng thoại');
    expect(voice.stop).toHaveBeenCalled();
  });

  it('logs in without reload and registers with the real API field names', async () => {
    saveSession(null);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tài khoản hoặc email'), {
      target: { value: 'learner' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password-for-test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByText('learner');
    await act(async () => {
      saveSession(null);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }));
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Người học' } });
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'newlearner' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.test' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password-for-test' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'password-for-test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await screen.findByText('learner');
    expect(calls.find((c) => c.path === '/api/auth/register')?.body).toMatchObject({
      display_name: 'Người học',
      username: 'newlearner',
    });
  });

  it('handles wrong credentials and form switching clears the password', async () => {
    saveSession(null);
    intercept = (path) => (path === '/api/auth/login' ? json({}, 401) : undefined);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tài khoản hoặc email'), {
      target: { value: 'learner' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByText(/Tài khoản hoặc mật khẩu không đúng/);
    fireEvent.click(screen.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }));
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Đã có tài khoản? Đăng nhập' }));
    expect(screen.getByLabelText('Tài khoản hoặc email')).toBeInTheDocument();
  });
});
