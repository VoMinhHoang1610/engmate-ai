import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Chat } from '../Chat';
import { BieuTuong } from '../components/BieuTuong';
import { docVanBan, dungDoc } from '../speech/audio';
import { activateSpeechPreferences } from '../speech/preferences';
import { useThuAm } from '../hooks/useThuAm';
import type { Account, Capabilities, Conversation } from '../types';
import { lessons, localDay, readLearning, tutorTabs, type TutorView } from './curriculum';
import { BookOpen, Mic, ArrowRight, Check } from 'lucide-react';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { ProfilePage } from '../profile/ProfilePage';
import { SettingsPage } from '../settings/SettingsPage';
import { levels, useAccountProfile } from '../profile/api';
import { RoadmapPage } from '../learning/RoadmapPage';
import { LessonGuide } from '../learning/LessonGuide';
import { getLearningProgress } from '../learning/api';
import type { LearningLesson, LessonProgress } from '../learning/types';
import './course.css';

interface Props {
  account: Account;
  capabilities: Capabilities | null;
  conversations: Conversation[];
  selected: Conversation | null;
  draftIdentity: number | null;
  workspace: number;
  busy: boolean;
  more: boolean;
  error: string;
  onNew: () => void;
  onSelect: (row: Conversation) => void;
  onCreated: (row: Conversation) => void;
  onClose: (row: Conversation) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onLogout: () => Promise<void>;
  onOpenLanding?: () => void;
}

