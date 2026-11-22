import { equivalentGrams, FOOD_BY_ID, FOODS, type FoodRef } from './foods';
import { fitsSlot } from './mealSlots';
import { portionCap } from './portionCaps';
import { itemFromFood } from './seed';
import type { FoodItem, Meal, MealOption, Sex } from './types';

/**
 * CAMBIAR LA BASE DE UNA COMIDA EN UN TOQUE: la proteína (pollo → cuadril) o el carbo (arroz → papa) se cambia en
 * la Opción 1 y en todas las alternativas que la usan, con la porción equivalente del macro que la define, dentro de
 * su tope por toma, y con el nombre del plato reescrito.
 */
const PROTEIN = new Set(['lean-protein', 'eggs', 'dairy-protein']);
const CARB = new Set(['starch', 'cereal']);
export type BaseKind = 'protein' | 'carb';
export const kindOf = (foodId?: string): BaseKind | null => {
  const g = foodId ? FOOD_BY_ID[foodId]?.group : undefined;
  return g && PROTEIN.has(g) ? 'protein' : g && CARB.has(g) ? 'carb' : null;
};

/** Bases de la Opción 1 que se pueden cambiar (la proteína y el carbo principales). */
export function bases(meal: Meal): FoodItem[] {
  const seen = new Set<string>();
  return meal.items.filter((i) => i.foodId && kindOf(i.foodId) && !seen.has(i.foodId) && seen.add(i.foodId));
}

/** Reemplazos posibles: mismo tipo (proteína o carbo), aptos para ese momento del día y para las restricciones. */
export function baseOptions(meal: Meal, fromId: string, accept?: (id: string) => boolean): FoodRef[] {
  const kind = kindOf(fromId);
  const groups = kind === 'protein' ? PROTEIN : CARB;
  return FOODS.filter((f) => f.id !== fromId && groups.has(f.group) && fitsSlot(f, meal.role) && (!accept || accept(f.id)) && !meal.items.some((i) => i.foodId === f.id));
}

const short = (id: string) => FOOD_BY_ID[id].name.split(' (')[0].replace(/ (magro|magra|cocido|cocida|descremad[oa]|integral)$/i, '').toLowerCase();
/** Palabras con las que el plato nombra a cada base (para reescribir el título). */
const WORDS: Record<string, RegExp> = {
  pollo: /pechuga(?: de pollo)?|pollo/gi,
  cuadril: /cuadril/gi,
  lomo: /lomo/gi,
  nalga: /peceto|nalga/gi,
  picada: /carne picada(?: especial)?|bolognesa magra|hamburguesas? caseras?(?: de carne magra)?/gi,
  merluza: /merluza/gi,
  atun: /at[uú]n/gi,
  cerdo: /bondiola|cerdo|carré/gi,
  arroz: /arroz(?: blanco)?(?! yaman)/gi,
  yamani: /arroz yaman[ií]/gi,
  papa: /papas?(?! y batata)/gi,
  batata: /batatas?/gi,
  fideos: /fideos/gi,
  polenta: /polenta/gi,
  noquis: /ñoquis/gi,
  pan: /pan integral|tostadas integrales/gi,
};

export function retitleBase(title: string | undefined, from: string, to: string) {
  if (!title) return title;
  const re = WORDS[from] ?? new RegExp(short(from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const name = short(to);
  let hit = false;
  const out = title.replace(re, (m) => {
    hit = true;
    return m[0] === m[0].toUpperCase() ? name[0].toUpperCase() + name.slice(1) : name;
  });
  return hit ? out : title;
}

function swapIn(o: MealOption, from: string, to: string, sex: Sex, role: Meal['role']): MealOption {
  if (!o.items.some((i) => i.foodId === from)) return o;
  const cap = portionCap(to, { sex, role });
  return {
    ...o,
    title: retitleBase(o.title, from, to) ?? o.title,
    // La técnica cambia con la base (pollo a la plancha ≠ papa al horno): los pasos se regeneran.
    steps: undefined,
    technique: undefined,
    items: o.items.map((i) => (i.foodId === from ? { ...itemFromFood(to, Math.min(cap.max, Math.max(cap.min, equivalentGrams(from, i.grams, to)))), id: i.id } : i)),
  };
}

/** La comida con la base cambiada en todas sus opciones. */
export function swapBase(meal: Meal, from: string, to: string, sex: Sex): Meal {
  const main = swapIn({ title: meal.title ?? '', items: meal.items, steps: meal.steps, technique: meal.technique }, from, to, sex, meal.role);
  return {
    ...meal,
    items: main.items,
    title: meal.title ? main.title : meal.title,
    steps: main === undefined ? meal.steps : main.steps,
    technique: main.technique,
    alts: meal.alts?.map((a) => swapIn(a, from, to, sex, meal.role)),
  };
}
