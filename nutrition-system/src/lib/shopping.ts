import { SHOP_CATEGORY, SHOP_ORDER, SHOP_RULES } from './exportHtml';
import { FOOD_BY_ID, householdHint } from './foods';
import type { AthletePlan, FoodItem, Meal, MealDay } from './types';

/**
 * LISTA DE COMPRAS DINÁMICA (Builder): se calcula en vivo desde las comidas del plan. Cada vez que el coach elige,
 * reemplaza o quita un plato (o cambia el peso del alumno), la lista se rearma sola: suma los ingredientes ya
 * escalados de la opción que va a cocinar cada comida (7 días: entreno × días de entreno + descanso × el resto),
 * pasa carnes a crudo y arroz / fideos / legumbres a seco, y agrupa por rubro (verdulería, carnicería, almacén…).
 * Modo Parejas: con dos planes suma lo de los dos.
 */
export interface ShopRow {
  key: string;
  name: string;
  grams: number;
  /** "crudo", "seco" o la presentación de compra. */
  note: string;
  /** Medida casera o unidades ("≈ 18 huevos", "2 tapas"). */
  hint: string;
  /** Gramos por persona (Modo Parejas). */
  by: number[];
}
export interface ShopGroup {
  cat: string;
  rows: ShopRow[];
}

/** Opción que va a cocinar cada comida: `opt` = {mealId: 1-5} (1 = la sugerida). */
export type OptionChoice = Record<string, number>;

function itemsOf(m: Meal, choice?: OptionChoice) {
  const n = choice?.[m.id] ?? 1;
  const alt = n > 1 ? m.alts?.[n - 2] : undefined;
  return (alt?.items?.length ? alt.items : m.items) as FoodItem[];
}

export function weeklyShopping(plans: AthletePlan[], choices: (OptionChoice | undefined)[] = []): ShopGroup[] {
  const acc: Record<string, ShopRow & { cat: string; state?: string; byUnit?: number; unitLabel?: string; pack?: number; min?: number; minLabel?: string }> = {};
  plans.forEach((p, who) => {
    const on = Math.max(0, Math.min(7, p.profile.trainingDaysPerWeek));
    const mult: Record<MealDay, number> = { on, off: 7 - on, both: 7 };
    for (const m of p.meals) {
      for (const it of itemsOf(m, choices[who])) {
        if (!(it.grams > 0)) continue;
        const rule = (it.foodId && SHOP_RULES[it.foodId]) || {};
        const key = rule.key || it.foodId || `x:${it.food}`;
        const ref = it.foodId ? FOOD_BY_ID[it.foodId] : undefined;
        const g = it.grams * mult[m.day] * (rule.factor ?? 1);
        const row = (acc[key] ??= {
          key,
          name: rule.name ?? (ref ? ref.name.split(' (')[0] : it.food),
          grams: 0,
          note: rule.state === 'raw' ? 'crudo' : rule.state === 'dry' ? 'seco' : '',
          hint: '',
          by: plans.map(() => 0),
          cat: rule.section ?? (ref ? SHOP_CATEGORY[ref.group] : 'Otros') ?? 'Otros',
          byUnit: rule.byUnit,
          unitLabel: rule.unitLabel,
          pack: rule.pack,
          min: rule.min,
          minLabel: rule.minLabel,
        });
        row.grams += g;
        row.by[who] += g;
      }
    }
  });
  const groups: Record<string, ShopRow[]> = {};
  for (const r of Object.values(acc)) {
    let grams = Math.round(r.grams / 10) * 10;
    let hint = '';
    if (r.byUnit) hint = `${Math.max(1, Math.ceil(r.grams / r.byUnit))} ${r.unitLabel}`;
    else if (r.pack) {
      const n = Math.max(1, Math.ceil(r.grams / r.pack));
      hint = `${n} paquete${n > 1 ? 's' : ''} de ${r.pack} g`;
    } else if (r.min && grams < r.min) hint = r.minLabel ?? '';
    else if (!r.key.startsWith('x:')) hint = householdHint(r.key, grams);
    if (r.min && grams < r.min) grams = r.min;
    (groups[r.cat] ??= []).push({ key: r.key, name: r.name, grams, note: r.note, hint, by: r.by.map((x) => Math.round(x / 10) * 10) });
  }
  return SHOP_ORDER.filter((c) => groups[c]).map((cat) => ({ cat, rows: groups[cat].sort((a, b) => b.grams - a.grams) }));
}

export const kg = (g: number) => (g >= 1000 ? `${(Math.round(g / 100) / 10).toString().replace('.', ',')} kg` : `${g} g`);

/** Texto para WhatsApp. */
export function shoppingText(title: string, groups: ShopGroup[]) {
  return `🛒 *${title}*\nTotales para 7 días · marca a elección en genéricos\n${groups
    .map((g) => `\n*${g.cat.toUpperCase()}*\n${g.rows.map((r) => `▢ ${r.name}${r.note ? ` (${r.note})` : ''}: *${kg(r.grams)}*${r.hint ? ` · ${r.hint}` : ''}`).join('\n')}`)
    .join('\n')}`;
}
