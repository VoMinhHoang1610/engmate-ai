import { useEffect, useState } from 'react';
import { api, apiFetch } from '../api/database';
import { readJSON } from '../api/readJSON';

export const levels = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type EnglishLevel = (typeof levels)[number];
export interface Profile {
  version: string;
  display_name: string;
  phone_number: string | null;
  birth_date: string | null;
  gender: 'male' | 'female' | 'other' | null;
  cefr_level: EnglishLevel;
  learning_goal: string;
  daily_goal_minutes: number;
  time_zone_id: string;
  has_avatar: boolean;
  total_study_minutes: number;
}
export type ProfileInput = Omit<Profile, 'has_avatar' | 'total_study_minutes'>;
export class ProfileConflictError extends Error {}

export async function saveProfile(data: ProfileInput): Promise<Profile> {
  const response = await apiFetch('/api/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (response.status === 409)
    throw new ProfileConflictError(
      'Hồ sơ đã thay đổi ở phiên khác. Hãy tải lại hồ sơ, kiểm tra rồi lưu lại.',
    );
  if (response.status === 422)
    throw new Error('Thông tin hồ sơ chưa hợp lệ. Kiểm tra họ tên, số điện thoại và ngày sinh.');
  if (!response.ok)
    throw new Error('Chưa lưu được hồ sơ. Hãy thử lại; nội dung bạn nhập vẫn được giữ.');
  return await readJSON<Profile>(response);
}

export async function uploadAvatar(image: Blob) {
  const body = new FormData();
  body.append('file', image, 'avatar.jpg');
  const response = await apiFetch('/api/me/avatar', { method: 'POST', body });
  if (response.status === 413) throw new Error('Ảnh đại diện cần nhỏ hơn 2 MB.');
  if (!response.ok)
    throw new Error('Chưa lưu được ảnh đại diện. Hãy chọn ảnh PNG, JPEG hoặc WebP và thử lại.');
}

export function useAccountProfile(username: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [avatar, setAvatar] = useState('');
  const [avatarError, setAvatarError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void api<Profile>('/me/profile', 'GET', undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setProfile(data);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Chưa tải được hồ sơ.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [username, revision]);
  useEffect(() => {
    if (!profile?.has_avatar) return;
    const controller = new AbortController();
    let url = '';
    void apiFetch('/api/me/avatar', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Chưa tải được ảnh đại diện.');
        return await response.blob();
      })
      .then((blob) => {
        if (!controller.signal.aborted) {
          url = URL.createObjectURL(blob);
          setAvatar(url);
          setAvatarError('');
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setAvatar('');
          setAvatarError(e instanceof Error ? e.message : 'Chưa tải được ảnh đại diện.');
        }
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [username, profile?.has_avatar, avatarRevision]);
  function refresh() {
    setLoading(true);
    setError('');
    setRevision((n) => n + 1);
    setAvatarRevision((n) => n + 1);
  }
  function avatarChanged() {
    setProfile((old) => (old ? { ...old, has_avatar: true } : old));
    setAvatarRevision((n) => n + 1);
  }
  return {
    profile,
    error,
    loading,
    avatar,
    avatarError,
    refresh,
    onSaved: setProfile,
    avatarChanged,
    revision,
  };
}
