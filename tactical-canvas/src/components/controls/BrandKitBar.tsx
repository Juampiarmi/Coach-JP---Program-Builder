import { useState } from 'react'
import { usePersistentState } from '../../hooks/usePersistentState'
import { BUILT_IN_KITS, kitFromSlide, kitPatch, type BrandKit } from '../../lib/brandKits'
import type { CanvasState } from '../../types'

interface Props {
  state: CanvasState
  /** Aplica el patch a TODAS las placas del carrusel */
  onApply: (patch: Partial<CanvasState>) => void
  slideCount: number
}

/** [ KIT DE MARCA ]: presets visuales de un clic (de fábrica + propios guardados en este navegador). */
export function BrandKitBar({ state, onApply, slideCount }: Props) {
  const [saved, setSaved] = usePersistentState<{ kits: BrandKit[]; withTag: boolean }>('jp-tactical-canvas:brand-kits', { kits: [], withTag: true })
  const [naming, setNaming] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const kits = [...BUILT_IN_KITS, ...saved.kits]

  const apply = (kit: BrandKit) => {
    onApply(kitPatch(kit, saved.withTag))
    setApplied(kit.id)
    window.setTimeout(() => setApplied((a) => (a === kit.id ? null : a)), 2200)
  }
  const save = () => {
    const kit = kitFromSlide(state, naming ?? '', saved.withTag)
    setSaved({ ...saved, kits: [...saved.kits, kit] })
    setNaming(null)
  }
  const remove = (id: string) => setSaved({ ...saved, kits: saved.kits.filter((k) => k.id !== id) })

  return (
    <div className="space-y-2 border-b border-line px-5 py-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-steel uppercase">◆ Kit de marca</p>
        <label className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-steel/80 uppercase">
          <input type="checkbox" checked={saved.withTag} onChange={(e) => setSaved({ ...saved, withTag: e.target.checked })} className="accent-cyan" />
          Aplicar tag
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {kits.map((k) => (
          <span key={k.id} className="group relative">
            <button
              type="button"
              onClick={() => apply(k)}
              title={`Aplica «${k.name}» a ${slideCount > 1 ? `las ${slideCount} placas` : 'la placa'}${k.tag && saved.withTag ? ` · tag «${k.tag}»` : ''}`}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold tracking-wider transition ${
                applied === k.id ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:border-cyan/50 hover:text-white'
              }`}
            >
              <span className="flex size-3.5 overflow-hidden rounded-sm ring-1 ring-white/20" aria-hidden>
                <span className="flex-1" style={{ background: k.swatch.bg }} />
                <span className="w-1" style={{ background: k.swatch.accent }} />
              </span>
              {applied === k.id ? '✓ APLICADO' : k.name.toUpperCase()}
            </button>
            {!k.builtIn && (
              <button
                type="button"
                onClick={() => remove(k.id)}
                title="Borrar este kit"
                className="absolute -top-1.5 -right-1.5 hidden size-4 rounded-full bg-carbon text-[9px] leading-none text-steel ring-1 ring-line group-hover:block hover:text-fire"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {naming === null ? (
          <button
            type="button"
            onClick={() => setNaming('')}
            title="Guarda la tipografía, el acento, el fondo y el tag de esta placa como un kit propio"
            className="rounded-md border border-dashed border-line px-2 py-1 font-mono text-[10px] tracking-wider text-steel transition hover:border-cyan/50 hover:text-cyan"
          >
            + GUARDAR ACTUAL
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={naming}
              onChange={(e) => setNaming(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') setNaming(null)
              }}
              placeholder="Nombre del kit"
              className="w-32 rounded-md border border-cyan/50 bg-surface-2 px-2 py-1 font-mono text-[10px] text-white outline-none"
            />
            <button type="button" onClick={save} className="rounded-md border border-cyan/60 px-2 py-1 font-mono text-[10px] text-cyan hover:bg-cyan/10">
              OK
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
