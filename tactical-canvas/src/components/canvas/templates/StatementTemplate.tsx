import { BRAND, FONT_BODY } from '../../../lib/brand'
import type { CanvasState } from '../../../types'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  scale: number
}

/**
 * Sentencia de texto: el titular ya se renderiza a escala de impacto desde el canvas;
 * acá va el remate argumental con barra naranja y el párrafo.
 */
export function StatementTemplate({ state, scale }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 44 * scale }}>
      {state.kicker.trim() && (
        <p
          style={{
            margin: 0,
            paddingLeft: 30 * scale,
            borderLeft: `${7 * scale}px solid ${BRAND.orange}`,
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 40 * scale,
            lineHeight: 1.28,
            letterSpacing: '-0.015em',
            color: BRAND.white,
            textWrap: 'balance',
          }}
        >
          {state.kicker.trim()}
        </p>
      )}
      <Paragraph text={state.body} scale={scale} />
    </div>
  )
}
