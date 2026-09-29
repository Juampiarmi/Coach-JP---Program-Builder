import { smoothPath, type Pt } from '../../../lib/chart'
import { LABEL_FONT, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  expected: string
  real: string
  goal: string
}

/** Trayectoria: la línea recta que esperás vs. el camino real (con retrocesos) hasta la misma bandera. */
export function CurveDiagram({ expected, real, goal, width, height, ink, muted, accent, scale }: Props) {
  const a = { x: width * 0.05, y: height * 0.88 }
  const b = { x: width * 0.86, y: height * 0.2 }
  const pts: Pt[] = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    const env = Math.sin(Math.PI * t) // 0 en los extremos: arranca y termina en los mismos puntos
    const wobble = Math.sin(2 * Math.PI * 2.4 * t) * 0.2 + Math.sin(2 * Math.PI * 5.3 * t + 1) * 0.06 + 0.08
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + env * wobble * height }
  })
  const pole = 110 * scale
  const flagW = 62 * scale
  const text = (props: { x: number; y: number; anchor?: 'start' | 'middle' | 'end'; color: string; children: string; weight?: number }) => (
    <text x={props.x} y={props.y} textAnchor={props.anchor ?? 'start'} fill={props.color} style={{ fontFamily: LABEL_FONT, fontWeight: props.weight ?? 600, fontSize: 26 * scale }}>
      {props.children}
    </text>
  )
  const mid = pts[26]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={muted} strokeWidth={4 * scale} strokeDasharray={`${16 * scale} ${12 * scale}`} />
      <path d={smoothPath(pts, 0.5)} fill="none" stroke={accent} strokeWidth={8 * scale} strokeLinecap="round" />
      <circle cx={a.x} cy={a.y} r={11 * scale} fill={ink} />
      <line x1={b.x} y1={b.y} x2={b.x} y2={b.y - pole} stroke={ink} strokeWidth={5 * scale} strokeLinecap="round" />
      <path d={`M${b.x},${b.y - pole} L${b.x + flagW},${b.y - pole + flagW * 0.32} L${b.x},${b.y - pole + flagW * 0.64} Z`} fill={accent} />
      <circle cx={b.x} cy={b.y} r={9 * scale} fill={ink} />
      {goal.trim() && text({ x: b.x - 16 * scale, y: b.y - pole + flagW * 0.42, anchor: 'end', color: ink, children: goal.trim(), weight: 700 })}
      {expected.trim() && text({ x: (a.x + b.x) / 2 - 20 * scale, y: (a.y + b.y) / 2 - 26 * scale, anchor: 'end', color: muted, children: expected.trim() })}
      {real.trim() && text({ x: mid.x + 24 * scale, y: mid.y + 48 * scale, color: accent, children: real.trim() })}
    </svg>
  )
}
