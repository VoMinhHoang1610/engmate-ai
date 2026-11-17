import { useState } from 'react';
import type { VocabularyWord } from './types';

export function Flashcards({ words }: { words: VocabularyWord[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const word = words[index];
  if (!word) return <p>Không có từ để ôn theo bộ lọc này.</p>;
  function move(step: number) {
    setIndex((current) => (current + step + words.length) % words.length);
    setFlipped(false);
  }
  return (
    <section className="vocabulary-study" aria-label="Thẻ ghi nhớ">
      <p>
        Thẻ {index + 1}/{words.length} · Tự ôn, không tự đánh dấu đã nhớ
      </p>
      <button
        className="vocabulary-flashcard"
        aria-pressed={flipped}
        onClick={() => setFlipped(!flipped)}
      >
        <span lang="en">{word.term}</span>
        <span>{flipped ? word.meaning_vi : word.ipa}</span>
        <small>{flipped ? 'Bấm để xem mặt trước' : 'Bấm để xem nghĩa'}</small>
      </button>
      {flipped && (
        <p>
          <span lang="en">{word.example_en}</span>
          <br />
          {word.example_vi}
        </p>
      )}
      <div className="vocabulary-actions">
        <button className="tutor-button" onClick={() => move(-1)}>
          Thẻ trước
        </button>
        <button className="tutor-button" onClick={() => move(1)}>
          Thẻ tiếp
        </button>
      </div>
    </section>
  );
}

export function QuickQuiz({ words }: { words: VocabularyWord[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const unique = words.filter(
    (word, position) =>
      words.findIndex((other) => other.meaning_vi === word.meaning_vi) === position,
  );
  const questions = unique.slice(0, 5);
  if (unique.length < 4)
    return <p>Cần ít nhất 4 nghĩa khác nhau để tạo trắc nghiệm. Hãy mở rộng bộ lọc.</p>;
  const word = questions[index];
  if (!word)
    return (
      <section className="vocabulary-study" aria-label="Kết quả tự ôn">
        <h3>Đã ôn {questions.length} câu</h3>
        <p role="status">
          Đúng {correct}/{questions.length}. Kết quả tự luyện, không phải điểm TOEIC.
        </p>
        <button
          className="tutor-button"
          onClick={() => {
            setIndex(0);
            setCorrect(0);
            setAnswer(null);
          }}
        >
          Ôn lại trắc nghiệm
        </button>
      </section>
    );
  const choices = [word, ...unique.filter((other) => other.id !== word.id).slice(0, 3)];
  const offset = index % choices.length;
  const ordered = [...choices.slice(offset), ...choices.slice(0, offset)];
  return (
    <section className="vocabulary-study" aria-label="Trắc nghiệm nhanh">
      <p>
        Câu {index + 1}/{questions.length} · Chọn nghĩa phù hợp
      </p>
      <h3 lang="en">{word.term}</h3>
      <div className="vocabulary-choices">
        {ordered.map((choice) => (
          <button
            className="tutor-button"
            key={choice.id}
            disabled={answer !== null}
            onClick={() => {
              setAnswer(choice.id);
              if (choice.id === word.id) setCorrect((value) => value + 1);
            }}
          >
            {choice.meaning_vi}
          </button>
        ))}
      </div>
      {answer !== null && (
        <>
          <p role="status">
            {answer === word.id ? 'Chính xác.' : `Nghĩa phù hợp: ${word.meaning_vi}.`}
          </p>
          <p lang="en">{word.example_en}</p>
          <button
            className="tutor-button"
            onClick={() => {
              setIndex(index + 1);
              setAnswer(null);
            }}
          >
            Câu tiếp
          </button>
        </>
      )}
    </section>
  );
}
