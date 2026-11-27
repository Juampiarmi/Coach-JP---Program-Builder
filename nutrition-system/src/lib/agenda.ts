import type { MealRole } from './types';

/**
 * AGENDA ARGENTINA DEL DÍA (única para todo el sistema: banco de planes, botón «Ajustar horarios al entreno»,
 * planes de la IA y anamnesis):
 *   Desayuno · Colación de media mañana · Almuerzo · Merienda (pre-entreno) · Cena.
 * Reglas: la cena cierra siempre el día (21:00, o 45 min después de entrenar si termina tarde, tope 22:30);
 * nunca hay una comida después de la cena («antes de dormir»); ninguna toma cae durante el entreno y entre dos
 * tomas hay al menos 1 h 30. A la mañana el desayuno pasa a después de entrenar; a la tarde-noche la merienda
 * se refuerza como merienda pre-entreno.
 */

/** Franja de entreno (minutos desde las 00:00). */
export interface Training {
  start: number;
  end: number;
}
export const DEFAULT_TRAINING: Training = { start: 18 * 60, end: 19 * 60 };

export function trainingOf(p: { trainingTime?: string; sessionMinutes?: number }): Training {
  const [h, m] = (p.trainingTime || '18:00').split(':').map(Number);
  const start = (h || 0) * 60 + (m || 0);
  return { start, end: start + Math.min(300, Math.max(30, Number(p.sessionMinutes) || 60)) };
}

/** Desayuno / almuerzo / cena fijados por el coach (minutos). */
export type MainTimes = Partial<Record<'breakfast' | 'lunch' | 'dinner', number>>;

/** Horarios fijados en la anamnesis ("HH:MM") → minutos, sólo si el coach los fijó a mano. */
export function fixedFromAnamnesis(an?: { mealTimesAuto?: boolean; mealTimes?: Partial<Record<string, string>> }): MainTimes {
  const fixed: MainTimes = {};
  if (!an || an.mealTimesAuto !== false) return fixed;
  (['breakfast', 'lunch', 'dinner'] as const).forEach((k) => {
    const m = /^(\d{2}):(\d{2})$/.exec(an.mealTimes?.[k] ?? '');
    if (m) fixed[k] = +m[1] * 60 + +m[2];
  });
  return fixed;
}

export const hhmm = (min: number) => {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
export const r15 = (x: number) => Math.round(x / 15) * 15;
const toMin = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? '');
  if (!m) return 12 * 60;
  const x = (+m[1] % 24) * 60 + +m[2];
  return x < 4 * 60 ? x + 1440 : x;
};

/** Separación mínima entre dos tomas (min). */
export const GAP = 90;

/** Entreno al mediodía (empieza entre 11:30 y 14:00): el día queda en 5 tomas limpias. */
export const isMidday = (tr: Training) => tr.start >= 11 * 60 + 30 && tr.start <= 14 * 60;

export interface Anchors {
  B: number;
  L: number;
  D: number;
  bName: string;
  lName: string;
}

/** Desayuno, almuerzo y cena del día según el entreno (o los horarios que fijó el coach). */
export function mainAnchors(on: boolean, tr: Training = DEFAULT_TRAINING, fixed: MainTimes = {}): Anchors {
  let B = fixed.breakfast ?? 7 * 60 + 30;
  let bName = 'Desayuno';
  if (on && fixed.breakfast === undefined) {
    if (tr.start < 8 * 60 + 30) {
      B = r15(tr.end + 30);
      bName = 'Desayuno (después de entrenar)';
    } else if (tr.start - GAP < B) B = Math.max(6 * 60, tr.start - GAP);
  }
  let L = fixed.lunch ?? 13 * 60;
  let lName = 'Almuerzo';
  if (on && fixed.lunch === undefined && L > tr.start - GAP && L < tr.end + 15) {
    if (tr.start - GAP >= 12 * 60) L = tr.start - GAP;
    else {
      L = r15(tr.end + 30);
      lName = 'Almuerzo (después de entrenar)';
    }
  }
  let D = fixed.dinner ?? 21 * 60;
  if (on && fixed.dinner === undefined && tr.end + 60 > D) D = Math.min(22 * 60 + 30, r15(tr.end + 45));
  return { B, L, D, bName, lName };
}

export type SnackKind = 'mid' | 'merienda' | 'pre' | 'post';

