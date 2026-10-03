import { smoothPath, type Pt } from '../../../lib/chart'
import { LABEL_FONT, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  /** Rótulo del tramo caótico (ruido) */
  expected: string
  /** Rótulo del tramo limpio (claridad) */
  real: string
  goal: string
}

/** Ruido determinístico (mismo dibujo en preview y PNG). */
const noise = (i: number) => {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Trayectoria «Ruido vs Claridad»: un primer tramo caótico (garabato que va y vuelve) que
 * se ordena en una línea recta y limpia hasta la bandera de la meta.
 */
export function CurveDiagram({ expected, real, goal, width, height, ink, muted, accent, scale }: Props) {
  const a = { x: width * 0.05, y: height * 0.8 }
  const pivot = { x: width * 0.5, y: height * 0.56 }
  const b = { x: width * 0.86, y: height * 0.22 }
  // Tramo caótico: avanza con retrocesos y saltos que se van calmando al llegar al pivote.
  const N = 34
  const chaos: Pt[] = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N
    const env = (1 - t) ** 0.8
    const back = (noise(i) - 0.5) * width * 0.16 * env
    const jump = (noise(i + 97) - 0.5) * height * 0.62 * env
    return {
      x: a.x + (pivot.x - a.x) * t + (i === 0 || i === N ? 0 : back),
      y: Math.min(height * 0.96, Math.max(height * 0.14, a.y + (pivot.y - a.y) * t + (i === 0 || i === N ? 0 : jump))),
    }
  })
  const pole = 110 * scale
  const flagW = 62 * scale
  const text = (props: { x: number; y: number; anchor?: 'start' | 'middle' | 'end'; color: string; children: string; weight?: number }) => (
    <text x={props.x} y={props.y} textAnchor={props.anchor ?? 'start'} fill={props.color} style={{ fontFamily: LABEL_FONT, fontWeight: props.weight ?? 600, fontSize: 26 * scale }}>
      {props.children}
    </text>
  )
  const midClean = { x: (pivot.x + b.x) / 2, y: (pivot.y + b.y) / 2 }
  const top = Math.min(...chaos.map((p) => p.y))

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <path d={smoothPath(chaos, 0.35)} fill="none" stroke={muted} strokeWidth={4 * scale} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={pivot.x} y1={pivot.y} x2={b.x} y2={b.y} stroke={accent} strokeWidth={8 * scale} strokeLinecap="round" />
      <circle cx={a.x} cy={a.y} r={11 * scale} fill={muted} />
      <circle cx={pivot.x} cy={pivot.y} r={12 * scale} fill={accent} />
      <line x1={b.x} y1={b.y} x2={b.x} y2={b.y - pole} stroke={ink} strokeWidth={5 * scale} strokeLinecap="round" />
      <path d={`M${b.x},${b.y - pole} L${b.x + flagW},${b.y - pole + flagW * 0.32} L${b.x},${b.y - pole + flagW * 0.64} Z`} fill={accent} />
      <circle cx={b.x} cy={b.y} r={9 * scale} fill={ink} />
      {goal.trim() && text({ x: b.x - 16 * scale, y: b.y - pole + flagW * 0.42, anchor: 'end', color: ink, children: goal.trim(), weight: 700 })}
      {expected.trim() && text({ x: (a.x + pivot.x) / 2, y: Math.max(26 * scale, top - 22 * scale), anchor: 'middle', color: muted, children: expected.trim() })}
      {real.trim() && text({ x: midClean.x + 22 * scale, y: midClean.y + 46 * scale, color: accent, children: real.trim(), weight: 700 })}
    </svg>
  )
}
