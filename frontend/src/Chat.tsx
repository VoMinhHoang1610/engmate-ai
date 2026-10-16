import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from './api/database';
import { layGiongDoc, type GiongDoc } from './api/voices';
import { useThuAm } from './hooks/useThuAm';
import { docTiengAnh, dungDoc } from './speech/audio';
import { LinhThu } from './components/LinhThu';
import { BieuTuong } from './components/BieuTuong';
import type { Capabilities, Conversation, Message, Turn } from './types';
import { streamTurn, type ChatEvent } from './api/chatStream';
import { VoiceChat } from './voice/VoiceChat';

export function Chat({
  conversation,
  capabilities,
  onClose,
}: {
  conversation: Conversation | null;
  capabilities: Capabilities | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(conversation));
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [voices, setVoices] = useState<GiongDoc[]>([]);
  const [voiceError, setVoiceError] = useState('');
  const [voice, setVoice] = useState('UK-Nu-1-TM');
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const activeResponse = useRef<number | null>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const request = useRef<{ client_request_id: string; message: string } | null>(null);
  const sending = useRef(false);
  const generation = useRef(0);
  const controller = useRef(new AbortController());
  const messagePane = useRef<HTMLDivElement>(null);
  const recording = useThuAm(setText, setError);
  const identity = conversation?.conversation_id;
  const pending = messages.some((message) => message.status === 'pending');
  const open = conversation?.status === 'in_progress';

  async function load(id: number, signal: AbortSignal) {
    const rows: Message[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await api<Message[]>(
        `/conversations/${id}/messages?limit=100&offset=${offset}`,
        'GET',
        undefined,
        signal,
      );
      rows.push(...page);
      if (page.length < 100) return rows;
    }
  }
  useEffect(() => {
    const current = ++generation.current;
    const abort = controller.current.signal.aborted ? new AbortController() : controller.current;
    controller.current = abort;
    if (identity) {
      void load(identity, abort.signal)
        .then((rows) => {
          if (current === generation.current) setMessages(rows);
        })
        .catch((e: unknown) => {
          if (!abort.signal.aborted)
            setError(e instanceof Error ? e.message : 'Chưa tải được tin nhắn.');
        })
        .finally(() => {
          if (current === generation.current) setLoading(false);
        });
    }
    return () => {
      generation.current = current + 1;
      abort.abort();
      dungDoc();
    };
  }, [identity, reload]);

  useEffect(() => {
    const pane = messagePane.current;
    pane?.scrollTo?.({ top: pane.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);
  useEffect(() => {
    document.documentElement.dataset.speechVoice = voice;
  }, [voice]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (
      !identity ||
      !open ||
      !text.trim() ||
      sending.current ||
      pending ||
      voiceActive ||
      recording.active ||
      !capabilities?.chat
    )
      return;
    const current = generation.current;
    const payload =
      request.current?.message === text.trim()
        ? request.current
        : { client_request_id: crypto.randomUUID(), message: text.trim() };
    request.current = payload;
    sending.current = true;
    setBusy(true);
    setError('');
    setFailed(false);
    const abort = new AbortController();
    streamAbort.current = abort;
    const parent = controller.current!;
    const stop = () => abort.abort();
    parent.signal.addEventListener('abort', stop, { once: true });
    const signal = abort.signal;
    const update = (event: ChatEvent) => {
      if (current !== generation.current || signal.aborted) return;
      if (event.type === 'start') {
        activeResponse.current = event.response_id;
        setMessages((old) => [
          ...old.filter(
            (m) =>
              m.message_id !== event.message.message_id && m.message_id !== event.reply.message_id,
          ),
          event.message,
          event.reply,
        ]);
        setStreaming(true);
      } else if (event.type === 'delta' && event.response_id === activeResponse.current) {
        setMessages((old) =>
          old.map((m) =>
            m.message_id === event.response_id ? { ...m, content: m.content + event.delta } : m,
          ),
        );
      }
    };
    try {
      const result = capabilities.streaming
        ? await streamTurn(identity, payload, signal, update)
        : await api<Turn>(`/conversations/${identity}/messages`, 'POST', payload, signal);
      const rows = await load(identity, signal!);
      if (current !== generation.current) return;
      setMessages(rows);
      if (result.reply.status !== 'completed') {
        setFailed(result.reply.status !== 'pending');
        setError(
          result.reply.status === 'pending'
            ? 'Câu trả lời đang được xử lý. Hãy tải lại tin nhắn hoặc hủy phản hồi.'
            : 'Lượt trả lời chưa thành công. Bạn có thể gửi thành lượt mới.',
        );
        return;
      }
      setText('');
      request.current = null;
    } catch (e) {
      if (current !== generation.current || signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Chưa gửi được tin nhắn.');
      try {
        const rows = await load(identity, signal!);
        if (current === generation.current) {
          setMessages(rows);
          setFailed(rows.at(-1)?.status === 'failed' || rows.at(-1)?.status === 'cancelled');
        }
      } catch {
        /* Keep the draft and its request ID for a safe network retry. */
      }
    } finally {
      parent.signal.removeEventListener('abort', stop);
      if (current === generation.current) {
        activeResponse.current = null;
        setStreaming(false);
        sending.current = false;
        setBusy(false);
      }
    }
  }

  async function stopReply() {
    if (!identity) return;
    activeResponse.current = null;
    streamAbort.current?.abort();
    try {
      await api(`/conversations/${identity}/cancel`, 'POST');
      setMessages(await load(identity, controller.current!.signal));
      setFailed(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chưa hủy được phản hồi.');
    }
  }

  function syncVoice() {
    if (!identity || !controller.current) return;
    const current = generation.current;
    void load(identity, controller.current.signal)
      .then((rows) => {
        if (current === generation.current) setMessages(rows);
      })
      .catch(() => {
        if (current === generation.current)
          setError('Chưa đồng bộ được lịch sử thoại. Hãy tải lại tin nhắn.');
      });
  }

  async function action(kind: 'cancel' | 'close') {
    if (!identity || sending.current) return;
    const current = generation.current;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await api(
        `/conversations/${identity}/${kind}`,
        'POST',
        undefined,
        controller.current?.signal,
      );
      if (current !== generation.current) return;
      if (kind === 'close') onClose();
      else setMessages(await load(identity, controller.current!.signal));
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Không thực hiện được.');
    } finally {
      if (current === generation.current) {
        sending.current = false;
        setBusy(false);
      }
    }
  }

  async function speak(message: Message) {
    setError('');
    setSpeaking(message.message_id);
    try {
      await docTiengAnh(message.content, 1, controller.current?.signal, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa phát được âm thanh.');
      setSpeaking(null);
    }
  }
  async function getVoices() {
    setVoiceError('');
    try {
      setVoices(await layGiongDoc(controller.current!.signal));
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Chưa tải được giọng.');
    }
  }

  return (
    <section className="panel chat-panel" aria-label="Hội thoại">
      <header className="chat-top">
        <span className="icon-tile">
          <BieuTuong ten="chat" />
        </span>
        <div>
          <h2>{conversation?.title ?? 'Trò chuyện cùng Mate'}</h2>
          <span>Luyện hội thoại tiếng Anh cùng người bạn AI</span>
        </div>
        {identity && open && (
          <button
            className="btn secondary"
            disabled={busy || pending || recording.active || voiceActive}
            onClick={() => void action('close')}
          >
            Kết thúc hội thoại
          </button>
        )}
      </header>
      <div
        className="chat-messages"
        ref={messagePane}
        aria-busy={loading}
        tabIndex={0}
        aria-label="Tin nhắn hội thoại"
      >
        {!identity && (
          <div className="conversation-empty">
            <LinhThu size={120} />
            <h2>Bắt đầu từ một lời chào.</h2>
            <p>Tạo hội thoại mới, rồi kể cho Mate nghe điều bạn muốn chia sẻ.</p>
          </div>
        )}
        {loading && <p role="status">Đang tải tin nhắn…</p>}
        {identity && !loading && !messages.length && (
          <p className="conversation-intro">Bạn có thể bắt đầu bằng “Hello, how are you?”</p>
        )}
        {messages.map((message) => (
          <article
            key={message.message_id}
            className={`message-row ${message.role === 'user' ? 'ban' : 'mate-message'}`}
          >
            <span className={`avatar ${message.role === 'assistant' ? 'bot-avatar' : ''}`}>
              <BieuTuong ten={message.role === 'user' ? 'user' : 'sparkles'} size={18} />
            </span>
            <div>
              <span className="message-author">{message.role === 'user' ? 'Bạn' : 'Mate'}</span>
              <p className="message-bubble">
                {message.content ||
                  (message.status === 'pending'
                    ? 'Đang tạo câu trả lời…'
                    : message.status === 'cancelled'
                      ? 'Đã hủy phản hồi.'
                      : 'Chưa tạo được câu trả lời.')}
              </p>
              {message.role === 'assistant' && message.content && capabilities?.speech && (
                <button className="text-button message-audio" onClick={() => void speak(message)}>
                  <BieuTuong ten="volume" size={15} />
                  Nghe câu trả lời
                </button>
              )}
            </div>
          </article>
        ))}
        {busy && (
          <p className="typing-indicator" role="status">
            {streaming ? 'AI đang trả lời…' : 'Mate đang xử lý…'}
          </p>
        )}
      </div>
      <div className="chat-bottom">
        <div className="chat-tools">
          {error && (
            <div className="error-text" role="alert">
              {error}
            </div>
          )}
          {identity && (
            <div className="chat-actions">
              {busy && capabilities?.streaming && (
                <button className="text-button" onClick={() => void stopReply()}>
                  Dừng phản hồi
                </button>
              )}
              <button
                className="text-button"
                disabled={busy || recording.active || voiceActive}
                onClick={() => {
                  setLoading(true);
                  setError('');
                  setReload((n) => n + 1);
                }}
              >
                Tải lại tin nhắn
              </button>
              {pending && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void action('cancel')}
                >
                  Hủy phản hồi đang chờ
                </button>
              )}
              {failed && (
                <button
                  className="text-button"
                  onClick={() => {
                    request.current = null;
                    setFailed(false);
                    setError('');
                  }}
                >
                  Gửi thành lượt mới
                </button>
              )}
              {speaking !== null && (
                <button
                  className="text-button"
                  onClick={() => {
                    dungDoc();
                    setSpeaking(null);
                  }}
                >
                  Dừng giọng đọc
                </button>
              )}
            </div>
          )}
          {identity && (
            <div className="voice-controls">
              <button
                className="text-button"
                disabled={!capabilities?.speech || busy || recording.active || voiceActive}
                onClick={() => void getVoices()}
              >
                Chọn giọng đọc
              </button>
              {voices.length > 0 && (
                <select
                  aria-label="Giọng đọc tiếng Anh"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  <option value="UK-Nu-1-TM">Giọng mặc định</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
              {!capabilities?.realtime && (
                <button
                  className="btn secondary"
                  disabled
                  title="Cần cấu hình OpenAI và quyền truy cập model Realtime."
                >
                  ◉ Cuộc gọi trực tiếp · Chưa sẵn sàng
                </button>
              )}
            </div>
          )}
          {identity && capabilities?.realtime && (
            <VoiceChat
              provider={capabilities.provider}
              identity={identity}
              disabled={busy || pending || recording.active || !open}
              onActive={(active) => {
                setVoiceActive(active);
                if (active) {
                  dungDoc();
                  setSpeaking(null);
                }
              }}
              onSync={syncVoice}
            />
          )}
          {voiceError && (
            <p className="error-text" role="alert">
              {voiceError}
            </p>
          )}
          {recording.active && <p role="status">{recording.status}</p>}
        </div>
        <form className="chat-input conversation-composer" onSubmit={(e) => void send(e)}>
          <textarea
            aria-label="Tin nhắn tiếng Anh"
            placeholder={identity ? 'Viết tin nhắn cho Mate…' : 'Tạo hội thoại mới để bắt đầu…'}
            maxLength={2000}
            value={text}
            disabled={
              !identity || !open || busy || recording.active || voiceActive || !capabilities?.chat
            }
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            className="btn secondary"
            type="button"
            aria-label={recording.recording ? 'Dừng ghi âm' : 'Ghi âm'}
            disabled={
              !identity ||
              !open ||
              busy ||
              recording.processing ||
              voiceActive ||
              !capabilities?.speech
            }
            onClick={() => void recording.toggle()}
          >
            <BieuTuong ten={recording.recording ? 'pause' : 'mic'} size={18} />
            {recording.recording ? 'Dừng ghi âm' : 'Micro'}
          </button>
          <button
            className="btn primary"
            disabled={
              !identity ||
              !open ||
              busy ||
              pending ||
              voiceActive ||
              recording.active ||
              !text.trim() ||
              !capabilities?.chat
            }
          >
            Gửi tin nhắn <BieuTuong ten="send" size={18} />
          </button>
        </form>
        <p className="chat-disclaimer">
          {text.length}/2000 · Enter để gửi · Shift + Enter để xuống dòng
        </p>
        {identity && !open && (
          <p className="muted">Hội thoại đã kết thúc. Bạn vẫn có thể đọc lại lịch sử.</p>
        )}
        <p className="chat-disclaimer">
          {capabilities?.is_mock
            ? 'Chế độ kiểm thử: câu trả lời là mock, chưa phải AI thật.'
            : 'AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.'}
        </p>
      </div>
    </section>
  );
}
