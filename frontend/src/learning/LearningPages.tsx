import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Conversation } from '../types';
import {
  getLearningCatalog,
  getLearningProgress,
  startLearningLesson,
  useLearningQuery,
} from './api';
import type { LearningLesson, LessonProgress } from './types';
import './learning.css';

interface Props {
  onStudy: (lesson: LearningLesson, conversation: Conversation, progress: LessonProgress) => void;
}

function useStudyLesson(onStudy: Props['onStudy']) {
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const requests = useRef(new Map<string, string>());
  const locked = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);
  async function study(lesson: LearningLesson) {
    if (locked.current) return;
    locked.current = true;
    setStartingId(lesson.id);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    const id = requests.current.get(lesson.id) ?? crypto.randomUUID();
    requests.current.set(lesson.id, id);
    try {
      const result = await startLearningLesson(lesson.id, id, controller.signal);
      if (!controller.signal.aborted) onStudy(lesson, result.conversation, result.progress);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Chưa mở được bài học.');
    } finally {
      locked.current = false;
      if (!controller.signal.aborted) setStartingId(null);
    }
  }
  return { startingId, error, study };
}

function LearningPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="tutor-page learning-page">
      <header className="tutor-page-heading">
        <p className="eyebrow">KHÔNG GIAN HỌC TẬP</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

