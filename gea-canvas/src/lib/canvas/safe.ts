/** Choque de stickers con las zonas que tapa la interfaz de Instagram, y reubicación automática. */
import { FORMATS, type FormatKey, type Layer, type Page } from '@/lib/types';
import { layerBox, safeZones } from './render';

const TOL = 4; // px de tolerancia para no marcar roces del glow

export function layerAABB(l: Layer) {
  const { w, h } = layerBox(l);
  const a = (l.rotation * Math.PI) / 180;
  const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { x: l.x - bw / 2, y: l.y - bh / 2, w: bw, h: bh };
}

/** Zonas de UI de todos los slides de la página (carrusel continuo incluido). */
export function pageZones(format: FormatKey, span: number) {
  const fw = FORMATS[format].w;
  const out: { x: number; y: number; w: number; h: number; label: string }[] = [];
  for (let s = 0; s < span; s++) for (const z of safeZones(format)) out.push({ ...z, x: z.x + s * fw, label: z.label || 'Recorte de la grilla' });
  return out;
}

/** id de capa → zonas que pisa. Las capas ocultas no cuentan. */
export function findConflicts(page: Page, format: FormatKey) {
  const zones = pageZones(format, page.span);
  const res = new Map<string, string[]>();
  for (const l of page.layers) {
    if (l.hidden) continue;
    const b = layerAABB(l);
    const hits = zones.filter(
      (z) => b.x + TOL < z.x + z.w && b.x + b.w - TOL > z.x && b.y + TOL < z.y + z.h && b.y + b.h - TOL > z.y,
    );
    if (hits.length) res.set(l.id, [...new Set(hits.map((z) => z.label))]);
  }
  return res;
}

/** Rectángulo libre de UI dentro del slide que contiene a la capa. */
export function safeRect(format: FormatKey, slide: number) {
  const { w, h } = FORMATS[format];
  const x0 = slide * w;
  if (format === 'story') return { x: x0 + 24, y: 250 + 16, w: w - 48, h: h - 250 - 340 - 32 };
  if (format === 'reel') return { x: x0 + 24, y: 220 + 16, w: w - 150 - 24 - 16, h: h - 220 - 420 - 32 };
  if (format === 'feed45') return { x: x0 + 34 + 12, y: 24, w: w - 68 - 24, h: h - 48 };
  return { x: x0 + 24, y: 24, w: w - 48, h: h - 48 };
}

/** Patch que mete la capa en la zona segura: primero achica si no entra, después la desplaza lo mínimo. */
export function fitIntoSafe(l: Layer, format: FormatKey, span: number): Partial<Layer> {
  const fw = FORMATS[format].w;
  const slide = Math.max(0, Math.min(span - 1, Math.floor(l.x / fw)));
  const r = safeRect(format, slide);
  let b = layerAABB(l);
  let scale = l.scale;
  const k = Math.min(1, r.w / b.w, r.h / b.h);
  if (k < 1) {
    scale = l.scale * k * 0.98;
    b = layerAABB({ ...l, scale });
  }
  const cx = Math.min(Math.max(l.x, r.x + b.w / 2), r.x + r.w - b.w / 2);
  const cy = Math.min(Math.max(l.y, r.y + b.h / 2), r.y + r.h - b.h / 2);
  return { x: cx, y: cy, scale };
}
