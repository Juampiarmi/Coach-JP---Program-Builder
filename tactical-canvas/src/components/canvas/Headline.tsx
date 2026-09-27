import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { BRAND } from '../../lib/brand'

/** Divide un texto en segmentos: lo que va entre *asteriscos* queda resaltado. */
function segments(text: string, highlight: boolean) {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((s) => (s.startsWith('*') && s.endsWith('*') ? { t: s.slice(1, -1), hl: !highlight } : { t: s, hl: highlight }))
}

interface Props {
  partA: string
  partB: string
  fontFamily: string
  fontSize: number
  tracking: string
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
export function Headline({ partA, partB, fontFamily, fontSize, tracking }: Props) {
  const parts = [...segments(partA.trim(), false), { t: ' ', hl: false }, ...segments(partB.trim(), true)]
  const { ref, fit } = useWordFit([partA, partB, fontFamily, fontSize, tracking])
  // Por debajo del piso, último recurso: permitir el corte dentro de la palabra.
  const allowBreak = fit <= MIN_WORD_FIT
  return (
    <h1
      ref={ref}
      style={{
        fontFamily,
        fontSize: Math.round(fontSize * fit * 10) / 10,
        fontWeight: 700,
        lineHeight: 1.04,
        letterSpacing: tracking,
        textTransform: 'uppercase',
        color: BRAND.white,
        margin: 0,
        textWrap: 'balance',
        wordBreak: 'keep-all',
        overflowWrap: allowBreak ? 'anywhere' : 'normal',
        hyphens: 'none',
      }}
    >
      {parts.map((p, i) => (
        <Fragment key={i}>{p.hl ? <span style={{ color: BRAND.orange }}>{p.t}</span> : p.t}</Fragment>
      ))}
    </h1>
  )
}
