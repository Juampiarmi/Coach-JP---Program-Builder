import { FOOD_BY_ID, FOODS, macrosFor, round1, round2, type FoodRef } from './foods';
import { uid } from './seed';
import { dishTitleCase } from './foodBrandDb';
import { fitsSlot } from './mealSlots';
import { MAX_OPTIONS, type FoodItem, type Meal, type MealOption, type MealRole } from './types';

type Tot = { p: number; c: number; f: number; kcal: number };
const totals = (items: FoodItem[]): Tot => {
  const t = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { p: 0, c: 0, f: 0 });
  return { ...t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
};
const short = (n: string) =>
  n
    .replace(/\s*\((cocid[oa]s?|crud[oa]s?|hervid[oa]|escurrido|concentrado)\)/gi, '')
    .replace(/\s*·.*$/, '')
    .trim();
const lower = (n: string) => n.charAt(0).toLowerCase() + n.slice(1);

const ORDER = ['plato', 'lean-protein', 'eggs', 'dairy-protein', 'protein-snack', 'whey', 'starch', 'cereal', 'fruit', 'sport-carb', 'veg', 'fat'];

/** Nombre gastronómico de cada ingrediente dentro del título de un plato (con su cocción típica). */
const CULINARY: Record<string, string> = {
  pollo: 'Pechuga de Pollo a la Plancha',
  cuadril: 'Bife de Cuadril a la Plancha',
  lomo: 'Lomo a la Plancha',
  nalga: 'Nalga a la Plancha',
  picada: 'Carne Picada Salteada',
  merluza: 'Merluza al Horno',
  atun: 'Atún al Natural',
  cerdo: 'Bondiola al Horno',
  tofu: 'Tofu Salteado',
  huevo: 'Huevos Revueltos',
  claras: 'Claras Revueltas',
  arroz: 'Arroz Blanco',
  yamani: 'Arroz Yamaní',
  fideos: 'Fideos al Dente',
  papa: 'Papas al Horno',
  batata: 'Batatas al Horno',
  lentejas: 'Lentejas Salteadas',
  garbanzos: 'Garbanzos Salteados',
  vegetales: 'Ensalada Verde',
  pan: 'Tostadas Integrales',
  'pan-lactal': 'Pan Lactal Integral',
  whey: 'Shake de Whey',
  'whey-isolate': 'Shake de Whey Aislado',
  yogur: 'Yogur Griego',
  palta: 'Palta',
  nueces: 'Nueces',
  mani: 'Pasta de Maní',
};
const culinary = (i: FoodItem) => (i.foodId && CULINARY[i.foodId]) || short(i.food);

/** Nombre de plato real a partir del desglose: "Bife de Cuadril a la Plancha con Papas al Horno y Ensalada Verde". */
export function autoTitle(items: FoodItem[]) {
  const named = items
    .filter((i) => i.grams > 0 && !(i.foodId && ['oliva'].includes(i.foodId)))
    .map((i) => ({ i, g: i.foodId ? (FOOD_BY_ID[i.foodId]?.group ?? 'zz') : 'zz' }))
    .sort((a, b) => (ORDER.indexOf(a.g) + 1 || 99) - (ORDER.indexOf(b.g) + 1 || 99) || b.i.grams - a.i.grams)
    .map((x) => culinary(x.i));
  if (!named.length) return 'Plato del Plan';
  const [head, ...rest] = named;
  if (!rest.length) return dishTitleCase(head);
  const tail = rest.map(lower);
  return dishTitleCase(`${head} con ${tail.length > 1 ? `${tail.slice(0, -1).join(', ')} y ${tail[tail.length - 1]}` : tail[0]}`);
}

const TECH: [RegExp, string][] = [
  [/pollo|pechuga/i, 'pollo a la plancha o al horno con spray de oliva (200 °C, 20-25 min)'],
  [/cuadril|lomo|nalga|peceto|bife|vacun/i, 'carne a la plancha bien caliente 4-5 min por lado, reposo 3 min'],
  [/picada/i, 'carne picada salteada en sartén antiadherente 8-10 min'],
  [/merluza|pescado|atun/i, 'pescado al horno con limón (180 °C, 15 min) o a la plancha'],
  [/cerdo|bondiola/i, 'cerdo al horno 200 °C 30 min o plancha'],
  [/huevo|claras/i, 'huevos revueltos, poché o duros (9 min)'],
  [/arroz/i, 'arroz hervido 15-18 min (primavera: con choclo, arvejas y zanahoria)'],
  [/fideo/i, 'fideos al dente 8-10 min'],
  [/papa|batata/i, 'papa / batata hervida 20 min o al horno en cubos con spray de oliva'],
  [/vegetal|ensalada/i, 'ensalada fresca o vegetales grillados'],
  [/avena|pancake/i, 'avena en bowl o en pancake a la sartén antiadherente'],
];

/** Técnica de cocción rápida + condimentos sugeridos según los ingredientes. */
export function autoTechnique(items: FoodItem[]) {
  const tips: string[] = [];
  for (const it of items) {
    const ref = it.foodId ? FOOD_BY_ID[it.foodId] : undefined;
    if (ref?.technique) tips.push(ref.technique);
    const t = TECH.find(([re]) => re.test(it.food));
    if (t && !tips.includes(t[1])) tips.push(t[1]);
  }
  const base = tips.slice(0, 3).join(' · ');
  // Condimento / saborizante según el tipo de plato (nada de sal y orégano en un licuado).
  return `${base ? `${base.charAt(0).toUpperCase()}${base.slice(1)}. ` : ''}${SEASONING_STEP[flavorOf(items)]}`;
}

// ---------------------------------------------------------------------------------------------
// PREPARACIÓN PASO A PASO (lenguaje simple, tono argentino)
// ---------------------------------------------------------------------------------------------

const n1s = (n: number) => String(Math.round(n * 2) / 2).replace('.', ',');

/** Cantidad legible: "2 huevos", "60 g (≈ 2 rebanadas)", "8 g (≈ ½ cda)". */
export function qtyLabel(foodId: string | undefined, grams: number) {
  const g = Math.round(grams);
  if (foodId === 'huevo') {
    const n = Math.max(1, Math.round(g / 50));
    return `${n} huevo${n > 1 ? 's' : ''}`;
  }
  if (foodId === 'claras') {
    const n = Math.max(1, Math.round(g / 33));
    return `${n} clara${n > 1 ? 's' : ''} (${g} g)`;
  }
  if (foodId === 'oliva') return `${g} g (≈ ${g <= 7 ? '½' : n1s(g / 13)} cda)`;
  const ref = foodId ? FOOD_BY_ID[foodId] : undefined;
  if (ref?.unit && ref.group !== 'plato' && !['leche'].includes(ref.id)) {
    const u = g / ref.unit.grams;
    if (u >= 0.5) return `${g} g (≈ ${n1s(u)} ${ref.unit.label}${u > 1 && !/s$/.test(ref.unit.label) && ref.unit.label.length > 2 ? 's' : ''})`;
  }
  if (foodId === 'leche' || foodId === 'yogur-proteico' || foodId === 'isotonica') return `${g} ml`;
  return `${g} g`;
}

