import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  count: number
  active: number
  onSelect: (i: number) => void
  onAdd: () => void
  onRemove: () => void
  onRegenerate: () => void
  onMove: (dir: -1 | 1) => void
  regenBusy: boolean
  regenNote: string
  exporting: string | null
  /** Utilidades extra al final de la zona derecha (swap, overlay, formato) */
  trailing?: ReactNode
}

/** Tira de placas debajo del lienzo: [ PLACA 1 | PLACA 2 | ... ] + ◀ ▶ + − y ✨ IA en esta placa. */
/**
 * Barra superior en dos zonas: a la izquierda las pestañas de placas (ocupan todo el espacio
 * libre, nunca se encogen: si no entran, scroll horizontal) y a la derecha las utilidades fijas.
 * Si la fila no alcanza, las utilidades bajan a una segunda línea en vez de aplastar las pestañas.
 */
export function SlideBar({ count, active, onSelect, onAdd, onRemove, exporting, onRegenerate, onMove, regenBusy, regenNote, trailing }: Props) {
  const tabsRef = useRef<HTMLDivElement>(null)
  // La pestaña activa siempre queda a la vista dentro del scroll.
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [active, count])
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      {/* Zona izquierda: las pestañas scrollean; ◀ ▶ + − quedan fijos a la derecha (siempre visibles). */}
      <div className="flex min-w-[min(100%,480px)] flex-1 items-center rounded-lg border border-line bg-surface-2">
      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Placas del carrusel"
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth px-1 py-1"
      >
        <span className="shrink-0 px-1 font-mono text-xs text-steel">[</span>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            onClick={() => onSelect(i)}
            aria-current={i === active}
            aria-selected={i === active}
            className={`shrink-0 rounded-md px-3 py-1.5 font-mono text-xs tracking-wider whitespace-nowrap transition ${
              i === active ? 'bg-cyan text-carbon' : 'text-steel hover:bg-white/5 hover:text-white'
            }`}
          >
            {count > 1 ? `PLACA ${i + 1}` : 'PLACA'}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 border-l border-line px-1 py-1">
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={active === 0}
              title="Mover la placa activa a la izquierda"
              className="shrink-0 rounded-md px-1.5 py-1 font-mono text-[10px] text-steel hover:text-cyan disabled:opacity-25"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={active === count - 1}
              title="Mover la placa activa a la derecha"
              className="shrink-0 rounded-md px-1.5 py-1 font-mono text-[10px] text-steel hover:text-cyan disabled:opacity-25"
            >
              ▶
            </button>
          </>
        )}
        <button type="button" onClick={onAdd} title="Duplicar slide actual" className="shrink-0 rounded-md px-3 py-1.5 font-mono text-xs text-steel hover:text-cyan">
          +
        </button>
        {count > 1 && (
          <button type="button" onClick={onRemove} title="Eliminar slide actual" className="shrink-0 rounded-md px-3 py-1.5 font-mono text-xs text-steel hover:text-fire">
            −
          </button>
        )}
        <span className="shrink-0 px-1 font-mono text-xs text-steel">]</span>
      </div>
      </div>
      {/* Zona derecha: utilidades fijas (nunca le quitan ancho a las pestañas: si no entran, bajan). */}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onRegenerate}
        disabled={Boolean(exporting)}
        title={regenBusy ? 'Cancelar' : `Reescribe o varía la placa ${active + 1} con IA, sin tocar las demás`}
        className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider transition disabled:opacity-50 ${
          regenBusy ? 'animate-pulse border-cyan/60 bg-cyan/10 text-cyan' : 'border-cyan/40 text-cyan/90 hover:bg-cyan/10'
        }`}
      >
        {regenBusy ? '[ ✨ REESCRIBIENDO… ]' : <><span className="hidden sm:inline">[ ✨ IA EN ESTA PLACA ]</span><span className="sm:hidden">✨ IA</span></>}
      </button>
      {regenNote && (
        <span className={`hidden max-w-[200px] shrink truncate font-mono text-[10px] xl:inline ${/✓/.test(regenNote) ? 'text-cyan' : regenBusy ? 'text-gold' : 'text-fire'}`} title={regenNote}>
          {regenNote}
        </span>
      )}
      {exporting && (
        <span className="shrink-0 rounded-lg border border-fire/40 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-fire">
          {exporting}
        </span>
      )}
      {trailing}
      </div>
    </div>
  )
}
