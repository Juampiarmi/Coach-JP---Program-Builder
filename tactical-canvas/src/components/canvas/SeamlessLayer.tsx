import { FONT_MONO } from '../../lib/brand'

/**
 * CARRUSEL CONTINUO (Seamless Swipe): el carrusel se diseña como UNA pieza que se recorre deslizando.
 * - Panorámica: una sola foto repartida entre todas las placas (cada una muestra su franja).
 * - Hilo de marca: una línea de acento que sale por el borde derecho de una placa y entra EXACTA por el
 *   borde izquierdo de la siguiente (misma altura en cada costura), con un nodo numerado por placa.
 * Los elementos que cruzan el borde invitan a deslizar: el ojo quiere seguir el recorrido.
 */

/** Altura del hilo en la costura k (0 = borde izquierdo de la placa 1 … n = borde derecho de la última). */
export function seamY(k: number, h: number) {
  // Zigzag táctico entre dos carriles del tercio inferior, por debajo del grueso del texto.
  return h * (k % 2 === 0 ? 0.7 : 0.79)
}

interface PanoramaProps {
  src: string
  w: number
  h: number
  index: number
  count: number
  overlay: number
  overlayRgb: string
  mono: boolean
}

/** Franja de la foto panorámica que le toca a esta placa (la foto ocupa el ancho de TODO el carrusel). */
export function PanoramaLayer({ src, w, h, index, count, overlay, overlayRgb, mono }: PanoramaProps) {
  const n = Math.max(1, count)
  return (
    <div data-part="panorama" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', isolation: 'isolate' }}>
      <img
        src={src}
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: -index * w,
          width: w * n,
          height: h,
          maxWidth: 'none',
          objectFit: 'cover',
          filter: mono ? 'grayscale(1) contrast(1.12)' : undefined,
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: `rgba(${overlayRgb},${overlay})` }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(${overlayRgb},0.55) 0%, rgba(${overlayRgb},0) 30%, rgba(${overlayRgb},0) 60%, rgba(${overlayRgb},0.8) 100%)` }} />
    </div>
  )
}

interface ThreadProps {
  w: number
  h: number
  index: number
  count: number
  accent: string
  /** Margen lateral del contenido: el hilo arranca / termina ahí en la primera / última placa */
  side: number
  scale: number
}

/** Tramo del hilo de marca de esta placa. Con una sola placa no se dibuja (no hay recorrido). */
export function ThreadLayer({ w, h, index, count, accent, side, scale: s }: ThreadProps) {
  if (count < 2) return null
  const y0 = seamY(index, h)
  const y1 = seamY(index + 1, h)
  const first = index === 0
  const last = index === count - 1
  const x0 = first ? side : -4
  const x1 = last ? w - side : w + 4
  // Quiebre a 45° en el centro de la placa (lenguaje brutalista, nada de curvas blandas).
  const kx0 = w * 0.42
  const kx1 = kx0 + Math.abs(y1 - y0)
  const node = { x: kx0, y: y0 }
  const stroke = Math.max(2, 4 * s)
  const label = String(index + 1).padStart(2, '0')
  return (
    <svg data-part="thread" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'visible' }} aria-hidden>
      <path d={`M ${x0} ${y0} H ${kx0} L ${kx1} ${y1} H ${x1}`} fill="none" stroke={accent} strokeWidth={stroke} strokeLinejoin="miter" opacity={0.85} />
      {/* Nodo numerado: marca la placa dentro del recorrido */}
      <circle cx={node.x} cy={node.y} r={11 * s} fill={accent} />
      <circle cx={node.x} cy={node.y} r={20 * s} fill="none" stroke={accent} strokeWidth={Math.max(1, 1.5 * s)} opacity={0.5} />
      <text x={node.x} y={node.y - 30 * s} textAnchor="middle" fill={accent} style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 20 * s, letterSpacing: '0.12em' }}>
        {label}
      </text>
      {first && <circle cx={x0} cy={y0} r={7 * s} fill="none" stroke={accent} strokeWidth={stroke} />}
      {last && (
        // Cierre del recorrido: punta de flecha que «llega»
        <path d={`M ${x1 - 18 * s} ${y1 - 14 * s} L ${x1} ${y1} L ${x1 - 18 * s} ${y1 + 14 * s}`} fill="none" stroke={accent} strokeWidth={stroke} strokeLinejoin="miter" />
      )}
    </svg>
  )
}
