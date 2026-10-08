import { macrosFor, round1, round2 } from './foods';
import type { FoodItem, Meal, Profile } from './types';

/**
 * Minutos desde las 00:00 para ORDENAR comidas. Lo que cae entre 00:00 y 03:59 se trata como el final del día
 * (madrugada = después de la cena), así una comida nocturna nunca aparece antes del desayuno.
 */
export function timeToMinutes(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return 12 * 60;
  const t = (+m[1] % 24) * 60 + +m[2];
  return t < 4 * 60 ? t + 1440 : t;
}

export const byTime = (a: { time: string }, b: { time: string }) => timeToMinutes(a.time) - timeToMinutes(b.time);

const hm = (min: number) => {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const valid = (t: string, from = 5 * 60, to = 23 * 60 + 30) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '');
  if (!m || +m[1] > 23 || +m[2] > 59) return false;
  const x = +m[1] * 60 + +m[2];
  return x >= from && x <= to;
};

/**
 * Agenda deportiva determinística a partir de la franja real de entreno (ej. CrossFit 16:00-18:00):
 *   Desayuno 06:30 · Almuerzo 12:30 · Pre-WOD 15:15 (inicio − 45') · Post-WOD 18:15 (fin + 15') · Cena 21:00 (fin + 3 h).
 * Las colaciones conservan la hora de la IA si es razonable. Día OFF: horas de la IA saneadas.
 */
export function dayAnchors(pr: Pick<Profile, 'trainingTime' | 'sessionMinutes'>) {
  const [h, m] = (pr.trainingTime || '18:00').split(':').map(Number);
  const start = (h || 0) * 60 + (m || 0);
  const end = start + Math.min(300, Math.max(15, Number(pr.sessionMinutes) || 60));
  const morning = start < 9 * 60;
  let lunch = 12 * 60 + 30;
  if (lunch > start - 60 && lunch < end + 15) lunch = end + 45;
  return {
    start,
    end,
    breakfast: morning ? end + 30 : 6 * 60 + 30,
    lunch,
    peri: start - 45,
    post: end + 15,
    dinner: Math.min(22 * 60 + 30, Math.max(20 * 60, end + 180)),
  };
}

const OFF_DEFAULT: Record<Meal['role'], number> = { breakfast: 7 * 60 + 30, lunch: 13 * 60, peri: 17 * 60, post: 17 * 60, snack: 17 * 60, dinner: 21 * 60 };

export function retimeMeals(meals: Meal[], pr: Pick<Profile, 'trainingTime' | 'sessionMinutes'>): Meal[] {
  const a = dayAnchors(pr);
  return meals
    .map((m) => {
      if (m.day === 'off') return { ...m, time: valid(m.time) ? m.time : hm(OFF_DEFAULT[m.role]) };
      const fixed: Partial<Record<Meal['role'], number>> = { breakfast: a.breakfast, lunch: a.lunch, peri: a.peri, post: a.post, dinner: a.dinner };
      const t = fixed[m.role];
      if (t !== undefined) return { ...m, time: hm(t) };
      // Colación: hora de la IA si es diurna y no cae dentro del entreno; si no, media mañana.
      const x = timeToMinutes(m.time);
      const ok = valid(m.time, 6 * 60, 23 * 60) && !(x > a.start - 30 && x < a.end + 10);
      return { ...m, time: ok ? m.time : '10:30' };
    })
    .sort(byTime);
}

/** Un alimento repetido en la misma comida (ej. palta 70 g + 45 g) se fusiona en un único ítem con los gramos sumados. */
export function consolidateItems(items: FoodItem[]): FoodItem[] {
  const out: FoodItem[] = [];
  const at = new Map<string, number>();
  for (const it of items) {
    const key = it.foodId ? `id:${it.foodId}` : `n:${it.food.trim().toLowerCase()}`;
    const k = at.get(key);
    if (k === undefined) {
      at.set(key, out.length);
      out.push({ ...it });
      continue;
    }
    const prev = out[k];
    const grams = prev.grams + it.grams;
    out[k] = it.foodId
      ? { ...prev, grams, ...macrosFor(it.foodId, grams)! }
      : { ...prev, grams, p: round1(prev.p + it.p), c: round1(prev.c + it.c), f: round1(prev.f + it.f), leucine: round2(prev.leucine + it.leucine) };
  }
  return out;
}

export const consolidateMeal = (m: Meal): Meal => ({ ...m, items: consolidateItems(m.items) });
