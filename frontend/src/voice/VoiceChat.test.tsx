import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceChat } from './VoiceChat';
import { liveVoices } from './catalog';
import type { VoiceEvents } from './session';

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

beforeEach(() => {
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
