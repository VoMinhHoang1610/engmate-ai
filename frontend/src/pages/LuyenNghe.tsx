import { useEffect, useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { docTiengAnh } from '../demo/amThanh';
import { useDuLieu } from '../demo/LuuTru';
import { tuVungMau } from '../demo/duLieu';

const baiNghe = [
  {
    ten: 'A morning at the café',
    chuDe: 'ĐỜI SỐNG',
    text: "Good morning! I'd like a takeaway coffee, please. A small latte with oat milk. I have a meeting at nine, so I'm in a hurry. Thank you!",
    cauHoi: 'What does the customer order?',
    dapAn: ['A tea with lemon', 'A small latte with oat milk', 'A large black coffee'],
    dung: 1,
    chinhTa: "I'd like a takeaway coffee, please.",
  },
  {
    ten: 'An exciting opportunity',
    chuDe: 'CÔNG VIỆC',
    text: 'I have an interview tomorrow. It is a great opportunity to join a new team. I feel confident because I have three years of experience. I want to improve my skills.',
    cauHoi: 'How much experience does the speaker have?',
    dapAn: ['One year', 'Two years', 'Three years'],
    dung: 2,
    chinhTa: 'I feel confident because I have three years of experience.',
  },
];
export function LuyenNghe() {
  const { luuTu, tuVung, ghiNhanHoc } = useDuLieu();
  const [index, setIndex] = useState(0);
  const [tocDo, setTocDo] = useState(0.85);
  const [tab, setTab] = useState('Trắc nghiệm');
  const [dapAn, setDapAn] = useState<number | null>(null);
  const [daNop, setDaNop] = useState(false);
  const [chepLoi, setChepLoi] = useState(false);
  const [chinhTa, setChinhTa] = useState('');
  const [loi, setLoi] = useState('');
  const [daTinhPhut, setDaTinhPhut] = useState<Set<string>>(() => new Set());
  const bai = baiNghe[index];
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
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
      <TieuDeTrang
        nhan="LẮNG NGHE THẾ GIỚI QUANH BẠN"
        ten="Luyện nghe"
        moTa="Nghe theo nhịp của bạn, hiểu từng câu và khám phá từ mới."
      />
      <div className="practice-layout">
        <section className="panel listening-panel">
          <div className="section-title">
            <span className="pill peach">{bai.chuDe} · A2 – B1</span>
            <select
              aria-label="Chọn bài nghe"
              value={index}
              onChange={(e) => {
                window.speechSynthesis?.cancel();
                setLoi('');
                setIndex(Number(e.target.value));
                setDapAn(null);
                setDaNop(false);
                setChinhTa('');
                setChepLoi(false);
              }}
            >
              <option value={0}>Bài 01 · Quán cà phê</option>
              <option value={1}>Bài 02 · Công việc</option>
            </select>
          </div>
          <div className="listening-art">
            <div className="headphone-orb">
              <BieuTuong ten="headphones" size={58} />
            </div>
            <span className="eyebrow">LISTEN & DISCOVER</span>
            <h2>{bai.ten}</h2>
            <p>Giọng đọc tổng hợp của trình duyệt · Không phải bản ghi người thật</p>
            <div className="player-controls">
              <button
                className="play-button"
                aria-label="Phát bài nghe"
                onClick={() => {
                  setLoi('');
                  if (!docTiengAnh(bai.text, tocDo))
                    setLoi('Trình duyệt chưa hỗ trợ giọng đọc. Bạn có thể xem bản chép lời.');
                }}
              >
                <BieuTuong ten="play" size={23} />
              </button>
              <button className="btn secondary" onClick={() => window.speechSynthesis?.cancel()}>
                <BieuTuong ten="pause" size={18} /> Dung
              </button>
              <label>
                Toc do
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
                <button
                  className="text-button"
                  onClick={() => {
                    if (!docTiengAnh(bai.chinhTa, tocDo))
                      setLoi('Trình duyệt chưa hỗ trợ giọng đọc.');
                  }}
                >
                  <BieuTuong ten="volume" size={18} /> Nghe câu chính tả
                </button>
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
            <div className={`quiz-result ${dung ? 'success' : ''}`} role="status">
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
            {[tuVungMau[index === 0 ? 5 : 0], tuVungMau[index === 0 ? 3 : 1]].map((tu) => (
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
          <div className="tip-box">
            <BieuTuong ten="headphones" />
            <p>
              Lần đầu, hãy nghe ý chính. Lần tiếp theo, chú ý từ khóa. Cuối cùng mới xem bản chép
              lời.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
