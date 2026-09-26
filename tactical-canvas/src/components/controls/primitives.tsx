import type { ReactNode } from 'react'
import { ACCENT_HEX, ACCENT_LABEL } from '../../lib/brand'
import type { Accent } from '../../types'

export function Section({ index, title, children, aside }: { index: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-cyan uppercase">
          [ {index} · {title} ]
        </h2>
        {aside}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/** `plain` evita el <label> cuando el campo agrupa botones (un label reenvía el click al primero). */
export function Field({ label, hint, children, plain }: { label: string; hint?: ReactNode; children: ReactNode; plain?: boolean }) {
  const Tag = plain ? 'div' : 'label'
  return (
    <Tag className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 font-mono text-[11px] tracking-[0.12em] text-steel uppercase">
        {label}
        {hint && <span className="normal-case tracking-normal text-steel/60">{hint}</span>}
      </span>
      {children}
    </Tag>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  uppercase,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  uppercase?: boolean
}) {
  return (
    <input
      className={`tc-input ${uppercase ? 'uppercase' : ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
    />
  )
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  mono?: boolean
}) {
  return (
    <textarea
      className={`tc-input resize-y leading-relaxed ${mono ? 'font-mono text-[13px]' : ''}`}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`flex-1 rounded-lg font-mono font-semibold tracking-wider transition ${
              size === 'sm' ? 'px-2 py-1.5 text-[11px]' : 'px-2 py-2.5 text-[12px]'
            } ${on ? 'bg-cyan text-carbon shadow-[0_0_18px_-4px_rgba(0,229,255,.7)]' : 'text-steel hover:bg-white/5 hover:text-white'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function AccentPicker({ value, onChange, options }: { value: Accent; onChange: (a: Accent) => void; options: Accent[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          aria-pressed={value === a}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] tracking-wider uppercase transition ${
            value === a ? 'border-white/60 bg-white/10 text-white' : 'border-line text-steel hover:text-white'
          }`}
        >
          <span className="size-3 rounded-sm" style={{ background: ACCENT_HEX[a] }} />
          {ACCENT_LABEL[a]}
        </button>
      ))}
    </div>
  )
}

export function Range({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-cyan"
      />
      <span className="w-14 text-right font-mono text-[12px] text-white tabular-nums">
        {value}
        {suffix}
      </span>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="font-mono text-[11px] tracking-[0.12em] text-steel uppercase">{label}</span>
      <span className={`relative h-6 w-11 rounded-full border transition ${checked ? 'border-cyan bg-cyan/25' : 'border-line bg-surface-2'}`}>
        <span
          className={`absolute top-0.5 size-4.5 rounded-full transition-all ${checked ? 'left-[22px] bg-cyan' : 'left-0.5 bg-steel/60'}`}
        />
      </span>
    </button>
  )
}
