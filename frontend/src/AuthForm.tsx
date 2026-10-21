import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authenticate } from './api/database';
import { Logo } from './components/Logo';
import { LinhThu } from './components/LinhThu';
import { BieuTuong } from './components/BieuTuong';
import './auth-restored.css';

const INTRO_KEY = 'engmate-auth-intro-done';
function skipIntro() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function AuthForm({
  initialRegister = false,
  onOpenLanding,
}: {
  initialRegister?: boolean;
  onOpenLanding?: () => void;
} = {}) {
  const [register, setRegister] = useState(initialRegister);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState<'jump' | 'greet' | 'morph' | 'ready'>(() =>
    skipIntro() || onOpenLanding ? 'ready' : 'jump',
  );
  const [direction, setDirection] = useState('forward');
  const lock = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setRegister(initialRegister));
  }, [initialRegister]);

  useEffect(() => {
    if (skipIntro() || onOpenLanding) return;
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
  }, [onOpenLanding]);

  function changeMode(next: boolean) {
    if (busy || intro !== 'ready' || next === register) return;
    setRegister(next);
    setDirection(next ? 'forward' : 'backward');
    setPassword('');
    setConfirmation('');
    setError('');
  }

  function handleSocialLogin(provider: 'Google' | 'GitHub' | 'Facebook') {
    if (busy) return;
    setError(
      `Đăng nhập nhanh bằng ${provider} đang được cấu hình OAuth. Vui lòng dùng tài khoản bên dưới.`,
    );
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
      className={`auth-page tutor-auth auth-minimal auth-mode-${register ? 'dang-ky' : 'dang-nhap'}${register ? ' is-register' : ''} auth-intro-${intro}`}
    >
      <header className="auth-header">
        <a
          className="auth-brand"
          href="#dang-nhap"
          aria-label="EngMate AI"
          onClick={(e) => {
            if (onOpenLanding) {
              e.preventDefault();
              onOpenLanding();
            }
          }}
        >
          <Logo />
        </a>
        {onOpenLanding && (
          <button type="button" className="auth-back-landing-btn" onClick={onOpenLanding}>
            <span>← Trang chủ</span>
          </button>
        )}
      </header>

      <main id="noi-dung" className="auth-main" tabIndex={-1}>
        {intro !== 'ready' && (
          <div className="auth-intro" role="status" aria-live="polite">
            <div className="auth-intro-mate" aria-hidden="true">
              <LinhThu size={160} camXuc={intro === 'morph' ? 'celebrating' : 'welcome'} />
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
          <div className="auth-slide-wave" aria-hidden="true" />

          <section className="auth-form-pane" aria-labelledby="auth-title">
            <div className="auth-switcher">
              <div key={String(register)} className={`auth-switch-content scene-${direction}`}>
                <h1 id="auth-title">
                  <span className="auth-title-text">
                    {register ? 'Tạo tài khoản' : 'Đăng nhập'}
                  </span>
                </h1>

                {/* SOCIAL AUTH: Google, GitHub, Facebook */}
                <div className="auth-social-grid" role="group" aria-label="Đăng nhập mạng xã hội">
                  <button
                    type="button"
                    className="social-login auth-social-btn social-google"
                    disabled={busy}
                    onClick={() => handleSocialLogin('Google')}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.2c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7C.9 8.5.5 10.2.5 12s.4 3.5 1.1 5l3.7-2.8z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3 0 5.5-1 7.3-2.7l-3.7-2.9c-1 .7-2.2 1.1-3.6 1.1-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.4 7.4 23 12 23z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    className="social-login auth-social-btn social-github"
                    disabled={busy}
                    onClick={() => handleSocialLogin('GitHub')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.38-3.88-1.38-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                    </svg>
                    <span>GitHub</span>
                  </button>

                  <button
                    type="button"
                    className="social-login auth-social-btn social-facebook"
                    disabled={busy}
                    onClick={() => handleSocialLogin('Facebook')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="#1877F2"
                      aria-hidden="true"
                    >
                      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>

                <div className="auth-divider" aria-hidden="true">
                  <span>hoặc</span>
                </div>

                <form onSubmit={(e) => void submit(e)} className="auth-minimal-form">
                  {register && (
                    <label className="auth-field">
                      Tên hiển thị
                      <span className="auth-input-wrap">
                        <input
                          required
                          maxLength={60}
                          autoComplete="name"
                          placeholder="Ví dụ: Minh Quân"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </span>
                    </label>
                  )}

                  <label className="auth-field">
                    {register ? 'Tên tài khoản' : 'Tài khoản hoặc email'}
                    <span className="auth-input-wrap">
                      <input
                        required
                        autoComplete="username"
                        maxLength={register ? 64 : 254}
                        minLength={register ? 3 : 1}
                        pattern={register ? '[a-zA-Z0-9_.-]+' : undefined}
                        placeholder={register ? 'minhquan_99' : 'Nhập username hoặc email'}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                    </span>
                  </label>

                  {register && (
                    <label className="auth-field">
                      Email
                      <span className="auth-input-wrap">
                        <input
                          required
                          type="email"
                          maxLength={254}
                          autoComplete="email"
                          placeholder="ban@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </span>
                    </label>
                  )}

                  <label className="auth-field">
                    Mật khẩu
                    <span className="auth-input-wrap">
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        minLength={register ? 10 : 1}
                        maxLength={128}
                        autoComplete={register ? 'new-password' : 'current-password'}
                        placeholder={register ? 'Tối thiểu 10 ký tự' : 'Nhập mật khẩu'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="auth-pwd-toggle"
                        aria-hidden="true"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </button>
                    </span>
                  </label>

                  {register && (
                    <label className="auth-field">
                      Nhập lại mật khẩu
                      <span className="auth-input-wrap">
                        <input
                          required
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          minLength={10}
                          maxLength={128}
                          placeholder="Nhập lại mật khẩu"
                          value={confirmation}
                          onChange={(e) => setConfirmation(e.target.value)}
                        />
                      </span>
                    </label>
                  )}

                  {error && (
                    <p className="error-text" role="alert">
                      {error}
                    </p>
                  )}

                  <button className="btn primary full-width auth-submit-btn" disabled={busy}>
                    <span>{busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}</span>
                    <BieuTuong ten="arrow" size={16} />
                  </button>
                </form>

                <div className="auth-switch-footer">
                  <span>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
                  <button
                    className="auth-switch-link"
                    type="button"
                    aria-label={
                      register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'
                    }
                    disabled={busy}
                    onClick={() => changeMode(!register)}
                  >
                    {register ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                </div>
              </div>
            </div>
          </section>
          <aside className="auth-slide-pane" aria-label="Chuyển chế độ tài khoản">
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
              <h2>Chào bạn, mình là Mate!</h2>
              <p>Thầy Mate đồng hành cùng bạn, từ lời chào đầu tiên.</p>
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
              <h2>Chào mừng bạn trở lại!</h2>
              <p>Cùng Mate tiếp tục hành trình tiếng Anh.</p>
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
    </div>
  );
}
