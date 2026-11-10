/** Biblioteca de formatos de overlay y frases neón de Hotel GEA. */
import type { AccentKey } from '@/brand/tokens';
import type { PillarKey, StickerKind, StickerProps, StickerStyle } from '@/lib/types';

export const PILLARS: Record<PillarKey, { name: string; short: string; desc: string; accent: AccentKey }> = {
  experiencia: {
    name: 'Experiencia & Atmósfera',
    short: 'Atmósfera',
    desc: 'Ambientación, luz neón, confort, jacuzzi, amenities.',
    accent: 'pink',
  },
  complicidad: {
    name: 'Complicidad & Ocasión',
    short: 'Complicidad',
    desc: 'Romper la rutina, escapadas, celebraciones, guiños de calendario.',
    accent: 'magenta',
  },
  calidad: {
    name: 'Calidad & Servicio 24 hs',
    short: 'Servicio 24 hs',
    desc: 'Carta de tragos, snackería, privacidad total, atención rápida.',
    accent: 'amber',
  },
  claridad: {
    name: 'Claridad de Información',
    short: 'Información',
    desc: 'Turnos, pernoctes, horarios y medios de pago.',
    accent: 'cyan',
  },
};

export interface KindSpec {
  kind: StickerKind;
  name: string;
  hint: string;
  styles: StickerStyle[];
  defaults: Omit<StickerProps, 'kind' | 'text'> & { text: string };
  /** Rotación sugerida al insertar. */
  rotation?: number;
  scale?: number;
  /** Etiquetas de los campos secundarios en el inspector. */
  fields: { sub?: string; meta?: string; items?: { title: string; label: string; detail: string; price: string; max: number } };
}

