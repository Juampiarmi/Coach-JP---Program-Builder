import { allergenHits, sanitizeAnamnesis } from './anamnesisPro';
import { FOOD_BY_ID, unitStep } from './foods';
import { portionCap } from './portionCaps';
import { itemFromFood } from './seed';
import type { AthletePlan, FoodItem, Meal, MealOption, MealRole, Sex } from './types';

/**
 * SEGURIDAD CLÍNICA · ALERGIAS E INTOLERANCIAS EN TODO EL PLAN.
 * Seis grupos: gluten (TACC), lactosa / lácteos, frutos secos / maní, legumbres, pescados / mariscos y huevo.
 * Cada alimento de la base está etiquetado; los alimentos libres (IA, marcas propias) se detectan por nombre.
 * Cuando el alumno tiene una restricción, el banco elige recetas aptas o sustituye el ingrediente por un equivalente
 * seguro y coherente (mismo rol en el plato: proteína, carbo o grasa), y el plan no se publica si queda alguno.
 */
export type Allergen = 'gluten' | 'lactose' | 'dairy' | 'nuts' | 'legumes' | 'shellfish' | 'egg';
export const ALLERGENS: Allergen[] = ['gluten', 'lactose', 'dairy', 'nuts', 'legumes', 'shellfish', 'egg'];

export const ALLERGEN_INFO: Record<Allergen, { label: string; seal: string; short: string }> = {
  gluten: { label: 'Gluten (TACC)', seal: 'Sin TACC', short: 'gluten' },
  lactose: { label: 'Intolerancia a la lactosa', seal: 'Sin lactosa', short: 'lactosa' },
  dairy: { label: 'Alergia a lácteos (APLV)', seal: 'Sin lácteos', short: 'lácteos' },
  nuts: { label: 'Frutos secos / maní', seal: 'Sin frutos secos', short: 'frutos secos' },
  legumes: { label: 'Legumbres', seal: 'Sin legumbres', short: 'legumbres' },
  shellfish: { label: 'Pescados / mariscos', seal: 'Sin pescado', short: 'pescado' },
  egg: { label: 'Huevo', seal: 'Sin huevo', short: 'huevo' },
};

/** Alérgenos reales de cada alimento de la base ([] = apto para todos). */
export const FOOD_ALLERGENS: Record<string, Allergen[]> = {
  merluza: ['shellfish'],
  atun: ['shellfish'],
  huevo: ['egg'],
  claras: ['egg'],
  ricota: ['lactose', 'dairy'],
  yogur: ['lactose', 'dairy'],
  untable: ['lactose', 'dairy'],
  leche: ['lactose', 'dairy'],
  whey: ['lactose', 'dairy'],
  'yogur-proteico': ['lactose', 'dairy'],
  'queso-light': ['lactose', 'dairy'],
  avena: ['gluten'],
  'avena-instantanea': ['gluten'],
  pan: ['gluten'],
  'pan-lactal': ['gluten'],
  'pan-arabe': ['gluten'],
  'pan-rallado': ['gluten'],
  'galletitas-agua': ['gluten'],
  fideos: ['gluten'],
  noquis: ['gluten', 'egg'],
  granola: ['gluten', 'nuts'],
  'barrita-cereal': ['gluten'],
  'alfajor-proteico': ['gluten', 'lactose', 'dairy'],
  'barra-proteica': ['gluten', 'lactose', 'dairy', 'nuts'],
  // Deslactosados: aptos para la intolerancia, NO para la alergia a la proteína de la leche (APLV).
  'leche-deslactosada': ['dairy'],
  'yogur-deslactosado': ['dairy'],
  'whey-isolate': ['dairy'],
  'untable-deslactosado': ['dairy'],
  'queso-deslactosado': ['dairy'],
  // Alternativas vegetales fortificadas (para APLV): ojo con soja (legumbre) y almendra (fruto seco).
  'bebida-soja': ['legumes'],
  'yogur-vegetal': ['legumes'],
  'proteina-vegetal': ['legumes'],
  'bebida-almendra': ['nuts'],
  lentejas: ['legumes'],
  garbanzos: ['legumes'],
  porotos: ['legumes'],
  'soja-texturizada': ['legumes'],
  tofu: ['legumes'],
  mani: ['nuts', 'legumes'],
  nueces: ['nuts'],
};

