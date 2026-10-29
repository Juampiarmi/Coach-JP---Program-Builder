import { BRAND, FONT_BODY, FONT_BRAND, FONT_MONO } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
import { SERVICE_BY_ID } from '../../../lib/services'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

/** Naranja de acento de las placas de servicio (cian con SWAP ACCENT). */
const SERVICE_ORANGE = '#F97316'

/** Tilde vectorial (los glifos ✓ dependen de la fuente y en el PNG pueden cambiar). */
function Check({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ display: 'block', flex: '0 0 auto' }}>
      <path d="M4 12.5 9.5 18 20 6.5" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="square" />
    </svg>
  )
}

/** Cierre de conversión: etiqueta de disponibilidad + botón de CTA. */
function Conversion({ state, orange, palette, s, width }: { state: CanvasState; orange: string; palette: CanvasPalette; s: number; width: number }) {
  const avail = (state.serviceAvailability ?? '').trim()
  const cta = (state.serviceCta ?? '').trim()
  if (!avail && !cta) return null
  return (
    <div data-part="service-cta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 16 * s, width, textShadow: 'none' }}>
      {avail && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * s, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 21 * s, letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.muted }}>
          <span aria-hidden style={{ width: 12 * s, height: 12 * s, borderRadius: '50%', background: orange, boxShadow: `0 0 ${14 * s}px ${orange}` }} />
          {avail}
        </div>
      )}
      {cta && (
        <div
          style={{
            background: orange,
            color: BRAND.bg,
            borderRadius: 10 * s,
            padding: `${20 * s}px ${28 * s}px`,
            fontFamily: FONT_BRAND,
            fontWeight: 700,
            fontSize: 32 * s,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20 * s,
          }}
        >
          <span>{cta}</span>
          <span aria-hidden style={{ fontFamily: FONT_MONO }}>→</span>
        </div>
      )}
    </div>
  )
}

/**
 * Plantilla 19 · Servicios & Programas Coach JP.
 * - Ficha técnica (single): el canvas dibuja el badge «[ PROGRAMA ALTO RENDIMIENTO // RUGBY ]» y el
 *   titular; acá van los pilares técnicos numerados con acento naranja y el cierre de conversión.
 * - Carátula «System Offer» (catalog): grilla táctica de disciplinas, viñetas [ ✓ ] de lo que incluye
 *   todo programa y el CTA al pie.
 */
export function ServiceTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const A = useAccent()
  const orange = A.swap ? BRAND.cyan : SERVICE_ORANGE
  const items = (state.serviceItems ?? []).map((t) => t.trim()).filter(Boolean)
  const label = (text: string) => (
    <p style={{ margin: `0 0 ${18 * s}px`, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 20 * s, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.muted }}>
      <span style={{ color: orange }}>//</span> {text}
    </p>
  )

  if (state.serviceMode === 'catalog') {
    const sports = (state.serviceCatalog ?? []).map((id) => SERVICE_BY_ID[id]).filter(Boolean)
    const cols = sports.length > 4 ? 2 : 1
    const gap = 14 * s
    const cardW = (contentWidth - gap * (cols - 1)) / cols
    return (
      <div data-part="service" style={{ width: contentWidth, display: 'flex', flexDirection: 'column', gap: 34 * s }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap }}>
          {sports.map((sp, i) => (
            <div
              key={sp.id}
              data-part="service-card"
              style={{
                width: cardW,
                boxSizing: 'border-box',
                border: `${Math.max(1.5, 2 * s)}px solid ${palette.line}`,
                borderLeft: `${Math.max(3, 5 * s)}px solid ${orange}`,
                borderRadius: 8 * s,
                padding: `${14 * s}px ${18 * s}px`,
                background: 'rgba(18,23,33,0.72)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 14 * s,
                textShadow: 'none',
              }}
            >
              <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 19 * s, color: orange, letterSpacing: '0.08em' }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 * s, minWidth: 0 }}>
                <span style={{ fontFamily: FONT_BRAND, fontWeight: 700, fontSize: 27 * s, letterSpacing: '0.04em', textTransform: 'uppercase', color: palette.ink, lineHeight: 1.1 }}>{sp.short}</span>
                <span style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 19 * s, color: palette.muted, lineHeight: 1.25 }}>{sp.line}</span>
              </span>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div>
            {label('Incluye en todos los programas')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${12 * s}px ${26 * s}px` }}>
              {items.map((t, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 * s, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 21 * s, letterSpacing: '0.06em', textTransform: 'uppercase', color: palette.ink }}>
                  <span style={{ color: orange }}>[</span>
                  <Check size={20 * s} color={orange} />
                  <span style={{ color: orange }}>]</span>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        <Conversion state={state} orange={orange} palette={palette} s={s} width={contentWidth} />
      </div>
    )
  }

  return (
    <div data-part="service" style={{ width: contentWidth, display: 'flex', flexDirection: 'column', gap: 40 * s }}>
      {items.length > 0 && (
        <div>
          {label('Pilares técnicos')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * s }}>
            {items.slice(0, 5).map((t, i) => (
              <div key={i} data-part="service-pillar" style={{ display: 'flex', alignItems: 'flex-start', gap: 20 * s, paddingBottom: 16 * s, borderBottom: `1px solid ${palette.line}` }}>
                <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 24 * s, color: orange, letterSpacing: '0.06em', lineHeight: 1.45, minWidth: 40 * s }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 31 * s, lineHeight: 1.34, color: palette.ink }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Conversion state={state} orange={orange} palette={palette} s={s} width={contentWidth} />
    </div>
  )
}
