// Reemplazos cruzados por macro, «Cambiar por plato del Banco Global» por opción y «Merienda» (ex «Antes de
// entrenar»). Uso: npm run test:unit
import { acceptForPlan, allergiesOf, foodIsSafe, protocolOf } from './allergens';
import { bankCandidates } from './bankAssign';
import { crossSwapOptions } from './crossSwaps';
import { FOOD_BY_ID } from './foods';
import { applyBankPlan } from './planBank';
import { precalc } from './precalc';
import { portionCap } from './portionCaps';
import { QUICK_SWAPS } from './quickSwaps';
import { CATALOG } from './catalog';
import { itemFromFood, seedPlan } from './seed';
import type { AthletePlan, MealRole, Sex } from './types';

const fails: string[] = [];
const person = (sex: Sex, kg: number, allergies: string[]): AthletePlan => {
  const p = seedPlan();
  p.profile = { ...p.profile, sex, weightKg: kg };
  p.anamnesis = { ...(p.anamnesis as NonNullable<AthletePlan['anamnesis']>), allergies };
  return p;
};

// 1 · Reemplazos cruzados: mismo macro (90-115 %), topes por sexo y franja, unidades enteras, nada prohibido.
let n = 0;
const ALLERGY_SETS = [[], ['egg'], ['lactose'], ['dairy'], ['gluten'], ['veg'], ['keto'], ['lowcarb']];
for (const sex of ['F', 'M'] as const) {
  for (const al of ALLERGY_SETS) {
    const plan = person(sex, sex === 'F' ? 58 : 84, al);
    const accept = acceptForPlan(plan);
    const diet = protocolOf(allergiesOf(plan)) ?? undefined;
    const cases: [string, number, MealRole][] = [['pollo', sex === 'F' ? 140 : 200, 'lunch'], ['cuadril', sex === 'F' ? 150 : 210, 'dinner'], ['arroz', sex === 'F' ? 180 : 280, 'lunch'], ['huevo', 120, 'breakfast'], ['pan', 50, 'breakfast'], ['papa', 200, 'dinner']];
    for (const [id, g, role] of cases) {
      const it = itemFromFood(id, g);
      const opts = crossSwapOptions(it, { sex, role, diet, accept });
      const k = it.p * 4 >= it.c * 4 ? 'p' : 'c';
      for (const o of opts) {
        n++;
        const got = o.items.reduce((a, i) => a + i[k], 0);
        const tag = `${sex} ${al.join('+') || 'std'} · ${id} ${g} g → ${o.target.label}`;
        if (got < it[k] * 0.9 || got > it[k] * 1.15) fails.push(`${tag}: ${got.toFixed(1)} g vs ${it[k].toFixed(1)} g`);
        for (const x of o.items) {
          const cap = portionCap(x.foodId, { sex, role, diet }).max;
          if (x.grams > cap) fails.push(`${tag}: ${x.food} ${x.grams} g > tope ${cap} g`);
          if (!foodIsSafe(x.foodId!, allergiesOf(plan))) fails.push(`${tag}: trae ${x.food} (prohibido)`);
          if (x.foodId === 'huevo' && x.grams % 60) fails.push(`${tag}: huevo en ${x.grams} g (no son unidades enteras)`);
          if (x.foodId === 'claras' && x.grams % 33) fails.push(`${tag}: claras en ${x.grams} g (no son unidades enteras)`);
        }
        if (Math.abs(o.dFat) >= 5 && !o.warn) fails.push(`${tag}: cambia la grasa ${o.dFat} g sin aviso`);
      }
      // Cobertura: el pollo tiene que poder pasar a huevos/claras/atún/tofu o whey; el arroz a otra fuente de carbos.
      if (!al.length && id === 'pollo' && !opts.some((o) => /huevo|claras|atun|tofu|whey/.test(o.target.id))) fails.push(`${sex}: el pollo no ofrece familias cruzadas`);
      if (!al.length && id === 'arroz' && !opts.some((o) => o.target.id === 'tapa-tarta')) fails.push(`${sex}: el arroz no ofrece masa de tarta`);
      if (!al.length && id === 'arroz' && !opts.some((o) => o.target.id === 'papa')) fails.push(`${sex}: el arroz no ofrece papa`);
      if (al.includes('keto') && id === 'arroz' && opts.some((o) => o.items.some((x) => (FOOD_BY_ID[x.foodId!]?.c ?? 0) > 15))) fails.push(`${sex} keto: el arroz ofrece carbos densos`);
    }
  }
}
// Claras + ricota: en reemplazos rápidos y en el catálogo de desayuno y merienda (salado y dulce).
if (!QUICK_SWAPS.find((g) => g.k === 'p')?.items.some((x) => x.id === 'claras-ricota')) fails.push('Reemplazos rápidos: falta claras + ricota magra');
if (!CATALOG.some((d) => d.category === 'desayuno' && /claras y ricota/i.test(d.title))) fails.push('Recetario: falta el revuelto de claras y ricota (desayuno)');
if (!CATALOG.some((d) => d.category === 'merienda' && /claras y ricota/i.test(d.title) && /canela/i.test(d.title))) fails.push('Recetario: falta la versión dulce de claras y ricota con canela (merienda)');

