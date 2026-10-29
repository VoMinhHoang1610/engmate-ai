import { useRef, useState, type FormEvent } from 'react';
import { BieuTuong } from '../components/BieuTuong';
import type { Account } from '../types';
import { localDay } from '../tutor/curriculum';
import { levels, saveProfile, uploadAvatar, type Profile, type ProfileInput } from './api';
import { prepareAvatar } from './avatar';

const goals = [
  'Giao tiếp tự tin',
  'Tiếng Anh công việc',
  'Du lịch và khám phá',
  'Chuẩn bị TOEIC',
  'Chuẩn bị IELTS',
];
interface Props {
  account: Account;
  profile: Profile;
  avatar: string;
  avatarError: string;
  remembered: number;
  completed: number;
  onSaved: (profile: Profile) => void;
  onAvatarChanged: () => void;
  onReload: () => void;
}

/** The former profile form, connected to owned REST resources and real progress. */
export function ProfilePage({
  account,
  profile,
  avatar,
  avatarError,
  remembered,
  completed,
  onSaved,
  onAvatarChanged,
  onReload,
}: Props) {
  const [form, setForm] = useState<ProfileInput>(() => ({
    version: profile.version,
    display_name: profile.display_name,
    phone_number: profile.phone_number,
    birth_date: profile.birth_date,
    gender: profile.gender,
    cefr_level: profile.cefr_level,
    learning_goal: profile.learning_goal,
    daily_goal_minutes: profile.daily_goal_minutes,
    time_zone_id: profile.time_zone_id,
  }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const fileLock = useRef(false);
  function change(patch: Partial<ProfileInput>) {
    setForm((old) => ({ ...old, ...patch }));
    setSaved('');
    setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!form.display_name.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const data = await saveProfile({ ...form, display_name: form.display_name.trim() });
      setForm({
        version: data.version,
        display_name: data.display_name,
        phone_number: data.phone_number,
        birth_date: data.birth_date,
        gender: data.gender,
        cefr_level: data.cefr_level,
        learning_goal: data.learning_goal,
        daily_goal_minutes: data.daily_goal_minutes,
        time_zone_id: data.time_zone_id,
      });
      onSaved(data);
      setSaved('Đã lưu hồ sơ của bạn.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được hồ sơ.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function selectAvatar(file: File) {
    if (fileLock.current) return;
    fileLock.current = true;
    setUploading(true);
    setError('');
    setSaved('');
    try {
      await uploadAvatar(await prepareAvatar(file));
      onAvatarChanged();
      setSaved('Đã lưu ảnh đại diện.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được ảnh đại diện.');
    } finally {
      fileLock.current = false;
      setUploading(false);
    }
  }
  return (
    <div className="profile-layout restored-profile">
      <aside className="tutor-card profile-summary">
        <label className={`avatar-upload ${uploading ? 'is-uploading' : ''}`}>
          <span className="avatar-wrapper">
            {avatar ? (
              <img src={avatar} alt="Ảnh đại diện của bạn" className="avatar large avatar-img" />
            ) : (
              <span className="avatar large">{profile.display_name.slice(0, 1).toUpperCase()}</span>
            )}
            <span className="avatar-overlay">
              <BieuTuong ten="pen" size={16} /> Sửa
            </span>
          </span>
          <span className="avatar-upload-text">{uploading ? 'Đang lưu ảnh…' : 'Sửa ảnh'}</span>
          <input
            className="profile-file-input"
            type="file"
            aria-label="Đổi ảnh đại diện"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void selectAvatar(file);
              event.target.value = '';
            }}
          />
        </label>
        <p className="profile-image-hint">PNG, JPEG, WebP · Tối đa 2 MB</p>
        <h2>{profile.display_name}</h2>
        <p className="muted">{account.email}</p>
        <span className="tutor-chip">{profile.cefr_level} · Mức tự chọn</span>
        <div className="profile-metrics">
          <div>
            <strong>{profile.total_study_minutes}</strong>
            <span>Phút đã học</span>
          </div>
          <div>
            <strong>{remembered}</strong>
            <span>Cụm tự đánh dấu đã nhớ</span>
          </div>
          <div>
            <strong>{completed}</strong>
            <span>Buổi ôn giao tiếp tự ghi nhận</span>
          </div>
        </div>
        <p className="profile-image-hint">
          Cụm từ và buổi ôn tự ghi nhận lưu trên trình duyệt này. Kết quả TOEIC được hiển thị riêng
          ở trên.
        </p>
        {avatarError && (
          <p className="error-text" role="alert">
            {avatarError}
          </p>
        )}
      </aside>
      <form className="tutor-card profile-form" onSubmit={(event) => void submit(event)}>
        <h2>Thông tin cá nhân</h2>
        <fieldset disabled={busy || uploading}>
          <div className="form-grid">
            <label>
              Họ và tên
              <input
                required
                maxLength={60}
                autoComplete="name"
                value={form.display_name}
                onChange={(event) => change({ display_name: event.target.value })}
              />
            </label>
            <label>
              Tài khoản
              <input readOnly value={account.username} autoComplete="username" />
            </label>
            <label>
              Số điện thoại
              <input
                type="tel"
                maxLength={32}
                autoComplete="tel"
                value={form.phone_number ?? ''}
                onChange={(event) => change({ phone_number: event.target.value || null })}
              />
            </label>
            <label>
              Ngày sinh
              <input
                type="date"
                max={localDay()}
                autoComplete="bday"
                value={form.birth_date ?? ''}
                onChange={(event) => change({ birth_date: event.target.value || null })}
              />
            </label>
            <label>
              Giới tính
              <select
                aria-label="Giới tính"
                value={form.gender ?? ''}
                onChange={(event) =>
                  change({ gender: (event.target.value || null) as ProfileInput['gender'] })
                }
              >
                <option value="">Chưa xác định</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </label>
            <label>
              Email
              <input type="email" readOnly autoComplete="email" value={account.email} />
            </label>
          </div>
          <hr />
          <h2>Cá nhân hóa việc học</h2>
          <label>
            Trình độ tiếng Anh
            <select
              aria-label="Trình độ tiếng Anh"
              value={form.cefr_level}
              onChange={(event) =>
                change({ cefr_level: event.target.value as ProfileInput['cefr_level'] })
              }
            >
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                  {level === 'Pre-A1'
                    ? ' — Mới làm quen'
                    : level === 'A1'
                      ? ' — Mới bắt đầu'
                      : level === 'A2'
                        ? ' — Cơ bản'
                        : level === 'B1'
                          ? ' — Trung cấp'
                          : level === 'B2'
                            ? ' — Trên trung cấp'
                            : level === 'C1'
                              ? ' — Nâng cao'
                              : ' — Thành thạo'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mục tiêu của bạn
            <select
              aria-label="Mục tiêu của bạn"
              value={form.learning_goal}
              onChange={(event) => change({ learning_goal: event.target.value })}
            >
              {!goals.includes(form.learning_goal) && (
                <option value={form.learning_goal}>{form.learning_goal}</option>
              )}
              {goals.map((goal) => (
                <option key={goal}>{goal}</option>
              ))}
            </select>
          </label>
          <label>
            Thời gian luyện giao tiếp mỗi ngày{' '}
            <strong className="accent">{form.daily_goal_minutes} phút</strong>
            <input
              type="range"
              aria-label="Thời gian học mỗi ngày"
              min={10}
              max={60}
              step={5}
              value={form.daily_goal_minutes}
              onChange={(event) => change({ daily_goal_minutes: Number(event.target.value) })}
            />
            <span className="range-labels">
              <span>10 phút</span>
              <span>60 phút</span>
            </span>
          </label>
          <p className="profile-help">
            Mục tiêu giao tiếp này độc lập với kế hoạch TOEIC trong Lộ trình. Mức tiếng Anh do bạn
            tự chọn. Thông tin cá nhân và mục tiêu được lưu trong tài khoản.
          </p>
        </fieldset>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <span role="status">{saved}</span>
          <button
            type="button"
            className="text-button"
            disabled={busy || uploading}
            onClick={onReload}
          >
            Tải lại hồ sơ
          </button>
          <button className="tutor-button primary" type="submit" disabled={busy || uploading}>
            <BieuTuong ten="check" size={18} />
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
