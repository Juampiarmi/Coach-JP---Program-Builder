// Modo Parejas: el espejo comparte comidas, recetas y opciones, pero cada uno con sus gramos. Uso: npm run test:unit
import { allergenConflicts } from './allergens';
import { computeTelemetry } from './bioenergetics';
import { coupleShopping, mirrorForPartner, pairMeals, partnerOutOfSync } from './couple';
import { applyBankPlan } from './planBank';
import { MAIN_MEAT_FLOOR, MAIN_MEATS, portionCap } from './portionCaps';
import { seedPlan } from './seed';
import type { AthletePlan, Sex } from './types';

const fails: string[] = [];
const person = (sex: Sex, kg: number, allergies: string[] = []): AthletePlan => {
  const p = seedPlan();
  p.profile = { ...p.profile, sex, weightKg: kg, name: sex === 'F' ? 'Ana' : 'Juan' };
  p.anamnesis = { ...(p.anamnesis as NonNullable<AthletePlan['anamnesis']>), allergies };
  return p;
};
const lead = applyBankPlan(person('M', 84), { plan: 'M-hip', variant: 'std' });
for (const [label, partner0] of [
  ['mujer 58 kg', person('F', 58)],
  ['mujer 66 kg sin lactosa', person('F', 66, ['lactose'])],
  ['hombre 70 kg', person('M', 70)],
] as const) {
  const partner = mirrorForPartner({ ...partner0, periodization: { ...partner0.periodization } }, lead);
  const pairs = pairMeals(lead, partner);
  if (partner.meals.length !== lead.meals.length || pairs.some((x) => !x.partner)) fails.push(`${label}: no copia todas las comidas`);
  for (const { lead: a, partner: b } of pairs) {
    if (!b) continue;
    if (a.name !== b.name || a.time !== b.time || a.day !== b.day) fails.push(`${label} · ${a.name}: la estructura no coincide`);
    if ((a.alts?.length ?? 0) !== (b.alts?.length ?? 0)) fails.push(`${label} · ${a.name}: no tiene las mismas opciones`);
    for (const it of [b.items, ...(b.alts ?? []).map((x) => x.items)].flat()) {
      const cap = portionCap(it.foodId, { sex: partner.profile.sex, role: b.role });
      if (it.grams > cap.max) fails.push(`${label} · ${b.name}: ${it.food} ${it.grams} g supera el tope ${cap.max} g`);
      if (it.foodId === 'huevo' && it.grams % 60) fails.push(`${label}: huevo ${it.grams} g no es una unidad entera`);
    }
    for (const it of b.items) if (it.foodId && MAIN_MEATS.has(it.foodId) && (b.role === 'lunch' || b.role === 'dinner') && it.grams < MAIN_MEAT_FLOOR[partner.profile.sex]) fails.push(`${label} · ${b.name}: ${it.food} ${it.grams} g bajo el piso`);
  }
  // Cada uno cierra en SUS calorías (±6 %).
  const t = computeTelemetry(partner);
  for (const d of ['on', 'off'] as const) {
    const kcal = partner.meals.filter((m) => m.day === d || m.day === 'both').reduce((s, m) => s + m.items.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0), 0);
    const target = d === 'on' ? t.kcalOn : t.kcalOff;
    if (Math.abs(kcal / target - 1) > 0.06) fails.push(`${label} · ${d}: ${Math.round(kcal)} kcal vs su meta ${Math.round(target)}`);
  }
  if (allergenConflicts(partner).length) fails.push(`${label}: quedaron alérgenos de la pareja`);
  if (partnerOutOfSync(lead, partner)) fails.push(`${label}: recién copiado figura desactualizado`);
  if (!partnerOutOfSync({ ...lead, updatedAt: lead.updatedAt + 5000 }, partner)) fails.push(`${label}: no detecta cambios del menú`);
  const shop = coupleShopping(lead, partner);
  if (!shop.length || shop.some((r) => r.total !== Math.round((r.a + r.b) / 10) * 10 && Math.abs(r.total - r.a - r.b) > 10)) fails.push(`${label}: la lista combinada no suma`);
}
if (fails.length) {
  console.error(fails.join('\n'));
  console.error(`\n✗ ${fails.length} problemas en el Modo Parejas`);
  process.exit(1);
}
console.log('✓ Modo Parejas: misma estructura y opciones, gramos propios dentro de topes y pisos, cada uno en sus calorías, alergias y lista combinada');
