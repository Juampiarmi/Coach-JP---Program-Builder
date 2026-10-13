import { FONT_BODY, FONT_MONO } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

/** «1» → «00001»: el rótulo de bloque mantiene el ancho de terminal aunque el usuario no lo escriba. */
export function opusLabel(num: string, i: number) {
  const n = num.trim().replace(/[:.\s]+$/, '')
  if (!n) return String(i + 1).padStart(5, '0')
  return /^\d+$/.test(n) ? n.padStart(5, '0') : n.toUpperCase()
}

/**
 * Plantilla 13 · Mindset / Opus: debajo del título principal (que renderiza el lienzo con su propia
 * escala), una columna de bloques numerados. Rótulo mono chico en cian tenue + texto sans mediano:
 * tres niveles tipográficos claramente distintos, alineados a la izquierda.
 */
export function OpusTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const A = useAccent()
  const blocks = (state.opusBlocks ?? []).filter((b) => b.text.trim()).slice(0, 6)
  if (!blocks.length) return null
  const isStory = state.aspect === 'story'
  // Con más bloques, el texto baja un poco para que la columna no empuje el título fuera de foco.
  const textSize = (blocks.length > 4 ? 34 : 38) * s
  return (
    <div
      data-part="opus-blocks"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: (isStory ? 34 : 26) * s,
        width: Math.min(contentWidth, 880 * s),
        textShadow: 'none',
      }}
    >
      {blocks.map((b, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 * s }}>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontWeight: 500,
              fontSize: 25 * s,
              letterSpacing: '0.16em',
              color: A.cyan,
              opacity: 0.72,
            }}
          >
            {opusLabel(b.num, i)}:
          </span>
          <span
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 500,
              fontSize: textSize,
              lineHeight: 1.32,
              color: palette.ink,
              opacity: 0.88,
              textWrap: 'pretty',
            }}
          >
            {b.text.trim()}
          </span>
        </div>
      ))}
    </div>
  )
}
