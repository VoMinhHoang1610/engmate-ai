import { useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { baiDoc } from '../demo/baiDoc';
import { useDuLieu } from '../demo/LuuTru';
import { danhSachTrinhDo, layTrinhDoHoc } from '../demo/trinhDo';

export function LuyenDoc() {
  const { ghiNhanHoc, luuTu, tuVung, hoSo } = useDuLieu();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      baiDoc.findIndex((bai) => bai.trinhDo === layTrinhDoHoc(hoSo.trinhDo)),
    ),
  );
  const [dapAn, setDapAn] = useState<Record<number, number>>({});
  const [daNop, setDaNop] = useState(false);
  const [daGhiNhan, setDaGhiNhan] = useState<Set<string>>(() => new Set());
  const bai = baiDoc[index];
  const soDung = bai.cauHoi.filter((cau, i) => dapAn[i] === cau.dung).length;
  const daTraLoi = bai.cauHoi.filter((_, i) => dapAn[i] !== undefined).length;

  function lamLai() {
    setDapAn({});
    setDaNop(false);
  }

  function nopBai() {
    if (daNop || daTraLoi !== bai.cauHoi.length) return;
    setDaNop(true);
    if (!daGhiNhan.has(bai.id)) {
      ghiNhanHoc(5);
      setDaGhiNhan((cu) => new Set(cu).add(bai.id));
    }
  }

  return (
    <>
      <TieuDeTrang ten="Reading" />
      <div className="practice-layout reading-layout">
        <section className="panel reading-passage" aria-label="Bài đọc tiếng Anh">
          <div className="section-title">
            <span className="pill green">
              {bai.chuDe} · {bai.trinhDo}
            </span>
            <select
              aria-label="Chọn bài đọc"
              value={index}
              onChange={(event) => {
                setIndex(Number(event.target.value));
                lamLai();
              }}
            >
              {baiDoc
                .map((item, i) => ({ item, i }))
                .sort(
                  (a, b) =>
                    danhSachTrinhDo.findIndex((muc) => muc.id === a.item.trinhDo) -
                    danhSachTrinhDo.findIndex((muc) => muc.id === b.item.trinhDo),
                )
                .map(({ item, i }) => (
                  <option key={item.id} value={i}>
                    {item.trinhDo} · {item.ten}
                  </option>
                ))}
            </select>
          </div>
          <h2 lang="en">{bai.ten}</h2>
          <div className="reading-text" lang="en">
            {bai.doanVan.map((doan) => (
              <p key={doan}>{doan}</p>
            ))}
          </div>
          <details className="practice-help reading-help">
            <summary>Gợi ý đọc hiểu</summary>
            <ul className="tips-list">
              <li>Đọc lướt để nắm ý chính trước khi trả lời.</li>
              <li>Tìm từ khóa trong câu hỏi rồi đối chiếu với bài đọc.</li>
              <li>Chú ý các từ nối và ngữ cảnh, không chỉ chọn từ giống nhau.</li>
            </ul>
          </details>
        </section>
        <div className="reading-exercises">
          <section className="panel" aria-label="Câu hỏi đọc hiểu">
            <div className="section-title">
              <h2>Đọc hiểu</h2>
              <span className="muted">
                {daTraLoi} / {bai.cauHoi.length} câu
              </span>
            </div>
            {bai.cauHoi.map((cau, i) => (
              <fieldset className="quiz reading-question" key={`${bai.id}-${i}`}>
                <legend lang="en">
                  {i + 1}. {cau.cauHoi}
                </legend>
                {cau.dapAn.map((item, j) => (
                  <label
                    key={item}
                    className={`quiz-answer ${dapAn[i] === j ? 'selected' : ''} ${daNop && cau.dung === j ? 'correct' : ''} ${daNop && dapAn[i] === j && cau.dung !== j ? 'reading-incorrect' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`reading-${i}`}
                      checked={dapAn[i] === j}
                      disabled={daNop}
                      onChange={() => setDapAn((cu) => ({ ...cu, [i]: j }))}
                    />
                    <span className="answer-letter">{String.fromCharCode(65 + j)}</span>
                    <span lang="en">{item}</span>
                    {daNop && cau.dung === j && <BieuTuong ten="check" size={18} />}
                  </label>
                ))}
                {daNop && (
                  <div className="reading-explanation">
                    <strong>
                      {dapAn[i] === cau.dung ? 'Chính xác' : 'Chưa đúng'} · Đáp án{' '}
                      {String.fromCharCode(65 + cau.dung)}
                    </strong>
                    <p>{cau.giaiThich}</p>
                  </div>
                )}
              </fieldset>
            ))}
            <button
              className="btn primary full-width"
              disabled={daNop || daTraLoi !== bai.cauHoi.length}
              onClick={nopBai}
            >
              Kiểm tra đáp án <BieuTuong ten="check" size={17} />
            </button>
            {daNop && (
              <div
                className={`quiz-result mate-result ${soDung === bai.cauHoi.length ? 'success' : ''}`}
                role="status"
              >
                <LinhThu
                  size={85}
                  camXuc={soDung === bai.cauHoi.length ? 'celebrating' : 'encouraging'}
                />
                <div>
                  <strong>
                    Kết quả: {soDung} / {bai.cauHoi.length} câu đúng
                  </strong>
                  <p>
                    {soDung === bai.cauHoi.length
                      ? 'Bạn đã hiểu rất tốt bài đọc!'
                      : 'Đọc lại phần giải thích và thử thêm lần nữa nhé.'}
                  </p>
                  <button className="text-button" onClick={lamLai}>
                    Làm lại bài tập
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="panel" aria-label="Từ vựng bài đọc">
            <h2>Từ vựng trong bài</h2>
            {bai.tuVung.map((tu) => {
              const daLuu = tuVung.some((item) => item.tu === tu.tu);
              return (
                <div className="listening-word" key={tu.id}>
                  <div>
                    <strong lang="en">{tu.tu}</strong>
                    <span>
                      {tu.phienAm} · {tu.nghia}
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`${daLuu ? 'Đã lưu' : 'Lưu từ'} ${tu.tu}`}
                    disabled={daLuu}
                    onClick={() => luuTu(tu)}
                  >
                    <BieuTuong ten={daLuu ? 'check' : 'plus'} size={18} />
                  </button>
                </div>
              );
            })}
            <a className="text-button" href="#so-tu-vung">
              Mở sổ từ vựng <BieuTuong ten="arrow" size={16} />
            </a>
          </section>
        </div>
      </div>
    </>
  );
}
