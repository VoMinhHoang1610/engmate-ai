import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function doiTrang(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#tong-quan');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Giao diện tối giản', () => {
  it('keeps settings labels and working controls without explanatory captions', () => {
    window.history.replaceState(null, '', '#cai-dat');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeVisible();
    expect(
      screen.queryByText('Chọn giao diện phù hợp với ánh sáng quanh bạn.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Tắt hiệu ứng chuyển động và cuộn mượt.')).not.toBeInTheDocument();
    expect(screen.queryByText('Áp dụng khi nghe câu và từ vựng.')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Chế độ giao diện'), { target: { value: 'toi' } });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.click(screen.getByRole('switch', { name: 'Giảm chuyển động' }));
    expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'true');
    fireEvent.change(screen.getByLabelText('Tốc độ đọc tiếng Anh'), { target: { value: '1.25' } });
    expect(document.documentElement).toHaveAttribute('data-speech-rate', '1.25');
    expect(document.querySelector('.settings-row p')).toBeNull();
  });

  it('keeps page actions and learning content while removing page slogans and subtitles', () => {
    render(<App />);
    for (const route of [
      'hoi-thoai-ai',
      'luyen-noi',
      'luyen-nghe',
      'luyen-viet',
      'chu-de-nhap-vai',
      'so-tu-vung',
      'flashcard',
      'ho-so',
      'cai-dat',
    ]) {
      doiTrang(`#${route}`);
      expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
      expect(document.querySelector('.page-heading p')).toBeNull();
    }
    doiTrang('#hoi-thoai-ai');
    fireEvent.click(screen.getByRole('button', { name: /Giải thích tiếng Việt/ }));
    expect(screen.getByText(/là cách yêu cầu lịch sự hơn/)).toBeVisible();
    expect(screen.getByLabelText('Tin nhắn')).toBeVisible();
    doiTrang('#luyen-viet');
    expect(screen.getByLabelText('Bài viết tiếng Anh')).toBeVisible();
    expect(screen.getByText(/Giới thiệu bản thân, sở thích/)).toBeVisible();
  });

  it('offers concise practice links and an accessible daily goal', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Chào Anh' })).toBeVisible();
    expect(screen.queryByText('Cất lời, tự tin thể hiện')).not.toBeInTheDocument();
    expect(screen.queryByText('Mỗi ngày một tốt hơn')).not.toBeInTheDocument();
    const goal = screen.getByRole('progressbar', { name: 'Mục tiêu hôm nay' });
    expect(goal).toHaveAttribute('aria-valuenow', '0');
    expect(goal).toHaveAttribute('aria-valuemax', '100');
    fireEvent.click(screen.getByRole('button', { name: 'Luyện nghe' }));
    expect(await screen.findByRole('heading', { name: 'Luyện nghe', level: 1 })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Phát bài nghe' })).toBeVisible();
  });

  it('makes optional learning tips expandable while keeping flashcard controls usable', () => {
    render(<App />);
    doiTrang('#luyen-noi');
    const speakingHelp = screen.getByText('Gợi ý luyện nói').closest('details')!;
    expect(speakingHelp).not.toHaveAttribute('open');
    expect(within(speakingHelp).getByText('Nghe câu mẫu một lần trước khi nói.')).not.toBeVisible();
    fireEvent.click(within(speakingHelp).getByText('Gợi ý luyện nói'));
    expect(speakingHelp).toHaveAttribute('open');
    expect(within(speakingHelp).getByText('Nghe câu mẫu một lần trước khi nói.')).toBeVisible();
    doiTrang('#flashcard');
    expect(screen.getByText('Cách ôn tập').closest('details')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: /Tu confident/ }));
    expect(screen.getByRole('button', { name: /Good.*Sau 4 ngày/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Good.*Sau 4 ngày/ }));
    expect(screen.getByRole('progressbar', { name: 'Tiến độ ôn tập' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
  });
});
