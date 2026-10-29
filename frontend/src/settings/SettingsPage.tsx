import { useEffect, useState, useSyncExternalStore } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import { applyTheme, readAppliedTheme, subscribeTheme, type Theme } from '../theme';
import type { Account } from '../types';
import type { LearningState } from '../tutor/curriculum';
import { setSpeechRate, useSpeechPreferences } from '../speech/preferences';
import { dungDoc } from '../speech/audio';
import { VoiceSettings } from './VoiceSettings';
import { VoiceDiagnostics } from './VoiceDiagnostics';
import { applyReducedMotion, readReducedMotion, saveReducedMotion } from './motion';
import { LearningAccountSummary } from '../learning/LearningAccountSummary';

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

  const [reducedMotion, setReducedMotion] = useState(readReducedMotion);
  useEffect(() => applyReducedMotion(readReducedMotion()), []);

  const { rate: speechRate } = useSpeechPreferences();
  const [rateStatus, setRateStatus] = useState('');

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
    saveReducedMotion(checked);
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
            <label className="switch-toggle">
              <input
                type="checkbox"
                aria-label="Bật hoặc tắt giảm chuyển động"
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
            <h2>Mate & Phát âm</h2>
            <p>Điều chỉnh nhịp độ phản hồi và giọng nói của trợ lý AI.</p>
          </div>

          <VoiceSettings />

          <div className="settings-item">
            <div className="settings-item-copy">
              <strong>Tốc độ đọc câu mẫu</strong>
              <span>Tốc độ khi Mate đọc bài giảng và câu ví dụ.</span>
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
              <span>Chưa hỗ trợ. Kết quả học tập hiện được thông báo bằng chữ trên màn hình.</span>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                aria-label="Bật hoặc tắt âm thanh tương tác"
                checked={false}
                disabled
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
              <strong>Mục tiêu giao tiếp trong hồ sơ</strong>
              <span>
                Mức {learning.level} · {learning.minutes} phút/ngày
              </span>
            </div>
            <div className="settings-actions">
              <button type="button" className="tutor-button" onClick={onNavigateProfile}>
                <BieuTuong ten="settings" size={16} /> Đổi mục tiêu giao tiếp
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
        <LearningAccountSummary onPlan={onNavigateSetup} />
        <details className="tutor-card settings-card">
          <summary>Công cụ hỗ trợ nâng cao</summary>
          <p>Chỉ mở khi bạn cần kiểm tra sự cố thoại hoặc gửi số đo cho người hỗ trợ.</p>
          <VoiceDiagnostics />
        </details>
      </div>
    </div>
  );
}
