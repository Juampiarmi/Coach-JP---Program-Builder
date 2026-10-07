/** Colores y medidas que recibe cada diagrama (dependen del tema y del acento elegido). */
export interface DiagramStyle {
  width: number
  height: number
  ink: string
  muted: string
  line: string
  accent: string
  bg: string
  scale: number
}

export const LABEL_FONT = "'Inter', system-ui, sans-serif"
export const MONO_FONT = "'IBM Plex Mono', ui-monospace, monospace"

export const toList = (raw: string) =>
  raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

export const toNumbers = (raw: string) =>
  toList(raw)
    .map((s) => Number(s.replace(',', '.')))
    .filter((n) => Number.isFinite(n))

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Rótulo que nunca se corta («RECOMPOSICIÓ…»): con más de 14 caracteres baja al 86 % del
 * cuerpo y se parte en 2 renglones por el espacio más cercano al medio; si la palabra más
 * larga igual no entra en maxWidth, achica el cuerpo hasta que entre.
 */
export function fitLabel(text: string, base: number, maxWidth: number): { size: number; lines: string[] } {
  const t = text.trim()
  let lines = [t]
  if (t.length > 14) {
    const spaces = [...t.matchAll(/\s/g)].map((m) => m.index ?? 0)
    if (spaces.length) {
      const cut = spaces.reduce((best, i) => (Math.abs(i - t.length / 2) < Math.abs(best - t.length / 2) ? i : best), spaces[0])
      lines = [t.slice(0, cut).trim(), t.slice(cut + 1).trim()]
    }
  }
  let size = t.length > 14 ? base * 0.86 : base
  // Ancho medio por carácter: las mayúsculas ocupan más.
  const caps = (t.match(/[A-ZÁÉÍÓÚÑÜ]/g)?.length ?? 0) / Math.max(1, t.replace(/\s/g, '').length)
  const charW = 0.58 + caps * 0.17
  const longest = Math.max(...lines.map((l) => l.length))
  if (longest * size * charW > maxWidth) size = maxWidth / (longest * charW)
  return { size, lines }
}
