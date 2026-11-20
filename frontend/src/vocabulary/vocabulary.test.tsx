import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import content from '../../../backend/app/content/vocabulary.v1.json';
import { apiFetch } from '../api/database';
import { docVanBan, dungDoc } from '../speech/audio';
import { getVocabularyCatalog, VocabularyError } from './api';
import { VocabularyPage } from './VocabularyPage';
import { VocabularySummary } from './VocabularyStatus';
import { useVocabularyState } from './useVocabularyState';
import type {
  CustomTopicDetail,
  CustomTopicSummary,
  CustomWord,
  GenerationJob,
  VocabularyStates,
  VocabularyUsage,
  VocabularyWord,
} from './types';

vi.mock('../api/database', () => ({ apiFetch: vi.fn() }));
vi.mock('../speech/audio', () => ({ docVanBan: vi.fn(), dungDoc: vi.fn() }));

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
let state: VocabularyStates;
let unavailable: boolean;
let writeFailures: number;
let writes: { path: string; body: Record<string, unknown> }[];
let override:
  ((path: string, options: RequestInit) => Promise<Response> | Response | undefined) | null;
const practice = vi.fn<(words: VocabularyWord[]) => void>();
const listing = {
  ...content,
  topics: content.topics.map(({ words, ...topic }) => ({
    ...topic,
    word_count: words.length,
    levels: [...new Set(words.map((word) => word.cefr))],
  })),
};
const resetAt = '2026-11-21T00:00:00+00:00';
const defaultUsage = (overrides: Partial<VocabularyUsage> = {}): VocabularyUsage => ({
  date: '2026-11-20',
  jobs_started: 0,
  jobs_limit: 3,
  calls_reserved: 0,
  calls_used: 0,
  calls_limit: 30,
  resets_at: resetAt,
  ...overrides,
});
const customSummary: CustomTopicSummary = {
  topic_id: 'custom-1',
  title_vi: 'Pha cà phê',
  title_en: 'Coffee brewing',
  description: 'Từ vựng khi pha cà phê tại quán.',
  word_count: 2,
  remembered_count: 1,
  review_status: 'ai_generated_unreviewed',
  source: 'custom',
  created_at: '2026-11-20T08:00:00+00:00',
};
const customDetail: CustomTopicDetail = {
  topic_id: 'custom-1',
  title_vi: 'Pha cà phê',
  title_en: 'Coffee brewing',
  description: 'Từ vựng khi pha cà phê tại quán.',
  word_count: 2,
  review_status: 'ai_generated_unreviewed',
  source: 'custom',
  created_at: '2026-11-20T08:00:00+00:00',
  words: content.topics[0].words.slice(0, 2).map((word, index) => ({
    ...word,
    part_of_speech: word.part_of_speech as CustomWord['part_of_speech'],
    remembered: index === 0,
    version: 1,
  })),
};
const pendingJob = (): GenerationJob => ({
  request_id: 'request-1',
  status: 'pending',
  target_count: 30,
  validated_count: 0,
  batch_size: 6,
  poll_after_ms: 2000,
  topic_id: null,
  error_code: null,
  retry_after: null,
});
let customTopics: CustomTopicSummary[];
let customDetailResponse: CustomTopicDetail | null;
let activeJobs: GenerationJob[];
let usage: VocabularyUsage;
let generationError: { status: number; code: string } | null;
let startedJob: GenerationJob;
let polls: GenerationJob[];
let pollCalls: string[];
let cancelCalls: string[];
let deleteCalls: string[];
let generationBodies: Record<string, unknown>[];
let cancelResult: GenerationJob | null;

