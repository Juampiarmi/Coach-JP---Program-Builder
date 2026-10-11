import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Resumen corto a la derecha del título (ej. "3 BLOQUES") */
  badge?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

/** Módulo colapsable del panel lateral (acordeón táctico). */
export function Accordion({ title, badge, open, onToggle, children }: Props) {
  return (
    <section className={`rounded-lg border ${open ? 'border-line bg-surface/30' : 'border-line/70'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <span className="font-mono text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-cyan">[ {title} ]</span>
        <span className="ml-auto truncate font-mono text-[9px] tracking-wider text-steel/70">{badge}</span>
        <svg viewBox="0 0 24 24" className={`size-3.5 shrink-0 text-steel transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="space-y-3 border-t border-line px-3 pt-3 pb-3.5">{children}</div>}
    </section>
  )
}
