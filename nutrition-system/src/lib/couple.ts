import { weeklyShopping } from './shopping';
import { fixPlanAllergens } from './allergens';
import { balancePlan } from './balance';
import { computeTelemetry } from './bioenergetics';
import { scaleItem } from './planAdapt';
import { uid } from './seed';
import type { AthletePlan, Meal, MealDay } from './types';

/**
 * MODO PAREJAS: dos alumnos que cocinan lo mismo. La pareja copia exactamente la estructura del plan líder (comidas,
 * horarios, recetas y opciones del menú) y el motor escala de forma independiente sus gramos a SUS calorías y macros
 * (sexo, peso, objetivo), con sus topes y pisos por toma, unidades enteras y sus alergias.
 */
export function mirrorForPartner(target: AthletePlan, lead: AthletePlan): AthletePlan {
  const tT = computeTelemetry(target);
  const tL = computeTelemetry(lead);
  const k = { on: tT.kcalOn / Math.max(1, tL.kcalOn), off: tT.kcalOff / Math.max(1, tL.kcalOff) };
  const kOf = (d: MealDay) => (d === 'on' ? k.on : d === 'off' ? k.off : (k.on + k.off) / 2);
  const sex = target.profile.sex;
  const meals = lead.meals.map(
    (m): Meal => ({
      ...structuredClone(m),
      id: uid(),
      pairId: m.id,
      items: m.items.map((it) => scaleItem(it, kOf(m.day), sex, m.role)),
      alts: m.alts?.map((a) => ({ ...a, items: a.items.map((it) => scaleItem(it, kOf(m.day), sex, m.role)) })),
    }),
  );
  const balanced = balancePlan({ ...target, meals, partnerId: lead.id }).plan;
  return { ...fixPlanAllergens(balanced).plan, partnerId: lead.id, partnerSyncAt: lead.updatedAt, updatedAt: Date.now() };
}

/** Comidas de la pareja enfrentadas por plato (la comida del líder y su espejo). */
export function pairMeals(lead: AthletePlan, partner: AthletePlan): { lead: Meal; partner: Meal | undefined }[] {
  return lead.meals.map((m) => ({ lead: m, partner: partner.meals.find((x) => x.pairId === m.id) }));
}

/** ¿El espejo de la pareja quedó desactualizado (comidas agregadas, borradas o cambiadas en el plan líder)? */
export function partnerOutOfSync(lead: AthletePlan, partner: AthletePlan) {
  return !partner.partnerSyncAt || lead.updatedAt > partner.partnerSyncAt + 1000;
}

/** Factor cocido → compra (carnes en crudo, arroz y fideos en seco), igual que la lista de compras de la app. */
export interface CoupleShopRow {
  key: string;
  name: string;
  a: number;
  b: number;
  total: number;
  note: string;
  hint: string;
}

/**
 * Lista de compras semanal combinada: la MISMA lista que la individual (weeklyShopping, con sus conversiones a
 * crudo / seco, agrupaciones y paquetes) con la columna de cada persona. Opción 1 de cada comida, 7 días.
 */
export function coupleShopping(a: AthletePlan, b: AthletePlan): CoupleShopRow[] {
  return weeklyShopping([a, b])
    .flatMap((g) => g.rows)
    .map((r) => ({ key: r.key, name: r.name, a: r.by[0], b: r.by[1], total: r.grams, note: r.note, hint: r.hint }))
    .sort((x, y) => y.total - x.total);
}

export const kgText = (g: number) => (g >= 1000 ? `${(Math.round(g / 100) / 10).toString().replace('.', ',')} kg` : `${g} g`);

/** Texto de WhatsApp de la lista de compras de la pareja. */
export function coupleShopText(a: AthletePlan, b: AthletePlan, rows = coupleShopping(a, b)) {
  const lines = rows.map((r) => `▢ ${r.name}${r.note ? ` (${r.note})` : ''}: *${kgText(r.total)}*${r.hint ? ` ${r.hint}` : ''}  — ${a.profile.name.split(' ')[0]} ${kgText(r.a)} + ${b.profile.name.split(' ')[0]} ${kgText(r.b)}`);
  return `🛒 *LISTA DE COMPRAS DE LA PAREJA* · ${a.profile.name} + ${b.profile.name}\nTotales para 7 días (marca a elección en genéricos)\n\n${lines.join('\n')}`;
}
