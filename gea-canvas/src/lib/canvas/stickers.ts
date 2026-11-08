/**
 * Visual Overlay Engine · stickers vectoriales dibujados en Canvas 2D.
 * Cada sticker se "maqueta" (mide textos y define su caja w×h) y luego se pinta en un canvas
 * transparente a k× de resolución. El mismo bitmap sirve para la pizarra, la exportación del post
 * y la descarga del sticker recortado (PNG con canal alfa).
 */
import { ACCENTS, BRAND } from '@/brand/tokens';
import { drawLogo, logoHeight } from '@/brand/logo';
import type { StickerProps } from '@/lib/types';
import { arcText, drawBlock, fillSpaced, fit, font, measureSpaced } from './text';
import { dropShadow, glass, grain, neonGlow, neonStroke, rgba, rr, softGlow, tint } from './paint';

/** Margen alrededor de la caja para que el glow no se corte. */
export const PAD = 70;

export interface Laid {
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D, k: number) => void;
}

type Layout = (ctx: CanvasRenderingContext2D, p: StickerProps) => Laid;

const acc = (p: StickerProps) => ACCENTS[p.accent];
/** Color de la "tinta" principal según estilo. */
const inkOn = (p: StickerProps) => (p.style === 'paper' ? BRAND.ink : '#FFFFFF');

