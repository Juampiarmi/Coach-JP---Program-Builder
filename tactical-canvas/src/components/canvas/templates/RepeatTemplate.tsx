import { useEffect, useState } from 'react'
import { BRAND } from '../../../lib/brand'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState, ThemeId } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  theme: ThemeId
  fontFamily: string
  fontWeight: number
  contentWidth: number
  /** Alto disponible para la matriz (px del lienzo, antes del auto-ajuste) */
  maxHeight: number
  scale: number
}

const LINE_HEIGHT = 1.14
const DIM: Record<ThemeId, string> = { dark: '#2E3440', paper: '#D8D2C8' }

/** Ancho de la frase a 100 px con la fuente real (canvas 2D: mismo resultado en preview y PNG). */
function useTextWidth(text: string, family: string, weight: number) {
  const [width, setWidth] = useState(() => text.length * 58)
  useEffect(() => {
    let alive = true
    const font = `${weight} 100px ${family}`
    const measure = () => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx || !alive) return
      ctx.font = font
      setWidth(ctx.measureText(text).width || text.length * 58)
    }
    measure()
    document.fonts?.load(font, text).then(measure, measure)
    return () => {
      alive = false
    }
  }, [text, family, weight])
  return width
}

/**
 * Plantilla 07 · Repetición matrix: la frase se repite una vez por palabra; todo en gris
 * apagado y en el renglón i se resalta la palabra i, formando una diagonal que se lee de
 * arriba hacia abajo.
 */
export function RepeatTemplate({ state, palette, theme, fontFamily, fontWeight, contentWidth, maxHeight, scale }: Props) {
  const phrase = state.repeatPhrase.trim().toUpperCase() || 'ESCRIBÍ TU FRASE'
  const words = phrase.split(/\s+/)
  const rows = words.length
  const width100 = useTextWidth(phrase, fontFamily, fontWeight)
  // El tamaño llena el ancho exacto y, si hay muchos renglones, se limita por el alto.
  const byWidth = (contentWidth / width100) * 100 * 0.985
  const byHeight = (maxHeight * scale) / (rows * LINE_HEIGHT)
  const fontSize = Math.max(8, Math.min(byWidth, byHeight))
  const hi = state.repeatAccent === 'orange' ? BRAND.orange : state.repeatAccent === 'cyan' ? BRAND.cyan : palette.ink

  return (
    <div
      style={{
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight: LINE_HEIGHT,
        letterSpacing: 0,
        textTransform: 'uppercase',
        color: DIM[theme],
        textShadow: 'none',
      }}
    >
      {words.map((_, row) => (
        <div key={row} style={{ whiteSpace: 'nowrap' }}>
          {words.map((w, i) => (
            <span key={i} style={i === row ? { color: hi } : undefined}>
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
