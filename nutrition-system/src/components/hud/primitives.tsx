'use client';

import type { ReactNode } from 'react';
import { SHIELD_BOLT, SHIELD_INNER, SHIELD_OUTER } from '@/lib/brand';
import { doiUrl, type Citation } from '@/lib/evidence';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Shield({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" className={cx('drop-shadow-[0_0_14px_rgba(255,214,0,.35)]', className)} aria-hidden>
      <defs>
        <linearGradient id="shield-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE45C" />
          <stop offset="1" stopColor="#F2C200" />
        </linearGradient>
      </defs>
      <path d={SHIELD_OUTER} fill="url(#shield-g)" stroke="#FFF3A6" strokeOpacity=".55" strokeWidth="1.5" />
      <path d={SHIELD_INNER} fill="none" stroke="#7A6500" strokeOpacity=".55" strokeWidth="2.5" />
      <path d={SHIELD_BOLT} fill="#0B0B0B" />
    </svg>
  );
}

export function Tag({ children, tone = 'cyan', className }: { children: ReactNode; tone?: 'cyan' | 'fire' | 'gold' | 'steel'; className?: string }) {
  const color = { cyan: 'text-cyan-hud', fire: 'text-fire', gold: 'text-gold', steel: 'text-steel' }[tone];
  return <div className={cx('font-mono text-[10.5px] uppercase tracking-[0.22em]', color, className)}>[ {children} ]</div>;
}

export function Panel({
  title,
  tone = 'cyan',
  right,
  children,
  className,
}: {
  title?: ReactNode;
  tone?: 'cyan' | 'fire' | 'gold' | 'steel';
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('hud-panel rounded-xl border border-line bg-panel/95 p-4', className)} data-tone={tone}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <Tag tone={tone}>{title}</Tag> : <span />}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Cite({ c }: { c: Citation }) {
  const body = <>[ {c.label}{c.doi ? ` · DOI ${c.doi}` : ''} ]</>;
  return c.doi ? (
    <a href={doiUrl(c.doi)} target="_blank" rel="noreferrer" className="font-mono text-[9.5px] tracking-[0.08em] text-steel/80 transition hover:text-cyan-hud">
      {body}
    </a>
  ) : (
    <span className="font-mono text-[9.5px] tracking-[0.08em] text-steel/80">{body}</span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-steel">{children}</span>;
}

const inputCls =
  'w-full rounded-lg border border-line2 bg-panel2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-steel/50 focus:border-cyan-hud focus:shadow-[0_0_0_3px_rgba(0,229,255,.12)]';

export function TextField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className={cx(inputCls, 'font-mono', unit && 'pr-12')}
        />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-steel">{unit}</span>}
      </div>
    </label>
  );
}

