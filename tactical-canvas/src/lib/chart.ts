export interface Pt {
  x: number
  y: number
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))

/** Lista de números separada por coma, punto y coma o espacios. */
export function parseSeries(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => Number(s.replace(',', '.')))
    .filter((n) => Number.isFinite(n))
}

/** Pares "x,y" (uno por línea). */
export function parseScatter(raw: string): Pt[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim().split(/[\s,;]+/).map(Number))
    .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map(([x, y]) => ({ x: clamp(x), y: clamp(y) }))
}

/** PRNG determinista (mulberry32) para que la dispersión sea reproducible. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Nube descendente con ruido: fuerza por pedalada vs. cadencia. */
export function generateScatter(seed = 7, count = 44): string {
  const r = rng(seed)
  const pts: string[] = []
  for (let i = 0; i < count; i++) {
    const x = clamp(4 + r() * 92)
    const trend = 78 - x * 0.45
    const y = clamp(trend + (r() - 0.5) * 18, 4, 96)
    pts.push(`${x.toFixed(0)},${y.toFixed(0)}`)
  }
  return pts.join('\n')
}

/** Normaliza una o varias series al rango 0–100 compartiendo escala. */
export function normalize(series: number[][], padding = 0.12): number[][] {
  const all = series.flat()
  if (!all.length) return series
  let min = Math.min(...all)
  let max = Math.max(...all)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * padding
  max += span * padding
  return series.map((s) => s.map((v) => ((v - min) / (max - min)) * 100))
}

/** Curva suave (Catmull-Rom → Bézier) a partir de puntos en píxeles. */
export function smoothPath(points: Pt[], tension = 0.5): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const t = tension / 3
    const c1x = p1.x + (p2.x - p0.x) * t
    const c1y = p1.y + (p2.y - p0.y) * t
    const c2x = p2.x - (p3.x - p1.x) * t
    const c2y = p2.y - (p3.y - p1.y) * t
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}
