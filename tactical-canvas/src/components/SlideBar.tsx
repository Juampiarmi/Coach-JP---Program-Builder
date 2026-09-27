interface Props {
  count: number
  active: number
  onSelect: (i: number) => void
  onAdd: () => void
  onRemove: () => void
  onExportAll: () => void
  exporting: string | null
}

/** Paginación de la secuencia: [ SLIDE 1 | SLIDE 2 | ... ] + exportar todas. */
export function SlideBar({ count, active, onSelect, onAdd, onRemove, onExportAll, exporting }: Props) {
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
            {count > 1 ? `SLIDE ${i + 1}` : 'PLACA'}
          </button>
        ))}
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
      {count > 1 && (
        <button
          type="button"
          onClick={onExportAll}
          disabled={Boolean(exporting)}
          className="shrink-0 rounded-lg border border-fire/60 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-fire transition hover:bg-fire/10 disabled:opacity-60"
        >
          {exporting ?? `EXPORTAR ${count} [PNG]`}
        </button>
      )}
    </div>
  )
}
