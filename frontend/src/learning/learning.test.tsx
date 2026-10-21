import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/database';
import { docVanBan, dungDoc } from '../speech/audio';
import { LessonGuide } from './LessonGuide';
import { RoadmapPage } from './RoadmapPage';
import {
  getLearningCatalog,
  getLearningPlan,
  LearningConflictError,
  saveLearningPlan,
  setLearningPhase,
  startLearningLesson,
  submitLearningCheck,
} from './api';
import type {
  CheckResult,
  LearningCatalog,
  LearningLesson,
  LearningPlan,
  LessonProgress,
} from './types';

vi.mock('../api/database', () => ({ apiFetch: vi.fn() }));
vi.mock('../speech/audio', () => ({ docVanBan: vi.fn(), dungDoc: vi.fn() }));

const lesson: LearningLesson = {
  id: 'foundation-01',
  title: 'Chào hỏi và giới thiệu',
  minutes: 15,
  objective: 'Giới thiệu tên và công việc của bạn.',
  explanation: 'Dùng I am để giới thiệu bản thân.',
  pattern: 'I am + name / job.',
  example: 'I am Linh. I am a designer.',
  translation: 'Tôi là Linh. Tôi là một nhà thiết kế.',
  situation: 'Bạn gặp một đồng nghiệp mới trong văn phòng.',
  opening: 'Hello! What is your name?',
  practice: ['What is your name?', 'What do you do?', 'Tell me about your colleague.'],
  vocabulary: [
    { term: 'designer', meaning: 'nhà thiết kế', example: 'My colleague is a designer.' },
  ],
  reading: { text: 'Linh is a designer at ABC.', question: 'What does Linh do?' },
  listening: { text: 'Hello, my name is Linh.', question: 'What is the speaker’s name?' },
  checks: [
    {
      id: 'q1',
      prompt: 'Complete: I ___ Linh.',
      options: ['am', 'is', 'are'],
      skill: 'grammar',
      mode: 'reading',
      stimulus: 'My name is Linh.',
    },
    {
      id: 'q2',
      prompt: 'What is her job?',
      options: ['A doctor', 'A designer', 'A driver'],
      skill: 'listening',
      mode: 'listening',
      stimulus: 'I am a designer.',
    },
  ],
};
const advanced = { ...lesson, id: 'advanced-01', title: 'Suy luận ý định người nói' };
const catalog: LearningCatalog = {
  version: 'toeic-voice-v1',
  stages: [
    {
      id: 'foundation',
      title: 'Nền tảng',
      target: 'Bắt đầu từ cơ bản',
      description: 'Xây dựng kiến thức cơ bản.',
      level: 'A1',
      modules: [{ id: 'intro', title: 'Làm quen trong công việc', parts: [], lessons: [lesson] }],
    },
    {
      id: 'advanced',
      title: 'Hướng tới 900+',
      target: 'Mục tiêu 900+',
      description: 'Luyện suy luận nâng cao.',
      level: 'B2',
      modules: [{ id: 'infer', title: 'Hiểu hàm ý', parts: [3, 4], lessons: [advanced] }],
    },
  ],
};
const plan: LearningPlan = {
  version: 0,
  goal_score: 650,
  start_stage: 'foundation',
  minutes: 20,
  exam_date: null,
};
const progress: LessonProgress = {
  lesson_id: lesson.id,
  conversation_id: 42,
  phase: 0,
  practice_turns: 1,
  completed: false,
  check_correct: 0,
  check_total: 0,
  review_due: null,
};
const conversation = {
  conversation_id: 42,
  title: lesson.title,
  status: 'in_progress',
  created_at: '2026-10-18T10:00:00Z',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function routes(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiFetch).mockImplementation(async (path, options) => {
    const method = options?.method ?? 'GET';
    const key = `${method} ${path}`;
    if (key in overrides) return json(overrides[key]);
    if (path.endsWith('/catalog')) return json(catalog);
    if (path.endsWith('/plan'))
      return json(method === 'PUT' ? { ...JSON.parse(String(options?.body)), version: 1 } : plan);
    if (path.endsWith('/progress'))
      return json({ lessons: [progress], recommended_lesson_id: lesson.id, review_lesson_ids: [] });
    if (path.endsWith('/start')) return json({ conversation, progress });
    if (path.endsWith('/phase'))
      return json({ ...progress, phase: JSON.parse(String(options?.body)).phase });
    return json({}, 503);
  });
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(docVanBan).mockReset().mockResolvedValue(undefined);
  vi.mocked(dungDoc).mockClear();
  routes();
});

