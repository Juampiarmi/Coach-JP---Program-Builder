import { computeTelemetry } from './bioenergetics';
import { balancePlan } from './balance';
import { CITES } from './evidence';
import { FOOD_BY_ID } from './foods';
import { autoTechnique, comboSteps, solveCombo, withAlternatives, type Combo } from './menuOptions';
import { retimeMeals } from './schedule';
import { seedPlan, uid } from './seed';
import type { AthletePlan, Macros, Meal, MealDay, MealRole, Phase, Sex } from './types';

// =====================================================================================================
// BIBLIOTECA DE PLANES MASTER (Template Bank): planes semilla por sexo, peso base, objetivo y preferencia.
// Los macros salen de las posiciones ISSN / GSSI en g/kg; los platos, del motor de opciones (3 a 5 por comida).
// =====================================================================================================

export interface TemplateProfile {
  id: string;
  sex: Sex;
  label: string;
  weightKg: number;
  bodyFatPct: number;
  heightCm: number;
  age: number;
}

export const TEMPLATE_PROFILES: TemplateProfile[] = [
  { id: 'm70', sex: 'M', label: '70 kg', weightKg: 70, bodyFatPct: 14, heightCm: 172, age: 28 },
  { id: 'm80', sex: 'M', label: '80 kg', weightKg: 80, bodyFatPct: 15, heightCm: 178, age: 30 },
  { id: 'm90', sex: 'M', label: '90+ kg', weightKg: 92, bodyFatPct: 18, heightCm: 183, age: 32 },
  { id: 'f52', sex: 'F', label: '52 kg', weightKg: 52, bodyFatPct: 22, heightCm: 158, age: 28 },
  { id: 'f60', sex: 'F', label: '60 kg', weightKg: 60, bodyFatPct: 24, heightCm: 164, age: 30 },
  { id: 'f70', sex: 'F', label: '70+ kg', weightKg: 72, bodyFatPct: 27, heightCm: 168, age: 32 },
];

export type TemplateGoalId = 'recomp' | 'hypertrophy' | 'peak' | 'maintenance';

export interface TemplateGoal {
  id: TemplateGoalId;
  label: string;
  short: string;
  phase: Phase;
  /** Macros en g/kg de peso corporal. */
  on: Macros;
  off: Macros;
  /** Colación de media mañana en días ON (más volumen de comida). */
  snack: boolean;
  /** Objetivo equivalente de la Anamnesis Pro. */
  anamnesisGoal: string;
  rationale: string;
  evidence: { label: string; doi?: string }[];
}

export const TEMPLATE_GOALS: TemplateGoal[] = [
  {
    id: 'recomp',
    label: 'Recomposición Corporal Agresiva',
    short: 'Déficit moderado + alta proteína',
    phase: 'recomp',
    on: { p: 2.3, c: 4.0, f: 0.7 },
    off: { p: 2.3, c: 2.0, f: 1.0 },
    snack: false,
    anamnesisGoal: 'recomp',
    rationale:
      'Proteína alta y constante (2,3 g/kg ≈ 2,6-2,9 g/kg de masa magra) para sostener la masa muscular en déficit, carbos concentrados alrededor del entreno los días ON y grasas más altas los días OFF.',
    evidence: [CITES.bodyComp, CITES.protein, CITES.morton],
  },
  {
    id: 'hypertrophy',
    label: 'Hipertrofia y Ganancia Limpia',
    short: 'Superávit controlado (+5-10 %)',
    phase: 'surplus',
    on: { p: 2.0, c: 6.0, f: 0.9 },
    off: { p: 2.0, c: 4.0, f: 1.1 },
    snack: true,
    anamnesisGoal: 'hypertrophy',
    rationale:
      'Superávit chico para ganar músculo con poca grasa, 5-6 tomas con 0,3-0,4 g/kg de proteína cada una y carbos altos los días ON para sostener el volumen de entrenamiento.',
    evidence: [CITES.iraki, CITES.protein, CITES.issnReview],
  },
  {
    id: 'peak',
    label: 'Rendimiento / Peaking en Competencia',
    short: 'Carga de glucógeno peri-entreno',
    phase: 'maintenance',
    on: { p: 1.8, c: 8.0, f: 0.7 },
    off: { p: 1.8, c: 5.0, f: 0.9 },
    snack: true,
    anamnesisGoal: 'peri',
    rationale:
      'Carbos de 7-8 g/kg los días de carga y competencia, Pre-WOD de fácil digestión 1-4 h antes y recarga de 1-1,2 g/kg/h de carbos más proteína en el Post-WOD. Grasa y fibra bajas cerca de la sesión.',
    evidence: [CITES.burke, CITES.timing, CITES.carbs, CITES.gssi],
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento Normocalórico de Control',
    short: 'Kcal de mantenimiento, adherencia',
    phase: 'maintenance',
    on: { p: 2.0, c: 5.0, f: 0.9 },
    off: { p: 2.0, c: 3.0, f: 1.1 },
    snack: false,
    anamnesisGoal: 'recomp',
    rationale:
      'Energía cercana al gasto para consolidar resultados: proteína de 1,6-2,2 g/kg repartida en 4-5 comidas y carbos periodizados según el día ON / OFF.',
    evidence: [CITES.issnReview, CITES.protein, CITES.timing],
  },
];

