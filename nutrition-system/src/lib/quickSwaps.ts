import { FOOD_BY_ID, snapUnit } from './foods';
import { portionCap } from './portionCaps';
import { itemFromFood, uid } from './seed';
import type { FoodItem, MealRole, Sex } from './types';

/**
 * REEMPLAZOS RÁPIDOS 1 A 1, en lenguaje de cocina: cada fila del grupo aporta lo mismo del macro que lo define
 * (~25 g de proteína, ~40 g de carbos o ~10 g de grasas). Al aplicarlo sobre un ingrediente del plan se respeta su
 * aporte real (si el pollo era de 150 g, el reemplazo se escala), las unidades enteras y el tope por toma.
 */
export type MacroKey = 'p' | 'c' | 'f';
export interface QuickSwap {
  id: string;
  label: string;
  /** Ingredientes y gramos de referencia (el primero reemplaza al original; el resto se suma). */
  parts: [string, number][];
}
export const QUICK_SWAPS: { k: MacroKey; title: string; ref: string; items: QuickSwap[] }[] = [
  {
    k: 'p',
    title: 'Proteínas',
    ref: '~25 g',
    items: [
      { id: 'pollo', label: '120 g de pollo o carne en crudo (~85 g cocida)', parts: [['pollo', 85]] },
      { id: 'huevo', label: '4 huevos enteros', parts: [['huevo', 240]] },
      { id: 'atun', label: '1 lata de atún al natural', parts: [['atun', 120]] },
      { id: 'whey', label: '1 scoop de whey', parts: [['whey', 30]] },
      { id: 'yogur', label: '200 g de yogur griego + 2 claras', parts: [['yogur', 200], ['claras', 66]] },
    ],
  },
  {
    k: 'c',
    title: 'Carbohidratos',
    ref: '~40 g',
    items: [
      { id: 'arroz', label: '150 g de arroz o fideos cocidos', parts: [['arroz', 150]] },
      { id: 'papa', label: '220 g de papa o batata cocida', parts: [['papa', 220]] },
      { id: 'avena', label: '60 g de avena cruda', parts: [['avena', 60]] },
      { id: 'pan', label: '2 rebanadas de pan integral', parts: [['pan', 80]] },
      { id: 'banana', label: '2 bananas chicas', parts: [['banana', 200]] },
    ],
  },
  {
    k: 'f',
    title: 'Grasas',
    ref: '~10 g',
    items: [
      { id: 'oliva', label: '1 cda sopera de aceite de oliva (10 ml)', parts: [['oliva', 10]] },
      { id: 'palta', label: '½ palta chica (60 g)', parts: [['palta', 60]] },
      { id: 'nueces', label: '15 g de frutos secos (1 puñado chico)', parts: [['nueces', 15]] },
      { id: 'mani', label: '1 cda de pasta de maní', parts: [['mani', 15]] },
    ],
  },
];

/** Macro que define a un alimento (el que más energía aporta). */
export function macroOf(foodId: string | undefined): MacroKey | null {
  const f = foodId ? FOOD_BY_ID[foodId] : undefined;
  if (!f) return null;
  const e = { p: f.p * 4, c: f.c * 4, f: f.f * 9 };
  return e.p >= e.c && e.p >= e.f ? 'p' : e.c >= e.f ? 'c' : 'f';
}

/** Ingredientes que reemplazan a `item` con el mismo aporte de su macro principal (unidades enteras y topes). */
export function quickSwapItems(item: FoodItem, swap: QuickSwap, ctx: { sex?: Sex; role?: MealRole } = {}): FoodItem[] {
  const k = macroOf(item.foodId);
  if (!k) return [item];
  const have = item[k];
  const ref = swap.parts.reduce((a, [id, g]) => a + ((FOOD_BY_ID[id]?.[k] ?? 0) * g) / 100, 0);
  if (!(have > 0) || !(ref > 0)) return [item];
  const ratio = have / ref;
  return swap.parts.map(([id, g], i) => {
    const cap = portionCap(id, ctx);
    const grams = Math.min(cap.max, snapUnit(id, g * ratio));
    const it = itemFromFood(id, grams);
    return { ...it, id: i === 0 ? item.id : uid() };
  });
}

/** Desglose del 100 % de las calorías del día: % y gramos de proteínas, carbos y grasas. */
export function macroSplit(g: { p: number; c: number; f: number }) {
  const kcal = g.p * 4 + g.c * 4 + g.f * 9;
  const pct = (x: number) => (kcal > 0 ? Math.round((x / kcal) * 100) : 0);
  const p = pct(g.p * 4);
  const c = pct(g.c * 4);
  // Los tres suman exactamente 100 %.
  return { kcal: Math.round(kcal), p: { g: Math.round(g.p), pct: p }, c: { g: Math.round(g.c), pct: c }, f: { g: Math.round(g.f), pct: kcal > 0 ? 100 - p - c : 0 } };
}
