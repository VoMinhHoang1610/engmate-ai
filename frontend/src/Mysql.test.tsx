import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MysqlLuuTru } from './demo/MysqlLuuTru';
import { useDuLieu } from './demo/LuuTru';
import { saveSession } from './api/database';
import { ThucHanhMySQL } from './pages/ThucHanhMySQL';
import { HoiThoaiMySQL } from './pages/HoiThoaiMySQL';
import { FlashcardMySQL } from './pages/FlashcardMySQL';
import { TaiKhoan } from './pages/TaiKhoan';
import { ChuDeNhapVai } from './pages/ChuDeNhapVai';
import { StrictMode } from 'react';
import App from './App';

vi.mock('./api/database', async (original) => ({
  ...(await original<typeof import('./api/database')>()),
  mysqlEnabled: true,
}));
vi.mock('./components/NutDoc', () => ({
  NutDoc: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
const baseProfile = {
  version: '0000000000000001',
  display_name: 'Mai',
  cefr_level: 'A1',
  phone_number: null,
  birth_date: null,
  gender: null,
  learning_goal: 'Giao tiếp',
  daily_goal_minutes: 20,
  time_zone_id: 'Asia/Ho_Chi_Minh',
  onboarding_completed_at: null as string | null,
  avatar_asset_id: null,
};
const basePreferences = {
  version: '0000000000000001',
  theme: 'light',
  reduced_motion: false,
  speech_rate: 1,
  speech_voice_id: 'UK-Nu-1-TM',
};
const sampleWord = {
  user_vocabulary_id: 11,
  version: '0000000000000001',
  word: 'hello',
  meaning: 'xin chào',
  phonetic: '/hello/',
  part_of_speech: 'Danh từ',
  example_sentence: 'Hello, Mai.',
  is_mastered: false,
  next_review_at: null,
};
const lesson = {
  lesson_id: 21,
  code: 'test',
  skill: 'reading',
  format: 'multiple_choice',
  title: 'Bài trong MySQL',
  instruction: 'Chọn đáp án',
  content: 'Hello Mai.',
  min_level: 'A1',
  max_level: 'A1',
  questions: [
    {
      question_id: 51,
      prompt: 'Tên bạn là gì?',
      question_type: 'multiple_choice',
      options: [
        { option_id: 61, text: 'Mai' },
        { option_id: 62, text: 'Lan' },
      ],
    },
    { question_id: 52, prompt: 'Chép lại câu', question_type: 'dictation', options: [] },
  ],
  vocabulary: [
    {
      word: 'hello',
      meaning: 'xin chào',
      phonetic: null,
      part_of_speech: null,
      example_sentence: null,
    },
  ],
};
const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
let fail: string;
let words: (typeof sampleWord)[];
let profile: typeof baseProfile;
let preferences: typeof basePreferences;
let message = '';
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  window.location.hash = '';
  calls.length = 0;
  fail = '';
  words = [{ ...sampleWord }];
  profile = { ...baseProfile };
  preferences = { ...basePreferences };
  message = '';
  saveSession({ access_token: 'access', refresh_token: 'refresh' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (path: string, options: RequestInit = {}) => {
      const method = options.method ?? 'GET';
      const body =
        options.body && typeof options.body === 'string'
          ? (JSON.parse(options.body) as Record<string, unknown>)
          : {};
      calls.push({ path, method, body });
      if (path === fail) return new Response('{}', { status: 503 });
      let data: unknown = {};
      if (path === '/api/me') data = { username: 'mai', email: 'mai@example.test' };
      else if (path === '/api/me/profile') {
        if (method === 'PUT')
          profile = {
            ...profile,
            ...body,
            onboarding_completed_at: body.onboarding_completed
              ? '2026-10-09T00:00:00+00:00'
              : profile.onboarding_completed_at,
          };
        data = profile;
      } else if (path === '/api/me/settings') {
        if (method === 'PUT') preferences = { ...preferences, ...body };
        data = preferences;
      } else if (path === '/api/dashboard')
        data = {
          total_study_minutes: 12,
          review_count: 3,
          today: '2026-10-09',
          daily: [{ local_study_date: '2026-10-09', study_minutes: 4, review_count: 2 }],
        };
      else if (path.startsWith('/api/vocabulary') && method === 'GET') data = words;
      else if (path === '/api/vocabulary' && method === 'POST') {
        words = [{ ...sampleWord, ...body, user_vocabulary_id: 12 } as typeof sampleWord, ...words];
        data = words[0];
      } else if (path.startsWith('/api/vocabulary/11/mastery')) {
        words[0].is_mastered = true;
        data = words[0];
      } else if (path === '/api/vocabulary/11' && method === 'DELETE') words = [];
      else if (path.startsWith('/api/lessons?'))
        data = [lesson, { ...lesson, lesson_id: 22, min_level: 'B1', title: 'Bài B1 trong MySQL' }];
      else if (path === '/api/lessons/21') data = lesson;
      else if (path === '/api/lessons/22')
        data = { ...lesson, lesson_id: 22, min_level: 'B1', title: 'Bài B1 trong MySQL' };
      else if (path === '/api/practice/attempts' && method === 'POST')
        data = { attempt_id: 31, version: '0000000000000001' };
      else if (path === '/api/practice/attempts/31/submit')
        data = {
          attempt_id: 31,
          score_percent: 100,
          answer_key: [{ question_id: 51, correct_option_id: 61, explanation: 'Đúng' }],
          evaluations: [{ feedback: 'Phản hồi mẫu' }],
        };
      else if (path.startsWith('/api/practice/attempts?'))
        data = [{ attempt_id: 31, score_percent: 100 }];
      else if (path === '/api/topics')
        data = [
          {
            topic_id: 1,
            code: 'coffee',
            name: 'Cà phê',
            description: 'Gọi món',
            ai_role: 'Barista',
            opening_message: 'Hello',
            min_level: 'A1',
            max_level: 'A2',
            color_key: 'peach',
            icon_key: 'coffee',
          },
        ];
      else if (path.startsWith('/api/conversations?'))
        data = [{ conversation_id: 41, title: 'Hội thoại đã lưu' }];
      else if (path === '/api/conversations' && method === 'POST')
        data = { conversation_id: 41, title: 'Cà phê' };
      else if (path.includes('/conversations/41/messages')) {
        if (method === 'POST') message = body.message as string;
        data = [
          {
            message_id: 1,
            role: 'assistant',
            content: message ? 'Saved reply' : 'Hello from database',
            status: 'completed',
          },
        ];
      } else if (path === '/api/flashcards/sessions') data = { flashcard_session_id: 71 };
      else if (path.startsWith('/api/auth/'))
        data = { access_token: 'access', refresh_token: 'refresh' };
      return new Response(method === 'DELETE' ? null : JSON.stringify(data), {
        status: method === 'DELETE' ? 204 : 200,
      });
    }),
  );
});
function Probe() {
  const d = useDuLieu();
  return (
    <>
      <p>{d.daDangNhap ? d.hoSo.ten : 'signed out'}</p>
      <p>
        {d.phutHoc}/{d.phutHomNay}/{d.luotOnHomNay}
      </p>
      <p>{d.caiDat.giongDoc}</p>
      <p>{d.daLamQuen ? 'onboarded' : 'new learner'}</p>
      {d.tuVung.map((w) => (
        <p key={w.id}>
          {w.tu}:{String(w.daThuoc)}
        </p>
      ))}
      <p role="alert">{d.loiLuu}</p>
      <button onClick={() => d.capNhat({ hoSo: { ...d.hoSo, ten: 'Lan' }, daLamQuen: true })}>
        profile
      </button>
      <button
        onClick={() =>
          d.capNhat({
            caiDat: {
              ...d.caiDat,
              giongDoc: 'US-Nam-1-TM',
              giaoDien: 'toi',
              giamChuyenDong: true,
              tocDoDoc: 1.25,
            },
          })
        }
      >
        preferences
      </button>
      <button
        onClick={() =>
          d.luuTu({
            id: 'new',
            tu: 'book',
            nghia: 'sách',
            phienAm: '',
            loai: '',
            viDu: '',
            daThuoc: false,
            henOn: '',
          })
        }
      >
        add
      </button>
      <button onClick={() => d.capNhat({ tuVung: d.tuVung.map((w) => ({ ...w, daThuoc: true })) })}>
        mastery
      </button>
      <button onClick={() => d.capNhat({ tuVung: [] })}>archive</button>
      <button onClick={() => d.capNhat({ daDangNhap: false })}>logout</button>
    </>
  );
}
async function loaded() {
  await screen.findByText('Mai');
}
describe('server learning storage', () => {
  it('loads private data and daily totals without importing demo browser data', async () => {
    localStorage.setItem('engmate-demo-v1', JSON.stringify({ hoSo: { ten: 'Different user' } }));
    render(
      <MysqlLuuTru>
        <Probe />
      </MysqlLuuTru>,
    );
    await loaded();
    expect(screen.getByText('12/4/2')).toBeInTheDocument();
    expect(screen.getByText('hello:false')).toBeInTheDocument();
    expect(screen.queryByText('Different user')).not.toBeInTheDocument();
  });
  it('persists onboarding/profile and playback preferences with server versions', async () => {
    render(
      <MysqlLuuTru>
        <Probe />
      </MysqlLuuTru>,
    );
    await loaded();
    fireEvent.click(screen.getByText('profile'));
    await screen.findByText('Lan');
    expect(screen.getByText('onboarded')).toBeInTheDocument();
    fireEvent.click(screen.getByText('preferences'));
    await waitFor(() => expect(preferences.speech_voice_id).toBe('US-Nam-1-TM'));
    expect(
      calls.find((c) => c.path === '/api/me/profile' && c.method === 'PUT')?.body,
    ).toMatchObject({
      version: '0000000000000001',
      display_name: 'Lan',
      onboarding_completed: true,
      gender: null,
    });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });
  it('writes vocabulary changes and never sends a client owner or score', async () => {
    render(
      <MysqlLuuTru>
        <Probe />
      </MysqlLuuTru>,
    );
    await loaded();
    fireEvent.click(screen.getByText('mastery'));
    await screen.findByText('hello:true');
    fireEvent.click(screen.getByText('archive'));
    await waitFor(() => expect(screen.queryByText('hello:true')).not.toBeInTheDocument());
    fireEvent.click(screen.getByText('add'));
    await screen.findByText('book:false');
    expect(calls.find((c) => c.path === '/api/vocabulary' && c.method === 'POST')?.body).toEqual({
      word: 'book',
      meaning: 'sách',
      phonetic: null,
      part_of_speech: null,
      example_sentence: null,
    });
  });
  it('reports failed saves and allows the next operation to succeed', async () => {
    render(
      <MysqlLuuTru>
        <Probe />
      </MysqlLuuTru>,
    );
    await loaded();
    fail = '/api/me/profile';
    fireEvent.click(screen.getByText('profile'));
    await screen.findByText(/Chưa kết nối/);
    expect(screen.queryByText('Lan')).not.toBeInTheDocument();
    fail = '';
    fireEvent.click(screen.getByText('profile'));
    await screen.findByText('Lan');
    fireEvent.click(screen.getByText('logout'));
    await screen.findByText('signed out');
    expect(sessionStorage.getItem('engmate-session')).toBeNull();
  });
  it('does not fetch private data before login and reloads after authentication', async () => {
    saveSession(null);
    render(
      <MysqlLuuTru>
        <Probe />
      </MysqlLuuTru>,
    );
    await act(async () => {});
    expect(calls).toHaveLength(0);
    saveSession({ access_token: 'new', refresh_token: 'new' });
    act(() => window.dispatchEvent(new Event('engmate-login')));
    await loaded();
  });
});
describe('login to the MySQL application', () => {
  function login() {
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'mai' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'account-password' } });
    fireEvent.submit(screen.getByLabelText('Mật khẩu').closest('form')!);
  }
  it('starts at login and opens home immediately after loading account data', async () => {
    saveSession(null);
    profile.onboarding_completed_at = '2026-10-09T00:00:00Z';
    window.history.replaceState(null, '', '#cai-dat');
    const fetch = globalThis.fetch;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, options?: RequestInit) => {
        if (path === '/api/me/profile') await ready;
        return fetch(path, options);
      }),
    );
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await act(async () => {});
    expect(calls).toHaveLength(0);
    login();
    await screen.findByRole('button', { name: 'Đang xử lý…' });
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#cai-dat');
    login();
    expect(calls.filter((c) => c.path === '/api/auth/login')).toHaveLength(1);
    await act(async () => release());
    expect(await screen.findByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    await waitFor(() => expect(document.querySelector('[data-page="tong-quan"]')).not.toBeNull());
    expect(window.location.hash).toBe('#tong-quan');
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Mai/ })).toBeVisible();
  });
  it('keeps login visible on load failure and enters home after retry', async () => {
    saveSession(null);
    profile.onboarding_completed_at = '2026-10-09T00:00:00Z';
    fail = '/api/dashboard';
    render(<App />);
    login();
    await screen.findByRole('alert');
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Mật khẩu').closest('form')!).getByRole('button', {
        name: 'Đăng nhập',
      }),
    ).toBeEnabled();
    fail = '';
    login();
    expect(await screen.findByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    await waitFor(() => expect(window.location.hash).toBe('#tong-quan'));
  });
  it('opens onboarding after registering a new account', async () => {
    saveSession(null);
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Chọn đăng nhập hoặc đăng ký' })).getByRole(
        'button',
        { name: 'Đăng ký' },
      ),
    );
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'mai' } });
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Mai' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mai@example.test' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'account-password' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'account-password' },
    });
    fireEvent.submit(screen.getByLabelText('Mật khẩu').closest('form')!);
    expect(
      await screen.findByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' }),
    ).toBeVisible();
    expect(calls.find((c) => c.path === '/api/auth/register')?.body.username).toBe('mai');
  });
});

