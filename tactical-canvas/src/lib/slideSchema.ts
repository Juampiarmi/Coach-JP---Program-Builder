import { BOOKMARK_CTA } from './bookmark'
import type { BookmarkData, CanvasState, OpusBlock, TemplateId } from '../types'

/**
 * Contrato estructurado de cada placa que devuelve la IA. Son campos OBLIGATORIOS y explícitos,
 * así el frontend los inyecta 1:1 en el estado de la placa (sin concatenar ni adivinar texto).
 */
export type SlideLayout = 'cover' | 'mindset_opus' | 'academic' | 'cta'
export const SLIDE_LAYOUTS: readonly SlideLayout[] = ['cover', 'mindset_opus', 'academic', 'cta']

export interface CoreSlide {
  slide_number: number
  layout: SlideLayout
  header_tag: string
  titulo_principal: string
  accent_words: string[]
  bloques: { id: string; text: string }[]
  cta: string
}

/** JSON Schema (draft-07) de una placa. Va literal en el prompt como contrato de salida. */
export const CORE_SLIDE_SCHEMA = {
  type: 'object',
  required: ['slide_number', 'layout', 'header_tag', 'titulo_principal', 'accent_words', 'bloques', 'cta'],
  properties: {
    slide_number: { type: 'integer', minimum: 1, maximum: 20 },
    layout: { type: 'string', enum: SLIDE_LAYOUTS },
    header_tag: { type: 'string', description: 'Etiqueta superior entre corchetes, ej: «[ MINDSET · ESTÁNDAR ]»' },
    titulo_principal: { type: 'string', description: 'Título completo en MAYÚSCULAS, tal cual se lee en la placa' },
    accent_words: { type: 'array', items: { type: 'string' }, description: 'Palabras LITERALES de titulo_principal que van en naranja (idealmente el remate final, 2-6 palabras)' },
    bloques: {
      type: 'array',
      maxItems: 6,
      items: { type: 'object', required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' } } },
    },
    cta: { type: 'string', description: 'Llamado a la acción; "" salvo en la placa final o donde sea relevante' },
  },
} as const

export const CORE_SLIDE_PROMPT = `CONTRATO ESTRUCTURADO OBLIGATORIO: además de los campos de plantilla, CADA objeto de "slides" incluye SIEMPRE estos 7 campos, que el frontend inyecta tal cual en la placa (no los dejes afuera aunque estén vacíos):
- "slide_number": número de placa empezando en 1, en orden.
- "layout": "cover" (portada / gancho) | "mindset_opus" o "block_list" (título + bloques numerados) | "academic" (placa técnica: gráfico, métrica, diagrama, estructura) | "cta" (cierre con llamado a la acción).
- "header_tag": la etiqueta superior entre corchetes, ej: "[ FUERZA · RFD ]".
- "titulo_principal": el título completo en MAYÚSCULAS, exactamente como se lee (sin rótulos tipo «Título:»).
- "accent_words": array con las palabras LITERALES del final de titulo_principal que van en naranja (el remate, 2 a 6 palabras). Ej: titulo_principal «LOS DÍAS QUE NO QUERÉS SON LOS QUE CUENTAN.» → accent_words ["SON", "LOS", "QUE", "CUENTAN."].
- "bloques": array de { "id": "00001", "text": string } para ítems numerados (obligatorio con contenido en "mindset_opus"; en "cta", 3 o 4 bloques con lo que hay que recordar; [] en el resto).
- "cta": el llamado a la acción ("" salvo en la placa final "cta" o donde sea relevante).
Prohibido meter prefijos de texto («Header:», «Bullets:», «Subtítulo:», «Título:») dentro de los valores.
JSON Schema de cada placa: ${JSON.stringify(CORE_SLIDE_SCHEMA)}`

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim()
const LABEL = /^(header|header_tag|tag|bullets?|vi[ñn]etas?|titular|t[ií]tulo(?: principal)?|subt[ií]tulo(?:\s*\(\s*naranja\s*\))?|texto (?:inferior|central)|footer|bajada|cta|bloque \d+)\s*[:：]\s*/i
const clean = (v: unknown) => str(v).replace(LABEL, '').replace(/\s+/g, ' ').trim()

/** Valida y normaliza el contrato; null si la placa no lo trae (respuesta en el formato anterior). */
export function readCoreSlide(raw: unknown): CoreSlide | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const titulo = clean(r.titulo_principal)
  const rawLayout = str(r.layout).toLowerCase()
  // «block_list» es alias de mindset_opus (título + bloques numerados).
  const layout = rawLayout === 'block_list' ? 'mindset_opus' : SLIDE_LAYOUTS.find((l) => l === rawLayout)
  if (!titulo || !layout) return null
  const n = Number(r.slide_number)
  return {
    slide_number: Number.isFinite(n) && n > 0 ? Math.round(n) : 0,
    layout,
    header_tag: clean(r.header_tag),
    titulo_principal: titulo.toUpperCase(),
    accent_words: (Array.isArray(r.accent_words) ? r.accent_words : typeof r.accent_words === 'string' ? r.accent_words.split(/\s+/) : [])
      .map(clean)
      .filter(Boolean),
    bloques: (Array.isArray(r.bloques) ? r.bloques : [])
      .map((b, i) => {
        const o = (b && typeof b === 'object' ? b : { text: b }) as Record<string, unknown>
        return { id: clean(o.id ?? o.numero) || String(i + 1).padStart(5, '0'), text: clean(o.text ?? o.texto) }
      })
      .filter((b) => b.text)
      .slice(0, 6),
    cta: clean(r.cta),
  }
}

