import { FOOD_BY_ID, householdHint, snapUnit } from './foods';
import { fitsSlot } from './mealSlots';
import { portionCap } from './portionCaps';
import { itemFromFood, uid } from './seed';
import type { FoodItem, MealRole, Sex } from './types';

/**
 * REEMPLAZOS CRUZADOS POR MACRO (Builder y app del alumno/a): cambiar una fuente por otra de OTRA familia con el
 * mismo aporte del macro que la define.
 *  - Proteína: carne / pollo ⇄ huevos enteros, claras, claras + ricota magra, atún / pescado, tofu / soja o whey.
 *  - Carbohidratos: arroz ⇄ papa, batata, fideos, pan, legumbres o masa de tarta (el arroz con pollo pasa a ser
 *    una tarta de pollo con las mismas calorías de carbos).
 * Gramos exactos con unidades enteras (huevo 60 g, clara 33 g, scoop), topes por sexo y franja, protocolo
 * (Keto / Low Carb) y alergias vía `accept`. Si la grasa cambia mucho, se avisa (y el Builder la compensa).
 */
export type CrossMacro = 'p' | 'c';

export interface CrossTarget {
  id: string;
  label: string;
  family: string;
  /** Ingredientes y parte del macro que aporta cada uno (suma 1). */
  parts: [string, number][];
  /** Si el tope por toma no alcanza, se completa con estas fuentes en orden (ej. 3 huevos + 3 claras). */
  fill?: string[];
}

export const CROSS_TARGETS: Record<CrossMacro, CrossTarget[]> = {
  p: [
    { id: 'pollo', label: 'Pollo', family: 'Carnes', parts: [['pollo', 1]] },
    { id: 'cuadril', label: 'Carne vacuna magra', family: 'Carnes', parts: [['cuadril', 1]] },
    { id: 'cerdo', label: 'Cerdo magro', family: 'Carnes', parts: [['cerdo', 1]] },
    { id: 'merluza', label: 'Pescado (merluza)', family: 'Pescado', parts: [['merluza', 1]], fill: ['claras'] },
    { id: 'atun', label: 'Atún al natural', family: 'Pescado', parts: [['atun', 1]], fill: ['huevo', 'claras'] },
    { id: 'huevo', label: 'Huevos enteros', family: 'Huevos', parts: [['huevo', 1]], fill: ['claras', 'ricota'] },
    { id: 'claras', label: 'Claras de huevo', family: 'Huevos', parts: [['claras', 1]], fill: ['huevo', 'ricota'] },
    { id: 'claras-ricota', label: 'Claras + ricota magra', family: 'Huevos y lácteos', parts: [['claras', 0.6], ['ricota', 0.4]], fill: ['huevo'] },
    { id: 'tofu', label: 'Tofu firme', family: 'Vegetal', parts: [['tofu', 1]], fill: ['soja-texturizada'] },
    { id: 'soja-texturizada', label: 'Soja texturizada', family: 'Vegetal', parts: [['soja-texturizada', 1]], fill: ['tofu'] },
    { id: 'whey', label: 'Proteína en polvo (whey)', family: 'Suplemento', parts: [['whey', 1]], fill: ['claras', 'yogur'] },
    { id: 'whey-isolate', label: 'Whey aislado (sin lactosa)', family: 'Suplemento', parts: [['whey-isolate', 1]], fill: ['claras'] },
    { id: 'proteina-vegetal', label: 'Proteína vegetal en polvo', family: 'Suplemento', parts: [['proteina-vegetal', 1]], fill: ['tofu'] },
  ],
  c: [
    { id: 'arroz', label: 'Arroz', family: 'Granos', parts: [['arroz', 1]], fill: ['papa'] },
    { id: 'yamani', label: 'Arroz yamaní', family: 'Granos', parts: [['yamani', 1]], fill: ['papa'] },
    { id: 'quinoa', label: 'Quinoa', family: 'Granos', parts: [['quinoa', 1]], fill: ['papa'] },
    { id: 'fideos', label: 'Fideos', family: 'Pastas', parts: [['fideos', 1]], fill: ['papa'] },
    { id: 'fideos-sin-tacc', label: 'Fideos sin TACC', family: 'Pastas', parts: [['fideos-sin-tacc', 1]] },
    { id: 'papa', label: 'Papa', family: 'Tubérculos', parts: [['papa', 1]], fill: ['batata'] },
    { id: 'batata', label: 'Batata', family: 'Tubérculos', parts: [['batata', 1]], fill: ['papa'] },
    { id: 'polenta', label: 'Polenta', family: 'Granos', parts: [['polenta', 1]], fill: ['papa'] },
    { id: 'tapa-tarta', label: 'Masa de tarta', family: 'Masas y panes', parts: [['tapa-tarta', 1]], fill: ['papa', 'batata'] },
    { id: 'tapa-tarta-sin-tacc', label: 'Masa de tarta sin TACC', family: 'Masas y panes', parts: [['tapa-tarta-sin-tacc', 1]], fill: ['papa', 'batata'] },
    { id: 'pan', label: 'Pan integral', family: 'Masas y panes', parts: [['pan', 1]], fill: ['papa'] },
    { id: 'pan-sin-tacc', label: 'Pan sin TACC', family: 'Masas y panes', parts: [['pan-sin-tacc', 1]], fill: ['papa'] },
    { id: 'tortillas-maiz', label: 'Tortillas de maíz', family: 'Masas y panes', parts: [['tortillas-maiz', 1]], fill: ['papa'] },
    { id: 'lentejas', label: 'Lentejas', family: 'Legumbres', parts: [['lentejas', 1]], fill: ['arroz'] },
    { id: 'garbanzos', label: 'Garbanzos', family: 'Legumbres', parts: [['garbanzos', 1]], fill: ['arroz'] },
    { id: 'porotos', label: 'Porotos', family: 'Legumbres', parts: [['porotos', 1]], fill: ['arroz'] },
    { id: 'avena', label: 'Avena', family: 'Cereales', parts: [['avena', 1]], fill: ['banana'] },
  ],
};

