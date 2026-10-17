import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BieuTuong } from './BieuTuong';

export function AudioSettingsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="audio-settings-anchor" ref={anchor}>
      <button
        ref={toggle}
        type="button"
        className="icon-button composer-icon"
        aria-label="Tùy chọn âm thanh"
        title="Tùy chọn âm thanh"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BieuTuong ten="headphones" size={19} />
      </button>
      {open && (
        <div className="audio-settings" role="region" aria-label="Tùy chọn âm thanh">
          {children}
        </div>
      )}
    </div>
  );
}
