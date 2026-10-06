const providers = ['Google', 'Facebook', 'GitHub'] as const;

function LogoNhaCungCap({ ten }: { ten: (typeof providers)[number] }) {
  if (ten === 'Google') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285f4"
          d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.36Z"
        />
        <path
          fill="#34a853"
          d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.06.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#fbbc05"
          d="M6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.07a10 10 0 0 0 0 9.06l3.34-2.59Z"
        />
        <path
          fill="#ea4335"
          d="M12 5.96c1.47 0 2.79.51 3.83 1.52L18.7 4.6A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"
        />
      </svg>
    );
  }
  if (ten === 'Facebook') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#1877f2" />
        <path
          fill="#fff"
          d="M13.7 23v-8h2.7l.4-3.2h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V5.4c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2H7.1V15H10v8h3.7Z"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.14c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.53-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.42.36.79 1.06.79 2.14v3.18c0 .31.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** Các lựa chọn nhà cung cấp không tự tạo phiên khi OAuth chưa được kết nối. */
export function DangNhapMangXaHoi({ onChon }: { onChon: (provider: string) => void }) {
  return (
    <div className="auth-social-grid" role="group" aria-label="Đăng nhập bằng tài khoản khác">
      {providers.map((provider) => (
        <button
          className={`social-login${provider === 'Google' ? ' social-google' : ''}`}
          key={provider}
          type="button"
          aria-label={`Tiếp tục với ${provider}`}
          onClick={() => onChon(provider)}
        >
          <LogoNhaCungCap ten={provider} />
          <span>{provider === 'Google' ? 'Tiếp tục với Google' : provider}</span>
        </button>
      ))}
    </div>
  );
}
