import type { Anamnesis, AnxietyZone, CookingLevel, Budget, Fasting, MealSlot, SeasonPhase } from './types';

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
export const FASTING_LABEL: Record<Fasting, string> = { none: 'Ninguno', '16-8': '16/8', '14-10': '14/10', circadian: 'Circadiano' };
export const ANXIETY_LABEL: Record<AnxietyZone, string> = { morning: 'Mañana', afternoon: 'Tarde (17-19h)', night: 'Noche' };
/** Horas de la ventana de alimentación según el protocolo de ayuno. */
export const FASTING_WINDOW_H: Partial<Record<Fasting, number>> = { '16-8': 8, '14-10': 10 };

export const DEFAULT_FAVORITES =
  'Milanesas (al horno), pastel de papa, bife de cuadril, pollo, arroz, huevos, yogur griego, mate, frutas, tutucas, almohaditas de avena';

export function defaultAnamnesis(): Anamnesis {
  return {
    wakeTime: '06:00',
    bedTime: '23:00',
    mealTimesAuto: true,
    mealTimes: { breakfast: '06:30', lunch: '12:30', peri: '15:15', post: '18:15', dinner: '21:00' },
    disabledSlots: [],
    fasting: 'none',
    anxiety: 'afternoon',
    conditions: ['none'],
    allergies: [],
    favorites: DEFAULT_FAVORITES,
    aversions: 'Picantes, carnes crudas / ahumadas, vísceras',
    snacks: ['Tutucas de maíz', 'Frutos secos', 'Chocolate 70%', 'Galletas de arroz'],
    budget: 'mid',
    cooking: 'quick',
    sports: ['crossfit'],
    goal: 'recomp',
    season: 'pre',
    basket: null,
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
    disabledSlots: strs(a.disabledSlots, []).filter((x): x is MealSlot => (SLOTS as string[]).includes(x)),
    fasting: a.fasting && a.fasting in FASTING_LABEL ? a.fasting : 'none',
    anxiety: a.anxiety === 'morning' || a.anxiety === 'night' ? a.anxiety : 'afternoon',
    conditions: strs(a.conditions, d.conditions),
    allergies: strs(a.allergies, d.allergies),
    favorites: typeof a.favorites === 'string' ? a.favorites : d.favorites,
    aversions: typeof a.aversions === 'string' ? a.aversions : d.aversions,
    snacks: strs(a.snacks, d.snacks),
    budget: a.budget === 'low' || a.budget === 'high' ? a.budget : 'mid',
    cooking: a.cooking === 'batch' || a.cooking === 'gourmet' ? a.cooking : 'quick',
    sports: strs(a.sports, d.sports),
    goal: typeof a.goal === 'string' && GOALS.some((g) => g.id === a.goal) ? a.goal : d.goal,
    season: a.season && a.season in SEASON_LABEL ? a.season : d.season,
    basket: Array.isArray(a.basket) ? a.basket.filter((x): x is string => typeof x === 'string') : null,
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

/** Presets rápidos de atleta (anamnesis + perfil). */
export type PresetId = 'crossfit' | 'recomp' | 'fodmap';
export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'crossfit', label: '🏋️ Atleta CrossFit RX' },
  { id: 'recomp', label: '🏃 Recomposición Agresiva' },
  { id: 'fodmap', label: '🧘 Atleta FODMAP' },
];

export function presetPatch(id: PresetId): Partial<Anamnesis> {
  if (id === 'crossfit')
    return {
      conditions: ['none'],
      disabledSlots: [],
      mealTimesAuto: true,
      fasting: 'none',
      anxiety: 'afternoon',
      snacks: ['Tutucas de maíz', 'Frutos secos', 'Galletas de arroz'],
      cooking: 'quick',
      budget: 'mid',
      sports: ['crossfit'],
      goal: 'peri',
    };
  if (id === 'recomp')
    return {
      disabledSlots: [],
      mealTimesAuto: true,
      fasting: 'none',
      anxiety: 'night',
      snacks: ['Gelatina light', 'Yogur proteico', 'Tutucas de maíz'],
      cooking: 'batch',
      goal: 'recomp',
    };
  return {
    conditions: ['ibs'],
    allergies: ['lactose'],
    favorites: 'Arroz, papa, avena, pollo, merluza, huevos, carne magra, banana firme, frutillas, zanahoria, zapallito, espinaca, yogur deslactosado',
    aversions: 'Ajo, cebolla, legumbres, manzana, trigo en exceso, picantes',
    snacks: ['Galletas de arroz', 'Fruta fresca', 'Yogur proteico'],
    anxiety: 'afternoon',
    fasting: 'none',
    cooking: 'quick',
  };
}

/** Deportes agrupados por demanda (cada grupo tiene su regla nutricional en el prompt). */
export const SPORT_GROUPS = [
  { id: 'strength', label: 'Fuerza / Estética', sports: [['crossfit', 'CrossFit'], ['weightlifting', 'Halterofilia'], ['powerlifting', 'Powerlifting'], ['bodybuilding', 'Musculación']] },
  { id: 'team', label: 'Equipos / Contacto', sports: [['rugby', 'Rugby'], ['football', 'Fútbol'], ['hockey', 'Hockey'], ['basketball', 'Básquet'], ['volleyball', 'Vóley']] },
  { id: 'endurance', label: 'Resistencia', sports: [['mtb', 'Mountain Bike (MTB)'], ['cycling', 'Ciclismo'], ['running', 'Running'], ['triathlon', 'Triatlón']] },
  { id: 'combat', label: 'Combate / Otros', sports: [['padel', 'Pádel'], ['tennis', 'Tenis'], ['mma', 'MMA / Boxeo']] },
] as const;

const SPORT_INDEX: Record<string, { label: string; group: string }> = Object.fromEntries(
  SPORT_GROUPS.flatMap((g) => g.sports.map(([id, label]) => [id, { label, group: g.id }])),
);
export const sportLabel = (id: string) => SPORT_INDEX[id]?.label ?? id;
export const sportGroup = (id: string) => SPORT_INDEX[id]?.group ?? 'custom';

export const GOALS = [
  { id: 'recomp', label: 'Recomposición Corporal Agresiva' },
  { id: 'hypertrophy', label: 'Hipertrofia Limpia' },
  { id: 'cut', label: 'Definición Extrema' },
  { id: 'peri', label: 'Rendimiento Peri-WOD' },
  { id: 'glycogen', label: 'Carga de Glucógeno Inter-Sesión' },
  { id: 'weight-class', label: 'Manejo de Categoría por Peso' },
] as const;
export const goalLabel = (id: string) => GOALS.find((g) => g.id === id)?.label ?? id;

export const SEASON_LABEL: Record<SeasonPhase, string> = { pre: 'Pretemporada', comp: 'Competencia', peak: 'Peaking / Semana de Torneo', rest: 'Descanso Activo' };
