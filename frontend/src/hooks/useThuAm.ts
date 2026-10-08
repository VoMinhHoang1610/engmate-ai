import { useEffect, useRef, useState } from 'react';
import { chepLoi, dungDoc } from '../demo/amThanh';

type TrangThai = 'idle' | 'requesting' | 'recording' | 'stopping' | 'transcribing';

/** Record locally, release the microphone, then transcribe through the backend. */
export function useThuAm(onText: (text: string) => void, onError: (message: string) => void) {
  const [state, setState] = useState<TrangThai>('idle');
  const [audio, setAudio] = useState('');
  const mounted = useRef(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const controller = useRef<AbortController | null>(null);
  const url = useRef('');
  const limit = useRef<number | null>(null);
  const busy = useRef(false);

  function clear() {
    controller.current?.abort();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = '';
    setAudio('');
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      if (limit.current !== null) window.clearTimeout(limit.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  async function transcribe(blob: Blob) {
    const request = new AbortController();
    controller.current = request;
    setState('transcribing');
    const timer = window.setTimeout(() => request.abort(), 40_000);
    try {
      const text = await chepLoi(blob, request.signal);
      if (mounted.current && !request.signal.aborted) onText(text.slice(0, 2000));
    } catch (error) {
      if (mounted.current && controller.current === request)
        onError(
          request.signal.aborted
            ? 'Chép lời quá lâu. Hãy thử ghi âm lại.'
            : error instanceof Error
              ? error.message
              : 'Không chép được lời nói.',
        );
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      if (mounted.current && controller.current === request) setState('idle');
    }
  }

  async function toggle() {
    if (recorder.current?.state === 'recording') {
      setState('stopping');
      recorder.current.stop();
      return;
    }
    if (busy.current) return;
    onError('');
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      onError('Trình duyệt chưa hỗ trợ ghi âm. Bạn vẫn có thể nhập câu trả lời.');
      return;
    }
    busy.current = true;
    dungDoc();
    clear();
    setState('requesting');
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = mic;
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(
        (type) => MediaRecorder.isTypeSupported?.(type),
      );
      const media = new MediaRecorder(mic, mimeType ? { mimeType } : undefined);
      recorder.current = media;
      const chunks: Blob[] = [];
      let failed = false;
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      media.onerror = () => {
        failed = true;
        mic.getTracks().forEach((track) => track.stop());
        busy.current = false;
        if (mounted.current) {
          setState('idle');
          onError('Ghi âm bị gián đoạn. Hãy thử lại.');
        }
      };
      media.onstop = () => {
        if (limit.current !== null) window.clearTimeout(limit.current);
        mic.getTracks().forEach((track) => track.stop());
        if (!mounted.current || recorder.current !== media || failed) return;
        const blob = new Blob(chunks, { type: media.mimeType || chunks[0]?.type || 'audio/webm' });
        url.current = URL.createObjectURL(blob);
        setAudio(url.current);
        void transcribe(blob);
      };
      media.start();
      limit.current = window.setTimeout(() => {
        if (media.state === 'recording') {
          setState('stopping');
          media.stop();
        }
      }, 60_000);
      setState('recording');
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      busy.current = false;
      if (mounted.current) {
        setState('idle');
        onError('Không truy cập được micro. Hãy cho phép micro trong trình duyệt và thử lại.');
      }
    }
  }

  const recording = state === 'recording';
  const processing = state !== 'idle' && !recording;
  const status =
    state === 'requesting'
      ? 'Đang xin quyền micro...'
      : state === 'stopping'
        ? 'Đang hoàn tất bản ghi...'
        : state === 'transcribing'
          ? 'Đang chép lời nói...'
          : recording
            ? 'Đang ghi âm... Nhấn để dừng'
            : 'Nhấn micro để bắt đầu';
  return { audio, recording, processing, active: state !== 'idle', status, toggle, clear };
}
