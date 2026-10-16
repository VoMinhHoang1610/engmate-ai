import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MenuNguoiDung } from './MenuNguoiDung';

describe('Menu avatar gốc', () => {
  it('opens on hover and closes outside or on Escape while restoring keyboard focus', () => {
    render(
      <MenuNguoiDung
        account={{ username: 'learner', email: 'learner@example.test' }}
        busy={false}
        onLogout={vi.fn()}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Mở menu tài khoản' });
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(screen.getByRole('group', { name: 'Tùy chọn tài khoản' })).toBeInTheDocument();
    fireEvent.mouseLeave(trigger.parentElement!);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    fireEvent.pointerDown(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Đăng xuất' }), { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the menu while keyboard focus is inside and disables logout while busy', () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const props = {
      account: { username: 'learner', email: 'learner@example.test' },
      busy: true,
      onLogout: logout,
    };
    const { rerender } = render(<MenuNguoiDung {...props} />);
    const trigger = screen.getByRole('button', { name: 'Mở menu tài khoản' });
    fireEvent.click(trigger);
    trigger.focus();
    fireEvent.mouseLeave(trigger.parentElement!);
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeDisabled();
    fireEvent.blur(trigger, { relatedTarget: screen.getByRole('button', { name: 'Đăng xuất' }) });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    rerender(<MenuNguoiDung {...props} busy={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(logout).toHaveBeenCalledOnce();
    fireEvent.blur(trigger, { relatedTarget: document.body });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
