export interface Pt {
  x: number
  y: number
}

/** Lista de valores o etiquetas separada por coma / punto y coma. */
export function parseList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseNumbers(raw: string): number[] {
  return parseList(raw)
    .map((s) => Number(s.replace(/[^\d.-]/g, '')))
    .filter((n) => Number.isFinite(n))
}

/** "70-90 rpm" → [70, 90]. Devuelve null si no hay dos números. */
export function parseRange(raw: string): [number, number] | null {
  const nums = raw.match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(',', '.')))
  if (!nums || nums.length < 2) return null
  // Un guion entre números es separador, no signo negativo: "70-90" → 70 y 90
  const [a, b] = nums.map(Math.abs)
  return [Math.min(a, b), Math.max(a, b)]
}

/** Posición 0–1 de un valor dentro de [min, max], acotada. */
export function ratio(v: number, min: number, max: number) {
  if (max === min) return 0.5
  return Math.min(1, Math.max(0, (v - min) / (max - min)))
}

/** Número compacto para etiquetas de eje: 1200 → 1200, 3.5 → 3.5 */
export function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** Curva suave (Catmull-Rom → Bézier) a partir de puntos en píxeles. */
export function smoothPath(points: Pt[], tension = 0.5): string {
  if (points.length === 0) return ''
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const t = tension / 3
    d += ` C${(p1.x + (p2.x - p0.x) * t).toFixed(1)},${(p1.y + (p2.y - p0.y) * t).toFixed(1)} ${(p2.x - (p3.x - p1.x) * t).toFixed(1)},${(p2.y - (p3.y - p1.y) * t).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}
