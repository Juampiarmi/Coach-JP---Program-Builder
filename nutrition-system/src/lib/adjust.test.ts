// Prueba del ajuste en 1 clic (adjust.ts): cada alerta accionable propone un cambio concreto de macros por kilo,
// la proteína nunca se toca y el delta de calorías coincide con lo que dice el título. Uso: npm run test:unit
import { applyDelta, suggestAdjustments } from './adjust';
import type { Alert, AthleteStats } from './coachAlerts';

const fails: string[] = [];
const stats = (p: Partial<AthleteStats> = {}): AthleteStats => ({
  lastLogDay: null, lastActivityAt: null, daysSinceLog: 0, daysLogged7: 7, adherentDays7: 6, meals7: { done: 30, planned: 35 },
  kcalPct: { on: 100, off: 100 }, proteinPct: 100, waterPct: 100, social7: 0, streak: 6,
  weight: { last: 80, lastDay: null, d7: 0, d28: 0 }, spark14: [], pendingPublish: false, today: null, ...p,
});
const al = (key: string): Alert => ({ key, level: 'orange', title: key, detail: '' });
const cur = { on: { p: 2.2, c: 4, f: 0.9 }, off: { p: 2.2, c: 2.5, f: 1.1 } };

const stall = suggestAdjustments({ goal: 'cut', weightKg: 80, alerts: [al('weight_stall')], stats: stats() });
if (stall[0]?.key !== 'stall_off_carbs') fails.push('estancamiento: no sugiere bajar carbos en descanso');
const s1 = applyDelta(cur, stall[0]);
if (s1.off.c !== 2.2 || s1.on.c !== 4 || s1.off.p !== 2.2) fails.push(`estancamiento: macros ${JSON.stringify(s1)}`);
if (!/~96 kcal/.test(stall[0].title)) fails.push(`estancamiento: título ${stall[0].title}`);

const hungry = suggestAdjustments({ goal: 'cut', weightKg: 60, alerts: [al('checkin_hungry:2026-11-16')], stats: stats() });
const h1 = applyDelta(cur, hungry[0]);
if (Math.abs((h1.on.c - cur.on.c) * 60 * 4 - 150) > 3 || h1.on.p !== cur.on.p) fails.push(`hambre: +150 kcal en entreno (${JSON.stringify(h1.on)})`);

const fast = suggestAdjustments({ goal: 'cut', weightKg: 80, alerts: [al('weight_fast')], stats: stats({ weight: { last: 80, lastDay: null, d7: -1.2, d28: -3 } }) });
if (fast[0]?.key !== 'fast_loss_carbs') fails.push('baja rápida: no sugiere frenar');
const bulk = suggestAdjustments({ goal: 'bulk', weightKg: 80, alerts: [], stats: stats({ weight: { last: 80, lastDay: null, d7: 0, d28: 0.1 } }) });
if (bulk[0]?.key !== 'bulk_stall_carbs') fails.push('volumen estancado: no sugiere más carbos');
if (suggestAdjustments({ goal: 'recomp', weightKg: 80, alerts: [al('social')], stats: stats() }).length) fails.push('una alerta no accionable no debería sugerir ajuste');

if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log('✓ Ajuste en 1 clic: estancamiento, hambre alta, cambios de peso rápidos y volumen estancado (proteína intacta)');
