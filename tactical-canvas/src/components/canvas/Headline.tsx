import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { BRAND } from '../../lib/brand'

/** Divide un texto en segmentos: lo que va entre *asteriscos* queda resaltado. */
function segments(text: string, highlight: boolean) {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((s) => (s.startsWith('*') && s.endsWith('*') ? { t: s.slice(1, -1), hl: !highlight } : { t: s, hl: highlight }))
}

/** Saltos de línea explícitos (Enter en el titular o el remate) → <br />. Cada renglón se balancea aparte. */
function lines(text: string) {
  if (!text.includes('\n')) return text
  return text.split('\n').map((l, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {l}
    </Fragment>
  ))
}

interface Props {
  partA: string
  partB: string
  fontFamily: string
  fontSize: number
  tracking: string
  /** Tema: por defecto blanco + naranja fuego y peso 700 (Táctico Dark, igual que siempre) */
  ink?: string
  accent?: string
  fontWeight?: number
  /** Interlineado (presets tipográficos); por defecto 1.04 */
  lineHeight?: number
  /** Remate en renglón nuevo: su primera palabra nunca queda colgada al final del renglón blanco */
  newLine?: boolean
}

/** Piso del ajuste por ancho: por debajo de esto se prefiere cortar antes que achicar más. */
const MIN_WORD_FIT = 0.5

/**
 * Ajuste por ancho: las palabras nunca se parten (keep-all). Si la palabra más larga
 * no entra en el renglón, el titular se desborda en horizontal; lo medimos y reducimos
 * el tamaño hasta que entre completa.
 */
function useWordFit(deps: unknown[]) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [fit, setFit] = useState(1)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(deps)

  useLayoutEffect(() => setFit(1), [key])

  // Las fuentes web cambian el ancho real sin re-render: volver a medir cuando cargan.
  useLayoutEffect(() => {
    const onFonts = () => {
      setFit(1)
      setTick((t) => t + 1)
    }
    document.fonts?.addEventListener('loadingdone', onFonts)
    return () => document.fonts?.removeEventListener('loadingdone', onFonts)
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !el.clientWidth) return
    const overflow = el.scrollWidth / el.clientWidth
    if (overflow > 1.001 && fit > MIN_WORD_FIT) {
      // Salto proporcional al desborde (con 2 % de margen) para converger en 1-2 pasadas.
      setFit((f) => Math.max(MIN_WORD_FIT, Math.floor((f / overflow) * 0.98 * 1000) / 1000))
    }
  }, [fit, key, tick])

  return { ref, fit }
}

/** Titular: base en blanco + remate en naranja fuego. `*palabra*` invierte el color. */
export function Headline({ partA, partB, fontFamily, fontSize, tracking, ink = BRAND.white, accent = BRAND.orange, fontWeight = /DM Serif/.test(fontFamily) ? 400 : 700, lineHeight = 1.04, newLine = false }: Props) {
  const a = partA.trim()
  const b = partB.trim()
  // Con remate en renglón nuevo el separador es un salto (si ambas partes tienen texto).
  const parts = [...segments(a, false), { t: newLine && a && b ? '\n' : ' ', hl: false }, ...segments(b, true)]
  const { ref, fit } = useWordFit([partA, partB, fontFamily, fontSize, tracking, lineHeight, newLine])
  // Por debajo del piso, último recurso: permitir el corte dentro de la palabra.
  const allowBreak = fit <= MIN_WORD_FIT
  return (
    <h1
      ref={ref}
      style={{
        fontFamily,
        fontSize: Math.round(fontSize * fit * 10) / 10,
        fontWeight,
        lineHeight,
        letterSpacing: tracking,
        textTransform: 'uppercase',
        color: ink,
        margin: 0,
        textWrap: 'balance',
        wordBreak: 'keep-all',
        overflowWrap: allowBreak ? 'anywhere' : 'normal',
        hyphens: 'none',
      }}
    >
      {parts.map((p, i) => (
        <Fragment key={i}>{p.hl ? <span style={{ color: accent }}>{lines(p.t)}</span> : lines(p.t)}</Fragment>
      ))}
    </h1>
  )
}
