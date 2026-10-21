import { useState, useSyncExternalStore } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { applyTheme, readAppliedTheme, subscribeTheme, type Theme } from '../theme';
import type { Account } from '../types';
import type { LearningState } from '../tutor/curriculum';
import { setSpeechRate, useSpeechPreferences } from '../speech/preferences';
import { dungDoc } from '../speech/audio';
import { VoiceSettings } from './VoiceSettings';

interface Props {
  account: Account;
  learning: LearningState;
  onNavigateProfile: () => void;
  onNavigateSetup: () => void;
  onLogout: () => Promise<void>;
}

export function SettingsPage({
  account,
  learning,
  onNavigateProfile,
  onNavigateSetup,
  onLogout,
}: Props) {
  const theme = useSyncExternalStore(subscribeTheme, readAppliedTheme);

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem('engmate-reduced-motion') === 'true';
    } catch {
      return false;
    }
  });

  const { rate: speechRate } = useSpeechPreferences();
  const [rateStatus, setRateStatus] = useState('');

  const [soundFeedback, setSoundFeedback] = useState<boolean>(() => {
    try {
      return localStorage.getItem('engmate-sound-feedback') !== 'false';
    } catch {
      return true;
    }
  });

  function handleThemeChange(nextTheme: Theme) {
    try {
      localStorage.setItem('engmate-theme', nextTheme);
    } catch {
      /* ignore */
    }
    applyTheme(nextTheme);
  }

  function handleMotionChange(checked: boolean) {
    setReducedMotion(checked);
    try {
      localStorage.setItem('engmate-reduced-motion', String(checked));
    } catch {
      /* ignore */
    }
    if (checked) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }

  function handleSpeechRateChange(rate: number) {
    dungDoc();
    const saved = setSpeechRate(rate);
    setRateStatus(
      saved
        ? 'Đã lưu tốc độ trên trình duyệt này.'
        : 'Tốc độ chỉ được áp dụng cho phiên này vì trình duyệt không cho lưu.',
    );
  }

  function handleSoundFeedbackChange(checked: boolean) {
    setSoundFeedback(checked);
    try {
      localStorage.setItem('engmate-sound-feedback', String(checked));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-grid">
        {/* Section 1: Giao diện & Trải nghiệm */}
        <section className="tutor-card settings-card">
          <div className="settings-section-head">
            <span className="eyebrow">
              <i /> GIAO DIỆN & TRẢI NGHIỆM
            </span>
            <h2>Hiển thị & Chuyển động</h2>
            <p>Tùy chọn 2 màu nền tối giản: Nền Trắng (mặc định) và Nền Đen.</p>
          </div>

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Màu nền giao diện</strong>
              <span>Chỉ gồm 2 tùy chọn Nền Trắng (mặc định) hoặc Nền Đen.</span>
            </div>
            <div className="settings-pill-selector">
              <button
                type="button"
                className={`settings-pill-btn ${theme === 'light' ? 'active' : ''}`}
                aria-pressed={theme === 'light'}
                onClick={() => handleThemeChange('light')}
              >
                <BieuTuong ten="sun" size={15} /> Nền Trắng
              </button>
              <button
                type="button"
                className={`settings-pill-btn ${theme === 'dark' ? 'active' : ''}`}
                aria-pressed={theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
              >
                <BieuTuong ten="moon" size={15} /> Nền Đen
              </button>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Giảm chuyển động</strong>
              <span>Tối ưu cho người thích giao diện tĩnh, hạn chế animation.</span>
            </div>
            <label className="switch-toggle" aria-label="Bật hoặc tắt giảm chuyển động">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => handleMotionChange(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
        </section>

        {/* Section 2: Giọng đọc & Âm thanh */}
        <section className="tutor-card settings-card">
          <div className="settings-section-head">
            <span className="eyebrow violet">
              <i /> ÂM THANH & GIỌNG ĐỌC
            </span>
            <h2>Thầy Mate & Phát âm</h2>
            <p>Điều chỉnh nhịp độ phản hồi và giọng nói của trợ lý AI.</p>
          </div>

          <VoiceSettings />

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Tốc độ đọc câu mẫu</strong>
              <span>Tốc độ khi thầy Mate đọc bài giảng và câu ví dụ.</span>
            </div>
            <div className="settings-pill-selector">
              {[
                { value: 0.75, label: '0.75× Chậm' },
                { value: 1.0, label: '1.0× Chuẩn' },
                { value: 1.25, label: '1.25× Nhanh' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`settings-pill-btn ${speechRate === item.value ? 'active' : ''}`}
                  aria-pressed={speechRate === item.value}
                  onClick={() => handleSpeechRateChange(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {rateStatus && (
            <p className="chat-disclaimer" role="status">
              {rateStatus}
            </p>
          )}

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Hiệu ứng âm thanh tương tác</strong>
              <span>Phát âm thanh nhẹ khi hoàn thành bài hoặc ghi nhận tiến độ.</span>
            </div>
            <label className="switch-toggle" aria-label="Bật hoặc tắt âm thanh tương tác">
              <input
                type="checkbox"
                checked={soundFeedback}
                onChange={(e) => handleSoundFeedbackChange(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
        </section>

        {/* Section 3: Học tập & Tài khoản */}
        <section className="tutor-card settings-card">
          <div className="settings-section-head">
            <span className="eyebrow">
              <i /> HỒ SƠ & TÀI KHOẢN
            </span>
            <h2>Thông tin cá nhân</h2>
            <p>Xem thông tin đăng nhập và điều chỉnh mục tiêu tiếng Anh.</p>
          </div>

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Tài khoản đăng nhập</strong>
              <span>
                {account.username}
                {account.email && ` · ${account.email}`}
              </span>
            </div>
            <div className="settings-actions">
              <button type="button" className="tutor-button" onClick={onNavigateProfile}>
                <BieuTuong ten="user" size={16} /> Hồ sơ học tập
              </button>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Mục tiêu học tập hiện tại</strong>
              <span>
                Mức {learning.level} · {learning.minutes} phút/ngày
              </span>
            </div>
            <div className="settings-actions">
              <button type="button" className="tutor-button" onClick={onNavigateSetup}>
                <BieuTuong ten="settings" size={16} /> Đổi mục tiêu
              </button>
            </div>
          </div>

          <div className="settings-item logout-item">
            <div className="settings-item-copy">
              <strong>Kết thúc phiên làm việc</strong>
              <span>Đăng xuất tài khoản an toàn trên thiết bị này.</span>
            </div>
            <button
              type="button"
              className="tutor-button danger-btn"
              onClick={() => void onLogout()}
            >
              <BieuTuong ten="logout" size={16} /> Đăng xuất
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
