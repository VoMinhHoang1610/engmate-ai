import { useEffect, useRef, useState } from 'react';
import { useDuLieu } from '../demo/LuuTru';
import { BieuTuong } from './BieuTuong';

/** Menu avatar hỗ trợ chuột, touch và điều hướng bằng bàn phím. */
export function MenuNguoiDung() {
  const { hoSo, daDangNhap, capNhat } = useDuLieu();
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
      if (
        wrapper.current?.contains(document.activeElement) ||
        (event.target instanceof Node && wrapper.current?.contains(event.target))
      )
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
        {daDangNhap ? (
          hoSo.anhDaiDien ? (
            <img src={hoSo.anhDaiDien} alt="Avatar" className="avatar-img" />
          ) : (
            hoSo.ten.slice(0, 1).toUpperCase()
          )
        ) : (
          <BieuTuong ten="user" size={19} />
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
            {daDangNhap ? (
              <>
                <a href="#ho-so" onClick={() => setOpen(false)}>
                  <BieuTuong ten="user" size={18} /> Hồ sơ học tập
                </a>
                <button
                  className="user-menu-logout"
                  onClick={() => {
                    capNhat({ daDangNhap: false });
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                >
                  <BieuTuong ten="logout" size={18} /> Đăng xuất
                </button>
              </>
            ) : (
              <a href="#dang-nhap" onClick={() => setOpen(false)}>
                <BieuTuong ten="user" size={18} /> Đăng nhập
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
