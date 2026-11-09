/**
 * Isotipo GEA trazado sobre el logo oficial (231×157 px) con bordes medidos a nivel subpíxel
 * (cruce del 50 % entre el carbón #212121 y el blanco, fila por fila y columna por columna).
 * Coordenadas en el espacio del archivo original: viewBox = "10 46 212 70".
 *
 * Todo son rellenos (sin trazos), así la silueta es idéntica en SVG, Canvas, neón e íconos:
 *  - G: anillo levemente ovalado (Rx 34.1 / Ry 33.3, grosor ~10) cuyo remate superior izquierdo
 *    termina en un corte horizontal a y≈68: al cortar en plano un trazo que va en diagonal, la punta
 *    queda afilada en bisel. Barra horizontal que entra desde el borde exterior hasta el centro.
 *  - Ξ: barras superior e inferior en trapecio con biseles a ~45°; barra media con remate acampanado
 *    (flared tip) que se abre hacia la derecha, más hacia arriba (~3 px) que hacia abajo (~2 px).
 *  - A: arco apuntado (ojival) por fuera y por dentro; patas en herradura que se abren hasta y≈89
 *    y se cierran hacia la base (silueta tipo omega); pies horizontales hacia adentro unidos a la pata
 *    con un empalme cóncavo; travesaño desde la izquierda con el mismo remate acampanado que la Ξ.
 */
export const LOGO_VIEWBOX = { x: 10, y: 46, w: 212, h: 70 } as const;

export interface LogoPath {
  d: string;
  /** evenodd para las formas con contra-forma (anillo de la G, arco de la A). */
  rule: CanvasFillRule;
}

