import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { docTiengAnh } from '../demo/amThanh';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#cai-dat');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Cài đặt', () => {
  it('applies and restores preferences without losing learner data', () => {
    const view = render(<App />);
    fireEvent.change(screen.getByLabelText('Chế độ giao diện'), { target: { value: 'toi' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Giảm chuyển động' }));
    fireEvent.change(screen.getByLabelText('Tốc độ đọc tiếng Anh'), { target: { value: '1.25' } });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'true');
    expect(document.documentElement).toHaveAttribute('data-speech-rate', '1.25');
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.ten).toBe('Minh Anh');
    view.unmount();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    render(<App />);
    expect(screen.getByLabelText('Chế độ giao diện')).toHaveValue('toi');
    expect(screen.getByRole('switch', { name: 'Giảm chuyển động' })).toBeChecked();
    expect(screen.getByLabelText('Tốc độ đọc tiếng Anh')).toHaveValue('1.25');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('defaults invalid or missing settings while preserving an existing profile', () => {
    const view = render(<App />);
    const data = JSON.parse(localStorage.getItem('engmate-demo-v1')!);
    view.unmount();
    data.hoSo.ten = 'Lan Anh';
    data.caiDat = { giaoDien: 'invalid', giamChuyenDong: 'yes', tocDoDoc: -20 };
    localStorage.setItem('engmate-demo-v1', JSON.stringify(data));
    const restored = render(<App />);
    expect(screen.getByLabelText('Chế độ giao diện')).toHaveValue('sang');
    expect(screen.getByRole('switch')).not.toBeChecked();
    expect(screen.getByLabelText('Tốc độ đọc tiếng Anh')).toHaveValue('1');
    expect(document.querySelector('.sidebar-profile')).toHaveTextContent('Lan Anh');
    restored.unmount();
    delete data.caiDat;
    localStorage.setItem('engmate-demo-v1', JSON.stringify(data));
    render(<App />);
    expect(screen.getByLabelText('Chế độ giao diện')).toHaveValue('sang');
    expect(document.querySelector('.sidebar-profile')).toHaveTextContent('Lan Anh');
  });

  it('follows system theme changes only when selected and removes the listener', () => {
    const media = new EventTarget();
    let dark = false;
    Object.defineProperty(media, 'matches', { get: () => dark });
    const remove = vi.spyOn(media, 'removeEventListener');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
    const view = render(<App />);
    fireEvent.change(screen.getByLabelText('Chế độ giao diện'), { target: { value: 'he-thong' } });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    act(() => {
      dark = true;
      media.dispatchEvent(new Event('change'));
    });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.change(screen.getByLabelText('Chế độ giao diện'), { target: { value: 'sang' } });
    act(() => media.dispatchEvent(new Event('change')));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    view.unmount();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('applies the selected speech speed to English playback', () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tốc độ đọc tiếng Anh'), { target: { value: '0.75' } });
    expect(docTiengAnh('Hello', 0.85)).toBe(true);
    expect(speak.mock.calls[0][0].rate).toBeCloseTo(0.6375);
    expect(speak.mock.calls[0][0].lang).toBe('en-US');
  });
});
