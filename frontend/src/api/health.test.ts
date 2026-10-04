import { describe, expect, it, vi } from 'vitest';
import { getHealth } from './health';

describe('health API client', () => {
  it('rejects unsuccessful HTTP responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(getHealth()).rejects.toThrow('HTTP 503');
  });

  it.each([
    null,
    'ok',
    {},
    { status: 'down', service: 'engmate-ai' },
    { status: 'ok' },
    { status: 'ok', service: 'other' },
  ])('rejects invalid payload %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
    await expect(getHealth()).rejects.toThrow('không đúng định dạng');
  });
});
