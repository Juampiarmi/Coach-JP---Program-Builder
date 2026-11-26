import { acceptForPlan, allergiesOf, protocolOf } from './allergens';
import { withCapSex } from './portionCaps';
import { balancePlan } from './balance';
import { suggestAlternatives } from './menuOptions';
import type { AthletePlan, Meal, MealOption } from './types';

/** Tolerancia de equivalencia entre opciones de una misma comida (Opción 1 vs 2 y 3). */
export const ALT_KCAL_TOL = 0.12;
export const ALT_PROT_TOL = 0.25;

const tot = (items: Meal['items']) => items.reduce((a, i) => ({ p: a.p + i.p, k: a.k + i.p * 4 + i.c * 4 + i.f * 9 }), { p: 0, k: 0 });
/** ¿La alternativa es equivalente a la Opción 1? (calorías ±12 %, proteína ±25 % o ±6 g en comidas chicas). */
export function isEquivalent(main: Meal['items'], alt: Meal['items'], loose = 1) {
  const a = tot(main);
  const b = tot(alt);
  return Math.abs(b.k / Math.max(1, a.k) - 1) <= ALT_KCAL_TOL * loose && Math.abs(b.p - a.p) <= Math.max(6, a.p * ALT_PROT_TOL) * loose;
}
const score = (main: Meal['items'], o: MealOption) => {
  const a = tot(main);
  const b = tot(o.items);
  return Math.abs(b.k / Math.max(1, a.k) - 1) + Math.abs(b.p - a.p) / Math.max(10, a.p);
};

/**
 * Plan del Banco Global listo para usar: el día se cierra con el ajuste fino (calorías y macros, respetando el
 * protocolo) y cada comida queda con la Opción 1 + `n` variantes de verdad equivalentes; si las del banco no
 * alcanzan, se completan con alternativas generadas con los mismos macros (aptas para sus restricciones).
 */
export function equivalentOptions(plan: AthletePlan, n = 2): AthletePlan {
  const closed = balancePlan(plan).plan;
  return withCapSex(closed.profile.sex, () => pickOptions(closed, n), protocolOf(allergiesOf(closed)));
}

function pickOptions(closed: AthletePlan, n: number): AthletePlan {
  const accept = acceptForPlan(closed);
  return {
    ...closed,
    meals: closed.meals.map((m) => {
      const pool = [...(m.alts ?? []), ...suggestAlternatives(m, null, 12, [], accept)].filter((o, i, arr) => o.title !== m.title && arr.findIndex((x) => x.title === o.title) === i);
      const byScore = (x: MealOption, y: MealOption) => score(m.items, x) - score(m.items, y);
      // 1º las del banco/generador dentro de tolerancia estricta; si no alcanzan, las más cercanas dentro de una tolerancia
      // un poco más amplia (±18 % kcal) — nunca una opción que cambie el día de forma visible.
      let alts = pool.filter((o) => isEquivalent(m.items, o.items)).sort(byScore).slice(0, n);
      if (alts.length < n) alts = [...alts, ...pool.filter((o) => !alts.includes(o) && isEquivalent(m.items, o.items, 1.5)).sort(byScore)].slice(0, n);
      return { ...m, alts };
    }),
  };
}
