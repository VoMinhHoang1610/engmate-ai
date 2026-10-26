import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  Flame,
  Headphones,
  LockKeyhole,
  MessageCircle,
  Plane,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ScoreRing, Sheet, VoiceButton } from './components';
import './learning-views.css';

const levelDetails = [
  { level: 'A1', title: 'Khởi đầu', subtitle: 'Tự tin với câu đầu tiên.' },
  { level: 'A2', title: 'Kết nối', subtitle: 'Nói tự nhiên mỗi ngày.' },
  { level: 'B1', title: 'Chủ động', subtitle: 'Sẵn sàng cho công việc.' },
  { level: 'B2', title: 'Bứt phá', subtitle: 'Diễn đạt rõ, hiểu sâu hơn.' },
  { level: 'C1', title: 'Vững vàng', subtitle: 'Làm chủ mọi cuộc hội thoại.' },
] as const;

const lessonTitles = [
  'Lời chào đầu tiên',
  'Bạn tên là gì?',
  'Những con số nhỏ',
  'Một ngày của bạn',
  'Gia đình của tôi',
  'Sở thích của bạn',
  'Gặp gỡ đồng nghiệp',
  'Ở văn phòng',
  'Một tách cà phê',
  'Hỏi đường nhé',
  'Lên lịch hẹn',
  'Một cuộc gọi ngắn',
  'Đặt bàn ăn tối',
  'Thời tiết hôm nay',
  'Chuyến đi cuối tuần',
  'Mua một món quà',
  'Đọc một email',
  'Trong buổi họp',
  'Kể chuyện của bạn',
  'Sẵn sàng bước tiếp',
];

type Lesson = {
  id: number;
  title: string;
  level: string;
  state: 'complete' | 'current' | 'locked';
};

const lessons: Lesson[] = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  title: lessonTitles[index % 20],
  level: levelDetails[Math.floor(index / 20)].level,
  state: index < 6 ? 'complete' : index === 6 ? 'current' : 'locked',
}));

