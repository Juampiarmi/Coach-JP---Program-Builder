import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { ASPECTS, BRAND, FONT_MONO, HEADLINE_FONTS } from '../../lib/brand'
import type { CanvasState } from '../../types'
import { Footer } from './Footer'
import { Headline } from './Headline'
import { ChartTemplate } from './templates/ChartTemplate'
import { CompareTemplate } from './templates/CompareTemplate'
import { MetricTemplate } from './templates/MetricTemplate'
import { StatementTemplate } from './templates/StatementTemplate'

const SIDE = 88
/** Márgenes seguros: en Stories la UI de Instagram tapa ~250 px arriba y abajo. */
const PAD = {
  feed: { top: 96, bottom: 84 },
  story: { top: 230, bottom: 250 },
}
const FONT_SIZE_FACTOR = { chakra: 1, barlow: 1.2, inter: 0.94 } as const
const MIN_FIT = 0.55

/**
 * Auto-ajuste: si el bloque central no entra entre el header y el footer, se reduce
 * su escala en pasos hasta que entre. Así ninguna placa se exporta con texto pisado.
 */
function useAutoFit(deps: unknown) {
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const key = JSON.stringify(deps)

  useLayoutEffect(() => {
    setFit(1)
  }, [key])

  useLayoutEffect(() => {
    const box = mainRef.current
    const content = contentRef.current
    if (!box || !content) return
    if (content.offsetHeight > box.clientHeight + 1 && fit > MIN_FIT) {
      setFit((f) => Math.max(MIN_FIT, Math.round((f - 0.03) * 100) / 100))
    }
  })

  return { mainRef, contentRef, fit }
}

/**
 * Placa en resolución nativa (1080 px de ancho). La vista previa la escala con un
 * transform en el contenedor padre; la exportación captura este nodo sin escala.
 */
export const TacticalCanvas = forwardRef<HTMLDivElement, { state: CanvasState }>(function TacticalCanvas({ state }, ref) {
  const { w, h } = ASPECTS[state.aspect]
  const isStory = state.aspect === 'story'
  const baseScale = isStory ? 1.08 : 1
  const { mainRef, contentRef, fit } = useAutoFit(state)
  const scale = baseScale * fit
  const pad = PAD[state.aspect]
  const font = HEADLINE_FONTS[state.headlineFont]
  const isStatement = state.template === 'statement'
  const contentWidth = w - SIDE * 2

  const headlineSize = Math.round(
    (isStory ? 86 : 78) * FONT_SIZE_FACTOR[state.headlineFont] * (state.headlineScale / 100) * (isStatement ? 1.3 : 1) * fit,
  )

  const tag = state.tag.trim()

  return (
    <div
      ref={ref}
      style={{
        width: w,
        height: h,
        boxSizing: 'border-box',
        padding: `${pad.top}px ${SIDE}px ${pad.bottom}px`,
        background: BRAND.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {tag && (
        <p
          style={{
            margin: 0,
            fontFamily: FONT_MONO,
            fontWeight: 600,
            fontSize: 27 * baseScale,
            letterSpacing: '0.22em',
            color: BRAND.cyan,
            textTransform: 'uppercase',
          }}
        >
          [&nbsp;{tag}&nbsp;]
        </p>
      )}

      <main
        ref={mainRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: isStatement || isStory ? 'center' : 'flex-start',
          marginTop: (isStatement ? 20 : 44) * baseScale,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div ref={contentRef} style={{ flexShrink: 0 }}>
          <Headline
            partA={state.headlineA}
            partB={state.headlineB}
            fontFamily={font.family}
            fontSize={headlineSize}
            tracking={font.tracking}
          />
          <div style={{ marginTop: (isStatement ? 56 : isStory ? 80 : 54) * scale }}>
            {state.template === 'metric' && <MetricTemplate state={state} fontFamily={font.family} scale={scale} />}
            {state.template === 'compare' && <CompareTemplate state={state} fontFamily={font.family} scale={scale} />}
            {state.template === 'chart' && <ChartTemplate state={state} contentWidth={contentWidth} scale={scale} />}
            {isStatement && <StatementTemplate state={state} scale={scale} />}
          </div>
        </div>
      </main>

      <Footer citeMain={state.citeMain} citeSub={state.citeSub} scale={baseScale} />
    </div>
  )
})
