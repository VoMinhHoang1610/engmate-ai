import { afterEach, expect, it, vi } from 'vitest';
import { chuanBiAmThanh, xoaBoNhoAmThanh } from './audio';
import { apiFetch } from '../api/database';

vi.mock('../api/database', () => ({ apiFetch: vi.fn() }));

afterEach(() => {
  xoaBoNhoAmThanh();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('sends cleaned text to TTS and shares the cache with the equivalent plain reply', async () => {
  class PreparedAudio {
    preload = '';
    load = vi.fn();
    pause = vi.fn();
    removeAttribute = vi.fn();
  }
  vi.stubGlobal('Audio', PreparedAudio);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:formatting-test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.mocked(apiFetch).mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['fixture'], { type: 'audio/mpeg' }),
  } as Response);
  await chuanBiAmThanh('## Từ vựng\n\n* **meeting** — cuộc họp');
  const body = JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]?.body));
  expect(body.text).toBe('Từ vựng\n\nmeeting — cuộc họp');
  expect(body.language).toBe('vi');
  await chuanBiAmThanh('Từ vựng\n\nmeeting — cuộc họp');
  expect(apiFetch).toHaveBeenCalledOnce();
});
