import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './database';
import { layGiongDoc } from './voices';

vi.mock('./database', () => ({ apiFetch: vi.fn() }));

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe('voice catalog contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a legacy catalog without gender and normalizes it to null', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      response([{ id: 'HN-Nam-1-BL', name: 'Minh', language: 'vi' }]),
    );

    await expect(layGiongDoc(new AbortController().signal, 'vi')).resolves.toEqual([
      { id: 'HN-Nam-1-BL', name: 'Minh', language: 'vi', gender: null },
    ]);
  });

  it('rejects an invalid gender instead of selecting an unknown voice', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      response([{ id: 'HN-Nam-1-BL', name: 'Minh', language: 'vi', gender: 'other' }]),
    );

    await expect(layGiongDoc(new AbortController().signal, 'vi')).rejects.toThrow(
      'Danh sách giọng nói chưa hợp lệ',
    );
  });
});
