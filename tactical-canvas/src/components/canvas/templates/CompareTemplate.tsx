import { ACCENT_HEX, BRAND, FONT_BODY, FONT_MONO } from '../../../lib/brand'
import type { CanvasState, CompareCard } from '../../../types'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  fontFamily: string
  scale: number
}

function Card({ card, fontFamily, scale }: { card: CompareCard; fontFamily: string; scale: number }) {
  const len = [...card.value.trim()].length
  const valueSize = Math.round((len > 14 ? 46 : len > 10 ? 54 : 66) * scale)
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: BRAND.surface,
        border: `2px solid ${BRAND.border}`,
        borderRadius: 26 * scale,
        padding: `${34 * scale}px ${32 * scale}px`,
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
        style={{
          margin: `${34 * scale}px 0 ${30 * scale}px`,
          fontFamily,
          fontWeight: 700,
          fontSize: valueSize,
          lineHeight: 1.02,
          letterSpacing: '-0.015em',
          color: ACCENT_HEX[card.accent],
          overflowWrap: 'break-word',
        }}
      >
        {card.value}
      </p>
      <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 22 * scale, lineHeight: 1.35, color: BRAND.gray }}>
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
