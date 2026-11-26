import { FOOD_BY_ID } from './foods';
import type { MealRole, Sex } from './types';

/**
 * TABLA ÚNICA DE TOPES POR TOMA (en cocido). Es la única fuente de porciones máximas de todo el sistema:
 * banco de planes, cierre del día (balance), opciones alternativas y swaps. Ningún escalado puede superar `max`.
 *  · Carnes, pollo y pescado según sexo: en almuerzo y cena mujer 120-160 g, hombre 150-220 g (merluza un poco más).
 *  · Yogur (natural, griego o proteico): 1 pote estándar, 200 g. Nunca queda un cuarto de pote abierto.
 *  · Si un atleta necesita más energía, el plan suma densidad (aceite, palta, frutos secos, pan / arroz) o una
 *    colación extra: nunca agranda un lácteo o una verdura hasta volverla incomible.
 */
export interface Range {
  min: number;
  max: number;
}
export interface CapCtx {
  /** Protocolo Keto / Low Carb: las grasas saludables cubren la energía (topes de grasa más amplios por toma). */
  diet?: 'keto' | 'lowcarb';
  sex?: Sex;
  role?: MealRole;
  /** Plan vegetariano: legumbres hasta 300 g (son la base proteica). */
  veg?: boolean;
}

type SexRange = { F: [number, number]; M: [number, number] };
const both = (lo: number, hi: number): SexRange => ({ F: [lo, hi], M: [lo, hi] });
const bySex = (f: [number, number], m: [number, number]): SexRange => ({ F: f, M: m });

// Mujer: platos más chicos y livianos (le cuesta el volumen sólido y no quiere llegar pesada a entrenar); la energía
// extra sale de densidad limpia (miel, membrillo, frutos secos, palta, aceite), no de agrandar el plato.
// Hombre: platos contundentes pero cómodos (nada de 400 g de papa + 250 g de carne + 300 g de ensalada juntos).
const MEAT = bySex([80, 160], [130, 220]);
const STARCH = bySex([100, 200], [150, 300]);
const TUBER = bySex([120, 250], [200, 350]);
const BREAD = bySex([25, 90], [25, 120]);
const YOGURT = bySex([120, 200], [150, 200]);
const MILK = bySex([200, 250], [200, 300]);

export const PORTION_CAPS: Record<string, SexRange> = {
  // Proteínas (almuerzo / cena)
  pollo: MEAT,
  cuadril: MEAT,
  lomo: MEAT,
  nalga: MEAT,
  cerdo: MEAT,
  merluza: bySex([100, 200], [150, 250]),
  atun: bySex([60, 120], [60, 240]),
  picada: bySex([80, 150], [130, 190]),
  tofu: bySex([80, 160], [100, 200]),
  'soja-texturizada': bySex([80, 160], [100, 200]),
  jamon: both(20, 60),
  // Huevos (huevos + claras ≤ 8 unidades por toma)
  huevo: bySex([60, 180], [60, 240]),
  claras: bySex([66, 132], [66, 198]),
  // Lácteos
  yogur: YOGURT,
  'yogur-proteico': YOGURT,
  'yogur-deslactosado': YOGURT,
  leche: MILK,
  'leche-deslactosada': MILK,
  'bebida-soja': MILK,
  'bebida-almendra': MILK,
  'yogur-vegetal': YOGURT,
  'proteina-vegetal': both(20, 40),
  untable: both(15, 40),
  'queso-light': both(30, 60),
  ricota: bySex([50, 120], [50, 150]),
  'untable-deslactosado': both(15, 40),
  'queso-deslactosado': both(30, 60),
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
  lentejas: bySex([100, 200], [120, 250]),
  garbanzos: bySex([100, 200], [120, 250]),
  porotos: bySex([100, 200], [120, 250]),
  // Recetario Coach JP
  quinoa: STARCH,
  'fideos-integrales': STARCH,
  'fideos-legumbres': STARCH,
  'tapa-tarta': both(25, 80),
  'tapa-tarta-sin-tacc': both(25, 80),
  'tortillas-maiz': both(30, 90),
  hummus: both(20, 60),
  cottage: YOGURT,
  aceitunas: both(10, 30),
  pasas: both(10, 30),
  almendras: both(10, 30),
  'avena-sin-tacc': bySex([30, 60], [40, 80]),
  'granola-sin-tacc': both(20, 40),
  pera: both(90, 300),
  kiwi: both(75, 225),
  arandanos: both(50, 200),
  // Frutas (hasta 2 unidades)
  banana: both(60, 240),
  manzana: both(90, 300),
  naranja: both(75, 300),
  frutillas: both(100, 300),
  // Verduras
  vegetales: bySex([100, 220], [150, 250]),
  // Grasas
  oliva: both(5, 15),
  palta: both(30, 70),
  nueces: both(10, 30),
  mani: both(10, 30),
  semillas: both(10, 30),
  'cacao-amargo': both(5, 20),
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
  eggs: [60, 240],
  whey: [20, 40],
  'protein-snack': [30, 100],
  starch: [120, 350],
  cereal: [20, 120],
  fruit: [60, 300],
  'sport-carb': [5, 40],
  fat: [5, 30],
  veg: [30, 250],
  plato: [150, 450],
};

