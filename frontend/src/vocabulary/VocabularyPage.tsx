import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Briefcase, Check, Coffee, Plus, Square, Volume2 } from 'lucide-react';
import { docVanBan, dungDoc } from '../speech/audio';
import { getVocabularyCatalog, getVocabularyTopic } from './api';
import { Flashcards, QuickQuiz } from './StudyViews';
import { VocabularyStatus } from './VocabularyStatus';
import type { VocabularyCatalog, VocabularyTopic, VocabularyWord } from './types';
import type { VocabularyStateController } from './useVocabularyState';
import './vocabulary.css';

const normalizeVocabulary = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
const parts = {
  noun: 'Danh từ',
  verb: 'Động từ',
  adjective: 'Tính từ',
  adverb: 'Trạng từ',
  phrase: 'Cụm từ',
};

interface Props {
  state: VocabularyStateController;
  speech: boolean;
  legacyKeys: string[];
  onPractice: (words: VocabularyWord[]) => void;
  children: ReactNode;
}

export function VocabularyPage({ state, speech, legacyKeys, onPractice, children }: Props) {
  const [catalog, setCatalog] = useState<VocabularyCatalog | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const region = useRef<HTMLElement>(null);
  const topicButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnTo = useRef<{ id: string; main: number; body: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getVocabularyCatalog(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCatalog(data);
          setError('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Chưa tải được danh sách chủ đề. Hãy thử lại.');
      });
    return () => controller.abort();
  }, [revision]);

  useLayoutEffect(() => {
    if (selected || !returnTo.current) return;
    const target = returnTo.current;
    topicButtons.current.get(target.id)?.focus({ preventScroll: true });
    const main = region.current?.closest('.tutor-main');
    const body = region.current?.closest('.workspace-body');
    if (main) main.scrollTop = target.main;
    if (body) body.scrollTop = target.body;
  }, [selected]);

  const visible = catalog?.topics.filter(
    (topic) =>
      normalizeVocabulary(`${topic.title_vi} ${topic.title_en}`).includes(
        normalizeVocabulary(query),
      ) &&
      (!level || topic.levels.includes(level)),
  );
  return (
    <section
      className="vocabulary-page"
      data-tone="amber"
      ref={region}
      aria-label="Học từ vựng theo chủ đề"
      aria-busy={!catalog && !error}
    >
      <p className="vocabulary-source">
        IPA Anh–Anh · CEFR gợi ý · Nội dung do AI soạn, chưa được chuyên gia thẩm định
      </p>
      <VocabularyStatus state={state} />
      {selected ? (
        <TopicDetail
          key={selected}
          id={selected}
          state={state}
          speech={speech}
          onBack={() => setSelected(null)}
          onPractice={onPractice}
        />
      ) : (
        <>
          <section className="vocabulary-filters" aria-label="Tìm và lọc chủ đề">
            <label>
              Tìm chủ đề
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tên tiếng Việt hoặc tiếng Anh"
              />
            </label>
            <label>
              Mức gợi ý
              <select value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">Tất cả</option>
                {['A1', 'A2', 'B1', 'B2'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </section>
          {!catalog && !error && <p role="status">Đang tải chủ đề…</p>}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button
                className="tutor-button"
                onClick={() => {
                  setError('');
                  setRevision(revision + 1);
                }}
              >
                Thử tải lại chủ đề
              </button>
            </div>
          )}
          {catalog && (
            <>
              <h2>
                Chủ đề thường gặp{' '}
                <small>
                  · {visible?.length}/{catalog.topics.length}
                </small>
              </h2>
              <section className="vocabulary-topic-grid" aria-label="Chủ đề thường gặp">
                {visible?.map((topic) => {
                  const Icon = topic.icon === 'coffee' ? Coffee : Briefcase;
                  const remembered = state.data?.states.filter(
                    (word) => word.topic_id === topic.id && word.remembered,
                  ).length;
                  return (
                    <button
                      className="vocabulary-topic-card"
                      key={topic.id}
                      ref={(node) => {
                        if (node) topicButtons.current.set(topic.id, node);
                        else topicButtons.current.delete(topic.id);
                      }}
                      onClick={() => {
                        returnTo.current = {
                          id: topic.id,
                          main: region.current?.closest('.tutor-main')?.scrollTop ?? 0,
                          body: region.current?.closest('.workspace-body')?.scrollTop ?? 0,
                        };
                        setSelected(topic.id);
                      }}
                    >
                      <Icon size={26} aria-hidden="true" />
                      <strong>{topic.title_vi}</strong>
                      <span lang="en">{topic.title_en}</span>
                      <p>{topic.description}</p>
                      <span>
                        {topic.word_count} từ · {topic.levels.join('–')}
                      </span>
                      <small>
                        {remembered === undefined
                          ? 'Chưa tải được dấu nhớ'
                          : `Đã nhớ ${remembered}/${topic.word_count}`}
                      </small>
                    </button>
                  );
                })}
              </section>
              {visible?.length === 0 && (
                <div>
                  <p>
                    {catalog.topics.length
                      ? 'Không có chủ đề khớp bộ lọc.'
                      : 'Chưa có chủ đề được công bố.'}
                  </p>
                  <button
                    className="tutor-button"
                    onClick={() => {
                      setQuery('');
                      setLevel('');
                    }}
                  >
                    Xóa bộ lọc chủ đề
                  </button>
                </div>
              )}
            </>
          )}
          <details className="vocabulary-legacy">
            <summary>Ôn giao tiếp cũ</summary>
            <p>Bốn bộ giao tiếp nhỏ, riêng với hai chủ đề đầy đủ phía trên.</p>
            {state.lastData?.legacy_imported ? (
              <p>
                Dấu nhớ cụm cũ đang dùng dữ liệu đã tải từ tài khoản; bản trên trình duyệt vẫn được
                giữ.
              </p>
            ) : (
              <>
                <p>
                  Dấu nhớ cụm cũ hiện lưu trên trình duyệt. Chuyển dữ liệu sẽ giữ lựa chọn đã có
                  trên tài khoản.
                </p>
                {legacyKeys.length > 0 && (
                  <div className="vocabulary-import">
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmImport}
                        onChange={(event) => setConfirmImport(event.target.checked)}
                      />{' '}
                      Tôi đồng ý chuyển {legacyKeys.length} dấu nhớ cũ lên tài khoản
                    </label>
                    <button
                      className="tutor-button"
                      disabled={!confirmImport || !state.data || state.busy || !!state.pending}
                      onClick={() => state.importLegacy(legacyKeys)}
                    >
                      Chuyển dấu nhớ cũ
                    </button>
                  </div>
                )}
              </>
            )}
            {children}
          </details>
        </>
      )}
    </section>
  );
}

