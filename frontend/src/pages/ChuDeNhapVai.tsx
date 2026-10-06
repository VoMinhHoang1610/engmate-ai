import { useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { chuDeMau, diChuyen } from '../demo/duLieu';

export function ChuDeNhapVai() {
  const [loc, setLoc] = useState('Tất cả');
  return (
    <>
      <TieuDeTrang ten="Chủ đề & nhập vai" />
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
      </div>
      <div className="topics-grid">
        {chuDeMau
          .filter((item) => loc === 'Tất cả' || item.trinhDo.includes(loc))
          .map((topic) => (
            <article className="topic-card" key={topic.id}>
              <div className={`topic-illustration ${topic.mauSac}`}>
                <BieuTuong ten={topic.bieuTuong} size={26} />
                <span className="pill">{topic.trinhDo}</span>
              </div>
              <div className="topic-body">
                <h2>{topic.ten}</h2>
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
    </>
  );
}
