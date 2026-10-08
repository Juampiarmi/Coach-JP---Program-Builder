import type { AthletePlan, DayMode, Macros, Meal, Phase, Profile, Sex, SkinfoldSite, Skinfolds } from './types';

export const LEUCINE_THRESHOLD = 2.7;

export const PHASE_LABEL: Record<Phase, string> = {
  recomp: 'Recomposición Agresiva',
  maintenance: 'Normocalórica de Control',
  surplus: 'Superávit Limpio',
};

/** Presets de g/kg por fase (ISSN / Morton 2018 / Thomas-ACSM 2016). */
export const PHASE_PRESETS: Record<Phase, { on: Macros; off: Macros }> = {
  recomp: { on: { p: 2.3, c: 4.5, f: 0.65 }, off: { p: 2.3, c: 2.0, f: 1.0 } },
  maintenance: { on: { p: 2.0, c: 5.5, f: 0.75 }, off: { p: 2.0, c: 3.0, f: 1.1 } },
  surplus: { on: { p: 2.0, c: 6.5, f: 0.8 }, off: { p: 2.0, c: 4.0, f: 1.2 } },
};

export const RANGES = {
  on: { p: [2.0, 2.4], c: [4, 7], f: [0.6, 0.8] },
  off: { p: [2.0, 2.4], c: [1.5, 3.5], f: [0.9, 1.2] },
} as const;

export function ffm(p: Profile) {
  if (p.precisionMode === 'isak' && p.measuredFfmKg > 0) return Math.min(p.measuredFfmKg, p.weightKg);
  return p.weightKg * (1 - p.bodyFatPct / 100);
}

// ---------- MODO ESTIMACIÓN RÁPIDA ----------

export interface BodyFatBand {
  id: string;
  label: string;
  range: string;
  hint: string;
  pct: number;
}

/** Bandas visuales de % graso: el coach elige una tarjeta en lugar de medir. */
export const BODY_FAT_BANDS: Record<Sex, BodyFatBand[]> = {
  M: [
    { id: 'lean', label: 'Bajo / Definido', range: '~10–12 %', hint: 'Abdominales visibles, venas marcadas', pct: 11 },
    { id: 'athletic', label: 'Atlético / Medio', range: '~14–17 %', hint: 'Contorno abdominal, sin pliegues', pct: 15.5 },
    { id: 'average', label: 'Promedio', range: '~18–22 %', hint: 'Abdomen liso, algo de cintura', pct: 20 },
    { id: 'over', label: 'Sobrepeso', range: '~25 %+', hint: 'Grasa abdominal evidente', pct: 27 },
  ],
  F: [
    { id: 'lean', label: 'Baja / Definida', range: '~17–20 %', hint: 'Abdomen marcado, hombros definidos', pct: 18.5 },
    { id: 'athletic', label: 'Atlética / Media', range: '~21–24 %', hint: 'Silueta firme, poca grasa abdominal', pct: 22.5 },
    { id: 'average', label: 'Promedio', range: '~25–30 %', hint: 'Curvas suaves, cintura definida', pct: 27.5 },
    { id: 'over', label: 'Sobrepeso', range: '~32 %+', hint: 'Grasa abdominal y de cadera evidente', pct: 34 },
  ],
};

export const ACTIVITY_PRESETS = [
  { id: 'desk', label: 'Oficina / sentado', hint: '< 6.000 pasos', factor: 1.3 },
  { id: 'active', label: 'Activo', hint: '6.000–10.000 pasos', factor: 1.45 },
  { id: 'manual', label: 'Muy activo', hint: 'Trabajo físico / +12.000 pasos', factor: 1.6 },
] as const;

/** Gasto neto típico de la sesión según el tipo de entrenamiento (Kliszczewicz 2016). */
export const SESSION_PRESETS = [
  { id: 'strength', label: 'Fuerza / Hipertrofia', hint: '60–75 min de pesas', kcal: 350 },
  { id: 'crossfit', label: 'CrossFit / WOD', hint: '60 min alta intensidad', kcal: 600 },
  { id: 'hyrox', label: 'Hyrox / Híbrido largo', hint: '75–90 min carrera + estaciones', kcal: 750 },
] as const;

