import type { SubtitleWord } from './types'

/** Bloque de impacto: 2 a 4 palabras que se muestran juntas. */
export interface SubtitleGroup {
  /** Índices [from, to) dentro de la lista de palabras */
  from: number
  to: number
  start: number
  end: number
  text: string
}

const MAX_WORDS = 4
const MAX_CHARS = 22
const GAP = 0.6

/**
 * Agrupa palabras en bloques de 2 a 4: corta en pausas largas, al llegar a 4 palabras o ~22
 * caracteres, y después de puntuación fuerte si el bloque ya tiene 2 palabras.
 */
export function groupWords(words: SubtitleWord[]): SubtitleGroup[] {
  const groups: SubtitleGroup[] = []
  let from = 0
  const close = (to: number) => {
    if (to <= from) return
    const slice = words.slice(from, to)
    groups.push({ from, to, start: slice[0].start, end: slice[slice.length - 1].end, text: slice.map((w) => w.word).join(' ') })
    from = to
  }
  for (let i = 0; i < words.length; i++) {
    const size = i - from
    if (size > 0) {
      const prev = words[i - 1]
      const chars = words.slice(from, i + 1).reduce((n, w) => n + w.word.length + 1, 0)
      if (size >= MAX_WORDS || words[i].start - prev.end > GAP || (size >= 2 && /[.,;:!?…]$/.test(prev.word)) || (size >= 2 && chars > MAX_CHARS)) close(i)
    }
  }
  close(words.length)
  return groups
}

/** Bloque visible en `time`: desde su inicio hasta el inicio del siguiente (máx. 0,35 s después de su final). */
export function activeGroup(groups: SubtitleGroup[], time: number): SubtitleGroup | null {
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    const next = groups[i + 1]
    const until = Math.min(next ? next.start : Infinity, g.end + 0.35)
    if (time >= g.start && time < until) return g
  }
  return null
}

/** Reparte el tramo [start, end] entre las palabras según su largo. */
export function distribute(texts: string[], start: number, end: number): SubtitleWord[] {
  const span = Math.max(0.05 * texts.length, end - start)
  const total = texts.reduce((n, t) => n + t.length + 1, 0) || 1
  let t = start
  return texts.map((word) => {
    const d = (span * (word.length + 1)) / total
    const w = { word, start: t, end: t + d }
    t += d
    return w
  })
}

/** Reemplaza el texto de un bloque: si coincide la cantidad de palabras conserva los tiempos. */
export function editGroupText(words: SubtitleWord[], g: SubtitleGroup, text: string): SubtitleWord[] {
  const texts = text.trim().split(/\s+/).filter(Boolean)
  const old = words.slice(g.from, g.to)
  const next = texts.length === old.length ? old.map((w, i) => ({ ...w, word: texts[i] })) : distribute(texts, g.start, g.end)
  return [...words.slice(0, g.from), ...next, ...words.slice(g.to)]
}

/** Mueve / estira un bloque a [start, end] escalando los tiempos de sus palabras. */
export function retimeGroup(words: SubtitleWord[], g: SubtitleGroup, start: number, end: number): SubtitleWord[] {
  const s0 = g.start
  const k = (Math.max(start + 0.05, end) - start) / Math.max(0.05, g.end - g.start)
  const map = (t: number) => start + (t - s0) * k
  const next = words.slice(g.from, g.to).map((w) => ({ ...w, start: map(w.start), end: map(w.end) }))
  return [...words.slice(0, g.from), ...next, ...words.slice(g.to)].sort((a, b) => a.start - b.start)
}

export function removeGroup(words: SubtitleWord[], g: SubtitleGroup): SubtitleWord[] {
  return [...words.slice(0, g.from), ...words.slice(g.to)]
}

/** 00:01:02,500 · 01:02.500 · 62.5 → segundos */
function parseTime(raw: string): number {
  const parts = raw.trim().replace(',', '.').split(':').map(Number)
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

/**
 * Parser de .SRT y .VTT: cada cue se convierte en palabras con tiempos repartidos por largo.
 * Ignora números de cue, cabecera WEBVTT, NOTE y etiquetas (<i>, <c.color>…).
 */
export function parseSubtitleFile(text: string): SubtitleWord[] {
  const words: SubtitleWord[] = []
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const i = lines.findIndex((l) => /-->/.test(l))
    if (i < 0) continue
    const [a, b] = lines[i].split('-->')
    const start = parseTime(a)
    const end = parseTime(b.trim().split(/\s+/)[0])
    const cue = lines
      .slice(i + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{[^}]+\}/g, '')
      .trim()
    if (!cue || !Number.isFinite(start) || !Number.isFinite(end)) continue
    words.push(...distribute(cue.split(/\s+/), start, Math.max(end, start + 0.2)))
  }
  return words.sort((x, y) => x.start - y.start)
}

/** Tramos con habla: palabras unidas si están a menos de 0,3 s. */
export function speechSegments(words: SubtitleWord[]): [number, number][] {
  const segs: [number, number][] = []
  for (const w of words) {
    const last = segs[segs.length - 1]
    if (last && w.start - last[1] < 0.3) last[1] = Math.max(last[1], w.end)
    else segs.push([w.start, w.end])
  }
  return segs
}

export const DUCK_LEVEL = 0.15 // −18 dB ≈ 15 % de la amplitud
const DUCK_FADE = 0.2

/**
 * Ganancia de la música (0–1) en `time` con auto-ducking: 15 % durante el habla y vuelta al
 * 100 % con una rampa de 0,2 s a cada lado de cada tramo hablado.
 */
export function duckGain(segments: [number, number][], time: number): number {
  let d = Infinity
  for (const [a, b] of segments) {
    if (time >= a && time <= b) return DUCK_LEVEL
    d = Math.min(d, time < a ? a - time : time - b)
  }
  if (d >= DUCK_FADE) return 1
  return DUCK_LEVEL + (1 - DUCK_LEVEL) * (d / DUCK_FADE)
}
