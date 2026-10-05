import { BieuTuong } from '../components/BieuTuong';
import { useDuLieu } from '../demo/LuuTru';
import { chuDeMau, diChuyen } from '../demo/duLieu';

export function TongQuan() {
  const { hoSo, tuVung, phutHoc, luotOn, phutHomNay, luotOnHomNay } = useDuLieu();
  const progress = Math.min(100, Math.round((phutHomNay / hoSo.phutMoiNgay) * 100));
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">MỘT CHÚT MỖI NGÀY, TIẾN BỘ THẬT XA</p>
          <h1>
            Chao {hoSo.ten.split(' ').at(-1)}, <span className="wave">✦</span>
          </h1>
          <p className="muted">Hôm nay là một ngày đẹp để tự tin hơn với tiếng Anh.</p>
        </div>
        <span className="pill outline">
          <span className="status-dot" /> Không gian học tập của bạn
        </span>
      </div>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-tag">
            <BieuTuong ten="sparkles" size={15} /> NGƯỜI BẠN ĐỒNG HÀNH AI · DEMO
          </span>
          <h2>
            Tiếng Anh tự nhiên.
            <br />
            Tự tin mỗi ngày.
          </h2>
          <p>
            Không ngại sai, không áp lực. Cùng EngMate luyện tập
            <br className="desktop-break" /> theo cách của bạn, từng cuộc trò chuyện một.
          </p>
          <button className="btn white" onClick={() => diChuyen('hoi-thoai-ai')}>
            Bắt đầu trò chuyện <BieuTuong ten="arrow" size={18} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-spark spark-one">✦</span>
          <span className="art-spark spark-two">✦</span>
          <div className="floating-label label-top">
            Hello, how's your day? <span>👋</span>
          </div>
          <div className="mascot">
            <div className="mascot-eye" />
            <div className="mascot-eye" />
            <div className="mascot-mouth" />
          </div>
          <div className="floating-label label-bottom">
            <span className="small-check">✓</span> You're doing great!
          </div>
          <div className="art-caption">YOUR ENGLISH BESTIE</div>
        </div>
      </section>
      <div className="stats-grid">
        <article className="stat-card">
          <span className="icon-tile peach">
            <BieuTuong ten="clock" />
          </span>
          <div>
            <p>Thời gian đã học</p>
            <strong>
              {phutHoc}
              <small> phut</small>
            </strong>
            <span>Từ các bài tập đã hoàn thành</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="icon-tile purple">
            <BieuTuong ten="book" />
          </span>
          <div>
            <p>Từ vựng của bạn</p>
            <strong>
              {tuVung.length}
              <small> tu</small>
            </strong>
            <span>{tuVung.filter((tu) => tu.daThuoc).length} từ đã ghi nhớ</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="icon-tile green">
            <BieuTuong ten="layers" />
          </span>
          <div>
            <p>Lượt ôn tập</p>
            <strong>
              {luotOn}
              <small> luot</small>
            </strong>
            <span>Mỗi lần ôn là một lần tiến bộ</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="icon-tile blue">
            <BieuTuong ten="cap" />
          </span>
          <div>
            <p>Trình độ hiện tại</p>
            <strong>{hoSo.trinhDo}</strong>
            <span>
              {hoSo.trinhDo === 'A2'
                ? 'Elementary'
                : hoSo.trinhDo === 'B1'
                  ? 'Intermediate'
                  : 'Upper intermediate'}
            </span>
          </div>
        </article>
      </div>
      <div className="dashboard-columns">
        <div>
          <div className="section-title">
            <h2>Bạn muốn luyện gì hôm nay?</h2>
            <span>Chọn một kỹ năng</span>
          </div>
          <div className="skills-grid">
            {[
              {
                ten: 'Luyện nói',
                desc: 'Cất lời, tự tin thể hiện',
                icon: 'mic',
                mau: 'purple',
                trang: 'luyen-noi' as const,
              },
              {
                ten: 'Luyện nghe',
                desc: 'Lắng nghe và hiểu hơn',
                icon: 'headphones',
                mau: 'peach',
                trang: 'luyen-nghe' as const,
              },
              {
                ten: 'Luyện viết',
                desc: 'Viết rõ ràng, thật tự nhiên',
                icon: 'pen',
                mau: 'blue',
                trang: 'luyen-viet' as const,
              },
              {
                ten: 'Ôn từ vựng',
                desc: 'Ghi nhớ lâu, dùng đúng lúc',
                icon: 'layers',
                mau: 'green',
                trang: 'flashcard' as const,
              },
            ].map((skill) => (
              <button className="skill-card" key={skill.ten} onClick={() => diChuyen(skill.trang)}>
                <span className={`icon-tile ${skill.mau}`}>
                  <BieuTuong ten={skill.icon} size={23} />
                </span>
                <strong>{skill.ten}</strong>
                <span>{skill.desc}</span>
                <BieuTuong ten="arrow" size={17} />
              </button>
            ))}
          </div>
          <div className="section-title topic-title">
            <h2>Mang tiếng Anh vào cuộc sống</h2>
            <a href="#chu-de-nhap-vai">
              Tất cả chủ đề <BieuTuong ten="arrow" size={16} />
            </a>
          </div>
          <div className="mini-topics">
            {chuDeMau.slice(0, 3).map((topic) => (
              <button
                className={`mini-topic ${topic.mauSac}`}
                key={topic.id}
                onClick={() => diChuyen('hoi-thoai-ai', topic.id)}
              >
                <BieuTuong ten={topic.bieuTuong} size={30} />
                <span>{topic.trinhDo} · NHẬP VAI</span>
                <strong>{topic.ten}</strong>
                <span>
                  {topic.vai} <BieuTuong ten="arrow" size={15} />
                </span>
              </button>
            ))}
          </div>
        </div>
        <aside className="daily-card">
          <div className="section-title">
            <h2>Mục tiêu hôm nay</h2>
            <BieuTuong ten="sparkles" />
          </div>
          <div
            className="progress-ring"
            style={{ background: `conic-gradient(var(--accent) ${progress}%, #eeeaf7 0)` }}
          >
            <div>
              <strong>
                {phutHomNay}
                <small> / {hoSo.phutMoiNgay}</small>
              </strong>
              <span>PHÚT HỌC</span>
            </div>
          </div>
          <p className="center-text">
            {progress === 100 ? 'Tuyệt vời! Bạn đã đạt mục tiêu.' : 'Mỗi bước nhỏ đều đáng giá.'}
          </p>
          <div className="daily-task">
            <span className={phutHomNay > 0 ? 'task-check done' : 'task-check'}>
              {phutHomNay > 0 && '✓'}
            </span>
            <div>
              <strong>Hoàn thành một bài luyện</strong>
              <span>Nói, nghe hoặc viết</span>
            </div>
          </div>
          <div className="daily-task">
            <span className={luotOnHomNay > 0 ? 'task-check done' : 'task-check'}>
              {luotOnHomNay > 0 && '✓'}
            </span>
            <div>
              <strong>Ôn lại từ vựng</strong>
              <span>Giữ kiến thức luôn mới</span>
            </div>
          </div>
          <button className="btn secondary full-width" onClick={() => diChuyen('ho-so')}>
            Điều chỉnh mục tiêu <BieuTuong ten="arrow" size={16} />
          </button>
          <div className="daily-quote">
            “A little progress each day
            <br />
            adds up to big results.”<span>Cứ từng bước, bạn sẽ làm được.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
