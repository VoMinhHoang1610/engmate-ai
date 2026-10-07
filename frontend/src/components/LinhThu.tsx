import type { CSSProperties } from 'react';

export type CamXucMate =
  'welcome' | 'listening' | 'thinking' | 'celebrating' | 'encouraging' | 'support';

/** Mate luôn đi kèm nội dung/trạng thái bằng chữ; hình chỉ bổ sung cảm xúc. */
export function LinhThu({
  camXuc = 'welcome',
  size = 160,
}: {
  camXuc?: CamXucMate;
  size?: number;
}) {
  return (
    <span
      className={`mate mate--${camXuc}`}
      data-mate-mood={camXuc}
      aria-hidden="true"
      style={{ '--mate-size': `${size}px`, '--mate-scale': size / 220 } as CSSProperties}
    >
      <span className="mate-canvas">
        <span className="companion-shadow" />
        <span className="companion-body">
          <span className="mate-arm arm-left" />
          <span className="mate-arm arm-right" />
          <span className="companion-face">
            <span className="companion-eye" />
            <span className="companion-eye" />
            <span className="companion-smile" />
          </span>
          <span className="companion-cheek cheek-left" />
          <span className="companion-cheek cheek-right" />
          {camXuc === 'listening' && <span className="mate-headphones" />}
          {camXuc === 'support' && (
            <svg className="mate-phone" viewBox="0 0 60 112" fill="none">
              <path
                d="M29 80v6c-19 2 19 8 0 10s-19 8 0 10l-3 4"
                stroke="#071540"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M34 7H20c-5 0-8 3-8 8v9c0 4 2 5 5 6l6 2c5 9 5 16 0 25l-6 2c-3 1-5 3-5 7v9c0 5 3 8 8 8h14c6 0 9-3 11-9 10-23 10-36 0-58-2-6-5-9-11-9Z"
                fill="#00a6e8"
                stroke="#071540"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M36 15c8 19 8 36 0 56"
                stroke="#8ce6fa"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <rect
                x="9"
                y="11"
                width="15"
                height="17"
                rx="5"
                fill="#071540"
                stroke="#8ce6fa"
                strokeWidth="3"
              />
              <rect
                x="9"
                y="61"
                width="15"
                height="17"
                rx="5"
                fill="#071540"
                stroke="#8ce6fa"
                strokeWidth="3"
              />
            </svg>
          )}
        </span>
        {camXuc === 'thinking' && (
          <span className="mate-thought">
            <i />
            <i />
            <i />
          </span>
        )}
        {camXuc === 'celebrating' && (
          <span className="mate-confetti">
            {Array.from({ length: 8 }, (_, index) => (
              <i key={index} />
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