describe('learning HTTP contracts', () => {
  it('sends ownership through the authenticated API helper and keeps answer keys off start/phase requests', async () => {
    const controller = new AbortController();
    await startLearningLesson('foundation/01', 'request-1', controller.signal);
    expect(apiFetch).toHaveBeenLastCalledWith(
      '/api/learning/lessons/foundation%2F01/start',
      expect.objectContaining({
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({ client_request_id: 'request-1' }),
      }),
    );
    await setLearningPhase(lesson.id, 2, 42);
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls.at(-1)?.[1]?.body))).toEqual({
      phase: 2,
      conversation_id: 42,
    });
    expect(await saveLearningPlan(plan)).toMatchObject({ version: 1, minutes: 20 });
  });

  it.each([
    [401, 'đăng nhập lại'],
    [422, 'chưa hợp lệ'],
    [429, 'quá nhanh'],
    [503, 'Chưa kết nối'],
  ])('explains HTTP %i without exposing server internals', async (status, message) => {
    vi.mocked(apiFetch).mockResolvedValue(
      json({ detail: 'internal SQL and provider secret' }, status),
    );
    await expect(getLearningCatalog()).rejects.toThrow(String(message));
  });

  it('distinguishes an optimistic concurrency conflict', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 409));
    await expect(saveLearningPlan(plan)).rejects.toBeInstanceOf(LearningConflictError);
  });

  it('submits only question choices and retry identity for server grading', async () => {
    vi.mocked(apiFetch).mockImplementation(async () => json({ correct: 1, total: 2 }));
    await submitLearningCheck(lesson.id, 'retry-id', [{ question_id: 'q1', choice: 0 }]);
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]?.body))).toEqual({
      client_request_id: 'retry-id',
      answers: [{ question_id: 'q1', choice: 0 }],
    });
    await getLearningPlan();
  });
});