/**
 * Piso de carne, pollo y pescado en almuerzo y cena: una porción que se ve en el plato (≥ 120 g mujer, ≥ 150 g
 * hombre, en cocido). Si sobran calorías, se ajustan la guarnición, las grasas o las colaciones, no la carne.
 */
export const MAIN_MEATS = new Set(['pollo', 'cuadril', 'lomo', 'nalga', 'cerdo', 'merluza', 'picada']);
export const MAIN_MEAT_FLOOR: Record<Sex, number> = { F: 120, M: 150 };

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

/** Keto / Low Carb: grasas saludables por toma (mujer, hombre) en g; siguen siendo porciones reales de una comida. */
const DIET_FAT_CAP: Record<string, [number, number]> = { oliva: [35, 50], palta: [160, 200], nueces: [60, 80], almendras: [60, 80], mani: [40, 60], aceitunas: [60, 100], semillas: [30, 40], 'queso-light': [80, 120], untable: [50, 60] };
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
  if (ctx.veg && ['lentejas', 'garbanzos', 'porotos'].includes(foodId)) hi = ctx.sex === 'F' ? 250 : 300;
  if (ctx.diet && DIET_FAT_CAP[foodId]) hi = Math.max(hi, DIET_FAT_CAP[foodId][ctx.sex === 'F' ? 0 : 1]);
  if (MAIN_MEATS.has(foodId) && (ctx.role === 'lunch' || ctx.role === 'dinner')) lo = Math.max(lo, ctx.sex ? MAIN_MEAT_FLOOR[ctx.sex] : MAIN_MEAT_FLOOR.F);
  if ((foodId === 'vegetales' || FOOD_BY_ID[foodId]?.group === 'veg') && ctx.role && SIDE_ROLES.includes(ctx.role)) [lo, hi] = [30, ctx.sex === 'F' ? 120 : 150];
  return { min: lo, max: hi };
}

/** Tope duro absoluto (el mayor entre sexos): lo que la prueba automática verifica en todos los planes. */
export const hardCap = (foodId: string | undefined, sex?: Sex) => portionCap(foodId, { sex }).max;

/**
 * Volumen sólido máximo por toma (g, sin contar leche, bebidas ni yogur bebible): lo que una persona come cómoda.
 * Mujer: almuerzo y cena hasta ~550 g, desayuno 450 g, colaciones 350 g y antes de entrenar 250 g (liviano, sin
 * hinchazón). Hombre: 750 / 600 / 450 / 350 g.
 */
export const MEAL_VOLUME: Record<Sex, { main: number; breakfast: number; snack: number; peri: number }> = {
  F: { main: 550, breakfast: 450, snack: 350, peri: 250 },
  M: { main: 750, breakfast: 600, snack: 450, peri: 350 },
};
const LIQUIDS = new Set(['leche', 'leche-deslactosada', 'bebida-soja', 'bebida-almendra', 'isotonica', 'yogur-proteico']);
export const mealVolumeCap = (sex: Sex, role?: MealRole) => MEAL_VOLUME[sex][role === 'lunch' || role === 'dinner' ? 'main' : role === 'breakfast' ? 'breakfast' : role === 'peri' ? 'peri' : 'snack'];
export const isLiquid = (id?: string) => !!id && LIQUIDS.has(id);
/** Gramos sólidos de una toma (para el tope de volumen). */
export const solidGrams = (g: Record<string, number> | { foodId?: string; grams: number }[]) =>
  Array.isArray(g) ? g.reduce((a, i) => a + (i.foodId && LIQUIDS.has(i.foodId) ? 0 : i.grams), 0) : Object.entries(g).reduce((a, [id, v]) => a + (LIQUIDS.has(id) ? 0 : v), 0);