export const KINDS: KindSpec[] = [
  {
    kind: 'stamp',
    name: 'Sello neón',
    hint: 'Anillo con glow, isotipo, SUITES arqueado y frase al centro.',
    styles: ['neon', 'glass', 'paper', 'solid'],
    defaults: { text: 'Acá se sube la temperatura, no el volumen', sub: 'SUITES', meta: 'HOTEL GEA', accent: 'pink', style: 'neon' },
    rotation: -8,
    scale: 1,
    fields: { sub: 'Arco inferior', meta: 'Arco superior' },
  },
  {
    kind: 'ticket',
    name: 'Ticket de fecha',
    hint: 'Entrada impresa con talón de fecha y perforado.',
    styles: ['paper', 'neon', 'glass', 'solid'],
    defaults: { text: 'El 21 ya se sabe cómo se festeja', sub: '21 SEP', meta: 'ADMIT TWO · HOTEL GEA', accent: 'pink', style: 'paper' },
    rotation: -6,
    scale: 1,
    fields: { sub: 'Fecha (día mes)', meta: 'Encabezado' },
  },
  {
    kind: 'sash',
    name: 'Cinta diagonal',
    hint: 'Banda cruzada con cola de golondrina.',
    styles: ['solid', 'neon', 'glass', 'paper'],
    defaults: { text: 'Después de la vuelta al trabajo, esto', accent: 'pink', style: 'solid' },
    rotation: -14,
    scale: 1,
    fields: {},
  },
  {
    kind: 'tag',
    name: 'Tag de regalo',
    hint: 'Etiqueta colgante con hilo y ojal.',
    styles: ['paper', 'neon', 'glass', 'solid'],
    defaults: { text: 'Un regalo que no se envuelve', meta: 'PARA VOS', accent: 'pink', style: 'paper' },
    rotation: 8,
    scale: 0.9,
    fields: { meta: 'Encabezado' },
  },
  {
    kind: 'pill',
    name: 'Píldora',
    hint: 'Cápsula mínima con punto en vivo.',
    styles: ['glass', 'neon', 'solid', 'paper'],
    defaults: { text: 'La foto no se sube, el momento sí', accent: 'pink', style: 'glass' },
    rotation: 0,
    scale: 1,
    fields: {},
  },
  {
    kind: 'vip',
    name: 'Tarjeta VIP',
    hint: 'Credencial Club GEA con chip y guilloché.',
    styles: ['solid', 'glass', 'neon', 'paper'],
    defaults: { text: 'Para los que ya saben dónde volver', sub: 'MIEMBRO · Nº 0021', meta: 'CLUB GEA', accent: 'pink', style: 'solid' },
    rotation: -5,
    scale: 1,
    fields: { sub: 'Línea de socio', meta: 'Nombre del club' },
  },
  {
    kind: 'tab',
    name: 'Pestaña lateral',
    hint: 'Solapa pegada al borde con texto vertical.',
    styles: ['solid', 'glass', 'neon', 'paper'],
    defaults: { text: 'Afuera el frío, adentro otra cosa', accent: 'pink', style: 'solid', side: 'right' },
    rotation: 0,
    scale: 1,
    fields: {},
  },
  {
    kind: 'logo',
    name: 'Isotipo GEA',
    hint: 'Logo oficial en neón, vidrio o placa carbón.',
    styles: ['neon', 'glass', 'solid', 'paper'],
    defaults: { text: '', sub: 'SUITES', accent: 'pink', style: 'neon' },
    rotation: 0,
    scale: 0.8,
    fields: { sub: 'Bajada (vacío = sin bajada)' },
  },
  {
    kind: 'text',
    name: 'Titular',
    hint: 'Texto libre con glow neón o sólido.',
    styles: ['neon', 'solid', 'glass', 'paper'],
    defaults: { text: 'Nadie pregunta. Todos imaginan.', accent: 'pink', style: 'neon', font: 'body' },
    rotation: 0,
    scale: 1,
    fields: { sub: 'Bajada' },
  },
  {
    kind: 'rates',
    name: 'Placa de turnos',
    hint: 'Modalidades de estadía, horarios y medios de pago.',
    styles: ['glass', 'neon', 'solid', 'paper'],
    defaults: {
      text: 'Modalidades',
      meta: 'ABIERTO 24 HS · 365 DÍAS',
      sub: 'Efectivo · Débito · Crédito · QR',
      accent: 'cyan',
      style: 'glass',
      items: [
        { label: 'Turno estándar', detail: '2 horas' },
        { label: 'Turno extendido', detail: '4 horas' },
        { label: 'Pernocte', detail: 'De 22 a 10 h' },
      ],
    },
    rotation: 0,
    scale: 1,
    fields: {
      meta: 'Encabezado',
      sub: 'Medios de pago (separados por ·)',
      items: { title: 'Modalidades', label: 'Modalidad', detail: 'Horario / duración', price: 'Tarifa (opcional)', max: 7 },
    },
  },
  {
    kind: 'menu',
    name: 'Carta de tragos',
    hint: 'Carta elegante de coctelería y snackería con promo destacada.',
    styles: ['glass', 'neon', 'solid', 'paper'],
    defaults: {
      text: 'Carta de coctelería',
      meta: 'SERVICIO A LA HABITACIÓN · 24 HS',
      sub: '2×1 en gin tonic de autor, de domingo a jueves',
      accent: 'amber',
      style: 'glass',
      items: [
        { label: 'Gin tonic de autor', detail: 'Gin, tónica premium, pepino y pimienta rosa' },
        { label: 'Negroni', detail: 'Gin, vermut rosso y Campari, twist de naranja' },
        { label: 'Espumante para dos', detail: 'Botella fría con dos copas' },
        { label: 'Tabla para compartir', detail: 'Quesos, fiambres, frutos secos y pan tostado' },
      ],
    },
    rotation: 0,
    scale: 0.95,
    fields: {
      meta: 'Encabezado',
      sub: 'Promo destacada (vacío = sin promo)',
      items: { title: 'Ítems de la carta', label: 'Nombre', detail: 'Descripción', price: 'Precio (opcional)', max: 8 },
    },
  },
];

export const kindSpec = (k: StickerKind) => KINDS.find((s) => s.kind === k)!;

export interface Phrase {
  text: string;
  kinds: StickerKind[];
  pillar: PillarKey;
  /** Campos secundarios sugeridos. */
  sub?: string;
  meta?: string;
}

