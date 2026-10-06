import { BRAND } from '../../../lib/brand'
import { BOOKMARK_CTA } from '../../../lib/bookmark'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState, ThemeId } from '../../../types'
import { LABEL_FONT, MONO_FONT } from '../diagrams/shared'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  theme: ThemeId
  contentWidth: number
  scale: number
}

const FILL: Record<ThemeId, string> = { dark: '#11161B', paper: '#F0ECE4' }

/** Marcador vectorial (cinta con muesca) que cuelga del borde superior de la ficha. */
function BookmarkIcon({ w, h, color, bg }: { w: number; h: number; color: string; bg: string }) {
  return (
    <svg width={w} height={h} viewBox="0 0 60 84" style={{ display: 'block' }} aria-hidden>
      <path d="M4 0 H56 V80 L30 60 L4 80 Z" fill={color} />
      <path d="M18 22 H42 M18 34 H36" stroke={bg} strokeWidth={5} strokeLinecap="round" />
    </svg>
  )
}

/** Plantilla 12 · Placa de guardado / cheat sheet: ficha técnica de campo para la última placa. */
export function BookmarkTemplate({ state, palette, theme, contentWidth, scale: s }: Props) {
  const data = state.bookmarkData ?? { points: [], cta: BOOKMARK_CTA, accent: 'orange' as const }
  const accent = data.accent === 'cyan' ? (theme === 'paper' ? '#0E7490' : BRAND.cyan) : palette.accent
  const points = data.points.filter((p) => p.trim()).slice(0, 4)
  const isStory = state.aspect === 'story'
  const border = Math.max(1.5, 2 * s)
  const iconW = 64 * s
  const iconH = 90 * s

  return (
    <div style={{ position: 'relative', width: contentWidth, textShadow: 'none' }}>
      <div
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          background: FILL[theme],
          border: `${border}px solid ${palette.line}`,
          borderRadius: 18 * s,
          overflow: 'hidden',
        }}
      >
        {/* Cabecera de ficha técnica */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16 * s,
            padding: `${24 * s}px ${30 * s}px`,
            paddingRight: iconW + 56 * s,
            borderBottom: `${border}px dashed ${palette.line}`,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: 19 * s,
            letterSpacing: '0.18em',
            color: palette.muted,
          }}
        >
          <span style={{ color: accent }}>■</span>
          <span>FICHA TÉCNICA</span>
          <span style={{ opacity: 0.6 }}>// REF {String(points.length).padStart(2, '0')} PUNTOS</span>
        </div>
        {/* Viñetas en formato terminal */}
        <div style={{ padding: `${(isStory ? 34 : 22) * s}px ${30 * s}px` }}>
          {points.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 20 * s,
                alignItems: 'baseline',
                padding: `${(isStory ? 22 : 15) * s}px 0`,
                borderBottom: i < points.length - 1 ? `${border}px solid ${palette.line}` : 'none',
              }}
            >
              <span style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 24 * s, color: accent, flexShrink: 0, whiteSpace: 'pre' }}>{`> ${String(i + 1).padStart(2, '0')}`}</span>
              <span style={{ fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 29 * s, lineHeight: 1.25, color: palette.ink, textWrap: 'pretty' }}>{p}</span>
            </div>
          ))}
        </div>
        {/* Llamado a la acción de retención */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18 * s,
            background: accent,
            color: theme === 'paper' ? '#FFFFFF' : BRAND.bg,
            padding: `${(isStory ? 30 : 22) * s}px ${30 * s}px`,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: 21 * s,
            lineHeight: 1.35,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <svg width={30 * s} height={38 * s} viewBox="0 0 60 84" style={{ flexShrink: 0 }} aria-hidden>
            <path d="M4 0 H56 V80 L30 60 L4 80 Z" fill="none" stroke="currentColor" strokeWidth={8} strokeLinejoin="round" />
          </svg>
          <span>{data.cta || BOOKMARK_CTA}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: -border, right: 36 * s }}>
        <BookmarkIcon w={iconW} h={iconH} color={accent} bg={FILL[theme]} />
      </div>
    </div>
  )
}
