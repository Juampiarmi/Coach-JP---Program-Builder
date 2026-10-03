'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FLAME_CORE, FLAME_OUTER, HEX_INNER, HEX_NODES, HEX_OUTER, SHIELD_BOLT, SHIELD_INNER, SHIELD_OUTER } from '@/lib/brand';
import { doiUrl, type Citation } from '@/lib/evidence';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

type Tone = 'cyan' | 'fire' | 'gold' | 'steel' | 'danger';

/** Isotipo Nutrition: hexágono táctico + llama metabólica. */
export function NutritionMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="nm-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF5E1E" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path d={HEX_OUTER} fill="#0B0F17" stroke="#38BDF8" strokeWidth="3" strokeLinejoin="round" />
      <path d={HEX_INNER} fill="none" stroke="#38BDF8" strokeOpacity=".28" strokeWidth="1.2" />
      {HEX_NODES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="#38BDF8" />
      ))}
      <path d={FLAME_OUTER} fill="url(#nm-flame)" />
      <path d={FLAME_CORE} fill="#FDBA74" />
    </svg>
  );
}

/** Escudo Coach JP (firma de marca). */
export function Shield({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" className={className} aria-hidden>
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

const TONE_TEXT: Record<Tone, string> = { cyan: 'text-cyan-hud', fire: 'text-fire', gold: 'text-gold', steel: 'text-mute', danger: 'text-danger' };

export function Tag({ children, tone = 'cyan', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <div className={cx('font-mono text-[10.5px] uppercase tracking-[0.2em]', TONE_TEXT[tone], className)}>[ {children} ]</div>;
}

/** Badge de evidencia / datos: fondo cian 10 %, borde cian 20 %. */
export function Badge({ children, tone = 'cyan', className }: { children: ReactNode; tone?: 'cyan' | 'fire' | 'danger' | 'steel'; className?: string }) {
  const cls = {
    cyan: 'border-cyan-hud/20 bg-cyan-hud/10 text-cyan-hud',
    fire: 'border-fire/35 bg-fire/10 text-fire',
    danger: 'border-danger/40 bg-danger/10 text-danger',
    steel: 'border-line bg-white/[0.03] text-mute',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]', cls, className)}>{children}</span>;
}

export function Panel({ title, tone = 'cyan', right, children, className }: { title?: ReactNode; tone?: Tone; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('hud-panel rounded-xl border border-line bg-panel p-4 sm:p-5', className)} data-tone={tone}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <Tag tone={tone}>{title}</Tag> : <span />}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Cite({ c }: { c: Citation }) {
  const body = (
    <>
      [ {c.label}
      {c.doi ? ` · DOI ${c.doi}` : ''} ]
    </>
  );
  return c.doi ? (
    <a href={doiUrl(c.doi)} target="_blank" rel="noreferrer" className="font-mono text-[9.5px] tracking-[0.06em] text-mute transition hover:text-cyan-hud">
      {body}
    </a>
  ) : (
    <span className="font-mono text-[9.5px] tracking-[0.06em] text-mute">{body}</span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{children}</span>;
}

export const inputCls =
  'w-full rounded-lg border border-line bg-carbon px-3 py-2 text-sm text-ink outline-none transition placeholder:text-mute/70 focus:border-cyan-hud/60 focus:ring-2 focus:ring-cyan-hud/10';

export function TextField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

const fmtNum = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100).replace('.', ',') : '');

/**
 * Input numérico sin spinners: se escribe y se borra libremente (borrador de texto local),
 * acepta coma o punto y emite cada valor válido en tiempo real. Fuera de rango no se emite;
 * al salir del campo vuelve al último valor válido.
 */
export function NumInput({
  value,
  onChange,
  min,
  max,
  decimals = true,
  className,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  decimals?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(fmtNum(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(fmtNum(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      aria-label={ariaLabel}
      value={draft}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        setDraft(fmtNum(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, '');
        setDraft(raw);
        const v = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(v)) return;
        if ((min !== undefined && v < min) || (max !== undefined && v > max)) return;
        onChange(decimals ? v : Math.round(v));
      }}
      className={cx(inputCls, 'tnum font-mono', className)}
    />
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  decimals = true,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: boolean;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="relative">
        <NumInput value={value} onChange={onChange} min={min} max={max} decimals={decimals} ariaLabel={label} className={unit ? 'pr-12' : undefined} />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mute">{unit}</span>}
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
    cyan: 'bg-cyan-hud/[0.08] text-ink ring-1 ring-inset ring-cyan-hud',
    gold: 'bg-gold/[0.07] text-gold ring-1 ring-inset ring-gold/70',
    // Fase / acción: fondo oscuro con borde y texto naranja de alto contraste.
    fire: 'bg-carbon text-fire ring-1 ring-inset ring-fire shadow-[0_0_14px_-8px_rgba(255,94,30,.9)]',
  }[tone];
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-carbon p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-2 font-mono font-bold uppercase tracking-[0.1em] transition',
            size === 'sm' ? 'py-1.5 text-[9.5px]' : 'py-2.5 text-[10.5px]',
            value === o.value ? active : 'text-mute hover:text-steel',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tarjeta de selección (grasa estimada, actividad, tipo de sesión). */
export function ChoiceCard({ active, title, meta, hint, onClick }: { active: boolean; title: string; meta?: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'relative rounded-lg border p-3 text-left transition',
        active ? 'border-cyan-hud bg-cyan-hud/[0.08]' : 'border-white/[0.06] bg-panel hover:border-white/[0.14]',
      )}
    >
      {active && <span className="absolute right-2 top-2 rounded border border-cyan-hud/30 bg-cyan-hud/10 px-1.5 py-px font-mono text-[8.5px] font-bold tracking-[0.14em] text-cyan-hud">✓ SEL</span>}
      <div className={cx('pr-12 text-sm font-semibold', active ? 'text-ink' : 'text-mute')}>{title}</div>
      {meta && <div className={cx('mt-0.5 font-mono text-[11px]', active ? 'text-cyan-hud' : 'text-mute')}>{meta}</div>}
      {hint && <div className={cx('mt-1 text-xs leading-snug', active ? 'text-steel' : 'text-mute/80')}>{hint}</div>}
    </button>
  );
}

/**
 * Slider táctico + entrada numérica directa. Cian si está dentro del rango de evidencia;
 * naranja con alerta si sale del rango.
 */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  range,
  alert,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  tone?: 'cyan' | 'gold' | 'fire';
  suffix?: string;
  range?: readonly [number, number];
  /** Mensaje cuando el valor sale del rango recomendado. */
  alert?: (low: boolean) => string;
}) {
  const out = !!range && (value < range[0] - 1e-9 || value > range[1] + 1e-9);
  const color = out ? '#F97316' : '#38BDF8';
  const pct = ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{label}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-[78px]">
            <NumInput value={value} onChange={(v) => onChange(Math.min(max, Math.max(min, v)))} ariaLabel={label} className={cx('py-1 text-right text-base font-bold', out ? 'border-fire/60 text-fire' : 'text-ink')} />
          </div>
          {suffix && <span className="w-10 font-mono text-[10px] text-mute">{suffix}</span>}
        </div>
      </div>
      <div className="relative">
        {range && (
          <div
            className="pointer-events-none absolute top-1/2 h-[9px] -translate-y-1/2 rounded-sm border border-dashed border-cyan-hud/30"
            style={{ left: `${((range[0] - min) / (max - min)) * 100}%`, width: `${((range[1] - range[0]) / (max - min)) * 100}%` }}
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
        <div className={cx('mt-1 font-mono text-[9.5px] tracking-[0.06em]', out ? 'text-fire' : 'text-mute')}>
          {out ? `⚠ ${alert ? alert(value < range[0]) : 'FUERA DEL RANGO RECOMENDADO'} · ` : 'RANGO ÓPTIMO · '}
          {String(range[0]).replace('.', ',')}–{String(range[1]).replace('.', ',')} {suffix}
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, tone = 'cyan' }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; tone?: 'gold' | 'cyan' | 'fire' }) {
  const on = {
    gold: 'border-gold/70 bg-gold/15 shadow-[0_0_12px_-4px_rgba(255,214,0,.7)]',
    cyan: 'border-cyan-hud/70 bg-cyan-hud/15 shadow-[0_0_12px_-4px_rgba(56,189,248,.8)]',
    fire: 'border-fire/70 bg-fire/15 shadow-[0_0_12px_-4px_rgba(255,94,30,.8)]',
  }[tone];
  const knob = { gold: 'bg-gold', cyan: 'bg-cyan-hud', fire: 'bg-fire' }[tone];
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 text-left">
      <span className={cx('relative h-6 w-11 flex-none rounded-full border transition', checked ? on : 'border-line bg-carbon')}>
        <span className={cx('absolute top-[3px] h-4 w-4 rounded-full transition-all', checked ? `left-[23px] ${knob}` : 'left-[3px] bg-mute')} />
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
  tone?: 'ink' | 'cyan' | 'fire' | 'gold' | 'danger';
  sub?: ReactNode;
}) {
  // Cifras en blanco; el tono marca el filete lateral (fire/danger también tiñen la cifra como alerta).
  const color = tone === 'fire' ? 'text-fire' : tone === 'danger' ? 'text-danger' : 'text-ink';
  const edge = { ink: 'before:bg-white/10', cyan: 'before:bg-cyan-hud', fire: 'before:bg-fire', gold: 'before:bg-gold/70', danger: 'before:bg-danger' }[tone];
  return (
    <div className={cx('relative overflow-hidden rounded-lg border border-line bg-carbon px-3 py-2.5 before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-r', edge)}>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute">{label}</div>
      <div className={cx('tnum mt-1 font-mono text-2xl font-bold leading-none', color)}>
        {value}
        {unit && <span className="ml-1 font-mono text-[10px] font-normal text-mute">{unit}</span>}
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
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'fire' | 'cyan' | 'gold' | 'steel';
  variant?: 'solid' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}) {
  const solid = {
    // CTA: naranja táctico; hover #FF5E1E con micro-glow controlado.
    fire: 'border border-fire bg-fire text-white hover:border-fire-hot hover:bg-fire-hot hover:shadow-fire',
    cyan: 'border border-cyan-hud/40 bg-cyan-hud/10 text-cyan-hud hover:border-cyan-hud hover:shadow-cyan',
    gold: 'border border-gold/40 bg-gold/10 text-gold hover:border-gold/80',
    steel: 'border border-line bg-white/[0.04] text-steel hover:text-ink',
  }[tone];
  const ghost = {
    fire: 'border border-fire/40 text-fire hover:border-fire hover:bg-fire/10',
    cyan: 'border border-cyan-hud/30 text-cyan-hud hover:border-cyan-hud/70 hover:bg-cyan-hud/10',
    gold: 'border border-gold/35 text-gold hover:bg-gold/10',
    steel: 'border border-line text-steel hover:border-white/20 hover:text-ink',
  }[tone];
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'solid' ? solid : ghost,
        className,
      )}
    >
      {children}
    </button>
  );
}
