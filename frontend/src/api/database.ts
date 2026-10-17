/** Authenticated API access. Provider and database secrets never enter the browser. */
interface Session {
  access_token: string;
  refresh_token: string;
}
let session: Session | null = null;
let sessionEpoch = 0;
let refreshing: Promise<void> | null = null;

async function boundedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = path.includes('/speech/tts')
    ? 95000
    : path.includes('/auth/refresh')
      ? 15000
      : 45000;
  const timer = window.setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeout,
  );
  try {
    return await fetch(path, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
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
  window.dispatchEvent(new Event('engmate-session'));
}
export function authHeaders(): Record<string, string> {
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
async function refreshSession() {
  if (!session) throw new Error('Vui lòng đăng nhập lại.');
  if (!refreshing)
    refreshing = (async () => {
      const epoch = sessionEpoch;
      const response = await boundedFetch('/api/auth/refresh', {
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
  if (!session) return boundedFetch(path, options);
  const epoch = sessionEpoch;
  const access = session.access_token;
  const send = () =>
    boundedFetch(path, {
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
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiFetch('/api' + path, {
    method,
    signal,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const errors: Record<number, string> = {
      401: 'Tài khoản hoặc mật khẩu không đúng. Vui lòng đăng nhập lại.',
      409: 'Dữ liệu đã thay đổi hoặc đã tồn tại. Hãy tải lại và thử lại.',
      422: 'Thông tin chưa hợp lệ. Mật khẩu mới cần ít nhất 10 ký tự.',
      429: 'Bạn thao tác quá nhanh. Vui lòng chờ một phút.',
      502: 'Dịch vụ AI đang gặp lỗi. Hãy thử lại sau.',
      503: 'Dịch vụ chưa sẵn sàng. Kiểm tra kết nối dữ liệu và cấu hình AI.',
      504: 'AI phản hồi quá lâu. Hãy tải lại tin nhắn trước khi gửi lại.',
    };
    throw new Error(errors[response.status] ?? 'Không thực hiện được yêu cầu. Hãy thử lại.');
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
export async function authenticate(register: boolean, body: unknown) {
  saveSession(await api<Session>(register ? '/auth/register' : '/auth/login', 'POST', body));
}
