import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Logo } from '../components/Logo';
import { LinhThu } from '../components/LinhThu';
import { BieuTuong } from '../components/BieuTuong';
import { useDuLieu } from '../demo/LuuTru';
import { cauTraLoiLamQuen } from '../demo/lamQuen';
import type { TrinhDo } from '../demo/trinhDo';

export function LamQuenCungMate() {
  const { hoSo, capNhat, loiLuu } = useDuLieu();
  const [luaChon, setLuaChon] = useState<TrinhDo | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const cauTraLoi = cauTraLoiLamQuen.find((item) => item.trinhDo === luaChon);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  function batDau(event: FormEvent) {
    event.preventDefault();
    if (!luaChon) return;
    capNhat({ daLamQuen: true, hoSo: { ...hoSo, trinhDo: luaChon } });
    window.location.hash = 'tong-quan';
  }

  return (
    <div className="mate-onboarding">
      <header className="onboarding-header">
        <Logo />
        <button className="text-button" onClick={() => capNhat({ daDangNhap: false })}>
          Đăng xuất
        </button>
      </header>
      <main className="onboarding-main">
        <aside className="onboarding-companion">
          <div className="onboarding-mate">
            <LinhThu size={200} camXuc={luaChon ? 'encouraging' : 'welcome'} />
          </div>
          <div className="onboarding-speech">
            <p className="onboarding-greeting">Chào {hoSo.ten.split(' ').at(-1)}! Mình là Mate.</p>
            <p>Mình muốn hiểu bạn một chút để chuẩn bị những bài học vừa sức.</p>
          </div>
        </aside>
        <section className="panel onboarding-question" aria-labelledby="onboarding-title">
          <h1 ref={heading} tabIndex={-1} id="onboarding-title">
            Tiếng Anh của bạn đang ở đâu?
          </h1>
          <p className="muted">
            Chọn câu gần với bạn nhất nhé. Không chắc cũng không sao, mình có thể điều chỉnh sau.
          </p>
          {loiLuu && (
            <p className="notice" role="alert">
              {loiLuu}
            </p>
          )}
          <form onSubmit={batDau}>
            <fieldset className="onboarding-answers">
              <legend className="sr-only">Bạn thấy mình giống câu nào nhất?</legend>
              {cauTraLoiLamQuen.map((item) => (
                <label
                  key={item.trinhDo}
                  className={`onboarding-answer ${luaChon === item.trinhDo ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="muc-do-lam-quen"
                    value={item.trinhDo}
                    checked={luaChon === item.trinhDo}
                    onChange={() => setLuaChon(item.trinhDo)}
                  />
                  <span>
                    <strong>{item.ten}</strong>
                    <span>{item.moTa}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="onboarding-response" role="status" aria-live="polite">
              {cauTraLoi?.loiMate ?? 'Mình ở đây để đồng hành cùng bạn, dù bạn đang bắt đầu ở đâu.'}
            </p>
            <button className="btn primary full-width" type="submit" disabled={!luaChon}>
              Bắt đầu học cùng Mate <BieuTuong ten="arrow" size={18} />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
