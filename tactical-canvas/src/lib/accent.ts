import { createContext, useContext } from 'react'
import { BRAND } from './brand'

/**
 * [ ⚡ SWAP ACCENT ]: intercambia naranja ⇄ cian en toda la placa. El lienzo publica el estado
 * en un contexto y cada plantilla resuelve sus colores con `useAccent()`, así la vista previa y
 * el PNG salen idénticos.
 */
export const AccentSwapContext = createContext(false)

const PAIRS: [string, string][] = [
  [BRAND.orange, BRAND.cyan],
  ['#0E7490', '#C2410C'], // acentos legibles sobre Minimal Paper
]

/** Color con el intercambio aplicado (los que no son naranja / cian quedan igual). */
export function swapHex(hex: string, swap: boolean): string {
  if (!swap) return hex
  const h = hex.toUpperCase()
  for (const [a, b] of PAIRS) {
    if (h === a.toUpperCase()) return b
    if (h === b.toUpperCase()) return a
  }
  return hex
}

/** rgb "r,g,b" del naranja / cian con el intercambio aplicado (para rgba con alfa). */
export const ORANGE_RGB = '234,88,12'
export const CYAN_RGB = '56,189,248'

export function useAccent() {
  const swap = useContext(AccentSwapContext)
  return {
    swap,
    orange: swap ? BRAND.cyan : BRAND.orange,
    cyan: swap ? BRAND.orange : BRAND.cyan,
    orangeRgb: swap ? CYAN_RGB : ORANGE_RGB,
    cyanRgb: swap ? ORANGE_RGB : CYAN_RGB,
    hex: (c: string) => swapHex(c, swap),
  }
}
