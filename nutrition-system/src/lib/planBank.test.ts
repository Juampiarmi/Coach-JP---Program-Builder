// Prueba automática del Banco de Planes Maestros: 24 planes (8 perfiles × 3 variantes) × 6 pesos de referencia
// × día de entreno y de descanso. Falla si algún ingrediente (opción 1 o alternativas) supera su tope duro de la
// Tabla Única de Topes, si el día no cierra a ±5 % de las calorías, si una comida tiene menos de 4 opciones o si
// la variante no se respeta (gluten en Sin TACC, carne en vegetariano). Uso: npm run test:unit
import { BANK_PLAN_IDS, BANK_VARIANTS, buildBankPlan, GLUTEN_FOODS, MEAT_FOODS, planLabel, REF_WEIGHTS, sexOf, type BankSelection } from './planBank';
import { portionCap } from './portionCaps';

const fails: string[] = [];
let checks = 0;
let worst = 0;
let worstP = 0;
let extras = 0;
for (const plan of BANK_PLAN_IDS) {
  for (const { id: variant } of BANK_VARIANTS) {
    const sel: BankSelection = { plan, variant };
    const sex = sexOf(plan);
    for (const w of REF_WEIGHTS[sex]) {
      const bp = buildBankPlan(sel, w);
      for (const day of ['on', 'off'] as const) {
        const tag = `${planLabel(sel)} · ${w} kg · ${day === 'on' ? 'entreno' : 'descanso'}`;
        const meals = bp.meals.filter((m) => m.day === day);
        const T = bp.target[day];
        const kcal = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p * 4 + i.c * 4 + i.f * 9, 0), 0);
        const p = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p, 0), 0);
        const dev = kcal / T.kcal - 1;
        worst = Math.max(worst, Math.abs(dev));
        worstP = Math.max(worstP, Math.abs(p / T.p - 1));
        extras += meals.filter((m) => /Colación extra|Segunda colación/.test(m.name)).length;
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
console.log(`Banco de planes: ${checks} verificaciones · peor cierre de calorías ${(worst * 100).toFixed(1)} % · peor desvío de proteína ${(worstP * 100).toFixed(1)} % · ${extras} colaciones extra agregadas`);
if (fails.length) {
  console.error(fails.slice(0, 40).join('\n'));
  console.error(`\n✗ ${fails.length} problemas en el banco de planes`);
  process.exit(1);
}
console.log('✓ 24 planes × 6 pesos × entreno / descanso: ningún ingrediente supera su tope y todos los días cierran a ±5 %');
