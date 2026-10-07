import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { MenuNguoiDung } from './MenuNguoiDung';
import { LuuTru } from '../demo/LuuTru';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#tong-quan');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Menu avatar', () => {
  it('offers only login to guests and opens the separate login page', async () => {
    const view = render(
      <LuuTru>
        <MenuNguoiDung />
      </LuuTru>,
    );
    const avatar = screen.getByRole('button', { name: 'Mở menu tài khoản' });
    fireEvent.mouseEnter(avatar.closest('.user-menu')!);
    expect(avatar).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('group', { name: 'Tùy chọn tài khoản' });
    expect(within(menu).getAllByRole('link')).toHaveLength(1);
    expect(within(menu).queryByRole('button')).not.toBeInTheDocument();
    const login = within(menu).getByRole('link', { name: 'Đăng nhập' });
    expect(login).toHaveAttribute('href', '#dang-nhap');
    fireEvent.mouseLeave(avatar.closest('.user-menu')!);
    expect(screen.queryByRole('group', { name: 'Tùy chọn tài khoản' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(avatar.closest('.user-menu')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(avatar).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(avatar);
    fireEvent.click(screen.getByRole('link', { name: 'Đăng nhập' }));
    view.unmount();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Đăng nhập', level: 1 })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tài khoản')).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Tùy chọn tài khoản' })).not.toBeInTheDocument();
  });

  it('provides profile and logout after login and supports keyboard and outside dismissal', async () => {
    window.history.replaceState(null, '', '#dang-nhap');
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } });
    fireEvent.submit(screen.getByLabelText('Tài khoản').closest('form')!);
    fireEvent.click(screen.getByRole('link', { name: /Vào không gian học tập/ }));
    expect(await screen.findByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    let avatar = screen.getByRole('button', { name: 'Mở menu tài khoản' });
    fireEvent.mouseEnter(avatar.closest('.user-menu')!);
    let menu = screen.getByRole('group', { name: 'Tùy chọn tài khoản' });
    expect(within(menu).queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
    fireEvent.click(within(menu).getByRole('link', { name: 'Hồ sơ học tập' }));
    expect(await screen.findByRole('heading', { name: 'Hồ sơ học tập', level: 1 })).toBeVisible();
    avatar = screen.getByRole('button', { name: 'Mở menu tài khoản' });
    fireEvent.click(avatar);
    fireEvent.keyDown(avatar, { key: 'Escape' });
    expect(avatar).toHaveAttribute('aria-expanded', 'false');
    expect(avatar).toHaveFocus();
    fireEvent.click(avatar);
    fireEvent.pointerDown(screen.getByRole('main'));
    expect(avatar).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(avatar);
    menu = screen.getByRole('group', { name: 'Tùy chọn tài khoản' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Đăng xuất' }));
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).daDangNhap).toBe(false);
    expect(screen.getByLabelText('Tài khoản')).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
  });
});
