import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

vi.mock('../speech/audio', () => ({
  docVanBan: vi.fn().mockResolvedValue(undefined),
  dungDoc: vi.fn(),
}));

type ObserverCallback = IntersectionObserverCallback;

describe('LandingPage', () => {
  const observerCallbacks: ObserverCallback[] = [];

  beforeEach(() => {
    observerCallbacks.length = 0;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: ObserverCallback) {
          observerCallbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
        root = null;
        rootMargin = '';
        thresholds: readonly number[] = [];
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders hero, interactive steps, learning scenarios, and FAQ on a single white canvas', () => {
    const onStartLogin = vi.fn();
    const onStartRegister = vi.fn();

    render(<LandingPage onStartLogin={onStartLogin} onStartRegister={onStartRegister} />);

    expect(screen.getByText('Gợi ý cách luyện cùng Mate')).toBeInTheDocument();
    expect(screen.getAllByText(/Tình huống gợi ý/)).toHaveLength(4);
    expect(screen.queryByText(/98%|99\.9%|50ms|320ms/)).not.toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /Chinh phục tiếng Anh giao tiếp tự tin cùng Gia sư AI Mate/i,
      }),
    ).toBeInTheDocument();

    // Interactive step selector
    const step2Tab = screen.getByRole('tab', {
      name: /Đối thoại giọng nói 2 chiều cùng Thầy Mate/i,
    });
    fireEvent.click(step2Tab);
    expect(screen.getByText('Phòng học hội thoại trực tiếp')).toBeInTheDocument();

    // FAQ accordion toggle
    const faqButton = screen.getByRole('button', {
      name: /Tôi mới bắt đầu \(A1–A2\) hoặc mất gốc thì có theo kịp không\?/i,
    });
    fireEvent.click(faqButton);
    expect(screen.getByText(/Hoàn toàn phù hợp!/i)).toBeInTheDocument();

    // CTA triggers
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onStartLogin).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu học miễn phí ngay/i }));
    expect(onStartRegister).toHaveBeenCalledTimes(1);
  });

  it('toggles reveal visibility when elements enter and leave the viewport', () => {
    render(<LandingPage onStartLogin={vi.fn()} onStartRegister={vi.fn()} />);
    const target = document.querySelector('[data-reveal]') as HTMLElement;
    const revealObserver = observerCallbacks[0];
    expect(target).toBeTruthy();
    expect(revealObserver).toBeTypeOf('function');

    const fire = (isIntersecting: boolean) => {
      act(() => {
        revealObserver(
          [
            {
              target,
              isIntersecting,
              intersectionRatio: isIntersecting ? 0.4 : 0,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
              time: 0,
            },
          ],
          {} as IntersectionObserver,
        );
      });
    };

    fire(true);
    expect(target.classList.contains('is-visible')).toBe(true);
    fire(false);
    expect(target.classList.contains('is-visible')).toBe(false);
    fire(true);
    expect(target.classList.contains('is-visible')).toBe(true);
  });
});
