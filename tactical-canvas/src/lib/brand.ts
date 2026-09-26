import type { Accent, AspectId, HeadlineFont } from '../types'

export const BRAND = {
  bg: '#0B0E14',
  surface: '#121721',
  border: '#1E2638',
  cyan: '#00E5FF',
  orange: '#FF6B00',
  gold: '#FFD600',
  gray: '#8A99AD',
  white: '#FFFFFF',
} as const

export const ACCENT_HEX: Record<Accent, string> = {
  orange: BRAND.orange,
  cyan: BRAND.cyan,
  gold: BRAND.gold,
  white: BRAND.white,
  gray: BRAND.gray,
}

export const ACCENT_LABEL: Record<Accent, string> = {
  orange: 'Naranja',
  cyan: 'Cian',
  gold: 'Oro',
  white: 'Blanco',
  gray: 'Gris',
}

export const ASPECTS: Record<AspectId, { w: number; h: number; label: string; ratio: string }> = {
  feed: { w: 1080, h: 1350, label: 'Feed', ratio: '4:5' },
  story: { w: 1080, h: 1920, label: 'Story', ratio: '9:16' },
}

export const HEADLINE_FONTS: Record<HeadlineFont, { label: string; family: string; tracking: string }> = {
  chakra: { label: 'Chakra Petch', family: "'Chakra Petch', sans-serif", tracking: '-0.01em' },
  barlow: { label: 'Barlow Cond.', family: "'Barlow Condensed', sans-serif", tracking: '0' },
  inter: { label: 'Inter', family: "'Inter', sans-serif", tracking: '-0.035em' },
}

export const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace"
export const FONT_BODY = "'Inter', system-ui, sans-serif"

export const TAG_PRESETS = [
  'BIOMECÁNICA APLICADA',
  'BIOENERGÉTICA · GASTO CALÓRICO',
  'FISIOLOGÍA · ELECTROLITOS',
  'REALIDAD DEL DOMS',
  'NOTA TÁCTICA · FATIGA',
  'HIDRATACIÓN REAL',
  'FUERZA · HIPERTROFIA',
  'RESISTENCIA · UMBRAL DE LACTATO',
  'RECUPERACIÓN · SUEÑO',
  'NUTRICIÓN · PROTEÍNA',
]
