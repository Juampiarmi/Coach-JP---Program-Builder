import { WEEKLY_PACK } from '../lib/weeklyPack'

interface Props {
  /** Día cuyo set está en el lienzo (null = otro contenido) */
  active: string | null
  today: string
  /** Días con un proyecto guardado (ya cargados / editados) */
  edited: string[]
  onLoad: (id: string) => void
  /** Descarta las ediciones del día y lo vuelve a armar desde el pack */
  onRestore: (id: string) => void
  compact?: boolean
}

/** [ 📅 CARGAR DÍA: LUN | MAR | … | DOM ]: el set diseñado del Plan Semanal al instante en el lienzo. */
export function WeekDayBar({ active, today, edited, onLoad, onRestore, compact = false }: Props) {
  const current = WEEKLY_PACK.find((d) => d.id === active)
  return (
    <div className={`flex min-w-0 items-center gap-2 ${compact ? 'mb-2' : 'mb-2.5'}`}>
      <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.14em] text-steel uppercase">{compact ? '📅' : '[ 📅 CARGAR DÍA'}</span>
      <div role="group" aria-label="Plan semanal" className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto">
        {WEEKLY_PACK.map((d) => {
          const on = d.id === active
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onLoad(d.id)}
              aria-pressed={on}
              title={`${d.day} · ${d.pillar}: ${d.theme}${edited.includes(d.id) ? ' · con tus ediciones' : ''}`}
              className={`relative shrink-0 rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] transition ${
                on ? 'border-fire bg-fire text-carbon' : d.id === today ? 'border-cyan/60 text-cyan hover:bg-cyan/10' : 'border-line text-steel hover:border-fire/50 hover:text-white'
              }`}
            >
              {d.day}
              {edited.includes(d.id) && !on && <span aria-hidden className="absolute -top-1 -right-1 size-1.5 rounded-full bg-fire" />}
            </button>
          )
        })}
      </div>
      {!compact && <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.14em] text-steel">]</span>}
      {current && (
        <>
          <span className="hidden min-w-0 truncate font-mono text-[10px] tracking-wide text-steel/80 xl:inline">
            ▸ {current.pillar} · {current.theme}
          </span>
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Descartar tus cambios del ${current.day} y volver al set original?`)) onRestore(current.id)
            }}
            title="Descarta tus ediciones de este día y vuelve al set original del pack"
            className="ml-auto shrink-0 rounded-md border border-line px-2 py-1 font-mono text-[9px] tracking-[0.1em] text-steel transition hover:border-fire/50 hover:text-fire"
          >
            ↺ ORIGINAL
          </button>
        </>
      )}
    </div>
  )
}
