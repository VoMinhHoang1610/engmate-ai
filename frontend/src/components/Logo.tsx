/** Logo vector tái dựng theo mẫu thương hiệu, dùng chung cho các vị trí trong app. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo${compact ? ' logo-compact' : ''}`}>
      <img
        className="logo-mark"
        src={`${import.meta.env.BASE_URL}engmate-mark.svg`}
        width="40"
        height="50"
        alt={compact ? 'EngMate AI' : ''}
      />
      {!compact && (
        <span className="logo-copy">
          <span className="logo-wordmark">
            EngMate <span className="logo-ai">AI</span>
          </span>
        </span>
      )}
    </span>
  );
}
