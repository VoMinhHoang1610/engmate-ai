import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelVocabularyGeneration,
  deleteCustomTopic,
  getCustomTopics,
  getVocabularyGeneration,
  startVocabularyGeneration,
  VocabularyError,
  type VocabularyErrorCode,
} from './api';
import { jobErrorMessage } from './generationMessages';
import type { CustomTopicSummary, GenerationJob, VocabularyUsage } from './types';

const terminal = new Set<GenerationJob['status']>(['completed', 'failed', 'cancelled', 'deleted']);

interface Snapshot {
  owner: string;
  topics: CustomTopicSummary[];
  usage: VocabularyUsage | null;
  activeJob: GenerationJob | null;
  loading: boolean;
  error: string;
  errorCode: VocabularyErrorCode | '';
  notice: string;
  completedTopicId: string | null;
}

const initialSnapshot = (owner: string): Snapshot => ({
  owner,
  topics: [],
  usage: null,
  activeJob: null,
  loading: true,
  error: '',
  errorCode: '',
  notice: '',
  completedTopicId: null,
});

export function useVocabularyGeneration(username: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => initialSnapshot(username));
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const owner = useRef(username);
  owner.current = username;
  const snapshotOwner = useRef(username);
  const epoch = useRef(0);
  const pollTimer = useRef<number | null>(null);
  const pollController = useRef<AbortController | null>(null);
  const pollAttempt = useRef(0);
  const job = useRef<GenerationJob | null>(null);
  const action = useRef<AbortController | null>(null);
  const pollOnceRef = useRef<(next: GenerationJob, attempt: number, epoch: number) => void>(
    () => undefined,
  );
  const current = snapshot.owner === username;

  const clearPoll = useCallback(() => {
    if (pollTimer.current !== null) window.clearTimeout(pollTimer.current);
    pollTimer.current = null;
    pollController.current?.abort();
    pollController.current = null;
  }, []);

  const applyJob = useCallback((next: GenerationJob) => {
    job.current = next;
    setSnapshot((previous) =>
      previous.owner === owner.current ? { ...previous, activeJob: next } : previous,
    );
  }, []);

  const schedulePoll = useCallback(
    (next: GenerationJob, attempt: number) => {
      clearPoll();
      if (terminal.has(next.status)) return;
      const currentEpoch = epoch.current;
      const delay = attempt < 3 ? Math.max(1000, next.poll_after_ms || 2000) : 5000;
      pollAttempt.current = attempt;
      pollTimer.current = window.setTimeout(() => {
        pollTimer.current = null;
        pollOnceRef.current(next, attempt, currentEpoch);
      }, delay);
    },
    [clearPoll],
  );

  const finish = useCallback((next: GenerationJob) => {
    if (next.status === 'completed' && next.topic_id) {
      setSnapshot((previous) =>
        previous.owner === owner.current
          ? {
              ...previous,
              error: '',
              errorCode: '',
              notice: 'Đã tạo chủ đề AI. Nội dung do AI tạo, chưa được chuyên gia thẩm định.',
              completedTopicId: next.topic_id,
            }
          : previous,
      );
      setRevision((value) => value + 1);
      return;
    }
    if (next.status === 'failed') {
      const message = jobErrorMessage(next.error_code);
      setSnapshot((previous) =>
        previous.owner === owner.current
          ? { ...previous, error: message, errorCode: '', notice: '' }
          : previous,
      );
      setRevision((value) => value + 1);
      return;
    }
    if (next.status === 'cancelled' || next.status === 'deleted') {
      setSnapshot((previous) =>
        previous.owner === owner.current
          ? { ...previous, error: '', errorCode: '', notice: 'Đã hủy; không có chủ đề mới.' }
          : previous,
      );
      setRevision((value) => value + 1);
    }
  }, []);

  pollOnceRef.current = (next: GenerationJob, attempt: number, currentEpoch: number) => {
    void (async () => {
      if (currentEpoch !== epoch.current || terminal.has(next.status)) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const controller = new AbortController();
      pollController.current = controller;
      try {
        const currentJob = await getVocabularyGeneration(next.request_id, controller.signal);
        if (controller.signal.aborted || currentEpoch !== epoch.current) return;
        pollController.current = null;
        applyJob(currentJob);
        if (terminal.has(currentJob.status)) finish(currentJob);
        else schedulePoll(currentJob, attempt + 1);
      } catch (reason) {
        if (controller.signal.aborted || currentEpoch !== epoch.current) return;
        pollController.current = null;
        if (
          reason instanceof VocabularyError &&
          (reason.code === 'session' || reason.code === 'not_found')
        ) {
          setSnapshot((previous) =>
            previous.owner === owner.current
              ? { ...previous, error: reason.message, errorCode: reason.code, notice: '' }
              : previous,
          );
          return;
        }
        if (attempt < 3) {
          schedulePoll(next, attempt + 1);
          return;
        }
        setSnapshot((previous) =>
          previous.owner === owner.current
            ? {
                ...previous,
                error: 'Mất kết nối khi theo dõi tiến trình. Hãy tải lại danh sách chủ đề.',
                errorCode: 'unavailable',
                notice: '',
              }
            : previous,
        );
      }
    })();
  };

  useEffect(() => {
    const controller = new AbortController();
    const changedOwner = snapshotOwner.current !== username;
    snapshotOwner.current = username;
    epoch.current += 1;
    action.current?.abort();
    action.current = null;
    clearPoll();
    setBusy(false);
    if (changedOwner) {
      job.current = null;
      setSnapshot(initialSnapshot(username));
    }
    void getCustomTopics(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const active = data.active_jobs[0] ?? null;
        setSnapshot((previous) =>
          previous.owner === username
            ? {
                ...previous,
                topics: data.topics,
                usage: data.usage,
                activeJob: active ?? previous.activeJob,
                loading: false,
                error: '',
                errorCode: '',
              }
            : previous,
        );
        if (active) schedulePoll(active, 0);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const code = reason instanceof VocabularyError ? reason.code : 'unavailable';
        const message =
          code === 'not_installed'
            ? 'Tạo chủ đề AI chưa được cài đặt trên máy chủ này. Bạn vẫn đọc và ôn các chủ đề có sẵn.'
            : reason instanceof VocabularyError
              ? reason.message
              : 'Chưa tải được chủ đề của bạn. Hãy thử lại.';
        setSnapshot((previous) =>
          previous.owner === username
            ? {
                ...previous,
                loading: false,
                error: message,
                errorCode: code,
              }
            : previous,
        );
      });
    return () => controller.abort();
  }, [username, revision, clearPoll, schedulePoll]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        clearPoll();
        return;
      }
      const active = job.current;
      if (active && !terminal.has(active.status)) schedulePoll(active, pollAttempt.current);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [clearPoll, schedulePoll]);

  useEffect(
    () => () => {
      epoch.current += 1;
      action.current?.abort();
      clearPoll();
    },
    [clearPoll],
  );

  async function create(topic: string, target: 30 | 60) {
    if (busy || !current) return false;
    const controller = new AbortController();
    action.current?.abort();
    action.current = controller;
    clearPoll();
    setBusy(true);
    setSnapshot((previous) =>
      previous.owner === username
        ? { ...previous, error: '', errorCode: '', notice: '' }
        : previous,
    );
    try {
      const started = await startVocabularyGeneration(
        { client_request_id: crypto.randomUUID(), topic: topic.trim(), target_count: target },
        controller.signal,
      );
      if (controller.signal.aborted || owner.current !== username) return false;
      applyJob(started);
      if (terminal.has(started.status)) {
        finish(started);
        return true;
      }
      schedulePoll(started, 0);
      return true;
    } catch (reason) {
      if (!controller.signal.aborted && owner.current === username) {
        setSnapshot((previous) =>
          previous.owner === username
            ? {
                ...previous,
                error:
                  reason instanceof VocabularyError
                    ? reason.message
                    : 'Chưa gửi được yêu cầu tạo chủ đề. Kiểm tra kết nối và thử lại.',
                errorCode: reason instanceof VocabularyError ? reason.code : 'unavailable',
                notice: '',
              }
            : previous,
        );
      }
      return false;
    } finally {
      if (action.current === controller) {
        action.current = null;
        setBusy(false);
      }
    }
  }

  async function cancel(requestId: string) {
    const controller = new AbortController();
    action.current?.abort();
    action.current = controller;
    setBusy(true);
    try {
      const cancelled = await cancelVocabularyGeneration(requestId, controller.signal);
      if (controller.signal.aborted || owner.current !== username) return false;
      clearPoll();
      applyJob(cancelled);
      setSnapshot((previous) =>
        previous.owner === username
          ? {
              ...previous,
              error: '',
              errorCode: '',
              notice:
                cancelled.status === 'cancelled'
                  ? 'Đã hủy; không có chủ đề mới.'
                  : 'Job đã kết thúc trước khi hủy.',
            }
          : previous,
      );
      setRevision((value) => value + 1);
      return true;
    } catch (reason) {
      if (!controller.signal.aborted && owner.current === username) {
        setSnapshot((previous) =>
          previous.owner === username
            ? {
                ...previous,
                error:
                  reason instanceof VocabularyError
                    ? reason.message
                    : 'Chưa hủy được job. Hãy thử lại.',
                errorCode: reason instanceof VocabularyError ? reason.code : 'unavailable',
                notice: '',
              }
            : previous,
        );
      }
      return false;
    } finally {
      if (action.current === controller) {
        action.current = null;
        setBusy(false);
      }
    }
  }

  async function remove(topicId: string) {
    const controller = new AbortController();
    action.current?.abort();
    action.current = controller;
    setBusy(true);
    try {
      await deleteCustomTopic(topicId, controller.signal);
      if (controller.signal.aborted || owner.current !== username) return false;
      setSnapshot((previous) =>
        previous.owner === username
          ? {
              ...previous,
              topics: previous.topics.filter((topic) => topic.topic_id !== topicId),
              notice: 'Đã xóa chủ đề khỏi tài khoản.',
              error: '',
              errorCode: '',
            }
          : previous,
      );
      setRevision((value) => value + 1);
      return true;
    } catch (reason) {
      if (!controller.signal.aborted && owner.current === username) {
        setSnapshot((previous) =>
          previous.owner === username
            ? {
                ...previous,
                error:
                  reason instanceof VocabularyError
                    ? reason.message
                    : 'Chưa xóa được chủ đề. Hãy thử lại.',
                errorCode: reason instanceof VocabularyError ? reason.code : 'unavailable',
                notice: '',
              }
            : previous,
        );
      }
      return false;
    } finally {
      if (action.current === controller) {
        action.current = null;
        setBusy(false);
      }
    }
  }

  function reload() {
    setSnapshot((previous) =>
      previous.owner === username
        ? { ...previous, loading: true, error: '', errorCode: '' }
        : previous,
    );
    setRevision((value) => value + 1);
  }

  return {
    topics: current ? snapshot.topics : [],
    usage: current ? snapshot.usage : null,
    job: current ? snapshot.activeJob : null,
    loading: current ? snapshot.loading : true,
    error: current ? snapshot.error : '',
    errorCode: current ? snapshot.errorCode : ('' as const),
    notice: current ? snapshot.notice : '',
    completedTopicId: current ? snapshot.completedTopicId : null,
    busy: current && busy,
    unavailable: current && snapshot.errorCode === 'not_installed',
    create,
    cancel,
    remove,
    reload,
    acknowledgeCompleted: () =>
      setSnapshot((previous) => ({ ...previous, completedTopicId: null })),
  };
}

export type VocabularyGenerationController = ReturnType<typeof useVocabularyGeneration>;
