import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HoTroNhanh } from './HoTroNhanh';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 1;
    this.isPrimary = options.isPrimary ?? true;
  }
}

beforeEach(() => {
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  vi.stubGlobal('innerWidth', 390);
  vi.stubGlobal('innerHeight', 844);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe('Hỗ trợ với Mate', () => {
  it('shows Mate on the phone and opens and closes support by click or keyboard', () => {
    render(<HoTroNhanh />);
    const button = screen.getByRole('button', { name: 'Hỗ trợ' });
    expect(button.querySelector('[data-mate-mood="support"] .mate-phone')).not.toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Hỗ trợ & Báo lỗi' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    fireEvent.click(button, { detail: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng hỗ trợ' }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('captures the button when pressing its mascot and drags without opening the panel', () => {
    render(<HoTroNhanh />);
    const button = screen.getByRole('button', { name: 'Hỗ trợ' });
    const wrapper = button.parentElement!;
    fireEvent.pointerDown(button.querySelector('.mate-phone')!, {
      pointerId: 3,
      clientX: 330,
      clientY: 780,
      button: 0,
    });
    expect(button.setPointerCapture).toHaveBeenCalledWith(3);
    expect(wrapper).toHaveClass('is-dragging');
    fireEvent.pointerMove(button, { pointerId: 3, clientX: 200, clientY: 400 });
    expect(wrapper).toHaveStyle({ right: '154px', bottom: '404px' });
    fireEvent.pointerUp(button, { pointerId: 3 });
    expect(button.releasePointerCapture).toHaveBeenCalledWith(3);
    fireEvent.click(button, { detail: 1 });
    expect(wrapper).not.toHaveClass('is-dragging');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(button, { detail: 0 });
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('continues a second drag from the current position without opening support', () => {
    render(<HoTroNhanh />);
    const button = screen.getByRole('button', { name: 'Hỗ trợ' });
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 330, clientY: 780, button: 0 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 200, clientY: 400 });
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button, { detail: 1 });
    expect(button.parentElement).toHaveStyle({ right: '154px', bottom: '404px' });
    fireEvent.pointerDown(button, { pointerId: 2, clientX: 200, clientY: 400, button: 0 });
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 220, clientY: 410 });
    fireEvent.pointerUp(button, { pointerId: 2 });
    fireEvent.click(button, { detail: 1 });
    expect(button.parentElement).toHaveStyle({ right: '134px', bottom: '394px' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clamps the button and open panel within the viewport and handles resize', () => {
    render(<HoTroNhanh />);
    const button = screen.getByRole('button', { name: 'Hỗ trợ' });
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 330, clientY: 780, button: 0 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: -1000, clientY: -1000 });
    expect(button.parentElement).toHaveStyle({ right: '310px', bottom: '764px' });
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button, { detail: 1 });
    fireEvent.click(button, { detail: 0 });
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveStyle({ left: '12px', top: '92px', width: '320px' });
    vi.stubGlobal('innerWidth', 320);
    vi.stubGlobal('innerHeight', 400);
    fireEvent(window, new Event('resize'));
    expect(button.parentElement).toHaveStyle({ right: '240px', bottom: '320px' });
    expect(panel).toHaveStyle({ left: '12px', top: '12px', width: '296px', height: '376px' });
  });

  it('ignores secondary pointers and handles tiny movement, cancellation and lost capture', () => {
    render(<HoTroNhanh />);
    const button = screen.getByRole('button', { name: 'Hỗ trợ' });
    fireEvent.pointerDown(button, { pointerId: 1, button: 2 });
    expect(button.parentElement).not.toHaveClass('is-dragging');
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, clientX: 330, clientY: 780 });
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 0, clientY: 0 });
    expect(button.parentElement).toHaveStyle({ right: '24px', bottom: '24px' });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 332, clientY: 781 });
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button, { detail: 1 });
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(button);
    fireEvent.pointerDown(button, { pointerId: 1, button: 0 });
    fireEvent.pointerCancel(button, { pointerId: 1 });
    fireEvent.click(button, { detail: 1 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.pointerDown(button, { pointerId: 1, button: 0 });
    fireEvent.lostPointerCapture(button, { pointerId: 1 });
    expect(button.parentElement).not.toHaveClass('is-dragging');
  });
});
