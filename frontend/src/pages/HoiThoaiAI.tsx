import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { useDuLieu } from '../demo/LuuTru';
import { chuDeMau, tuVungMau, type TrinhDo } from '../demo/duLieu';
import { docTiengAnh } from '../demo/amThanh';

interface TinNhan {
  id: number;
  vai: 'ai' | 'ban';
  noiDung: string;
}
export function HoiThoaiAI() {
  const { hoSo, luuTu, tuVung } = useDuLieu();
  const topicId = new URLSearchParams(window.location.hash.split('?')[1]).get('chu-de');
  const topic = chuDeMau.find((item) => item.id === topicId) ?? chuDeMau[0];
  const [level, setLevel] = useState<TrinhDo>(hoSo.trinhDo);
  const [tinNhan, setTinNhan] = useState<TinNhan[]>([{ id: 0, vai: 'ai', noiDung: topic.mau }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loi, setLoi] = useState('');
  const [giaiThich, setGiaiThich] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [tinNhan, busy]);
  async function gui(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const userMessage: TinNhan = { id: Date.now(), vai: 'ban', noiDung: text };
    setTinNhan((cu) => [...cu, userMessage]);
    setInput('');
    setBusy(true);
    setLoi('');
    const request = new AbortController();
    controller.current = request;
    const timer = window.setTimeout(() => request.abort(), 15_000);
    try {
      const response = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, level }),
        signal: request.signal,
      });
      if (!response.ok) throw new Error('Chưa gửi được tin nhắn. Kiểm tra backend và thử lại.');
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== 'object' ||
        !('reply' in data) ||
        typeof data.reply !== 'string' ||
        !('provider' in data) ||
        data.provider !== 'mock'
      )
        throw new Error('Phản hồi backend không hợp lệ. Vui lòng thử lại.');
      if (request.signal.aborted || !mounted.current) return;
      setTinNhan((cu) => [
        ...cu,
        { id: userMessage.id + 1, vai: 'ai', noiDung: data.reply as string },
      ]);
    } catch (error) {
      if (controller.current !== request || !mounted.current) return;
      setLoi(
        request.signal.aborted
          ? 'Phản hồi quá lâu. Bạn có thể thử gửi lại.'
          : error instanceof Error
            ? error.message
            : 'Không kết nối được backend.',
      );
    } finally {
      window.clearTimeout(timer);
      if (controller.current === request && mounted.current) {
        setBusy(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }
  const word = topic.id === 'coffee' ? tuVungMau[5] : tuVungMau[0];
  return (
    <>
      <TieuDeTrang
        nhan="CỨ TRÒ CHUYỆN, CỨ TIẾN BỘ"
        ten="Hội thoại AI"
        moTa="Một không gian an toàn để thử, sai và nói tự nhiên hơn."
      >
        <span className="pill purple">
          <span className="status-dot" /> AI · Demo
        </span>
      </TieuDeTrang>
      <div className="chat-layout">
        <section className="panel chat-panel">
          <div className="chat-top">
            <span className={`icon-tile ${topic.mauSac}`}>
              <BieuTuong ten={topic.bieuTuong} />
            </span>
            <div>
              <strong>{topic.ten}</strong>
              <span>EngMate trong vai {topic.vai}</span>
            </div>
            <label className="compact-label">
              Độ khó
              <select
                aria-label="Độ khó hội thoại"
                value={level}
                onChange={(e) => setLevel(e.target.value as TrinhDo)}
              >
                <option>A2</option>
                <option>B1</option>
                <option>B2</option>
              </select>
            </label>
          </div>
          <div
            className="chat-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="chat-date">BẮT ĐẦU CUỘC TRÒ CHUYỆN</div>
            {tinNhan.map((message) => (
              <div className={`message-row ${message.vai}`} key={message.id}>
                <span className={`avatar ${message.vai === 'ai' ? 'bot-avatar' : ''}`}>
                  {message.vai === 'ai' ? (
                    <BieuTuong ten="sparkles" size={18} />
                  ) : (
                    hoSo.ten.slice(0, 1)
                  )}
                </span>
                <div>
                  <span className="message-author">{message.vai === 'ai' ? 'EngMate' : 'Ban'}</span>
                  <div className="message-bubble">{message.noiDung}</div>
                  {message.vai === 'ai' && (
                    <button
                      className="text-button message-audio"
                      onClick={() => {
                        if (!docTiengAnh(message.noiDung))
                          setLoi('Trình duyệt chưa hỗ trợ đọc câu mẫu.');
                      }}
                    >
                      <BieuTuong ten="volume" size={15} /> Nghe câu mẫu
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="typing-indicator" role="status">
                EngMate đang phản hồi <span>•••</span>
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="chat-bottom">
            <div className="suggestion-row">
              <span>Thử nói:</span>
              {['A latte, please.', 'Could you help me?', 'Tell me more.'].map((text) => (
                <button key={text} onClick={() => setInput(text)}>
                  {text}
                </button>
              ))}
            </div>
            <form className="chat-input" onSubmit={(e) => void gui(e)}>
              <input
                ref={inputRef}
                aria-label="Tin nhắn"
                maxLength={2000}
                placeholder="Viết câu trả lời bằng tiếng Anh..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
              />
              <button
                className="btn primary"
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Gửi tin nhắn"
              >
                <BieuTuong ten="send" />
              </button>
            </form>
            {loi && (
              <p role="alert" className="error-text">
                {loi}
              </p>
            )}
            <p className="chat-disclaimer">
              AI · Demo: phản hồi minh họa, chưa phân tích câu hỏi hoặc nhập vai thực tế.
            </p>
          </div>
        </section>
        <aside className="chat-aside">
          <section className="panel">
            <div className="section-title">
              <h2>
                <BieuTuong ten="sparkles" size={19} /> Trợ lý học tập
              </h2>
              <span className="pill purple">Mau</span>
            </div>
            <p className="muted">Thử một cách diễn đạt tự nhiên hơn:</p>
            <div className="correction-example">
              <span>THAY VÌ</span>
              <p>I want a coffee.</p>
              <span className="accent">BẠN CÓ THỂ NÓI</span>
              <strong>I'd like a coffee, please.</strong>
            </div>
            <button
              className="text-button"
              aria-expanded={giaiThich}
              aria-controls="giai-thich-cau"
              onClick={() => setGiaiThich(!giaiThich)}
            >
              {giaiThich ? 'Ẩn giải thích' : 'Giải thích tiếng Việt'}{' '}
              <BieuTuong ten="chevron" size={15} />
            </button>
            {giaiThich && (
              <p id="giai-thich-cau" className="explanation">
                “I'd like” (I would like) là cách yêu cầu lịch sự hơn “I want”. Thêm “please” giúp
                câu nói nhẹ nhàng và tự nhiên khi gọi món.
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Từ vựng gợi ý</h2>
            <div className="word-suggestion">
              <strong>{word.tu}</strong>
              <span>{word.phienAm}</span>
              <p>{word.nghia}</p>
              <button
                className="btn secondary full-width"
                onClick={() => luuTu(word)}
                disabled={tuVung.some((item) => item.tu === word.tu)}
              >
                <BieuTuong ten="book" size={16} />
                {tuVung.some((item) => item.tu === word.tu) ? 'Đã có trong sổ từ' : 'Lưu vào sổ từ'}
              </button>
            </div>
            <a className="text-button" href="#so-tu-vung">
              Mở sổ từ vựng <BieuTuong ten="arrow" size={15} />
            </a>
          </section>
          <div className="tip-box">
            <BieuTuong ten="chat" />
            <p>Không cần câu hoàn hảo. Chỉ cần bắt đầu, bạn đã tiến thêm một bước.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
