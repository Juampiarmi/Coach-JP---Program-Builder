import { FONT_BODY, FONT_BRAND } from '../../../lib/brand'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
  /** Resuelve el id de imagen (IndexedDB) a su dataURL ya cargado */
  resolveImage?: (id: string | null | undefined) => string | null
}

export const FIX_RED = '#EF4444'
export const FIX_GREEN = '#22C55E'

/** Íconos vectoriales (no glifos: ✓/✗ dependen de la fuente y en el PNG pueden salir en otra). */
function Mark({ ok, size, color }: { ok: boolean; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ display: 'block', flex: '0 0 auto' }}>
      {ok ? (
        <path d="M4 12.5 9.5 18 20 6.5" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="square" />
      ) : (
        <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="square" />
      )}
    </svg>
  )
}

interface Side {
  ok: boolean
  label: string
  text: string
  image: string | null
  color: string
}

/**
 * Plantilla 18 · Error vs Corrección: dos tarjetas (lado a lado o apiladas) con su imagen, un badge
 * «[ ✗ INCORRECTO ]» en rojo y «[ ✓ CORRECCIÓN TÁCTICA ]» en verde (o naranja de marca), y debajo el
 * texto corto de la falla y de la solución. Sin imagen, la tarjeta muestra el ícono grande.
 */
export function FixTemplate({ state, palette, contentWidth, scale: s, resolveImage }: Props) {
  const isStory = state.aspect === 'story'
  const stack = state.fixLayout === 'stack'
  const okColor = state.fixAccent === 'brand' ? palette.accent : FIX_GREEN
  const sides: Side[] = [
    { ok: false, label: state.fixWrongLabel || 'INCORRECTO', text: state.fixWrongText ?? '', image: resolveImage?.(state.fixWrongImageId) ?? null, color: FIX_RED },
    { ok: true, label: state.fixRightLabel || 'CORRECCIÓN TÁCTICA', text: state.fixRightText ?? '', image: resolveImage?.(state.fixRightImageId) ?? null, color: okColor },
  ]
  const gap = 26 * s
  const cardW = stack ? contentWidth : (contentWidth - gap) / 2
  // Alto de la imagen: en split ~4:5 del ancho de la tarjeta; apilado, una franja horizontal.
  const imgH = stack ? (isStory ? 330 : 250) * s : cardW * (isStory ? 1.25 : 1.02)
  const border = Math.max(2, 4 * s)
  const dark = palette.ink.toUpperCase() === '#FFFFFF'

  return (
    <div data-part="fix" style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', gap, width: contentWidth, textShadow: 'none' }}>
      {sides.map((side) => (
        <div
          key={String(side.ok)}
          data-part={side.ok ? 'fix-right' : 'fix-wrong'}
          style={{
            width: cardW,
            boxSizing: 'border-box',
            border: `${border}px solid ${side.color}`,
            borderRadius: 18 * s,
            overflow: 'hidden',
            background: dark ? '#0F141B' : '#FFFFFF',
            display: 'flex',
            flexDirection: stack ? 'row' : 'column',
          }}
        >
          <div style={{ position: 'relative', width: stack ? cardW * 0.47 : '100%', height: imgH, flex: '0 0 auto', background: dark ? '#161D27' : '#E8E8E8', overflow: 'hidden' }}>
            {side.image ? (
              <img src={side.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
                <Mark ok={side.ok} size={(stack ? 110 : 150) * s} color={side.color} />
              </div>
            )}
            {/* Velo inferior para que el badge y el borde se lean sobre cualquier foto */}
            {side.image && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%)' }} />}
            <div
              data-part="fix-badge"
              style={{
                position: 'absolute',
                top: 16 * s,
                left: 16 * s,
                display: 'flex',
                alignItems: 'center',
                gap: 8 * s,
                padding: `${8 * s}px ${14 * s}px`,
                background: side.color,
                borderRadius: 8 * s,
                fontFamily: FONT_BRAND,
                fontWeight: 700,
                fontSize: (stack ? 22 : 23) * s,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#0B0E14',
                maxWidth: (stack ? cardW * 0.47 : cardW) - 32 * s,
                lineHeight: 1.1,
              }}
            >
              <Mark ok={side.ok} size={24 * s} color="#0B0E14" />
              <span>{side.label}</span>
            </div>
          </div>
          {side.text.trim() && (
            <div style={{ padding: `${22 * s}px ${24 * s}px ${26 * s}px`, display: 'flex', alignItems: 'center', flex: 1 }}>
              <p style={{ margin: 0, fontFamily: FONT_BODY, fontWeight: 500, fontSize: (stack ? 30 : 27) * s, lineHeight: 1.36, color: dark ? '#E2E8F0' : '#1F2937', textWrap: 'pretty' }}>
                {side.text.trim()}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
