import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { chuanBiAmThanh, docTiengAnh } from '../demo/amThanh';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onError'> {
  text: string;
  rate?: number;
  preload?: boolean;
  exactVoice?: boolean;
  onError: (message: string) => void;
}

export function NutDoc({
  text,
  rate = 1,
  preload = false,
  exactVoice = false,
  onError,
  children,
  disabled,
  ...props
}: Props) {
  const [loading, setLoading] = useState(false);
  const waiting = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const playbackPreference = useRef('');
  const mounted = useRef(false);
  const warm = useRef<() => void>(() => undefined);
  const cancelWarm = useRef<() => void>(() => undefined);
  useEffect(() => {
    mounted.current = true;
    let preparation: AbortController | null = null;
    let timer: number | undefined;
    let preference = `${document.documentElement.dataset.speechVoice}:${document.documentElement.dataset.speechRate}`;
    const stopPreparing = () => {
      window.clearTimeout(timer);
      preparation?.abort();
      preparation = null;
    };
    const prepare = () => {
      if (disabled || preparation) return;
      const request = new AbortController();
      preparation = request;
      void chuanBiAmThanh(text, rate, request.signal)
        // A failed preload is retried on click, where the error is shown to the learner.
        .catch(() => undefined)
        .finally(() => {
          if (preparation === request) preparation = null;
        });
    };
    const schedule = () => {
      if (preload && !disabled) timer = window.setTimeout(prepare, 0);
    };
    warm.current = () => {
      window.clearTimeout(timer);
      prepare();
    };
    cancelWarm.current = () => {
      if (!preload) stopPreparing();
    };
    // The settings provider applies these attributes after its children mount.
    const observer = new MutationObserver(() => {
      const next = `${document.documentElement.dataset.speechVoice}:${document.documentElement.dataset.speechRate}`;
      if (preference === next) return;
      preference = next;
      stopPreparing();
      if (playbackPreference.current !== next) controller.current?.abort();
      schedule();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-speech-voice', 'data-speech-rate'],
    });
    schedule();
    return () => {
      mounted.current = false;
      observer.disconnect();
      stopPreparing();
      controller.current?.abort();
    };
  }, [text, rate, preload, disabled]);
  async function play() {
    if (waiting.current) return;
    const request = new AbortController();
    controller.current = request;
    playbackPreference.current = `${document.documentElement.dataset.speechVoice}:${document.documentElement.dataset.speechRate}`;
    setLoading(true);
    waiting.current = true;
    onError('');
    try {
      if (exactVoice) await docTiengAnh(text, rate, request.signal, false);
      else await docTiengAnh(text, rate, request.signal);
    } catch (error) {
      if (!request.signal.aborted)
        onError(error instanceof Error ? error.message : 'Không phát được giọng nói.');
    } finally {
      if (controller.current === request) {
        waiting.current = false;
        if (mounted.current) setLoading(false);
      }
    }
  }
  return (
    <button
      {...props}
      type="button"
      disabled={disabled}
      aria-busy={loading}
      onClick={() => void play()}
      onPointerEnter={(event) => {
        warm.current();
        props.onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        cancelWarm.current();
        props.onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        warm.current();
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        cancelWarm.current();
        props.onBlur?.(event);
      }}
    >
      {children}
    </button>
  );
}
