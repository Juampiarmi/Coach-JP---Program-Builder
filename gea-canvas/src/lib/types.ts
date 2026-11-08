import type { AccentKey } from '@/brand/tokens';

export type FormatKey = 'story' | 'reel' | 'feed45' | 'feed11';

export interface FormatSpec {
  key: FormatKey;
  label: string;
  short: string;
  w: number;
  h: number;
  ratio: string;
}

export const FORMATS: Record<FormatKey, FormatSpec> = {
  story: { key: 'story', label: 'Story', short: 'Story', w: 1080, h: 1920, ratio: '9:16' },
  reel: { key: 'reel', label: 'Reel (portada)', short: 'Reel', w: 1080, h: 1920, ratio: '9:16' },
  feed45: { key: 'feed45', label: 'Feed vertical', short: 'Feed 4:5', w: 1080, h: 1350, ratio: '4:5' },
  feed11: { key: 'feed11', label: 'Feed cuadrado', short: 'Feed 1:1', w: 1080, h: 1080, ratio: '1:1' },
};

export type StickerKind = 'stamp' | 'ticket' | 'sash' | 'tag' | 'pill' | 'vip' | 'tab' | 'logo' | 'text';
export type StickerStyle = 'neon' | 'glass' | 'paper' | 'solid';
export type TextFont = 'display' | 'body' | 'tech';

export interface StickerProps {
  kind: StickerKind;
  /** Frase principal. */
  text: string;
  /** Texto secundario (arco inferior del sello, fecha del ticket, línea de socio…). */
  sub?: string;
  /** Texto terciario (arco superior, encabezado). */
  meta?: string;
  accent: AccentKey;
  style: StickerStyle;
  /** Pestaña lateral: borde al que se pega. */
  side?: 'left' | 'right';
  /** Texto libre: familia tipográfica. */
  font?: TextFont;
}

export interface Layer {
  id: string;
  props: StickerProps;
  /** Centro en coordenadas del documento (px a 1080 de ancho por slide). */
  x: number;
  y: number;
  scale: number;
  /** Grados. */
  rotation: number;
  opacity: number;
  hidden?: boolean;
  locked?: boolean;
}

export type FilterKey = 'none' | 'magenta' | 'cyan' | 'amber' | 'dark';

export interface Background {
  kind: 'none' | 'image' | 'video';
  mediaId?: string;
  mediaName?: string;
  /** Zoom sobre el encuadre "cover". 1 = cover exacto. */
  zoom: number;
  /** Desplazamiento del encuadre, -1..1 sobre el excedente disponible. */
  offsetX: number;
  offsetY: number;
  filter: FilterKey;
  /** 0..1 */
  intensity: number;
  /** Color de fondo cuando no hay media. */
  solid: string;
}

export interface Page {
  id: string;
  /** Cantidad de slides que ocupa (carrusel continuo = span > 1, se exporta en cortes de 1080). */
  span: number;
  background: Background;
  layers: Layer[];
}

export interface CopyPiece {
  objective: string;
  visual: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  pillar: PillarKey;
  tone: ToneKey;
  format: FormatKey | 'carousel';
}

export type PillarKey = 'experiencia' | 'complicidad' | 'calidad' | 'claridad';
export type ToneKey = 'sofisticado' | 'sugerente' | 'complice' | 'directo';

export interface Project {
  id: string;
  name: string;
  format: FormatKey;
  pages: Page[];
  createdAt: number;
  updatedAt: number;
  /** ISO local "YYYY-MM-DDTHH:mm" para el calendario de publicación. */
  scheduledAt?: string;
  status: 'borrador' | 'listo' | 'publicado';
  pillar?: PillarKey;
  copy?: CopyPiece;
  /** Miniatura JPEG chica (dataURL) para la biblioteca. */
  thumb?: string;
}

export const docSize = (format: FormatKey, span = 1) => ({
  w: FORMATS[format].w * span,
  h: FORMATS[format].h,
});
