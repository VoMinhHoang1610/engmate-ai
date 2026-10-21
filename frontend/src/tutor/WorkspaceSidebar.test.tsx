import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { tutorTabs, type TutorView } from './curriculum';

let mobile = false;
let resize: (() => void) | undefined;

function open(overrides: Partial<Parameters<typeof WorkspaceSidebar>[0]> = {}) {
  const props = {
    account: { username: 'learner', email: 'learner@example.test' },
    displayName: 'Mai Nguyễn',
    view: 'mate' as TutorView,
    disabled: false,
    busy: false,
    onNavigate: vi.fn(),
    onNew: vi.fn(),
    onHistory: vi.fn(),
    onLogout: vi.fn().mockResolvedValue(undefined),
    onOpenLanding: vi.fn(),
    ...overrides,
  };
  const result = render(<WorkspaceSidebar {...props} />);
  const rail = result.container.querySelector('aside')!;
  return { ...result, props, rail };
}

beforeEach(() => {
  mobile = false;
  resize = undefined;
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return mobile;
    },
    addEventListener: (_event: string, listener: () => void) => (resize = listener),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  document.body.style.overflow = '';
  vi.unstubAllGlobals();
});

describe('workspace navigation', () => {
  it('starts as a rail, expands on hover, and keeps expansion while pinned', () => {
    const { rail } = open();
    expect(rail).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Mở menu điều hướng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đóng thanh bên' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(rail);
    expect(rail).toHaveAttribute('data-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Ghim thanh bên' }));
    fireEvent.mouseLeave(rail);
    expect(rail).toHaveAttribute('data-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ghim thanh bên' }));
    expect(rail).toHaveAttribute('data-expanded', 'false');
  });

  it('expands for keyboard focus and collapses when focus leaves the rail', () => {
    const { rail } = open();
    const outside = document.createElement('button');
    outside.textContent = 'Nội dung học';
    document.body.append(outside);
    act(() => screen.getByRole('button', { name: 'Lộ trình' }).focus());
    expect(rail).toHaveAttribute('data-expanded', 'true');
    act(() => outside.focus());
    expect(rail).toHaveAttribute('data-expanded', 'false');
    outside.remove();
  });

  it('keeps every learning destination once and marks the active course as Bài học', () => {
    const { props } = open({ view: 'course' });
    const nav = screen.getByRole('navigation', { name: 'Điều hướng học tập' });
    expect(within(nav).getAllByRole('button')).toHaveLength(tutorTabs.length);
    expect(within(nav).getByRole('button', { name: 'Bài học' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const tab of tutorTabs) {
      fireEvent.click(within(nav).getByRole('button', { name: tab.label }));
      expect(props.onNavigate).toHaveBeenLastCalledWith(tab.id);
    }
  });

  it('connects new chat, history, profile, settings, landing and logout to existing actions', () => {
    const { props } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Hội thoại mới' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hồ sơ học tập' }));
    expect(props.onNavigate).toHaveBeenLastCalledWith('profile');
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    expect(props.onNavigate).toHaveBeenLastCalledWith('settings');
    fireEvent.click(screen.getByRole('button', { name: 'EngMate AI · Trang giới thiệu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(props.onNew).toHaveBeenCalledOnce();
    expect(props.onHistory).toHaveBeenCalledOnce();
    expect(props.onOpenLanding).toHaveBeenCalledOnce();
    expect(props.onLogout).toHaveBeenCalledOnce();
  });

  it('protects navigation during recording and logout while busy', () => {
    const { props, rerender } = open({ disabled: true });
    for (const name of [
      'Hội thoại mới',
      'Lộ trình',
      'Mở lịch sử hội thoại',
      'Hồ sơ học tập',
      'Cài đặt',
      'Đăng xuất',
    ]) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(props.onNavigate).not.toHaveBeenCalled();
    expect(props.onLogout).not.toHaveBeenCalled();
    rerender(<WorkspaceSidebar {...props} disabled={false} busy />);
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lộ trình' })).toBeEnabled();
  });

  it('uses the existing theme toggle and falls back to the account name and home', () => {
    const { props } = open({ displayName: undefined, onOpenLanding: undefined });
    expect(screen.getByText('learner')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'EngMate AI · Trang giới thiệu' }));
    expect(props.onNavigate).toHaveBeenCalledWith('mate');
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('renders a saved avatar without duplicating the profile button name', () => {
    open({ avatar: '/api/account/avatar?v=2' });
    const profile = screen.getByRole('button', { name: 'Hồ sơ học tập' });
    expect(profile.querySelector('img')).toHaveAttribute('src', '/api/account/avatar?v=2');
  });
});

describe('mobile navigation drawer', () => {
  it('keeps the closed drawer inert, then traps focus and restores focus on Escape', () => {
    mobile = true;
    const { rail } = open();
    expect(rail).toHaveAttribute('inert');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Mở menu điều hướng' });
    fireEvent.click(trigger);
    const drawer = screen.getByRole('dialog', { name: 'Menu học tập' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(screen.queryByRole('button', { name: 'Ghim thanh bên' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    const first = within(drawer).getByRole('button', { name: 'EngMate AI · Trang giới thiệu' });
    const last = within(drawer).getByRole('button', { name: 'Đăng xuất' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the drawer on navigation and on its backdrop', () => {
    mobile = true;
    const { props, rail } = open();
    const trigger = screen.getByRole('button', { name: 'Mở menu điều hướng' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Lộ trình' }));
    expect(props.onNavigate).toHaveBeenCalledWith('roadmap');
    expect(rail).toHaveAttribute('data-mobile-open', 'false');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu điều hướng' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes before handing off to the history drawer and releases scroll on desktop resize', () => {
    mobile = true;
    const { props, rail } = open();
    const trigger = screen.getByRole('button', { name: 'Mở menu điều hướng' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử hội thoại' }));
    expect(props.onHistory).toHaveBeenCalledOnce();
    expect(rail).toHaveAttribute('data-mobile-open', 'false');
    fireEvent.click(trigger);
    mobile = false;
    act(() => resize?.());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(rail).not.toHaveAttribute('inert');
  });
});
