import type { EditorialGoal, EditorialTone, GenMode } from './ai'

/** Pilares del calendario de contenido: cada día de publicación tiene su enfoque, tono, formato y plantilla. */
export type PillarId = 'science' | 'workout' | 'mindset'

export interface Pillar {
  id: PillarId
  /** Día de publicación (0 = domingo … 6 = sábado) */
  weekday: number
  day: string
  label: string
  short: string
  tone: EditorialTone
  goal: EditorialGoal
  mode: GenMode
  /** Plantilla de destino (para la etiqueta del panel) */
  template: string
}

export const PILLARS: Pillar[] = [
  { id: 'science', weekday: 1, day: 'LUN', label: 'Ciencia / Fisiología', short: 'CIENCIA', tone: 'academic', goal: 'science', mode: 'carousel', template: 'Opus Athletic (5 placas)' },
  { id: 'workout', weekday: 3, day: 'MIÉ', label: 'Rutina / Sesión', short: 'RUTINA', tone: 'viral', goal: 'science', mode: 'single', template: 'Sesión / Rutina' },
  { id: 'mindset', weekday: 5, day: 'VIE', label: 'Mindset / Manifiesto', short: 'MINDSET', tone: 'viral', goal: 'mindset', mode: 'single', template: 'Manifiesto texto' },
]

/** El pilar de hoy (o el próximo día de publicación de la semana). */
export function pillarForToday(date = new Date()): Pillar {
  const d = date.getDay()
  return PILLARS.find((p) => p.weekday >= d) ?? PILLARS[0]
}
