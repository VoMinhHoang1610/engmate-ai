import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';
import { authenticate } from './api/database';

vi.mock('./api/database', () => ({ authenticate: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(authenticate).mockClear();
});

describe('Trang tài khoản theo giao diện gốc', () => {
  it('keeps the sliding panels and validates confirmation before registering', async () => {
    const { container } = render(<AuthForm />);
    expect(container.querySelector('.auth-stage')).toBeInTheDocument();
    expect(container.querySelector('.auth-slide-wave')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(container.querySelector('.auth-stage')).toHaveClass('is-register');
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Người học' } });
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'learner' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.test' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password-for-test' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'different-password' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Tạo tài khoản' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu nhập lại không khớp.');
    expect(authenticate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), {
      target: { value: 'password-for-test' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Tạo tài khoản' }).closest('form')!);
    await waitFor(() =>
      expect(authenticate).toHaveBeenCalledWith(true, {
        username: 'learner',
        email: 'learner@example.test',
        display_name: 'Người học',
        password: 'password-for-test',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Chọn đăng nhập' }));
    expect(container.querySelector('.auth-stage')).not.toHaveClass('is-register');
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
  });

  it('prevents duplicate submits and changing modes while authentication is pending', async () => {
    let resolve!: () => void;
    vi.mocked(authenticate).mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(<AuthForm />);
    const form = screen.getByRole('button', { name: 'Đăng nhập' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeDisabled();
    await act(async () => resolve());
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });

  it('plays the original Mate intro once and reveals the login form', () => {
    vi.useFakeTimers();
    sessionStorage.removeItem('engmate-auth-intro-done');
    const { container, unmount } = render(<AuthForm />);
    expect(container.querySelector('.auth-page')).toHaveClass('auth-intro-jump');
    expect(screen.queryByRole('heading', { name: 'Đăng nhập' })).toBeNull();
    act(() => vi.advanceTimersByTime(780));
    expect(container.querySelector('.auth-page')).toHaveClass('auth-intro-greet');
    act(() => vi.advanceTimersByTime(1900));
    expect(container.querySelector('.auth-page')).toHaveClass('auth-intro-morph');
    act(() => vi.advanceTimersByTime(1320));
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(sessionStorage.getItem('engmate-auth-intro-done')).toBe('1');
    unmount();
    render(<AuthForm />);
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('reveals the form when reduced motion is enabled during the intro', () => {
    vi.useFakeTimers();
    sessionStorage.removeItem('engmate-auth-intro-done');
    const media = new EventTarget() as EventTarget & { matches: boolean };
    media.matches = false;
    vi.stubGlobal('matchMedia', () => media);
    render(<AuthForm />);
    act(() => {
      media.matches = true;
      media.dispatchEvent(new Event('change'));
    });
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('skips animation for reduced motion and works when session storage is blocked', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const view = render(<AuthForm />);
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    view.unmount();
    vi.stubGlobal('matchMedia', undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.useFakeTimers();
    render(<AuthForm />);
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chọn đăng ký' }));
    expect(screen.getByLabelText('Nhập lại mật khẩu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.queryByLabelText('Nhập lại mật khẩu')).toBeNull();
  });
});
