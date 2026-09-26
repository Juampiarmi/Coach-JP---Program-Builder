import type { AthletePlan, DayMode, Macros, Meal, Phase, Profile } from './types';

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
  return p.weightKg * (1 - p.bodyFatPct / 100);
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

export function eaStatus(ea: number): EaStatus {
  if (ea >= 45) return 'optimal';
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
    eaOn: (kcalOn - pr.sessionKcal) / lean,
    eaOff: kcalOff / lean,
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
export function isMpsMeal(meal: Meal) {
  return meal.role !== 'peri';
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export const fmt0 = (n: number) => Math.round(n).toLocaleString('es-AR');
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-AR');
export const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt0(Math.abs(n));
