import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Conversation } from '../types';
import {
  getLearningPlan,
  getLearningProgress,
  LearningConflictError,
  saveLearningPlan,
  startLearningLesson,
  useLearningRoadmap,
} from './api';
import type {
  LearningCatalog,
  LearningLesson,
  LearningPlan,
  LearningProgress,
  LessonProgress,
} from './types';
import './learning.css';

interface Props {
  onStudy: (lesson: LearningLesson, conversation: Conversation, progress: LessonProgress) => void;
  progressOnly?: boolean;
}
const lastStageForGoal: Record<number, number> = { 450: 1, 650: 2, 800: 3, 900: 4, 990: 4 };

export function RoadmapPage({ onStudy, progressOnly = false }: Props) {
  const state = useLearningRoadmap();
  return (
    <section className="tutor-page learning-page" aria-labelledby="roadmap-title">
      <header className="tutor-page-heading">
        <p className="eyebrow">MỖI NGÀY MỘT BƯỚC CÙNG MATE</p>
        <h1 id="roadmap-title">
          {progressOnly ? 'Tiến độ học TOEIC' : 'Lộ trình TOEIC bằng giọng nói'}
        </h1>
        <p>Nghe Mate giảng, trả lời bằng giọng nói, luyện tình huống và ôn lại điều đã học.</p>
      </header>
      {state.loading && <p role="status">Đang mở lộ trình của bạn…</p>}
      {state.error && (
        <div className="learning-message" role="alert">
          <p>{state.error}</p>
          <button className="tutor-button" onClick={state.reload}>
            Tải lại lộ trình
          </button>
        </div>
      )}
      {!state.loading && !state.error && state.data && (
        <RoadmapContent
          catalog={state.data.catalog}
          plan={state.data.plan}
          progress={state.data.progress}
          onStudy={onStudy}
          progressOnly={progressOnly}
        />
      )}
    </section>
  );
}

