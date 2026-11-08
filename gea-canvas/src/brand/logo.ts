/**
 * Isotipo GEA vectorizado a partir del logo oficial (231×157 px, glifos en x 12–218, y 48–113).
 * Coordenadas en el espacio original: viewBox = "10 46 212 70".
 * Se usa igual en React (SVG) y en el canvas (Path2D), así el sticker exportado es idéntico al logo.
 */
export const LOGO_VIEWBOX = { x: 10, y: 46, w: 212, h: 70 } as const;
export const LOGO_STROKE = 10.5;

/** Trazos (stroke, butt caps). */
export const LOGO_STROKES = [
  // G · anillo abierto arriba-izquierda
  'M 21.34 66.62 A 28.5 28.5 0 1 1 18 80',
  // A · arco de medio punto con patas
  'M 159 108 L 159 80 A 27 27 0 0 1 213 80 L 213 108',
];

/** Rellenos. */
export const LOGO_FILLS = [
  // G · barra
  'M 12 77 H 47 V 86 H 12 Z',
  // Ξ · barra superior (trapecio que se angosta hacia abajo)
  'M 82 48 H 146 L 140 57 H 88 Z',
  // Ξ · barra media + gota
  'M 98 74 H 128 V 88 H 123 V 83 H 98 Z',
  // Ξ · barra inferior (trapecio que se ensancha hacia abajo)
  'M 88 104 H 140 L 146 113 H 82 Z',
  // A · pies hacia adentro
  'M 154 104 H 175 V 113 H 154 Z',
  'M 193 104 H 218 V 113 H 193 Z',
  // A · travesaño desde la izquierda + gota
  'M 154 76 H 190 V 89 H 185 V 85 H 154 Z',
];

/** Dibuja el isotipo centrado en (cx, cy) con un ancho dado. */
export function drawLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  color = '#FFFFFF',
) {
  const s = width / LOGO_VIEWBOX.w;
  ctx.save();
  ctx.translate(cx - (LOGO_VIEWBOX.w / 2) * s, cy - (LOGO_VIEWBOX.h / 2) * s);
  ctx.scale(s, s);
  ctx.translate(-LOGO_VIEWBOX.x, -LOGO_VIEWBOX.y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = LOGO_STROKE;
  ctx.lineCap = 'butt';
  for (const d of LOGO_STROKES) ctx.stroke(new Path2D(d));
  for (const d of LOGO_FILLS) ctx.fill(new Path2D(d));
  ctx.restore();
}

/** Alto resultante del isotipo para un ancho dado. */
export const logoHeight = (width: number) => (width * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w;
