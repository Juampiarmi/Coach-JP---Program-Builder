import type { CanvasState, StickerKind } from '../types'

/**
 * REMIX MULTIFORMATO: el carrusel 4:5 se convierte en historias 9:16. Además de la zona segura de la
 * UI de Instagram (250 px arriba y abajo), cada historia puede reservar una ZONA DE STICKER: el
 * contenido se reacomoda por encima y la zona queda marcada para pegar ahí la encuesta, la caja de
 * preguntas, el link o el slider (el sticker real tapa la marca al publicar).
 */
export const STICKER_SPEC: Record<Exclude<StickerKind, 'none'>, { label: string; hint: string; h: number }> = {
  poll: { label: 'ENCUESTA', hint: '¿Lo hacías así? SÍ / NO', h: 300 },
  question: { label: 'PREGUNTAS', hint: 'Caja de preguntas: «Preguntame…»', h: 340 },
  slider: { label: 'SLIDER', hint: 'Deslizador de emoji: ¿cuánto te cuesta?', h: 230 },
  link: { label: 'LINK', hint: 'Sticker de enlace: programa / reserva', h: 160 },
}

export const STICKER_OPTIONS: { value: StickerKind; label: string }[] = [
  { value: 'none', label: 'NINGUNO' },
  { value: 'poll', label: 'ENCUESTA' },
  { value: 'question', label: 'PREGUNTA' },
  { value: 'slider', label: 'SLIDER' },
  { value: 'link', label: 'LINK' },
]

/** Separación entre el bloque de texto (footer incluido) y la zona del sticker. */
export const STICKER_GAP = 36

/** Alto que la zona de sticker le quita al contenido en una historia (0 = sin sticker o en Feed). */
export function stickerReserve(state: Pick<CanvasState, 'aspect' | 'storySticker'>) {
  const k = state.storySticker ?? 'none'
  return state.aspect === 'story' && k !== 'none' ? STICKER_SPEC[k].h + STICKER_GAP : 0
}

const LINK_RE = /\b(link|bio|enlace|reserv|inscrib|agend|cupos?|programa|asesor|plan personalizado|dm|escribime|mandame)/i
const flat = (s: CanvasState) => [s.headlineA, s.headlineB, s.body, s.kicker, s.athleticCta, s.bookmarkData?.cta ?? ''].join(' ')

/**
 * Asignación automática de stickers para el remix:
 * - la portada queda limpia (el gancho no compite con nada);
 * - Error vs Corrección y la primera placa de desarrollo llevan ENCUESTA (interacción de 1 toque);
 * - el cierre lleva LINK si el CTA vende / deriva, o PREGUNTAS si invita a conversar.
 */
export function autoStickers(slides: CanvasState[]): StickerKind[] {
  const n = slides.length
  if (n === 1) return [LINK_RE.test(flat(slides[0])) ? 'link' : 'question']
  // Si hay un Error vs Corrección en el desarrollo, la encuesta va ahí (y no se repite en la placa 2).
  let pollUsed = slides.some((s, i) => i > 0 && i < n - 1 && s.template === 'fix')
  return slides.map((s, i) => {
    if (i === 0) return 'none'
    if (i === n - 1) return LINK_RE.test(flat(s)) ? 'link' : 'question'
    if (s.template === 'fix') return 'poll'
    if (!pollUsed && i === 1 && n >= 4) {
      pollUsed = true
      return 'poll'
    }
    return 'none'
  })
}

/** Patch del remix 4:5 → 9:16 para todo el set: formato, reacomodo adaptativo y stickers (si no había). */
export function remixToStories(slides: CanvasState[]): CanvasState[] {
  const keep = slides.some((s) => (s.storySticker ?? 'none') !== 'none')
  const stickers = keep ? slides.map((s) => s.storySticker ?? 'none') : autoStickers(slides)
  // contentAlign auto: en Story el contenido arranca más grande y reparte el aire sobrante en vertical.
  return slides.map((s, i) => ({ ...s, aspect: 'story', contentAlign: 'auto', storySticker: stickers[i] }))
}
