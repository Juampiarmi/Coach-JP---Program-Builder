/**
 * Simulador de la interfaz de Instagram (solo vista previa, nunca se exporta).
 * Medidas sobre 1080 px de ancho, tomadas de capturas de Stories y Reels en iOS/Android.
 */
import { drawLogo } from '@/brand/logo';
import type { FormatKey } from '@/lib/types';
import { FORMATS } from '@/lib/types';

const WHITE = 'rgba(255,255,255,0.92)';

function shade(ctx: CanvasRenderingContext2D, x: number, y0: number, w: number, y1: number, alpha: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, Math.min(y0, y1), w, Math.abs(y1 - y0));
}

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const p = new Path2D();
  p.moveTo(cx, cy + s * 0.9);
  p.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.9, cy - s * 1.3, cx, cy - s * 0.45);
  p.bezierCurveTo(cx + s * 0.9, cy - s * 1.3, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.stroke(p);
}

function bubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, s, Math.PI * 0.8, Math.PI * 2.6);
  ctx.lineTo(cx - s * 1.05, cy + s * 1.05);
  ctx.closePath();
  ctx.stroke();
}

function plane(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.85);
  ctx.lineTo(cx + s, cy - s * 0.85);
  ctx.lineTo(cx - s * 0.15, cy + s);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.1);
  ctx.closePath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx + s, cy - s * 0.85);
  ctx.stroke();
}

function dots(ctx: CanvasRenderingContext2D, cx: number, cy: number, gap: number, r: number, vertical = false) {
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(cx + (vertical ? 0 : i * gap), cy + (vertical ? i * gap : 0), r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function avatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const g = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
  g.addColorStop(0, '#FEDA75');
  g.addColorStop(0.5, '#D62976');
  g.addColorStop(1, '#4F5BD5');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.fillStyle = '#212121';
  ctx.fill();
  drawLogo(ctx, cx, cy, r * 1.25, '#FFFFFF');
}

function storyUI(ctx: CanvasRenderingContext2D, x0: number, w: number, h: number) {
  shade(ctx, x0, 0, w, 280, 0.45);
  shade(ctx, x0, h, w, h - 300, 0.5);
  // barra de progreso (3 historias)
  const segW = (w - 48 - 16) / 3;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? WHITE : 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.roundRect(x0 + 24 + i * (segW + 8), 28, segW, 6, 3);
    ctx.fill();
  }
  avatar(ctx, x0 + 78, 104, 38);
  ctx.fillStyle = WHITE;
  ctx.font = '700 30px Manrope, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('hotelgea', x0 + 134, 104);
  const uw = ctx.measureText('hotelgea').width;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '500 28px Manrope, sans-serif';
  ctx.fillText('2 h', x0 + 134 + uw + 16, 104);
  ctx.fillStyle = WHITE;
  dots(ctx, x0 + w - 150, 104, 13, 4.5);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + w - 68, 86);
  ctx.lineTo(x0 + w - 32, 122);
  ctx.moveTo(x0 + w - 32, 86);
  ctx.lineTo(x0 + w - 68, 122);
  ctx.stroke();
  // caja de respuesta + reacciones
  const y = h - 150;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.roundRect(x0 + 32, y, w - 300, 96, 48);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 30px Manrope, sans-serif';
  ctx.fillText('Enviar mensaje', x0 + 74, y + 49);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  heart(ctx, x0 + w - 200, y + 50, 24);
  plane(ctx, x0 + w - 80, y + 50, 26);
}

function reelUI(ctx: CanvasRenderingContext2D, x0: number, w: number, h: number) {
  shade(ctx, x0, 0, w, 240, 0.4);
  shade(ctx, x0, h, w, h - 560, 0.6);
  ctx.fillStyle = WHITE;
  ctx.textBaseline = 'middle';
  ctx.font = '800 46px Manrope, sans-serif';
  ctx.fillText('Reels', x0 + 40, 110);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.roundRect(x0 + w - 104, 86, 60, 48, 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x0 + w - 74, 110, 12, 0, Math.PI * 2);
  ctx.stroke();
  // columna de botones (dentro de la zona segura derecha: y 920–1500)
  const cx = x0 + w - 75;
  ctx.font = '700 24px Manrope, sans-serif';
  ctx.textAlign = 'center';
  heart(ctx, cx, 980, 26);
  ctx.fillText('1.284', cx, 1036);
  bubble(ctx, cx, 1120, 26);
  ctx.fillText('86', cx, 1176);
  plane(ctx, cx, 1258, 26);
  ctx.fillText('31', cx, 1314);
  dots(ctx, cx, 1400, 13, 4.5);
  ctx.textAlign = 'left';
  // usuario, caption y audio
  avatar(ctx, x0 + 76, 1580, 34);
  ctx.font = '700 30px Manrope, sans-serif';
  ctx.fillText('hotelgea', x0 + 126, 1580);
  const uw = ctx.measureText('hotelgea').width;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x0 + 126 + uw + 20, 1556, 112, 48, 12);
  ctx.stroke();
  ctx.font = '700 24px Manrope, sans-serif';
  ctx.fillText('Seguir', x0 + 126 + uw + 40, 1581);
  ctx.font = '500 28px Manrope, sans-serif';
  ctx.fillText('Dos cuerpos, una sola llave… más', x0 + 40, 1662);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '500 26px Manrope, sans-serif';
  ctx.fillText('♫  hotelgea · Audio original', x0 + 40, 1728);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(cx - 30, 1690, 60, 60, 12);
  ctx.stroke();
}

function feedUI(ctx: CanvasRenderingContext2D, x0: number, w: number, h: number) {
  // vista de la grilla del perfil (3:4): oscurece lo que se recorta
  const crop = (w - (h * 3) / 4) / 2;
  if (crop <= 0) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x0, 0, crop, h);
  ctx.fillRect(x0 + w - crop, 0, crop, h);
}

/** Superpone la UI de Instagram sobre cada slide de la página. */
export function drawInstagramUI(ctx: CanvasRenderingContext2D, format: FormatKey, span: number) {
  const { w, h } = FORMATS[format];
  ctx.save();
  for (let s = 0; s < span; s++) {
    const x0 = s * w;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, h);
    ctx.clip();
    if (format === 'story') storyUI(ctx, x0, w, h);
    else if (format === 'reel') reelUI(ctx, x0, w, h);
    else feedUI(ctx, x0, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/** Marco rojo sobre los stickers que caen en zonas tapadas. */
export function drawConflicts(ctx: CanvasRenderingContext2D, boxes: { x: number; y: number; w: number; h: number }[], ui: number) {
  ctx.save();
  for (const b of boxes) {
    ctx.fillStyle = 'rgba(255,59,48,0.12)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 3 * ui;
    ctx.setLineDash([12 * ui, 8 * ui]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    const s = Math.min(ui, 2.4);
    ctx.font = `800 ${15 * s}px Manrope, sans-serif`;
    const label = '⚠ ZONA TAPADA';
    const tw = ctx.measureText(label).width + 16 * s;
    ctx.fillStyle = '#FF3B30';
    ctx.fillRect(b.x, b.y - 26 * s, tw, 26 * s);
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, b.x + 8 * s, b.y - 13 * s);
  }
  ctx.restore();
}
