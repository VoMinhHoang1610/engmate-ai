import { useEffect, useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { useDuLieu } from '../demo/LuuTru';
import { NutDoc } from '../components/NutDoc';
import { dungDoc } from '../demo/amThanh';

export function Flashcard() {
  const { tuVung, onTu, ghiNhanHoc } = useDuLieu();
  const [tatCa, setTatCa] = useState(false);
  const [boThe, setBoThe] = useState(() =>
    tuVung.filter((tu) => !tu.henOn || new Date(tu.henOn).getTime() <= Date.now()),
  );
  const [index, setIndex] = useState(0);
  const [lat, setLat] = useState(false);
  const [loi, setLoi] = useState('');
  const [ketQua, setKetQua] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const the = boThe[index];
  const xong = !the;
  useEffect(() => () => dungDoc(), []);
  function batDau(all: boolean) {
    dungDoc();
    setTatCa(all);
    setBoThe(
      all ? tuVung : tuVung.filter((tu) => !tu.henOn || new Date(tu.henOn).getTime() <= Date.now()),
    );
    setIndex(0);
    setLat(false);
    setKetQua({ again: 0, hard: 0, good: 0, easy: 0 });
  }
  function danhGia(muc: keyof typeof ketQua, ngay: number) {
    if (!the || !lat) return;
    dungDoc();
    onTu(the.id, ngay);
    setKetQua((cu) => ({ ...cu, [muc]: cu[muc] + 1 }));
    setLat(false);
    if (muc === 'again') setBoThe((cu) => [...cu, the]);
    if (index + 1 === boThe.length && muc !== 'again') ghiNhanHoc(3);
    setIndex(index + 1);
  }
  return (
    <>
      <TieuDeTrang ten="Flashcard" />
      <div className="flashcard-layout">
        <div>
          <div className="flash-session">
            <span className="pill purple">
              <BieuTuong ten="layers" size={16} /> ÔN CÁCH QUÃNG
            </span>
            <span>{xong ? 'Đã hoàn thành' : `Thẻ ${index + 1} / ${boThe.length}`}</span>
            <label>
              <input type="checkbox" checked={tatCa} onChange={(e) => batDau(e.target.checked)} />{' '}
              Ôn tất cả từ
            </label>
          </div>
          <div
            className="session-progress"
            role="progressbar"
            aria-label="Tiến độ ôn tập"
            aria-valuemin={0}
            aria-valuemax={boThe.length}
            aria-valuenow={Math.min(index, boThe.length)}
          >
            <span style={{ width: `${boThe.length ? (index / boThe.length) * 100 : 0}%` }} />
          </div>
          {xong ? (
            <section className="panel flash-complete">
              <LinhThu size={180} camXuc={index ? 'celebrating' : 'encouraging'} />
              <h2>{index ? 'Thêm một bước tiến thật đẹp!' : 'Bạn đã ôn hết các từ đến hạn.'}</h2>
              <p className="muted">
                {index
                  ? `Ban vua hoan thanh ${index} luot on. Lich on moi da duoc luu.`
                  : 'Quay lại sau hoặc chọn ôn tất cả để luyện thêm.'}
              </p>
              <div className="review-totals">
                {Object.entries(ketQua).map(([key, value]) => (
                  <div key={key}>
                    <strong>{value}</strong>
                    <span>{key}</span>
                  </div>
                ))}
              </div>
              <button className="btn primary" onClick={() => batDau(true)}>
                Ôn lại tất cả <BieuTuong ten="repeat" size={18} />
              </button>
              <a className="text-button" href="#so-tu-vung">
                Mở sổ từ vựng
              </a>
            </section>
          ) : (
            <>
              <button
                className={`flash-card ${lat ? 'flipped' : ''}`}
                onClick={() => setLat(!lat)}
                aria-label={
                  lat
                    ? `Nghia cua ${the.tu}: ${the.nghia}. Nhan de lat ve mat truoc.`
                    : `Tu ${the.tu}. Nhan de lat the xem nghia.`
                }
              >
                <span className="eyebrow">{lat ? 'Nghĩa & cách dùng' : 'Từ vựng'}</span>
                <span className="flash-word">{lat ? the.nghia : the.tu}</span>
                <span className="phonetic">{lat ? the.loai : the.phienAm}</span>
                {lat && <span className="flash-example">“{the.viDu}”</span>}
                <span className="flash-hint">
                  <BieuTuong ten="repeat" size={16} />
                  {lat ? 'Nhấn để xem lại từ' : 'Nhấn vào thẻ để lật'}
                </span>
              </button>
              <div className="flash-audio">
                <NutDoc className="text-button" text={the.tu} preload onError={setLoi}>
                  <BieuTuong ten="volume" size={18} /> Nghe cách đọc
                </NutDoc>
              </div>
              <div className="rating-buttons">
                {[
                  { key: 'again' as const, ten: 'Again', moTa: 'Ôn lại trong phiên', ngay: 0 },
                  { key: 'hard' as const, ten: 'Hard', moTa: 'Sau 1 ngày', ngay: 1 },
                  { key: 'good' as const, ten: 'Good', moTa: 'Sau 4 ngày', ngay: 4 },
                  { key: 'easy' as const, ten: 'Easy', moTa: 'Sau 7 ngày', ngay: 7 },
                ].map((muc) => (
                  <button
                    key={muc.key}
                    className={`rating ${muc.key}`}
                    disabled={!lat}
                    onClick={() => danhGia(muc.key, muc.ngay)}
                  >
                    <strong>{muc.ten}</strong>
                    <span>{muc.moTa}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {loi && (
            <p role="alert" className="error-text">
              {loi}
            </p>
          )}
        </div>
        <details className="panel review-help">
          <summary>Cách ôn tập</summary>
          <div className="review-step">
            <span>01</span>
            <div>
              <strong>Thử nhớ</strong>
              <p>Đọc từ và tự nhớ nghĩa.</p>
            </div>
          </div>
          <div className="review-step">
            <span>02</span>
            <div>
              <strong>Lật thẻ</strong>
              <p>Kiểm tra nghĩa và câu ví dụ.</p>
            </div>
          </div>
          <div className="review-step">
            <span>03</span>
            <div>
              <strong>Đánh giá thật lòng</strong>
              <p>Chọn Again, Hard, Good hoặc Easy.</p>
            </div>
          </div>
          <div className="tip-box">
            <p>Lịch ôn dùng mốc 1, 4 và 7 ngày. Again sẽ đưa thẻ về cuối phiên để ôn lại.</p>
          </div>
        </details>
      </div>
    </>
  );
}
