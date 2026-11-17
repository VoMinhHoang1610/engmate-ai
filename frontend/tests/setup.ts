import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { drainAsyncCleanup } from './asyncBoundary';

beforeEach(() => {
  // Use browser storage from jsdom, including when Node exposes its own Web Storage.
  // Vitest aliases `window` to globalThis, so get the original jsdom window.
  const browserWindow = (globalThis as typeof globalThis & { jsdom: { window: Window } }).jsdom
    .window;
  vi.stubGlobal('localStorage', browserWindow.localStorage);
  vi.stubGlobal('sessionStorage', browserWindow.sessionStorage);
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem('engmate-auth-intro-done', '1');
});

afterEach(async () => {
  try {
    cleanup();
    await drainAsyncCleanup();
  } finally {
    vi.unstubAllGlobals();
  }
});
