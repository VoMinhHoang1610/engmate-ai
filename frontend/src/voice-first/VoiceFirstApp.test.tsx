import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceFirstApp from './VoiceFirstApp';
import { useMockVoice } from './useMockVoice';

function renderApp() {
  const result = render(<VoiceFirstApp />);
  screen.getByRole('main').scrollTo = vi.fn();
  return result;
}

function navigate(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('button', {
      name,
    }),
  );
}

describe('voice-first preview', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    document.documentElement.dataset.theme = 'light';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the current lesson and previews locked lessons across all 100 nodes', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Học theo lộ trình' }));
    await screen.findByRole('heading', { name: 'Từng bước, mỗi ngày' });
    const level = screen.getByRole('combobox', { name: 'Chọn cấp độ' });
    let total = 0;
    for (let index = 0; index < 5; index++) {
      fireEvent.change(level, { target: { value: String(index) } });
      total += screen.getAllByRole('button', { name: /^Bài \d+:/ }).length;
    }
    expect(total).toBe(100);
    fireEvent.change(level, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Bài 7:.*Đang học/ }));
    const current = await screen.findByRole('dialog', { name: 'Gặp gỡ đồng nghiệp' });
    expect(within(current).getByRole('button', { name: 'Bắt đầu' })).toBeEnabled();
    fireEvent.click(within(current).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Bài 8:.*Chưa mở khóa/ }));
    const locked = await screen.findByRole('dialog', { name: 'Ở văn phòng' });
    expect(within(locked).getByText('Hoàn thành bài trước để mở khóa.')).toBeInTheDocument();
    expect(within(locked).queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument();
  });

  it('keeps voice controls local and returns focus after closing the session', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    renderApp();
    const mic = screen.getByRole('button', { name: 'Bắt đầu nói chuyện' });
    mic.focus();
    fireEvent.click(mic);
    const dialog = await screen.findByRole('dialog', { name: 'Nói cùng Mate' });
    expect(within(dialog).getAllByRole('button')).toHaveLength(3);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tắt micro mô phỏng' }));
    expect(within(dialog).getByText('Micro đang tắt', { exact: true })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Bật micro mô phỏng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bật micro mô phỏng' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạm dừng hội thoại' }));
    expect(within(dialog).getByText('Đã tạm dừng', { exact: true })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục hội thoại' }));
    expect(within(dialog).getByText('Mate ở đây', { exact: true })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(mic).toHaveFocus());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows sample pronunciation feedback and resets for the next sentence', async () => {
    renderApp();
    navigate('Phát âm');
    await screen.findByRole('heading', { name: 'Nói theo cách bạn' });
    fireEvent.click(screen.getByRole('button', { name: 'Thử ghi âm minh họa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc bản ghi minh họa' }));
    expect(screen.getByRole('img', { name: 'Điểm minh họa: 88%' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý phát âm: schedule?' }));
    expect(screen.getByText('Nhấn âm đầu: SCHED-ule.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));
    expect(screen.queryByRole('img', { name: /Điểm minh họa/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử ghi âm minh họa' })).toBeEnabled();
    expect(screen.getByLabelText('Câu 2 trên 3')).toBeInTheDocument();
  });

  it('saves the theme and replies to typed messages without a backend', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('engmate-theme')).toBe('dark');
    const textbox = screen.getByRole('textbox', { name: 'Nhắn cho Mate' });
    fireEvent.change(textbox, { target: { value: '  Hello Mate  ' } });
    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: false });
    expect(screen.getByRole('log', { name: 'Hội thoại mẫu' })).toHaveTextContent('Hello Mate');
    expect(textbox).toHaveValue('');
    await screen.findByText('Hi! Let’s start small. How was your day?', {}, { timeout: 2000 });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'A1 đến A2 — Xem tiến độ' }));
    await screen.findByRole('heading', { name: 'Đều đặn là đủ' });
    expect(screen.getByRole('img', { name: /Phút học trong 7 ngày/ })).toBeInTheDocument();
  });
});

describe('mock voice lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('cycles through four states and stops advancing while paused or muted', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useMockVoice());
    expect(result.current.state).toBe('idle');
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.state).toBe('speaking');
    act(() => vi.advanceTimersByTime(4400));
    expect(result.current.state).toBe('listening');
    act(() => result.current.togglePause());
    const pausedScene = result.current.sceneKey;
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.sceneKey).toBe(pausedScene);
    expect(result.current.state).toBe('idle');
    act(() => result.current.togglePause());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.state).toBe('thinking');
    act(() => result.current.toggleMute());
    const mutedScene = result.current.sceneKey;
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.sceneKey).toBe(mutedScene);
    act(() => result.current.toggleMute());
    act(() => vi.advanceTimersByTime(1800));
    expect(result.current.state).toBe('speaking');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
