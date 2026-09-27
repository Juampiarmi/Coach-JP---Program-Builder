import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ASPECTS, BRAND, CONTRAST_GRADIENT, FONT_MONO, HEADLINE_FONTS, MONO_FILTER, TEXT_SHADOW } from '../../lib/brand'
import type { CanvasState } from '../../types'
import { Footer } from './Footer'
import { Headline } from './Headline'
import { ChartTemplate } from './templates/ChartTemplate'
import { CompareTemplate } from './templates/CompareTemplate'
import { MetricTemplate } from './templates/MetricTemplate'
import { ManifestoTemplate } from './templates/ManifestoTemplate'
import { StatementTemplate } from './templates/StatementTemplate'

const SIDE = 88
/**
 * Márgenes. En Story todo (header, contenido, footer y logo) queda dentro de la
 * zona segura central de 1080×1420: 250 px libres arriba y abajo para la UI de Instagram.
 */
export const STORY_SAFE = 250
const PAD = {
  feed: { top: 96, bottom: 84 },
  story: { top: STORY_SAFE, bottom: STORY_SAFE },
}
/** Placa flotante: margen exterior y relleno interior (el texto queda alineado igual). */
const PLATE_INSET = 44
const PLATE_PAD_Y = 48
const FONT_SIZE_FACTOR = { chakra: 1, barlow: 1.2, inter: 0.94 } as const
const MIN_FIT = 0.55
const FIT_SLACK = 12

/**
 * Auto-ajuste: si el bloque central no entra entre el header y el footer, se reduce
 * su escala en pasos hasta que entre. Así ninguna placa se exporta con texto pisado.
 */
function useAutoFit(deps: unknown) {
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  // Se incrementa cuando cambia el tamaño real del contenido sin que React re-renderice
  // (p. ej. cuando termina de cargar una fuente web) para volver a medir.
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(deps)

  useLayoutEffect(() => {
    setFit(1)
  }, [key])

  useEffect(() => {
    const box = mainRef.current
    const content = contentRef.current
    if (!box || !content) return
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    ro.observe(content)
    ro.observe(box)
    const onFonts = () => {
      setFit(1)
      setTick((t) => t + 1)
    }
    document.fonts?.addEventListener('loadingdone', onFonts)
    return () => {
      ro.disconnect()
      document.fonts?.removeEventListener('loadingdone', onFonts)
    }
  }, [])

  useLayoutEffect(() => {
    const box = mainRef.current
    const content = contentRef.current
    if (!box || !content) return
    // Margen de seguridad: el render de exportación puede cortar líneas unos px distinto.
    if (content.offsetHeight > box.clientHeight - FIT_SLACK && fit > MIN_FIT) {
      setFit((f) => Math.max(MIN_FIT, Math.round((f - 0.03) * 100) / 100))
    }
  }, [fit, key, tick])

  return { mainRef, contentRef, fit }
}

/**
 * Placa en resolución nativa (1080 px de ancho). La vista previa la escala con un
 * transform en el contenedor padre; la exportación captura este nodo sin escala.
 */
/**
 * Encuadre de la foto en píxeles del lienzo (sin transforms): la caja se agranda con el
 * zoom y se desplaza dentro del sobrante; object-position recorre el recorte del cover.
 * Al ser geometría explícita, html-to-image la reproduce idéntica en el PNG 3x.
 */
function bgGeometry(state: CanvasState, w: number, h: number) {
  const z = Math.min(1.6, Math.max(1, state.bgZoom / 100))
  // +X mueve la foto a la derecha, +Y la baja: se ve más del borde opuesto.
  const px = Math.min(1, Math.max(0, (50 - state.bgX) / 100))
  const py = Math.min(1, Math.max(0, (50 - state.bgY) / 100))
  const bw = w * z
  const bh = h * z
  return {
    left: -(bw - w) * px,
    top: -(bh - h) * py,
    width: bw,
    height: bh,
    objectFit: 'cover' as const,
    objectPosition: `${px * 100}% ${py * 100}%`,
  }
}

interface Props {
  state: CanvasState
  /** Foto de fondo (data URL). Va aparte del estado para no inflar el autosave. */
  bgImage?: string | null
}