/* ───────────────────────── 1 · SELLO CIRCULAR NEÓN ───────────────────────── */
const stamp: Layout = (ctx, p) => {
  const D = 540;
  const c = D / 2;
  const a = acc(p);
  const R = 238;
  const inner = 196;
  const phrase = fit(ctx, p.text, {
    family: 'body',
    weight: 800,
    maxW: 300,
    maxH: 190,
    maxLines: 5,
    max: 46,
    min: 18,
    lineHeight: 1.08,
    spacingEm: 0.02,
    upper: true,
  });
  return {
    w: D,
    h: D,
    draw(ctx, k) {
      const ring = new Path2D();
      ring.arc(c, c, R, 0, Math.PI * 2);
      const disc = new Path2D();
      disc.arc(c, c, R + 4, 0, Math.PI * 2);
      // cuerpo
      if (p.style === 'glass') glass(ctx, disc, c - R, c - R, R * 2, R * 2, a.hex);
      else if (p.style === 'paper') {
        dropShadow(ctx, k, () => {
          ctx.fillStyle = BRAND.bone;
          ctx.fill(disc);
        });
        grain(ctx, disc, 0, 0, D, D);
      } else if (p.style === 'solid') {
        dropShadow(ctx, k, () => {
          ctx.fillStyle = a.hex;
          ctx.fill(disc);
        });
      } else {
        const g = ctx.createRadialGradient(c, c, 40, c, c, R);
        g.addColorStop(0, 'rgba(18,18,18,0.78)');
        g.addColorStop(1, 'rgba(18,18,18,0.55)');
        ctx.fillStyle = g;
        ctx.fill(disc);
      }
      const line = p.style === 'paper' ? BRAND.ink : p.style === 'solid' ? '#FFFFFF' : a.hex;
      // anillo exterior
      if (p.style === 'neon') neonStroke(ctx, ring, a.hex, 9, k);
      else {
        ctx.strokeStyle = line;
        ctx.lineWidth = 6;
        ctx.stroke(ring);
      }
      // anillo interior fino + puntos cardinales
      const ring2 = new Path2D();
      ring2.arc(c, c, inner, 0, Math.PI * 2);
      ctx.strokeStyle = p.style === 'neon' ? rgba(a.hex, 0.7) : line;
      ctx.lineWidth = 2;
      ctx.stroke(ring2);
      ctx.fillStyle = p.style === 'neon' ? a.hex : line;
      for (const ang of [Math.PI, 0]) {
        ctx.beginPath();
        ctx.arc(c + Math.cos(ang) * ((R + inner) / 2), c, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // textos arqueados
      const arcColor = p.style === 'paper' ? BRAND.ink : '#FFFFFF';
      ctx.font = font('display', 24, 700);
      ctx.fillStyle = arcColor;
      const mid = (R + inner) / 2;
      const top = (p.meta || 'HOTEL GEA').toUpperCase();
      const bottom = (p.sub || 'SUITES').toUpperCase();
      if (p.style === 'neon') {
        softGlow(ctx, a.hex, k, () => arcText(ctx, top, c, c, mid, 7, true));
        neonGlow(ctx, a.hex, k, () => arcText(ctx, bottom, c, c, mid, 12, false), 0.6, 0.55);
      } else {
        arcText(ctx, top, c, c, mid, 7, true);
        arcText(ctx, bottom, c, c, mid, 12, false);
      }
      // isotipo
      const logoW = 110;
      const ink = inkOn(p);
      if (p.style === 'neon') softGlow(ctx, a.hex, k, () => drawLogo(ctx, c, c - 128, logoW, '#FFFFFF'));
      else drawLogo(ctx, c, c - 128, logoW, ink);
      // separador
      ctx.fillStyle = p.style === 'neon' ? a.hex : ink;
      ctx.fillRect(c - 22, c - 92, 44, 3);
      // frase central
      const cy = c + 18;
      if (p.style === 'neon') softGlow(ctx, a.hex, k, () => drawBlock(ctx, phrase, 'body', 800, c, cy));
      else {
        ctx.fillStyle = ink;
        drawBlock(ctx, phrase, 'body', 800, c, cy);
      }
    },
  };
};

/* ───────────────────────── 2 · TICKET IMPRESO ───────────────────────── */
const ticket: Layout = (ctx, p) => {
  const W = 780;
  const H = 310;
  const stubX = 560;
  const a = acc(p);
  const phrase = fit(ctx, p.text, { family: 'body', weight: 800, maxW: 470, maxH: 150, maxLines: 3, max: 50, min: 20, lineHeight: 1.06 });
  const [day, ...rest] = (p.sub || '21 SEP').trim().split(/\s+/);
  const month = rest.join(' ').toUpperCase();
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      // silueta con muescas
      const r = 22;
      const n = 20;
      const shape = new Path2D();
      shape.moveTo(r, 0);
      shape.lineTo(stubX - n, 0);
      shape.arc(stubX, 0, n, Math.PI, 0, true);
      shape.lineTo(W - r, 0);
      shape.arcTo(W, 0, W, r, r);
      shape.lineTo(W, H - r);
      shape.arcTo(W, H, W - r, H, r);
      shape.lineTo(stubX + n, H);
      shape.arc(stubX, H, n, 0, Math.PI, true);
      shape.lineTo(r, H);
      shape.arcTo(0, H, 0, H - r, r);
      shape.lineTo(0, r);
      shape.arcTo(0, 0, r, 0, r);
      shape.closePath();

      const paper = p.style === 'paper';
      const ink = paper ? BRAND.ink : '#FFFFFF';
      if (paper) {
        dropShadow(ctx, k, () => {
          ctx.fillStyle = BRAND.bone;
          ctx.fill(shape);
        });
        grain(ctx, shape, 0, 0, W, H, 0.06);
        ctx.fillStyle = a.hex === '#FFFFFF' ? BRAND.ink : a.hex;
        ctx.fillRect(0, 0, 14, H);
      } else if (p.style === 'glass') glass(ctx, shape, 0, 0, W, H, a.hex);
      else if (p.style === 'solid') {
        dropShadow(ctx, k, () => {
          ctx.fillStyle = BRAND.ink;
          ctx.fill(shape);
        });
      } else {
        ctx.fillStyle = 'rgba(14,14,14,0.78)';
        ctx.fill(shape);
        neonStroke(ctx, shape, a.hex, 5, k, 0.8);
      }
      // perforación
      ctx.save();
      ctx.setLineDash([8, 9]);
      ctx.strokeStyle = paper ? rgba(BRAND.ink, 0.45) : rgba('#FFFFFF', 0.45);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(stubX, n + 6);
      ctx.lineTo(stubX, H - n - 6);
      ctx.stroke();
      ctx.restore();
      // encabezado
      ctx.textBaseline = 'alphabetic';
      ctx.font = font('tech', 17);
      ctx.fillStyle = paper ? rgba(BRAND.ink, 0.7) : rgba('#FFFFFF', 0.72);
      fillSpaced(ctx, (p.meta || 'ADMIT TWO · HOTEL GEA').toUpperCase(), 44, 52, 3);
      ctx.fillStyle = paper ? BRAND.ink : a.hex;
      ctx.fillRect(44, 66, 60, 3);
      // frase
      ctx.fillStyle = ink;
      if (p.style === 'neon') softGlow(ctx, a.hex, k, () => drawBlock(ctx, phrase, 'body', 800, 44, 148, 'left'));
      else drawBlock(ctx, phrase, 'body', 800, 44, 148, 'left');
      // código de barras
      let bx = 44;
      let s = 3;
      ctx.fillStyle = paper ? BRAND.ink : rgba('#FFFFFF', 0.85);
      while (bx < 300) {
        s = (s * 7 + 3) % 11;
        const bw = 2 + (s % 4);
        ctx.fillRect(bx, 238, bw, 40);
        bx += bw + 3 + (s % 3);
      }
      ctx.font = font('tech', 14);
      ctx.fillStyle = paper ? rgba(BRAND.ink, 0.6) : rgba('#FFFFFF', 0.6);
      fillSpaced(ctx, 'Nº 0021 · 24 HS', 320, 272, 2);
      // talón: fecha
      const cx = stubX + (W - stubX) / 2;
      ctx.textBaseline = 'middle';
      ctx.font = font('display', 92, 700);
      const dayColor = paper ? (a.hex === '#FFFFFF' ? BRAND.ink : a.deep) : a.hex;
      if (p.style === 'neon') neonGlow(ctx, a.hex, k, () => fillSpaced(ctx, day || '21', cx, 140, 0, 'center'), 0.8, 0.5);
      else {
        ctx.fillStyle = dayColor;
        fillSpaced(ctx, day || '21', cx, 140, 0, 'center');
      }
      ctx.font = font('display', 26, 700);
      ctx.fillStyle = ink;
      fillSpaced(ctx, month || 'SEP', cx, 214, 8, 'center');
      drawLogo(ctx, cx, 262, 70, paper ? BRAND.ink : '#FFFFFF');
    },
  };
};