function TopicDetail({
  id,
  state,
  speech,
  onBack,
  onPractice,
}: {
  id: string;
  state: VocabularyStateController;
  speech: boolean;
  onBack: () => void;
  onPractice: (words: VocabularyWord[]) => void;
}) {
  const [topic, setTopic] = useState<VocabularyTopic | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [slow, setSlow] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('list');
  const [chosen, setChosen] = useState<string[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const playback = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    const controller = new AbortController();
    const timer = window.setTimeout(() => setSlow(true), 8000);
    void getVocabularyTopic(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setTopic(data);
          setError('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Chưa tải được chủ đề. Bạn có thể thử lại hoặc quay về danh sách.');
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [id, revision]);
  useEffect(() => {
    if (!speech) {
      playback.current?.abort();
      dungDoc();
      queueMicrotask(() => {
        setPlaying(null);
        setAudioLoading(false);
      });
    }
    return () => {
      playback.current?.abort();
      dungDoc();
    };
  }, [speech]);
  function stop() {
    playback.current?.abort();
    dungDoc();
    setPlaying(null);
    setAudioLoading(false);
  }
  async function listen(word: VocabularyWord) {
    if (!speech) return;
    if (playing === word.id) {
      stop();
      return;
    }
    stop();
    const controller = new AbortController();
    playback.current = controller;
    setPlaying(word.id);
    setAudioLoading(true);
    setAudioError('');
    const finish = (reason?: Error) => {
      if (!controller.signal.aborted) {
        setPlaying(null);
        setAudioLoading(false);
        if (reason) setAudioError(reason.message);
      }
    };
    try {
      await docVanBan(word.term, 1, controller.signal, finish);
      if (!controller.signal.aborted) setAudioLoading(false);
    } catch (reason) {
      finish(reason instanceof Error ? reason : new Error('Chưa phát được từ này.'));
    }
  }
  const remembered = (word: VocabularyWord) =>
    state.data?.states.some(
      (row) => row.topic_id === id && row.word_id === word.id && row.remembered,
    ) ?? false;
  const words =
    topic?.words.filter(
      (word) =>
        normalizeVocabulary(`${word.term} ${word.meaning_vi}`).includes(
          normalizeVocabulary(query),
        ) &&
        (!level || word.cefr === level) &&
        (filter === 'all' || (state.data && remembered(word) === (filter === 'remembered'))),
    ) ?? [];
  const studyKey = `${query}:${level}:${filter}`;
  return (
    <>
      <section aria-label="Điều khiển chủ đề từ vựng">
        <button className="tutor-button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Các chủ đề
        </button>
        <h2 ref={heading} tabIndex={-1}>
          {topic?.title_vi ?? 'Đang tải chủ đề…'}
        </h2>
        {topic && (
          <p>
            <span lang="en">{topic.title_en}</span> · {topic.words.length} từ đầy đủ ·{' '}
            {state.data
              ? `Đã nhớ ${topic.words.filter(remembered).length}/${topic.words.length}`
              : 'Chưa có số liệu đã nhớ'}
          </p>
        )}
        {!topic && !error && (
          <p role="status">
            {slow ? 'Mạng đang chậm, vẫn đang tải chủ đề…' : 'Đang tải danh sách từ…'}
          </p>
        )}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              className="tutor-button"
              onClick={() => {
                setError('');
                setSlow(false);
                setRevision(revision + 1);
              }}
            >
              Thử tải lại danh sách từ
            </button>
          </div>
        )}
        {topic && (
          <>
            <div className="vocabulary-filters">
              <label>
                Tìm từ
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Từ tiếng Anh hoặc nghĩa tiếng Việt"
                />
              </label>
              <label>
                CEFR gợi ý
                <select value={level} onChange={(event) => setLevel(event.target.value)}>
                  <option value="">Tất cả</option>
                  {[...new Set(topic.words.map((word) => word.cefr))].sort().map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Dấu nhớ
                <select
                  value={filter}
                  disabled={!state.data}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="remembered">Đã nhớ</option>
                  <option value="unremembered">Chưa nhớ</option>
                </select>
              </label>
            </div>
            <div className="vocabulary-actions">
              <span role="status">
                Hiển thị {words.length}/{topic.words.length} từ
              </span>
              {(query || level || filter !== 'all') && (
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery('');
                    setLevel('');
                    setFilter('all');
                  }}
                >
                  Xóa bộ lọc từ
                </button>
              )}
            </div>
            <div className="vocabulary-actions" role="group" aria-label="Cách ôn từ">
              {(
                [
                  ['list', 'Danh sách'],
                  ['cards', 'Thẻ ghi nhớ'],
                  ['quiz', 'Trắc nghiệm nhanh'],
                ] as const
              ).map(([value, label]) => (
                <button
                  className="tutor-button"
                  key={value}
                  aria-pressed={mode === value}
                  onClick={() => {
                    stop();
                    setMode(value);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {speech && (
              <p className="vocabulary-source">
                Giọng nghe theo Cài đặt; có thể khác giọng Anh–Anh của IPA.
              </p>
            )}
            {playing && (
              <p role="status">{audioLoading ? 'Đang tải âm thanh…' : 'Đang phát âm thanh…'}</p>
            )}
            {audioError && <p role="alert">{audioError}</p>}
          </>
        )}
      </section>
      {topic && (
        <>
          {mode === 'cards' ? (
            <Flashcards key={studyKey} words={words} />
          ) : mode === 'quiz' ? (
            <QuickQuiz key={studyKey} words={words} />
          ) : (
            <>
              {words.length === 0 && <p>Không có từ khớp bộ lọc. Hãy xóa bộ lọc để xem đầy đủ.</p>}
              <section className="vocabulary-grid" aria-label="Danh sách từ vựng">
                {words.map((word) => (
                  <article className="tutor-card word-card vocabulary-word" key={word.id}>
                    <div className="vocabulary-word-title">
                      <h3 lang="en">{word.term}</h3>
                      <span className="vocabulary-level">{word.cefr}</span>
                    </div>
                    <small>{parts[word.part_of_speech]}</small>
                    <p className="phonetic" lang="en-GB">
                      {word.ipa}
                    </p>
                    <strong>{word.meaning_vi}</strong>
                    <p lang="en">{word.example_en}</p>
                    <p className="vocabulary-translation">{word.example_vi}</p>
                    <div className="vocabulary-word-actions">
                      {speech && (
                        <button
                          className="tutor-button"
                          aria-label={`${playing === word.id ? 'Dừng nghe' : 'Nghe'} ${word.term}`}
                          onClick={() => void listen(word)}
                        >
                          {playing === word.id ? (
                            <Square size={16} aria-hidden="true" />
                          ) : (
                            <Volume2 size={16} aria-hidden="true" />
                          )}
                          {playing === word.id ? 'Dừng' : 'Nghe'}
                        </button>
                      )}
                      <button
                        className="tutor-chip"
                        disabled={!state.data || state.busy || !!state.pending}
                        aria-label={`${remembered(word) ? 'Bỏ dấu nhớ' : 'Đánh dấu đã nhớ'} ${word.term}`}
                        aria-pressed={state.data ? remembered(word) : undefined}
                        onClick={() => state.save(id, word.id, !remembered(word))}
                      >
                        {remembered(word) ? (
                          <Check size={16} aria-hidden="true" />
                        ) : (
                          <Plus size={16} aria-hidden="true" />
                        )}
                        {state.data
                          ? remembered(word)
                            ? 'Đã nhớ'
                            : 'Đánh dấu đã nhớ'
                          : 'Chưa tải dấu nhớ'}
                      </button>
                    </div>
                    <label className="vocabulary-select">
                      <input
                        type="checkbox"
                        checked={chosen.includes(word.id)}
                        disabled={!chosen.includes(word.id) && chosen.length >= 5}
                        onChange={() =>
                          setChosen((previous) =>
                            previous.includes(word.id)
                              ? previous.filter((item) => item !== word.id)
                              : [...previous, word.id],
                          )
                        }
                      />{' '}
                      Chọn <span lang="en">{word.term}</span> để luyện
                    </label>
                  </article>
                ))}
              </section>
              <div className="vocabulary-practice tutor-card">
                <h3>Thử dùng từ trong câu chuyện của bạn</h3>
                <p>Chọn tối đa 5 từ. Bạn sẽ xem bản nháp trước khi tự gửi cho Mate.</p>
                <p>
                  {chosen.length
                    ? topic.words
                        .filter((word) => chosen.includes(word.id))
                        .map((word) => word.term)
                        .join(' · ')
                    : 'Chưa chọn từ'}
                </p>
                <button
                  className="tutor-button"
                  disabled={!chosen.length}
                  onClick={() =>
                    onPractice(topic.words.filter((word) => chosen.includes(word.id)).slice(0, 5))
                  }
                >
                  Thực hành với Mate · {chosen.length}/5
                </button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
