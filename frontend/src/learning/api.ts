import { useEffect, useState } from 'react';
import { apiFetch } from '../api/database';
import { readJSON } from '../api/readJSON';
import { Resource } from '../api/resource';
import type {
  CheckResult,
  LearningCatalog,
  LearningPlan,
  LearningProgress,
  LessonProgress,
  LessonStart,
} from './types';

export class LearningConflictError extends Error {}

async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
  const response = await apiFetch(`/api/learning${path}`, {
    method,
    signal,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (response.status === 409)
    throw new LearningConflictError(
      'Dữ liệu đã thay đổi. Cập nhật dữ liệu mới rồi thử lại; lựa chọn của bạn vẫn được giữ.',
    );
  if (response.status === 401) throw new Error('Vui lòng đăng nhập lại để mở lộ trình.');
  if (response.status === 422)
    throw new Error('Thông tin chưa hợp lệ. Kiểm tra lựa chọn và các câu trả lời rồi thử lại.');
  if (response.status === 429)
    throw new Error('Bạn thao tác quá nhanh. Hãy chờ một chút rồi thử lại.');
  if (!response.ok)
    throw new Error(
      'Chưa kết nối được với lộ trình học. Hãy thử lại; nội dung đã nhập vẫn được giữ.',
    );
  return await readJSON<T>(response, signal);
}

const catalog = new Resource(
  (signal) => request<LearningCatalog>('/catalog', 'GET', undefined, signal),
  300000,
);
export const getLearningCatalog = (signal?: AbortSignal) => catalog.get(signal);
export const getLearningPlan = (signal?: AbortSignal) =>
  request<LearningPlan>('/plan', 'GET', undefined, signal);
export const getLearningProgress = (signal?: AbortSignal) =>
  request<LearningProgress>('/progress', 'GET', undefined, signal);
export const saveLearningPlan = (plan: LearningPlan, signal?: AbortSignal) =>
  request<LearningPlan>('/plan', 'PUT', plan, signal);
export const startLearningLesson = (id: string, requestId: string, signal?: AbortSignal) =>
  request<LessonStart>(
    `/lessons/${encodeURIComponent(id)}/start`,
    'POST',
    {
      client_request_id: requestId,
    },
    signal,
  );
export const setLearningPhase = (
  id: string,
  phase: number,
  conversationId: number,
  signal?: AbortSignal,
) =>
  request<LessonProgress>(
    `/lessons/${encodeURIComponent(id)}/phase`,
    'PUT',
    {
      phase,
      conversation_id: conversationId,
    },
    signal,
  );
export const submitLearningCheck = (
  id: string,
  requestId: string,
  answers: { question_id: string; choice: number }[],
  signal?: AbortSignal,
) =>
  request<CheckResult>(
    `/lessons/${encodeURIComponent(id)}/check`,
    'POST',
    {
      client_request_id: requestId,
      answers,
    },
    signal,
  );

export function useLearningRoadmap() {
  const [data, setData] = useState<{
    catalog: LearningCatalog;
    plan: LearningPlan;
    progress: LearningProgress;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      getLearningCatalog(controller.signal),
      getLearningPlan(controller.signal),
      getLearningProgress(controller.signal),
    ])
      .then(([catalog, plan, progress]) => {
        if (!controller.signal.aborted) {
          setData({ catalog, plan, progress });
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Chưa tải được lộ trình.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  function reload() {
    catalog.clear();
    setLoading(true);
    setError('');
    setRevision((old) => old + 1);
  }
  return { data, error, loading, reload };
}