const norm = (w: string) => w.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '')

/**
 * titulo_principal + accent_words → titular blanco + remate naranja. Si las palabras de acento son el
 * final del título, se corta ahí (slice, sin reescribir); si están en el medio, se marcan con
 * *asteriscos* dentro del titular blanco (el render las pinta con el acento).
 */
export function splitAccent(titulo: string, accent: string[]): { headlineA: string; headlineB: string } {
  const words = titulo.split(/\s+/).filter(Boolean)
  const acc = accent.map(norm).filter(Boolean)
  if (!acc.length) return { headlineA: titulo, headlineB: '' }
  const tail = words.slice(-acc.length).map(norm)
  if (acc.length < words.length && tail.every((w, i) => w === acc[i])) {
    return { headlineA: words.slice(0, -acc.length).join(' '), headlineB: words.slice(-acc.length).join(' ') }
  }
  const set = new Set(acc)
  const marked = words.map((w) => (set.has(norm(w)) ? `*${w}*` : w)).join(' ').replace(/\*\s+\*/g, ' ')
  return { headlineA: marked, headlineB: '' }
}

const LAYOUT_TEMPLATE: Record<SlideLayout, TemplateId | null> = { cover: 'statement', mindset_opus: 'opus', academic: null, cta: 'bookmark' }
const TEXT_TEMPLATES: TemplateId[] = ['statement', 'manifesto', 'repeat']

/** Contrato → propiedades de la placa, campo por campo. `current` es la plantilla que eligió la IA en templateId. */
export function coreToPatch(core: CoreSlide, current: TemplateId | undefined): Partial<CanvasState> {
  const { headlineA, headlineB } = splitAccent(core.titulo_principal, core.accent_words)
  const forced = LAYOUT_TEMPLATE[core.layout]
  // academic respeta la plantilla visual elegida (gráfico, métrica…); cover admite cualquier plantilla de texto.
  const template: TemplateId =
    current === 'athletic' ? 'athletic'
    : core.layout === 'academic' ? (current && current !== 'opus' && current !== 'bookmark' ? current : 'statement')
    : core.layout === 'cover' && current && TEXT_TEMPLATES.includes(current) ? current
    : (forced ?? 'statement')
  const patch: Partial<CanvasState> = { template, headlineA, headlineB }
  if (core.header_tag) patch.tag = core.header_tag.replace(/^\[\s*|\s*\]$/g, '').toUpperCase()
  const blocks: OpusBlock[] = core.bloques.map((b) => ({ num: b.id, text: b.text }))
  if (template === 'opus') patch.opusBlocks = blocks
  if (template === 'athletic') {
    // Bloques «Concepto: explicación» → filas clave → valor (sólo si la IA no mandó athletic.rows).
    if (core.bloques.length) patch.athleticRows = core.bloques.map((b) => {
      const i = b.text.indexOf(':')
      return i > 0 && i < 60 ? { k: b.text.slice(0, i + 1), v: b.text.slice(i + 1).trim() } : { k: '', v: b.text }
    })
    if (core.cta) patch.athleticCta = core.cta
  }
  if (template === 'bookmark') {
    const points = core.bloques.map((b) => b.text).slice(0, 4)
    // Sin 3+ bloques (null), la app extrae las viñetas del resto del carrusel.
    const data: BookmarkData | null = points.length >= 3 ? { points, cta: core.cta.toUpperCase() || BOOKMARK_CTA, accent: 'orange' } : null
    patch.bookmarkData = data
  }
  return patch
}