/** Carnes y pescados (no entran como sustituto en un plan vegetariano). */
const MEAT = new Set(['pollo', 'cuadril', 'lomo', 'nalga', 'picada', 'cerdo', 'jamon', 'merluza', 'atun']);

const asAllergens = (xs: string[] | undefined) => (xs ?? []).filter((x): x is Allergen => (ALLERGENS as string[]).includes(x));
/** Restricciones del alumno (anamnesis). */
export const allergiesOf = (plan: Pick<AthletePlan, 'anamnesis'>) => asAllergens(sanitizeAnamnesis(plan.anamnesis).allergies);

/** Alérgenos de un ingrediente: etiqueta de la base o, si es un alimento libre, detección por nombre. */
export function itemAllergens(it: { foodId?: string; food?: string }): Allergen[] {
  const ref = it.foodId ? FOOD_BY_ID[it.foodId] : undefined;
  // Alimento de la base: su etiqueta (sin etiqueta = apto para todos).
  if (ref && !ref.custom) return FOOD_ALLERGENS[ref.id] ?? [];
  // Marca propia, plato de la Food & Brand DB o alimento libre de la IA: por nombre.
  return asAllergens(allergenHits(`${it.food ?? ''} ${ref?.name ?? ''}`, ALLERGENS));
}

export const conflictOf = (it: { foodId?: string; food?: string }, allergies: Allergen[]) => itemAllergens(it).filter((a) => allergies.includes(a));
export const foodIsSafe = (foodId: string, allergies: Allergen[]) => conflictOf({ foodId, food: FOOD_BY_ID[foodId]?.name }, allergies).length === 0;
/** Filtro para alternativas y swaps: sólo alimentos aptos para el alumno (undefined = sin restricciones). */
export const acceptFor = (allergies: Allergen[]) => (allergies.length ? (foodId: string) => foodIsSafe(foodId, allergies) : undefined);
/** Leche como bebida: en los planes de mujer las alternativas no la proponen (yogur griego, café apenas cortado). */
export const FLUID_MILK = new Set(['leche', 'leche-deslactosada', 'bebida-soja', 'bebida-almendra']);
/** Filtro de alternativas del alumno: alergias + mujer sin leche fluida. */
export function acceptForPlan(plan: { profile: { sex: 'F' | 'M' } } & Parameters<typeof allergiesOf>[0]) {
  const allergies = allergiesOf(plan);
  const noMilk = plan.profile.sex === 'F';
  if (!allergies.length && !noMilk) return undefined;
  return (foodId: string) => !(noMilk && FLUID_MILK.has(foodId)) && foodIsSafe(foodId, allergies);
}

// ---------------------------------------------------------------------------------------------------------
// Sustitutos equivalentes y coherentes
// ---------------------------------------------------------------------------------------------------------

const MAIN_ROLES: MealRole[] = ['lunch', 'dinner'];
interface SubCtx {
  /** Rol del ingrediente en el plato: proteína, carbo, grasa o fijo. */
  r: 'p' | 'c' | 'f' | 'x';
  role?: MealRole;
  veg?: boolean;
  title?: string;
}
const EGG_SUBS = (c: SubCtx) =>
  // Huevo de acompañamiento (huevo duro en la ensalada, para ligar): queso. Huevo como proteína del plato: carne o tofu.
  c.r === 'x' ? ['queso-light', 'queso-deslactosado'] : c.role && MAIN_ROLES.includes(c.role) ? ['pollo', 'nalga', 'tofu', 'queso-light', 'queso-deslactosado'] : ['jamon', 'queso-light', 'queso-deslactosado', 'yogur', 'yogur-deslactosado'];
