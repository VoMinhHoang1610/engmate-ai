import { useEffect, useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { NutDoc } from '../components/NutDoc';
import { dungDoc } from '../demo/amThanh';
import { useDuLieu } from '../demo/LuuTru';
import { baiNghe } from '../demo/baiNghe';
import { layTrinhDoHoc } from '../demo/trinhDo';

export function LuyenNghe() {
  const { luuTu, tuVung, ghiNhanHoc, hoSo } = useDuLieu();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      baiNghe.findIndex((bai) => bai.trinhDo === layTrinhDoHoc(hoSo.trinhDo)),
    ),
  );
  const [tocDo, setTocDo] = useState(0.85);
  const [tab, setTab] = useState('Trắc nghiệm');
  const [dapAn, setDapAn] = useState<number | null>(null);
  const [daNop, setDaNop] = useState(false);
  const [chepLoi, setChepLoi] = useState(false);
  const [chinhTa, setChinhTa] = useState('');
  const [loi, setLoi] = useState('');
  const [daTinhPhut, setDaTinhPhut] = useState<Set<string>>(() => new Set());
  const bai = baiNghe[index];
  useEffect(() => () => dungDoc(), []);
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const dung =
    tab === 'Trắc nghiệm' ? dapAn === bai.dung : normalize(chinhTa) === normalize(bai.chinhTa);
  const maBai = `${index}-${tab}`;
  function nopBai() {
    setDaNop(true);
    if (!daTinhPhut.has(maBai)) {
      ghiNhanHoc(3);
      setDaTinhPhut((cu) => new Set(cu).add(maBai));
    }
  }
  return (
    <>
      <TieuDeTrang ten="Listening" />
      <div className="practice-layout">
        <section className="panel listening-panel">
          <div className="section-title">
            <span className="pill peach">
              {bai.chuDe} · {bai.trinhDo}
            </span>
            <select
              aria-label="Chọn bài nghe"
              value={index}
              onChange={(e) => {
                dungDoc();
                setLoi('');
                setIndex(Number(e.target.value));
                setDapAn(null);
                setDaNop(false);
                setChinhTa('');
                setChepLoi(false);
              }}
            >
              {baiNghe.map((item, i) => (
                <option key={item.trinhDo} value={i}>
                  {item.trinhDo} · {item.ten}
                </option>
              ))}
            </select>
          </div>
          <div className="listening-art">
            <LinhThu size={140} camXuc="listening" />
            <h2>{bai.ten}</h2>
            <span className="pill outline">Giọng đọc Blaze</span>
            <div className="player-controls">
              <NutDoc
                className="play-button"
                aria-label="Phát bài nghe"
                text={bai.text}
                rate={tocDo}
                preload={tab === 'Trắc nghiệm'}
                onError={setLoi}
              >
                <BieuTuong ten="play" size={23} />
              </NutDoc>
              <button className="btn secondary" onClick={() => dungDoc()}>
                <BieuTuong ten="pause" size={18} /> Dừng
              </button>
              <label>
                Tốc độ
                <select value={tocDo} onChange={(e) => setTocDo(Number(e.target.value))}>
                  {[0.65, 0.85, 1, 1.2].map((value) => (
                    <option key={value} value={value}>
                      {value}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {loi && (
            <p role="alert" className="error-text">
              {loi}
            </p>
          )}
          <div className="tabs" role="tablist" aria-label="Kiểu bài tập">
            <button
              role="tab"
              aria-selected={tab === 'Trắc nghiệm'}
              className={tab === 'Trắc nghiệm' ? 'active' : ''}
              onClick={() => {
                setTab('Trắc nghiệm');
                setDaNop(false);
              }}
            >
              Trắc nghiệm
            </button>
            <button
              role="tab"
              aria-selected={tab === 'Chép chính tả'}
              className={tab === 'Chép chính tả' ? 'active' : ''}
              onClick={() => {
                setTab('Chép chính tả');
                setDaNop(false);
              }}
            >
              Chép chính tả
            </button>
          </div>
          <div role="tabpanel">
            {tab === 'Trắc nghiệm' ? (
              <fieldset className="quiz">
                <legend>{bai.cauHoi}</legend>
                {bai.dapAn.map((item, i) => (
                  <label
                    className={`quiz-answer ${dapAn === i ? 'selected' : ''} ${daNop && i === bai.dung ? 'correct' : ''}`}
                    key={item}
                  >
                    <input
                      type="radio"
                      name="dap-an"
                      checked={dapAn === i}
                      disabled={daNop}
                      onChange={() => setDapAn(i)}
                    />
                    <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                    {item}
                    {daNop && i === bai.dung && <BieuTuong ten="check" size={18} />}
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="dictation">
                <h3>Nghe và viết lại câu ngắn</h3>
                <NutDoc
                  className="text-button"
                  text={bai.chinhTa}
                  rate={tocDo}
                  preload
                  onError={setLoi}
                >
                  <BieuTuong ten="volume" size={18} /> Nghe câu chính tả
                </NutDoc>
                <textarea
                  aria-label="Câu chính tả"
                  rows={3}
                  value={chinhTa}
                  onChange={(e) => setChinhTa(e.target.value)}
                  placeholder="Viết những gì bạn nghe được..."
                  disabled={daNop}
                />
              </div>
            )}
          </div>
          <div className="form-footer">
            <button className="text-button" onClick={() => setChepLoi(!chepLoi)}>
              <BieuTuong ten="book" size={17} />
              {chepLoi ? 'Ẩn bản chép lời' : 'Xem bản chép lời'}
            </button>
            <button
              className="btn primary"
              disabled={daNop || (tab === 'Trắc nghiệm' ? dapAn === null : !chinhTa.trim())}
              onClick={nopBai}
            >
              Kiểm tra đáp án <BieuTuong ten="check" size={17} />
            </button>
          </div>
          {daNop && (
            <div className={`quiz-result mate-result ${dung ? 'success' : ''}`} role="status">
              <LinhThu size={94} camXuc={dung ? 'celebrating' : 'encouraging'} />
              <div>
                <strong>
                  {dung ? 'Chính xác! Bạn nghe rất tốt.' : 'Thử nghe lại để nắm rõ hơn nhé.'}
                </strong>
                <p>
                  {tab === 'Trắc nghiệm'
                    ? `Dap an: ${bai.dapAn[bai.dung]}`
                    : `Câu mau: ${bai.chinhTa}`}
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    setDaNop(false);
                    setDapAn(null);
                    setChinhTa('');
                  }}
                >
                  Làm lại bài tập
                </button>
              </div>
            </div>
          )}
          {chepLoi && (
            <div className="transcript">
              <span className="eyebrow">BẢN CHÉP LỜI</span>
              <p>{bai.text}</p>
            </div>
          )}
        </section>
        <aside>
          <section className="panel">
            <h2>Từ khóa trong bài</h2>
            {bai.tuVung.map((tu) => (
              <div className="listening-word" key={tu.id}>
                <div>
                  <strong>{tu.tu}</strong>
                  <span>{tu.nghia}</span>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Luu tu ${tu.tu}`}
                  disabled={tuVung.some((item) => item.tu === tu.tu)}
                  onClick={() => luuTu(tu)}
                >
                  <BieuTuong
                    ten={tuVung.some((item) => item.tu === tu.tu) ? 'check' : 'plus'}
                    size={18}
                  />
                </button>
              </div>
            ))}
            <a className="text-button" href="#so-tu-vung">
              Mở sổ từ vựng <BieuTuong ten="arrow" size={16} />
            </a>
          </section>
        </aside>
      </div>
    </>
  );
}
