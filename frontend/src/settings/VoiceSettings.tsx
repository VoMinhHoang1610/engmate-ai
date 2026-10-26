import { useCallback, useEffect, useRef, useState } from 'react';
import { layGiongDoc, type GiongDoc } from '../api/voices';
import { BieuTuong } from '../components/BieuTuong';
import { docVanBan, dungDoc } from '../speech/audio';
import { setSpeechVoice, useSpeechPreferences } from '../speech/preferences';
import { voiceGender } from '../speech/identity';
import './voice-settings.css';

type Language = 'en' | 'vi';
type CatalogState = { status: 'loading' | 'ready' | 'error'; voices: GiongDoc[] };
type Preview = { language: Language; status: 'loading' | 'playing' } | null;

const LANGUAGE_LABELS = { en: 'tiếng Anh', vi: 'tiếng Việt' } as const;
const SAMPLES = {
  en: "Hello! I'm Mate, your English teacher. Let's practise speaking together.",
  vi: 'Xin chào! Mình là {name}. Hôm nay, chúng ta cùng luyện nói tiếng Anh nhé.',
} as const;

function validCatalog(voices: GiongDoc[], language: Language): boolean {
  return (
    Array.isArray(voices) &&
    voices.every(
      (voice) =>
        voice &&
        typeof voice.id === 'string' &&
        /^[A-Za-z0-9_-]{1,120}$/.test(voice.id) &&
        typeof voice.name === 'string' &&
        voice.name.trim() &&
        voice.language === language &&
        (voice.gender === undefined ||
          voice.gender === null ||
          voice.gender === 'male' ||
          voice.gender === 'female'),
    ) &&
    new Set(voices.map((voice) => voice.id)).size === voices.length
  );
}

interface VoiceChoiceProps {
  language: Language;
  value: string;
  preview: Preview;
  previewError: string;
  notice: string;
  onSelect: (language: Language, id: string) => void;
  onPreview: (language: Language, voice: GiongDoc) => void;
  onStop: () => void;
}

