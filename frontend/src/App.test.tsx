import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { saveSession, hasSession } from './api/database';
import { docVanBan, dungDoc } from './speech/audio';
import type { Capabilities, Conversation, Message } from './types';
import type { VoiceState } from './voice/session';
import type { LearningLesson, LearningPlan, LessonProgress } from './learning/types';

// Module transformation is test setup; keep UI interaction deadlines unchanged.
beforeAll(async () => {
  await Promise.all([import('./tutor/TutorWorkspace'), import('./landing/LandingPage')]);
});

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
  blaze: vi.fn(),
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
    constructor(
      identity: number,
      callbacks: NonNullable<typeof voice.callbacks>,
      voiceId?: string,
    ) {
      voice.gemini(identity, voiceId);
      voice.callbacks = callbacks;
    }
    start = voice.start;
    stop = voice.stop;
    mute = voice.mute;
  },
}));
vi.mock('./voice/blaze', () => ({
  BlazeVoiceSession: class {
    constructor(
      identity: number,
      callbacks: NonNullable<typeof voice.callbacks>,
      voiceId?: string,
    ) {
      voice.blaze(identity, voiceId);
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
  docVanBan: vi.fn().mockResolvedValue(undefined),
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
const courseLesson: LearningLesson = {
  id: 'foundation-01',
  title: 'Chào hỏi nơi làm việc',
  minutes: 10,
  objective: 'Giới thiệu tên và nghề nghiệp khi gặp đồng nghiệp mới.',
  explanation: 'Dùng I am để giới thiệu tên và nghề nghiệp.',
  pattern: 'I am + name / job',
  example: 'I am Linh. I am a designer.',
  translation: 'Tôi là Linh. Tôi là nhà thiết kế.',
  situation: 'Gặp một đồng nghiệp mới ở văn phòng.',
  opening: 'Hello! What is your name?',
  practice: ['What is your name?', 'What do you do?', 'Tell me about your work.'],
  vocabulary: [{ term: 'designer', meaning: 'nhà thiết kế', example: 'I am a designer.' }],
  reading: { text: 'Linh works as a designer.', question: 'What does Linh do?' },
  listening: { text: 'Hello, I am Linh.', question: 'What is her name?' },
  checks: [
    {
      id: 'q1',
      prompt: 'I ___ Linh.',
      options: ['am', 'is', 'are'],
      skill: 'grammar',
      mode: 'grammar',
      stimulus: null,
    },
  ],
};
const courseCatalog = {
  version: 'toeic-voice-v1',
  stages: [
    {
      id: 'foundation',
      title: 'Nền tảng',
      target: 'Xây nền',
      description: 'Học từng bước',
      level: 'A1',
      modules: [
        { id: 'intro', title: 'Làm quen nơi làm việc', parts: [2, 5], lessons: [courseLesson] },
      ],
    },
    {
      id: 'target650',
      title: 'Hướng tới 650',
      target: 'Mục tiêu 650',
      description: 'Hiểu hội thoại',
      level: 'B1',
      modules: [
        {
          id: 'meetings',
          title: 'Hội thoại công việc',
          parts: [3, 4],
          lessons: [{ ...courseLesson, id: 'target650-01', title: 'Sắp xếp cuộc họp' }],
        },
      ],
    },
  ],
};
let coursePlan: LearningPlan;
let lessonProgress: LessonProgress;
let history: Conversation[];
let messages: Message[];
let calls: { path: string; body: Record<string, unknown> }[];
let intercept:
  ((path: string, options: RequestInit) => Promise<Response> | Response | undefined) | null;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  localStorage.removeItem('engmate-learning:learner');
  window.history.replaceState(null, '', '/');
  saveSession({
    access_token: 'access',
    refresh_token: 'refresh-token-long-enough-for-the-contract',
  });
  recording.active = false;
  recording.recording = false;
  recording.processing = false;
  vi.mocked(docVanBan).mockReset().mockResolvedValue(undefined);
  history = [row(1)];
  messages = [];
  calls = [];
  intercept = null;
  coursePlan = {
    version: 0,
    goal_score: 650,
    start_stage: 'foundation',
    minutes: 15,
    exam_date: null,
  };
  lessonProgress = {
    lesson_id: courseLesson.id,
    conversation_id: 200,
    phase: 0,
    practice_turns: 0,
    completed: false,
    check_correct: 0,
    check_total: 0,
    review_due: null,
  };
  voice.start.mockReset().mockImplementation(async () => voice.callbacks?.state('listening'));
  voice.stop.mockReset().mockImplementation(async () => {
    voice.callbacks?.state('idle');
    voice.callbacks?.sync();
  });
  voice.mute.mockReset();
  voice.gemini.mockReset();
  voice.blaze.mockReset();
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
      if (path === '/api/learning/catalog') return json(courseCatalog);
      if (path === '/api/learning/plan') {
        if (options.method === 'PUT')
          coursePlan = { ...coursePlan, ...body, version: coursePlan.version + 1 };
        return json(coursePlan);
      }
      if (path === '/api/learning/progress')
        return json({ lessons: [], recommended_lesson_id: courseLesson.id, review_lesson_ids: [] });
      if (path.endsWith('/start') && path.startsWith('/api/learning/'))
        return json({
          conversation: { ...row(200), title: courseLesson.title },
          progress: lessonProgress,
        });
      if (path === '/api/capabilities') return json(caps);
      if (path === '/api/voice/voices')
        return json({
          provider: 'gemini',
          default_voice: 'Kore',
          voices: [
            { id: 'Kore', name: 'Kore' },
            { id: 'Puck', name: 'Puck' },
          ],
        });
      if (path === '/api/me') return json({ username: 'learner', email: 'learner@example.test' });
      if (path === '/api/me/profile')
        return json({
          version: '0000000000000001',
          display_name: 'Learner',
          phone_number: null,
          birth_date: null,
          gender: null,
          cefr_level: 'A1',
          learning_goal: 'Giao ti\u1ebfp t\u1ef1 tin',
          daily_goal_minutes: 15,
          time_zone_id: 'Asia/Ho_Chi_Minh',
          has_avatar: false,
          total_study_minutes: 0,
        });
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
        return json(
          path.includes('language=vi')
            ? [{ id: 'vi-voice', name: 'Vietnamese voice', language: 'vi', gender: 'male' }]
            : [{ id: 'en-voice', name: 'English voice', language: 'en', gender: 'female' }],
        );
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

async function open(selectHistory = true) {
  await act(async () => {
    render(<App />);
  });
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await screen.findByRole('textbox', { name: 'Tin nhắn' });
  if (selectHistory && history.length) {
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^Chat ${history[0].conversation_id},`) }),
    );
  }
  await waitFor(() => expect(screen.queryByText('Đang tải tin nhắn…')).not.toBeInTheDocument());
}
async function send(text = 'Hello, Mate') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  await screen.findByText('[Mock/A2] Hello');
}

function openHistory() {
  if (!screen.queryByRole('dialog', { name: 'Lịch sử hội thoại' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
}

function closeHistory() {
  fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử' }));
}

describe('conversation-only application', () => {
  it('preserves an unsent draft across learning tabs and restores a conversation created in this session', async () => {
    await open(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
      target: { value: 'Keep my question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bài học' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cùng Mate' }));
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue('Keep my question');
    await send();
    fireEvent.click(screen.getByRole('button', { name: 'Bài học' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cùng Mate' }));
    await screen.findByText('[Mock/A2] Hello');
    expect(calls.filter((c) => c.path === '/api/conversations')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Chat 200' })).toBeInTheDocument();
  });

  it('keeps keyboard focus inside history and returns to its trigger after closing', async () => {
    await open(false);
    const trigger = screen.getByRole('button', { name: 'Mở lịch sử hội thoại' });
    fireEvent.click(trigger);
    const close = screen.getByRole('button', { name: 'Đóng lịch sử' });
    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /^Chat 1,/ })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('opens profile and settings directly from the sidebar and keeps the chat draft', async () => {
    await open(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
      target: { value: 'Keep my speaking question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hồ sơ học tập' }));
    await screen.findByRole('heading', { name: 'Hồ sơ học tập' });
    expect(await screen.findByLabelText('Họ và tên')).toHaveValue('Learner');
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    expect(screen.getByRole('heading', { name: 'Cài đặt' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cùng Mate' }));
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue(
      'Keep my speaking question',
    );
    expect(calls.some((call) => call.path === '/api/conversations')).toBe(false);
  });
  it('hands mobile menu focus to history and returns to the visible menu trigger', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('767px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await open(false);
    const menu = screen.getByRole('button', { name: 'Mở menu điều hướng' });
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Menu học tập' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
    expect(screen.queryByRole('dialog', { name: 'Menu học tập' })).not.toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Đóng lịch sử' });
    expect(close).toHaveFocus();
    fireEvent.click(close);
    expect(menu).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
  it('opens a server-bound lesson and begins Blaze voice without sending a hidden learner message', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', voice_provider: 'blaze', realtime: true })
        : path === '/api/voice/voices'
          ? json({
              provider: 'blaze',
              default_voice: 'HN-Nam-1-BL',
              voices: [{ id: 'HN-Nam-1-BL', name: 'Mate', language: 'vi' }],
            })
          : undefined;
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'Vào lớp học hôm nay' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Học bằng giọng nói' }));
    await screen.findByText('Đang nghe');
    expect(screen.getAllByRole('heading', { name: courseLesson.title })).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Mate mời bạn bắt đầu bài học' }),
    ).toBeInTheDocument();
    expect(voice.blaze).toHaveBeenCalledWith(200, 'HN-Nam-1-BL');
    expect(voice.gemini).not.toHaveBeenCalled();
    expect(calls.some((c) => c.path.endsWith('/messages') && c.body.message)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeEnabled());
    await send('I am Linh. I work as a designer.');
    expect(calls.find((c) => c.path.endsWith('/messages'))?.body.message).toBe(
      'I am Linh. I work as a designer.',
    );
  });

  it('saves a TOEIC goal and daily plan without inventing an assessment level', async () => {
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'A1 → A2' }));
    await screen.findByRole('heading', { name: 'Lộ trình TOEIC bằng giọng nói' });
    fireEvent.click(screen.getByText('Mục tiêu & thời gian học'));
    fireEvent.change(screen.getByLabelText('Mục tiêu điểm'), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText('Phút học mỗi ngày'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mục tiêu' }));
    await waitFor(() => expect(coursePlan.goal_score).toBe(800));
    expect(coursePlan.minutes).toBe(30);
    expect(calls.some((c) => c.path === '/api/conversations')).toBe(false);
  });

  it('lets learners explore a higher stage and opens its selected lesson', async () => {
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'Lộ trình' }));
    fireEvent.click(await screen.findByRole('button', { name: /Hướng tới 650/ }));
    expect(screen.getAllByText('Sắp xếp cuộc họp').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Học bằng giọng nói' }));
    await screen.findByRole('heading', { name: 'Sắp xếp cuộc họp' });
    expect(calls.some((call) => call.path === '/api/learning/lessons/target650-01/start')).toBe(
      true,
    );
  });

  it('records real self-reported vocabulary and lesson completion instead of demo scores', async () => {
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'Từ vựng' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Đánh dấu đã nhớ' })[0]);
    expect(screen.getByRole('button', { name: 'Đã nhớ' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành buổi học' }));
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByText('1 cụm từ')).toBeInTheDocument();
    expect(screen.queryByText('86 / 100')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem tiến độ học tập' }));
    await screen.findByRole('heading', { name: 'Tiến độ học TOEIC' });
    expect(
      await screen.findByText(
        'Bạn chưa bắt đầu bài TOEIC nào. Chọn bài bên dưới để học cùng Mate.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Từ vựng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đã nhớ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiến độ' }));
    await screen.findByText('Bạn chưa bắt đầu bài TOEIC nào. Chọn bài bên dưới để học cùng Mate.');
    expect(screen.queryByText('86 / 100')).not.toBeInTheDocument();
  });

  it('persists only the learner account progress and does not count a lesson twice', async () => {
    await open(false);
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Từ vựng' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành buổi học' }));
    }
    const stored = JSON.parse(localStorage.getItem('engmate-learning:learner')!);
    expect(stored.completed).toEqual(['cafe']);
    expect(stored.days).toHaveLength(1);
    expect(localStorage.getItem('engmate-learning:other')).toBeNull();
  });

  it('plays a pronunciation sample and shows a transcript without fabricating accuracy', async () => {
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'Phát âm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe phát âm mẫu' }));
    await waitFor(() =>
      expect(docVanBan).toHaveBeenCalledWith(
        'I’d like a latte, please.',
        1,
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đọc lại câu này' }));
    expect(screen.getByText('Hello from my microphone')).toBeInTheDocument();
    expect(screen.getByText('Bản chép lời chưa phải điểm đánh giá phát âm.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục · Ôn từ vựng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thực hành với Mate' }));
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveProperty(
      'value',
      expect.stringContaining('Take away'),
    );
  });

  it('surfaces pronunciation playback errors and recovers navigation', async () => {
    await open(false);
    vi.mocked(docVanBan).mockRejectedValueOnce(new Error('Sample unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Phát âm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe phát âm mẫu' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Sample unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Bài học' }));
    expect(screen.queryByText('Sample unavailable')).not.toBeInTheDocument();
  });

  it('cancels a sample on navigation and ignores its late failure during new playback', async () => {
    let rejectOld!: (reason: Error) => void;
    let finishNew!: () => void;
    vi.mocked(docVanBan).mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'Phát âm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe phát âm mẫu' }));
    const firstSignal = vi.mocked(docVanBan).mock.calls[0][2];
    fireEvent.click(screen.getByRole('button', { name: 'Bài học' }));
    expect(firstSignal?.aborted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Phát âm' }));
    vi.mocked(docVanBan).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishNew = resolve;
        }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nghe phát âm mẫu' }));
    await act(async () => rejectOld(new Error('Old sample failed')));
    expect(screen.queryByText('Old sample failed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dừng nghe mẫu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dừng nghe mẫu' }));
    expect(vi.mocked(docVanBan).mock.calls[1][2]?.aborted).toBe(true);
    await act(async () => finishNew());
    expect(screen.getByRole('button', { name: 'Nghe phát âm mẫu' })).toBeInTheDocument();
  });

  it('keeps the URL aligned with the session without losing the current draft', async () => {
    window.history.replaceState({ source: 'test' }, '', '/?source=login#dang-nhap');
    const entries = window.history.length;
    await open(false);
    expect(window.location.hash).toBe('#hoi-thoai');
    expect(window.location.search).toBe('?source=login');
    expect(window.history.state).toEqual({ source: 'test' });
    expect(window.history.length).toBe(entries);
    const input = screen.getByRole('textbox', { name: 'Tin nhắn' });
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    act(() => {
      window.history.replaceState(null, '', '#dang-nhap');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(window.location.hash).toBe('#hoi-thoai');
    expect(input).toHaveValue('Keep this draft');
    act(() => {
      window.history.replaceState(null, '', '#old-page');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(window.location.hash).toBe('#hoi-thoai');
    expect(input).toHaveValue('Keep this draft');
    act(() => saveSession(null));
    await screen.findByRole('heading', { name: 'Đăng nhập' });
    expect(window.location.hash).toBe('#dang-nhap');
    act(() => {
      window.history.replaceState(null, '', '#hoi-thoai');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(window.location.hash).toBe('#dang-nhap');
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });
  it('opens a fresh welcome without fetching old messages or creating empty history', async () => {
    messages = [{ ...reply, content: 'Previous private conversation' }];
    await open(false);
    expect(screen.getByRole('heading', { name: 'Nói cùng Mate' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeEnabled();
    expect(screen.queryByText('Previous private conversation')).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.includes('/messages'))).toBe(false);
    expect(calls.some((c) => c.path === '/api/conversations')).toBe(false);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /^Chat 1,/ }));
    await screen.findByText('Previous private conversation');
    fireEvent.click(screen.getByRole('button', { name: 'Hội thoại mới' }));
    expect(screen.getByRole('heading', { name: 'Nói cùng Mate' })).toBeInTheDocument();
    expect(screen.queryByText('Previous private conversation')).not.toBeInTheDocument();
    expect(calls.some((c) => c.path === '/api/conversations')).toBe(false);
  });

  it('creates once on the first message, keeps the draft and sends to that conversation', async () => {
    await open(false);
    await send('A fresh conversation');
    expect(calls.filter((c) => c.path === '/api/conversations')).toHaveLength(1);
    expect(calls.find((c) => c.path.endsWith('/messages'))).toMatchObject({
      path: '/api/conversations/200/messages',
      body: { message: 'A fresh conversation' },
    });
    openHistory();
    expect(screen.getByRole('button', { name: /^Chat 200,/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    closeHistory();
    await send('A second message');
    expect(calls.filter((c) => c.path === '/api/conversations')).toHaveLength(1);
  });

  it('ignores a late conversation creation after leaving the draft', async () => {
    let resolve!: (response: Response) => void;
    intercept = (path) =>
      path === '/api/conversations'
        ? new Promise<Response>((done) => {
            resolve = done;
          })
        : undefined;
    await open(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
      target: { value: 'Abandoned draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await waitFor(() => expect(resolve).toBeDefined());
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /^Chat 1,/ }));
    await act(async () => {
      resolve(json(row(200)));
    });
    expect(screen.queryByRole('button', { name: /^Chat 200,/ })).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/messages'))).toBe(false);
  });

  it('reloads and closes a conversation created from the welcome screen', async () => {
    await open(false);
    await send();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại tin nhắn' }));
    await waitFor(() => expect(screen.queryByText('Đang tải tin nhắn…')).not.toBeInTheDocument());
    expect(screen.getByText('[Mock/A2] Hello')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc hội thoại' }));
    await screen.findByText('Hội thoại đã kết thúc. Bạn vẫn có thể đọc lại lịch sử.');
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeDisabled();
    openHistory();
    expect(screen.getByRole('button', { name: /^Chat 200,/ })).toHaveAccessibleName(/Đã kết thúc/);
  });

  it('keeps the welcome draft usable after voice conversation creation fails', async () => {
    let fail = true;
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', realtime: true })
        : path === '/api/conversations' && fail
          ? json({}, 503)
          : undefined;
    await open(false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Nói cùng Mate' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nói cùng Mate' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeEnabled();
    expect(voice.start).not.toHaveBeenCalled();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(voice.start).toHaveBeenCalledTimes(1);
  });

  it('keeps icon controls inside the composer and dismisses settings with Escape or outside click', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', realtime: true })
        : undefined;
    await open(false);
    for (const name of ['Tùy chọn âm thanh', 'Ghi âm', 'Bắt đầu thoại trực tiếp', 'Gửi tin nhắn']) {
      const button = screen.getByRole('button', { name });
      expect(button.closest('form')).toHaveClass('conversation-composer');
      expect(button.textContent).toBe('');
      expect(button).toHaveAttribute('title', name);
    }
    expect(screen.queryByRole('combobox', { name: 'Giọng đối thoại' })).not.toBeInTheDocument();
    const settings = screen.getByRole('button', { name: 'Tùy chọn âm thanh' });
    fireEvent.click(settings);
    await screen.findByRole('option', { name: 'Kore' });
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giọng đọc' }));
    await screen.findByRole('option', { name: 'English voice' });
    expect(calls.some((c) => c.path === '/api/conversations')).toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(settings).toHaveAttribute('aria-expanded', 'false');
    expect(settings).toHaveFocus();
    fireEvent.click(settings);
    fireEvent.pointerDown(document.body);
    expect(settings).toHaveAttribute('aria-expanded', 'false');
  });

  it('creates a fresh conversation before starting voice and clears stale captions after stopping', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', realtime: true })
        : undefined;
    await open(false);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeEnabled(),
    );
    expect(voice.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(voice.gemini).toHaveBeenLastCalledWith(200, 'Kore');
    expect(await screen.findByText('Mình đang nghe')).toBeInTheDocument();
    act(() => voice.callbacks?.state('processing'));
    expect(screen.getByRole('heading', { name: 'Để mình nghĩ chút' })).toBeInTheDocument();
    act(() => voice.callbacks?.state('assistant_speaking'));
    expect(screen.getByRole('heading', { name: 'Mate đang nói' })).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/api/conversations')).toHaveLength(1);
    act(() => voice.callbacks?.transcript('assistant', 'A temporary live caption'));
    expect(screen.getByText('Mate: A temporary live caption')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await waitFor(() =>
      expect(screen.queryByText('Mate: A temporary live caption')).not.toBeInTheDocument(),
    );
  });

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
      // Selecting history replaces the welcome pane; measure subsequent reply scrolling.
      targets.length = 0;
      scrollTo.mockClear();
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
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
    expect(screen.getAllByText('Mate', { selector: '.message-author' })).toHaveLength(1);
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
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue(''));
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
      target: { value: 'Keep my draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dừng phản hồi' }));
    await screen.findByRole('button', { name: 'Gửi thành lượt mới' });
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue('Keep my draft');
  });

  it('uses the existing chat layout for realtime controls and synchronizes durable voice history', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'openai', is_mock: false, realtime: true, streaming: true })
        : undefined;
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeDisabled();
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
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
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
    openHistory();
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
    const input = screen.getByRole('textbox', { name: 'Tin nhắn' });
    fireEvent.change(input, { target: { value: 'Keyboard message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(calls.filter((c) => c.path.endsWith('/messages'))).toHaveLength(0);
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('[Mock/A2] Hello');
  });

  it('shows tutor navigation and retains the authenticated conversation workspace', async () => {
    await open();
    expect(screen.getByRole('region', { name: 'Hội thoại' })).toHaveClass('panel', 'chat-panel');
    expect(screen.getByRole('heading', { name: 'Chat 1' })).toBeInTheDocument();
    expect(document.querySelector('.workspace-shell')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'EngMate AI · Trang giới thiệu' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng học tập' })).toBeInTheDocument();
    for (const name of ['Cùng Mate', 'Lộ trình', 'Bài học', 'Phát âm', 'Từ vựng', 'Tiến độ'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    for (const name of ['Flashcard', 'Sổ từ vựng', 'Speaking', 'Reading', 'Tổng quan'])
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Bắt đầu thoại trực tiếp' }),
    ).not.toBeInTheDocument();
    await send();
    expect(screen.getByText('Hello, Mate')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue('');
  });

  it('loads conversation history beyond the first page', async () => {
    history = Array.from({ length: 55 }, (_, index) => row(100 - index));
    await open();
    openHistory();
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
    expect(screen.getByRole('heading', { name: 'Nói cùng Mate' })).toBeInTheDocument();
    await send();
    await screen.findByRole('heading', { name: 'Chat 200' });
    openHistory();
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
    expect(screen.getByText('Nói cùng Mate')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
      target: { value: 'First message' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue('First message');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
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
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeDisabled();
  });

  it('offers microphone draft, voice choice, playback and stopping without automatic paid calls', async () => {
    messages = [reply];
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi âm' }));
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue(
      'Hello from my microphone',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giọng đọc' }));
    await screen.findByRole('option', { name: 'English voice' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Giọng đọc tiếng Anh' }), {
      target: { value: 'en-voice' },
    });
    expect(document.documentElement.dataset.speechVoice).toBe('en-voice');
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu trả lời' }));
    await waitFor(() =>
      expect(docVanBan).toHaveBeenCalledWith(reply.content, 1, expect.any(AbortSignal)),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dừng giọng đọc' }));
    expect(dungDoc).toHaveBeenCalled();
    vi.mocked(docVanBan).mockRejectedValueOnce(new Error('Audio unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu trả lời' }));
    await screen.findByText('Audio unavailable');
  });

  it('shares saved Settings voices and speed with chat and restores them after signing in again', async () => {
    messages = [reply];
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    const english = await screen.findByRole('combobox', { name: 'Giọng tiếng Anh' });
    const vietnamese = screen.getByRole('combobox', { name: 'Giọng tiếng Việt' });
    await waitFor(() => expect(english).toBeEnabled());
    await waitFor(() => expect(vietnamese).toBeEnabled());
    fireEvent.change(english, { target: { value: 'en-voice' } });
    fireEvent.change(vietnamese, { target: { value: 'vi-voice' } });
    fireEvent.click(screen.getByRole('button', { name: '0.75× Chậm' }));
    expect(docVanBan).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('engmate-speech:learner')!)).toMatchObject({
      voiceEn: 'en-voice',
      voiceVi: 'vi-voice',
      dialogueVoice: 'vi-voice',
      rate: 0.75,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cùng Mate' }));
    await screen.findByRole('button', { name: 'Nghe câu trả lời' });
    expect(document.documentElement.dataset).toMatchObject({
      speechVoice: 'en-voice',
      speechVoiceVi: 'vi-voice',
      speechRate: '0.75',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu trả lời' }));
    await waitFor(() =>
      expect(docVanBan).toHaveBeenCalledWith(reply.content, 1, expect.any(AbortSignal)),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await screen.findByRole('heading', { name: 'Đăng nhập' });
    expect(document.documentElement.dataset.speechVoice).toBe('UK-Nu-1-TM');
    fireEvent.change(screen.getByLabelText('Tài khoản hoặc email'), {
      target: { value: 'learner' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu', { exact: true }), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByRole('textbox', { name: 'Tin nhắn' });
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    expect(await screen.findByRole('combobox', { name: 'Giọng tiếng Anh' })).toHaveValue(
      'en-voice',
    );
    expect(screen.getByRole('combobox', { name: 'Giọng tiếng Việt' })).toHaveValue('vi-voice');
    expect(screen.getByRole('button', { name: '0.75× Chậm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('reports voice and history failures and recovers account loading', async () => {
    let fail = true;
    intercept = (path) => (path === '/api/me' && fail ? json({}, 500) : undefined);
    render(<App />);
    await screen.findByRole('button', { name: 'Thử tải lại' });
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }));
    await screen.findByRole('textbox', { name: 'Tin nhắn' });
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /^Chat 1,/ }));
    await waitFor(() => expect(screen.queryByText('Đang tải tin nhắn…')).not.toBeInTheDocument());
    intercept = (path) =>
      path.startsWith('/api/speech/voices')
        ? json({}, 502)
        : path.includes('/messages?')
          ? json({}, 503)
          : undefined;
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giọng đọc' }));
    await screen.findByText('Chưa tải được danh sách giọng nói. Vui lòng thử lại.');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại tin nhắn' }));
    await screen.findByText(/Dịch vụ chưa sẵn sàng/);
  });

  it('keeps the session if server logout fails and clears it after revocation', async () => {
    await open();
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
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeDisabled();
  });

  it('uses only Blaze voice with Gemini reasoning and prevents overlapping manual playback', async () => {
    messages = [reply];
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', voice_provider: 'blaze', realtime: true })
        : path === '/api/voice/voices'
          ? json({
              provider: 'blaze',
              default_voice: 'HN-Nam-1-BL',
              voices: [{ id: 'HN-Nam-1-BL', name: 'Mate Vietnamese', language: 'vi' }],
            })
          : undefined;
    await open();
    const read = await screen.findByRole('button', { name: 'Nghe câu trả lời' });
    expect(read).toBeEnabled();
    const start = screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    await screen.findByText('Đang nghe');
    expect(voice.blaze).toHaveBeenCalledWith(1, 'HN-Nam-1-BL');
    expect(voice.gemini).not.toHaveBeenCalled();
    expect(read).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await waitFor(() => expect(read).toBeEnabled());
  });

  it('shows Gemini and selects its voice transport in the existing conversation layout', async () => {
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', is_mock: false, realtime: true, streaming: true })
        : undefined;
    await open();
    expect(screen.getByRole('navigation', { name: 'Điều hướng học tập' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
    await screen.findByRole('option', { name: 'Kore' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Giọng đối thoại' }), {
      target: { value: 'Puck' },
    });
    expect(voice.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(voice.gemini).toHaveBeenLastCalledWith(1, 'Puck');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Giọng đối thoại' })).toBeEnabled(),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Giọng đối thoại' }), {
      target: { value: 'Kore' },
    });
    await waitFor(() => expect(voice.gemini).toHaveBeenLastCalledWith(1, 'Kore'));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Giọng đối thoại' })).toBeEnabled(),
    );
    expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeEnabled(),
    );
    expect(voice.stop).toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Giọng đối thoại' })).toHaveValue('Kore');
    expect(screen.getByRole('combobox', { name: 'Giọng đối thoại' })).toBeEnabled();
  });

  it('recovers a failed live voice catalog before allowing a call', async () => {
    let fail = true;
    intercept = (path) =>
      path === '/api/capabilities'
        ? json({ ...caps, provider: 'gemini', realtime: true })
        : path === '/api/voice/voices' && fail
          ? json({}, 503)
          : undefined;
    await open();
    await screen.findByRole('button', { name: 'Tải lại giọng đối thoại' });
    expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeDisabled();
    expect(voice.start).not.toHaveBeenCalled();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại giọng đối thoại' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
    expect(screen.getByRole('combobox', { name: 'Giọng đối thoại' })).toHaveValue('Kore');
  });

  it('sends Vietnamese without changing the user message and reads the returned content', async () => {
    intercept = (path, options) => {
      if (path.endsWith('/messages') && options.method === 'POST') {
        expect(JSON.parse(String(options.body)).message).toBe('Hôm nay tôi hơi mệt.');
        const message = {
          message_id: 1,
          role: 'user',
          content: 'Hôm nay tôi hơi mệt.',
          status: 'completed',
        } as Message;
        const answer = { ...reply, content: 'Bạn có muốn nghỉ ngơi một chút không?' };
        messages = [message, answer];
        return json({ message, reply: answer });
      }
    };
    await open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
      target: { value: 'Hôm nay tôi hơi mệt.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await screen.findByText('Bạn có muốn nghỉ ngơi một chút không?');
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu trả lời' }));
    expect(docVanBan).toHaveBeenCalledWith(
      'Bạn có muốn nghỉ ngơi một chút không?',
      1,
      expect.any(AbortSignal),
    );
  });

  it('logs in without reload and registers with the real API field names', async () => {
    saveSession(null);
    window.history.replaceState(null, '', '/?from=auth#dang-nhap');
    const entries = window.history.length;
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tài khoản hoặc email'), {
      target: { value: 'learner' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password-for-test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByRole('textbox', { name: 'Tin nhắn' });
    expect(window.location.hash).toBe('#hoi-thoai');
    expect(window.location.search).toBe('?from=auth');
    expect(window.history.length).toBe(entries);
    await act(async () => {
      saveSession(null);
    });
    expect(window.location.hash).toBe('#dang-nhap');
    fireEvent.click(screen.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }));
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Người học' } });
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'newlearner' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.test' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password-for-test' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'password-for-test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await screen.findByRole('textbox', { name: 'Tin nhắn' });
    expect(window.location.hash).toBe('#hoi-thoai');
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
    expect(window.location.hash).toBe('#dang-nhap');
    fireEvent.click(screen.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }));
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Đã có tài khoản? Đăng nhập' }));
    expect(screen.getByLabelText('Tài khoản hoặc email')).toBeInTheDocument();
  });
});
