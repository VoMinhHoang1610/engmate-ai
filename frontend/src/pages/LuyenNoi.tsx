import { useState } from 'react';
import { useThuAm } from '../hooks/useThuAm';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { NutDoc } from '../components/NutDoc';
import { dungDoc } from '../demo/amThanh';
import { useDuLieu } from '../demo/LuuTru';
import { ChonTrinhDo } from '../components/ChonTrinhDo';
import { cauNoiTheoTrinhDo, layTrinhDoHoc } from '../demo/trinhDo';

export function LuyenNoi() {
  const { ghiNhanHoc, hoSo } = useDuLieu();
  const [trinhDo, setTrinhDo] = useState(() => layTrinhDoHoc(hoSo.trinhDo));
  const cauMau = cauNoiTheoTrinhDo[trinhDo];
  const [bai, setBai] = useState(0);
  const [vanBan, setVanBan] = useState('');
  const [ketQua, setKetQua] = useState(false);
  const [loi, setLoi] = useState('');
  const thuAm = useThuAm((text) => {
    setVanBan(text);
    setKetQua(false);
  }, setLoi);
  return (
    <>
      <TieuDeTrang ten="Speaking" />
      <ChonTrinhDo
        value={trinhDo}
        disabled={thuAm.active}
        onChange={(value) => {
          dungDoc();
          thuAm.clear();
          setTrinhDo(value);
          setBai(0);
          setVanBan('');
          setKetQua(false);
          setLoi('');
        }}
      />
      <div className="practice-layout">
        <section className="panel speaking-panel">
          <div className="section-title">
            <span className="pill purple">SHADOWING · {trinhDo}</span>
            <span className="muted">
              Câu {bai + 1} / {cauMau.length}
            </span>
          </div>
          <div className="speaking-prompt">
            <span className="eyebrow">LẮNG NGHE VÀ LẶP LẠI</span>
            <h2>“{cauMau[bai]}”</h2>
            <NutDoc
              className="btn secondary"
              text={cauMau[bai]}
              rate={0.85}
              preload
              onError={setLoi}
              disabled={thuAm.active}
            >
              <BieuTuong ten="volume" /> Nghe câu mẫu
            </NutDoc>
          </div>
          <div className={`record-zone ${thuAm.recording ? 'recording' : ''}`}>
            <div className="record-visual">
              <div className="record-mate">
                <LinhThu
                  size={110}
                  camXuc={
                    thuAm.recording ? 'listening' : thuAm.processing ? 'thinking' : 'encouraging'
                  }
                />
              </div>
              <div className="sound-wave" aria-hidden="true">
                {Array.from({ length: 27 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${12 + ((index * 17) % 46)}px`,
                      animationDelay: `${index * 40}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              className="record-button"
              disabled={thuAm.processing}
              aria-label={thuAm.recording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
              onClick={() => {
                setKetQua(false);
                void thuAm.toggle();
              }}
            >
              <BieuTuong ten={thuAm.recording ? 'pause' : 'mic'} size={32} />
            </button>
            <strong role="status">{thuAm.status}</strong>
            <span>Tối đa 60 giây</span>
          </div>
          {thuAm.audio && (
            <div className="audio-preview">
              <span>Bản ghi của bạn</span>
              <audio controls src={thuAm.audio} />
            </div>
          )}
          {loi && (
            <p role="alert" className="error-text">
              {loi}
            </p>
          )}
          <label>
            Bản chép lời / câu bạn muốn phân tích
            <textarea
              rows={3}
              placeholder="Thu âm để tự chép lời, hoặc nhập câu bạn vừa nói..."
              value={vanBan}
              disabled={thuAm.active}
              onChange={(e) => {
                setVanBan(e.target.value);
                setKetQua(false);
              }}
              maxLength={2000}
            />
          </label>
          <p className="notice">Phân tích AI · Demo — Kết quả mẫu, chưa chấm phát âm.</p>
          <div className="form-footer">
            <button
              className="btn secondary"
              disabled={thuAm.active}
              onClick={() => {
                dungDoc();
                thuAm.clear();
                setBai((bai + 1) % cauMau.length);
                setVanBan('');
                setKetQua(false);
              }}
            >
              Câu tiếp theo <BieuTuong ten="arrow" size={17} />
            </button>
            <button
              className="btn primary"
              disabled={!vanBan.trim() || ketQua || thuAm.active}
              onClick={() => {
                setKetQua(true);
                ghiNhanHoc(2);
              }}
            >
              <BieuTuong ten="sparkles" size={18} /> Xem phân tích mẫu
            </button>
          </div>
        </section>
        <aside>
          <details className="panel practice-help">
            <summary>Gợi ý luyện nói</summary>
            <ul className="tips-list">
              <li>Nghe câu mẫu một lần trước khi nói.</li>
              <li>Chú ý nhấn âm ở từ quan trọng.</li>
              <li>Ngắt nhịp tự nhiên, không cần vội.</li>
              <li>Nghe lại bản ghi để tự đối chiếu.</li>
            </ul>
          </details>
          {ketQua && (
            <section className="panel result-panel" role="status">
              <span className="pill purple">PHÂN TÍCH AI · DEMO</span>
              <h2>Thử một cách nói lịch sự</h2>
              <p className="muted">Câu bạn nhập: “{vanBan}”</p>
              <div className="correction-example">
                <strong>I'd like a cup of coffee, please.</strong>
              </div>
              <p className="muted">
                Ví dụ minh họa: “I'd like” là lời yêu cầu lịch sự. Nhấn âm vào “like”, “coffee”,
                ngắt nhẹ trước “please”.
              </p>
              <p className="notice">
                Đây không phải đánh giá bản ghi hay câu bạn nhập. Chưa có điểm phát âm.
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
