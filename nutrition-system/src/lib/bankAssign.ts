import { allergiesOf, FLUID_MILK, foodIsSafe } from './allergens';
import { retitleBase } from './baseSwap';
import { DISH_CATEGORIES, dishYield, type BrandFood } from './foodBrandDb';
import { stepsWithYield, type YieldInfo } from './yieldInfo';
import { FOOD_BY_ID, macrosFor, snapUnit, unitStep } from './foods';
import { itemFromFood as itemFromFoodSafe } from './seed';
import { CATALOG } from './catalog';
import { catalogDishForMeal, fitRecipeToMeal, ROLES_OF_CATEGORY, type BankRecipe } from './planBank';
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
  yieldInfo?: YieldInfo;
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
    const yieldInfo = { ...dishYield(b), for: b.nombre };
    const r = fitRecipeToMeal({ ...rec, yieldInfo }, meal, plan);
    if (r) return { ...r, title: b.nombre, steps: stepsWithYield(r.steps, yieldInfo), yieldInfo };
    return null;
  }
  return foodIntoMeal(b.id, meal, plan);
}

/**
 * Flujo rápido del Banco Global: el plato elegido como Opción 1 + las 2 variantes del Recetario más parecidas en
 * calorías y proteína para esa comida (isocalóricas / isoproteicas), todas escaladas al alumno y sus restricciones.
 */
export function previewTriple(src: BankSource, meal: Meal, plan: Pick<AthletePlan, 'anamnesis' | 'profile'>, db: BrandFood[] = []): AssignPreview[] {
  const main = previewAssign(src, meal, plan, db);
  if (!main) return [];
  const t = totalsOf(main.items);
  const alts = CATALOG.filter((d) => !(src.kind === 'catalog' && src.id === d.id) && ROLES_OF_CATEGORY[d.category].includes(meal.role))
    .map((d) => catalogDishForMeal(d.id, { ...meal, items: main.items }, plan))
    .filter((o): o is NonNullable<typeof o> => !!o && o.title !== main.title)
    .map((o) => {
      const u = totalsOf(o.items);
      return { o, score: Math.abs(u.kcal - t.kcal) / Math.max(1, t.kcal) + (Math.abs(u.p - t.p) / Math.max(1, t.p)) * 1.5 };
    })
    .sort((a, b) => a.score - b.score);
  const out: AssignPreview[] = [main];
  for (const { o } of alts) if (out.length < 3 && !out.some((x) => x.title === o.title)) out.push(o);
  return out;
}

/** Plato del Recetario más parecido a lo que hoy aporta la comida (para «3 variantes del Banco» en cada comida). */
export function bestCatalogFor(meal: Meal, plan: Pick<AthletePlan, 'anamnesis' | 'profile'>): BankSource | null {
  const t = totalsOf(meal.items);
  let best: { id: string; score: number } | null = null;
  for (const d of CATALOG) {
    if (!ROLES_OF_CATEGORY[d.category].includes(meal.role)) continue;
    const o = catalogDishForMeal(d.id, meal, plan);
    if (!o) continue;
    const u = totalsOf(o.items);
    const score = t.kcal > 50 ? Math.abs(u.kcal - t.kcal) / t.kcal + (Math.abs(u.p - t.p) / Math.max(1, t.p)) * 1.5 : 0;
    if (!best || score < best.score) best = { id: d.id, score };
  }
  return best ? { kind: 'catalog', id: best.id } : null;
}

/** Macros de una lista de ingredientes (ficha técnica). */
export function totalsOf(items: FoodItem[]) {
  return items.reduce((a, i) => ({ g: a.g + i.grams, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, kcal: a.kcal + i.p * 4 + i.c * 4 + i.f * 9 }), { g: 0, p: 0, c: 0, f: 0, kcal: 0 });
}
export { macrosFor };

/** Un candidato del Banco Global para reemplazar una opción de una comida, ya escalado al alumno. */
export interface BankCandidate {
  src: BankSource;
  name: string;
  origin: 'Recetario' | 'Mis platos';
  preview: AssignPreview;
  /** Desvío relativo en kcal y proteína respecto de la opción que se reemplaza. */
  dk: number;
  dp: number;
  score: number;
}

const DB_ROLES: Partial<Record<string, Meal['role'][]>> = { desayuno: ['breakfast', 'snack'], colacion: ['snack', 'peri', 'post', 'breakfast'], postre: ['snack', 'post'], licuado: ['breakfast', 'snack', 'peri', 'post'] };

/**
 * «Cambiar por plato del Banco Global» en una comida / opción: sólo platos aptos para el alumno (alergias,
 * intolerancias, vegetariano, Keto / Low Carb, topes por sexo) y de esa franja del día, con los gramos ya
 * escalados a lo que aporta la opción, ordenados por cercanía calórica y proteica.
 */
export function bankCandidates(meal: Meal, items: FoodItem[], plan: Pick<AthletePlan, 'anamnesis' | 'profile'>, db: BrandFood[] = [], exclude?: string): BankCandidate[] {
  const target: Meal = { ...meal, items };
  const t = totalsOf(items);
  const allergies = allergiesOf(plan);
  const safe = (p: AssignPreview) => p.items.every((i) => !i.foodId || foodIsSafe(i.foodId, allergies)) && (plan.profile.sex !== 'F' || p.items.every((i) => !i.foodId || !FLUID_MILK.has(i.foodId)));
  const out: BankCandidate[] = [];
  const push = (src: BankSource, name: string, origin: BankCandidate['origin']) => {
    const preview = previewAssign(src, target, plan, db);
    if (!preview || !preview.items.length || !safe(preview) || preview.title === exclude) return;
    const u = totalsOf(preview.items);
    const dk = t.kcal > 0 ? u.kcal / t.kcal - 1 : 0;
    const dp = t.p > 0 ? u.p / t.p - 1 : 0;
    out.push({ src, name, origin, preview, dk, dp, score: Math.abs(dk) + Math.abs(dp) * 1.5 });
  };
  for (const d of CATALOG) if (ROLES_OF_CATEGORY[d.category].includes(meal.role)) push({ kind: 'catalog', id: d.id }, d.title, 'Recetario');
  for (const b of db) {
    if (!DISH_CATEGORIES.includes(b.categoria) || !b.ingredientes?.length) continue;
    const roles = DB_ROLES[b.categoria] ?? ['lunch', 'dinner'];
    if (roles.includes(meal.role)) push({ kind: 'dish', id: b.id }, b.nombre, 'Mis platos');
  }
  return out.sort((a, b) => a.score - b.score);
}
