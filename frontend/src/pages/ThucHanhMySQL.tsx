import { useEffect, useRef, useState } from 'react';
import { api, apiFetch, type Lesson, type Attempt } from '../api/database';
import { useDuLieu } from '../demo/LuuTru';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { NutDoc } from '../components/NutDoc';
import { BieuTuong } from '../components/BieuTuong';
import { useThuAm } from '../hooks/useThuAm';
import { dungDoc } from '../demo/amThanh';
import { layTrinhDoHoc } from '../demo/trinhDo';

/** Exercises and scores come from the stored lesson revision, including saved attempts. */
export function ThucHanhMySQL({
  skill,
}: {
  skill: 'speaking' | 'listening' | 'reading' | 'writing';
}) {
  const { hoSo, luuTu } = useDuLieu();
  const [catalog, setCatalog] = useState<Lesson[]>([]);
  const [identity, setIdentity] = useState(0);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [mode, setMode] = useState(
    skill === 'speaking' ? 'shadowing' : skill === 'writing' ? 'writing' : 'multiple_choice',
  );
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Attempt | null>(null);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef('');
  const thuAm = useThuAm(setText, setError);
  useEffect(() => {
    let cancelled = false;
    void api<Lesson[]>(`/lessons?skill=${skill}&limit=100`)
      .then((rows) => {
        if (!cancelled) {
          setCatalog(rows);
          setIdentity(
            (rows.find((row) => row.min_level === layTrinhDoHoc(hoSo.trinhDo)) ?? rows[0])
              ?.lesson_id ?? 0,
          );
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chưa tải được bài học.');
      });
    return () => {
      cancelled = true;
    };
    // Pick a starting lesson once; users can choose a different level afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, catalogRetry]);
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    let created: Attempt | null = null;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setAttempt(null);
      setLesson(null);
      setResult(null);
      setAnswers({});
      setText('');
      setError('');
      const row = await api<Lesson>(`/lessons/${identity}`);
      if (cancelled) return;
      setLesson(row);
      created = await api<Attempt>('/practice/attempts', 'POST', {
        client_request_id: crypto.randomUUID(),
        lesson_id: identity,
        mode,
      });
      if (cancelled) {
        await api(`/practice/attempts/${created.attempt_id}/abandon`, 'POST');
        return;
      }
      setAttempt(created);
    })().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Chưa mở được bài học.');
    });
    return () => {
      cancelled = true;
      dungDoc();
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      if (created)
        void api(`/practice/attempts/${created.attempt_id}/abandon`, 'POST').catch(() => {});
    };
  }, [identity, mode, retry]);
  useEffect(() => {
    void api<Attempt[]>('/practice/attempts?limit=100')
      .then(setHistory)
      .catch(() => {});
  }, [result]);
  const questions = lesson?.questions.filter((q) => q.question_type === mode) ?? [];
  const ready =
    attempt &&
    !busy &&
    !result &&
    !thuAm.active &&
    (skill === 'speaking' || skill === 'writing'
      ? Boolean(text.trim())
      : questions.length > 0 &&
        questions.every(
          (q) => answers[q.question_id] !== undefined && String(answers[q.question_id]).trim(),
        ));
  async function submit() {
    if (!ready || !attempt) return;
    setBusy(true);
    setError('');
    try {
      const payload =
        skill === 'speaking' || skill === 'writing'
          ? { submitted_text: text }
          : {
              answers: questions.map((q) => ({
                question_id: q.question_id,
                ...(mode === 'dictation'
                  ? { answer_text: answers[q.question_id] }
                  : { selected_option_id: answers[q.question_id] }),
              })),
            };
      setResult(
        await api<Attempt>(`/practice/attempts/${attempt.attempt_id}/submit`, 'POST', {
          version: attempt.version,
          ...payload,
        }),
      );
      window.dispatchEvent(new Event('engmate-data'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được bài làm.');
    } finally {
      setBusy(false);
    }
  }
  async function playDictation(questionId: number) {
    try {
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      setError('');
      const response = await apiFetch(`/api/speech/dictation/${questionId}/audio`);
      if (!response.ok) throw new Error('Chưa tải được câu nghe. Hãy thử lại.');
      const url = URL.createObjectURL(await response.blob());
      audioUrl.current = url;
      const player = new Audio(url);
      audio.current = player;
      player.onended = () => URL.revokeObjectURL(url);
      await player.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa phát được câu nghe.');
    }
  }
  const title = {
    speaking: 'Speaking',
    listening: 'Listening',
    reading: 'Reading',
    writing: 'Writing',
  }[skill];
  return (
    <>
      <TieuDeTrang ten={title} />
      <div className="practice-layout">
        <section className="panel">
          <div className="section-title">
            <h2>Bài luyện tập</h2>
            <select
              aria-label={`Chọn bài ${title}`}
              value={identity}
              disabled={busy || thuAm.active}
              onChange={(event) => setIdentity(Number(event.target.value))}
            >
              {catalog.map((row) => (
                <option key={row.lesson_id} value={row.lesson_id}>
                  {row.min_level} · {row.title}
                </option>
              ))}
            </select>
          </div>
          {skill === 'listening' && (
            <div className="tabs">
              {[
                ['multiple_choice', 'Trắc nghiệm'],
                ['dictation', 'Chép chính tả'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  disabled={busy}
                  className={mode === value ? 'active' : ''}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {!lesson ? (
            <p role="status">Đang tải bài học…</p>
          ) : (
            <>
              <span className="pill purple">{lesson.min_level}</span>
              <h2>{lesson.title}</h2>
              <p>{lesson.instruction}</p>
              {lesson.content && (skill !== 'listening' || mode !== 'dictation') && (
                <div className="reading-text" lang="en">
                  {lesson.content.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
              {(skill === 'speaking' || (skill === 'listening' && mode === 'multiple_choice')) && (
                <NutDoc
                  className="btn secondary"
                  text={lesson.content ?? ''}
                  preload
                  onError={setError}
                >
                  <BieuTuong ten="volume" /> Nghe mẫu
                </NutDoc>
              )}
              {skill === 'speaking' && (
                <button
                  className="btn secondary"
                  disabled={busy || Boolean(result)}
                  onClick={() => void thuAm.toggle()}
                >
                  {thuAm.recording ? 'Dừng ghi âm' : 'Ghi âm câu trả lời'}
                </button>
              )}
              {thuAm.active && <p role="status">{thuAm.status}</p>}
              {(skill === 'speaking' || skill === 'writing') && (
                <label>
                  {skill === 'writing' ? 'Bài viết tiếng Anh' : 'Câu trả lời tiếng Anh'}
                  <textarea
                    value={text}
                    maxLength={5000}
                    disabled={busy || Boolean(result)}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
              )}
              {questions.map((q, index) => (
                <fieldset className="quiz reading-question" key={q.question_id}>
                  <legend>
                    {index + 1}. {q.prompt}
                  </legend>
                  {mode === 'dictation' ? (
                    <>
                      <button
                        className="btn secondary"
                        onClick={() => void playDictation(q.question_id)}
                      >
                        Nghe câu
                      </button>
                      <input
                        aria-label="Câu đã nghe"
                        value={answers[q.question_id] ?? ''}
                        disabled={Boolean(result) || busy}
                        onChange={(event) =>
                          setAnswers((old) => ({ ...old, [q.question_id]: event.target.value }))
                        }
                      />
                    </>
                  ) : (
                    q.options.map((o) => (
                      <label
                        className={`quiz-answer ${answers[q.question_id] === o.option_id ? 'selected' : ''}`}
                        key={o.option_id}
                      >
                        <input
                          type="radio"
                          name={`q-${q.question_id}`}
                          checked={answers[q.question_id] === o.option_id}
                          disabled={Boolean(result) || busy}
                          onChange={() =>
                            setAnswers((old) => ({ ...old, [q.question_id]: o.option_id }))
                          }
                        />
                        {o.text}
                      </label>
                    ))
                  )}
                </fieldset>
              ))}
              <button className="btn primary" disabled={!ready} onClick={() => void submit()}>
                {busy ? 'Đang lưu…' : 'Nộp bài'}
              </button>
              {result && (
                <div className="feedback" role="status">
                  <strong>
                    {result.score_percent === null
                      ? 'Đã lưu bài làm'
                      : `Kết quả: ${result.score_percent}%`}
                  </strong>
                  {result.evaluations?.map((e, i) => (
                    <p key={i}>{e.feedback}</p>
                  ))}
                  {result.answer_key?.map((q) => (
                    <p key={q.question_id}>
                      {q.expected_text ??
                        lesson.questions
                          .find((item) => item.question_id === q.question_id)
                          ?.options.find((o) => o.option_id === q.correct_option_id)?.text}{' '}
                      {q.explanation}
                    </p>
                  ))}
                  <button className="btn secondary" onClick={() => setRetry((old) => old + 1)}>
                    Luyện lại
                  </button>
                </div>
              )}
            </>
          )}
          {error && (
            <div>
              <p role="alert" className="error-text">
                {error}
              </p>
              {!attempt && (
                <button
                  onClick={() =>
                    identity ? setRetry((old) => old + 1) : setCatalogRetry((old) => old + 1)
                  }
                >
                  Thử lại
                </button>
              )}
            </div>
          )}
        </section>
        <aside>
          {lesson?.vocabulary.length ? (
            <section className="panel">
              <h2>Từ gợi ý</h2>
              {lesson.vocabulary.map((w) => (
                <div className="word-suggestion" key={w.word}>
                  <strong>{w.word}</strong>
                  <p>{w.meaning}</p>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      luuTu({
                        id: crypto.randomUUID(),
                        tu: w.word,
                        nghia: w.meaning,
                        phienAm: w.phonetic ?? '',
                        loai: w.part_of_speech ?? '',
                        viDu: w.example_sentence ?? '',
                        daThuoc: false,
                        henOn: '',
                      })
                    }
                  >
                    Lưu từ
                  </button>
                </div>
              ))}
            </section>
          ) : null}
          <section className="panel">
            <h2>Bài làm gần đây</h2>
            {history
              .slice()
              .reverse()
              .slice(0, 10)
              .map((row) => (
                <p key={row.attempt_id}>
                  Bài làm #{row.attempt_id}{' '}
                  {row.score_percent === null ? '' : `· ${row.score_percent}%`}
                </p>
              ))}
            {!history.length && <p>Chưa có bài làm.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
