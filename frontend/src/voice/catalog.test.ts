import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/database';
import { liveVoices } from './catalog';

vi.mock('../api/database', () => ({ api: vi.fn() }));
beforeEach(() => vi.mocked(api).mockReset());
const valid = { provider: 'gemini', default_voice: 'Kore', voices: [{ id: 'Kore', name: 'Kore' }] };

describe('live voice catalog', () => {
  it('accepts bilingual Blaze voices independently of the reasoning provider', async () => {
    const catalog = {
      provider: 'blaze',
      default_voice: 'HN-Nam-1-BL',
      voices: [
        { id: 'HN-Nam-1-BL', name: 'Mate Vietnamese', language: 'vi' },
        { id: 'UK-Nu-1-TM', name: 'Mate English', language: 'en' },
      ],
    };
    vi.mocked(api).mockResolvedValue(catalog);
    expect(await liveVoices(new AbortController().signal)).toEqual(catalog);
    vi.mocked(api).mockResolvedValue({
      ...catalog,
      voices: [{ id: 'Kore', name: 'Wrong provider' }],
    });
    await expect(liveVoices(new AbortController().signal)).rejects.toThrow();
  });
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
