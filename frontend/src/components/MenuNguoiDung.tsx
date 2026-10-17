import { useEffect, useRef, useState } from 'react';
import { BieuTuong } from './BieuTuong';
import type { Account } from '../types';

/** Giữ menu avatar gốc và thu hồi phiên qua REST khi đăng xuất. */
export function MenuNguoiDung({
  account,
  busy,
  onLogout,
}: {
  account: Account;
  busy: boolean;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div
      className="user-menu"
      ref={wrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!wrapper.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="avatar user-menu-trigger"
        aria-label="Mở menu tài khoản"
        aria-expanded={open}
        aria-controls="menu-nguoi-dung"
        onClick={() => setOpen((value) => !value)}
      >
        {account.username.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div
          className="user-menu-popover"
          id="menu-nguoi-dung"
          role="group"
          aria-label="Tùy chọn tài khoản"
        >
          <div className="user-menu-panel">
            <p className="muted account-menu-email">{account.email}</p>
            <button className="user-menu-logout" disabled={busy} onClick={() => void onLogout()}>
              <BieuTuong ten="logout" size={18} />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
