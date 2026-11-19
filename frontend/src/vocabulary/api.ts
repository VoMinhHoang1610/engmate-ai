import { apiFetch } from '../api/database';
import { readJSON } from '../api/readJSON';
import type {
  CustomTopicDetail,
  CustomTopicsResponse,
  GenerationCreate,
  GenerationJob,
  VocabularyAction,
  VocabularyCatalog,
  VocabularyStates,
  VocabularyTopic,
} from './types';

export type VocabularyErrorCode =
  | 'unavailable'
  | 'not_installed'
  | 'conflict'
  | 'session'
  | 'quota'
  | 'rate_limited'
  | 'too_many_jobs'
  | 'token_cap'
  | 'provider_not_configured'
  | 'unsupported'
  | 'not_found';

export class VocabularyError extends Error {
  constructor(
    message: string,
    readonly code: VocabularyErrorCode = 'unavailable',
  ) {
    super(message);
  }
}

const errorMessages: Record<VocabularyErrorCode, string> = {
  unavailable: 'Chưa tải hoặc lưu được từ vựng. Kiểm tra kết nối và thử lại.',
  not_installed: 'Lưu từ vựng chưa cài đặt. Bạn vẫn có thể đọc và ôn các chủ đề có sẵn.',
  conflict: 'Trạng thái đã thay đổi. Tải lại dữ liệu rồi chọn lại; chưa ghi đè lựa chọn mới hơn.',
  session: 'Vui lòng đăng nhập lại để dùng từ vựng.',
  quota: 'Bạn đã dùng hết lượt tạo chủ đề AI hôm nay.',
  rate_limited: 'Bạn vừa tạo quá nhanh. Chờ khoảng một phút rồi thử lại.',
  too_many_jobs: 'Đang có một chủ đề khác được tạo. Hãy đợi hoặc hủy job đang chạy.',
  token_cap:
    'Máy chủ AI đang cho phép phản hồi quá dài nên chưa thể tạo từ vựng. Quản trị viên cần hạ giới hạn token đầu ra xuống 2.048.',
  provider_not_configured: 'Máy chủ chưa cấu hình AI cho từ vựng. Hãy báo quản trị viên.',
  unsupported: 'Máy chủ chưa hỗ trợ cấu hình tạo chủ đề này.',
  not_found: 'Không tìm thấy chủ đề này. Có thể chủ đề đã bị xóa.',
};

const detailCodes: Record<string, VocabularyErrorCode> = {
  vocabulary_not_installed: 'not_installed',
  vocabulary_quota_exhausted: 'quota',
  vocabulary_start_rate_limited: 'rate_limited',
  vocabulary_too_many_jobs: 'too_many_jobs',
  vocabulary_token_cap_unsupported: 'token_cap',
  vocabulary_provider_not_configured: 'provider_not_configured',
  vocabulary_target_unsupported: 'unsupported',
};

function responseCode(status: number, detailCode: string | undefined): VocabularyErrorCode {
  if (detailCode && detailCodes[detailCode]) return detailCodes[detailCode];
  if (status === 401) return 'session';
  if (status === 409) return 'conflict';
  if (status === 404) return 'not_found';
  return 'unavailable';
}

async function request<T>(path: string, signal: AbortSignal, method = 'GET', body?: unknown) {
  const response = await apiFetch(`/api/vocabulary${path}`, {
    method,
    signal,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      detail?: { code?: string } | string;
    } | null;
    const detail = data?.detail;
    const detailCode = typeof detail === 'object' ? detail?.code : undefined;
    const code = responseCode(response.status, detailCode);
    throw new VocabularyError(errorMessages[code], code);
  }
  if (response.status === 204) return undefined as T;
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

export const startVocabularyGeneration = (body: GenerationCreate, signal: AbortSignal) =>
  request<GenerationJob>('/generations', signal, 'POST', body);
export const getVocabularyGeneration = (requestId: string, signal: AbortSignal) =>
  request<GenerationJob>(`/generations/${encodeURIComponent(requestId)}`, signal);
export const cancelVocabularyGeneration = (requestId: string, signal: AbortSignal) =>
  request<GenerationJob>(`/generations/${encodeURIComponent(requestId)}/cancel`, signal, 'POST');
export const getCustomTopics = (signal: AbortSignal) =>
  request<CustomTopicsResponse>('/me/topics', signal);
export const getCustomTopic = (topicId: string, signal: AbortSignal) =>
  request<CustomTopicDetail>(`/me/topics/${encodeURIComponent(topicId)}`, signal);
export const deleteCustomTopic = (topicId: string, signal: AbortSignal) =>
  request<void>(`/me/topics/${encodeURIComponent(topicId)}`, signal, 'DELETE');