const LEGUME_SUBS = (c: SubCtx) => (c.r === 'p' ? ['huevo', 'queso-light', 'queso-deslactosado', 'pollo'] : ['yamani', 'arroz', 'papa']);
const SOY_SUBS = () => ['pollo', 'huevo', 'queso-light', 'queso-deslactosado'];
const PROTEIN_SNACK = () => ['yogur-proteico', 'yogur-deslactosado', 'yogur-vegetal', 'banana'];
const MILK_SUBS = () => ['leche-deslactosada', 'bebida-soja', 'bebida-almendra'];
const YOGURT_SUBS = (c: SubCtx) => ['yogur-deslactosado', 'yogur-vegetal', ...(c.r === 'p' ? ['claras', 'huevo'] : ['bebida-soja', 'banana'])];
const CHEESE_SUBS = (c: SubCtx) => (c.r === 'p' ? ['queso-deslactosado', 'jamon', 'huevo', 'tofu'] : ['queso-deslactosado', 'palta']);
const SUBS: Record<string, (c: SubCtx) => string[]> = {
  merluza: () => ['pollo', 'nalga', 'tofu', 'huevo', 'queso-light'],
  atun: () => ['pollo', 'jamon', 'huevo', 'queso-light', 'tofu'],
  huevo: EGG_SUBS,
  claras: EGG_SUBS,
  // Lactosa → deslactosados; APLV → bebidas y yogures vegetales fortificados, proteína vegetal, huevo o carne.
  leche: MILK_SUBS,
  'leche-deslactosada': MILK_SUBS,
  yogur: YOGURT_SUBS,
  'yogur-proteico': YOGURT_SUBS,
  'yogur-deslactosado': YOGURT_SUBS,
  whey: () => ['whey-isolate', 'proteina-vegetal', 'claras'],
  'whey-isolate': () => ['proteina-vegetal', 'claras'],
  untable: () => ['untable-deslactosado', 'palta'],
  'untable-deslactosado': () => ['palta'],
  'queso-light': CHEESE_SUBS,
  'queso-deslactosado': CHEESE_SUBS,
  ricota: () => ['untable-deslactosado', 'queso-deslactosado', 'palta', 'huevo'],
  nueces: () => ['semillas', 'palta', 'oliva'],
  // Pasta de maní untada (galletas, tostadas, pan) → palta; en el resto (postre, licuado) → semillas.
  mani: (c) => (/galletas|tostadas|pan|sándwich/i.test(c.title ?? '') ? ['palta', 'semillas'] : ['semillas', 'palta']),
  granola: () => ['avena', 'galletas-arroz'],
  lentejas: LEGUME_SUBS,
  garbanzos: LEGUME_SUBS,
  porotos: LEGUME_SUBS,
  tofu: SOY_SUBS,
  'soja-texturizada': SOY_SUBS,
  pan: () => ['pan-sin-tacc'],
  'pan-lactal': () => ['pan-sin-tacc'],
  'pan-arabe': () => ['pan-sin-tacc'],
  fideos: () => ['fideos-sin-tacc'],
  noquis: () => ['fideos-sin-tacc', 'papa'],
  avena: (c) => (/panquequ/i.test(c.title ?? '') ? ['harina-arroz'] : ['galletas-arroz']),
  'avena-instantanea': (c) => (/panquequ/i.test(c.title ?? '') ? ['harina-arroz'] : ['galletas-arroz']),
  'galletitas-agua': () => ['galletas-arroz'],
  'pan-rallado': () => ['harina-arroz'],
  'barrita-cereal': () => ['galletas-arroz', 'banana'],
  'alfajor-proteico': PROTEIN_SNACK,
  'barra-proteica': PROTEIN_SNACK,
};

/** Sustituto apto (para todas las restricciones del alumno y su dieta) o null si no hay ninguno coherente. */
export function pickSub(foodId: string, c: SubCtx, allergies: Allergen[], taken: string[] = []): string | null {
  const list = SUBS[foodId]?.(c) ?? [];
  return list.find((id) => FOOD_BY_ID[id] && !taken.includes(id) && foodIsSafe(id, allergies) && !(c.veg && MEAT.has(id))) ?? null;
}

