import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { hoSoMau, tuVungMau } from './demo/duLieu';
import { luuPhienDemo } from '../tests/demo';

function doiTrang(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function luuTienDo(phutHomNay: number, ngayHoatDong: string) {
  localStorage.setItem(
    'engmate-demo-v1',
    JSON.stringify({
      hoSo: hoSoMau,
      tuVung: [tuVungMau[0]],
      daDangNhap: true,
      phutHoc: phutHomNay,
      luotOn: 0,
      phutHomNay,
      ngayHoatDong,
      luotOnHomNay: 0,
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  luuPhienDemo();
  window.history.replaceState(null, '', '#tong-quan');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Mate đồng hành cùng người học', () => {
  it('encourages a wrong answer, celebrates a correct answer and resets on retry', () => {
    window.history.replaceState(null, '', '#luyen-nghe');
    render(<App />);
    expect(document.querySelector('.listening-art [data-mate-mood="listening"]')).not.toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /A tea with lemon/ }));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Thử nghe lại');
    expect(
      screen.getByRole('status').querySelector('[data-mate-mood="encouraging"]'),
    ).not.toBeNull();
    expect(screen.getByRole('status').querySelector('[data-mate-mood="celebrating"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Làm lại bài tập' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /A small latte with oat milk/ }));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác!');
    expect(
      screen.getByRole('status').querySelector('[data-mate-mood="celebrating"]'),
    ).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Chọn bài nghe'), { target: { value: '1' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('also follows the evaluated dictation result', () => {
    window.history.replaceState(null, '', '#luyen-nghe');
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Chép chính tả' }));
    fireEvent.change(screen.getByLabelText('Câu chính tả'), {
      target: { value: "  I'D LIKE A TAKEAWAY COFFEE PLEASE! " },
    });
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác!');
    expect(
      screen.getByRole('status').querySelector('[data-mate-mood="celebrating"]'),
    ).not.toBeNull();
  });

  it('celebrates a finished review, while Again keeps the review active', () => {
    luuTienDo(0, '2000-01-01');
    window.history.replaceState(null, '', '#flashcard');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Tu confident/ }));
    fireEvent.click(screen.getByRole('button', { name: /Again.*Ôn lại trong phiên/ }));
    expect(document.querySelector('.flash-complete')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Tu confident/ }));
    fireEvent.click(screen.getByRole('button', { name: /Good.*Sau 4 ngày/ }));
    expect(screen.getByRole('heading', { name: 'Thêm một bước tiến thật đẹp!' })).toBeVisible();
    expect(document.querySelector('.flash-complete [data-mate-mood="celebrating"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ôn lại tất cả/ }));
    expect(document.querySelector('.flash-complete')).toBeNull();
  });

  it('does not celebrate a session with no due words', () => {
    luuTienDo(0, '2000-01-01');
    const data = JSON.parse(localStorage.getItem('engmate-demo-v1')!);
    data.tuVung[0].henOn = '2099-01-01T00:00:00.000Z';
    localStorage.setItem('engmate-demo-v1', JSON.stringify(data));
    window.history.replaceState(null, '', '#flashcard');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Bạn đã ôn hết các từ đến hạn.' })).toBeVisible();
    expect(document.querySelector('.flash-complete [data-mate-mood="celebrating"]')).toBeNull();
  });

  it('celebrates only the current daily goal and preserves progress across routes', () => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    luuTienDo(hoSoMau.phutMoiNgay - 3, day);
    render(<App />);
    expect(screen.getByText('Còn 3 phút nữa!')).toBeVisible();
    expect(document.querySelector('.daily-mate [data-mate-mood="celebrating"]')).toBeNull();
    doiTrang('#luyen-nghe');
    fireEvent.click(screen.getByRole('radio', { name: /A small latte with oat milk/ }));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    doiTrang('#tong-quan');
    expect(screen.getByText('Bạn làm được rồi!')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Mục tiêu hôm nay' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(document.querySelector('.daily-mate [data-mate-mood="celebrating"]')).not.toBeNull();
  });

  it('starts fresh when the stored daily goal belongs to an earlier day', () => {
    luuTienDo(hoSoMau.phutMoiNgay, '2000-01-01');
    render(<App />);
    expect(screen.getByText('Bắt đầu nhé!')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Mục tiêu hôm nay' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(document.querySelector('.daily-mate [data-mate-mood="celebrating"]')).toBeNull();
  });
});