/* ───────────────────────── 3 · CINTA DIAGONAL (SASH) ───────────────────────── */
const sash: Layout = (ctx, p) => {
  const H = 124;
  const tail = 46;
  const t = fit(ctx, p.text, { family: 'body', weight: 800, maxW: 980, maxH: 60, maxLines: 1, max: 50, min: 22, spacingEm: 0.08, upper: true });
  ctx.font = font('body', t.size, 800);
  const textW = measureSpaced(ctx, t.lines[0] ?? '', t.spacing);
  const W = Math.max(560, textW + 220);
  const a = acc(p);
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const band = new Path2D();
      band.moveTo(0, 0);
      band.lineTo(W, 0);
      band.lineTo(W - tail, H / 2);
      band.lineTo(W, H);
      band.lineTo(0, H);
      band.lineTo(tail, H / 2);
      band.closePath();
      const paper = p.style === 'paper';
      if (p.style === 'neon') {
        ctx.fillStyle = 'rgba(14,14,14,0.72)';
        ctx.fill(band);
        neonStroke(ctx, band, a.hex, 5, k);
      } else if (p.style === 'glass') glass(ctx, band, 0, 0, W, H, a.hex);
      else {
        dropShadow(ctx, k, () => {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          const base = paper ? BRAND.bone : a.hex;
          g.addColorStop(0, tint(base, 0.12));
          g.addColorStop(1, base);
          ctx.fillStyle = g;
          ctx.fill(band);
        });
        // costuras
        ctx.save();
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = paper ? rgba(BRAND.ink, 0.35) : 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tail + 8, 12);
        ctx.lineTo(W - tail - 8, 12);
        ctx.moveTo(tail + 8, H - 12);
        ctx.lineTo(W - tail - 8, H - 12);
        ctx.stroke();
        ctx.restore();
      }
      const ink = paper ? BRAND.ink : p.style === 'solid' && p.accent === 'white' ? BRAND.ink : '#FFFFFF';
      // rombos
      ctx.fillStyle = p.style === 'neon' ? a.hex : ink;
      for (const dx of [tail + 40, W - tail - 40]) {
        ctx.beginPath();
        ctx.moveTo(dx, H / 2 - 9);
        ctx.lineTo(dx + 9, H / 2);
        ctx.lineTo(dx, H / 2 + 9);
        ctx.lineTo(dx - 9, H / 2);
        ctx.fill();
      }
      ctx.fillStyle = ink;
      if (p.style === 'neon') softGlow(ctx, a.hex, k, () => drawBlock(ctx, t, 'body', 800, W / 2, H / 2 + 2));
      else drawBlock(ctx, t, 'body', 800, W / 2, H / 2 + 2);
    },
  };
};