describe('voice-first roadmap', () => {
  it('loads the catalog, shows measured progress, browses higher stages without auto-playing speech', async () => {
    const onStudy = vi.fn();
    render(<RoadmapPage onStudy={onStudy} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang mở');
    expect(
      await screen.findByRole('heading', { name: 'Chào hỏi và giới thiệu' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bài đã hoàn thành').previousElementSibling).toHaveTextContent('0 / 2');
    expect(docVanBan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /02\s*Hướng tới 900/ }));
    expect(screen.getByRole('heading', { name: advanced.title })).toBeInTheDocument();
    expect(screen.getByText('Part 3 · 4 · 1 bài nhỏ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Học bằng giọng nói' }));
    await waitFor(() => expect(onStudy).toHaveBeenCalledWith(advanced, conversation, progress));
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('retries a load error and cancels outstanding reads on unmount', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Mất kết nối.'));
    const view = render(<RoadmapPage onStudy={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối.');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại lộ trình' }));
    await screen.findByRole('heading', { name: lesson.title });
    const signals = vi
      .mocked(apiFetch)
      .mock.calls.map(([, options]) => options?.signal)
      .filter(Boolean);
    view.unmount();
    expect(signals.some((signal) => signal?.aborted)).toBe(true);
  });

  it('keeps the same start identity after an ambiguous network failure', async () => {
    const fallback = vi.mocked(apiFetch).getMockImplementation()!;
    let failed = false;
    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path.endsWith('/start') && !failed) {
        failed = true;
        throw new Error('Mất kết nối khi mở bài.');
      }
      return fallback(path, options);
    });
    const onStudy = vi.fn();
    render(<RoadmapPage onStudy={onStudy} />);
    const start = await screen.findByRole('button', { name: 'Tiếp tục học bằng giọng nói' });
    fireEvent.click(start);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối khi mở bài.');
    fireEvent.click(start);
    await waitFor(() => expect(onStudy).toHaveBeenCalledOnce());
    const ids = vi
      .mocked(apiFetch)
      .mock.calls.filter(([path]) => path.endsWith('/start'))
      .map(([, options]) => JSON.parse(String(options?.body)).client_request_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  it('saves a changed plan, preserves fields on conflict and explicitly refreshes its version', async () => {
    const fallback = vi.mocked(apiFetch).getMockImplementation()!;
    let puts = 0;
    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path.endsWith('/plan') && options?.method === 'PUT') {
        puts++;
        if (puts === 1) return json({}, 409);
      }
      if (path.endsWith('/plan') && puts === 1) return json({ ...plan, version: 7 });
      return fallback(path, options);
    });
    render(<RoadmapPage onStudy={vi.fn()} />);
    await screen.findByRole('heading', { name: lesson.title });
    fireEvent.click(screen.getByText('Mục tiêu & thời gian học'));
    fireEvent.change(screen.getByLabelText('Mục tiêu điểm'), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText('Chặng bắt đầu'), { target: { value: 'advanced' } });
    fireEvent.change(screen.getByLabelText('Phút học mỗi ngày'), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText('Ngày dự kiến thi (không bắt buộc)'), {
      target: { value: '2027-01-10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mục tiêu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('đã thay đổi');
    expect(screen.getByLabelText('Mục tiêu điểm')).toHaveValue('800');
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật phiên bản, giữ lựa chọn' }));
    await screen.findByText(/Đã cập nhật phiên bản/);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mục tiêu' }));
    await screen.findByText('Đã lưu mục tiêu học tập.');
    const body = JSON.parse(
      String(
        vi
          .mocked(apiFetch)
          .mock.calls.filter(([, options]) => options?.method === 'PUT')
          .at(-1)?.[1]?.body,
      ),
    );
    expect(body).toEqual({
      version: 7,
      goal_score: 800,
      start_stage: 'advanced',
      minutes: 35,
      exam_date: '2027-01-10',
    });
  });

  it('shows review suggestions and real evidence without a fabricated TOEIC score', async () => {
    routes({
      'GET /api/learning/progress': {
        lessons: [
          { ...progress, completed: true, practice_turns: 5, check_correct: 2, check_total: 2 },
        ],
        recommended_lesson_id: advanced.id,
        review_lesson_ids: [lesson.id],
      },
    });
    render(<RoadmapPage onStudy={vi.fn()} progressOnly />);
    expect(await screen.findByRole('heading', { name: 'Kết quả đã ghi nhận' })).toBeInTheDocument();
    expect(screen.getByText('5 lượt luyện · 2/2 câu đúng · Đã hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('Bài đã hoàn thành').previousElementSibling).toHaveTextContent('1 / 2');
    const review = screen.getByText('ĐẾN LÚC ÔN LẠI').parentElement!;
    fireEvent.click(within(review).getByRole('button', { name: /Chào hỏi/ }));
    expect(screen.getByRole('heading', { name: lesson.title })).toBeInTheDocument();
    expect(screen.getByText(/Đã hoàn thành · Bạn vẫn có thể học lại/)).toBeInTheDocument();
  });

  it('limits the starting stage to the chosen course goal while keeping the catalog browsable', async () => {
    const stages = [
      'Nền tảng',
      'Hướng tới 450',
      'Hướng tới 650',
      'Hướng tới 800',
      'Hướng tới 900+',
    ].map((title, index) => ({
      ...catalog.stages[0],
      id: `stage-${index}`,
      title,
      modules: [
        {
          ...catalog.stages[0].modules[0],
          id: `module-${index}`,
          lessons: [{ ...lesson, id: `lesson-${index}` }],
        },
      ],
    }));
    routes({
      'GET /api/learning/catalog': { ...catalog, stages },
      'GET /api/learning/plan': { ...plan, goal_score: 990, start_stage: 'stage-4' },
      'GET /api/learning/progress': {
        lessons: [
          {
            ...progress,
            lesson_id: 'lesson-4',
            completed: true,
            practice_turns: 3,
            check_correct: 2,
            check_total: 2,
          },
        ],
        recommended_lesson_id: null,
        review_lesson_ids: [],
      },
    });
    render(<RoadmapPage onStudy={vi.fn()} progressOnly />);
    await screen.findByText(/Bạn đã hoàn thành các bài thuộc mục tiêu khóa học/);
    fireEvent.click(screen.getByText('Mục tiêu & thời gian học'));
    fireEvent.change(screen.getByLabelText('Mục tiêu điểm'), { target: { value: '450' } });
    expect(screen.getByLabelText('Chặng bắt đầu')).toHaveValue('stage-1');
    expect(screen.getByRole('option', { name: 'Hướng tới 900+' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /05\s*Hướng tới 900/ })).not.toBeDisabled();
  });
});

function guide(overrides: Partial<LessonProgress> = {}, voiceActive = false) {
  const props = {
    lesson,
    progress: { ...progress, ...overrides },
    onProgress: vi.fn(),
    onExit: vi.fn(),
    onStartVoice: vi.fn(),
    voiceActive,
  };
  const view = render(<LessonGuide {...props} />);
  return { ...props, ...view };
}

const passedResult: CheckResult = {
  correct: 2,
  total: 2,
  passed: true,
  feedback: [
    { question_id: 'q1', correct: true, answer: 0, explanation: 'I đi cùng am.' },
    {
      question_id: 'q2',
      correct: true,
      answer: 1,
      explanation: 'Người nói giới thiệu nghề designer.',
    },
  ],
  progress: {
    ...progress,
    phase: 4,
    practice_turns: 3,
    completed: true,
    check_correct: 2,
    check_total: 2,
    review_due: '2026-10-20T10:00:00Z',
  },
};

function answerAll() {
  fireEvent.click(screen.getByLabelText('A. am'));
  fireEvent.click(screen.getByLabelText('B. A designer'));
}

describe('lesson guide', () => {
  it('starts voice only on a deliberate click and advances through the server', async () => {
    const props = guide();
    expect(screen.getByText('Đã luyện 1 lượt')).toBeInTheDocument();
    expect(docVanBan).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /5\s*Tự kiểm tra/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bật micro học cùng Mate' }));
    expect(props.onStartVoice).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp →' }));
    await waitFor(() => expect(props.onProgress).toHaveBeenCalledWith({ ...progress, phase: 1 }));
    expect(screen.getByRole('button', { name: /1\s*Khởi động/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Về lộ trình' }));
    expect(props.onExit).toHaveBeenCalledOnce();
  });

  it('keeps the current phase when saving fails', async () => {
    const props = guide({ phase: 1 });
    vi.mocked(apiFetch).mockResolvedValue(json({}, 503));
    fireEvent.click(screen.getByRole('button', { name: /Bước trước/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa kết nối');
    expect(props.onProgress).not.toHaveBeenCalled();
    expect(screen.getByText(lesson.explanation)).toBeInTheDocument();
    expect(screen.getByText(lesson.vocabulary[0].meaning)).toBeInTheDocument();
  });

  it('offers guided practice, explicit Blaze playback and cancellation on unmount', async () => {
    const props = guide({ phase: 2 });
    expect(screen.getByText(lesson.practice[0])).toBeInTheDocument();
    expect(screen.getByText(lesson.reading.text)).toBeInTheDocument();
    expect(docVanBan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bằng giọng Blaze' }));
    await waitFor(() =>
      expect(docVanBan).toHaveBeenCalledWith(lesson.listening.text, 1, expect.any(AbortSignal)),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dừng âm thanh' }));
    expect(dungDoc).toHaveBeenCalled();
    const signal = vi.mocked(docVanBan).mock.calls[0][2];
    props.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('reports speech failures and disables sample playback during live voice', async () => {
    const props = guide({ phase: 2 });
    vi.mocked(docVanBan).mockRejectedValueOnce(new Error('Blaze chưa sẵn sàng.'));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bằng giọng Blaze' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Blaze chưa sẵn sàng.');
    props.rerender(<LessonGuide {...props} voiceActive />);
    expect(screen.getByRole('button', { name: 'Nghe bằng giọng Blaze' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đang học bằng giọng nói' })).toBeDisabled();
  });

  it('can play a sample again after voice startup cancels its pending audio request', async () => {
    vi.mocked(docVanBan).mockImplementation(
      (_text, _rate, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Cancelled', 'AbortError')),
          );
        }),
    );
    const props = guide({ phase: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bằng giọng Blaze' }));
    expect(screen.getByRole('button', { name: 'Đang tạo giọng Blaze…' })).toBeDisabled();
    props.rerender(<LessonGuide {...props} voiceActive />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Nghe bằng giọng Blaze' })).toBeDisabled(),
    );
    props.rerender(<LessonGuide {...props} voiceActive={false} />);
    expect(screen.getByRole('button', { name: 'Nghe bằng giọng Blaze' })).not.toBeDisabled();
  });

  it('shows the role-play situation and conversational prompts', () => {
    guide({ phase: 3 });
    expect(screen.getByText(lesson.situation)).toBeInTheDocument();
    expect(screen.getByText(lesson.pattern)).toBeInTheDocument();
    expect(screen.getByText(lesson.practice[2])).toBeInTheDocument();
  });

  it('requires all choices, exposes explanations only after server grading, and uses returned evidence', async () => {
    vi.mocked(apiFetch).mockImplementation(async () => json(passedResult));
    const props = guide({ phase: 4, practice_turns: 3 });
    expect(screen.queryByText('I đi cùng am.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('trả lời đủ');
    expect(apiFetch).not.toHaveBeenCalled();
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    await waitFor(() => expect(props.onProgress).toHaveBeenCalledWith(passedResult.progress));
    expect(screen.getByText(/I đi cùng am/)).toBeInTheDocument();
    expect(screen.getByText('Đã luyện 3 lượt')).toBeInTheDocument();
    expect(screen.getByText(/2\/2 câu đúng. Đã hoàn thành/)).toBeInTheDocument();
    props.rerender(<LessonGuide {...props} progress={passedResult.progress} />);
    expect(screen.getByText('✓ Đã hoàn thành')).toBeInTheDocument();
    expect(screen.getByText(/Lịch ôn tiếp theo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chọn bài tiếp theo →' }));
    expect(props.onExit).toHaveBeenCalledOnce();
  });

  it('keeps choices and the retry identity after network failure', async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new Error('Mất kết nối.'))
      .mockImplementation(async () => json(passedResult));
    guide({ phase: 4, practice_turns: 3 });
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối.');
    expect(screen.getByLabelText('A. am')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    await screen.findByText(/2\/2 câu đúng. Đã hoàn thành/);
    const bodies = vi
      .mocked(apiFetch)
      .mock.calls.map(([, options]) => JSON.parse(String(options?.body)));
    expect(bodies[0].client_request_id).toBe(bodies[1].client_request_id);
  });

  it('asks for genuine practice before completion and allows a new attempt with the same correct answers', async () => {
    const notYet = {
      ...passedResult,
      passed: false,
      progress: { ...progress, phase: 4, check_correct: 2, check_total: 2 },
    };
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(json(notYet))
      .mockImplementation(async () => json(passedResult));
    guide({ phase: 4 });
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    await screen.findByText(/đủ 3 lượt luyện tập/);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    await screen.findByText(/2\/2 câu đúng. Đã hoàn thành/);
    const bodies = vi
      .mocked(apiFetch)
      .mock.calls.map(([, options]) => JSON.parse(String(options?.body)));
    expect(bodies[0].client_request_id).not.toBe(bodies[1].client_request_id);
  });

  it('shows wrong-answer feedback and removes stale feedback when choices change', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      json({
        ...passedResult,
        correct: 1,
        passed: false,
        feedback: [
          { question_id: 'q1', correct: false, answer: 0, explanation: 'I cần động từ am.' },
        ],
      }),
    );
    guide({ phase: 4 });
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra câu trả lời' }));
    expect(await screen.findByText(/I cần động từ am/)).toBeInTheDocument();
    expect(screen.getByText(/Xem giải thích, hỏi Mate/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('B. is'));
    expect(screen.queryByText(/I cần động từ am/)).not.toBeInTheDocument();
  });

  it('cancels in-flight mutations without applying results after leaving', async () => {
    let resolve: ((response: Response) => void) | undefined;
    vi.mocked(apiFetch).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const props = guide();
    fireEvent.click(screen.getByRole('button', { name: 'Bước tiếp →' }));
    props.unmount();
    await act(async () => {
      resolve?.(json({ ...progress, phase: 1 }));
    });
    expect(props.onProgress).not.toHaveBeenCalled();
  });
});