/** Fuentes que sirven en cualquier comida aunque su franja habitual sea otra (huevos, whey, masa de tarta, pan). */
export const CROSS_ANY_SLOT = ['yogur', 'banana', 'huevo', 'claras', 'ricota', 'whey', 'whey-isolate', 'proteina-vegetal', 'tapa-tarta', 'tapa-tarta-sin-tacc', 'pan', 'pan-sin-tacc'];
const ANY_SLOT = new Set(CROSS_ANY_SLOT);

/** Macro que define al alimento para el reemplazo cruzado (proteína o carbos); grasas no tienen reemplazo cruzado. */
export function crossMacroOf(foodId: string | undefined): CrossMacro | null {
  const f = foodId ? FOOD_BY_ID[foodId] : undefined;
  if (!f) return null;
  const e = { p: f.p * 4, c: f.c * 4, f: f.f * 9 };
  if (e.p >= e.c && e.p >= e.f * 0.8) return 'p';
  if (e.c >= e.p && e.c >= e.f * 0.8) return 'c';
  return null;
}

export interface CrossOption {
  target: CrossTarget;
  items: FoodItem[];
  /** Texto en lenguaje de cocina: «180 g de papa (1 papa grande)». */
  text: string;
  kcal: number;
  /** Diferencia de grasa total vs el ingrediente original (g). */
  dFat: number;
  /** Aviso si la grasa cambia ≥ 5 g o cambia el formato del plato. */
  warn: string;
  /** Misma familia que el original (aparece primero). */
  same: boolean;
}

export interface CrossCtx {
  sex?: Sex;
  role?: MealRole;
  diet?: 'keto' | 'lowcarb';
  /** Vegetariano: topes de legumbres / tofu propios. */
  veg?: boolean;
  accept?: (foodId: string) => boolean;
  /** Proteína del resto de la comida (para nombrar el formato nuevo: «tarta de pollo»). */
  mealFoods?: string[];
}

const kcalOf = (items: FoodItem[]) => items.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0);
const short = (id: string) => (FOOD_BY_ID[id]?.name ?? id).split(' (')[0];

