/** Composición de la escena: fondo (foto/video) + grade neón + overlays + guías de zonas seguras. */
import { BRAND } from '@/brand/tokens';
import type { Background, FilterKey, FormatKey, Layer, Page } from '@/lib/types';
import { FORMATS } from '@/lib/types';
import { PAD, renderSticker } from './stickers';
import { drawConflicts, drawInstagramUI } from './igui';

export type MediaEl = HTMLImageElement | HTMLVideoElement;

export const FILTERS: Record<FilterKey, { name: string; swatch: string }> = {
  none: { name: 'Original', swatch: 'linear-gradient(135deg,#666,#bbb)' },
  magenta: { name: 'Magenta neón', swatch: 'linear-gradient(135deg,#3a0820,#FF2E88)' },
  cyan: { name: 'Cyan noche', swatch: 'linear-gradient(135deg,#051a24,#2EF2FF)' },
  amber: { name: 'Warm amber', swatch: 'linear-gradient(135deg,#2a1505,#FFB547)' },
  dark: { name: 'Dark mood', swatch: 'linear-gradient(135deg,#000,#3a3a3a)' },
};

const mediaSize = (m: MediaEl) =>
  m instanceof HTMLVideoElement ? { w: m.videoWidth, h: m.videoHeight } : { w: m.naturalWidth, h: m.naturalHeight };

