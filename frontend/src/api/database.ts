/** Authenticated API access. Provider and database secrets never enter the browser. */
export const mysqlEnabled = import.meta.env.VITE_DATA_SOURCE === 'mysql';
interface Session {
  access_token: string;
  refresh_token: string;
}
let session: Session | null = null;
let sessionEpoch = 0;
let refreshing: Promise<void> | null = null;
try {
  // A new page starts at login; account data remains durable in MySQL.
  sessionStorage.removeItem('engmate-session');
} catch {
  /* Storage may be disabled; authentication still works in memory. */
}

export function hasSession() {
  return Boolean(session);
}
export function saveSession(value: Session | null) {
  sessionEpoch++;
  persistSession(value);
}
function persistSession(value: Session | null) {
  session = value;
}
export function authHeaders(): Record<string, string> {
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
async function refreshSession() {
  if (!session) throw new Error('Vui lòng đăng nhập lại.');
  if (!refreshing)
    refreshing = (async () => {
      const epoch = sessionEpoch;
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session!.refresh_token }),
      });
      if (epoch !== sessionEpoch) throw new Error('Phiên đăng nhập đã thay đổi.');
      if (!response.ok) {
        saveSession(null);
        throw new Error('Phiên đăng nhập đã hết hạn.');
      }
      const tokens = (await response.json()) as Session;
      if (epoch !== sessionEpoch) throw new Error('Phiên đăng nhập đã thay đổi.');
      persistSession(tokens);
    })().finally(() => {
      refreshing = null;
    });
  await refreshing;
}
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!session) return fetch(path, options);
  const epoch = sessionEpoch;
  const access = session.access_token;
  const send = () =>
    fetch(path, {
      ...options,
      headers: { ...Object.fromEntries(new Headers(options.headers)), ...authHeaders() },
    });
  let response = await send();
  if (
    response.status === 401 &&
    session &&
    epoch === sessionEpoch &&
    !path.startsWith('/api/auth/')
  ) {
    if (session.access_token === access) await refreshSession();
    if (epoch !== sessionEpoch) return response;
    response = await send();
  }
  return response;
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiFetch('/api' + path, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const errors: Record<number, string> = {
      401: 'Tài khoản hoặc mật khẩu không đúng. Vui lòng đăng nhập lại.',
      409: 'Dữ liệu đã thay đổi hoặc đã tồn tại. Hãy tải lại và thử lại.',
      422: 'Thông tin chưa hợp lệ. Mật khẩu mới cần ít nhất 10 ký tự.',
      503: 'Chưa kết nối được máy chủ dữ liệu. Hãy thử lại.',
    };
    throw new Error(errors[response.status] ?? 'Không thực hiện được yêu cầu. Hãy thử lại.');
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
export async function authenticate(register: boolean, body: unknown) {
  saveSession(await api<Session>(register ? '/auth/register' : '/auth/login', 'POST', body));
}

export interface Profile {
  version: string;
  display_name: string;
  cefr_level: import('../demo/trinhDo').TrinhDo;
  phone_number: string | null;
  birth_date: string | null;
  gender: 'male' | 'female' | 'other' | null;
  learning_goal: string;
  daily_goal_minutes: number;
  time_zone_id: string;
  onboarding_completed_at: string | null;
  avatar_asset_id: number | null;
}
export interface Preferences {
  version: string;
  theme: 'light' | 'dark' | 'system';
  reduced_motion: boolean;
  speech_rate: number;
  speech_voice_id: string;
}
export interface Word {
  user_vocabulary_id: number;
  version: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  part_of_speech: string | null;
  example_sentence: string | null;
  is_mastered: boolean;
  next_review_at: string | null;
}
export interface Account {
  username: string;
  email: string;
}
export interface Dashboard {
  total_study_minutes: number;
  review_count: number;
  today: string;
  daily: { local_study_date: string; study_minutes: number; review_count: number }[];
}
export interface Topic {
  topic_id: number;
  code: string;
  name: string;
  description: string;
  ai_role: string;
  opening_message: string;
  min_level: string;
  max_level: string;
  color_key: string;
  icon_key: string;
}
export interface Question {
  question_id: number;
  prompt: string;
  question_type: string;
  options: { option_id: number; text: string }[];
}
export interface Lesson {
  lesson_id: number;
  code: string;
  skill: string;
  format: string;
  title: string;
  instruction: string;
  content: string | null;
  min_level: string;
  max_level: string;
  questions: Question[];
  vocabulary: {
    word: string;
    meaning: string;
    phonetic: string | null;
    part_of_speech: string | null;
    example_sentence: string | null;
  }[];
}
export interface Attempt {
  attempt_id: number;
  version: string;
  score_percent: number | null;
  evaluations?: { feedback: string | null }[];
  answer_key?: {
    question_id: number;
    correct_option_id: number | null;
    expected_text: string | null;
    explanation: string | null;
  }[];
}
