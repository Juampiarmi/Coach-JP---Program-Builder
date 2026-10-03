import type { AiPlanJson } from './ai';
import { computeTelemetry, dayTotals, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals } from './bioenergetics';
import type { AthletePlan } from './types';

export type CheckStatus = 'pending' | 'running' | 'retry' | 'ok' | 'warn' | 'fail';

export interface CompileCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

/** Pasos del terminal de compilación (orden de ejecución). */
export const COMPILE_STEPS: Pick<CompileCheck, 'id' | 'label'>[] = [
  { id: 'link', label: 'ENLACE CON EL MOTOR IA' },
  { id: 'infer', label: 'INFERENCIA BIOENERGÉTICA' },
  { id: 'json', label: 'PARSEO DEL JSON ESTRUCTURADO' },
  { id: 'bmr', label: 'VALIDACIÓN BMR · KATCH-McARDLE' },
  { id: 'split', label: 'PARTICIÓN ON / OFF' },
  { id: 'leu', label: 'UMBRAL DE LEUCINA (≥2,7 g) POR COMIDA' },
  { id: 'sync', label: 'SINCRONIZACIÓN DEL BUILDER' },
];

/**
 * Validaciones post-respuesta: el plan de la IA se contrasta con el motor local.
 * Devuelve el estado y el detalle de los pasos bmr / split / leu.
 */
export function validateCompiled(json: AiPlanJson, plan: AthletePlan): Record<'bmr' | 'split' | 'leu', Pick<CompileCheck, 'status' | 'detail'>> {
  const t = computeTelemetry(plan);

  // BMR: la IA vs el motor local (tolerancia 10 %).
  let bmr: Pick<CompileCheck, 'status' | 'detail'>;
  if (typeof json.bmr === 'number' && json.bmr > 0) {
    const diff = ((json.bmr - t.bmr) / t.bmr) * 100;
    bmr = {
      status: Math.abs(diff) <= 10 ? 'ok' : 'warn',
      detail: `IA ${fmt0(json.bmr)} vs MOTOR ${fmt0(t.bmr)} kcal (Δ ${diff >= 0 ? '+' : ''}${fmt1(diff)} %)`,
    };
  } else bmr = { status: 'warn', detail: `IA sin BMR · se usa el motor local ${fmt0(t.bmr)} kcal` };

  // Partición: carbos ON > OFF, grasas OFF ≥ ON, proteína constante (±0,2 g/kg).
  const { on, off } = plan.periodization;
  const issues: string[] = [];
  if (!(on.c > off.c)) issues.push('carbos ON ≤ OFF');
  if (!(off.f >= on.f)) issues.push('grasas OFF < ON');
  if (Math.abs(on.p - off.p) > 0.2) issues.push('proteína no constante');
  const onDay = dayTotals(plan.meals, 'on');
  const offDay = dayTotals(plan.meals, 'off');
  const split: Pick<CompileCheck, 'status' | 'detail'> = {
    status: issues.length ? 'warn' : 'ok',
    detail: issues.length
      ? issues.join(' · ')
      : `ON ${fmt0(t.kcalOn)} kcal (C ${fmt1(on.c)} g/kg) · OFF ${fmt0(t.kcalOff)} kcal (F ${fmt1(off.f)} g/kg) · comidas ${fmt0(onDay.kcal)}/${fmt0(offDay.kcal)}`,
  };

  // Leucina: comidas principales que alcanzan el umbral.
  const mps = plan.meals.filter(isMpsMeal);
  const okLeu = mps.filter((m) => mealTotals(m).leucine >= LEUCINE_THRESHOLD).length;
  const leu: Pick<CompileCheck, 'status' | 'detail'> = {
    status: mps.length === 0 ? 'fail' : okLeu === mps.length ? 'ok' : 'warn',
    detail: mps.length === 0 ? 'sin comidas principales' : `${okLeu}/${mps.length} comidas principales activan mTOR / MPS`,
  };

  return { bmr, split, leu };
}
