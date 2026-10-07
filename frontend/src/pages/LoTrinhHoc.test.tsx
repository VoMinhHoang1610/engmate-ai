import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { hoSoMau, tuVungMau } from '../demo/duLieu';
import { LuuTru } from '../demo/LuuTru';
import { LoTrinhHoc } from './LoTrinhHoc';
import {
  danhSachTrinhDo,
  cauNoiTheoTrinhDo,
  deVietTheoTrinhDo,
  type TrinhDo,
} from '../demo/trinhDo';
import { baiDoc } from '../demo/baiDoc';
import { baiNghe } from '../demo/baiNghe';

function seed(trinhDo: TrinhDo = 'Pre-A1') {
  localStorage.setItem(
    'engmate-demo-v1',
    JSON.stringify({
      hoSo: { ...hoSoMau, trinhDo },
      tuVung: tuVungMau,
      daDangNhap: true,
      daLamQuen: true,
      phutHoc: 25,
      luotOn: 4,
    }),
  );
}
function doiTrang(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#lo-trinh');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('Lộ trình Pre-A1 đến C2', () => {
  it('starts new learners at Pre-A1 and shows all stages in order', () => {
    render(
      <LuuTru>
        <LoTrinhHoc />
      </LuuTru>,
    );
    const stages = screen.getAllByRole('article');
    expect(stages).toHaveLength(7);
    danhSachTrinhDo.forEach((muc, i) =>
      expect(stages[i]).toHaveAttribute('aria-label', `${muc.id} — ${muc.ten}`),
    );
    expect(within(stages[0]).getByText('Đang học')).toBeVisible();
    expect(screen.getByText('Làm quen bảng chữ cái và âm cơ bản')).toBeVisible();
    expect(screen.getByText(/không phải kết quả kiểm tra năng lực/)).toBeVisible();
  });

  it('saves the selected stage and restores it without dropping existing learner data', () => {
    seed('B1');
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Chọn học C2' }));
    const saved = JSON.parse(localStorage.getItem('engmate-demo-v1')!);
    expect(saved.hoSo.trinhDo).toBe('C2');
    expect(saved.hoSo.ten).toBe(hoSoMau.ten);
    expect(saved.phutHoc).toBe(25);
    expect(saved.tuVung).toHaveLength(tuVungMau.length);
    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Đang học C2' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu từ số 0/ }));
    expect(screen.getByRole('button', { name: 'Đang học Pre-A1' })).toBeDisabled();
  });

  it('opens stage-specific skills and keeps the selected level in the profile', () => {
    seed();
    render(<App />);
    const navigation = screen.getByRole('navigation', { name: 'Luyện kỹ năng C1' });
    const reading = within(navigation).getByRole('link', { name: 'Reading' });
    expect(reading).toHaveAttribute('href', '#luyen-doc?trinh-do=C1');
    fireEvent.click(reading);
    doiTrang('#luyen-doc?trinh-do=C1');
    expect(screen.getByRole('heading', { name: 'Whose streets are quieter?' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('engmate-demo-v1')!).hoSo.trinhDo).toBe('C1');
  });

  it.each(danhSachTrinhDo)('provides working content and chat requests at $id', async ({ id }) => {
    seed(id);
    window.history.replaceState(null, '', '#luyen-noi');
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ reply: `Reply at ${id}`, provider: 'mock', level: id })),
      );
    vi.stubGlobal('fetch', request);
    render(<App />);
    expect(screen.getByLabelText('Trình độ luyện tập')).toHaveValue(id);
    expect(screen.getByRole('heading', { name: `“${cauNoiTheoTrinhDo[id][0]}”` })).toBeVisible();
    doiTrang('#luyen-nghe');
    const nghe = baiNghe.find((bai) => bai.trinhDo === id)!;
    expect(screen.getByRole('heading', { name: nghe.ten })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(nghe.dapAn[nghe.dung]) }));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Chính xác');
    doiTrang('#luyen-doc');
    const doc = baiDoc.find((bai) => bai.trinhDo === id)!;
    expect(screen.getByRole('heading', { name: doc.ten })).toBeVisible();
    const groups = within(screen.getByRole('region', { name: 'Câu hỏi đọc hiểu' })).getAllByRole(
      'group',
    );
    doc.cauHoi.forEach((cau, i) =>
      fireEvent.click(within(groups[i]).getAllByRole('radio')[cau.dung]),
    );
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('3 / 3 câu đúng');
    doiTrang('#luyen-viet');
    expect(screen.getByText(deVietTheoTrinhDo[id]['Đoạn văn'])).toBeVisible();
    doiTrang('#hoi-thoai-ai');
    expect(screen.getByLabelText('Độ khó hội thoại')).toHaveValue(id);
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    expect(await screen.findByText(`Reply at ${id}`)).toBeVisible();
    expect(request).toHaveBeenCalledWith(
      '/api/ai/reply',
      expect.objectContaining({ body: JSON.stringify({ message: 'Hello', level: id }) }),
    );
  });

  it('honours a valid skill link and falls back to the saved level for invalid links', () => {
    seed('B1');
    window.history.replaceState(null, '', '#luyen-noi?trinh-do=C2');
    render(<App />);
    expect(screen.getByLabelText('Trình độ luyện tập')).toHaveValue('C2');
    doiTrang('#luyen-noi?trinh-do=C3');
    expect(screen.getByLabelText('Trình độ luyện tập')).toHaveValue('B1');
    doiTrang('#chu-de-nhap-vai');
    fireEvent.click(screen.getByRole('button', { name: 'Trinh do A1' }));
    expect(screen.getByRole('heading', { name: 'Tôi và gia đình' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Lời chào đầu tiên' })).not.toBeInTheDocument();
  });

  it('changes practice difficulty and resets feedback while retaining the learner’s draft', () => {
    seed();
    window.history.replaceState(null, '', '#luyen-noi');
    render(<App />);
    fireEvent.change(screen.getByLabelText('Trình độ luyện tập'), { target: { value: 'C2' } });
    expect(screen.getByRole('heading', { name: `“${cauNoiTheoTrinhDo.C2[0]}”` })).toBeVisible();
    doiTrang('#luyen-viet');
    fireEvent.change(screen.getByLabelText('Bài viết tiếng Anh'), {
      target: { value: 'Hello. I am Anna.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xem phản hồi mẫu/ }));
    expect(screen.getByText(/phản hồi cố định/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Trình độ luyện tập'), { target: { value: 'C1' } });
    expect(screen.queryByText(/phản hồi cố định/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bài viết tiếng Anh')).toHaveValue('Hello. I am Anna.');
    expect(screen.getByText(deVietTheoTrinhDo.C1['Đoạn văn'])).toBeVisible();
  });

  it('allows all levels in the learner profile and restores a saved advanced level', () => {
    seed();
    window.history.replaceState(null, '', '#ho-so');
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Trình độ tiếng Anh' }));
    for (const muc of danhSachTrinhDo)
      expect(
        screen.getAllByRole('button', { name: `${muc.id} — ${muc.ten}` }).length,
      ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'C2 — Thành thạo' }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Trình độ tiếng Anh' })).toHaveTextContent(
      'C2 — Thành thạo',
    );
  });
});
