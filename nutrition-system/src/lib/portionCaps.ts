import { FOOD_BY_ID } from './foods';
import type { MealRole, Sex } from './types';

/**
 * TABLA ÚNICA DE TOPES POR TOMA (en cocido). Es la única fuente de porciones máximas de todo el sistema:
 * banco de planes, cierre del día (balance), opciones alternativas y swaps. Ningún escalado puede superar `max`.
 *  · Carnes, pollo y pescado según sexo: mujer 120-180 g, hombre 150-240 g (merluza un poco más).
 *  · Yogur (natural, griego o proteico): 1 pote estándar, 200 g. Nunca queda un cuarto de pote abierto.
 *  · Si un atleta necesita más energía, el plan suma densidad (aceite, palta, frutos secos, pan / arroz) o una
 *    colación extra: nunca agranda un lácteo o una verdura hasta volverla incomible.
 */
export interface Range {
  min: number;
  max: number;
}
export interface CapCtx {
  sex?: Sex;
  role?: MealRole;
  /** Plan vegetariano: legumbres hasta 300 g (son la base proteica). */
  veg?: boolean;
}

type SexRange = { F: [number, number]; M: [number, number] };
const both = (lo: number, hi: number): SexRange => ({ F: [lo, hi], M: [lo, hi] });
const bySex = (f: [number, number], m: [number, number]): SexRange => ({ F: f, M: m });

const MEAT = bySex([120, 180], [150, 240]);
const STARCH = bySex([120, 250], [150, 350]);
const TUBER = bySex([150, 300], [200, 400]);
const BREAD = bySex([25, 90], [25, 120]);
const YOGURT = both(150, 200);
const MILK = both(200, 300);

export const PORTION_CAPS: Record<string, SexRange> = {
  // Proteínas (almuerzo / cena)
  pollo: MEAT,
  cuadril: MEAT,
  lomo: MEAT,
  nalga: MEAT,
  cerdo: MEAT,
  merluza: bySex([150, 200], [180, 260]),
  atun: bySex([60, 120], [60, 240]),
  picada: bySex([100, 140], [130, 180]),
  tofu: both(100, 200),
  'soja-texturizada': both(100, 200),
  jamon: both(20, 60),
  // Huevos (huevos + claras ≤ 8 unidades por toma)
  huevo: bySex([50, 150], [50, 200]),
  claras: both(66, 198),
  // Lácteos
  yogur: YOGURT,
  'yogur-proteico': YOGURT,
  'yogur-deslactosado': YOGURT,
  leche: MILK,
  'leche-deslactosada': MILK,
  untable: both(15, 40),
  'queso-light': both(30, 60),
  ricota: both(50, 150),
  whey: both(20, 40),
  'whey-isolate': both(20, 40),
  // Cereales y panes
  avena: bySex([30, 60], [40, 80]),
  'avena-instantanea': bySex([30, 60], [40, 80]),
  granola: both(20, 40),
  pan: BREAD,
  'pan-lactal': BREAD,
  'pan-sin-tacc': BREAD,
  'pan-arabe': both(60, 120),
  'galletas-arroz': both(18, 54),
  'tostadas-arroz': both(16, 48),
  'galletitas-agua': both(18, 48),
  tutucas: both(20, 45),
  'copos-maiz': both(20, 45),
  'harina-arroz': both(20, 60),
  'pan-rallado': both(10, 30),
  // Almidones (cocidos)
  arroz: STARCH,
  yamani: STARCH,
  fideos: STARCH,
  'fideos-sin-tacc': STARCH,
  noquis: STARCH,
  papa: TUBER,
  batata: TUBER,
  calabaza: TUBER,
  polenta: TUBER,
  lentejas: both(120, 250),
  garbanzos: both(120, 250),
  porotos: both(120, 250),
  // Frutas (hasta 2 unidades)
  banana: both(60, 240),
  manzana: both(90, 300),
  naranja: both(75, 300),
  frutillas: both(100, 300),
  // Verduras
  vegetales: both(150, 300),
  // Grasas
  oliva: both(5, 15),
  palta: both(30, 70),
  nueces: both(10, 30),
  mani: both(10, 30),
  // Carbos de rápida absorción
  miel: both(5, 20),
  'dulce-membrillo': both(5, 20),
  isotonica: both(250, 500),
  'barrita-cereal': both(23, 46),
  // Snacks proteicos (1 unidad)
  'alfajor-proteico': both(50, 50),
  'barra-proteica': both(46, 46),
};

/** Tope por grupo para alimentos personalizados del coach (marcas propias, platos de la Food & Brand DB). */
const GROUP_CAPS: Record<string, [number, number]> = {
  'lean-protein': [100, 240],
  'dairy-protein': [30, 200],
  eggs: [50, 200],
  whey: [20, 40],
  'protein-snack': [30, 100],
  starch: [120, 350],
  cereal: [20, 120],
  fruit: [60, 300],
  'sport-carb': [5, 40],
  fat: [5, 30],
  veg: [100, 300],
  plato: [150, 450],
};

/** Verduras en desayuno / merienda: acompañan (tomate en la tostada), no son un plato. */
const SIDE_ROLES: MealRole[] = ['breakfast', 'snack', 'peri', 'post'];

// Sexo del atleta que se está calculando (lo fijan el cierre del día y las alternativas con withCapSex).
let activeSex: Sex | undefined;
export function withCapSex<T>(sex: Sex | undefined, fn: () => T): T {
  const prev = activeSex;
  activeSex = sex;
  try {
    return fn();
  } finally {
    activeSex = prev;
  }
}

export function portionCap(foodId: string | undefined, ctx: CapCtx = {}): Range {
  if (!foodId) return { min: 0, max: Infinity };
  ctx = { ...ctx, sex: ctx.sex ?? activeSex };
  const row = PORTION_CAPS[foodId];
  let lo: number, hi: number;
  if (row) {
    // Sin sexo conocido: el rango más amplio (igual nunca supera el tope duro del hombre).
    [lo, hi] = ctx.sex ? row[ctx.sex] : [Math.min(row.F[0], row.M[0]), Math.max(row.F[1], row.M[1])];
  } else {
    const g = FOOD_BY_ID[foodId]?.group;
    [lo, hi] = (g && GROUP_CAPS[g]) || [5, 450];
  }
  if (ctx.veg && ['lentejas', 'garbanzos', 'porotos'].includes(foodId)) hi = 300;
  if (foodId === 'vegetales' && ctx.role && SIDE_ROLES.includes(ctx.role)) [lo, hi] = [30, 150];
  return { min: lo, max: hi };
}

/** Tope duro absoluto (el mayor entre sexos): lo que la prueba automática verifica en todos los planes. */
export const hardCap = (foodId: string | undefined, sex?: Sex) => portionCap(foodId, { sex }).max;
