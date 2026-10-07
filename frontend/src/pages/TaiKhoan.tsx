import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { LinhThu } from '../components/LinhThu';
import { Logo } from '../components/Logo';
import { DangNhapMangXaHoi } from '../components/DangNhapMangXaHoi';
import { useDuLieu } from '../demo/LuuTru';

type CheDoTaiKhoan = 'dang-nhap' | 'dang-ky' | 'quen-mat-khau';
type IntroPhase = 'jump' | 'greet' | 'morph' | 'ready';

const INTRO_STORAGE_KEY = 'engmate-auth-intro-done';
const LOI_CHAO_INTRO = 'Chào mừng đến với học tiếng anh cùng EngMate!';

function boQuaIntroNgay(daDangNhap: boolean, giamChuyenDong: boolean): boolean {
  if (daDangNhap || giamChuyenDong) return true;
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  try {
    return sessionStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function TaiKhoan() {
  const { hoSo, capNhat, daDangNhap, loiLuu, caiDat } = useDuLieu();
  const [cheDo, setCheDo] = useState<CheDoTaiKhoan>('dang-nhap');
  const [huong, setHuong] = useState<'forward' | 'backward'>('forward');
  const [ten, setTen] = useState('');
  const [taiKhoan, setTaiKhoan] = useState('');
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [provider, setProvider] = useState('');
  const [lanChuyen, setLanChuyen] = useState(0);
  const [soKyTu, setSoKyTu] = useState(0);
  const [intro, setIntro] = useState<IntroPhase>(() =>
    boQuaIntroNgay(daDangNhap, caiDat.giamChuyenDong) ? 'ready' : 'jump',
  );
  const khung = useRef<HTMLDivElement>(null);
  const noiDung = useRef<HTMLDivElement>(null);
  const chieuCao = useRef(0);
  const chuyenCanh = useRef<Animation | null>(null);

  function ketThucIntro() {
    setIntro('ready');
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      // The intro still finishes when the browser blocks session storage.
    }
  }

  useEffect(() => {
    if (intro !== 'jump') return;
    if (caiDat.giamChuyenDong || daDangNhap) return;
    const greet = window.setTimeout(() => setIntro('greet'), 780);
    const morph = window.setTimeout(() => setIntro('morph'), 2680);
    const done = window.setTimeout(() => {
      ketThucIntro();
    }, 4000);
    return () => {
      window.clearTimeout(greet);
      window.clearTimeout(morph);
      window.clearTimeout(done);
    };
    // Chỉ chạy chuỗi intro một lần khi mount ở pha jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timers must survive jump→greet→morph
  }, []);

  useEffect(() => {
    if (intro === 'greet' || intro === 'morph') {
      const interval = setInterval(() => {
        setSoKyTu((n) => (n < LOI_CHAO_INTRO.length ? n + 1 : n));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [intro]);

  function doiCheDo(next: CheDoTaiKhoan) {
    if (next === cheDo || intro !== 'ready') return;
    chieuCao.current = khung.current?.getBoundingClientRect().height ?? 0;
    setHuong(next === 'dang-nhap' ? 'backward' : 'forward');
    setCheDo(next);
    setLanChuyen((value) => value + 1);
    setThongBao('');
    setProvider('');
    setMatKhau('');
    setXacNhan('');
  }

  useLayoutEffect(() => {
    const frame = khung.current;
    const content = noiDung.current;
    if (!frame || !content || intro !== 'ready') {
      chuyenCanh.current?.cancel();
      chieuCao.current = 0;
      return;
    }
    const previous =
      chuyenCanh.current?.playState === 'running'
        ? frame.getBoundingClientRect().height
        : chieuCao.current;
    const next = content.offsetHeight;
    chuyenCanh.current?.cancel();
    chieuCao.current = next;
    const giamDong =
      caiDat.giamChuyenDong ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if (!previous || previous === next || !frame.animate || giamDong) return;
    chuyenCanh.current = frame.animate([{ height: `${previous}px` }, { height: `${next}px` }], {
      duration: 520,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }, [cheDo, daDangNhap, provider, caiDat.giamChuyenDong, intro]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (media?.matches) {
        chuyenCanh.current?.cancel();
        if (intro !== 'ready') ketThucIntro();
      }
    };
    media?.addEventListener('change', stop);
    return () => {
      media?.removeEventListener('change', stop);
      chuyenCanh.current?.cancel();
    };
  }, [intro]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (cheDo === 'quen-mat-khau') {
      setThongBao('Yêu cầu đã được ghi nhận trên trình duyệt này.');
      return;
    }
    if (cheDo === 'dang-ky' && matKhau !== xacNhan) {
      setThongBao('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (cheDo === 'dang-nhap') {
      if (taiKhoan !== 'abc' || matKhau !== '123') {
        setThongBao('Tài khoản hoặc mật khẩu không đúng (Thử abc / 123)');
        return;
      }
    }
    capNhat({
      daDangNhap: true,
      hoSo: {
        ...hoSo,
        email: email || hoSo.email,
        ten: ten.trim() || hoSo.ten,
        taiKhoan: taiKhoan || hoSo.taiKhoan,
      },
    });
    setThongBao('Đã vào tài khoản.');
  }

  const dangKy = cheDo === 'dang-ky';
  const khoiPhuc = cheDo === 'quen-mat-khau';
  const dangIntro = !daDangNhap && intro !== 'ready';
  const tieuDe = daDangNhap
    ? `Chào mừng, ${hoSo.ten}!`
    : khoiPhuc
      ? 'Quên mật khẩu?'
      : dangKy
        ? 'Tạo tài khoản'
        : 'Đăng nhập';

  return (
    <div
      className={`auth-page auth-mode-${cheDo}${dangKy ? ' is-register' : ''}${khoiPhuc ? ' is-recovery' : ''}${dangIntro ? ` auth-intro-${intro}` : ' auth-intro-ready'}`}
    >
      <header className="auth-header">
        <a className="auth-brand" href="#tong-quan" aria-label="EngMate AI — Tổng quan">
          <Logo />
        </a>
      </header>
      <main id="noi-dung" className="auth-main" tabIndex={-1}>
        {loiLuu && (
          <p className="notice" role="alert">
            {loiLuu}
          </p>
        )}
        {dangIntro && (
          <div className="auth-intro" role="status" aria-live="polite">
            <div className="auth-intro-aura" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-intro-mate" aria-hidden="true">
              <LinhThu size={196} camXuc={intro === 'morph' ? 'celebrating' : 'welcome'} />
            </div>
            <p
              className={`auth-intro-speech${intro === 'greet' || intro === 'morph' ? ' is-on' : ''}`}
            >
              {LOI_CHAO_INTRO.slice(0, soKyTu)}
              <span
                className="cursor-blink"
                aria-hidden="true"
                style={{ opacity: soKyTu < LOI_CHAO_INTRO.length ? 1 : 0 }}
              >
                |
              </span>
            </p>
          </div>
        )}
        {daDangNhap ? (
          <section className="panel account-form auth-signed-in" aria-labelledby="auth-title">
            <h1 id="auth-title">
              <span className="auth-title-text">{tieuDe}</span>
            </h1>
            <div className="icon-tile green">
              <BieuTuong ten="check" />
            </div>
            <div className="info-row">
              <span>Email</span>
              <strong>{hoSo.email}</strong>
            </div>
            <a className="btn primary full-width" href="#tong-quan">
              Vào không gian học tập <BieuTuong ten="arrow" size={17} />
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
            <p className="auth-storage-note">Thông tin học tập được lưu trên trình duyệt này.</p>
            <p role="status" className="feedback">
              {thongBao}
            </p>
          </section>
        ) : (
          <div
            className={`auth-stage${dangKy ? ' is-register' : ''}${khoiPhuc ? ' is-recovery' : ''}${dangIntro ? ' is-intro-hidden' : ' is-intro-reveal'}`}
            data-auth-direction={huong}
            aria-hidden={dangIntro && intro !== 'morph' ? true : undefined}
            inert={dangIntro && intro !== 'morph' ? true : undefined}
          >
            <div className="auth-stage-glow" aria-hidden="true" />
            <section className="auth-form-pane" aria-labelledby="auth-title">
              <div ref={khung} className="auth-switcher">
                {lanChuyen > 0 && !khoiPhuc && !caiDat.giamChuyenDong && intro === 'ready' && (
                  <div
                    key={`fx-${lanChuyen}`}
                    className={`auth-roll-fx to-${huong}`}
                    aria-hidden="true"
                  >
                    <span className="auth-roll-ribbon" />
                    <span className="auth-roll-spark s1" />
                    <span className="auth-roll-spark s2" />
                    <span className="auth-roll-spark s3" />
                  </div>
                )}
                <div
                  ref={noiDung}
                  key={cheDo}
                  className={`auth-switch-content scene-${huong}${khoiPhuc ? ' is-recovery-content' : ''}`}
                >
                  <h1 id="auth-title">
                    <span className="auth-title-text">{tieuDe}</span>
                  </h1>
                  <form onSubmit={submit}>
                    {dangKy && (
                      <label>
                        Họ và tên
                        <input
                          placeholder="Tên của bạn"
                          value={ten}
                          onChange={(e) => setTen(e.target.value)}
                          required
                          maxLength={60}
                          autoComplete="name"
                        />
                      </label>
                    )}
                    {!khoiPhuc && (
                      <label>
                        Tài khoản
                        <input
                          type="text"
                          placeholder="Tên đăng nhập"
                          value={taiKhoan}
                          onChange={(e) => setTaiKhoan(e.target.value)}
                          required
                          autoComplete="username"
                        />
                      </label>
                    )}
                    {(dangKy || khoiPhuc) && (
                      <label>
                        Email
                        <input
                          type="email"
                          placeholder="ban@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </label>
                    )}
                    {!khoiPhuc && (
                      <label>
                        Mật khẩu
                        <input
                          type="password"
                          placeholder="Tối thiểu 8 ký tự"
                          minLength={1}
                          required
                          value={matKhau}
                          onChange={(e) => setMatKhau(e.target.value)}
                          autoComplete={dangKy ? 'new-password' : 'current-password'}
                        />
                      </label>
                    )}
                    {dangKy && (
                      <label>
                        Nhập lại mật khẩu
                        <input
                          type="password"
                          placeholder="Tối thiểu 8 ký tự"
                          minLength={1}
                          required
                          value={xacNhan}
                          onChange={(e) => setXacNhan(e.target.value)}
                          autoComplete="new-password"
                        />
                      </label>
                    )}
                    {cheDo === 'dang-nhap' && (
                      <button
                        type="button"
                        className="text-button forgot-link"
                        onClick={() => doiCheDo('quen-mat-khau')}
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                    <button className="btn primary full-width" type="submit">
                      {khoiPhuc ? 'Gửi yêu cầu' : dangKy ? 'Tạo tài khoản' : 'Đăng nhập'}
                      <BieuTuong ten="arrow" size={18} />
                    </button>
                  </form>
                  {!khoiPhuc && (
                    <div className="auth-social-section">
                      <div className="auth-divider">
                        <span>hoặc tiếp tục với</span>
                      </div>
                      <DangNhapMangXaHoi
                        onChon={(name) => {
                          chieuCao.current = khung.current?.getBoundingClientRect().height ?? 0;
                          setProvider(name);
                          setThongBao('');
                        }}
                      />
                      {provider && (
                        <p className="auth-provider-note" role="status">
                          Đăng nhập bằng {provider} hiện chưa khả dụng. Bạn có thể dùng email.
                        </p>
                      )}
                    </div>
                  )}
                  {khoiPhuc && (
                    <button
                      className="text-button auth-return"
                      onClick={() => doiCheDo('dang-nhap')}
                    >
                      Quay lại đăng nhập
                    </button>
                  )}
                  <p className="auth-storage-note">
                    Thông tin học tập được lưu trên trình duyệt này.
                  </p>
                  <p role="status" className="feedback">
                    {thongBao}
                  </p>
                </div>
              </div>
            </section>

            <aside className="auth-slide-pane" aria-label="Chuyển chế độ tài khoản">
              <div className="auth-slide-wave" aria-hidden="true">
                <svg viewBox="0 0 80 560" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    className="auth-wave-path"
                    d="M48 0C28 70 68 120 42 190c-28 76 24 120 6 200-12 54 18 100 32 170H80V0Z"
                  />
                </svg>
              </div>
              <div className="auth-slide-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="auth-slide-face face-welcome">
                <LinhThu size={132} camXuc="welcome" />
                <h2>Xin chào!</h2>
                <p>Bắt đầu hành trình tiếng Anh cùng Mate.</p>
                <button
                  type="button"
                  className="auth-slide-cta"
                  aria-pressed={false}
                  onClick={() => doiCheDo('dang-ky')}
                >
                  Đăng ký
                </button>
              </div>
              <div className="auth-slide-face face-return">
                <LinhThu size={132} camXuc="celebrating" />
                <h2>Chào mừng bạn tới EngMate-AI!</h2>
                <p>Cùng nhau tìm hiều những điều thú vị trong hành trình học tiếng Anh nào.</p>
                <button
                  type="button"
                  className="auth-slide-cta"
                  aria-pressed={false}
                  onClick={() => doiCheDo('dang-nhap')}
                >
                  Đăng nhập
                </button>
              </div>
              <div
                className="auth-mode-switch"
                role="group"
                aria-label="Chọn đăng nhập hoặc đăng ký"
              >
                <button
                  type="button"
                  className={cheDo === 'dang-nhap' ? 'active' : ''}
                  aria-pressed={cheDo === 'dang-nhap'}
                  onClick={() => doiCheDo('dang-nhap')}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className={cheDo === 'dang-ky' ? 'active' : ''}
                  aria-pressed={cheDo === 'dang-ky'}
                  onClick={() => doiCheDo('dang-ky')}
                >
                  Đăng ký
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
      <footer className="auth-footer">© 2026 EngMate-AI</footer>
    </div>
  );
}
