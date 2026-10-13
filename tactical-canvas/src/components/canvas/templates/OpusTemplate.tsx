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
  // «1» → «00001»; un rótulo ya acolchado («01», «00001») se respeta tal cual.
  return /^[1-9]\d{0,3}$/.test(n) ? n.padStart(5, '0') : n.toUpperCase()
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
  // En el lienzo de 1080 px (≈0,55 en la vista previa): rótulo 27 px ≈ 15 px · texto 35 px ≈ 19 px.
  const textSize = (blocks.length > 4 ? 32 : 35) * s
  // Rótulo cian #38BDF8 (respeta el SWAP ACCENT) · texto gris claro #E2E8F0.
  const labelColor = A.cyan
  const textColor = palette.ink.toUpperCase() === '#FFFFFF' ? '#E2E8F0' : palette.ink
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
              fontSize: 27 * s,
              letterSpacing: '0.16em',
              color: labelColor,
              opacity: 0.85,
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
              color: textColor,
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
