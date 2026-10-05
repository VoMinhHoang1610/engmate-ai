import { BieuTuong } from '../components/BieuTuong';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { useDuLieu, type CaiDatNguoiDung } from '../demo/LuuTru';
import { TaiKhoan } from './TaiKhoan';

/** Cài đặt áp dụng ngay; tài khoản là một mục bên trong trang này. */
export function CaiDat() {
  const { caiDat, capNhat, daDangNhap, hoSo } = useDuLieu();
  const account =
    window.location.hash.startsWith('#tai-khoan') ||
    new URLSearchParams(window.location.hash.split('?')[1]).get('muc') === 'tai-khoan';
  function update(changes: Partial<CaiDatNguoiDung>) {
    capNhat({ caiDat: { ...caiDat, ...changes } });
  }
  return (
    <>
      <TieuDeTrang
        nhan="THEO CÁCH CỦA BẠN"
        ten="Cài đặt"
        moTa="Điều chỉnh không gian học tập để bạn luôn cảm thấy thoải mái."
      />
      <nav className="settings-tabs" aria-label="Mục cài đặt">
        <a href="#cai-dat" aria-current={!account ? 'page' : undefined}>
          <BieuTuong ten="settings" size={18} /> Chung
        </a>
        <a href="#cai-dat?muc=tai-khoan" aria-current={account ? 'page' : undefined}>
          <BieuTuong ten="user" size={18} /> Tài khoản
        </a>
      </nav>
      {account ? (
        <TaiKhoan />
      ) : (
        <div className="settings-content">
          <section className="panel settings-panel">
            <h2>Giao diện & trải nghiệm</h2>
            <div className="settings-row">
              <div>
                <label htmlFor="giao-dien">Chế độ giao diện</label>
                <p className="muted">Chọn giao diện phù hợp với ánh sáng quanh bạn.</p>
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
                <p className="muted">Tắt hiệu ứng chuyển động và cuộn mượt.</p>
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
                <p className="muted">Áp dụng khi nghe câu và từ vựng.</p>
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
          <section className="panel settings-panel">
            <h2>Tài khoản</h2>
            <div className="settings-row">
              <div>
                <strong>{daDangNhap ? hoSo.ten : 'Chào bạn, cùng bắt đầu nhé'}</strong>
                <p className="muted">
                  {daDangNhap ? hoSo.email : 'Đăng nhập để tiếp tục hành trình học tập.'}
                </p>
              </div>
              <a className="btn secondary" href="#cai-dat?muc=tai-khoan">
                {daDangNhap ? 'Quản lý tài khoản' : 'Đăng nhập'}
                <BieuTuong ten="arrow" size={16} />
              </a>
            </div>
          </section>
          <p className="muted settings-note">
            Các tùy chọn được áp dụng ngay và lưu trên trình duyệt này.
          </p>
        </div>
      )}
    </>
  );
}
