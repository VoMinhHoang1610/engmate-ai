import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HoTroNhanh } from './HoTroNhanh';

function nutHoTro() {
  render(<HoTroNhanh />);
  const button = screen.getByRole('button', { name: 'Hỗ trợ' });
  const capture = vi.fn();
  const release = vi.fn();
  Object.defineProperty(button, 'setPointerCapture', { value: capture });
  Object.defineProperty(button, 'releasePointerCapture', { value: release });
  return { button, capture, release };
}

describe('Hỗ trợ nhanh', () => {
  it('captures the button when pressing its SVG icon and toggles the chat', () => {
    const { button, capture, release } = nutHoTro();
    const icon = button.querySelector('svg')!;
    fireEvent.pointerDown(icon, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(capture).toHaveBeenCalledWith(1);
    fireEvent.pointerUp(icon, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(release).toHaveBeenCalledWith(1);
    expect(button.closest('.floating-support')).toHaveClass('is-open');
    fireEvent.pointerDown(button, { pointerId: 2 });
    fireEvent.pointerUp(button, { pointerId: 2 });
    expect(button.closest('.floating-support')).not.toHaveClass('is-open');
  });

  it('moves from the current position without opening the chat after a drag', () => {
    const { button } = nutHoTro();
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 130, clientY: 120 });
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 130, clientY: 120 });
    expect(button.closest('.floating-support')).toHaveStyle({ transform: 'translate(6px, -4px)' });
    expect(button.closest('.floating-support')).not.toHaveClass('is-open');
    fireEvent.pointerDown(button, { pointerId: 2, clientX: 130, clientY: 120 });
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 140, clientY: 130 });
    fireEvent.pointerUp(button, { pointerId: 2, clientX: 140, clientY: 130 });
    expect(button.closest('.floating-support')).toHaveStyle({ transform: 'translate(16px, 6px)' });
  });
});