/** Frases contundentes, sugerentes y nunca explícitas. */
export const PHRASES: Phrase[] = [
  // ── Sellos (frases cortas, de impacto)
  { text: 'Acá se sube la temperatura, no el volumen', kinds: ['stamp', 'text'], pillar: 'experiencia' },
  { text: 'Dos cuerpos, una sola llave', kinds: ['stamp', 'text', 'pill'], pillar: 'complicidad' },
  { text: 'Nadie pregunta, todos imaginan', kinds: ['stamp', 'text', 'pill'], pillar: 'calidad' },
  { text: 'Lo que empieza con un beso, acá no tiene horario', kinds: ['stamp', 'text'], pillar: 'claridad' },
  { text: 'Todo lo que imaginás, sin que nadie se entere', kinds: ['stamp', 'text'], pillar: 'calidad' },
  { text: 'Acá la ropa estorba, el tiempo no', kinds: ['stamp', 'text'], pillar: 'experiencia' },
  { text: 'La única reserva es la de ustedes dos', kinds: ['stamp', 'pill', 'text'], pillar: 'claridad' },
  { text: 'Luz baja, pulso alto', kinds: ['stamp', 'pill', 'text'], pillar: 'experiencia' },
  { text: 'El celular, en modo avión', kinds: ['stamp', 'pill'], pillar: 'complicidad' },
  { text: 'Lo que pasa adentro, se queda adentro', kinds: ['stamp', 'text'], pillar: 'calidad' },
  // ── Tickets (fechas y ocasiones)
  { text: 'El 21 ya se sabe cómo se festeja', kinds: ['ticket'], pillar: 'complicidad', sub: '21 SEP', meta: 'ADMIT TWO · PRIMAVERA' },
  { text: 'Febrero tiene un día que es nuestro', kinds: ['ticket'], pillar: 'complicidad', sub: '14 FEB', meta: 'ADMIT TWO · HOTEL GEA' },
  { text: 'Aniversario: la cena fue la previa', kinds: ['ticket'], pillar: 'complicidad', sub: '∞ AÑOS', meta: 'ADMIT TWO · ANIVERSARIO' },
  { text: 'Viernes. Entrada para dos, salida sin apuro', kinds: ['ticket'], pillar: 'claridad', sub: 'VIE 23H', meta: 'ADMIT TWO · HOTEL GEA' },
  { text: 'Fin de año: brindemos donde nadie mira', kinds: ['ticket'], pillar: 'complicidad', sub: '31 DIC', meta: 'ADMIT TWO · BRINDIS' },
  // ── Cintas
  { text: 'Después de la vuelta al trabajo, esto', kinds: ['sash'], pillar: 'complicidad' },
  { text: 'Abierto 24 hs · 365 días', kinds: ['sash', 'pill'], pillar: 'claridad' },
  { text: 'Pernocte: la noche entera es suya', kinds: ['sash'], pillar: 'claridad' },
  { text: 'Nuevo en la carta: tragos de autor', kinds: ['sash', 'pill'], pillar: 'calidad' },
  { text: 'Martes también es una ocasión', kinds: ['sash'], pillar: 'complicidad' },
  // ── Tags
  { text: 'Un regalo que no se envuelve', kinds: ['tag'], pillar: 'complicidad', meta: 'PARA VOS' },
  { text: 'Abrir de a dos', kinds: ['tag'], pillar: 'complicidad', meta: 'DE: MÍ · PARA: VOS' },
  { text: 'El mejor plan no entra en una caja', kinds: ['tag'], pillar: 'experiencia', meta: 'SORPRESA' },
  { text: 'Una noche para nosotros', kinds: ['tag'], pillar: 'complicidad', meta: 'ANIVERSARIO' },
  // ── Píldoras
  { text: 'La foto no se sube, el momento sí', kinds: ['pill'], pillar: 'calidad' },
  { text: 'Sin reservas. Llegás y listo', kinds: ['pill'], pillar: 'claridad' },
  { text: 'Ingreso discreto, cochera cubierta', kinds: ['pill'], pillar: 'calidad' },
  { text: 'Pagás como quieras: efectivo, débito, crédito o QR', kinds: ['pill'], pillar: 'claridad' },
  { text: 'Jacuzzi listo, burbujas incluidas', kinds: ['pill'], pillar: 'experiencia' },
  { text: 'Higiene impecable, siempre', kinds: ['pill'], pillar: 'calidad' },
  // ── Tarjetas VIP
  { text: 'Para los que ya saben dónde volver', kinds: ['vip'], pillar: 'complicidad', sub: 'MIEMBRO · Nº 0021', meta: 'CLUB GEA' },
  { text: 'Acceso preferencial a la noche', kinds: ['vip'], pillar: 'calidad', sub: 'MIEMBRO DESDE 2024', meta: 'CLUB GEA' },
  { text: 'Socios de la discreción', kinds: ['vip'], pillar: 'calidad', sub: 'NIVEL · MEDIANOCHE', meta: 'GEA PRIVÉ' },
  // ── Pestañas
  { text: 'Afuera el frío, adentro otra cosa', kinds: ['tab'], pillar: 'experiencia' },
  { text: 'Deslizá: la suite te espera', kinds: ['tab'], pillar: 'experiencia' },
  { text: 'Turnos · Pernoctes · 24 hs', kinds: ['tab'], pillar: 'claridad' },
  { text: 'Pedí tu trago a la habitación', kinds: ['tab'], pillar: 'calidad' },
];

export const phrasesFor = (k: StickerKind) => PHRASES.filter((p) => p.kinds.includes(k));