const stepOf = (id: string) => {
  if (id === 'huevo' || id === 'claras') return unitStep(id);
  const u = FOOD_BY_ID[id]?.unit;
  return u && u.grams <= 60 ? u.grams : 5;
};
/** Macro que define al ingrediente (el que más energía aporta). */
const anchorOf = (id: string): 'p' | 'c' | 'f' => {
  const f = FOOD_BY_ID[id];
  const e = { p: f.p * 4, c: f.c * 4, f: f.f * 9 };
  return e.p >= e.c && e.p >= e.f ? 'p' : e.c >= e.f ? 'c' : 'f';
};
/** Gramos del sustituto que aportan lo mismo del macro que definía al original, dentro de su tope por toma. */
export function subGrams(from: string, grams: number, to: string, ctx: { sex?: Sex; role?: MealRole } = {}) {
  const a = anchorOf(from);
  const fa = FOOD_BY_ID[from][a];
  const ta = FOOD_BY_ID[to][a];
  const kcal = (f: { p: number; c: number; f: number }) => f.p * 4 + f.c * 4 + f.f * 9;
  // Mismo grupo (leche → bebida de soja): mismo aporte del macro que lo define. Otro grupo (queso untable → palta):
  // mismas calorías, así un fijo chico no se convierte en 70 g de palta.
  const sameGroup = FOOD_BY_ID[from].group === FOOD_BY_ID[to].group;
  const raw = sameGroup && ta >= 1 ? (grams * fa) / ta : (grams * kcal(FOOD_BY_ID[from])) / Math.max(1, kcal(FOOD_BY_ID[to]));
  const cap = portionCap(to, ctx);
  const st = stepOf(to);
  return Math.min(cap.max, Math.max(cap.min, Math.round(raw / st) * st));
}

/** Cómo se nombra cada alimento en títulos y pasos (para reescribirlos al sustituir). */
const TERMS: Record<string, RegExp> = {
  merluza: /merluza/gi,
  atun: /at[uú]n/gi,
  huevo: /huevos? (?:revueltos?|duros?|poch[eé]s?|enteros?)|huevos?/gi,
  claras: /claras(?: de huevo)?/gi,
  leche: /leche(?! deslactosada)/gi,
  yogur: /yogur(?:t)?(?: griego)?(?! deslactosado| bebible)/gi,
  'yogur-proteico': /yogur (?:bebible|proteico)/gi,
  whey: /proteína en polvo|whey(?: protein)?/gi,
  untable: /queso untable(?! sin lactosa)/gi,
  'leche-deslactosada': /leche(?: descremada)? deslactosada/gi,
  'yogur-deslactosado': /yogur(?: descremado)? deslactosado/gi,
  'whey-isolate': /proteína aislada(?: sin lactosa)?|whey(?: protein)? aislad[oa]/gi,
  'untable-deslactosado': /queso untable sin lactosa/gi,
  'queso-deslactosado': /queso(?: cremoso light)? sin lactosa/gi,
  'queso-light': /queso(?: light| cremoso(?: light)?)?(?! untable| sin lactosa)/gi,
  ricota: /ricota/gi,
  nueces: /nueces|frutos secos/gi,
  mani: /pasta de man[ií]|man[ií]/gi,
  granola: /granola/gi,
  lentejas: /lentejas/gi,
  garbanzos: /garbanzos/gi,
  porotos: /porotos/gi,
  tofu: /tofu(?: firme)?/gi,
  'soja-texturizada': /soja(?: texturizada)?/gi,
  pan: /pan integral|pan(?! lactal| árabe| sin| rallado)/gi,
  'pan-lactal': /pan lactal/gi,
  'pan-arabe': /pan árabe/gi,
  fideos: /fideos/gi,
  noquis: /ñoquis(?: de papa)?/gi,
  avena: /avena(?: arrollada)?/gi,
  'avena-instantanea': /avena(?: instantánea)?/gi,
  'galletitas-agua': /galletitas de agua/gi,
  'pan-rallado': /pan rallado/gi,
  'barrita-cereal': /barrita(?: de cereal)?/gi,
  'alfajor-proteico': /alfajor proteico/gi,
  'barra-proteica': /barra proteica/gi,
};
const DISPLAY: Record<string, string> = {
  pollo: 'pollo',
  nalga: 'peceto',
  jamon: 'jamón',
  huevo: 'huevo',
  tofu: 'tofu',
  'queso-light': 'queso',
  'queso-deslactosado': 'queso sin lactosa',
  yogur: 'yogur',
  'yogur-deslactosado': 'yogur deslactosado',
  'yogur-proteico': 'yogur bebible',
  'leche-deslactosada': 'leche deslactosada',
  'whey-isolate': 'proteína aislada sin lactosa',
  'untable-deslactosado': 'queso untable sin lactosa',
  'bebida-soja': 'bebida de soja',
  'bebida-almendra': 'bebida de almendras',
  'yogur-vegetal': 'yogur de soja',
  'proteina-vegetal': 'proteína vegetal',
  claras: 'claras',
  palta: 'palta',
  semillas: 'semillas de girasol y chía',
  oliva: 'aceite de oliva',
  avena: 'avena',
  'galletas-arroz': 'galletas de arroz',
  yamani: 'arroz yamaní',
  arroz: 'arroz',
  papa: 'papa',
  banana: 'banana',
  'pan-sin-tacc': 'pan sin TACC',
  'fideos-sin-tacc': 'fideos sin TACC',
  'harina-arroz': 'harina de arroz',
};

