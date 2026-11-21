import { trainingOf } from './agenda';
import { ALLERGEN_INFO, allergenConflicts } from './allergens';
import { computeTelemetry, dayTotals, isMpsMeal, LEUCINE_THRESHOLD, mealTotals } from './bioenergetics';
import { mealVolumeCap, portionCap, solidGrams } from './portionCaps';
import { timeToMinutes } from './schedule';
import type { AthletePlan, Meal } from './types';

/**
 * SEMÁFORO DE CALIDAD ANTES DE PUBLICAR: las reglas que el sistema ya aplica, verificadas en vivo sobre el plan que
 * está por recibir el alumno. Sólo las alergias bloquean la publicación; el resto avisa (amarillo / rojo).
 */
export type Light = 'ok' | 'warn' | 'bad' | 'block';
export interface QualityCheck {
  id: string;
  label: string;
  status: Light;
  detail: string;
  /** Dónde está el problema (comida · opción · ingrediente). */
  where?: string[];
}

const DAY_LABEL = { on: 'entreno', off: 'descanso', both: 'ambos días' } as const;
const dayMeals = (plan: AthletePlan, day: 'on' | 'off') => plan.meals.filter((m) => m.day === day || m.day === 'both').sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
const pct = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`;

export function qualityChecks(plan: AthletePlan): QualityCheck[] {
  const t = computeTelemetry(plan);
  const sex = plan.profile.sex;
  const tr = trainingOf(plan.profile);
  const days = (['on', 'off'] as const).filter((d) => dayMeals(plan, d).length);
  const out: QualityCheck[] = [];

  // 1 · Alergias e intolerancias (bloqueo duro).
  const conflicts = allergenConflicts(plan);
  out.push(
    conflicts.length
      ? {
          id: 'allergens',
          label: 'Alergias e intolerancias',
          status: 'block',
          detail: `${conflicts.length} ingrediente${conflicts.length > 1 ? 's' : ''} con un alérgeno declarado: no se puede publicar hasta corregirlo.`,
          where: conflicts.map((c) => `${c.meal} ${c.time} (${DAY_LABEL[c.day]}) · Opción ${c.option + 1} «${c.title}»: ${c.food} — ${c.allergens.map((a) => ALLERGEN_INFO[a].short).join(', ')}`),
        }
      : { id: 'allergens', label: 'Alergias e intolerancias', status: 'ok', detail: 'Ninguna opción lleva un alérgeno declarado del alumno.' },
  );

  // 2 · La cena cierra el día (21:00-22:30, nada después).
  const dinnerIssues: string[] = [];
  for (const d of days) {
    const ms = dayMeals(plan, d);
    const last = ms[ms.length - 1];
    const dinner = [...ms].reverse().find((m) => m.role === 'dinner');
    if (dinner && last !== dinner) dinnerIssues.push(`Día de ${DAY_LABEL[d]}: «${last.name}» ${last.time} va después de la cena`);
    if (dinner && (timeToMinutes(dinner.time) < 20 * 60 || timeToMinutes(dinner.time) > 22 * 60 + 30)) dinnerIssues.push(`Día de ${DAY_LABEL[d]}: cena a las ${dinner.time}`);
    if (!dinner) dinnerIssues.push(`Día de ${DAY_LABEL[d]}: no hay cena`);
  }
  out.push({ id: 'dinner', label: 'La cena cierra el día', status: dinnerIssues.length ? 'warn' : 'ok', detail: dinnerIssues.length ? 'Tocá «Ajustar horarios al entreno» en Comidas.' : 'Cena entre 21:00 y 22:30, sin comidas después.', where: dinnerIssues });

  // 3 · Horarios: 1 h 30 entre tomas y nada durante el entreno.
  const timeIssues: string[] = [];
  for (const d of days) {
    const ms = dayMeals(plan, d);
    ms.forEach((m, i) => {
      const x = timeToMinutes(m.time);
      if (i && x - timeToMinutes(ms[i - 1].time) < 75) timeIssues.push(`Día de ${DAY_LABEL[d]}: ${ms[i - 1].name} ${ms[i - 1].time} y ${m.name} ${m.time} muy pegadas`);
      if (d === 'on' && x > tr.start - 30 && x < tr.end + 15) timeIssues.push(`Día de entreno: ${m.name} ${m.time} cae durante el entreno`);
    });
  }
  out.push({ id: 'times', label: 'Horarios cómodos', status: timeIssues.length ? 'warn' : 'ok', detail: timeIssues.length ? `${timeIssues.length} horario${timeIssues.length > 1 ? 's' : ''} para revisar.` : 'Al menos 1 h 30 entre tomas y nada durante el entreno.', where: timeIssues });

  // 4 · Calorías del día contra la meta.
  const kc = days.map((d) => {
    const got = dayTotals(plan.meals, d).kcal;
    const goal = d === 'on' ? t.kcalOn : t.kcalOff;
    return { d, dev: got / (goal || 1) - 1, got, goal };
  });
  const kWorst = Math.max(0, ...kc.map((k) => Math.abs(k.dev)));
  out.push({
    id: 'kcal',
    label: 'Calorías del día',
    status: kWorst <= 0.05 ? 'ok' : kWorst <= 0.1 ? 'warn' : 'bad',
    detail: kc.map((k) => `${DAY_LABEL[k.d]} ${Math.round(k.got)} / ${Math.round(k.goal)} kcal (${pct(k.dev)})`).join(' · '),
  });

  // 5 · Proteína del día contra la meta.
  const pc = days.map((d) => {
    const got = dayTotals(plan.meals, d).p;
    const goal = d === 'on' ? t.gramsOn.p : t.gramsOff.p;
    return { d, dev: got / (goal || 1) - 1, gkg: got / plan.profile.weightKg };
  });
  const pWorst = Math.max(0, ...pc.map((p) => Math.abs(p.dev)));
  out.push({
    id: 'protein',
    label: 'Proteína en rango',
    status: pWorst <= 0.1 ? 'ok' : pWorst <= 0.25 ? 'warn' : 'bad',
    detail: pc.map((p) => `${DAY_LABEL[p.d]} ${p.gkg.toFixed(1)} g/kg (${pct(p.dev)})`).join(' · '),
  });

  // 6 · Energía disponible (salud hormonal).
  const ea = Math.min(t.eaOn, t.eaOff);
  out.push({ id: 'ea', label: 'Energía disponible', status: ea >= 30 ? 'ok' : 'bad', detail: `${t.eaOn.toFixed(0)} / ${t.eaOff.toFixed(0)} kcal por kg de masa magra (entreno / descanso)${ea < 30 ? ': por debajo de 30, riesgo para la salud hormonal' : ''}.` });

  // 7 · Opciones por comida.
  const kcalOf = (m: Meal) => {
    const x = mealTotals(m);
    return x.p * 4 + x.c * 4 + x.f * 9;
  };
  const main = plan.meals.filter((m) => kcalOf(m) >= 80);
  const few = main.filter((m) => 1 + (m.alts?.length ?? 0) < 3);
  out.push({
    id: 'options',
    label: 'Opciones por comida',
    status: few.length ? 'warn' : 'ok',
    detail: few.length ? `${few.length} comida${few.length > 1 ? 's' : ''} con menos de 3 opciones (Completar 5 opciones en Comidas).` : 'Todas las comidas tienen al menos 3 opciones equivalentes.',
    where: few.map((m) => `${m.name} ${m.time} (${DAY_LABEL[m.day]}): ${1 + (m.alts?.length ?? 0)} opción(es)`),
  });

  // 8 · Porciones dentro de los topes por toma y volumen cómodo.
  const caps: string[] = [];
  const opts = (m: Meal) => [{ title: m.title ?? m.name, items: m.items }, ...(m.alts ?? [])];
  for (const m of plan.meals)
    opts(m).forEach((o, k) => {
      for (const it of o.items) {
        const cap = portionCap(it.foodId, { sex, role: m.role }).max;
        if (it.foodId && it.grams > cap) caps.push(`${m.name} · Opción ${k + 1}: ${it.food} ${Math.round(it.grams)} g (tope ${cap} g)`);
      }
      const vol = solidGrams(o.items);
      const vcap = mealVolumeCap(sex, m.role);
      if (vol > vcap * 1.1) caps.push(`${m.name} · Opción ${k + 1}: ${Math.round(vol)} g de comida (cómodo hasta ${vcap} g)`);
    });
  out.push({ id: 'caps', label: 'Porciones reales', status: caps.length ? 'warn' : 'ok', detail: caps.length ? `${caps.length} porción(es) por encima del tope por toma.` : 'Ningún ingrediente supera su tope por toma ni el volumen cómodo.', where: caps });

  // 9 · Proteína para el músculo en las comidas principales.
  const mps = plan.meals.filter(isMpsMeal);
  const low = mps.filter((m) => mealTotals(m).leucine < LEUCINE_THRESHOLD);
  out.push({ id: 'leucine', label: 'Proteína por comida principal', status: low.length ? 'warn' : 'ok', detail: low.length ? `${low.length} comida(s) principal(es) corta(s) de proteína.` : 'Desayuno, almuerzo y cena llegan al umbral de leucina.', where: low.map((m) => `${m.name} ${m.time}`) });

  return out;
}

export const publishBlocked = (plan: AthletePlan) => allergenConflicts(plan).length > 0;
