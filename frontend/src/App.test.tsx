import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('starter application', () => {
  it('shows loading and then a successful backend connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ status: 'ok', service: 'engmate-ai' }))),
    );
    render(<App />);
    expect(screen.getByRole('heading', { name: 'EngMate-AI', level: 1 })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra');
    expect(await screen.findByText('Backend đã sẵn sàng.')).toBeVisible();
  });

  it('shows network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Mất kết nối.')));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối.');
  });

  it('shows a fallback for errors without a message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(null));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được backend.');
  });

  it('aborts the pending request when the component unmounts', () => {
    const request = vi.fn().mockReturnValue(new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', request);
    const view = render(<App />);
    const signal = request.mock.calls[0][1].signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});
