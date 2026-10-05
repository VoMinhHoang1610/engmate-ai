import { useState, type FormEvent } from 'react';
import { TieuDeTrang } from '../components/TieuDeTrang';
import { BieuTuong } from '../components/BieuTuong';
import { useDuLieu } from '../demo/LuuTru';
import type { TrinhDo } from '../demo/duLieu';

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
      return;
    }
    capNhat({ hoSo: { ...form, ten } });
    setLoi('');
    setDaLuu(true);
  }
  return (
    <>
      <TieuDeTrang
        nhan="HÀNH TRÌNH CỦA RIÊNG BẠN"
        ten="Hồ sơ học tập"
        moTa="Để EngMate đồng hành theo trình độ và mục tiêu của bạn."
      />
      <div className="profile-layout">
        <aside className="panel profile-summary">
          <div className="avatar large">{hoSo.ten.slice(0, 1).toUpperCase()}</div>
          <h2>{hoSo.ten}</h2>
          <p className="muted">{hoSo.email}</p>
          <span className="pill purple">{hoSo.trinhDo} · English learner</span>
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
          <div className="tip-box">
            <BieuTuong ten="sparkles" />
            <p>Học đều đặn quan trọng hơn học thật nhiều trong một ngày.</p>
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
                required
                maxLength={60}
                value={form.ten}
                onChange={(e) => setForm({ ...form, ten: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <hr />
          <h2>Cá nhân hóa việc học</h2>
          <label>
            Trình độ tiếng Anh
            <select
              value={form.trinhDo}
              onChange={(e) => setForm({ ...form, trinhDo: e.target.value as TrinhDo })}
            >
              <option value="A2">A2 — Cơ bản</option>
              <option value="B1">B1 — Trung cấp</option>
              <option value="B2">B2 — Trên trung cấp</option>
            </select>
          </label>
          <label>
            Mục tiêu của bạn
            <select
              value={form.mucTieu}
              onChange={(e) => setForm({ ...form, mucTieu: e.target.value })}
            >
              {[
                'Giao tiếp tự tin',
                'Tiếng Anh công việc',
                'Du lịch và khám phá',
                'Chuẩn bị TOEIC',
                'Chuẩn bị IELTS',
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Thời gian học mỗi ngày <strong className="accent">{form.phutMoiNgay} phut</strong>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={form.phutMoiNgay}
              onChange={(e) => setForm({ ...form, phutMoiNgay: Number(e.target.value) })}
            />
            <span className="range-labels">
              <span>10 phút · Nhẹ nhàng</span>
              <span>60 phút · Tập trung</span>
            </span>
          </label>
          {loi && (
            <p role="alert" className="error-text">
              {loi}
            </p>
          )}
          <div className="form-footer">
            <span role="status">
              {daLuu ? 'Đã lưu hồ sơ của bạn.' : 'Thay đổi được lưu trên trình duyệt.'}
            </span>
            <button className="btn primary" type="submit">
              <BieuTuong ten="check" size={18} /> Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
