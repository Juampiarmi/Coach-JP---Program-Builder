import { useLayoutEffect, useRef, useState } from 'react'
import { ACCENT_HEX, BRAND, FONT_BODY, FONT_MONO } from '../../../lib/brand'
import type { CanvasState, CompareCard } from '../../../types'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  fontFamily: string
  scale: number
}

/**
 * Ajuste por ancho del valor de la tarjeta: va en una sola línea (nowrap) y, si no entra,
 * se mide el desborde real y se reduce el tamaño de esa tarjeta hasta que quepa completo.
 * Re-mide cuando terminan de cargar las fuentes (cambian el ancho sin re-render).
 */
function useFitWidth(deps: unknown[]) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [fit, setFit] = useState(1)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(deps)

  useLayoutEffect(() => setFit(1), [key])
  useLayoutEffect(() => {
    const onFonts = () => {
      setFit(1)
      setTick((t) => t + 1)
    }
    document.fonts?.addEventListener('loadingdone', onFonts)
    return () => document.fonts?.removeEventListener('loadingdone', onFonts)
  }, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !el.clientWidth) return
    const overflow = el.scrollWidth / el.clientWidth
    if (overflow > 1.001 && fit > 0.35) setFit((f) => Math.max(0.35, Math.floor((f / overflow) * 0.98 * 1000) / 1000))
  }, [fit, key, tick])

  return { ref, fit }
}

function Card({ card, fontFamily, scale }: { card: CompareCard; fontFamily: string; scale: number }) {
  const len = [...card.value.trim()].length
  const baseSize = Math.round((len > 14 ? 46 : len > 10 ? 54 : 66) * scale)
  const { ref: valueRef, fit } = useFitWidth([card.value, fontFamily, baseSize])
  const valueSize = Math.round(baseSize * fit * 10) / 10
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: BRAND.surface,
        border: `2px solid ${BRAND.border}`,
        borderRadius: 26 * scale,
        padding: `${46 * scale}px ${32 * scale}px`,
        boxShadow: '0 24px 60px -24px rgba(0,0,0,.8)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: FONT_MONO,
          fontSize: 21 * scale,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: BRAND.gray,
        }}
      >
        {card.label}
      </p>
      <p
        ref={valueRef}
        style={{
          margin: `${34 * scale}px 0 ${30 * scale}px`,
          fontFamily,
          fontWeight: 700,
          fontSize: valueSize,
          lineHeight: 1.02,
          letterSpacing: '-0.015em',
          color: ACCENT_HEX[card.accent],
          whiteSpace: 'nowrap',
          wordBreak: 'keep-all',
          overflowWrap: 'normal',
        }}
      >
        {card.value}
      </p>
      <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 26 * scale, lineHeight: 1.4, color: BRAND.gray }}>
        {card.caption}
      </p>
    </div>
  )
}

/** Dos tarjetas flotantes comparativas + veredicto en oro. */
export function CompareTemplate({ state, fontFamily, scale }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 38 * scale, alignItems: 'stretch' }}>
        <Card card={state.cardA} fontFamily={fontFamily} scale={scale} />
        <Card card={state.cardB} fontFamily={fontFamily} scale={scale} />
      </div>
      {state.verdict.trim() && (
        <p
          style={{
            margin: `${52 * scale}px 0 0`,
            fontFamily: FONT_MONO,
            fontWeight: 700,
            fontSize: 23 * scale,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: BRAND.gold,
          }}
        >
          {state.verdict.trim()}
        </p>
      )}
      <div style={{ marginTop: 34 * scale }}>
        <Paragraph text={state.body} scale={scale} />
      </div>
    </div>
  )
}
