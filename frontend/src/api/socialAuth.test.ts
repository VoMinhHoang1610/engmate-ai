import { afterEach, expect, it, vi } from 'vitest';
import { authenticateSocial, completeGoogleLink, GoogleLinkRequired } from './socialAuth';
import { apiFetch, saveSession } from './database';

vi.mock('./database', () => ({ apiFetch: vi.fn(), saveSession: vi.fn() }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function setup() {
  const popup = { closed: false, close: vi.fn(), location: { href: '' } };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(
      JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth', state: 'flow-state' }),
      { status: 200 },
    ),
  );
  return popup;
}

it('rejects blocked popups without sending a request', async () => {
  vi.spyOn(window, 'open').mockReturnValue(null);
  await expect(authenticateSocial('google')).rejects.toThrow('chặn cửa sổ');
  expect(apiFetch).not.toHaveBeenCalled();
});

it('reports missing provider setup and closes its popup', async () => {
  const popup = setup();
  vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 503 }));
  await expect(authenticateSocial('facebook')).rejects.toThrow('Facebook');
  expect(popup.close).toHaveBeenCalledOnce();
});

it('accepts only the exact popup, origin, provider and state before creating a session', async () => {
  const popup = setup();
  const pending = authenticateSocial('google');
  await vi.waitFor(() => expect(popup.location.href).toContain('accounts.google.com'));
  const data = {
    type: 'engmate-oauth',
    provider: 'google',
    state: 'flow-state',
    tokens: { access_token: 'access', refresh_token: 'refresh' },
  };
  const deliver = (origin: string, source: Window | null, value: unknown) =>
    window.dispatchEvent(new MessageEvent('message', { origin, source, data: value }));
  deliver('https://evil.example', popup as unknown as Window, data);
  deliver(window.location.origin, null, data);
  deliver(window.location.origin, popup as unknown as Window, { ...data, state: 'other' });
  expect(saveSession).not.toHaveBeenCalled();
  deliver(window.location.origin, popup as unknown as Window, data);
  await pending;
  expect(saveSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  expect(popup.close).toHaveBeenCalledOnce();
});

it('does not accept an unexpected authorization destination', async () => {
  const popup = setup();
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(JSON.stringify({ url: 'https://evil.example/login', state: 'state' })),
  );
  await expect(authenticateSocial('google')).rejects.toThrow('không hợp lệ');
  expect(popup.location.href).toBe('');
});

it('cleans up when the user closes the provider window', async () => {
  const popup = setup();
  const pending = authenticateSocial('google');
  const rejected = expect(pending).rejects.toThrow('đóng cửa sổ');
  await vi.waitFor(() => expect(popup.location.href).toContain('accounts.google.com'));
  popup.closed = true;
  await rejected;
  expect(saveSession).not.toHaveBeenCalled();
});

it('returns a Google link challenge without creating a login session', async () => {
  const popup = setup();
  const pending = authenticateSocial('google');
  const rejected = expect(pending).rejects.toBeInstanceOf(GoogleLinkRequired);
  await vi.waitFor(() => expect(popup.location.href).toContain('accounts.google.com'));
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: window.location.origin,
      source: popup as unknown as Window,
      data: {
        type: 'engmate-oauth',
        provider: 'google',
        state: 'flow-state',
        link_ticket: 'a'.repeat(43),
      },
    }),
  );
  await rejected;
  expect(saveSession).not.toHaveBeenCalled();
});

it('creates a session only after a successful local password confirmation', async () => {
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh' })),
  );
  await completeGoogleLink('ticket', 'local-password');
  expect(apiFetch).toHaveBeenCalledWith(
    '/api/auth/oauth/google/link',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ ticket: 'ticket', password: 'local-password' }),
    }),
  );
  expect(saveSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
});

it('rejects incorrect local passwords without accepting a session', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 401 }));
  await expect(completeGoogleLink('ticket', 'wrong-password')).rejects.toThrow(
    'Bấm Google để thử lại',
  );
  expect(saveSession).not.toHaveBeenCalled();
});
