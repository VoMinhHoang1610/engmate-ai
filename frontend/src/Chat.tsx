import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { api } from './api/database';
import { layGiongDoc, type GiongDoc } from './api/voices';
import { useThuAm } from './hooks/useThuAm';
import { docVanBan, dungDoc } from './speech/audio';
import { LinhThu } from './components/LinhThu';
import { BieuTuong } from './components/BieuTuong';
import { AudioSettingsMenu } from './components/AudioSettingsMenu';
import type { Capabilities, Conversation, Message, Turn } from './types';
import { streamTurn, type ChatEvent } from './api/chatStream';
import { VoiceChat } from './voice/VoiceChat';

export function Chat({
  conversation,
  capabilities,
  onClose,
  onCreated,
}: {
  conversation: Conversation | null;
  capabilities: Capabilities | null;
  onClose: (conversation: Conversation) => void;
  onCreated: (conversation: Conversation) => void;
}) {
  const [created, setCreated] = useState<Conversation | null>(null);
  const currentConversation = conversation ?? created;
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
  const [voiceVi, setVoiceVi] = useState('HN-Nam-1-BL');
  const [speechLanguage, setSpeechLanguage] = useState<'en' | 'vi'>('en');
  const [recordLanguage, setRecordLanguage] = useState<'en' | 'vi'>('vi');
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const activeResponse = useRef<number | null>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const request = useRef<{ client_request_id: string; message: string } | null>(null);
  const sending = useRef(false);
  const createId = useRef(crypto.randomUUID());
  const createPromise = useRef<Promise<Conversation> | null>(null);
  const createdRef = useRef<Conversation | null>(null);
  const generation = useRef(0);
  const controller = useRef(new AbortController());
  const messagePane = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const recording = useThuAm(setText, setError, recordLanguage);
  const identity = currentConversation?.conversation_id;
  const historyIdentity = conversation?.conversation_id;
  const pending = messages.some((message) => message.status === 'pending');
  const open = !currentConversation || currentConversation.status === 'in_progress';

  useLayoutEffect(() => {
    const input = composer.current;
    if (!input) return;
    input.style.height = '0px';
    input.style.height = `${text ? Math.max(46, Math.min(input.scrollHeight, 120)) : 46}px`;
  }, [text]);

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
    const loadIdentity = historyIdentity ?? createdRef.current?.conversation_id;
    if (loadIdentity) {
      void load(loadIdentity, abort.signal)
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
  }, [historyIdentity, reload]);

  useEffect(() => {
    const pane = messagePane.current;
    pane?.scrollTo?.({ top: pane.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);
  useEffect(() => {
    document.documentElement.dataset.speechVoice = voice;
    document.documentElement.dataset.speechVoiceVi = voiceVi;
  }, [voice, voiceVi]);

  async function ensureConversation(): Promise<number> {
    if (identity) return identity;
    if (createdRef.current) return createdRef.current.conversation_id;
    const current = generation.current;
    if (!createPromise.current) {
      createPromise.current = api<Conversation>(
        '/conversations',
        'POST',
        {
          client_request_id: createId.current,
          title: 'Hội thoại mới',
        },
        controller.current.signal,
      );
    }
    try {
      const row = await createPromise.current;
      if (current !== generation.current || controller.current.signal.aborted)
        throw new DOMException('Conversation was left.', 'AbortError');
      if (!createdRef.current) {
        createdRef.current = row;
        setCreated(row);
        onCreated(row);
      }
      return row.conversation_id;
    } finally {
      createPromise.current = null;
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (
      !open ||
      loading ||
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
    let target = identity;
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
      target = await ensureConversation();
      if (current !== generation.current || signal.aborted) return;
      const result = capabilities.streaming
        ? await streamTurn(target, payload, signal, update)
        : await api<Turn>(`/conversations/${target}/messages`, 'POST', payload, signal);
      const rows = await load(target, signal!);
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
        if (!target) return;
        const rows = await load(target, signal!);
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
      if (kind === 'close' && currentConversation) {
        const closed: Conversation = { ...currentConversation, status: 'completed' };
        setCreated(closed);
        onClose(closed);
      } else setMessages(await load(identity, controller.current!.signal));
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
      await docVanBan(message.content, 1, controller.current?.signal, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa phát được âm thanh.');
      setSpeaking(null);
    }
  }
  async function getVoices() {
    setVoiceError('');
    try {
      setVoices(await layGiongDoc(controller.current!.signal, speechLanguage));
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Chưa tải được giọng.');
    }
  }

  const audioOptions = (
    <>
      <label>
        Ngôn ngữ ghi âm
        <select
          aria-label="Ngôn ngữ ghi âm"
          value={recordLanguage}
          disabled={recording.active || voiceActive}
          onChange={(e) => setRecordLanguage(e.target.value as 'en' | 'vi')}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </label>
      <label>
        Ngôn ngữ giọng đọc
        <select
          aria-label="Ngôn ngữ giọng đọc"
          value={speechLanguage}
          onChange={(e) => {
            setSpeechLanguage(e.target.value as 'en' | 'vi');
            setVoices([]);
          }}
        >
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      </label>
      <button
        type="button"
        className="text-button"
        disabled={!capabilities?.speech || busy || recording.active || voiceActive}
        onClick={() => void getVoices()}
      >
        Chọn giọng đọc
      </button>
      {voices.length > 0 && (
        <select
          aria-label={speechLanguage === 'en' ? 'Giọng đọc tiếng Anh' : 'Giọng đọc tiếng Việt'}
          value={speechLanguage === 'en' ? voice : voiceVi}
          onChange={(e) =>
            speechLanguage === 'en' ? setVoice(e.target.value) : setVoiceVi(e.target.value)
          }
        >
          <option value={speechLanguage === 'en' ? 'UK-Nu-1-TM' : 'HN-Nam-1-BL'}>
            Giọng mặc định
          </option>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      )}
      <p>Giọng đọc dùng cho “Nghe câu trả lời”. Thoại trực tiếp tự nhận tiếng Việt và tiếng Anh.</p>
      {voiceError && (
        <p className="error-text" role="alert">
          {voiceError}
        </p>
      )}
    </>
  );

  return (
    <section className="panel chat-panel" aria-label="Hội thoại">
      <header className="chat-top">
        <span className="icon-tile">
          <BieuTuong ten="chat" />
        </span>
        <div>
          <h2>{currentConversation?.title ?? 'Trò chuyện cùng Mate'}</h2>
        </div>
        {identity && (
          <button
            className="icon-button"
            aria-label="Tải lại tin nhắn"
            title="Tải lại tin nhắn"
            disabled={busy || recording.active || voiceActive}
            onClick={() => {
              setLoading(true);
              setError('');
              setReload((n) => n + 1);
            }}
          >
            <BieuTuong ten="repeat" size={18} />
          </button>
        )}
        {identity && open && (
          <button
            className="text-button close-conversation"
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
            <p>Nhắn tin hoặc bắt đầu thoại bằng tiếng Việt hay tiếng Anh.</p>
          </div>
        )}
        {loading && <p role="status">Đang tải tin nhắn…</p>}
        {identity && !loading && !messages.length && (
          <div className="conversation-empty">
            <LinhThu size={96} />
            <h2>Hôm nay bạn muốn trò chuyện gì?</h2>
            <p>Nhắn tin hoặc bắt đầu thoại bằng tiếng Việt hay tiếng Anh.</p>
          </div>
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
          {identity && (busy || pending || failed || speaking !== null) && (
            <div className="chat-actions">
              {busy && capabilities?.streaming && (
                <button className="text-button" onClick={() => void stopReply()}>
                  Dừng phản hồi
                </button>
              )}
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
          {recording.active && <p role="status">{recording.status}</p>}
        </div>
        <form className="chat-input conversation-composer" onSubmit={(e) => void send(e)}>
          <textarea
            ref={composer}
            aria-label="Tin nhắn"
            rows={1}
            title="Enter để gửi · Shift + Enter để xuống dòng"
            placeholder="Viết tin nhắn cho Mate…"
            maxLength={2000}
            value={text}
            disabled={
              !open || loading || busy || recording.active || voiceActive || !capabilities?.chat
            }
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="composer-toolbar">
            {capabilities?.realtime && (
              <VoiceChat
                key={capabilities.provider}
                provider={capabilities.provider}
                identity={identity}
                ensureIdentity={ensureConversation}
                audioOptions={audioOptions}
                disabled={busy || pending || loading || recording.active || !open}
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
            {!capabilities?.realtime && <AudioSettingsMenu>{audioOptions}</AudioSettingsMenu>}
            <button
              className="icon-button composer-icon"
              type="button"
              title={recording.recording ? 'Dừng ghi âm' : 'Ghi âm'}
              aria-pressed={recording.recording}
              aria-label={recording.recording ? 'Dừng ghi âm' : 'Ghi âm'}
              disabled={
                loading ||
                !open ||
                busy ||
                recording.processing ||
                voiceActive ||
                !capabilities?.speech
              }
              onClick={() => void recording.toggle()}
            >
              <BieuTuong ten={recording.recording ? 'pause' : 'mic'} size={18} />
            </button>
            <button
              className="btn primary"
              aria-label="Gửi tin nhắn"
              title="Gửi tin nhắn"
              disabled={
                loading ||
                !open ||
                busy ||
                pending ||
                voiceActive ||
                recording.active ||
                !text.trim() ||
                !capabilities?.chat
              }
            >
              <BieuTuong ten="send" size={18} />
            </button>
          </div>
        </form>
        {identity && !open && (
          <p className="muted">Hội thoại đã kết thúc. Bạn vẫn có thể đọc lại lịch sử.</p>
        )}
        <p className="chat-disclaimer">
          {capabilities?.is_mock
            ? 'Chế độ kiểm thử: câu trả lời là mock, chưa phải AI thật.'
            : 'Mate có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.'}
        </p>
      </div>
    </section>
  );
}
