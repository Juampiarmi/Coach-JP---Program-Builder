import { BRAND, FONT_MONO } from '../../../lib/brand'
import type { CanvasState } from '../../../types'
import { Headline } from '../Headline'

interface Props {
  state: CanvasState
  fontFamily: string
  fontSize: number
  tracking: string
  scale: number
}

/** Manifiesto / cita táctica: la frase es la pieza. Barra naranja o comillas militares. */
export function ManifestoTemplate({ state, fontFamily, fontSize, tracking, scale }: Props) {
  const author = state.manifestoAuthor.trim()
  const quotes = state.manifestoStyle === 'quotes'
  const phrase = (
    <Headline partA={state.headlineA} partB={state.headlineB} fontFamily={fontFamily} fontSize={fontSize} tracking={tracking} />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {quotes ? (
        <div>
          <div
            aria-hidden
            style={{
              fontFamily,
              fontWeight: 700,
              fontSize: 190 * scale,
              lineHeight: 0.62,
              height: 104 * scale,
              color: BRAND.orange,
              letterSpacing: '-0.08em',
            }}
          >
            «
          </div>
          {phrase}
          <div
            aria-hidden
            style={{
              fontFamily,
              fontWeight: 700,
              fontSize: 190 * scale,
              lineHeight: 0.62,
              height: 104 * scale,
              marginTop: 26 * scale,
              color: BRAND.orange,
              textAlign: 'right',
              letterSpacing: '-0.08em',
            }}
          >
            »
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 40 * scale }}>
          <div
            style={{
              width: 12 * scale,
              flex: '0 0 auto',
              background: BRAND.orange,
              borderRadius: 2,
              boxShadow: `0 0 ${36 * scale}px rgba(234,88,12,.35)`,
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>{phrase}</div>
        </div>
      )}
      {author && (
        <p
          style={{
            margin: `${(quotes ? 20 : 56) * scale}px 0 0`,
            paddingLeft: quotes ? 0 : 52 * scale,
            fontFamily: FONT_MONO,
            fontWeight: 600,
            fontSize: 22 * scale,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: BRAND.gray,
          }}
        >
          — {author}
        </p>
      )}
    </div>
  )
}
