import { FONT_BRAND, FONT_MONO } from '../../lib/brand'

interface Props {
  index: number
  count: number
  /** Distancias al borde del lienzo (px del lienzo) */
  top: number
  bottom: number
  side: number
  scale: number
  accent: string
  muted: string
}

/**
 * Contador de carrusel: «01 / 05» arriba a la derecha y «DESLIZÁ →» abajo en todas las placas menos
 * la última. Empuja el swipe (retención) sin tapar contenido: va en los márgenes libres del layout.
 */
export function SlideCounter({ index, count, top, bottom, side, scale: s, accent, muted }: Props) {
  if (count < 2) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <>
      <p data-part="slide-counter" style={{ position: 'absolute', zIndex: 3, top, right: side, margin: 0, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 24 * s, letterSpacing: '0.16em', color: muted, textShadow: 'none' }}>
        <span style={{ color: accent }}>{pad(index + 1)}</span> / {pad(count)}
      </p>
      {index < count - 1 && (
        <p data-part="slide-swipe" style={{ position: 'absolute', zIndex: 3, bottom, right: side, margin: 0, fontFamily: FONT_BRAND, fontWeight: 600, fontSize: 24 * s, letterSpacing: '0.18em', color: accent, textShadow: 'none' }}>
          DESLIZÁ <span style={{ fontWeight: 700 }}>→</span>
        </p>
      )}
    </>
  )
}
