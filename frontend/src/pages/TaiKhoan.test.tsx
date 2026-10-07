import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { hoSoMau } from '../demo/duLieu';
import { luuPhienDemo } from '../../tests/demo';

function doiTrang(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
function dangNhap() {
  fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'abc' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } });
  fireEvent.submit(screen.getByLabelText('Tài khoản').closest('form')!);
}

beforeEach(() => {
  luuPhienDemo(false);
  window.history.replaceState(null, '', '#dang-nhap');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Trang đăng nhập độc lập', () => {
  it.each(['#dang-nhap', '#tai-khoan', '#cai-dat?muc=tai-khoan'])(
    'opens %s outside the learning shell, including old account links',
    (hash) => {
      window.history.replaceState(null, '', hash);
      render(<App />);
      expect(screen.getByRole('heading', { name: 'Đăng nhập', level: 1 })).toBeVisible();
      expect(document.title).toBe('Đăng nhập · EngMate-AI');
      expect(screen.getByLabelText('Tài khoản')).toBeVisible();
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Mở menu tài khoản' })).not.toBeInTheDocument();
      expect(document.querySelector('.topbar')).toBeNull();
      expect(document.querySelector('.sidebar')).toBeNull();
    },
  );

  it('requires demo login before accessing learning and settings', () => {
    window.history.replaceState(null, '', '#cai-dat');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Đăng nhập', level: 1 })).toBeVisible();
    expect(document.title).toBe('Đăng nhập · EngMate-AI');
    expect(screen.queryByLabelText('Chế độ giao diện')).not.toBeInTheDocument();
    dangNhap();
    expect(screen.getByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    expect(screen.getByLabelText('Chế độ giao diện')).toBeVisible();
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
    expect(document.title).toBe('Cài đặt · EngMate-AI');
  });

  it('logs in then enters learning with the saved profile and preferences', async () => {
    luuPhienDemo();
    window.history.replaceState(null, '', '#cai-dat');
    render(<App />);
    fireEvent.change(screen.getByLabelText('Chế độ giao diện'), { target: { value: 'toi' } });
    doiTrang('#dang-nhap');
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    dangNhap();
    expect(screen.getByRole('heading', { name: 'Chào mừng, Minh Anh!' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Vào không gian học tập/ }));
    expect(await screen.findByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.email).toBe(hoSoMau.email);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
  });

  it.each(['Google', 'Facebook', 'GitHub'])(
    'shows %s without creating a fake social session',
    (provider) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      render(<App />);
      const before = localStorage.getItem('engmate-demo-v1');
      fireEvent.click(screen.getByRole('button', { name: `Tiếp tục với ${provider}` }));
      expect(
        screen.getByText(
          `Đăng nhập bằng ${provider} hiện chưa khả dụng. Bạn có thể dùng tài khoản để đăng nhập.`,
        ),
      ).toHaveAttribute('role', 'status');
      expect(localStorage.getItem('engmate-demo-v1')).toBe(before);
      expect(fetch).not.toHaveBeenCalled();
      expect(window.location.hash).toBe('#dang-nhap');
      expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    },
  );

  it('switches both ways with shared account details, fresh passwords and one active form', () => {
    render(<App />);
    const tabs = screen.getByRole('group', { name: 'Chọn đăng nhập hoặc đăng ký' });
    const loginForm = screen.getByLabelText('Tài khoản').closest('form')!;
    const socialGroup = screen.getByRole('group', { name: 'Đăng nhập bằng tài khoản khác' });
    expect(
      loginForm.compareDocumentPosition(socialGroup) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'lananh' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'loginPassword' } });
    fireEvent.click(within(tabs).getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByRole('heading', { name: 'Tạo tài khoản' })).toBeVisible();
    expect(screen.getByLabelText('Tài khoản')).toHaveValue('lananh');
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('autocomplete', 'new-password');
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Lan Anh' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lan@example.com' } });
    fireEvent.click(within(tabs).getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.queryByLabelText('Họ và tên')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tài khoản')).toHaveValue('lananh');
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('autocomplete', 'current-password');
    expect(within(tabs).getByRole('button', { name: 'Đăng nhập' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(tabs).getByRole('button', { name: 'Đăng ký' }));
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Lan Anh');
    expect(screen.getByLabelText('Email')).toHaveValue('lan@example.com');
    expect(document.querySelectorAll('form')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'registerPassword' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'registerPassword' },
    });
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    expect(screen.getByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).daLamQuen).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: /Mình tự trò chuyện được về cuộc sống/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu học cùng Mate' }));
    doiTrang('#dang-nhap');
    expect(screen.getByRole('heading', { name: 'Chào mừng, Lan Anh!' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.taiKhoan).toBe('lananh');
    expect(
      screen.queryByRole('group', { name: 'Đăng nhập bằng tài khoản khác' }),
    ).not.toBeInTheDocument();
    expect(JSON.stringify(JSON.parse(localStorage.getItem('engmate-demo-v1')!))).not.toContain(
      'registerPassword',
    );
  });

  it('clears provider notices during recovery and returns to login', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lan@example.com' } });
    expect(screen.queryByText(/hiện chưa khả dụng/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Đăng nhập bằng tài khoản khác' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Yêu cầu đã được ghi nhận trên trình duyệt này.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại đăng nhập' }));
    expect(screen.getByLabelText('Tài khoản')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    expect(screen.getByLabelText('Email')).toHaveValue('lan@example.com');
  });

  it('rejects incorrect demo credentials and mismatched registration passwords', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByLabelText('Tài khoản').closest('form')!);
    expect(screen.getByRole('status')).toHaveTextContent('Tài khoản hoặc mật khẩu không đúng');
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).daDangNhap).toBe(false);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Chọn đăng nhập hoặc đăng ký' })).getByRole(
        'button',
        { name: 'Đăng ký' },
      ),
    );
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'different' },
    });
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    expect(screen.getByRole('status')).toHaveTextContent('Mật khẩu nhập lại không khớp.');
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).daDangNhap).toBe(false);
  });

  it('finishes the intro once per tab and skips it after remount', () => {
    sessionStorage.removeItem('engmate-auth-intro-done');
    vi.useFakeTimers();
    try {
      const view = render(<App />);
      expect(document.querySelector('.auth-page')).toHaveClass('auth-intro-jump');
      act(() => vi.advanceTimersByTime(4000));
      expect(document.querySelector('.auth-page')).toHaveClass('auth-intro-ready');
      expect(sessionStorage.getItem('engmate-auth-intro-done')).toBe('1');
      view.unmount();
      render(<App />);
      expect(document.querySelector('.auth-page')).toHaveClass('auth-intro-ready');
    } finally {
      vi.useRealTimers();
    }
  });
});
