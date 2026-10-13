import type { CanvasState, OpusBlock } from '../../types'
import { opusLabel } from '../canvas/templates/OpusTemplate'
import { Field, Segmented, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

const COUNTS = ['2', '3', '4', '5', '6'] as const

/** Editor de la placa 13 · Mindset / Opus: cantidad de bloques, rótulo y texto de cada uno. */
export function OpusEditor({ state, update }: Props) {
  const blocks = state.opusBlocks ?? []
  const set = (next: OpusBlock[]) => update({ opusBlocks: next })
  const resize = (n: number) =>
    set(Array.from({ length: n }, (_, i) => blocks[i] ?? { num: String(i + 1).padStart(5, '0'), text: '' }))
  return (
    <>
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.08em] text-steel/80">
        El título principal es el titular (blanco) + remate (naranja). Envolvé una palabra en *asteriscos* para pasarla al acento.
      </p>
      <Field label="Bloques numerados" plain>
        <Segmented<string>
          value={String(Math.min(6, Math.max(2, blocks.length)))}
          onChange={(v) => resize(Number(v))}
          options={COUNTS.map((c) => ({ value: c, label: c }))}
          size="sm"
        />
      </Field>
      {blocks.map((b, i) => (
        <div key={i} className="grid grid-cols-[5.5rem_1fr] gap-2">
          <Field label="Rótulo">
            <TextInput value={b.num} onChange={(num) => set(blocks.map((x, j) => (j === i ? { ...x, num } : x)))} placeholder={opusLabel('', i)} />
          </Field>
          <Field label={`Bloque ${i + 1}`}>
            <TextInput value={b.text} onChange={(text) => set(blocks.map((x, j) => (j === i ? { ...x, text } : x)))} />
          </Field>
        </div>
      ))}
    </>
  )
}
