import { FONT_BRAND, FONT_MONO } from '../../../lib/brand'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

const SERIF = "'DM Serif Display', Georgia, serif"

/** Comillas envolventes que el usuario haya pegado: la placa ya dibuja las suyas. */
export function cleanQuote(t: string) {
  return t.trim().replace(/^[«"“„'‘\s]+|[»"”'’\s]+$/gu, '').trim()
}

/** Cuerpo de la frase según su largo: corta = gigante, larga = sigue entrando sin desbordar. */
function quoteSize(chars: number) {
  if (chars <= 50) return 104
  if (chars <= 90) return 86
  if (chars <= 140) return 72
  if (chars <= 210) return 60
  return 52
}

/**
 * Plantilla 14 · Cita célebre (estilo Forbes Quotes): comilla gigante en acento, la frase en serif
 * editorial y, abajo, una línea corta + NOMBRE en mayúsculas + rol en mono tenue.
 */
export function QuoteTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const text = cleanQuote(state.quoteText ?? '')
  const author = (state.quoteAuthor ?? '').trim()
  const role = (state.quoteRole ?? '').trim()
  if (!text) return null
  const size = quoteSize(text.length) * s
  return (
    <div data-part="quote" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: contentWidth }}>
      <div
        aria-hidden
        style={{
          fontFamily: SERIF,
          fontSize: 230 * s,
          lineHeight: 0.7,
          height: 120 * s,
          color: palette.accent,
          marginLeft: -8 * s,
        }}
      >
        “
      </div>
      <blockquote
        style={{
          margin: 0,
          fontFamily: SERIF,
          fontWeight: 400,
          fontSize: size,
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          color: palette.ink,
          textWrap: 'balance',
          maxWidth: contentWidth * 0.96,
        }}
      >
        {text}
      </blockquote>
      {(author || role) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 * s, marginTop: 64 * s }}>
          <span aria-hidden style={{ width: 64 * s, height: Math.max(2, 4 * s), background: palette.accent, flex: '0 0 auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * s }}>
            {author && (
              <span
                data-part="quote-author"
                style={{ fontFamily: FONT_BRAND, fontWeight: 700, fontSize: 38 * s, letterSpacing: '0.06em', textTransform: 'uppercase', color: palette.ink }}
              >
                {author}
              </span>
            )}
            {role && (
              <span
                data-part="quote-role"
                style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 23 * s, letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.muted }}
              >
                {role}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
