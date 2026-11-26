import { protocolOf } from './allergens';
import { trainingOf } from './agenda';
import { computeTelemetry } from './bioenergetics';
import { BANK_GOALS, dayTargets, goalOf, planSummary, type BankGoal, type BankPlanId, type BankSelection, type BankVariant } from './planBank';
import type { AthletePlan, Discipline, Sport } from './types';

/**
 * PRECÁLCULO EN VIVO DEL PERFIL: con sexo, peso, talla, edad, deporte y objetivo, el Builder estima el metabolismo
 * basal, el gasto de un día de entreno y de descanso, y sugiere el plan maestro del banco con sus calorías y macros.
 */

export interface SportDef {
  id: Sport;
  label: string;
  hint: string;
  /** MET promedio de la sesión (Compendium of Physical Activities, Ainsworth 2011). */
  met: number;
  discipline: Discipline;
  /** Objetivo por defecto si el coach todavía no eligió uno. */
  goal: BankGoal;
}

export const SPORTS: SportDef[] = [
  { id: 'gym', label: 'Musculación', hint: 'Pesas, fuerza, estética', met: 5, discipline: 'bodybuilding', goal: 'hip' },
  { id: 'crossfit', label: 'CrossFit', hint: 'WOD de alta intensidad', met: 8, discipline: 'hybrid', goal: 'ren' },
  { id: 'hyrox', label: 'Hyrox', hint: 'Carrera + estaciones', met: 8.5, discipline: 'hybrid', goal: 'ren' },
  { id: 'mtb', label: 'MTB / Ciclismo', hint: 'Rodadas largas', met: 8.5, discipline: 'hybrid', goal: 'ren' },
  { id: 'team', label: 'Deportes de equipo', hint: 'Fútbol, hockey, rugby, básquet', met: 7, discipline: 'hybrid', goal: 'ren' },
  { id: 'running', label: 'Running', hint: 'Fondo, series, trail', met: 9.5, discipline: 'hybrid', goal: 'ren' },
];
export const sportOf = (id?: Sport) => SPORTS.find((s) => s.id === id);

/** Gasto neto de la sesión: (MET − 1) × kg × horas (lo que suma el entreno sobre el reposo). */
export const sessionKcalFor = (sport: SportDef, weightKg: number, minutes: number) => Math.round(((sport.met - 1) * weightKg * minutes) / 60 / 10) * 10;

/** Deporte del perfil o, si falta, el primero que coincida en la anamnesis. */
const FROM_ANAMNESIS: Record<string, Sport> = {
  crossfit: 'crossfit',
  bodybuilding: 'gym',
  powerlifting: 'gym',
  weightlifting: 'gym',
  rugby: 'team',
  football: 'team',
  hockey: 'team',
  basketball: 'team',
  volleyball: 'team',
  mtb: 'mtb',
  cycling: 'mtb',
  running: 'running',
  triathlon: 'running',
};
export function sportFor(plan: AthletePlan): SportDef | undefined {
  const id = plan.profile.sport ?? plan.anamnesis?.sports?.map((s) => FROM_ANAMNESIS[s]).find(Boolean);
  return sportOf(id);
}

/** Objetivo del banco desde la anamnesis (cut → definición, recomp → recomposición, …) o el del deporte. */
const GOAL_FROM: Record<string, BankGoal> = { cut: 'def', recomp: 'rec', hypertrophy: 'hip', peri: 'ren', glycogen: 'ren', 'weight-class': 'def' };
export function goalFor(plan: AthletePlan): BankGoal {
  return GOAL_FROM[plan.anamnesis?.goal ?? ''] ?? sportFor(plan)?.goal ?? (plan.profile.phase === 'surplus' ? 'hip' : plan.profile.phase === 'recomp' ? 'def' : 'rec');
}

export function variantFor(plan: AthletePlan): BankVariant {
  const an = plan.anamnesis;
  // Protocolo Keto / Low Carb primero (convive con alergias y vegetarianismo dentro del protocolo).
  const proto = protocolOf(an?.allergies ?? []);
  if (proto) return proto;
  if (an?.allergies?.includes('veg')) return 'veg';
  if (an?.allergies?.includes('gluten')) return 'stacc';
  if (/vegetarian|vegan|sin carne/i.test(`${an?.aversions ?? ''} ${an?.favorites ?? ''}`)) return 'veg';
  return 'std';
}

export interface Precalc {
  bmr: number;
  bmrAlt: number;
  bmrLabel: string;
  tdeeOn: number;
  tdeeOff: number;
  sel: BankSelection;
  goal: (typeof BANK_GOALS)[number];
  kcal: { on: number; off: number };
  grams: { on: { p: number; c: number; f: number }; off: { p: number; c: number; f: number } };
  gkg: ReturnType<typeof planSummary>['gkg'];
  meals: { on: number; off: number };
  /** Balance del plan sugerido contra el gasto estimado (−0,15 = déficit del 15 %). */
  balance: { on: number; off: number };
}

/** Precálculo completo para el atleta activo (se recalcula en cada cambio del perfil). */
export function precalc(plan: AthletePlan): Precalc {
  const t = computeTelemetry(plan);
  const pr = plan.profile;
  const goal = goalFor(plan);
  const sel: BankSelection = { plan: `${pr.sex}-${goal}` as BankPlanId, variant: variantFor(plan) };
  const d = dayTargets(goalOf(sel.plan), pr.sex, pr.weightKg, sel.variant);
  const sum = planSummary(sel, pr.weightKg, trainingOf(pr));
  const r = (m: { p: number; c: number; f: number }) => ({ p: Math.round(m.p), c: Math.round(m.c), f: Math.round(m.f) });
  return {
    bmr: t.bmr,
    bmrAlt: t.bmrAlt,
    bmrLabel: pr.bmrFormula === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor',
    tdeeOn: t.tdeeOn,
    tdeeOff: t.tdeeOff,
    sel,
    goal: goalOf(sel.plan),
    kcal: { on: Math.round(d.on.kcal), off: Math.round(d.off.kcal) },
    grams: { on: r(d.on), off: r(d.off) },
    gkg: d.gkg,
    meals: sum.meals,
    balance: { on: d.on.kcal / t.tdeeOn - 1, off: d.off.kcal / t.tdeeOff - 1 },
  };
}
