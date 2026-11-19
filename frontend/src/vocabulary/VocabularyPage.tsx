import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Briefcase, Check, Coffee, Plus, Square, Trash2, Volume2 } from 'lucide-react';
import { docVanBan, dungDoc } from '../speech/audio';
import { getCustomTopic, getVocabularyCatalog, getVocabularyTopic } from './api';
import { Flashcards, QuickQuiz } from './StudyViews';
import { VocabularyStatus } from './VocabularyStatus';
import type { CustomTopicDetail, VocabularyCatalog, VocabularyWord } from './types';
import type { VocabularyStateController } from './useVocabularyState';
import type { VocabularyGenerationController } from './useVocabularyGeneration';
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
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);
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
          source="authored"
          state={state}
          speech={speech}
          onBack={() => setSelected(null)}
          onPractice={onPractice}
        />
      ) : selectedCustom ? (
        <TopicDetail
          key={selectedCustom}
          id={selectedCustom}
          source="custom"
          state={state}
          speech={speech}
          onBack={() => setSelectedCustom(null)}
          onPractice={onPractice}
        />
      ) : (
        <>
          <CustomTopics generation={state.generation} onOpen={setSelectedCustom} />
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

function resetLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'không xác định';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function CustomTopics({
  generation,
  onOpen,
}: {
  generation: VocabularyGenerationController;
  onOpen: (topicId: string) => void;
}) {
  const [topic, setTopic] = useState('');
  const [target, setTarget] = useState<30 | 60>(30);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const usage = generation.usage;
  const job = generation.job;
  const running = job?.status === 'pending' || job?.status === 'running';
  const jobsLeft = usage ? Math.max(0, usage.jobs_limit - usage.jobs_started) : 0;
  const callsLeft = usage ? Math.max(0, usage.calls_limit - usage.calls_reserved) : 0;
  const resetAt = usage ? resetLabel(usage.resets_at) : '';
  const exhausted = usage !== null && (jobsLeft <= 0 || callsLeft < 10);
  const canSubmit =
    !generation.unavailable && !generation.busy && !running && usage !== null && !exhausted;
  const visible = generation.topics.filter((item) =>
    normalizeVocabulary(`${item.title_vi} ${item.title_en}`).includes(normalizeVocabulary(query)),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = topic.trim();
    if (value.length < 2) {
      setFormError('Chủ đề cần ít nhất 2 ký tự.');
      return;
    }
    if (value.length > 80) {
      setFormError('Chủ đề tối đa 80 ký tự.');
      return;
    }
    setFormError('');
    if (await generation.create(value, target)) setTopic('');
  }

  if (generation.unavailable) {
    return (
      <section className="vocabulary-custom" aria-label="Chủ đề AI của tôi">
        <h2>Chủ đề của tôi</h2>
        <p role="alert">
          {generation.error ||
            'Tạo chủ đề AI chưa được cài đặt trên máy chủ này. Bạn vẫn đọc và ôn các chủ đề có sẵn.'}
        </p>
      </section>
    );
  }

  return (
    <section className="vocabulary-custom" aria-label="Chủ đề AI của tôi">
      <h2>Chủ đề của tôi</h2>
      <p className="vocabulary-source">
        Tạo chủ đề riêng bằng AI. Nội dung mới luôn được gắn nhãn “AI tạo, chưa thẩm định”.
      </p>
      {usage ? (
        <p className="vocabulary-quota">
          Còn{' '}
          <strong>
            {jobsLeft}/{usage.jobs_limit}
          </strong>{' '}
          lượt tạo ·{' '}
          <strong>
            {callsLeft}/{usage.calls_limit}
          </strong>{' '}
          lượt gọi AI dự phòng hôm nay · Lượt làm mới lúc{' '}
          <time dateTime={usage.resets_at}>{resetAt} (giờ địa phương)</time>
        </p>
      ) : generation.loading ? (
        <p role="status">Đang tải hạn mức tạo chủ đề…</p>
      ) : null}
      {exhausted && (
        <p role="alert">
          Bạn đã dùng hết lượt tạo chủ đề hôm nay. Lượt mới mở lúc {resetAt} (giờ địa phương).
        </p>
      )}
      <form
        className="vocabulary-generate"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <label>
          Chủ đề muốn học
          <input
            type="text"
            value={topic}
            maxLength={80}
            disabled={generation.busy || running}
            placeholder="Ví dụ: pha cà phê tại quán"
            onChange={(event) => setTopic(event.target.value)}
          />
        </label>
        <label>
          Số từ
          <select
            value={target}
            disabled={generation.busy || running}
            onChange={(event) => setTarget(Number(event.target.value) as 30 | 60)}
          >
            <option value={30}>30 từ</option>
            <option value={60}>60 từ</option>
          </select>
        </label>
        <span className="vocabulary-char-count">{topic.length}/80</span>
        <button className="tutor-button primary" type="submit" disabled={!canSubmit}>
          Tạo chủ đề bằng AI
        </button>
      </form>
      {formError && <p role="alert">{formError}</p>}
      {generation.error && generation.errorCode !== '' && (
        <div role="alert">
          <p>{generation.error}</p>
          {generation.errorCode === 'quota' && usage && (
            <p>Lượt làm mới lúc {resetAt} (giờ địa phương).</p>
          )}
          {(generation.errorCode === 'unavailable' ||
            generation.errorCode === 'session' ||
            generation.errorCode === 'token_cap') && (
            <button className="tutor-button" onClick={generation.reload}>
              Thử tải lại chủ đề của tôi
            </button>
          )}
        </div>
      )}
      {generation.notice && <p role="status">{generation.notice}</p>}
      {job && (running || job.status === 'completed' || job.status === 'failed') && (
        <section className="vocabulary-job" aria-label="Tiến trình tạo chủ đề">
          {running ? (
            <>
              <h3>Đang tạo chủ đề</h3>
              <p>
                Đã xác thực {job.validated_count}/{job.target_count} từ · {job.batch_size} từ mỗi
                lần gọi AI.
              </p>
              <div
                className="vocabulary-progress"
                role="progressbar"
                aria-label="Tiến trình tạo chủ đề"
                aria-valuemin={0}
                aria-valuemax={job.target_count}
                aria-valuenow={job.validated_count}
              >
                <span
                  style={{
                    width: `${Math.min(100, Math.round((job.validated_count / job.target_count) * 100))}%`,
                  }}
                />
              </div>
              <button
                className="tutor-button"
                disabled={generation.busy}
                onClick={() => void generation.cancel(job.request_id)}
              >
                Hủy job
              </button>
            </>
          ) : job.status === 'completed' && job.topic_id ? (
            <>
              <h3>Đã tạo chủ đề</h3>
              <p>Nội dung do AI tạo, chưa được chuyên gia thẩm định.</p>
              <button
                className="tutor-button primary"
                onClick={() => {
                  generation.acknowledgeCompleted();
                  onOpen(job.topic_id!);
                }}
              >
                Mở chủ đề mới
              </button>
            </>
          ) : job.status === 'failed' ? (
            <>
              <h3>Chưa tạo được chủ đề</h3>
              <p>{generation.error || 'Hãy thử lại với chủ đề khác.'}</p>
            </>
          ) : null}
        </section>
      )}
      {generation.topics.length > 0 && (
        <label className="vocabulary-custom-search">
          Tìm trong chủ đề của tôi
          <input
            type="search"
            value={query}
            placeholder="Tên tiếng Việt hoặc tiếng Anh"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
      {visible.length > 0 && (
        <div className="vocabulary-topic-grid" aria-label="Danh sách chủ đề AI của tôi">
          {visible.map((item) => (
            <article className="vocabulary-custom-card" key={item.topic_id}>
              <button className="vocabulary-custom-open" onClick={() => onOpen(item.topic_id)}>
                <strong>{item.title_vi}</strong>
                <span lang="en">{item.title_en}</span>
                <p>{item.description}</p>
                <span>
                  {item.word_count} từ · Đã nhớ {item.remembered_count}/{item.word_count}
                </span>
                <small className="vocabulary-ai-label">AI tạo, chưa thẩm định</small>
              </button>
              <div className="vocabulary-custom-actions">
                {confirm === item.topic_id ? (
                  <>
                    <button
                      className="tutor-button"
                      onClick={() => {
                        setConfirm(null);
                        void generation.remove(item.topic_id);
                      }}
                    >
                      Xác nhận xóa
                    </button>
                    <button className="text-button" onClick={() => setConfirm(null)}>
                      Hủy
                    </button>
                  </>
                ) : (
                  <button
                    className="text-button"
                    aria-label={`Xóa chủ đề ${item.title_vi}`}
                    onClick={() => setConfirm(item.topic_id)}
                  >
                    <Trash2 size={16} aria-hidden="true" /> Xóa chủ đề
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {generation.topics.length === 0 && !generation.loading && !generation.error && (
        <p>Chưa có chủ đề AI nào. Hãy nhập chủ đề ở trên để bắt đầu.</p>
      )}
      {generation.topics.length > 0 && visible.length === 0 && (
        <p>Không có chủ đề AI nào khớp từ khóa.</p>
      )}
    </section>
  );
}

interface DetailTopic {
  id: string;
  title_vi: string;
  title_en: string;
  words: VocabularyWord[];
}

function customDetail(data: CustomTopicDetail): DetailTopic {
  return {
    id: data.topic_id,
    title_vi: data.title_vi,
    title_en: data.title_en,
    words: data.words.map((word) => ({
      id: word.id,
      term: word.term,
      part_of_speech: word.part_of_speech,
      ipa: word.ipa,
      meaning_vi: word.meaning_vi,
      example_en: word.example_en,
      example_vi: word.example_vi,
      cefr: word.cefr,
    })),
  };
}

function TopicDetail({
  id,
  source,
  state,
  speech,
  onBack,
  onPractice,
}: {
  id: string;
  source: 'authored' | 'custom';
  state: VocabularyStateController;
  speech: boolean;
  onBack: () => void;
  onPractice: (words: VocabularyWord[]) => void;
}) {
  const [topic, setTopic] = useState<DetailTopic | null>(null);
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
    const request =
      source === 'custom'
        ? getCustomTopic(id, controller.signal).then(customDetail)
        : getVocabularyTopic(id, controller.signal);
    void request
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
  }, [id, revision, source]);
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
        {source === 'custom' && (
          <p className="vocabulary-ai-label">AI tạo, chưa thẩm định · IPA Anh–Anh · CEFR gợi ý</p>
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
