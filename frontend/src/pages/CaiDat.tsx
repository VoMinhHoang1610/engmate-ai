import { useEffect, useState } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { NutDoc } from '../components/NutDoc';
import { BieuTuong } from '../components/BieuTuong';
import { dungDoc } from '../demo/amThanh';
import { layGiongDoc, type GiongDoc } from '../api/voices';
import { useDuLieu, type CaiDatNguoiDung } from '../demo/LuuTru';

/** Tùy chọn dành cho không gian học tập, áp dụng ngay trên trình duyệt. */
export function CaiDat() {
  const { caiDat, capNhat } = useDuLieu();
  const [giongDoc, setGiongDoc] = useState<GiongDoc[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loiDanhSach, setLoiDanhSach] = useState('');
  const [loiAudio, setLoiAudio] = useState('');
  const [lanTai, setLanTai] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    const timer = window.setTimeout(() => {
      request.abort();
      setDangTai(false);
      setLoiDanhSach('Tải giọng nói quá lâu. Hãy thử lại.');
    }, 35_000);
    void layGiongDoc(request.signal)
      .then((voices) => {
        if (request.signal.aborted) return;
        setGiongDoc(voices);
        if (!voices.length) setLoiDanhSach('Chưa có giọng tiếng Anh để chọn. Hãy thử tải lại.');
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted)
          setLoiDanhSach(error instanceof Error ? error.message : 'Chưa tải được giọng nói.');
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (!request.signal.aborted) setDangTai(false);
      });
    return () => {
      request.abort();
      window.clearTimeout(timer);
    };
  }, [lanTai]);
  function update(changes: Partial<CaiDatNguoiDung>) {
    capNhat({ caiDat: { ...caiDat, ...changes } });
  }
  return (
    <>
      <TieuDeTrang ten="Cài đặt" />
      <div className="settings-content">
        <section className="panel settings-panel">
          <h2>Giao diện & trải nghiệm</h2>
          <div className="settings-row">
            <div>
              <label htmlFor="giao-dien">Chế độ giao diện</label>
            </div>
            <select
              id="giao-dien"
              value={caiDat.giaoDien}
              onChange={(event) =>
                update({ giaoDien: event.target.value as CaiDatNguoiDung['giaoDien'] })
              }
            >
              <option value="sang">Sáng</option>
              <option value="toi">Tối</option>
              <option value="he-thong">Theo hệ thống</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <label htmlFor="giam-chuyen-dong">Giảm chuyển động</label>
            </div>
            <input
              id="giam-chuyen-dong"
              className="settings-switch"
              type="checkbox"
              role="switch"
              checked={caiDat.giamChuyenDong}
              onChange={(event) => update({ giamChuyenDong: event.target.checked })}
            />
          </div>
        </section>
        <section className="panel settings-panel">
          <h2>Giọng nói</h2>
          <div className="settings-row">
            <div>
              <label htmlFor="giong-doc">Giọng đọc tiếng Anh</label>
            </div>
            <select
              id="giong-doc"
              value={caiDat.giongDoc}
              disabled={dangTai || !giongDoc.length}
              onChange={(event) => {
                dungDoc();
                setLoiAudio('');
                update({ giongDoc: event.target.value });
              }}
            >
              {!giongDoc.some((voice) => voice.id === caiDat.giongDoc) && (
                <option value={caiDat.giongDoc}>
                  {caiDat.giongDoc === 'UK-Nu-1-TM' ? 'Helen · Nữ' : 'Giọng đã lưu'}
                </option>
              )}
              {(
                [
                  ['female', 'Giọng nữ'],
                  ['male', 'Giọng nam'],
                  [null, 'Giọng khác'],
                ] as const
              ).map(([gender, label]) => {
                const voices = giongDoc.filter((voice) => voice.gender === gender);
                return voices.length ? (
                  <optgroup key={label} label={label}>
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>
          {dangTai && (
            <p role="status" className="muted">
              Đang tải danh sách giọng nói...
            </p>
          )}
          {loiDanhSach && (
            <div>
              <p role="alert" className="error-text">
                {loiDanhSach}
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setDangTai(true);
                  setLoiDanhSach('');
                  setLanTai((value) => value + 1);
                }}
              >
                Tải lại danh sách
              </button>
            </div>
          )}
          <div className="settings-row">
            <div>
              <strong>Nghe thử giọng đã chọn</strong>
            </div>
            <div className="voice-preview-controls">
              <NutDoc
                className="btn secondary"
                text="Hello! Let's practice English together."
                exactVoice
                preload={!dangTai && giongDoc.length > 0}
                onError={setLoiAudio}
              >
                <BieuTuong ten="volume" size={18} /> Nghe thử
              </NutDoc>
              <button className="text-button" onClick={dungDoc}>
                Dừng
              </button>
            </div>
          </div>
          {loiAudio && (
            <p role="alert" className="error-text">
              {loiAudio}
            </p>
          )}
          <div className="settings-row">
            <div>
              <label htmlFor="toc-do-doc">Tốc độ đọc tiếng Anh</label>
            </div>
            <select
              id="toc-do-doc"
              value={caiDat.tocDoDoc}
              onChange={(event) => update({ tocDoDoc: Number(event.target.value) })}
            >
              <option value="0.75">Chậm · 0.75×</option>
              <option value="1">Bình thường · 1×</option>
              <option value="1.25">Nhanh · 1.25×</option>
            </select>
          </div>
        </section>
      </div>
    </>
  );
}
