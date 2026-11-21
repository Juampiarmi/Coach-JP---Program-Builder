// Prueba de «copiar el plan de otro alumno» y de las plantillas propias (planAdapt.ts): el plan de un hombre de
// 82 kg se adapta a una mujer de 55 kg y a un hombre de 100 kg. Cada ingrediente queda dentro de su tope por toma
// para el sexo de destino, la cena sigue cerrando el día y las calorías quedan cerca de la meta del nuevo alumno.
// Uso: npm run test:unit
import { computeTelemetry, dayTotals } from './bioenergetics';
import { adaptPlan, sourceOf, templateFromPlan } from './planAdapt';
import { portionCap } from './portionCaps';
import { seedPlan } from './seed';
import { timeToMinutes } from './schedule';
import type { AthletePlan } from './types';

const fails: string[] = [];
const src = seedPlan(); // demo: hombre, 82 kg
const tpl = templateFromPlan(src, 'Demo');
const targets: [string, AthletePlan][] = [
  ['mujer 55 kg', { ...seedPlan(), id: 'f55', profile: { ...seedPlan().profile, name: 'Ana', sex: 'F', weightKg: 55, heightCm: 162, age: 28, bodyFatPct: 24 } }],
  ['hombre 100 kg', { ...seedPlan(), id: 'm100', profile: { ...seedPlan().profile, name: 'Leo', weightKg: 100, heightCm: 186 } }],
];
for (const [tag, target] of targets) {
  for (const [via, out] of [
    ['copia', adaptPlan(target, sourceOf(src))],
    ['plantilla', adaptPlan(target, tpl)],
  ] as const) {
    const t = computeTelemetry(out);
    for (const day of ['on', 'off'] as const) {
      const got = dayTotals(out.meals, day);
      const goal = day === 'on' ? t.kcalOn : t.kcalOff;
      if (Math.abs(got.kcal / goal - 1) > 0.1) fails.push(`${tag} (${via}) · ${day}: ${Math.round(got.kcal)} kcal vs meta ${Math.round(goal)}`);
      const ms = out.meals.filter((m) => m.day === day || m.day === 'both').sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      const lastMain = ms.filter((m) => m.role === 'dinner').pop();
      if (lastMain && ms[ms.length - 1] !== lastMain) fails.push(`${tag} (${via}) · ${day}: la cena no cierra el día`);
    }
    for (const m of out.meals)
      for (const o of [{ items: m.items }, ...(m.alts ?? [])])
        for (const it of o.items) {
          const cap = portionCap(it.foodId, { sex: out.profile.sex, role: m.role }).max;
          if (it.grams > cap) fails.push(`${tag} (${via}) · ${m.name}: ${it.food} ${it.grams} g supera el tope de ${cap} g`);
        }
    if (out.profile.name !== target.profile.name || out.id !== target.id) fails.push(`${tag} (${via}): se pisó la identidad del alumno`);
  }
}
if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log('✓ Copiar plan / plantillas: el plan de 82 kg se adapta a 55 kg (mujer) y 100 kg (hombre) dentro de los topes y cerca de sus calorías');
