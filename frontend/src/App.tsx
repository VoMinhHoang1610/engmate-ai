import { useEffect, useState } from 'react';
import { BieuTuong } from './components/BieuTuong';
import { Logo } from './components/Logo';
import { LinhThu } from './components/LinhThu';
import { MenuNguoiDung } from './components/MenuNguoiDung';
import { LuuTru, useDuLieu } from './demo/LuuTru';
import { danhSachTrang, layTrang } from './demo/duLieu';
import { TongQuan } from './pages/TongQuan';
import { HoiThoaiAI } from './pages/HoiThoaiAI';
import { LuyenNoi } from './pages/LuyenNoi';
import { ChuDeNhapVai } from './pages/ChuDeNhapVai';
import { LuyenNghe } from './pages/LuyenNghe';
import { LuyenViet } from './pages/LuyenViet';
import { SoTuVung } from './pages/SoTuVung';
import { Flashcard } from './pages/Flashcard';
import { HoSo } from './pages/HoSo';
import { CaiDat } from './pages/CaiDat';
import { TaiKhoan } from './pages/TaiKhoan';
import { HoTroNhanh } from './components/HoTroNhanh';

function KhungTrang() {
  const [trang, setTrang] = useState(layTrang);
  const [hash, setHash] = useState(window.location.hash);
  const [menu, setMenu] = useState(false);
  const { hoSo, loiLuu, daDangNhap } = useDuLieu();
  useEffect(() => {
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const showScrollbar = (event: Event) => {
      const target = event.target === document ? document.documentElement : event.target;
      if (!(target instanceof HTMLElement)) return;
      clearTimeout(timers.get(target));
      target.classList.add('is-scrolling');
      timers.set(
        target,
        setTimeout(() => {
          target.classList.remove('is-scrolling');
          timers.delete(target);
        }, 1000),
      );
    };
    document.addEventListener('scroll', showScrollbar, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', showScrollbar, true);
      timers.forEach((timer, target) => {
        clearTimeout(timer);
        target.classList.remove('is-scrolling');
      });
    };
  }, []);
  useEffect(() => {
    const change = () => {
      setTrang(layTrang());
      setHash(window.location.hash);
      setMenu(false);
      window.speechSynthesis?.cancel();
      window.scrollTo?.({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(() => {
    document.title = `${!daDangNhap || trang === 'dang-nhap' ? 'Đăng nhập' : danhSachTrang.find((item) => item.id === trang)?.ten} · EngMate-AI`;
  }, [trang, daDangNhap]);
  if (!daDangNhap || trang === 'dang-nhap') return <TaiKhoan key={hash} />;
  const pages = {
    'tong-quan': <TongQuan />,
    'hoi-thoai-ai': <HoiThoaiAI key={hash} />,
    'luyen-noi': <LuyenNoi />,
    'chu-de-nhap-vai': <ChuDeNhapVai />,
    'luyen-nghe': <LuyenNghe />,
    'luyen-viet': <LuyenViet />,
    'so-tu-vung': <SoTuVung />,
    flashcard: <Flashcard />,
    'ho-so': <HoSo />,
    'cai-dat': <CaiDat key={hash} />,
  };
  return (
    <div className="app-shell">
      <button className="skip-link" onClick={() => document.getElementById('noi-dung')?.focus()}>
        Bỏ qua menu
      </button>
      {menu && (
        <button className="menu-backdrop" aria-label="Đóng menu" onClick={() => setMenu(false)} />
      )}
      <aside id="menu-chinh" className={`sidebar ${menu ? 'open' : ''}`}>
        <a href="#tong-quan" className="brand" aria-label="EngMate AI — Tổng quan">
          <Logo />
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Đóng thanh menu"
          onClick={() => setMenu(false)}
        >
          <BieuTuong ten="close" />
        </button>
        <nav aria-label="Menu chính">
          {danhSachTrang.map((item, index) => (
            <div key={item.id}>
              {index === 0 || item.nhom !== danhSachTrang[index - 1].nhom ? (
                <p className="nav-group">{item.nhom}</p>
              ) : null}
              <a
                className={`nav-link ${trang === item.id ? 'active' : ''}`}
                href={`#${item.id}`}
                onClick={() => setMenu(false)}
                aria-current={trang === item.id ? 'page' : undefined}
              >
                <BieuTuong ten={item.icon} size={20} />
                <span>{item.ten}</span>
                {item.id === 'hoi-thoai-ai' && <span className="nav-badge">AI</span>}
              </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a className="sidebar-mate" href="#tong-quan" onClick={() => setMenu(false)}>
            <LinhThu size={60} />
            <strong>Học cùng Mate</strong>
            <BieuTuong ten="arrow" size={16} />
          </a>
        </div>
      </aside>
      <div className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              aria-label="Mở menu"
              aria-controls="menu-chinh"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <BieuTuong ten="menu" />
            </button>
            <a href="#tong-quan" className="mobile-brand" aria-label="EngMate AI — Tổng quan">
              <Logo compact />
            </a>
            <span>Không gian học tập</span>
          </div>
          <div className="topbar-right">
            <a className="goal-pill" href="#ho-so">
              <BieuTuong ten="clock" size={16} />
              {hoSo.phutMoiNgay} phút / ngày
            </a>
            <MenuNguoiDung key={hash} />
          </div>
        </header>
        <main id="noi-dung" className="main-content" tabIndex={-1}>
          {loiLuu && (
            <p role="alert" className="notice">
              {loiLuu}
            </p>
          )}
          <div key={hash} className="page-view" data-page={trang}>
            {pages[trang]}
          </div>
          <HoTroNhanh />
        </main>
        <footer className="site-footer">
          <span>© 2026 EngMate-AI</span>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <LuuTru>
      <KhungTrang />
    </LuuTru>
  );
}
