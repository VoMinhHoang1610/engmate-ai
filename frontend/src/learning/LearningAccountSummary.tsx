import { getLearningPlan, getLearningProgress, useLearningQuery } from './api';

/** Account-backed TOEIC values, separate from locally self-reported practice. */
export function LearningAccountSummary({ onPlan }: { onPlan?: () => void }) {
  const plan = useLearningQuery(getLearningPlan);
  const progress = useLearningQuery(getLearningProgress);
  return (
    <section className="tutor-card learning-account-summary">
      <h2>Kế hoạch & tiến độ TOEIC</h2>
      <p>Dữ liệu lưu theo tài khoản, cùng nguồn với Lộ trình và Tiến độ.</p>
      {plan.loading ? (
        <p role="status">Đang tải kế hoạch TOEIC…</p>
      ) : plan.error ? (
        <p role="alert">
          {plan.error}{' '}
          <button className="text-button" onClick={plan.reload}>
            Tải lại kế hoạch
          </button>
        </p>
      ) : (
        plan.data && (
          <p>
            Mục tiêu {plan.data.goal_score} điểm · {plan.data.minutes} phút học TOEIC/ngày
          </p>
        )
      )}
      {progress.loading ? (
        <p role="status">Đang tải kết quả TOEIC…</p>
      ) : progress.error ? (
        <p role="alert">
          {progress.error}{' '}
          <button className="text-button" onClick={progress.reload}>
            Tải lại kết quả
          </button>
        </p>
      ) : (
        progress.data && (
          <p>
            {progress.data.lessons.filter((row) => row.completed).length} bài TOEIC đã hoàn thành ·{' '}
            {progress.data.review_lesson_ids.length} bài đến lịch ôn
          </p>
        )
      )}
      {onPlan && (
        <button className="tutor-button" onClick={onPlan}>
          Điều chỉnh kế hoạch TOEIC
        </button>
      )}
    </section>
  );
}
