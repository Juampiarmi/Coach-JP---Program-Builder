import { Fragment, type ReactNode } from 'react'

/** Rango numérico («2-4», «1,8-2,2», «80–90 %», «3 × 5»): nunca se corta entre sus partes. */
const RANGE = /(\d+(?:[.,]\d+)?\s?[-–×x]\s?\d+(?:[.,]\d+)?(?:\s?%)?)/g

/**
 * Envuelve los rangos numéricos en un span sin corte: en placas angostas (9:16) el navegador partía
 * «2-4 semanas» después del guion y la dosis quedaba ilegible («2- / 4 semanas»).
 */
export function keepRanges(text: string): ReactNode {
  if (!/\d\s?[-–×x]\s?\d/.test(text)) return text
  return text.split(RANGE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ whiteSpace: 'nowrap' }}>
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}
