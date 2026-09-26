import type { RefObject } from 'react'
import { useFitScale } from '../hooks/useFitScale'
import { ASPECTS } from '../lib/brand'
import type { CanvasState } from '../types'
import { STORY_SAFE, TacticalCanvas } from './canvas/TacticalCanvas'

interface Props {
  state: CanvasState
  bgImage: string | null
  canvasRef: RefObject<HTMLDivElement | null>
  gutter?: number
}

/** Live preview: el lienzo nativo se escala con transform para entrar en el espacio disponible. */
export function Preview({ state, bgImage, canvasRef, gutter = 24 }: Props) {
  const { w, h, ratio } = ASPECTS[state.aspect]
  const { ref, scale } = useFitScale(w, h, gutter)

  return (
    <div ref={ref} className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden">
      <div className="relative" style={{ width: w * scale, height: h * scale }}>
        <div
          className="absolute top-0 left-0 origin-top-left shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-line"
          style={{ transform: `scale(${scale})` }}
        >
          <TacticalCanvas ref={canvasRef} state={state} bgImage={bgImage} />
        </div>
        {state.aspect === 'story' && (
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
        <span className="pointer-events-none absolute -bottom-5 left-0 font-mono text-[9px] tracking-[0.18em] text-steel/60">
          {ratio} · {w}×{h} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  )
}
