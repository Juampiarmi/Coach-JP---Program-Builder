/** Planificador semanal: arma las 7 piezas en el canvas y las empaqueta en un ZIP listo para publicar. */
import { PILLARS, PHRASES, kindSpec } from '@/data/library';
import { captionText } from '@/lib/copy/engine';
import { uid } from '@/lib/id';
import { loadMediaElement } from '@/lib/media';
import { exportPage, slug } from '@/lib/canvas/export';
import { findConflicts, fitIntoSafe } from '@/lib/canvas/safe';
import { makeZip } from '@/lib/zip';
import type { FilterKey, FormatKey, Layer, PillarKey, Project, StickerKind, StickerProps } from '@/lib/types';
import { FORMATS } from '@/lib/types';
import { newPage, type Asset, type AssetCategory, type WeekItem, type WeekPlan } from '@/store/studio';

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Plan editorial base de la semana. */
export const WEEK_SLOTS: { pillar: PillarKey; format: FormatKey | 'carousel' }[] = [
  { pillar: 'claridad', format: 'story' },
  { pillar: 'complicidad', format: 'reel' },
  { pillar: 'experiencia', format: 'carousel' },
  { pillar: 'calidad', format: 'feed45' },
  { pillar: 'complicidad', format: 'story' },
  { pillar: 'experiencia', format: 'reel' },
  { pillar: 'calidad', format: 'story' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Lunes de la semana próxima (o de esta, si hoy es lunes). */
export function nextMonday(from = new Date()) {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const add = (8 - d.getDay()) % 7;
  d.setDate(d.getDate() + add);
  return iso(d);
}

export const addDays = (isoDate: string, n: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const PILLAR_BG: Record<PillarKey, AssetCategory[]> = {
  experiencia: ['suite', 'jacuzzi'],
  complicidad: ['suite', 'confort'],
  calidad: ['bar', 'confort'],
  claridad: ['suite', 'confort'],
};

const PILLAR_FILTER: Record<PillarKey, FilterKey> = {
  experiencia: 'magenta',
  complicidad: 'magenta',
  calidad: 'amber',
  claridad: 'cyan',
};

const HOUR: Record<WeekItem['format'], string> = { story: '21:30', reel: '22:00', feed45: '20:30', feed11: '20:30', carousel: '20:30' };

function layer(kind: StickerKind, props: Partial<StickerProps>, x: number, y: number, scale?: number, rotation?: number): Layer {
  const spec = kindSpec(kind);
  return {
    id: uid('ly_'),
    props: { kind, ...spec.defaults, ...props } as StickerProps,
    x,
    y,
    scale: scale ?? spec.scale ?? 1,
    rotation: rotation ?? spec.rotation ?? 0,
    opacity: 1,
  };
}

/** Frase de sello acorde al pilar, rotando por día. */
const stampPhrase = (pillar: PillarKey, i: number) => {
  const pool = PHRASES.filter((p) => p.pillar === pillar && p.kinds.includes('stamp'));
  return (pool[i % Math.max(1, pool.length)] ?? PHRASES[0]).text;
};

const shortCta = (pillar: PillarKey) => (pillar === 'claridad' ? 'Sin reservas. Llegás y listo' : pillar === 'calidad' ? 'Pedilo a la habitación' : 'Consultas por DM');

/** Composición automática de una pieza a partir del copy: titular + sello/placa + CTA + isotipo. */
export function buildWeekProject(item: WeekItem, index: number, assets: Asset[]): Project {
  const format: FormatKey = item.format === 'carousel' ? 'feed45' : item.format;
  const { w: fw, h: H } = FORMATS[format];
  const accent = PILLARS[item.pillar].accent;
  const span = item.format === 'carousel' ? 3 : 1;
  const page = newPage(span);
  // fondo desde la Galería GEA según el pilar (fotos primero)
  const cats = PILLAR_BG[item.pillar];
  const pool = assets.filter((a) => cats.includes(a.category)).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'image' ? -1 : 1));
  const bg = pool.length ? pool[index % pool.length] : undefined;
  page.background = {
    ...page.background,
    filter: PILLAR_FILTER[item.pillar],
    intensity: bg ? 0.55 : 0.7,
    ...(bg ? { kind: bg.kind, mediaId: bg.mediaId, mediaName: bg.name } : {}),
  };
  const hook = { text: item.piece.hook, accent, style: 'neon' as const, font: 'body' as const };
  const L: Layer[] = [];
  if (format === 'story' || format === 'reel') {
    const info = item.pillar === 'claridad' ? 'rates' : item.pillar === 'calidad' && index % 2 === 0 ? 'menu' : null;
    L.push(layer('logo', { style: 'neon', sub: 'SUITES', accent }, fw / 2, 360, 0.45));
    if (info) {
      L.push(layer('text', hook, fw / 2, 540, 0.75));
      L.push(layer(info, { accent, style: 'glass' }, fw / 2, 1050, info === 'menu' ? 0.85 : 0.95));
    } else {
      L.push(layer('text', hook, fw / 2, 700, 0.9));
      L.push(layer('stamp', { text: stampPhrase(item.pillar, index), accent }, fw / 2, 1110, 0.95, -8));
      L.push(layer('pill', { text: shortCta(item.pillar), accent, style: 'glass' }, fw / 2, 1460, 0.95));
    }
  } else if (span === 3) {
    // carrusel continuo: gancho → sello cruzando la costura → cierre con tarjeta y CTA
    L.push(layer('text', hook, fw * 0.5, H * 0.42, 0.95));
    L.push(layer('pill', { text: 'Deslizá →', accent, style: 'glass' }, fw * 0.5, H * 0.78, 0.9));
    L.push(layer('stamp', { text: stampPhrase(item.pillar, index), accent }, fw * 1.5, H * 0.5, 1.15, -8));
    L.push(layer('vip', { accent, style: 'solid' }, fw * 2.5, H * 0.45, 1.05, -5));
    L.push(layer('pill', { text: shortCta(item.pillar), accent, style: 'glass' }, fw * 2.5, H * 0.78, 0.95));
  } else {
    L.push(layer('text', hook, fw / 2, H * 0.3, 0.95));
    if (item.pillar === 'calidad') L.push(layer('menu', { accent, style: 'glass' }, fw / 2, H * 0.68, 0.62));
    else L.push(layer('stamp', { text: stampPhrase(item.pillar, index), accent }, fw * 0.66, H * 0.68, 0.85, -10));
  }
  // nada debajo de la interfaz de Instagram
  page.layers = L;
  const conflicts = findConflicts(page, format);
  page.layers = L.map((l) => (conflicts.has(l.id) ? { ...l, ...fitIntoSafe(l, format, span) } : l));
  const now = Date.now();
  const d = new Date(`${item.date}T12:00:00`);
  const fmtName = item.format === 'carousel' ? 'Carrusel' : FORMATS[format].short;
  return {
    id: uid('pr_'),
    name: `${DAYS[index].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1} · ${fmtName} · ${PILLARS[item.pillar].short}`,
    format,
    pages: [page],
    createdAt: now,
    updatedAt: now,
    scheduledAt: `${item.date}T${HOUR[item.format]}`,
    status: 'borrador',
    pillar: item.pillar,
    copy: item.piece,
  };
}

/**
 * ZIP de la semana: un PNG por slide (1080×1920 / 1080×1350), el caption de cada día en .txt
 * y un plan.csv con fecha, hora, formato, pilar y gancho.
 */
export async function weekZip(week: WeekPlan, projects: Project[], onProgress?: (done: number, total: number) => void) {
  const folder = `gea-semana-${week.start}`;
  const entries: { name: string; data: Blob | string }[] = [];
  const csv = ['dia,fecha,hora,formato,pilar,archivos,gancho'];
  const items = week.items.filter((it) => projects.some((p) => p.id === it.projectId));
  let done = 0;
  for (const [i, it] of week.items.entries()) {
    const p = projects.find((x) => x.id === it.projectId);
    if (!p) continue;
    const base = `${String(i + 1).padStart(2, '0')}-${slug(it.day)}-${it.format === 'carousel' ? 'carrusel' : p.format}`;
    let n = 1;
    const files: string[] = [];
    for (const pg of p.pages) {
      const media = await loadMediaElement(pg.background);
      for (const f of await exportPage(pg, p.format, media, base, n)) {
        entries.push({ name: `${folder}/${f.name}`, data: f.blob });
        files.push(f.name);
      }
      n += pg.span;
    }
    const copy = p.copy ?? it.piece;
    entries.push({ name: `${folder}/${base}-caption.txt`, data: captionText(copy) });
    const hour = p.scheduledAt?.slice(11, 16) ?? '';
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    csv.push([it.day, it.date, hour, it.format, PILLARS[it.pillar].short, files.join(' | '), q(copy.hook)].map(String).join(','));
    onProgress?.(++done, items.length);
  }
  entries.push({ name: `${folder}/plan.csv`, data: '﻿' + csv.join('\n') });
  return { blob: await makeZip(entries), name: `${folder}.zip` };
}
