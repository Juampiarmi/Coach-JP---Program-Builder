import { arrangeDay, fixedFromAnamnesis, mainAnchors, trainingOf } from './agenda';
import { macrosFor, round1, round2 } from './foods';
import type { Anamnesis, FoodItem, Meal, MealSlot, Profile } from './types';

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

/**
 * Anclas del día de entreno (agenda argentina, ver agenda.ts): desayuno, almuerzo y cena según la franja de entreno,
 * pre (inicio − 45') y post (fin + 15'). La cena cierra el día: 21:00 o 45' después de entrenar (tope 22:30).
 */
export function dayAnchors(pr: Pick<Profile, 'trainingTime' | 'sessionMinutes'>) {
  const tr = trainingOf(pr);
  const a = mainAnchors(true, tr);
  return { start: tr.start, end: tr.end, breakfast: a.B, lunch: a.L, peri: tr.start - 45, post: tr.end + 15, dinner: a.D };
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Horarios efectivos de las 5 comidas: los de la anamnesis si el coach los fijó, o los derivados del entreno. */
export function mealSchedule(pr: Pick<Profile, 'trainingTime' | 'sessionMinutes'>, an?: Pick<Anamnesis, 'mealTimesAuto' | 'mealTimes'>) {
  const a = dayAnchors(pr);
  const auto: Record<MealSlot, number> = { breakfast: a.breakfast, lunch: a.lunch, peri: a.peri, post: a.post, dinner: a.dinner };
  if (!an || an.mealTimesAuto) return { ...a, slots: auto };
  const slots = { ...auto };
  (Object.keys(slots) as MealSlot[]).forEach((k) => {
    if (/^\d{2}:\d{2}$/.test(an.mealTimes?.[k] ?? '')) slots[k] = toMin(an.mealTimes[k]);
  });
  return { ...a, slots };
}

export const fmtHm = (min: number) => hm(min);


export function retimeMeals(meals: Meal[], pr: Pick<Profile, 'trainingTime' | 'sessionMinutes'>, an?: Pick<Anamnesis, 'mealTimesAuto' | 'mealTimes'>): Meal[] {
  // Agenda argentina única (la misma del banco de planes): cena al final, 1 h 30 entre tomas, nada durante el
  // entreno ni después de cenar. Las comidas de «ambos días» siguen la agenda del día de entreno.
  const tr = trainingOf(pr);
  const fixed = fixedFromAnamnesis(an);
  const on = arrangeDay(meals.filter((m) => m.day !== 'off'), true, tr, fixed);
  const off = arrangeDay(meals.filter((m) => m.day === 'off'), false, tr, fixed);
  return [...on, ...off].sort(byTime);
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
