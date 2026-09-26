import { Fragment } from 'react'
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

/** Titular: base en blanco + remate en naranja fuego. `*palabra*` invierte el color. */
export function Headline({ partA, partB, fontFamily, fontSize, tracking }: Props) {
  const parts = [...segments(partA.trim(), false), { t: ' ', hl: false }, ...segments(partB.trim(), true)]
  return (
    <h1
      style={{
        fontFamily,
        fontSize,
        fontWeight: 700,
        lineHeight: 1.04,
        letterSpacing: tracking,
        textTransform: 'uppercase',
        color: BRAND.white,
        margin: 0,
        textWrap: 'balance',
        overflowWrap: 'break-word',
      }}
    >
      {parts.map((p, i) => (
        <Fragment key={i}>{p.hl ? <span style={{ color: BRAND.orange }}>{p.t}</span> : p.t}</Fragment>
      ))}
    </h1>
  )
}