// 2 · Banco Global por opción: sólo aptos, ordenados por cercanía y con gramos escalados.
let m = 0;
for (const [sex, kg, al] of [['F', 55, []], ['F', 62, ['gluten', 'lactose']], ['M', 85, ['veg']], ['M', 90, ['keto']], ['F', 58, ['lowcarb', 'egg']]] as const) {
  const base = person(sex, kg, [...al]);
  const plan = applyBankPlan(base, precalc(base).sel);
  for (const meal of plan.meals) {
    const list = bankCandidates(meal, meal.items, plan, [], meal.title);
    m += list.length;
    for (let i = 1; i < list.length; i++) if (list[i].score < list[i - 1].score) fails.push(`${sex}${kg} · ${meal.name}: el Banco no está ordenado por cercanía`);
    for (const c of list) for (const x of c.preview.items) {
      if (x.foodId && !foodIsSafe(x.foodId, allergiesOf(plan))) fails.push(`${sex}${kg} ${al.join('+')} · ${meal.name}: «${c.preview.title}» trae ${x.food}`);
      if (x.foodId && x.grams > portionCap(x.foodId, { sex, role: meal.role, diet: protocolOf(allergiesOf(plan)) ?? undefined, veg: (al as readonly string[]).includes('veg') }).max * 1.01) fails.push(`${sex}${kg} · ${meal.name}: «${c.preview.title}» ${x.food} ${x.grams} g sobre el tope`);
    }
  }
  // 3 · «Merienda»: ninguna comida se llama «Antes de entrenar» y no hay dos comidas con el mismo nombre el mismo día.
  for (const d of ['on', 'off']) {
    const names = plan.meals.filter((x) => x.day === d || x.day === 'both').map((x) => x.name);
    if (names.some((x) => /antes de entrenar/i.test(x))) fails.push(`${sex}${kg}: comida «Antes de entrenar» (${names.join(', ')})`);
    if (new Set(names).size !== names.length) fails.push(`${sex}${kg} ${d}: nombres repetidos (${names.join(', ')})`);
  }
}

if (fails.length) {
  console.error([...new Set(fails)].slice(0, 50).join('\n'));
  console.error(`\n✗ ${new Set(fails).size} problemas en reemplazos cruzados / Banco por opción`);
  process.exit(1);
}
console.log(`✓ Reemplazos cruzados: ${n} opciones (proteína ⇄ huevos, claras, claras + ricota, pescado, tofu, whey · carbos ⇄ papa, pan, legumbres, masa de tarta) con topes, unidades enteras y sin prohibidos · Banco Global por opción: ${m} candidatos aptos y ordenados · «Merienda» sin nombres repetidos`);