/** Reescribe un título o un paso: el nombre del alimento original pasa a ser el del sustituto. */
export function retitle(text: string, from: string, to: string) {
  const re = TERMS[from];
  if (!re || !text) return text;
  const name = DISPLAY[to] ?? FOOD_BY_ID[to]?.name.toLowerCase() ?? to;
  let done = false;
  return text.replace(re, (m) => {
    // Un mismo alimento nombrado dos veces ("huevos y claras") no repite el sustituto.
    if (done && from !== 'pan') return '';
    done = true;
    if (!name) return '';
    return m[0] === m[0].toUpperCase() ? name[0].toUpperCase() + name.slice(1) : name;
  }).replace(/\s{2,}/g, ' ').replace(/ (y|con|,) (y|con|,) /g, ' $1 ').replace(/ (y|con)\s*$/, '').trim();
}

/** Platos que no existen sin ese ingrediente (un omelette sin huevo no es un omelette): no se sustituyen. */
const CORE_DISH: Partial<Record<Allergen, RegExp>> = {
  egg: /omelett?e|tortilla|^revuelto|panquequ/i,
  legumes: /guiso de (lentejas|porotos|garbanzos)|milanesas? de soja|tofu/i,
};

/** Mismo tipo de alimento (leche → deslactosada, pan → pan sin TACC): los pasos de la receta siguen sirviendo. */
const keepsSteps = (from: string, to: string) => FOOD_BY_ID[from]?.group === FOOD_BY_ID[to]?.group && !['huevo', 'claras'].includes(from);

// ---------------------------------------------------------------------------------------------------------
// Recetas (banco de planes) y opciones ya armadas (cualquier plan)
// ---------------------------------------------------------------------------------------------------------

export interface RecipeLike {
  title: string;
  parts: { id: string; r: 'p' | 'c' | 'f' | 'x'; g?: number; min?: number; max?: number }[];
  steps: string[];
  /** Ingredientes que no tienen paso propio en la receta: se les genera uno al armar el plato. */
  loose?: string[];
}
export const recipeAllergens = (r: RecipeLike) => [...new Set(r.parts.flatMap((p) => FOOD_ALLERGENS[p.id] ?? []))];
export const recipeSafe = (r: RecipeLike, allergies: Allergen[]) => r.parts.every((p) => foodIsSafe(p.id, allergies));

