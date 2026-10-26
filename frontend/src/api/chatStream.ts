import { apiFetch } from './database';
import type { Message, Turn } from '../types';
import type { VoiceGender } from '../speech/identity';

export type ChatEvent =
  | { type: 'start'; response_id: number; message: Message; reply: Message }
  | { type: 'delta'; response_id: number; delta: string }
  | { type: 'done'; response_id?: number; turn: Turn }
  | { type: 'error'; response_id: number; status: number; message: string };

/** Consume incremental SSE without buffering the complete AI reply. */
export async function streamTurn(
  identity: number,
  payload: {
    client_request_id: string;
    message: string;
    voice?: boolean;
    voice_gender?: VoiceGender | null;
  },
  signal: AbortSignal,
  onEvent: (event: ChatEvent) => void,
  traceId?: string,
): Promise<Turn> {
  const trace = traceId ? `?voice_trace_id=${encodeURIComponent(traceId)}` : '';
  const response = await apiFetch(`/api/conversations/${identity}/messages/stream${trace}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? 'AI đang giới hạn lượt gọi. Hãy thử lại sau.'
        : response.status === 503
          ? 'Kiểm tra khóa API và quyền truy cập model đang dùng.'
          : 'Chưa kết nối được luồng phản hồi AI.',
    );
  if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream'))
    throw new Error('Phản hồi AI không đúng định dạng stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let active: number | undefined;
  let result: Turn | undefined;
  let expired = false;
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = window.setTimeout(() => {
    expired = true;
    cancel();
  }, 45000);
  let idle: ReturnType<typeof setTimeout>;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      expired = true;
      cancel();
    }, 30000);
  };
  resetIdle();
  try {
    if (signal.aborted) throw signal.reason;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      resetIdle();
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > 262144) throw new Error('Sự kiện phản hồi AI quá lớn.');
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop()!;
      for (const frame of frames) {
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6))
          .join('\n');
        if (!data) continue;
        const event = JSON.parse(data) as ChatEvent;
        if (event.type === 'start') active = event.response_id;
        if (event.type !== 'done' && event.response_id !== active) continue;
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'delta' && typeof event.delta !== 'string')
          throw new Error('Nội dung stream không hợp lệ.');
        if (event.type === 'done') {
          if (event.response_id !== undefined && event.response_id !== active) continue;
          result = event.turn;
        }
        onEvent(event);
      }
      if (result) break;
    }
    if (signal.aborted) throw signal.reason;
    if (expired) throw new Error('AI phản hồi quá lâu. Hãy tải lại tin nhắn.');
    if (!result) throw new Error('Luồng AI bị ngắt trước khi hoàn tất.');
    return result;
  } finally {
    window.clearTimeout(timeout);
    clearTimeout(idle!);
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
