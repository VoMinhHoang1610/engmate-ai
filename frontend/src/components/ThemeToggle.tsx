import { useEffect, useSyncExternalStore } from 'react';
import { applyTheme, readAppliedTheme, subscribeTheme } from '../theme';
import { BieuTuong } from './BieuTuong';

export function ThemeToggle({ navigation = false }: { navigation?: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, readAppliedTheme);
  useEffect(() => applyTheme(readAppliedTheme()), []);
  const label = theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';
  return (
    <button
      type="button"
      className={navigation ? 'workspace-nav-item theme-toggle' : 'icon-button theme-toggle'}
      aria-label={label}
      title={label}
      aria-pressed={theme === 'dark'}
      onClick={() => {
        const next = theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        try {
          localStorage.setItem('engmate-theme', next);
        } catch {
          /* Keep the toggle usable without storage. */
        }
      }}
    >
      <BieuTuong ten={theme === 'light' ? 'moon' : 'sun'} size={20} />
      {navigation && <span className="workspace-nav-label">Giao diện</span>}
    </button>
  );
}
