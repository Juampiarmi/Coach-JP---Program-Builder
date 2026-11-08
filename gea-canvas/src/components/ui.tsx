'use client';
import type { ReactNode } from 'react';

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  className = '',
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const v = {
    ghost: 'bg-white/[0.04] hover:bg-white/[0.09] text-white/85 ring-1 ring-white/10',
    primary: 'bg-neon text-white hover:brightness-110 shadow-neon',
    outline: 'ring-1 ring-neon/60 text-neon hover:bg-neon/10',
    danger: 'bg-white/[0.04] text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/15',
  }[variant];
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onStart,
  format = (v: number) => v.toFixed(2),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onStart?: () => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[11px] text-white/60">
        <span>{label}</span>
        <span className="tabular-nums text-white/80">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onStart}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="gea-range w-full"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 rounded-lg bg-white/[0.04] p-1 ring-1 ring-white/10 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
            o.value === value ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-white/60">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg bg-black/40 px-3 py-2 text-sm text-white ring-1 ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-neon/70';
