import type { BookmarkData, CanvasState } from '../types'
import { inferPillar, slideText } from './diagramPillar'
import { structDefaults } from './structPillar'

export const BOOKMARK_CTA = 'ESTÁNDAR OPERATIVO: GUARDÁ ESTA REFERENCIA PARA TU PRÓXIMO BLOQUE'

const clean = (t: string) =>
  t
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/, '')
    .trim()

/** Idea central de una placa en una línea: el remate o veredicto si existe, si no el titular. */
function keyLine(s: CanvasState) {
  if (s.template === 'repeat') return clean(s.repeatPhrase)
  if (s.template === 'statement' && s.kicker.trim()) return clean(s.kicker)
  if (s.template === 'compare' && s.verdict.trim()) return clean(s.verdict)
  return clean(`${s.headlineA} ${s.headlineB}`)
}

/**
 * Viñetas del cheat sheet extraídas del resto del carrusel (sin la portada si alcanza con
 * las demás). Con menos de 3 placas, completa con las oraciones del párrafo y, si aún
 * faltan, con las prioridades del pilar del tema.
 */
export function deriveBookmarkPoints(slides: CanvasState[], index: number): string[] {
  const others = slides.filter((s, i) => i !== index && s.template !== 'bookmark')
  const body = others.length > 3 ? others.slice(1) : others
  const seen = new Set<string>()
  const points: string[] = []
  for (const s of body) {
    const line = keyLine(s)
    const k = line.toLowerCase()
    if (line && !seen.has(k)) {
      seen.add(k)
      points.push(line)
    }
  }
  if (points.length < 3) {
    for (const s of slides) {
      for (const sentence of s.body.split(/(?<=[.!?])\s+/)) {
        const line = clean(sentence)
        if (line.length > 12 && !seen.has(line.toLowerCase()) && points.length < 4) {
          seen.add(line.toLowerCase())
          points.push(line)
        }
      }
    }
  }
  // Carrusel de una sola placa: las prioridades del pilar del tema (nunca una ficha vacía).
  if (points.length < 3 && slides[index]) {
    for (const lv of structDefaults(inferPillar('general', ...slideText(slides[index]))).pyramid.levels) {
      if (points.length >= 3) break
      points.push(`${lv.name}: ${lv.desc}`)
    }
  }
  return points.slice(0, 4)
}

/** Datos del cheat sheet: los de la placa o, si nunca se editaron, los extraídos del carrusel. */
export function resolveBookmark(state: CanvasState, slides: CanvasState[], index: number): BookmarkData {
  return state.bookmarkData ?? { points: deriveBookmarkPoints(slides, index), cta: BOOKMARK_CTA, accent: 'orange' }
}
