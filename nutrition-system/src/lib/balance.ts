import { computeTelemetry, dayTotals, mealTotals } from './bioenergetics';
import { FOOD_BY_ID, GROUP_ANCHOR, inferMacroPrincipal, macrosFor, round1, round2 } from './foods';
import { consolidateItems, consolidateMeal } from './schedule';
import { uid } from './seed';
import type { AthletePlan, DayMode, FoodItem, Macros, Meal } from './types';

/** Tolerancia de cierre por macro (carbos / grasas): 100 % ± 3 % de cada meta. */
export const BALANCE_TOLERANCE = 0.03;
/** Tolerancia de cierre calórico del día: 100 % ± 1 % (tolerancia cero a "kcal pendientes" con todo tildado). */
export const KCAL_TOLERANCE = 0.01;
/** Tope de aceite por comida (1 cda); el resto de la brecha de grasas va a palta / frutos secos. */
const OIL_CAP_G = 15;
/** Topes gastronómicos por comida: aceite 1 cda; palta 70 g (acompaña ensalada o tostada, nunca porción masiva). */
const CAPS: Record<string, number> = { oliva: OIL_CAP_G, palta: 70, leche: 500, isotonica: 1000, whey: 60, huevo: 250, claras: 330 };
/** Porción máxima realista por comida según el grupo (el cierre nunca prescribe 1,6 kg de yogur). */
const GROUP_MAX: Record<string, number> = {
  'lean-protein': 300,
  'dairy-protein': 350,
  eggs: 250,
  whey: 60,
  'protein-snack': 100,
  starch: 450,
  cereal: 120,
  fruit: 300,
  'sport-carb': 120,
  fat: 40,
};
const foodCap = (foodId: string | undefined) => {
  if (!foodId) return Infinity;
  const ref = FOOD_BY_ID[foodId];
  return CAPS[foodId] ?? (ref ? (GROUP_MAX[ref.group] ?? Infinity) : Infinity);
};
const capOf = (i: FoodItem, m: Meal) => (i.foodId === 'oliva' && m.items.some((x) => x.foodId === 'palta') ? 5 : foodCap(i.foodId));

type Anchor = 'p' | 'c' | 'f';
type DayTotals = Macros & { kcal: number };

export interface DayBalance {
  day: DayMode;
  target: DayTotals;
  before: DayTotals;
  after: DayTotals;
  /** Alimentos cuya porción se modificó o se agregó. */
  changed: number;
}

/** Macro que aporta cada alimento al cierre (vegetales no se tocan). */
function sourceOf(item: FoodItem): Anchor | null {
  const ref = item.foodId ? FOOD_BY_ID[item.foodId] : undefined;
  if (ref) return ref.group === 'veg' ? null : GROUP_ANCHOR[ref.group];
  const m = inferMacroPrincipal(item);
  return m === 'protein' ? 'p' : m === 'carbs' ? 'c' : m === 'fat' ? 'f' : null;
}

function rescale(item: FoodItem, grams: number): FoodItem {
  if (item.foodId && FOOD_BY_ID[item.foodId]) return { ...item, grams, ...macrosFor(item.foodId, grams)! };
  const k = item.grams > 0 ? grams / item.grams : 0;
  return { ...item, grams, p: round1(item.p * k), c: round1(item.c * k), f: round1(item.f * k), leucine: round2(item.leucine * k) };
}

const isOil = (i: FoodItem) => i.foodId === 'oliva';
const snap = (g: number) => Math.max(5, Math.round(g / 5) * 5);

/** % de desvío de cada macro y de las kcal respecto de la meta del día. */
export function dayDeviation(plan: AthletePlan, day: DayMode) {
  const t = computeTelemetry(plan);
  const target = day === 'on' ? { ...t.gramsOn, kcal: t.kcalOn } : { ...t.gramsOff, kcal: t.kcalOff };
  const got = dayTotals(plan.meals, day);
  const pct = (g: number, tg: number) => (tg > 0 ? (g / tg - 1) * 100 : 0);
  return { target, got, kcal: pct(got.kcal, target.kcal), p: pct(got.p, target.p), c: pct(got.c, target.c), f: pct(got.f, target.f) };
}

