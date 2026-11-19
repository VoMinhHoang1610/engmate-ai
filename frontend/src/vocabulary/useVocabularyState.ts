import { useEffect, useRef, useState } from 'react';
import { getVocabularyStates, VocabularyError, writeVocabulary } from './api';
import type { VocabularyAction, VocabularyStates } from './types';
import { useVocabularyGeneration } from './useVocabularyGeneration';

export function useVocabularyState(username: string) {
  const generation = useVocabularyGeneration(username);
  const [snapshot, setSnapshot] = useState<{
    owner: string;
    data: VocabularyStates | null;
    error: string;
    loading: boolean;
  }>({ owner: username, data: null, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<VocabularyAction | null>(null);
  const lifecycle = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const owner = useRef(username);
  const current = snapshot.owner === username;
  const data = current && !snapshot.loading && !snapshot.error ? snapshot.data : null;
  const error = current ? snapshot.error : '';

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    const changedOwner = owner.current !== username;
    owner.current = username;
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        lock.current = false;
        setBusy(false);
        setPending(null);
        if (changedOwner) setNotice('');
      }
    });
    void getVocabularyStates(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted)
          setSnapshot({ owner: username, data: value, error: '', loading: false });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setSnapshot((previous) => ({
            owner: username,
            data: previous.owner === username ? previous.data : null,
            loading: false,
            error:
              reason instanceof VocabularyError
                ? reason.message
                : 'Chưa tải được dấu nhớ trên tài khoản. Hãy thử lại.',
          }));
      });
    return () => controller.abort();
  }, [username, revision]);

  function reload() {
    lifecycle.current?.abort();
    lock.current = false;
    setBusy(false);
    setPending(null);
    setSnapshot((previous) => ({
      owner: username,
      data: previous.owner === username ? previous.data : null,
      error: '',
      loading: true,
    }));
    setRevision((value) => value + 1);
  }

  async function perform(action: VocabularyAction) {
    const controller = lifecycle.current;
    if (!controller || controller.signal.aborted || lock.current || !data) return;
    lock.current = true;
    setBusy(true);
    setNotice('');
    setPending(action);
    try {
      await writeVocabulary(action, controller.signal);
      const next = await getVocabularyStates(controller.signal);
      if (!controller.signal.aborted) {
        setSnapshot({ owner: username, data: next, error: '', loading: false });
        setPending(null);
        setNotice(
          action.kind === 'import'
            ? 'Đã chuyển dấu nhớ; dữ liệu cũ vẫn được giữ.'
            : 'Đã lưu vào tài khoản.',
        );
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        const message =
          reason instanceof VocabularyError
            ? reason.message
            : 'Chưa xác nhận được kết quả lưu. Thử lại cùng yêu cầu hoặc tải lại trạng thái.';
        setNotice(message);
        if (reason instanceof VocabularyError && reason.code === 'conflict') {
          reload();
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        lock.current = false;
        setBusy(false);
      }
    }
  }

  function save(topicId: string, wordId: string, remembered: boolean) {
    if (pending || !data) return;
    const previous = data.states.find((row) => row.topic_id === topicId && row.word_id === wordId);
    void perform({
      kind: 'state',
      topicId,
      wordId,
      body: { client_request_id: crypto.randomUUID(), remembered, version: previous?.version ?? 0 },
    });
  }

  return {
    data,
    lastData: current ? snapshot.data : null,
    error,
    busy: current && busy,
    notice: current ? notice : '',
    pending: current ? pending : null,
    generation,
    reload,
    save,
    retry: () => {
      if (pending) void perform(pending);
    },
    importLegacy: (keys: string[]) => {
      if (!pending)
        void perform({
          kind: 'import',
          body: { client_request_id: crypto.randomUUID(), remembered_keys: keys },
        });
    },
  };
}

export type VocabularyStateController = ReturnType<typeof useVocabularyState>;