export const LOGO_PATHS: LogoPath[] = [
  // G · anillo con remate cortado en horizontal (afilado diagonal)
  {
    d: 'M 15.07 68.07 A 34.1 33.3 0 1 1 12.55 76.69 L 22.66 76.69 A 24.15 23.3 0 1 0 26.53 68.07 Z',
    rule: 'nonzero',
  },
  // G · barra horizontal
  { d: 'M 11.97 76.69 H 48.1 V 86.18 H 11.97 Z', rule: 'nonzero' },
  // Ξ · barra superior (trapecio que se angosta hacia abajo)
  { d: 'M 81.56 47.92 H 145.6 L 137.43 56.89 H 89.3 Z', rule: 'nonzero' },
  // Ξ · barra media con remate acampanado hacia la derecha
  {
    d: 'M 97.93 72.15 H 121 C 123.5 72.15 125.5 70.6 129.38 69.1 V 85.85 C 125.5 85.1 123.5 83.7 121 83.7 H 97.93 Z',
    rule: 'nonzero',
  },
  // Ξ · barra inferior (trapecio que se ensancha hacia abajo)
  { d: 'M 89.4 104.78 H 138.1 L 145.6 113.73 H 81.4 Z', rule: 'nonzero' },
  // A · arco ojival + patas en herradura + pies con empalme cóncavo
  {
    d: 'M 158.10 113.73 C 158.12 113.36 158.40 112.54 158.19 111.50 C 157.98 110.46 157.37 108.83 156.85 107.50 C 156.33 106.17 155.57 104.83 155.10 103.50 C 154.62 102.17 154.35 100.83 154.00 99.50 C 153.65 98.17 153.21 96.83 152.99 95.50 C 152.77 94.17 152.74 92.83 152.68 91.50 C 152.62 90.17 152.63 88.83 152.64 87.50 C 152.65 86.17 152.66 84.83 152.75 83.50 C 152.84 82.17 152.91 80.83 153.20 79.50 C 153.48 78.17 153.97 76.83 154.46 75.50 C 154.95 74.17 155.47 72.83 156.16 71.50 C 156.85 70.17 157.64 68.83 158.58 67.50 C 159.52 66.17 160.60 64.83 161.78 63.50 C 162.96 62.17 164.12 60.83 165.64 59.50 C 167.16 58.17 168.83 56.83 170.89 55.50 C 172.95 54.17 175.48 52.80 178.00 51.50 C 180.52 50.20 184.67 48.33 186.00 47.70 C 187.34 48.33 191.50 50.20 194.01 51.50 C 196.52 52.80 199.00 54.17 201.04 55.50 C 203.08 56.83 204.71 58.17 206.23 59.50 C 207.75 60.83 208.97 62.17 210.15 63.50 C 211.33 64.83 212.38 66.17 213.32 67.50 C 214.25 68.83 215.10 70.17 215.76 71.50 C 216.42 72.83 216.81 74.17 217.26 75.50 C 217.71 76.83 218.16 78.17 218.45 79.50 C 218.74 80.83 218.84 82.17 218.99 83.50 C 219.14 84.83 219.31 86.17 219.36 87.50 C 219.41 88.83 219.38 90.17 219.31 91.50 C 219.24 92.83 219.12 94.17 218.91 95.50 C 218.70 96.83 218.37 98.17 218.03 99.50 C 217.69 100.83 217.37 102.17 216.89 103.50 C 216.41 104.83 215.67 106.17 215.14 107.50 C 214.61 108.83 213.93 110.46 213.72 111.50 C 213.51 112.54 213.87 113.36 213.90 113.73 L 194.02 113.73 L 194.02 107.0 C 198.5 106.2 203.2 105.5 205.0 104.9 Q 206.1 104.5 206.48 103.50 C 206.59 103.17 206.79 102.50 207.15 101.50 C 207.51 100.50 208.25 98.83 208.63 97.50 C 209.01 96.17 209.25 94.83 209.45 93.50 C 209.64 92.17 209.77 90.83 209.80 89.50 C 209.83 88.17 209.75 86.83 209.61 85.50 C 209.48 84.17 209.27 82.83 208.99 81.50 C 208.71 80.17 208.43 78.83 207.91 77.50 C 207.39 76.17 206.72 74.83 205.88 73.50 C 205.04 72.17 204.03 70.83 202.85 69.50 C 201.66 68.17 200.43 66.83 198.77 65.50 C 197.12 64.17 195.05 62.75 192.92 61.50 C 190.79 60.25 187.15 58.58 186.00 58.00 C 184.84 58.58 181.16 60.25 179.03 61.50 C 176.90 62.75 174.84 64.17 173.19 65.50 C 171.54 66.83 170.31 68.17 169.12 69.50 C 167.94 70.83 166.90 72.17 166.08 73.50 C 165.26 74.83 164.70 76.17 164.20 77.50 C 163.70 78.83 163.42 80.17 163.10 81.50 C 162.78 82.83 162.48 84.17 162.30 85.50 C 162.12 86.83 162.00 88.17 162.04 89.50 C 162.07 90.83 162.30 92.17 162.51 93.50 C 162.72 94.83 162.92 96.17 163.29 97.50 C 163.66 98.83 164.37 100.50 164.74 101.50 C 165.11 102.50 165.38 103.17 165.51 103.50 Q 166.2 104.85 167.6 105.05 C 171.5 105.6 175.0 106.4 177.92 107.1 L 177.92 113.73 Z',
    rule: 'nonzero',
  },
  // A · travesaño desde la pata izquierda con remate acampanado
  {
    d: 'M 158 76.54 H 181.8 C 183.2 76.54 184.2 74.8 189.34 74.45 V 88.4 C 184.2 88 182.8 86.2 181.5 86.2 H 158 Z',
    rule: 'nonzero',
  },
];

const compiled = new Map<string, Path2D>();
const path2d = (d: string) => {
  let p = compiled.get(d);
  if (!p) compiled.set(d, (p = new Path2D(d)));
  return p;
};

/** Dibuja el isotipo centrado en (cx, cy) con un ancho dado. */
export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, color = '#FFFFFF') {
  const s = width / LOGO_VIEWBOX.w;
  ctx.save();
  ctx.translate(cx - (LOGO_VIEWBOX.w / 2) * s, cy - (LOGO_VIEWBOX.h / 2) * s);
  ctx.scale(s, s);
  ctx.translate(-LOGO_VIEWBOX.x, -LOGO_VIEWBOX.y);
  ctx.fillStyle = color;
  for (const p of LOGO_PATHS) ctx.fill(path2d(p.d), p.rule);
  ctx.restore();
}

/** Alto resultante del isotipo para un ancho dado. */
export const logoHeight = (width: number) => (width * LOGO_VIEWBOX.h) / LOGO_VIEWBOX.w;
