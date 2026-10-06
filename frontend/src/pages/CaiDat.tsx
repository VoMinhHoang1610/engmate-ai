import { TieuDeTrang } from '../components/TieuDeTrang';
import { useDuLieu, type CaiDatNguoiDung } from '../demo/LuuTru';

/** Tùy chọn dành cho không gian học tập, áp dụng ngay trên trình duyệt. */
export function CaiDat() {
  const { caiDat, capNhat } = useDuLieu();
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
          <h2>Âm thanh</h2>
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
