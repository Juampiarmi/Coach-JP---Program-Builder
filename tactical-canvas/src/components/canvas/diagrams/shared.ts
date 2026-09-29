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
