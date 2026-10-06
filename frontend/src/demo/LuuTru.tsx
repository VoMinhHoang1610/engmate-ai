import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { hoSoMau, tuVungMau, type HoSo, type TuVung } from './duLieu';

export interface CaiDatNguoiDung {
  giaoDien: 'sang' | 'toi' | 'he-thong';
  giamChuyenDong: boolean;
  tocDoDoc: number;
}
const caiDatMacDinh: CaiDatNguoiDung = {
  giaoDien: 'sang',
  giamChuyenDong: false,
  tocDoDoc: 1,
};
interface DuLieu {
  caiDat: CaiDatNguoiDung;
  hoSo: HoSo;
  tuVung: TuVung[];
  daDangNhap: boolean;
  phutHoc: number;
  luotOn: number;
  ngayHoatDong: string;
  phutHomNay: number;
  luotOnHomNay: number;
}
interface GiaTri extends DuLieu {
  capNhat: (thayDoi: Partial<DuLieu>) => void;
  luuTu: (tu: TuVung) => void;
  onTu: (id: string, ngay: number) => void;
  ghiNhanHoc: (phut: number) => void;
  loiLuu: string;
}
const khoa = 'engmate-demo-v1';
function homNay(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
const macDinh: DuLieu = {
  caiDat: caiDatMacDinh,
  hoSo: hoSoMau,
  tuVung: tuVungMau,
  daDangNhap: false,
  phutHoc: 0,
  luotOn: 0,
  ngayHoatDong: homNay(),
  phutHomNay: 0,
  luotOnHomNay: 0,
};
const NguCanh = createContext<GiaTri | null>(null);
function docDuLieu(): DuLieu {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(khoa) ?? 'null');
    if (!raw || typeof raw !== 'object') return macDinh;
    const data = raw as Partial<DuLieu>;
    if (
      !data.hoSo ||
      typeof data.hoSo.ten !== 'string' ||
      !data.hoSo.ten.trim() ||
      typeof data.hoSo.email !== 'string' ||
      !['A2', 'B1', 'B2'].includes(data.hoSo.trinhDo) ||
      typeof data.hoSo.mucTieu !== 'string' ||
      !Number.isFinite(data.hoSo.phutMoiNgay) ||
      data.hoSo.phutMoiNgay < 10 ||
      data.hoSo.phutMoiNgay > 60 ||
      !Array.isArray(data.tuVung) ||
      !data.tuVung.every(
        (tu) =>
          tu &&
          typeof tu.id === 'string' &&
          typeof tu.tu === 'string' &&
          Boolean(tu.tu.trim()) &&
          typeof tu.nghia === 'string' &&
          typeof tu.phienAm === 'string' &&
          typeof tu.loai === 'string' &&
          typeof tu.viDu === 'string' &&
          typeof tu.daThuoc === 'boolean' &&
          typeof tu.henOn === 'string' &&
          (!tu.henOn || !Number.isNaN(Date.parse(tu.henOn))),
      ) ||
      typeof data.daDangNhap !== 'boolean' ||
      !Number.isFinite(data.phutHoc) ||
      Number(data.phutHoc) < 0 ||
      !Number.isFinite(data.luotOn) ||
      Number(data.luotOn) < 0
    )
      return macDinh;
    const isToday = data.ngayHoatDong === homNay();
    return {
      ...macDinh,
      ...data,
      hoSo: {
        ...macDinh.hoSo,
        ...data.hoSo,
      },
      caiDat: {
        giaoDien: ['sang', 'toi', 'he-thong'].includes(data.caiDat?.giaoDien ?? '')
          ? data.caiDat!.giaoDien
          : caiDatMacDinh.giaoDien,
        giamChuyenDong:
          typeof data.caiDat?.giamChuyenDong === 'boolean'
            ? data.caiDat.giamChuyenDong
            : caiDatMacDinh.giamChuyenDong,
        tocDoDoc: [0.75, 1, 1.25].includes(data.caiDat?.tocDoDoc ?? 0)
          ? data.caiDat!.tocDoDoc
          : caiDatMacDinh.tocDoDoc,
      },
      ngayHoatDong: homNay(),
      phutHomNay:
        isToday && Number.isFinite(data.phutHomNay) && Number(data.phutHomNay) >= 0
          ? Number(data.phutHomNay)
          : 0,
      luotOnHomNay:
        isToday && Number.isFinite(data.luotOnHomNay) && Number(data.luotOnHomNay) >= 0
          ? Number(data.luotOnHomNay)
          : 0,
    } as DuLieu;
  } catch {
    return macDinh;
  }
}
export function LuuTru({ children }: { children: ReactNode }) {
  const [data, setData] = useState(docDuLieu);
  const [loiLuu, setLoiLuu] = useState('');
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        data.caiDat.giaoDien === 'toi' || (data.caiDat.giaoDien === 'he-thong' && media?.matches)
          ? 'dark'
          : 'light';
      document.documentElement.dataset.reducedMotion = String(data.caiDat.giamChuyenDong);
      document.documentElement.dataset.speechRate = String(data.caiDat.tocDoDoc);
    };
    apply();
    media?.addEventListener('change', apply);
    return () => {
      media?.removeEventListener('change', apply);
      delete document.documentElement.dataset.theme;
      delete document.documentElement.dataset.reducedMotion;
      delete document.documentElement.dataset.speechRate;
    };
  }, [data.caiDat]);
  useEffect(() => {
    let message = '';
    try {
      localStorage.setItem(khoa, JSON.stringify(data));
    } catch {
      message = 'Trình duyệt không cho phép lưu dữ liệu. Thay đổi chỉ được giữ trong phiên này.';
    }
    const id = window.setTimeout(() => setLoiLuu(message));
    return () => window.clearTimeout(id);
  }, [data]);
  const capNhat = (thayDoi: Partial<DuLieu>) => setData((cu) => ({ ...cu, ...thayDoi }));
  const luuTu = (tu: TuVung) =>
    setData((cu) =>
      cu.tuVung.some((item) => item.tu.toLowerCase() === tu.tu.toLowerCase())
        ? cu
        : { ...cu, tuVung: [tu, ...cu.tuVung] },
    );
  const onTu = (id: string, ngay: number) =>
    setData((cu) => ({
      ...cu,
      ngayHoatDong: homNay(),
      luotOn: cu.luotOn + 1,
      luotOnHomNay: cu.ngayHoatDong === homNay() ? cu.luotOnHomNay + 1 : 1,
      tuVung: cu.tuVung.map((tu) =>
        tu.id === id
          ? {
              ...tu,
              daThuoc: ngay >= 4,
              henOn: new Date(Date.now() + ngay * 86_400_000).toISOString(),
            }
          : tu,
      ),
    }));
  const ghiNhanHoc = (phut: number) =>
    setData((cu) => ({
      ...cu,
      ngayHoatDong: homNay(),
      phutHoc: cu.phutHoc + phut,
      phutHomNay: cu.ngayHoatDong === homNay() ? cu.phutHomNay + phut : phut,
    }));
  return (
    <NguCanh.Provider value={{ ...data, capNhat, luuTu, onTu, ghiNhanHoc, loiLuu }}>
      {children}
    </NguCanh.Provider>
  );
}
// Shared by page components; keeping the provider and hook together avoids a second context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useDuLieu() {
  const context = useContext(NguCanh);
  if (!context) throw new Error('Missing demo data provider');
  return context;
}