export function TutorWorkspace(props: Props) {
  const { account, capabilities, conversations, selected, busy, error } = props;
  useLayoutEffect(() => {
    activateSpeechPreferences(account.username);
    return () => {
      dungDoc();
      activateSpeechPreferences(null);
    };
  }, [account.username]);
  const [view, setView] = useState<TutorView>('mate');
  const mainPane = useRef<HTMLElement | null>(null);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainPane.current) mainPane.current.scrollTop = 0;
  }, [view]);
  const [courseLesson, setCourseLesson] = useState<{
    lesson: LearningLesson;
    conversation: Conversation;
    progress: LessonProgress;
  } | null>(null);
  const [courseVoiceRequest, setCourseVoiceRequest] = useState(0);
  const [courseVoiceActive, setCourseVoiceActive] = useState(false);
  const [courseError, setCourseError] = useState('');
  const courseSync = useRef<AbortController | null>(null);
  useEffect(() => () => courseSync.current?.abort(), []);
  const [learning, setLearning] = useState(() => readLearning(account.username));
  const personal = useAccountProfile(account.username);
  const profileLevel = personal.profile?.cefr_level;
  const profileMinutes = personal.profile?.daily_goal_minutes;
  const profileGoal = personal.profile?.learning_goal;
  const goalTitle =
    learning.goal === 'daily'
      ? 'Giao tiếp hằng ngày'
      : learning.goal === 'work'
        ? 'Học tập & công việc'
        : learning.goal;
  useEffect(() => {
    if (profileLevel && profileMinutes && profileGoal)
      queueMicrotask(() =>
        setLearning((old) => ({
          ...old,
          level: profileLevel,
          minutes: profileMinutes,
          goal:
            profileGoal === 'Tiếng Anh công việc'
              ? 'work'
              : profileGoal === 'Giao tiếp tự tin'
                ? 'daily'
                : profileGoal,
        })),
      );
  }, [profileLevel, profileMinutes, profileGoal]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [storageError, setStorageError] = useState(false);
  const audioAbort = useRef<AbortController | null>(null);
  const historyDrawer = useRef<HTMLElement | null>(null);
  const historyTrigger = useRef<HTMLButtonElement | null>(null);
  const recording = useThuAm(setTranscript, setAudioError, 'en');
  const lesson = lessons.find((l) => l.id === learning.lessonId) ?? lessons[1];
  useEffect(() => {
    try {
      localStorage.setItem(`engmate-learning:${account.username}`, JSON.stringify(learning));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [learning, account.username]);
  useEffect(() => {
    document.title = `${view === 'course' ? 'Lớp học TOEIC' : view === 'mate' ? 'Cùng Mate' : view === 'profile' ? 'Hồ sơ học tập' : view === 'settings' ? 'Cài đặt' : view === 'setup' ? 'Mục tiêu học tập' : view === 'summary' ? 'Kết quả buổi học' : tutorTabs.find((t) => t.id === view)?.label} · EngMate AI`;
    return () => {
      audioAbort.current?.abort();
      dungDoc();
    };
  }, [view]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryOpen(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    const trigger = historyTrigger.current;
    historyDrawer.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons =
        historyDrawer.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (
        !historyDrawer.current?.contains(document.activeElement) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      trigger?.focus();
    };
  }, [historyOpen]);

  function navigate(next: TutorView) {
    if (recording.active) return;
    audioAbort.current?.abort();
    setAudioBusy(false);
    if (view === 'mate' && next !== 'mate' && !selected && props.draftIdentity) {
      const active = conversations.find((row) => row.conversation_id === props.draftIdentity);
      if (active) props.onSelect(active);
    }
    setAudioError('');
    setTranscript('');
    setCourseVoiceRequest(0);
    setCourseVoiceActive(false);
    setView(next === 'lesson' && courseLesson ? 'course' : next);
    setHistoryOpen(false);
  }
  function studyLesson(item: LearningLesson, conversation: Conversation, progress: LessonProgress) {
    courseSync.current?.abort();
    setCourseError('');
    props.onCreated(conversation);
    setCourseLesson({ lesson: item, conversation, progress });
    setCourseVoiceActive(false);
    setCourseVoiceRequest(1);
    setView('course');
  }
  function syncCourse() {
    if (!courseLesson) return;
    const identity = courseLesson.conversation.conversation_id;
    courseSync.current?.abort();
    const abort = new AbortController();
    courseSync.current = abort;
    void getLearningProgress(abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return;
        const progress = data.lessons.find((row) => row.lesson_id === courseLesson.lesson.id);
        if (progress)
          setCourseLesson((old) =>
            old?.conversation.conversation_id === identity ? { ...old, progress } : old,
          );
        setCourseError('');
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setCourseError('Chưa cập nhật được lượt luyện. Bạn có thể thử đồng bộ lại.');
      });
  }
  function startPractice(kind: 'practice' | 'explain' | 'assessment' | 'review') {
    const prompts = {
      practice: `Mate ơi, hãy hướng dẫn tôi luyện hội thoại về “${lesson.topic}” ở mức ${learning.level}. Giải thích ngắn bằng tiếng Việt, rồi đóng vai người đối thoại và hỏi từng câu bằng tiếng Anh. Hãy đợi tôi trả lời rồi sửa lỗi nhẹ nhàng. Bắt đầu với mẫu: ${lesson.example}`,
      explain: `Mate hãy giải thích thêm cấu trúc “${lesson.rule}” ở mức ${learning.level}, cho một ví dụ dễ hiểu rồi hỏi tôi một câu thực hành.`,
      assessment: `Mate hãy đánh giá sơ bộ tiếng Anh của tôi để học ${learning.goal === 'work' ? 'học tập và công việc' : goalTitle}, ${learning.minutes} phút mỗi ngày. Tôi tự chọn mức ${learning.level}. Hãy hỏi 3 câu lần lượt, đợi tôi trả lời từng câu rồi mới đưa nhận xét; không khẳng định trình độ khi chưa đủ bằng chứng.`,
      review: `Mate hãy giúp tôi ôn các cụm: ${lesson.words.map((w) => w[0]).join(', ')}. Cho tình huống về ${lesson.topic}, hỏi từng câu và chờ tôi trả lời trước khi nhận xét.`,
    };
    props.onNew();
    setDraft(prompts[kind]);
    setView('mate');
  }
  function complete() {
    setLearning((old) => ({
      ...old,
      completed: [...new Set([...old.completed, lesson.id])],
      days: [...new Set([...old.days, localDay()])],
    }));
    navigate('summary');
  }
  async function listen() {
    if (audioBusy) {
      audioAbort.current?.abort();
      dungDoc();
      setAudioBusy(false);
      return;
    }
    setAudioError('');
    setAudioBusy(true);
    const controller = new AbortController();
    audioAbort.current = controller;
    try {
      await docVanBan(lesson.phrase, 1, controller.signal);
    } catch (e) {
      if (!controller.signal.aborted && audioAbort.current === controller)
        setAudioError(e instanceof Error ? e.message : 'Chưa phát được âm thanh.');
    } finally {
      if (audioAbort.current === controller) setAudioBusy(false);
    }
  }
  function toggleWord(key: string) {
    setLearning((old) => ({
      ...old,
      remembered: old.remembered.includes(key)
        ? old.remembered.filter((x) => x !== key)
        : [...old.remembered, key],
    }));
  }
  const pageHeading = {
    course: [
      'LỚP HỌC BẰNG GIỌNG NÓI',
      'Lớp học cùng Mate',
      'Nghe Mate giảng, trả lời và luyện lại từng bước.',
    ],
    profile: [
      'TÀI KHOẢN CỦA BẠN',
      'Hồ sơ học tập',
      'Thông tin cá nhân và mục tiêu học tiếng Anh của bạn.',
    ],
    settings: [
      'THIẾT LẬP HỌC TẬP',
      'Cài đặt',
      'Tùy chỉnh giao diện, âm thanh và không gian học tập theo ý bạn.',
    ],
    roadmap: [
      'LỘ TRÌNH CỦA BẠN',
      'Từng bước đến giao tiếp tự tin',
      `${learning.minutes} phút mỗi ngày · ${goalTitle}`,
    ],
    lesson: [
      'LỚP HỌC CÙNG MATE',
      lesson.topic,
      'Nghe Mate giảng, thử nói và tự tin dùng điều vừa học.',
    ],
    pronunciation: [
      'LUYỆN PHÁT ÂM',
      'Nói rõ hơn, tự nhiên hơn',
      'Nghe mẫu, đọc lại rồi luyện từng âm cùng Mate.',
    ],
    vocabulary: [
      'ÔN TẬP / TỪ BÀI VỪA HỌC',
      'Nhớ từ qua tình huống',
      'Đọc ví dụ, tự kiểm tra và đánh dấu những cụm bạn đã nhớ.',
    ],
    progress: [
      'HÀNH TRÌNH CỦA BẠN',
      'Tiến bộ từ những cuộc trò chuyện nhỏ',
      'Mỗi lần thực hành là một bước tiến. Cùng nhìn lại hành trình của bạn.',
    ],
    setup: [
      'BƯỚC KHỞI ĐẦU',
      'Để Mate hiểu bạn hơn',
      'Chọn mục tiêu và nhịp học. Mate sẽ hướng dẫn theo lựa chọn của bạn.',
    ],
    summary: [
      'BUỔI HỌC ĐÃ ĐƯỢC GHI NHẬN',
      'Thêm một bước tiến. Giỏi lắm!',
      'Bạn đã tự xác nhận hoàn thành bài học. Hãy dùng lại điều vừa học trong cuộc sống.',
    ],
    mate: ['', 'Nói cùng Mate', ''],
  }[view];
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    return { day: localDay(date), label: date.toLocaleDateString('vi-VN', { weekday: 'short' }) };
  });

  return (
    <div className={`tutor-shell workspace-shell tutor-view-${view}`}>
      <a className="skip-link" href="#noi-dung">
        Đến nội dung học
      </a>
      <WorkspaceSidebar
        account={account}
        displayName={personal.profile?.display_name}
        avatar={personal.avatar}
        view={view}
        disabled={recording.active}
        busy={busy}
        onNavigate={navigate}
        onNew={() => {
          props.onNew();
          setDraft('');
          navigate('mate');
        }}
        onHistory={() => {
          historyTrigger.current = document.querySelector<HTMLButtonElement>(
            window.matchMedia?.('(max-width: 767px)').matches
              ? '.workspace-mobile-toggle'
              : '[data-workspace-history]',
          );
          setHistoryOpen(true);
        }}
        onLogout={props.onLogout}
        onOpenLanding={props.onOpenLanding}
      />
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="workspace-context">
            <span>Không gian học tập</span>
            <strong>
              {view === 'course'
                ? 'Lớp học TOEIC'
                : view === 'setup'
                  ? 'Mục tiêu học tập'
                  : view === 'profile'
                    ? 'Hồ sơ học tập'
                    : view === 'settings'
                      ? 'Cài đặt'
                      : view === 'summary'
                        ? 'Kết quả buổi học'
                        : tutorTabs.find((tab) => tab.id === view)?.label}
            </strong>
          </div>
          <button
            className="tutor-level"
            onClick={() => navigate('setup')}
            disabled={recording.active}
            title="Đổi mục tiêu và trình độ tự chọn"
          >
            {learning.level} <span>→</span>{' '}
            {levels[Math.min(levels.indexOf(learning.level) + 1, levels.length - 1)]}
          </button>
        </header>
        <main id="noi-dung" className="tutor-main" tabIndex={-1} ref={mainPane}>
          {(!capabilities?.chat || error) && (
            <div className="notice" role="alert">
              {error || capabilities?.reason || 'Đang kết nối với Mate…'}{' '}
              <button className="text-button" onClick={props.onRetry}>
                Kiểm tra lại
              </button>
            </div>
          )}
          {storageError && (
            <p role="status" className="tutor-storage-note">
              Trình duyệt không cho lưu tiến độ; lựa chọn chỉ được giữ trong phiên này.
            </p>
          )}
          <div key={view} className="tutor-view-stage">
            {view === 'mate' ? (
              <>
                <Chat
                  key={selected?.conversation_id ?? `draft-${props.workspace}`}
                  conversation={selected}
                  capabilities={capabilities}
                  onCreated={props.onCreated}
                  onClose={props.onClose}
                  initialDraft={draft}
                  onDraftChange={setDraft}
                  welcome={
                    <div className="workspace-welcome">
                      <span className="workspace-welcome-badge">MATE LẮNG NGHE</span>
                      <h1>Nói cùng Mate</h1>
                      <p>Một cuộc trò chuyện nhỏ, thêm chút tự tin.</p>
                      <div className="workspace-starters">
                        <button
                          className="workspace-starter"
                          data-tone="blue"
                          aria-label="Vào lớp học hôm nay"
                          onClick={() => navigate('lesson')}
                        >
                          <BookOpen size={20} />
                          <span>
                            <strong>Học theo lộ trình</strong>
                            <small>
                              {courseLesson?.lesson.title ??
                                '100 bài nhỏ, từ nền tảng đến nâng cao'}
                            </small>
                          </span>
                          <ArrowRight size={16} />
                        </button>
                        <button
                          className="workspace-starter"
                          data-tone="violet"
                          aria-label="Luyện phát âm"
                          onClick={() => navigate('pronunciation')}
                        >
                          <Mic size={20} />
                          <span>
                            <strong>Luyện phát âm</strong>
                            <small>Nghe mẫu và luyện lại bằng giọng của bạn</small>
                          </span>
                          <BieuTuong ten="arrow" size={16} />
                        </button>
                        <button
                          className="workspace-starter"
                          data-tone="teal"
                          aria-label="Xem tiến độ"
                          onClick={() => navigate('progress')}
                        >
                          <BieuTuong ten="trophy" size={20} />
                          <span>
                            <strong>Xem tiến độ</strong>
                            <small>Ôn bài đã học và tiếp tục hành trình</small>
                          </span>
                          <BieuTuong ten="arrow" size={16} />
                        </button>
                      </div>
                      <div className="workspace-progress-strip">
                        <Check size={16} aria-hidden="true" />
                        <span>
                          {learning.completed.length > 0
                            ? `${learning.completed.length} buổi luyện đã hoàn thành`
                            : 'Bắt đầu một buổi nhỏ hôm nay'}{' '}
                          · Mục tiêu {learning.minutes} phút/ngày
                        </span>
                      </div>
                    </div>
                  }
                />
              </>
            ) : (
              <section className="tutor-page">
                {!['roadmap', 'lesson', 'setup', 'progress'].includes(view) && (
                  <header className="tutor-page-heading">
                    <span className="eyebrow">{pageHeading[0]}</span>
                    <h1>{pageHeading[1]}</h1>
                    <p>{pageHeading[2]}</p>
                  </header>
                )}
                {view === 'profile' &&
                  (personal.loading ? (
                    <p role="status">Đang tải hồ sơ…</p>
                  ) : personal.error || !personal.profile ? (
                    <div className="tutor-card">
                      <p role="alert">{personal.error || 'Chưa tải được hồ sơ.'}</p>
                      <button className="tutor-button" onClick={personal.refresh}>
                        Thử tải lại hồ sơ
                      </button>
                    </div>
                  ) : (
                    <ProfilePage
                      key={`${account.username}:${personal.revision}`}
                      account={account}
                      profile={personal.profile}
                      avatar={personal.avatar}
                      avatarError={personal.avatarError}
                      remembered={learning.remembered.length}
                      completed={learning.completed.length}
                      onSaved={personal.onSaved}
                      onAvatarChanged={personal.avatarChanged}
                      onReload={personal.refresh}
                    />
                  ))}
                {view === 'settings' && (
                  <SettingsPage
                    account={account}
                    learning={learning}
                    onNavigateProfile={() => navigate('profile')}
                    onNavigateSetup={() => navigate('setup')}
                    onLogout={props.onLogout}
                  />
                )}
                {(view === 'roadmap' ||
                  view === 'lesson' ||
                  view === 'setup' ||
                  view === 'progress') && (
                  <RoadmapPage onStudy={studyLesson} progressOnly={view === 'progress'} />
                )}
                {view === 'course' && courseLesson && (
                  <>
                    <div className="course-help">
                      <span>
                        Nói “Mate next step” hoặc “Mate previous step”. Chọn tiếng Việt trong menu
                        âm thanh nếu muốn hỏi bằng tiếng Việt.
                      </span>
                      <span>Tiến độ lưu vào tài khoản của bạn.</span>
                    </div>
                    {!capabilities?.realtime && (
                      <p role="status">
                        Giọng nói chưa sẵn sàng. Bạn vẫn có thể gõ để học với Mate.{' '}
                        {capabilities?.reason}
                      </p>
                    )}
                    {courseError && (
                      <p role="alert" className="error-text">
                        {courseError}{' '}
                        <button className="text-button" onClick={syncCourse}>
                          Đồng bộ lại
                        </button>
                      </p>
                    )}
                    <div className="course-studio">
                      <LessonGuide
                        key={courseLesson.lesson.id}
                        lesson={courseLesson.lesson}
                        progress={courseLesson.progress}
                        voiceActive={courseVoiceActive}
                        onProgress={(progress) =>
                          setCourseLesson((old) => (old ? { ...old, progress } : old))
                        }
                        onExit={() => navigate('roadmap')}
                        onStartVoice={
                          capabilities?.realtime
                            ? () => setCourseVoiceRequest((old) => old + 1)
                            : undefined
                        }
                      />
                      <Chat
                        key={`course-${courseLesson.conversation.conversation_id}`}
                        conversation={courseLesson.conversation}
                        capabilities={capabilities}
                        onCreated={props.onCreated}
                        onClose={(conversation) => {
                          props.onClose(conversation);
                          setCourseLesson(null);
                          navigate('roadmap');
                        }}
                        lessonOpening={
                          courseLesson.progress.practice_turns === 0
                            ? courseLesson.lesson.opening
                            : undefined
                        }
                        startVoiceRequest={courseVoiceRequest}
                        recognitionLanguage="en"
                        onLearningSync={syncCourse}
                        onVoiceActive={setCourseVoiceActive}
                      />
                    </div>
                  </>
                )}
                {view === 'pronunciation' && (
                  <>
                    <article className="tutor-card phrase-card">
                      <span className="eyebrow">CÂU LUYỆN TẬP</span>
                      <h2>{lesson.phrase}</h2>
                      <p>{lesson.ipa}</p>
                    </article>
                    <div className="pronunciation-columns">
                      <article className="tutor-card">
                        <span className="eyebrow">BẠN ĐỌC LẠI</span>
                        <BieuTuong ten="mic" size={32} />
                        <h3>
                          {recording.active
                            ? recording.status
                            : transcript
                              ? 'Đã nhận bản ghi âm'
                              : 'Thử một lần, tự tin hơn'}
                        </h3>
                        <p>
                          {transcript ||
                            'Đọc chậm và rõ. Mate sẽ chép lại lời bạn nói để bạn đối chiếu.'}
                        </p>
                        <small>Bản chép lời chưa phải điểm đánh giá phát âm.</small>
                      </article>
                      <article className="tutor-card">
                        <span className="eyebrow violet">MATE HƯỚNG DẪN</span>
                        <h2>Âm {lesson.sound}</h2>
                        <p>{lesson.soundTip}</p>
                        <span className="cyan">
                          “Không cần hoàn hảo. Mình luyện từng chút một nhé.”
                        </span>
                      </article>
                    </div>
                    {audioError && (
                      <p role="alert" className="error-text">
                        {audioError}
                      </p>
                    )}
                    <div className="page-actions">
                      <button
                        className="tutor-button"
                        disabled={!capabilities?.speech || recording.active}
                        onClick={() => void listen()}
                      >
                        <BieuTuong ten={audioBusy ? 'stop' : 'play'} size={16} />
                        {audioBusy ? 'Dừng nghe mẫu' : 'Nghe phát âm mẫu'}
                      </button>
                      <button
                        className={`tutor-button ${recording.active ? 'selected' : ''}`}
                        disabled={!capabilities?.speech || audioBusy}
                        onClick={() => void recording.toggle()}
                      >
                        <BieuTuong ten={recording.recording ? 'stop' : 'mic'} size={16} />
                        {recording.active ? recording.status : 'Đọc lại câu này'}
                      </button>
                      <button
                        className="tutor-button primary"
                        disabled={recording.active}
                        onClick={() => navigate('vocabulary')}
                      >
                        Tiếp tục · Ôn từ vựng <BieuTuong ten="arrow" size={16} />
                      </button>
                    </div>
                  </>
                )}
                {view === 'vocabulary' && (
                  <>
                    <div className="vocabulary-grid">
                      {lesson.words.map(([word, ipa, meaning, example]) => {
                        const key = `${lesson.id}:${word}`;
                        const remembered = learning.remembered.includes(key);
                        return (
                          <article className="tutor-card word-card" key={word}>
                            <h2>{word}</h2>
                            <p className="phonetic">{ipa}</p>
                            <h3>{meaning}</h3>
                            <p>{example}</p>
                            <button
                              className={`tutor-chip ${remembered ? 'remembered' : ''}`}
                              aria-pressed={remembered}
                              onClick={() => toggleWord(key)}
                            >
                              <BieuTuong ten={remembered ? 'check' : 'plus'} size={14} />
                              {remembered ? 'Đã nhớ' : 'Đánh dấu đã nhớ'}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                    <div className="tutor-card vocabulary-tip">
                      <div>
                        <span className="eyebrow violet">MATE GỢI Ý NHỚ LÂU</span>
                        <p>Thử dùng một cụm vừa học trong câu chuyện của riêng bạn.</p>
                      </div>
                      <button className="tutor-button" onClick={() => startPractice('review')}>
                        Thực hành với Mate
                      </button>
                    </div>
                    <div className="page-actions">
                      <button className="tutor-button" onClick={() => navigate('lesson')}>
                        Xem lại bài giảng
                      </button>
                      <button className="tutor-button primary" onClick={complete}>
                        Hoàn thành buổi học <BieuTuong ten="arrow" size={16} />
                      </button>
                    </div>
                  </>
                )}
                {view === 'summary' && (
                  <>
                    <div className="stats-grid">
                      <article className="tutor-card">
                        <span className="eyebrow">BÀI ĐÃ HỌC</span>
                        <strong>
                          {learning.completed.length} / {lessons.length}
                        </strong>
                        <p>Bạn tự xác nhận sau mỗi bài</p>
                      </article>
                      <article className="tutor-card">
                        <span className="eyebrow">HỘI THOẠI ĐÃ TẢI</span>
                        <strong>
                          {conversations.length}
                          {props.more ? '+' : ''} cuộc
                        </strong>
                        <p>Lịch sử từ tài khoản của bạn</p>
                      </article>
                      <article className="tutor-card">
                        <span className="eyebrow">TỪ VỰNG ĐÃ NHỚ</span>
                        <strong>{learning.remembered.length} cụm từ</strong>
                        <p>Theo các cụm bạn đã đánh dấu</p>
                      </article>
                    </div>
                    <div className="progress-columns">
                      <article className="tutor-card">
                        <span className="eyebrow">NHỊP HỌC 7 NGÀY</span>
                        <div className="week-chart">
                          {week.map(({ day, label }) => (
                            <div key={day}>
                              <span
                                className={learning.days.includes(day) ? 'studied' : ''}
                                aria-label={`${day}: ${learning.days.includes(day) ? 'Có hoàn thành bài' : 'Chưa ghi nhận'}`}
                              />
                              <small>{label}</small>
                            </div>
                          ))}
                        </div>
                      </article>
                      <article className="tutor-card">
                        <span className="eyebrow violet">
                          {view === 'summary' ? 'GỢI Ý CHO BUỔI TIẾP THEO' : 'MỤC TIÊU HỌC TẬP'}
                        </span>
                        <h2>{view === 'summary' ? lesson.topic : 'Đều đặn hơn mỗi ngày'}</h2>
                        <p>
                          {learning.minutes} phút mỗi ngày · Mức tự chọn {learning.level}
                        </p>
                        <p>
                          {view === 'summary'
                            ? 'Ôn lại mẫu câu, luyện phát âm và thử kể một tình huống của chính bạn.'
                            : 'Giữ nhịp học phù hợp với bạn. Đừng ngại hỏi lại khi cần Mate giải thích.'}
                        </p>
                        <button className="text-button" onClick={() => startPractice('review')}>
                          Ôn lại cùng Mate <BieuTuong ten="arrow" size={16} />
                        </button>
                      </article>
                    </div>
                    <p className="tutor-storage-note">
                      Mục tiêu, bài hoàn thành và từ đã nhớ lưu riêng cho tài khoản trên trình duyệt
                      này. Lịch sử hội thoại lưu trong tài khoản.
                    </p>
                    <div className="page-actions">
                      <button className="tutor-button" onClick={() => navigate('pronunciation')}>
                        Ôn lại phần phát âm
                      </button>
                      <button
                        className="tutor-button primary"
                        onClick={() => navigate(view === 'summary' ? 'progress' : 'roadmap')}
                      >
                        {view === 'summary' ? 'Xem tiến độ học tập' : 'Tiếp tục lộ trình'}{' '}
                        <BieuTuong ten="arrow" size={16} />
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        </main>
        <footer className="tutor-footer">
          <span>EngMate AI · Mỗi buổi học là một bước tiến</span>
          <span>Gia sư AI của bạn</span>
        </footer>
      </div>
      {historyOpen && (
        <>
          <button
            className="tutor-history-backdrop"
            aria-label="Đóng danh sách hội thoại"
            onClick={() => setHistoryOpen(false)}
          />
          <aside
            className="tutor-history"
            ref={historyDrawer}
            role="dialog"
            aria-modal="true"
            aria-label="Lịch sử hội thoại"
          >
            <header>
              <h2>Lịch sử hội thoại</h2>
              <button
                className="icon-button"
                autoFocus
                aria-label="Đóng lịch sử"
                onClick={() => setHistoryOpen(false)}
              >
                <BieuTuong ten="close" />
              </button>
            </header>
            <button
              className="tutor-button primary full-width"
              disabled={busy}
              onClick={() => {
                props.onNew();
                setDraft('');
                navigate('mate');
              }}
            >
              Hội thoại mới <BieuTuong ten="plus" size={16} />
            </button>
            <nav aria-label="Danh sách hội thoại">
              {conversations.map((row) => (
                <button
                  className={`history-item ${(selected?.conversation_id ?? props.draftIdentity) === row.conversation_id ? 'active' : ''}`}
                  key={row.conversation_id}
                  aria-current={
                    (selected?.conversation_id ?? props.draftIdentity) === row.conversation_id
                      ? 'page'
                      : undefined
                  }
                  aria-label={`${row.title}, ${new Date(row.created_at).toLocaleDateString('vi-VN')}${row.status !== 'in_progress' ? ', Đã kết thúc' : ''}`}
                  onClick={() => {
                    setDraft('');
                    props.onSelect(row);
                    navigate('mate');
                  }}
                >
                  <BieuTuong ten="chat" size={18} />
                  <span>
                    {row.title}
                    <small>
                      {new Date(row.created_at).toLocaleDateString('vi-VN')}
                      {row.status !== 'in_progress' ? ' · Đã kết thúc' : ''}
                    </small>
                  </span>
                </button>
              ))}
              {!conversations.length && <p className="muted">Chưa có hội thoại.</p>}
              {props.more && (
                <button className="text-button" disabled={busy} onClick={props.onLoadMore}>
                  Tải thêm hội thoại
                </button>
              )}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}
