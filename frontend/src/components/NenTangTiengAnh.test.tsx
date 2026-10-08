import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NenTangTiengAnh } from './NenTangTiengAnh';
import { docTiengAnh } from '../demo/amThanh';

vi.mock('../demo/amThanh', () => ({
  docTiengAnh: vi.fn(),
  dungDoc: vi.fn(),
  chuanBiAmThanh: vi.fn().mockResolvedValue(new Blob()),
}));
beforeEach(() => {
  vi.mocked(docTiengAnh).mockReset().mockResolvedValue(undefined);
});

describe('Nhập môn từ số 0', () => {
  it('teaches 26 letters, numbers and translated greetings with slow audio', async () => {
    render(<NenTangTiengAnh />);
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button')).toHaveLength(26);
    fireEvent.click(screen.getByRole('button', { name: 'Nghe A' }));
    expect(docTiengAnh).toHaveBeenCalledWith('A', 0.7, expect.any(AbortSignal));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nghe A' })).toBeEnabled());
    fireEvent.click(screen.getByRole('tab', { name: 'Số đếm' }));
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Nghe ten' }));
    expect(docTiengAnh).toHaveBeenCalledWith('ten', 0.7, expect.any(AbortSignal));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nghe ten' })).toBeEnabled());
    fireEvent.click(screen.getByRole('tab', { name: 'Lời chào' }));
    expect(screen.getByText('Xin chào.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe Hello.' }));
    expect(docTiengAnh).toHaveBeenCalledWith('Hello.', 0.7, expect.any(AbortSignal));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nghe Hello.' })).toBeEnabled());
  });

  it('keeps text usable when speech fails and clears the error on changing lessons', async () => {
    vi.mocked(docTiengAnh).mockRejectedValue(new Error('Dịch vụ giọng nói chưa sẵn sàng.'));
    render(<NenTangTiengAnh />);
    fireEvent.click(screen.getByRole('button', { name: 'Nghe A' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ giọng nói chưa sẵn sàng');
    expect(screen.getByRole('button', { name: 'Nghe A' })).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Số đếm' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
