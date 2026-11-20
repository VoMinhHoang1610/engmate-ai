import { expect, it } from 'vitest';
import { SpokenText } from './spokenText';

it('cleans split streamed markup without changing raw Unicode playback receipt offsets', () => {
  const raw = '**Xin chào 😀.**\n\n* `meeting` là cuộc họp.';
  const spoken = new SpokenText();
  const chunks: string[] = [];
  for (const character of raw) chunks.push(...spoken.push(character));
  chunks.push(...spoken.finish(raw));
  expect(chunks.join(' ')).toBe('Xin chào 😀. meeting là cuộc họp.');
  expect(chunks.some((text) => /[*`#•]/.test(text))).toBe(false);
  const ends = chunks.map(() => spoken.nextEnd());
  expect(ends.at(-1)).toBe(Array.from(raw).length);
  expect(ends.every((end, i) => i === 0 || end > ends[i - 1])).toBe(true);
});
