import { FONT_BODY, FONT_BRAND } from '../../../lib/brand'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length

/** Párrafo «remate»: escrito en mayúsculas (se dibuja en Chakra Petch, como un golpe de la marca). */
export const isShout = (p: string) => /\p{L}/u.test(p) && p === p.toUpperCase() && wordCount(p) <= 22

/**
 * Escala del cuerpo según el volumen de texto: con poco texto, cuerpo grande; con un manifiesto
 * largo, cuerpo más chico y más interlineado para que todo entre en UNA placa sin apretarse.
 * Devuelve tamaño en px del lienzo de 1080 (≈0,55 en la vista previa) e interlineado.
 */
export function essayScale(words: number, chars: number) {
  if (words <= 40 && chars <= 250) return { size: 44, leading: 1.36, gap: 36 }
  if (words <= 80) return { size: 36, leading: 1.45, gap: 30 }
  if (words <= 130) return { size: 31, leading: 1.5, gap: 26 }
  if (words <= 190) return { size: 28, leading: 1.52, gap: 22 }
  return { size: 25, leading: 1.5, gap: 18 }
}

/**
 * Plantilla 16 · Manifiesto texto (LayoutManifesto): reflexión de texto continuo en párrafos
 * separados con aire vertical. El cuerpo va en Inter y se auto-escala por cantidad de palabras; los
 * párrafos en MAYÚSCULAS son remates en Chakra Petch (el último, en naranja).
 */
export function EssayTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const paras = (state.essayParas ?? []).map((p) => p.trim()).filter(Boolean)
  if (!paras.length) return null
  const all = paras.join(' ')
  const sc = essayScale(wordCount(all), all.length)
  const lastShout = paras.reduce((acc, p, i) => (isShout(p) ? i : acc), -1)
  const body = palette.ink.toUpperCase() === '#FFFFFF' ? '#CBD5E1' : palette.muted
  return (
    <div data-part="essay" style={{ display: 'flex', flexDirection: 'column', gap: sc.gap * s, width: Math.min(contentWidth, 900 * s) }}>
      {paras.map((p, i) =>
        isShout(p) ? (
          <p
            key={i}
            data-part="essay-shout"
            style={{
              margin: `${(i ? 8 : 0) * s}px 0 0`,
              fontFamily: FONT_BRAND,
              fontWeight: 700,
              fontSize: Math.round(sc.size * 1.22 * s),
              lineHeight: 1.12,
              letterSpacing: '0',
              color: i === lastShout ? palette.accent : palette.ink,
              textWrap: 'balance',
            }}
          >
            {p}
          </p>
        ) : (
          <p key={i} style={{ margin: 0, fontFamily: FONT_BODY, fontWeight: 400, fontSize: Math.round(sc.size * s), lineHeight: sc.leading, color: body, textWrap: 'pretty' }}>
            {p}
          </p>
        ),
      )}
    </div>
  )
}
