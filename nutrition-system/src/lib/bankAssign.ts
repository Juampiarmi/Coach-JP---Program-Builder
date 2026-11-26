import { allergiesOf, foodIsSafe } from './allergens';
import { retitleBase } from './baseSwap';
import { DISH_CATEGORIES, type BrandFood } from './foodBrandDb';
import { FOOD_BY_ID, macrosFor, snapUnit, unitStep } from './foods';
import { itemFromFood as itemFromFoodSafe } from './seed';
import { catalogDishForMeal, fitRecipeToMeal, type BankRecipe } from './planBank';
import { portionCap } from './portionCaps';
import { macroOf } from './quickSwaps';
import type { AthletePlan, FoodItem, Meal } from './types';

/**
 * BANCO GLOBAL · ASIGNACIÓN AUTO-ESCALADA: cualquier alimento o plato del banco a una comida del alumno, con los
 * gramos calculados para lo que aporta esa comida (sus calorías y macros), dentro de los topes por sexo, con pisos
 * de carne, huevos enteros y sus restricciones. Se usa para la vista previa y para confirmar.
 */
export type BankSource = { kind: 'catalog' | 'dish' | 'food'; id: string };
export interface AssignPreview {
  title: string;
  items: FoodItem[];
  steps?: string[];
}

const kcalOf = (xs: { p: number; c: number; f: number }[]) => xs.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0);

/** Pasos de un plato guardado sin las cantidades originales (las reales salen de los ingredientes escalados). */
const stripQty = (t: string) => t.replace(/\s*\((?:≈\s*)?[^)]*\d+\s*g\)/g, '').replace(/\s*\(≈[^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();

/** Plato guardado del coach (ingredientes con gramos) → receta escalable: proteína, carbo y grasa principales. */
export function recipeFromIngredients(title: string, ingr: { foodId?: string; gramos: number }[], pasos: string[] = []): BankRecipe | null {
  const list = ingr.filter((x) => x.foodId && FOOD_BY_ID[x.foodId] && x.gramos > 0);
  if (!list.length) return null;
  const pick = (groups: string[], k: 'p' | 'c' | 'f', taken: string[]) =>
    list
      .filter((x) => groups.includes(FOOD_BY_ID[x.foodId!].group) && !taken.includes(x.foodId!))
      .sort((a, b) => FOOD_BY_ID[b.foodId!][k] * b.gramos - FOOD_BY_ID[a.foodId!][k] * a.gramos)[0]?.foodId;
  const p = pick(['lean-protein', 'eggs', 'dairy-protein', 'whey'], 'p', []);
  const c = pick(['starch', 'cereal', 'fruit', 'sport-carb'], 'c', p ? [p] : []);
  const f = pick(['fat'], 'f', [p, c].filter(Boolean) as string[]);
  const parts = list.map((x) => (x.foodId === p ? { id: x.foodId!, r: 'p' as const } : x.foodId === c ? { id: x.foodId!, r: 'c' as const } : x.foodId === f ? { id: x.foodId!, r: 'f' as const } : { id: x.foodId!, r: 'x' as const, g: x.gramos }));
  return { title, parts, steps: pasos.map(stripQty).filter(Boolean) };
}

/** Un alimento a la comida: reemplaza al ingrediente que cumple su mismo rol (equivalente) o se suma en porción real. */
function foodIntoMeal(foodId: string, meal: Meal, plan: Pick<AthletePlan, 'anamnesis' | 'profile'>): AssignPreview | null {
  const ref = FOOD_BY_ID[foodId];
  if (!ref) return null;
  const allergies = allergiesOf(plan);
  if (allergies.length && !foodIsSafe(foodId, allergies)) return null;
  const ctx = { sex: plan.profile.sex, role: meal.role };
  const cap = portionCap(foodId, ctx);
  // Plato preparado de la Food & Brand DB sin receta: reemplaza la comida entera con las mismas calorías.
  if (ref.group === 'plato') {
    const kpg = (ref.p * 4 + ref.c * 4 + ref.f * 9) / 100;
    const g = Math.min(cap.max, Math.max(cap.min, Math.round(kcalOf(meal.items) / kpg / 10) * 10));
    return { title: ref.name, items: [itemFromFoodSafe(foodId, g)] };
  }
  const k = macroOf(foodId) ?? 'c';
  const target = meal.items.filter((i) => i.foodId && i.foodId !== foodId && macroOf(i.foodId) === k).sort((a, b) => b[k] - a[k])[0];
  let g = target && ref[k] > 0 ? target[k] / (ref[k] / 100) : (ref.unit?.grams ?? Math.max(cap.min, 100));
  g = unitStep(foodId) !== 5 ? snapUnit(foodId, g) : Math.round(g / 5) * 5;
  g = Math.min(cap.max, Math.max(cap.min || 5, g));
  const item = { ...itemFromFoodSafe(foodId, g), id: target?.id ?? `bank-${Date.now().toString(36)}` };
  const items = target ? meal.items.map((i) => (i.id === target.id ? item : i)) : [...meal.items, item];
  const title = target?.foodId ? (retitleBase(meal.title, target.foodId, foodId) ?? meal.title ?? ref.name) : meal.title ? `${meal.title} + ${ref.name.split(' (')[0].toLowerCase()}` : ref.name;
  return { title, items };
}

/** Vista previa (y resultado) de asignar un alimento o plato del Banco Global a una comida del alumno. */
export function previewAssign(src: BankSource, meal: Meal, plan: Pick<AthletePlan, 'anamnesis' | 'profile'>, db: BrandFood[] = []): AssignPreview | null {
  if (src.kind === 'catalog') return catalogDishForMeal(src.id, meal, plan);
  if (src.kind === 'food') return foodIntoMeal(src.id, meal, plan);
  const b = db.find((x) => x.id === src.id);
  if (!b) return null;
  const rec = DISH_CATEGORIES.includes(b.categoria) && b.ingredientes?.length ? recipeFromIngredients(b.nombre, b.ingredientes, b.pasos) : null;
  if (rec) {
    const r = fitRecipeToMeal(rec, meal, plan);
    if (r) return { ...r, title: b.nombre };
    return null;
  }
  return foodIntoMeal(b.id, meal, plan);
}

/** Macros de una lista de ingredientes (ficha técnica). */
export function totalsOf(items: FoodItem[]) {
  return items.reduce((a, i) => ({ g: a.g + i.grams, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, kcal: a.kcal + i.p * 4 + i.c * 4 + i.f * 9 }), { g: 0, p: 0, c: 0, f: 0, kcal: 0 });
}
export { macrosFor };
