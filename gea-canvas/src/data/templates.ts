/** Composiciones rápidas: combinaciones probadas de overlays, posicionadas en zonas seguras. */
import type { FormatKey, StickerKind, StickerProps } from '@/lib/types';

export interface TemplateItem {
  kind: StickerKind;
  props?: Partial<StickerProps>;
  /** Posición relativa (0..1) sobre el ancho total y el alto. */
  fx: number;
  fy: number;
  scale?: number;
  rotation?: number;
  /** Pegado a un borde (pestañas). inset = mitad del ancho del sticker escalado. */
  side?: 'left' | 'right';
  inset?: number;
}

export interface Template {
  id: string;
  name: string;
  desc: string;
  formats: FormatKey[];
  items: TemplateItem[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'story-sello',
    name: 'Story · Sello + píldora',
    desc: 'Sello neón arriba del centro y píldora de CTA sobre la zona de respuestas.',
    formats: ['story', 'reel'],
    items: [
      { kind: 'logo', props: { style: 'neon', sub: 'SUITES' }, fx: 0.5, fy: 0.18, scale: 0.55 },
      { kind: 'stamp', fx: 0.5, fy: 0.47, scale: 1.25, rotation: -8 },
      { kind: 'pill', props: { text: 'Sin reservas. Llegás y listo', style: 'glass' }, fx: 0.5, fy: 0.76, scale: 1 },
    ],
  },
  {
    id: 'story-fecha',
    name: 'Story · Fecha especial',
    desc: 'Ticket de fecha inclinado + tag de regalo.',
    formats: ['story', 'reel'],
    items: [
      { kind: 'ticket', fx: 0.5, fy: 0.36, scale: 1.15, rotation: -7 },
      { kind: 'tag', fx: 0.68, fy: 0.62, scale: 0.85, rotation: 9 },
    ],
  },
  {
    id: 'story-vuelta',
    name: 'Story · Cinta + pestaña',
    desc: 'Cinta diagonal cruzando y pestaña lateral derecha.',
    formats: ['story', 'reel'],
    items: [
      { kind: 'sash', fx: 0.5, fy: 0.3, scale: 1.1, rotation: -14 },
      { kind: 'tab', fx: 1, fy: 0.55, side: 'right', inset: 88 },
      { kind: 'logo', props: { style: 'neon', sub: '' }, fx: 0.5, fy: 0.78, scale: 0.4 },
    ],
  },
  {
    id: 'feed-vip',
    name: 'Feed · Club GEA',
    desc: 'Tarjeta VIP protagonista + isotipo en vidrio.',
    formats: ['feed45', 'feed11'],
    items: [
      { kind: 'vip', fx: 0.5, fy: 0.5, scale: 1.25, rotation: -6 },
      { kind: 'pill', props: { text: 'Consultas por DM', style: 'glass' }, fx: 0.5, fy: 0.86, scale: 0.9 },
    ],
  },
  {
    id: 'feed-info',
    name: 'Feed · Info clara',
    desc: 'Titular + tres píldoras de modalidad.',
    formats: ['feed45', 'feed11', 'story'],
    items: [
      { kind: 'text', props: { text: '¿Un rato o toda la noche?', style: 'neon', font: 'body' }, fx: 0.5, fy: 0.28, scale: 0.9 },
      { kind: 'pill', props: { text: 'Turno estándar', style: 'glass' }, fx: 0.5, fy: 0.48, scale: 1 },
      { kind: 'pill', props: { text: 'Turno extendido', style: 'glass' }, fx: 0.5, fy: 0.57, scale: 1 },
      { kind: 'pill', props: { text: 'Pernocte', style: 'glass' }, fx: 0.5, fy: 0.66, scale: 1 },
      { kind: 'logo', props: { style: 'solid', sub: 'ABIERTO 24 HS' }, fx: 0.5, fy: 0.84, scale: 0.45 },
    ],
  },
  {
    id: 'feed-sello',
    name: 'Feed · Sello de esquina',
    desc: 'Sello neón en la esquina inferior derecha.',
    formats: ['feed45', 'feed11'],
    items: [{ kind: 'stamp', fx: 0.72, fy: 0.72, scale: 0.85, rotation: -10 }],
  },
];