export function Select<T extends string>({ label, value, onChange, options }: { label?: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const el = (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(inputCls, 'cursor-pointer font-mono text-xs')}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  return label ? (
    <label className="block">
      <Label>{label}</Label>
      {el}
    </label>
  ) : (
    el
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  tone = 'cyan',
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  tone?: 'cyan' | 'gold' | 'fire';
  size?: 'sm' | 'md';
}) {
  const active = {
    cyan: 'bg-cyan-hud text-carbon shadow-[0_0_18px_-4px_rgba(0,229,255,.8)]',
    gold: 'bg-gold text-carbon shadow-[0_0_18px_-4px_rgba(255,214,0,.7)]',
    fire: 'bg-fire text-carbon shadow-fire',
  }[tone];
  return (
    <div className="grid gap-1 rounded-lg border border-line2 bg-panel2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-2 font-mono font-bold uppercase tracking-[0.12em] transition',
            size === 'sm' ? 'py-1.5 text-[9.5px]' : 'py-2.5 text-[10.5px]',
            value === o.value ? active : 'text-steel hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  tone = 'cyan',
  suffix,
  range,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  tone?: 'cyan' | 'gold' | 'fire';
  suffix?: string;
  /** Rango recomendado por evidencia: se marca en la pista y alerta si se sale. */
  range?: readonly [number, number];
}) {
  const color = { cyan: '#00E5FF', gold: '#FFD600', fire: '#FF6B00' }[tone];
  const pct = ((value - min) / (max - min)) * 100;
  const out = range && (value < range[0] - 1e-9 || value > range[1] + 1e-9);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">{label}</span>
        <span className={cx('font-display text-lg font-bold leading-none', out ? 'text-fire' : 'text-ink')}>
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0).replace('.', ',')}
          {suffix && <span className="ml-1 font-mono text-[10px] font-normal text-steel">{suffix}</span>}
        </span>
      </div>
      <div className="relative">
        {range && (
          <div
            className="pointer-events-none absolute top-1/2 h-[10px] -translate-y-1/2 rounded-sm border border-dashed"
            style={{
              left: `${((range[0] - min) / (max - min)) * 100}%`,
              width: `${((range[1] - range[0]) / (max - min)) * 100}%`,
              borderColor: `${color}66`,
            }}
          />
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="hud-range w-full"
          style={{ ['--pct' as string]: `${pct}%`, ['--c' as string]: color }}
        />
      </div>
      {range && (
        <div className={cx('mt-1 font-mono text-[9px] tracking-[0.1em]', out ? 'text-fire' : 'text-steel/70')}>
          {out ? '⚠ FUERA DE RANGO · ' : 'RANGO EVIDENCIA · '}
          {String(range[0]).replace('.', ',')}–{String(range[1]).replace('.', ',')} {suffix}
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, tone = 'gold' }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; tone?: 'gold' | 'cyan' | 'fire' }) {
  const bg = { gold: 'bg-gold', cyan: 'bg-cyan-hud', fire: 'bg-fire' }[tone];
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 text-left">
      <span className={cx('relative h-6 w-11 flex-none rounded-full border border-line2 transition', checked ? bg : 'bg-panel2')}>
        <span className={cx('absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all', checked ? 'left-[22px] bg-carbon' : 'left-0.5 bg-steel')} />
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

export function Readout({
  label,
  value,
  unit,
  tone = 'ink',
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: 'ink' | 'cyan' | 'fire' | 'gold';
  sub?: ReactNode;
}) {
  const color = { ink: 'text-ink', cyan: 'text-cyan-hud', fire: 'text-fire', gold: 'text-gold' }[tone];
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-steel">{label}</div>
      <div className={cx('mt-1 font-display text-2xl font-bold leading-none', color)}>
        {value}
        {unit && <span className="ml-1 font-mono text-[10px] font-normal text-steel">{unit}</span>}
      </div>
      {sub && <div className="mt-1 font-mono text-[9.5px] text-steel">{sub}</div>}
    </div>
  );
}

export function HudButton({
  children,
  onClick,
  tone = 'fire',
  variant = 'solid',
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'fire' | 'cyan' | 'gold' | 'steel';
  variant?: 'solid' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const solid = {
    fire: 'bg-fire text-carbon shadow-fire hover:brightness-110',
    cyan: 'bg-cyan-hud text-carbon shadow-[0_0_24px_-6px_rgba(0,229,255,.8)] hover:brightness-110',
    gold: 'bg-gold text-carbon shadow-gold hover:brightness-110',
    steel: 'bg-line2 text-ink hover:bg-line',
  }[tone];
  const ghost = {
    fire: 'border border-fire/50 text-fire hover:bg-fire/10',
    cyan: 'border border-cyan-hud/40 text-cyan-hud hover:bg-cyan-hud/10',
    gold: 'border border-gold/50 text-gold hover:bg-gold/10',
    steel: 'border border-line2 text-steel hover:text-ink',
  }[tone];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'solid' ? solid : ghost,
        className,
      )}
    >
      {children}
    </button>
  );
}
