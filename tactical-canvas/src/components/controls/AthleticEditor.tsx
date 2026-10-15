import type { AthleticMode, AthleticPos, AthleticRow, CanvasState } from '../../types'
import { Field, Segmented, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

const COUNTS = ['2', '3', '4', '5', '6'] as const

/** Editor de la placa 15 · Opus Athletic: número de etiqueta, filas clave → valor / tabla y encuadre del atleta. */
export function AthleticEditor({ state, update }: Props) {
  const rows = state.athleticRows ?? []
  const head = state.athleticHead ?? ['', '']
  const table = state.athleticMode === 'table'
  const setRows = (next: AthleticRow[]) => update({ athleticRows: next })
  const resize = (n: number) => setRows(Array.from({ length: n }, (_, i) => rows[i] ?? { k: '', v: '' }))
  return (
    <>
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-steel/80">
        Light Editorial: el titular va en negro y el remate en gris. Para el atleta, subí un PNG recortado (fondo transparente) en 03 · Fondo: se pasa a B/N de alto contraste.
      </p>
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Field label="Nr.">
          <TextInput value={state.athleticNr ?? ''} onChange={(athleticNr) => update({ athleticNr })} placeholder="1" />
        </Field>
        <Field label="Datos" plain>
          <Segmented<AthleticMode>
            value={state.athleticMode ?? 'list'}
            onChange={(athleticMode) => update({ athleticMode })}
            options={[
              { value: 'list', label: 'CLAVE → VALOR' },
              { value: 'table', label: 'TABLA 2 COL.' },
            ]}
            size="sm"
          />
        </Field>
      </div>
      {table && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Columna 1">
            <TextInput value={head[0]} onChange={(v) => update({ athleticHead: [v, head[1]] })} placeholder="Intensidad" />
          </Field>
          <Field label="Columna 2">
            <TextInput value={head[1]} onChange={(v) => update({ athleticHead: [head[0], v] })} placeholder="Reps × series" />
          </Field>
        </div>
      )}
      <Field label="Filas" plain>
        <Segmented<string>
          value={String(Math.min(6, Math.max(2, rows.length)))}
          onChange={(v) => resize(Number(v))}
          options={COUNTS.map((c) => ({ value: c, label: c }))}
          size="sm"
        />
      </Field>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[40%_1fr] gap-2">
          <Field label={table ? head[0] || 'Columna 1' : `Clave ${i + 1}`}>
            <TextInput value={r.k} onChange={(k) => setRows(rows.map((x, j) => (j === i ? { ...x, k } : x)))} placeholder={table ? '75-82,5 % 1RM' : 'Cargas pesadas:'} />
          </Field>
          <Field label={table ? head[1] || 'Columna 2' : 'Descripción'}>
            <TextInput value={r.v} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, v } : x)))} placeholder={table ? '4 × 6' : '3-5 reps al 85 %'} />
          </Field>
        </div>
      ))}
      <Field label="Recorte del atleta" plain>
        <Segmented<AthleticPos>
          value={state.athleticPos ?? 'auto'}
          onChange={(athleticPos) => update({ athleticPos })}
          options={[
            { value: 'auto', label: 'AUTO' },
            { value: 'center', label: 'CENTRO' },
            { value: 'right', label: 'DERECHA' },
            { value: 'none', label: 'OCULTO' },
          ]}
          size="sm"
        />
      </Field>
      <p className="-mt-1 font-mono text-[9px] leading-relaxed text-steel/60">AUTO: placa 1 con el atleta al centro; desde la placa 2, a la derecha (40 %) con el texto en el 60 % izquierdo.</p>
    </>
  )
}
