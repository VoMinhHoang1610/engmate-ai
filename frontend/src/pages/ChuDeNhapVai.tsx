import { useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { chuDeMau, diChuyen } from '../demo/duLieu';

export function ChuDeNhapVai() {
  const [loc, setLoc] = useState('Tất cả');
  return (
    <>
      <TieuDeTrang
        nhan="HỌC TỪ NHỮNG ĐIỀU GẦN GŨI"
        ten="Chủ đề & nhập vai"
        moTa="Bước vào một tình huống mới. Trò chuyện như ngoài đời thật."
      />
      <div className="filter-bar">
        {['Tất cả', 'A2', 'B1', 'B2'].map((item) => (
          <button
            key={item}
            className={`filter-chip ${loc === item ? 'active' : ''}`}
            onClick={() => setLoc(item)}
          >
            {item === 'Tất cả' ? 'Tất cả chủ đề' : `Trinh do ${item}`}
          </button>
        ))}
        <span className="muted">8 tình huống đời thường</span>
      </div>
      <div className="topics-grid">
        {chuDeMau
          .filter((item) => loc === 'Tất cả' || item.trinhDo.includes(loc))
          .map((topic) => (
            <article className="topic-card" key={topic.id}>
              <div className={`topic-illustration ${topic.mauSac}`}>
                <span className="topic-decor decor-one" />
                <span className="topic-decor decor-two" />
                <BieuTuong ten={topic.bieuTuong} size={62} />
                <span className="pill">{topic.trinhDo}</span>
              </div>
              <div className="topic-body">
                <span className="eyebrow">NHẬP VAI · {topic.vai.toUpperCase()}</span>
                <h2>{topic.ten}</h2>
                <p className="muted">{topic.moTa}</p>
                <button
                  className="btn secondary full-width"
                  onClick={() => diChuyen('hoi-thoai-ai', topic.id)}
                >
                  Bắt đầu nhập vai <BieuTuong ten="arrow" size={17} />
                </button>
              </div>
            </article>
          ))}
      </div>
      <div className="exam-banner">
        <span className="icon-tile purple">
          <BieuTuong ten="cap" size={26} />
        </span>
        <div>
          <h2>Mục tiêu TOEIC hay IELTS?</h2>
          <p className="muted">Bài luyện chuyên sâu sẽ được bổ sung ở phiên bản tiếp theo.</p>
        </div>
        <span className="pill outline">Sắp ra mắt</span>
      </div>
    </>
  );
}