/** Ingredientes que reemplazan a `item` con el mismo aporte de su macro, o null si no entra en los topes. */
export function crossSwapItems(item: FoodItem, target: CrossTarget, ctx: CrossCtx = {}): FoodItem[] | null {
  const k = crossMacroOf(item.foodId) ?? (item.p * 4 >= item.c * 4 ? 'p' : 'c');
  const have = item[k];
  if (!(have > 0)) return null;
  const out: FoodItem[] = [];
  let got = 0;
  const add = (id: string, want: number, filler = false) => {
    const f = FOOD_BY_ID[id];
    if (!f || !(f[k] > 0) || (ctx.accept && !ctx.accept(id))) return;
    const cap = portionCap(id, { sex: ctx.sex, role: ctx.role, diet: ctx.diet, veg: ctx.veg });
    const prev = out.find((i) => i.foodId === id);
    const room = cap.max - (prev?.grams ?? 0);
    let grams = Math.min(room, snapUnit(id, (want * 100) / f[k]));
    if (!prev && !filler && grams < cap.min) grams = want > (cap.min * f[k]) / 200 ? Math.min(room, cap.min) : 0;
    if (!(grams > 0)) return;
    const it = itemFromFood(id, (prev?.grams ?? 0) + grams);
    got += it[k] - (prev?.[k] ?? 0);
    if (prev) Object.assign(prev, it, { id: prev.id });
    else out.push({ ...it, id: out.length === 0 ? item.id : uid() });
  };
  for (const [id, share] of target.parts) add(id, have * share);
  // Tope por toma: se completa con la fuente complementaria (3 huevos + 3 claras, papa + batata).
  for (const id of target.fill ?? []) if (got < have * 0.95) add(id, have - got, true);
  // Si ni así llega al 90 % del macro no se ofrece: sería una porción irreal o una comida que no cierra.
  if (!out.length || got < have * 0.9 || got > have * 1.15) return null;
  return out;
}

/** Opciones de reemplazo cruzado para un ingrediente, primero su familia y luego el resto, por cercanía calórica. */
export function crossSwapOptions(item: FoodItem, ctx: CrossCtx = {}): CrossOption[] {
  const k = crossMacroOf(item.foodId);
  if (!k || !(item.grams > 0)) return [];
  const self = CROSS_TARGETS[k].find((t) => t.parts.length === 1 && t.parts[0][0] === item.foodId);
  const fam = self?.family ?? FOOD_BY_ID[item.foodId!]?.group;
  const base = item.p * 4 + item.c * 4 + item.f * 9;
  const opts: CrossOption[] = [];
  for (const t of CROSS_TARGETS[k]) {
    if (t.parts.length === 1 && t.parts[0][0] === item.foodId) continue;
    if (t.parts.some(([id]) => !FOOD_BY_ID[id] || (ctx.accept && !ctx.accept(id)))) continue;
    // Versión sin TACC sólo si hace falta (celíacos): si la común es apta, no se duplica la opción.
    if (t.id.endsWith('-sin-tacc') && FOOD_BY_ID[t.id.replace('-sin-tacc', '')] && (!ctx.accept || ctx.accept(t.id.replace('-sin-tacc', '')))) continue;
    if (ctx.role && t.parts.some(([id]) => !ANY_SLOT.has(id) && !fitsSlot(FOOD_BY_ID[id], ctx.role!))) continue;
    if ((ctx.role === 'lunch' || ctx.role === 'dinner') && t.id === 'avena') continue;
    const items = crossSwapItems(item, t, ctx);
    if (!items) continue;
    const fat = items.reduce((a, i) => a + i.f, 0);
    const dFat = Math.round((fat - item.f) * 10) / 10;
    const kcal = kcalOf(items);
    const text = items.map((i) => `${i.grams} g de ${short(i.foodId!).toLowerCase()}${householdHint(i.foodId, i.grams) ? ` (${householdHint(i.foodId, i.grams).replace(/^≈ /, '')})` : ''}`).join(' + ');
    const meat = (ctx.mealFoods ?? []).map((id) => FOOD_BY_ID[id]).find((f) => f && (f.group === 'lean-protein' || f.group === 'eggs'));
    const tart = t.id.startsWith('tapa-tarta') ? `Formato nuevo: ${meat ? `tarta de ${short(meat.id).toLowerCase().replace(/^pechuga de /, '')}` : 'tarta'} con la misma energía de carbos. ` : '';
    const warn = tart + (Math.abs(dFat) >= 5 ? `${dFat > 0 ? '+' : ''}${dFat} g de grasa respecto del original${dFat > 0 ? ' (se compensa bajando aceite / palta de la comida)' : ''}.` : '');
    opts.push({ target: t, items, text, kcal, dFat, warn: warn.trim(), same: t.family === fam });
  }
  return opts.sort((a, b) => Number(b.same) - Number(a.same) || Math.abs(a.kcal - base) - Math.abs(b.kcal - base));
}

/** Todas las fuentes que participan (la app del alumno las recibe para calcular en el teléfono). */
export const CROSS_FOOD_IDS = [...new Set(Object.values(CROSS_TARGETS).flatMap((l) => l.flatMap((t) => t.parts.map(([id]) => id))))];
