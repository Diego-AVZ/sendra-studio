import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

export const fieldClass =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#d6ff4a]/70';

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`text-[12px] uppercase tracking-[0.22em] ${light ? 'text-[#141414]' : 'text-white'}`}>
      Sendra Studio
    </Link>
  );
}

export function Menu<T extends string | number>({
  value,
  options,
  onChange,
  className,
  style,
  disabled,
  ink = '#f4f4f5',
  paper = '#1a1a1a',
  accent = '#d6ff4a',
  accentInk = '#141414',
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  ink?: string;
  paper?: string;
  accent?: string;
  accentInk?: string;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((item) => String(item.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const node = event.target as Node;
      if (root.current?.contains(node)) return;
      if ((event.target as HTMLElement | null)?.closest?.('[data-menu-list]')) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const height = Math.min(options.length * 40 + 8, 240);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight && rect.top > height ? rect.top - height - 6 : below;
    setBox({ top, left: rect.left, width: rect.width });
    setOpen((value) => !value);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`${className ?? fieldClass} flex items-center justify-between gap-3 text-left`}
        style={style}
        onClick={toggle}
      >
        <span className="min-w-0 truncate">{current?.label ?? ''}</span>
        <span aria-hidden className="shrink-0 text-[10px] opacity-50">{open ? '▴' : '▾'}</span>
      </button>
      {open && box
        ? createPortal(
            <ul
              data-menu-list
              role="listbox"
              className="max-h-60 overflow-auto rounded-xl p-1 shadow-2xl ring-1 ring-white/15"
              style={{ position: 'fixed', top: box.top, left: box.left, width: box.width, zIndex: 80, background: paper, color: ink }}
            >
              {options.map((item) => {
                const selected = String(item.value) === String(value);
                return (
                  <li key={String(item.value)}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm"
                      style={{ background: selected ? accent : 'transparent', color: selected ? accentInk : ink }}
                      onMouseEnter={(event) => {
                        if (!selected) event.currentTarget.style.background = 'color-mix(in srgb, currentColor 14%, transparent)';
                      }}
                      onMouseLeave={(event) => {
                        if (!selected) event.currentTarget.style.background = 'transparent';
                      }}
                      onClick={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</span>
      {children}
    </label>
  );
}
