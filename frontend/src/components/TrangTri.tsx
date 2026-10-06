import { BieuTuong } from './BieuTuong';
import { LinhThu } from './LinhThu';

/** Hình trang trí bằng CSS, không nhận focus hoặc thông báo cho trình đọc màn hình. */
export function TrangTri({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`companion-art${compact ? ' compact' : ''}`} aria-hidden="true">
      <div className="companion-orbit orbit-outer" />
      <div className="companion-orbit orbit-inner" />
      <span className="companion-star star-one">✦</span>
      <span className="companion-star star-two">✦</span>
      <span className="companion-dot dot-one" />
      <span className="companion-dot dot-two" />
      <div className="companion-bubble bubble-chat">
        <BieuTuong ten="chat" size={25} />
      </div>
      <div className="companion-bubble bubble-sound">
        <BieuTuong ten="volume" size={23} />
      </div>
      <div className="companion-bubble bubble-check">
        <BieuTuong ten="check" size={20} />
      </div>
      <LinhThu size={220} />
    </div>
  );
}
