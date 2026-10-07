import { useState, type FormEvent } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { Select } from '../components/Select';
import { useDuLieu } from '../demo/LuuTru';
import type { HoSo as HoSoData, TrinhDo } from '../demo/duLieu';

export function HoSo() {
  const { hoSo, capNhat, phutHoc, luotOn, tuVung } = useDuLieu();
  const [form, setForm] = useState(hoSo);
  const [daLuu, setDaLuu] = useState(false);
  const [loi, setLoi] = useState('');
  function luu(event: FormEvent) {
    event.preventDefault();
    const ten = form.ten.trim();
    if (!ten) {
      setLoi('Vui lòng nhập họ và tên.');
      setDaLuu(false);
      return;
    }
    capNhat({ hoSo: { ...form, ten } });
    setLoi('');
    setDaLuu(true);
  }
  return (
    <>
      <TieuDeTrang ten="Hồ sơ học tập" />
      <div className="profile-layout">
        <aside className="panel profile-summary">
          <label className="avatar-upload" title="Nhấn để đổi ảnh">
            <div className="avatar-wrapper">
              {form.anhDaiDien ? (
                <img src={form.anhDaiDien} alt="Avatar" className="avatar large avatar-img" />
              ) : (
                <div className="avatar large">{form.ten.slice(0, 1).toUpperCase()}</div>
              )}
              <div className="avatar-overlay">
                <BieuTuong ten="pen" size={16} />
                Sửa
              </div>
            </div>
            <span className="avatar-upload-text">Sửa ảnh</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result) {
                      const newAvatar = ev.target.result as string;
                      setForm({ ...form, anhDaiDien: newAvatar });
                      capNhat({ hoSo: { ...hoSo, anhDaiDien: newAvatar } });
                      setDaLuu(true);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          <h2>{hoSo.ten}</h2>
          <p className="muted">{hoSo.email}</p>
          <span className="pill purple">{hoSo.trinhDo}</span>
          <div className="profile-metrics">
            <div>
              <strong>{phutHoc}</strong>
              <span>Phút đã học</span>
            </div>
            <div>
              <strong>{tuVung.length}</strong>
              <span>Từ đã lưu</span>
            </div>
            <div>
              <strong>{luotOn}</strong>
              <span>Lượt ôn</span>
            </div>
          </div>
        </aside>
        <form
          className="panel profile-form"
          onSubmit={luu}
          onChange={() => {
            setDaLuu(false);
            setLoi('');
          }}
        >
          <h2>Thông tin cá nhân</h2>
          <div className="form-grid">
            <label>
              Họ và tên
              <input
                maxLength={60}
                required
                value={form.ten}
                onChange={(e) => setForm({ ...form, ten: e.target.value })}
              />
            </label>
            <label>
              Tài khoản
              <input disabled value={form.taiKhoan} />
            </label>
            <label>
              Số điện thoại
              <input
                type="tel"
                value={form.soDienThoai}
                onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })}
              />
            </label>
            <label>
              Ngày sinh
              <input
                type="date"
                value={form.ngaySinh}
                onChange={(e) => setForm({ ...form, ngaySinh: e.target.value })}
              />
            </label>
            <label>
              Giới tính
              <Select
                value={form.gioiTinh}
                onChange={(val) => setForm({ ...form, gioiTinh: val as HoSoData['gioiTinh'] })}
                options={[
                  { value: '', label: 'Chưa xác định' },
                  { value: 'Nam', label: 'Nam' },
                  { value: 'Nữ', label: 'Nữ' },
                  { value: 'Khác', label: 'Khác' },
                ]}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <hr />
          <h2>Cá nhân hóa việc học</h2>
          <label>
            Trình độ tiếng Anh
            <Select
              value={form.trinhDo}
              onChange={(val) => setForm({ ...form, trinhDo: val as TrinhDo })}
              options={[
                { value: 'A2', label: 'A2 — Cơ bản' },
                { value: 'B1', label: 'B1 — Trung cấp' },
                { value: 'B2', label: 'B2 — Trên trung cấp' },
              ]}
            />
          </label>
          <label>
            Mục tiêu của bạn
            <Select
              value={form.mucTieu}
              onChange={(val) => setForm({ ...form, mucTieu: val })}
              options={[
                'Giao tiếp tự tin',
                'Tiếng Anh công việc',
                'Du lịch và khám phá',
                'Chuẩn bị TOEIC',
                'Chuẩn bị IELTS',
              ].map((item) => ({ value: item, label: item }))}
            />
          </label>
          <label>
            Thời gian học mỗi ngày <strong className="accent">{form.phutMoiNgay} phút</strong>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={form.phutMoiNgay}
              onChange={(e) => setForm({ ...form, phutMoiNgay: Number(e.target.value) })}
            />
            <span className="range-labels">
              <span>10 phút</span>
              <span>60 phút</span>
            </span>
          </label>
          {loi && (
            <p role="alert" className="error-text">
              {loi}
            </p>
          )}
          <div className="form-footer">
            <span role="status">{daLuu ? 'Đã lưu hồ sơ của bạn.' : ''}</span>
            <button className="btn primary" type="submit">
              <BieuTuong ten="check" size={18} /> Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
