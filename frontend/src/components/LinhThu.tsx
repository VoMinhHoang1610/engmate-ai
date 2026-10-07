import type { CSSProperties } from 'react';

export type CamXucMate = 'welcome' | 'listening' | 'thinking' | 'celebrating' | 'encouraging';

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