/** Receta con sus ingredientes incompatibles sustituidos (título y pasos reescritos) o null si no queda coherente. */
export function subRecipe<T extends RecipeLike>(rec: T, allergies: Allergen[], ctx: { veg?: boolean; role?: MealRole; sex?: Sex } = {}): T | null {
  // Los tramos opcionales del título ("[ con proteína|whey]") nombran el id del ingrediente: se protegen del reemplazo.
  const ids: string[] = [];
  let title = rec.title.replace(/\|([a-z-]+)\]/g, (_, id: string) => `|§${ids.push(id) - 1}]`);
  let steps = [...rec.steps];
  const loose = [...(rec.loose ?? [])];
  const parts = [] as T['parts'];
  // Un plato que es su ingrediente (omelette, guiso de lentejas) no se disfraza: se ofrece otra receta.
  if (allergies.some((a) => CORE_DISH[a]?.test(rec.title) && rec.parts.some((p) => (FOOD_ALLERGENS[p.id] ?? []).includes(a)))) return null;
  const taken = rec.parts.map((x) => x.id);
  for (const p of rec.parts) {
    if (foodIsSafe(p.id, allergies)) {
      parts.push(p);
      continue;
    }
    const to = pickSub(p.id, { r: p.r, role: ctx.role, veg: ctx.veg, title: rec.title }, allergies, taken);
    if (!to) {
      // Sin sustituto: un fijo (ej. huevo para rebozar) se quita; un ingrediente principal invalida la receta.
      if (p.r === 'x' || p.r === 'f') {
        steps = steps.filter((st) => !st.includes(`{${p.id}}`));
        title = retitle(title, p.id, '');
        continue;
      }
      return null;
    }
    taken.push(to);
    parts.push({ ...p, id: to, g: p.r === 'x' && p.g ? subGrams(p.id, p.g, to, ctx) : p.g, min: undefined, max: undefined });
    ids.forEach((id, k) => id === p.id && (ids[k] = to));
    title = retitle(title, p.id, to);
    if (keepsSteps(p.id, to)) steps = steps.map((st) => retitle(st.split(`{${p.id}}`).join(`{${to}}`), p.id, to));
    else {
      steps = steps.filter((st) => !st.includes(`{${p.id}}`));
      loose.push(to);
    }
  }
  title = title.replace(/\|§(\d+)\]/g, (_, k: string) => `|${ids[+k]}]`);
  return { ...rec, title, steps, parts, loose };
}

/**
 * Opciones aptas de una comida del banco: primero las recetas que ya son seguras; si quedan menos de 4, se suman
 * las otras con el ingrediente sustituido (sin repetir títulos).
 */
export function safeRecipes<T extends RecipeLike>(recs: T[], allergies: Allergen[], ctx: { veg?: boolean; role?: MealRole; sex?: Sex } = {}): T[] {
  if (!allergies.length) return recs;
  const ok = recs.filter((r) => recipeSafe(r, allergies));
  let need = Math.min(4, recs.length) - ok.length;
  const out: T[] = [];
  for (const r of recs) {
    if (recipeSafe(r, allergies)) out.push(r);
    else if (need > 0) {
      const s = subRecipe(r, allergies, ctx);
      if (s && recipeSafe(s, allergies) && !out.some((x) => x.title === s.title) && !ok.some((x) => x.title === s.title)) {
        out.push(s);
        need--;
      }
    }
  }
  return out;
}

export interface AllergenConflict {
  mealId: string;
  meal: string;
  time: string;
  day: Meal['day'];
  /** 0 = opción 1 (sugerida), 1-4 = alternativas. */
  option: number;
  title: string;
  food: string;
  allergens: Allergen[];
}

/** Todos los alérgenos declarados que quedan en el plan (por comida, opción e ingrediente). */
export function allergenConflicts(plan: Pick<AthletePlan, 'meals' | 'anamnesis'>): AllergenConflict[] {
  const allergies = allergiesOf(plan);
  if (!allergies.length) return [];
  const out: AllergenConflict[] = [];
  for (const m of plan.meals) {
    const opts: MealOption[] = [{ title: m.title ?? m.name, items: m.items }, ...(m.alts ?? [])];
    opts.forEach((o, k) =>
      o.items.forEach((it) => {
        const a = conflictOf(it, allergies);
        if (a.length) out.push({ mealId: m.id, meal: m.name, time: m.time, day: m.day, option: k, title: o.title, food: it.food, allergens: a });
      }),
    );
  }
  return out;
}

