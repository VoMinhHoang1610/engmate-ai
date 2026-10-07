import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NenTangTiengAnh } from './NenTangTiengAnh';
import { docTiengAnh } from '../demo/amThanh';

vi.mock('../demo/amThanh', () => ({ docTiengAnh: vi.fn() }));
beforeEach(() => {
  vi.mocked(docTiengAnh).mockReset().mockReturnValue(true);
});

describe('Nhập môn từ số 0', () => {
  it('teaches 26 letters, numbers and translated greetings with slow audio', () => {
    render(<NenTangTiengAnh />);
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button')).toHaveLength(26);
    fireEvent.click(screen.getByRole('button', { name: 'Nghe A' }));
    expect(docTiengAnh).toHaveBeenCalledWith('A', 0.7);
    fireEvent.click(screen.getByRole('tab', { name: 'Số đếm' }));
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Nghe ten' }));
    expect(docTiengAnh).toHaveBeenCalledWith('ten', 0.7);
    fireEvent.click(screen.getByRole('tab', { name: 'Lời chào' }));
    expect(screen.getByText('Xin chào.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe Hello.' }));
    expect(docTiengAnh).toHaveBeenCalledWith('Hello.', 0.7);
  });

  it('keeps text usable when audio is unsupported and clears the error on changing lessons', () => {
    vi.mocked(docTiengAnh).mockReturnValue(false);
    render(<NenTangTiengAnh />);
    fireEvent.click(screen.getByRole('button', { name: 'Nghe A' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Trình duyệt chưa hỗ trợ giọng đọc');
    expect(screen.getByRole('button', { name: 'Nghe A' })).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Số đếm' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
