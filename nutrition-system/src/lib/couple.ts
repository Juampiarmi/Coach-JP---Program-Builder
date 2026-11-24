import { fixPlanAllergens } from './allergens';
import { balancePlan } from './balance';
import { computeTelemetry } from './bioenergetics';
import { FOOD_BY_ID, householdHint } from './foods';
import { scaleItem } from './planAdapt';
import { uid } from './seed';
import type { AthletePlan, FoodItem, Meal, MealDay } from './types';

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
const BUY: Record<string, { k: number; note: string }> = {
  pollo: { k: 1.3, note: 'crudo' },
  cuadril: { k: 1.3, note: 'crudo' },
  lomo: { k: 1.3, note: 'crudo' },
  nalga: { k: 1.3, note: 'crudo' },
  picada: { k: 1.3, note: 'crudo' },
  merluza: { k: 1.3, note: 'crudo' },
  cerdo: { k: 1.3, note: 'crudo' },
  arroz: { k: 0.4, note: 'seco' },
  yamani: { k: 0.4, note: 'seco' },
  fideos: { k: 0.4, note: 'seco' },
  'fideos-sin-tacc': { k: 0.4, note: 'seco' },
  lentejas: { k: 0.4, note: 'seco' },
};

export interface CoupleShopRow {
  key: string;
  name: string;
  a: number;
  b: number;
  total: number;
  note: string;
  hint: string;
}

/** Lista de compras semanal combinada: suma los gramos de las dos personas (opción 1 de cada comida, 7 días). */
export function coupleShopping(a: AthletePlan, b: AthletePlan): CoupleShopRow[] {
  const acc: Record<string, CoupleShopRow> = {};
  const add = (p: AthletePlan, who: 'a' | 'b') => {
    const on = Math.max(0, Math.min(7, p.profile.trainingDaysPerWeek));
    const mult: Record<MealDay, number> = { on, off: 7 - on, both: 7 };
    for (const m of p.meals) {
      for (const it of m.items as FoodItem[]) {
        if (!(it.grams > 0)) continue;
        const key = it.foodId ?? `x:${it.food}`;
        const buy = (it.foodId && BUY[it.foodId]) || { k: 1, note: '' };
        const name = it.foodId ? FOOD_BY_ID[it.foodId]?.name.split(' (')[0] ?? it.food : it.food;
        const row = (acc[key] ??= { key, name, a: 0, b: 0, total: 0, note: buy.note, hint: '' });
        row[who] += it.grams * mult[m.day] * buy.k;
      }
    }
  };
  add(a, 'a');
  add(b, 'b');
  return Object.values(acc)
    .map((r) => {
      const round = (g: number) => Math.round(g / 10) * 10;
      const total = round(r.a + r.b);
      return { ...r, a: round(r.a), b: round(r.b), total, hint: r.key.startsWith('x:') ? '' : householdHint(r.key, total) };
    })
    .sort((x, y) => y.total - x.total);
}

export const kgText = (g: number) => (g >= 1000 ? `${(Math.round(g / 100) / 10).toString().replace('.', ',')} kg` : `${g} g`);

/** Texto de WhatsApp de la lista de compras de la pareja. */
export function coupleShopText(a: AthletePlan, b: AthletePlan, rows = coupleShopping(a, b)) {
  const lines = rows.map((r) => `▢ ${r.name}${r.note ? ` (${r.note})` : ''}: *${kgText(r.total)}*${r.hint ? ` ${r.hint}` : ''}  — ${a.profile.name.split(' ')[0]} ${kgText(r.a)} + ${b.profile.name.split(' ')[0]} ${kgText(r.b)}`);
  return `🛒 *LISTA DE COMPRAS DE LA PAREJA* · ${a.profile.name} + ${b.profile.name}\nTotales para 7 días (marca a elección en genéricos)\n\n${lines.join('\n')}`;
}
