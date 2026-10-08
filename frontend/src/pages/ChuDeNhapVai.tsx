import { mysqlEnabled, api, type Topic } from '../api/database';
import { useEffect, useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { chuDeMau } from '../demo/duLieu';
import { danhSachTrinhDo } from '../demo/trinhDo';

export function ChuDeNhapVai() {
  const [loc, setLoc] = useState('Tất cả');
  const [catalog, setCatalog] = useState(mysqlEnabled ? ([] as typeof chuDeMau) : chuDeMau);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!mysqlEnabled) return;
    let cancelled = false;
    void api<Topic[]>('/topics')
      .then((rows) => {
        if (!cancelled)
          setCatalog(
            rows.map((row) => ({
              id: row.code,
              ten: row.name,
              moTa: row.description,
              vai: row.ai_role,
              mau: row.opening_message,
              mauSac: row.color_key,
              bieuTuong: row.icon_key,
              trinhDo:
                row.min_level === row.max_level
                  ? row.min_level
                  : `${row.min_level} – ${row.max_level}`,
            })),
          );
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chưa tải được chủ đề.');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <>
      <TieuDeTrang ten="Chủ đề & nhập vai" />
      <div className="filter-bar">
        {['Tất cả', ...danhSachTrinhDo.map((muc) => muc.id)].map((item) => (
          <button
            key={item}
            className={`filter-chip ${loc === item ? 'active' : ''}`}
            onClick={() => setLoc(item)}
          >
            {item === 'Tất cả' ? 'Tất cả chủ đề' : `Trinh do ${item}`}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="topics-grid">
        {catalog
          .filter((item) => loc === 'Tất cả' || item.trinhDo.split(' – ').includes(loc))
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
                  onClick={() => {
                    window.location.hash = `hoi-thoai-ai?chu-de=${topic.id}&trinh-do=${loc === 'Tất cả' ? topic.trinhDo.split(' – ')[0] : loc}`;
                  }}
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