function LoadError({
  message,
  retry,
  label,
}: {
  message: string;
  retry: () => void;
  label: string;
}) {
  return (
    <div className="learning-message" role="alert">
      <p>{message}</p>
      <button className="tutor-button" onClick={retry}>
        {label}
      </button>
    </div>
  );
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

export function LessonsPage({ onStudy, reviewOnly = false }: Props & { reviewOnly?: boolean }) {
  const catalog = useLearningQuery(getLearningCatalog);
  const progress = useLearningQuery(getLearningProgress);
  const { startingId, error, study } = useStudyLesson(onStudy);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(reviewOnly ? 'review' : 'all');
  const [stageId, setStageId] = useState('all');
  const [duration, setDuration] = useState('all');
  const [limit, setLimit] = useState(12);
  const lessons =
    catalog.data?.stages.flatMap((stage) =>
      stage.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({ lesson, stage, module })),
      ),
    ) ?? [];
  const visible = lessons.filter(({ lesson, stage, module }) => {
    const record = progress.data?.lessons.find((row) => row.lesson_id === lesson.id);
    return (
      normalize(`${lesson.title} ${lesson.objective} ${module.title}`).includes(normalize(query)) &&
      (stageId === 'all' || stage.id === stageId) &&
      (duration === 'all' || (duration === 'short' ? lesson.minutes <= 10 : lesson.minutes > 10)) &&
      (filter === 'all' ||
        (progress.data &&
          (filter === 'review'
            ? progress.data.review_lesson_ids.includes(lesson.id)
            : filter === 'completed'
              ? record?.completed
              : filter === 'active'
                ? record && !record.completed
                : !record)))
    );
  });
  function resetFilters() {
    setQuery('');
    setFilter('all');
    setStageId('all');
    setDuration('all');
    setLimit(12);
  }
  return (
    <LearningPage
      title="Bài học TOEIC"
      description="Tìm theo chủ đề, chọn chặng và thời lượng phù hợp, hoặc tiếp tục bài đang học."
    >
      {catalog.loading && <p role="status">Đang tải bài học…</p>}
      {catalog.error && (
        <LoadError
          message={`Giáo trình: ${catalog.error}`}
          retry={catalog.reload}
          label="Tải lại bài học"
        />
      )}
      {progress.error && (
        <LoadError
          message={`Chưa tải được trạng thái học. Bạn vẫn có thể tìm và mở bài; không có bài nào được coi là chưa học khi dữ liệu chưa sẵn sàng. ${progress.error}`}
          retry={progress.reload}
          label="Tải lại trạng thái"
        />
      )}
      {catalog.data && (
        <>
          <div className="learning-library-toolbar">
            <label>
              Tìm bài học
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(12);
                }}
                placeholder="Tên bài, chủ đề hoặc nội dung…"
              />
            </label>
            <label>
              Chặng học
              <select
                value={stageId}
                onChange={(e) => {
                  setStageId(e.target.value);
                  setLimit(12);
                }}
              >
                <option value="all">Tất cả các chặng</option>
                {catalog.data.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Thời lượng
              <select
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  setLimit(12);
                }}
              >
                <option value="all">Mọi thời lượng</option>
                <option value="short">Tối đa 10 phút</option>
                <option value="long">Trên 10 phút</option>
              </select>
            </label>
            <label>
              Trạng thái
              <select
                value={filter}
                disabled={!progress.data}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setLimit(12);
                }}
              >
                <option value="all">Tất cả bài học</option>
                <option value="active">Đang học</option>
                <option value="new">Chưa bắt đầu</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="review">Cần ôn</option>
              </select>
            </label>
            <button className="tutor-button" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          </div>
          {filter !== 'all' && !progress.data ? (
            <p role="status">
              Cần tải trạng thái để áp dụng bộ lọc này. Bạn có thể chọn Xóa bộ lọc để xem giáo
              trình.
            </p>
          ) : (
            <p role="status">
              {visible.length} bài học phù hợp · Đang hiển thị {Math.min(limit, visible.length)}
            </p>
          )}
          {error && (
            <p role="alert" className="learning-error">
              {error}
            </p>
          )}
          <div className="learning-library-grid">
            {visible.slice(0, limit).map(({ lesson, stage, module }) => {
              const record = progress.data?.lessons.find((row) => row.lesson_id === lesson.id);
              return (
                <article key={lesson.id} className="learning-card learning-library-card">
                  <p className="eyebrow">
                    {stage.title} · {lesson.minutes} phút
                  </p>
                  <h2>{lesson.title}</h2>
                  <p>{lesson.objective}</p>
                  <small>{module.title}</small>
                  <small>
                    {!progress.data
                      ? 'Chưa tải trạng thái học'
                      : record?.completed
                        ? '✓ Đã hoàn thành'
                        : record
                          ? 'Đang học'
                          : 'Chưa bắt đầu'}
                    {progress.data?.review_lesson_ids.includes(lesson.id) && ' · Đến lịch ôn'}
                  </small>
                  <button
                    className="tutor-button"
                    disabled={startingId !== null}
                    onClick={() => void study(lesson)}
                  >
                    {startingId === lesson.id
                      ? 'Đang mở buổi học…'
                      : !progress.data
                        ? 'Mở bài học'
                        : record?.completed
                          ? 'Học lại'
                          : record
                            ? 'Tiếp tục học'
                            : 'Bắt đầu học'}
                  </button>
                </article>
              );
            })}
          </div>
          {visible.length > limit && (
            <button
              className="tutor-button learning-load-more"
              onClick={() => setLimit((old) => old + 12)}
            >
              Xem thêm bài học
            </button>
          )}
          {visible.length === 0 && (filter === 'all' || progress.data) && (
            <p className="learning-message">
              Không có bài học phù hợp. Thử đổi từ khóa hoặc bộ lọc.
            </p>
          )}
        </>
      )}
    </LearningPage>
  );
}

