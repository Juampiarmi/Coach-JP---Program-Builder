// Pruebas del módulo de alertas del panel del coach. Uso: npm run test:unit
import assert from 'node:assert/strict';
import { addDays, computeAlerts, computeStats, riskScore, socialCount, type AthleteInput, type LogRow } from './coachAlerts';

const TODAY = '2026-11-15'; // domingo
const NOW = Date.parse(`${TODAY}T15:00:00Z`);
let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

function log(daysAgo: number, patch: Partial<LogRow> = {}): LogRow {
  const day = addDays(TODAY, -daysAgo);
  return { day, mode: 'on', meals_done: 5, meals_total: 5, missed: [], kcal: 2500, kcal_target: 2500, p: 180, p_target: 180, water_ml: 3000, water_target_ml: 3000, social: {}, adherent: true, updated_at: `${day}T21:00:00Z`, ...patch };
}
function athlete(patch: Partial<AthleteInput> = {}): AthleteInput {
  return { id: 'a1', name: 'Juan Pablo', goal: 'cut', trainingWeekdays: [], createdAt: '2026-10-01T00:00:00Z', published: { version: 3, at: '2026-11-01T00:00:00Z', hash: 'h' }, draft: { hash: 'h', at: '2026-11-01T00:00:00Z' }, logs: [], weights: [], ...patch };
}
const keys = (a: AthleteInput) => computeAlerts(a, computeStats(a, TODAY), TODAY, NOW).map((x) => x.key);

test('atleta al día: sin alertas, racha y adherencia completas', () => {
  const a = athlete({ logs: Array.from({ length: 10 }, (_, i) => log(i)) });
  const s = computeStats(a, TODAY);
  assert.equal(s.adherentDays7, 7);
  assert.equal(s.streak, 10);
  assert.deepEqual(s.meals7, { done: 35, planned: 35 });
  assert.equal(s.kcalPct.on, 100);
  assert.deepEqual(keys(a), []);
});

test('sin registros: amarilla a los 3 días, roja a los 5', () => {
  assert.equal(computeAlerts(athlete({ logs: [log(3)] }), computeStats(athlete({ logs: [log(3)] }), TODAY), TODAY, NOW)[0].level, 'yellow');
  const a = athlete({ logs: [log(6)] });
  const al = computeAlerts(a, computeStats(a, TODAY), TODAY, NOW).find((x) => x.key === 'no_logs')!;
  assert.equal(al.level, 'red');
  assert.match(al.title, /6 días/);
});

test('nunca registró con plan publicado hace más de 2 días', () => {
  assert.deepEqual(keys(athlete()), ['no_logs']);
  assert.deepEqual(keys(athlete({ published: { version: 1, at: `${TODAY}T10:00:00Z`, hash: 'h' } })), []);
});

test('adherencia baja: 3 días con pocas comidas o pocas kcal', () => {
  const a = athlete({ logs: [log(1, { meals_done: 2, kcal: 1200, adherent: false }), log(2, { kcal: 1800, adherent: false }), log(3, { meals_done: 3, adherent: false }), log(4), log(5), log(0)] });
  assert.ok(keys(a).includes('low_adherence'));
  assert.equal(computeAlerts(a, computeStats(a, TODAY), TODAY, NOW)[0].level, 'red');
});

test('comida salteada y proteína baja nombran la comida', () => {
  const miss = (d: number) => log(d, { meals_done: 4, missed: ['Cena'], p: 120, kcal: 2100, adherent: false });
  const a = athlete({ logs: [miss(1), miss(2), miss(3), miss(5), log(4), log(6), log(0)] });
  const al = computeAlerts(a, computeStats(a, TODAY), TODAY, NOW);
  assert.equal(al.find((x) => x.key.startsWith('skip:'))?.title, 'Se saltea: Cena (4 de 7 días)');
  assert.match(al.find((x) => x.key === 'low_protein')!.detail, /Cena/);
});

test('exceso calórico, salidas sociales e hidratación baja', () => {
  const a = athlete({
    logs: [1, 2, 3, 4].map((d) => log(d, { kcal: 2900, social: { cena: 'asado' }, water_ml: 1000, adherent: false })).concat([log(5), log(6), log(7), log(0)]),
  });
  const k = keys(a);
  assert.ok(k.includes('kcal_over') && k.includes('social') && k.includes('hydration'));
  assert.equal(computeStats(a, TODAY).social7, 4);
});

test('la comida libre de la heladera no cuenta como salida social', () => {
  assert.equal(socialCount({ almuerzo: { items: [] }, cena: 'pizzeria', merienda: { scene: 'cafe' } }), 2);
});

test('peso estancado en definición con buena adherencia (naranja)', () => {
  const weights = Array.from({ length: 6 }, (_, i) => ({ day: addDays(TODAY, -30 + i * 6), kg: 80 - (i % 2) * 0.1 }));
  const a = athlete({ logs: Array.from({ length: 8 }, (_, i) => log(i)), weights });
  const al = computeAlerts(a, computeStats(a, TODAY), TODAY, NOW);
  assert.equal(al.find((x) => x.key === 'weight_stall')?.level, 'orange');
  assert.ok(!keys(athlete({ goal: 'bulk', logs: a.logs, weights })).includes('weight_stall'), 'en volumen no aplica');
});

test('cambio de peso muy rápido (> 1 % por semana)', () => {
  const weights = [{ day: addDays(TODAY, -14), kg: 82 }, { day: addDays(TODAY, -7), kg: 80.5 }, { day: TODAY, kg: 79.6 }];
  const a = athlete({ logs: Array.from({ length: 8 }, (_, i) => log(i)), weights });
  const al = computeAlerts(a, computeStats(a, TODAY), TODAY, NOW).find((x) => x.key === 'weight_fast')!;
  assert.equal(al.level, 'red');
  assert.equal(al.title, 'Baja de peso muy rápida');
  assert.equal(computeStats(a, TODAY).weight.d7, -0.9);
});

test('días ON/OFF distintos del cronograma', () => {
  // Entrena lunes a viernes; marca ON el sábado y el domingo pasados.
  const sat = log(1, { mode: 'on' }), sun = log(7, { mode: 'on' });
  const a = athlete({ trainingWeekdays: [1, 2, 3, 4, 5], logs: [sat, sun, log(2, { mode: 'on' }), log(3, { mode: 'on' }), log(0, { mode: 'off' })] });
  assert.ok(keys(a).includes('mode_mismatch'));
});

test('cambios sin publicar hace más de 24 h y dejó de pesarse', () => {
  const a = athlete({
    draft: { hash: 'nuevo', at: addDays(TODAY, -2) + 'T10:00:00Z' },
    logs: Array.from({ length: 8 }, (_, i) => log(i)),
    weights: [20, 17, 14].map((d) => ({ day: addDays(TODAY, -d), kg: 80 })),
  });
  const k = keys(a);
  assert.ok(k.includes('unpublished') && k.includes('stopped_weighing'));
  assert.ok(computeStats(a, TODAY).pendingPublish);
});

test('orden por riesgo: rojas primero', () => {
  const quiet = athlete({ logs: Array.from({ length: 8 }, (_, i) => log(i)) });
  const risky = athlete({ logs: [log(6)] });
  const sq = computeStats(quiet, TODAY), sr = computeStats(risky, TODAY);
  assert.ok(riskScore(computeAlerts(risky, sr, TODAY, NOW)) > riskScore(computeAlerts(quiet, sq, TODAY, NOW)));
  assert.equal(sr.spark14.filter((x) => x !== null).length, 1);
});

console.log(`\n${passed} pruebas del panel del coach OK`);
