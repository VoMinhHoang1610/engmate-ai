import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiFetch, authenticate, authHeaders, hasSession, saveSession } from './database';

beforeEach(() => saveSession(null));
describe('authenticated database transport', () => {
  it('keeps tokens in memory and attaches a bearer to private calls', async () => {
    const tokens = { access_token: 'access', refresh_token: 'refresh' };
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(tokens))));
    vi.stubGlobal('fetch', fetch);
    await authenticate(false, { identifier: 'learner', password: 'private-password' });
    expect(hasSession()).toBe(true);
    expect(authHeaders()).toEqual({ Authorization: 'Bearer access' });
    expect(sessionStorage.getItem('engmate-session')).toBeNull();
    expect(await api('/me')).toEqual(tokens);
    expect(fetch.mock.calls.at(-1)?.[1].headers.Authorization).toBe('Bearer access');
    saveSession(null);
    expect(hasSession()).toBe(false);
  });
  it('starts a new page without restoring an older browser session', async () => {
    sessionStorage.setItem(
      'engmate-session',
      JSON.stringify({ access_token: 'previous', refresh_token: 'previous-refresh' }),
    );
    vi.resetModules();
    const freshPage = await import('./database');
    expect(freshPage.hasSession()).toBe(false);
    expect(freshPage.authHeaders()).toEqual({});
    expect(sessionStorage.getItem('engmate-session')).toBeNull();
  });
  it('rotates once when concurrent private calls have expired access', async () => {
    saveSession({ access_token: 'old', refresh_token: 'refresh' });
    const fetch = vi.fn().mockImplementation(async (path: string, options: RequestInit) => {
      if (path === '/api/auth/refresh')
        return new Response(JSON.stringify({ access_token: 'new', refresh_token: 'rotated' }));
      return new Response(JSON.stringify({ ok: true }), {
        status:
          (options.headers as Record<string, string>).Authorization === 'Bearer new' ? 200 : 401,
      });
    });
    vi.stubGlobal('fetch', fetch);
    const responses = await Promise.all([api('/me'), api('/dashboard')]);
    expect(responses).toEqual([{ ok: true }, { ok: true }]);
    expect(fetch.mock.calls.filter(([path]) => path === '/api/auth/refresh')).toHaveLength(1);
    expect(authHeaders().Authorization).toBe('Bearer new');
  });
  it('clears revoked sessions and propagates the reauthentication error', async () => {
    saveSession({ access_token: 'old', refresh_token: 'revoked' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(api('/me')).rejects.toThrow('Phiên đăng nhập');
    expect(hasSession()).toBe(false);
  });
  it('does not restore a logged-out session from a late token refresh', async () => {
    saveSession({ access_token: 'expired', refresh_token: 'refresh' });
    let deliver!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      deliver = resolve;
    });
    const fetch = vi
      .fn()
      .mockImplementation((path: string) =>
        path === '/api/auth/refresh'
          ? response
          : Promise.resolve(new Response('{}', { status: 401 })),
      );
    vi.stubGlobal('fetch', fetch);
    const request = api('/me');
    await vi.waitFor(() =>
      expect(fetch.mock.calls.some(([path]) => path === '/api/auth/refresh')).toBe(true),
    );
    saveSession(null);
    deliver(new Response(JSON.stringify({ access_token: 'late', refresh_token: 'late' })));
    await expect(request).rejects.toThrow('Phiên đăng nhập');
    expect(hasSession()).toBe(false);
  });
  it.each([401, 409, 422, 503, 500])(
    'does not expose server parameters on error %s',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('private-password', { status })),
      );
      await expect(api('/me')).rejects.toThrow();
      await expect(api('/me')).rejects.not.toThrow('private-password');
    },
  );
  it('supports no-content writes and public requests without bearer headers', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    expect(await api('/auth/logout', 'POST')).toBeUndefined();
    await apiFetch('/api/topics');
    expect(fetch.mock.calls.at(-1)?.[1]).toEqual({});
  });
});
