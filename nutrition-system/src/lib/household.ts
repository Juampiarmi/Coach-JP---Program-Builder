import { FOOD_BY_ID } from './foods';

/**
 * Medidas caseras en lenguaje cotidiano (singular / plural explícitos, género para "medio" / "media").
 * Se elige la medida más grande que entra al menos una vez (ej. avena: cucharadas hasta 1 taza, después tazas).
 * La misma tabla viaja a la PWA del atleta (D.house) y la usa el runtime con la misma lógica.
 */
export interface Measure {
  g: number;
  one: string;
  many: string;
  /** Femenino: "media taza", "1 taza y media". */
  f?: boolean;
  /** Aclaración después de la cantidad: "2 potes de 180 g". */
  of?: string;
}
const M = (g: number, one: string, many: string, f = false, of = ''): Measure => ({ g, one, many, f, of });

const TAZA_COCIDO = (g: number) => [M(g, 'taza', 'tazas', true, ' (cocido)')];
const BIFE = [M(180, 'bife mediano', 'bifes medianos')];
const POTE = [M(180, 'pote', 'potes', false, ' de 180 g')];
const CDA_SOPERA = [M(15, 'cda sopera', 'cdas soperas', true)];

export const HOUSE: Record<string, Measure[]> = {
  yogur: POTE,
  'yogur-deslactosado': POTE,
  'yogur-proteico': [M(250, 'botellita', 'botellitas', true, ' de 250 ml')],
  ricota: CDA_SOPERA,
  untable: CDA_SOPERA,
  'queso-light': [M(20, 'feta', 'fetas', true)],
  leche: [M(250, 'taza', 'tazas', true)],
  'leche-deslactosada': [M(250, 'taza', 'tazas', true)],
  whey: [M(30, 'scoop', 'scoops')],
  'whey-isolate': [M(30, 'scoop', 'scoops')],
  avena: [M(11, 'cda sopera', 'cdas soperas', true), M(80, 'taza', 'tazas', true)],
  'avena-instantanea': [M(11, 'cda sopera', 'cdas soperas', true), M(80, 'taza', 'tazas', true)],
  'copos-maiz': [M(30, 'taza chica colmada', 'tazas chicas colmadas', true)],
  tutucas: [M(30, 'taza chica colmada', 'tazas chicas colmadas', true)],
  pan: [M(30, 'rebanada', 'rebanadas', true)],
  'pan-lactal': [M(25, 'rebanada', 'rebanadas', true)],
  'galletas-arroz': [M(9, 'galleta', 'galletas', true)],
  'tostadas-arroz': [M(8, 'tostada', 'tostadas', true)],
  'galletitas-agua': [M(6, 'galletita', 'galletitas', true)],
  arroz: TAZA_COCIDO(160),
  yamani: TAZA_COCIDO(160),
  fideos: TAZA_COCIDO(140),
  lentejas: TAZA_COCIDO(170),
  garbanzos: TAZA_COCIDO(170),
  papa: [M(180, 'papa mediana', 'papas medianas', true)],
  batata: [M(200, 'batata mediana', 'batatas medianas', true)],
  pollo: [M(180, 'pechuga mediana', 'pechugas medianas', true)],
  cuadril: BIFE,
  lomo: BIFE,
  nalga: BIFE,
  picada: [M(150, 'taza', 'tazas', true)],
  merluza: [M(150, 'filet mediano', 'filets medianos')],
  cerdo: [M(180, 'bife de bondiola', 'bifes de bondiola')],
  atun: [M(120, 'lata escurrida', 'latas escurridas', true)],
  tofu: [M(100, 'bloque chico', 'bloques chicos')],
  huevo: [M(50, 'huevo', 'huevos')],
  claras: [M(33, 'clara', 'claras', true)],
  banana: [M(120, 'banana mediana', 'bananas medianas', true)],
  manzana: [M(180, 'manzana mediana', 'manzanas medianas', true)],
  frutillas: [M(150, 'taza', 'tazas', true)],
  vegetales: [M(150, 'plato', 'platos', false, ' de ensalada')],
  oliva: [M(5, 'cdita', 'cditas', true), M(13, 'cda', 'cdas', true)],
  palta: [M(20, 'cda colmada', 'cdas colmadas', true), M(40, 'cuarto', 'cuartos', false, ' de palta'), M(160, 'palta mediana', 'paltas medianas', true)],
  nueces: [M(15, 'puñadito', 'puñaditos')],
  mani: [M(16, 'cda', 'cdas', true)],
  miel: [M(7, 'cdita', 'cditas', true), M(20, 'cda', 'cdas', true)],
  'dulce-membrillo': [M(20, 'feta finita', 'fetas finitas', true)],
  isotonica: [M(500, 'botella', 'botellas', true, ' de 500 ml')],
};

