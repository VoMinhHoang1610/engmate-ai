import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

describe('legacy starter page', () => {
  it('still renders its backend status while it remains in the codebase', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ status: 'ok', service: 'engmate-ai' }))),
    );
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'EngMate-AI' })).toBeVisible();
    expect(await screen.findByText('Backend đã sẵn sàng.')).toBeVisible();
  });
});
