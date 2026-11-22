import type { TemplateId } from '../types'

/** Pestaña del panel (ver PanelTabs): contenido · diseño & foto · carrusel & caption. */
export type FocusTab = 'text' | 'style' | 'export'

/** Parte del lienzo (data-part) → campo del panel (data-field). */
const PART_FIELD: Record<string, string> = {
  titular: 'headlineA',
  remate: 'headlineB',
  body: 'body',
  kicker: 'kicker',
  metric: 'metric',
  'data-chips': 'chips',
  'data-chip': 'chips',
  'myth-myth': 'mythText',
  'myth-truth': 'truthText',
  myth: 'mythText',
  cite: 'cite',
}

/** Si el clic cayó en el bloque de la plantilla sin una parte marcada: el editor de esa plantilla. */
const BLOCK_FIELD: Partial<Record<TemplateId, string>> = {
  statement: 'body',
  metric: 'metric',
  bookmark: 'bookmark',
  checklist: 'checklist',
  myth: 'mythText',
  quote: 'quoteText',
}

/**
 * CLICK-TO-FOCUS: qué campo abrir según lo que se tocó en el lienzo. Titular, cita, cajas de datos,
 * bajada o fuente → Contenido; el fondo (nada debajo) → Diseño & Foto, en la sección Fondo.
 */
export function pickTarget(part: string | null, block: 'headline' | 'block' | null, template: TemplateId): [FocusTab, string] {
  if (part?.startsWith('quote')) return ['text', 'quoteText']
  if (part && PART_FIELD[part]) return ['text', PART_FIELD[part]]
  if (block === 'headline') return ['text', 'headlineA']
  if (block === 'block' && BLOCK_FIELD[template]) return ['text', BLOCK_FIELD[template]!]
  if (part || block) return ['text', 'headlineA']
  return ['style', 'bg']
}
