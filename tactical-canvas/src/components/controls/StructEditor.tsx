import { resolveStructData } from '../../lib/structPillar'
import type { CanvasState, StructData } from '../../types'
import { Field, Segmented, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

const QUADRANT_LABEL = ['Sup. izquierdo', 'Sup. derecho', 'Inf. izquierdo', 'Inf. derecho']

/** Cambia la cantidad de filas (3 o 4) conservando las existentes. */
function resize<T>(list: T[], n: number, blank: (i: number) => T): T[] {
  return list.length >= n ? list.slice(0, n) : [...list, ...Array.from({ length: n - list.length }, (_, k) => blank(list.length + k))]
}

const CountPicker = ({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) => (
  <Field label={label} plain>
    <Segmented<string>
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={[
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ]}
      size="sm"
    />
  </Field>
)

/** Editor de las plantillas 08–11: lo que se ve en la placa es lo que se edita. */
export function StructEditor({ state, update }: Props) {
  const data = resolveStructData(state)
  const set = <K extends keyof StructData>(key: K, value: StructData[K]) => update({ structData: { ...data, [key]: value } })

  if (state.template === 'matrix') {
    const m = data.matrix
    const quads = [0, 1, 2, 3].map((i) => m.quadrants[i] ?? { label: '', tag: '' })
    const setQuad = (i: number, patch: Partial<(typeof quads)[number]>) => set('matrix', { ...m, quadrants: quads.map((q, j) => (j === i ? { ...q, ...patch } : q)) })
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Eje X · horizontal">
            <TextInput value={m.axisX} onChange={(axisX) => set('matrix', { ...m, axisX })} />
          </Field>
          <Field label="Eje Y · vertical">
            <TextInput value={m.axisY} onChange={(axisY) => set('matrix', { ...m, axisY })} />
          </Field>
        </div>
        {quads.map((q, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.6fr_auto] items-end gap-1.5">
            <Field label={QUADRANT_LABEL[i]}>
              <TextInput value={q.label} onChange={(label) => setQuad(i, { label })} uppercase />
            </Field>
            <Field label="Descripción">
              <TextInput value={q.tag} onChange={(tag) => setQuad(i, { tag })} />
            </Field>
            <button
              type="button"
              onClick={() => set('matrix', { ...m, highlight: i })}
              aria-pressed={m.highlight === i}
              title="Cuadrante destacado"
              className={`mb-px h-9 w-9 rounded-md border font-mono text-[12px] ${m.highlight === i ? 'border-fire bg-fire/15 text-fire' : 'border-line text-steel hover:text-white'}`}
            >
              ★
            </button>
          </div>
        ))}
      </>
    )
  }

  if (state.template === 'pipeline') {
    const p = data.pipeline
    const setStep = (i: number, patch: Partial<(typeof p.steps)[number]>) => set('pipeline', { ...p, steps: p.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <CountPicker label="Pasos" value={p.steps.length} onChange={(n) => set('pipeline', { ...p, steps: resize(p.steps, n, (i) => ({ title: `Paso ${i + 1}`, desc: '' })) })} />
          <Field label="Orientación" plain>
            <Segmented<'vertical' | 'horizontal'>
              value={p.dir}
              onChange={(dir) => set('pipeline', { ...p, dir })}
              options={[
                { value: 'vertical', label: 'VERTICAL' },
                { value: 'horizontal', label: 'HORIZONTAL' },
              ]}
              size="sm"
            />
          </Field>
        </div>
        {p.steps.map((st, i) => (
          <div key={i} className="grid grid-cols-2 gap-1.5">
            <Field label={`Paso ${String(i + 1).padStart(2, '0')} · acción`}>
              <TextInput value={st.title} onChange={(title) => setStep(i, { title })} />
            </Field>
            <Field label="Condición / criterio">
              <TextInput value={st.desc} onChange={(desc) => setStep(i, { desc })} />
            </Field>
          </div>
        ))}
      </>
    )
  }

  if (state.template === 'pyramid') {
    const py = data.pyramid
    const setLevel = (i: number, patch: Partial<(typeof py.levels)[number]>) => set('pyramid', { levels: py.levels.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
    return (
      <>
        <CountPicker label="Estratos" value={py.levels.length} onChange={(n) => set('pyramid', { levels: resize(py.levels, n, (i) => ({ name: `Nivel ${i + 1}`, desc: '' })) })} />
        {/* De la cúspide a la base, igual que en la placa */}
        {py.levels
          .map((lv, i) => ({ lv, i }))
          .reverse()
          .map(({ lv, i }) => (
            <div key={i} className="grid grid-cols-2 gap-1.5">
              <Field label={`${String(i + 1).padStart(2, '0')} · ${i === 0 ? 'base' : i === py.levels.length - 1 ? 'cúspide' : 'estrato'}`}>
                <TextInput value={lv.name} onChange={(name) => setLevel(i, { name })} />
              </Field>
              <Field label="Descripción">
                <TextInput value={lv.desc} onChange={(desc) => setLevel(i, { desc })} />
              </Field>
            </div>
          ))}
      </>
    )
  }

  const c = data.checklist
  const setItem = (i: number, patch: Partial<(typeof c.items)[number]>) => set('checklist', { items: c.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <>
      <CountPicker label="Ítems" value={c.items.length} onChange={(n) => set('checklist', { items: resize(c.items, n, () => ({ status: 'ok' as const, text: '', detail: '' })) })} />
      {c.items.map((it, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-line p-2">
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => setItem(i, { status: it.status === 'ok' ? 'err' : 'ok' })}
              title="Cambiar estado"
              className={`mb-px h-9 shrink-0 rounded-md border px-2 font-mono text-[11px] font-bold ${it.status === 'ok' ? 'border-cyan/60 text-cyan' : 'border-fire/60 text-fire'}`}
            >
              {it.status === 'ok' ? '[ ✓ ]' : '[ ✗ ]'}
            </button>
            <div className="min-w-0 flex-1">
              <Field label={`Condición ${i + 1}`}>
                <TextInput value={it.text} onChange={(text) => setItem(i, { text })} />
              </Field>
            </div>
          </div>
          <Field label="Detalle (opcional)">
            <TextInput value={it.detail} onChange={(detail) => setItem(i, { detail })} />
          </Field>
        </div>
      ))}
    </>
  )
}
