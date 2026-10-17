import type { RefObject } from 'react'
import { useFitScale } from '../hooks/useFitScale'
import { ASPECTS } from '../lib/brand'
import type { CanvasState, Nudge, NudgeTarget } from '../types'
import { CanvasGizmo } from './CanvasGizmo'
import { STORY_SAFE, TacticalCanvas } from './canvas/TacticalCanvas'
import { GhostOverlay } from './GhostOverlay'

interface Props {
  state: CanvasState
  bgImage: string | null
  canvasRef: RefObject<HTMLDivElement | null>
  gutter?: number
  /** Simulador de UI de Instagram (sólo pantalla) */
  overlay?: boolean
  /** Guía de recorte de la grilla del perfil (sólo pantalla) */
  gridGuide?: boolean
  resolveImage?: (id: string | null | undefined) => string | null
  slideCount?: number
  slideIndex?: number
  /** Ajuste fino sobre el lienzo (arrastre / escala); sin callback no hay herramientas */
  onNudge?: (target: NudgeTarget, nudge: Nudge | null) => void
}

/** Live preview: el lienzo nativo se escala con transform para entrar en el espacio disponible. */
export function Preview({ state, bgImage, canvasRef, gutter = 24, overlay = false, gridGuide = false, slideCount = 1, slideIndex = 0, onNudge, resolveImage }: Props) {
  const { w, h, ratio } = ASPECTS[state.aspect]
  const { ref, scale } = useFitScale(w, h, gutter)

  return (
    <div ref={ref} className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden">
      <div className="relative" style={{ width: w * scale, height: h * scale }}>
        <div
          className="absolute top-0 left-0 origin-top-left shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-line"
          style={{ transform: `scale(${scale})` }}
        >
          <TacticalCanvas ref={canvasRef} state={state} bgImage={bgImage} slideIndex={slideIndex} slideCount={slideCount} resolveImage={resolveImage} />
        </div>
        {onNudge && !overlay && <CanvasGizmo state={state} canvasRef={canvasRef} scale={scale} onNudge={onNudge} />}
        {overlay && <GhostOverlay aspect={state.aspect} w={w} h={h} count={slideCount} index={slideIndex} />}
        {state.aspect === 'story' && !overlay && (
          // Guías de zona segura (sólo en pantalla, no se exportan)
          <>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="pointer-events-none absolute inset-x-0 flex items-center justify-center border-cyan/40 bg-[repeating-linear-gradient(135deg,rgba(56,189,248,.07)_0_6px,transparent_6px_12px)]"
                style={{ height: STORY_SAFE * scale, [i ? 'bottom' : 'top']: 0, [i ? 'borderTopWidth' : 'borderBottomWidth']: 1, borderStyle: 'dashed' }}
              >
                <span className="font-mono text-[8px] tracking-[0.2em] text-cyan/60">UI INSTAGRAM</span>
              </div>
            ))}
          </>
        )}
        {gridGuide && state.aspect === 'feed' && (
          // Recortes de la grilla del perfil: 3:4 (grilla actual) y 1:1 (grilla clásica). Lo que queda
          // afuera no se ve en la miniatura: el titular tiene que vivir dentro del recuadro.
          <>
            <div className="pointer-events-none absolute inset-y-0 bg-black/45" style={{ left: 0, width: ((w - (h * 3) / 4) / 2) * scale }} />
            <div className="pointer-events-none absolute inset-y-0 bg-black/45" style={{ right: 0, width: ((w - (h * 3) / 4) / 2) * scale }} />
            <div className="pointer-events-none absolute border-2 border-dashed border-cyan/80" style={{ left: ((w - (h * 3) / 4) / 2) * scale, right: ((w - (h * 3) / 4) / 2) * scale, top: 0, bottom: 0 }}>
              <span className="absolute top-1 left-1 bg-carbon/80 px-1 font-mono text-[8px] tracking-[0.18em] text-cyan">GRILLA 3:4</span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 border-2 border-dashed border-fire/80" style={{ top: ((h - w) / 2) * scale, height: w * scale }}>
              <span className="absolute right-1 bottom-1 bg-carbon/80 px-1 font-mono text-[8px] tracking-[0.18em] text-fire">GRILLA 1:1</span>
            </div>
          </>
        )}
        <span className="pointer-events-none absolute -bottom-5 left-0 font-mono text-[9px] tracking-[0.18em] text-steel/60">
          {ratio} · {w}×{h} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  )
}
