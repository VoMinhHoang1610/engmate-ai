import { useState, useRef, useEffect, type PointerEvent } from 'react';
import { BieuTuong } from './BieuTuong';
import { LinhThu } from './LinhThu';

const KICH_THUOC_NUT = 68;
const LE = 12;

function gioiHanViTri(pos: { x: number; y: number }) {
  return {
    x: Math.max(LE, Math.min(pos.x, window.innerWidth - KICH_THUOC_NUT - LE)),
    y: Math.max(LE, Math.min(pos.y, window.innerHeight - KICH_THUOC_NUT - LE)),
  };
}

export function HoTroNhanh() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => gioiHanViTri({ x: 24, y: 24 }));
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const skipClick = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    pos: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const resize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setPos((current) => gioiHanViTri(current));
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    skipClick.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pos,
      moved: false,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.moved) setPos(gioiHanViTri({ x: drag.pos.x - dx, y: drag.pos.y - dy }));
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    skipClick.current = cancelled || drag.moved;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // Keep the panel on screen after dragging Mate to any edge.
  const panelWidth = Math.min(320, viewport.width - LE * 2);
  const panelHeight = Math.min(390, viewport.height - LE * 2);
  const buttonLeft = viewport.width - pos.x - KICH_THUOC_NUT;
  const buttonTop = viewport.height - pos.y - KICH_THUOC_NUT;
  const panelLeft = Math.max(
    LE,
    Math.min(buttonLeft + KICH_THUOC_NUT - panelWidth, viewport.width - panelWidth - LE),
  );
  const panelTop = Math.max(
    LE,
    Math.min(
      buttonTop >= panelHeight + LE * 2
        ? buttonTop - panelHeight - LE
        : buttonTop + KICH_THUOC_NUT + LE,
      viewport.height - panelHeight - LE,
    ),
  );

  return (
    <>
      {open && (
        <section
          id="ho-tro-nhanh"
          className="floating-chat-window show"
          role="dialog"
          aria-label="Hỗ trợ & Báo lỗi"
          style={{ left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight }}
        >
          <div className="chat-header">
            <LinhThu size={34} camXuc="support" />
            <strong>Hỗ trợ & Báo lỗi</strong>
            <button
              className="close-btn"
              aria-label="Đóng hỗ trợ"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              <BieuTuong ten="close" size={18} />
            </button>
          </div>
          <div className="chat-body">
            <div className="chat-bubble ai">
              Xin chào! Bạn có thắc mắc hoặc gặp sự cố gì, hãy nhắn cho tôi nhé.
            </div>
          </div>
          <div className="chat-input-area">
            <input type="text" aria-label="Tin nhắn hỗ trợ" placeholder="Nhập tin nhắn..." />
            <button className="btn primary icon-only" aria-label="Gửi tin nhắn hỗ trợ">
              <BieuTuong ten="arrow" size={16} />
            </button>
          </div>
        </section>
      )}
      <div
        className={`floating-support ${open ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{ right: pos.x, bottom: pos.y }}
      >
        <button
          ref={buttonRef}
          className="floating-support-btn"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
          onLostPointerCapture={(event) => finishDrag(event, true)}
          onClick={(event) => {
            if (skipClick.current && event.detail !== 0) {
              skipClick.current = false;
              return;
            }
            skipClick.current = false;
            setOpen((current) => !current);
          }}
          aria-label="Hỗ trợ"
          aria-expanded={open}
          aria-controls="ho-tro-nhanh"
          title="Hỗ trợ · Kéo để di chuyển"
        >
          <LinhThu camXuc="support" size={62} />
        </button>
      </div>
    </>
  );
}
