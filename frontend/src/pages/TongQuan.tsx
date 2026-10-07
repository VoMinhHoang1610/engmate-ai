import { BieuTuong } from '../components/BieuTuong';
import { TrangTri } from '../components/TrangTri';
import { LinhThu } from '../components/LinhThu';
import { useDuLieu } from '../demo/LuuTru';
import { chuDeMau, diChuyen } from '../demo/duLieu';
import { danhSachTrinhDo } from '../demo/trinhDo';

const kyNang = [
  { ten: 'Speaking', icon: 'mic', trang: 'luyen-noi' },
  { ten: 'Listening', icon: 'headphones', trang: 'luyen-nghe' },
  { ten: 'Reading', icon: 'book', trang: 'luyen-doc' },
  { ten: 'Writing', icon: 'pen', trang: 'luyen-viet' },
  { ten: 'Ôn từ vựng', icon: 'layers', trang: 'flashcard' },
] as const;

export function TongQuan() {
  const { hoSo, tuVung, phutHoc, luotOn, phutHomNay, luotOnHomNay } = useDuLieu();
  const progress = Math.min(100, Math.round((phutHomNay / hoSo.phutMoiNgay) * 100));
  return (
    <>
      <div className="welcome-row">
        <h1>Chào {hoSo.ten.split(' ').at(-1)}</h1>
      </div>
      <section className="hero-card">
        <div className="hero-content">
          <div className="hero-copy">
            <span className="hero-tag">
              <BieuTuong ten="sparkles" size={15} /> AI · Demo
            </span>
            <h2>
              Cùng Mate,
              <br />
              mở lời tự tin.
            </h2>
          </div>
          <button className="btn white" onClick={() => diChuyen('hoi-thoai-ai')}>
            Bắt đầu trò chuyện <BieuTuong ten="arrow" size={18} />
          </button>
        </div>
        <TrangTri />
      </section>
      <div className="stats-grid">
        {[
          { ten: 'Thời gian đã học', value: phutHoc, unit: 'phút', icon: 'clock' },
          { ten: 'Từ vựng đã lưu', value: tuVung.length, unit: 'từ', icon: 'book' },
          { ten: 'Lượt ôn tập', value: luotOn, unit: 'lượt', icon: 'layers' },
          { ten: 'Trình độ', value: hoSo.trinhDo, unit: '', icon: 'cap' },
        ].map((stat) => (
          <article className="stat-card" key={stat.ten}>
            <div className="stat-label">
              <BieuTuong ten={stat.icon} size={17} />
              <span>{stat.ten}</span>
            </div>
            <strong>
              {stat.value} {stat.unit && <small>{stat.unit}</small>}
            </strong>
          </article>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-practice">
          <a className="panel dashboard-roadmap" href="#lo-trinh">
            <span className="icon-tile">
              <BieuTuong ten="compass" size={24} />
            </span>
            <div>
              <strong>Lộ trình học · {hoSo.trinhDo}</strong>
              <span>
                {danhSachTrinhDo.find((muc) => muc.id === hoSo.trinhDo)?.ten} · Pre-A1 → C2
              </span>
            </div>
            <BieuTuong ten="arrow" size={20} />
          </a>
          <section>
            <div className="section-title">
              <h2>Luyện tập</h2>
            </div>
            <div className="skills-grid">
              {kyNang.map((skill) => (
                <button
                  className="skill-card"
                  key={skill.ten}
                  onClick={() => diChuyen(skill.trang)}
                >
                  <span className="icon-tile">
                    <BieuTuong ten={skill.icon} size={22} />
                  </span>
                  <strong>{skill.ten}</strong>
                  <BieuTuong ten="arrow" size={17} />
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="section-title topic-title">
              <h2>Chủ đề gợi ý</h2>
              <a href="#chu-de-nhap-vai">
                Xem tất cả <BieuTuong ten="arrow" size={16} />
              </a>
            </div>
            <div className="mini-topics">
              {chuDeMau.slice(0, 3).map((topic) => (
                <button
                  className="mini-topic"
                  key={topic.id}
                  onClick={() => diChuyen('hoi-thoai-ai', topic.id)}
                >
                  <span className="icon-tile">
                    <BieuTuong ten={topic.bieuTuong} size={21} />
                  </span>
                  <strong>{topic.ten}</strong>
                  <span className="pill outline">{topic.trinhDo}</span>
                  <BieuTuong ten="arrow" size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="panel daily-card">
          <div className="daily-mate">
            <LinhThu size={100} camXuc={progress === 100 ? 'celebrating' : 'encouraging'} />
            <strong className="mate-speech">
              {progress === 100
                ? 'Bạn làm được rồi!'
                : phutHomNay > 0
                  ? `Còn ${Math.max(0, hoSo.phutMoiNgay - phutHomNay)} phút nữa!`
                  : 'Bắt đầu nhé!'}
            </strong>
          </div>
          <div className="section-title">
            <h2>Mục tiêu hôm nay</h2>
            <BieuTuong ten="clock" size={18} />
          </div>
          <div className="daily-progress-value">
            <strong>{phutHomNay}</strong>
            <span>/ {hoSo.phutMoiNgay} phút</span>
          </div>
          <div
            className="session-progress"
            role="progressbar"
            aria-label="Mục tiêu hôm nay"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          {progress === 100 && <p className="feedback">Đã đạt mục tiêu</p>}
          <div className="daily-task">
            <span
              className={`task-check ${phutHomNay > 0 ? 'done' : ''}`}
              aria-label={phutHomNay > 0 ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
            >
              {phutHomNay > 0 && <BieuTuong ten="check" size={14} />}
            </span>
            <strong>Hoàn thành một bài luyện</strong>
          </div>
          <div className="daily-task">
            <span
              className={`task-check ${luotOnHomNay > 0 ? 'done' : ''}`}
              aria-label={luotOnHomNay > 0 ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
            >
              {luotOnHomNay > 0 && <BieuTuong ten="check" size={14} />}
            </span>
            <strong>Ôn lại từ vựng</strong>
          </div>
          <a className="btn secondary full-width" href="#ho-so">
            Điều chỉnh mục tiêu
          </a>
        </aside>
      </div>
    </>
  );
}
