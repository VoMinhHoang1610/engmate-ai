import { apiFetch } from '../api/database';
import { readJSON } from '../api/readJSON';
import type {
  VocabularyAction,
  VocabularyCatalog,
  VocabularyStates,
  VocabularyTopic,
} from './types';

export class VocabularyError extends Error {
  constructor(
    message: string,
    readonly code: 'unavailable' | 'not_installed' | 'conflict' | 'session' = 'unavailable',
  ) {
    super(message);
  }
}

async function request<T>(path: string, signal: AbortSignal, method = 'GET', body?: unknown) {
  const response = await apiFetch(`/api/vocabulary${path}`, {
    method,
    signal,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (response.status === 401)
    throw new VocabularyError('Vui lòng đăng nhập lại để lưu từ vựng.', 'session');
  if (response.status === 409)
    throw new VocabularyError(
      'Trạng thái đã thay đổi. Tải lại dữ liệu rồi chọn lại; chưa ghi đè lựa chọn mới hơn.',
      'conflict',
    );
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      detail?: { code?: string };
    } | null;
    if (data?.detail?.code === 'vocabulary_not_installed')
      throw new VocabularyError(
        'Lưu từ vựng chưa cài đặt. Bạn vẫn có thể đọc và ôn các chủ đề có sẵn.',
        'not_installed',
      );
    if (data?.detail?.code === 'vocabulary_mysql_required')
      throw new VocabularyError('Lưu từ vựng cần MySQL; nội dung có sẵn vẫn đọc được.');
    throw new VocabularyError('Chưa tải hoặc lưu được từ vựng. Kiểm tra kết nối và thử lại.');
  }
  return readJSON<T>(response, signal);
}

export const getVocabularyCatalog = (signal: AbortSignal) =>
  request<VocabularyCatalog>('/topics', signal);
export const getVocabularyTopic = (id: string, signal: AbortSignal) =>
  request<VocabularyTopic>(`/topics/${encodeURIComponent(id)}`, signal);
export const getVocabularyStates = (signal: AbortSignal) =>
  request<VocabularyStates>('/me/states', signal);
export const writeVocabulary = (action: VocabularyAction, signal: AbortSignal) =>
  action.kind === 'import'
    ? request('/me/import-legacy', signal, 'POST', action.body)
    : request(
        `/topics/${encodeURIComponent(action.topicId)}/words/${encodeURIComponent(action.wordId)}/state`,
        signal,
        'PUT',
        action.body,
      );
