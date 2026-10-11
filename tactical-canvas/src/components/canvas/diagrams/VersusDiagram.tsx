import { fitLabel, LABEL_FONT, MONO_FONT, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  leftTitle: string
  rightTitle: string
  left: string
  right: string
}

const ERR = '#EF4444'
const list = (raw: string) =>
  raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5)

/**
 * VS binario: dos columnas enfrentadas (Mito vs Realidad, Marketing vs Evidencia). La izquierda
 * descarta con ✗ en rojo apagado; la derecha confirma con ✓ en acento y borde encendido.
 */
export function VersusDiagram({ leftTitle, rightTitle, left, right, width, ink, muted, line, accent, bg, scale }: Props) {
  const colGap = 64 * scale
  const colW = (width - colGap) / 2
  const L = list(left)
  const R = list(right)
  const rows = Math.max(L.length, R.length, 1)
  const border = Math.max(2, 3 * scale)
  const col = (title: string, items: string[], good: boolean) => {
    const color = good ? accent : ERR
    return (
      <div
        style={{
          width: colW,
          boxSizing: 'border-box',
          border: `${border}px solid ${good ? accent : line}`,
          borderRadius: 18 * scale,
          background: good ? `${accent}14` : 'transparent',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${18 * scale}px ${24 * scale}px`,
            background: good ? accent : 'transparent',
            borderBottom: `${border}px solid ${good ? accent : line}`,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: 26 * scale,
            letterSpacing: '0.16em',
            color: good ? bg : muted,
          }}
        >
          <span>{title.trim().toUpperCase() || (good ? 'REALIDAD' : 'MITO')}</span>
          <span>{good ? '[ ✓ ]' : '[ ✗ ]'}</span>
        </div>
        {Array.from({ length: rows }, (_, i) => {
          const t = items[i] ?? ''
          const fit = fitLabel(t, 29 * scale, colW - 96 * scale)
          return (
            <div key={i} style={{ display: 'flex', gap: 14 * scale, alignItems: 'flex-start', padding: `${18 * scale}px ${24 * scale}px`, borderTop: i ? `${Math.max(1, 2 * scale)}px dashed ${line}` : 'none', minHeight: 64 * scale, boxSizing: 'border-box' }}>
              {t && <span style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 28 * scale, color, lineHeight: 1.2, flexShrink: 0 }}>{good ? '✓' : '✗'}</span>}
              <span style={{ fontFamily: LABEL_FONT, fontWeight: good ? 700 : 600, fontSize: fit.size, lineHeight: 1.22, color: good ? ink : muted, textDecoration: good ? 'none' : `line-through ${ERR}88` }}>
                {fit.lines.map((l, k) => (
                  <div key={k}>{l}</div>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
      {col(leftTitle, L, false)}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 84 * scale,
          height: 84 * scale,
          borderRadius: '50%',
          background: bg,
          border: `${border}px solid ${accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: MONO_FONT,
          fontWeight: 700,
          fontSize: 28 * scale,
          color: accent,
          letterSpacing: '0.04em',
        }}
      >
        VS
      </div>
      {col(rightTitle, R, true)}
    </div>
  )
}
