// Prueba de seguridad clínica: alergias e intolerancias en el banco de planes y en planes armados a mano.
// 24 planes × restricciones (cada una sola, combinaciones frecuentes y las 6 juntas) × 2 pesos × entreno / descanso:
// ningún ingrediente con un alérgeno declarado en ninguna opción, el día sigue cerrando a ±5 %, los topes por toma
// se respetan y cada comida conserva al menos 3 opciones. Además, el corrector de planes sustituye y el detector
// marca los alimentos libres. Uso: npm run test:unit
import { ALLERGEN_INFO, allergenConflicts, conflictOf, fixPlanAllergens, sealsFor, type Allergen } from './allergens';
import { BANK_PLAN_IDS, BANK_VARIANTS, buildBankPlan, planLabel, REF_WEIGHTS, sexOf, trainingOf } from './planBank';
import { portionCap } from './portionCaps';
import { seedPlan } from './seed';

const SETS: Allergen[][] = [['gluten'], ['lactose'], ['dairy'], ['nuts'], ['legumes'], ['shellfish'], ['egg'], ['gluten', 'lactose'], ['lactose', 'nuts'], ['egg', 'lactose'], ['dairy', 'legumes'], ['dairy', 'nuts', 'legumes'], ['gluten', 'lactose', 'nuts', 'legumes', 'shellfish', 'egg'], ['veg'], ['veg', 'gluten'], ['veg', 'lactose'], ['veg', 'egg']];
const fails: string[] = [];
let checks = 0;
let worst = 0;
let minOpts = 99;
const tr = trainingOf({ trainingTime: '18:00', sessionMinutes: 60 });

for (const plan of BANK_PLAN_IDS)
  for (const { id: variant } of BANK_VARIANTS)
    for (const set of SETS) {
      const sex = sexOf(plan);
      for (const w of [REF_WEIGHTS[sex][1], REF_WEIGHTS[sex][4]]) {
        const bp = buildBankPlan({ plan, variant }, w, tr, {}, set);
        for (const day of ['on', 'off'] as const) {
          const tag = `${planLabel({ plan, variant })} · ${w} kg · sin ${set.map((a) => ALLERGEN_INFO[a].short).join(' + ')} · ${day}`;
          const meals = bp.meals.filter((m) => m.day === day);
          const kcal = meals.reduce((a, m) => a + m.items.reduce((s, i) => s + i.p * 4 + i.c * 4 + i.f * 9, 0), 0);
          const dev = kcal / bp.target[day].kcal - 1;
          worst = Math.max(worst, Math.abs(dev));
          if (Math.abs(dev) > 0.05) fails.push(`${tag}: cierra en ${Math.round(kcal)} vs ${Math.round(bp.target[day].kcal)} kcal (${(dev * 100).toFixed(1)} %)`);
          for (const m of meals) {
            const opts = [{ title: m.title ?? '', items: m.items }, ...(m.alts ?? [])];
            minOpts = Math.min(minOpts, opts.length);
            // Vegetariano sin huevo ni legumbres: casi toda la proteína es láctea; se aceptan 2 opciones (caso extremo).
            const extreme = (variant === 'veg' || set.includes('veg')) && set.includes('legumes') && (set.includes('egg') || set.includes('dairy'));
            if (opts.length < (extreme ? 2 : 3)) fails.push(`${tag} · ${m.name}: sólo ${opts.length} opciones aptas`);
            for (const o of opts) {
              for (const it of o.items) {
                checks++;
                const bad = conflictOf(it, set);
                if (bad.length) fails.push(`${tag} · ${m.name} · ${o.title}: ${it.food} (${bad.join('/')})`);
                const cap = portionCap(it.foodId, { sex, role: m.role, veg: variant === 'veg' || set.includes('veg') }).max;
                if (it.grams > cap) fails.push(`${tag} · ${m.name}: ${it.food} ${it.grams} g supera el tope de ${cap} g`);
              }
              // El título no nombra un alimento que el plato ya no lleva.
              if (set.includes('nuts') && /nueces|man[ií]\b/i.test(o.title)) fails.push(`${tag} · título con frutos secos: ${o.title}`);
              if (set.includes('egg') && /huevo/i.test(o.title) && !/sin huevo/i.test(o.title)) fails.push(`${tag} · título con huevo: ${o.title}`);
              if (set.includes('shellfish') && /merluza|at[uú]n/i.test(o.title)) fails.push(`${tag} · título con pescado: ${o.title}`);
            }
          }
        }
      }
    }

// Planes armados a mano / por la IA: el corrector sustituye lo que tiene equivalente y el detector marca lo libre.
{
  const base = seedPlan();
  const p = { ...base, anamnesis: { ...base.anamnesis!, allergies: ['lactose', 'egg', 'nuts'] } };
  p.meals = p.meals.map((m, i) => (i === 0 ? { ...m, items: [...m.items, { id: 'free1', food: 'Tostado de jamón y queso con manteca', grams: 120, p: 15, c: 30, f: 12, leucine: 1 }] } : m));
  const before = allergenConflicts(p).length;
  const { plan: fixed, fixed: n } = fixPlanAllergens(p);
  const left = allergenConflicts(fixed);
  checks++;
  if (!before) fails.push('Plan manual: no se detectó ningún alérgeno en el plan de prueba');
  if (!n) fails.push('Plan manual: el corrector no sustituyó nada');
  if (left.length !== 1 || left[0].food !== 'Tostado de jamón y queso con manteca') fails.push(`Plan manual: tras corregir deberían quedar sólo los alimentos libres (${left.map((c) => c.food).join(', ')})`);
  // APLV: los deslactosados y el whey aislado NO son aptos (sí lo son para la intolerancia a la lactosa).
  for (const id of ['leche-deslactosada', 'yogur-deslactosado', 'whey-isolate', 'queso-deslactosado']) {
    if (!conflictOf({ foodId: id }, ['dairy']).length) fails.push(`APLV: ${id} figura como apto`);
    if (conflictOf({ foodId: id }, ['lactose']).length) fails.push(`Lactosa: ${id} figura como no apto`);
  }
  if (conflictOf({ food: 'Leche de almendras' }, ['dairy']).length) fails.push('APLV: una bebida vegetal escrita a mano figura como láctea');
  if (!conflictOf({ food: 'Leche descremada deslactosada' }, ['dairy']).length) fails.push('APLV: una leche deslactosada escrita a mano no se detecta');
  const seals = sealsFor([{ foodId: 'pollo', food: 'Pechuga' }, { foodId: 'arroz', food: 'Arroz' }], ['gluten', 'lactose'], false);
  if (seals.join() !== 'Sin TACC,Sin lactosa') fails.push(`Sellos: ${seals.join()}`);
}

console.log(`Alergias: ${checks} verificaciones · ${SETS.length} combinaciones de restricciones · peor cierre ${(worst * 100).toFixed(1)} % · mínimo ${minOpts} opciones por comida`);
if (fails.length) {
  console.error(fails.slice(0, 30).join('\n'));
  console.error(`\n✗ ${fails.length} problemas de alérgenos`);
  process.exit(1);
}
console.log('✓ Ningún alérgeno declarado en ninguna opción del banco; sustituciones dentro de los topes y días cerrados a ±5 %');
