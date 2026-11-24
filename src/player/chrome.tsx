import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { pageWidth, type ButtonStyle, type FontId, type InputStyle, type Theme } from '@/schema/protocol';

export function headline(font: FontId) {
  return font === 'fraunces' ? 'italic tracking-[-0.03em]' : 'tracking-[-0.045em]';
}

export function contentFrame(width: number) {
  const next = pageWidth(width);
  const full = next >= 100;
  return {
    className: full ? 'w-full' : 'mx-auto w-full',
    style: full ? undefined : { width: `${next}%` },
  };
}

export function sceneProps(theme: Theme, embed = false): { className: string; style: CSSProperties } {
  return {
    className: `scene-${theme.background} font-${theme.font} ${embed ? 'min-h-full' : 'min-h-dvh'}`,
    style: {
      color: theme.ink,
      ['--paper' as string]: theme.paper,
      ['--ink' as string]: theme.ink,
      ['--accent' as string]: theme.accent,
    },
  };
}

export function ActionButton({
  theme,
  look,
  children,
  onClick,
  disabled,
  fill,
  pad,
  radius,
}: {
  theme: Theme;
  look?: ButtonStyle | 'theme';
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  fill?: boolean;
  pad?: number;
  radius?: number;
}) {
  const style = !look || look === 'theme' ? theme.button : look;
  const ghost = style === 'ghost';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center text-sm font-medium disabled:opacity-45 ${fill ? 'h-full min-h-11' : 'px-4 py-3'}`}
      style={{
        padding: fill ? pad : undefined,
        borderRadius: radius ?? (style === 'pill' ? 9999 : style === 'sharp' ? 0 : theme.radius),
        background: ghost ? 'transparent' : theme.accent,
        color: ghost ? theme.ink : theme.accentInk,
        border: ghost ? `1px solid ${theme.accent}` : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

export function TextField({
  theme,
  look,
  value,
  placeholder,
  onChange,
  readOnly,
  grow,
}: {
  theme: Theme;
  look?: InputStyle | 'theme';
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  grow?: boolean;
}) {
  const style = !look || look === 'theme' ? theme.input : look;
  return (
    <input
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      className={`w-full px-3 text-sm outline-none placeholder:opacity-40 ${grow ? 'min-h-12 flex-1' : 'py-3'}`}
      style={{
        color: theme.ink,
        borderRadius: style === 'line' ? 0 : theme.radius,
        background: style === 'filled' ? `color-mix(in srgb, ${theme.ink} 8%, transparent)` : 'transparent',
        border: style === 'outline' ? `1px solid color-mix(in srgb, ${theme.ink} 28%, transparent)` : '1px solid transparent',
        borderBottom: style === 'line' ? `1px solid color-mix(in srgb, ${theme.ink} 55%, transparent)` : undefined,
      }}
    />
  );
}

export function cardStyle(theme: Theme): CSSProperties {
  return {
    borderRadius: theme.radius,
    border: `1px solid color-mix(in srgb, ${theme.ink} 12%, transparent)`,
    background: `color-mix(in srgb, ${theme.paper} 72%, ${theme.ink} 5%)`,
  };
}
