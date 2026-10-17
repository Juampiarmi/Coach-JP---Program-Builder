import type { CanvasState, WorkoutRow } from '../../types'
import { Field, Segmented, TextArea, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

const COUNTS = ['2', '3', '4', '5', '6', '7', '8'] as const
const EMPTY: WorkoutRow = { code: '', name: '', scheme: '', intensity: '', rest: '' }

/** Editor de la placa 17 · Sesión: ejercicios (código, nombre, series × reps, intensidad, pausa) y nota. */
export function WorkoutEditor({ state, update }: Props) {
  const rows = state.workoutRows ?? []
  const set = (next: WorkoutRow[]) => update({ workoutRows: next })
  const patch = (i: number, p: Partial<WorkoutRow>) => set(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const resize = (n: number) => set(Array.from({ length: n }, (_, i) => rows[i] ?? { ...EMPTY, code: `${String.fromCharCode(65 + Math.floor(i / 2))}${(i % 2) + 1}` }))
  return (
    <>
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-steel/80">
        Mismo código de letra (B1, B2) = superserie: se agrupan con línea punteada. Tip: pegá la rutina en el generador como «A1 Sentadilla 4x5 RIR 2 3:00».
      </p>
      <Field label="Ejercicios" plain>
        <Segmented<string> value={String(Math.min(8, Math.max(2, rows.length)))} onChange={(v) => resize(Number(v))} options={COUNTS.map((c) => ({ value: c, label: c }))} size="sm" />
      </Field>
      {rows.map((r, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-line bg-surface-2/50 p-2">
          <div className="grid grid-cols-[3.5rem_1fr] gap-2">
            <TextInput value={r.code} onChange={(code) => patch(i, { code })} placeholder="A1" />
            <TextInput value={r.name} onChange={(name) => patch(i, { name })} placeholder="Sentadilla trasera" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <TextInput value={r.scheme} onChange={(scheme) => patch(i, { scheme })} placeholder="4 × 5" />
            <TextInput value={r.intensity} onChange={(intensity) => patch(i, { intensity })} placeholder="RIR 2" />
            <TextInput value={r.rest} onChange={(rest) => patch(i, { rest })} placeholder="3:00" />
          </div>
        </div>
      ))}
      <Field label="Nota al pie" hint="progresión, calentamiento…">
        <TextArea value={state.workoutNote ?? ''} onChange={(workoutNote) => update({ workoutNote })} rows={2} />
      </Field>
    </>
  )
}