/** true si las comidas del día cierran las kcal al 100 % ± 1 % y carbos / grasas al 100 % ± 3 %. */
export function isDayBalanced(plan: AthletePlan, day: DayMode) {
  if (!plan.meals.some((m) => m.day === day || m.day === 'both')) return true;
  const d = dayDeviation(plan, day);
  const tol = BALANCE_TOLERANCE * 100;
  return Math.abs(d.kcal) <= KCAL_TOLERANCE * 100 && Math.abs(d.c) <= tol && Math.abs(d.f) <= tol;
}

/**
 * Ajuste fino de kcal (gramo a gramo) sobre la fuente de almidón más grande del día (arroz / papa / batata…);
 * si no hay almidón, sobre la grasa más grande (sin tocar el aceite).
 */
function closeKcal(meals: Meal[], day: DayMode, target: DayTotals): { meals: Meal[]; changed: number } {
  const targetKcal = target.kcal;
  let changed = 0;
  for (let pass = 0; pass < 3; pass++) {
    const gap = targetKcal - dayTotals(meals, day).kcal;
    if (Math.abs(gap) <= targetKcal * KCAL_TOLERANCE * 0.4) break;
    // Candidatos con lugar bajo su tope realista (con la dirección de la brecha: para restar sirve cualquiera).
    const pick = (macro: Anchor, days: Meal['day'][]) =>
      meals
        .flatMap((m) =>
          days.includes(m.day)
            ? m.items.filter((i) => sourceOf(i) === macro && !isOil(i) && i.grams > 0 && (gap < 0 || i.grams < capOf(i, m))).map((i) => ({ ...i, cap: capOf(i, m) }))
            : [],
        )
        .sort((a, b) => b[macro] - a[macro])[0];
    // Se corrige el macro más desviado en la dirección de la brecha (si sobran kcal, el que más se pasó; si faltan, el que más falta).
    const got = dayTotals(meals, day);
    const dev = (k: Anchor) => (target[k] > 0 ? got[k] / target[k] - 1 : 0);
    const order = (['c', 'f', 'p'] as Anchor[]).sort((a, b) => (gap < 0 ? dev(b) - dev(a) : dev(a) - dev(b)));
    let host: (FoodItem & { cap: number }) | undefined;
    for (const k of order) {
      host = pick(k, [day]) ?? pick(k, [day, 'both']);
      if (host) break;
    }
    if (!host) break;
    const kcalPerG = (host.p * 4 + host.c * 4 + host.f * 9) / host.grams;
    if (!(kcalPerG > 0)) break;
    const grams = Math.min(host.cap, Math.max(5, Math.round(host.grams + gap / kcalPerG)));
    if (grams === host.grams) break;
    meals = meals.map((m) => ({ ...m, items: m.items.map((i) => (i.id === host.id ? rescale(i, grams) : i)) }));
    changed++;
  }
  return { meals, changed };
}

/**
 * Cierra la brecha de carbohidratos y grasas de un día escalando proporcionalmente las porciones de sus
 * fuentes (arroz / papa / avena… y palta / frutos secos / aceite ≤ 15 g por comida). Primero se tocan las
 * comidas exclusivas del día; las compartidas (ON + OFF) sólo si el día no tiene fuentes propias.
 * Si el día no tiene ninguna fuente del macro, se agrega una porción en la comida principal.
 */
function balanceMacro(meals: Meal[], day: DayMode, macro: Anchor, target: number): { meals: Meal[]; changed: number } {
  let changed = 0;
  for (let pass = 0; pass < 4; pass++) {
    const got = dayTotals(meals, day)[macro];
    const gap = target - got;
    if (target <= 0 || Math.abs(gap) <= target * BALANCE_TOLERANCE * 0.5) break;

    const pick = (days: Meal['day'][]) =>
      meals.flatMap((m) =>
        days.includes(m.day) ? m.items.filter((i) => sourceOf(i) === macro && !(gap > 0 && i.grams >= capOf(i, m))).map((i) => ({ m, i })) : [],
      );
    let pool = pick([day]);
    if (pool.reduce((a, x) => a + x.i[macro], 0) < 1) pool = pick([day, 'both']);
    const poolSum = pool.reduce((a, x) => a + x.i[macro], 0);

    if (poolSum < 1) {
      if (gap <= 0 || macro === 'p') break;
      const next = injectSource(meals, day, macro, gap);
      if (next === meals) break; // sin lugar realista para sumar: la brecha queda a la vista del coach
      meals = next;
      changed++;
      continue;
    }

    const k = Math.min(3, Math.max(0.35, (poolSum + gap) / poolSum));
    const ids = new Set(pool.map((x) => x.i.id));
    meals = meals.map((m) => ({
      ...m,
      items: m.items.map((i) => {
        if (!ids.has(i.id)) return i;
        let g = snap(i.grams * k);
        g = Math.min(capOf(i, m), g);
        if (g === i.grams) return i;
        changed++;
        return rescale(i, g);
      }),
    }));
  }
  return { meals, changed };
}

