import { useEffect, useRef, useState, type ReactNode } from 'react';
import { VoiceSession, type VoiceState } from './session';
import { GeminiVoiceSession } from './gemini';
import { liveVoices, type VoiceCatalog } from './catalog';
import { BieuTuong } from '../components/BieuTuong';
import { AudioSettingsMenu } from '../components/AudioSettingsMenu';

const labels: Record<VoiceState, string> = {
  idle: 'Sẵn sàng thoại',
  connecting: 'Đang kết nối…',
  listening: 'Đang nghe',
  user_speaking: 'Bạn đang nói',
  processing: 'AI đang suy nghĩ…',
  assistant_speaking: 'AI đang nói — bạn có thể chen lời',
  interrupting: 'Đang ngắt lời AI…',
  reconnecting: 'Đang kết nối lại…',
  error: 'Phiên thoại gặp lỗi',
};

export function VoiceChat({
  identity,
  disabled,
  onActive,
  onSync,
  provider = 'openai',
  ensureIdentity,
  audioOptions,
}: {
  identity: number | undefined;
  ensureIdentity: () => Promise<number>;
  audioOptions: ReactNode;
  disabled: boolean;
  onActive: (active: boolean) => void;
  onSync: () => void;
  provider?: string;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState('');
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [retry, setRetry] = useState(0);
  const [transition, setTransition] = useState<'starting' | 'switching' | 'stopping' | null>(null);
  const transitionRef = useRef<typeof transition>(null);
  const epoch = useRef(0);
  const mutedRef = useRef(false);
  const closing = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const session = useRef<VoiceSession | GeminiVoiceSession | null>(null);
  const callbacks = useRef({ onActive, onSync });
  useEffect(() => {
    const abort = new AbortController();
    void liveVoices(abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return;
        setCatalog(data);
        setVoiceId((old) => (data.voices.some((v) => v.id === old) ? old : data.default_voice));
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setCatalogError(e instanceof Error ? e.message : 'Chưa tải được giọng đối thoại.');
      });
    return () => abort.abort();
  }, [provider, retry]);
  useEffect(() => {
    callbacks.current = { onActive, onSync };
  }, [onActive, onSync]);
  useEffect(() => {
    mounted.current = true;
    ++epoch.current;
    return () => {
      mounted.current = false;
      const old = session.current;
      session.current = null;
      void old?.stop().catch(() => undefined);
    };
  }, [provider]);

  function moving(value: typeof transition) {
    transitionRef.current = value;
    setTransition(value);
  }
  function makeSession(id: number, selectedVoice: string, token: number) {
    const live = () => mounted.current && epoch.current === token;
    const Session = provider === 'gemini' ? GeminiVoiceSession : VoiceSession;
    return new Session(
      id,
      {
        state: (value) => {
          if (live()) {
            setState(value);
            callbacks.current.onActive(value !== 'idle' && value !== 'error');
          }
        },
        transcript: (role, text) => {
          if (live()) setCaption(`${role === 'user' ? 'Bạn' : 'Mate'}: ${text}`);
        },
        error: (message) => {
          if (live()) setError(message);
        },
        sync: () => {
          if (live()) callbacks.current.onSync();
        },
      },
      selectedVoice || undefined,
    );
  }
  function closeCurrent() {
    if (closing.current) return closing.current;
    const old = session.current;
    session.current = null;
    if (!old) return Promise.resolve();
    const promise = old.stop();
    closing.current = promise;
    void promise
      .finally(() => {
        if (closing.current === promise) closing.current = null;
      })
      .catch(() => undefined);
    return promise;
  }
  async function start() {
    if (transitionRef.current) return;
    const token = ++epoch.current;
    moving('starting');
    setError('');
    setCaption('');
    setState('connecting');
    mutedRef.current = false;
    setMuted(false);
    callbacks.current.onActive(true);
    try {
      await closeCurrent();
      if (!mounted.current || token !== epoch.current) return;
      const id = identity ?? (await ensureIdentity());
      if (!mounted.current || token !== epoch.current) return;
      const next = makeSession(id, voiceId, token);
      session.current = next;
      await next.start();
    } catch (e) {
      if (mounted.current && token === epoch.current) {
        setState('error');
        callbacks.current.onActive(false);
        setError(e instanceof Error ? e.message : 'Chưa bắt đầu được thoại.');
      }
    } finally {
      if (mounted.current && token === epoch.current) moving(null);
    }
  }
  async function stop() {
    const token = ++epoch.current;
    moving('stopping');
    try {
      await closeCurrent();
      if (!mounted.current || token !== epoch.current) return;
      setState('idle');
      setCaption('');
    } catch {
      if (mounted.current && token === epoch.current) {
        setState('error');
        setError('Đã dừng micro nhưng chưa xác nhận đóng phiên trên server.');
      }
    } finally {
      if (mounted.current && token === epoch.current) {
        moving(null);
        callbacks.current.onActive(false);
        callbacks.current.onSync();
      }
    }
  }
  async function changeVoice(nextVoice: string) {
    if (
      transitionRef.current ||
      nextVoice === voiceId ||
      !catalog?.voices.some((v) => v.id === nextVoice)
    )
      return;
    if (state === 'idle' || state === 'error') {
      setVoiceId(nextVoice);
      return;
    }
    if (!identity) return;
    const token = ++epoch.current;
    moving('switching');
    setError('');
    setCaption('');
    setState('reconnecting');
    callbacks.current.onActive(true);
    try {
      await closeCurrent();
      if (!mounted.current || token !== epoch.current) return;
      callbacks.current.onSync();
      setVoiceId(nextVoice);
      const next = makeSession(identity, nextVoice, token);
      session.current = next;
      next.mute(mutedRef.current);
      await next.start();
    } catch {
      if (mounted.current && token === epoch.current) {
        setState('error');
        callbacks.current.onActive(false);
        setError('Chưa đổi được giọng. Hãy thử bắt đầu thoại lại.');
      }
    } finally {
      if (mounted.current && token === epoch.current) moving(null);
    }
  }
  const active = state !== 'idle' && state !== 'error';
  return (
    <div className="voice-session">
      <div className="voice-controls">
        <AudioSettingsMenu>
          <label className="live-voice-label">
            Giọng đối thoại
            <select
              aria-label="Giọng đối thoại"
              value={voiceId}
              disabled={Boolean(transition) || !catalog}
              title="Đổi giọng AI, kể cả khi đang thoại"
              onChange={(e) => void changeVoice(e.target.value)}
            >
              {!catalog && <option value="">Đang tải giọng…</option>}
              {catalog?.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          {audioOptions}
        </AudioSettingsMenu>
        <button
          type="button"
          className={`icon-button composer-icon voice-toggle ${active ? 'is-active' : ''}`}
          aria-label={active || transition ? 'Kết thúc thoại' : 'Bắt đầu thoại trực tiếp'}
          title={active || transition ? 'Kết thúc thoại' : 'Bắt đầu thoại trực tiếp'}
          aria-pressed={active}
          disabled={transition === 'stopping' || (!active && !transition && (disabled || !catalog))}
          onClick={() => void (active || transition ? stop() : start())}
        >
          <BieuTuong ten={active ? 'stop' : 'waveform'} size={20} />
        </button>
        {active && (
          <button
            type="button"
            className="icon-button composer-icon"
            aria-pressed={muted}
            disabled={Boolean(transition)}
            aria-label={muted ? 'Bật microphone' : 'Tắt microphone'}
            title={muted ? 'Bật microphone' : 'Tắt microphone'}
            onClick={() => {
              session.current?.mute(!muted);
              mutedRef.current = !muted;
              setMuted(!muted);
            }}
          >
            <BieuTuong ten={muted ? 'mic-off' : 'mic'} size={19} />
          </button>
        )}
      </div>
      {(active || transition || state === 'error' || catalogError || error) && (
        <div className="voice-feedback">
          {(state !== 'idle' || transition) && (
            <span className="live-state" role="status">
              {transition === 'switching'
                ? 'Đang đổi giọng…'
                : transition === 'stopping'
                  ? 'Đang kết thúc thoại…'
                  : transition === 'starting'
                    ? 'Đang chuẩn bị thoại…'
                    : labels[state]}
            </span>
          )}
          {catalogError && (
            <p className="error-text" role="alert">
              {catalogError}{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setCatalog(null);
                  setCatalogError('');
                  setRetry((n) => n + 1);
                }}
              >
                Tải lại giọng đối thoại
              </button>
            </p>
          )}
          {active && caption && (
            <p className="chat-disclaimer" aria-live="polite">
              {caption}
            </p>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