export type TemplatePref = 'omni' | 'veg' | 'lactose' | 'quick';

export const TEMPLATE_PREFS: { id: TemplatePref; label: string; hint: string }[] = [
  { id: 'omni', label: 'Omnívoro', hint: 'Todas las fuentes de proteína' },
  { id: 'veg', label: 'Plant-Based / Vegetariano', hint: 'Ovo-lacto: sin carnes ni pescados' },
  { id: 'lactose', label: 'Sin Lactosa / Digestivo', hint: 'Lácteos deslactosados y whey aislado' },
  { id: 'quick', label: 'Rápido < 10 min', hint: 'Plancha, salteados y armado en frío' },
];

export interface TemplateSelection {
  profile: string;
  goal: TemplateGoalId;
  pref: TemplatePref;
}

// ---------- Filtros de preferencia ----------
const MEAT_RE =
  /pollo|pechuga|carne|cuadril|lomo|nalga|peceto|picada|merluza|pescado|at[uú]n|cerdo|bondiola|jam[oó]n|milanesa|asado|vac[ií]o|chori|molleja|chinchul|matambre|entra[ñn]a|alb[oó]ndiga|bolo[ñn]esa|hamburguesa casera|parrillada|brochette|locro|carbonada|pastel de papa|sfija|lomito|salpic/i;
const LACTOSE_IDS = new Set(['leche', 'yogur', 'untable', 'ricota', 'queso-light', 'whey', 'yogur-proteico', 'alfajor-proteico']);
const SLOW_IDS = new Set(['yamani', 'batata', 'papa', 'cerdo', 'lentejas', 'garbanzos']);

export function prefAccept(pref: TemplatePref): ((foodId: string) => boolean) | undefined {
  if (pref === 'omni') return undefined;
  return (id: string) => {
    const ref = FOOD_BY_ID[id];
    if (!ref) return false;
    const dish = ref.group === 'plato';
    if (pref === 'veg') return dish ? !MEAT_RE.test(`${ref.name} ${ref.detail ?? ''}`) : ref.group !== 'lean-protein' || id === 'tofu';
    if (pref === 'lactose') return dish ? !ref.lactose : !LACTOSE_IDS.has(id);
    return dish ? (ref.prep ?? 99) < 10 : !SLOW_IDS.has(id);
  };
}

