/** Bound body download as well as fetch headers, including mocked/stalled streams. */
export async function readJSON<T>(
  response: Response,
  signal?: AbortSignal,
  timeout = 45000,
): Promise<T> {
  if (!response.body) throw new Error('Phản hồi máy chủ không có nội dung.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  let failure: unknown;
  const cancel = () => {
    failure = signal?.reason ?? new DOMException('Cancelled', 'AbortError');
    void reader.cancel().catch(() => undefined);
  };
  const timer = setTimeout(() => {
    failure = new DOMException('Đọc phản hồi quá thời gian.', 'TimeoutError');
    void reader.cancel().catch(() => undefined);
  }, timeout);
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (signal?.aborted) cancel();
    while (!failure) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 8 * 1024 * 1024) throw new Error('Phản hồi máy chủ vượt giới hạn.');
      text += decoder.decode(chunk.value, { stream: true });
    }
    if (failure) throw failure;
    return JSON.parse(text + decoder.decode()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
