export type Theme = 'light' | 'dark';
const themeListeners = new Set<() => void>();

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('engmate-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* Storage is optional, including private browsing. */
  }
  return 'light';
}

export function readAppliedTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  return applied === 'light' || applied === 'dark' ? applied : readTheme();
}

/** Keep every visible theme control in sync with the applied preference. */
export function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
  themeListeners.forEach((listener) => listener());
}
