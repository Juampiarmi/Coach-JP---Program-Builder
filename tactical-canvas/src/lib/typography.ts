import type { CanvasState, TypePreset } from '../types'
import { HEADLINE_FONTS } from './brand'

/** Tamaño relativo por familia (mismo cuerpo óptico en todas). */
const SIZE_FACTOR = { chakra: 1, barlow: 1.2, inter: 0.94, serif: 1.12 } as const

export interface HeadlineType {
  family: string
  weight: number
  tracking: string
  lineHeight: number
  sizeFactor: number
  /** Multiplicador del aire titular → bloque */
  gapFactor: number
}

export const TYPE_PRESETS: { id: Exclude<TypePreset, 'none'>; label: string; hint: string }[] = [
  { id: 'brutalist', label: '⚡ BRUTALIST', hint: 'Condensada pesada, interlineado −5 %' },
  { id: 'tactical', label: '🎯 TACTICAL CLEAN', hint: 'Geométrica con tracking abierto +0,05 em' },
  { id: 'editorial', label: '📊 EDITORIAL', hint: 'Proporciones balanceadas y más respiro vertical' },
]

/**
 * Tipografía del titular: con preset 'none' es exactamente la fuente elegida (valores de siempre);
 * los presets fijan familia, tracking, interlineado y aire.
 */
export function headlineType(state: Pick<CanvasState, 'headlineFont' | 'typePreset'>): HeadlineType {
  const preset = state.typePreset ?? 'none'
  if (preset === 'brutalist') return { family: HEADLINE_FONTS.barlow.family, weight: 700, tracking: '-0.005em', lineHeight: 1.04 * 0.95, sizeFactor: 1.26, gapFactor: 0.9 }
  if (preset === 'tactical') return { family: HEADLINE_FONTS.chakra.family, weight: 700, tracking: '0.05em', lineHeight: 1.08, sizeFactor: 0.9, gapFactor: 1 }
  if (preset === 'editorial') return { family: HEADLINE_FONTS.inter.family, weight: 800, tracking: '-0.03em', lineHeight: 1.18, sizeFactor: 0.9, gapFactor: 1.25 }
  const f = HEADLINE_FONTS[state.headlineFont]
  return { family: f.family, weight: f.weight ?? 700, tracking: f.tracking, lineHeight: 1.04, sizeFactor: SIZE_FACTOR[state.headlineFont], gapFactor: 1 }
}
