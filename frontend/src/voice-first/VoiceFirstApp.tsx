import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowRight,
  AudioLines,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Flame,
  Map,
  Mic2,
  Moon,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { applyTheme, readTheme } from '../theme';
import { BottomTabBar, SidebarNav, type MatePage } from './SidebarNav';
import { ChatInput, ChipSuggestion, IconButton, Orb, VoiceButton } from './components';
import { ExploreView, ProgressView, PronunciationView, RoadmapView } from './LearningViews';
import { VoiceSession } from './VoiceSession';
import './voice-first.css';
import '../components/mate-listens.css';

const hashes: Record<MatePage, string> = {
  home: 'noi-cung-mate',
  explore: 'kham-pha',
  roadmap: 'lo-trinh',
  pronunciation: 'phat-am',
  progress: 'tien-do',
  settings: 'cai-dat',
};
function pageFromHash(): MatePage {
  return (
    (Object.keys(hashes) as MatePage[]).find(
      (key) => hashes[key] === window.location.hash.slice(1),
    ) ?? 'home'
  );
}
type Message = { id: number; role: 'user' | 'mate'; text: string };

export default function VoiceFirstApp() {
  const [page, setPage] = useState<MatePage>(pageFromHash);
  const [theme, setTheme] = useState(readTheme);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [topic, setTopic] = useState('Làm quen cùng Mate');
  const [messages, setMessages] = useState<Message[]>([]);
  const [replying, setReplying] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const messageId = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const [voiceReturnFocus, setVoiceReturnFocus] = useState<HTMLElement | null>(null);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('engmate-theme', theme);
    } catch {
      /* Optional browser storage. */
    }
  }, [theme]);
  useEffect(() => {
    const update = () => setPage(pageFromHash());
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  useEffect(() => {
    document.title = `${page === 'home' ? 'Nói cùng Mate' : { explore: 'Khám phá', roadmap: 'Lộ trình', pronunciation: 'Phát âm', progress: 'Tiến độ', settings: 'Cài đặt' }[page]} · EngMate AI`;
  }, [page]);
  useEffect(() => () => clearTimeout(replyTimer.current), []);

  function navigate(next: MatePage) {
    clearTimeout(replyTimer.current);
    setReplying(false);
    setPage(next);
    if (window.location.hash !== `#${hashes[next]}`) {
      window.history.pushState(null, '', `#${hashes[next]}`);
    }
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  function startVoice(title = 'Làm quen cùng Mate', returnFocus?: HTMLElement) {
    setVoiceReturnFocus(returnFocus ?? (document.activeElement as HTMLElement | null));
    setTopic(title);
    setVoiceOpen(true);
  }
  function send(text: string) {
    setMessages((old) => [...old.slice(-2), { id: ++messageId.current, role: 'user', text }]);
    setReplying(true);
    replyTimer.current = setTimeout(() => {
      setMessages((old) => [
        ...old.slice(-2),
        { id: ++messageId.current, role: 'mate', text: 'Hi! Let’s start small. How was your day?' },
      ]);
      setReplying(false);
    }, 950);
  }
  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
      <div className="mate-app mate-shell">
        <a
          className="mate-skip-link"
          href="#mate-content"
          onClick={(event) => {
            event.preventDefault();
            mainRef.current?.focus();
          }}
        >
          Đến nội dung chính
        </a>
        <SidebarNav page={page} onNavigate={navigate} />
        <div className="mate-workspace">
          <header className="mate-header">
            <a
              className="mate-wordmark"
              href="#noi-cung-mate"
              onClick={(event) => {
                event.preventDefault();
                navigate('home');
              }}
            >
              <span>
                EngMate<span className="mate-wordmark-ai">AI</span>
              </span>
              <span className="mate-preview-label">BẢN XEM TRƯỚC</span>
            </a>
            <div className="mate-header-actions">
              <span className="mate-streak-pill" title="7 ngày học liên tiếp — dữ liệu mẫu">
                <Flame size={17} strokeWidth={1.8} />
                <strong>7</strong>
                <span>ngày liên tiếp</span>
              </span>
              <button
                type="button"
                className="mate-level-badge"
                onClick={() => navigate('progress')}
                aria-label="A1 đến A2 — Xem tiến độ"
              >
                <span className="mate-level-dot" />
                <strong>A1</strong>
                <ArrowRight size={13} />
                <span>A2</span>
                <ChevronRight size={14} />
              </button>
              <IconButton
                label={
                  theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'
                }
                onClick={toggleTheme}
                aria-pressed={theme === 'dark'}
              >
                {theme === 'light' ? (
                  <Moon size={20} strokeWidth={1.75} />
                ) : (
                  <Sun size={20} strokeWidth={1.75} />
                )}
              </IconButton>
              <IconButton
                label="Cài đặt"
                className="mate-mobile-settings"
                onClick={() => navigate('settings')}
              >
                <Settings2 size={20} />
              </IconButton>
            </div>
          </header>
          <main
            id="mate-content"
            className={`mate-main ${page === 'home' ? 'mate-main-home' : ''}`}
            ref={mainRef}
            tabIndex={-1}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                className={`mate-page mate-page-${page}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              >
                {page === 'home' ? (
                  <section className="mate-home">
                    <div className="mate-home-kicker">
                      <span />
                      MỖI NGÀY, MỘT CHÚT TIẾN BỘ
                    </div>
                    <div className="mate-home-orb">
                      {!voiceOpen && <Orb />}
                      <motion.div
                        className="mate-hello-bubble"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <span>Mate đây, chào bạn!</span>
                        <span className="mate-hello-spark">
                          <Sparkles size={15} />
                        </span>
                      </motion.div>
                      <span className="mate-orb-caption">
                        <span />
                        MATE LUÔN Ở ĐÂY
                      </span>
                    </div>
                    <div className="mate-home-copy">
                      <span className="mate-home-companion">
                        <img src="/mate.svg" width="52" height="52" alt="" /> BẠN ĐỒNG HÀNH CỦA BẠN
                      </span>
                      <h1>
                        Nói cùng <span>Mate.</span>
                      </h1>
                      <p>Một cuộc trò chuyện nhỏ, thêm chút tự tin.</p>
                    </div>
                    <div className="mate-home-voice">
                      <VoiceButton onClick={() => startVoice()} />
                      <span>Nói cùng Mate</span>
                      <small>
                        <ShieldCheck size={13} />
                        Không áp lực. Theo nhịp của bạn.
                      </small>
                    </div>
                    <div className="mate-suggestions">
                      <ChipSuggestion icon={<Map size={17} />} onClick={() => navigate('roadmap')}>
                        Học theo lộ trình
                      </ChipSuggestion>
                      <ChipSuggestion
                        icon={<Mic2 size={17} />}
                        onClick={() => navigate('pronunciation')}
                      >
                        Luyện phát âm
                      </ChipSuggestion>
                      <ChipSuggestion
                        icon={<ChartNoAxesCombined size={17} />}
                        onClick={() => navigate('progress')}
                      >
                        Xem tiến độ
                      </ChipSuggestion>
                    </div>
                    <div className="mate-today-strip">
                      <Check size={17} aria-hidden="true" />
                      <span>
                        <strong>Hôm nay, thêm một bước</strong>
                        <small>Buổi gợi ý · Làm quen cùng Mate · 5 phút</small>
                      </span>
                      <button type="button" onClick={() => navigate('roadmap')}>
                        Xem lộ trình <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="mate-home-composer">
                      <AnimatePresence>
                        {messages.length > 0 && (
                          <motion.div
                            className="mate-chat-messages"
                            role="log"
                            aria-label="Hội thoại mẫu"
                            aria-live="polite"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {messages.map((message) => (
                              <motion.p
                                key={message.id}
                                className={`mate-message mate-message-${message.role}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                <span>{message.role === 'mate' ? 'Mate' : 'Bạn'}</span>
                                <span lang={message.role === 'mate' ? 'en' : undefined}>
                                  {message.text}
                                </span>
                              </motion.p>
                            ))}
                            {replying && (
                              <span
                                className="mate-typing"
                                role="status"
                                aria-label="Mate đang soạn tin"
                              >
                                <i />
                                <i />
                                <i />
                              </span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <ChatInput onSend={send} disabled={replying} />
                      <span className="mate-composer-note">
                        Một cuộc trò chuyện nhỏ. Một bước tiến mới.
                      </span>
                    </div>
                  </section>
                ) : page === 'roadmap' ? (
                  <RoadmapView onStartLesson={startVoice} />
                ) : page === 'pronunciation' ? (
                  <PronunciationView />
                ) : page === 'progress' ? (
                  <ProgressView />
                ) : page === 'explore' ? (
                  <ExploreView onStartTopic={startVoice} />
                ) : (
                  <section className="mate-settings">
                    <span className="mate-section-eyebrow">THEO CÁCH CỦA BẠN</span>
                    <h1>Cài đặt</h1>
                    <p>Một không gian dễ chịu hơn.</p>
                    <div className="mate-settings-card">
                      <span>
                        <Sun size={21} />
                        Giao diện
                      </span>
                      <div className="mate-theme-options">
                        {(['light', 'dark'] as const).map((value) => (
                          <button
                            type="button"
                            key={value}
                            aria-pressed={theme === value}
                            onClick={() => setTheme(value)}
                          >
                            {value === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                            {value === 'light' ? 'Sáng' : 'Tối'}
                            {theme === value && <Check size={16} />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mate-settings-card">
                      <span>
                        <AudioLines size={21} />
                        Phiên trải nghiệm
                      </span>
                      <span className="mate-settings-note">Giọng nói & điểm số mô phỏng</span>
                    </div>
                    <div className="mate-settings-footer">
                      <ShieldCheck size={18} />
                      <span>Học từng chút, tự tin từng ngày.</span>
                    </div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="mate-desktop-footer">
            <span>CHẬM MỘT CHÚT. TIẾN XA HƠN.</span>
            <span>
              <span className="mate-online-dot" /> Không gian học của bạn
            </span>
          </footer>
        </div>
        <BottomTabBar page={page} onNavigate={navigate} />
        <VoiceSession
          open={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          topic={topic}
          returnFocus={voiceReturnFocus}
        />
      </div>
    </MotionConfig>
  );
}