// ---------- Estructura del día ----------
type Dist = Partial<Record<MealRole, number>>;
interface Slot {
  role: MealRole;
  name: string;
  time: string;
  day: MealDay;
}
const ON_SLOTS: Slot[] = [
  { role: 'breakfast', name: 'Desayuno', time: '07:30', day: 'on' },
  { role: 'snack', name: 'Colación de Media Mañana', time: '10:30', day: 'on' },
  { role: 'lunch', name: 'Almuerzo', time: '12:30', day: 'on' },
  { role: 'peri', name: 'Pre-WOD', time: '17:15', day: 'on' },
  { role: 'post', name: 'Post-WOD', time: '19:30', day: 'on' },
  { role: 'dinner', name: 'Cena', time: '21:30', day: 'on' },
];
const OFF_SLOTS: Slot[] = [
  { role: 'breakfast', name: 'Desayuno', time: '08:00', day: 'off' },
  { role: 'lunch', name: 'Almuerzo', time: '13:00', day: 'off' },
  { role: 'snack', name: 'Merienda', time: '17:00', day: 'off' },
  { role: 'dinner', name: 'Cena', time: '21:00', day: 'off' },
];
// Reparto de cada macro del día entre las comidas (suma 1). Carbos concentrados peri-entreno; grasa lejos de la sesión.
const DIST_ON: Record<'p' | 'c' | 'f', Dist> = {
  p: { breakfast: 0.22, lunch: 0.25, peri: 0.05, post: 0.18, dinner: 0.3 },
  c: { breakfast: 0.18, lunch: 0.24, peri: 0.2, post: 0.2, dinner: 0.18 },
  f: { breakfast: 0.25, lunch: 0.3, peri: 0.03, post: 0.05, dinner: 0.37 },
};
const DIST_ON_SNACK: Record<'p' | 'c' | 'f', Dist> = {
  p: { breakfast: 0.2, snack: 0.1, lunch: 0.22, peri: 0.05, post: 0.16, dinner: 0.27 },
  c: { breakfast: 0.16, snack: 0.1, lunch: 0.22, peri: 0.18, post: 0.18, dinner: 0.16 },
  f: { breakfast: 0.22, snack: 0.12, lunch: 0.28, peri: 0.03, post: 0.05, dinner: 0.3 },
};
const DIST_OFF: Record<'p' | 'c' | 'f', Dist> = {
  p: { breakfast: 0.25, lunch: 0.28, snack: 0.17, dinner: 0.3 },
  c: { breakfast: 0.25, lunch: 0.3, snack: 0.2, dinner: 0.25 },
  f: { breakfast: 0.25, lunch: 0.3, snack: 0.15, dinner: 0.3 },
};

// ---------- Opción 1 de cada comida (plato base por preferencia) ----------
const C = (title: string, parts: Combo['parts'], steps: string[]): Combo => ({ title, roles: [], parts, steps });

const BREAKFAST = C(
  'Tostadas Integrales con Huevos y Claras Revueltos, Palta y Frutillas',
  [{ id: 'claras', r: 'p', step: 33, min: 33, max: 264 }, { id: 'pan', r: 'c', step: 15, min: 30, max: 150 }, { id: 'palta', r: 'f', max: 60 }, { id: 'huevo', r: 'x', g: 100 }, { id: 'frutillas', r: 'x', g: 100 }],
  ['Batí {huevo} con {claras}, una pizca de sal y pimienta.', 'Cocinalos en sartén antiadherente a fuego bajo, revolviendo 2-3 min hasta que cuajen.', 'Tostá {pan} de pan integral y untalo con {palta} de palta pisada con limón.', 'Serví los huevos arriba de las tostadas y acompañá con {frutillas} de frutillas.'],
);
const yogurBowl = (yog: string) =>
  C(
    `Bowl de ${yog === 'yogur' ? 'Yogur Griego' : 'Yogur Deslactosado'} con Avena, Banana y Nueces`,
    [{ id: yog, r: 'p', min: 100, max: 400 }, { id: 'avena', r: 'c', max: 90 }, { id: 'nueces', r: 'f', max: 25 }, { id: 'banana', r: 'x', g: 60 }],
    [`Poné {${yog}} de yogur en un bowl.`, 'Sumá {avena} de avena arrollada y mezclá.', 'Cortá {banana} de banana en rodajas y ponela arriba.', 'Terminá con {nueces} de nueces picadas.'],
  );
const preWod = (yog: string) =>
  C(
    'Tostadas de Arroz con Miel y Banana',
    [{ id: yog, r: 'p', max: 200 }, { id: 'banana', r: 'c', min: 60, max: 360 }, { id: 'tostadas-arroz', r: 'x', g: 16 }, { id: 'miel', r: 'x', g: 15 }],
    ['Untá {tostadas-arroz} de tostadas de arroz con {miel} de miel.', 'Cortá {banana} de banana en rodajas y ponela arriba.', `Acompañá con {${yog}} de yogur.`, 'Comelo 45-60 min antes de entrenar.'],
  );
const postWod = (whey: string) =>
  C(
    'Shake de Whey con Banana y Avena',
    [{ id: whey, r: 'p', min: 20, max: 60 }, { id: 'banana', r: 'c', min: 60, max: 360 }, { id: 'avena', r: 'x', g: 20 }],
    [`Poné en la licuadora {${whey}} de whey, {banana} de banana, {avena} de avena y 300 ml de agua.`, 'Licuá 30 segundos y tomalo dentro de la hora post-entreno.'],
  );

