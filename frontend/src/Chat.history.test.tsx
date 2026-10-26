import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { api } from './api/database';
import { streamTurn } from './api/chatStream';
import type { Message } from './types';

vi.mock('./api/database', () => ({ api: vi.fn() }));
vi.mock('./api/chatStream', () => ({ streamTurn: vi.fn() }));
vi.mock('./voice/VoiceChat', () => ({ VoiceChat: () => null }));
vi.mock('./hooks/useThuAm', () => ({ useThuAm: () => ({ active: false }) }));
vi.mock('./components/LinhThu', () => ({ LinhThu: () => null }));
vi.mock('./speech/audio', () => ({ dungDoc: vi.fn(), docVanBan: vi.fn() }));
const rows: Message[] = Array.from({ length: 1000 }, (_, index) => ({
  message_id: index + 1,
  content: `old-${index + 1}`,
  role: index % 2 ? 'assistant' : 'user',
  status: 'completed',
}));
beforeEach(() => {
  vi.mocked(api)
    .mockReset()
    .mockImplementation(async (path) => {
      const query = new URL(path, 'http://test').searchParams;
      if (query.has('latest')) return rows.slice(-100);
      if (query.has('before_id'))
        return rows.filter((row) => row.message_id < Number(query.get('before_id'))).slice(-100);
      if (query.has('after_id'))
        return rows.filter((row) => row.message_id > Number(query.get('after_id'))).slice(0, 100);
      throw new Error('Unexpected API call');
    });
  vi.mocked(streamTurn)
    .mockReset()
    .mockResolvedValue({
      message: { message_id: 1001, content: 'new question', role: 'user', status: 'completed' },
      reply: { message_id: 1002, content: 'new answer', role: 'assistant', status: 'completed' },
    });
});
it('loads only the latest page, prepends older messages and merges done without reloading history', async () => {
  render(
    <Chat
      conversation={{ conversation_id: 1, title: 'History', created_at: '', status: 'in_progress' }}
      capabilities={{
        provider: 'gemini',
        chat: true,
        streaming: true,
        realtime: false,
        speech: false,
        is_mock: false,
        reason: null,
      }}
      onClose={vi.fn()}
      onCreated={vi.fn()}
    />,
  );
  await screen.findByText('old-1000');
  expect(api).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('old-1')).not.toBeInTheDocument();
  expect(document.querySelectorAll('.message-row')).toHaveLength(100);
  fireEvent.click(screen.getByRole('button', { name: 'Tải tin nhắn cũ' }));
  await screen.findByText('old-801');
  expect(document.querySelectorAll('.message-row')).toHaveLength(200);
  expect(vi.mocked(api).mock.calls[1][0]).toContain('before_id=901');
  fireEvent.change(screen.getByRole('textbox', { name: 'Tin nhắn' }), {
    target: { value: 'new question' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  await screen.findByText('new answer');
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tin nhắn' })).toHaveValue(''));
  expect(api).toHaveBeenCalledTimes(2);
  expect(document.querySelectorAll('.message-row')).toHaveLength(202);
});
