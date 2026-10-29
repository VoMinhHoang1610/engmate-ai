import { afterEach, expect, it, vi } from 'vitest';
import { applyReducedMotion, readReducedMotion, saveReducedMotion } from './motion';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem('engmate-reduced-motion');
  delete document.documentElement.dataset.reducedMotion;
});

it('restores and applies a saved reduced-motion preference before settings opens', () => {
  saveReducedMotion(true);
  expect(localStorage.getItem('engmate-reduced-motion')).toBe('true');
  delete document.documentElement.dataset.reducedMotion;
  applyReducedMotion(readReducedMotion());
  expect(document.documentElement.dataset.reducedMotion).toBe('true');
  saveReducedMotion(false);
  expect(readReducedMotion()).toBe(false);
  expect(document.documentElement.dataset.reducedMotion).toBe('false');
});

it('honors the current session when storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(readReducedMotion()).toBe(false);
  saveReducedMotion(true);
  expect(document.documentElement.dataset.reducedMotion).toBe('true');
});
