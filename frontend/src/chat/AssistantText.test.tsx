import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssistantText } from './AssistantText';
import { assistantSpeechText, assistantText } from './formatAssistantText';

describe('assistant plain-text presentation', () => {
  it.each([
    ['**Xin chào**', 'Xin chào'],
    ['*Học tiếng Anh*', 'Học tiếng Anh'],
    ['## Từ vựng', 'Từ vựng'],
    ['###Từ vựng', 'Từ vựng'],
    ['`meeting` và **deadline', 'meeting và deadline'],
    ['* meeting\n- deadline\n+ colleague', '• meeting\n• deadline\n• colleague'],
    ['1. meeting\n2) deadline', '1. meeting\n2) deadline'],
    ['Từ vựng\r\n\r\n1. meeting — cuộc họp', 'Từ vựng\n\n1. meeting — cuộc họp'],
    ['Dùng C# trong ví dụ và follow_up.', 'Dùng C# trong ví dụ và follow_up.'],
    ['```text\n**Xin chào**\n```', '\nXin chào\n'],
  ])('normalizes %j without losing learning content', (raw, expected) => {
    expect(assistantText(raw)).toBe(expected);
    expect(assistantText(expected)).toBe(expected);
  });

  it('keeps a single stable span and visible prefix for incomplete streamed markers', () => {
    const raw = '## **Học từ**\n\n* **meeting** — cuộc họp\n\n2. `deadline` — hạn chót';
    const full = assistantText(raw);
    const { container, rerender } = render(<AssistantText text="" />);
    const element = container.firstElementChild;
    for (let end = 1; end <= raw.length; end++) {
      const partial = raw.slice(0, end);
      rerender(<AssistantText text={partial} />);
      expect(container.firstElementChild).toBe(element);
      expect(container.querySelectorAll('*')).toHaveLength(1);
      expect(container.textContent).toBe(assistantText(partial));
      expect(full.startsWith(assistantText(partial).trimEnd())).toBe(true);
    }
  });

  it('renders script and HTML attempts literally without creating executable elements', () => {
    const raw = '<script>alert("x")</script>\n<img src="x" onerror="alert(1)">\n<b>Chào bạn</b>';
    const { container } = render(<AssistantText text={raw} />);
    expect(container.textContent).toBe(raw);
    expect(container.querySelector('script, img, b')).toBeNull();
  });

  it('preserves all 30 compact entries, their numbers and blank lines', () => {
    const list = Array.from(
      { length: 30 },
      (_, i) => `${i + 1}. word${i + 1} (n) — từ số ${i + 1}`,
    );
    const raw = `Từ vựng\n\n${list.join('\n\n')}`;
    const { container } = render(<AssistantText text={raw} />);
    expect(container.textContent).toBe(raw);
    expect(assistantText(raw).split('\n\n').slice(1)).toEqual(list);
    expect(assistantSpeechText(raw).match(/word\d+/g)).toHaveLength(30);
  });

  it('removes speech formatting while preserving accents, decimals and link labels', () => {
    const raw =
      '## Ôn tập\n\n1. **meeting** — cuộc họp\n* `deadline` — hạn chót\nGiá 3.14. [Đọc thêm](https://example.test).';
    expect(assistantSpeechText(raw)).toBe(
      'Ôn tập\n\nmeeting — cuộc họp\ndeadline — hạn chót\nGiá 3.14. Đọc thêm.',
    );
    expect(assistantSpeechText('**dở dang')).toBe('dở dang');
    expect(assistantSpeechText('***')).toBe('');
  });
});