function RoadmapContent({
  catalog,
  plan,
  progress: initialProgress,
  onStudy,
  progressOnly,
}: Props & {
  catalog: LearningCatalog;
  plan: LearningPlan;
  progress: LearningProgress;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const allLessons = catalog.stages.flatMap((stage) =>
    stage.modules.flatMap((module) => module.lessons),
  );
  const recommended = allLessons.find((lesson) => lesson.id === progress.recommended_lesson_id);
  const initialStage =
    catalog.stages.find((stage) =>
      stage.modules.some((module) =>
        module.lessons.some((lesson) => lesson.id === recommended?.id),
      ),
    )?.id ?? plan.start_stage;
  const [stageId, setStageId] = useState(initialStage);
  const [selectedId, setSelectedId] = useState(
    recommended?.id ??
      catalog.stages.find((row) => row.id === initialStage)?.modules[0]?.lessons[0]?.id ??
      allLessons[0]?.id ??
      '',
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const starts = useRef(new Map<string, string>());
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const stage = catalog.stages.find((row) => row.id === stageId) ?? catalog.stages[0];
  const selected = allLessons.find((row) => row.id === selectedId);
  const savedProgress = progress.lessons.find((row) => row.lesson_id === selectedId);
  const completeIds = new Set(
    progress.lessons.filter((row) => row.completed).map((row) => row.lesson_id),
  );
  const completeCount = allLessons.filter((row) => completeIds.has(row.id)).length;
  const reviews = allLessons.filter((row) => progress.review_lesson_ids.includes(row.id));

  function selectLesson(lesson: LearningLesson) {
    if (starting) return;
    const owner = catalog.stages.find((row) =>
      row.modules.some((module) => module.lessons.some((item) => item.id === lesson.id)),
    );
    if (owner) setStageId(owner.id);
    setSelectedId(lesson.id);
    setError('');
  }

  async function study() {
    if (!selected || starting) return;
    setStarting(true);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    const requestId = starts.current.get(selected.id) ?? crypto.randomUUID();
    starts.current.set(selected.id, requestId);
    try {
      const result = await startLearningLesson(selected.id, requestId, controller.signal);
      if (!controller.signal.aborted) onStudy(selected, result.conversation, result.progress);
    } catch (e: unknown) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Chưa mở được bài học.');
    } finally {
      if (!controller.signal.aborted) setStarting(false);
    }
  }

  function planSaved() {
    const controller = new AbortController();
    abort.current = controller;
    void getLearningProgress(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setProgress(next);
        const lesson = allLessons.find((row) => row.id === next.recommended_lesson_id);
        if (lesson) selectLesson(lesson);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Đã lưu mục tiêu, chưa tải được gợi ý mới.');
      });
  }

  return (
    <>
      <div className="learning-overview">
        <div>
          <strong>
            {completeCount}
            <span> / {allLessons.length}</span>
          </strong>
          <p>Bài đã hoàn thành</p>
        </div>
        <div>
          <strong>{catalog.stages.length}</strong>
          <p>Chặng từ nền tảng đến nâng cao</p>
        </div>
        <div>
          <strong>{reviews.length}</strong>
          <p>Bài đến lịch ôn</p>
        </div>
        <div className="learning-overview-note">
          Giọng nói là cách học chính. Bài đọc và câu kiểm tra giúp bạn vận dụng kỹ năng Listening &
          Reading.
        </div>
      </div>

      <details className="learning-card learning-plan">
        <summary>
          Mục tiêu & thời gian học <span>Điều chỉnh lộ trình của bạn</span>
        </summary>
        <PlanForm plan={plan} catalog={catalog} onSaved={planSaved} />
      </details>

      {(recommended || reviews.length > 0) && (
        <div className="learning-suggestions">
          {recommended && (
            <button
              className="learning-next learning-card"
              onClick={() => selectLesson(recommended)}
              disabled={starting}
            >
              <span className="eyebrow">BƯỚC TIẾP THEO</span>
              <strong>{recommended.title}</strong>
              <span>{recommended.minutes} phút · Mở nội dung bài →</span>
            </button>
          )}
          {reviews.length > 0 && (
            <div className="learning-card learning-review-list">
              <p className="eyebrow">ĐẾN LÚC ÔN LẠI</p>
              {reviews.slice(0, 3).map((lesson) => (
                <button key={lesson.id} onClick={() => selectLesson(lesson)} disabled={starting}>
                  {lesson.title} <span>→</span>
                </button>
              ))}
              {reviews.length > 3 && <p>Còn {reviews.length - 3} bài ôn trong lộ trình.</p>}
            </div>
          )}
        </div>
      )}
      {!progress.recommended_lesson_id && (
        <p className="learning-message learning-success" role="status">
          Bạn đã hoàn thành các bài thuộc mục tiêu khóa học đã chọn. Bạn có thể ôn lại hoặc đặt mục
          tiêu học tiếp. Kết quả này không xác nhận bạn đã đạt điểm TOEIC mục tiêu.
        </p>
      )}

      {progressOnly && (
        <section
          className="learning-card learning-evidence"
          aria-labelledby="learning-evidence-title"
        >
          <h2 id="learning-evidence-title">Kết quả đã ghi nhận</h2>
          <p className="learning-fine-print">
            Số lượt là lượt trả lời thực tế trong hội thoại bài học. Câu đúng là kết quả kiểm tra
            kiến thức, không quy đổi thành điểm TOEIC.
          </p>
          {progress.lessons.length === 0 ? (
            <p>Bạn chưa bắt đầu bài TOEIC nào. Chọn bài bên dưới để học cùng Mate.</p>
          ) : (
            <ul>
              {progress.lessons.map((row) => {
                const lesson = allLessons.find((item) => item.id === row.lesson_id);
                if (!lesson) return null;
                return (
                  <li key={row.lesson_id}>
                    <button onClick={() => selectLesson(lesson)}>
                      <strong>{lesson.title}</strong>
                      <span>
                        {row.practice_turns} lượt luyện ·{' '}
                        {row.check_total
                          ? `${row.check_correct}/${row.check_total} câu đúng`
                          : 'Chưa kiểm tra'}{' '}
                        · {row.completed ? 'Đã hoàn thành' : 'Đang học'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <nav className="learning-stages" aria-label="Chặng học TOEIC">
        {catalog.stages.map((row, index) => {
          const rows = row.modules.flatMap((module) => module.lessons);
          const count = rows.filter((lesson) => completeIds.has(lesson.id)).length;
          return (
            <button
              key={row.id}
              type="button"
              aria-pressed={stage?.id === row.id}
              disabled={starting}
              onClick={() => {
                setStageId(row.id);
                setSelectedId(row.modules[0]?.lessons[0]?.id ?? '');
                setError('');
              }}
            >
              <span className="learning-stage-number">{String(index + 1).padStart(2, '0')}</span>
              <strong>{row.title}</strong>
              <span>{row.target}</span>
              <small>
                {count}/{rows.length} bài
              </small>
            </button>
          );
        })}
      </nav>

      {stage && (
        <div className="learning-roadmap-grid">
          <div className="learning-modules">
            <header className="learning-stage-intro">
              <p className="eyebrow">{stage.target}</p>
              <h2>{stage.title}</h2>
              <p>{stage.description}</p>
            </header>
            {stage.modules.map((module, index) => (
              <details
                key={module.id}
                className="learning-card learning-module"
                open={module.lessons.some((lesson) => lesson.id === selectedId) || undefined}
              >
                <summary>
                  <span className="learning-module-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <strong>{module.title}</strong>
                    <small>
                      {module.parts.length
                        ? `Part ${module.parts.join(' · ')}`
                        : 'Kỹ năng nền tảng'}{' '}
                      · {module.lessons.length} bài nhỏ
                    </small>
                  </span>
                  <span aria-hidden="true">⌄</span>
                </summary>
                <ol>
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.id}>
                      <button
                        className="learning-lesson-row"
                        aria-current={selectedId === lesson.id ? 'step' : undefined}
                        onClick={() => selectLesson(lesson)}
                        disabled={starting}
                      >
                        <span
                          className={
                            completeIds.has(lesson.id)
                              ? 'learning-lesson-mark complete'
                              : 'learning-lesson-mark'
                          }
                          aria-hidden="true"
                        >
                          {completeIds.has(lesson.id) ? '✓' : lessonIndex + 1}
                        </span>
                        <span>
                          <strong>{lesson.title}</strong>
                          <small>
                            {lesson.minutes} phút ·{' '}
                            {completeIds.has(lesson.id)
                              ? 'Đã hoàn thành'
                              : progress.review_lesson_ids.includes(lesson.id)
                                ? 'Đến lịch ôn'
                                : 'Nghe · Nói · Vận dụng'}
                          </small>
                        </span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>

          {selected && (
            <aside
              className="learning-card learning-preview"
              aria-labelledby="lesson-preview-title"
            >
              <p className="eyebrow">BUỔI HỌC CÙNG MATE · {selected.minutes} PHÚT</p>
              <h2 id="lesson-preview-title">{selected.title}</h2>
              <p>{selected.objective}</p>
              <div className="learning-situation">
                <span>Tình huống thực hành</span>
                <p>{selected.situation}</p>
              </div>
              <ol className="learning-flow">
                <li>Khởi động, hỏi đáp</li>
                <li>Nghe Mate giảng và làm mẫu</li>
                <li>Luyện có hướng dẫn</li>
                <li>Đóng vai, đối thoại với Mate</li>
                <li>Tự kiểm tra và hẹn ôn</li>
              </ol>
              <p className="learning-fine-print">
                Nhấn để vào lớp và bật micro. Mate mở bài, hỏi từng câu và chờ bạn trả lời. Bạn có
                thể tạm dừng hoặc gõ khi cần.
              </p>
              {savedProgress?.completed && (
                <p className="learning-success">✓ Đã hoàn thành · Bạn vẫn có thể học lại.</p>
              )}
              {error && (
                <p className="learning-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="tutor-button primary learning-study-button"
                onClick={() => void study()}
                disabled={starting}
              >
                {starting
                  ? 'Đang mở buổi học…'
                  : savedProgress?.conversation_id
                    ? 'Tiếp tục học bằng giọng nói'
                    : 'Học bằng giọng nói'}
              </button>
            </aside>
          )}
        </div>
      )}
      <p className="learning-fine-print">
        Các chặng là cách tổ chức giáo trình của EngMate. Hoàn thành bài không phải chứng nhận trình
        độ hay điểm TOEIC chính thức. Bạn có thể xem và học ở mọi chặng.
      </p>
    </>
  );
}

function PlanForm({
  plan,
  catalog,
  onSaved,
}: {
  plan: LearningPlan;
  catalog: LearningCatalog;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(plan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const value = await saveLearningPlan(draft, controller.signal);
      if (!controller.signal.aborted) {
        setDraft(value);
        setSaved(true);
        setConflict(false);
        onSaved();
      }
    } catch (e: unknown) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Chưa lưu được mục tiêu.');
        setConflict(e instanceof LearningConflictError);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function updateVersion() {
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const current = await getLearningPlan(controller.signal);
      if (!controller.signal.aborted) {
        setDraft((old) => ({ ...old, version: current.version }));
        setConflict(false);
        setError(
          'Đã cập nhật phiên bản. Kiểm tra lựa chọn đang giữ rồi nhấn Lưu mục tiêu để áp dụng.',
        );
      }
    } catch (e: unknown) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Chưa tải được mục tiêu.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function change(value: Partial<LearningPlan>) {
    setDraft((old) => {
      const next = { ...old, ...value };
      const lastStage = lastStageForGoal[next.goal_score] ?? 0;
      if (catalog.stages.findIndex((stage) => stage.id === next.start_stage) > lastStage)
        next.start_stage = catalog.stages[lastStage]?.id ?? catalog.stages[0].id;
      return next;
    });
    setSaved(false);
  }
  return (
    <form onSubmit={(event) => void save(event)} className="learning-plan-form">
      <label>
        Mục tiêu điểm
        <select
          value={draft.goal_score}
          onChange={(event) => change({ goal_score: Number(event.target.value) })}
          disabled={busy}
        >
          {[450, 650, 800, 900, 990].map((value) => (
            <option key={value} value={value}>
              {value} điểm
            </option>
          ))}
        </select>
      </label>
      <label>
        Chặng bắt đầu
        <select
          value={draft.start_stage}
          onChange={(event) => change({ start_stage: event.target.value })}
          disabled={busy}
        >
          {catalog.stages.map((stage, index) => (
            <option
              key={stage.id}
              value={stage.id}
              disabled={index > lastStageForGoal[draft.goal_score]}
            >
              {stage.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Phút học mỗi ngày
        <input
          type="number"
          min={10}
          max={60}
          step={5}
          value={draft.minutes}
          onChange={(event) => change({ minutes: Number(event.target.value) })}
          disabled={busy}
          required
        />
      </label>
      <label>
        Ngày dự kiến thi (không bắt buộc)
        <input
          type="date"
          value={draft.exam_date ?? ''}
          onChange={(event) => change({ exam_date: event.target.value || null })}
          disabled={busy}
        />
      </label>
      <p className="learning-fine-print">
        Chặng bắt đầu do bạn lựa chọn, chưa phải kết quả kiểm tra đầu vào. Thời gian và ngày thi
        giúp bạn lập kế hoạch; không cam kết điểm số.
      </p>
      <div className="learning-plan-actions">
        <button className="tutor-button" type="submit" disabled={busy || conflict}>
          {busy ? 'Đang xử lý…' : 'Lưu mục tiêu'}
        </button>
        {conflict && (
          <button
            className="tutor-button"
            type="button"
            disabled={busy}
            onClick={() => void updateVersion()}
          >
            Cập nhật phiên bản, giữ lựa chọn
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="learning-error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="learning-success">
          Đã lưu mục tiêu học tập.
        </p>
      )}
    </form>
  );
}
