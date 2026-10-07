import { hoSoMau, tuVungMau } from '../src/demo/duLieu';

/** Seed a returning B1 learner who has already completed the Mate introduction. */
export function luuPhienDemo(daDangNhap = true) {
  localStorage.setItem(
    'engmate-demo-v1',
    JSON.stringify({
      hoSo: { ...hoSoMau, trinhDo: 'B1' },
      tuVung: tuVungMau,
      daDangNhap,
      daLamQuen: true,
      phutHoc: 0,
      luotOn: 0,
    }),
  );
}
