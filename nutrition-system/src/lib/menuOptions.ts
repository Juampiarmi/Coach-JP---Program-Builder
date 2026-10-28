import { FOOD_BY_ID, FOODS, macrosFor, round1, round2, type FoodRef } from './foods';
import { uid } from './seed';
import type { FoodItem, Meal, MealOption, MealRole } from './types';

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

/** Nombre de plato real a partir del desglose: "Pechuga de pollo con arroz blanco y vegetales mixtos". */
export function autoTitle(items: FoodItem[]) {
  const named = items
    .filter((i) => i.grams > 0 && !(i.foodId && ['oliva'].includes(i.foodId)))
    .map((i) => ({ i, g: i.foodId ? (FOOD_BY_ID[i.foodId]?.group ?? 'zz') : 'zz' }))
    .sort((a, b) => (ORDER.indexOf(a.g) + 1 || 99) - (ORDER.indexOf(b.g) + 1 || 99) || b.i.grams - a.i.grams)
    .map((x) => short(x.i.food));
  if (!named.length) return 'Plato del plan';
  const [head, ...rest] = named;
  if (!rest.length) return head;
  const tail = rest.map(lower);
  return `${head} con ${tail.length > 1 ? `${tail.slice(0, -1).join(', ')} y ${tail[tail.length - 1]}` : tail[0]}`;
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
  return `${base ? `${base.charAt(0).toUpperCase()}${base.slice(1)}. ` : ''}Condimentos libres: sal moderada, pimienta, orégano, pimentón, ajo, perejil y limón.`;
}

/** Categorías de plato apropiadas para cada momento del día. */
const ROLE_DISHES: Record<MealRole, string[]> = {
  breakfast: ['desayuno'],
  snack: ['desayuno', 'dulce'],
  peri: ['desayuno', 'dulce'],
  post: ['desayuno', 'minuta'],
  lunch: ['minuta', 'tarta', 'parrilla'],
  dinner: ['minuta', 'tarta', 'parrilla'],
};
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

/** Candidatos de plato (Food & Brand DB + recetas del coach) para la Opción 2, filtrados por canasta. */
export function dishCandidates(role: MealRole, allowed?: Set<string> | null): FoodRef[] {
  const cats = ROLE_DISHES[role] ?? ROLE_DISHES.lunch;
  return FOODS.filter((f) => f.group === 'plato' && !f.flex && f.dishCat && cats.includes(f.dishCat) && (!allowed || allowed.has(f.id)));
}

/**
 * Opción 2 equivalente: un plato del catálogo escalado por porciones (¼) para igualar la proteína de la Opción 1,
 * más acompañamientos (carbo / grasa / ensalada) que cierran carbos y grasas. Devuelve las mejores alternativas.
 */
export function suggestAlternatives(meal: Meal, allowed?: Set<string> | null, n = 5): MealOption[] {
  const T = totals(meal.items);
  if (T.kcal < 80) return [];
  const used = new Set(meal.items.map((i) => i.foodId));
  const out: { opt: MealOption; err: number }[] = [];
  for (const d of dishCandidates(meal.role, allowed)) {
    if (used.has(d.id) || !(d.p > 0)) continue;
    const portion = d.unit?.grams ?? 100;
    // Infusiones / bocados chicos (< 120 kcal la porción) no son plato principal de una opción.
    if (((d.p * 4 + d.c * 4 + d.f * 9) * portion) / 100 < 120) continue;
    const raw = (T.p / d.p) * 100;
    const portions = Math.min(2, Math.max(0.5, Math.round((raw / portion) * 4) / 4));
    const grams = Math.round(portions * portion);
    const items: FoodItem[] = [item(d.id, grams)];
    let cur = totals(items);
    // Proteína: si el plato no llega (> 8 g de diferencia), se suma una proteína simple acorde al momento del día.
    const dp = T.p - cur.p;
    if (dp > 8) {
      const protId = meal.role === 'lunch' || meal.role === 'dinner' ? 'pollo' : dp > 18 ? 'whey' : 'yogur';
      const r = FOOD_BY_ID[protId];
      const cap = protId === 'whey' ? 40 : protId === 'pollo' ? 200 : 250;
      items.push(item(protId, Math.min(cap, Math.max(10, Math.round(((dp / r.p) * 100) / 5) * 5))));
      cur = totals(items);
    }
    // Carbos: acompañamiento si faltan > 10 g.
    const dc = T.c - cur.c;
    if (dc > 10) {
      const side = (CARB_SIDE[meal.role] ?? CARB_SIDE.lunch).find((id) => FOOD_BY_ID[id]);
      if (side) {
        const r = FOOD_BY_ID[side];
        const g = Math.min(250, Math.max(10, Math.round(((dc / r.c) * 100) / 5) * 5));
        items.push(item(side, g));
      }
    }
    cur = totals(items);
    const df = T.f - cur.f;
    if (df > 4) {
      const fatId = meal.role === 'lunch' || meal.role === 'dinner' ? (df > 7 ? 'palta' : 'oliva') : 'nueces';
      const r = FOOD_BY_ID[fatId];
      const cap = fatId === 'oliva' ? 10 : fatId === 'palta' ? 60 : 20;
      items.push(item(fatId, Math.min(cap, Math.max(5, Math.round(((df / r.f) * 100) / 5) * 5))));
    }
    if ((meal.role === 'lunch' || meal.role === 'dinner') && !/ensalada|vegetal/i.test(d.name)) items.push(item('vegetales', 150));
    cur = totals(items);
    const err = Math.abs(cur.p - T.p) / Math.max(T.p, 5) + Math.abs(cur.c - T.c) / Math.max(T.c, 10) + Math.abs(cur.f - T.f) / Math.max(T.f, 5) + Math.abs(cur.kcal - T.kcal) / T.kcal;
    const portionTxt = portions === 1 ? '' : `${String(portions).replace('.', ',')} × `;
    const sides = items.slice(1).map((i) => lower(short(i.food)));
    out.push({
      opt: {
        title: `${portionTxt}${short(d.name)}${sides.length ? ` + ${sides.join(' + ')}` : ''}`,
        items,
        technique: d.technique ?? d.detail ?? autoTechnique(items),
      },
      err,
    });
  }
  return out.sort((a, b) => a.err - b.err).slice(0, n).map((x) => x.opt);
}

/** Reescala la Opción 2 para que siga a la Opción 1 en kcal (tras ajustes de porciones o cierre de macros). */
export function fitAltToMain(meal: Meal): Meal {
  if (!meal.alt?.items.length) return meal;
  const a = totals(meal.alt.items).kcal;
  const m = totals(meal.items).kcal;
  if (!(a > 0) || Math.abs(m / a - 1) <= 0.03) return meal;
  const k = m / a;
  return {
    ...meal,
    alt: { ...meal.alt, items: meal.alt.items.map((i) => rescale(i, Math.max(5, Math.round((i.grams * k) / 5) * 5))) },
  };
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

const ALT_ROLES: MealRole[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** Completa la Opción 2 de desayuno / almuerzo / merienda / cena que no la tengan (respeta la canasta del atleta). */
export function withAlternatives<P extends { meals: Meal[]; anamnesis?: { basket: string[] | null } }>(plan: P, overwrite = false): P {
  const basket = plan.anamnesis?.basket;
  const allowed = basket ? new Set(basket) : null;
  return {
    ...plan,
    meals: plan.meals.map((m) => {
      if (!ALT_ROLES.includes(m.role) || (m.alt && !overwrite)) return m;
      const [best] = suggestAlternatives(m, allowed, 1);
      return best ? { ...m, alt: best } : m;
    }),
  };
}
