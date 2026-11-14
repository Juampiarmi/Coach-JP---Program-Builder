import { DEFAULT_STATE } from '../defaults'
import type { Discipline } from './ai'
import { ctaSlide, trimSlide, type DoctorFix } from './retentionDoctor'
import { cleanSlideLanguage } from './language'
import type { CanvasState } from '../types'

/** Set activo de Tactical Canvas: tipo, claves que se propagan entre placas y operaciones puras. */

export const STORAGE_KEY = 'jp-tactical-canvas:v3'

/** Ajustes de estilo que comparten todos los slides de una secuencia. */
export const GLOBAL_KEYS = [
  'aspect',
  'headlineFont',
  'headlineScale',
  'floatingPlate',
  'contentAlign',
  'contentGap',
  'theme',
  'slideCounter',
  'seamlessThread',
  'panoramaImageId',
] as const

/** Fondo de cada placa: foto, capa, encuadre y tratamiento. Nunca se propaga a las demás al editar. */
export const BG_KEYS = ['bgImageId', 'bgStyle', 'bgOverlay', 'bgGradient', 'bgVignette', 'bgMono', 'bgZoom', 'bgX', 'bgY'] as const

/** Lo que replica [ 📋 COPIAR ESTILO ]: tipografía, viñeta / contraste de la foto y paleta de acentos. */
export const STYLE_KEYS = [
  'headlineFont',
  'headlineScale',
  'typePreset',
  'remateNewLine',
  'bgVignette',
  'bgOverlay',
  'bgGradient',
  'bgMono',
  'accentSwap',
  'metricAccent',
  'diagramAccent',
  'repeatAccent',
] as const

export interface Deck {
  slides: CanvasState[]
  active: number
  /** Copy de Instagram generado por la IA para toda la pieza */
  caption?: string
  /** Tema y enfoque de la última generación con IA (para re-generar una placa con coherencia) */
  topic?: string
  discipline?: Discipline
  /** Día del Plan Semanal al que pertenece este set (sus ediciones se guardan en ese día) */
  packDay?: string
  /** Proyecto de la biblioteca al que pertenece este set (sus ediciones se guardan en él) */
  projectId?: string
}


export const DEFAULT_DECK: Deck = { slides: [DEFAULT_STATE], active: 0, caption: '' }
/** Caption de respaldo para el ZIP cuando no hubo generación con IA: gancho, puntos y CTA. */
export function fallbackCaption(slides: CanvasState[]) {
  const clean = (t: string) => t.replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const title = (s: CanvasState) => clean(s.template === 'repeat' ? s.repeatPhrase : `${s.headlineA} ${s.headlineB}`)
  const [first, ...rest] = slides
  const lines = [title(first)]
  if (clean(first.body)) lines.push('', clean(first.body))
  const points = rest.map((s) => `▸ ${title(s)}`).filter((l) => l.length > 2)
  if (points.length) lines.push('', ...points)
  lines.push('', 'Guardá este post y compartilo con quien lo necesite.', '', '@coachjp.training')
  return lines.join('\n')
}

/** Aplica fixes del Doctor de retención sobre el deck (el CTA va último: agrega una placa al final). */
export function applyFixes(d: Deck, fixes: DoctorFix[]): Deck {
  let slides = d.slides.map((s) => ({ ...DEFAULT_STATE, ...s }) as CanvasState)
  const moved: string[] = []
  let active = d.active
  for (const f of [...fixes].sort((a, b) => Number(a.kind === 'cta') - Number(b.kind === 'cta'))) {
    if (f.kind === 'cta') {
      slides = [...slides, ctaSlide(slides[slides.length - 1])]
      active = slides.length - 1
      continue
    }
    if (f.kind === 'cite') {
      slides = slides.map((s) => (s.citeMain === f.from ? { ...s, citeMain: f.to } : s))
      continue
    }
    const i = f.slide
    if (!slides[i]) continue
    let patch: Partial<CanvasState> = {}
    if (f.kind === 'trim') {
      const t = trimSlide(slides[i], i === 0 && slides.length > 1)
      patch = t.patch
      if (t.removed.trim()) moved.push(t.removed.trim())
    } else if (f.kind === 'swap') patch = { template: f.to }
    else if (f.kind === 'contrast') patch = { bgOverlay: f.overlay, bgGradient: true }
    else if (f.kind === 'lang') patch = cleanSlideLanguage(slides[i])
    slides = slides.map((s, j) => (j === i ? { ...s, ...patch } : s))
  }
  // Lo recortado no se pierde: pasa al caption, donde se lee con calma.
  const caption = moved.length ? [d.caption?.trim(), ...moved].filter(Boolean).join('\n\n') : d.caption
  return { ...d, slides, active, caption }
}
