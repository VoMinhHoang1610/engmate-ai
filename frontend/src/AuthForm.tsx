import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authenticate } from './api/database';
import { Logo } from './components/Logo';
import { LinhThu } from './components/LinhThu';
import { BieuTuong } from './components/BieuTuong';

const INTRO_KEY = 'engmate-auth-intro-done';
function skipIntro() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function AuthForm() {
  const [register, setRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState<'jump' | 'greet' | 'morph' | 'ready'>(() =>
    skipIntro() ? 'ready' : 'jump',
  );
  const [direction, setDirection] = useState('forward');
  const [transitions, setTransitions] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    if (skipIntro()) return;
    const finish = () => {
      setIntro('ready');
      try {
        sessionStorage.setItem(INTRO_KEY, '1');
      } catch {
        /* Storage may be unavailable. */
      }
    };
    const timers = [
      window.setTimeout(() => setIntro('greet'), 780),
      window.setTimeout(() => setIntro('morph'), 2680),
      window.setTimeout(finish, 4000),
    ];
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (media?.matches) {
        timers.forEach(clearTimeout);
        finish();
      }
    };
    media?.addEventListener('change', stop);
    return () => {
      timers.forEach(clearTimeout);
      media?.removeEventListener('change', stop);
    };
  }, []);
  function changeMode(next: boolean) {
    if (busy || intro !== 'ready' || next === register) return;
    setRegister(next);
    setDirection(next ? 'forward' : 'backward');
    setTransitions((n) => n + 1);
    setPassword('');
    setConfirmation('');
    setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (register && password !== confirmation) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await authenticate(
        register,
        register
          ? {
              username: identifier.trim(),
              email: email.trim(),
              display_name: name.trim(),
              password,
            }
          : { identifier: identifier.trim(), password },
      );
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa đăng nhập được. Hãy thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div
      className={`auth-page auth-mode-${register ? 'dang-ky' : 'dang-nhap'}${register ? ' is-register' : ''} auth-intro-${intro}`}
    >
      <header className="auth-header">
        <a className="auth-brand" href="#dang-nhap" aria-label="EngMate AI">
          <Logo />
        </a>
      </header>
      <main id="noi-dung" className="auth-main" tabIndex={-1}>
        {intro !== 'ready' && (
          <div className="auth-intro" role="status" aria-live="polite">
            <div className="auth-intro-aura" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-intro-mate" aria-hidden="true">
              <LinhThu size={196} camXuc={intro === 'morph' ? 'celebrating' : 'welcome'} />
            </div>
            <p className={`auth-intro-speech${intro !== 'jump' ? ' is-on' : ''}`}>
              Chào mừng đến với học tiếng anh cùng EngMate!
            </p>
          </div>
        )}
        <div
          className={`auth-stage${register ? ' is-register' : ''} ${intro === 'ready' ? 'is-intro-reveal' : 'is-intro-hidden'}`}
          data-auth-direction={direction}
          aria-hidden={intro !== 'ready' || undefined}
          inert={intro !== 'ready' || undefined}
        >
          <div className="auth-stage-glow" aria-hidden="true" />
          <section className="auth-form-pane" aria-labelledby="auth-title">
            <div className="auth-switcher">
              {transitions > 0 && (
                <div
                  key={transitions}
                  className={`auth-roll-fx to-${direction}`}
                  aria-hidden="true"
                >
                  <span className="auth-roll-ribbon" />
                  <span className="auth-roll-spark s1" />
                  <span className="auth-roll-spark s2" />
                  <span className="auth-roll-spark s3" />
                </div>
              )}
              <div key={String(register)} className={`auth-switch-content scene-${direction}`}>
                <h1 id="auth-title">
                  <span className="auth-title-text">
                    {register ? 'Tạo tài khoản' : 'Đăng nhập'}
                  </span>
                </h1>
                <form onSubmit={(e) => void submit(e)}>
                  {register && (
                    <label>
                      Tên hiển thị
                      <input
                        required
                        maxLength={60}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    {register ? 'Tên tài khoản' : 'Tài khoản hoặc email'}
                    <input
                      required
                      autoComplete="username"
                      maxLength={register ? 64 : 254}
                      minLength={register ? 3 : 1}
                      pattern={register ? '[a-zA-Z0-9_.-]+' : undefined}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </label>
                  {register && (
                    <label>
                      Email
                      <input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    Mật khẩu
                    <input
                      required
                      type="password"
                      minLength={register ? 10 : 1}
                      maxLength={128}
                      autoComplete={register ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  {register && (
                    <small className="muted">
                      Từ 10 đến 128 ký tự. Tên tài khoản chỉ dùng chữ, số, dấu chấm, gạch dưới hoặc
                      gạch ngang.
                    </small>
                  )}
                  {error && (
                    <p className="error-text" role="alert">
                      {error}
                    </p>
                  )}
                  {register && (
                    <label>
                      Nhập lại mật khẩu
                      <input
                        required
                        type="password"
                        autoComplete="new-password"
                        minLength={10}
                        maxLength={128}
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                      />
                    </label>
                  )}
                  <button className="btn primary full-width" disabled={busy}>
                    {busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
                    <BieuTuong ten="arrow" size={18} />
                  </button>
                  <button
                    className="text-button auth-return"
                    type="button"
                    disabled={busy}
                    onClick={() => changeMode(!register)}
                  >
                    {register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
                  </button>
                </form>
                <p className="auth-storage-note">
                  Lịch sử hội thoại được lưu riêng theo tài khoản.
                </p>
              </div>
            </div>
          </section>
          <aside className="auth-slide-pane" aria-label="Chuyển chế độ tài khoản">
            <div className="auth-slide-wave" aria-hidden="true">
              <svg viewBox="0 0 80 560" preserveAspectRatio="none">
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
            <div
              className="auth-slide-face face-welcome"
              aria-hidden={register}
              inert={register || undefined}
            >
              <LinhThu size={132} camXuc="welcome" />
              <h2>Xin chào!</h2>
              <p>Bắt đầu hành trình tiếng Anh cùng Mate.</p>
              <button
                type="button"
                className="auth-slide-cta"
                disabled={busy}
                onClick={() => changeMode(true)}
              >
                Đăng ký
              </button>
            </div>
            <div
              className="auth-slide-face face-return"
              aria-hidden={!register}
              inert={!register || undefined}
            >
              <LinhThu size={132} camXuc="celebrating" />
              <h2>Chào mừng bạn tới EngMate-AI!</h2>
              <p>Cùng nhau tìm hiểu những điều thú vị trong hành trình học tiếng Anh nào.</p>
              <button
                type="button"
                className="auth-slide-cta"
                disabled={busy}
                onClick={() => changeMode(false)}
              >
                Đăng nhập
              </button>
            </div>
            <div className="auth-mode-switch" role="group" aria-label="Chọn đăng nhập hoặc đăng ký">
              <button
                type="button"
                className={!register ? 'active' : ''}
                aria-label="Chọn đăng nhập"
                aria-pressed={!register}
                disabled={busy}
                onClick={() => changeMode(false)}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={register ? 'active' : ''}
                aria-label="Chọn đăng ký"
                aria-pressed={register}
                disabled={busy}
                onClick={() => changeMode(true)}
              >
                Đăng ký
              </button>
            </div>
          </aside>
        </div>
      </main>
      <footer className="auth-footer">© 2026 EngMate-AI</footer>
    </div>
  );
}
