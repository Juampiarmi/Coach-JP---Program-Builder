import type { CanvasState } from '../types'

/**
 * Kit de marca: la parte VISUAL de una placa (tipografía, acento, fondo, estética Opus, contador y tag
 * de marca) guardada con nombre para aplicarla con un clic a todo el carrusel. Nunca toca el contenido
 * (titulares, datos, imágenes).
 */
export const KIT_KEYS = [
  'headlineFont',
  'typePreset',
  'accentSwap',
  'remateNewLine',
  'bgStyle',
  'bgMono',
  'bgOverlay',
  'bgGradient',
  'bgVignette',
  'athleticTheme',
  'athleticBg',
  'slideCounter',
] as const

export type KitKey = (typeof KIT_KEYS)[number]

export interface BrandKit {
  id: string
  name: string
  /** Kits de fábrica: no se borran ni se sobrescriben */
  builtIn?: boolean
  style: Partial<Pick<CanvasState, KitKey>>
  /** Tag de marca que se aplica a todas las placas (opcional) */
  tag?: string
  /** Muestra de color para el chip del panel */
  swatch: { bg: string; fg: string; accent: string }
}

export const BUILT_IN_KITS: BrandKit[] = [
  {
    id: 'jp-dark',
    name: 'Coach JP Dark',
    builtIn: true,
    style: { headlineFont: 'chakra', typePreset: 'none', accentSwap: false, remateNewLine: true, bgStyle: 'photo', bgMono: true, bgOverlay: 75, bgGradient: true, bgVignette: 20, athleticTheme: 'dark', athleticBg: 'auto' },
    tag: 'GUÍA DE RENDIMIENTO // COACH JP',
    swatch: { bg: '#0B0E14', fg: '#FFFFFF', accent: '#F97316' },
  },
  {
    id: 'opus-paper',
    name: 'Opus Paper',
    builtIn: true,
    style: { headlineFont: 'chakra', typePreset: 'none', accentSwap: false, remateNewLine: true, bgStyle: 'radial', athleticTheme: 'light', athleticBg: 'rings' },
    tag: 'GUÍA DE RENDIMIENTO // COACH JP',
    swatch: { bg: '#EFEFEF', fg: '#0F0F0F', accent: '#F97316' },
  },
  {
    id: 'tactical-concrete',
    name: 'Tactical Concrete',
    builtIn: true,
    style: { headlineFont: 'chakra', typePreset: 'none', accentSwap: false, remateNewLine: true, bgStyle: 'concrete', athleticTheme: 'dark', athleticBg: 'concrete' },
    tag: 'ESTÁNDAR OPERATIVO // COACH JP',
    swatch: { bg: '#121212', fg: '#E5E5E5', accent: '#F97316' },
  },
  {
    id: 'blueprint-cyan',
    name: 'Blueprint Cian',
    builtIn: true,
    style: { headlineFont: 'chakra', typePreset: 'none', accentSwap: true, remateNewLine: true, bgStyle: 'blueprint', athleticTheme: 'dark', athleticBg: 'grid' },
    tag: 'PROTOCOLO // COACH JP',
    swatch: { bg: '#0B0E14', fg: '#FFFFFF', accent: '#38BDF8' },
  },
]

/** Captura la parte visual de una placa como kit nuevo. */
export function kitFromSlide(state: CanvasState, name: string, withTag: boolean): BrandKit {
  const style: BrandKit['style'] = {}
  for (const k of KIT_KEYS) Object.assign(style, { [k]: state[k] })
  const dark = state.athleticTheme !== 'light' && state.bgStyle !== 'radial'
  return {
    id: `kit-${Date.now().toString(36)}`,
    name: name.trim() || 'Mi kit',
    style,
    tag: withTag && state.tag.trim() ? state.tag.trim() : undefined,
    swatch: { bg: dark ? '#0B0E14' : '#EFEFEF', fg: dark ? '#FFFFFF' : '#0F0F0F', accent: state.accentSwap ? '#38BDF8' : '#F97316' },
  }
}

/** Patch a aplicar en cada placa (el tag sólo si el kit trae uno y el usuario lo pidió). */
export function kitPatch(kit: BrandKit, withTag: boolean): Partial<CanvasState> {
  return { ...kit.style, ...(withTag && kit.tag ? { tag: kit.tag } : {}) }
}
