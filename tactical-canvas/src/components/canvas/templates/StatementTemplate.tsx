import { BRAND, FONT_BRAND } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
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
  const A = useAccent()
  // Auto-escalado: un cuerpo largo (más de 40 palabras o ~250 caracteres) baja de tamaño y gana
  // interlineado para que todo entre en la placa sin apretarse.
  const body = state.body.trim()
  const long = body.split(/\s+/).filter(Boolean).length > 40 || body.length > 250
  const veryLong = body.split(/\s+/).filter(Boolean).length > 80
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: (long ? 34 : 44) * scale }}>
      {state.kicker.trim() && (
        <p
          style={{
            margin: 0,
            paddingLeft: 30 * scale,
            borderLeft: `${7 * scale}px solid ${A.orange}`,
            fontFamily: FONT_BRAND,
            fontWeight: 600,
            fontSize: 40 * scale,
            lineHeight: 1.24,
            letterSpacing: '0',
            color: BRAND.white,
            textWrap: 'balance',
          }}
        >
          {state.kicker.trim()}
        </p>
      )}
      <Paragraph text={state.body} scale={scale} size={veryLong ? 25 : long ? 28 : 31} leading={long ? 1.56 : 1.42} />
    </div>
  )
}
