import { describe, expect, it } from 'vitest';
import { prepareAvatar } from './avatar';

describe('local avatar validation', () => {
  it('rejects active SVG content, empty files and oversized uploads before decoding', async () => {
    await expect(
      prepareAvatar(new File(['<svg/>'], 'avatar.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('PNG');
    await expect(prepareAvatar(new File([], 'empty.png', { type: 'image/png' }))).rejects.toThrow(
      '2 MB',
    );
    await expect(
      prepareAvatar(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }),
      ),
    ).rejects.toThrow('2 MB');
  });
});
