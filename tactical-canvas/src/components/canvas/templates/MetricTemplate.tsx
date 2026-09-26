import { ACCENT_HEX, BRAND, FONT_MONO } from '../../../lib/brand'
import type { CanvasState } from '../../../types'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  fontFamily: string
  scale: number
}

/** Número masivo + subtítulo técnico + párrafo. */
export function MetricTemplate({ state, fontFamily, scale }: Props) {
  const value = state.metricValue.trim() || '—'
  const len = [...value].length
  // El número ocupa todo el ancho útil (904 px) sin desbordar.
  const size = Math.round(Math.min(340, Math.max(150, 1450 / Math.max(len, 3.6))) * scale)
  const color = ACCENT_HEX[state.metricAccent]
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 0.9,
          letterSpacing: '-0.03em',
          color,
          marginLeft: -size * 0.04,
          whiteSpace: 'nowrap',
          textShadow: `0 0 ${60 * scale}px ${color}33`,
        }}
      >
        {value}
      </div>
      {state.metricLabel.trim() && (
        <p
          style={{
            margin: `${30 * scale}px 0 0`,
            fontFamily: FONT_MONO,
            fontWeight: 600,
            fontSize: 24 * scale,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: BRAND.gold,
            lineHeight: 1.4,
          }}
        >
          {state.metricLabel.trim()}
        </p>
      )}
      <div style={{ width: 96 * scale, height: 5 * scale, background: color, margin: `${40 * scale}px 0` }} />
      <Paragraph text={state.body} scale={scale} />
    </div>
  )
}
