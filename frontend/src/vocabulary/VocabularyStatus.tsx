import type { VocabularyStateController } from './useVocabularyState';

export function VocabularyStatus({ state }: { state: VocabularyStateController }) {
  return (
    <div className="vocabulary-status">
      <p role="status">
        {state.error ||
          (!state.data
            ? 'Đang tải dấu nhớ trên tài khoản…'
            : state.busy
              ? 'Đang lưu dấu nhớ…'
              : state.notice)}
      </p>
      {state.error && (
        <button className="tutor-button" onClick={state.reload}>
          Thử tải lại dấu nhớ
        </button>
      )}
      {state.pending && !state.busy && (
        <div className="vocabulary-actions">
          <button className="tutor-button" onClick={state.retry}>
            Thử lại cùng yêu cầu
          </button>
          <button className="tutor-button" onClick={state.reload}>
            Tải lại trạng thái
          </button>
        </div>
      )}
    </div>
  );
}

export function VocabularySummary({ state }: { state: VocabularyStateController }) {
  const authored = state.data?.states.filter(
    (word) => word.remembered && !word.topic_id.startsWith('legacy-'),
  ).length;
  return (
    <section className="tutor-card vocabulary-account-summary" aria-label="Từ vựng trên tài khoản">
      <h2>Từ vựng trên tài khoản</h2>
      <p>
        {authored === undefined
          ? 'Chưa có số liệu đã nhớ.'
          : `${authored} từ trong chủ đề mới đã tự đánh dấu nhớ.`}
      </p>
      <small>Tự đánh giá, riêng với cụm giao tiếp cũ và kết quả TOEIC.</small>
      <VocabularyStatus state={state} />
    </section>
  );
}
