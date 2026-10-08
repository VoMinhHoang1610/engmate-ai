import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type Topic } from '../api/database';
import { useDuLieu } from '../demo/LuuTru';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { NutDoc } from '../components/NutDoc';
import { useThuAm } from '../hooks/useThuAm';
import { danhSachTrinhDo, layTrinhDoHoc } from '../demo/trinhDo';

interface Conversation {
  conversation_id: number;
  title: string;
}
interface Message {
  message_id: number;
  role: string;
  content: string;
  status: string;
}
/** Durable private chat history; mock replies remain clearly labelled. */
export function HoiThoaiMySQL() {
  const { hoSo } = useDuLieu();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState(
    new URLSearchParams(window.location.hash.split('?')[1]).get('chu-de') ?? '',
  );
  const [level, setLevel] = useState(layTrinhDoHoc(hoSo.trinhDo));
  const [history, setHistory] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ client_request_id: string; message: string } | null>(null);
  const createId = useRef(crypto.randomUUID());
  const thuAm = useThuAm(setText, setError);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([api<Topic[]>('/topics'), api<Conversation[]>('/conversations?limit=100')])
      .then(([rows, conversations]) => {
        if (cancelled) return;
        setTopics(rows);
        setHistory(conversations);
        if (!rows.some((row) => row.code === topic)) setTopic('');
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chưa tải được hội thoại.');
      });
    return () => {
      cancelled = true;
    };
    // Topic is chosen from the route once; the selector handles later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function loadMessages(id: number) {
    const rows: Message[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await api<Message[]>(`/conversations/${id}/messages?limit=100&offset=${offset}`);
      rows.push(...page);
      if (page.length < 100) break;
    }
    setMessages(rows);
  }
  async function start() {
    setBusy(true);
    setError('');
    try {
      if (conversation && !viewOnly)
        await api(`/conversations/${conversation.conversation_id}/close`, 'POST');
      const row = await api<Conversation>('/conversations', 'POST', {
        client_request_id: createId.current,
        level,
        topic_code: topic || null,
        title: topics.find((row) => row.code === topic)?.name ?? 'Trò chuyện cùng Mate',
      });
      setConversation(row);
      setViewOnly(false);
      await loadMessages(row.conversation_id);
      setHistory(await api<Conversation[]>('/conversations?limit=100'));
      createId.current = crypto.randomUUID();
      retry.current = null;
      window.dispatchEvent(new Event('engmate-data'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa mở được hội thoại.');
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!conversation || !text.trim() || busy || thuAm.active || viewOnly) return;
    setBusy(true);
    setError('');
    const payload =
      retry.current?.message === text.trim()
        ? retry.current
        : { client_request_id: crypto.randomUUID(), message: text.trim() };
    retry.current = payload;
    try {
      await api(`/conversations/${conversation.conversation_id}/messages`, 'POST', payload);
      await loadMessages(conversation.conversation_id);
      setText('');
      retry.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa gửi được tin nhắn.');
      await loadMessages(conversation.conversation_id).catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <TieuDeTrang ten="Hội thoại AI">
        <span className="pill purple">AI · Phản hồi mẫu</span>
      </TieuDeTrang>
      <div className="chat-layout">
        <section className="panel chat-panel">
          <div className="chat-top">
            <label>
              Chủ đề
              <select
                aria-label="Chủ đề hội thoại"
                value={topic}
                disabled={busy}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">Trò chuyện tự do</option>
                {topics.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name} · {row.min_level}–{row.max_level}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Độ khó
              <select
                aria-label="Độ khó hội thoại"
                value={level}
                disabled={busy}
                onChange={(e) => setLevel(e.target.value as typeof level)}
              >
                {danhSachTrinhDo.map((row) => (
                  <option key={row.id}>{row.id}</option>
                ))}
              </select>
            </label>
            <button className="btn secondary" disabled={busy} onClick={() => void start()}>
              Hội thoại mới
            </button>
          </div>
          <div className="chat-messages">
            {!conversation && <p>Chọn chủ đề rồi mở hội thoại mới để bắt đầu.</p>}
            {messages.map((row) => (
              <div
                key={row.message_id}
                className={`message ${row.role === 'user' ? 'user-message' : 'ai-message'}`}
              >
                <p>
                  {row.content ||
                    (row.status === 'pending' ? 'Đang tạo câu trả lời…' : 'Chưa có câu trả lời.')}
                </p>
                {row.role === 'assistant' && row.content && (
                  <NutDoc
                    text={row.content}
                    onError={setError}
                    preload={row.message_id === messages.at(-1)?.message_id}
                  >
                    Nghe
                  </NutDoc>
                )}
              </div>
            ))}
          </div>
          <form className="chat-input" onSubmit={(event) => void send(event)}>
            <input
              aria-label="Tin nhắn tiếng Anh"
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              disabled={!conversation || viewOnly || busy}
            />
            <button
              type="button"
              disabled={!conversation || viewOnly || busy}
              onClick={() => void thuAm.toggle()}
            >
              {thuAm.recording ? 'Dừng ghi âm' : 'Ghi âm'}
            </button>
            <button
              className="btn primary"
              disabled={!conversation || viewOnly || busy || thuAm.active || !text.trim()}
            >
              Gửi tin nhắn
            </button>
          </form>
          {thuAm.active && <p role="status">{thuAm.status}</p>}
          {conversation && !viewOnly && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void api(`/conversations/${conversation.conversation_id}/close`, 'POST')
                  .then(() => {
                    setViewOnly(true);
                    window.dispatchEvent(new Event('engmate-data'));
                  })
                  .catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : 'Chưa kết thúc được hội thoại.'),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Kết thúc hội thoại
            </button>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </section>
        <aside className="panel">
          <h2>Lịch sử hội thoại</h2>
          {history
            .slice()
            .reverse()
            .map((row) => (
              <button
                className="text-button"
                key={row.conversation_id}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void (async () => {
                    if (conversation && !viewOnly)
                      await api(`/conversations/${conversation.conversation_id}/close`, 'POST');
                    await loadMessages(row.conversation_id);
                    setConversation(row);
                    setViewOnly(true);
                    window.dispatchEvent(new Event('engmate-data'));
                  })()
                    .catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : 'Chưa tải được lịch sử.'),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                {row.title}
              </button>
            ))}
        </aside>
      </div>
    </>
  );
}