export function LessonNode({
  lesson,
  onSelect,
}: {
  lesson: Lesson;
  onSelect: (lesson: Lesson, trigger: HTMLButtonElement) => void;
}) {
  const status =
    lesson.state === 'complete'
      ? 'Đã hoàn thành'
      : lesson.state === 'current'
        ? 'Đang học'
        : 'Chưa mở khóa';

  return (
    <div className={`mate-lesson-row is-${lesson.state}`}>
      <motion.button
        type="button"
        className={`mate-lesson-node is-${lesson.state}`}
        onClick={(event) => onSelect(lesson, event.currentTarget)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        aria-label={`Bài ${lesson.id}: ${lesson.title}. ${status}`}
        aria-current={lesson.state === 'current' ? 'step' : undefined}
      >
        {lesson.state === 'complete' ? (
          <Check size={24} aria-hidden="true" />
        ) : lesson.state === 'locked' ? (
          <LockKeyhole size={20} aria-hidden="true" />
        ) : (
          <AudioLines size={27} aria-hidden="true" />
        )}
        <span className="mate-lesson-number">{String(lesson.id).padStart(2, '0')}</span>
      </motion.button>
      <span className="mate-lesson-title">{lesson.title}</span>
      {lesson.state === 'current' && <span className="mate-lesson-current">BẠN ĐANG Ở ĐÂY</span>}
    </div>
  );
}

export function RoadmapView({
  onStartLesson,
}: {
  onStartLesson: (title: string, returnFocus?: HTMLElement) => void;
}) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const lessonTrigger = useRef<HTMLButtonElement | null>(null);
  const selectedLevel = levelDetails[levelIndex];
  const visibleLessons = lessons.slice(levelIndex * 20, levelIndex * 20 + 20);
  const completed = visibleLessons.filter((lesson) => lesson.state === 'complete').length;

  return (
    <div className="mate-learning-view mate-roadmap-view">
      <div className="mate-learning-heading">
        <span className="mate-learning-eyebrow">LỘ TRÌNH CỦA BẠN</span>
        <h1>Từng bước, mỗi ngày</h1>
        <p>100 bài nhỏ. Một hành trình lớn.</p>
      </div>

      <div className="mate-roadmap-level">
        <div className="mate-level-select-wrap">
          <label className="mate-sr-only" htmlFor="mate-roadmap-level">
            Chọn cấp độ
          </label>
          <select
            id="mate-roadmap-level"
            value={levelIndex}
            onChange={(event) => setLevelIndex(Number(event.target.value))}
          >
            {levelDetails.map((item, index) => (
              <option key={item.level} value={index}>
                {item.level} · {item.title}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </div>
        <span className="mate-roadmap-count">
          {completed}
          <span> / 20 bài</span>
        </span>
        <div
          className="mate-roadmap-progress"
          role="progressbar"
          aria-label={`Tiến độ cấp độ ${selectedLevel.level}`}
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={20}
        >
          <span style={{ width: `${completed * 5}%` }} />
        </div>
      </div>

      <div className="mate-roadmap-intro">
        <span className="mate-unit-symbol">
          <BookOpen size={19} aria-hidden="true" />
        </span>
        <div>
          <h2>{selectedLevel.title}</h2>
          <p>{selectedLevel.subtitle}</p>
        </div>
      </div>

      <div className="mate-roadmap-track" key={selectedLevel.level}>
        {visibleLessons.map((lesson) => (
          <LessonNode
            key={lesson.id}
            lesson={lesson}
            onSelect={(lesson, trigger) => {
              lessonTrigger.current = trigger;
              setSelectedLesson(lesson);
            }}
          />
        ))}
        <div className="mate-roadmap-finish">
          <Sparkles size={20} aria-hidden="true" />
          <span>Một phiên bản mới của bạn</span>
        </div>
      </div>

      <Sheet
        open={selectedLesson !== null}
        onClose={() => setSelectedLesson(null)}
        title={selectedLesson?.title ?? ''}
        description={
          selectedLesson ? `${selectedLesson.level} · Bài ${selectedLesson.id}` : undefined
        }
      >
        {selectedLesson && (
          <div className="mate-lesson-sheet-content">
            <div className="mate-lesson-sheet-meta">
              <span>
                <Clock3 size={17} aria-hidden="true" />
                10 phút
              </span>
              <span>
                <Headphones size={17} aria-hidden="true" />
                Nghe & nói
              </span>
            </div>
            {selectedLesson.state === 'locked' ? (
              <div className="mate-lesson-locked-note">
                <LockKeyhole size={18} aria-hidden="true" />
                <span>Hoàn thành bài trước để mở khóa.</span>
              </div>
            ) : (
              <button
                type="button"
                className="mate-learning-button is-primary"
                onClick={() => {
                  onStartLesson(selectedLesson.title, lessonTrigger.current ?? undefined);
                  setSelectedLesson(null);
                }}
              >
                {selectedLesson.state === 'complete' ? 'Ôn lại' : 'Bắt đầu'}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

const pronunciationPhrases = [
  {
    sentence: 'Could you confirm the meeting schedule?',
    hint: '/ˈʃedʒ.uːl/',
    word: 'schedule',
    tip: 'Nhấn âm đầu: SCHED-ule.',
    score: 88,
  },
  {
    sentence: 'I would like to book a room.',
    hint: '/wʊd laɪk/',
    word: 'would',
    tip: 'Nối nhẹ: would‿like.',
    score: 92,
  },
  {
    sentence: 'The presentation starts at nine.',
    hint: '/ˌprez.ənˈteɪ.ʃən/',
    word: 'presentation',
    tip: 'Nhấn âm thứ ba: pres-en-TA-tion.',
    score: 90,
  },
];

export function PronunciationView() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'scored'>('idle');
  const [showTip, setShowTip] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const phrase = pronunciationPhrases[phraseIndex];

  useEffect(() => {
    if (recordingState !== 'recording') return;
    const timer = window.setTimeout(() => setRecordingState('scored'), 2200);
    return () => window.clearTimeout(timer);
  }, [recordingState]);

  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const playSample = () => {
    if (!('speechSynthesis' in window)) {
      setAudioMessage('Thiết bị chưa hỗ trợ nghe mẫu.');
      return;
    }
    window.speechSynthesis.cancel();
    const sample = new SpeechSynthesisUtterance(phrase.sentence);
    sample.lang = 'en-US';
    sample.rate = 0.85;
    sample.onend = () => setPlaying(false);
    sample.onerror = () => {
      setPlaying(false);
      setAudioMessage('Chưa phát được. Hãy thử lại.');
    };
    setAudioMessage('');
    setPlaying(true);
    window.speechSynthesis.speak(sample);
  };

  const nextPhrase = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setPlaying(false);
    setPhraseIndex((index) => (index + 1) % pronunciationPhrases.length);
    setRecordingState('idle');
    setShowTip(false);
    setAudioMessage('');
  };

  return (
    <div className="mate-learning-view mate-pronunciation-view">
      <div className="mate-learning-heading">
        <span className="mate-learning-eyebrow">TỪNG CHÚT RÕ HƠN</span>
        <h1>Nói theo cách bạn</h1>
        <p>Một câu ngắn, thêm tự tin.</p>
      </div>
      <div className="mate-pronunciation-stage">
        <span className="mate-pronunciation-context">
          <BriefcaseBusiness size={15} aria-hidden="true" />
          TOEIC · Giao tiếp hằng ngày
        </span>
        <div className="mate-pronunciation-phrase" lang="en">
          {phrase.sentence.split(' ').map((word, index) => {
            const needsWork = word.toLowerCase().replace(/[.,?!]/g, '') === phrase.word;
            return recordingState === 'scored' && needsWork ? (
              <button
                key={`${phraseIndex}-${index}`}
                type="button"
                className="mate-phrase-word needs-work"
                onClick={() => setShowTip((show) => !show)}
                aria-label={`Gợi ý phát âm: ${word}`}
                aria-expanded={showTip}
              >
                {word}
              </button>
            ) : (
              <span
                key={`${phraseIndex}-${index}`}
                className={`mate-phrase-word ${recordingState === 'scored' ? 'is-correct' : ''}`}
              >
                {word}
              </span>
            );
          })}
        </div>
        {showTip && recordingState === 'scored' && (
          <motion.div
            className="mate-pronunciation-tip"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span lang="en">{phrase.hint}</span>
            <span>{phrase.tip}</span>
          </motion.div>
        )}
        <button
          type="button"
          className={`mate-sample-button ${playing ? 'is-playing' : ''}`}
          onClick={playSample}
          disabled={playing}
        >
          <Volume2 size={19} aria-hidden="true" />
          {playing ? 'Đang phát...' : 'Nghe mẫu'}
        </button>
        {audioMessage && (
          <p className="mate-audio-message" role="status">
            {audioMessage}
          </p>
        )}

        <div className="mate-pronunciation-result" aria-live="polite">
          {recordingState === 'scored' ? (
            <motion.div
              className="mate-pronunciation-score"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ScoreRing value={phrase.score} label="Điểm minh họa" size={136} />
              <p>Rõ hơn từng chút!</p>
              <span>Chạm từ màu cam để xem gợi ý.</span>
            </motion.div>
          ) : (
            <div className="mate-pronunciation-mic">
              <VoiceButton
                onClick={() =>
                  setRecordingState(recordingState === 'recording' ? 'scored' : 'recording')
                }
                active={recordingState === 'recording'}
                label={
                  recordingState === 'recording'
                    ? 'Kết thúc bản ghi minh họa'
                    : 'Thử ghi âm minh họa'
                }
              />
              <p>{recordingState === 'recording' ? 'Đang mô phỏng...' : 'Chạm để nói thử'}</p>
              <span>Bản ghi minh họa · không thu âm</span>
            </div>
          )}
        </div>

        {recordingState === 'scored' && (
          <div className="mate-pronunciation-actions">
            <span className="mate-practice-complete">
              <img src="/mate.svg" width="56" height="56" alt="" />
              <span>
                Thêm một câu đã luyện<small>Kết quả minh họa</small>
              </span>
            </span>
            <button
              type="button"
              className="mate-learning-button is-secondary"
              onClick={() => {
                setRecordingState('idle');
                setShowTip(false);
              }}
            >
              <RotateCcw size={17} aria-hidden="true" />
              Thử lại
            </button>
            <button type="button" className="mate-learning-button is-primary" onClick={nextPhrase}>
              Tiếp theo
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        <div
          className="mate-phrase-dots"
          aria-label={`Câu ${phraseIndex + 1} trên ${pronunciationPhrases.length}`}
        >
          {pronunciationPhrases.map((_, index) => (
            <span key={index} className={index === phraseIndex ? 'is-active' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StreakCard() {
  return (
    <div className="mate-stat-card mate-streak-card">
      <span className="mate-stat-icon is-warm">
        <Flame size={21} aria-hidden="true" />
      </span>
      <span className="mate-stat-value">
        7<span>ngày</span>
      </span>
      <span className="mate-stat-label">Liên tiếp</span>
      <div className="mate-streak-dots" aria-label="Đã học đủ 7 ngày liên tiếp">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index}>
            <Check size={10} aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}

const weeklyMinutes = [6, 12, 8, 14, 10, 8, 12];
const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function ProgressView() {
  return (
    <div className="mate-learning-view mate-progress-view">
      <div className="mate-learning-heading">
        <span className="mate-learning-eyebrow">BẠN ĐANG TIẾN BỘ</span>
        <h1>Đều đặn là đủ</h1>
        <p>Mỗi phút hôm nay đều đáng giá.</p>
      </div>
      <div className="mate-progress-stats">
        <StreakCard />
        <div className="mate-stat-card">
          <span className="mate-stat-icon">
            <Clock3 size={21} aria-hidden="true" />
          </span>
          <span className="mate-stat-value">
            12<span>phút</span>
          </span>
          <span className="mate-stat-label">Hôm nay</span>
          <div
            className="mate-daily-meter"
            role="progressbar"
            aria-label="12 trên 15 phút mục tiêu hôm nay"
            aria-valuenow={12}
            aria-valuemin={0}
            aria-valuemax={15}
          >
            <span />
          </div>
          <span className="mate-stat-footnote">Mục tiêu 15 phút</span>
        </div>
        <div className="mate-stat-card mate-level-stat">
          <ScoreRing value={30} label="A1 → A2" size={120} />
          <span className="mate-stat-label">6 / 20 bài hoàn thành</span>
        </div>
      </div>
      <div className="mate-weekly-card">
        <div className="mate-weekly-header">
          <div>
            <span className="mate-learning-eyebrow">7 NGÀY VỪA QUA</span>
            <h2>Nhịp học của bạn</h2>
          </div>
          <div className="mate-weekly-total">
            <strong>70</strong>
            <span>phút</span>
          </div>
        </div>
        <div
          className="mate-weekly-chart"
          role="img"
          aria-label="Phút học trong 7 ngày: Thứ hai 6, thứ ba 12, thứ tư 8, thứ năm 14, thứ sáu 10, thứ bảy 8, chủ nhật 12. Tổng 70 phút."
        >
          <div className="mate-chart-guides" aria-hidden="true">
            <span>15p</span>
            <span>10p</span>
            <span>5p</span>
            <span>0</span>
          </div>
          <div className="mate-chart-columns" aria-hidden="true">
            {weeklyMinutes.map((minutes, index) => (
              <div
                className={`mate-chart-column ${index === 6 ? 'is-today' : ''}`}
                key={weekDays[index]}
              >
                <div className="mate-chart-bar-space">
                  <span className="mate-chart-value">{minutes}</span>
                  <motion.div
                    className="mate-chart-bar"
                    style={{ height: `${(minutes / 15) * 100}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.045, ease: 'easeOut' }}
                  />
                </div>
                <span className="mate-chart-day">{weekDays[index]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mate-weekly-footer">
          <span className="mate-today-dot" />
          Hôm nay<span>+12 phút cho chính mình</span>
        </div>
      </div>
      <div className="mate-progress-encouragement">
        <Sparkles size={18} aria-hidden="true" />
        <span>Giữ nhịp nhỏ, tiến bước xa.</span>
      </div>
    </div>
  );
}

const exploreTopics = [
  {
    title: 'Làm quen',
    english: 'Nice to meet you',
    description: 'Bắt đầu từ một lời chào.',
    icon: MessageCircle,
    minutes: 5,
  },
  {
    title: 'Ngày đi làm',
    english: 'A day at work',
    description: 'Tự tin cùng đồng nghiệp.',
    icon: BriefcaseBusiness,
    minutes: 10,
  },
  {
    title: 'Một chuyến đi',
    english: 'Ready for takeoff',
    description: 'Mang tiếng Anh đi cùng.',
    icon: Plane,
    minutes: 8,
  },
];

export function ExploreView({ onStartTopic }: { onStartTopic: (title: string) => void }) {
  return (
    <div className="mate-learning-view mate-explore-view">
      <div className="mate-learning-heading">
        <span className="mate-learning-eyebrow">MỞ MỘT CUỘC TRÒ CHUYỆN</span>
        <h1>Hôm nay, nói gì?</h1>
        <p>Một chủ đề. Những điều mới.</p>
      </div>
      <div className="mate-explore-topics">
        {exploreTopics.map((topic, index) => {
          const Icon = topic.icon;
          return (
            <motion.button
              type="button"
              className="mate-topic-card"
              key={topic.title}
              onClick={() => onStartTopic(topic.title)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="mate-topic-illustration">
                <Icon size={38} strokeWidth={1.5} aria-hidden="true" />
                <span className="mate-topic-orbit" />
              </span>
              <span className="mate-topic-time">
                <Clock3 size={13} aria-hidden="true" />
                {topic.minutes} phút
              </span>
              <span className="mate-topic-name">{topic.title}</span>
              <span className="mate-topic-english" lang="en">
                {topic.english}
              </span>
              <span className="mate-topic-description">{topic.description}</span>
              <span className="mate-topic-start">
                Cùng nói nhé
                <ArrowRight size={17} aria-hidden="true" />
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="mate-explore-note">
        <Headphones size={16} aria-hidden="true" />
        Bạn cứ nói. Mate luôn lắng nghe.
      </p>
    </div>
  );
}
