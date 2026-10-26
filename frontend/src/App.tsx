import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { api, hasSession, saveSession } from './api/database';
import { AuthForm } from './AuthForm';
import { Logo } from './components/Logo';
import { xoaBoNhoAmThanh } from './speech/audio';
import type { Account, Capabilities, Conversation } from './types';

const LandingPage = lazy(() =>
  import('./landing/LandingPage').then((module) => ({ default: module.LandingPage })),
);
const TutorWorkspace = lazy(() =>
  import('./tutor/TutorWorkspace').then((module) => ({ default: module.TutorWorkspace })),
);

export default function App() {
  const [signedIn, setSignedIn] = useState(hasSession);
  const [showLanding, setShowLanding] = useState(() => window.location.hash === '#trang-chu');
  const [authRegister, setAuthRegister] = useState(() => window.location.hash === '#dang-ky');
  const [account, setAccount] = useState<Account | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [draftIdentity, setDraftIdentity] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState(0);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(hasSession);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const sessionState = useRef(hasSession());

  useEffect(() => {
    const syncLocation = () => {
      if (showLanding) {
        if (window.location.hash !== '#trang-chu') {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}#trang-chu`,
          );
        }
        return;
      }
      const hash = hasSession() ? '#hoi-thoai' : authRegister ? '#dang-ky' : '#dang-nhap';
      if (window.location.hash !== hash)
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}${hash}`,
        );
    };
    // The URL reflects the session; changing the hash never grants access.
    syncLocation();
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);
    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, [signedIn, showLanding, authRegister]);

  useEffect(() => {
    if (!showLanding) document.title = 'Hội thoại · EngMate AI';
    const change = () => {
      const active = hasSession();
      if (active === sessionState.current) return;
      sessionState.current = active;
      setSignedIn(active);
      if (active) setShowLanding(false);
      setAccount(null);
      setConversations([]);
      setSelected(null);
      setDraftIdentity(null);
      setWorkspace((n) => n + 1);
      setError('');
      setLoading(active);
    };
    window.addEventListener('engmate-session', change);
    return () => window.removeEventListener('engmate-session', change);
  }, [showLanding]);
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
    setDraftIdentity(null);
    setWorkspace((n) => n + 1);
    setError('');
    setLoading(signedIn);
    setRetry((n) => n + 1);
  }

  function create() {
    setSelected(null);
    setDraftIdentity(null);
    setWorkspace((n) => n + 1);
    setError('');
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
  if (showLanding)
    return (
      <Suspense fallback={<p role="status">Đang mở trang giới thiệu…</p>}>
        <LandingPage
          signedIn={signedIn}
          onStartLogin={() => {
            setAuthRegister(false);
            setShowLanding(false);
          }}
          onStartRegister={() => {
            setAuthRegister(true);
            setShowLanding(false);
          }}
          onEnterWorkspace={() => setShowLanding(false)}
        />
      </Suspense>
    );
  if (!signedIn)
    return <AuthForm initialRegister={authRegister} onOpenLanding={() => setShowLanding(true)} />;
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
    <Suspense fallback={<p role="status">Đang mở không gian học…</p>}>
      <TutorWorkspace
        key={account.username}
        account={account}
        capabilities={capabilities}
        conversations={conversations}
        selected={selected}
        draftIdentity={draftIdentity}
        workspace={workspace}
        busy={busy}
        more={more}
        error={error}
        onNew={create}
        onSelect={(row) => {
          setSelected(row);
          setDraftIdentity(null);
        }}
        onRetry={retryLoading}
        onLoadMore={() => void loadMore()}
        onLogout={logout}
        onOpenLanding={() => setShowLanding(true)}
        onCreated={(row) => {
          setDraftIdentity(row.conversation_id);
          setConversations((rows) => [
            row,
            ...rows.filter((item) => item.conversation_id !== row.conversation_id),
          ]);
        }}
        onClose={(closed) => {
          if (selected) setSelected(closed);
          setConversations((rows) =>
            rows.map((row) => (row.conversation_id === closed.conversation_id ? closed : row)),
          );
        }}
      />
    </Suspense>
  );
}
