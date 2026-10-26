import * as Tooltip from '@radix-ui/react-tooltip';
import {
  AudioLines,
  Compass,
  Map,
  Mic2,
  ChartNoAxesCombined,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';

export type MatePage = 'home' | 'explore' | 'roadmap' | 'pronunciation' | 'progress' | 'settings';
const items: { id: MatePage; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Nói cùng Mate', short: 'Trò chuyện', icon: AudioLines },
  { id: 'explore', label: 'Khám phá', short: 'Khám phá', icon: Compass },
  { id: 'roadmap', label: 'Lộ trình', short: 'Lộ trình', icon: Map },
  { id: 'pronunciation', label: 'Phát âm', short: 'Phát âm', icon: Mic2 },
  { id: 'progress', label: 'Tiến độ', short: 'Tiến độ', icon: ChartNoAxesCombined },
  { id: 'settings', label: 'Cài đặt', short: 'Cài đặt', icon: Settings2 },
];

export function SidebarNav({
  page,
  onNavigate,
}: {
  page: MatePage;
  onNavigate: (page: MatePage) => void;
}) {
  return (
    <aside className="mate-sidebar">
      <a
        className="mate-brand-mark"
        href="#noi-cung-mate"
        aria-label="EngMate AI — Trang chính"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('home');
        }}
      >
        <AudioLines size={26} strokeWidth={2} />
      </a>
      <nav aria-label="Điều hướng chính" className="mate-sidebar-links">
        <Tooltip.Provider delayDuration={200}>
          {items.slice(0, 5).map(({ id, label, icon: Icon }) => (
            <Tooltip.Root key={id}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className={`mate-nav-item ${page === id ? 'is-selected' : ''}`}
                  onClick={() => onNavigate(id)}
                  aria-label={label}
                  aria-current={page === id ? 'page' : undefined}
                >
                  {page === id && (
                    <motion.span
                      className="mate-nav-indicator"
                      layoutId="mate-nav-selection"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={22} strokeWidth={1.75} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="mate-tooltip" side="right" sideOffset={14}>
                  {label}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ))}
        </Tooltip.Provider>
      </nav>
      <div className="mate-sidebar-footer">
        <button
          type="button"
          className={`mate-nav-item ${page === 'settings' ? 'is-selected' : ''}`}
          aria-label="Cài đặt"
          aria-current={page === 'settings' ? 'page' : undefined}
          onClick={() => onNavigate('settings')}
          title="Cài đặt"
        >
          <Settings2 size={21} strokeWidth={1.75} />
        </button>
        <span className="mate-user-avatar" aria-label="Tài khoản Minh">
          M<span />
        </span>
      </div>
    </aside>
  );
}

export function BottomTabBar({
  page,
  onNavigate,
}: {
  page: MatePage;
  onNavigate: (page: MatePage) => void;
}) {
  return (
    <nav className="mate-bottom-tabs" aria-label="Điều hướng di động">
      {items.slice(0, 5).map(({ id, label, short, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={page === id ? 'is-selected' : ''}
          onClick={() => onNavigate(id)}
          aria-label={label}
          aria-current={page === id ? 'page' : undefined}
        >
          <Icon size={21} strokeWidth={1.75} />
          <span>{short}</span>
        </button>
      ))}
    </nav>
  );
}
