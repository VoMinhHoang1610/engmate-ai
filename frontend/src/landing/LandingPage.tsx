import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Logo } from '../components/Logo';
import { BieuTuong } from '../components/BieuTuong';
import { TeacherMate, Waveform } from '../tutor/TutorScene';
import { docVanBan, dungDoc } from '../speech/audio';
import './landing.css';
import { readReducedMotion } from '../settings/motion';

interface LandingPageProps {
  signedIn?: boolean;
  onStartLogin: () => void;
  onStartRegister: () => void;
  onEnterWorkspace?: () => void;
}

const HERO_STRIP = [
  { icon: 'mic', label: 'Đối thoại cùng Mate' },
  { icon: 'waveform', label: 'Nghe giọng mẫu' },
  { icon: 'compass', label: 'Mục tiêu tự chọn' },
  { icon: 'briefcase', label: 'Luyện TOEIC' },
  { icon: 'headphones', label: 'Đối chiếu bản chép lời' },
  { icon: 'flame', label: 'Ôn tập theo tiến độ' },
];

const STORIES = [
  {
    name: 'Giới thiệu bản thân',
    role: 'Tình huống gợi ý',
    tag: 'LÀM QUEN',
    photo: '/engmate-mark.svg',
    quote: 'Tập nói tên, công việc và sở thích. Nhờ Mate hỏi từng câu để bạn có thời gian trả lời.',
  },
  {
    name: 'Họp cùng đồng nghiệp',
    role: 'Tình huống gợi ý',
    tag: 'CÔNG VIỆC',
    photo: '/engmate-mark.svg',
    quote: 'Đóng vai báo cáo tiến độ hoặc hẹn lịch họp, rồi luyện cách diễn đạt rõ ràng hơn.',
  },
  {
    name: 'Nghe và đọc lại',
    role: 'Tình huống gợi ý',
    tag: 'PHÁT ÂM',
    photo: '/engmate-mark.svg',
    quote:
      'Nghe câu mẫu, ghi âm và so sánh bản chép lời. Bản chép lời hỗ trợ tự đối chiếu, chưa chấm điểm phát âm.',
  },
  {
    name: 'Ôn một bài TOEIC',
    role: 'Tình huống gợi ý',
    tag: 'ÔN TẬP',
    photo: '/engmate-mark.svg',
    quote:
      'Mở bài đến lịch ôn trong Tiến độ, thực hành với Mate và làm lại câu kiểm tra kiến thức.',
  },
];

const CANVAS_TABS = [
  {
    id: 'step1',
    title: '01 · Chọn mục tiêu & CEFR',
    sub: 'Cá nhân hóa cấp độ A1–C1 và chủ đề công việc.',
    previewTitle: 'Thiết lập lộ trình cá nhân hóa',
    nodeLeft: 'Đầu vào: Trình độ B1 · Tiếng Anh công sở',
    nodeCenter: 'Gia sư AI Mate điều chỉnh tốc độ nói & cấu trúc câu',
    nodeRight: 'Mục tiêu: Phản xạ cuộc họp & thuyết trình B2',
  },
  {
    id: 'step2',
    title: '02 · Đối thoại giọng nói 2 chiều cùng Thầy Mate',
    sub: 'Luyện nói, nghe phản hồi và xem lại bản chép lời.',
    previewTitle: 'Phòng học hội thoại trực tiếp',
    nodeLeft: 'Bạn nói qua micro hoặc nhập câu trả lời',
    nodeCenter: 'Thầy Mate gợi ý cách diễn đạt và chờ bạn trả lời',
    nodeRight: 'Lưu lịch sử hội thoại & gợi ý cách diễn đạt tự nhiên hơn',
  },
  {
    id: 'step3',
    title: '03 · Nghe mẫu & tự đối chiếu',
    sub: 'Đối chiếu câu bạn nói với giọng mẫu chuẩn.',
    previewTitle: 'Luyện phát âm với câu mẫu',
    nodeLeft: 'Câu mẫu: “Could we schedule a quick sync?”',
    nodeCenter: 'Nghe mẫu, đọc lại và xem bản chép lời của bạn',
    nodeRight: 'Tự đối chiếu với câu mẫu; chưa có điểm phát âm',
  },
  {
    id: 'step4',
    title: '04 · Sổ từ vựng ngữ cảnh',
    sub: 'Ghi nhớ cụm từ vừa dùng trong cuộc trò chuyện.',
    previewTitle: 'Ôn tập từ vựng gắn liền tình huống',
    nodeLeft: 'Chọn cụm từ trong nội dung bài để luyện lại',
    nodeCenter: 'Nghe lại giọng mẫu & đặt câu trong ngữ cảnh mới',
    nodeRight: 'Tự đánh dấu cụm đã nhớ trên trình duyệt',
  },
];

