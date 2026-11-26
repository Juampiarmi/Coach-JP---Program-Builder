// Banco Global: «+ Asignar a comida» escala al alumno (topes, pisos, unidades enteras) y respeta alergias. Uso: npm run test:unit
import { allergenConflicts } from './allergens';
import { previewAssign, totalsOf, type BankSource } from './bankAssign';
import { CATALOG } from './catalog';
import { seedFoodDb } from './foodBrandDb';
import { FOODS } from './foods';
import { applyBankPlan, ROLES_OF_CATEGORY } from './planBank';
import { portionCap } from './portionCaps';
import { seedPlan } from './seed';
import type { AthletePlan, Sex } from './types';

const fails: string[] = [];
const person = (sex: Sex, kg: number, allergies: string[] = []): AthletePlan => {
  const p = seedPlan();
  p.profile = { ...p.profile, sex, weightKg: kg };
  p.anamnesis = { ...(p.anamnesis as NonNullable<AthletePlan['anamnesis']>), allergies };
  return applyBankPlan(p, { plan: `${sex}-hip` as never, variant: 'std' });
};
const db = seedFoodDb();
const sources: BankSource[] = [
  ...CATALOG.map((d) => ({ kind: 'catalog' as const, id: d.id })),
  ...db.filter((b) => b.ingredientes?.length).slice(0, 30).map((b) => ({ kind: 'dish' as const, id: b.id })),
  ...FOODS.filter((f) => !f.custom && f.group !== 'plato').map((f) => ({ kind: 'food' as const, id: f.id })),
];
let checked = 0;
for (const [label, plan] of [['mujer 55 kg', person('F', 55)], ['hombre 85 kg', person('M', 85)], ['mujer 60 kg celíaca vegetariana', person('F', 60, ['gluten', 'veg'])]] as const) {
  for (const meal of plan.meals) {
    for (const src of sources) {
      const pv = previewAssign(src, meal, plan, db);
      if (!pv) continue;
      checked++;
      if (!pv.items.length) fails.push(`${label} · ${meal.name} · ${src.id}: sin ingredientes`);
      const bad = allergenConflicts({ meals: [{ ...meal, items: pv.items, alts: [] }], anamnesis: plan.anamnesis });
      if (bad.length) fails.push(`${label} · ${meal.name} · ${src.id}: ${bad.length} ingrediente(s) prohibido(s)`);
      for (const it of pv.items) {
        const cap = portionCap(it.foodId, { sex: plan.profile.sex, role: meal.role, veg: (plan.anamnesis?.allergies ?? []).includes('veg') }).max;
        if (it.grams > cap * 1.01) fails.push(`${label} · ${meal.name} · ${src.id}: ${it.food} ${it.grams} g > tope ${cap} g`);
      }
      const k = totalsOf(pv.items).kcal;
      const dish = src.kind === 'catalog' ? CATALOG.find((d) => d.id === src.id)! : null;
      if (dish && (dish.category === 'desayuno' || dish.category === 'plato_principal') && ROLES_OF_CATEGORY[dish.category].includes(meal.role) && meal.items.length && (k < totalsOf(meal.items).kcal * 0.75 || k > totalsOf(meal.items).kcal * 1.3)) fails.push(`${label} · ${meal.name} · ${src.id}: ${Math.round(k)} kcal vs ${Math.round(totalsOf(meal.items).kcal)} de la comida`);
    }
  }
}
if (checked < 500) fails.push(`pocas asignaciones verificadas (${checked})`);
if (fails.length) {
  console.error(fails.slice(0, 25).join('\n') + (fails.length > 25 ? `\n… y ${fails.length - 25} más` : ''));
  process.exit(1);
}
console.log(`✓ Banco Global: ${checked} asignaciones (recetario, platos propios y alimentos base) dentro de topes, sin alérgenos y en las calorías de la comida (platos de su categoría)`);
