import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layGiongDoc, type GiongDoc } from '../api/voices';
import { docVanBan, dungDoc } from '../speech/audio';
import {
  activateSpeechPreferences,
  getSpeechPreferences,
  setSpeechVoice,
} from '../speech/preferences';
import { VoiceSettings } from './VoiceSettings';

vi.mock('../api/voices', () => ({ layGiongDoc: vi.fn() }));
vi.mock('../speech/audio', () => ({ docVanBan: vi.fn(), dungDoc: vi.fn() }));

const voices: GiongDoc[] = [
  { id: 'UK-Nu-1-TM', name: 'Emma', language: 'en', gender: 'female' },
  { id: 'UK-Nam-1-DT', name: 'Oliver', language: 'en', gender: 'male' },
  { id: 'HN-Nam-1-BL', name: 'Minh', language: 'vi', gender: 'male' },
  { id: 'HN-Nu-2-BL', name: 'Mai', language: 'vi', gender: 'female' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function ready() {
  await waitFor(() => expect(screen.getByLabelText('Giọng tiếng Anh')).toBeEnabled());
  await waitFor(() => expect(screen.getByLabelText('Giọng tiếng Việt')).toBeEnabled());
}

beforeEach(() => {
  vi.clearAllMocks();
  activateSpeechPreferences(null);
  activateSpeechPreferences('learner');
  vi.mocked(layGiongDoc).mockImplementation(async (_signal, language = 'en') =>
    voices.filter((voice) => voice.language === language),
  );
  vi.mocked(docVanBan).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  activateSpeechPreferences(null);
});

describe('voice settings for learners', () => {
  it('loads both language catalogs and never generates audio while loading or selecting', async () => {
    const english = deferred<GiongDoc[]>();
    vi.mocked(layGiongDoc).mockImplementation((_signal, language = 'en') =>
      language === 'en'
        ? english.promise
        : Promise.resolve(voices.filter((voice) => voice.language === 'vi')),
    );
    render(<VoiceSettings />);
    expect(screen.getByText('Đang tải danh sách giọng tiếng Anh…')).toBeInTheDocument();
    expect(screen.getByLabelText('Giọng tiếng Anh')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' })).toBeDisabled();
    await act(async () => english.resolve(voices.filter((voice) => voice.language === 'en')));
    await ready();
    expect(screen.getByRole('option', { name: 'Emma · Nữ' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Oliver · Nam' })).toBeInTheDocument();
    expect(layGiongDoc).toHaveBeenCalledWith(expect.any(AbortSignal), 'en');
    expect(layGiongDoc).toHaveBeenCalledWith(expect.any(AbortSignal), 'vi');
    fireEvent.change(screen.getByLabelText('Giọng tiếng Anh'), {
      target: { value: 'UK-Nam-1-DT' },
    });
    fireEvent.mouseOver(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('persists language choices independently and updates the next dialogue voice', async () => {
    const { unmount } = render(<VoiceSettings />);
    await ready();
    fireEvent.change(screen.getByLabelText('Giọng tiếng Anh'), {
      target: { value: 'UK-Nam-1-DT' },
    });
    expect(getSpeechPreferences()).toMatchObject({
      voiceEn: 'UK-Nam-1-DT',
      voiceVi: 'HN-Nam-1-BL',
      dialogueVoice: 'UK-Nam-1-DT',
    });
    expect(screen.getByText('Đã lưu giọng tiếng Anh trên trình duyệt này.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Giọng tiếng Việt'), {
      target: { value: 'HN-Nu-2-BL' },
    });
    expect(JSON.parse(localStorage.getItem('engmate-speech:learner')!)).toMatchObject({
      voiceEn: 'UK-Nam-1-DT',
      voiceVi: 'HN-Nu-2-BL',
      dialogueVoice: 'HN-Nu-2-BL',
    });
    expect(document.documentElement.dataset.speechVoice).toBe('UK-Nam-1-DT');
    expect(document.documentElement.dataset.speechVoiceVi).toBe('HN-Nu-2-BL');
    unmount();
    activateSpeechPreferences(null);
    activateSpeechPreferences('learner');
    render(<VoiceSettings />);
    await ready();
    expect(screen.getByLabelText('Giọng tiếng Anh')).toHaveValue('UK-Nam-1-DT');
    expect(screen.getByLabelText('Giọng tiếng Việt')).toHaveValue('HN-Nu-2-BL');
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('previews only on a click and returns to ready when playback finishes', async () => {
    render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    expect(docVanBan).toHaveBeenCalledWith(
      expect.stringContaining("Hello! I'm Mate"),
      1,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    await screen.findByText('Đang phát câu nghe thử…');
    const finish = vi.mocked(docVanBan).mock.calls[0][3]!;
    act(() => finish());
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' })).toBeEnabled();
    expect(screen.queryByText('Đang phát câu nghe thử…')).not.toBeInTheDocument();
  });

  it('uses a Vietnamese sample and the selected language voice without altering English', async () => {
    render(<VoiceSettings />);
    await ready();
    fireEvent.change(screen.getByLabelText('Giọng tiếng Việt'), {
      target: { value: 'HN-Nu-2-BL' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Việt' }));
    expect(docVanBan).toHaveBeenCalledWith(
      expect.stringContaining('Xin chào! Mình là thầy Mate.'),
      1,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(document.documentElement.dataset.speechVoiceVi).toBe('HN-Nu-2-BL');
    expect(document.documentElement.dataset.speechVoice).toBe('UK-Nu-1-TM');
    await screen.findByText('Đang phát câu nghe thử…');
  });

  it('cancels pending audio on Stop and ignores a late result', async () => {
    const audio = deferred<void>();
    vi.mocked(docVanBan).mockReturnValue(audio.promise);
    render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    const signal = vi.mocked(docVanBan).mock.calls[0][2]!;
    expect(screen.getByText('Đang chuẩn bị âm thanh…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dừng nghe thử tiếng Anh' }));
    expect(signal.aborted).toBe(true);
    expect(dungDoc).toHaveBeenCalledOnce();
    await act(async () => audio.resolve());
    expect(screen.queryByText('Đang phát câu nghe thử…')).not.toBeInTheDocument();
  });

  it('cancels preview when selecting another voice', async () => {
    const audio = deferred<void>();
    vi.mocked(docVanBan).mockReturnValue(audio.promise);
    render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    const signal = vi.mocked(docVanBan).mock.calls[0][2]!;
    fireEvent.change(screen.getByLabelText('Giọng tiếng Anh'), {
      target: { value: 'UK-Nam-1-DT' },
    });
    expect(signal.aborted).toBe(true);
    await act(async () => audio.reject(new Error('Late provider detail')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Giọng tiếng Anh')).toHaveValue('UK-Nam-1-DT');
  });

  it('plays one preview at a time and ignores the cancelled preview completion', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.mocked(docVanBan).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    const firstSignal = vi.mocked(docVanBan).mock.calls[0][2]!;
    const firstFinish = vi.mocked(docVanBan).mock.calls[0][3]!;
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Việt' }));
    const secondSignal = vi.mocked(docVanBan).mock.calls[1][2]!;
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
    act(() => firstFinish(new Error('Late playback error')));
    await act(async () => first.reject(new Error('Late request error')));
    expect(screen.getByRole('button', { name: 'Dừng nghe thử tiếng Việt' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => second.resolve());
  });

  it('cancels catalogs and playback when leaving settings', async () => {
    const audio = deferred<void>();
    vi.mocked(docVanBan).mockReturnValue(audio.promise);
    const { unmount } = render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    const signal = vi.mocked(docVanBan).mock.calls[0][2]!;
    unmount();
    expect(signal.aborted).toBe(true);
    expect(layGiongDoc).toHaveBeenCalledTimes(2);
    expect(vi.mocked(layGiongDoc).mock.calls.every(([request]) => request.aborted)).toBe(true);
    expect(dungDoc).toHaveBeenCalledOnce();
    await act(async () => audio.resolve());
  });

  it('reports a preview request failure safely and supports retry', async () => {
    vi.mocked(docVanBan).mockRejectedValueOnce(new Error('Secret upstream trace'));
    render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa nghe thử được giọng này');
    expect(screen.queryByText('Secret upstream trace')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    await screen.findByText('Đang phát câu nghe thử…');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(docVanBan).toHaveBeenCalledTimes(2);
  });

  it('reports a playback failure after playback starts', async () => {
    render(<VoiceSettings />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' }));
    await screen.findByText('Đang phát câu nghe thử…');
    act(() => vi.mocked(docVanBan).mock.calls[0][3]!(new Error('Audio error')));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa nghe thử được giọng này');
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' })).toBeEnabled();
  });

  it('preserves a saved voice through catalog errors and retries only that language', async () => {
    setSpeechVoice('en', 'UK-Nam-1-DT');
    const stored = localStorage.getItem('engmate-speech:learner');
    vi.mocked(layGiongDoc).mockRejectedValueOnce(new Error('Network failure'));
    render(<VoiceSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chưa tải được danh sách giọng tiếng Anh',
    );
    expect(screen.getByLabelText('Giọng tiếng Anh')).toHaveValue('UK-Nam-1-DT');
    expect(localStorage.getItem('engmate-speech:learner')).toBe(stored);
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại giọng tiếng Anh' }));
    await ready();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Giọng tiếng Anh')).toHaveValue('UK-Nam-1-DT');
    expect(layGiongDoc).toHaveBeenCalledTimes(3);
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('handles an empty catalog without replacing the stored preference', async () => {
    vi.mocked(layGiongDoc).mockImplementation(async (_signal, language) =>
      language === 'en' ? [] : voices.filter((voice) => voice.language === 'vi'),
    );
    render(<VoiceSettings />);
    expect(await screen.findByText(/Chưa có giọng tiếng Anh để chọn/)).toBeInTheDocument();
    expect(screen.getByLabelText('Giọng tiếng Anh')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Việt' })).toBeEnabled();
    expect(getSpeechPreferences().voiceEn).toBe('UK-Nu-1-TM');
    expect(localStorage.getItem('engmate-speech:learner')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại giọng tiếng Anh' }));
    await waitFor(() => expect(layGiongDoc).toHaveBeenCalledTimes(3));
  });

  it('shows an unavailable saved voice until the learner explicitly selects an available one', async () => {
    setSpeechVoice('en', 'old-voice');
    render(<VoiceSettings />);
    await ready();
    expect(screen.getByLabelText('Giọng tiếng Anh')).toHaveValue('old-voice');
    expect(screen.getByRole('option', { name: 'Giọng đã lưu hiện không có sẵn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' })).toBeDisabled();
    expect(getSpeechPreferences().voiceEn).toBe('old-voice');
    fireEvent.change(screen.getByLabelText('Giọng tiếng Anh'), {
      target: { value: 'UK-Nam-1-DT' },
    });
    expect(screen.getByRole('button', { name: 'Nghe thử giọng tiếng Anh' })).toBeEnabled();
    expect(getSpeechPreferences().voiceEn).toBe('UK-Nam-1-DT');
  });

  it.each([
    [{ ...voices[0], id: '' }],
    [{ ...voices[0], id: '../bad' }],
    [{ ...voices[0], id: undefined }],
    [{ ...voices[0], name: ' ' }],
    [{ ...voices[0], language: 'vi' }],
    [{ ...voices[0], gender: 'other' }],
    [voices[0], voices[0]],
    null,
  ])('rejects invalid server catalog %j without changing preferences', async (invalid) => {
    vi.mocked(layGiongDoc).mockResolvedValueOnce(invalid as GiongDoc[]);
    render(<VoiceSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chưa tải được danh sách giọng tiếng Anh',
    );
    expect(screen.getByLabelText('Giọng tiếng Anh')).toBeDisabled();
    expect(getSpeechPreferences().voiceEn).toBe('UK-Nu-1-TM');
    expect(docVanBan).not.toHaveBeenCalled();
  });

  it('shows only server names when gender metadata is absent', async () => {
    vi.mocked(layGiongDoc).mockResolvedValueOnce([{ ...voices[0], gender: null }]);
    render(<VoiceSettings />);
    await ready();
    const english = screen.getByLabelText('Giọng tiếng Anh');
    expect(within(english).getByRole('option', { name: 'Emma' })).toBeInTheDocument();
    expect(within(english).queryByRole('option', { name: /Nam|Nữ/ })).not.toBeInTheDocument();
  });

  it('applies voice selection for this session when browser storage is blocked', async () => {
    render(<VoiceSettings />);
    await ready();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'QuotaExceededError');
    });
    fireEvent.change(screen.getByLabelText('Giọng tiếng Anh'), {
      target: { value: 'UK-Nam-1-DT' },
    });
    expect(screen.getByText(/Đã áp dụng cho phiên này/)).toBeInTheDocument();
    expect(screen.queryByText(/Đã lưu giọng tiếng Anh/)).not.toBeInTheDocument();
    expect(getSpeechPreferences().voiceEn).toBe('UK-Nam-1-DT');
    expect(document.documentElement.dataset.speechVoice).toBe('UK-Nam-1-DT');
    expect(localStorage.getItem('engmate-speech:learner')).toBeNull();
  });
});
