import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/database';
import { liveVoices } from './catalog';

vi.mock('../api/database', () => ({ api: vi.fn() }));
beforeEach(() => vi.mocked(api).mockReset());
const valid = { provider: 'gemini', default_voice: 'Kore', voices: [{ id: 'Kore', name: 'Kore' }] };

describe('live voice catalog', () => {
  it('loads the authenticated live catalog rather than the reading catalog', async () => {
    vi.mocked(api).mockResolvedValue(valid);
    const signal = new AbortController().signal;
    expect(await liveVoices(signal)).toEqual(valid);
    expect(api).toHaveBeenCalledWith('/voice/voices', 'GET', undefined, signal);
  });
  it.each([
    null,
    {},
    { ...valid, voices: [] },
    { ...valid, default_voice: 'Missing' },
    { ...valid, voices: [{ id: '<script>', name: 'Bad' }] },
    { ...valid, voices: [{ id: 'Kore', name: '' }] },
  ])('rejects malformed catalog %j', async (data) => {
    vi.mocked(api).mockResolvedValue(data);
    await expect(liveVoices(new AbortController().signal)).rejects.toThrow(
      'Danh sách giọng đối thoại chưa hợp lệ.',
    );
  });
});