const FAQS = [
  {
    q: 'EngMate AI khác gì so với ứng dụng học tiếng Anh thông thường?',
    a: 'Bạn được trò chuyện giọng nói 2 chiều thời gian thực 1-1 với Gia sư AI Mate, kết hợp giáo trình TOEIC theo chặng và luyện phát âm qua câu mẫu.',
  },
  {
    q: 'Tôi mới bắt đầu (A1–A2) hoặc mất gốc thì có theo kịp không?',
    a: 'Hoàn toàn phù hợp! Ngay khi khởi đầu, Mate sẽ dùng câu ngắn gọn, tốc độ chậm rãi kèm gợi ý mẫu câu và nghĩa tiếng Việt.',
  },
  {
    q: 'Làm sao để bắt đầu trải nghiệm?',
    a: 'Chỉ cần nhấn "Bắt đầu miễn phí", tạo tài khoản trong 15 giây và bước ngay vào phòng học cùng Thầy Mate.',
  },
];

function delayStyle(ms: number): CSSProperties {
  return { '--reveal-delay': `${ms}ms` } as CSSProperties;
}

export function LandingPage({
  signedIn = false,
  onStartLogin,
  onStartRegister,
  onEnterWorkspace,
}: LandingPageProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [speakingSample, setSpeakingSample] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroScrollRatio, setHeroScrollRatio] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = 'EngMate AI · Chinh phục tiếng Anh giao tiếp cùng Gia sư AI';
    return () => {
      dungDoc();
    };
  }, []);

  useEffect(() => {
    const rootEl = pageRef.current;
    if (!rootEl) return;

    const revealElements = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduceMotion =
      readReducedMotion() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof IntersectionObserver !== 'function') {
      revealElements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Toggle both ways so sections re-animate when scrolling up/down.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        }
      },
      { threshold: [0, 0.14, 0.28], rootMargin: '-8% 0px -10% 0px' },
    );
    revealElements.forEach((el) => observer.observe(el));

    const sectionIds = ['trio', 'stories', 'how-it-works', 'features', 'faq'];
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.25, rootMargin: '-80px 0px -45% 0px' },
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const docHeight =
          document.documentElement.scrollHeight - document.documentElement.clientHeight;
        setScrollProgress(docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0);
        setHeroScrollRatio(Math.min(1, Math.max(0, scrollTop / 380)));
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  async function playHeroSample() {
    if (speakingSample) {
      dungDoc();
      setSpeakingSample(false);
      return;
    }
    setSpeakingSample(true);
    try {
      await docVanBan(
        'Hello! I am Mate, your personal AI English tutor. Ready for a quick speaking session today?',
        1,
      );
    } catch {
      /* Fallback if speech backend is offline */
    } finally {
      setSpeakingSample(false);
    }
  }

  const heroTiltDeg = (1 - heroScrollRatio) * 6;
  const heroScale = 0.98 + heroScrollRatio * 0.02;

  return (
    <div ref={pageRef} className="landing-page">
      {/* Top Scroll Progress Bar */}
      <div
        className="landing-scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
        aria-hidden="true"
      />

      {/* Minimal Sticky Header */}
      <header className={`landing-header ${scrollProgress > 0.01 ? 'is-scrolled' : ''}`}>
        <div className="landing-header-inner">
          <a className="landing-brand" href="#hero" aria-label="EngMate AI Trang chủ">
            <Logo hideMark />
          </a>

          <nav className="landing-nav" aria-label="Điều hướng trang giới thiệu">
            <a href="#trio" className={activeSection === 'trio' ? 'active' : ''}>
              Trải nghiệm
            </a>
            <a href="#stories" className={activeSection === 'stories' ? 'active' : ''}>
              Cách luyện
            </a>
            <a href="#how-it-works" className={activeSection === 'how-it-works' ? 'active' : ''}>
              Cách hoạt động
            </a>
            <a href="#features" className={activeSection === 'features' ? 'active' : ''}>
              Tính năng
            </a>
            <a href="#faq" className={activeSection === 'faq' ? 'active' : ''}>
              FAQ
            </a>
          </nav>

          <div className="landing-header-actions">
            {signedIn ? (
              <button type="button" className="landing-btn-blue" onClick={onEnterWorkspace}>
                <span>Vào lớp học</span>
                <BieuTuong ten="arrow" size={15} />
              </button>
            ) : (
              <>
                <button type="button" className="landing-btn-text" onClick={onStartLogin}>
                  Đăng nhập
                </button>
                <button type="button" className="landing-btn-blue" onClick={onStartRegister}>
                  <span>Bắt đầu miễn phí</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="noi-dung">
        {/* 1. EDITORIAL HERO WITH SCENIC PHOTO BANNER & FLOATING CARD */}
        <section id="hero" className="landing-hero">
          <div className="landing-container">
            <h1 className="landing-editorial-title">
              Chinh phục tiếng Anh giao tiếp tự tin cùng Gia sư AI Mate
            </h1>
            <p className="landing-editorial-sub">
              Luyện hội thoại cùng Mate, học TOEIC theo chặng và xem kết quả thực hành đã lưu trong
              tài khoản.
            </p>

            {/* Floating Action Pill overlapping the Hero Scenic Image */}
            <div className="landing-hero-pill-bar">
              <span className="landing-hero-pill-text">Luyện nói trực tiếp 15 phút mỗi ngày…</span>
              <button
                type="button"
                className="landing-btn-blue"
                onClick={signedIn ? onEnterWorkspace : onStartRegister}
              >
                <span>{signedIn ? 'Tiếp tục học ngay' : 'Bắt đầu học miễn phí ngay'}</span>
                <BieuTuong ten="arrow" size={15} />
              </button>
            </div>

            {/* Scenic Hero Photograph with Floating Glass Card */}
            <div className="landing-hero-scenic-wrap" data-reveal="scale">
              <div
                className="landing-hero-scenic"
                style={{
                  transform: `rotateX(${heroTiltDeg.toFixed(2)}deg) scale(${heroScale.toFixed(3)})`,
                }}
              >
                <div className="landing-scenic-left-badge">
                  <span className="landing-pulse-dot" />
                  <span>Phòng học giọng nói AI · Minh họa cách luyện</span>
                </div>

                <div className="landing-scenic-floating-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TeacherMate compact mood={speakingSample ? 'encouraging' : 'welcome'} />
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#2563eb',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Thầy Mate · Câu mẫu minh họa
                      </span>
                      <h3>“Good morning! Could you share your main goal for this week?”</h3>
                    </div>
                  </div>
                  <Waveform active={speakingSample} />
                  <div className="landing-scenic-card-footer">
                    <span>Nghe mẫu rồi thử trả lời theo cách của bạn</span>
                    <button
                      type="button"
                      className="landing-sample-btn"
                      onClick={() => void playHeroSample()}
                    >
                      <BieuTuong ten={speakingSample ? 'stop' : 'volume'} size={14} />
                      <span>{speakingSample ? 'Dừng nghe' : 'Nghe giọng mẫu'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Strip of 6 Capabilities */}
            <div className="landing-hero-strip" data-reveal="up">
              {HERO_STRIP.map((item, idx) => (
                <div key={item.label} className={`landing-strip-item ${idx === 1 ? 'active' : ''}`}>
                  <BieuTuong ten={item.icon} size={15} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. THREE VISUAL PHOTO CARDS WITH FLOATING UI WIDGETS (01, 02, 03) */}
        <section id="trio" className="landing-trio-section">
          <div className="landing-container">
            <div className="landing-trio-grid">
              {/* Visual Card 01 */}
              <article className="landing-visual-card" data-reveal="up" style={delayStyle(0)}>
                <div className="landing-visual-frame photo-1">
                  <div className="landing-floating-widget">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                        fontWeight: 700,
                      }}
                    >
                      <span>Mức giao tiếp tự chọn</span>
                      <span style={{ color: '#2563eb' }}>A1 → C1</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {['A1', 'A2', 'B1', 'B2', 'C1'].map((lv) => (
                        <span
                          key={lv}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '6px 0',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            background: lv === 'B1' ? '#2563eb' : '#f1f5f9',
                            color: lv === 'B1' ? '#ffffff' : '#334155',
                          }}
                        >
                          {lv}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Ví dụ mục tiêu: Tiếng Anh công sở
                    </div>
                  </div>
                </div>
                <div className="landing-visual-caption">
                  <span className="landing-num-badge">01</span>
                  <span>Tự chọn mục tiêu giao tiếp và kế hoạch học TOEIC.</span>
                </div>
              </article>

              {/* Visual Card 02 */}
              <article className="landing-visual-card" data-reveal="up" style={delayStyle(110)}>
                <div className="landing-visual-frame photo-2">
                  <div className="landing-floating-widget" style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: 11,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      Minh họa tình huống đối thoại
                    </span>
                    <p style={{ margin: '0 0 10px', fontWeight: 650 }}>
                      “Let’s practice introducing your project to a new client.”
                    </p>
                    <Waveform active />
                  </div>
                </div>
                <div className="landing-visual-caption">
                  <span className="landing-num-badge">02</span>
                  <span>Trò chuyện giọng nói 2 chiều tự nhiên cùng Thầy Mate mọi lúc.</span>
                </div>
              </article>

              {/* Visual Card 03 */}
              <article className="landing-visual-card" data-reveal="up" style={delayStyle(220)}>
                <div className="landing-visual-frame photo-3">
                  <div className="landing-floating-widget">
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      Các bước luyện tập
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ padding: 8, borderRadius: 10, background: '#f0fdf4' }}>
                        <strong style={{ display: 'block', fontSize: 18, color: '#16a34a' }}>
                          Nghe
                        </strong>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Câu mẫu</span>
                      </div>
                      <div style={{ padding: 8, borderRadius: 10, background: '#eff6ff' }}>
                        <strong style={{ display: 'block', fontSize: 18, color: '#2563eb' }}>
                          Nói
                        </strong>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Đọc lại</span>
                      </div>
                      <div style={{ padding: 8, borderRadius: 10, background: '#f8fafc' }}>
                        <strong style={{ display: 'block', fontSize: 18, color: '#0f172a' }}>
                          Ôn
                        </strong>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Kiến thức</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="landing-visual-caption">
                  <span className="landing-num-badge">03</span>
                  <span>Đối chiếu bản chép lời và ôn lại kiến thức trong bài.</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* 3. CENTERED EMBLEM & 3 GIANT METRICS */}
        <section className="landing-stats-section" data-reveal="up">
          <div className="landing-container">
            <div className="landing-emblem-ring">
              <div className="landing-emblem-core">
                <BieuTuong ten="waveform" size={24} />
              </div>
            </div>

            <h2 className="landing-stats-heading">
              Nền tảng luyện nói tiếng Anh thời gian thực được thiết kế cho sự tự tin bền vững.
            </h2>

            <div className="landing-stats-row">
              <div className="landing-stat-item">
                <strong>Hội thoại</strong>
                <span>Luyện hỏi đáp bằng giọng nói hoặc chữ</span>
              </div>
              <div className="landing-stat-item">
                <strong>TOEIC</strong>
                <span>Học theo chặng, thực hành và tự kiểm tra</span>
              </div>
              <div className="landing-stat-item">
                <strong>Ôn tập</strong>
                <span>Xem bài đến lịch ôn trong Tiến độ</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PORTRAIT PHOTO LEARNER STORIES GRID */}
        <section id="stories" className="landing-stories-section">
          <div className="landing-container">
            <h2 className="landing-editorial-h2">Gợi ý cách luyện cùng Mate</h2>
            <p>Các tình huống minh họa để bạn bắt đầu buổi học.</p>
            <div className="landing-stories-grid">
              {STORIES.map((story, idx) => (
                <article
                  key={story.name}
                  className="landing-story-card"
                  data-reveal="up"
                  style={delayStyle((idx % 2) * 120)}
                >
                  <img
                    className="landing-story-photo"
                    src={story.photo}
                    alt="Linh vật Mate minh họa"
                    loading="lazy"
                    onError={(event) => {
                      const img = event.currentTarget;
                      img.onerror = null;
                      img.src =
                        'data:image/svg+xml,' +
                        encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dbeafe"/><stop offset="1" stop-color="#bfdbfe"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><text x="200" y="250" text-anchor="middle" fill="#1e3a8a" font-family="Georgia,serif" font-size="28">${story.name}</text></svg>`,
                        );
                    }}
                  />
                  <div className="landing-story-body">
                    <span className="landing-story-tag">{story.tag}</span>
                    <p className="landing-story-quote">{story.quote}</p>
                    <div className="landing-story-meta">
                      <strong>{story.name}</strong> · {story.role}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5. INTERACTIVE 4-TAB PRODUCT CANVAS OVER SCENIC NATURE FRAME */}
        <section id="how-it-works" className="landing-canvas-section">
          <div className="landing-container">
            <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }} data-reveal="up">
              <span className="landing-section-eyebrow">HÀNH TRÌNH KHÉP KÍN</span>
              <h2 className="landing-editorial-h2">
                Trọn vẹn từ luyện phản xạ đến làm chủ từ vựng
              </h2>
            </div>

            <div
              className="landing-tabs-bar"
              role="tablist"
              aria-label="Các bước học tập"
              data-reveal="up"
            >
              {CANVAS_TABS.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === idx}
                  className={`landing-tab-card ${activeTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  <strong>{tab.title}</strong>
                  <span>{tab.sub}</span>
                </button>
              ))}
            </div>

            <div className="landing-nature-stage" role="tabpanel" data-reveal="scale">
              <div className="landing-canvas-window">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 22,
                    paddingBottom: 14,
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <strong style={{ fontSize: 16 }}>{CANVAS_TABS[activeTab].previewTitle}</strong>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#2563eb',
                      background: '#eff6ff',
                      padding: '4px 12px',
                      borderRadius: 999,
                    }}
                  >
                    EngMate Classroom Studio
                  </span>
                </div>

                <div className="landing-flow-nodes">
                  <div className="landing-flow-node">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                      BƯỚC ĐẦU VÀO
                    </span>
                    <p style={{ margin: '6px 0 0', fontWeight: 650, fontSize: 14 }}>
                      {CANVAS_TABS[activeTab].nodeLeft}
                    </p>
                  </div>

                  <div className="landing-flow-node highlight">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <TeacherMate compact mood="listening" />
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>
                          TRUNG TÂM XỬ LÝ AI
                        </span>
                        <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 14 }}>
                          {CANVAS_TABS[activeTab].nodeCenter}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="landing-flow-node">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                      KẾT QUẢ ĐẠT ĐƯỢC
                    </span>
                    <p style={{ margin: '6px 0 0', fontWeight: 650, fontSize: 14 }}>
                      {CANVAS_TABS[activeTab].nodeRight}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. NATURE-BACKDROP FEATURE TRIO */}
        <section id="features" className="landing-trio-section">
          <div className="landing-container">
            <div style={{ marginBottom: 32 }} data-reveal="up">
              <span className="landing-section-eyebrow">TÍNH NĂNG CỐT LÕI</span>
              <h2 className="landing-editorial-h2">Mượt mà trên mọi thiết bị học tập</h2>
            </div>

            <div className="landing-trio-grid">
              <article className="landing-visual-card" data-reveal="up" style={delayStyle(0)}>
                <div className="landing-nature-card leaf-1">
                  <div className="landing-pill-cloud">
                    <span className="landing-white-pill">Daily Standup</span>
                    <span className="landing-white-pill">Job Interview</span>
                    <span className="landing-white-pill">TOEIC Part 2–5</span>
                    <span className="landing-white-pill">Coffee Chat</span>
                    <span className="landing-white-pill">Business Email</span>
                  </div>
                </div>
                <div className="landing-visual-caption">
                  <div>
                    <strong style={{ color: 'var(--landing-fg)', display: 'block' }}>
                      Chủ đề thực tế đa dạng
                    </strong>
                    <span>Từ giao tiếp hằng ngày, phỏng vấn đến thuyết trình dự án.</span>
                  </div>
                </div>
              </article>

              <article className="landing-visual-card" data-reveal="up" style={delayStyle(110)}>
                <div className="landing-nature-card leaf-2">
                  <div className="landing-floating-widget">
                    <strong style={{ display: 'block', marginBottom: 8 }}>
                      Tùy chọn giọng đọc AI
                    </strong>
                    <div style={{ display: 'grid', gap: 6, fontSize: 12.5 }}>
                      <div>● Hội thoại bằng giọng nói hoặc chữ</div>
                      <div>● Giọng mẫu để nghe và luyện lại</div>
                      <div>● Tốc độ linh hoạt 0.75x – 1.25x</div>
                    </div>
                  </div>
                </div>
                <div className="landing-visual-caption">
                  <div>
                    <strong style={{ color: 'var(--landing-fg)', display: 'block' }}>
                      Giọng nói AI thế hệ mới
                    </strong>
                    <span>Tùy chỉnh tốc độ nói và nhận gợi ý mở lời bất cứ khi nào bí ý.</span>
                  </div>
                </div>
              </article>

              <article className="landing-visual-card" data-reveal="up" style={delayStyle(220)}>
                <div className="landing-nature-card leaf-3">
                  <div className="landing-floating-widget">
                    <strong style={{ display: 'block', marginBottom: 6 }}>
                      So khớp bản chép lời
                    </strong>
                    <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#334155' }}>
                      “I’d like to walk you through our roadmap.”
                    </p>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      Ví dụ câu mẫu để tự đối chiếu
                    </span>
                  </div>
                </div>
                <div className="landing-visual-caption">
                  <div>
                    <strong style={{ color: 'var(--landing-fg)', display: 'block' }}>
                      Đối chiếu phát âm trực quan
                    </strong>
                    <span>
                      So sánh bản chép lời với câu mẫu. Nhận dạng lời nói chưa thay thế đánh giá
                      phát âm.
                    </span>
                  </div>
                </div>
              </article>
            </div>

            {/* 7. DARK CONTRAST PERFORMANCE PANEL */}
            <div className="landing-dark-panel" data-reveal="scale">
              <div className="landing-dark-panel-top">
                <div>
                  <span
                    className="landing-section-eyebrow"
                    style={{ color: '#60a5fa', marginBottom: 8 }}
                  >
                    DỮ LIỆU HỌC TẬP CỦA BẠN
                  </span>
                  <h2 className="landing-editorial-h2" style={{ color: '#ffffff', margin: 0 }}>
                    Thiết kế cho những buổi học liền mạch
                  </h2>
                </div>
                <span style={{ fontSize: 13, color: '#94a3b8', maxWidth: 320 }}>
                  Lịch sử hội thoại, kết quả TOEIC và hồ sơ được lưu theo tài khoản. Dấu nhớ từ và
                  buổi ôn giao tiếp tự ghi nhận lưu trên trình duyệt.
                </span>
              </div>

              <div className="landing-dark-stats">
                <div>
                  <strong>Hội thoại</strong>
                  <span>Mở lại lịch sử trong tài khoản</span>
                </div>
                <div>
                  <strong>TOEIC</strong>
                  <span>Theo dõi kết quả kiểm tra trong bài</span>
                </div>
                <div>
                  <strong>Hồ sơ</strong>
                  <span>Lưu mục tiêu giao tiếp của bạn</span>
                </div>
              </div>

              <div className="landing-dark-pillars">
                <div className="landing-dark-pillar">
                  <BieuTuong ten="mic" size={18} />
                  <strong>Giọng nói 2 chiều</strong>
                  <p>Không cần gõ phím, phản xạ tự nhiên như đời thực.</p>
                </div>
                <div className="landing-dark-pillar">
                  <BieuTuong ten="compass" size={18} />
                  <strong>Mức giao tiếp tự chọn</strong>
                  <p>Mức tự chọn trong hồ sơ, chưa phải kết quả đánh giá đầu vào.</p>
                </div>
                <div className="landing-dark-pillar">
                  <BieuTuong ten="book" size={18} />
                  <strong>Từ vựng ngữ cảnh</strong>
                  <p>Ôn lại ngay những cụm từ vừa xuất hiện trong bài.</p>
                </div>
                <div className="landing-dark-pillar">
                  <BieuTuong ten="trophy" size={18} />
                  <strong>Nhịp ôn tập</strong>
                  <p>Xây dựng thói quen luyện nói đều đặn mỗi ngày.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. COMPACT FAQ */}
        <section id="faq" className="landing-trio-section" style={{ paddingTop: 10 }}>
          <div className="landing-container">
            <div style={{ textAlign: 'center', marginBottom: 32 }} data-reveal="up">
              <span className="landing-section-eyebrow">FAQ</span>
              <h2 className="landing-editorial-h2">Câu hỏi thường gặp</h2>
            </div>

            <div className="landing-faq-list">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className={`landing-faq-item ${isOpen ? 'open' : ''}`}
                    data-reveal="up"
                    style={delayStyle(idx * 70)}
                  >
                    <button
                      type="button"
                      className="landing-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                    >
                      <span>{item.q}</span>
                      <BieuTuong ten={isOpen ? 'close' : 'plus'} size={17} />
                    </button>
                    {isOpen && <p className="landing-faq-a">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Floating Back to Top Button */}
      <button
        type="button"
        className={`landing-back-top ${scrollProgress > 0.14 ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Cuộn lên đầu trang"
      >
        ↑ Đầu trang
      </button>

      {/* DARK EDITORIAL FOOTER CTA */}
      <footer className="landing-dark-footer-wrap">
        <div className="landing-container">
          <div className="landing-footer-cta" data-reveal="up">
            <span className="landing-section-eyebrow" style={{ color: '#60a5fa' }}>
              SẴN SÀNG BẮT ĐẦU
            </span>
            <h2>Tự tin nói tiếng Anh mỗi ngày cùng Thầy Mate.</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="landing-btn-blue"
                onClick={signedIn ? onEnterWorkspace : onStartRegister}
              >
                <span>{signedIn ? 'Vào phòng học cùng Mate' : 'Tạo tài khoản miễn phí'}</span>
                <BieuTuong ten="arrow" size={15} />
              </button>
              {!signedIn && (
                <button
                  type="button"
                  className="landing-btn-text"
                  style={{ color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={onStartLogin}
                >
                  Đã có tài khoản? Đăng nhập
                </button>
              )}
            </div>
          </div>

          <div className="landing-footer-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Logo hideMark />
              <span>· Gia sư tiếng Anh AI thời gian thực.</span>
            </div>
            <div className="landing-footer-links">
              <a href="#trio">Trải nghiệm</a>
              <a href="#stories">Cách luyện</a>
              <a href="#how-it-works">Cách hoạt động</a>
              <a href="#features">Tính năng</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
