import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { hoSoMau, tuVungMau } from '../demo/duLieu';
import { cauTraLoiLamQuen } from '../demo/lamQuen';

function seed(daLamQuen?: boolean, daDangNhap = true) {
  localStorage.setItem(
    'engmate-demo-v1',
    JSON.stringify({
      hoSo: { ...hoSoMau, trinhDo: 'B2' },
      tuVung: tuVungMau,
      daDangNhap,
      ...(daLamQuen === undefined ? {} : { daLamQuen }),
      phutHoc: 25,
      luotOn: 4,
    }),
  );
}
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
  localStorage.clear();
  window.history.replaceState(null, '', '#dang-nhap');
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

describe('Mate làm quen sau lần đăng nhập đầu tiên', () => {
  it('asks immediately after login with friendly choices and no CEFR codes', () => {
    render(<App />);
    expect(
      screen.queryByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' }),
    ).not.toBeInTheDocument();
    dangNhap();
    const title = screen.getByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' });
    expect(title).toHaveFocus();
    expect(document.title).toBe('Làm quen cùng Mate · EngMate-AI');
    expect(document.querySelector('[data-mate-mood="welcome"]')).not.toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(screen.getByRole('main')).not.toHaveTextContent(
      /Pre-A1|\bA1\b|\bA2\b|\bB1\b|\bB2\b|\bC1\b|\bC2\b/,
    );
    expect(screen.getByRole('button', { name: /Bắt đầu học cùng Mate/ })).toBeDisabled();
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.email).toBe(hoSoMau.email);
  });

  it.each(cauTraLoiLamQuen)(
    'maps "$ten" to its learning content and saves completion',
    async (cau) => {
      seed(false);
      render(<App />);
      fireEvent.click(screen.getByRole('radio', { name: new RegExp(cau.ten) }));
      expect(screen.getByRole('status')).toHaveTextContent(cau.loiMate);
      // Previewing a choice does not overwrite the learner until they confirm.
      expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.trinhDo).toBe('B2');
      fireEvent.click(screen.getByRole('button', { name: /Bắt đầu học cùng Mate/ }));
      expect(await screen.findByRole('navigation', { name: 'Menu chính' })).toBeVisible();
      const saved = JSON.parse(localStorage.getItem('engmate-demo-v1')!);
      expect(saved.hoSo.trinhDo).toBe(cau.trinhDo);
      expect(saved.daLamQuen).toBe(true);
      expect(saved.phutHoc).toBe(25);
      expect(saved.tuVung).toHaveLength(tuVungMau.length);
      expect(saved.hoSo.ten).toBe(hoSoMau.ten);
      doiTrang('#luyen-noi');
      expect(screen.getByLabelText('Trình độ luyện tập')).toHaveValue(cau.trinhDo);
    },
  );

  it('does not ask again after reload or logging out and back in', async () => {
    seed(true);
    window.history.replaceState(null, '', '#tong-quan');
    const view = render(<App />);
    expect(screen.getByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    view.unmount();
    render(<App />);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    doiTrang('#dang-nhap');
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }));
    dangNhap();
    expect(screen.getByRole('heading', { name: `Chào mừng, ${hoSoMau.ten}!` })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Vào không gian học tập/ }));
    expect(await screen.findByRole('navigation', { name: 'Menu chính' })).toBeVisible();
  });

  it('migrates old profiles once and resumes unfinished onboarding after navigation or reload', () => {
    seed();
    window.history.replaceState(null, '', '#luyen-doc');
    const view = render(<App />);
    expect(screen.getByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.trinhDo).toBe('B2');
    doiTrang('#tong-quan');
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument();
    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: /Bắt đầu học cùng Mate/ })).toBeDisabled();
  });

  it('does not start onboarding for failed login or password recovery', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } });
    fireEvent.submit(screen.getByLabelText('Tài khoản').closest('form')!);
    expect(screen.getByRole('status')).toHaveTextContent('Tài khoản hoặc mật khẩu không đúng');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qa@example.com' } });
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).daDangNhap).toBe(false);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('asks for a newly registered profile even when another profile already completed onboarding', () => {
    seed(true, false);
    render(<App />);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Chọn đăng nhập hoặc đăng ký' })).getByRole(
        'button',
        {
          name: 'Đăng ký',
        },
      ),
    );
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Lan' } });
    fireEvent.change(screen.getByLabelText('Tài khoản'), { target: { value: 'lan' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lan@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'demo-password' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'demo-password' },
    });
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
    expect(screen.getByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' })).toBeVisible();
    expect(screen.getByText('Chào Lan! Mình là Mate.')).toBeVisible();
    expect(localStorage.getItem('engmate-demo-v1')).not.toContain('demo-password');
  });

  it('allows logging out before answering and keeps the welcome pending', async () => {
    seed(false);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(await screen.findByLabelText('Tài khoản')).toBeVisible();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).daLamQuen).toBe(false);
    dangNhap();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Tiếng Anh của bạn đang ở đâu?' })).toBeVisible(),
    );
  });
});
