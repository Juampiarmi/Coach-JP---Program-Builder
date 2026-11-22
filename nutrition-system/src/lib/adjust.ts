import type { Alert, AthleteStats, CheckinRow, Goal } from './coachAlerts';
import type { Macros } from './types';

/**
 * AJUSTE EN 1 CLIC: cada alerta accionable del panel (y el check-in semanal) se traduce en un cambio concreto de
 * macros por kilo, con su motivo en lenguaje humano. La proteína nunca se toca: se mueven carbohidratos.
 */
export interface Adjustment {
  key: string;
  /** Alerta que lo origina (para marcarla como vista al aplicar). */
  alertKey: string;
  title: string;
  why: string;
  /** Cambio en g/kg por día (sólo carbos / grasas). */
  delta: { on: Partial<Macros>; off: Partial<Macros> };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
/** g/kg de carbos que equivalen a `kcal` para un peso. */
const carbsFor = (kcal: number, kg: number) => r2(kcal / 4 / kg);
const kcalOf = (gkg: number, kg: number) => Math.round(gkg * kg * 4);

export function suggestAdjustments(a: { goal: Goal; weightKg: number; alerts: Alert[]; stats: AthleteStats; checkins?: CheckinRow[] }): Adjustment[] {
  const out: Adjustment[] = [];
  const kg = a.weightKg || a.stats.weight.last || 70;
  const has = (k: string) => a.alerts.find((x) => x.key === k || x.key.startsWith(`${k}:`));

  // Peso estancado en definición / recomposición con buena adherencia → menos carbos en descanso.
  const stall = has('weight_stall');
  if (stall) {
    const d = 0.3;
    out.push({
      key: 'stall_off_carbs',
      alertKey: stall.key,
      title: `Bajar ${String(d).replace('.', ',')} g/kg de carbos en días de descanso (~${kcalOf(d, kg)} kcal)`,
      why: `Peso estancado 3-4 semanas con adherencia ${a.stats.adherentDays7}/7: un déficit un poco mayor en descanso, sin tocar la proteína ni el día de entreno.`,
      delta: { on: {}, off: { c: -d } },
    });
  }

  // Hambre alta y poca energía (check-in) en déficit → más energía el día de entreno.
  const hungry = has('checkin_hungry');
  if (hungry) {
    const c = carbsFor(150, kg);
    out.push({
      key: 'hungry_on_kcal',
      alertKey: hungry.key,
      title: 'Subir 150 kcal en días de entreno',
      why: `En el check-in marcó mucha hambre y poca energía. +${String(r1(c * kg)).replace('.', ',')} g de carbos el día de entreno para rendir y recuperar mejor, proteína igual.`,
      delta: { on: { c }, off: {} },
    });
  }

  // Baja de peso demasiado rápida → frenar el déficit (protege masa magra y energía disponible).
  const fast = has('weight_fast');
  if (fast && (a.stats.weight.d7 ?? 0) <= 0 && a.goal !== 'bulk') {
    const d = 0.3;
    out.push({
      key: 'fast_loss_carbs',
      alertKey: fast.key,
      title: `Subir ${String(d).replace('.', ',')} g/kg de carbos todos los días (~${kcalOf(d, kg)} kcal)`,
      why: 'Baja más del 1 % de su peso por semana: conviene frenar un poco para cuidar el músculo y la energía disponible.',
      delta: { on: { c: d }, off: { c: d } },
    });
  }
  // Suba demasiado rápida en volumen → recortar el superávit en descanso.
  if (fast && (a.stats.weight.d7 ?? 0) > 0) {
    const d = 0.4;
    out.push({
      key: 'fast_gain_carbs',
      alertKey: fast.key,
      title: `Bajar ${String(d).replace('.', ',')} g/kg de carbos en días de descanso (~${kcalOf(d, kg)} kcal)`,
      why: 'Sube más del 1 % de su peso por semana: el superávit es más grande de lo necesario para ganar músculo con poca grasa.',
      delta: { on: {}, off: { c: -d } },
    });
  }

  // Volumen sin subir de peso con buena adherencia → más carbos el día de entreno.
  if (a.goal === 'bulk' && a.stats.adherentDays7 >= 5 && a.stats.weight.d28 !== null && a.stats.weight.d28 < 0.2) {
    const d = 0.5;
    out.push({
      key: 'bulk_stall_carbs',
      alertKey: 'bulk_stall',
      title: `Subir ${String(d).replace('.', ',')} g/kg de carbos en días de entreno (~${kcalOf(d, kg)} kcal)`,
      why: `En volumen y sin subir de peso en 4 semanas (${a.stats.weight.d28 > 0 ? '+' : ''}${String(a.stats.weight.d28).replace('.', ',')} kg) con buena adherencia.`,
      delta: { on: { c: d }, off: {} },
    });
  }
  return out;
}

/** Macros g/kg después de aplicar el ajuste (nunca por debajo de mínimos razonables). */
export function applyDelta(cur: { on: Macros; off: Macros }, adj: Adjustment): { on: Macros; off: Macros } {
  const step = (m: Macros, d: Partial<Macros>): Macros => ({
    p: m.p,
    c: Math.max(1, r2(m.c + (d.c ?? 0))),
    f: Math.max(0.5, r2(m.f + (d.f ?? 0))),
  });
  return { on: step(cur.on, adj.delta.on), off: step(cur.off, adj.delta.off) };
}
