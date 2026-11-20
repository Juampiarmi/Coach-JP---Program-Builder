// Prueba automática del Banco de Planes Maestros: 24 planes (8 perfiles × 3 variantes) × 6 pesos de referencia
// × 4 horarios de entreno × día de entreno y de descanso. Falla si algún ingrediente (opción 1 o alternativas)
// supera su tope duro de la Tabla Única de Topes, si el día no cierra a ±5 % de las calorías, si una comida tiene
// menos de 4 opciones, si la variante no se respeta (gluten en Sin TACC, carne en vegetariano) o si la agenda no es
// la argentina: la cena es siempre la última comida (21:00-22:30), no hay «antes de dormir», ninguna comida cae
// durante el entreno y entre dos tomas hay al menos 1 h 30. Uso: npm run test:unit
import { BANK_PLAN_IDS, BANK_VARIANTS, buildBankPlan, GLUTEN_FOODS, MEAT_FOODS, planLabel, REF_WEIGHTS, sexOf, trainingOf, type BankSelection } from './planBank';
import { timeToMinutes } from './schedule';

/** Entreno a la mañana temprano, al mediodía, a la tarde y a la noche. */
const TRAININGS = [{ trainingTime: '07:00', sessionMinutes: 60 }, { trainingTime: '12:00', sessionMinutes: 75 }, { trainingTime: '18:00', sessionMinutes: 60 }, { trainingTime: '20:00', sessionMinutes: 90 }];
import { portionCap } from './portionCaps';

const fails: string[] = [];
let checks = 0;
let worst = 0;
let worstP = 0;
let extras = 0;
let desserts = 0;
const short: string[] = [];
const counts = new Map<string, number>();
for (const plan of BANK_PLAN_IDS) {
  for (const { id: variant } of BANK_VARIANTS) {
    const sel: BankSelection = { plan, variant };
    const sex = sexOf(plan);
    for (const w of REF_WEIGHTS[sex]) for (const trn of TRAININGS) {
      const tr = trainingOf(trn);
      const bp = buildBankPlan(sel, w, tr);
      for (const day of ['on', 'off'] as const) {
        const tag = `${planLabel(sel)} · ${w} kg · entrena ${trn.trainingTime} · ${day === 'on' ? 'entreno' : 'descanso'}`;
        const meals = bp.meals.filter((m) => m.day === day);
        // Agenda argentina.
        const ts = meals.map((m) => timeToMinutes(m.time));
        const dinner = meals.findIndex((m) => m.role === 'dinner');
        const key = `${sex}${bp.tier}-${day}`;
        counts.set(key, Math.max(counts.get(key) ?? 0, meals.length));
        if (dinner !== meals.length - 1) fails.push(`${tag}: la cena no es la última comida (${meals.map((m) => `${m.time} ${m.name}`).join(' · ')})`);
        if (ts[dinner] < 21 * 60 || ts[dinner] > 22 * 60 + 30) fails.push(`${tag}: cena a las ${meals[dinner].time}`);
        meals.forEach((m, i) => {
          if (/dormir/i.test(m.name)) fails.push(`${tag}: comida «${m.name}»`);
          if (i && ts[i] - ts[i - 1] < 90) fails.push(`${tag}: ${meals[i - 1].time} ${meals[i - 1].name} y ${m.time} ${m.name} quedan a menos de 1 h 30`);
          if (day === 'on' && ts[i] > tr.start - 30 && ts[i] < tr.end + 15) fails.push(`${tag}: ${m.time} ${m.name} cae durante el entreno`);
        });
        if (meals[dinner]?.title?.includes('+ postre:')) desserts++;
        const T = bp.target[day];
        const kcal = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p * 4 + i.c * 4 + i.f * 9, 0), 0);
        const p = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p, 0), 0);
        const dev = kcal / T.kcal - 1;
        worst = Math.max(worst, Math.abs(dev));
        worstP = Math.max(worstP, Math.abs(p / T.p - 1));
        const base = sex === 'F' ? (bp.tier === 'B' ? 5 : 4) : bp.tier === 'B' && day === 'on' ? 6 : 5;
        if (meals.length > base) extras += meals.length - base;
        if (meals.length < base) short.push(`${tag}: ${meals.length} comidas de ${base}`);
        checks++;
        if (Math.abs(dev) > 0.05) fails.push(`${tag}: el día cierra en ${Math.round(kcal)} kcal vs ${Math.round(T.kcal)} (${(dev * 100).toFixed(1)} %)`);
        for (const m of meals) {
          const opts = [{ title: m.title ?? '', items: m.items }, ...(m.alts ?? [])];
          if (opts.length < 4) fails.push(`${tag} · ${m.name}: sólo ${opts.length} opciones`);
          for (const o of opts) {
            for (const it of o.items) {
              checks++;
              const cap = portionCap(it.foodId, { sex, role: m.role, veg: variant === 'veg' }).max;
              if (it.grams > cap) fails.push(`${tag} · ${m.name} · ${o.title}: ${it.food} ${it.grams} g supera el tope de ${cap} g`);
              if (variant === 'stacc' && it.foodId && GLUTEN_FOODS.has(it.foodId)) fails.push(`${tag} · ${o.title}: ${it.food} tiene gluten`);
              if (variant === 'veg' && it.foodId && MEAT_FOODS.has(it.foodId)) fails.push(`${tag} · ${o.title}: ${it.food} no es vegetariano`);
            }
            const eggs = o.items.reduce((a, i) => a + (i.foodId === 'huevo' ? i.grams / 50 : i.foodId === 'claras' ? i.grams / 33 : 0), 0);
            if (eggs > 8.01) fails.push(`${tag} · ${o.title}: ${eggs} huevos + claras (máximo 8)`);
          }
        }
      }
    }
  }
}
// Volumen muy alto (fuera de los pesos de referencia): las calorías extra van como postre dentro de la cena.
{
  const bp = buildBankPlan({ plan: 'M-ren', variant: 'std' }, 115, trainingOf({ trainingTime: '18:00', sessionMinutes: 60 }));
  const on = bp.meals.filter((m) => m.day === 'on');
  const last = on[on.length - 1];
  checks++;
  if (last.role !== 'dinner' || !last.title?.includes('+ postre:')) fails.push(`115 kg: se esperaba la cena con postre como última comida (${on.map((m) => `${m.time} ${m.name}`).join(' · ')})`);
  if (/fruta de postre/.test(last.title ?? '')) fails.push('115 kg: la cena tiene dos postres');
  for (const o of [{ items: last.items }, ...(last.alts ?? [])]) for (const it of o.items) if (it.grams > portionCap(it.foodId, { sex: 'M', role: 'dinner' }).max) fails.push(`115 kg · cena: ${it.food} ${it.grams} g supera el tope`);
}
console.log(`Banco de planes: ${checks} verificaciones · peor cierre de calorías ${(worst * 100).toFixed(1)} % · peor desvío de proteína ${(worstP * 100).toFixed(1)} % · ${extras} colaciones extra · ${desserts} cenas con postre`);
if (short.length) console.log(`Días con una colación menos (no entra en la agenda): ${short.length}\n  ${short.slice(0, 6).join('\n  ')}`);
console.log(`Comidas por día (máximo): ${[...counts].sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`);
if (fails.length) {
  console.error(fails.slice(0, 40).join('\n'));
  console.error(`\n✗ ${fails.length} problemas en el banco de planes`);
  process.exit(1);
}
console.log('✓ 24 planes × 6 pesos × 4 horarios de entreno × entreno / descanso: ningún ingrediente supera su tope, todos los días cierran a ±5 % y la cena cierra el día');
