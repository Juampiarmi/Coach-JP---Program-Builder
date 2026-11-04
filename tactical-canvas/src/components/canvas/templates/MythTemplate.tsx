import { BRAND, FONT_BODY, FONT_BRAND } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

export const MYTH_RED = '#EF4444'
const TRUTH_ORANGE = '#F97316'
const TRUTH_GREEN = '#22C55E'

/** Íconos vectoriales: los glifos ✘ / ✓ dependen de la fuente y en el PNG pueden cambiar. */
function Icon({ ok, size, color }: { ok: boolean; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ display: 'block', flex: '0 0 auto' }}>
      {ok ? (
        <path d="M4 12.5 9.5 18 20 6.5" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="square" />
      ) : (
        <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="square" />
      )}
    </svg>
  )
}

/**
 * Plantilla 21 · Mito vs Fisiología: arriba (o a la izquierda) el mito popular en tarjeta oscura con
 * borde rojo y badge «[ ✘ MITO POPULAR ]»; abajo (o a la derecha) la fisiología real en carbón con
 * borde naranja (o verde) y badge «[ ✓ FISIOLOGÍA REAL ]». El mito va tachado tenue: se lee, pero
 * queda claro que es lo que se descarta.
 */
export function MythTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const A = useAccent()
  const split = state.mythLayout === 'split'
  const truthColor = state.truthAccent === 'green' ? TRUTH_GREEN : A.swap ? BRAND.cyan : TRUTH_ORANGE
  const gap = (split ? 24 : 22) * s
  const cardW = split ? (contentWidth - gap) / 2 : contentWidth
  const border = Math.max(2, 4 * s)
  const sides = [
    { ok: false, label: state.mythLabel || 'MITO POPULAR', text: (state.mythText ?? '').trim(), color: MYTH_RED, bg: '#0D1117' },
    { ok: true, label: state.truthLabel || 'FISIOLOGÍA REAL', text: (state.truthText ?? '').trim(), color: truthColor, bg: '#151B24' },
  ]
  return (
    <div data-part="myth" style={{ display: 'flex', flexDirection: split ? 'row' : 'column', gap, width: contentWidth, textShadow: 'none' }}>
      {sides.map((side) => (
        <div
          key={String(side.ok)}
          data-part={side.ok ? 'myth-truth' : 'myth-myth'}
          style={{
            width: cardW,
            boxSizing: 'border-box',
            background: side.bg,
            border: `${border}px solid ${side.color}`,
            borderRadius: 16 * s,
            padding: `${24 * s}px ${28 * s}px ${28 * s}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: 18 * s,
            boxShadow: side.ok ? `0 0 ${40 * s}px -${12 * s}px ${side.color}` : undefined,
          }}
        >
          <div
            data-part="myth-badge"
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 10 * s,
              padding: `${8 * s}px ${14 * s}px`,
              border: `${Math.max(1.5, 2 * s)}px solid ${side.color}`,
              borderRadius: 6 * s,
              fontFamily: FONT_BRAND,
              fontWeight: 700,
              fontSize: 22 * s,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: side.color,
            }}
          >
            <span>[</span>
            <Icon ok={side.ok} size={22 * s} color={side.color} />
            <span>{side.label}</span>
            <span>]</span>
          </div>
          {side.text && (
            <p
              style={{
                margin: 0,
                fontFamily: side.ok ? FONT_BODY : FONT_BRAND,
                fontWeight: side.ok ? 500 : 600,
                fontSize: (side.ok ? (split ? 27 : 31) : split ? 30 : 36) * s,
                lineHeight: side.ok ? 1.38 : 1.18,
                color: side.ok ? palette.ink : '#9AA4B2',
                textDecoration: side.ok ? 'none' : 'line-through',
                textDecorationColor: 'rgba(239,68,68,0.55)',
                textDecorationThickness: Math.max(2, 3 * s),
                textWrap: 'pretty',
              }}
            >
              {side.text}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
