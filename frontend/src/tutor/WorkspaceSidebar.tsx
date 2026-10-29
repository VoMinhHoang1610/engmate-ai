import { useEffect, useId, useRef, useState } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import type { Account } from '../types';
import { tutorTabs, type TutorView } from './curriculum';

interface Props {
  account: Account;
  displayName?: string;
  avatar?: string;
  view: TutorView;
  disabled: boolean;
  busy: boolean;
  onNavigate: (view: TutorView) => void;
  onNew: () => void;
  onHistory: () => void;
  onLogout: () => Promise<void>;
  onOpenLanding?: () => void;
}

const icons: Partial<Record<TutorView, string>> = {
  mate: 'chat',
  roadmap: 'compass',
  lesson: 'book',
  pronunciation: 'mic',
  vocabulary: 'layers',
  progress: 'grid',
};
const mobileQuery = '(max-width: 767px)';
const tones: Partial<Record<TutorView, string>> = {
  mate: 'blue',
  roadmap: 'violet',
  lesson: 'blue',
  pronunciation: 'teal',
  vocabulary: 'amber',
  progress: 'teal',
};

/** Desktop width changes only through the menu button; mobile uses a modal drawer. */
export function WorkspaceSidebar(props: Props) {
  const { account, displayName, avatar, view, disabled, busy } = props;
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.(mobileQuery).matches ?? window.innerWidth <= 767,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(true);
  const sidebar = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const identity = useId();
  const expanded = mobile ? mobileOpen : pinned;
  const name = displayName || account.username;
  const active = view === 'course' ? 'lesson' : view === 'setup' ? 'roadmap' : view;

  useEffect(() => {
    const media = window.matchMedia?.(mobileQuery);
    if (!media) return;
    const resize = () => {
      setMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    media.addEventListener?.('change', resize);
    return () => media.removeEventListener?.('change', resize);
  }, []);

  useEffect(() => {
    if (!mobile || !mobileOpen) return;
    const restore = menuTrigger.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      );
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (!sidebar.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      restore?.focus();
    };
  }, [mobile, mobileOpen]);

  function run(action: () => void) {
    setMobileOpen(false);
    action();
  }

  return (
    <>
      {mobile && (
        <div className="workspace-mobile-bar">
          <Logo />
          <button
            ref={menuTrigger}
            type="button"
            className="workspace-mobile-toggle"
            aria-label="Mở menu điều hướng"
            aria-controls={identity}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((old) => !old)}
          >
            <BieuTuong ten="menu" />
          </button>
        </div>
      )}
      {mobile && mobileOpen && (
        <button
          className="workspace-sidebar-scrim"
          type="button"
          aria-label="Đóng menu điều hướng"
          tabIndex={-1}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id={identity}
        ref={sidebar}
        className="workspace-sidebar"
        data-expanded={expanded}
        data-pinned={pinned}
        data-mobile-open={mobileOpen}
        role={mobile && mobileOpen ? 'dialog' : undefined}
        aria-modal={mobile && mobileOpen ? true : undefined}
        aria-label={mobile && mobileOpen ? 'Menu học tập' : 'Thanh bên học tập'}
        aria-hidden={mobile && !mobileOpen ? true : undefined}
        inert={mobile && !mobileOpen}
      >
        <div className="workspace-sidebar-inner">
          <div className="workspace-sidebar-top">
            <button
              className="workspace-sidebar-brand"
              type="button"
              aria-label={
                !mobile && !pinned ? 'Mở rộng thanh bên' : 'EngMate AI · Trang giới thiệu'
              }
              aria-expanded={!mobile && !pinned ? false : undefined}
              title={!mobile && !pinned ? 'Mở rộng thanh bên' : 'EngMate AI'}
              disabled={disabled}
              onClick={() => {
                if (!mobile && !pinned) setPinned(true);
                else
                  run(() =>
                    props.onOpenLanding ? props.onOpenLanding() : props.onNavigate('mate'),
                  );
              }}
            >
              <Logo compact />
              <span className="workspace-nav-label">EngMate AI</span>
            </button>
            {mobile ? (
              <button
                type="button"
                className="workspace-sidebar-close"
                aria-label="Đóng thanh bên"
                onClick={() => setMobileOpen(false)}
              >
                <BieuTuong ten="close" />
              </button>
            ) : pinned ? (
              <button
                type="button"
                className="workspace-sidebar-toggle"
                aria-label={pinned ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
                aria-expanded={pinned}
                onClick={() => setPinned((old) => !old)}
              >
                <BieuTuong ten="menu" size={17} />
              </button>
            ) : null}
          </div>
          <button
            className="workspace-nav-item workspace-sidebar-new"
            type="button"
            disabled={disabled}
            aria-label="Hội thoại mới"
            title="Hội thoại mới"
            onClick={() => run(props.onNew)}
          >
            <BieuTuong ten="plus" />
            <span className="workspace-nav-label">Hội thoại mới</span>
          </button>
          <nav aria-label="Điều hướng học tập">
            {tutorTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="workspace-nav-item"
                data-tone={tones[tab.id]}
                aria-label={tab.label}
                title={tab.label}
                aria-current={active === tab.id ? 'page' : undefined}
                disabled={disabled}
                onClick={() => run(() => props.onNavigate(tab.id))}
              >
                <BieuTuong ten={icons[tab.id] ?? 'book'} />
                <span className="workspace-nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>
          <button
            className="workspace-nav-item workspace-sidebar-history"
            type="button"
            disabled={disabled}
            data-workspace-history
            aria-label="Mở lịch sử hội thoại"
            title="Lịch sử hội thoại"
            onClick={() => run(props.onHistory)}
          >
            <BieuTuong ten="clock" />
            <span className="workspace-nav-label">Lịch sử hội thoại</span>
          </button>
          <div className="workspace-sidebar-footer">
            <button
              className="workspace-nav-item workspace-sidebar-profile"
              type="button"
              aria-label="Hồ sơ học tập"
              title={`Hồ sơ học tập · ${name}`}
              aria-current={view === 'profile' ? 'page' : undefined}
              disabled={disabled}
              onClick={() => run(() => props.onNavigate('profile'))}
            >
              <span className="workspace-sidebar-avatar" aria-hidden="true">
                {avatar ? <img src={avatar} alt="" /> : name.slice(0, 1).toUpperCase()}
              </span>
              <span className="workspace-nav-label">
                <strong>{name}</strong>
                <small>Hồ sơ học tập</small>
              </span>
            </button>
            <button
              className="workspace-nav-item"
              type="button"
              aria-label="Cài đặt"
              title="Cài đặt"
              aria-current={view === 'settings' ? 'page' : undefined}
              disabled={disabled}
              onClick={() => run(() => props.onNavigate('settings'))}
            >
              <BieuTuong ten="settings" />
              <span className="workspace-nav-label">Cài đặt</span>
            </button>
            <ThemeToggle navigation />
            <button
              className="workspace-nav-item workspace-sidebar-logout"
              type="button"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              disabled={disabled || busy}
              onClick={() => run(() => void props.onLogout())}
            >
              <BieuTuong ten="logout" />
              <span className="workspace-nav-label">Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
