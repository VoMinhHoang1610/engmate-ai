import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  api,
  apiFetch,
  hasSession,
  saveSession,
  type Profile,
  type Preferences,
  type Word,
  type Account,
  type Dashboard,
} from '../api/database';
import { NguCanh, macDinh, type DuLieu } from './LuuTru';
import type { TuVung } from './duLieu';
import { xoaBoNhoAmThanh } from './amThanh';

function word(row: Word): TuVung {
  return {
    id: String(row.user_vocabulary_id),
    tu: row.word,
    nghia: row.meaning,
    phienAm: row.phonetic ?? '',
    loai: row.part_of_speech ?? '',
    viDu: row.example_sentence ?? '',
    daThuoc: row.is_mastered,
    henOn: row.next_review_at ?? '',
  };
}
/** Server data is authoritative; demo localStorage is never imported into an account. */
export function MysqlLuuTru({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DuLieu>({ ...macDinh, tuVung: [], daDangNhap: false });
  const [loiLuu, setLoi] = useState('');
  const state = useRef<{ profile?: Profile; preferences?: Preferences; words: Word[] }>({
    words: [],
  });
  const queue = useRef(Promise.resolve());
  const epoch = useRef(0);
  async function reload() {
    if (!hasSession()) return;
    const current = epoch.current;
    const [account, profile, preferences, dashboard] = await Promise.all([
      api<Account>('/me'),
      api<Profile>('/me/profile'),
      api<Preferences>('/me/settings'),
      api<Dashboard>('/dashboard'),
    ]);
    const words: Word[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await api<Word[]>(`/vocabulary?limit=100&offset=${offset}`);
      words.push(...page);
      if (page.length < 100) break;
    }
    if (current !== epoch.current) return;
    let avatar = '';
    if (profile.avatar_asset_id) {
      const response = await apiFetch(`/api/media/${profile.avatar_asset_id}`);
      if (response.ok) avatar = URL.createObjectURL(await response.blob());
    }
    if (current !== epoch.current) {
      if (avatar) URL.revokeObjectURL(avatar);
      return;
    }
    state.current = { profile, preferences, words };
    const today = dashboard.daily.find((row) => row.local_study_date === dashboard.today);
    setData({
      daDangNhap: true,
      daLamQuen: Boolean(profile.onboarding_completed_at),
      hoSo: {
        ten: profile.display_name,
        email: account.email,
        taiKhoan: account.username,
        trinhDo: profile.cefr_level,
        mucTieu: profile.learning_goal,
        phutMoiNgay: profile.daily_goal_minutes,
        soDienThoai: profile.phone_number ?? '',
        ngaySinh: profile.birth_date ?? '',
        gioiTinh:
          profile.gender === 'male'
            ? 'Nam'
            : profile.gender === 'female'
              ? 'Nữ'
              : profile.gender === 'other'
                ? 'Khác'
                : '',
        anhDaiDien: avatar,
      },
      caiDat: {
        giaoDien:
          preferences.theme === 'dark'
            ? 'toi'
            : preferences.theme === 'system'
              ? 'he-thong'
              : 'sang',
        giamChuyenDong: preferences.reduced_motion,
        tocDoDoc: preferences.speech_rate,
        giongDoc: preferences.speech_voice_id,
      },
      tuVung: words.map(word),
      phutHoc: Number(dashboard.total_study_minutes),
      luotOn: dashboard.review_count,
      ngayHoatDong: dashboard.today,
      phutHomNay: Number(today?.study_minutes ?? 0),
      luotOnHomNay: today?.review_count ?? 0,
    });
  }
  function enqueue(action: () => Promise<void>) {
    const current = epoch.current;
    const pending = queue.current.then(async () => {
      if (current !== epoch.current) return;
      setLoi('');
      await action();
      await reload();
    });
    queue.current = pending.catch((error: unknown) => {
      if (current !== epoch.current) return;
      setLoi(error instanceof Error ? error.message : 'Chưa lưu được dữ liệu.');
      if (!hasSession()) setData({ ...macDinh, daDangNhap: false, tuVung: [] });
    });
    return pending.then(
      () => true,
      () => false,
    );
  }
  useEffect(() => {
    const load = () => {
      enqueue(async () => {});
    };
    load();
    window.addEventListener('engmate-login', load);
    window.addEventListener('engmate-data', load);
    const generation = epoch;
    return () => {
      generation.current++;
      window.removeEventListener('engmate-login', load);
      window.removeEventListener('engmate-data', load);
    };
    // The queue serializes mutations and reloads using current server versions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        data.caiDat.giaoDien === 'toi' || (data.caiDat.giaoDien === 'he-thong' && media?.matches)
          ? 'dark'
          : 'light';
      document.documentElement.dataset.reducedMotion = String(data.caiDat.giamChuyenDong);
      document.documentElement.dataset.speechRate = String(data.caiDat.tocDoDoc);
      document.documentElement.dataset.speechVoice = data.caiDat.giongDoc;
    };
    apply();
    media?.addEventListener('change', apply);
    return () => media?.removeEventListener('change', apply);
  }, [data.caiDat]);
  useEffect(
    () => () => {
      if (data.hoSo.anhDaiDien.startsWith('blob:')) URL.revokeObjectURL(data.hoSo.anhDaiDien);
    },
    [data.hoSo.anhDaiDien],
  );

  function capNhat(changes: Partial<DuLieu>) {
    if (changes.daDangNhap === false) {
      epoch.current++;
      xoaBoNhoAmThanh();
      void api('/auth/logout', 'POST').catch(() => {});
      saveSession(null);
      setData({ ...macDinh, daDangNhap: false, tuVung: [] });
      return;
    }
    const preferenceChanges = changes.caiDat
      ? Object.fromEntries(
          Object.entries(changes.caiDat).filter(
            ([key, value]) => value !== data.caiDat[key as keyof typeof data.caiDat],
          ),
        )
      : {};
    if (changes.caiDat) setData((old) => ({ ...old, caiDat: changes.caiDat! }));
    return enqueue(async () => {
      const current = state.current;
      if (changes.hoSo || changes.daLamQuen !== undefined) {
        if (!current.profile) return;
        const h = changes.hoSo ?? data.hoSo;
        let avatarId = current.profile.avatar_asset_id;
        if (h.anhDaiDien.startsWith('data:')) {
          const blob = await (await fetch(h.anhDaiDien)).blob();
          const form = new FormData();
          form.append('file', blob, 'avatar');
          const response = await apiFetch('/api/media?purpose=avatar', {
            method: 'POST',
            body: form,
          });
          if (!response.ok) throw new Error('Không lưu được ảnh đại diện.');
          avatarId = ((await response.json()) as { media_asset_id: number }).media_asset_id;
        }
        await api('/me/profile', 'PUT', {
          version: current.profile.version,
          display_name: h.ten,
          cefr_level: h.trinhDo,
          learning_goal: h.mucTieu,
          daily_goal_minutes: h.phutMoiNgay,
          phone_number: h.soDienThoai || null,
          birth_date: h.ngaySinh || null,
          gender:
            h.gioiTinh === 'Nam'
              ? 'male'
              : h.gioiTinh === 'Nữ'
                ? 'female'
                : h.gioiTinh === 'Khác'
                  ? 'other'
                  : null,
          avatar_asset_id: avatarId,
          time_zone_id: current.profile.time_zone_id,
          ...(changes.daLamQuen === undefined ? {} : { onboarding_completed: changes.daLamQuen }),
        });
      }
      if (changes.caiDat && current.preferences) {
        const stored = current.preferences;
        const c = {
          giaoDien:
            stored.theme === 'dark' ? 'toi' : stored.theme === 'system' ? 'he-thong' : 'sang',
          giamChuyenDong: stored.reduced_motion,
          tocDoDoc: stored.speech_rate,
          giongDoc: stored.speech_voice_id,
          ...preferenceChanges,
        };
        await api('/me/settings', 'PUT', {
          version: current.preferences.version,
          theme: c.giaoDien === 'toi' ? 'dark' : c.giaoDien === 'he-thong' ? 'system' : 'light',
          reduced_motion: c.giamChuyenDong,
          speech_rate: c.tocDoDoc,
          speech_voice_id: c.giongDoc,
        });
      }
      if (changes.tuVung) {
        for (const row of current.words) {
          const changed = changes.tuVung.find((tu) => tu.id === String(row.user_vocabulary_id));
          if (!changed)
            await api(`/vocabulary/${row.user_vocabulary_id}`, 'DELETE', { version: row.version });
          else if (changed.daThuoc !== row.is_mastered)
            await api(`/vocabulary/${row.user_vocabulary_id}/mastery`, 'PUT', {
              version: row.version,
              is_mastered: changed.daThuoc,
            });
        }
      }
    });
  }
  function luuTu(tu: TuVung) {
    return enqueue(async () => {
      await api('/vocabulary', 'POST', {
        word: tu.tu,
        meaning: tu.nghia,
        phonetic: tu.phienAm || null,
        part_of_speech: tu.loai || null,
        example_sentence: tu.viDu || null,
      });
    });
  }
  function onTu(id: string, days: number) {
    enqueue(async () => {
      const session = await api<{ flashcard_session_id: number }>('/flashcards/sessions', 'POST', {
        client_request_id: crypto.randomUUID(),
        review_all: true,
      });
      await api(`/flashcards/sessions/${session.flashcard_session_id}/reviews`, 'POST', {
        client_request_id: crypto.randomUUID(),
        vocabulary_id: Number(id),
        rating: days === 0 ? 'again' : days === 1 ? 'hard' : days === 4 ? 'good' : 'easy',
      });
      await api(`/flashcards/sessions/${session.flashcard_session_id}/close`, 'POST');
    });
  }
  return (
    <NguCanh.Provider
      value={{
        ...data,
        loiLuu,
        capNhat,
        luuTu,
        onTu,
        ghiNhanHoc: () => {
          window.dispatchEvent(new Event('engmate-data'));
        },
      }}
    >
      {children}
    </NguCanh.Provider>
  );
}