// ---------- MODO PRECISIÓN ISAK ----------

export const SKINFOLD_SITES: { id: SkinfoldSite; label: string }[] = [
  { id: 'triceps', label: 'Tríceps' },
  { id: 'subscapular', label: 'Subescapular' },
  { id: 'chest', label: 'Pectoral' },
  { id: 'midaxillary', label: 'Axilar medio' },
  { id: 'suprailiac', label: 'Suprailíaco' },
  { id: 'abdominal', label: 'Abdominal' },
  { id: 'thigh', label: 'Muslo' },
];

export const EMPTY_SKINFOLDS: Skinfolds = { triceps: 0, subscapular: 0, chest: 0, midaxillary: 0, suprailiac: 0, abdominal: 0, thigh: 0 };

export function skinfoldSum(sk: Skinfolds) {
  return SKINFOLD_SITES.reduce((a, s) => a + (sk[s.id] || 0), 0);
}

/** % graso por Jackson-Pollock 7 pliegues + ecuación de Siri. Null si falta algún pliegue. */
export function jp7BodyFat(sex: Sex, age: number, sk: Skinfolds): number | null {
  if (SKINFOLD_SITES.some((s) => !(sk[s.id] > 0))) return null;
  const S = skinfoldSum(sk);
  const bd =
    sex === 'M'
      ? 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * age
      : 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * age;
  const pct = 495 / bd - 450;
  return Math.round(Math.min(60, Math.max(3, pct)) * 10) / 10;
}

export function bmrKatch(p: Profile) {
  return 370 + 21.6 * ffm(p);
}

export function bmrMifflin(p: Profile) {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'M' ? 5 : -161);
}

export function kcalOf(m: Macros) {
  return m.p * 4 + m.c * 4 + m.f * 9;
}

export function gramsFromGkg(gkg: Macros, weightKg: number): Macros {
  return {
    p: Math.round(gkg.p * weightKg),
    c: Math.round(gkg.c * weightKg),
    f: Math.round(gkg.f * weightKg),
  };
}

export type EaStatus = 'optimal' | 'reduced' | 'low';

/** Semáforo EA: >45 óptima · 30–45 reducida · <30 baja (alerta RED-S). */
export function eaStatus(ea: number): EaStatus {
  if (ea > 45) return 'optimal';
  if (ea >= 30) return 'reduced';
  return 'low';
}

export interface Telemetry {
  ffm: number;
  bmr: number;
  bmrAlt: number;
  tdeeOff: number;
  tdeeOn: number;
  tdeeWeekly: number;
  gramsOn: Macros;
  gramsOff: Macros;
  kcalOn: number;
  kcalOff: number;
  kcalWeekly: number;
  deltaOn: number;
  deltaOff: number;
  deltaWeeklyPct: number;
  /** kg/semana proyectados (negativo = pérdida). */
  weeklyKgProjection: number;
  /** Kcal ingeridas planificadas (suma de comidas del día; si no hay comidas, el objetivo). */
  intakeOn: number;
  intakeOff: number;
  /** EA ON = (ingesta ON − gasto de la sesión) / FFM · EA OFF = (ingesta OFF − 0) / FFM. */
  eaOn: number;
  eaOff: number;
  refeedGrams: Macros | null;
  refeedKcal: number | null;
}

