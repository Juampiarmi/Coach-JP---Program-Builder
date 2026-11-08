import { FONTS } from '@/brand/tokens';
import type { TextFont } from '@/lib/types';

export const fontFamily = (f: TextFont) =>
  f === 'display'
    ? `${FONTS.display}, "Arial Black", sans-serif`
    : f === 'tech'
      ? `${FONTS.tech}, "Arial", sans-serif`
      : `${FONTS.body}, system-ui, sans-serif`;

export const font = (f: TextFont, size: number, weight = 400) => `${weight} ${size}px ${fontFamily(f)}`;

/** Ancho de un texto con espaciado entre letras (en px). */
export function measureSpaced(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  if (!spacing) return ctx.measureText(text).width;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

/** Dibuja texto con tracking manual (funciona en todos los navegadores, a diferencia de ctx.letterSpacing). */
export function fillSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: 'left' | 'center' | 'right' = 'left',
  mode: 'fill' | 'stroke' = 'fill',
) {
  const prev = ctx.textAlign;
  if (!spacing) {
    ctx.textAlign = align;
    mode === 'fill' ? ctx.fillText(text, x, y) : ctx.strokeText(text, x, y);
    ctx.textAlign = prev;
    return;
  }
  const total = measureSpaced(ctx, text, spacing);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  for (const ch of text) {
    mode === 'fill' ? ctx.fillText(ch, cx, y) : ctx.strokeText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
}

/** Corta un texto en líneas que entren en maxW. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, spacing = 0): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (measureSpaced(ctx, test, spacing) <= maxW || !line) line = test;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

export interface Fitted {
  size: number;
  lines: string[];
  lineH: number;
  spacing: number;
}

/**
 * Busca el tamaño de fuente más grande que entra en la caja (maxW × maxH), en hasta maxLines líneas.
 * spacingEm: tracking proporcional al tamaño.
 */
export function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: {
    family: TextFont;
    weight?: number;
    maxW: number;
    maxH: number;
    maxLines?: number;
    min?: number;
    max: number;
    lineHeight?: number;
    spacingEm?: number;
    upper?: boolean;
  },
): Fitted {
  const { family, weight = 400, maxW, maxH, maxLines = 6, min = 14, max, lineHeight = 1.12, spacingEm = 0 } = opts;
  const t = opts.upper ? text.toUpperCase() : text;
  for (let size = max; size >= min; size -= size > 60 ? 4 : 2) {
    ctx.font = font(family, size, weight);
    const spacing = size * spacingEm;
    const lines = wrap(ctx, t, maxW, spacing);
    const lineH = size * lineHeight;
    const tooWide = lines.some((l) => measureSpaced(ctx, l, spacing) > maxW);
    if (lines.length <= maxLines && lines.length * lineH <= maxH && !tooWide) return { size, lines, lineH, spacing };
  }
  ctx.font = font(family, min, weight);
  const spacing = min * spacingEm;
  return { size: min, lines: wrap(ctx, t, maxW, spacing), lineH: min * lineHeight, spacing };
}

/** Dibuja un bloque ajustado, centrado verticalmente en cy. */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  f: Fitted,
  family: TextFont,
  weight: number,
  x: number,
  cy: number,
  align: 'left' | 'center' | 'right' = 'center',
) {
  ctx.font = font(family, f.size, weight);
  ctx.textBaseline = 'middle';
  const top = cy - ((f.lines.length - 1) * f.lineH) / 2;
  f.lines.forEach((l, i) => fillSpaced(ctx, l, x, top + i * f.lineH, f.spacing, align));
}

/** Texto sobre un arco. top=true: se lee por arriba (sentido horario); false: por abajo, derecho. */
export function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  r: number,
  spacing: number,
  top: boolean,
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const totalAng = total / r;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let a = top ? -Math.PI / 2 - totalAng / 2 : Math.PI / 2 + totalAng / 2;
  chars.forEach((c, i) => {
    const half = widths[i] / 2 / r;
    a += top ? half : -half;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
    ctx.fillText(c, 0, 0);
    ctx.restore();
    const step = half + spacing / r;
    a += top ? step : -step;
  });
}
