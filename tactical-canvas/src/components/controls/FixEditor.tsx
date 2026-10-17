import { useRef, useState } from 'react'
import { loadBackground } from '../../lib/image'
import type { CanvasState } from '../../types'
import { Field, Segmented, TextArea, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  /** Guarda una imagen en el almacén de la app y devuelve su id */
  addImage?: (dataUrl: string) => string
  resolveImage?: (id: string | null | undefined) => string | null
}

type SideKey = 'Wrong' | 'Right'

/** Editor de la placa 18 · Error vs Corrección: rótulo, texto e imagen de cada lado, acento y disposición. */
export function FixEditor({ state, update, addImage, resolveImage }: Props) {
  const files = { Wrong: useRef<HTMLInputElement>(null), Right: useRef<HTMLInputElement>(null) }
  const [busy, setBusy] = useState<SideKey | null>(null)

  const upload = async (side: SideKey, file: File | undefined) => {
    if (!file || !addImage) return
    setBusy(side)
    try {
      const id = addImage(await loadBackground(file, 1600))
      update(side === 'Wrong' ? { fixWrongImageId: id } : { fixRightImageId: id })
    } catch {
      alert('No se pudo leer la imagen.')
    } finally {
      setBusy(null)
      const input = files[side].current
      if (input) input.value = ''
    }
  }

  const side = (key: SideKey) => {
    const wrong = key === 'Wrong'
    const imageId = wrong ? state.fixWrongImageId : state.fixRightImageId
    const thumb = resolveImage?.(imageId)
    return (
      <div className={`space-y-2 rounded-lg border p-2.5 ${wrong ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
        <p className={`font-mono text-[10px] font-semibold tracking-[0.14em] ${wrong ? 'text-red-400' : 'text-emerald-400'}`}>{wrong ? '✗ LADO ERROR' : '✓ LADO CORRECCIÓN'}</p>
        <Field label="Rótulo del badge">
          <TextInput
            value={wrong ? state.fixWrongLabel : state.fixRightLabel}
            onChange={(v) => update(wrong ? { fixWrongLabel: v } : { fixRightLabel: v })}
            uppercase
            placeholder={wrong ? 'INCORRECTO' : 'CORRECCIÓN TÁCTICA'}
          />
        </Field>
        <Field label={wrong ? 'La falla (corto)' : 'La solución (corto)'}>
          <TextArea value={wrong ? state.fixWrongText : state.fixRightText} onChange={(v) => update(wrong ? { fixWrongText: v } : { fixRightText: v })} rows={2} />
        </Field>
        <input ref={files[key]} type="file" accept="image/*" className="hidden" onChange={(e) => upload(key, e.target.files?.[0])} />
        <div className="flex items-center gap-2">
          {thumb && <img src={thumb} alt="" className="size-8 shrink-0 rounded object-cover ring-1 ring-line" />}
          <button
            type="button"
            onClick={() => files[key].current?.click()}
            className="flex-1 rounded-md border border-dashed border-line py-1.5 font-mono text-[10px] tracking-[0.1em] text-steel transition hover:border-cyan/50 hover:text-cyan"
          >
            {busy === key ? 'PROCESANDO…' : thumb ? '[ CAMBIAR FOTO ]' : '[ SUBIR FOTO ]'}
          </button>
          {imageId && (
            <button
              type="button"
              onClick={() => update(wrong ? { fixWrongImageId: null } : { fixRightImageId: null })}
              className="rounded-md border border-line px-2 py-1.5 font-mono text-[10px] text-steel hover:text-fire"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Acento correcto" plain>
          <Segmented<'green' | 'brand'>
            value={state.fixAccent ?? 'green'}
            onChange={(fixAccent) => update({ fixAccent })}
            options={[
              { value: 'green', label: 'VERDE' },
              { value: 'brand', label: 'MARCA' },
            ]}
            size="sm"
          />
        </Field>
        <Field label="Disposición" plain>
          <Segmented<'split' | 'stack'>
            value={state.fixLayout ?? 'split'}
            onChange={(fixLayout) => update({ fixLayout })}
            options={[
              { value: 'split', label: 'LADO A LADO' },
              { value: 'stack', label: 'APILADO' },
            ]}
            size="sm"
          />
        </Field>
      </div>
      {side('Wrong')}
      {side('Right')}
    </>
  )
}
