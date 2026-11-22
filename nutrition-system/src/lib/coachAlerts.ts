/**
 * Panel del coach: métricas de las últimas semanas y alertas automáticas por atleta.
 * Módulo puro (sin React ni red): recibe los registros que bajan de la nube y devuelve números y alertas
 * en lenguaje humano. Probado en coachAlerts.test.ts.
 */

export type Goal = 'cut' | 'recomp' | 'maintain' | 'bulk' | null;
export type AlertLevel = 'red' | 'orange' | 'yellow' | 'info';

export interface LogRow {
  day: string; // YYYY-MM-DD (fecha local del atleta)
  mode: 'on' | 'off';
  meals_done: number;
  meals_total: number;
  missed: string[];
  kcal: number;
  kcal_target: number;
  p: number;
  p_target: number;
  water_ml: number;
  water_target_ml: number | null;
  social: Record<string, unknown>;
  adherent: boolean;
  updated_at: string;
}
export interface WeightRow {
  day: string;
  kg: number;
}
/** Check-in semanal del atleta (week = lunes). */
export interface CheckinRow {
  week: string;
  energy: number;
  hunger: number;
  heavy: boolean;
  note: string;
  kg: number | null;
  photo?: string | null;
}
export interface AthleteInput {
  id: string;
  name: string;
  goal: Goal;
  trainingWeekdays: number[];
  createdAt: string;
  published: { version: number; at: string; hash: string } | null;
  draft: { hash: string; at: string } | null;
  logs: LogRow[];
  weights: WeightRow[];
  /** Check-ins semanales (undefined = la nube todavía no los trae: no se evalúan). */
  checkins?: CheckinRow[];
}
export interface Alert {
  key: string;
  level: AlertLevel;
  title: string;
  detail: string;
}
export interface AthleteStats {
  lastLogDay: string | null;
  lastActivityAt: string | null;
  daysSinceLog: number | null;
  daysLogged7: number;
  adherentDays7: number;
  meals7: { done: number; planned: number };
  kcalPct: { on: number | null; off: number | null };
  proteinPct: number | null;
  waterPct: number | null;
  social7: number;
  streak: number;
  weight: { last: number | null; lastDay: string | null; d7: number | null; d28: number | null };
  /** % de kcal de cada uno de los últimos 14 días (null = sin registro), del más viejo al de hoy. */
  spark14: (number | null)[];
  pendingPublish: boolean;
  /** Avance del día en curso (null = todavía no registró nada hoy). */
  today: { done: number; total: number } | null;
}

const LEVEL_RANK: Record<AlertLevel, number> = { red: 3, orange: 2, yellow: 1, info: 0 };

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 864e5);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Salidas sociales del día (las "comidas libres" de la heladera no cuentan: son reemplazos del plan). */
export function socialCount(social: Record<string, unknown> | null | undefined) {
  return Object.values(social ?? {}).filter((v) => !(v && typeof v === 'object' && 'items' in (v as object))).length;
}

/** Peso de referencia más cercano a `back` días antes del último registro. */
function weightDelta(ws: WeightRow[], back: number) {
  if (ws.length < 2) return null;
  const last = ws[ws.length - 1];
  const target = addDays(last.day, -back);
  let ref: WeightRow | null = null;
  for (const w of ws) if (w.day <= addDays(target, 3) && w !== last) ref = w;
  if (!ref) return null;
  if (diffDays(last.day, ref.day) < back * 0.5) return null;
  return r1(last.kg - ref.kg);
}