/* ───────────────────────── 4 · TAG COLGANTE DE REGALO ───────────────────────── */
const tag: Layout = (ctx, p) => {
  const W = 360;
  const bodyH = 520;
  const top = 170; // espacio para el hilo
  const H = top + bodyH;
  const a = acc(p);
  const phrase = fit(ctx, p.text, { family: 'body', weight: 800, maxW: 270, maxH: 250, maxLines: 6, max: 44, min: 18, lineHeight: 1.1 });
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const ch = 70; // chaflán
      const shape = new Path2D();
      shape.moveTo(ch, top);
      shape.lineTo(W - ch, top);
      shape.lineTo(W, top + ch);
      shape.lineTo(W, H - 24);
      shape.arcTo(W, H, W - 24, H, 24);
      shape.lineTo(24, H);
      shape.arcTo(0, H, 0, H - 24, 24);
      shape.lineTo(0, top + ch);
      shape.closePath();
      const holeY = top + 62;
      const paper = p.style === 'paper';
      const ink = paper ? BRAND.ink : '#FFFFFF';

      // hilo
      ctx.save();
      ctx.strokeStyle = paper ? '#B9A27A' : p.style === 'neon' ? a.hex : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const string = new Path2D();
      string.moveTo(W / 2, holeY);
      string.bezierCurveTo(W / 2 - 70, holeY - 110, W / 2 + 90, 60, W / 2 + 20, 6);
      string.moveTo(W / 2, holeY);
      string.bezierCurveTo(W / 2 + 60, holeY - 90, W / 2 + 140, 90, W / 2 + 150, 28);
      if (p.style === 'neon') neonStroke(ctx, string, a.hex, 3, k, 0.6);
      else ctx.stroke(string);
      ctx.restore();

      // cuerpo
      if (p.style === 'neon') {
        ctx.fillStyle = 'rgba(14,14,14,0.78)';
        ctx.fill(shape);
        neonStroke(ctx, shape, a.hex, 5, k);
      } else if (p.style === 'glass') glass(ctx, shape, 0, top, W, bodyH, a.hex);
      else {
        dropShadow(ctx, k, () => {
          ctx.fillStyle = paper ? BRAND.bone : p.accent === 'white' ? BRAND.ink : a.hex;
          ctx.fill(shape);
        });
        if (paper) grain(ctx, shape, 0, top, W, bodyH, 0.06);
      }
      // ojal (perforado)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(W / 2, holeY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = paper ? '#C9B48C' : p.style === 'neon' ? a.hex : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(W / 2, holeY, 19, 0, Math.PI * 2);
      ctx.stroke();

      // encabezado
      ctx.textBaseline = 'middle';
      ctx.font = font('display', 18, 700);
      ctx.fillStyle = p.style === 'neon' ? a.hex : paper ? a.hex === '#FFFFFF' ? BRAND.ink : a.deep : ink;
      fillSpaced(ctx, (p.meta || 'PARA VOS').toUpperCase(), W / 2, top + 122, 6, 'center');
      ctx.fillStyle = paper ? rgba(BRAND.ink, 0.25) : 'rgba(255,255,255,0.3)';
      ctx.fillRect(W / 2 - 40, top + 146, 80, 2);
      // frase
      ctx.fillStyle = ink;
      const cy = top + 300;
      if (p.style === 'neon') softGlow(ctx, a.hex, k, () => drawBlock(ctx, phrase, 'body', 800, W / 2, cy));
      else drawBlock(ctx, phrase, 'body', 800, W / 2, cy);
      drawLogo(ctx, W / 2, H - 58, 96, ink);
    },
  };
};

