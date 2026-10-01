interface Props {
  count: number
  active: number
  onSelect: (i: number) => void
  onAdd: () => void
  onRemove: () => void
  onExportAll: () => void
  onExportZip: () => void
  onRegenerate: () => void
  onMove: (dir: -1 | 1) => void
  regenBusy: boolean
  regenNote: string
  exporting: string | null
}

/** Paginación de la secuencia: [ PLACA 1 | PLACA 2 | ... ] + exportar todas (PNG sueltos o .zip). */
export function SlideBar({ count, active, onSelect, onAdd, onRemove, onExportAll, onExportZip, exporting, onRegenerate, onMove, regenBusy, regenNote }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="tc-scroll flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface-2 p-0.5">
        <span className="shrink-0 px-1.5 font-mono text-[10px] text-steel">[</span>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === active}
            className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] tracking-wider transition ${
              i === active ? 'bg-cyan text-carbon' : 'text-steel hover:bg-white/5 hover:text-white'
            }`}
          >
            {count > 1 ? `PLACA ${i + 1}` : 'PLACA'}
          </button>
        ))}
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
        <button type="button" onClick={onAdd} title="Duplicar slide actual" className="shrink-0 rounded-md px-2 py-1 font-mono text-[11px] text-steel hover:text-cyan">
          +
        </button>
        {count > 1 && (
          <button type="button" onClick={onRemove} title="Eliminar slide actual" className="shrink-0 rounded-md px-2 py-1 font-mono text-[11px] text-steel hover:text-fire">
            −
          </button>
        )}
        <span className="shrink-0 px-1.5 font-mono text-[10px] text-steel">]</span>
      </div>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={Boolean(exporting)}
        title={regenBusy ? 'Cancelar' : `Pide a la IA una versión nueva de la placa ${active + 1} sin tocar las demás`}
        className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider transition disabled:opacity-50 ${
          regenBusy ? 'animate-pulse border-cyan/60 bg-cyan/10 text-cyan' : 'border-cyan/40 text-cyan/90 hover:bg-cyan/10'
        }`}
      >
        {regenBusy ? '[ ⚡ RE-GENERANDO… ]' : <><span className="hidden sm:inline">[ ⚡ RE-GENERAR ESTA ]</span><span className="sm:hidden">⚡</span></>}
      </button>
      {regenNote && (
        <span className={`hidden max-w-[200px] shrink truncate font-mono text-[10px] xl:inline ${/✓/.test(regenNote) ? 'text-cyan' : regenBusy ? 'text-gold' : 'text-fire'}`} title={regenNote}>
          {regenNote}
        </span>
      )}
      {count > 1 &&
        (exporting ? (
          <span className="shrink-0 rounded-lg border border-fire/40 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-fire">
            {exporting}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onExportZip}
              aria-label="Descargar todas (.zip)"
              className="shrink-0 rounded-lg bg-fire px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-wider text-carbon transition hover:brightness-110"
            >
              <span className="hidden sm:inline">[ DESCARGAR TODAS (.ZIP) ]</span>
              <span className="sm:hidden">.ZIP</span>
            </button>
            <button
              type="button"
              onClick={onExportAll}
              title="Descargar cada placa por separado (en el celular: compartir todas)"
              className="shrink-0 rounded-lg border border-fire/60 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-fire transition hover:bg-fire/10"
            >
              {count} PNG
            </button>
          </>
        ))}
    </div>
  )
}
