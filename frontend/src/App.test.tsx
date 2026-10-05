import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function moTrang(hash: string) {
  window.history.replaceState(null, '', hash);
  return render(<App />);
}

function doiTrang(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#tong-quan');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('EngMate demo', () => {
  it('shows each scrollbar only while scrolling and cleans up idle timers', () => {
    vi.useFakeTimers();
    try {
      const view = moTrang('#tong-quan');
      const page = document.documentElement;
      const sidebar = document.getElementById('menu-chinh')!;
      expect(page).not.toHaveClass('is-scrolling');
      expect(sidebar).not.toHaveClass('is-scrolling');

      fireEvent.scroll(document);
      expect(page).toHaveClass('is-scrolling');
      expect(sidebar).not.toHaveClass('is-scrolling');
      act(() => vi.advanceTimersByTime(600));
      fireEvent.scroll(sidebar);
      fireEvent.scroll(document);
      act(() => vi.advanceTimersByTime(600));
      expect(page).toHaveClass('is-scrolling');
      expect(sidebar).toHaveClass('is-scrolling');
      act(() => vi.advanceTimersByTime(400));
      expect(page).not.toHaveClass('is-scrolling');
      expect(sidebar).not.toHaveClass('is-scrolling');

      fireEvent.scroll(sidebar);
      view.unmount();
      expect(sidebar).not.toHaveClass('is-scrolling');
      fireEvent.scroll(document);
      expect(page).not.toHaveClass('is-scrolling');
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders the application shell, keyboard skip and mobile menu', () => {
    moTrang('#tong-quan');

    expect(screen.getByRole('heading', { name: /Chao Anh/ })).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Menu chính' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(10);
    expect(within(navigation).getByRole('link', { name: 'Tổng quan' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(document.title).toBe('Tổng quan · EngMate-AI');

    const menuButton = screen.getByRole('button', { name: 'Mở menu' });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua menu' }));
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('limits demo labels to AI features', () => {
    moTrang('#tong-quan');
    expect(document.querySelector('.topbar')).not.toHaveTextContent(/demo/i);
    expect(document.querySelector('.sidebar')).not.toHaveTextContent(/demo/i);
    expect(document.querySelector('.hero-tag')).toHaveTextContent(/AI · DEMO/);

    for (const route of ['luyen-nghe', 'so-tu-vung', 'flashcard', 'ho-so', 'cai-dat']) {
      doiTrang(`#${route}`);
      expect(screen.getByRole('main')).not.toHaveTextContent(/demo/i);
    }
    for (const route of ['hoi-thoai-ai', 'luyen-noi', 'luyen-viet']) {
      doiTrang(`#${route}`);
      expect(screen.getByRole('main')).toHaveTextContent(/AI · Demo/);
    }
  });

  it('warns when the browser cannot persist demo data', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'QuotaExceededError');
    });

    try {
      moTrang('#tong-quan');
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Thay doi chi duoc giu trong phien nay',
      );
    } finally {
      setItem.mockRestore();
    }
  });

  it('routes to every Vietnamese page and falls back for unknown routes', () => {
    moTrang('#tong-quan');
    const pages = [
      ['#hoi-thoai-ai', 'Hội thoại AI'],
      ['#luyen-noi', 'Luyện nói'],
      ['#chu-de-nhap-vai', 'Chủ đề & nhập vai'],
      ['#luyen-nghe', 'Luyện nghe'],
      ['#luyen-viet', 'Luyện viết'],
      ['#so-tu-vung', 'Sổ từ vựng'],
      ['#flashcard', 'Flashcard'],
      ['#ho-so', 'Hồ sơ học tập'],
      ['#cai-dat', 'Cài đặt'],
    ] as const;

    for (const [hash, heading] of pages) {
      doiTrang(hash);
      expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      expect(document.title).toBe(`${heading} · EngMate-AI`);
    }

    doiTrang('#khong-ton-tai');
    expect(screen.getByRole('heading', { name: /Chao Anh/ })).toBeVisible();
  });

  it('saves a validated learner profile and restores it from local storage', () => {
    const view = moTrang('#ho-so');
    const name = screen.getByLabelText('Họ và tên');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui long nhap ho va ten');

    fireEvent.change(name, { target: { value: 'Lan Anh' } });
    fireEvent.change(screen.getByLabelText(/Thời gian học mỗi ngày/), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Da luu ho so');

    view.unmount();
    moTrang('#tong-quan');
    expect(screen.getByRole('heading', { name: /Chao Anh/ })).toBeVisible();
    expect(screen.getByRole('link', { name: '30 phút / ngày' })).toBeVisible();
  });

  it('demonstrates account login, logout, registration and password recovery', () => {
    moTrang('#tai-khoan');
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'lan@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    const loginForm = screen.getByLabelText('Email').closest('form')!;
    fireEvent.click(within(loginForm).getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByRole('heading', { name: /Chào mừng/ })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Bao An' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bao@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(screen.getByRole('heading', { name: 'Chào mừng, Bao An!' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bao@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Yêu cầu đã được ghi nhận trên trình duyệt này.',
    );
  });

  it('sends chat messages and handles an invalid backend response', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ reply: 'Nice to meet you!', provider: 'mock', level: 'B1' })),
      );
    vi.stubGlobal('fetch', request);
    moTrang('#hoi-thoai-ai?chu-de=travel');

    fireEvent.click(screen.getByRole('button', { name: 'Tell me more.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    expect(screen.getByRole('log')).toHaveTextContent('Tell me more.');
    expect(screen.getByRole('status')).toHaveTextContent('EngMate đang phản hồi');
    expect(await screen.findByText('Nice to meet you!')).toBeVisible();
    expect(request).toHaveBeenCalledWith(
      '/api/ai/reply',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Tell me more.', level: 'B1' }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Giải thích tiếng Việt/ }));
    expect(screen.getByText(/cach yeu cau lich su/)).toBeVisible();

    request.mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: true })));
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Hello again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Phản hồi backend khong hop le');
  });

  it('aborts a pending chat request when leaving the page', async () => {
    const request = vi.fn().mockReturnValue(new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', request);
    const view = moTrang('#hoi-thoai-ai');
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    const signal = request.mock.calls[0][1].signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it('runs the speaking, listening and writing exercises', async () => {
    moTrang('#luyen-noi');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu ghi âm' }));
    expect(screen.getByRole('alert')).toHaveTextContent('chua ho tro ghi am');
    fireEvent.change(screen.getByLabelText('Bản chép lời / câu bạn muốn phân tích'), {
      target: { value: 'I want coffee' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xem phân tích mẫu/ }));
    expect(screen.getByText(/Câu bạn nhập:/)).toHaveTextContent('I want coffee');
    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/ }));

    doiTrang('#luyen-nghe');
    await screen.findByRole('heading', { name: 'Luyện nghe' });
    fireEvent.click(screen.getByRole('radio', { name: /A small latte with oat milk/ }));
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Chinh xac');
    fireEvent.click(screen.getByRole('tab', { name: 'Chép chính tả' }));
    fireEvent.change(screen.getByLabelText('Câu chính tả'), {
      target: { value: "I'd like a takeaway coffee, please." },
    });
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra đáp án/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Chinh xac');

    doiTrang('#luyen-viet');
    await screen.findByRole('heading', { name: 'Luyện viết' });
    fireEvent.click(screen.getByRole('button', { name: /Gợi ý mở đầu/ }));
    fireEvent.change(screen.getByLabelText('Bài viết tiếng Anh'), {
      target: { value: 'I am study English because it is very good.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xem phản hồi mẫu/ }));
    expect(screen.getByText(/phan hoi co dinh/)).toBeVisible();
  });

  it('adds, filters and reviews vocabulary with spaced repetition', async () => {
    moTrang('#so-tu-vung');
    fireEvent.click(screen.getByRole('button', { name: /Thêm từ mới/ }));
    fireEvent.change(screen.getByLabelText('Từ tiếng Anh'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Nghĩa tiếng Việt'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu từ vựng/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Vui long nhap');

    fireEvent.change(screen.getByLabelText('Từ tiếng Anh'), { target: { value: 'curious' } });
    fireEvent.change(screen.getByLabelText('Nghĩa tiếng Việt'), { target: { value: 'to mo' } });
    fireEvent.change(screen.getByLabelText('Câu ví dụ'), {
      target: { value: "I'm curious about the world." },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu từ vựng/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Da them tu moi');
    fireEvent.change(screen.getByLabelText('Tìm từ vựng'), { target: { value: 'curious' } });
    expect(screen.getByRole('heading', { name: 'curious' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Đánh dấu đã thuộc/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Đã thuộc' })[0]);
    expect(screen.getByRole('heading', { name: 'curious' })).toBeVisible();

    doiTrang('#flashcard');
    await screen.findByRole('heading', { name: 'Flashcard' });
    fireEvent.click(screen.getByRole('button', { name: /Tu curious/ }));
    expect(screen.getByRole('button', { name: /Nghia cua curious/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Good.*Sau 4 ngày/ }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('filters role-play topics and opens a selected conversation', async () => {
    moTrang('#chu-de-nhap-vai');
    fireEvent.click(screen.getByRole('button', { name: 'Trinh do B2' }));
    const topic = screen.getByRole('heading', { name: 'Thế giới công nghệ' }).closest('article');
    expect(topic).not.toBeNull();
    fireEvent.click(within(topic as HTMLElement).getByRole('button', { name: /Bắt đầu nhập vai/ }));
    expect(await screen.findByRole('heading', { name: 'Hội thoại AI' })).toBeVisible();
    expect(screen.getByText('Thế giới công nghệ')).toBeVisible();
  });

  it('records and releases a local speaking sample when browser APIs are available', async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    class RecorderMock {
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['voice']) } as BlobEvent);
        this.onstop?.(new Event('stop'));
      }
    }
    vi.stubGlobal('MediaRecorder', RecorderMock);
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    moTrang('#luyen-noi');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu ghi âm' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Dang ghi am');
    fireEvent.click(screen.getByRole('button', { name: 'Dừng ghi âm' }));
    await waitFor(() => expect(document.querySelector('audio')).not.toBeNull());
    expect(createUrl).toHaveBeenCalledOnce();
    expect(stopTrack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo/ }));
    expect(revokeUrl).toHaveBeenCalledWith('blob:recording');
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });

  it('completes and repeats a one-card review session', () => {
    localStorage.setItem(
      'engmate-demo-v1',
      JSON.stringify({
        hoSo: {
          ten: 'Minh Anh',
          email: 'minhanh@example.com',
          trinhDo: 'B1',
          mucTieu: 'Giao tiếp tự tin',
          phutMoiNgay: 20,
        },
        tuVung: [
          {
            id: 'one',
            tu: 'steady',
            nghia: 'on dinh',
            phienAm: '/ˈsted.i/',
            loai: 'Tính từ',
            viDu: 'Make steady progress.',
            daThuoc: false,
            henOn: '',
          },
        ],
        daDangNhap: false,
        phutHoc: 0,
        luotOn: 0,
      }),
    );
    moTrang('#flashcard');
    fireEvent.click(screen.getByRole('button', { name: /Tu steady/ }));
    fireEvent.click(screen.getByRole('button', { name: /Easy.*Sau 7 ngày/ }));
    expect(screen.getByRole('heading', { name: /Them mot buoc tien/ })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Ôn lại tất cả/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tu steady/ }));
    fireEvent.click(screen.getByRole('button', { name: /Again.*Ôn lại trong phiên/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tu steady/ }));
    fireEvent.click(screen.getByRole('button', { name: /Hard.*Sau 1 ngày/ }));
    expect(screen.getByRole('heading', { name: /Them mot buoc tien/ })).toBeVisible();
  });
});
