import { useEffect, useRef, useState, type FormEvent } from 'react';
import { docVanBan, dungDoc } from '../speech/audio';
import { setLearningPhase, submitLearningCheck } from './api';
import type { CheckResult, LearningLesson, LessonProgress } from './types';
import './learning.css';

const learningPhases = ['Khởi động', 'Mate giảng', 'Luyện cùng', 'Đối thoại', 'Tự kiểm tra'];

interface Props {
  lesson: LearningLesson;
  progress: LessonProgress;
  onProgress: (progress: LessonProgress) => void;
  onExit: () => void;
  onStartVoice?: () => void;
  voiceActive?: boolean;
}

/** Compact lesson companion: teaching stays in the real chat/voice conversation. */
export function LessonGuide({
  lesson,
  progress,
  onProgress,
  onExit,
  onStartVoice,
  voiceActive = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CheckResult | null>(null);
  const abort = useRef<AbortController | null>(null);
  const checkRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const phase = Math.max(0, Math.min(4, progress.phase));

  async function move(nextPhase: number) {
    if (busy || !progress.conversation_id) return;
    setBusy(true);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const next = await setLearningPhase(
        lesson.id,
        nextPhase,
        progress.conversation_id,
        controller.signal,
      );
      if (!controller.signal.aborted) onProgress(next);
    } catch (e: unknown) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Chưa chuyển được bước học.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const selections = lesson.checks.map((question) => ({
      question_id: question.id,
      choice: answers[question.id],
    }));
    if (selections.some((item) => item.choice === undefined)) {
      setError('Bạn hãy trả lời đủ các câu trước khi kiểm tra.');
      return;
    }
    setBusy(true);
    setError('');
    const fingerprint = JSON.stringify(selections);
    if (checkRequest.current?.fingerprint !== fingerprint)
      checkRequest.current = { fingerprint, id: crypto.randomUUID() };
    const controller = new AbortController();
    abort.current = controller;
    try {
      const next = await submitLearningCheck(
        lesson.id,
        checkRequest.current!.id,
        selections,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setResult(next);
        checkRequest.current = null;
        onProgress(next.progress);
      }
    } catch (e: unknown) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Chưa kiểm tra được câu trả lời.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="learning-guide learning-card" aria-labelledby="active-lesson-title">
      <header className="learning-guide-heading">
        <div>
          <p className="eyebrow">BUỔI HỌC TOEIC · {lesson.minutes} PHÚT</p>
          <h2 id="active-lesson-title">{lesson.title}</h2>
        </div>
        <button className="tutor-button" onClick={onExit} disabled={busy}>
          Về lộ trình
        </button>
      </header>
      <p className="learning-guide-objective">{lesson.objective}</p>
      <div className="learning-guide-toolbar">
        {onStartVoice && (
          <button
            className="tutor-button primary"
            onClick={() => {
              dungDoc();
              onStartVoice();
            }}
            disabled={voiceActive || busy}
          >
            {voiceActive ? 'Đang học bằng giọng nói' : 'Bật micro học cùng Mate'}
          </button>
        )}
        <span role="status">
          {progress.completed ? '✓ Đã hoàn thành' : `Đã luyện ${progress.practice_turns} lượt`}
        </span>
        <small>Nghe, nói và luyện lại cùng Mate</small>
      </div>
      <nav className="learning-phase-steps" aria-label="Các bước của buổi học">
        {learningPhases.map((name, index) => (
          <button
            key={name}
            type="button"
            aria-current={phase === index ? 'step' : undefined}
            disabled={busy || index > phase + 1 || !progress.conversation_id}
            onClick={() => void move(index)}
          >
            <span>{index + 1}</span>
            {name}
          </button>
        ))}
      </nav>

      <div className="learning-phase-body">
        {phase === 0 && (
          <>
            <h3>Cùng Mate bắt đầu</h3>
            <p>{lesson.situation}</p>
            <blockquote>{lesson.opening}</blockquote>
            <p className="learning-fine-print">
              Bật micro, nói câu trả lời đầu tiên để Mate bắt đầu hướng dẫn. Bạn cũng có thể gõ
              trong khung chat.
            </p>
          </>
        )}
        {phase === 1 && (
          <>
            <h3>Nghe giảng & xem ví dụ</h3>
            <p>{lesson.explanation}</p>
            <div className="learning-pattern">
              <strong>{lesson.pattern}</strong>
              <p lang="en">{lesson.example}</p>
              <small>{lesson.translation}</small>
            </div>
            <details>
              <summary>Từ vựng của bài ({lesson.vocabulary.length})</summary>
              <dl className="learning-vocabulary">
                {lesson.vocabulary.map((word) => (
                  <div key={word.term}>
                    <dt lang="en">{word.term}</dt>
                    <dd>
                      {word.meaning}
                      <span lang="en">{word.example}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        )}
        {phase === 2 && (
          <>
            <h3>Luyện từng bước với Mate</h3>
            <ol className="learning-practice">
              {lesson.practice.map((prompt, index) => (
                <li key={index}>{prompt}</li>
              ))}
            </ol>
            <details>
              <summary>Bài nghe & bài đọc hỗ trợ</summary>
              <div className="learning-materials">
                <ListeningPanel
                  text={lesson.listening.text}
                  question={lesson.listening.question}
                  disabled={voiceActive}
                />
                <div>
                  <h4>Đọc và trả lời</h4>
                  <blockquote lang="en">{lesson.reading.text}</blockquote>
                  <p>{lesson.reading.question}</p>
                </div>
              </div>
            </details>
          </>
        )}
        {phase === 3 && (
          <>
            <h3>Đến lượt bạn đối thoại</h3>
            <p>{lesson.situation}</p>
            <p>
              Hãy trò chuyện với Mate, vận dụng mẫu câu và hỏi lại khi chưa hiểu. Mate sẽ phản hồi
              theo câu trả lời của bạn.
            </p>
            <details>
              <summary>Xem gợi ý khi cần</summary>
              <p>
                <strong>{lesson.pattern}</strong>
              </p>
              <ol className="learning-practice">
                {lesson.practice.map((prompt, index) => (
                  <li key={index}>{prompt}</li>
                ))}
              </ol>
            </details>
          </>
        )}
        {phase === 4 && (
          <>
            <h3>Tự kiểm tra sau buổi học</h3>
            <p className="learning-fine-print">
              Để hoàn thành: luyện ít nhất 3 lượt trả lời thực tế với Mate và trả lời đúng tất cả
              câu kiểm tra. Đây là kiểm tra kiến thức của bài, không phải điểm TOEIC hay điểm phát
              âm.
            </p>
            <details className="learning-check-details" open>
              <summary>Làm bài kiểm tra ({lesson.checks.length} câu)</summary>
              <form onSubmit={(event) => void check(event)} className="learning-check-form">
                {lesson.checks.map((question, index) => {
                  const feedback = result?.feedback.find(
                    (item) => item.question_id === question.id,
                  );
                  return (
                    <fieldset key={question.id} disabled={busy}>
                      <legend>
                        {index + 1}. {question.prompt}
                      </legend>
                      {question.stimulus &&
                        (question.mode === 'listening' ? (
                          <ListeningPanel text={question.stimulus} disabled={voiceActive} />
                        ) : (
                          <blockquote lang="en">{question.stimulus}</blockquote>
                        ))}
                      {question.options.map((option, choice) => (
                        <label key={choice} className="learning-answer">
                          <input
                            type="radio"
                            name={`${lesson.id}-${question.id}`}
                            value={choice}
                            checked={answers[question.id] === choice}
                            onChange={() => {
                              setAnswers((old) => ({ ...old, [question.id]: choice }));
                              setResult(null);
                            }}
                          />
                          <span>
                            {String.fromCharCode(65 + choice)}. {option}
                          </span>
                        </label>
                      ))}
                      {feedback && (
                        <p className={feedback.correct ? 'learning-success' : 'learning-error'}>
                          <strong>
                            {feedback.correct
                              ? 'Đúng. '
                              : `Đáp án ${String.fromCharCode(65 + feedback.answer)}. `}
                          </strong>
                          {feedback.explanation}
                        </p>
                      )}
                    </fieldset>
                  );
                })}
                <button className="tutor-button primary" type="submit" disabled={busy}>
                  {busy ? 'Đang kiểm tra…' : 'Kiểm tra câu trả lời'}
                </button>
              </form>
            </details>
            {result && (
              <p role="status" className={result.passed ? 'learning-success' : 'learning-message'}>
                {result.passed && (
                  <img
                    className="mate-result-mascot"
                    src="/mate.svg"
                    width="64"
                    height="64"
                    alt=""
                  />
                )}
                {result.correct}/{result.total} câu đúng.{' '}
                {result.passed
                  ? 'Đã hoàn thành bài học. Hãy quay lại lộ trình để chọn bài tiếp theo.'
                  : result.correct === result.total && result.progress.practice_turns < 3
                    ? 'Bạn đã trả lời đúng. Hãy tiếp tục đối thoại với Mate để đủ 3 lượt luyện tập, rồi kiểm tra lại.'
                    : 'Xem giải thích, hỏi Mate phần chưa hiểu rồi thử lại.'}
              </p>
            )}
          </>
        )}
      </div>
      {error && (
        <p className="learning-error" role="alert">
          {error}
        </p>
      )}
      {progress.review_due && (
        <p className="learning-fine-print">
          Lịch ôn tiếp theo:{' '}
          {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
            new Date(progress.review_due),
          )}
          .
        </p>
      )}
      <footer className="learning-guide-footer">
        <button
          className="tutor-button"
          disabled={busy || phase === 0}
          onClick={() => void move(phase - 1)}
        >
          ← Bước trước
        </button>
        <span>{phase + 1}/5</span>
        {phase < 4 ? (
          <button className="tutor-button" disabled={busy} onClick={() => void move(phase + 1)}>
            Bước tiếp →
          </button>
        ) : (
          <button className="tutor-button" disabled={busy} onClick={onExit}>
            Chọn bài tiếp theo →
          </button>
        )}
      </footer>
    </section>
  );
}

/** Audio is created only after a learner click; never on render or pointer hover. */
function ListeningPanel({
  text,
  question,
  disabled = false,
}: {
  text: string;
  question?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
      dungDoc();
    },
    [],
  );
  useEffect(() => {
    if (disabled) {
      abort.current?.abort();
      dungDoc();
    }
  }, [disabled]);
  async function listen() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    try {
      await docVanBan(text, 1, controller.signal);
    } catch (e: unknown) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Chưa phát được bài nghe.');
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  }
  return (
    <div className="learning-listening">
      <h4>Nghe và trả lời</h4>
      <div className="learning-audio-actions">
        <button
          type="button"
          className="tutor-button"
          disabled={disabled || busy}
          onClick={() => void listen()}
        >
          {busy ? 'Đang tạo giọng Blaze…' : 'Nghe bằng giọng Blaze'}
        </button>
        <button
          className="tutor-button"
          type="button"
          onClick={() => {
            abort.current?.abort();
            dungDoc();
            setBusy(false);
          }}
        >
          Dừng âm thanh
        </button>
      </div>
      {disabled && (
        <p className="learning-fine-print">Kết thúc thoại trực tiếp để nghe riêng đoạn mẫu.</p>
      )}
      {question && <p>{question}</p>}
      <details>
        <summary>Xem bản chép lời sau khi nghe</summary>
        <p lang="en">{text}</p>
      </details>
      {error && (
        <p role="alert" className="learning-error">
          {error}
        </p>
      )}
    </div>
  );
}
