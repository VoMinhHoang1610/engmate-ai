import { useEffect, useRef, useState } from 'react';
import { api, type Word } from '../api/database';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { NutDoc } from '../components/NutDoc';

/** One server study session owns the whole review deck and its measured duration. */
export function FlashcardMySQL() {
  const [all, setAll] = useState(false);
  const [retry, setRetry] = useState(0);
  const [session, setSession] = useState<number | null>(null);
  const [deck, setDeck] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pendingRating, setPendingRating] = useState<string | null>(null);
  const pendingReview = useRef<{
    client_request_id: string;
    vocabulary_id: number;
    rating: string;
  } | null>(null);
  const card = deck[index];
  useEffect(() => {
    let cancelled = false;
    let created: number | null = null;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setSession(null);
      setDone(false);
      setError('');
      setIndex(0);
      setFlipped(false);
      setDeck([]);
      pendingReview.current = null;
      setPendingRating(null);
      const words: Word[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await api<Word[]>(`/vocabulary?due=${!all}&limit=100&offset=${offset}`);
        words.push(...page);
        if (page.length < 100) break;
      }
      if (cancelled) return;
      if (!words.length) {
        setDone(true);
        return;
      }
      const row = await api<{ flashcard_session_id: number }>('/flashcards/sessions', 'POST', {
        client_request_id: crypto.randomUUID(),
        review_all: all,
      });
      created = row.flashcard_session_id;
      if (cancelled) {
        await api(`/flashcards/sessions/${created}/close?abandoned=true`, 'POST');
        return;
      }
      setSession(created);
      setDeck(words);
    })().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Chưa tải được thẻ ôn tập.');
    });
    return () => {
      cancelled = true;
      if (created)
        void api(`/flashcards/sessions/${created}/close?abandoned=true`, 'POST').catch(() => {});
    };
  }, [all, retry]);
  async function rate(rating: string) {
    if (!card || !session || busy || !flipped) return;
    setBusy(true);
    setError('');
    try {
      const review = pendingReview.current ?? {
        client_request_id: crypto.randomUUID(),
        vocabulary_id: card.user_vocabulary_id,
        rating,
      };
      pendingReview.current = review;
      setPendingRating(review.rating);
      await api(`/flashcards/sessions/${session}/reviews`, 'POST', review);
      if (review.rating === 'again') setDeck((old) => [...old, card]);
      else if (index + 1 === deck.length) {
        await api(`/flashcards/sessions/${session}/close`, 'POST');
        setDone(true);
      }
      pendingReview.current = null;
      setPendingRating(null);
      setIndex((old) => old + 1);
      setFlipped(false);
      window.dispatchEvent(new Event('engmate-data'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được lượt ôn.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <TieuDeTrang ten="Flashcard" />
      <section className="panel flashcard-layout">
        <label>
          <input
            type="checkbox"
            checked={all}
            disabled={busy}
            onChange={(e) => setAll(e.target.checked)}
          />{' '}
          Ôn tất cả từ
        </label>
        {done ? (
          <>
            <h2>{index ? 'Đã hoàn thành phiên ôn tập' : 'Không có từ đến hạn ôn tập'}</h2>
            <a href="#so-tu-vung">Mở sổ từ vựng</a>
            <button className="btn secondary" onClick={() => setRetry((old) => old + 1)}>
              Ôn lại
            </button>
          </>
        ) : card ? (
          <>
            <p>
              Thẻ {index + 1} / {deck.length}
            </p>
            <button
              className={`flash-card ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped(!flipped)}
            >
              <strong>{flipped ? card.meaning : card.word}</strong>
              {flipped && <p>{card.example_sentence}</p>}
            </button>
            <NutDoc text={card.word} preload onError={setError}>
              Nghe từ
            </NutDoc>
            <div className="rating-buttons">
              {[
                ['again', 'Học lại'],
                ['hard', 'Khó'],
                ['good', 'Nhớ được'],
                ['easy', 'Dễ'],
              ].map(([value, label]) => (
                <button
                  className="btn secondary"
                  key={value}
                  disabled={!flipped || busy || Boolean(pendingRating && pendingRating !== value)}
                  onClick={() => void rate(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p role="status">Đang tải thẻ ôn tập…</p>
        )}
        {error && (
          <div>
            <p role="alert">{error}</p>
            {!session && <button onClick={() => setRetry((old) => old + 1)}>Thử lại</button>}
          </div>
        )}
      </section>
    </>
  );
}
