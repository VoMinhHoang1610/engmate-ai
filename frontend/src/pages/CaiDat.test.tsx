import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { docTiengAnh, xoaBoNhoAmThanh } from '../demo/amThanh';
import { luuPhienDemo } from '../../tests/demo';

const voices = [
  { id: 'UK-Nu-1-TM', name: 'Helen', language: 'en', gender: 'female' },
  { id: 'UK-Nu-2-BL', name: 'Alice', language: 'en', gender: 'female' },
  { id: 'UK-Nam-1-DT', name: 'Brian', language: 'en', gender: 'male' },
];

beforeEach(() => {
  xoaBoNhoAmThanh();
  localStorage.clear();
  luuPhienDemo();
  window.history.replaceState(null, '', '#cai-dat');
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => voices }));
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
    expect(screen.getByLabelText('Giọng đọc tiếng Anh')).toHaveValue('UK-Nu-1-TM');
    expect(screen.getByRole('button', { name: 'Mở menu tài khoản' })).toHaveTextContent('L');
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.ten).toBe('Lan Anh');
    restored.unmount();
    delete data.caiDat;
    localStorage.setItem('engmate-demo-v1', JSON.stringify(data));
    render(<App />);
    expect(screen.getByLabelText('Chế độ giao diện')).toHaveValue('sang');
    expect(screen.getByRole('button', { name: 'Mở menu tài khoản' })).toHaveTextContent('L');
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.ten).toBe('Lan Anh');
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

  it('applies the selected speech speed to Blaze playback', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'Audio',
      class {
        load = vi.fn();
        play = play;
        pause = vi.fn();
        removeAttribute = vi.fn();
      },
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => voices,
      blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:speech');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const view = render(<App />);
    fireEvent.change(screen.getByLabelText('Tốc độ đọc tiếng Anh'), { target: { value: '0.75' } });
    await docTiengAnh('Hello', 0.85);
    const body = JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
    expect(body.speed).toBeCloseTo(0.6375);
    expect(body.language).toBe('en');
    expect(play).toHaveBeenCalledOnce();
    view.unmount();
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });
  it('loads voices, saves the selected voice and previews it after reload', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'Audio',
      class {
        load = vi.fn();
        play = play;
        pause = vi.fn();
        removeAttribute = vi.fn();
      },
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => voices,
      blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:speech');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const view = render(<App />);
    await waitFor(() => expect(screen.getByLabelText('Giọng đọc tiếng Anh')).toBeEnabled());
    expect(screen.getByRole('option', { name: 'Brian' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Giọng đọc tiếng Anh'), {
      target: { value: 'UK-Nu-2-BL' },
    });
    expect(document.documentElement).toHaveAttribute('data-speech-voice', 'UK-Nu-2-BL');
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).caiDat.giongDoc).toBe(
        'UK-Nu-2-BL',
      ),
    );
    view.unmount();
    expect(document.documentElement).not.toHaveAttribute('data-speech-voice');
    const restored = render(<App />);
    await waitFor(() => expect(screen.getByLabelText('Giọng đọc tiếng Anh')).toBeEnabled());
    expect(screen.getByLabelText('Giọng đọc tiếng Anh')).toHaveValue('UK-Nu-2-BL');
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử' }));
    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    const tts = fetchMock.mock.calls.find(([url]) => url === '/api/speech/tts')!;
    expect(JSON.parse(tts[1].body).speaker_id).toBe('UK-Nu-2-BL');
    restored.unmount();
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });
  it('lets the user retry a failed catalog request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Offline'))
        .mockResolvedValue({ ok: true, json: async () => voices }),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByLabelText('Giọng đọc tiếng Anh')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại danh sách' }));
    await waitFor(() => expect(screen.getByLabelText('Giọng đọc tiếng Anh')).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