export function computeTelemetry(plan: AthletePlan): Telemetry {
  const { profile: pr, periodization: per } = plan;
  const lean = ffm(pr);
  const katch = bmrKatch(pr);
  const mifflin = bmrMifflin(pr);
  const bmr = pr.bmrFormula === 'katch' ? katch : mifflin;
  const bmrAlt = pr.bmrFormula === 'katch' ? mifflin : katch;
  const tdeeOff = bmr * pr.activityFactor;
  const tdeeOn = tdeeOff + pr.sessionKcal;
  const onDays = clamp(pr.trainingDaysPerWeek, 0, 7);
  const tdeeWeekly = (tdeeOn * onDays + tdeeOff * (7 - onDays)) / 7;

  const gramsOn = gramsFromGkg(per.on, pr.weightKg);
  const gramsOff = gramsFromGkg(per.off, pr.weightKg);
  const kcalOn = kcalOf(gramsOn);
  const kcalOff = kcalOf(gramsOff);
  const kcalWeekly = (kcalOn * onDays + kcalOff * (7 - onDays)) / 7;

  const mealsOn = mealsForDay(plan.meals, 'on');
  const mealsOff = mealsForDay(plan.meals, 'off');
  const intakeOn = mealsOn.length ? dayTotals(plan.meals, 'on').kcal : kcalOn;
  const intakeOff = mealsOff.length ? dayTotals(plan.meals, 'off').kcal : kcalOff;

  const refeedGrams = per.refeed.enabled
    ? { p: gramsOn.p, c: Math.round(per.refeed.carbsGkg * pr.weightKg), f: Math.round(0.6 * pr.weightKg) }
    : null;

  return {
    ffm: lean,
    bmr,
    bmrAlt,
    tdeeOff,
    tdeeOn,
    tdeeWeekly,
    gramsOn,
    gramsOff,
    kcalOn,
    kcalOff,
    kcalWeekly,
    deltaOn: kcalOn - tdeeOn,
    deltaOff: kcalOff - tdeeOff,
    deltaWeeklyPct: ((kcalWeekly - tdeeWeekly) / tdeeWeekly) * 100,
    weeklyKgProjection: ((kcalWeekly - tdeeWeekly) * 7) / 7700,
    intakeOn,
    intakeOff,
    eaOn: (intakeOn - pr.sessionKcal) / lean,
    eaOff: intakeOff / lean,
    refeedGrams,
    refeedKcal: refeedGrams ? kcalOf(refeedGrams) : null,
  };
}

export function mealTotals(meal: Meal) {
  return meal.items.reduce(
    (a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, leucine: a.leucine + i.leucine }),
    { p: 0, c: 0, f: 0, leucine: 0 },
  );
}

export function mealsForDay(meals: Meal[], mode: DayMode) {
  return meals
    .filter((m) => m.day === 'both' || m.day === mode)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function dayTotals(meals: Meal[], mode: DayMode) {
  const t = mealsForDay(meals, mode).reduce(
    (a, m) => {
      const x = mealTotals(m);
      return { p: a.p + x.p, c: a.c + x.c, f: a.f + x.f, leucine: a.leucine + x.leucine };
    },
    { p: 0, c: 0, f: 0, leucine: 0 },
  );
  return { ...t, kcal: kcalOf(t) };
}

/** Las comidas principales exigen el umbral de leucina; el peri-entreno es un bloque glucolítico. */
/**
 * Umbral de leucina (≥ 2,7 g · mTOR) sólo en las comidas principales: desayuno, almuerzo, cena y post-entreno.
 * Colaciones, meriendas y bloques peri-entreno son ingestas auxiliares (modulación glucémica).
 */
export const MPS_ROLES: Meal['role'][] = ['breakfast', 'lunch', 'dinner', 'post'];
export function isMpsMeal(meal: Meal) {
  return MPS_ROLES.includes(meal.role);
}

/** Cronograma semanal por defecto según la cantidad de días de entreno (lun-vie primero). */
const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  0: [],
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Días ON de la semana (0 = domingo): los marcados por el coach o el cronograma por defecto. */
export function trainingWeekdays(pr: Pick<AthletePlan['profile'], 'trainingDaysPerWeek' | 'trainingWeekdays'>) {
  if (Array.isArray(pr.trainingWeekdays) && pr.trainingWeekdays.length === pr.trainingDaysPerWeek) return [...pr.trainingWeekdays].sort();
  return DEFAULT_WEEKDAYS[clamp(Math.round(pr.trainingDaysPerWeek), 0, 7)];
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export const fmt0 = (n: number) => Math.round(n).toLocaleString('es-AR');
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-AR');
export const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt0(Math.abs(n));

/** Hidratación base 35 ml/kg (redondeo a 250 ml) + ~750 ml por hora de sesión en día ON. */
export function hydrationDefaults(weightKg: number, sessionMinutes: number) {
  const r = (ml: number) => Math.round(ml / 250) * 250;
  const offMl = r(35 * weightKg);
  return { offMl, onMl: offMl + r((sessionMinutes / 60) * 750) };
}
