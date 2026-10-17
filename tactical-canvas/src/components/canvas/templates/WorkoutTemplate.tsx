import { FONT_BODY, FONT_BRAND, FONT_MONO } from '../../../lib/brand'
import { useAccent } from '../../../lib/accent'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  contentWidth: number
  scale: number
}

/**
 * Plantilla 17 · Sesión: la rutina como tarjeta de campo. Cada ejercicio es una fila con su código
 * (A1 / B1 / B2) en un bloque de acento, el nombre en Chakra Petch y la prescripción en mono
 * (series × reps · intensidad · pausa). Los superseries comparten letra y se agrupan visualmente.
 */
export function WorkoutTemplate({ state, palette, contentWidth, scale: s }: Props) {
  const A = useAccent()
  const rows = (state.workoutRows ?? []).filter((r) => r.name.trim()).slice(0, 8)
  if (!rows.length) return null
  const dense = rows.length > 5
  const isStory = state.aspect === 'story'
  const nameSize = (dense ? 31 : 36) * s
  const metaSize = (dense ? 21 : 23) * s
  const rowPad = (isStory ? 26 : dense ? 15 : 20) * s
  const hair = palette.ink.toUpperCase() === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'
  const letter = (code: string) => code.trim().charAt(0).toUpperCase()
  const note = (state.workoutNote ?? '').trim()

  return (
    <div data-part="workout" style={{ width: contentWidth, textShadow: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 * s, paddingBottom: 12 * s, fontFamily: FONT_MONO, fontSize: 18 * s, letterSpacing: '0.18em', color: A.cyan }}>
        <span style={{ width: 78 * s }}>#</span>
        <span style={{ flex: 1 }}>EJERCICIO</span>
        <span>PRESCRIPCIÓN</span>
      </div>
      {rows.map((r, i) => {
        const newGroup = i === 0 || letter(rows[i - 1].code) !== letter(r.code)
        // «2:30» → «PAUSA 2:30» (sin emojis: en el PNG cada sistema los dibuja distinto).
        const rest = r.rest.trim() && /^\d/.test(r.rest.trim()) ? `PAUSA ${r.rest.trim()}` : r.rest
        const meta = [r.scheme, r.intensity, rest].map((x) => (x ?? '').trim()).filter(Boolean)
        return (
          <div
            key={i}
            data-part="workout-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16 * s,
              padding: `${rowPad}px 0`,
              borderTop: `${Math.max(1, (newGroup ? 2 : 1) * s)}px ${newGroup ? 'solid' : 'dashed'} ${hair}`,
            }}
          >
            <span
              style={{
                width: 78 * s,
                flex: '0 0 auto',
                fontFamily: FONT_BRAND,
                fontWeight: 700,
                fontSize: 30 * s,
                lineHeight: 1,
                color: palette.accent,
                letterSpacing: '0.02em',
              }}
            >
              {r.code.trim() || String.fromCharCode(65 + i)}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: FONT_BRAND, fontWeight: 700, fontSize: nameSize, lineHeight: 1.08, color: palette.ink, textTransform: 'uppercase', textWrap: 'balance' }}>
              {r.name.trim()}
            </span>
            <span style={{ flex: '0 0 auto', maxWidth: contentWidth * 0.42, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 * s, fontFamily: FONT_MONO, fontWeight: 600, fontSize: metaSize, letterSpacing: '0.06em', color: palette.ink, textAlign: 'right' }}>
              {meta[0] && <span style={{ fontSize: metaSize * 1.25, color: palette.ink }}>{meta[0]}</span>}
              {meta.length > 1 && <span style={{ color: palette.muted }}>{meta.slice(1).join(' · ')}</span>}
            </span>
          </div>
        )
      })}
      {note && (
        <p style={{ margin: `${18 * s}px 0 0`, paddingTop: 20 * s, borderTop: `${Math.max(1, 2 * s)}px solid ${hair}`, fontFamily: FONT_BODY, fontSize: 25 * s, lineHeight: 1.4, color: palette.muted }}>
          <span style={{ fontFamily: FONT_BRAND, fontWeight: 700, color: palette.accent }}>→ </span>
          {note}
        </p>
      )}
    </div>
  )
}
