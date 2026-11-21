// Prueba del botón «Ajustar horarios al entreno» (retimeMeals → agenda.ts): un plan desordenado, con una toma
// «Antes de dormir» y colaciones pegadas, queda con la agenda argentina para entrenos de mañana, mediodía y noche.
// Uso: npm run test:unit
import { trainingOf } from './agenda';
import { retimeMeals, timeToMinutes } from './schedule';
import type { Meal, MealDay, MealRole } from './types';

const meal = (name: string, role: MealRole, time: string, day: MealDay): Meal => ({ id: `${name}-${day}`, name, role, time, day, items: [] });
const MESSY: Meal[] = (['on', 'off'] as const).flatMap((d) => [
  meal('Desayuno', 'breakfast', '06:30', d),
  meal('Colación', 'snack', '08:00', d),
  meal('Almuerzo', 'lunch', '12:30', d),
  meal('Pre-WOD', d === 'on' ? 'peri' : 'snack', '17:15', d),
  meal('Post-WOD', d === 'on' ? 'post' : 'snack', '19:30', d),
  meal('Cena', 'dinner', '22:15', d),
  meal('Antes de dormir', 'snack', '23:00', d),
]);

const fails: string[] = [];
let checks = 0;
for (const [trainingTime, sessionMinutes] of [['07:00', 60], ['12:00', 75], ['18:00', 60], ['20:00', 90]] as const) {
  const tr = trainingOf({ trainingTime, sessionMinutes });
  const out = retimeMeals(MESSY, { trainingTime, sessionMinutes });
  for (const day of ['on', 'off'] as const) {
    const ms = out.filter((m) => m.day === day);
    const ts = ms.map((m) => timeToMinutes(m.time));
    const tag = `entrena ${trainingTime} · ${day}: ${ms.map((m) => `${m.time} ${m.name}`).join(' · ')}`;
    checks++;
    if (ms.length !== 7) fails.push(`${tag} → se perdieron comidas`);
    if (ms[ms.length - 1].role !== 'dinner') fails.push(`${tag} → la cena no es la última`);
    const d = ts[ms.length - 1];
    if (d < 21 * 60 || d > 22 * 60 + 30) fails.push(`${tag} → cena fuera de 21:00-22:30`);
    if (ms.some((m) => /dormir/i.test(m.name))) fails.push(`${tag} → quedó «antes de dormir»`);
    ms.forEach((m, i) => {
      if (day === 'on' && ts[i] > tr.start - 30 && ts[i] < tr.end + 15) fails.push(`${tag} → ${m.name} cae durante el entreno`);
    });
    // Con 7 tomas en el día puede no haber 1 h 30 entre todas; con 5 sí.
    const five = retimeMeals(ms.filter((m) => !/Post|Colación$/.test(m.name)), { trainingTime, sessionMinutes });
    const t5 = five.map((m) => timeToMinutes(m.time));
    t5.forEach((t, i) => i && t - t5[i - 1] < 90 && fails.push(`entrena ${trainingTime} · ${day} (5 tomas): ${five[i - 1].time} ${five[i - 1].name} y ${five[i].time} ${five[i].name} a menos de 1 h 30`));
    if (trainingTime === '18:00' && day === 'on') console.log(`  ejemplo (18:00, día de entreno): ${ms.map((m) => `${m.time} ${m.name}`).join(' · ')}`);
  }
}
if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log(`✓ Ajustar horarios: ${checks} días reacomodados con la agenda argentina (cena al final, sin «antes de dormir», nada durante el entreno)`);
