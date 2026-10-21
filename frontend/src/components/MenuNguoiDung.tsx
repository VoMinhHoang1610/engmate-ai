import { useEffect, useRef, useState } from 'react';
import { BieuTuong } from './BieuTuong';
import type { Account } from '../types';

/** Giữ menu avatar gốc và thu hồi phiên qua REST khi đăng xuất. */
export function MenuNguoiDung({
  account,
  busy,
  onLogout,
  onProfile,
  onSettings,
  displayName,
  avatar,
}: {
  account: Account;
  busy: boolean;
  onLogout: () => Promise<void>;
  onProfile?: () => void;
  onSettings?: () => void;
  displayName?: string;
  avatar?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);
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
      onMouseEnter={() => {
        openedByHover.current = !open;
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (!wrapper.current?.contains(document.activeElement)) {
          setOpen(false);
          openedByHover.current = false;
        }
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
        onClick={() => {
          if (openedByHover.current) {
            openedByHover.current = false;
            setOpen(true);
          } else setOpen((value) => !value);
        }}
      >
        {avatar ? (
          <img src={avatar} className="avatar-img" alt="Ảnh đại diện" />
        ) : (
          (displayName || account.username).slice(0, 1).toUpperCase()
        )}
      </button>
      {open && (
        <div
          className="user-menu-popover"
          id="menu-nguoi-dung"
          role="group"
          aria-label="Tùy chọn tài khoản"
        >
          <div className="user-menu-panel">
            {onProfile && (
              <button
                className="user-menu-profile"
                onClick={() => {
                  setOpen(false);
                  onProfile();
                }}
              >
                <BieuTuong ten="user" size={18} /> Hồ sơ học tập
              </button>
            )}
            {onSettings && (
              <button
                className="user-menu-settings"
                onClick={() => {
                  setOpen(false);
                  onSettings();
                }}
              >
                <BieuTuong ten="settings" size={18} /> Cài đặt
              </button>
            )}
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
