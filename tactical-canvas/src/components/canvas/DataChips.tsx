import { BRAND, FONT_MONO } from '../../lib/brand'
import { useAccent } from '../../lib/accent'

interface Props {
  chips: string[]
  scale: number
  width: number
}

const CHIP_ORANGE = '#F97316'

/**
 * Datos clave en cajas tácticas de alto contraste (RIR, pausa, % 1RM, series efectivas): la parte de
 * la placa que el alumno se lleva a la barra. El primer número, en naranja; el resto, en blanco.
 */
export function DataChips({ chips, scale: s, width }: Props) {
  const A = useAccent()
  const orange = A.swap ? BRAND.cyan : CHIP_ORANGE
  const list = chips.map((c) => c.trim()).filter(Boolean).slice(0, 4)
  if (!list.length) return null
  return (
    <div data-part="data-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 * s, width, marginTop: 34 * s, textShadow: 'none' }}>
      {list.map((c, i) => {
        // «RIR 1-2» → rótulo «RIR» en tenue + valor «1-2» en grande; sin rótulo, todo como valor.
        const m = c.match(/^([^\d]*?)\s*(\d.*)$/)
        const label = m && m[1].trim() ? m[1].trim() : ''
        const value = m ? m[2] : c
        return (
          <div
            key={i}
            data-part="data-chip"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10 * s,
              padding: `${12 * s}px ${18 * s}px`,
              background: '#0D1117',
              border: `${Math.max(2, 3 * s)}px solid ${i === 0 ? orange : 'rgba(249,115,22,0.45)'}`,
              borderRadius: 8 * s,
              fontFamily: FONT_MONO,
              textTransform: 'uppercase',
            }}
          >
            {label && <span style={{ fontWeight: 600, fontSize: 19 * s, letterSpacing: '0.14em', color: '#94A3B8' }}>{label}</span>}
            <span style={{ fontWeight: 700, fontSize: 29 * s, letterSpacing: '0.04em', color: i === 0 ? orange : '#FFFFFF' }}>{label ? value : c}</span>
          </div>
        )
      })}
    </div>
  )
}
