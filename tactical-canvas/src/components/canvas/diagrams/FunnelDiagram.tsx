import { fitLabel, LABEL_FONT, MONO_FONT, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  levels: string
}

/**
 * Embudo táctico: 3–4 niveles horizontales que se angostan (del universo general a lo que
 * sobrevive al filtro de evidencia). El último nivel va en acento.
 */
export function FunnelDiagram({ levels, width, height, ink, muted, line, accent, bg, scale }: Props) {
  const items = levels
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
  while (items.length < 3) items.push(`Nivel ${items.length + 1}`)
  const n = items.length
  const gap = 14 * scale
  const rowH = (height - gap * (n - 1)) / n
  const top = width
  const bottom = width * 0.42
  const w = (i: number) => top - ((top - bottom) * i) / Math.max(1, n - 1)
  const stroke = Math.max(2, 3 * scale)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {items.map((label, i) => {
        const y = i * (rowH + gap)
        const w0 = w(i)
        // Trapecio: el borde inferior ya mide lo que el nivel siguiente.
        const w1 = i < n - 1 ? w(i + 1) + (w(i) - w(i + 1)) * 0.25 : w0 * 0.92
        const x0 = (width - w0) / 2
        const x1 = (width - w1) / 2
        const last = i === n - 1
        const fit = fitLabel(label, 33 * scale, w1 - 150 * scale)
        return (
          <g key={i}>
            <path d={`M${x0},${y} H${x0 + w0} L${x1 + w1},${y + rowH} H${x1} Z`} fill={last ? accent : bg} fillOpacity={last ? 1 : 0.9} stroke={last ? accent : i === 0 ? line : muted} strokeWidth={stroke} strokeLinejoin="round" />
            <text x={(x0 + x1) / 2 + 40 * scale} y={y + rowH / 2 + 9 * scale} fill={last ? bg : accent} style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 24 * scale, letterSpacing: '0.1em' }}>
              {String(i + 1).padStart(2, '0')}
            </text>
            <text x={width / 2 + 24 * scale} y={y + rowH / 2 - ((fit.lines.length - 1) * fit.size * 1.12) / 2 + fit.size * 0.36} textAnchor="middle" fill={last ? bg : ink} style={{ fontFamily: LABEL_FONT, fontWeight: 800, fontSize: fit.size, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {fit.lines.map((l, k) => (
                <tspan key={k} x={width / 2 + 24 * scale} dy={k ? fit.size * 1.12 : 0}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