export const TacticalCanvas = forwardRef<HTMLDivElement, Props>(function TacticalCanvas({ state, bgImage }, ref) {
  const { w, h } = ASPECTS[state.aspect]
  const isStory = state.aspect === 'story'
  const baseScale = isStory ? 1.08 : 1
  const hasBg = Boolean(bgImage)
  const plate = hasBg && state.floatingPlate
  const { mainRef, contentRef, fit } = useAutoFit([state, hasBg])
  const scale = baseScale * fit
  const pad = PAD[state.aspect]
  const font = HEADLINE_FONTS[state.headlineFont]
  const isStatement = state.template === 'statement'
  const isManifesto = state.template === 'manifesto'
  const centered = isStatement || isManifesto
  const contentWidth = w - SIDE * 2

  const headlineSize = Math.round(
    (isStory ? 86 : 78) *
      FONT_SIZE_FACTOR[state.headlineFont] *
      (state.headlineScale / 100) *
      (isManifesto ? 1.45 : isStatement ? 1.3 : 1) *
      fit,
  )

  const tag = state.tag.trim()
  const bgGeo = bgGeometry(state, w, h)
  const gap = Math.min(2.5, Math.max(0.3, state.contentGap / 100))
  // Alineación del bloque central dentro de la zona segura (auto = criterio por plantilla).
  const justify =
    state.contentAlign === 'top'
      ? 'flex-start'
      : state.contentAlign === 'center'
        ? 'center'
        : state.contentAlign === 'bottom'
          ? 'flex-end'
          : centered || isStory
            ? 'center'
            : 'flex-start'

  // Caja que contiene todo el texto. Con placa flotante se agranda hacia afuera y
  // gana relleno interior, así el texto conserva sus márgenes.
  const frame = plate
    ? {
        left: PLATE_INSET,
        right: PLATE_INSET,
        top: isStory ? pad.top : pad.top - PLATE_INSET,
        bottom: isStory ? pad.bottom : pad.bottom - PLATE_INSET,
        padX: SIDE - PLATE_INSET,
        padY: PLATE_PAD_Y,
      }
    : { left: SIDE, right: SIDE, top: pad.top, bottom: pad.bottom, padX: 0, padY: 0 }

  return (
    <div
      ref={ref}
      style={{
        width: w,
        height: h,
        background: BRAND.bg,
        overflow: 'hidden',
        position: 'relative',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {hasBg && (
        <>
          <img
            src={bgImage!}
            alt=""
            style={{ position: 'absolute', maxWidth: 'none', ...bgGeo, filter: state.bgMono ? MONO_FILTER : undefined }}
          />
          <div style={{ position: 'absolute', inset: 0, background: `rgba(11,14,20,${state.bgOverlay / 100})` }} />
          {state.bgGradient && <div style={{ position: 'absolute', inset: 0, background: CONTRAST_GRADIENT }} />}
        </>
      )}

      <div
        style={{
          position: 'absolute',
          left: frame.left,
          right: frame.right,
          top: frame.top,
          bottom: frame.bottom,
          padding: `${frame.padY}px ${frame.padX}px`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: plate ? 30 : 0,
          border: plate ? '2px solid rgba(30,38,56,.95)' : undefined,
          boxShadow: plate ? '0 40px 120px -30px rgba(0,0,0,.9)' : undefined,
          // Placa translúcida: en pantalla actúa el backdrop-filter; en el PNG lo reproduce la
          // copia desenfocada de abajo (html-to-image no rasteriza backdrop-filter).
          backdropFilter: plate ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: plate ? 'blur(12px)' : undefined,
          // Sombra de legibilidad heredada por todos los textos (tag, titular, párrafos, citas).
          textShadow: TEXT_SHADOW,
        }}
      >
        {plate && (
          <>
            {/* Vidrio esmerilado: copia desenfocada de la foto alineada con el fondo (html-to-image no soporta backdrop-filter). */}
            <img
              src={bgImage!}
              alt=""
              style={{
                position: 'absolute',
                maxWidth: 'none',
                ...bgGeo,
                left: bgGeo.left - frame.left - 2,
                top: bgGeo.top - frame.top - 2,
                filter: `${state.bgMono ? `${MONO_FILTER} ` : ''}blur(12px)`,
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(11, 14, 20, 0.75)' }} />
          </>
        )}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
              justifyContent: justify,
              marginTop: (centered ? 20 : 44) * baseScale,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div ref={contentRef} style={{ flexShrink: 0 }}>
              {isManifesto ? (
                <ManifestoTemplate
                  state={state}
                  fontFamily={font.family}
                  fontSize={headlineSize}
                  tracking={font.tracking}
                  scale={scale}
                  gap={gap}
                />
              ) : (
                <>
                  <Headline
                    partA={state.headlineA}
                    partB={state.headlineB}
                    fontFamily={font.family}
                    fontSize={headlineSize}
                    tracking={font.tracking}
                  />
                  <div style={{ marginTop: (isStatement ? 56 : isStory ? 80 : 54) * scale * gap }}>
                    {state.template === 'metric' && <MetricTemplate state={state} fontFamily={font.family} scale={scale} />}
                    {state.template === 'compare' && <CompareTemplate state={state} fontFamily={font.family} scale={scale} />}
                    {state.template === 'chart' && (
                      <ChartTemplate state={state} contentWidth={contentWidth} fontFamily={font.family} scale={scale} />
                    )}
                    {isStatement && <StatementTemplate state={state} scale={scale} />}
                  </div>
                </>
              )}
            </div>
          </main>

          <Footer citeMain={isManifesto ? '' : state.citeMain} citeSub={isManifesto ? '' : state.citeSub} scale={baseScale} />
        </div>
      </div>
    </div>
  )
})
