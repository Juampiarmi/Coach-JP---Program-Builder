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

const DIM: Record<ThemeId, string> = { dark: '#2E3440', paper: '#D8D2C8' }
const OUTLINE: Record<ThemeId, string> = { dark: '#566072', paper: '#B9B1A4' }

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
 * Plantilla 07 · Repetición matrix.
 * - Diagonal: la frase se repite una vez por palabra y en el renglón i se resalta la palabra i.
 * - Eco vertical: la frase (1-2 palabras clave) se repite N veces en outline apagado y la del
 *   medio va encendida.
 * El tamaño llena el ancho exacto (escalable) y el interlineado se ajusta solo para que el
 * bloque aproveche el alto disponible.
 */
export function RepeatTemplate({ state, palette, theme, fontFamily, fontWeight, contentWidth, maxHeight, scale }: Props) {
  const phrase = state.repeatPhrase.trim().toUpperCase() || 'ESCRIBÍ TU FRASE'
  const words = phrase.split(/\s+/)
  const echo = state.repeatMode === 'echo'
  const rows = echo ? Math.min(11, Math.max(3, Math.round(state.repeatCount))) : words.length
  const width100 = useTextWidth(phrase, fontFamily, fontWeight)
  const availH = maxHeight * scale
  const userScale = Math.min(1, Math.max(0.4, state.repeatScale / 100))
  // Tamaño: llena el ancho (y nunca más alto que lo que entra a interlineado 1,0) × escala elegida.
  const byWidth = (contentWidth / width100) * 100 * 0.985
  const byHeight = availH / (rows * (echo ? 1.0 : 1.08))
  const fontSize = Math.max(8, Math.min(byWidth, byHeight) * userScale)
  // Interlineado automático para ocupar el alto disponible, modulado por el slider.
  const fill = availH / (rows * fontSize)
  const auto = Math.min(echo ? 1.6 : 2.4, Math.max(echo ? 0.98 : 1.08, fill * 0.92))
  const lineHeight = Math.min(fill, Math.max(0.9, auto * (state.repeatLeading / 100)))
  const hi = state.repeatAccent === 'orange' ? BRAND.orange : state.repeatAccent === 'cyan' ? BRAND.cyan : palette.ink
  const mid = Math.floor(rows / 2)

  return (
    <div
      style={{
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight,
        letterSpacing: 0,
        textTransform: 'uppercase',
        color: DIM[theme],
        textShadow: 'none',
        textAlign: echo ? 'center' : 'left',
      }}
    >
      {echo
        ? Array.from({ length: rows }, (_, row) => {
            const d = Math.abs(row - mid)
            return (
              <div
                key={row}
                style={
                  row === mid
                    ? { whiteSpace: 'nowrap', color: hi }
                    : {
                        whiteSpace: 'nowrap',
                        color: 'transparent',
                        WebkitTextStroke: `${Math.max(1.5, fontSize * 0.02)}px ${OUTLINE[theme]}`,
                        opacity: Math.max(0.18, 1 - d * 0.2),
                      }
                }
              >
                {phrase}
              </div>
            )
          })
        : words.map((_, row) => (
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
