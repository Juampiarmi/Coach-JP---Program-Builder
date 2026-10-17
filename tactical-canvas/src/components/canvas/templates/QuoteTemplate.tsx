import { BRAND, FONT_BODY, FONT_BRAND, FONT_MONO } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
import { autoEmphasis } from '../../../lib/quoteIntent'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

/** Naranja de énfasis de la Cita táctica (cian con SWAP ACCENT). */
const QUOTE_ORANGE = '#F97316'

/** Comillas envolventes que el usuario haya pegado: la placa ya dibuja las suyas. */
export function cleanQuote(t: string) {
  return t.trim().replace(/^[«"“„'‘\s]+|[»"”'’\s]+$/gu, '').trim()
}

/** Cuerpo de la frase según su largo: corta = gigante, larga = sigue entrando sin desbordar. */
function quoteSize(chars: number) {
  if (chars <= 40) return 96
  if (chars <= 70) return 82
  if (chars <= 110) return 70
  if (chars <= 160) return 60
  if (chars <= 220) return 52
  return 46
}

/** Parte la frase en [antes, énfasis, después] buscando el remate (sin distinguir mayúsculas). */
function splitEmphasis(text: string, emphasis: string): [string, string, string] {
  const e = emphasis.trim()
  if (!e) return [text, '', '']
  const i = text.toLowerCase().lastIndexOf(e.toLowerCase())
  if (i < 0) return [text, '', '']
  return [text.slice(0, i), text.slice(i, i + e.length), text.slice(i + e.length)]
}

/**
 * Plantilla 14 · Cita táctica: badge mono «[ AUTOR // MICHAEL JORDAN ]», la frase en Chakra Petch
 * Bold gigante (blanco + remate de énfasis en naranja), el rol y una bajada de contexto de máximo
 * 2 líneas que traduce la lección al sistema de Coach JP.
 * Sin frase cargada (plantilla elegida a mano sobre otra placa), usa el titular como cita.
 */
export function QuoteTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const A = useAccent()
  const fromHeadline = !cleanQuote(state.quoteText ?? '')
  const text = fromHeadline ? cleanQuote(`${state.headlineA} ${state.headlineB}`.replace(/\*/g, '').replace(/\s+/g, ' ')) : cleanQuote(state.quoteText ?? '')
  const author = (state.quoteAuthor ?? '').trim()
  const role = (state.quoteRole ?? '').trim()
  const context = (state.body ?? '').trim()
  if (!text) return null
  const emphasis = (state.quoteEmphasis ?? '').trim() || (fromHeadline ? state.headlineB.replace(/\*/g, '').trim() : autoEmphasis(text))
  const [pre, emph, post] = splitEmphasis(text, emphasis)
  const orange = A.swap ? BRAND.cyan : QUOTE_ORANGE
  const size = quoteSize(text.length) * s
  return (
    <div data-part="quote" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: contentWidth }}>
      {author && (
        <div
          data-part="quote-badge"
          style={{
            fontFamily: FONT_MONO,
            fontWeight: 600,
            fontSize: 24 * s,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: palette.ink,
            border: `${Math.max(1.5, 2 * s)}px solid ${orange}`,
            borderRadius: 6 * s,
            padding: `${10 * s}px ${18 * s}px`,
            marginBottom: 46 * s,
            textShadow: 'none',
          }}
        >
          <span style={{ color: orange }}>[</span> AUTOR <span style={{ color: orange }}>//</span> {author} <span style={{ color: orange }}>]</span>
        </div>
      )}
      <blockquote
        data-part="quote-text"
        style={{
          margin: 0,
          fontFamily: FONT_BRAND,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          color: palette.ink,
          textWrap: 'balance',
          maxWidth: contentWidth,
        }}
      >
        <span style={{ color: orange }}>“</span>
        {pre}
        {emph && (
          <span data-part="quote-emphasis" style={{ color: orange }}>
            {emph}
          </span>
        )}
        {post}
        <span style={{ color: orange }}>”</span>
      </blockquote>
      {role && (
        <div data-part="quote-role" style={{ display: 'flex', alignItems: 'center', gap: 18 * s, marginTop: 40 * s }}>
          <span aria-hidden style={{ width: 54 * s, height: Math.max(2, 4 * s), background: orange, flex: '0 0 auto' }} />
          <span style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 23 * s, letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.muted }}>{role}</span>
        </div>
      )}
      {context && (
        <p
          data-part="quote-context"
          style={{
            margin: `${(role ? 34 : 48) * s}px 0 0`,
            fontFamily: FONT_BODY,
            fontWeight: 500,
            fontSize: 30 * s,
            lineHeight: 1.4,
            color: palette.muted,
            maxWidth: contentWidth * 0.94,
            // Bajada de contexto: máximo 2 líneas (el detalle va en el caption).
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {context}
        </p>
      )}
    </div>
  )
}
