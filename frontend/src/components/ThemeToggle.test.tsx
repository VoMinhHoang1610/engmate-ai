import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { applyTheme, readTheme } from '../theme';
import { SettingsPage } from '../settings/SettingsPage';
import { initialLearning } from '../tutor/curriculum';

vi.mock('../settings/VoiceSettings', () => ({ VoiceSettings: () => null }));

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
  it('makes the entire navigation label part of the theme button', () => {
    render(<ThemeToggle navigation />);
    const button = screen.getByRole('button', { name: 'Chuyển sang giao diện tối' });
    expect(button).toHaveClass('workspace-nav-item');
    expect(button).toContainElement(screen.getByText('Giao diện'));
    fireEvent.click(screen.getByText('Giao diện'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
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
  it('restores a saved choice before using the default preference', () => {
    localStorage.setItem('engmate-theme', 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
  it('uses default light theme for an absent or invalid saved value', () => {
    localStorage.setItem('engmate-theme', 'unexpected');
    expect(readTheme()).toBe('light');
    localStorage.setItem('engmate-theme', 'dark');
    expect(readTheme()).toBe('dark');
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
    expect(meta.content).toBe('#000000');
    applyTheme('light');
    expect(meta.content).toBe('#ffffff');
    meta.remove();
  });
  it('tracks an external applied theme so the next click changes to the opposite theme', () => {
    render(<ThemeToggle />);
    act(() => applyTheme('dark'));
    const toggle = screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('engmate-theme')).toBe('light');
  });
  it('keeps the sidebar toggle and settings theme choices synchronized in both directions', () => {
    render(
      <>
        <ThemeToggle />
        <SettingsPage
          account={{ username: 'learner', email: 'learner@example.test' }}
          learning={initialLearning}
          onNavigateProfile={vi.fn()}
          onNavigateSetup={vi.fn()}
          onLogout={vi.fn().mockResolvedValue(undefined)}
        />
      </>,
    );
    const dark = screen.getByRole('button', { name: 'Nền Đen' });
    const light = screen.getByRole('button', { name: 'Nền Trắng' });
    const toggle = screen.getByRole('button', { name: 'Chuyển sang giao diện tối' });
    expect(light).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(dark);
    expect(toggle).toHaveAccessibleName('Chuyển sang giao diện sáng');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(dark).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAccessibleName('Chuyển sang giao diện tối');
    fireEvent.click(toggle);
    expect(dark).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(light);
    expect(toggle).toHaveAccessibleName('Chuyển sang giao diện tối');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});
