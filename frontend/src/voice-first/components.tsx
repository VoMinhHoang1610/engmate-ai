import { forwardRef, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUp, Keyboard, Mic, X } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ label, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('mate-icon-button', className)}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
});

export { MateOrb as Orb } from '../components/MateOrb';

export function VoiceButton({
  onClick,
  active,
  label = 'Bắt đầu nói chuyện',
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      className={cn('mate-voice-button', active && 'is-active')}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      <Mic size={30} strokeWidth={1.75} />
    </motion.button>
  );
}

export function ChipSuggestion({
  icon,
  children,
  onClick,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="mate-chip"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
}

export function ChatInput({
  onSend,
  disabled = false,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  return (
    <form
      className={cn('mate-chat-input', focused && 'is-expanded')}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim() || disabled) return;
        onSend(text.trim());
        setText('');
      }}
    >
      <Keyboard size={20} strokeWidth={1.75} aria-hidden="true" />
      <textarea
        aria-label="Nhắn cho Mate"
        placeholder="Muốn gõ? Nhắn Mate ở đây…"
        value={text}
        rows={focused ? 2 : 1}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        disabled={disabled}
        maxLength={1000}
      />
      <IconButton
        label="Gửi tin nhắn"
        type="submit"
        className="mate-send-button"
        disabled={!text.trim() || disabled}
      >
        <ArrowUp size={20} />
      </IconButton>
    </form>
  );
}

export function ScoreRing({
  value,
  label,
  size = 144,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 54;
  return (
    <div
      className="mate-score-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? 'Điểm'}: ${safe}%`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="mate-ring-track" cx="60" cy="60" r="54" />
        <circle
          className="mate-ring-value"
          cx="60"
          cy="60"
          r="54"
          strokeDasharray={`${(circumference * safe) / 100} ${circumference}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div>
        <strong>
          {safe}
          <small>%</small>
        </strong>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="mate-app mate-dialog-overlay" />
        <Dialog.Content
          className="mate-app mate-sheet"
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!document.querySelector('.voice-session-root') && opener.current?.isConnected)
              opener.current.focus();
          }}
        >
          <div className="mate-sheet-handle" />
          <Dialog.Title>{title}</Dialog.Title>
          {description ? (
            <Dialog.Description>{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="mate-sr-only">
              Thông tin và lựa chọn bài học
            </Dialog.Description>
          )}
          <Dialog.Close asChild>
            <IconButton label="Đóng" className="mate-sheet-close">
              <X size={20} />
            </IconButton>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
