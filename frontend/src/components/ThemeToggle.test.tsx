import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { applyTheme, readTheme } from '../theme';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('color-scheme');
  vi.restoreAllMocks();
});
describe('theme preference', () => {
  it('toggles both directions, updates the root and persists the preference', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('engmate-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('engmate-theme')).toBe('light');
  });
  it('restores a saved choice before using the system preference', () => {
    localStorage.setItem('engmate-theme', 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
  it('uses the system theme for an absent or invalid saved value', () => {
    localStorage.setItem('engmate-theme', 'unexpected');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    expect(readTheme()).toBe('dark');
    localStorage.setItem('engmate-theme', 'light');
    expect(readTheme()).toBe('light');
  });
  it('continues working when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
  it('updates browser chrome metadata with the theme', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    applyTheme('dark');
    expect(meta.content).toBe('#111820');
    applyTheme('light');
    expect(meta.content).toBe('#f7f8fa');
    meta.remove();
  });
});
