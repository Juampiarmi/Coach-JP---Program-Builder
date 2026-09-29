import { clamp, LABEL_FONT, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  count: number
  start: string
  end: string
}

const GROWTH = 1.5 // cada ficha puede voltear a otra ~50 % más grande

/** Efecto dominó: fichas que crecen en escala, las primeras ya cayendo, de hábito mínimo a resultado masivo. */
export function DominoDiagram({ count, start, end, width, height, ink, muted, accent, bg, scale }: Props) {
  const n = clamp(Math.round(count), 4, 9)
  const labelH = 70 * scale
  const base = height - labelH - 30 * scale
  const hMax = base * 0.92
  let hs = Array.from({ length: n }, (_, i) => hMax / GROWTH ** (n - 1 - i))
  let ws = hs.map((h) => Math.max(10, h * 0.34))
  let gaps = ws.map((w) => w * 0.6)
  const totalW = ws.reduce((a, b) => a + b, 0) + gaps.slice(0, -1).reduce((a, b) => a + b, 0)
  const k = Math.min(1, (width * 0.96) / totalW)
  hs = hs.map((h) => h * k)
  ws = ws.map((w) => w * k)
  gaps = gaps.map((g) => g * k)
  const used = ws.reduce((a, b) => a + b, 0) + gaps.slice(0, -1).reduce((a, b) => a + b, 0)
  let x = (width - used) / 2
  const tiles = hs.map((h, i) => {
    const t = { x, w: ws[i], h, tilt: i === 0 ? 34 : i === 1 ? 14 : 0 }
    x += ws[i] + gaps[i]
    return t
  })
  const first = tiles[0]
  const last = tiles[n - 1]
  const arrowY = base + 26 * scale
  const stroke = 4 * scale

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={base + 50 * scale} viewBox={`0 0 ${width} ${base + 50 * scale}`} style={{ display: 'block', overflow: 'visible' }}>
        <line x1={0} x2={width} y1={base} y2={base} stroke={muted} strokeOpacity={0.5} strokeWidth={2} />
        {tiles.map((t, i) => {
          const isLast = i === n - 1
          return (
            <g key={i} transform={`rotate(${t.tilt} ${t.x + t.w} ${base})`}>
              <rect x={t.x} y={base - t.h} width={t.w} height={t.h} rx={Math.min(8, t.w * 0.12)} fill={isLast ? accent : bg} stroke={isLast ? accent : ink} strokeWidth={stroke} />
              <line x1={t.x + t.w * 0.18} x2={t.x + t.w * 0.82} y1={base - t.h / 2} y2={base - t.h / 2} stroke={isLast ? bg : ink} strokeWidth={stroke * 0.7} />
            </g>
          )
        })}
        <g stroke={ink} strokeWidth={3 * scale} fill="none" strokeLinecap="round">
          <line x1={first.x} y1={arrowY} x2={last.x + last.w} y2={arrowY} />
          <polyline points={`${last.x + last.w - 16 * scale},${arrowY - 10 * scale} ${last.x + last.w},${arrowY} ${last.x + last.w - 16 * scale},${arrowY + 10 * scale}`} />
        </g>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: first.x, marginRight: width - (last.x + last.w), marginTop: 10 * scale, fontFamily: LABEL_FONT, fontWeight: 600, fontSize: 25 * scale, color: ink }}>
        <span>{start}</span>
        <span style={{ color: accent }}>{end}</span>
      </div>
    </div>
  )
}
