import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NutDoc } from './NutDoc';
import { chuanBiAmThanh, docTiengAnh } from '../demo/amThanh';

vi.mock('../demo/amThanh', () => ({
  chuanBiAmThanh: vi.fn(),
  docTiengAnh: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(chuanBiAmThanh).mockReset().mockResolvedValue(new Blob());
  vi.mocked(docTiengAnh).mockReset().mockResolvedValue(undefined);
  delete document.documentElement.dataset.speechVoice;
  delete document.documentElement.dataset.speechRate;
});
afterEach(() => vi.useRealTimers());

it('prepares only the current primary clip without playing or disabling its button', async () => {
  render(
    <NutDoc text="Hello" preload onError={vi.fn()}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(chuanBiAmThanh).toHaveBeenCalledWith('Hello', 1, expect.any(AbortSignal));
  expect(docTiengAnh).not.toHaveBeenCalled();
  expect(screen.getByRole('button')).toBeEnabled();
  fireEvent.click(screen.getByRole('button'));
  await act(async () => undefined);
  expect(docTiengAnh).toHaveBeenCalledWith('Hello', 1, expect.any(AbortSignal));
});

it('prepares bulk-list buttons only on hover or keyboard focus and preserves handlers', async () => {
  const onPointerEnter = vi.fn();
  const onFocus = vi.fn();
  render(
    <NutDoc text="Word" onError={vi.fn()} onPointerEnter={onPointerEnter} onFocus={onFocus}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(chuanBiAmThanh).not.toHaveBeenCalled();
  fireEvent.pointerEnter(screen.getByRole('button'));
  await act(async () => undefined);
  expect(chuanBiAmThanh).toHaveBeenCalledOnce();
  fireEvent.focus(screen.getByRole('button'));
  await act(async () => undefined);
  expect(chuanBiAmThanh).toHaveBeenCalledTimes(2);
  expect(onPointerEnter).toHaveBeenCalledOnce();
  expect(onFocus).toHaveBeenCalledOnce();
});

it('cancels unused hover preparation on leaving the button', () => {
  vi.mocked(chuanBiAmThanh).mockReturnValue(new Promise(() => undefined));
  render(
    <NutDoc text="Word" onError={vi.fn()}>
      Listen
    </NutDoc>,
  );
  fireEvent.pointerEnter(screen.getByRole('button'));
  const signal = vi.mocked(chuanBiAmThanh).mock.calls[0][2]!;
  fireEvent.pointerLeave(screen.getByRole('button'));
  expect(signal.aborted).toBe(true);
});

it('prepares the current lesson on the next tick and cancels old preparation on unmount', async () => {
  const onError = vi.fn();
  const view = render(
    <NutDoc text="Old" preload onError={onError}>
      Listen
    </NutDoc>,
  );
  view.rerender(
    <NutDoc text="New" rate={0.85} preload onError={onError}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(chuanBiAmThanh).toHaveBeenCalledOnce();
  expect(chuanBiAmThanh).toHaveBeenCalledWith('New', 0.85, expect.any(AbortSignal));
  const signal = vi.mocked(chuanBiAmThanh).mock.calls[0][2]!;
  // A completed preparation no longer needs cancellation. Check an unfinished one too.
  vi.mocked(chuanBiAmThanh).mockReturnValue(new Promise(() => undefined));
  view.rerender(
    <NutDoc text="Next" preload onError={onError}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(250));
  view.unmount();
  expect(signal.aborted).toBe(false);
  expect(vi.mocked(chuanBiAmThanh).mock.calls[1][2]!.aborted).toBe(true);
});

it('keeps its icon and label while waiting and a single click starts playback', async () => {
  let finish!: () => void;
  vi.mocked(docTiengAnh).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(
    <NutDoc text="Hello" onError={vi.fn()}>
      <span>Listen</span>
    </NutDoc>,
  );
  const button = screen.getByRole('button', { name: 'Listen' });
  fireEvent.click(button);
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByText(/Đang tạo giọng nói/)).not.toBeInTheDocument();
  fireEvent.click(button);
  expect(docTiengAnh).toHaveBeenCalledOnce();
  await act(async () => finish());
  expect(button).toHaveAttribute('aria-busy', 'false');
});

it('disables the local fallback for a selected voice preview', async () => {
  render(
    <NutDoc text="Preview" exactVoice onError={vi.fn()}>
      Preview
    </NutDoc>,
  );
  fireEvent.click(screen.getByRole('button'));
  await act(async () => undefined);
  expect(docTiengAnh).toHaveBeenCalledWith('Preview', 1, expect.any(AbortSignal), false);
});

it('replaces preparation when the chosen voice or effective speed changes', async () => {
  vi.mocked(chuanBiAmThanh).mockReturnValue(new Promise(() => undefined));
  render(
    <NutDoc text="Hello" preload onError={vi.fn()}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(250));
  const old = vi.mocked(chuanBiAmThanh).mock.calls[0][2]!;
  await act(async () => {
    document.documentElement.dataset.speechVoice = 'UK-Nu-2-BL';
    document.documentElement.dataset.speechRate = '0.75';
  });
  expect(old.aborted).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(chuanBiAmThanh).toHaveBeenCalledTimes(2);
});

it('does not prepare disabled buttons and reports a failed click after a silent preload failure', async () => {
  const onError = vi.fn();
  const view = render(
    <NutDoc text="Hello" preload disabled onError={onError}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(500));
  fireEvent.pointerEnter(screen.getByRole('button'));
  expect(chuanBiAmThanh).not.toHaveBeenCalled();
  vi.mocked(chuanBiAmThanh).mockRejectedValue(new Error('Offline'));
  vi.mocked(docTiengAnh).mockRejectedValue(new Error('Offline'));
  view.rerender(
    <NutDoc text="Hello" preload onError={onError}>
      Listen
    </NutDoc>,
  );
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(onError).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button'));
  await act(async () => undefined);
  expect(onError).toHaveBeenCalledWith('Offline');
  expect(screen.getByRole('button')).toBeEnabled();
});