export function computeStats(a: AthleteInput, today: string): AthleteStats {
  const logs = [...a.logs].sort((x, y) => x.day.localeCompare(y.day));
  const byDay = Object.fromEntries(logs.map((l) => [l.day, l]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, -7 + i)); // los 7 días cerrados (sin hoy)
  const wlogs = week.map((d) => byDay[d]).filter(Boolean) as LogRow[];
  const totals = logs.map((l) => l.meals_total).filter((n) => n > 0).sort((x, y) => x - y);
  const perDay = totals.length ? totals[Math.floor(totals.length / 2)] : 0;
  const ws = [...a.weights].sort((x, y) => x.day.localeCompare(y.day));
  const last = logs.filter((l) => l.meals_done > 0 || l.water_ml > 0 || socialCount(l.social) > 0).pop() ?? null;

  let streak = 0;
  for (let d = byDay[today]?.adherent ? today : addDays(today, -1); byDay[d]?.adherent; d = addDays(d, -1)) streak++;

  const pct = (mode: 'on' | 'off') => {
    const xs = wlogs.filter((l) => l.mode === mode && l.kcal_target > 0).map((l) => l.kcal / l.kcal_target);
    const v = avg(xs);
    return v === null ? null : Math.round(v * 100);
  };
  const prot = avg(wlogs.filter((l) => l.p_target > 0).map((l) => l.p / l.p_target));
  const water = avg(wlogs.filter((l) => (l.water_target_ml ?? 0) > 0).map((l) => l.water_ml / (l.water_target_ml as number)));
  const lastW = ws[ws.length - 1] ?? null;
  return {
    lastLogDay: last?.day ?? null,
    lastActivityAt: logs.length ? logs.map((l) => l.updated_at).sort().pop()! : null,
    daysSinceLog: last ? diffDays(today, last.day) : null,
    daysLogged7: wlogs.filter((l) => l.meals_done > 0).length,
    adherentDays7: wlogs.filter((l) => l.adherent).length,
    meals7: { done: wlogs.reduce((s, l) => s + l.meals_done, 0), planned: wlogs.reduce((s, l) => s + l.meals_total, 0) + perDay * (7 - wlogs.length) },
    kcalPct: { on: pct('on'), off: pct('off') },
    proteinPct: prot === null ? null : Math.round(prot * 100),
    waterPct: water === null ? null : Math.round(water * 100),
    social7: wlogs.reduce((s, l) => s + (socialCount(l.social) > 0 ? 1 : 0), 0),
    streak,
    weight: { last: lastW?.kg ?? null, lastDay: lastW?.day ?? null, d7: weightDelta(ws, 7), d28: weightDelta(ws, 28) },
    spark14: Array.from({ length: 14 }, (_, i) => {
      const l = byDay[addDays(today, -13 + i)];
      return l && l.kcal_target > 0 ? Math.round((l.kcal / l.kcal_target) * 100) : null;
    }),
    pendingPublish: !!a.draft && (!a.published || a.published.hash !== a.draft.hash),
    today: byDay[today] ? { done: byDay[today].meals_done, total: byDay[today].meals_total } : null,
  };
}

const GOAL_DOWN: Goal[] = ['cut', 'recomp'];

