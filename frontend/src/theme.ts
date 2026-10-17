export type Theme = 'light' | 'dark';

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('engmate-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* Storage is optional, including private browsing. */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#111820' : '#f7f8fa');
}
