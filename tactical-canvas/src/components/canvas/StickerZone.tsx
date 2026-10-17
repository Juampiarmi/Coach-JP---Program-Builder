import { FONT_MONO } from '../../lib/brand'
import { STICKER_SPEC } from '../../lib/remix'
import type { StickerKind } from '../../types'

interface Props {
  kind: StickerKind
  w: number
  /** Distancia desde el borde inferior (la zona segura de la UI de Instagram) */
  bottom: number
  side: number
  accent: string
  muted: string
}

/**
 * Zona de sticker de la historia 9:16: recuadro punteado con una maqueta tenue del sticker
 * (encuesta, preguntas, slider o link). Se exporta a propósito: marca dónde pegarlo en Instagram,
 * y el sticker real la tapa al publicar.
 */
export function StickerZone({ kind, w, bottom, side, accent, muted }: Props) {
  if (kind === 'none') return null
  const spec = STICKER_SPEC[kind]
  const inner = w - side * 2
  const mockW = Math.min(inner * 0.72, 620)
  const bar = (label: string, on = false) => (
    <div style={{ flex: 1, height: 64, borderRadius: 14, border: `2px solid ${on ? accent : muted}`, opacity: on ? 0.75 : 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, fontWeight: 600, fontSize: 24, letterSpacing: '0.12em', color: on ? accent : muted }}>
      {label}
    </div>
  )
  return (
    <div
      data-part="sticker-zone"
      style={{
        position: 'absolute',
        zIndex: 2,
        left: side,
        right: side,
        bottom,
        height: spec.h,
        boxSizing: 'border-box',
        border: `3px dashed ${muted}`,
        borderRadius: 30,
        opacity: 0.85,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        pointerEvents: 'none',
        textShadow: 'none',
      }}
    >
      <span style={{ position: 'absolute', top: 14, left: 22, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 18, letterSpacing: '0.2em', color: accent, opacity: 0.85 }}>
        [ STICKER · {spec.label} ]
      </span>
      {kind === 'poll' && (
        <div style={{ width: mockW, display: 'flex', gap: 16, marginTop: 24 }}>
          {bar('SÍ', true)}
          {bar('NO')}
        </div>
      )}
      {kind === 'question' && (
        <div style={{ width: mockW, marginTop: 24, borderRadius: 18, border: `2px solid ${muted}`, opacity: 0.5, overflow: 'hidden' }}>
          <div style={{ height: 70, background: accent, opacity: 0.55 }} />
          <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, fontSize: 22, letterSpacing: '0.1em', color: muted }}>ESCRIBÍ ACÁ…</div>
        </div>
      )}
      {kind === 'slider' && (
        <div style={{ width: mockW, marginTop: 24, position: 'relative', height: 12, borderRadius: 6, background: muted, opacity: 0.45 }}>
          <div style={{ position: 'absolute', left: '62%', top: -18, width: 48, height: 48, borderRadius: '50%', background: accent }} />
        </div>
      )}
      {kind === 'link' && (
        <div style={{ marginTop: 20, padding: '14px 36px', borderRadius: 40, border: `2px solid ${accent}`, opacity: 0.7, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 24, letterSpacing: '0.14em', color: accent }}>
          ↗ LINK
        </div>
      )}
    </div>
  )
}
