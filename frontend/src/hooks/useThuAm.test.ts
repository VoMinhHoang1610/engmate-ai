import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThuAm } from './useThuAm';

let recorders: RecorderMock[] = [];
class RecorderMock {
  state: RecordingState = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    recorders.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice']) } as BlobEvent);
    this.onstop?.();
  }
}
const stopTrack = vi.fn();
const getUserMedia = vi.fn();
beforeEach(() => {
  recorders = [];
  stopTrack.mockReset();
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('MediaRecorder', RecorderMock);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('microphone lifecycle', () => {
  it('reports unsupported browsers without starting a recording', async () => {
    vi.stubGlobal('navigator', {});
    const onError = vi.fn();
    const hook = renderHook(() => useThuAm(vi.fn(), onError));
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('chưa hỗ trợ'));
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(hook.result.current.active).toBe(false);
  });

  it('releases a microphone permission result arriving after page exit', async () => {
    let deliver!: (stream: { getTracks: () => { stop: () => void }[] }) => void;
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        }),
    );
    const hook = renderHook(() => useThuAm(vi.fn(), vi.fn()));
    let pending!: Promise<void>;
    act(() => {
      pending = hook.result.current.toggle();
    });
    expect(hook.result.current.processing).toBe(true);
    hook.unmount();
    await act(async () => {
      deliver({ getTracks: () => [{ stop: stopTrack }] });
      await pending;
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(recorders).toHaveLength(0);
  });

  it('stops a failed recorder and permits a fresh recording', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onError = vi.fn();
    const hook = renderHook(() => useThuAm(vi.fn(), onError));
    await act(async () => {
      await hook.result.current.toggle();
    });
    act(() => recorders[0].onerror?.());
    expect(recorders[0].state).toBe('inactive');
    expect(hook.result.current.active).toBe(false);
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('gián đoạn'));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(hook.result.current.recording).toBe(true);
    hook.unmount();
  });

  it('bounds a stalled transcription and returns control to the user', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_path: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = options.signal as AbortSignal;
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          }),
      ),
    );
    const onError = vi.fn();
    const hook = renderHook(() => useThuAm(vi.fn(), onError));
    await act(async () => {
      await hook.result.current.toggle();
    });
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(hook.result.current.processing).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40100);
    });
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('quá lâu'));
    expect(hook.result.current.active).toBe(false);
    expect(stopTrack).toHaveBeenCalled();
    hook.unmount();
  });

  it('fills a transcript and releases tracks before STT completes', async () => {
    const onText = vi.fn();
    const onError = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ text: 'Hello.' }) });
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useThuAm(onText, onError));
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(hook.result.current.recording).toBe(true);
    await act(async () => {
      await hook.result.current.toggle();
    });
    await waitFor(() => expect(onText).toHaveBeenCalledWith('Hello.'));
    expect(stopTrack).toHaveBeenCalled();
    expect(hook.result.current.active).toBe(false);
    hook.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recording');
  });
  it('stops the recorder on page exit without uploading', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useThuAm(vi.fn(), vi.fn()));
    await act(async () => {
      await hook.result.current.toggle();
    });
    hook.unmount();
    expect(recorders.at(-1)!.state).toBe('inactive');
    expect(stopTrack).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('shows permission errors while preserving typed input', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    const onText = vi.fn();
    const onError = vi.fn();
    const hook = renderHook(() => useThuAm(onText, onError));
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('micro'));
    expect(onText).not.toHaveBeenCalled();
    expect(hook.result.current.active).toBe(false);
  });
  it('aborts transcription on page exit and ignores late text', async () => {
    let resolve!: (value: object) => void;
    const onText = vi.fn();
    const fetchMock = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useThuAm(onText, vi.fn()));
    await act(async () => {
      await hook.result.current.toggle();
    });
    await act(async () => {
      await hook.result.current.toggle();
    });
    const signal = vi.mocked(fetch).mock.calls[0][1]!.signal as AbortSignal;
    hook.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolve({ ok: true, json: async () => ({ text: 'Late' }) });
    });
    expect(onText).not.toHaveBeenCalled();
  });
});