/** Una opción ya armada con sus ingredientes incompatibles sustituidos (o quitados si no hay equivalente). */
function fixOption(o: MealOption, role: MealRole, allergies: Allergen[], veg: boolean, sex: Sex): { opt: MealOption; changed: boolean } {
  let title = o.title;
  let steps = o.steps ? [...o.steps] : undefined;
  let changed = false;
  // Pasos: se reescriben si el cambio es del mismo tipo (leche → deslactosada); si no, se regeneran.
  let regen = false;
  const taken = o.items.map((i) => i.foodId ?? '');
  const items = o.items.flatMap((it): FoodItem[] => {
    if (!conflictOf(it, allergies).length || !it.foodId || !FOOD_BY_ID[it.foodId]) return [it];
    changed = true;
    const to = pickSub(it.foodId, { r: anchorOf(it.foodId), role, veg, title }, allergies, taken);
    const re = TERMS[it.foodId];
    if (!to) {
      title = retitle(title, it.foodId, '');
      if (steps && re) steps = steps.filter((st) => !new RegExp(re.source, 'i').test(st));
      regen = true;
      return [];
    }
    taken.push(to);
    title = retitle(title, it.foodId, to);
    if (!keepsSteps(it.foodId, to)) regen = true;
    else if (steps && re) steps = steps.map((st) => retitle(st, it.foodId!, to));
    return [{ ...itemFromFood(to, subGrams(it.foodId, it.grams, to, { sex, role })), id: it.id }];
  });
  return { opt: { ...o, title, items, steps: regen ? undefined : steps }, changed };
}

/**
 * Corrige el plan entero: sustituye en todas las comidas y opciones los ingredientes con alérgenos declarados.
 * Los alimentos libres que no tienen equivalente en la base quedan como conflicto (el bloqueo de publicación los marca).
 */
export function fixPlanAllergens<P extends Pick<AthletePlan, 'meals' | 'anamnesis' | 'profile'>>(plan: P, veg = false): { plan: P; fixed: number } {
  const allergies = allergiesOf(plan);
  if (!allergies.length) return { plan, fixed: 0 };
  let fixed = 0;
  const meals = plan.meals.map((m) => {
    const main = fixOption({ title: m.title ?? m.name, items: m.items, steps: m.steps }, m.role, allergies, veg, plan.profile.sex);
    const alts = m.alts?.map((a) => fixOption(a, m.role, allergies, veg, plan.profile.sex));
    fixed += (main.changed ? 1 : 0) + (alts?.filter((a) => a.changed).length ?? 0);
    if (!main.changed && !alts?.some((a) => a.changed)) return m;
    return { ...m, items: main.opt.items, title: m.title ? main.opt.title : m.title, steps: main.opt.steps, alts: alts?.map((a) => a.opt) };
  });
  return { plan: { ...plan, meals }, fixed };
}

/** Sellos de aptitud de una opción para las restricciones del alumno (+ vegetariano si no lleva carne ni pescado). */
export function sealsFor(items: { foodId?: string; food: string }[], allergies: Allergen[], veg: boolean): string[] {
  const seals = allergies.filter((a) => items.every((i) => !conflictOf(i, [a]).length)).map((a) => ALLERGEN_INFO[a].seal);
  if (veg && items.every((i) => !i.foodId || !MEAT.has(i.foodId))) seals.push('Vegetariano');
  return seals;
}

/** ¿Ninguna opción del plan lleva carne ni pescado? (sello «Vegetariano» en la app del alumno). */
export const planIsMeatFree = (plan: Pick<AthletePlan, 'meals'>) => plan.meals.every((m) => [m.items, ...(m.alts ?? []).map((a) => a.items)].every((xs) => xs.every((i) => !i.foodId || !MEAT.has(i.foodId))));

/** Aviso fijo para celíacos en cada plato de la app del alumno. */
export const CELIAC_PLATE_WARNING = 'Celíaco: utensilios, tabla, tostadora y colador propios; fiambres, quesos, dulces y suplementos con el sello oficial «Sin TACC».';
