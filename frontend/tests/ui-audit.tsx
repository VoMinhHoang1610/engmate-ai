/** Development-only visual fixture. All API requests are intercepted; no real account is used. */
import { createRoot } from 'react-dom/client';
import App from '../src/voice-first/LiveApp';
import { saveSession } from '../src/api/database';
import { applyTheme } from '../src/theme';
import { applyReducedMotion } from '../src/settings/motion';
import catalog from '../../backend/app/content/toeic.v1.json';
import vocabulary from '../../backend/app/content/vocabulary.v1.json';

const params = new URLSearchParams(location.search);
const root = document.getElementById('root')!;
const width = Number(params.get('width'));
if (width && !params.has('frame')) {
  const frame = document.createElement('iframe');
  const url = new URL(location.href);
  url.searchParams.set('frame', '1');
  frame.src = url.href;
  frame.title = `Giao diện mẫu ${width}px`;
  frame.width = String(width);
  frame.height = params.get('height') || '800';
  frame.style.border = '1px solid #777';
  root.append(frame);
} else {
  const lessons = catalog.stages.flatMap((stage) => stage.modules.flatMap((m) => m.lessons));
  const progress = {
    lessons: lessons.slice(0, 3).map((lesson, index) => ({
      lesson_id: lesson.id,
      conversation_id: 200,
      phase: index ? 1 : 4,
      practice_turns: index ? 1 : 3,
      completed: !index,
      check_correct: index ? 0 : 5,
      check_total: 5,
      review_due: index ? null : '2026-10-20T00:00:00Z',
    })),
    recommended_lesson_id: lessons[1].id,
    review_lesson_ids: [lessons[0].id],
  };
  const conversation = {
    conversation_id: 200,
    title: 'Buổi học mẫu',
    status: 'in_progress',
    created_at: '2026-10-29T00:00:00Z',
  };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  // Never fall through to the real API, including unexpected endpoints or mutations.
  window.fetch = async (input) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      location.origin,
    );
    const path = url.pathname;
    if (path === '/api/vocabulary/me/states')
      return params.get('vocabulary') === 'missing'
        ? json({ detail: { code: 'vocabulary_not_installed' } }, 503)
        : json({
            states: [
              { topic_id: 'food-and-drink', word_id: 'apple', remembered: true, version: 1 },
              ...(vocabulary.topics[0]?.words || []).slice(0, 12).map((word) => ({
                topic_id: 'custom-sample-1',
                word_id: word.id,
                remembered: true,
                version: 1,
              })),
            ],
            legacy_imported: false,
          });
    if (path === '/api/vocabulary/me/topics')
      return params.get('vocabulary') === 'missing'
        ? json({ detail: { code: 'vocabulary_not_installed' } }, 503)
        : json({
            topics: [
              {
                topic_id: 'custom-sample-1',
                title_vi: 'Pha cà phê & thức uống',
                title_en: 'Coffee Brewing & Drinks',
                description: 'Từ vựng các phương pháp pha chế, dụng cụ và hương vị cà phê.',
                word_count: 30,
                remembered_count: 12,
                review_status: 'ai_generated_unreviewed',
                source: 'custom',
                created_at: '2026-11-20T08:00:00+00:00',
              },
            ],
            active_jobs:
              params.get('job') === 'running'
                ? [
                    {
                      request_id: 'request-sample',
                      status: 'running',
                      target_count: 30,
                      validated_count: 18,
                      batch_size: 6,
                      poll_after_ms: 2000,
                      topic_id: null,
                      error_code: null,
                      retry_after: null,
                    },
                  ]
                : [],
            usage: {
              date: '2026-11-20',
              jobs_started: 1,
              jobs_limit: 3,
              calls_reserved: 10,
              calls_used: 5,
              calls_limit: 30,
              resets_at: '2026-11-21T00:00:00+00:00',
            },
          });
    if (path === '/api/vocabulary/generations/request-sample')
      return json({
        request_id: 'request-sample',
        status: 'running',
        target_count: 30,
        validated_count: 18,
        batch_size: 6,
        poll_after_ms: 2000,
        topic_id: null,
        error_code: null,
        retry_after: null,
      });
    if (path === '/api/vocabulary/me/topics/custom-sample-1')
      return json({
        topic_id: 'custom-sample-1',
        title_vi: 'Pha cà phê & thức uống',
        title_en: 'Coffee Brewing & Drinks',
        description: 'Từ vựng các phương pháp pha chế, dụng cụ và hương vị cà phê.',
        word_count: 30,
        review_status: 'ai_generated_unreviewed',
        source: 'custom',
        created_at: '2026-11-20T08:00:00+00:00',
        words: (vocabulary.topics[0]?.words || []).slice(0, 30).map((word, index) => ({
          ...word,
          remembered: index < 12,
          version: 1,
        })),
      });
    if (path === '/api/vocabulary/topics')
      return json({
        ...vocabulary,
        topics: vocabulary.topics.map(({ words, ...topic }) => ({
          ...topic,
          word_count: words.length,
          levels: [...new Set(words.map((word) => word.cefr))],
        })),
      });
    const vocabularyTopic = vocabulary.topics.find(
      (topic) => path === `/api/vocabulary/topics/${topic.id}`,
    );
    if (vocabularyTopic) return json(vocabularyTopic);
    if (params.get('error') && path === `/api/learning/${params.get('error')}`)
      return json({}, 503);
    if (path === '/api/me') return json({ username: 'ui-fixture', email: 'ui@example.test' });
    if (path === '/api/me/profile')
      return json({
        version: '0000000000000001',
        display_name: 'Người học mẫu',
        phone_number: null,
        birth_date: null,
        gender: null,
        cefr_level: 'A1',
        learning_goal: 'Giao tiếp tự tin',
        daily_goal_minutes: 15,
        time_zone_id: 'Asia/Ho_Chi_Minh',
        has_avatar: false,
        total_study_minutes: 0,
      });
    if (path === '/api/capabilities')
      return json({
        provider: 'fixture',
        is_mock: true,
        chat: true,
        speech: false,
        realtime: false,
        reason: 'Bản kiểm tra giao diện bằng dữ liệu mẫu.',
      });
    if (path === '/api/learning/catalog') return json(catalog);
    if (path === '/api/learning/plan')
      return json({
        version: 0,
        goal_score: 650,
        start_stage: 'foundation',
        minutes: 20,
        exam_date: null,
      });
    if (path === '/api/learning/progress') return json(progress);
    if (path.endsWith('/start')) {
      const id = path.split('/').at(-2);
      return json({
        conversation,
        progress: progress.lessons.find((p) => p.lesson_id === id) || {
          ...progress.lessons[1],
          lesson_id: id,
        },
      });
    }
    if (path === '/api/conversations') return json([conversation]);
    if (path.endsWith('/messages'))
      return json([
        {
          message_id: 1,
          role: 'assistant',
          status: 'completed',
          content:
            'Hello! Let’s practise a short introduction. Tell me your name, what you do, and one thing you enjoy learning. Bạn có thể trả lời từng câu ngắn.',
        },
      ]);
    if (path === '/api/voice/voices')
      return json({
        provider: 'gemini',
        default_voice: 'Kore',
        voices: [{ id: 'Kore', name: 'Kore' }],
      });
    if (path === '/api/speech/voices') {
      const language = url.searchParams.get('language') === 'en' ? 'en' : 'vi';
      return json([
        {
          id: language === 'en' ? 'UK-Nu-1-TM' : 'HN-Nam-1-BL',
          name: 'Giọng mẫu',
          language,
          gender: language === 'en' ? 'female' : 'male',
        },
      ]);
    }
    return json({ detail: 'Chức năng này không chạy trong bản kiểm tra giao diện.' }, 503);
  };
  applyTheme(params.get('theme') === 'dark' ? 'dark' : 'light');
  applyReducedMotion(true);
  if (params.get('screen') !== 'auth' && params.get('screen') !== 'landing') {
    saveSession({ access_token: 'fixture-only', refresh_token: 'fixture-only' });
  }
  if (params.get('screen') === 'landing') location.hash = 'trang-chu';
  createRoot(root).render(<App />);
}
