import { LinhThu, type CamXucMate } from '../components/LinhThu';

const stars = [
  [140, 220],
  [270, 390],
  [410, 150],
  [1280, 270],
  [1170, 610],
  [1310, 740],
  [240, 720],
  [760, 180],
  [1040, 420],
  [570, 760],
  [1100, 180],
];

export function TutorBackdrop() {
  return (
    <div className="tutor-backdrop" aria-hidden="true">
      {/* Cực quang phát sáng chuyển động đa chiều */}
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />
      <div className="aurora-mesh" />

      {/* Hiệu ứng sao băng lướt qua bầu trời */}
      <div className="shooting-star shooting-star-1" />
      <div className="shooting-star shooting-star-2" />

      {/* Đám mây ánh sáng gốc kết hợp hiệu ứng nổi lơ lửng */}
      <img className="ambient-violet" src="/tutor/imgAmbientViolet.svg" alt="" />
      <img className="ambient-cyan" src="/tutor/imgAmbientCyan.svg" alt="" />

      {/* Các ngôi sao nhấp nháy đa nhịp điệu */}
      {stars.map(([x, y], i) => (
        <img
          key={i}
          className={`ambient-star star-${i % 3}`}
          src={`/tutor/imgAmbientStar${i}.svg`}
          alt=""
          style={{ left: `${x / 14.4}%`, top: `${y / 9}%` }}
        />
      ))}
    </div>
  );
}

export function TeacherMate({
  mood = 'welcome',
  small = false,
  compact = false,
}: {
  mood?: CamXucMate;
  small?: boolean;
  /** Extra-small avatar for dense UI (landing cards, inline chips). */
  compact?: boolean;
}) {
  const mateSize = compact ? 52 : small ? 232 : 290;
  return (
    <div
      className={`teacher-mate${compact ? ' teacher-mate--compact' : small ? ' teacher-mate--small' : ''}`}
      aria-label="Mate, linh thú hướng dẫn học tiếng Anh"
      role="img"
    >
      {!compact && (
        <div className="teacher-orbit" aria-hidden="true">
          <img className="orbit-glow" src="/tutor/imgAmbientCyan1.svg" alt="" />
          <img className="orbit-0" src="/tutor/imgOrbit0.svg" alt="" />
          <img className="orbit-1" src="/tutor/imgOrbit1.svg" alt="" />
          <img className="orbit-2" src="/tutor/imgOrbit2.svg" alt="" />
        </div>
      )}
      <LinhThu size={mateSize} camXuc={mood} />
      {!compact && (
        <span className="teacher-badge" aria-hidden="true">
          ✦
        </span>
      )}
    </div>
  );
}

export function Waveform({ active = false }: { active?: boolean }) {
  return (
    <span className={`tutor-wave ${active ? 'is-live' : ''}`} aria-hidden="true">
      {[8, 31, 25, 19, 33, 15, 28, 29, 12, 33, 21, 23, 32, 11, 30, 27, 17, 26, 19, 30, 25].map(
        (height, i) => (
          <i key={i} style={{ height, animationDelay: `${i * 55}ms` }} />
        ),
      )}
    </span>
  );
}
