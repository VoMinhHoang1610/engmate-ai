import { useState, useRef, useEffect } from 'react';
import { BieuTuong } from './BieuTuong';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

export function Select({ value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <button
        type="button"
        className={`custom-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{selectedOption ? selectedOption.label : 'Chọn...'}</span>
        <BieuTuong ten="chevron" size={16} />
      </button>
      {open && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
