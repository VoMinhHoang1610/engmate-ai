import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceChat } from './VoiceChat';
import { liveVoices } from './catalog';
import type { VoiceEvents } from './session';
import {
  activateSpeechPreferences,
  getSpeechPreferences,
  setSpeechRate,
  setSpeechVoice,
} from '../speech/preferences';

const transport = vi.hoisted(() => ({
  instances: [] as {
    identity: number;
    voiceId?: string;
    events: VoiceEvents;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    mute: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock('./catalog', () => ({ liveVoices: vi.fn() }));
vi.mock('./gemini', () => ({
  GeminiVoiceSession: class {
    start = vi.fn(async () => this.events.state('listening'));
    stop = vi.fn(async () => {
      this.events.state('idle');
      this.events.sync();
    });
    mute = vi.fn();
    constructor(
      readonly identity: number,
      readonly events: VoiceEvents,
      readonly voiceId?: string,
    ) {
      transport.instances.push(this);
    }
  },
}));

vi.mock('./blaze', () => ({
  BlazeVoiceSession: class {
    start = vi.fn(async () => this.events.state('listening'));
    stop = vi.fn(async () => {
      this.events.state('idle');
      this.events.sync();
    });
    mute = vi.fn();
    constructor(
      readonly identity: number,
      readonly events: VoiceEvents,
      readonly voiceId?: string,
      readonly options?: { language?: string; voiceEn?: string; voiceVi?: string },
    ) {
      transport.instances.push(this);
    }
  },
}));

beforeEach(() => {
  localStorage.clear();
  activateSpeechPreferences('voice-learner');
  transport.instances = [];
  vi.mocked(liveVoices)
    .mockReset()
    .mockResolvedValue({
      provider: 'gemini',
      default_voice: 'Kore',
      voices: [
        { id: 'Kore', name: 'Kore' },
        { id: 'Puck', name: 'Puck' },
        { id: 'Orus', name: 'Orus' },
      ],
    });
});
async function boot() {
  const onActive = vi.fn();
  const onSync = vi.fn();
  const view = render(
    <VoiceChat
      identity={7}
      disabled={false}
      ensureIdentity={vi.fn().mockResolvedValue(7)}
      provider="gemini"
      audioOptions={null}
      onActive={onActive}
      onSync={onSync}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
  const select = await screen.findByRole('combobox', { name: 'Giọng đối thoại' });
  await waitFor(() => expect(select).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
  await screen.findByText('Đang nghe');
  await waitFor(() => expect(select).toBeEnabled());
  return { ...view, select, onActive, onSync, first: transport.instances[0] };
}
function pendingStop(first: (typeof transport.instances)[number]) {
  let resolve!: () => void;
  first.stop.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  return () => act(async () => resolve());
}
describe('changing the live voice', () => {
  it('waits for old cleanup, keeps mute/history and ignores stale callbacks', async () => {
    const { select, first, onActive, onSync } = await boot();
    fireEvent.click(screen.getByRole('button', { name: 'Tắt microphone' }));
    const finish = pendingStop(first);
    fireEvent.change(select, { target: { value: 'Puck' } });
    expect(screen.getByText('Đang đổi giọng…')).toBeInTheDocument();
    expect(select).toBeDisabled();
    expect(transport.instances).toHaveLength(1);
    act(() => {
      first.events.state('idle');
      first.events.transcript('assistant', 'Late old audio');
      first.events.error('Late old error');
    });
    expect(onActive).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText(/Late old/)).not.toBeInTheDocument();
    await finish();
    await waitFor(() => expect(select).toBeEnabled());
    const next = transport.instances[1];
    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(next.identity).toBe(7);
    expect(next.voiceId).toBe('Puck');
    expect(next.mute).toHaveBeenCalledWith(true);
    expect(next.mute.mock.invocationCallOrder[0]).toBeLessThan(
      next.start.mock.invocationCallOrder[0],
    );
    expect(next.start).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Bật microphone' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(onActive).toHaveBeenLastCalledWith(true);
  });
  it('allows End Voice during a change without restarting afterwards', async () => {
    const { select, first, onActive } = await boot();
    const finish = pendingStop(first);
    fireEvent.change(select, { target: { value: 'Puck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await finish();
    await screen.findByRole('button', { name: 'Bắt đầu thoại trực tiếp' });
    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(transport.instances).toHaveLength(1);
    expect(onActive).toHaveBeenLastCalledWith(false);
  });
  it('does not restart after leaving the conversation during cleanup', async () => {
    const { select, first, unmount } = await boot();
    const finish = pendingStop(first);
    fireEvent.change(select, { target: { value: 'Puck' } });
    unmount();
    await finish();
    expect(transport.instances).toHaveLength(1);
    expect(first.stop).toHaveBeenCalledTimes(1);
  });
  it('does not open another call when cleanup fails and keeps the old selection', async () => {
    const { select, first, onActive } = await boot();
    first.stop.mockRejectedValueOnce(new Error('Server did not confirm closure'));
    fireEvent.change(select, { target: { value: 'Puck' } });
    await screen.findByText('Chưa đổi được giọng. Hãy thử bắt đầu thoại lại.');
    expect(select).toHaveValue('Kore');
    expect(select).toBeEnabled();
    expect(transport.instances).toHaveLength(1);
    expect(onActive).toHaveBeenLastCalledWith(false);
  });
  it('ignores duplicate selections and concurrent changes', async () => {
    const { select, first } = await boot();
    fireEvent.change(select, { target: { value: 'Kore' } });
    expect(first.stop).not.toHaveBeenCalled();
    const finish = pendingStop(first);
    fireEvent.change(select, { target: { value: 'Puck' } });
    fireEvent.change(select, { target: { value: 'Orus' } });
    await finish();
    await waitFor(() => expect(select).toBeEnabled());
    expect(transport.instances).toHaveLength(2);
    expect(transport.instances[1].voiceId).toBe('Puck');
  });
});

describe('Blaze voice with Gemini reasoning', () => {
  it('starts once when a learner explicitly enters a voice lesson after its catalog is ready', async () => {
    vi.mocked(liveVoices).mockResolvedValue({
      provider: 'blaze',
      default_voice: 'HN-Nam-1-BL',
      voices: [{ id: 'HN-Nam-1-BL', name: 'Mate', language: 'vi' }],
    });
    render(
      <VoiceChat
        identity={7}
        ensureIdentity={vi.fn()}
        disabled={false}
        provider="gemini"
        speechProvider="blaze"
        startRequest={1}
        opening="What is your name?"
        audioOptions={null}
        onActive={vi.fn()}
        onSync={vi.fn()}
      />,
    );
    await screen.findByText('Đang nghe');
    expect(transport.instances).toHaveLength(1);
    expect(transport.instances[0].start).toHaveBeenCalledOnce();
    expect(transport.instances[0]).toMatchObject({ options: { opening: 'What is your name?' } });
  });
  it('uses Blaze catalog and forwards separate voices and recognition language', async () => {
    vi.mocked(liveVoices).mockResolvedValue({
      provider: 'blaze',
      stt_mode: 'realtime',
      default_voice: 'HN-Nam-1-BL',
      voices: [
        { id: 'HN-Nam-1-BL', name: 'Mate Vietnamese', language: 'vi' },
        { id: 'UK-Nam-1-DT', name: 'Mate English', language: 'en' },
      ],
    });
    render(
      <VoiceChat
        identity={7}
        ensureIdentity={vi.fn()}
        disabled={false}
        provider="gemini"
        speechProvider="blaze"
        speechOptions={{ language: 'en', voiceEn: 'UK-Nu-1-TM', voiceVi: 'HN-Nam-1-BL' }}
        audioOptions={null}
        onActive={vi.fn()}
        onSync={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
    expect(screen.queryByRole('option', { name: 'Kore' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Giọng đối thoại' }), {
      target: { value: 'UK-Nam-1-DT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(transport.instances[0]).toMatchObject({
      identity: 7,
      voiceId: 'UK-Nam-1-DT',
      options: {
        language: 'en',
        voiceEn: 'UK-Nam-1-DT',
        voiceVi: 'HN-Nam-1-BL',
        sttMode: 'realtime',
      },
    });
  });
  it('refuses native voice metadata when Blaze is required', async () => {
    render(
      <VoiceChat
        identity={7}
        ensureIdentity={vi.fn()}
        disabled={false}
        provider="gemini"
        speechProvider="blaze"
        audioOptions={null}
        onActive={vi.fn()}
        onSync={vi.fn()}
      />,
    );
    await screen.findByText(/Chưa tải được giọng Blaze/);
    expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeDisabled();
    expect(transport.instances).toHaveLength(0);
  });
});

const blazeCatalog = {
  provider: 'blaze',
  default_voice: 'HN-Nam-1-BL',
  voices: [
    {
      id: 'HN-Nam-1-BL',
      name: 'Vietnamese default',
      language: 'vi' as const,
      gender: 'male' as const,
    },
    {
      id: 'HN-Nu-2-BL',
      name: 'Vietnamese chosen',
      language: 'vi' as const,
      gender: 'female' as const,
    },
    { id: 'UK-Nu-1-TM', name: 'English default', language: 'en' as const },
    { id: 'UK-Nam-1-DT', name: 'English chosen', language: 'en' as const },
  ],
};

async function preferredBlaze(startRequest = 0) {
  vi.mocked(liveVoices).mockResolvedValue(blazeCatalog);
  const view = render(
    <VoiceChat
      identity={7}
      ensureIdentity={vi.fn()}
      disabled={false}
      provider="gemini"
      speechProvider="blaze"
      speechOptions={{ language: 'en', voiceEn: 'UK-Nu-1-TM', voiceVi: 'HN-Nam-1-BL' }}
      startRequest={startRequest}
      audioOptions={null}
      onActive={vi.fn()}
      onSync={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn âm thanh' }));
  const select = screen.getByRole('combobox', { name: 'Giọng đối thoại' });
  await waitFor(() => expect(select).toBeEnabled());
  return { ...view, select };
}

describe('shared voice preferences in live dialogue', () => {
  it('replaces the voice identity together with the speaker when switching male to female', async () => {
    const { select } = await preferredBlaze();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(transport.instances[0]).toMatchObject({
      options: { voiceGender: 'male', voiceLanguage: 'vi' },
    });
    fireEvent.change(select, { target: { value: 'HN-Nu-2-BL' } });
    await waitFor(() => expect(transport.instances).toHaveLength(2));
    expect(transport.instances[0].stop).toHaveBeenCalledOnce();
    expect(transport.instances[1]).toMatchObject({
      voiceId: 'HN-Nu-2-BL',
      options: { voiceGender: 'female', voiceLanguage: 'vi' },
    });
  });

  it('starts with Settings voices for both languages and the saved rate', async () => {
    setSpeechVoice('en', 'UK-Nam-1-DT');
    setSpeechVoice('vi', 'HN-Nu-2-BL');
    setSpeechRate(0.75);
    const { select } = await preferredBlaze();
    expect(select).toHaveValue('HN-Nu-2-BL');
    expect(transport.instances).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(transport.instances[0]).toMatchObject({
      voiceId: 'HN-Nu-2-BL',
      options: {
        language: 'en',
        voiceEn: 'UK-Nam-1-DT',
        voiceVi: 'HN-Nu-2-BL',
        speed: 0.75,
      },
    });
  });

  it('syncs Settings changes while idle but keeps an active call until it ends', async () => {
    const { select } = await preferredBlaze();
    act(() => setSpeechVoice('vi', 'HN-Nu-2-BL'));
    expect(select).toHaveValue('HN-Nu-2-BL');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    act(() => setSpeechVoice('en', 'UK-Nam-1-DT'));
    expect(select).toHaveValue('HN-Nu-2-BL');
    expect(transport.instances).toHaveLength(1);
    expect(transport.instances[0].stop).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await waitFor(() => expect(select).toHaveValue('UK-Nam-1-DT'));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    expect(transport.instances[1]).toMatchObject({ voiceId: 'UK-Nam-1-DT' });
  });

  it('preserves missing saved voices and blocks autostart until the learner chooses another', async () => {
    setSpeechVoice('en', 'US-Removed-Voice');
    const { select } = await preferredBlaze(1);
    expect(select).toHaveValue('US-Removed-Voice');
    expect(screen.getByRole('alert')).toHaveTextContent(/Giọng bạn đã chọn chưa khả dụng/);
    expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeDisabled();
    expect(transport.instances).toHaveLength(0);
    expect(getSpeechPreferences().dialogueVoice).toBe('US-Removed-Voice');
    fireEvent.change(select, { target: { value: 'UK-Nam-1-DT' } });
    await screen.findByText('Đang nghe');
    expect(transport.instances).toHaveLength(1);
    expect(transport.instances[0].voiceId).toBe('UK-Nam-1-DT');
    expect(getSpeechPreferences().voiceEn).toBe('UK-Nam-1-DT');
  });

  it('requires a saved voice to match its catalog language and corresponding preference', async () => {
    setSpeechVoice('en', 'HN-Nu-2-BL');
    const { select } = await preferredBlaze();
    expect(select).toHaveValue('HN-Nu-2-BL');
    expect(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' })).toBeDisabled();
    expect(transport.instances).toHaveLength(0);
    expect(getSpeechPreferences().voiceEn).toBe('HN-Nu-2-BL');
  });

  it('saves a live selection only after old cleanup has completed', async () => {
    const { select } = await preferredBlaze();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    const finish = pendingStop(transport.instances[0]);
    fireEvent.change(select, { target: { value: 'UK-Nam-1-DT' } });
    expect(getSpeechPreferences().dialogueVoice).toBeNull();
    await finish();
    await waitFor(() => expect(select).toBeEnabled());
    expect(getSpeechPreferences()).toMatchObject({
      dialogueVoice: 'UK-Nam-1-DT',
      voiceEn: 'UK-Nam-1-DT',
      voiceVi: 'HN-Nam-1-BL',
    });
    expect(transport.instances[1]).toMatchObject({
      voiceId: 'UK-Nam-1-DT',
      options: { voiceEn: 'UK-Nam-1-DT', voiceVi: 'HN-Nam-1-BL' },
    });
  });

  it('does not save a pending live change after the learner ends the call', async () => {
    const { select } = await preferredBlaze();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thoại trực tiếp' }));
    await screen.findByText('Đang nghe');
    const finish = pendingStop(transport.instances[0]);
    fireEvent.change(select, { target: { value: 'UK-Nam-1-DT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc thoại' }));
    await finish();
    await waitFor(() => expect(select).toBeEnabled());
    expect(transport.instances).toHaveLength(1);
    expect(getSpeechPreferences().dialogueVoice).toBeNull();
    expect(select).toHaveValue('HN-Nam-1-BL');
  });

  it('ignores Blaze preferences for native voice and keeps native changes session-local', async () => {
    setSpeechVoice('en', 'UK-Nam-1-DT');
    setSpeechVoice('vi', 'HN-Nu-2-BL');
    setSpeechRate(1.25);
    const saved = getSpeechPreferences();
    const { select } = await boot();
    expect(select).toHaveValue('Kore');
    fireEvent.change(select, { target: { value: 'Puck' } });
    await waitFor(() => expect(select).toHaveValue('Puck'));
    expect(transport.instances[1].voiceId).toBe('Puck');
    expect(getSpeechPreferences()).toEqual(saved);
  });
});
