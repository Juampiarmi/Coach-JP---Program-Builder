import { allergiesOf, protocolOf } from './allergens';
import { dayTotals, mealsForDay } from './bioenergetics';
import { netCarbs } from './foods';
import type { AthletePlan, DayMode } from './types';

/**
 * Totales del día tal como se muestran en el Builder: en Keto / Low Carb el objetivo de carbohidratos es NETO
 * (carbohidratos − fibra), así que la barra compara carbos netos contra ese objetivo y no carbos totales.
 */
export function shownDayTotals(plan: AthletePlan, d: DayMode) {
  const got = dayTotals(plan.meals, d);
  const proto = protocolOf(allergiesOf(plan));
  if (!proto) return { ...got, net: false };
  return { ...got, c: Math.round(netCarbs(mealsForDay(plan.meals, d).flatMap((m) => m.items)) * 10) / 10, net: true };
}
