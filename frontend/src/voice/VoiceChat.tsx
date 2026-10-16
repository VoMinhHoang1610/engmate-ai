import { useEffect, useRef, useState } from 'react';
import { VoiceSession, type VoiceState } from './session';
import { GeminiVoiceSession } from './gemini';

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
}: {
  identity: number;
  disabled: boolean;
  onActive: (active: boolean) => void;
  onSync: () => void;
  provider?: string;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState('');
  const session = useRef<VoiceSession | GeminiVoiceSession | null>(null);
  const callbacks = useRef({ onActive, onSync });
  useEffect(() => {
    callbacks.current = { onActive, onSync };
  }, [onActive, onSync]);
  useEffect(() => {
    let live = true;
    const Session = provider === 'gemini' ? GeminiVoiceSession : VoiceSession;
    const voice = new Session(identity, {
      state: (value) => {
        if (live) {
          setState(value);
          callbacks.current.onActive(value !== 'idle' && value !== 'error');
        }
      },
      transcript: (role, text) => {
        if (live) setCaption(`${role === 'user' ? 'Bạn' : 'Mate'}: ${text}`);
      },
      error: (message) => {
        if (live) setError(message);
      },
      sync: () => {
        if (live) callbacks.current.onSync();
      },
    });
    session.current = voice;
    return () => {
      live = false;
      void voice.stop().catch(() => undefined);
    };
  }, [identity, provider]);
  const active = state !== 'idle' && state !== 'error';
  return (
    <div className="voice-session">
      <div className="voice-controls">
        <button
          className="btn secondary"
          disabled={!active && disabled}
          onClick={() => {
            setError('');
            if (active)
              void session.current
                ?.stop()
                .catch(() => setError('Chưa đóng được phiên thoại trên server.'));
            else {
              setCaption('');
              setMuted(false);
              session.current?.mute(false);
              void session.current?.start();
            }
          }}
        >
          {active ? 'Kết thúc thoại' : 'Bắt đầu thoại trực tiếp'}
        </button>
        {active && (
          <button
            className="text-button"
            aria-pressed={muted}
            onClick={() => {
              session.current?.mute(!muted);
              setMuted(!muted);
            }}
          >
            {muted ? 'Bật microphone' : 'Tắt microphone'}
          </button>
        )}
        <span role="status">{labels[state]}</span>
      </div>
      {caption && (
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
  );
}
