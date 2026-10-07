import { useState, useRef } from 'react';
import { BieuTuong } from './BieuTuong';

export function HoTroNhanh() {
  const [open, setOpen] = useState(false);

  // Position starting near bottom right
  const [pos, setPos] = useState({ x: -24, y: -24 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initPosX: number;
    initPosY: number;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: pos.x,
      initPosY: pos.y,
    };
    setIsDragging(true);
    setHasMoved(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging || !dragRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setHasMoved(true);
    }

    // Calculate new position relative to bottom-right
    const newX = dragRef.current.initPosX + dx;
    const newY = dragRef.current.initPosY + dy;

    // Bounds checking can be complex depending on viewport size,
    // for simplicity, we let CSS clamp or restrict it within window if needed
    // or just let it roam freely within reasonable bounds

    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (!hasMoved) {
      setOpen(!open);
    }
    dragRef.current = null;
  };

  return (
    <div
      className={`floating-support ${open ? 'is-open' : ''}`}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        right: 0,
        bottom: 0,
        transition: isDragging ? 'none' : 'transform 0.1s ease',
      }}
    >
      <div className={`floating-chat-window ${open ? 'show' : ''}`}>
        <div className="chat-header">
          <BieuTuong ten="message" size={18} />
          <strong>Hỗ trợ & Báo lỗi</strong>
          <button className="close-btn" onClick={() => setOpen(false)}>
            <BieuTuong ten="x" size={16} />
          </button>
        </div>
        <div className="chat-body">
          <div className="chat-bubble ai">
            Xin chào! Bạn có thắc mắc hoặc gặp sự cố gì, hãy nhắn cho tôi nhé.
          </div>
        </div>
        <div className="chat-input-area">
          <input type="text" placeholder="Nhập tin nhắn..." />
          <button className="btn primary icon-only">
            <BieuTuong ten="arrow" size={16} />
          </button>
        </div>
      </div>

      <button
        className="floating-support-btn"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="Hỗ trợ"
      >
        <BieuTuong ten={open ? 'x' : 'message'} size={24} />
      </button>
    </div>
  );
}
