import { balancePlan } from './balance';
import { FOOD_BY_ID, macrosFor } from './foods';
import { portionCap } from './portionCaps';
import { retimeMeals } from './schedule';
import { uid } from './seed';
import type { AthletePlan, FoodItem, Macros, Meal, Phase, Sex } from './types';

/**
 * PLANTILLAS PROPIAS Y COPIA DE PLANES ENTRE ALUMNOS.
 * Un plan (de otro alumno o una plantilla guardada) se adapta al alumno activo: las porciones se escalan por peso
 * (los macros del plan son g/kg), cada ingrediente queda dentro de su tope por toma para el sexo del alumno, los
 * horarios siguen la agenda argentina de su entreno y el cierre de macros lo deja en sus calorías exactas.
 */

export interface PlanTemplate {
  id: string;
  name: string;
  createdAt: number;
  /** Alumno del que salió (referencia para el coach). */
  from: string;
  sex: Sex;
  weightKg: number;
  phase: Phase;
  periodization: { on: Macros; off: Macros };
  meals: Meal[];
}

/** Lo mínimo para adaptar un plan: comidas, macros g/kg, fase y el peso para el que estaban calculadas. */
export interface PlanSource {
  meals: Meal[];
  periodization: { on: Macros; off: Macros };
  phase: Phase;
  weightKg: number;
}

export function templateFromPlan(plan: AthletePlan, name: string): PlanTemplate {
  return {
    id: uid(),
    name: name.trim() || `Plan de ${plan.profile.name}`,
    createdAt: Date.now(),
    from: plan.profile.name,
    sex: plan.profile.sex,
    weightKg: plan.profile.weightKg,
    phase: plan.profile.phase,
    periodization: { on: { ...plan.periodization.on }, off: { ...plan.periodization.off } },
    meals: structuredClone(plan.meals),
  };
}

export const sourceOf = (p: AthletePlan | PlanTemplate): PlanSource =>
  'profile' in p ? { meals: p.meals, periodization: p.periodization, phase: p.profile.phase, weightKg: p.profile.weightKg } : p;

const stepOf = (id?: string) => {
  if (id === 'huevo') return 50;
  if (id === 'claras') return 33;
  const u = id ? FOOD_BY_ID[id]?.unit : undefined;
  return u && u.grams <= 60 ? u.grams : 5;
};

/** Un ingrediente escalado por k, redondeado a su unidad y dentro de su rango por toma para el sexo del alumno. */
function scaleItem(it: FoodItem, k: number, sex: Sex, role: Meal['role']): FoodItem {
  if (it.foodId && FOOD_BY_ID[it.foodId]) {
    const cap = portionCap(it.foodId, { sex, role });
    const st = stepOf(it.foodId);
    const g = Math.min(cap.max, Math.max(Math.min(cap.min, it.grams), Math.round((it.grams * k) / st) * st));
    return { ...it, id: uid(), grams: g, ...macrosFor(it.foodId, g)! };
  }
  // Alimento libre (plato de la IA, marca propia sin ficha): escala lineal.
  const r = (n: number) => Math.round(n * k * 10) / 10;
  return { ...it, id: uid(), grams: Math.round(it.grams * k), p: r(it.p), c: r(it.c), f: r(it.f), leucine: Math.round(it.leucine * k * 100) / 100 };
}

/** Adapta un plan ajeno al alumno activo: porciones, topes, horarios y cierre de macros a su peso y objetivo. */
export function adaptPlan(target: AthletePlan, src: PlanSource): AthletePlan {
  const k = target.profile.weightKg / Math.max(1, src.weightKg);
  const sex = target.profile.sex;
  const meals = src.meals.map(
    (m): Meal => ({
      ...structuredClone(m),
      id: uid(),
      items: m.items.map((it) => scaleItem(it, k, sex, m.role)),
      alts: m.alts?.map((a) => ({ ...a, items: a.items.map((it) => scaleItem(it, k, sex, m.role)) })),
    }),
  );
  const next: AthletePlan = {
    ...target,
    profile: { ...target.profile, phase: src.phase },
    periodization: { ...target.periodization, on: { ...src.periodization.on }, off: { ...src.periodization.off } },
    meals: retimeMeals(meals, target.profile, target.anamnesis),
  };
  return balancePlan(next).plan;
}
