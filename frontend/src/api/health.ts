import type { HealthResponse } from '../types/api';

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal });
  if (!response.ok) throw new Error(`Backend trả lỗi HTTP ${response.status}.`);
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok' ||
    !('service' in data) ||
    data.service !== 'engmate-ai'
  )
    throw new Error('Phản hồi backend không đúng định dạng.');
  return { status: data.status, service: data.service };
}
