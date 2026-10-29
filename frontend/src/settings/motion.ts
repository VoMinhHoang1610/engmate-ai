/** Restore the user's animation preference independently of the settings page. */
export function readReducedMotion(): boolean {
  try {
    return localStorage.getItem('engmate-reduced-motion') === 'true';
  } catch {
    return false;
  }
}

export function applyReducedMotion(enabled: boolean): void {
  document.documentElement.dataset.reducedMotion = String(enabled);
}

export function saveReducedMotion(enabled: boolean): void {
  applyReducedMotion(enabled);
  try {
    localStorage.setItem('engmate-reduced-motion', String(enabled));
  } catch {
    // The current session can still honor the preference.
  }
}