export function drawBackground(ctx: CanvasRenderingContext2D, bg: Background, W: number, H: number, media?: MediaEl | null) {
  ctx.fillStyle = bg.solid || BRAND.ink;
  ctx.fillRect(0, 0, W, H);
  if (media) {
    const { w, h } = mediaSize(media);
    if (w && h) {
      const s = Math.max(W / w, H / h) * Math.max(1, bg.zoom);
      const dw = w * s;
      const dh = h * s;
      const ex = dw - W;
      const ey = dh - H;
      const x = -ex / 2 - (bg.offsetX * ex) / 2;
      const y = -ey / 2 - (bg.offsetY * ey) / 2;
      ctx.drawImage(media, x, y, dw, dh);
    }
  } else {
    // fondo de marca: carbón con halo sutil
    const g = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#2C2C2C');
    g.addColorStop(1, bg.solid || BRAND.ink);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  applyGrade(ctx, bg.filter, bg.intensity, W, H);
}

function layer(ctx: CanvasRenderingContext2D, op: GlobalCompositeOperation, alpha: number, fill: string | CanvasGradient, W: number, H: number) {
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${alpha})`);
  layer(ctx, 'source-over', 1, g, W, H);
}

function glow(ctx: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.7);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  layer(ctx, 'screen', alpha, g, W, H);
}

/**
 * Filtros neón construidos con modos de fusión (compatibles con Safari/iOS, a diferencia de ctx.filter).
 */
export function applyGrade(ctx: CanvasRenderingContext2D, f: FilterKey, intensity: number, W: number, H: number) {
  const i = intensity;
  if (f === 'none' || i <= 0) return;
  if (f === 'magenta') {
    layer(ctx, 'saturation', 0.25 * i, '#808080', W, H);
    layer(ctx, 'soft-light', 0.75 * i, '#FF2E88', W, H);
    layer(ctx, 'multiply', 0.35 * i, '#3B0A2A', W, H);
    glow(ctx, W, H, W * 0.15, H * 0.1, 'rgba(255,46,136,0.9)', 0.35 * i);
    glow(ctx, W, H, W * 0.95, H * 0.85, 'rgba(232,60,255,0.9)', 0.22 * i);
    vignette(ctx, W, H, 0.6 * i);
  } else if (f === 'cyan') {
    layer(ctx, 'saturation', 0.35 * i, '#808080', W, H);
    layer(ctx, 'soft-light', 0.7 * i, '#1EC8FF', W, H);
    layer(ctx, 'multiply', 0.45 * i, '#08202E', W, H);
    glow(ctx, W, H, W * 0.85, H * 0.12, 'rgba(46,242,255,0.8)', 0.25 * i);
    vignette(ctx, W, H, 0.65 * i);
  } else if (f === 'amber') {
    layer(ctx, 'soft-light', 0.7 * i, '#FFB547', W, H);
    layer(ctx, 'multiply', 0.25 * i, '#4A2A10', W, H);
    glow(ctx, W, H, W * 0.5, H * 0.3, 'rgba(255,170,80,0.8)', 0.25 * i);
    vignette(ctx, W, H, 0.55 * i);
  } else if (f === 'dark') {
    layer(ctx, 'saturation', 0.55 * i, '#808080', W, H);
    layer(ctx, 'multiply', 0.55 * i, '#2A2A2A', W, H);
    layer(ctx, 'soft-light', 0.35 * i, '#000000', W, H);
    vignette(ctx, W, H, 0.85 * i);
  }
}

export function layerBox(l: Layer) {
  const r = renderSticker(l.props);
  return { w: r.w * l.scale, h: r.h * l.scale };
}

export function drawLayer(ctx: CanvasRenderingContext2D, l: Layer) {
  if (l.hidden) return;
  const r = renderSticker(l.props);
  ctx.save();
  ctx.globalAlpha = l.opacity;
  ctx.translate(l.x, l.y);
  ctx.rotate((l.rotation * Math.PI) / 180);
  ctx.scale(l.scale, l.scale);
  ctx.drawImage(r.canvas, -r.w / 2 - PAD, -r.h / 2 - PAD, r.w + PAD * 2, r.h + PAD * 2);
  ctx.restore();
}

/** Zonas que tapa la interfaz de Instagram (px sobre 1080 de ancho). */
export function safeZones(format: FormatKey) {
  const { w, h } = FORMATS[format];
  if (format === 'story') return [
    { x: 0, y: 0, w, h: 250, label: 'Perfil · barra de progreso' },
    { x: 0, y: h - 340, w, h: 340, label: 'Responder · reacciones' },
  ];
  if (format === 'reel') return [
    { x: 0, y: 0, w, h: 220, label: 'Encabezado Reels' },
    { x: 0, y: h - 420, w, h: 420, label: 'Usuario · caption · audio' },
    { x: w - 150, y: h - 1000, w: 150, h: 580, label: 'Botones' },
  ];
  if (format === 'feed45') return [
    // la grilla del perfil (3:4) recorta 34 px por lado de un 4:5
    { x: 0, y: 0, w: 34, h, label: '' },
    { x: w - 34, y: 0, w: 34, h, label: '' },
  ];
  return [];
}

export interface SceneOpts {
  format: FormatKey;
  media?: MediaEl | null;
  guides?: boolean;
  /** Para la exportación de un slide de carrusel continuo: no dibuja guías de costura. */
  selectedId?: string | null;
  /** px de documento por px de pantalla (tamaño de los controles). */
  ui?: number;
  snap?: { x?: boolean; y?: boolean } | null;
  /** Simula la UI de Instagram encima (solo vista previa). */
  igUi?: boolean;
  /** Cajas de stickers que pisan zonas tapadas (se marcan en rojo). */
  conflicts?: { x: number; y: number; w: number; h: number }[];
}

export function renderScene(ctx: CanvasRenderingContext2D, page: Page, o: SceneOpts) {
  const fw = FORMATS[o.format].w;
  const W = fw * page.span;
  const H = FORMATS[o.format].h;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, page.background, W, H, o.media);
  for (const l of page.layers) drawLayer(ctx, l);
  if (o.igUi) drawInstagramUI(ctx, o.format, page.span);
  if (o.guides) drawGuides(ctx, o.format, page.span, W, H, o.ui ?? 1, !o.igUi);
  if (o.conflicts?.length) drawConflicts(ctx, o.conflicts, o.ui ?? 1);
  if (o.snap) drawSnap(ctx, W, H, o.snap, o.ui ?? 1, fw, page.span);
  const sel = page.layers.find((l) => l.id === o.selectedId);
  if (sel) drawSelection(ctx, sel, o.ui ?? 1);
  ctx.restore();
}

function drawGuides(ctx: CanvasRenderingContext2D, format: FormatKey, span: number, W: number, H: number, ui: number, labels = true) {
  const fw = FORMATS[format].w;
  ctx.save();
  for (let s = 0; s < span; s++) {
    for (const z of safeZones(format)) {
      const x = s * fw + z.x;
      ctx.fillStyle = 'rgba(255,46,136,0.14)';
      ctx.fillRect(x, z.y, z.w, z.h);
      ctx.setLineDash([10 * ui, 8 * ui]);
      ctx.strokeStyle = 'rgba(255,46,136,0.7)';
      ctx.lineWidth = 1.5 * ui;
      ctx.strokeRect(x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      if (z.label && labels) {
        ctx.setLineDash([]);
        ctx.font = `600 ${13 * Math.min(ui, 2.4)}px Manrope, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textBaseline = 'top';
        ctx.fillText(z.label.toUpperCase(), x + 14 * Math.min(ui, 2.4), z.y + 10 * Math.min(ui, 2.4));
      }
    }
  }
  // costuras del carrusel continuo
  for (let s = 1; s < span; s++) {
    ctx.setLineDash([16 * ui, 10 * ui]);
    ctx.strokeStyle = 'rgba(46,242,255,0.9)';
    ctx.lineWidth = 2 * ui;
    ctx.beginPath();
    ctx.moveTo(s * fw, 0);
    ctx.lineTo(s * fw, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(46,242,255,0.95)';
    ctx.font = `700 ${14 * Math.min(ui, 2.4)}px Manrope, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`SLIDE ${s} │ ${s + 1}`, s * fw, H - 16 * Math.min(ui, 2.4));
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawSnap(ctx: CanvasRenderingContext2D, W: number, H: number, snap: { x?: boolean; y?: boolean }, ui: number, fw: number, span: number) {
  ctx.save();
  ctx.strokeStyle = '#2EF2FF';
  ctx.lineWidth = 1.5 * ui;
  ctx.setLineDash([6 * ui, 6 * ui]);
  if (snap.x) {
    for (let s = 0; s < span; s++) {
      ctx.beginPath();
      ctx.moveTo(s * fw + fw / 2, 0);
      ctx.lineTo(s * fw + fw / 2, H);
      ctx.stroke();
    }
  }
  if (snap.y) {
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  }
  ctx.restore();
}

export const HANDLE = 14; // radio en px de pantalla
export const ROT_OFFSET = 46;

/** Esquinas y manija de rotación en coordenadas del documento. */
export function handlePoints(l: Layer, ui: number) {
  const { w, h } = layerBox(l);
  const a = (l.rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const tr = (dx: number, dy: number) => ({ x: l.x + dx * cos - dy * sin, y: l.y + dx * sin + dy * cos });
  return {
    corners: [tr(-w / 2, -h / 2), tr(w / 2, -h / 2), tr(w / 2, h / 2), tr(-w / 2, h / 2)],
    rotate: tr(0, -h / 2 - ROT_OFFSET * ui),
    topMid: tr(0, -h / 2),
  };
}

function drawSelection(ctx: CanvasRenderingContext2D, l: Layer, ui: number) {
  const hp = handlePoints(l, ui);
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * ui;
  ctx.setLineDash([8 * ui, 6 * ui]);
  ctx.beginPath();
  hp.corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(hp.topMid.x, hp.topMid.y);
  ctx.lineTo(hp.rotate.x, hp.rotate.y);
  ctx.stroke();
  const dot = (x: number, y: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(x, y, (HANDLE * ui) / 1.6, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2 * ui;
    ctx.strokeStyle = '#121212';
    ctx.stroke();
  };
  for (const c of hp.corners) dot(c.x, c.y, '#FFFFFF');
  dot(hp.rotate.x, hp.rotate.y, '#FF2E88');
  ctx.restore();
}

/** ¿El punto (doc) cae dentro de la caja rotada de la capa? */
export function hitLayer(l: Layer, px: number, py: number) {
  const { w, h } = layerBox(l);
  const a = (-l.rotation * Math.PI) / 180;
  const dx = px - l.x;
  const dy = py - l.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}
