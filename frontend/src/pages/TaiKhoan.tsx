import { useState, type FormEvent } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { Logo } from '../components/Logo';
import { useDuLieu } from '../demo/LuuTru';

export function TaiKhoan() {
  const { hoSo, capNhat, daDangNhap } = useDuLieu();
  const [cheDo, setCheDo] = useState<'dang-nhap' | 'dang-ky' | 'quen-mat-khau'>('dang-nhap');
  const [ten, setTen] = useState('');
  const [email, setEmail] = useState('');
  const [thongBao, setThongBao] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (cheDo === 'quen-mat-khau') {
      setThongBao('Yêu cầu đã được ghi nhận trên trình duyệt này.');
      return;
    }
    capNhat({ daDangNhap: true, hoSo: { ...hoSo, email, ten: ten.trim() || hoSo.ten } });
    setThongBao('Đã vào tài khoản.');
  }
  return (
    <>
      <div className="account-layout">
        <div className="account-art">
          <Logo />
          <h2>
            Bạn không học
            <br />
            một mình.
          </h2>
          <p>
            Một người bạn luôn sẵn sàng lắng nghe,
            <br />
            cùng bạn tiến bộ từng ngày.
          </p>
          <div className="account-orb" aria-hidden="true">
            <Logo compact />
          </div>
          <span className="pill">Your English journey starts here.</span>
        </div>
        <section className="panel account-form">
          {daDangNhap ? (
            <>
              <div className="icon-tile green">
                <BieuTuong ten="check" />
              </div>
              <h2>Chào mừng, {hoSo.ten}!</h2>
              <p className="muted">Tiếp tục hành trình học tiếng Anh của bạn.</p>
              <div className="info-row">
                <span>Email</span>
                <strong>{hoSo.email}</strong>
              </div>
              <a className="btn primary full-width" href="#ho-so">
                Xem hồ sơ học tập <BieuTuong ten="arrow" size={17} />
              </a>
              <button
                className="btn secondary full-width"
                onClick={() => {
                  capNhat({ daDangNhap: false });
                  setThongBao('Đã đăng xuất tài khoản.');
                }}
              >
                <BieuTuong ten="logout" size={18} /> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <div className="tabs">
                <button
                  className={cheDo === 'dang-nhap' ? 'active' : ''}
                  onClick={() => {
                    setCheDo('dang-nhap');
                    setThongBao('');
                  }}
                >
                  Đăng nhập
                </button>
                <button
                  className={cheDo === 'dang-ky' ? 'active' : ''}
                  onClick={() => {
                    setCheDo('dang-ky');
                    setThongBao('');
                  }}
                >
                  Đăng ký
                </button>
              </div>
              <h2>
                {cheDo === 'quen-mat-khau'
                  ? 'Quên mật khẩu?'
                  : cheDo === 'dang-ky'
                    ? 'Bắt đầu hành trình mới'
                    : 'Rất vui được gặp lại bạn'}
              </h2>
              <p className="muted">
                {cheDo === 'quen-mat-khau'
                  ? 'Nhập email để thử luồng khôi phục tài khoản.'
                  : 'Trải nghiệm giao diện tài khoản EngMate.'}
              </p>
              <form onSubmit={submit}>
                {cheDo === 'dang-ky' && (
                  <label>
                    Họ và tên
                    <input
                      placeholder="Tên của bạn"
                      value={ten}
                      onChange={(e) => setTen(e.target.value)}
                      required
                      maxLength={60}
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    type="email"
                    placeholder="ban@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                {cheDo !== 'quen-mat-khau' && (
                  <label>
                    Mật khẩu
                    <input
                      type="password"
                      placeholder="Tối thiểu 8 ký tự"
                      minLength={8}
                      required
                      autoComplete={cheDo === 'dang-ky' ? 'new-password' : 'current-password'}
                    />
                  </label>
                )}
                {cheDo === 'dang-nhap' && (
                  <button
                    type="button"
                    className="text-button forgot-link"
                    onClick={() => {
                      setCheDo('quen-mat-khau');
                      setThongBao('');
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                )}
                <button className="btn primary full-width" type="submit">
                  {cheDo === 'quen-mat-khau'
                    ? 'Gửi yêu cầu'
                    : cheDo === 'dang-ky'
                      ? 'Tạo tài khoản'
                      : 'Đăng nhập'}
                  <BieuTuong ten="arrow" size={18} />
                </button>
              </form>
            </>
          )}
          <p className="notice">Thông tin học tập được lưu trên trình duyệt này.</p>
          <p role="status" className="feedback">
            {thongBao}
          </p>
        </section>
      </div>
    </>
  );
}
