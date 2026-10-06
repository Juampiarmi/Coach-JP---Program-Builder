import { BOOKMARK_CTA } from '../../lib/bookmark'
import type { BookmarkData, CanvasState } from '../../types'
import { Field, Segmented, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  /** Viñetas extraídas del resto del carrusel */
  auto: string[]
}

/** Editor de la placa 12: viñetas (automáticas o editadas), CTA y acento. */
export function BookmarkEditor({ state, update, auto }: Props) {
  const data: BookmarkData = state.bookmarkData ?? { points: auto, cta: BOOKMARK_CTA, accent: 'orange' }
  const points = [0, 1, 2, 3].slice(0, Math.max(3, Math.min(4, data.points.length || 3))).map((i) => data.points[i] ?? '')
  const set = (patch: Partial<BookmarkData>) => update({ bookmarkData: { ...data, points, ...patch } })
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.12em] text-steel uppercase">
          {state.bookmarkData ? 'Viñetas editadas' : 'Viñetas automáticas del carrusel'}
        </p>
        <button
          type="button"
          onClick={() => update({ bookmarkData: null })}
          title="Vuelve a extraer las viñetas de las otras placas"
          className="rounded border border-line px-2 py-0.5 font-mono text-[9px] tracking-wider text-steel transition hover:border-cyan/50 hover:text-cyan"
        >
          ↻ EXTRAER DEL CARRUSEL
        </button>
      </div>
      <Field label="Cantidad de viñetas" plain>
        <Segmented<string>
          value={String(points.length)}
          onChange={(v) => set({ points: Number(v) === 3 ? points.slice(0, 3) : [...points, ''].slice(0, 4) })}
          options={[
            { value: '3', label: '3' },
            { value: '4', label: '4' },
          ]}
          size="sm"
        />
      </Field>
      {points.map((p, i) => (
        <Field key={i} label={`> ${String(i + 1).padStart(2, '0')}`}>
          <TextInput value={p} onChange={(v) => set({ points: points.map((x, j) => (j === i ? v : x)) })} />
        </Field>
      ))}
      <Field label="Llamado a la acción">
        <TextInput value={data.cta} onChange={(cta) => set({ cta })} uppercase />
      </Field>
      <Field label="Acento del CTA" plain>
        <Segmented<'orange' | 'cyan'>
          value={data.accent}
          onChange={(accent) => set({ accent })}
          options={[
            { value: 'orange', label: 'NARANJA' },
            { value: 'cyan', label: 'CIAN' },
          ]}
          size="sm"
        />
      </Field>
    </>
  )
}