function VoiceChoice({
  language,
  value,
  preview,
  previewError,
  notice,
  onSelect,
  onPreview,
  onStop,
}: VoiceChoiceProps) {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading', voices: [] });
  const [retry, setRetry] = useState(0);
  const label = LANGUAGE_LABELS[language];
  const id = `settings-voice-${language}`;
  const available = catalog.voices.some((voice) => voice.id === value);
  const playing = preview?.language === language;

  useEffect(() => {
    const request = new AbortController();
    void layGiongDoc(request.signal, language).then(
      (voices) => {
        if (request.signal.aborted) return;
        setCatalog(
          validCatalog(voices, language)
            ? { status: 'ready', voices }
            : { status: 'error', voices: [] },
        );
      },
      () => {
        if (!request.signal.aborted) setCatalog({ status: 'error', voices: [] });
      },
    );
    return () => request.abort();
  }, [language, retry]);

  function reload() {
    onStop();
    setCatalog({ status: 'loading', voices: [] });
    setRetry((current) => current + 1);
  }

  return (
    <fieldset className="voice-choice" data-language={language}>
      <legend>
        <span className="voice-language-mark" aria-hidden="true">
          {language === 'en' ? 'EN' : 'VI'}
        </span>
        Giọng {label}
      </legend>
      <p className="voice-choice-description" id={`${id}-help`}>
        {language === 'en'
          ? 'Dùng khi Mate nói tiếng Anh và đọc câu mẫu.'
          : 'Dùng khi Mate giải thích và hướng dẫn bằng tiếng Việt.'}
      </p>
      <div className="voice-choice-controls">
        <select
          id={id}
          aria-label={`Giọng ${label}`}
          aria-describedby={`${id}-help`}
          value={value}
          disabled={catalog.status !== 'ready' || !catalog.voices.length}
          onChange={(event) => {
            const next = event.target.value;
            if (catalog.voices.some((voice) => voice.id === next)) onSelect(language, next);
          }}
        >
          {!available && (
            <option value={value} disabled>
              {catalog.status === 'loading'
                ? 'Đang tải giọng đã chọn…'
                : catalog.status === 'error'
                  ? 'Chưa tải được giọng đã chọn'
                  : 'Giọng đã lưu hiện không có sẵn'}
            </option>
          )}
          {catalog.voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
              {voice.gender === 'male' ? ' · Nam' : voice.gender === 'female' ? ' · Nữ' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="voice-preview"
          data-active={playing || undefined}
          disabled={!playing && (catalog.status !== 'ready' || !available)}
          aria-label={`${playing ? 'Dừng nghe thử' : 'Nghe thử giọng'} ${label}`}
          onClick={() => {
            const selected = catalog.voices.find((voice) => voice.id === value);
            if (playing) onStop();
            else if (selected) onPreview(language, selected);
          }}
        >
          <BieuTuong ten={playing ? 'stop' : 'volume'} size={17} />
          {playing ? 'Dừng nghe thử' : 'Nghe thử'}
        </button>
      </div>
      {catalog.status === 'loading' && (
        <p className="voice-choice-status" role="status">
          Đang tải danh sách giọng {label}…
        </p>
      )}
      {catalog.status === 'error' && (
        <div className="voice-choice-error">
          <p role="alert">Chưa tải được danh sách giọng {label}. Lựa chọn đã lưu vẫn được giữ.</p>
          <button type="button" className="voice-retry" onClick={reload}>
            Thử tải lại giọng {label}
          </button>
        </div>
      )}
      {catalog.status === 'ready' && !catalog.voices.length && (
        <div className="voice-choice-empty">
          <p>Chưa có giọng {label} để chọn. Lựa chọn đã lưu vẫn được giữ.</p>
          <button type="button" className="voice-retry" onClick={reload}>
            Thử tải lại giọng {label}
          </button>
        </div>
      )}
      {catalog.status === 'ready' && catalog.voices.length > 0 && !available && (
        <p className="voice-choice-status">
          Giọng đã lưu không còn trong danh sách. Bạn có thể chọn một giọng khác ở trên.
        </p>
      )}
      {playing && (
        <p className="voice-choice-status" role="status">
          {preview.status === 'loading' ? 'Đang chuẩn bị âm thanh…' : 'Đang phát câu nghe thử…'}
        </p>
      )}
      {previewError && (
        <p className="voice-preview-error" role="alert">
          {previewError}
        </p>
      )}
      {notice && (
        <p className="voice-choice-saved" role="status">
          {notice}
        </p>
      )}
    </fieldset>
  );
}

/** Explicit, language-specific voice selection and cancellable sample playback. */
export function VoiceSettings() {
  const preferences = useSpeechPreferences();
  const [preview, setPreview] = useState<Preview>(null);
  const [errors, setErrors] = useState({ en: '', vi: '' });
  const [notices, setNotices] = useState({ en: '', vi: '' });
  const active = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    const request = active.current;
    active.current = null;
    if (request) {
      request.abort();
      dungDoc();
    }
    setPreview(null);
  }, []);

  useEffect(() => () => stop(), [preferences.voiceEn, preferences.voiceVi, preferences.rate, stop]);

  function select(language: Language, voice: string) {
    stop();
    const persisted = setSpeechVoice(language, voice);
    setErrors((current) => ({ ...current, [language]: '' }));
    setNotices((current) => ({
      ...current,
      [language]: persisted
        ? `Đã lưu giọng ${LANGUAGE_LABELS[language]} trên trình duyệt này.`
        : 'Đã áp dụng cho phiên này. Trình duyệt chưa cho phép lưu lựa chọn.',
    }));
  }

  async function previewVoice(language: Language, voice: GiongDoc) {
    stop();
    const request = new AbortController();
    active.current = request;
    setErrors((current) => ({ ...current, [language]: '' }));
    setPreview({ language, status: 'loading' });
    const finish = (error?: Error) => {
      if (active.current !== request || request.signal.aborted) return;
      active.current = null;
      setPreview(null);
      if (error)
        setErrors((current) => ({
          ...current,
          [language]: 'Chưa nghe thử được giọng này. Bạn hãy thử lại.',
        }));
    };
    try {
      const gender = voiceGender(voice.id, voice.gender);
      const name = gender === 'female' ? 'cô Mate' : gender === 'male' ? 'thầy Mate' : 'Mate';
      await docVanBan(SAMPLES[language].replace('{name}', name), 1, request.signal, finish);
      if (active.current === request && !request.signal.aborted)
        setPreview({ language, status: 'playing' });
    } catch {
      if (active.current !== request || request.signal.aborted) return;
      active.current = null;
      setPreview(null);
      setErrors((current) => ({
        ...current,
        [language]: 'Chưa nghe thử được giọng này. Bạn hãy thử lại.',
      }));
    }
  }

  return (
    <div className="voice-settings">
      <div className="voice-settings-intro">
        <strong>Chọn giọng của Mate</strong>
        <p>Chọn riêng cho từng ngôn ngữ và nghe thử trước khi học.</p>
      </div>
      {(['en', 'vi'] as const).map((language) => (
        <VoiceChoice
          key={language}
          language={language}
          value={language === 'en' ? preferences.voiceEn : preferences.voiceVi}
          preview={preview}
          previewError={errors[language]}
          notice={notices[language]}
          onSelect={select}
          onPreview={(next, voice) => void previewVoice(next, voice)}
          onStop={stop}
        />
      ))}
      <p className="voice-settings-note">
        Lựa chọn được lưu riêng cho tài khoản trên trình duyệt này. Giọng hội thoại sẽ dùng giọng
        bạn chọn gần nhất từ phiên nói tiếp theo, giữ một giọng xuyên suốt cả tiếng Việt và tiếng
        Anh.
      </p>
    </div>
  );
}
