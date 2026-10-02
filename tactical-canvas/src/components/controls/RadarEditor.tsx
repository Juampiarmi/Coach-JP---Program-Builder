import type { CanvasState } from '../../types'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

const split = (raw: string) => raw.split(/[,;\n]+/).map((s) => s.trim())
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

/** Editor del radar: una fila por eje (etiqueta + valor 0–100 + comparación opcional). */
export function RadarEditor({ state, update }: Props) {
  const axes = split(state.radarAxes).filter(Boolean)
  const values = split(state.radarValues)
  const compare = split(state.radarCompare)
  const hasCompare = state.radarCompare.trim() !== ''
  const rows = axes.map((label, i) => ({ label, value: values[i] ?? '0', cmp: compare[i] ?? '' }))

  const commit = (next: typeof rows, withCompare = hasCompare) =>
    update({
      radarAxes: next.map((r) => r.label.replace(/,/g, ' ')).join(', '),
      radarValues: next.map((r) => clamp(Number(r.value) || 0)).join(', '),
      radarCompare: withCompare ? next.map((r) => clamp(Number(r.cmp) || 0)).join(', ') : '',
    })
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => commit(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const numCls = 'tc-input w-16 shrink-0 px-1.5 text-center tabular-nums'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] text-steel uppercase">
        <span>Ejes del radar ({rows.length}/8)</span>
        <span className="flex gap-3">
          <span>Valor</span>
          {hasCompare && <span>Comp.</span>}
        </span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-1.5">
          <input className="tc-input min-w-0 flex-1" value={r.label} onChange={(e) => set(i, { label: e.target.value })} aria-label={`Eje ${i + 1}`} />
          <input
            className={numCls}
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={r.value}
            onChange={(e) => set(i, { value: e.target.value })}
            aria-label={`Valor eje ${i + 1}`}
          />
          {hasCompare && (
            <input
              className={numCls}
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              value={r.cmp}
              onChange={(e) => set(i, { cmp: e.target.value })}
              aria-label={`Comparación eje ${i + 1}`}
            />
          )}
          <button
            type="button"
            onClick={() => rows.length > 3 && commit(rows.filter((_, j) => j !== i))}
            disabled={rows.length <= 3}
            title="Quitar eje"
            className="w-7 shrink-0 rounded-md border border-line font-mono text-[11px] text-steel hover:text-fire disabled:opacity-30"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => rows.length < 8 && commit([...rows, { label: `Eje ${rows.length + 1}`, value: '50', cmp: '50' }])}
          disabled={rows.length >= 8}
          className="flex-1 rounded-md border border-dashed border-line py-1 font-mono text-[10px] tracking-wider text-steel hover:text-cyan disabled:opacity-30"
        >
          + AGREGAR EJE
        </button>
        <button
          type="button"
          onClick={() => commit(hasCompare ? rows : rows.map((r) => ({ ...r, cmp: r.cmp || '70' })), !hasCompare)}
          className="flex-1 rounded-md border border-line py-1 font-mono text-[10px] tracking-wider text-steel hover:text-cyan"
        >
          {hasCompare ? '− QUITAR COMPARACIÓN' : '+ SERIE DE COMPARACIÓN'}
        </button>
      </div>
    </div>
  )
}
