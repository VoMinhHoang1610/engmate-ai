import { describe, expect, it } from 'vitest';
import { SpokenText } from './spokenText';

it('tracks raw Unicode prefixes independently from Markdown sent to TTS', () => {
  const text = new SpokenText();
  expect(text.push('**Hello 😀.** Next ')).toEqual(['Hello 😀.']);
  expect(text.nextEnd()).toBe(Array.from('**Hello 😀.** ').length);
  expect(text.finish('**Hello 😀.** Next word.')).toEqual(['Next word.']);
  expect(text.nextEnd()).toBe(Array.from('**Hello 😀.** Next word.').length);
});

it('preserves astral characters across a hard phrase boundary and receipt offsets', () => {
  const text = new SpokenText();
  const content = 'a'.repeat(599) + '😀' + 'b'.repeat(20);
  const chunks = text.finish(content);
  expect(chunks.join('')).toBe(content);
  for (const chunk of chunks)
    expect(new TextDecoder().decode(new TextEncoder().encode(chunk))).toBe(chunk);
  const ends = chunks.map(() => text.nextEnd());
  expect(ends.at(-1)).toBe(Array.from(content).length);
});

describe('incremental spoken text', () => {
  it('releases complete sentences before the reply finishes without repeating the tail', () => {
    const text = new SpokenText();
    expect(text.push('**Xin chào.** Hãy ')).toEqual(['Xin chào.']);
    expect(text.push('thử câu này. Hello ')).toEqual(['Hãy thử câu này.']);
    expect(text.finish('**Xin chào.** Hãy thử câu này. Hello there!')).toEqual(['Hello there!']);
  });

  it('keeps split tokens, decimal numbers and incomplete Markdown links together', () => {
    const text = new SpokenText();
    expect(text.push('The price is 3.')).toEqual([]);
    expect(text.push('14. Read [this')).toEqual(['The price is 3.14.']);
    expect(text.push(' guide](https://example.test). Next')).toEqual(['Read this guide.']);
    expect(text.finish('The price is 3.14. Read [this guide](https://example.test). Next')).toEqual(
      ['Next'],
    );
  });

  it('releases a first clause before a long opening sentence finishes', () => {
    const content = 'Mình rất vui được gặp bạn hôm nay, chúng ta sẽ bắt đầu bài học.';
    const text = new SpokenText();
    expect(text.push(content)).toEqual(['Mình rất vui được gặp bạn hôm nay,']);
    expect(text.finish(content)).toEqual(['chúng ta sẽ bắt đầu bài học.']);

    // A complete sentence already in the buffer must not hide an earlier comma;
    // both ready phrases can be queued immediately.
    const buffered = new SpokenText();
    expect(buffered.push(`${content} `)).toEqual([
      'Mình rất vui được gặp bạn hôm nay,',
      'chúng ta sẽ bắt đầu bài học.',
    ]);
    expect(buffered.finish(`${content} `)).toEqual([]);
  });

  it('batches short sentences after the first two clips to avoid a TTS job per sentence', () => {
    const content = Array.from({ length: 20 }, (_, index) => `Sentence number ${index + 1}.`).join(
      ' ',
    );
    const text = new SpokenText();
    const chunks = [...text.push(content), ...text.finish(content)];
    expect(chunks[0]).toBe('Sentence number 1.');
    expect(chunks[1]).toBe('Sentence number 2.');
    expect(chunks[2].split('. ').length).toBeGreaterThan(3);
    expect(chunks.length).toBeLessThan(10);
    expect(chunks.join(' ')).toBe(content);
  });

  it('caps a first phrase when the model streams unpunctuated text', () => {
    const text = new SpokenText();
    const content = 'từ '.repeat(60);
    const chunks = [...text.push(content), ...text.finish(content)];
    expect(chunks[0].length).toBeLessThanOrEqual(96);
    expect(chunks.join(' ')).toBe(content.trim());
  });

  it('bounds unpunctuated phrases and refuses oversized or inconsistent final replies', () => {
    const text = new SpokenText();
    const content = 'word '.repeat(500);
    const chunks = [...text.push(content), ...text.finish(content)];
    expect(chunks.every((chunk) => chunk.length <= 600)).toBe(true);
    expect(chunks.join(' ')).toBe(content.trim());
    expect(() => new SpokenText().push('x'.repeat(12001))).toThrow();
    const other = new SpokenText();
    other.push('Already spoken. ');
    expect(() => other.finish('Different answer.')).toThrow();
  });
});