export function ProgressPage({
  onLessons,
  onStudy,
}: Props & { onLessons: (reviewOnly?: boolean) => void }) {
  const catalog = useLearningQuery(getLearningCatalog);
  const progress = useLearningQuery(getLearningProgress);
  const { startingId, error, study } = useStudyLesson(onStudy);
  const lessons =
    catalog.data?.stages.flatMap((stage) => stage.modules.flatMap((module) => module.lessons)) ??
    [];
  const records = progress.data?.lessons ?? [];
  const completed = records.filter((row) => row.completed).length;
  const turns = records.reduce((total, row) => total + row.practice_turns, 0);
  const correct = records.reduce((total, row) => total + row.check_correct, 0);
  const checked = records.reduce((total, row) => total + row.check_total, 0);
  return (
    <LearningPage
      title="Tiến độ học tập"
      description="Kết quả TOEIC lưu theo tài khoản: bài đã hoàn thành, lượt luyện và kiểm tra trong bài."
    >
      {progress.loading && <p role="status">Đang tải tiến độ…</p>}
      {progress.error && (
        <LoadError message={progress.error} retry={progress.reload} label="Tải lại tiến độ" />
      )}
      {catalog.error && (
        <LoadError
          message={`Chưa tải được tên bài và chặng học. Các số liệu bên dưới vẫn là kết quả từ tài khoản. ${catalog.error}`}
          retry={catalog.reload}
          label="Tải lại giáo trình"
        />
      )}
      {progress.data && (
        <>
          <div className="learning-overview">
            <div>
              <strong>
                {completed}
                {catalog.data && <span> / {lessons.length}</span>}
              </strong>
              <p>Bài đã hoàn thành</p>
            </div>
            <div>
              <strong>{turns}</strong>
              <p>Lượt thực hành</p>
            </div>
            <div>
              <strong>{checked ? `${correct}/${checked}` : '—'}</strong>
              <p>Câu trả lời đúng</p>
            </div>
            <div>
              <strong>{progress.data.review_lesson_ids.length}</strong>
              <p>Bài đến lịch ôn</p>
            </div>
          </div>
          {catalog.data && (
            <section className="learning-card learning-progress-stages">
              <h2>Tiến độ theo chặng</h2>
              {catalog.data.stages.map((stage) => {
                const ids = stage.modules.flatMap((module) =>
                  module.lessons.map((lesson) => lesson.id),
                );
                const count = records.filter(
                  (row) => row.completed && ids.includes(row.lesson_id),
                ).length;
                return (
                  <div key={stage.id}>
                    <label htmlFor={`progress-${stage.id}`}>
                      {stage.title} · {count}/{ids.length} bài
                    </label>
                    <progress id={`progress-${stage.id}`} value={count} max={ids.length || 1} />
                  </div>
                );
              })}
            </section>
          )}
          <section className="learning-card learning-progress-stages">
            <h2>Kết quả đã ghi nhận</h2>
            {records.length === 0 ? (
              <p>Bạn chưa bắt đầu bài học nào. Mở Bài học để bắt đầu cùng Mate.</p>
            ) : (
              <div
                className="learning-results-scroll"
                role="region"
                aria-label="Bảng kết quả bài học"
                tabIndex={0}
              >
                <table className="learning-results">
                  <thead>
                    <tr>
                      <th>Bài học</th>
                      <th>Lượt luyện</th>
                      <th>Kiểm tra</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((row) => (
                      <tr key={row.lesson_id}>
                        <th scope="row">
                          {lessons.find((lesson) => lesson.id === row.lesson_id)?.title ??
                            row.lesson_id}
                        </th>
                        <td>{row.practice_turns}</td>
                        <td>
                          {row.check_total
                            ? `${row.check_correct}/${row.check_total} câu đúng`
                            : 'Chưa kiểm tra'}
                        </td>
                        <td>{row.completed ? 'Đã hoàn thành' : 'Đang học'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="learning-card learning-progress-stages">
            <h2>Bài cần ôn lại</h2>
            {error && (
              <p role="alert" className="learning-error">
                {error}
              </p>
            )}
            {progress.data.review_lesson_ids.length ? (
              <ul className="learning-review-actions">
                {progress.data.review_lesson_ids.map((id) => {
                  const lesson = lessons.find((item) => item.id === id);
                  return (
                    <li key={id}>
                      <span>{lesson?.title ?? id}</span>
                      <button
                        className="tutor-button"
                        disabled={!lesson || startingId !== null}
                        onClick={() => lesson && void study(lesson)}
                      >
                        {startingId === id ? 'Đang mở buổi học…' : 'Ôn bài này'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Hiện chưa có bài đến lịch ôn.</p>
            )}
            {progress.data.review_lesson_ids.length > 0 && (
              <button className="tutor-button" onClick={() => onLessons(true)}>
                Lọc các bài cần ôn
              </button>
            )}
            <button className="tutor-button" onClick={() => onLessons()}>
              Mở danh sách bài học
            </button>
          </section>
          <p className="learning-fine-print">
            Kết quả kiểm tra trong bài không quy đổi thành điểm TOEIC chính thức. Buổi ôn giao tiếp
            tự đánh dấu trên trình duyệt được hiển thị riêng trong Hồ sơ.
          </p>
        </>
      )}
    </LearningPage>
  );
}
