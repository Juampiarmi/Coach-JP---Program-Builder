import type { CanvasState, DiagramAccent, RepeatAccent, TemplateId, ThemeId } from '../types'
import { BRAND } from './brand'

/** Colores del lienzo que dependen del tema. */
export interface CanvasPalette {
  bg: string
  ink: string
  muted: string
  tag: string
  accent: string
  line: string
  overlayRgb: string
  textShadow: string
}

export const PALETTES: Record<ThemeId, CanvasPalette> = {
  // Táctico Dark: exactamente los valores de siempre.
  dark: {
    bg: BRAND.bg,
    ink: BRAND.white,
    muted: BRAND.gray,
    tag: BRAND.cyan,
    accent: BRAND.orange,
    line: BRAND.border,
    overlayRgb: '11,14,20',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.8)',
  },
  // Minimal Paper: marfil cálido, tinta negra y un único acento.
  paper: {
    bg: '#FAF8F5',
    ink: '#141414',
    muted: '#5F5A52',
    tag: '#8A847A',
    accent: '#EA580C',
    line: '#DDD7CD',
    overlayRgb: '250,248,245',
    textShadow: 'none',
  },
}

export const THEME_LABEL: Record<ThemeId, string> = { dark: 'TÁCTICO DARK', paper: 'MINIMAL PAPER' }

/** Plantillas que admiten Minimal Paper; las 01–05 siguen siempre en Táctico Dark. */
export const PAPER_TEMPLATES: TemplateId[] = ['diagram', 'repeat', 'matrix', 'pipeline', 'pyramid', 'checklist', 'bookmark']

export function effectiveTheme(state: Pick<CanvasState, 'theme' | 'template'>): ThemeId {
  return state.theme === 'paper' && PAPER_TEMPLATES.includes(state.template) ? 'paper' : 'dark'
}

export const DIAGRAM_ACCENT_HEX: Record<DiagramAccent, string> = {
  blue: '#2563EB',
  orange: BRAND.orange,
  cyan: BRAND.cyan,
}

export const DIAGRAM_ACCENT_LABEL: Record<DiagramAccent, string> = { blue: 'Azul', orange: 'Naranja', cyan: 'Cian' }

export const REPEAT_ACCENT_LABEL: Record<RepeatAccent, string> = { white: 'Blanco / tinta', orange: 'Naranja', cyan: 'Cian' }
