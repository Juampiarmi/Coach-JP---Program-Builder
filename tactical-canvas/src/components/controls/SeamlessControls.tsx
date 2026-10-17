import { useRef, useState } from 'react'
import { loadBackground } from '../../lib/image'
import type { CanvasState } from '../../types'
import { Toggle } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  addImage?: (dataUrl: string) => string
  resolveImage?: (id: string | null | undefined) => string | null
  slideCount: number
}

/** Sección «Carrusel continuo»: hilo de marca entre placas y foto panorámica repartida en todo el set. */
export function SeamlessControls({ state, update, addImage, resolveImage, slideCount }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const thumb = resolveImage?.(state.panoramaImageId)

  const upload = async (file: File | undefined) => {
    if (!file || !addImage) return
    setBusy(true)
    try {
      // La panorámica cubre todo el carrusel: se guarda con más resolución horizontal.
      update({ panoramaImageId: addImage(await loadBackground(file, 4800)), bgMono: true })
    } catch {
      alert('No se pudo leer la imagen.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-steel/80">
        El carrusel como UNA pieza: lo que cruza el borde de una placa sigue en la próxima, y el ojo quiere deslizar para ver a dónde va.
      </p>
      <Toggle label="〰 Hilo de marca entre placas" checked={Boolean(state.seamlessThread)} onChange={(seamlessThread) => update({ seamlessThread })} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <div className="flex items-center gap-2">
        {thumb && <img src={thumb} alt="" className="h-8 w-16 shrink-0 rounded object-cover ring-1 ring-line" />}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-md border border-dashed border-line py-1.5 font-mono text-[10px] tracking-[0.1em] text-steel transition hover:border-cyan/50 hover:text-cyan"
        >
          {busy ? 'PROCESANDO…' : thumb ? '[ CAMBIAR PANORÁMICA ]' : '[ ▭ FOTO PANORÁMICA PARA TODO EL SET ]'}
        </button>
        {state.panoramaImageId && (
          <button type="button" onClick={() => update({ panoramaImageId: null })} className="rounded-md border border-line px-2 py-1.5 font-mono text-[10px] text-steel hover:text-fire">
            Quitar
          </button>
        )}
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-steel/60">
        {slideCount > 1
          ? `La foto se reparte en ${slideCount} franjas (una por placa). Ideal: una imagen horizontal ~${slideCount}:1.25. Usa la capa táctica y el B/N de 03 · Fondo.`
          : 'Agregá placas: con una sola no hay recorrido que repartir.'}
      </p>
    </>
  )
}
