import { useId, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Mic, MicOff, Pause, Play, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconButton, Orb } from './components';
import { useMockVoice, type VoiceState } from './useMockVoice';
import './voice-session.css';

type VoiceSessionProps = {
  open: boolean;
  onClose: () => void;
  topic?: string;
  returnFocus?: HTMLElement | null;
};

const stateLabels: Record<VoiceState, string> = {
  idle: 'Mate ở đây',
  listening: 'Mate đang nghe',
  thinking: 'Mate đang nghĩ',
  speaking: 'Mate đang nói',
};

function SessionContents({ onClose, topic }: Omit<VoiceSessionProps, 'open'>) {
  const voice = useMockVoice();
  const reducedMotion = useReducedMotion();
  const [tipScene, setTipScene] = useState<number | null>(null);
  const tipId = useId();
  const status = voice.paused
    ? 'Đã tạm dừng'
    : voice.muted
      ? 'Micro đang tắt'
      : stateLabels[voice.state];
  const { text, word, tip, speaker } = voice.scene;
  const wordIndex = word ? text.indexOf(word) : -1;
  const showTip = tipScene === voice.sceneKey && Boolean(tip);

  return (
    <>
      <header className="mate-session-header">
        <div className="mate-session-identity">
          <span className="mate-session-mark" aria-hidden="true">
            <Sparkles size={18} strokeWidth={1.75} />
          </span>
          <Dialog.Title>Nói cùng Mate</Dialog.Title>
        </div>
        <span className="mate-session-demo">Phiên trải nghiệm</span>
      </header>

      <Dialog.Description className="mate-sr-only">
        Hội thoại mẫu với bốn trạng thái. Không thu micro hoặc phát giọng nói. Dùng ba nút phía dưới
        để điều khiển; nhấn Escape để thoát.
      </Dialog.Description>

      <main className="mate-session-stage">
        <p className="mate-session-topic">{topic || 'Một ly cà phê'}</p>
        <motion.div
          className="mate-session-orb"
          initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' }}
          aria-hidden="true"
        >
          <Orb state={voice.state} size="session" frozen={voice.paused || voice.muted} />
          {voice.state === 'listening' && !voice.paused && !voice.muted && (
            <div className="mate-session-wave" aria-hidden="true">
              {Array.from({ length: 17 }, (_, index) => (
                <span key={index} style={{ animationDelay: `${index * 65}ms` }} />
              ))}
            </div>
          )}
        </motion.div>

        <p className="mate-session-status" role="status" aria-live="polite">
          <span className={`mate-session-status-dot is-${voice.state}`} aria-hidden="true" />
          {status}
        </p>

        <div className="mate-session-transcript" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={voice.sceneKey}
              className="mate-session-caption"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            >
              {text ? (
                <>
                  <span className="mate-session-speaker">{speaker}</span>
                  <p lang="en">
                    {word && wordIndex >= 0 ? (
                      <>
                        {text.slice(0, wordIndex)}
                        <button
                          type="button"
                          className="mate-session-word"
                          aria-label={`Gợi ý phát âm: ${word}`}
                          aria-expanded={showTip}
                          aria-controls={tipId}
                          onClick={() => setTipScene(showTip ? null : voice.sceneKey)}
                        >
                          {word}
                        </button>
                        {text.slice(wordIndex + word.length)}
                      </>
                    ) : (
                      text
                    )}
                  </p>
                </>
              ) : (
                <p className="mate-session-ready">Cứ thoải mái nhé.</p>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mate-session-tip-space">
            {showTip && (
              <motion.p
                id={tipId}
                role="status"
                className="mate-session-tip"
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.18 }}
              >
                {tip}
              </motion.p>
            )}
          </div>
        </div>
      </main>

      <footer className="mate-session-footer">
        <div className="mate-session-controls">
          <div className="mate-session-control">
            <IconButton
              className={`mate-session-action ${voice.muted ? 'is-muted' : ''}`}
              label={voice.muted ? 'Bật micro mô phỏng' : 'Tắt micro mô phỏng'}
              aria-pressed={voice.muted}
              onClick={voice.toggleMute}
            >
              {voice.muted ? <MicOff size={23} /> : <Mic size={23} />}
            </IconButton>
            <span>{voice.muted ? 'Bật mic' : 'Tắt mic'}</span>
          </div>
          <div className="mate-session-control">
            <IconButton
              className="mate-session-action mate-session-pause"
              label={voice.paused ? 'Tiếp tục hội thoại' : 'Tạm dừng hội thoại'}
              aria-pressed={voice.paused}
              onClick={voice.togglePause}
            >
              {voice.paused ? <Play size={24} /> : <Pause size={24} />}
            </IconButton>
            <span>{voice.paused ? 'Tiếp tục' : 'Tạm dừng'}</span>
          </div>
          <div className="mate-session-control">
            <IconButton className="mate-session-action" label="Thoát hội thoại" onClick={onClose}>
              <X size={23} />
            </IconButton>
            <span>Thoát</span>
          </div>
        </div>
        <p className="mate-session-disclaimer">Âm thanh mô phỏng · Không thu micro</p>
      </footer>
    </>
  );
}

export function VoiceSession({ open, onClose, topic, returnFocus }: VoiceSessionProps) {
  const previousFocus = useRef<HTMLElement | null>(null);
  // Keep the portal within the app so both theme tokens and the dark mode inherit.
  const portalContainer =
    typeof document === 'undefined' ? undefined : document.querySelector<HTMLElement>('.mate-app');

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay className="mate-session-overlay" />
        <Dialog.Content
          className="mate-app voice-session-root"
          onOpenAutoFocus={() => {
            previousFocus.current = returnFocus ?? (document.activeElement as HTMLElement | null);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (previousFocus.current?.isConnected) previousFocus.current.focus();
          }}
        >
          <SessionContents onClose={onClose} topic={topic} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
