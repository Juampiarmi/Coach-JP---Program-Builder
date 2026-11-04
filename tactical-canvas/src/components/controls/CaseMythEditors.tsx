import type { CanvasState } from '../../types'
import { Field, Segmented, TextArea, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
}

/** Editor de la plantilla 20 · Caso de Atleta. */
export function CaseEditor({ state, update }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Atleta">
          <TextInput value={state.caseAthlete} onChange={(caseAthlete) => update({ caseAthlete })} uppercase placeholder="NOMBRE APELLIDO" />
        </Field>
        <Field label="Disciplina">
          <TextInput value={state.caseDiscipline} onChange={(caseDiscipline) => update({ caseDiscipline })} uppercase placeholder="MTB" />
        </Field>
      </div>
      <Field label="Diagnóstico / limitante inicial">
        <TextArea value={state.caseLimit} onChange={(caseLimit) => update({ caseLimit })} rows={2} />
      </Field>
      <Field label="Protocolo aplicado">
        <TextArea value={state.caseProtocol} onChange={(caseProtocol) => update({ caseProtocol })} rows={3} />
      </Field>
      <Field label="Resultado medido" hint="va destacado en naranja">
        <TextInput value={state.caseResult} onChange={(caseResult) => update({ caseResult })} placeholder="ej. +12 % potencia media en 20 min" />
      </Field>
      <p className="font-mono text-[9px] leading-relaxed text-gold/80">⚠ Sólo datos reales, medidos y con permiso del atleta para publicarlos. Nada de resultados inventados.</p>
    </>
  )
}

/** Editor de la plantilla 21 · Mito vs Fisiología. */
export function MythEditor({ state, update }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Disposición" plain>
          <Segmented<'stack' | 'split'>
            value={state.mythLayout ?? 'stack'}
            onChange={(mythLayout) => update({ mythLayout })}
            options={[
              { value: 'stack', label: 'ARRIBA / ABAJO' },
              { value: 'split', label: 'LADO A LADO' },
            ]}
            size="sm"
          />
        </Field>
        <Field label="Acento verdad" plain>
          <Segmented<'brand' | 'green'>
            value={state.truthAccent ?? 'brand'}
            onChange={(truthAccent) => update({ truthAccent })}
            options={[
              { value: 'brand', label: 'NARANJA' },
              { value: 'green', label: 'VERDE' },
            ]}
            size="sm"
          />
        </Field>
      </div>
      <div className="space-y-2 rounded-lg border border-red-500/50 p-2.5">
        <Field label="Badge del mito">
          <TextInput value={state.mythLabel} onChange={(mythLabel) => update({ mythLabel })} uppercase placeholder="MITO POPULAR" />
        </Field>
        <Field label="✘ El mito (como lo dice la gente)">
          <TextArea value={state.mythText} onChange={(mythText) => update({ mythText })} rows={2} />
        </Field>
      </div>
      <div className="space-y-2 rounded-lg border border-fire/50 p-2.5">
        <Field label="Badge de la verdad">
          <TextInput value={state.truthLabel} onChange={(truthLabel) => update({ truthLabel })} uppercase placeholder="FISIOLOGÍA REAL" />
        </Field>
        <Field label="✓ La fisiología real (con el mecanismo)">
          <TextArea value={state.truthText} onChange={(truthText) => update({ truthText })} rows={3} />
        </Field>
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-steel/70">Pegado en el generador: «Mito: …» + «Realidad: …» arma esta placa sola.</p>
    </>
  )
}
