import type { CanvasState, TemplateId } from '../types'

/**
 * FORMULARIO CONTEXTUAL: qué campos genéricos (bajada, cajas de datos, remate de barra) muestra la
 * pestaña Contenido para la plantilla activa. Regla: se ve un campo si la plantilla lo pide, o si la
 * plantilla lo DIBUJA y tiene texto (texto heredado de otra plantilla: se avisa y se puede quitar).
 * Nunca queda texto que se ve en la placa sin un campo para editarlo.
 */

/** Plantillas que dibujan la bajada genérica (`body`). */
export const RENDERS_BODY: TemplateId[] = ['statement', 'metric', 'chart', 'compare', 'diagram', 'matrix', 'pipeline', 'pyramid', 'checklist', 'athletic', 'quote']
/** Plantillas que NO dibujan las cajas de datos (tienen su propio layout). */
const NO_CHIPS: TemplateId[] = ['athletic', 'quote', 'manifesto', 'repeat']
export const rendersChips = (t: TemplateId) => !NO_CHIPS.includes(t)

/** Bajada que el formulario ofrece siempre (quote y athletic la editan en su propio editor). */
const BODY_FIELD: TemplateId[] = ['statement', 'metric', 'chart', 'compare', 'diagram', 'matrix', 'pipeline', 'pyramid', 'athletic']
/** Cajas de datos que el formulario ofrece siempre: placas de dato. */
const CHIPS_FIELD: TemplateId[] = ['metric', 'chart', 'compare', 'diagram']

export interface ContentFields {
  /** Mostrar «Bajada» */
  body: boolean
  /** La bajada se muestra sólo porque trae texto heredado que igual se ve en la placa */
  bodyInherited: boolean
  chips: boolean
  chipsInherited: boolean
  /** Remate de la barra naranja (sólo Sentencia) */
  kicker: boolean
  /** El remate de barra tiene texto: se ve en la placa y suma palabras al Doctor */
  kickerActive: boolean
}

export function contentFields(s: Pick<CanvasState, 'template' | 'body' | 'dataChips' | 'kicker'>): ContentFields {
  const t = s.template
  const hasBody = Boolean(s.body?.trim())
  const hasChips = (s.dataChips ?? []).some((c) => c.trim())
  const bodyAsked = BODY_FIELD.includes(t)
  const chipsAsked = CHIPS_FIELD.includes(t)
  const bodyInherited = !bodyAsked && t !== 'quote' && RENDERS_BODY.includes(t) && hasBody
  const chipsInherited = !chipsAsked && rendersChips(t) && hasChips
  return {
    body: bodyAsked || bodyInherited,
    bodyInherited,
    chips: chipsAsked || chipsInherited,
    chipsInherited,
    kicker: t === 'statement',
    kickerActive: t === 'statement' && Boolean(s.kicker?.trim()),
  }
}

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
export const countWords = (t: string | undefined) => (t ? words(t) : 0)