beforeEach(() => {
  state = { states: [], legacy_imported: false };
  unavailable = false;
  writeFailures = 0;
  writes = [];
  override = null;
  practice.mockReset();
  customTopics = [];
  customDetailResponse = null;
  activeJobs = [];
  usage = defaultUsage();
  generationError = null;
  startedJob = pendingJob();
  polls = [];
  pollCalls = [];
  cancelCalls = [];
  deleteCalls = [];
  generationBodies = [];
  cancelResult = null;
  vi.mocked(docVanBan).mockReset().mockResolvedValue(undefined);
  vi.mocked(dungDoc).mockReset();
  vi.mocked(apiFetch)
    .mockReset()
    .mockImplementation(async (path, options = {}) => {
      const custom = override?.(path, options);
      if (custom) return custom;
      if (path === '/api/vocabulary/me/topics') {
        return json({ topics: customTopics, active_jobs: activeJobs, usage });
      }
      if (path.startsWith('/api/vocabulary/me/topics/')) {
        if (options.method === 'DELETE') {
          deleteCalls.push(path);
          customTopics = customTopics.filter(
            (topic) => path !== `/api/vocabulary/me/topics/${topic.topic_id}`,
          );
          customDetailResponse = null;
          return new Response(null, { status: 204 });
        }
        if (customDetailResponse && path.endsWith(`/${customDetailResponse.topic_id}`)) {
          return json(customDetailResponse);
        }
        return json({}, 404);
      }
      if (path === '/api/vocabulary/generations' && options.method === 'POST') {
        generationBodies.push(JSON.parse(String(options.body)) as Record<string, unknown>);
        if (generationError) {
          return json({ detail: { code: generationError.code } }, generationError.status);
        }
        return json(startedJob, 202);
      }
      if (path.startsWith('/api/vocabulary/generations/')) {
        if (path.endsWith('/cancel')) {
          cancelCalls.push(path);
          return json(cancelResult ?? { ...startedJob, status: 'cancelled' });
        }
        pollCalls.push(path);
        return json(polls.shift() ?? { ...startedJob, status: 'running' });
      }
      if (path === '/api/vocabulary/topics') return json(listing);
      if (path === '/api/vocabulary/me/states')
        return unavailable
          ? json({ detail: { code: 'vocabulary_not_installed' } }, 503)
          : json(state);
      if (options.method === 'PUT' || options.method === 'POST') {
        const body = JSON.parse(String(options.body)) as Record<string, unknown>;
        writes.push({ path, body });
        if (writeFailures-- > 0) return json({}, 503);
        if (path.endsWith('/import-legacy')) {
          state.legacy_imported = true;
          return json({ imported: 1, skipped: 0 });
        }
        const segments = path.split('/');
        const next = {
          topic_id: segments[4],
          word_id: segments[6],
          remembered: Boolean(body.remembered),
          version: Number(body.version) + 1,
        };
        state.states = [
          ...state.states.filter(
            (word) => word.topic_id !== next.topic_id || word.word_id !== next.word_id,
          ),
          next,
        ];
        return json(next);
      }
      const topic = content.topics.find((item) => path === `/api/vocabulary/topics/${item.id}`);
      if (topic) return json(topic);
      return json({}, 404);
    });
});

afterEach(() => {
  vi.useRealTimers();
});

function Harness({
  owner = 'first',
  speech = false,
  legacyKeys = [],
}: {
  owner?: string;
  speech?: boolean;
  legacyKeys?: string[];
}) {
  const controller = useVocabularyState(owner);
  return (
    <div className="workspace-shell">
      <VocabularySummary state={controller} />
      <VocabularyPage
        state={controller}
        speech={speech}
        legacyKeys={legacyKeys}
        onPractice={practice}
      >
        <p>Nội dung giao tiếp cũ</p>
      </VocabularyPage>
    </div>
  );
}

async function openFood(topics?: ReturnType<typeof within>) {
  let choices = topics;
  if (!choices) {
    const foodTitle = await screen.findByText('Đồ ăn & thức uống', { selector: 'strong' });
    const topicsRegion = foodTitle.closest('section');
    if (!topicsRegion) throw new Error('Missing vocabulary topic choices');
    expect(topicsRegion).toHaveRole('region');
    expect(topicsRegion).toHaveAccessibleName('Chủ đề thường gặp');
    expect(topicsRegion).toBeVisible();
    choices = within(topicsRegion);
  }
  fireEvent.click(choices.getByRole('button', { name: /Đồ ăn & thức uống/ }));
  const appleHeading = await screen.findByText('apple', { selector: 'h3' });
  const listRegion = appleHeading.closest('section');
  if (!listRegion) throw new Error('Missing vocabulary word list');
  expect(listRegion).toHaveRole('region');
  expect(listRegion).toHaveAccessibleName('Danh sách từ vựng');
  expect(listRegion).toBeVisible();
  const list = within(listRegion);
  await list.findByText('apple', { selector: 'h3' });
  wordCard('apple', list);
  return list;
}

function topicControls() {
  return within(screen.getByRole('region', { name: 'Điều khiển chủ đề từ vựng' }));
}

function wordList() {
  return within(screen.getByRole('region', { name: 'Danh sách từ vựng' }));
}