type StepRule = [RegExp, (q: string, name: string) => string];
/** Primer paso de cada ingrediente según lo que es (se busca por id y por nombre). */
const STEP_RULES: StepRule[] = [
  [/^arroz$|arroz blanco/i, (q) => `Hervir el arroz: 1 taza de arroz por 2 de agua con sal, 15-18 min tapado a fuego bajo. Serví ${q} ya cocido.`],
  [/yamani|yamaní/i, (q) => `Hervir el arroz yamaní 35-40 min (1 taza por 2½ de agua). Serví ${q} cocido.`],
  [/fideo/i, (q) => `Hervir los fideos en abundante agua con sal 8-10 min, al dente. Serví ${q} cocidos.`],
  [/^papa|papa \(/i, (q) => `Hervir la papa con cáscara 20 min (o en cubos, mandala al horno a 200 °C por 30 min con spray antiadherente). Serví ${q}.`],
  [/batata/i, (q) => `Mandá la batata al horno en cubos a 200 °C por 30 min (o hervila 20 min). Serví ${q}.`],
  [/lenteja/i, (q) => `Hervir las lentejas 20-25 min (o usá de lata, bien enjuagadas). Serví ${q}.`],
  [/pollo|pechuga/i, (q) => `Cociná ${q} de pechuga de pollo a la plancha o en sartén con spray antiadherente, 5-6 min por lado a fuego medio, hasta que no quede rosada por dentro.`],
  [/cuadril|lomo|nalga|peceto|bife/i, (q, n) => `Poné la plancha o la sartén bien caliente y sellá ${q} de ${lower(short(n))} 3-4 min por lado. Dejala reposar 2 min antes de cortar.`],
  [/picada/i, (q) => `Sarteneá ${q} de carne picada a fuego medio 8-10 min, desarmándola con una cuchara de madera.`],
  [/merluza|pescado/i, (q) => `Mandá al horno ${q} de merluza con limón y sal a 180 °C por 15 min (o a la plancha 3-4 min por lado).`],
  [/atun|atún/i, (q) => `Abrí la lata y escurrí bien ${q} de atún al natural.`],
  [/cerdo|bondiola/i, (q) => `Mandá al horno ${q} de bondiola a 200 °C por 25-30 min (o a la plancha 5 min por lado).`],
  [/^huevo/i, (q) => `Cociná ${q}: revueltos en sartén antiadherente a fuego bajo 2-3 min, o duros (9 min en agua hirviendo).`],
  [/claras/i, (q) => `Batí ${q} con una pizca de sal y cocinalas en sartén con spray antiadherente a fuego medio 2-3 min.`],
  [/whey/i, (q) => `Mezclá ${q} de whey con 250 ml de agua o leche en el shaker y agitá 15 segundos.`],
  [/avena|copos|tutuca|granola/i, (q, n) => `Poné ${q} de ${lower(short(n))} en un bowl (si querés, hidratala 2 min con agua o leche).`],
  [/pan|tostada|galleta/i, (q, n) => `Tostá ${q} de ${lower(short(n))}.`],
  [/leche/i, (q) => `Serví ${q} de leche descremada (fría o tibia).`],
  [/yogur|ricota|untable|queso/i, (q, n) => `Serví ${q} de ${lower(short(n))}.`],
  [/banana|manzana|frutilla|fruta/i, (q, n) => `Lavá y cortá ${q} de ${lower(short(n))}.`],
  [/vegetal|ensalada/i, (q) => `Lavá y cortá ${q} de verduras (lechuga, tomate, zanahoria) para la ensalada, o grillalas 8-10 min.`],
  [/palta/i, (q) => `Cortá ${q} de palta en láminas o pisala con limón y sal.`],
  [/oliva|aceite/i, (q) => `Condimentá al final con ${q} de aceite de oliva en crudo (medilo con la cuchara, no a ojo).`],
  [/nuez|nueces|man[ií]|almendra/i, (q, n) => `Sumá ${q} de ${lower(short(n))} medidos aparte.`],
  [/miel|membrillo|dulce/i, (q, n) => `Sumá ${q} de ${lower(short(n))}.`],
];
// Orden de preparación: primero lo que más tarda (almidón), después la proteína, armado y condimento.
const STEP_ORDER = ['starch', 'plato', 'lean-protein', 'eggs', 'cereal', 'whey', 'dairy-protein', 'protein-snack', 'fruit', 'veg', 'sport-carb', 'fat'];
/** Paso de condimento de versiones anteriores (único para todo, también para licuados y pancakes). */
const LEGACY_CONDIMENT_STEP = 'Condimentá a gusto: sal moderada, pimienta, orégano, pimentón, ajo, perejil o limón.';

// ---------- Condimento / saborizante según el tipo de preparación ----------
export type Flavor = 'sweet' | 'savory' | 'salad';
export const SEASONING_STEP: Record<Flavor, string> = {
  sweet: 'Saborizá a gusto con esencia de vainilla, canela en polvo, edulcorante o cacao amargo.',
  savory: 'Condimentá a gusto con sal moderada, pimienta, provenzal, pimentón o limón.',
  salad: 'Aderezá con el aceite de oliva de la porción, sal, vinagre o limón.',
};
const SAVORY_DISH_CATS = ['minuta', 'tarta', 'parrilla'];
const SAVORY_TEXT = /s[aá]ndwich|tostado\b|wrap|toast|palta|queso (light|cremoso)|pizza|milanesa|empanada|tarta/i;
const SWEET_ADDS = ['miel', 'dulce-membrillo'];

/** Dulce (licuados, shakes, avena, pancakes, yogures), salado (principales, minutas) o ensalada / verduras. */
export function flavorOf(items: FoodItem[], title = ''): Flavor {
  const live = items.filter((i) => i.grams > 0);
  const refs = live.map((i) => (i.foodId ? FOOD_BY_ID[i.foodId] : undefined));
  const groups = refs.map((r) => r?.group ?? 'zz');
  if (groups.some((g) => g === 'lean-protein')) return 'savory';
  // Pancakes, budines, licuados, avena y bowls dulces: aunque lleven huevo o claras.
  if (/pancake|panqueque|bud[ií]n|flan|licuado|shake|batido|avena (cocida|remojada)|overnight|bowl de yogur/i.test(title)) return 'sweet';
  if (groups.some((g) => g === 'eggs')) return 'savory';
  if (refs.some((r) => r?.group === 'plato' && SAVORY_DISH_CATS.includes(r.dishCat ?? '') && !/^ensalada/i.test(r.name))) return 'savory';
  if (/^ensalada|vegetales grillados/i.test(title)) return 'salad';
  if (SAVORY_TEXT.test(`${title} ${live.map((i) => i.food).join(' ')}`)) return 'savory';
  const sweetened = live.some((i) => i.foodId && SWEET_ADDS.includes(i.foodId));
  if (!sweetened && groups.some((g) => g === 'starch')) return 'savory';
  if (live.length && groups.every((g) => g === 'veg' || g === 'fat')) return 'salad';
  if (refs.some((r) => r?.group === 'plato' && /ensalada/i.test(r.name))) return 'salad';
  return 'sweet';
}
const seasoningStep = (items: FoodItem[], title = '') => SEASONING_STEP[flavorOf(items, title)];
const ALL_SEASONING = new Set([LEGACY_CONDIMENT_STEP, ...Object.values(SEASONING_STEP)]);

/** Tips guardados con el condimento genérico de versiones anteriores → condimento según el tipo de plato. */
export function fixTechnique(tech: string | undefined, items: FoodItem[], title = '') {
  return tech?.replace(/Condimentos libres: sal moderada, pimienta, orégano, pimentón, ajo, perejil y limón\./, seasoningStep(items, title));
}

/** Reemplaza el paso de condimento (viejo o desactualizado) por el que corresponde al tipo de plato. */
export function fixSeasoning(steps: string[], items: FoodItem[], title = '') {
  const right = seasoningStep(items, title);
  return steps.map((st) => (ALL_SEASONING.has(st) ? right : st));
}

// ---------- Tiempo de preparación estimado ----------
/** Minutos de cocción / armado de cada alimento base (los platos traen los suyos desde la Food & Brand DB). */
const COOK_MIN: Record<string, number> = {
  yamani: 40, arroz: 18, fideos: 10, papa: 25, batata: 30, lentejas: 25, garbanzos: 25,
  pollo: 12, cuadril: 10, lomo: 7, nalga: 8, picada: 10, merluza: 15, cerdo: 30, tofu: 8,
  huevo: 4, claras: 4, vegetales: 5, avena: 2, pan: 2, 'pan-lactal': 2, palta: 2, atun: 2, whey: 2, 'whey-isolate': 2,
};
/** Estimación: lo que más tarda (se cocina en paralelo) + armado del resto. */
export function prepMinutes(items: FoodItem[]) {
  let max = 0, extra = 0;
  for (const it of items) {
    if (!(it.grams > 0)) continue;
    const ref = it.foodId ? FOOD_BY_ID[it.foodId] : undefined;
    const t = ref?.group === 'plato' ? (ref.prep ?? 15) : ((it.foodId ? COOK_MIN[it.foodId] : undefined) ?? 1);
    max = Math.max(max, t);
    if (t >= 2) extra += 0.75;
  }
  const m = Math.max(3, Math.round(max + Math.min(4, extra)));
  return m <= 10 ? m : Math.round(m / 5) * 5;
}

/** Pasos de un ingrediente suelto o de un plato del catálogo (receta propia). */
function stepsForItem(it: FoodItem): string[] {
  const ref = it.foodId ? FOOD_BY_ID[it.foodId] : undefined;
  if (ref?.group === 'plato') {
    const head = `Porción: ${qtyLabel(it.foodId, it.grams)} de ${short(ref.name)}.`;
    if (ref.steps?.length) return [head, ...ref.steps];
    return [head, ...(ref.technique ? [ref.technique.charAt(0).toUpperCase() + ref.technique.slice(1) + '.'] : [])];
  }
  const rule = STEP_RULES.find(([re]) => re.test(`${it.foodId ?? ''} ${it.food}`.trim()) || re.test(it.food));
  const q = qtyLabel(it.foodId, it.grams);
  return [rule ? rule[1](q, it.food) : `Serví ${q} de ${lower(short(it.food))}.`];
}

/** Preparación paso a paso armada desde los ingredientes (para cualquier persona, sin términos técnicos). */
export function autoSteps(items: FoodItem[], title = ''): string[] {
  const live = items.filter((i) => i.grams > 0);
  const grp = (i: FoodItem) => STEP_ORDER.indexOf((i.foodId && FOOD_BY_ID[i.foodId]?.group) || 'zz') + 1 || 99;
  const out: string[] = [];
  [...live].sort((a, b) => grp(a) - grp(b)).forEach((it) => stepsForItem(it).forEach((st) => !out.includes(st) && out.push(st)));
  if (live.length) out.push(seasoningStep(live, title));
  return out;
}

/** Pasos de una opción: los cargados por el coach / la IA o, si no hay, los automáticos. */
export const optionSteps = (o: { items: FoodItem[]; steps?: string[]; title?: string }) =>
  o.steps?.length ? fixSeasoning(o.steps, o.items, o.title) : autoSteps(o.items, o.title);

// ---------------------------------------------------------------------------------------------
// OPCIONES 2 A 5: platos del catálogo + combinaciones caseras argentinas equivalentes en macros
// ---------------------------------------------------------------------------------------------

const CARB_SIDE: Record<MealRole, string[]> = {
  breakfast: ['pan', 'banana', 'frutillas'],
  snack: ['banana', 'galletas-arroz', 'frutillas'],
  peri: ['banana', 'miel', 'galletas-arroz'],
  post: ['banana', 'arroz'],
  lunch: ['arroz', 'papa', 'pan'],
  dinner: ['arroz', 'papa', 'batata'],
};

function item(foodId: string, grams: number): FoodItem {
  const ref = FOOD_BY_ID[foodId];
  return { id: uid(), foodId, food: ref.name, grams, ...macrosFor(foodId, grams)! };
}

/**
 * Candidatos de plato (Food & Brand DB + recetas del coach) para las alternativas: sólo los de la franja del día
 * (nada de minutas ni parrilla en el desayuno o el pre-entreno) y dentro de la canasta del atleta.
 */
export function dishCandidates(role: MealRole, allowed?: Set<string> | null): FoodRef[] {
  return FOODS.filter(
    (f) =>
      f.group === 'plato' &&
      !f.flex &&
      fitsSlot(f, role) &&
      // Infusiones (mate, café) no son plato de una opción; los postres quedan para la merienda, no para el desayuno.
      !/^(mate|caf[eé]|chocolatada)\b/i.test(f.name) &&
      !(role === 'breakfast' && f.dishCat === 'dulce') &&
      (!allowed || allowed.has(f.id)),
  );
}

/** Todos los ingredientes de la opción respetan la franja del día (y la preferencia del plan, si hay). */
const slotOk = (items: FoodItem[], role: MealRole, accept?: (foodId: string) => boolean) =>
  items.every((i) => !i.foodId || (fitsSlot(FOOD_BY_ID[i.foodId], role) && (!accept || accept(i.foodId))));

/** Parte de una combinación: la proteína (p), el carbo (c) y la grasa (f) se calculan; x = cantidad fija. */
export interface ComboPart {
  id: string;
  r: 'p' | 'c' | 'f' | 'x';
  g?: number;
  max?: number;
  min?: number;
  /** Redondeo en gramos (huevo = 50 → unidades enteras). */
  step?: number;
}
export interface Combo {
  title: string;
  roles: MealRole[];
  parts: ComboPart[];
  /**
   * Pasos con marcadores {id} que se reemplazan por la cantidad calculada. Un tramo entre [corchetes] es opcional:
   * se quita si su ingrediente quedó en 0 g (el resto del paso se mantiene). Un paso sin corchetes cuyo ingrediente
   * no está, se omite.
   */
  steps: string[];
  /** Variante de preferencia (sin lactosa / plant-based): sólo se ofrece cuando el plan tiene ese filtro activo. */
  special?: boolean;
}

const MAIN: MealRole[] = ['lunch', 'dinner'];
const AM: MealRole[] = ['breakfast', 'snack'];
const COMBOS: Combo[] = [
  // ---- Desayuno / merienda ----
  {
    title: 'Tostadas integrales con huevos revueltos y queso untable',
    roles: [...AM, 'post'],
    parts: [{ id: 'huevo', r: 'p', step: 50, min: 50, max: 200 }, { id: 'pan', r: 'c', step: 15, max: 150 }, { id: 'untable', r: 'x', g: 30 }],
    steps: ['Batí {huevo} con una pizca de sal y pimienta.', 'Cocinalos en sartén antiadherente a fuego bajo, revolviendo 2-3 min hasta que cuajen.', 'Tostá {pan} de pan integral.', 'Untá el pan con {untable} de queso untable y serví los huevos arriba.'],
  },
  {
    title: 'Bowl de yogur griego con avena, banana y nueces',
    roles: [...AM, 'post'],
    parts: [{ id: 'yogur', r: 'p', max: 400, min: 100 }, { id: 'avena', r: 'c', max: 90 }, { id: 'nueces', r: 'f', max: 25 }, { id: 'banana', r: 'x', g: 60 }],
    steps: ['Poné {yogur} de yogur griego en un bowl.', 'Sumá {avena} de avena arrollada y mezclá.', 'Cortá {banana} de banana en rodajas y ponela arriba.', 'Terminá con {nueces} de nueces picadas.'],
  },
  {
    title: 'Licuado proteico de banana con leche y pasta de maní',
    roles: [...AM, 'post'],
    parts: [{ id: 'whey', r: 'p', max: 60, min: 15 }, { id: 'banana', r: 'c', max: 240, min: 60 }, { id: 'mani', r: 'f', max: 20 }, { id: 'leche', r: 'x', g: 250 }],
    steps: ['Poné en la licuadora {leche} de leche descremada, {banana} de banana y {whey} de whey.', 'Sumá {mani} de pasta de maní.', 'Licuá 30 segundos (con hielo si querés) y tomalo en el momento.'],
  },
  {
    title: 'Panqueques de avena y claras con frutillas y miel',
    roles: AM,
    parts: [{ id: 'claras', r: 'p', step: 33, max: 264, min: 66 }, { id: 'avena', r: 'c', max: 90, min: 20 }, { id: 'frutillas', r: 'x', g: 100 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Mixeá {avena} de avena con {claras} hasta que quede una pasta lisa.', 'Cociná de a cucharadas en sartén antiadherente a fuego medio, 2 min por lado.', 'Lavá y cortá {frutillas} de frutillas.', 'Serví los panqueques con las frutillas y {miel} de miel.'],
  },
  {
    title: 'Ricota magra con tostadas de arroz, miel y nueces',
    roles: AM,
    parts: [{ id: 'ricota', r: 'p', max: 250, min: 60 }, { id: 'tostadas-arroz', r: 'c', step: 8, max: 64 }, { id: 'nueces', r: 'f', max: 20 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Untá[ {tostadas-arroz} de] tostadas de arroz con {ricota} de ricota magra.', 'Sumá un hilo de miel ({miel}).', 'Terminá con {nueces} de nueces picadas arriba.'],
  },
  {
    title: 'Sándwich de pan lactal integral con queso light y fruta',
    roles: AM,
    parts: [{ id: 'queso-light', r: 'p', max: 80, min: 20 }, { id: 'pan-lactal', r: 'c', step: 25, max: 100, min: 50 }, { id: 'manzana', r: 'x', g: 180 }],
    steps: ['Armá el sándwich con {pan-lactal} de pan lactal integral y {queso-light} de queso cremoso light.', 'Si querés, tostalo 2 min por lado en sartén tapada.', 'Acompañá con {manzana} de manzana.'],
  },
  {
    title: 'Yogur Deslactosado con Avena, Frutillas y Nueces',
    special: true,
    roles: [...AM, 'post'],
    parts: [{ id: 'yogur-deslactosado', r: 'p', max: 450, min: 100 }, { id: 'avena', r: 'c', max: 90 }, { id: 'nueces', r: 'f', max: 25 }, { id: 'frutillas', r: 'x', g: 100 }],
    steps: ['Poné {yogur-deslactosado} de yogur deslactosado en un bowl.', 'Sumá {frutillas} de frutillas lavadas y cortadas[ y {avena} de avena].', 'Terminá con {nueces} de nueces picadas.'],
  },
  {
    title: 'Licuado de Whey Aislado con Banana y Leche Deslactosada',
    special: true,
    roles: [...AM, 'post'],
    parts: [{ id: 'whey-isolate', r: 'p', max: 50, min: 15 }, { id: 'banana', r: 'c', max: 300, min: 60 }, { id: 'mani', r: 'f', max: 20 }, { id: 'leche-deslactosada', r: 'x', g: 250 }],
    steps: ['Poné en la licuadora {leche-deslactosada} de leche deslactosada, {banana} de banana y {whey-isolate} de whey aislado.', 'Sumá {mani} de pasta de maní.', 'Licuá 30 segundos y tomalo en el momento.'],
  },
  {
    title: 'Avena Cocida con Leche Deslactosada, Whey Aislado y Banana',
    special: true,
    roles: AM,
    parts: [{ id: 'whey-isolate', r: 'p', max: 45, min: 10 }, { id: 'avena', r: 'c', max: 100, min: 30 }, { id: 'nueces', r: 'f', max: 25 }, { id: 'leche-deslactosada', r: 'x', g: 200 }, { id: 'banana', r: 'x', g: 60 }],
    steps: ['Cociná {avena} de avena con {leche-deslactosada} de leche deslactosada a fuego medio 3-4 min, revolviendo.', 'Fuera del fuego, mezclá {whey-isolate} de whey aislado.', 'Serví con {banana} de banana en rodajas[ y {nueces} de nueces picadas].'],
  },
  // ---- Pre-entreno (carbo rápido, poca grasa) ----
  {
    title: 'Tostadas de arroz con miel y banana',
    roles: ['peri', 'snack'],
    parts: [{ id: 'yogur', r: 'p', max: 200 }, { id: 'banana', r: 'c', max: 360, min: 60 }, { id: 'tostadas-arroz', r: 'x', g: 16 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Untá {tostadas-arroz} de tostadas de arroz con {miel} de miel.', 'Cortá {banana} de banana en rodajas y ponela arriba.', 'Acompañá con {yogur} de yogur griego.'],
  },
  {
    title: 'Pan integral con dulce de membrillo y queso untable',
    roles: ['peri', 'snack'],
    parts: [{ id: 'untable', r: 'p', max: 90 }, { id: 'pan', r: 'c', step: 15, max: 180, min: 30 }, { id: 'dulce-membrillo', r: 'x', g: 20 }],
    steps: ['Tostá {pan} de pan integral.', 'Untá {untable} de queso untable.', 'Sumá {dulce-membrillo} de dulce de membrillo en fetas finitas.'],
  },
  {
    title: 'Yogur griego con copos de maíz y miel',
    roles: ['peri', 'snack', 'post'],
    parts: [{ id: 'yogur', r: 'p', max: 350, min: 100 }, { id: 'copos-maiz', r: 'c', max: 70 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Poné {yogur} de yogur griego en un bowl.', 'Sumá {copos-maiz} de copos de maíz sin azúcar justo antes de comer.', 'Terminá con {miel} de miel.'],
  },
  {
    title: 'Licuado de banana con leche descremada',
    roles: ['peri', 'post'],
    parts: [{ id: 'leche', r: 'p', max: 500, min: 150, step: 50 }, { id: 'banana', r: 'c', max: 360, min: 60 }],
    steps: ['Poné en la licuadora {leche} de leche descremada y {banana} de banana.', 'Licuá 30 segundos y tomalo 30-45 min antes de entrenar.'],
  },
  {
    title: 'Banana con galletas de arroz y pasta de maní',
    roles: ['peri', 'snack'],
    parts: [{ id: 'banana', r: 'c', max: 360, min: 60 }, { id: 'mani', r: 'f', max: 16 }, { id: 'galletas-arroz', r: 'x', g: 18 }],
    steps: ['Untá {galletas-arroz} de galletas de arroz[ con {mani} de pasta de maní].', 'Sumá {banana} de banana en rodajas.'],
  },
  {
    title: 'Pan integral con miel y banana',
    roles: ['peri', 'snack'],
    parts: [{ id: 'pan', r: 'c', step: 15, max: 180, min: 30 }, { id: 'banana', r: 'x', g: 120 }, { id: 'miel', r: 'x', g: 15 }],
    steps: ['Tostá {pan} de pan integral.', 'Untalo con {miel} de miel.', 'Sumá {banana} de banana en rodajas arriba o aparte.'],
  },
  {
    title: 'Galletitas de agua con dulce de membrillo',
    roles: ['peri', 'snack'],
    parts: [{ id: 'galletitas-agua', r: 'c', step: 6, max: 90, min: 18 }, { id: 'dulce-membrillo', r: 'x', g: 30 }],
    steps: ['Contá {galletitas-agua} de galletitas de agua.', 'Cortá {dulce-membrillo} de dulce de membrillo en fetas finitas y armá las galletitas.'],
  },
  {
    title: 'Bebida isotónica con banana',
    roles: ['peri'],
    parts: [{ id: 'banana', r: 'c', max: 360, min: 60 }, { id: 'isotonica', r: 'x', g: 500 }],
    steps: ['Comé {banana} de banana 45-60 min antes de entrenar.', 'Tomá {isotonica} de bebida isotónica de a sorbos durante la entrada en calor y el entreno.'],
  },
  {
    title: 'Barrita de cereal con banana',
    roles: ['peri', 'snack'],
    parts: [{ id: 'banana', r: 'c', max: 360, min: 60 }, { id: 'barrita-cereal', r: 'x', g: 23 }],
    steps: ['Comé {barrita-cereal} de barrita de cereal y {banana} de banana 30-45 min antes de entrenar.'],
  },
  {
    title: 'Pan Integral con Miel y Banana + Bebida Isotónica',
    roles: ['peri'],
    parts: [{ id: 'pan', r: 'c', step: 15, max: 150, min: 60 }, { id: 'banana', r: 'x', g: 120 }, { id: 'miel', r: 'x', g: 30 }, { id: 'isotonica', r: 'x', g: 500 }],
    steps: ['Tostá {pan} de pan integral y untalo con {miel} de miel.', 'Comelo con {banana} de banana 60-90 min antes de entrenar.', 'Tomá {isotonica} de bebida isotónica de a sorbos en la entrada en calor (carga de glucógeno).'],
  },
  {
    title: 'Galletitas de Agua con Dulce de Membrillo + Bebida Isotónica',
    roles: ['peri'],
    parts: [{ id: 'galletitas-agua', r: 'c', step: 6, max: 150, min: 36 }, { id: 'dulce-membrillo', r: 'x', g: 40 }, { id: 'isotonica', r: 'x', g: 500 }],
    steps: ['Armá {galletitas-agua} de galletitas de agua con {dulce-membrillo} de dulce de membrillo en fetas.', 'Tomá {isotonica} de bebida isotónica de a sorbos antes y durante la entrada en calor.'],
  },
  {
    title: 'Batata asada con miel',
    roles: ['peri'],
    parts: [{ id: 'batata', r: 'c', max: 400, min: 100 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Mandá {batata} de batata en rodajas al horno a 200 °C por 25-30 min (podés dejarla lista del batch).', 'Servila tibia con {miel} de miel por arriba.'],
  },
  {
    title: 'Tostadas de Arroz con Ricota, Miel y Banana',
    roles: ['post', 'snack'],
    parts: [{ id: 'ricota', r: 'p', max: 250, min: 60 }, { id: 'banana', r: 'c', max: 300, min: 60 }, { id: 'tostadas-arroz', r: 'x', g: 24 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Untá[ {tostadas-arroz} de] tostadas de arroz con {ricota} de ricota magra.', 'Sumá {banana} de banana en rodajas y un hilo de miel ({miel}).'],
  },
  {
    title: 'Yogur Deslactosado con Copos de Maíz y Miel',
    special: true,
    roles: ['peri', 'post', 'snack'],
    parts: [{ id: 'yogur-deslactosado', r: 'p', max: 400, min: 100 }, { id: 'copos-maiz', r: 'c', max: 80 }, { id: 'miel', r: 'x', g: 10 }],
    steps: ['Poné {yogur-deslactosado} de yogur deslactosado en un bowl.', 'Sumá {copos-maiz} de copos de maíz sin azúcar justo antes de comer.', 'Terminá con {miel} de miel.'],
  },
  // ---- Post-entreno (proteína + carbo) ----
  {
    title: 'Barra Proteica con Banana',
    roles: ['post', 'peri', 'snack'],
    parts: [{ id: 'barra-proteica', r: 'p', step: 23, max: 92, min: 23 }, { id: 'banana', r: 'c', max: 360, min: 60 }],
    steps: ['Comé {barra-proteica} de barra proteica (revisá que diga "sin lactosa" si sos intolerante).', 'Acompañá con {banana} de banana y un vaso grande de agua.'],
  },
  {
    title: 'Shake de whey con banana y avena',
    roles: ['post'],
    parts: [{ id: 'whey', r: 'p', max: 60, min: 20 }, { id: 'banana', r: 'c', max: 240, min: 60 }, { id: 'avena', r: 'x', g: 20 }],
    steps: ['Poné en la licuadora {whey} de whey, {banana} de banana, {avena} de avena y 300 ml de agua o leche.', 'Licuá 30 segundos y tomalo dentro de la hora post-entreno.'],
  },
  {
    title: 'Arroz con pollo desmenuzado',
    roles: ['post', ...MAIN],
    parts: [{ id: 'pollo', r: 'p', max: 250, min: 60 }, { id: 'arroz', r: 'c', max: 350 }, { id: 'oliva', r: 'f', max: 10 }, { id: 'vegetales', r: 'x', g: 80 }],
    steps: ['Hervir el arroz 15-18 min (1 taza de arroz por 2 de agua con sal). Serví {arroz} cocido.', 'Cociná {pollo} de pollo a la plancha y desmenuzalo con dos tenedores.', 'Salteá {vegetales} de cebolla, morrón y zanahoria picados en sartén antiadherente 5 min.', 'Mezclá todo, condimentá con {oliva} de aceite de oliva, sal y pimentón.'],
  },
  {
    title: 'Sándwich de atún con pan integral y tomate',
    roles: ['post', ...MAIN],
    parts: [{ id: 'atun', r: 'p', max: 200, min: 60 }, { id: 'pan', r: 'c', step: 15, max: 150, min: 60 }, { id: 'palta', r: 'f', max: 60 }, { id: 'vegetales', r: 'x', g: 60 }],
    steps: ['Escurrí bien {atun} de atún al natural.', 'Tostá {pan} de pan integral.', 'Pisá {palta} de palta con limón y untala en el pan.', 'Armá el sándwich con el atún y {vegetales} de tomate y lechuga.'],
  },
  // ---- Almuerzo / cena ----
  {
    title: 'Lentejas Salteadas con Arroz y Vegetales',
    roles: MAIN,
    parts: [{ id: 'lentejas', r: 'p', max: 450, min: 150 }, { id: 'arroz', r: 'c', max: 300 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Hervir las lentejas 20-25 min (o usá de lata, enjuagadas). Serví {lentejas}.', 'Hervir el arroz 15-18 min. Serví {arroz} cocido.', 'Salteá {vegetales} de cebolla, morrón y zanahoria en sartén antiadherente 5 min y sumá las lentejas.', 'Serví sobre el arroz y condimentá con comino y pimentón[ y {oliva} de aceite de oliva].'],
  },
  {
    title: 'Fideos con Ricota, Espinaca y Nueces',
    roles: MAIN,
    parts: [{ id: 'ricota', r: 'p', max: 350, min: 100 }, { id: 'fideos', r: 'c', max: 350 }, { id: 'nueces', r: 'f', max: 25 }, { id: 'vegetales', r: 'x', g: 100 }],
    steps: ['Hervir los fideos 8-10 min al dente. Serví {fideos} cocidos.', 'Salteá {vegetales} de espinaca 1-2 min en sartén antiadherente.', 'Mezclá los fideos con {ricota} de ricota magra, la espinaca, sal, pimienta y nuez moscada.', 'Terminá con {nueces} de nueces picadas.'],
  },
  {
    title: 'Tofu Grillado con Batata al Horno y Ensalada',
    special: true,
    roles: MAIN,
    parts: [{ id: 'tofu', r: 'p', max: 350, min: 100 }, { id: 'batata', r: 'c', max: 450 }, { id: 'oliva', r: 'f', max: 10 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Mandá {batata} de batata en cubos al horno a 200 °C por 30 min con spray antiadherente.', 'Cortá {tofu} de tofu en bastones, marinalo con salsa de soja y grillalo 3-4 min por lado.', 'Armá la ensalada con {vegetales} de verduras[ y {oliva} de aceite de oliva].'],
  },
  {
    title: 'Pechuga de pollo a la plancha con arroz yamaní y ensalada',
    roles: MAIN,
    parts: [{ id: 'pollo', r: 'p', max: 260, min: 100 }, { id: 'yamani', r: 'c', max: 350 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Hervir el arroz yamaní 35-40 min (o usá el que tenés listo del batch). Serví {yamani} cocido.', 'Cociná {pollo} de pechuga a la plancha con spray antiadherente, 5-6 min por lado a fuego medio.', 'Armá la ensalada con {vegetales} de lechuga, tomate y zanahoria.', 'Condimentá la ensalada con {oliva} de aceite de oliva, sal y limón.'],
  },
  {
    title: 'Bife de cuadril con papas al horno y ensalada',
    roles: MAIN,
    parts: [{ id: 'cuadril', r: 'p', max: 260, min: 100 }, { id: 'papa', r: 'c', max: 450 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Cortá la papa en cubos y mandala al horno a 200 °C por 30 min con spray antiadherente y romero. Serví {papa}.', 'Poné la plancha bien caliente y sellá {cuadril} de cuadril 4-5 min por lado. Dejalo reposar 3 min.', 'Armá la ensalada con {vegetales} de verduras.', 'Condimentá con {oliva} de aceite de oliva, sal y limón.'],
  },
  {
    title: 'Merluza al horno con puré de batata y vegetales',
    roles: MAIN,
    parts: [{ id: 'merluza', r: 'p', max: 320, min: 120 }, { id: 'batata', r: 'c', max: 450 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Hervir la batata 20 min y pisala con un tenedor. Serví {batata} de puré.', 'Mandá al horno {merluza} de merluza con limón, sal y perejil a 180 °C por 15 min.', 'Grillá o cociná al vapor {vegetales} de vegetales.', 'Rociá con {oliva} de aceite de oliva al servir.'],
  },
  {
    title: 'Fideos con carne picada salteada y tomate',
    roles: MAIN,
    parts: [{ id: 'picada', r: 'p', max: 220, min: 80 }, { id: 'fideos', r: 'c', max: 350 }, { id: 'oliva', r: 'f', max: 10 }, { id: 'vegetales', r: 'x', g: 100 }],
    steps: ['Hervir los fideos 8-10 min al dente. Serví {fideos} cocidos.', 'Sarteneá {picada} de carne picada con cebolla 8-10 min.', 'Sumá {vegetales} de tomate en cubos (o salsa de tomate) y cociná 5 min más.', 'Mezclá con los fideos y terminá con {oliva} de aceite de oliva y orégano.'],
  },
  {
    title: 'Bowl de atún, arroz, palta y vegetales',
    roles: MAIN,
    parts: [{ id: 'atun', r: 'p', max: 240, min: 80 }, { id: 'arroz', r: 'c', max: 350 }, { id: 'palta', r: 'f', max: 70 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Hervir el arroz 15-18 min y dejalo entibiar. Serví {arroz} cocido.', 'Escurrí {atun} de atún al natural.', 'Cortá {vegetales} de tomate, pepino y zanahoria[ y {palta} de palta] en cubos.', 'Armá el bowl: arroz abajo, arriba el atún, la palta y los vegetales. Limón y sal.'],
  },
  {
    title: 'Lomo a la plancha con fideos al ajo y oliva',
    roles: MAIN,
    parts: [{ id: 'lomo', r: 'p', max: 240, min: 100 }, { id: 'fideos', r: 'c', max: 350 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 120 }],
    steps: ['Hervir los fideos 8-10 min al dente. Serví {fideos} cocidos.', 'Sellá {lomo} de lomo en plancha bien caliente 3-4 min por lado.', 'Salteá ajo picado[ en {oliva} de aceite de oliva] 1 min, sin quemarlo, y mezclá con los fideos.', 'Acompañá con {vegetales} de ensalada verde.'],
  },
  {
    title: 'Bondiola al horno con batatas y ensalada',
    roles: MAIN,
    parts: [{ id: 'cerdo', r: 'p', max: 240, min: 100 }, { id: 'batata', r: 'c', max: 450 }, { id: 'oliva', r: 'f', max: 10 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Condimentá la bondiola con ajo, pimentón y mostaza.', 'Mandá al horno {cerdo} de bondiola[ junto con {batata} de batata en cubos] a 200 °C por 30-35 min.', 'Armá la ensalada con {vegetales} de verduras.', 'Condimentá con {oliva} de aceite de oliva.'],
  },
  {
    title: 'Nalga a la plancha con lentejas salteadas y vegetales',
    roles: MAIN,
    parts: [{ id: 'nalga', r: 'p', max: 240, min: 80 }, { id: 'lentejas', r: 'c', max: 350 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Hervir las lentejas 20-25 min (o usá de lata enjuagadas). Serví {lentejas}.', 'Salteá las lentejas con cebolla y morrón picados 5 min.', 'Sellá {nalga} de nalga en plancha bien caliente 3-4 min por lado.', 'Acompañá con {vegetales} de vegetales[ y {oliva} de aceite de oliva].'],
  },
  {
    title: 'Tortilla de claras y papa con ensalada',
    roles: MAIN,
    parts: [{ id: 'claras', r: 'p', step: 33, max: 330, min: 99 }, { id: 'papa', r: 'c', max: 450 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'huevo', r: 'x', g: 50 }, { id: 'vegetales', r: 'x', g: 150 }],
    steps: ['Hervir {papa} de papa en cubos 10 min y escurrila.', 'Batí {claras} con {huevo}, sal y pimienta, y mezclalo con la papa.', 'Cociná en sartén antiadherente tapada a fuego bajo 5 min por lado (o mandala al horno a 200 °C por 20 min).', 'Acompañá con {vegetales} de ensalada[ y {oliva} de aceite de oliva].'],
  },
  {
    title: 'Wok de pollo con fideos y vegetales salteados',
    roles: MAIN,
    parts: [{ id: 'pollo', r: 'p', max: 240, min: 80 }, { id: 'fideos', r: 'c', max: 330 }, { id: 'oliva', r: 'f', max: 10 }, { id: 'vegetales', r: 'x', g: 200 }],
    steps: ['Hervir los fideos 8 min y escurrilos. Serví {fideos} cocidos.', 'Cortá {pollo} de pollo en tiras y salteálo a fuego fuerte 5 min[ con {oliva} de aceite].', 'Sumá {vegetales} de vegetales en juliana (morrón, zanahoria, cebolla, zapallito) y salteá 3-4 min.', 'Mezclá con los fideos y terminá con un chorrito de salsa de soja.'],
  },
];

const T_OF = (it: FoodItem[]) => totals(it);

/** Resuelve las cantidades de una combinación para cerrar los macros del objetivo. */
export function solveCombo(c: Combo, T: Tot): FoodItem[] | null {
  if (c.parts.some((p) => !FOOD_BY_ID[p.id])) return null;
  const g: Record<string, number> = {};
  c.parts.forEach((p) => (g[p.id] = p.r === 'x' ? (p.g ?? 0) : 0));
  const macro = (k: 'p' | 'c' | 'f', skip: string) =>
    c.parts.reduce((a, p) => (p.id === skip ? a : a + ((FOOD_BY_ID[p.id][k] ?? 0) * g[p.id]) / 100), 0);
  for (let it = 0; it < 4; it++) {
    for (const k of ['p', 'c', 'f'] as const) {
      const part = c.parts.find((p) => p.r === k);
      if (!part) continue;
      const per = FOOD_BY_ID[part.id][k] / 100;
      if (!(per > 0)) continue;
      const step = part.step ?? 5;
      const raw = Math.max(0, (T[k] - macro(k, part.id)) / per);
      g[part.id] = Math.min(part.max ?? 500, Math.max(part.min ?? 0, Math.round(raw / step) * step));
    }
  }
  const items = c.parts.filter((p) => g[p.id] > 0).map((p) => item(p.id, g[p.id]));
  return items.length ? items : null;
}

export function comboSteps(c: Combo, items: FoodItem[]) {
  const q: Record<string, string> = {};
  items.forEach((i) => i.foodId && i.grams > 0 && (q[i.foodId] = qtyLabel(i.foodId, i.grams)));
  const has = (st: string) => (st.match(/\{([a-z-]+)\}/g) ?? []).every((m) => q[m.slice(1, -1)]);
  const steps = c.steps
    .map((st) => st.replace(/\[([^\]]*)\]/g, (_, seg: string) => (has(seg) ? seg : '')))
    .filter(has)
    .map((st) => st.replace(/\{([a-z-]+)\}/g, (_, id: string) => q[id]));
  // Ingredientes que no son de la receta base (ej. la palta que suma el cierre del día): también llevan su paso.
  const own = new Set(c.parts.map((p) => p.id));
  items.filter((i) => i.grams > 0 && i.foodId && !own.has(i.foodId)).forEach((i) => stepsForItem(i).forEach((st) => steps.push(st)));
  return [...steps, seasoningStep(items, c.title)];
}

/** Rango de reescalado de una alternativa para igualar las kcal de la Opción 1. */
const FIT_MIN = 0.6;
const FIT_MAX = 1.8;
/**
 * Error de una alternativa ya llevada a las kcal de la Opción 1: desvíos de P / C / G pesados por su energía
 * (5 g de grasa de más pesan lo mismo en una colación chica que en una cena) + un término propio de proteína.
 */
const err = (cur: Tot, T: Tot) => {
  const { p, c, f, kcal } = cur;
  return ((4 * Math.abs(p - T.p) + 4 * Math.abs(c - T.c) + 9 * Math.abs(f - T.f)) / T.kcal) * 1.5 + (Math.abs(p - T.p) / Math.max(T.p, 10)) * 0.5 + Math.abs(kcal - T.kcal) / T.kcal;
};

/**
 * Porciones de cocina deportiva real (en cocido): proteína principal 100-250 g, carbo base hasta 300 g,
 * aceite / frutos secos 5-20 g (palta hasta 50 g ≈ ¼ unidad), vegetales 100-200 g y un plato del catálogo hasta 450 g.
 */
function portionRange(it: FoodItem, role: MealRole): [number, number] {
  const id = it.foodId ?? '';
  const main = MAIN.includes(role);
  const peri = role === 'peri' || role === 'post';
  switch (FOOD_BY_ID[id]?.group) {
    case 'lean-protein':
      return [main ? 100 : 60, 250];
    case 'starch':
      return [main ? 100 : 60, 300];
    case 'fat':
      return [5, id === 'palta' ? 50 : 20];
    case 'veg':
      return [main ? 100 : 30, 200];
    case 'plato':
      return [40, 450];
    case 'cereal':
      return [8, id === 'pan' || id === 'pan-lactal' ? 150 : peri ? 160 : 120];
    case 'whey':
      return [10, 50];
    case 'dairy-protein':
      // Yogur hasta ~1 pote y medio; ricota / quesos untables y light en porción de comida, no de pote entero.
      return [20, ['leche', 'leche-deslactosada', 'yogur-proteico'].includes(id) ? 500 : id === 'ricota' ? 250 : id === 'untable' ? 60 : id === 'queso-light' ? 80 : 300];
    case 'sport-carb':
      // Miel / dulce: endulzan (≤ 2 cdas); la bebida isotónica, hasta 1 ½ botella.
      return [5, id === 'isotonica' ? 750 : 30];
    case 'fruit':
      // Pre / post-WOD de carga de glucógeno: hasta 3 bananas.
      return [30, peri ? 360 : 250];
    case 'eggs':
      return [33, id === 'huevo' ? 200 : 330];
    default:
      return [5, 600];
  }
}
const snapG = (i: FoodItem, g: number) => {
  const st = i.foodId === 'huevo' ? 50 : i.foodId === 'claras' ? 33 : 5;
  return Math.max(st, Math.round(g / st) * st);
};
/** Lleva una opción a las kcal objetivo (escala pareja) y respeta las porciones reales de cada ingrediente. */
function fitAndCap(items: FoodItem[], targetKcal: number, role: MealRole): FoodItem[] {
  const kcal = totals(items).kcal;
  const k = kcal > 0 && targetKcal > 0 ? Math.min(FIT_MAX, Math.max(FIT_MIN, targetKcal / kcal)) : 1;
  return items.map((i) => {
    const [lo, hi] = portionRange(i, role);
    const g = Math.min(hi, Math.max(Math.min(lo, i.grams), snapG(i, i.grams * k)));
    return g === i.grams ? i : rescale(i, g);
  });
}

interface Cand {
  opt: MealOption;
  err: number;
  /** Ingrediente base (plato o proteína principal): dos opciones nunca repiten la misma base. */
  key: string;
}

// Proteína principal reconocible por nombre: dos platos de pollo distintos cuentan como la misma base.
const PROT_KEY: [RegExp, string][] = [
  [/pollo|pechuga/i, 'pollo'],
  [/merluza|pescado/i, 'pescado'],
  [/at[uú]n/i, 'atun'],
  [/cerdo|bondiola/i, 'cerdo'],
  [/lomo|lomito/i, 'lomo'],
  [/cuadril|bife|entraña|asado|matambre/i, 'cuadril'],
  [/nalga|peceto/i, 'nalga'],
  [/picada|bolo[ñn]esa|alb[oó]ndiga|carne/i, 'picada'],
  [/lenteja|garbanzo/i, 'legumbre'],
  [/huevo|claras|tortilla|omelette|revuelto/i, 'huevo'],
  [/barra|alfajor/i, 'barra'],
  [/whey|proteic/i, 'whey'],
  [/yogur/i, 'yogur'],
  [/ricota|queso|untable/i, 'queso'],
];
const protKey = (name: string, fb: string) => PROT_KEY.find(([re]) => re.test(name))?.[1] ?? fb;

/** Base de una opción: la proteína principal del plato o del ingrediente que más proteína aporta. */
export function baseKey(items: FoodItem[]) {
  const dish = items.find((i) => i.foodId && FOOD_BY_ID[i.foodId]?.group === 'plato');
  if (dish) return protKey(dish.food, dish.foodId!);
  const top = [...items].sort((a, b) => b.p - a.p)[0];
  return top ? protKey(`${top.foodId ?? ''} ${top.food}`, top.foodId ?? top.food) : '';
}

// Platos que ya traen su proteína: no se les suma otra fuente pesada (nada de "tarta de carne + pollo").
const PROTEIN_DISH = /pollo|pechuga|carne|cuadril|lomo|nalga|peceto|picada|merluza|pescado|at[uú]n|cerdo|bondiola|jam[oó]n|milanesa|huevo|claras|omelette|revuelto|tortilla|lenteja|garbanzo|ricota|queso|yogur|whey|proteic|asado|entra[ñn]a|matambre|molleja|chinchul|provoleta|achura|parrillada|chori|alb[oó]ndiga|bolo[ñn]esa|hamburguesa|empanada|tarta|tostado|lomito|wrap|salpic/i;

function dishCands(meal: Meal, T: Tot, allowed?: Set<string> | null): Cand[] {
  const used = new Set(meal.items.map((i) => i.foodId));
  const out: Cand[] = [];
  const main = MAIN.includes(meal.role);
  for (const d of dishCandidates(meal.role, allowed)) {
    if (used.has(d.id) || !(d.p > 0)) continue;
    const portion = d.unit?.grams ?? 100;
    // Infusiones / bocados chicos (< 120 kcal la porción) no son plato principal de una opción.
    if (((d.p * 4 + d.c * 4 + d.f * 9) * portion) / 100 < 120) continue;
    // Porción del plato: entre media y una y media (nunca 600 g de un plato para "llegar" a la proteína).
    const raw = (T.p / d.p) * 100;
    const portions = Math.min(1.5, Math.max(0.5, Math.round((raw / portion) * 2) / 2));
    const grams = Math.min(450, Math.round(portions * portion));
    const items: FoodItem[] = [item(d.id, grams)];
    let cur = totals(items);
    // Proteína extra sólo en ensaladas (ensalada completa con pollo) o, a la mañana, un yogur junto a un plato sin proteína.
    const dp = T.p - cur.p;
    const salad = /ensalada|vegetales grillados/i.test(d.name);
    if (dp > 8 && (salad || !PROTEIN_DISH.test(d.name))) {
      const protId = main ? 'pollo' : 'yogur';
      const r = FOOD_BY_ID[protId];
      const [lo, hi] = portionRange({ id: '', foodId: protId, food: r.name, grams: 0, p: 0, c: 0, f: 0, leucine: 0 }, meal.role);
      items.push(item(protId, Math.min(hi, Math.max(lo, Math.round(((dp / r.p) * 100) / 5) * 5))));
      cur = totals(items);
    }
    // Carbo base: sólo si el plato no lo trae y falta una porción real (≥ 100 g de arroz / papa en almuerzo y cena).
    const dc = T.c - cur.c;
    const side = (CARB_SIDE[meal.role] ?? CARB_SIDE.lunch).find((id) => FOOD_BY_ID[id] && !d.name.toLowerCase().includes(short(FOOD_BY_ID[id].name).toLowerCase().split(' ')[0]));
    if (dc > 15 && side) {
      const r = FOOD_BY_ID[side];
      const g = Math.round(((dc / r.c) * 100) / 5) * 5;
      const [lo, hi] = portionRange({ id: '', foodId: side, food: r.name, grams: 0, p: 0, c: 0, f: 0, leucine: 0 }, meal.role);
      if (g >= lo * 0.8) items.push(item(side, Math.min(hi, Math.max(lo, g))));
    }
    cur = totals(items);
    const df = T.f - cur.f;
    if (df > 4) {
      const fatId = main ? 'oliva' : 'nueces';
      const r = FOOD_BY_ID[fatId];
      items.push(item(fatId, Math.min(fatId === 'oliva' ? 15 : 20, Math.max(10, Math.round(((df / r.f) * 100) / 5) * 5))));
    }
    if (main && !salad) items.push(item('vegetales', 150));
    const fitted = fitAndCap(items, T.kcal, meal.role);
    // Nombre gastronómico: "Milanesa de Merluza al Horno con Arroz Blanco y Ensalada Verde" (el aceite es aderezo, no va al título).
    const sides = fitted.slice(1).filter((i) => i.foodId !== 'oliva').map(culinary);
    const title = sides.length ? `${short(d.name)} con ${sides.length > 1 ? `${sides.slice(0, -1).join(', ')} y ${sides[sides.length - 1]}` : sides[0]}` : short(d.name);
    out.push({
      opt: { title: dishTitleCase(title), items: fitted, technique: d.technique ?? d.detail ?? autoTechnique(fitted), steps: autoSteps(fitted, d.name) },
      err: err(totals(fitted), T),
      key: baseKey(fitted),
    });
  }
  return out;
}

function comboCands(meal: Meal, T: Tot, special: boolean): Cand[] {
  const out: Cand[] = [];
  for (const c of COMBOS) {
    if (!c.roles.includes(meal.role) || (c.special && !special)) continue;
    const solved = solveCombo(c, T);
    if (!solved) continue;
    const items = fitAndCap(solved, T.kcal, meal.role);
    out.push({ opt: { title: dishTitleCase(c.title), items, technique: autoTechnique(items), steps: comboSteps(c, items) }, err: err(T_OF(items), T), key: baseKey(items) });
  }
  return out;
}

/** Tope de error relativo sumado (P + C + G + kcal) para ofrecer una alternativa como equivalente. */
const MAX_ERR = 0.7;

/**
 * Alternativas equivalentes en macros (platos del catálogo + combinaciones caseras), ordenadas por precisión y
 * sin repetir la base (plato o proteína principal) de la Opción 1 ni entre ellas.
 * `avoid`: bases a evitar (las de las opciones ya cargadas / de la comida anterior); se relaja si no alcanza.
 */
export function suggestAlternatives(meal: Meal, allowed?: Set<string> | null, n = 4, avoid: string[] = [], accept?: (foodId: string) => boolean): MealOption[] {
  const T = totals(meal.items);
  if (T.kcal < 80) return [];
  // Ranking: precisión de macros + leve preferencia por platos simples (menos agregados sueltos).
  const rank = (c: Cand) => c.err + 0.06 * Math.max(0, c.opt.items.length - 3);
  const all = [...dishCands(meal, T, allowed), ...comboCands(meal, T, !!accept)]
    .filter((c) => c.err <= MAX_ERR && slotOk(c.opt.items, meal.role, accept))
    .sort((a, b) => rank(a) - rank(b));
  const mainKey = baseKey(meal.items);
  const picked: Cand[] = [];
  const keys = new Set([mainKey]);
  const soft = new Set(avoid);
  // 1ª pasada: base distinta de todo lo anterior; 2ª: se permite repetir lo "a evitar" pero nunca la base de la Opción 1 ni un título.
  // 3ª (sólo si no se llega a 3 opciones por comida): se acepta repetir la base con otro plato (ej. sin lactosa, todo es whey aislado).
  for (const pass of [0, 1, 2]) {
    if (pass === 2 && picked.length >= 2) break;
    for (const c of all) {
      if (picked.length >= (pass === 2 ? 2 : n)) break;
      if (picked.includes(c) || (pass < 2 && keys.has(c.key)) || (pass === 0 && soft.has(c.key))) continue;
      if (c.opt.title === meal.title || picked.some((p) => p.opt.title === c.opt.title)) continue;
      picked.push(c);
      keys.add(c.key);
    }
  }
  // Cada alternativa ya viene llevada a las kcal de la Opción 1 y con porciones reales (fitAndCap).
  return picked.map((c) => c.opt);
}

/** Opciones 2-5 de una comida (lee también la Opción 2 única de planes guardados antes de las 5 opciones). */
export function mealAlts(m: Meal & { alt?: MealOption }): MealOption[] {
  if (Array.isArray(m.alts)) return m.alts.filter((a) => a && Array.isArray(a.items));
  return m.alt?.items ? [m.alt] : [];
}

/** Migración: `alt` (una alternativa) → `alts` (hasta 4). */
export function normalizeMealOptions(m: Meal & { alt?: MealOption }): Meal {
  const { alt: _legacy, ...rest } = m;
  void _legacy;
  const alts = mealAlts(m);
  return { ...rest, alts: alts.length ? alts : undefined };
}

/** Reescala las alternativas para que sigan a la Opción 1 en kcal (tras ajustes de porciones o cierre de macros). */
export function fitAltsToMain(meal: Meal): Meal {
  if (!meal.alts?.length) return meal;
  const m = totals(meal.items).kcal;
  return {
    ...meal,
    alts: meal.alts.map((alt) => {
      const a = totals(alt.items).kcal;
      if (!(a > 0) || !(m > 0) || Math.abs(m / a - 1) <= 0.03) return alt;
      const items = fitAndCap(alt.items, m, meal.role);
      // Pasos automáticos: se rehacen con las cantidades nuevas (los cargados a mano por el coach se respetan).
      return { ...alt, items, steps: alt.steps?.length && !alt.steps.some((st) => /\d+ g/.test(st)) ? alt.steps : refreshSteps(alt, items) };
    }),
  };
}

/** Recalcula las cantidades dentro de los pasos de una alternativa tras reescalarla o editarla. */
export function refreshSteps(alt: MealOption, items: FoodItem[]) {
  const combo = COMBOS.find((c) => dishTitleCase(c.title) === alt.title || c.title === alt.title);
  return combo ? comboSteps(combo, items) : autoSteps(items, alt.title);
}

function rescale(i: FoodItem, grams: number): FoodItem {
  if (i.foodId && FOOD_BY_ID[i.foodId]) return { ...i, grams, ...macrosFor(i.foodId, grams)! };
  const k = i.grams > 0 ? grams / i.grams : 0;
  return { ...i, grams, p: round1(i.p * k), c: round1(i.c * k), f: round1(i.f * k), leucine: round2(i.leucine * k) };
}

export const optionTotals = totals;

// ---------------------------------------------------------------------------------------------
// SWAP MATRIX: el reemplazo iguala el macro ancla y el resto de la comida compensa grasas / carbos.
// ---------------------------------------------------------------------------------------------

export interface SwapAdjust {
  itemId: string;
  name: string;
  from: number;
  to: number;
}

/**
 * Tras un swap, la diferencia de grasas / carbos que trae el alimento nuevo se compensa en la grasa de cocción /
 * palta / frutos secos y en el almidón principal de la misma comida, para que la comida no se descuadre.
 */
export function compensateSwap(items: FoodItem[], swappedId: string, before: FoodItem): { items: FoodItem[]; adjust: SwapAdjust[] } {
  const now = items.find((i) => i.id === swappedId);
  if (!now) return { items, adjust: [] };
  const df = now.f - before.f;
  const dc = now.c - before.c;
  const adjust: SwapAdjust[] = [];
  let next = items;
  const tweak = (macro: 'f' | 'c', delta: number, groups: string[], tol: number) => {
    if (Math.abs(delta) <= tol) return;
    const host = next
      .filter((i) => i.id !== swappedId && i.foodId && groups.includes(FOOD_BY_ID[i.foodId]?.group ?? '') && FOOD_BY_ID[i.foodId]![macro] > 0)
      .sort((a, b) => b[macro] - a[macro])[0];
    if (!host || !host.foodId) return;
    const per = FOOD_BY_ID[host.foodId][macro] / 100;
    const grams = Math.max(0, Math.round((host.grams - delta / per) / 5) * 5);
    if (grams === host.grams) return;
    adjust.push({ itemId: host.id, name: host.food, from: host.grams, to: grams });
    next = next.map((i) => (i.id === host.id ? rescale(i, grams) : i)).filter((i) => i.grams > 0);
  };
  tweak('f', df, ['fat'], 2);
  tweak('c', dc, ['starch', 'cereal', 'fruit', 'sport-carb'], 5);
  return { items: next, adjust };
}

/** Opciones por comida que completa el generador: Opción 1 + 4 alternativas = 5. */
export const ALT_TARGET = MAX_OPTIONS - 1;

/**
 * Completa las opciones 2 a 5 de cada comida (desayuno, almuerzo, pre / post-WOD, merienda y cena). No repite la base
 * de la comida anterior del mismo día en la primera alternativa y respeta la canasta del atleta.
 */
export function withAlternatives<P extends { meals: Meal[]; anamnesis?: { basket: string[] | null } }>(
  plan: P,
  overwrite = false,
  target = ALT_TARGET,
  accept?: (foodId: string) => boolean,
): P {
  const basket = plan.anamnesis?.basket;
  const allowed = basket ? new Set(basket) : null;
  const order = [...plan.meals].sort((a, b) => a.time.localeCompare(b.time));
  // Bases ya usadas en el día ON / OFF: la primera pasada no las repite (variedad entre comidas seguidas).
  const used: Record<'on' | 'off', string[]> = { on: [], off: [] };
  const done = new Map<string, Meal>();
  for (const m of order) {
    const modes: ('on' | 'off')[] = m.day === 'both' ? ['on', 'off'] : [m.day];
    // Alternativas guardadas que quedaron fuera de la franja del día (versiones anteriores) se descartan.
    const have = overwrite ? [] : (m.alts ?? []).filter((a) => slotOk(a.items, m.role, accept));
    const before = modes.flatMap((d) => used[d]);
    let alts = have;
    if (have.length < target) {
      const extra = suggestAlternatives({ ...m, alts: have }, allowed, target, [...before, ...have.map((a) => baseKey(a.items))], accept).filter(
        (o) => !have.some((h) => h.title === o.title || baseKey(h.items) === baseKey(o.items)),
      );
      alts = [...have, ...extra].slice(0, target);
    }
    modes.forEach((d) => used[d].push(baseKey(m.items), ...alts.map((a) => baseKey(a.items))));
    done.set(m.id, alts.length ? { ...m, alts } : m);
  }
  return { ...plan, meals: plan.meals.map((m) => done.get(m.id) ?? m) };
}