/* ───────────────────────── 5 · PÍLDORA MINIMALISTA ───────────────────────── */
const pill: Layout = (ctx, p) => {
  const H = 104;
  const t = fit(ctx, p.text, { family: 'body', weight: 700, maxW: 860, maxH: 50, maxLines: 1, max: 40, min: 20, spacingEm: 0.01 });
  ctx.font = font('body', t.size, 700);
  const textW = measureSpaced(ctx, t.lines[0] ?? '', t.spacing);
  const W = textW + 150;
  const a = acc(p);
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const shape = rr(0, 0, W, H, H / 2);
      const paper = p.style === 'paper';
      if (p.style === 'glass') glass(ctx, shape, 0, 0, W, H, a.hex);
      else if (p.style === 'neon') {
        ctx.fillStyle = 'rgba(14,14,14,0.7)';
        ctx.fill(shape);
        neonStroke(ctx, shape, a.hex, 4, k, 0.8);
      } else
        dropShadow(ctx, k, () => {
          ctx.fillStyle = paper ? BRAND.bone : p.accent === 'white' ? '#FFFFFF' : a.hex;
          ctx.fill(shape);
        }, 0.35);
      // punto "en vivo"
      const dotC = p.style === 'solid' ? (p.accent === 'white' ? a.deep : '#FFFFFF') : paper ? (p.accent === 'white' ? BRAND.ink : a.hex) : a.hex;
      ctx.save();
      ctx.fillStyle = dotC;
      ctx.shadowColor = dotC;
      ctx.shadowBlur = p.style === 'solid' || paper ? 0 : 16 * k;
      ctx.beginPath();
      ctx.arc(58, H / 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = paper || (p.style === 'solid' && p.accent === 'white') ? BRAND.ink : '#FFFFFF';
      drawBlock(ctx, t, 'body', 700, 92, H / 2 + 1, 'left');
    },
  };
};

/* ───────────────────────── 6 · TARJETA VIP / CLUB ───────────────────────── */
const vip: Layout = (ctx, p) => {
  const W = 680;
  const H = 428;
  const a = acc(p);
  const phrase = fit(ctx, p.text, { family: 'body', weight: 700, maxW: 560, maxH: 96, maxLines: 2, max: 38, min: 18, lineHeight: 1.12 });
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const shape = rr(0, 0, W, H, 34);
      const paper = p.style === 'paper';
      const ink = paper ? BRAND.ink : '#FFFFFF';
      if (p.style === 'glass' || p.style === 'neon') {
        glass(ctx, shape, 0, 0, W, H, a.hex);
        if (p.style === 'neon') neonStroke(ctx, shape, a.hex, 3.5, k, 0.7);
      } else
        dropShadow(ctx, k, () => {
          const g = ctx.createLinearGradient(0, 0, W, H);
          if (paper) {
            g.addColorStop(0, '#FFFFFF');
            g.addColorStop(1, BRAND.bone);
          } else {
            g.addColorStop(0, '#2C2C2C');
            g.addColorStop(0.55, BRAND.ink);
            g.addColorStop(1, '#0E0E0E');
          }
          ctx.fillStyle = g;
          ctx.fill(shape);
        });
      // guilloché: arcos finos de seguridad
      ctx.save();
      ctx.clip(shape);
      ctx.strokeStyle = paper ? rgba(BRAND.ink, 0.07) : rgba(a.hex, 0.16);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.arc(W + 40, H + 60, 120 + i * 26, Math.PI, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.restore();
      drawLogo(ctx, 48 + 80, 70, 160, ink);
      ctx.textBaseline = 'middle';
      ctx.font = font('tech', 18);
      ctx.fillStyle = p.style === 'solid' || p.style === 'neon' || p.style === 'glass' ? a.hex : p.accent === 'white' ? BRAND.ink : a.deep;
      fillSpaced(ctx, (p.meta || 'CLUB GEA').toUpperCase(), W - 46, 70, 4, 'right');
      // chip
      const chip = rr(48, 140, 78, 58, 10);
      const cg = ctx.createLinearGradient(48, 140, 126, 198);
      cg.addColorStop(0, '#F6E2A8');
      cg.addColorStop(1, '#B8913F');
      ctx.fillStyle = cg;
      ctx.fill(chip);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(48, 169);
      ctx.lineTo(126, 169);
      ctx.moveTo(87, 140);
      ctx.lineTo(87, 198);
      ctx.moveTo(48, 155);
      ctx.lineTo(74, 155);
      ctx.moveTo(100, 183);
      ctx.lineTo(126, 183);
      ctx.stroke();
      // contactless
      ctx.strokeStyle = rgba(ink === '#FFFFFF' ? '#FFFFFF' : BRAND.ink, 0.6);
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(150, 169, 10 + i * 9, -0.6, 0.6);
        ctx.stroke();
      }
      // frase
      ctx.fillStyle = ink;
      drawBlock(ctx, phrase, 'body', 700, 48, 280, 'left');
      // pie
      ctx.font = font('tech', 17);
      ctx.fillStyle = paper ? rgba(BRAND.ink, 0.65) : 'rgba(255,255,255,0.7)';
      fillSpaced(ctx, (p.sub || 'MIEMBRO · Nº 0021').toUpperCase(), 48, 378, 3, 'left');
      ctx.font = font('display', 30, 700);
      if (p.style === 'neon' || p.style === 'glass') neonGlow(ctx, a.hex, k, () => fillSpaced(ctx, 'VIP', W - 46, 376, 6, 'right'), 0.6, 0.45);
      else {
        ctx.fillStyle = paper ? BRAND.ink : a.hex;
        fillSpaced(ctx, 'VIP', W - 46, 376, 6, 'right');
      }
    },
  };
};

