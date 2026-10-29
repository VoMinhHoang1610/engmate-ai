import { apiFetch, saveSession } from './database';
import { readJSON } from './readJSON';

export type SocialProvider = 'google' | 'facebook';

export class GoogleLinkRequired extends Error {
  readonly ticket: string;
  constructor(ticket: string) {
    super('Xác nhận tài khoản EngMate để liên kết Google.');
    this.ticket = ticket;
  }
}

/** Complete the browser-bound Google challenge with the user's local password. */
export async function completeGoogleLink(ticket: string, password: string): Promise<void> {
  const response = await apiFetch('/api/auth/oauth/google/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, password }),
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Mật khẩu EngMate không đúng hoặc tài khoản không khả dụng. Bấm Google để thử lại.'
        : 'Yêu cầu liên kết đã hết hạn hoặc chưa thực hiện được. Bấm Google để thử lại.',
    );
  }
  const tokens = await readJSON<{ access_token: string; refresh_token: string }>(response);
  if (
    typeof tokens.access_token !== 'string' ||
    !tokens.access_token ||
    typeof tokens.refresh_token !== 'string' ||
    !tokens.refresh_token
  ) {
    throw new Error('Phản hồi đăng nhập không hợp lệ. Bấm Google để thử lại.');
  }
  saveSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
}

/** Open only on a deliberate click; accept results from the exact popup and origin. */
export async function authenticateSocial(provider: SocialProvider): Promise<void> {
  const popup = window.open('about:blank', 'engmate-social-login', 'popup,width=520,height=700');
  if (!popup) throw new Error('Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên.');
  const controller = new AbortController();
  try {
    const response = await apiFetch(`/api/auth/oauth/${provider}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        response.status === 503
          ? `Đăng nhập ${provider === 'google' ? 'Google' : 'Facebook'} chưa được cấu hình trên máy chủ.`
          : 'Chưa mở được đăng nhập nền tảng. Hãy thử lại sau.',
      );
    }
    const flow = await readJSON<{ url: string; state: string }>(response, controller.signal);
    const target = new URL(flow.url);
    const allowedHost = provider === 'google' ? 'accounts.google.com' : 'www.facebook.com';
    if (
      target.protocol !== 'https:' ||
      target.hostname !== allowedHost ||
      !flow.state ||
      popup.closed
    ) {
      throw new Error('Phiên đăng nhập không hợp lệ hoặc cửa sổ đã đóng.');
    }
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener('message', receive);
        window.clearInterval(poll);
        window.clearTimeout(timeout);
      };
      const receive = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== popup) return;
        const data: unknown = event.data;
        if (!data || typeof data !== 'object') return;
        const result = data as Record<string, unknown>;
        if (
          result.type !== 'engmate-oauth' ||
          result.provider !== provider ||
          result.state !== flow.state
        )
          return;
        cleanup();
        if (
          provider === 'google' &&
          typeof result.link_ticket === 'string' &&
          result.link_ticket.length >= 30
        ) {
          reject(new GoogleLinkRequired(result.link_ticket));
          return;
        }
        if (typeof result.error === 'string') {
          reject(new Error(result.error));
          return;
        }
        const tokens = result.tokens as Record<string, unknown> | undefined;
        if (
          !tokens ||
          typeof tokens.access_token !== 'string' ||
          typeof tokens.refresh_token !== 'string' ||
          !tokens.access_token ||
          !tokens.refresh_token
        ) {
          reject(new Error('Phản hồi đăng nhập không hợp lệ.'));
          return;
        }
        saveSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
        resolve();
      };
      const poll = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('Bạn đã đóng cửa sổ đăng nhập.'));
        }
      }, 500);
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Đăng nhập đã quá thời gian. Hãy thử lại.'));
      }, 300000);
      window.addEventListener('message', receive);
      try {
        popup.location.href = flow.url;
      } catch {
        cleanup();
        reject(new Error('Không chuyển được tới trang đăng nhập. Hãy thử lại.'));
      }
    });
  } finally {
    controller.abort();
    popup.close();
  }
}