export function computeAlerts(a: AthleteInput, s: AthleteStats, today: string, nowMs = Date.now()): Alert[] {
  const out: Alert[] = [];
  const logs = a.logs;
  const week = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -7 + i)));
  const wlogs = logs.filter((l) => week.has(l.day) && l.meals_total > 0);

  // 1 · Sin registros
  if (s.daysSinceLog === null) {
    if (a.published && nowMs - Date.parse(a.published.at) > 2 * 864e5)
      out.push({ key: 'no_logs', level: 'yellow', title: 'Todavía no registró nada', detail: 'Tiene el plan publicado hace más de 2 días y no tildó ninguna comida. ¿Le llegó el link?' });
  } else if (s.daysSinceLog >= 3) {
    out.push({ key: 'no_logs', level: s.daysSinceLog >= 5 ? 'red' : 'yellow', title: `Sin registros hace ${s.daysSinceLog} días`, detail: `Último registro: ${s.lastLogDay}. Un mensaje corto suele alcanzar para retomar.` });
  }

  // 2 · Adherencia baja
  const low = wlogs.filter((l) => (l.kcal_target > 0 && l.kcal / l.kcal_target < 0.8) || l.meals_done / l.meals_total < 0.7).length;
  if (low >= 3) out.push({ key: 'low_adherence', level: 'red', title: `Adherencia baja: ${low} de 7 días`, detail: 'Comió menos del 80 % de las kcal o tildó menos del 70 % de las comidas. Revisá si el plan le resulta práctico.' });

  // 3 · Comida que se saltea
  const missCount: Record<string, number> = {};
  for (const l of wlogs) for (const m of new Set(l.missed ?? [])) missCount[m] = (missCount[m] ?? 0) + 1;
  const [topMiss, topN] = Object.entries(missCount).sort((x, y) => y[1] - x[1])[0] ?? ['', 0];
  if (topN >= 4) out.push({ key: `skip:${topMiss}`, level: 'yellow', title: `Se saltea: ${topMiss} (${topN} de 7 días)`, detail: 'Probá cambiar el horario, simplificar esa comida o darle una opción más rápida.' });

  // 4 · Proteína baja recurrente
  const lowP = wlogs.filter((l) => l.p_target > 0 && l.p < l.p_target * 0.8).length;
  if (lowP >= 3) out.push({ key: 'low_protein', level: 'yellow', title: `Proteína baja: ${lowP} de 7 días`, detail: topN >= 2 ? `Se le cae sobre todo en: ${topMiss}.` : 'Quedó por debajo del 80 % de su meta de proteína.' });

  // 5 · Exceso calórico
  const over = wlogs.filter((l) => l.kcal_target > 0 && l.kcal > l.kcal_target * 1.1).length;
  if (over >= 3) out.push({ key: 'kcal_over', level: 'yellow', title: `Exceso calórico: ${over} de 7 días`, detail: 'Superó en más de 10 % las kcal del día.' });

  // 6 · Salidas frecuentes
  if (s.social7 >= 3) out.push({ key: 'social', level: 'yellow', title: `${s.social7} salidas sociales en la semana`, detail: 'Puede convenir planificarlas (comida previa, elección del plato) en vez de improvisar.' });

  // 7 · Hidratación baja
  const dry = logs.filter((l) => week.has(l.day) && (l.water_target_ml ?? 0) > 0 && l.water_ml < (l.water_target_ml as number) * 0.6).length;
  if (dry >= 4) out.push({ key: 'hydration', level: 'yellow', title: `Hidratación baja: ${dry} de 7 días`, detail: 'Tomó menos del 60 % de su meta de agua.' });

  // 8 · Peso estancado con buena adherencia
  const ws = [...a.weights].sort((x, y) => x.day.localeCompare(y.day));
  const span = ws.length >= 2 ? diffDays(ws[ws.length - 1].day, ws[0].day) : 0;
  if (GOAL_DOWN.includes(a.goal) && s.adherentDays7 >= 6 && s.weight.d28 !== null && s.weight.d28 > -0.25 && span >= 21)
    out.push({ key: 'weight_stall', level: 'orange', title: 'Peso estancado con buena adherencia', detail: `Cumple el plan (${s.adherentDays7}/7 días) pero en 4 semanas cambió ${s.weight.d28 > 0 ? '+' : ''}${String(s.weight.d28).replace('.', ',')} kg. Puede ser momento de ajustar kcal.` });

  // 9 · Cambio de peso muy rápido (> 1 % del peso por semana)
  const d14 = weightDelta(ws, 14);
  if (d14 !== null && s.weight.last) {
    const rate = Math.abs(d14) / 2 / s.weight.last;
    if (rate > 0.01)
      out.push({ key: 'weight_fast', level: 'red', title: d14 < 0 ? 'Baja de peso muy rápida' : 'Suba de peso muy rápida', detail: `${d14 > 0 ? '+' : ''}${String(d14).replace('.', ',')} kg en 2 semanas (más del 1 % del peso por semana).` });
  }

  // 10 · Días ON / OFF distintos del cronograma
  if (a.trainingWeekdays.length) {
    const mism = logs.filter((l) => week.has(l.day) && (a.trainingWeekdays.includes(new Date(`${l.day}T12:00:00Z`).getUTCDay()) ? 'on' : 'off') !== l.mode).length;
    if (mism >= 2) out.push({ key: 'mode_mismatch', level: 'info', title: `Entrena otros días (${mism} cambios en la semana)`, detail: 'Cambió el modo ON / OFF a mano. Conviene actualizar sus días de entreno en el perfil.' });
  }

  // 11 · Cambios sin publicar hace más de 24 h
  if (s.pendingPublish && a.draft && nowMs - Date.parse(a.draft.at) > 864e5)
    out.push({ key: 'unpublished', level: 'info', title: 'Tenés cambios sin publicar', detail: 'Editaste su plan hace más de un día y todavía no lo publicaste.' });

  // 12 · Dejó de pesarse
  const before = ws.filter((w) => diffDays(today, w.day) > 10 && diffDays(today, w.day) <= 40).length;
  const recent = ws.filter((w) => diffDays(today, w.day) <= 10).length;
  if (before >= 3 && recent === 0) out.push({ key: 'stopped_weighing', level: 'info', title: 'Dejó de pesarse', detail: 'Venía registrando su peso y lleva más de 10 días sin hacerlo.' });

  // 13-15 · Check-in semanal (energía, hambre, digestión).
  if (a.checkins) {
    const last = [...a.checkins].sort((x, y) => y.week.localeCompare(x.week))[0];
    const fresh = last && diffDays(today, last.week) <= 13;
    if (fresh && last.hunger >= 4 && last.energy <= 2)
      out.push({ key: `checkin_hungry:${last.week}`, level: 'orange', title: 'Hambre alta y poca energía', detail: `En su check-in marcó hambre ${last.hunger}/5 y energía ${last.energy}/5. Puede faltarle energía: conviene subir un poco las calorías.` });
    if (fresh && last.heavy)
      out.push({ key: `checkin_heavy:${last.week}`, level: 'yellow', title: 'Algo le cayó pesado', detail: last.note ? `«${last.note}». Revisá esa comida (volumen, grasa o fibra antes de entrenar).` : 'Marcó que alguna comida le cayó pesada en la semana. Preguntale cuál.' });
    if (!fresh && a.published && nowMs - Date.parse(a.published.at) > 7 * 864e5)
      out.push({ key: 'no_checkin', level: 'info', title: last ? `Sin check-in hace ${diffDays(today, last.week)} días` : 'Todavía no hizo su check-in', detail: 'El check-in semanal (30 segundos) te dice cómo viene de energía, hambre y digestión.' });
  }

  return out.sort((x, y) => LEVEL_RANK[y.level] - LEVEL_RANK[x.level]);
}

/** Orden de la tabla: primero quien más atención necesita. */
export function riskScore(alerts: Alert[]) {
  return alerts.reduce((s, a) => s + [1, 10, 100, 1000][LEVEL_RANK[a.level]], 0);
}
