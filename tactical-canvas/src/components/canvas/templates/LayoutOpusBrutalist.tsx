import { BRAND } from '../../../lib/brand'
import type { CanvasState } from '../../../types'
import { AthleticLayout, ATHLETIC, type AthleticPalette } from './AthleticLayout'

/**
 * Dark Brutalist (identidad nativa Coach JP) para la arquitectura Opus Athletic: charcoal táctico con
 * grano, titulares blancos, acento naranja en «[Nr. X]» y líneas guía, cuerpo en gris táctico y
 * anillos concéntricos blancos casi invisibles detrás del recorte del atleta.
 */
export const BRUTALIST: AthleticPalette = {
  background: `radial-gradient(ellipse 90% 75% at 62% 55%, #161B24 0%, ${BRAND.bg} 58%, #06080C 100%)`,
  base: BRAND.bg,
  ink: '#FFFFFF',
  gray: '#94A3B8',
  hair: 'rgba(255,255,255,0.12)',
  ring: 'rgba(255,255,255,0.05)',
  orange: '#F97316',
  cyan: '#38BDF8',
  tag: '#38BDF8',
  grain: 0.07,
  shadow: 'rgba(0,0,0,0.65)',
}

interface Props {
  state: CanvasState
  w: number
  h: number
  cutout?: string | null
  slideIndex: number
}

export function LayoutOpusBrutalist(props: Props) {
  return <AthleticLayout {...props} palette={BRUTALIST} />
}

/** Paleta de la plantilla 15 según la variante elegida en la placa. */
export const athleticPalette = (state: CanvasState) => (state.athleticTheme === 'dark' ? BRUTALIST : ATHLETIC)
