import { hoSoMau, tuVungMau } from '../src/demo/duLieu';

/** Seed the same valid browser data used by a logged-in demo learner. */
export function luuPhienDemo(daDangNhap = true) {
  localStorage.setItem(
    'engmate-demo-v1',
    JSON.stringify({ hoSo: hoSoMau, tuVung: tuVungMau, daDangNhap, phutHoc: 0, luotOn: 0 }),
  );
}
