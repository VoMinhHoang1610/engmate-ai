import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import content from '../../../backend/app/content/vocabulary.v1.json';
import { apiFetch } from '../api/database';
import { docVanBan, dungDoc } from '../speech/audio';
import { getVocabularyCatalog, VocabularyError } from './api';
import { VocabularyPage } from './VocabularyPage';
import { VocabularySummary } from './VocabularyStatus';
import { useVocabularyState } from './useVocabularyState';
import type { VocabularyStates, VocabularyWord } from './types';

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

beforeEach(() => {
  state = { states: [], legacy_imported: false };
  unavailable = false;
  writeFailures = 0;
  writes = [];
  override = null;
  practice.mockReset();
  vi.mocked(docVanBan).mockReset().mockResolvedValue(undefined);
  vi.mocked(dungDoc).mockReset();
  vi.mocked(apiFetch)
    .mockReset()
    .mockImplementation(async (path, options = {}) => {
      const custom = override?.(path, options);
      if (custom) return custom;
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
