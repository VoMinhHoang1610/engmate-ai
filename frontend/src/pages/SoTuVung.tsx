import { useState, type FormEvent } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { useDuLieu } from '../demo/LuuTru';
import { docTiengAnh } from '../demo/amThanh';

export function SoTuVung() {
  const { tuVung, capNhat, luuTu } = useDuLieu();
  const [query, setQuery] = useState('');
  const [loc, setLoc] = useState('Tất cả');
  const [them, setThem] = useState(false);
  const [thongBao, setThongBao] = useState('');
  const [form, setForm] = useState({ tu: '', nghia: '', phienAm: '', loai: 'Danh từ', viDu: '' });
  const danhSach = tuVung.filter(
    (tu) =>
      `${tu.tu} ${tu.nghia}`.toLowerCase().includes(query.toLowerCase()) &&
      (loc === 'Tất cả' || (loc === 'Đã thuộc' ? tu.daThuoc : !tu.daThuoc)),
  );
  function luu(event: FormEvent) {
    event.preventDefault();
    const tuMoi = form.tu.trim();
    const nghiaMoi = form.nghia.trim();
    if (!tuMoi || !nghiaMoi) {
      setThongBao('Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt.');
      return;
    }
    if (tuVung.some((tu) => tu.tu.toLowerCase() === tuMoi.toLowerCase())) {
      setThongBao('Từ này đã có trong sổ từ của bạn.');
      return;
    }
    luuTu({
      ...form,
      tu: tuMoi,
      nghia: nghiaMoi,
      id: crypto.randomUUID(),
      daThuoc: false,
      henOn: '',
    });
    setThem(false);
    setForm({ tu: '', nghia: '', phienAm: '', loai: 'Danh từ', viDu: '' });
    setThongBao('Đã thêm từ mới vào sổ.');
  }
  return (
    <>
      <TieuDeTrang
        nhan="NHỮNG TỪ MỚI, NHỮNG CƠ HỘI MỚI"
        ten="Sổ từ vựng"
        moTa="Giữ lại từ bạn gặp. Biến chúng thành vốn từ của riêng mình."
      >
        <button
          className="btn primary"
          onClick={() => {
            setThem(!them);
            setThongBao('');
          }}
        >
          <BieuTuong ten={them ? 'close' : 'plus'} size={18} />
          {them ? 'Đóng biểu mẫu' : 'Thêm từ mới'}
        </button>
      </TieuDeTrang>
      <div className="vocab-summary">
        <span>
          <strong>{tuVung.length}</strong> từ đã lưu
        </span>
        <span className="green-text">
          <strong>{tuVung.filter((tu) => tu.daThuoc).length}</strong> từ đã thuộc
        </span>
        <a href="#flashcard" className="text-button">
          Ôn bằng Flashcard <BieuTuong ten="arrow" size={16} />
        </a>
      </div>
      {them && (
        <form className="panel add-word" onSubmit={luu}>
          <h2>Một từ mới cho hành trình của bạn</h2>
          <div className="form-grid">
            <label>
              Từ tiếng Anh
              <input
                required
                maxLength={80}
                value={form.tu}
                onChange={(e) => setForm({ ...form, tu: e.target.value })}
                placeholder="e.g. curious"
              />
            </label>
            <label>
              Nghĩa tiếng Việt
              <input
                required
                maxLength={150}
                value={form.nghia}
                onChange={(e) => setForm({ ...form, nghia: e.target.value })}
                placeholder="e.g. to mo"
              />
            </label>
            <label>
              Phiên âm
              <input
                value={form.phienAm}
                onChange={(e) => setForm({ ...form, phienAm: e.target.value })}
                placeholder="/ˈkjʊə.ri.əs/"
              />
            </label>
            <label>
              Từ loại
              <select
                value={form.loai}
                onChange={(e) => setForm({ ...form, loai: e.target.value })}
              >
                {['Danh từ', 'Động từ', 'Tính từ', 'Trạng từ', 'Cụm từ'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="span-two">
              Câu ví dụ
              <input
                value={form.viDu}
                onChange={(e) => setForm({ ...form, viDu: e.target.value })}
                placeholder="I'm curious about different cultures."
                maxLength={300}
              />
            </label>
          </div>
          <button className="btn primary" type="submit">
            Lưu từ vựng <BieuTuong ten="check" size={17} />
          </button>
        </form>
      )}
      <div className="vocab-toolbar">
        <label className="search-field">
          <BieuTuong ten="search" size={19} />
          <input
            aria-label="Tìm từ vựng"
            placeholder="Tìm từ hoặc nghĩa tiếng Việt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filter-bar">
          {['Tất cả', 'Chưa thuộc', 'Đã thuộc'].map((item) => (
            <button
              key={item}
              className={`filter-chip ${loc === item ? 'active' : ''}`}
              onClick={() => setLoc(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <p role="status" className="feedback">
        {thongBao}
      </p>
      <div className="vocab-grid">
        {danhSach.map((tu) => (
          <article className="panel vocab-card" key={tu.id}>
            <div className="section-title">
              <span className="pill outline">{tu.loai}</span>
              <button
                className="icon-button"
                aria-label={`Nghe ${tu.tu}`}
                onClick={() => {
                  if (!docTiengAnh(tu.tu)) setThongBao('Trình duyệt chưa hỗ trợ đọc từ.');
                }}
              >
                <BieuTuong ten="volume" size={19} />
              </button>
            </div>
            <h2>{tu.tu}</h2>
            <span className="phonetic">{tu.phienAm || 'Chưa thêm phiên âm'}</span>
            <p className="word-meaning">{tu.nghia}</p>
            <p className="word-example">
              “{tu.viDu || 'Thêm ví dụ khi lưu từ để dễ ghi nhớ hơn.'}”
            </p>
            <div className="vocab-footer">
              <button
                className={`word-status ${tu.daThuoc ? 'learned' : ''}`}
                onClick={() =>
                  capNhat({
                    tuVung: tuVung.map((item) =>
                      item.id === tu.id ? { ...item, daThuoc: !item.daThuoc } : item,
                    ),
                  })
                }
              >
                <BieuTuong ten="check" size={15} />
                {tu.daThuoc ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
              </button>
              <span>
                {tu.henOn
                  ? `On: ${new Date(tu.henOn).toLocaleDateString('vi-VN')}`
                  : 'Sẵn sàng ôn tập'}
              </span>
            </div>
          </article>
        ))}
      </div>
      {danhSach.length === 0 && (
        <div className="panel empty-state">
          <BieuTuong ten="search" size={35} />
          <h2>Chưa tìm thấy từ phù hợp</h2>
          <p>Thử từ khóa khác hoặc thêm từ đầu tiên của bạn.</p>
          <button
            className="btn secondary"
            onClick={() => {
              setQuery('');
              setLoc('Tất cả');
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </>
  );
}
