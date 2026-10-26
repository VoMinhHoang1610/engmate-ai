import { useEffect, useRef, useState, type ReactNode } from 'react';
import { VoiceSession, type VoiceEvents, type VoiceState } from './session';
import { GeminiVoiceSession } from './gemini';
import { BlazeVoiceSession } from './blaze';
import { liveVoices, type VoiceCatalog } from './catalog';
import { BieuTuong } from '../components/BieuTuong';
import { AudioSettingsMenu } from '../components/AudioSettingsMenu';
import { getSpeechPreferences, setSpeechVoice, useSpeechPreferences } from '../speech/preferences';

const labels: Record<VoiceState, string> = {
  idle: 'Nói cùng Mate',
  connecting: 'Đang kết nối…',
  listening: 'Đang nghe',
  user_speaking: 'Bạn đang nói',
  processing: 'Để mình nghĩ chút',
  assistant_speaking: 'Mate đang nói',
  interrupting: 'Đến lượt bạn',
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
  onState,
  onLevel,
  onMuted,
  onCaption,
  onReady,
  speechOptions,
  speechProvider,
  opening,
  startRequest = 0,
}: {
  identity: number | undefined;
  ensureIdentity: () => Promise<number>;
  audioOptions: ReactNode;
  disabled: boolean;
  onActive: (active: boolean) => void;
  onSync: () => void;
  provider?: string;
  onState?: (state: VoiceState) => void;
  onLevel?: (level: number | undefined) => void;
  onMuted?: (muted: boolean) => void;
  onCaption?: (caption: string) => void;
  onReady?: (ready: boolean) => void;
  speechOptions?: {
    language: 'en' | 'vi';
    voiceEn: string;
    voiceVi: string;
  };
  speechProvider?: 'blaze' | 'native';
  opening?: string;
  startRequest?: number;
}) {
  const speechPreferences = useSpeechPreferences();
  const [state, setState] = useState<VoiceState>('idle');
  useEffect(() => {
    onState?.(state);
  }, [state, onState]);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    onMuted?.(muted);
  }, [muted, onMuted]);
  const [caption, setCaption] = useState('');
  useEffect(() => {
    onCaption?.(caption);
  }, [caption, onCaption]);
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
  const session = useRef<VoiceSession | GeminiVoiceSession | BlazeVoiceSession | null>(null);
  const callbacks = useRef({ onActive, onSync, onLevel });
  const requested = useRef(0);
  const beginVoice = useRef<() => Promise<void>>(async () => undefined);
  const active = state !== 'idle' && state !== 'error';
  const blaze =
    speechProvider !== 'native' && (speechProvider === 'blaze' || catalog?.provider === 'blaze');
  // An active call keeps its voice until the learner explicitly switches or ends it.
  const selectedVoice =
    blaze && !active && !transition
      ? (speechPreferences.dialogueVoice ?? catalog?.default_voice ?? '')
      : voiceId;
  const selectedCatalogVoice = catalog?.voices.find((voice) => voice.id === selectedVoice);
  const unavailableVoice = Boolean(
    blaze &&
    catalog &&
    (!selectedCatalogVoice ||
      (speechPreferences.dialogueVoice === selectedVoice &&
        (selectedCatalogVoice.language === 'en'
          ? speechPreferences.voiceEn !== selectedVoice
          : selectedCatalogVoice.language === 'vi'
            ? speechPreferences.voiceVi !== selectedVoice
            : true))),
  );
  const ready = !disabled && Boolean(catalog) && !unavailableVoice && !active && !transition;
  useEffect(() => {
    onReady?.(ready);
  }, [ready, onReady]);
  useEffect(() => {
    const abort = new AbortController();
    void liveVoices(abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return;
        if (speechProvider === 'blaze' && data.provider !== 'blaze')
          throw new Error('Chưa tải được giọng Blaze. Hãy tải lại giọng đối thoại.');
        setCatalog(data);
        setCatalogError('');
        setVoiceId((old) =>
          speechProvider !== 'native' && data.provider === 'blaze'
            ? (getSpeechPreferences().dialogueVoice ?? data.default_voice)
            : data.voices.some((v) => v.id === old)
              ? old
              : data.default_voice,
        );
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setCatalogError(e instanceof Error ? e.message : 'Chưa tải được giọng đối thoại.');
      });
    return () => abort.abort();
  }, [provider, speechProvider, retry]);
  useEffect(() => {
    callbacks.current = { onActive, onSync, onLevel };
  }, [onActive, onSync, onLevel]);
  useEffect(() => {
    mounted.current = true;
    ++epoch.current;
    return () => {
      mounted.current = false;
      const old = session.current;
      session.current = null;
      void old?.stop().catch(() => undefined);
    };
  }, [provider, speechProvider]);

  function moving(value: typeof transition) {
    transitionRef.current = value;
    setTransition(value);
  }
  function makeSession(id: number, selectedVoice: string, token: number) {
    const live = () => mounted.current && epoch.current === token;
    const events: VoiceEvents = {
      state: (value) => {
        if (live()) {
          setState(value);
          callbacks.current.onLevel?.(undefined);
          callbacks.current.onActive(value !== 'idle' && value !== 'error');
        }
      },
      level: (level, channel) => {
        if (
          live() &&
          (session.current?.currentState === 'assistant_speaking'
            ? channel === 'output'
            : channel === 'input')
        )
          callbacks.current.onLevel?.(mutedRef.current && channel === 'input' ? 0 : level);
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
    };
    if (blaze) {
      const selected = catalog?.voices.find((voice) => voice.id === selectedVoice);
      const preferences = getSpeechPreferences();
      return new BlazeVoiceSession(id, events, selectedVoice || undefined, {
        ...speechOptions,
        sttMode: catalog?.stt_mode ?? 'batch',
        voiceLanguage: selected?.language,
        voiceGender: selected?.gender,
        voiceEn: preferences.voiceEn,
        voiceVi: preferences.voiceVi,
        ...(selected?.language === 'en' ? { voiceEn: selectedVoice } : {}),
        ...(selected?.language === 'vi' ? { voiceVi: selectedVoice } : {}),
        speed: preferences.rate,
        opening,
      });
    }
    const Session = provider === 'gemini' ? GeminiVoiceSession : VoiceSession;
    return new Session(id, events, selectedVoice || undefined);
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
    if (transitionRef.current || disabled || !catalog || unavailableVoice) return;
    const token = ++epoch.current;
    const startingVoice = selectedVoice;
    setVoiceId(startingVoice);
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
      const next = makeSession(id, startingVoice, token);
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
  useEffect(() => {
    beginVoice.current = start;
  });
  useEffect(() => {
    if (
      !startRequest ||
      requested.current >= startRequest ||
      !catalog ||
      disabled ||
      unavailableVoice
    )
      return;
    requested.current = startRequest;
    queueMicrotask(() => {
      if (mounted.current) void beginVoice.current();
    });
  }, [startRequest, catalog, disabled, unavailableVoice]);
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
    const choice = catalog?.voices.find((voice) => voice.id === nextVoice);
    if (transitionRef.current || nextVoice === selectedVoice || !choice) return;
    const rememberChoice = () => {
      if (blaze && (choice.language === 'en' || choice.language === 'vi'))
        setSpeechVoice(choice.language, nextVoice);
    };
    if (state === 'idle' || state === 'error') {
      setVoiceId(nextVoice);
      rememberChoice();
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
      rememberChoice();
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
  return (
    <div className="voice-session">
      <div className="voice-controls">
        <AudioSettingsMenu>
          <label className="live-voice-label">
            Giọng đối thoại
            <select
              aria-label="Giọng đối thoại"
              value={selectedVoice}
              disabled={Boolean(transition) || !catalog}
              title="Đổi giọng AI, kể cả khi đang thoại"
              onChange={(e) => void changeVoice(e.target.value)}
            >
              {!catalog && <option value="">Đang tải giọng…</option>}
              {catalog && !selectedCatalogVoice && (
                <option value={selectedVoice} disabled>
                  Giọng đã chọn chưa khả dụng
                </option>
              )}
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
          disabled={
            transition === 'stopping' ||
            (!active && !transition && (disabled || !catalog || unavailableVoice))
          }
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
      {(active || transition || state === 'error' || catalogError || error || unavailableVoice) && (
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
          {unavailableVoice && (
            <p className="error-text" role="alert">
              Giọng bạn đã chọn chưa khả dụng trong danh sách hiện tại. Chọn giọng khác trong tùy
              chọn âm thanh để bắt đầu thoại.
            </p>
          )}
          {active && caption && !onCaption && (
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
