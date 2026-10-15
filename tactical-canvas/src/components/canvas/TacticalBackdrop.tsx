import type { BgStyle } from '../../types'

interface Props {
  style: Exclude<BgStyle, 'photo'>
  w: number
  h: number
  /** Acento de marca para la cruz de la grilla (naranja, o cian con SWAP ACCENT) */
  accent: string
  /** Variante clara (Light Editorial) o la oscura nativa de Coach JP */
  tone?: 'dark' | 'light'
}

const BASE = { dark: '#0B0E14', light: '#EFEFEF' } as const

/** Ruido fractal SVG (grano o manchas de cemento) en escala de grises. */
function Noise({ id, w, h, freq, octaves, opacity, contrast = 1 }: { id: string; w: number; h: number; freq: number; octaves: number; opacity: number; contrast?: number }) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }} aria-hidden>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={octaves} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope={contrast} intercept={(1 - contrast) / 2} />
          <feFuncG type="linear" slope={contrast} intercept={(1 - contrast) / 2} />
          <feFuncB type="linear" slope={contrast} intercept={(1 - contrast) / 2} />
        </feComponentTransfer>
      </filter>
      <rect width={w} height={h} filter={`url(#${id})`} />
    </svg>
  )
}

/**
 * Fondos tácticos sin foto (misma identidad Coach JP, para intercalar en el carrusel):
 * - concrete: cemento brutalista #121212 con manchas suaves y grano de alta densidad.
 * - blueprint: grilla ortogonal de líneas ultrafinas (rgba(255,255,255,0.05)) sobre carbón.
 * - radial: carbón con un punto de luz sutil detrás del texto principal.
 */
export function TacticalBackdrop({ style, w, h, accent, tone = 'dark' }: Props) {
  const s = w / 1080
  const light = tone === 'light'
  const line = light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'
  const major = light ? 'rgba(0,0,0,0.11)' : 'rgba(255,255,255,0.085)'
  if (style === 'concrete') {
    return (
      <div data-backdrop="concrete" aria-hidden style={{ position: 'absolute', inset: 0, background: light ? '#E2E2E0' : '#121212', overflow: 'hidden' }}>
        {/* Manchas del hormigón (baja frecuencia) + grano táctico denso (alta frecuencia) */}
        <Noise id="bd-concrete-mottle" w={w} h={h} freq={0.006} octaves={4} opacity={light ? 0.22 : 0.2} contrast={1.6} />
        <Noise id="bd-concrete-grain" w={w} h={h} freq={1.15} octaves={2} opacity={light ? 0.18 : 0.2} />
        <div style={{ position: 'absolute', inset: 0, background: light ? 'radial-gradient(ellipse 90% 80% at 50% 45%, rgba(255,255,255,0.25), rgba(0,0,0,0.12) 100%)' : 'radial-gradient(ellipse 90% 80% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)' }} />
      </div>
    )
  }
  if (style === 'blueprint') {
    const step = 54 * s
    const xs = Array.from({ length: Math.ceil(w / step) + 1 }, (_, i) => i)
    const ys = Array.from({ length: Math.ceil(h / step) + 1 }, (_, i) => i)
    const cx = (xs.length - 4) * step
    const cy = (ys.length - 6) * step
    return (
      <div data-backdrop="blueprint" aria-hidden style={{ position: 'absolute', inset: 0, background: BASE[tone], overflow: 'hidden' }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
          {xs.map((i) => (
            <line key={`x${i}`} x1={i * step} y1={0} x2={i * step} y2={h} stroke={i % 5 === 0 ? major : line} strokeWidth={Math.max(1, 1.1 * s)} />
          ))}
          {ys.map((i) => (
            <line key={`y${i}`} x1={0} y1={i * step} x2={w} y2={i * step} stroke={i % 5 === 0 ? major : line} strokeWidth={Math.max(1, 1.1 * s)} />
          ))}
          <line x1={cx - 20 * s} y1={cy} x2={cx + 20 * s} y2={cy} stroke={accent} strokeWidth={2 * s} />
          <line x1={cx} y1={cy - 20 * s} x2={cx} y2={cy + 20 * s} stroke={accent} strokeWidth={2 * s} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, background: light ? 'none' : 'radial-gradient(ellipse 95% 85% at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 100%)' }} />
      </div>
    )
  }
  // radial
  return (
    <div
      data-backdrop="radial"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: light
          ? 'radial-gradient(ellipse 60% 45% at 46% 40%, #FFFFFF 0%, #EFEFEF 55%, #DADADA 100%)'
          : 'radial-gradient(ellipse 62% 46% at 46% 40%, rgba(148,163,184,0.16) 0%, rgba(30,38,50,0.55) 38%, #0B0E14 72%, #06080C 100%)',
      }}
    >
      <Noise id="bd-radial-grain" w={w} h={h} freq={0.9} octaves={2} opacity={light ? 0.06 : 0.06} />
    </div>
  )
}
