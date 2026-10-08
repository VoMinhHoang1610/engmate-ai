import { useEffect, useState } from 'react';
import { BieuTuong } from './BieuTuong';
import { NutDoc } from '../components/NutDoc';
import { dungDoc } from '../demo/amThanh';

const nenTang: Record<string, { text: string; nghia: string }[]> = {
  'Chữ cái': Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (text) => ({ text, nghia: '' })),
  'Số đếm': [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
  ].map((text, i) => ({ text, nghia: String(i) })),
  'Lời chào': [
    { text: 'Hello.', nghia: 'Xin chào.' },
    { text: 'Goodbye.', nghia: 'Tạm biệt.' },
    { text: 'Thank you.', nghia: 'Cảm ơn.' },
    { text: 'My name is Anna.', nghia: 'Tôi tên là Anna.' },
    { text: 'Yes.', nghia: 'Vâng / Có.' },
    { text: 'No.', nghia: 'Không.' },
  ],
};

export function NenTangTiengAnh() {
  const [muc, setMuc] = useState('Chữ cái');
  const [loi, setLoi] = useState('');
  useEffect(() => () => dungDoc(), []);
  return (
    <section className="panel beginner-basics" aria-label="Bài học đầu tiên">
      <h2>Làm quen tiếng Anh</h2>
      <p className="muted">
        Bấm từng ô để nghe rồi đọc theo. Bạn có thể bắt đầu từ một chữ cái hoặc một lời chào.
      </p>
      <div className="tabs" role="tablist" aria-label="Nội dung nhập môn">
        {Object.keys(nenTang).map((item) => (
          <button
            key={item}
            id={`basics-tab-${Object.keys(nenTang).indexOf(item)}`}
            role="tab"
            aria-selected={muc === item}
            aria-controls="basics-content"
            className={muc === item ? 'active' : ''}
            onClick={() => {
              dungDoc();
              setMuc(item);
              setLoi('');
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        id="basics-content"
        role="tabpanel"
        aria-labelledby={`basics-tab-${Object.keys(nenTang).indexOf(muc)}`}
        className={`basics-grid ${muc === 'Lời chào' ? 'phrases' : ''}`}
      >
        {nenTang[muc].map((item) => (
          <NutDoc
            key={item.text}
            className="basics-word"
            aria-label={`Nghe ${item.text}`}
            text={item.text}
            rate={0.7}
            onError={setLoi}
          >
            <strong lang="en">{item.text}</strong>
            {item.nghia && <span>{item.nghia}</span>}
            <BieuTuong ten="volume" size={16} />
          </NutDoc>
        ))}
      </div>
      {loi && (
        <p role="alert" className="error-text">
          {loi}
        </p>
      )}
    </section>
  );
}
