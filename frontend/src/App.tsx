import { useEffect, useRef, useState } from 'react';
import { api, hasSession, saveSession } from './api/database';
import { AuthForm } from './AuthForm';
import { Chat } from './Chat';
import { Logo } from './components/Logo';
import { LinhThu } from './components/LinhThu';
import { BieuTuong } from './components/BieuTuong';
import { TieuDeTrang } from './components/TieuDeTrang';
import { MenuNguoiDung } from './components/MenuNguoiDung';
import { xoaBoNhoAmThanh } from './speech/audio';
import type { Account, Capabilities, Conversation } from './types';

export default function App() {
  const [signedIn, setSignedIn] = useState(hasSession);
  const [account, setAccount] = useState<Account | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(hasSession);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const createId = useRef(crypto.randomUUID());
  const sessionState = useRef(hasSession());

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  useEffect(() => {
    document.title = 'Hội thoại · EngMate AI';
    const change = () => {
      const active = hasSession();
      if (active === sessionState.current) return;
      sessionState.current = active;
      setSignedIn(active);
      setAccount(null);
      setConversations([]);
      setSelected(null);
      setError('');
      setLoading(active);
    };
    window.addEventListener('engmate-session', change);
    return () => window.removeEventListener('engmate-session', change);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    void api<Capabilities>('/capabilities', 'GET', undefined, abort.signal)
      .then(setCapabilities)
      .catch(() => {
        if (!abort.signal.aborted) setError('Chưa kết nối được backend. Hãy thử tải lại.');
      });
    return () => abort.abort();
  }, [retry]);
  useEffect(() => {
    const current = ++generation.current;
    const abort = new AbortController();
    if (signedIn) {
      void Promise.all([
        api<Account>('/me', 'GET', undefined, abort.signal),
        api<Conversation[]>('/conversations?limit=50&offset=0', 'GET', undefined, abort.signal),
      ])
        .then(([me, rows]) => {
          if (current !== generation.current) return;
          setAccount(me);
          setConversations(rows);
          setSelected(rows[0] ?? null);
          setMore(rows.length === 50);
        })
        .catch((e: unknown) => {
          if (!abort.signal.aborted)
            setError(e instanceof Error ? e.message : 'Chưa tải được tài khoản.');
        })
        .finally(() => {
          if (current === generation.current) setLoading(false);
        });
    }
    return () => {
      generation.current = current + 1;
      abort.abort();
      xoaBoNhoAmThanh();
    };
  }, [signedIn, retry]);

  function retryLoading() {
    setAccount(null);
    setConversations([]);
    setSelected(null);
    setError('');
    setLoading(signedIn);
    setRetry((n) => n + 1);
  }

  async function create() {
    if (lock.current) return;
    const current = generation.current;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const row = await api<Conversation>('/conversations', 'POST', {
        client_request_id: createId.current,
        title: 'Hội thoại mới',
      });
      if (current !== generation.current) return;
      createId.current = crypto.randomUUID();
      setConversations((rows) => [
        row,
        ...rows.filter((item) => item.conversation_id !== row.conversation_id),
      ]);
      setSelected(row);
      setMenu(false);
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Chưa tạo được hội thoại.');
    } finally {
      lock.current = false;
      if (current === generation.current) setBusy(false);
    }
  }
  async function loadMore() {
    if (lock.current) return;
    const current = generation.current;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const rows = await api<Conversation[]>(
        `/conversations?limit=50&offset=${conversations.length}`,
      );
      if (current !== generation.current) return;
      setConversations((old) => [
        ...old,
        ...rows.filter((row) => !old.some((item) => item.conversation_id === row.conversation_id)),
      ]);
      setMore(rows.length === 50);
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Chưa tải được lịch sử.');
    } finally {
      lock.current = false;
      if (current === generation.current) setBusy(false);
    }
  }
  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api('/auth/logout', 'POST');
      saveSession(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa thu hồi được phiên. Hãy thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!signedIn) return <AuthForm />;
  if (!account)
    return (
      <main className="auth-page loading-screen">
        <Logo />
        {loading ? (
          <p role="status">Đang tải tài khoản và lịch sử…</p>
        ) : (
          <>
            <p role="alert">{error}</p>
            <button className="btn primary" onClick={retryLoading}>
              Thử tải lại
            </button>
            <button className="text-button" onClick={() => saveSession(null)}>
              Về đăng nhập
            </button>
          </>
        )}
      </main>
    );
  return (
    <div className="app-shell conversation-shell">
      <a className="skip-link" href="#noi-dung">
        Đến hội thoại
      </a>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="Đóng danh sách hội thoại"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className="sidebar" aria-label="Menu chính">
        <a className="brand" href="#hoi-thoai" aria-label="EngMate AI">
          <Logo />
        </a>
        <nav aria-label="Điều hướng">
          <div className="nav-group">
            <a className="nav-link active" href="#hoi-thoai" aria-current="page">
              <BieuTuong ten="chat" />
              Hội thoại AI<span className="nav-badge">AI</span>
            </a>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-mate">
            <LinhThu size={60} />
            <div>
              <strong>Học cùng Mate</strong>
              <p>Luyện nói mỗi ngày</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              aria-label="Mở lịch sử hội thoại"
              aria-expanded={menu}
              aria-controls="lich-su-hoi-thoai"
              onClick={() => setMenu(!menu)}
            >
              <BieuTuong ten="menu" />
            </button>
            <a className="mobile-brand" href="#hoi-thoai" aria-label="EngMate AI">
              <Logo compact />
            </a>
            <span>Không gian học tập</span>
          </div>
          <div className="topbar-right">
            <span className="pill">
              {capabilities?.is_mock
                ? 'MOCK · KIỂM THỬ'
                : capabilities?.provider === 'openai'
                  ? 'OPENAI'
                  : capabilities?.provider === 'gemini'
                    ? 'GEMINI'
                    : 'BLAZE AI'}
            </span>
            <span className="account-name">{account.username}</span>
            <MenuNguoiDung account={account} busy={busy} onLogout={logout} />
          </div>
        </header>
        <main id="noi-dung" tabIndex={-1} className="main-content">
          <TieuDeTrang ten="Hội thoại AI">
            <span className="pill purple">AI · Trò chuyện cùng Mate</span>
          </TieuDeTrang>
          {(!capabilities?.chat || error) && (
            <div className="notice" role="alert">
              {error || capabilities?.reason || 'Đang kiểm tra khả năng kết nối AI…'}
              <button className="text-button" onClick={retryLoading}>
                Kiểm tra lại
              </button>
            </div>
          )}
          <div className="chat-layout">
            <Chat
              key={selected?.conversation_id ?? 'empty'}
              conversation={selected}
              capabilities={capabilities}
              onClose={() => {
                if (!selected) return;
                const closed: Conversation = { ...selected, status: 'completed' };
                setSelected(closed);
                setConversations((rows) =>
                  rows.map((row) =>
                    row.conversation_id === closed.conversation_id ? closed : row,
                  ),
                );
              }}
            />
            <aside
              id="lich-su-hoi-thoai"
              className={`panel conversation-history ${menu ? 'open' : ''}`}
              aria-label="Lịch sử hội thoại"
            >
              <h2>Lịch sử hội thoại</h2>
              <button
                className="btn primary full-width new-chat"
                disabled={busy}
                onClick={() => void create()}
              >
                <BieuTuong ten="plus" size={18} />
                Hội thoại mới
              </button>
              <nav aria-label="Danh sách hội thoại">
                {conversations.map((row) => (
                  <button
                    key={row.conversation_id}
                    aria-label={`${row.title}, ${new Date(row.created_at).toLocaleDateString('vi-VN')}${row.status !== 'in_progress' ? ', Đã kết thúc' : ''}`}
                    className={`history-item ${selected?.conversation_id === row.conversation_id ? 'active' : ''}`}
                    aria-current={
                      selected?.conversation_id === row.conversation_id ? 'page' : undefined
                    }
                    onClick={() => {
                      setSelected(row);
                      setMenu(false);
                    }}
                  >
                    <BieuTuong ten="chat" size={18} />
                    <span>
                      {row.title}
                      <small>
                        {new Date(row.created_at).toLocaleDateString('vi-VN')}
                        {row.status !== 'in_progress' ? ' · Đã kết thúc' : ''}
                      </small>
                    </span>
                  </button>
                ))}
                {more && (
                  <button
                    className="text-button full-width"
                    disabled={busy}
                    onClick={() => void loadMore()}
                  >
                    Tải thêm hội thoại
                  </button>
                )}
                {!conversations.length && (
                  <p className="muted">Chưa có hội thoại. Bắt đầu câu chuyện đầu tiên của bạn.</p>
                )}
              </nav>
            </aside>
          </div>
        </main>
        <footer className="site-footer">© 2026 EngMate-AI</footer>
      </div>
    </div>
  );
}
