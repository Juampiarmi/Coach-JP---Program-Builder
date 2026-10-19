import type { Anamnesis, CookingLevel, Budget, MealSlot } from './types';

export const CONDITIONS = [
  { id: 'none', label: 'Ninguna' },
  { id: 'insulin', label: 'Resistencia a la Insulina' },
  { id: 'hypothyroid', label: 'Hipotiroidismo' },
  { id: 'reflux', label: 'Reflujo / Acidez Late-Night' },
  { id: 'ibs', label: 'Síndrome Intestino Irritable / FODMAP' },
  { id: 'hypertension', label: 'Hipertensión' },
] as const;

export const ALLERGIES = [
  { id: 'lactose', label: 'Lactosa' },
  { id: 'gluten', label: 'Gluten / Celíaco' },
  { id: 'nuts', label: 'Frutos Secos' },
  { id: 'shellfish', label: 'Mariscos' },
  { id: 'legumes', label: 'Legumbres' },
] as const;

export const SNACK_OPTIONS = ['Tutucas de maíz', 'Frutos secos', 'Chocolate 70%', 'Galletas de arroz', 'Almohaditas de avena', 'Fruta fresca', 'Yogur proteico', 'Gelatina light'];

export const BUDGET_LABEL: Record<Budget, string> = { low: 'Bajo', mid: 'Medio', high: 'Alto' };
export const COOKING_LABEL: Record<CookingLevel, string> = { quick: 'Rápido / 10 min', batch: 'Batch Cooking', gourmet: 'Gourmet' };
export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  peri: 'Pre-WOD / Merienda',
  post: 'Post-WOD Inmediato',
  dinner: 'Cena Principal',
};
export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'peri', 'post', 'dinner'];

export const DEFAULT_FAVORITES =
  'Milanesas (al horno), pastel de papa, bife de cuadril, pollo, arroz, huevos, yogur griego, mate, frutas, tutucas, almohaditas de avena';

export function defaultAnamnesis(): Anamnesis {
  return {
    wakeTime: '06:00',
    bedTime: '23:00',
    mealTimesAuto: true,
    mealTimes: { breakfast: '06:30', lunch: '12:30', peri: '15:15', post: '18:15', dinner: '21:00' },
    conditions: ['none'],
    allergies: [],
    favorites: DEFAULT_FAVORITES,
    aversions: 'Picantes, carnes crudas / ahumadas, vísceras',
    snacks: ['Tutucas de maíz', 'Frutos secos', 'Chocolate 70%', 'Galletas de arroz'],
    budget: 'mid',
    cooking: 'quick',
  };
}

const HHMM = /^\d{2}:\d{2}$/;

/** Completa una anamnesis guardada (o importada) con los campos que falten. */
export function sanitizeAnamnesis(raw: unknown): Anamnesis {
  const d = defaultAnamnesis();
  const a = (raw ?? {}) as Partial<Anamnesis>;
  const strs = (v: unknown, fb: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : fb);
  const times = { ...d.mealTimes };
  for (const k of SLOTS) if (HHMM.test(a.mealTimes?.[k] ?? '')) times[k] = a.mealTimes![k];
  return {
    wakeTime: HHMM.test(a.wakeTime ?? '') ? a.wakeTime! : d.wakeTime,
    bedTime: HHMM.test(a.bedTime ?? '') ? a.bedTime! : d.bedTime,
    mealTimesAuto: typeof a.mealTimesAuto === 'boolean' ? a.mealTimesAuto : true,
    mealTimes: times,
    conditions: strs(a.conditions, d.conditions),
    allergies: strs(a.allergies, d.allergies),
    favorites: typeof a.favorites === 'string' ? a.favorites : d.favorites,
    aversions: typeof a.aversions === 'string' ? a.aversions : d.aversions,
    snacks: strs(a.snacks, d.snacks),
    budget: a.budget === 'low' || a.budget === 'high' ? a.budget : 'mid',
    cooking: a.cooking === 'batch' || a.cooking === 'gourmet' ? a.cooking : 'quick',
  };
}

/** Horas de sueño entre acostarse y despertar (cruza la medianoche). */
export function sleepHours(bed: string, wake: string) {
  const m = (t: string) => {
    const [h, mm] = t.split(':').map(Number);
    return (h || 0) * 60 + (mm || 0);
  };
  return (((m(wake) - m(bed)) % 1440) + 1440) % 1440 / 60;
}

/**
 * Detector de alérgenos / restricciones por nombre de alimento (validación post-IA del plan).
 * Los productos "deslactosados", "sin TACC" o "sin gluten" se consideran aptos.
 */
const ALLERGEN_RE: Record<string, RegExp> = {
  lactose: /\b(leche|yogur|queso|ricota|untable|whey|crema|manteca|dulce de leche)\b/i,
  gluten: /\b(pan|fideos?|pasta seca|galletitas?|almohaditas?|avena|harina|tarta|milanesa|rebozad|empanada|pizza|trigo|cebada|centeno)\b/i,
  nuts: /\b(nuez|nueces|almendras?|man[ií]|pasta de man[ií]|avellanas?|casta[ñn]as?|pistachos?|frutos secos)\b/i,
  shellfish: /\b(camar[oó]n|camarones|langostinos?|mariscos?|mejillones|calamar|pulpo|vieiras?)\b/i,
  legumes: /\b(lentejas?|garbanzos?|porotos?|arvejas?|soja|man[ií])\b/i,
};
const SAFE_RE: Record<string, RegExp> = {
  lactose: /deslactosad|sin lactosa|zero lactosa|whey isolate|aislad/i,
  gluten: /sin tacc|sin gluten|libre de gluten/i,
};

export function allergenHits(foodName: string, allergies: string[]) {
  return allergies.filter((a) => ALLERGEN_RE[a]?.test(foodName) && !SAFE_RE[a]?.test(foodName));
}
