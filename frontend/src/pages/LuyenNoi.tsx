import { useEffect, useRef, useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { docTiengAnh } from '../demo/amThanh';
import { useDuLieu } from '../demo/LuuTru';

const cauMau = [
  'I would like a cup of coffee, please.',
  'I feel more confident speaking English.',
  'Could you tell me how to get to the station?',
];
export function LuyenNoi() {
  const { ghiNhanHoc } = useDuLieu();
  const [bai, setBai] = useState(0);
  const [dangGhi, setDangGhi] = useState(false);
  const [dangDung, setDangDung] = useState(false);
  const [audio, setAudio] = useState('');
  const [vanBan, setVanBan] = useState('');
  const [ketQua, setKetQua] = useState(false);
  const [loi, setLoi] = useState('');
  const [dangXin, setDangXin] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const url = useRef('');
  const mounted = useRef(true);
  const gioiHan = useRef<number | null>(null);
  function boBanGhi() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = '';
    setAudio('');
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (gioiHan.current !== null) window.clearTimeout(gioiHan.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (url.current) URL.revokeObjectURL(url.current);
      window.speechSynthesis?.cancel();
    };
  }, []);
  async function ghiAm() {
    if (dangGhi) {
      setDangDung(true);
      recorder.current?.stop();
      return;
    }
    setLoi('');
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setLoi('Trình duyệt chưa hỗ trợ ghi âm. Bạn vẫn có thể nhập câu để thử phân tích mẫu.');
      return;
    }
    setDangXin(true);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = mic;
      const media = new MediaRecorder(mic);
      recorder.current = media;
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      media.onstop = () => {
        if (gioiHan.current !== null) window.clearTimeout(gioiHan.current);
        mic.getTracks().forEach((track) => track.stop());
        if (!mounted.current || recorder.current !== media) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(new Blob(chunks, { type: media.mimeType }));
        setAudio(url.current);
        setDangGhi(false);
        setDangDung(false);
      };
      media.start();
      gioiHan.current = window.setTimeout(() => {
        if (media.state === 'recording') {
          setDangDung(true);
          media.stop();
        }
      }, 60_000);
      setDangGhi(true);
      setKetQua(false);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current)
        setLoi('Không truy cập được micro. Hãy cho phép micro trong trình duyệt và thử lại.');
    } finally {
      if (mounted.current) setDangXin(false);
    }
  }
  return (
    <>
      <TieuDeTrang
        nhan="CẤT LỜI VÀ TỰ TIN HƠN"
        ten="Luyện nói"
        moTa="Nghe mẫu, ghi âm và lắng nghe chính mình. Mỗi lần nói là một lần tiến bộ."
      />
      <div className="practice-layout">
        <section className="panel speaking-panel">
          <div className="section-title">
            <span className="pill purple">SHADOWING · A2 – B1</span>
            <span className="muted">
              Câu {bai + 1} / {cauMau.length}
            </span>
          </div>
          <div className="speaking-prompt">
            <span className="eyebrow">LẮNG NGHE VÀ LẶP LẠI</span>
            <h2>“{cauMau[bai]}”</h2>
            <button
              className="btn secondary"
              onClick={() => {
                if (!docTiengAnh(cauMau[bai], 0.85)) setLoi('Trình duyệt chưa hỗ trợ đọc câu mẫu.');
              }}
            >
              <BieuTuong ten="volume" /> Nghe câu mẫu
            </button>
          </div>
          <div className={`record-zone ${dangGhi ? 'recording' : ''}`}>
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
            <button
              className="record-button"
              disabled={dangXin || dangDung}
              aria-label={dangGhi ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
              onClick={() => void ghiAm()}
            >
              <BieuTuong ten={dangGhi ? 'pause' : 'mic'} size={32} />
            </button>
            <strong role="status">
              {dangXin
                ? 'Đang xin quyền micro...'
                : dangDung
                  ? 'Đang hoàn tất bản ghi...'
                  : dangGhi
                    ? 'Đang ghi âm... Nhấn để dừng'
                    : 'Nhấn micro để bắt đầu'}
            </strong>
            <span>Tối đa 60 giây. Bản ghi chỉ được giữ trong phiên hiện tại.</span>
          </div>
          {audio && (
            <div className="audio-preview">
              <span>Bản ghi của bạn</span>
              <audio controls src={audio} />
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
              placeholder="Nhập câu bạn vừa nói để xem phân tích AI..."
              value={vanBan}
              onChange={(e) => {
                setVanBan(e.target.value);
                setKetQua(false);
              }}
              maxLength={2000}
            />
          </label>
          <p className="notice">
            Phân tích AI · Demo: kết quả bên dưới là ví dụ mẫu. Chuyển giọng nói thành văn bản và
            chấm phát âm chưa được kết nối.
          </p>
          <div className="form-footer">
            <button
              className="btn secondary"
              disabled={dangGhi || dangXin || dangDung}
              onClick={() => {
                window.speechSynthesis?.cancel();
                boBanGhi();
                setBai((bai + 1) % cauMau.length);
                setVanBan('');
                setKetQua(false);
              }}
            >
              Câu tiếp theo <BieuTuong ten="arrow" size={17} />
            </button>
            <button
              className="btn primary"
              disabled={!vanBan.trim() || ketQua}
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
          <section className="panel">
            <span className="icon-tile peach">
              <BieuTuong ten="mic" />
            </span>
            <h2>Nói chậm, nói rõ</h2>
            <ul className="tips-list">
              <li>Nghe câu mẫu một lần trước khi nói.</li>
              <li>Chú ý nhấn âm ở từ quan trọng.</li>
              <li>Ngắt nhịp tự nhiên, không cần vội.</li>
              <li>Nghe lại bản ghi để tự đối chiếu.</li>
            </ul>
          </section>
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