describe('database exercise screens', () => {
  it('submits selected reading option IDs and displays the server score', async () => {
    render(
      <MysqlLuuTru>
        <ThucHanhMySQL skill="reading" />
      </MysqlLuuTru>,
    );
    await screen.findByText('Hello Mai.');
    fireEvent.click(screen.getByLabelText('Mai'));
    await waitFor(() => expect(screen.getByText('Nộp bài')).toBeEnabled());
    fireEvent.click(screen.getByText('Nộp bài'));
    await screen.findByText('Kết quả: 100%');
    expect(calls.find((c) => c.path.endsWith('/31/submit'))?.body).toEqual({
      version: '0000000000000001',
      answers: [{ question_id: 51, selected_option_id: 61 }],
    });
    fireEvent.click(screen.getByText('Luyện lại'));
    await waitFor(() =>
      expect(
        calls.filter((c) => c.path === '/api/practice/attempts' && c.method === 'POST').length,
      ).toBeGreaterThan(1),
    );
  });
  it.each(['speaking', 'writing'] as const)('saves %s text and server feedback', async (skill) => {
    render(
      <MysqlLuuTru>
        <ThucHanhMySQL skill={skill} />
      </MysqlLuuTru>,
    );
    const editor = await screen.findByLabelText(
      skill === 'writing' ? 'Bài viết tiếng Anh' : 'Câu trả lời tiếng Anh',
    );
    fireEvent.change(editor, { target: { value: 'I like English.' } });
    await waitFor(() => expect(screen.getByText('Nộp bài')).toBeEnabled());
    fireEvent.click(screen.getByText('Nộp bài'));
    await screen.findByText('Phản hồi mẫu');
    expect(calls.find((c) => c.path.endsWith('/31/submit'))?.body.submitted_text).toBe(
      'I like English.',
    );
  });
  it('starts dictation as a separate attempt and submits typed answers', async () => {
    render(
      <MysqlLuuTru>
        <ThucHanhMySQL skill="listening" />
      </MysqlLuuTru>,
    );
    await screen.findByText('Hello Mai.');
    fireEvent.click(screen.getByText('Chép chính tả'));
    const input = await screen.findByLabelText('Câu đã nghe');
    fireEvent.change(input, { target: { value: 'Hello.' } });
    await waitFor(() => expect(screen.getByText('Nộp bài')).toBeEnabled());
    fireEvent.click(screen.getByText('Nộp bài'));
    await screen.findByText('Kết quả: 100%');
    expect(calls.find((c) => c.path.endsWith('/31/submit'))?.body.answers).toEqual([
      { question_id: 52, answer_text: 'Hello.' },
    ]);
  });
  it('allows retry after an unavailable exercise catalog', async () => {
    fail = '/api/lessons?skill=reading&limit=100';
    render(
      <MysqlLuuTru>
        <ThucHanhMySQL skill="reading" />
      </MysqlLuuTru>,
    );
    await screen.findByText(/Chưa kết nối/);
    expect(screen.queryByText('Hello Mai.')).not.toBeInTheDocument();
    fail = '';
    fireEvent.click(screen.getByText('Thử lại'));
    await screen.findByText('Hello Mai.');
  });
});
describe('persisted conversations and reviews', () => {
  it('opens the lesson level selected by the roadmap route', async () => {
    window.location.hash = '#luyen-doc?trinh-do=B1';
    render(
      <MysqlLuuTru>
        <ThucHanhMySQL skill="reading" />
      </MysqlLuuTru>,
    );
    await screen.findByRole('heading', { name: 'Bài B1 trong MySQL' });
    await waitFor(() =>
      expect(
        calls.find((c) => c.path === '/api/practice/attempts' && c.method === 'POST')?.body
          .lesson_id,
      ).toBe(22),
    );
  });
  it('opens a conversation, sends durable turns, then reads history without enabling sends', async () => {
    render(
      <MysqlLuuTru>
        <HoiThoaiMySQL />
      </MysqlLuuTru>,
    );
    await screen.findByText('Hội thoại đã lưu');
    fireEvent.click(screen.getByText('Hội thoại mới'));
    await screen.findByText('Hello from database');
    fireEvent.change(screen.getByLabelText('Tin nhắn tiếng Anh'), {
      target: { value: 'Hi there' },
    });
    fireEvent.click(screen.getByText('Gửi tin nhắn'));
    await screen.findByText('Saved reply');
    expect(
      calls.find((c) => c.path === '/api/conversations/41/messages' && c.method === 'POST')?.body
        .message,
    ).toBe('Hi there');
    fireEvent.click(screen.getByText('Kết thúc hội thoại'));
    await waitFor(() => expect(screen.getByText('Gửi tin nhắn')).toBeDisabled());
    fireEvent.click(screen.getByText('Hội thoại đã lưu'));
    await waitFor(() => expect(screen.getByLabelText('Tin nhắn tiếng Anh')).toBeDisabled());
  });
  it('shows a failed conversation start without enabling submission', async () => {
    fail = '/api/conversations';
    render(
      <MysqlLuuTru>
        <HoiThoaiMySQL />
      </MysqlLuuTru>,
    );
    await screen.findByText('Hội thoại đã lưu');
    fireEvent.click(screen.getByText('Hội thoại mới'));
    await screen.findByText(/Chưa kết nối/);
    expect(screen.getByText('Gửi tin nhắn')).toBeDisabled();
  });
  it('saves a review in one session and closes it after finishing the deck', async () => {
    render(<FlashcardMySQL />);
    await screen.findByText('hello');
    fireEvent.click(screen.getByText('hello'));
    await screen.findByText('xin chào');
    fireEvent.click(screen.getByText('Nhớ được'));
    await screen.findByText('Đã hoàn thành phiên ôn tập');
    expect(calls.find((c) => c.path.endsWith('/71/reviews'))?.body).toMatchObject({
      vocabulary_id: 11,
      rating: 'good',
    });
    expect(calls.some((c) => c.path === '/api/flashcards/sessions/71/close')).toBe(true);
  });
  it('queues relearning cards and supports review-all restart', async () => {
    render(<FlashcardMySQL />);
    await screen.findByText('hello');
    fireEvent.click(screen.getByText('hello'));
    fireEvent.click(screen.getByText('Học lại'));
    await screen.findByText('Thẻ 2 / 2');
    fireEvent.click(screen.getByLabelText('Ôn tất cả từ'));
    await waitFor(() =>
      expect(
        calls.filter((c) => c.path === '/api/flashcards/sessions').at(-1)?.body.review_all,
      ).toBe(true),
    );
  });
  it('shows an empty due deck and a recoverable request failure', async () => {
    words = [];
    const view = render(<FlashcardMySQL />);
    await screen.findByText('Không có từ đến hạn ôn tập');
    view.unmount();
    fail = '/api/vocabulary?due=true&limit=100&offset=0';
    render(<FlashcardMySQL />);
    await screen.findByText(/Chưa kết nối/);
    expect(screen.getByText('Thử lại')).toBeInTheDocument();
  });
  it('loads roleplay topics from MySQL instead of the demo list', async () => {
    render(<ChuDeNhapVai />);
    await screen.findByText('Cà phê');
    expect(screen.queryByText('Sắc thái trong tranh luận')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Bắt đầu nhập vai'));
    expect(window.location.hash).toContain('chu-de=coffee');
  });
  it('sends login credentials to the server instead of accepting a local demo account', async () => {
    saveSession(null);
    render(
      <MysqlLuuTru>
        <TaiKhoan />
      </MysqlLuuTru>,
    );
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } });
    fireEvent.submit(screen.getByLabelText('Mật khẩu').closest('form')!);
    await waitFor(() => expect(calls.some((c) => c.path === '/api/auth/login')).toBe(true));
  });
  it('retries a failed review using the original request ID and rating', async () => {
    render(<FlashcardMySQL />);
    await screen.findByText('hello');
    fireEvent.click(screen.getByText('hello'));
    fail = '/api/flashcards/sessions/71/reviews';
    fireEvent.click(screen.getByText('Nhớ được'));
    await screen.findByText(/Chưa kết nối/);
    const original = calls.find((c) => c.path.endsWith('/71/reviews'))!.body;
    fail = '';
    fireEvent.click(screen.getByText('Nhớ được'));
    await screen.findByText('Đã hoàn thành phiên ôn tập');
    expect(calls.filter((c) => c.path.endsWith('/71/reviews')).at(-1)!.body).toEqual(original);
  });
});
