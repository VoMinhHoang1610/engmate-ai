import { useEffect, useState } from 'react';
import { applyTheme, readTheme, type Theme } from '../theme';
import { BieuTuong } from './BieuTuong';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => applyTheme(theme), [theme]);
  const label = theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      aria-pressed={theme === 'dark'}
      onClick={() => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        try {
          localStorage.setItem('engmate-theme', next);
        } catch {
          /* Keep the toggle usable without storage. */
        }
      }}
    >
      <BieuTuong ten={theme === 'light' ? 'moon' : 'sun'} size={20} />
    </button>
  );
}