/** Día sin fuente del macro: suma arroz / avena (carbos) o palta / nueces (grasas) en la comida más grande. */
function injectSource(meals: Meal[], day: DayMode, macro: 'c' | 'f', gap: number): Meal[] {
  const own = meals.filter((m) => m.day === day);
  const pool = own.length ? own : meals.filter((m) => m.day === 'both');
  if (!pool.length) return meals;
  const hosts = [...pool].sort((a, b) => {
    const ka = mealTotals(a);
    const kb = mealTotals(b);
    return kb.p * 4 + kb.c * 4 + kb.f * 9 - (ka.p * 4 + ka.c * 4 + ka.f * 9);
  });
  // Primer par comida / alimento con lugar bajo su tope; si el alimento ya está en la comida, se suma al mismo ítem.
  for (const host of hosts) {
    const morning = host.role === 'breakfast' || host.role === 'snack' || host.role === 'peri';
    const options = macro === 'c' ? (morning ? ['avena', 'banana'] : ['arroz', 'papa']) : morning ? ['nueces', 'mani'] : ['palta', 'nueces'];
    for (const foodId of options) {
      const ref = FOOD_BY_ID[foodId];
      const have = host.items.filter((i) => i.foodId === foodId).reduce((a, i) => a + i.grams, 0);
      const room = foodCap(foodId) - have;
      const grams = Math.min(room, snap((gap / ref[macro]) * 100));
      if (grams < 5) continue;
      const item: FoodItem = { id: uid(), foodId, food: ref.name, grams, ...macrosFor(foodId, grams)! };
      return meals.map((m) => (m.id === host.id ? { ...m, items: consolidateItems([...m.items, item]) } : m));
    }
  }
  return meals;
}

/**
 * Ajusta las porciones para que cada día (ON / OFF) sume el 100 % ± 3 % de sus metas de carbos y grasas
 * (y por ende de kcal, con la proteína ya fijada por la IA / el coach).
 */
export function balancePlan(plan: AthletePlan): { plan: AthletePlan; report: DayBalance[] } {
  const t = computeTelemetry(plan);
  let meals = plan.meals;
  const report: DayBalance[] = [];
  for (const day of ['on', 'off'] as DayMode[]) {
    if (!meals.some((m) => m.day === day || m.day === 'both')) continue;
    const target = day === 'on' ? { ...t.gramsOn, kcal: t.kcalOn } : { ...t.gramsOff, kcal: t.kcalOff };
    const before = dayTotals(meals, day);
    // Proteína fuera de ±3 % (la IA o el escalado de carbos la corren): se corrige primero para que el cierre de kcal no castigue a los carbos.
    const pr = balanceMacro(meals, day, 'p', target.p);
    const c = balanceMacro(pr.meals, day, 'c', target.c);
    const f = balanceMacro(c.meals, day, 'f', target.f);
    // Las grasas de frutos secos / maní mueven algo de carbos: una pasada final de carbos.
    const c2 = balanceMacro(f.meals, day, 'c', target.c);
    // Cierre calórico estricto (±1 %): la proteína de la IA puede desviar las kcal aunque carbos y grasas cierren.
    const k = closeKcal(c2.meals, day, target);
    meals = k.meals;
    report.push({ day, target, before, after: dayTotals(meals, day), changed: pr.changed + c.changed + f.changed + c2.changed + k.changed });
  }
  return { plan: { ...plan, meals: meals.map(consolidateMeal), updatedAt: Date.now() }, report };
}