/* ───────────────────────── 7 · PESTAÑA LATERAL (TAB) ───────────────────────── */
const tab: Layout = (ctx, p) => {
  const W = 176;
  const H = 760;
  const a = acc(p);
  // el texto corre vertical: su ancho disponible es la altura de la pestaña
  const t = fit(ctx, p.text, { family: 'body', weight: 800, maxW: 560, maxH: 112, maxLines: 2, max: 44, min: 20, lineHeight: 1.08, spacingEm: 0.04, upper: true });
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const right = (p.side ?? 'right') === 'right';
      const R = 40;
      const shape = right ? rr(0, 0, W, H, [R, 0, 0, R]) : rr(0, 0, W, H, [0, R, R, 0]);
      const paper = p.style === 'paper';
      const ink = paper || (p.style === 'solid' && p.accent === 'white') ? BRAND.ink : '#FFFFFF';
      if (p.style === 'glass') glass(ctx, shape, 0, 0, W, H, a.hex);
      else if (p.style === 'neon') {
        ctx.fillStyle = 'rgba(14,14,14,0.78)';
        ctx.fill(shape);
        neonStroke(ctx, shape, a.hex, 4, k, 0.8);
      } else
        dropShadow(ctx, k, () => {
          ctx.fillStyle = paper ? BRAND.bone : a.hex;
          ctx.fill(shape);
        });
      // filo de acento del lado interno
      ctx.fillStyle = p.style === 'solid' ? 'rgba(255,255,255,0.6)' : paper ? (p.accent === 'white' ? BRAND.ink : a.hex) : a.hex;
      ctx.fillRect(right ? 18 : W - 24, 120, 6, H - 240);
      // texto vertical
      ctx.save();
      ctx.translate(W / 2 + (right ? 8 : -8), H / 2 - 30);
      ctx.rotate(right ? -Math.PI / 2 : Math.PI / 2);
      ctx.fillStyle = ink;
      if (p.style === 'neon') softGlow(ctx, a.hex, k, () => drawBlock(ctx, t, 'body', 800, 0, 0));
      else drawBlock(ctx, t, 'body', 800, 0, 0);
      ctx.restore();
      // logo al pie
      ctx.save();
      ctx.translate(W / 2 + (right ? 8 : -8), H - 74);
      ctx.rotate(right ? -Math.PI / 2 : Math.PI / 2);
      drawLogo(ctx, 0, 0, 82, ink);
      ctx.restore();
    },
  };
};

/* ───────────────────────── 8 · ISOTIPO (generador desde el logo) ───────────────────────── */
const logo: Layout = (ctx, p) => {
  const lw = 420;
  const lh = logoHeight(lw);
  const sub = (p.sub ?? 'SUITES').toUpperCase();
  const hasSub = sub.trim().length > 0;
  const plate = p.style === 'glass' || p.style === 'solid' || p.style === 'paper';
  const padX = plate ? 70 : 20;
  const padY = plate ? 64 : 20;
  const W = lw + padX * 2;
  const H = lh + padY * 2 + (hasSub ? 74 : 0);
  const a = acc(p);
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const shape = rr(0, 0, W, H, 30);
      const paper = p.style === 'paper';
      if (p.style === 'glass') glass(ctx, shape, 0, 0, W, H, a.hex);
      else if (p.style === 'solid')
        dropShadow(ctx, k, () => {
          ctx.fillStyle = BRAND.ink; // placa oficial
          ctx.fill(shape);
        });
      else if (paper)
        dropShadow(ctx, k, () => {
          ctx.fillStyle = BRAND.bone;
          ctx.fill(shape);
        });
      const ink = paper ? BRAND.ink : '#FFFFFF';
      const cy = padY + lh / 2;
      if (p.style === 'neon') neonGlow(ctx, a.hex, k, () => drawLogo(ctx, W / 2, cy, lw, a.hex), 1, 0.85);
      else drawLogo(ctx, W / 2, cy, lw, ink);
      if (hasSub) {
        ctx.textBaseline = 'middle';
        ctx.font = font('display', 26, 700);
        const y = padY + lh + 50;
        if (p.style === 'neon') neonGlow(ctx, a.hex, k, () => fillSpaced(ctx, sub, W / 2, y, 22, 'center'), 0.6, 0.7);
        else {
          ctx.fillStyle = p.style === 'solid' && p.accent !== 'white' ? a.hex : ink;
          fillSpaced(ctx, sub, W / 2, y, 22, 'center');
        }
      }
    },
  };
};