/** Horarios candidatos de cada colación, en orden de preferencia, y el tramo del día donde puede ir. */
export function snackTries(kind: SnackKind, a: Anchors, tr: Training): { times: number[]; lo: number; hi: number } {
  switch (kind) {
    case 'mid':
      return { times: [10 * 60 + 30, 11 * 60, 10 * 60, 11 * 60 + 30, 9 * 60 + 30, r15(tr.end + 30)], lo: a.B, hi: a.L };
    case 'merienda':
      return { times: [17 * 60, 17 * 60 + 30, 16 * 60 + 30, 16 * 60, 15 * 60 + 45, 18 * 60, 18 * 60 + 30, r15(tr.end + 30)], lo: a.L, hi: a.D };
    case 'pre':
      return { times: [tr.start - 45, tr.start - 60, tr.start - 75], lo: 0, hi: tr.start };
    case 'post':
      return { times: [r15(tr.end + 20), r15(tr.end + 30), r15(tr.end + 45), r15(tr.end + 60)], lo: tr.end, hi: a.D };
  }
}

/** ¿Entra una toma a esa hora? No durante el entreno, no después de la cena, a 1 h 30 de las demás. */
export function fits(t: number, taken: number[], a: Anchors, tr: Training, on: boolean, gap = GAP) {
  const busy = on && t > tr.start - 30 && t < tr.end + 15;
  return t >= 6 * 60 && t <= a.D - gap && !busy && taken.every((x) => Math.abs(x - t) >= gap);
}

/** Comidas que nombran una toma nocturna («antes de dormir», «pre-cama»): se mudan y se renombran. */
const NIGHT = /dormir|acostar|pre[- ]?cama|noche/i;

/**
 * Reacomoda los horarios de las comidas de UN día con la agenda argentina. Desayuno, almuerzo y cena van a sus
 * anclas; el pre y el post entreno alrededor de la sesión; cada colación al tramo más cercano a su horario original
 * (media mañana o merienda). Nada queda después de la cena: una colación nocturna pasa a la tarde o a media mañana.
 * Si una toma no entra con 1 h 30 de separación, se ubica donde más aire quede (sin pisar el entreno ni la cena).
 */
export function arrangeDay<T extends { time: string; role: MealRole; name: string }>(meals: T[], on: boolean, tr: Training = DEFAULT_TRAINING, fixed: MainTimes = {}): T[] {
  const a = mainAnchors(on, tr, fixed);
  const out = meals.map((m) => ({ ...m })).sort((x, y) => toMin(x.time) - toMin(y.time));
  const done = new Set<T>();
  const taken: number[] = [];
  const set = (m: T, t: number) => {
    m.time = hhmm(t);
    taken.push(t);
    done.add(m);
  };
  const first = (role: MealRole) => out.find((m) => m.role === role && !done.has(m));
  const last = (role: MealRole) => [...out].reverse().find((m) => m.role === role && !done.has(m));
  const b = first('breakfast');
  if (b) set(b, a.B);
  const l = first('lunch');
  if (l) set(l, a.L);
  const d = last('dinner');
  if (d) set(d, a.D);
  else taken.push(a.D); // sin cena cargada, igual nada va después de las 21:00
  const rest = out.filter((m) => !done.has(m));
  for (const m of rest) {
    const t0 = toMin(m.time);
    const night = NIGHT.test(m.name) || t0 >= a.D;
    const pref: SnackKind[] =
      on && m.role === 'peri' ? ['pre', 'post', 'merienda', 'mid'] : on && m.role === 'post' ? ['post', 'merienda', 'mid'] : !night && t0 < a.L ? ['mid', 'merienda'] : ['merienda', 'mid'];
    let t: number | undefined;
    for (const k of pref) {
      if (!on && (k === 'pre' || k === 'post')) continue;
      const tr0 = snackTries(k, a, tr);
      t = tr0.times.find((x) => x > tr0.lo && x < tr0.hi && fits(x, taken, a, tr, on));
      if (t !== undefined) break;
    }
    if (t === undefined) {
      // Sin lugar con 1 h 30: la hora (cada 15 min, antes de la cena y fuera del entreno) con más aire alrededor.
      let best = -1;
      for (let x = 6 * 60 + 30; x <= a.D - 45; x += 15) {
        if (on && x > tr.start - 30 && x < tr.end + 15) continue;
        const air = Math.min(...taken.map((y) => Math.abs(y - x)));
        if (air > best) {
          best = air;
          t = x;
        }
      }
    }
    const at = t ?? a.D - 120;
    if (night) m.name = at < a.L ? 'Colación de media mañana' : 'Colación de tarde';
    set(m, at);
  }
  return out.sort((x, y) => toMin(x.time) - toMin(y.time));
}