function wordCard(term: string, list = wordList()) {
  const card = list.getByText(term, { selector: 'h3' }).closest('article');
  if (!card) throw new Error(`Missing word card: ${term}`);
  const queries = within(card);
  queries.getByRole('heading', { name: term });
  return queries;
}

function studyModes() {
  return within(topicControls().getByRole('group', { name: 'Cách ôn từ' }));
}

async function findCustomRegion() {
  return within(await screen.findByRole('region', { name: 'Chủ đề AI của tôi' }));
}

async function flushTimers() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function startCustomJob(custom: ReturnType<typeof within>, topic = 'pha cà phê') {
  fireEvent.change(custom.getByRole('textbox', { name: 'Chủ đề muốn học' }), {
    target: { value: topic },
  });
  fireEvent.click(custom.getByRole('button', { name: 'Tạo chủ đề bằng AI' }));
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('authored vocabulary slice', () => {
  it('shows both complete topics, all fifty cards, accent-insensitive filters and back focus', async () => {
    render(<Harness />);
    const officeTitle = await screen.findByText('Văn phòng & công việc', { selector: 'strong' });
    const topicsRegion = officeTitle.closest('section');
    if (!topicsRegion) throw new Error('Missing vocabulary topic choices');
    expect(topicsRegion).toHaveRole('region');
    expect(topicsRegion).toHaveAccessibleName('Chủ đề thường gặp');
    expect(topicsRegion).toBeVisible();
    const topics = within(topicsRegion);
    await topics.findByRole('button', { name: /Văn phòng & công việc/ });
    const catalogFilters = within(screen.getByRole('region', { name: 'Tìm và lọc chủ đề' }));
    fireEvent.change(catalogFilters.getByRole('searchbox', { name: 'Tìm chủ đề' }), {
      target: { value: 'do an' },
    });
    expect(topics.queryByRole('button', { name: /Văn phòng & công việc/ })).not.toBeInTheDocument();
    const list = await openFood(topics);
    const controls = topicControls();
    expect(list.getAllByRole('article')).toHaveLength(50);
    expect(controls.getByText('Hiển thị 50/50 từ')).toBeInTheDocument();
    expect(controls.getByRole('heading', { name: 'Đồ ăn & thức uống' })).toHaveFocus();
    fireEvent.change(controls.getByRole('searchbox', { name: 'Tìm từ' }), {
      target: { value: 'qua tao' },
    });
    expect(list.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(controls.getByRole('button', { name: 'Xóa bộ lọc từ' }));
    fireEvent.change(controls.getByRole('combobox', { name: 'CEFR gợi ý' }), {
      target: { value: 'A2' },
    });
    expect(list.queryByRole('heading', { name: 'apple' })).not.toBeInTheDocument();
    fireEvent.click(controls.getByRole('button', { name: 'Các chủ đề' }));
    const restoredFilters = within(screen.getByRole('region', { name: 'Tìm và lọc chủ đề' }));
    const restoredTopics = within(screen.getByRole('region', { name: 'Chủ đề thường gặp' }));
    expect(restoredFilters.getByRole('searchbox', { name: 'Tìm chủ đề' })).toHaveValue('do an');
    expect(restoredTopics.getByRole('button', { name: /Đồ ăn & thức uống/ })).toHaveFocus();
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('keeps authored content available without SQL tables and never invents a zero count', async () => {
    unavailable = true;
    render(<Harness />);
    const list = await openFood();
    expect(list.getAllByRole('article')).toHaveLength(50);
    expect(screen.getAllByText(/Lưu từ vựng chưa cài đặt/).length).toBeGreaterThan(0);
    const apple = wordCard('apple', list);
    const save = apple.getByRole('button', { name: 'Đánh dấu đã nhớ apple' });
    expect(save).toBeDisabled();
    expect(save).not.toHaveAttribute('aria-pressed');
    expect(topicControls().getByRole('combobox', { name: 'Dấu nhớ' })).toBeDisabled();
    expect(screen.queryByText(/Đã nhớ 0\/50/)).not.toBeInTheDocument();
    expect(apple.queryByRole('button', { name: 'Nghe apple' })).not.toBeInTheDocument();
    unavailable = false;
    const summaryRegion = screen
      .getByText('Từ vựng trên tài khoản', { selector: 'h2' })
      .closest('section');
    if (!summaryRegion) throw new Error('Missing vocabulary account summary');
    expect(summaryRegion).toHaveRole('region');
    expect(summaryRegion).toHaveAccessibleName('Từ vựng trên tài khoản');
    expect(summaryRegion).toBeVisible();
    fireEvent.click(within(summaryRegion).getByRole('button', { name: 'Thử tải lại dấu nhớ' }));
    await waitFor(() => expect(save).toBeEnabled());
    expect(writes).toHaveLength(0);
  });

  it('retries an ambiguous save with the same UUID and syncs the server summary', async () => {
    render(<Harness />);
    await openFood();
    writeFailures = 1;
    const apple = wordCard('apple');
    const summary = within(screen.getByRole('region', { name: 'Từ vựng trên tài khoản' }));
    fireEvent.click(apple.getByRole('button', { name: 'Đánh dấu đã nhớ apple' }));
    fireEvent.click(await summary.findByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await waitFor(() =>
      expect(apple.getByRole('button', { name: 'Bỏ dấu nhớ apple' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(writes).toHaveLength(2);
    expect(writes[0].body).toEqual(writes[1].body);
    expect(screen.getByText('1 từ trong chủ đề mới đã tự đánh dấu nhớ.')).toBeInTheDocument();
    fireEvent.change(topicControls().getByRole('combobox', { name: 'Dấu nhớ' }), {
      target: { value: 'remembered' },
    });
    expect(wordList().getAllByRole('article')).toHaveLength(1);
    fireEvent.click(apple.getByRole('button', { name: 'Bỏ dấu nhớ apple' }));
    await screen.findByText('Không có từ khớp bộ lọc. Hãy xóa bộ lọc để xem đầy đủ.');
    expect(writes[2].body.version).toBe(1);
    expect(writes[2].body.remembered).toBe(false);
  });

  it('does not overwrite conflicts and can recover catalog/detail/network failures', async () => {
    let catalogFails = true;
    let detailFails = true;
    override = (path, options) => {
      if (path.endsWith('/topics') && catalogFails) return json({}, 503);
      if (path.endsWith('/topics/food-and-drink') && detailFails) return json({}, 404);
      if (options.method === 'PUT') return json({}, 409);
    };
    render(<Harness />);
    catalogFails = false;
    fireEvent.click(await screen.findByRole('button', { name: 'Thử tải lại chủ đề' }));
    const topics = within(await screen.findByRole('region', { name: 'Chủ đề thường gặp' }));
    fireEvent.click(topics.getByRole('button', { name: /Đồ ăn & thức uống/ }));
    detailFails = false;
    fireEvent.click(
      await topicControls().findByRole('button', { name: 'Thử tải lại danh sách từ' }),
    );
    const list = within(await screen.findByRole('region', { name: 'Danh sách từ vựng' }));
    const heading = await list.findByText('apple', { selector: 'h3' });
    expect(within(heading.parentElement!).getByRole('heading', { name: 'apple' })).toBe(heading);
    const apple = wordCard('apple');
    fireEvent.click(apple.getByRole('button', { name: 'Đánh dấu đã nhớ apple' }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/apple/state'),
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    await waitFor(() =>
      expect(apple.getByRole('button', { name: 'Đánh dấu đã nhớ apple' })).toBeEnabled(),
    );
    expect(apple.getByRole('button', { name: 'Đánh dấu đã nhớ apple' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const summary = within(screen.getByRole('region', { name: 'Từ vựng trên tài khoản' }));
    expect(summary.queryByRole('button', { name: 'Thử lại cùng yêu cầu' })).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('plays only on click, tracks playback completion and aborts when speech is disabled', async () => {
    const view = render(<Harness speech />);
    await openFood();
    const apple = wordCard('apple');
    const banana = wordCard('banana');
    expect(docVanBan).not.toHaveBeenCalled();
    fireEvent.click(apple.getByRole('button', { name: 'Nghe apple' }));
    expect(docVanBan).toHaveBeenCalledWith(
      'apple',
      1,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(apple.getByRole('button', { name: 'Dừng nghe apple' })).toBeInTheDocument();
    act(() => vi.mocked(docVanBan).mock.calls[0][3]?.());
    expect(apple.getByRole('button', { name: 'Nghe apple' })).toBeInTheDocument();
    fireEvent.click(banana.getByRole('button', { name: 'Nghe banana' }));
    const signal = vi.mocked(docVanBan).mock.calls[1][2];
    view.rerender(<Harness speech={false} />);
    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(apple.queryByRole('button', { name: 'Nghe apple' })).not.toBeInTheDocument();
    expect(dungDoc).toHaveBeenCalled();
  });

  it('provides keyboard-native flashcards and deterministic quiz without saving scores', async () => {
    render(<Harness />);
    await openFood();
    const modes = studyModes();
    fireEvent.click(modes.getByRole('button', { name: 'Thẻ ghi nhớ' }));
    const cards = within(screen.getByRole('region', { name: 'Thẻ ghi nhớ' }));
    const flashcard = cards.getByRole('button', { name: /apple.*Bấm để xem nghĩa/ });
    flashcard.focus();
    expect(flashcard).toHaveFocus();
    fireEvent.click(flashcard);
    expect(flashcard).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('quả táo')).toBeInTheDocument();
    fireEvent.click(cards.getByRole('button', { name: 'Thẻ tiếp' }));
    expect(cards.getByRole('button', { name: /banana.*Bấm để xem nghĩa/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(cards.getByRole('button', { name: 'Thẻ trước' }));
    fireEvent.click(modes.getByRole('button', { name: 'Trắc nghiệm nhanh' }));
    const quiz = within(screen.getByRole('region', { name: 'Trắc nghiệm nhanh' }));
    for (const word of content.topics[0].words.slice(0, 5)) {
      fireEvent.click(quiz.getByRole('button', { name: word.meaning_vi }));
      expect(screen.getByText('Chính xác.')).toBeInTheDocument();
      fireEvent.click(quiz.getByRole('button', { name: 'Câu tiếp' }));
    }
    expect(screen.getByText(/Đúng 5\/5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ôn lại trắc nghiệm' }));
    expect(screen.getByRole('heading', { name: 'apple' })).toBeInTheDocument();
    fireEvent.change(topicControls().getByRole('searchbox', { name: 'Tìm từ' }), {
      target: { value: 'apple' },
    });
    expect(screen.getByText(/Cần ít nhất 4 nghĩa khác nhau/)).toBeInTheDocument();
    expect(writes).toHaveLength(0);
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('requires explicit legacy import consent and retains local storage', async () => {
    localStorage.setItem('legacy-test-source', 'keep');
    render(<Harness legacyKeys={['cafe:I’d like…']} />);
    await screen.findByRole('button', { name: /Đồ ăn & thức uống/ });
    fireEvent.click(screen.getByText('Ôn giao tiếp cũ'));
    const button = screen.getByRole('button', { name: 'Chuyển dấu nhớ cũ' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý chuyển 1 dấu nhớ/ }));
    fireEvent.click(button);
    await screen.findByText(/Dấu nhớ cụm cũ đang dùng dữ liệu đã tải từ tài khoản/);
    expect(writes).toHaveLength(1);
    expect(writes[0].body.remembered_keys).toEqual(['cafe:I’d like…']);
    expect(localStorage.getItem('legacy-test-source')).toBe('keep');
    localStorage.removeItem('legacy-test-source');
  });

  it('prepares at most five selected verified words without sending a chat or paid request', async () => {
    render(<Harness />);
    await openFood();
    for (const word of content.topics[0].words.slice(0, 5)) {
      fireEvent.click(
        wordCard(word.term).getByRole('checkbox', { name: `Chọn ${word.term} để luyện` }),
      );
    }
    expect(wordCard('lemon').getByRole('checkbox', { name: 'Chọn lemon để luyện' })).toBeDisabled();
    const practiceSection = screen.getByText('Thử dùng từ trong câu chuyện của bạn', {
      selector: 'h3',
    }).parentElement!;
    fireEvent.click(
      within(practiceSection).getByRole('button', { name: 'Thực hành với Mate · 5/5' }),
    );
    expect(practice).toHaveBeenCalledWith(content.topics[0].words.slice(0, 5));
    expect(writes).toHaveLength(0);
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('ignores a late previous-account state response', async () => {
    let resolveOld: (response: Response) => void = () => {};
    let first = true;
    override = (path) => {
      if (path === '/api/vocabulary/me/states' && first) {
        first = false;
        return new Promise<Response>((resolve) => {
          resolveOld = resolve;
        });
      }
    };
    const view = render(<Harness owner="first" />);
    view.rerender(<Harness owner="second" />);
    await screen.findByText('0 từ trong chủ đề mới đã tự đánh dấu nhớ.');
    await act(async () =>
      resolveOld(
        json({
          states: [{ topic_id: 'food-and-drink', word_id: 'apple', remembered: true, version: 1 }],
          legacy_imported: true,
        }),
      ),
    );
    expect(screen.getByText('0 từ trong chủ đề mới đã tự đánh dấu nhớ.')).toBeInTheDocument();
    expect(screen.queryByText('1 từ trong chủ đề mới đã tự đánh dấu nhớ.')).not.toBeInTheDocument();
  });

  it('distinguishes session and unsupported-store errors without echoing upstream details', async () => {
    override = () => json({ detail: 'private upstream content' }, 401);
    await expect(getVocabularyCatalog(new AbortController().signal)).rejects.toMatchObject({
      code: 'session',
    });
    override = () => json({ detail: { code: 'vocabulary_mysql_required' } }, 503);
    await expect(getVocabularyCatalog(new AbortController().signal)).rejects.toBeInstanceOf(
      VocabularyError,
    );
  });

  it('shows empty filters and an incorrect quiz answer without marking the word remembered', async () => {
    render(<Harness />);
    await screen.findByRole('button', { name: /Đồ ăn & thức uống/ });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mức gợi ý' }), {
      target: { value: 'B2' },
    });
    expect(screen.queryByRole('button', { name: /Đồ ăn & thức uống/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm chủ đề' }), {
      target: { value: 'not-a-topic' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc chủ đề' }));
    await openFood();
    fireEvent.click(studyModes().getByRole('button', { name: 'Trắc nghiệm nhanh' }));
    const quiz = screen.getByRole('region', { name: 'Trắc nghiệm nhanh' });
    fireEvent.click(within(quiz).getByRole('button', { name: 'quả chuối' }));
    expect(within(quiz).getByText('Nghĩa phù hợp: quả táo.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
});

describe('AI custom topics', () => {
  it('shows quota in local time, creates 30 words, polls to completion and stops', async () => {
    vi.useFakeTimers();
    usage = defaultUsage({ jobs_started: 1, calls_reserved: 10, calls_used: 5 });
    polls = [
      { ...startedJob, status: 'running', validated_count: 6 },
      { ...startedJob, status: 'completed', validated_count: 30, topic_id: 'custom-1' },
    ];
    customTopics = [customSummary];

    render(<Harness />);
    await flushTimers();
    const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
    const quota = screen.getByText(/lượt tạo ·/);
    expect(quota).toHaveTextContent('Còn 2/3 lượt tạo');
    expect(quota).toHaveTextContent('20/30 lượt gọi AI');
    const reset = quota.querySelector('time');
    expect(reset).toHaveAttribute('dateTime', resetAt);
    expect(reset).toHaveTextContent('(giờ địa phương)');

    const input = custom.getByRole('textbox', { name: 'Chủ đề muốn học' });
    expect(custom.getByRole('combobox', { name: 'Số từ' })).toHaveValue('30');
    fireEvent.change(input, { target: { value: '  pha cà phê  ' } });
    fireEvent.click(custom.getByRole('button', { name: 'Tạo chủ đề bằng AI' }));
    await flushTimers();

    expect(generationBodies).toHaveLength(1);
    expect(generationBodies[0]).toMatchObject({
      topic: 'pha cà phê',
      target_count: 30,
    });
    expect(generationBodies[0].client_request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(input).toHaveValue('');
    expect(custom.getByRole('progressbar', { name: 'Tiến trình tạo chủ đề' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(custom.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(custom.getByRole('heading', { name: 'Đã tạo chủ đề' })).toBeInTheDocument();
    expect(custom.getByRole('button', { name: 'Mở chủ đề mới' })).toBeInTheDocument();
    expect(custom.getByText('AI tạo, chưa thẩm định')).toBeInTheDocument();
    expect(pollCalls).toHaveLength(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
      await Promise.resolve();
    });
    expect(pollCalls).toHaveLength(2);
  });

  it('disables creation when the daily quota is exhausted and shows the local reset', async () => {
    vi.useFakeTimers();
    usage = defaultUsage({ jobs_started: 3, calls_reserved: 30 });

    render(<Harness />);
    await flushTimers();
    const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
    expect(custom.getByRole('button', { name: 'Tạo chủ đề bằng AI' })).toBeDisabled();
    expect(custom.getByRole('alert')).toHaveTextContent('Bạn đã dùng hết lượt tạo chủ đề hôm nay.');
    expect(custom.getByText(/Lượt mới mở lúc/)).toHaveTextContent('(giờ địa phương)');
    expect(custom.getByText(/lượt tạo ·/)).toHaveTextContent('Còn 0/3 lượt tạo');
    expect(generationBodies).toHaveLength(0);
  });

  it('maps quota rejection to Vietnamese, keeps the input and shows reset time', async () => {
    vi.useFakeTimers();
    generationError = { status: 429, code: 'vocabulary_quota_exhausted' };

    render(<Harness />);
    await flushTimers();
    const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
    await startCustomJob(custom);

    expect(custom.getByRole('alert')).toHaveTextContent(
      'Bạn đã dùng hết lượt tạo chủ đề AI hôm nay.',
    );
    expect(within(custom.getByRole('alert')).getByText(/Lượt làm mới lúc/)).toHaveTextContent(
      '(giờ địa phương)',
    );
    expect(custom.getByRole('textbox', { name: 'Chủ đề muốn học' })).toHaveValue('pha cà phê');
    expect(pollCalls).toHaveLength(0);
  });

  it('maps token-cap and missing-table failures without locking authored topics', async () => {
    generationError = { status: 503, code: 'vocabulary_token_cap_unsupported' };
    render(<Harness />);
    const custom = await findCustomRegion();
    await startCustomJob(custom);
    expect(await custom.findByRole('alert')).toHaveTextContent(
      'Máy chủ AI đang cho phép phản hồi quá dài nên chưa thể tạo từ vựng.',
    );
    expect(custom.getByRole('button', { name: 'Tạo chủ đề bằng AI' })).toBeEnabled();
    expect(await screen.findByRole('button', { name: /Đồ ăn & thức uống/ })).toBeInTheDocument();

    override = (path) =>
      path === '/api/vocabulary/me/topics'
        ? json({ detail: { code: 'vocabulary_not_installed' } }, 503)
        : undefined;
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại chủ đề của tôi' }));
    expect(await custom.findByRole('alert')).toHaveTextContent(
      'Tạo chủ đề AI chưa được cài đặt trên máy chủ này.',
    );
    expect(custom.queryByRole('textbox', { name: 'Chủ đề muốn học' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đồ ăn & thức uống/ })).toBeInTheDocument();
  });

  it('stops polling and ignores a late response after an account switch', async () => {
    vi.useFakeTimers();
    customTopics = [customSummary];
    let resolvePoll: (response: Response) => void = () => {};
    const view = render(<Harness owner="first" />);
    await flushTimers();
    const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
    expect(custom.getByText('Pha cà phê')).toBeInTheDocument();
    await startCustomJob(custom);
    expect(custom.getByRole('progressbar')).toBeInTheDocument();

    override = (path) => {
      if (path === '/api/vocabulary/generations/request-1') {
        pollCalls.push(path);
        return new Promise<Response>((resolve) => {
          resolvePoll = resolve;
        });
      }
    };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.resolve();
    });
    expect(pollCalls).toHaveLength(1);

    customTopics = [];
    view.rerender(<Harness owner="second" />);
    await flushTimers();
    expect(screen.queryByText('Pha cà phê')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('progressbar', { name: 'Tiến trình tạo chủ đề' }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolvePoll(json({ ...startedJob, status: 'running', validated_count: 12 }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      screen.queryByRole('progressbar', { name: 'Tiến trình tạo chủ đề' }),
    ).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
      await Promise.resolve();
    });
    expect(pollCalls).toHaveLength(1);
  });

  it('cancels an active job and never polls again', async () => {
    vi.useFakeTimers();
    render(<Harness />);
    await flushTimers();
    const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
    await startCustomJob(custom);
    expect(custom.getByRole('progressbar')).toBeInTheDocument();

    fireEvent.click(custom.getByRole('button', { name: 'Hủy job' }));
    await flushTimers();
    expect(cancelCalls).toEqual(['/api/vocabulary/generations/request-1/cancel']);
    expect(custom.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(custom.getByText('Đã hủy; không có chủ đề mới.')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
      await Promise.resolve();
    });
    expect(pollCalls).toHaveLength(0);
  });

  it('stops polling when the page unmounts', async () => {
    vi.useFakeTimers();
    const view = render(<Harness />);
    await flushTimers();
    const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
    await startCustomJob(custom);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(pollCalls).toHaveLength(1);
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
      await Promise.resolve();
    });
    expect(pollCalls).toHaveLength(1);
  });

  it('deletes a custom topic only after explicit confirmation', async () => {
    customTopics = [customSummary];
    render(<Harness />);
    const custom = await findCustomRegion();
    await custom.findByText('Pha cà phê');

    fireEvent.click(custom.getByRole('button', { name: 'Xóa chủ đề Pha cà phê' }));
    expect(custom.getByRole('button', { name: 'Xác nhận xóa' })).toBeInTheDocument();
    expect(deleteCalls).toHaveLength(0);

    fireEvent.click(custom.getByRole('button', { name: 'Xác nhận xóa' }));
    await waitFor(() => expect(deleteCalls).toEqual(['/api/vocabulary/me/topics/custom-1']));
    await waitFor(() => expect(custom.queryByText('Pha cà phê')).not.toBeInTheDocument());
    expect(custom.getByText('Đã xóa chủ đề khỏi tài khoản.')).toBeInTheDocument();
    expect(
      custom.getByText('Chưa có chủ đề AI nào. Hãy nhập chủ đề ở trên để bắt đầu.'),
    ).toBeInTheDocument();
  });

  it('opens the custom detail with the authored study layout and AI label', async () => {
    customTopics = [customSummary];
    customDetailResponse = customDetail;
    render(<Harness speech />);
    const custom = await findCustomRegion();
    await custom.findByText('Pha cà phê');
    expect(custom.getByText('AI tạo, chưa thẩm định')).toBeInTheDocument();

    fireEvent.click(custom.getByRole('button', { name: /^Pha cà phê/ }));
    const controls = within(
      await screen.findByRole('region', { name: 'Điều khiển chủ đề từ vựng' }),
    );
    expect(await controls.findByRole('heading', { name: 'Pha cà phê' })).toHaveFocus();
    expect(
      controls.getByText('AI tạo, chưa thẩm định · IPA Anh–Anh · CEFR gợi ý'),
    ).toBeInTheDocument();
    const list = within(await screen.findByRole('region', { name: 'Danh sách từ vựng' }));
    expect(list.getAllByRole('article')).toHaveLength(2);
    expect(list.getByRole('button', { name: 'Nghe apple' })).toBeInTheDocument();
    expect(docVanBan).not.toHaveBeenCalled();

    fireEvent.change(controls.getByRole('searchbox', { name: 'Tìm từ' }), {
      target: { value: 'apple' },
    });
    expect(list.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(controls.getByRole('button', { name: 'Trắc nghiệm nhanh' }));
    expect(screen.getByText(/Cần ít nhất 4 nghĩa khác nhau/)).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('shows loading, a retryable error and then the real empty state', async () => {
    let resolveList: (response: Response) => void = () => {};
    override = (path) => {
      if (path === '/api/vocabulary/me/topics') {
        return new Promise<Response>((resolve) => {
          resolveList = resolve;
        });
      }
    };
    render(<Harness />);
    const custom = await findCustomRegion();
    expect(screen.getByText('Đang tải hạn mức tạo chủ đề…')).toBeInTheDocument();

    await act(async () => {
      resolveList(json({ detail: { code: 'vocabulary_unavailable' } }, 503));
    });
    expect(await custom.findByRole('alert')).toHaveTextContent(
      'Chưa tải hoặc lưu được từ vựng. Kiểm tra kết nối và thử lại.',
    );
    override = null;
    fireEvent.click(custom.getByRole('button', { name: 'Thử tải lại chủ đề của tôi' }));
    expect(
      await custom.findByText('Chưa có chủ đề AI nào. Hãy nhập chủ đề ở trên để bắt đầu.'),
    ).toBeInTheDocument();
  });

  it('never stores the submitted topic in browser storage', async () => {
    vi.useFakeTimers();
    const topic = 'chủ đề bí mật 2026';
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    try {
      render(<Harness />);
      await flushTimers();
      const custom = within(screen.getByRole('region', { name: 'Chủ đề AI của tôi' }));
      await startCustomJob(custom, topic);
      const localValues = [...Array(localStorage.length)].map((_, index) =>
        localStorage.getItem(localStorage.key(index)!),
      );
      const sessionValues = [...Array(sessionStorage.length)].map((_, index) =>
        sessionStorage.getItem(sessionStorage.key(index)!),
      );
      expect(localValues.join('\n')).not.toContain(topic);
      expect(sessionValues.join('\n')).not.toContain(topic);
      expect(setItem).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining(topic));
    } finally {
      setItem.mockRestore();
      vi.useRealTimers();
    }
  });
});