const BASE: Record<TemplatePref, Partial<Record<MealRole, Combo>>> = {
  omni: {
    breakfast: BREAKFAST,
    snack: yogurBowl('yogur'),
    lunch: C(
      'Pechuga de Pollo a la Plancha con Arroz Yamaní y Ensalada',
      [{ id: 'pollo', r: 'p', min: 100, max: 280 }, { id: 'yamani', r: 'c', max: 400 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
      ['Hervir el arroz yamaní 35-40 min (o usá el del batch cooking). Serví {yamani} cocido.', 'Cociná {pollo} de pechuga a la plancha con spray antiadherente, 5-6 min por lado a fuego medio.', 'Armá la ensalada con {vegetales} de lechuga, tomate y zanahoria.', 'Condimentá con {oliva} de aceite de oliva, sal y limón.'],
    ),
    peri: preWod('yogur'),
    post: postWod('whey'),
    dinner: C(
      'Bife de Cuadril con Papas al Horno y Ensalada',
      [{ id: 'cuadril', r: 'p', min: 100, max: 280 }, { id: 'papa', r: 'c', max: 500 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
      ['Cortá la papa en cubos y mandala al horno a 200 °C por 30 min con spray antiadherente y romero. Serví {papa}.', 'Poné la plancha bien caliente y sellá {cuadril} de cuadril 4-5 min por lado. Dejalo reposar 3 min.', 'Armá la ensalada con {vegetales} de verduras.', 'Condimentá con {oliva} de aceite de oliva, sal y limón.'],
    ),
  },
  veg: {
    breakfast: BREAKFAST,
    snack: yogurBowl('yogur'),
    lunch: C(
      'Salteado de Tofu con Arroz Yamaní y Vegetales',
      [{ id: 'tofu', r: 'p', min: 100, max: 350 }, { id: 'yamani', r: 'c', max: 400 }, { id: 'oliva', r: 'f', max: 10 }, { id: 'vegetales', r: 'x', g: 200 }],
      ['Hervir el arroz yamaní 35-40 min. Serví {yamani} cocido.', 'Cortá {tofu} de tofu en cubos y doralo en sartén con {oliva} de aceite 6-8 min, dándolo vuelta.', 'Sumá {vegetales} de vegetales en juliana y salteá 3-4 min a fuego fuerte.', 'Terminá con un chorrito de salsa de soja y serví sobre el arroz.'],
    ),
    peri: preWod('yogur'),
    post: postWod('whey'),
    dinner: C(
      'Tortilla de Claras y Papa con Ensalada',
      [{ id: 'claras', r: 'p', step: 33, min: 99, max: 396 }, { id: 'papa', r: 'c', max: 500 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'huevo', r: 'x', g: 50 }, { id: 'vegetales', r: 'x', g: 150 }],
      ['Hervir {papa} de papa en cubos 10 min y escurrila.', 'Batí {claras} con {huevo}, sal y pimienta, y mezclalo con la papa.', 'Cociná en sartén antiadherente tapada a fuego bajo 5 min por lado.', 'Acompañá con {vegetales} de ensalada y {oliva} de aceite de oliva.'],
    ),
  },
  lactose: {
    breakfast: BREAKFAST,
    snack: yogurBowl('yogur-deslactosado'),
    peri: preWod('yogur-deslactosado'),
    post: postWod('whey-isolate'),
  },
  quick: {
    breakfast: BREAKFAST,
    snack: yogurBowl('yogur'),
    lunch: C(
      'Fideos con Atún, Tomate y Oliva',
      [{ id: 'atun', r: 'p', min: 80, max: 260 }, { id: 'fideos', r: 'c', max: 400 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 100 }],
      ['Hervir los fideos 8-10 min al dente. Serví {fideos} cocidos.', 'Mientras tanto, escurrí {atun} de atún y cortá {vegetales} de tomate en cubos.', 'Mezclá todo con {oliva} de aceite de oliva, sal y orégano.'],
    ),
    peri: preWod('yogur'),
    post: postWod('whey'),
    dinner: C(
      'Lomo a la Plancha con Pan Integral y Ensalada',
      [{ id: 'lomo', r: 'p', min: 100, max: 260 }, { id: 'pan', r: 'c', step: 15, min: 30, max: 180 }, { id: 'oliva', r: 'f', max: 13 }, { id: 'vegetales', r: 'x', g: 150 }],
      ['Sellá {lomo} de lomo en plancha bien caliente 3-4 min por lado.', 'Tostá {pan} de pan integral.', 'Armá la ensalada con {vegetales} de verduras y condimentala con {oliva} de aceite de oliva.'],
    ),
  },
};
const baseFor = (pref: TemplatePref, role: MealRole) => BASE[pref][role] ?? BASE.omni[role]!;

const targetOf = (g: Macros, d: Record<'p' | 'c' | 'f', Dist>, role: MealRole) => {
  const t = { p: g.p * (d.p[role] ?? 0), c: g.c * (d.c[role] ?? 0), f: g.f * (d.f[role] ?? 0) };
  return { ...t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
};

function buildMeal(slot: Slot, combo: Combo, target: ReturnType<typeof targetOf>): Meal {
  const items = solveCombo(combo, target) ?? [];
  return {
    id: uid(),
    name: slot.name,
    time: slot.time,
    day: slot.day,
    role: slot.role,
    items,
    title: combo.title,
    technique: autoTechnique(items),
    steps: comboSteps(combo, items),
  };
}

/** Meals del plan semilla para unos targets diarios (g de P / C / G de los días ON y OFF). */
function seedMeals(goal: TemplateGoal, pref: TemplatePref, gOn: Macros, gOff: Macros): Meal[] {
  const on = ON_SLOTS.filter((s) => s.role !== 'snack' || goal.snack);
  const dOn = goal.snack ? DIST_ON_SNACK : DIST_ON;
  return [
    ...on.map((s) => buildMeal(s, baseFor(pref, s.role), targetOf(gOn, dOn, s.role))),
    ...OFF_SLOTS.map((s) => buildMeal(s, baseFor(pref, s.role), targetOf(gOff, DIST_OFF, s.role))),
  ];
}

export const profileById = (id: string) => TEMPLATE_PROFILES.find((p) => p.id === id) ?? TEMPLATE_PROFILES[1];
export const goalById = (id: TemplateGoalId) => TEMPLATE_GOALS.find((g) => g.id === id) ?? TEMPLATE_GOALS[0];

/**
 * Arma el plan: periodización del objetivo aplicada al peso del atleta (g/kg), Opción 1 por comida resuelta a sus
 * macros, cierre del día al 100 % y opciones 2 a 5 filtradas por franja y preferencia.
 * `base` = atleta activo (adaptación real) o el perfil semilla de la biblioteca (vista previa).
 */
export function buildTemplatePlan(base: AthletePlan, sel: TemplateSelection, opts: { retime?: boolean } = {}): AthletePlan {
  const goal = goalById(sel.goal);
  const periodization = { ...base.periodization, on: { ...goal.on }, off: { ...goal.off } };
  const draft: AthletePlan = { ...base, profile: { ...base.profile, phase: goal.phase }, periodization, meals: [] };
  const t = computeTelemetry(draft);
  let meals = seedMeals(goal, sel.pref, t.gramsOn, t.gramsOff);
  if (opts.retime) meals = retimeMeals(meals, draft.profile, draft.anamnesis);
  const balanced = balancePlan({ ...draft, meals }).plan;
  return withAlternatives(balanced, true, undefined, prefAccept(sel.pref));
}

/** Plan de vista previa para el perfil semilla (sin tocar al atleta activo). */
export function previewTemplate(sel: TemplateSelection): AthletePlan {
  const pr = profileById(sel.profile);
  const seed = seedPlan();
  const goal = goalById(sel.goal);
  return buildTemplatePlan(
    {
      ...seed,
      profile: {
        ...seed.profile,
        name: `Plan Semilla · ${pr.sex === 'M' ? 'Hombre' : 'Mujer'} ${pr.label}`,
        sex: pr.sex,
        weightKg: pr.weightKg,
        bodyFatPct: pr.bodyFatPct,
        heightCm: pr.heightCm,
        age: pr.age,
        phase: goal.phase,
        sessionKcal: Math.round(pr.weightKg * 7),
      },
    },
    sel,
  );
}

