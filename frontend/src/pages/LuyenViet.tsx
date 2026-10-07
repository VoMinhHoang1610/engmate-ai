import { useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { useDuLieu } from '../demo/LuuTru';
import { ChonTrinhDo } from '../components/ChonTrinhDo';
import { deVietTheoTrinhDo, goiYVietTheoTrinhDo, layTrinhDoHoc } from '../demo/trinhDo';

export function LuyenViet() {
  const { ghiNhanHoc, hoSo } = useDuLieu();
  const [trinhDo, setTrinhDo] = useState(() => layTrinhDoHoc(hoSo.trinhDo));
  const deBai = deVietTheoTrinhDo[trinhDo];
  const [loai, setLoai] = useState('Đoạn văn');
  const [text, setText] = useState('');
  const [ketQua, setKetQua] = useState(false);
  const [goiY, setGoiY] = useState(false);
  return (
    <>
      <TieuDeTrang ten="Writing" />
      <ChonTrinhDo
        value={trinhDo}
        onChange={(value) => {
          setTrinhDo(value);
          setKetQua(false);
          setGoiY(false);
        }}
      />
      <div className="writing-layout">
        <section className="panel writing-editor">
          <div className="tabs">
            {Object.keys(deBai).map((item) => (
              <button
                key={item}
                className={loai === item ? 'active' : ''}
                onClick={() => {
                  setLoai(item);
                  setKetQua(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="writing-prompt">
            <span className="eyebrow">GỢI Ý HÔM NAY</span>
            <p>{deBai[loai]}</p>
          </div>
          <textarea
            aria-label="Bài viết tiếng Anh"
            className="writing-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setKetQua(false);
            }}
            placeholder="Viết bằng tiếng Anh..."
            maxLength={5000}
          />
          <div className="editor-meta">
            <span>{text.trim() ? text.trim().split(/\s+/).length : 0} tu</span>
            <span>{text.length} / 5000 ký tự</span>
          </div>
          <div className="form-footer">
            <button className="text-button" onClick={() => setGoiY(!goiY)}>
              <BieuTuong ten="sparkles" size={17} /> Gợi ý mở đầu
            </button>
            <button
              className="btn primary"
              disabled={!text.trim() || ketQua}
              onClick={() => {
                setKetQua(true);
                ghiNhanHoc(5);
              }}
            >
              Xem phản hồi mẫu <BieuTuong ten="arrow" size={17} />
            </button>
          </div>
          {goiY && (
            <div className="tip-box">
              <p>{goiYVietTheoTrinhDo[trinhDo]}</p>
            </div>
          )}
        </section>
        <aside className="panel writing-feedback">
          <div className="section-title">
            <h2>
              <BieuTuong ten="sparkles" size={19} /> Phản hồi
            </h2>
            <span className="pill purple">AI · Demo</span>
          </div>
          {!ketQua ? (
            <div className="empty-feedback">
              <LinhThu size={150} camXuc="thinking" />
              <p className="muted">Chưa có phản hồi</p>
            </div>
          ) : (
            <div role="status">
              <p className="notice">
                Đây là phản hồi cố định để minh họa giao diện, không phải đánh giá bài viết của bạn.
              </p>
              <div className="feedback-item">
                <span className="pill peach">NGỮ PHÁP</span>
                <p>
                  <s>I am study English.</s>
                </p>
                <strong>I am studying English.</strong>
                <p className="muted">
                  Sau “am/is/are”, động từ ở thì hiện tại tiếp diễn cần thêm “-ing”.
                </p>
              </div>
              <div className="feedback-item">
                <span className="pill blue">TỪ VỰNG & CHÍNH TẢ</span>
                <p>
                  “very good” → <strong>“excellent”</strong>
                </p>
                <p>
                  “becaus” → <strong>“because”</strong>
                </p>
                <p className="muted">Chọn từ cụ thể và kiểm tra chính tả trước khi gửi.</p>
              </div>
              <div className="feedback-item">
                <span className="pill green">CẤU TRÚC & ĐỘ TỰ NHIÊN</span>
                <p>
                  Mở đầu bằng ý chính. Thêm ví dụ với “For example”, kết nối ý bằng “However” hoặc
                  “Also”.
                </p>
                <strong>
                  I'd like to improve my English so I can communicate confidently at work.
                </strong>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