/** Mano, puño, palma y pulgar: porciones sin balanza por grupo de alimento. */
export const HAND: Record<string, Measure> = {
  'lean-protein': M(110, 'palma', 'palmas', true, ' de la mano'),
  starch: M(150, 'puño', 'puños'),
  fruit: M(150, 'puño', 'puños'),
  veg: M(100, 'puño', 'puños'),
  cereal: M(30, 'mano ahuecada', 'manos ahuecadas', true),
  fat: M(15, 'pulgar', 'pulgares'),
  'dairy-protein': M(180, 'pote', 'potes', false, ' de 180 g'),
};

/** Cantidad en lenguaje cotidiano: "medio pote", "1 papa mediana y media", "2 potes de 180 g", "13 cdas soperas". */
export function humanQty(q: number, m: Measure) {
  const h = q >= 3 ? Math.round(q) : Math.round(q * 2) / 2;
  const half = m.f ? 'media' : 'medio';
  const of = m.of ?? '';
  if (h <= 0.5) return `${half} ${m.one}${of}`;
  if (h === 1) return `1 ${m.one}${of}`;
  if (h === 1.5) return `1 ${m.one} y ${half}${of}`;
  if (h % 1) return `${Math.floor(h)} ${m.many} y ${half}${of}`;
  return `${h} ${m.many}${of}`;
}

/** Elige la medida: la más grande que entra al menos 1 vez (si ninguna, la más chica). */
export function pickMeasure(list: Measure[], grams: number) {
  const fit = list.filter((m) => grams / m.g >= 0.95);
  return fit.length ? fit[fit.length - 1] : list[0];
}

const PLURAL: [RegExp, string][] = [
  [/ón\b/, 'ones'],
  [/d\b/, 'des'],
  [/([aeiou])\b/, '$1s'],
];
/** Plural de la primera palabra de una unidad de porción ("porción (1/8)" → "porciones (1/8)"). */
function pluralFirst(label: string) {
  const [w, ...rest] = label.split(' ');
  let p = w;
  for (const [re, to] of PLURAL)
    if (re.test(w)) {
      p = w.replace(re, to);
      break;
    }
  if (p === w && !/s$/.test(w)) p = `${w}s`;
  return [p, ...rest].join(' ');
}

/** Medida casera para un alimento / plato: "≈ 2 potes de 180 g", "≈ 1 bife mediano", "≈ 2 unidades". */
export function houseMeasure(foodId: string | undefined, grams: number) {
  if (!foodId || !(grams > 0)) return '';
  const list = HOUSE[foodId];
  if (list) return `≈ ${humanQty(grams / pickMeasure(list, grams).g, pickMeasure(list, grams))}`;
  const ref = FOOD_BY_ID[foodId];
  if (!ref?.unit) return '';
  // Unidades del catálogo con número adelante ("2 unidades" de 300 g) se cuentan de a una.
  const mm = /^(\d+)\s+(.+)$/.exec(ref.unit.label);
  const label = mm ? mm[2] : ref.unit.label;
  const per = mm ? ref.unit.grams / Number(mm[1]) : ref.unit.grams;
  if (/^\d|\//.test(label)) return '';
  const one = mm ? label.replace(/ones\b/, 'ón').replace(/(unidad)es\b/, '$1').replace(/([^s])s\b/, '$1') : label;
  return `≈ ${humanQty(grams / per, { g: per, one, many: pluralFirst(one), f: /^(porción|unidad|taza|copa|pinta|brochette)/.test(one) })}`;
}

/** Porción sin balanza (mano / puño / palma / pulgar) o, si el alimento tiene medida propia, esa. */
export function handMeasure(foodId: string | undefined, grams: number) {
  if (!foodId || !(grams > 0)) return '';
  const ref = FOOD_BY_ID[foodId];
  const hand = ref && HAND[ref.group];
  if (hand && ref.group !== 'dairy-protein' && !HOUSE[foodId]?.some((m) => /scoop|huevo|clara|galleta|tostada|rebanada|cda|cdita|feta|botell|pote/.test(m.one))) return humanQty(grams / hand.g, hand);
  return houseMeasure(foodId, grams).replace(/^≈ /, '');
}