/* ───────────────────────── 9 · TEXTO NEÓN / TITULAR ───────────────────────── */
const text: Layout = (ctx, p) => {
  const family = p.font ?? 'body';
  const weight = family === 'body' ? 800 : family === 'display' ? 700 : 400;
  const upper = family !== 'body';
  const t = fit(ctx, p.text, {
    family,
    weight,
    maxW: 900,
    maxH: 600,
    maxLines: 6,
    max: family === 'display' ? 76 : 92,
    min: 24,
    lineHeight: family === 'body' ? 1.04 : 1.18,
    spacingEm: family === 'display' ? 0.04 : family === 'tech' ? 0.06 : -0.01,
    upper,
  });
  ctx.font = font(family, t.size, weight);
  const W = Math.min(940, Math.max(...t.lines.map((l) => measureSpaced(ctx, l, t.spacing))) + 40);
  const subH = p.sub ? 60 : 0;
  const H = t.lines.length * t.lineH + 30 + subH;
  const a = acc(p);
  return {
    w: W,
    h: H,
    draw(ctx, k) {
      const cy = 15 + (t.lines.length * t.lineH) / 2;
      if (p.style === 'neon') neonGlow(ctx, a.hex, k, () => drawBlock(ctx, t, family, weight, W / 2, cy), 1, 0.78);
      else if (p.style === 'glass') {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 24 * k;
        ctx.fillStyle = '#FFFFFF';
        drawBlock(ctx, t, family, weight, W / 2, cy);
        ctx.restore();
      } else {
        ctx.fillStyle = p.style === 'paper' ? BRAND.ink : p.accent === 'white' ? '#FFFFFF' : a.hex;
        drawBlock(ctx, t, family, weight, W / 2, cy);
      }
      if (p.sub) {
        ctx.font = font('tech', 22);
        ctx.textBaseline = 'middle';
        ctx.fillStyle = p.style === 'paper' ? rgba(BRAND.ink, 0.75) : 'rgba(255,255,255,0.8)';
        fillSpaced(ctx, p.sub.toUpperCase(), W / 2, H - subH / 2 - 4, 5, 'center');
      }
    },
  };
};

export const LAYOUTS: Record<StickerProps['kind'], Layout> = { stamp, ticket, sash, tag, pill, vip, tab, logo, text };

/* ───────────────────────── render + caché ───────────────────────── */
export interface Rendered {
  canvas: HTMLCanvasElement;
  /** Caja lógica (sin margen de glow). */
  w: number;
  h: number;
  k: number;
}

const cache = new Map<string, Rendered>();
let measureCtx: CanvasRenderingContext2D | null = null;

export function renderSticker(p: StickerProps, k = 2): Rendered {
  const key = `${k}|${JSON.stringify(p)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!;
  const laid = LAYOUTS[p.kind](measureCtx, p);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((laid.w + PAD * 2) * k);
  canvas.height = Math.ceil((laid.h + PAD * 2) * k);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(k, k);
  ctx.translate(PAD, PAD);
  laid.draw(ctx, k);
  const out = { canvas, w: laid.w, h: laid.h, k };
  if (cache.size > 120) cache.delete(cache.keys().next().value as string);
  cache.set(key, out);
  return out;
}

/** Vacía la caché (p. ej. cuando terminan de cargar las fuentes). */
export const clearStickerCache = () => cache.clear();
