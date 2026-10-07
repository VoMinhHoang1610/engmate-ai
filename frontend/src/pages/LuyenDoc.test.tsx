import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LuuTru } from '../demo/LuuTru';
import { hoSoMau, tuVungMau } from '../demo/duLieu';
import { LuyenDoc } from './LuyenDoc';
import App from '../App';
import { baiDoc } from '../demo/baiDoc';

function moBaiDoc() {
  return render(
    <LuuTru>
      <LuyenDoc />
    </LuuTru>,
  );
}
function traLoi(indices: number[]) {
  const cauHoi = within(screen.getByRole('region', { name: 'Câu hỏi đọc hiểu' })).getAllByRole(
    'group',
  );
  indices.forEach((dapAn, i) => fireEvent.click(within(cauHoi[i]).getAllByRole('radio')[dapAn]));
}
function phutHoc(): number {
  return JSON.parse(localStorage.getItem('engmate-demo-v1')!).phutHoc;
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#luyen-doc?trinh-do=A2');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Reading', () => {
  it('requires every answer, grades choices and explains both correct and wrong answers', () => {
    moBaiDoc();
    const nop = screen.getByRole('button', { name: /Kiểm tra đáp án/ });
    expect(nop).toBeDisabled();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(nop).toBeDisabled();
    expect(screen.queryByText(/Đoạn 1:/)).not.toBeInTheDocument();
    traLoi([0, 0, 2]);
    fireEvent.click(nop);
    expect(screen.getByRole('status')).toHaveTextContent('Kết quả: 2 / 3 câu đúng');
    expect(screen.getByText(/Chưa đúng · Đáp án B/)).toBeVisible();
    expect(screen.getByText(/Đoạn 1:/)).toBeVisible();
    expect(screen.getAllByRole('radio').every((input) => input.hasAttribute('disabled'))).toBe(
      true,
    );
    expect(phutHoc()).toBe(5);
  });

  it('resets attempts without counting a repeated passage twice and celebrates a perfect score', () => {
    moBaiDoc();
    traLoi([0, 1, 0]);
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Làm lại bài tập' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('radio').every((input) => !(input as HTMLInputElement).checked),
    ).toBe(true);
    traLoi([1, 0, 2]);
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Kết quả: 3 / 3 câu đúng');
    expect(
      screen.getByRole('status').querySelector('[data-mate-mood="celebrating"]'),
    ).not.toBeNull();
    expect(phutHoc()).toBe(5);
  });

  it('changes passages and resets answers and feedback across A2, B1 and B2', () => {
    moBaiDoc();
    traLoi([1, 0, 2]);
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    const chon = screen.getByLabelText('Chọn bài đọc');
    fireEvent.change(chon, {
      target: { value: String(baiDoc.findIndex((bai) => bai.trinhDo === 'B1')) },
    });
    expect(screen.getByRole('heading', { name: 'A different way to work' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kiểm tra đáp án/ })).toBeDisabled();
    traLoi([2, 0, 1]);
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('3 / 3 câu đúng');
    expect(phutHoc()).toBe(10);
    fireEvent.change(chon, {
      target: { value: String(baiDoc.findIndex((bai) => bai.trinhDo === 'B2')) },
    });
    expect(screen.getByRole('heading', { name: 'Learning beyond the screen' })).toBeVisible();
    traLoi([1, 2, 0]);
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('3 / 3 câu đúng');
    expect(phutHoc()).toBe(15);
    fireEvent.change(chon, {
      target: { value: String(baiDoc.findIndex((bai) => bai.trinhDo === 'A2')) },
    });
    traLoi([1, 0, 2]);
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(phutHoc()).toBe(15);
  });

  it('saves real passage vocabulary once and restores the saved state', () => {
    const view = moBaiDoc();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu từ community' }));
    expect(screen.getByRole('button', { name: 'Đã lưu community' })).toBeDisabled();
    const words = JSON.parse(localStorage.getItem('engmate-demo-v1')!).tuVung;
    expect(words.filter((word: { tu: string }) => word.tu === 'community')).toHaveLength(1);
    expect(words.find((word: { tu: string }) => word.tu === 'community').nghia).toBe('cộng đồng');
    view.unmount();
    moBaiDoc();
    expect(screen.getByRole('button', { name: 'Đã lưu community' })).toBeDisabled();
  });

  it('integrates Reading and English skill labels into navigation, dashboard and page titles', () => {
    localStorage.setItem(
      'engmate-demo-v1',
      JSON.stringify({
        hoSo: hoSoMau,
        tuVung: tuVungMau,
        daDangNhap: true,
        daLamQuen: true,
        phutHoc: 0,
        luotOn: 0,
      }),
    );
    window.history.replaceState(null, '', '#tong-quan');
    render(<App />);
    const navigation = screen.getByRole('navigation', { name: 'Menu chính' });
    for (const ten of ['Speaking', 'Listening', 'Reading', 'Writing']) {
      expect(within(navigation).getByRole('link', { name: ten })).toBeVisible();
      expect(screen.getByRole('button', { name: ten })).toBeVisible();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Reading' }));
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    expect(screen.getByRole('heading', { name: 'Reading', level: 1 })).toBeVisible();
    expect(document.title).toBe('Reading · EngMate-AI');
    expect(within(navigation).getByRole('link', { name: 'Reading' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const [route, ten] of [
      ['luyen-noi', 'Speaking'],
      ['luyen-nghe', 'Listening'],
      ['luyen-viet', 'Writing'],
    ]) {
      act(() => {
        window.history.replaceState(null, '', `#${route}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      expect(screen.getByRole('heading', { name: ten, level: 1 })).toBeVisible();
      expect(document.title).toBe(`${ten} · EngMate-AI`);
    }
  });
});
