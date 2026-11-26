// Protocolos Keto / Low Carb + auditoría de rigor (cacao, mate, condimentos, fernet). Uso: npm run test:unit
import { allergenConflicts, fixPlanAllergens } from './allergens';
import { CATALOG } from './catalog';
import { seedFoodDb } from './foodBrandDb';
import { netCarbs } from './foods';
import { buildPayload } from './exportHtml';
import { flavorOf, SEASONING_STEP } from './menuOptions';
import { applyBankPlan, catalogDishForMeal } from './planBank';
import { seedPlan } from './seed';
import { itemFromFood } from './seed';
import type { AthletePlan, Sex } from './types';

const fails: string[] = [];
const person = (sex: Sex, kg: number, allergies: string[]): AthletePlan => {
  const p = seedPlan();
  p.profile = { ...p.profile, sex, weightKg: kg };
  p.anamnesis = { ...(p.anamnesis as NonNullable<AthletePlan['anamnesis']>), allergies };
  return p;
};
for (const [proto, max] of [['keto', 50], ['lowcarb', 105]] as const)
  for (const [sex, kg, extra] of [['F', 55, []], ['M', 85, []], ['F', 62, ['veg']], ['M', 78, ['gluten', 'lactose']]] as const) {
    const base = person(sex, kg, [proto, ...extra]);
    const plan = applyBankPlan(base, { plan: `${sex}-rec`, variant: proto });
    const label = `${proto} · ${sex} ${kg} kg ${extra.join('+')}`;
    for (const day of ['on', 'off'] as const) {
      const items = plan.meals.filter((m) => m.day === day || m.day === 'both').flatMap((m) => m.items);
      const net = netCarbs(items);
      const p = items.reduce((a, i) => a + i.p, 0) / kg;
      if (net > max) fails.push(`${label} ${day}: ${net.toFixed(0)} g de carbos netos (máx ${max})`);
      if (proto === 'keto' && (p < (extra.includes('veg' as never) ? 1.4 : 1.5) || p > 2.3)) fails.push(`${label} ${day}: proteína ${p.toFixed(2)} g/kg`);
    }
    const bad = allergenConflicts(plan);
    if (bad.length) fails.push(`${label}: ${bad.length} ingredientes fuera del protocolo o alergia (${bad.slice(0, 3).map((b) => b.food).join(', ')})`);
    // La app recibe la lista de excluidos (swaps, Mi heladera) y el protocolo (Comer afuera).
    const d = buildPayload(plan, { preview: true, mode: 'on' }) as unknown as { avoid: string[]; allergies: string[] };
    if (!d.avoid.includes('arroz') || !d.allergies.includes(proto)) fails.push(`${label}: la app no recibe el protocolo`);
    if (proto === 'keto' && (!d.avoid.includes('banana') || d.avoid.includes('palta'))) fails.push(`${label}: lista keto de la app incoherente`);
  }
// Pasar un plan estándar a Keto: las comidas se corrigen (sin carbos prohibidos) y siguen teniendo comida.
{
  const std = applyBankPlan(person('M', 80, []), { plan: 'M-def', variant: 'std' });
  const keto = { ...std, anamnesis: { ...std.anamnesis!, allergies: ['keto'] } };
  const r = fixPlanAllergens(keto, false);
  if (r.fixed === 0) fails.push('Keto: fixPlanAllergens no corrigió nada en un plan estándar');
  if (r.plan.meals.some((m) => m.items.length === 0)) fails.push('Keto: quedó una comida vacía al corregir');
}
// Rigor: cacao con gramos, mate 0 kcal, condimentos coherentes, fernet zero.
const cacao = CATALOG.find((d) => d.id === 'col-leche-cacao')!;
if (!cacao.std.parts.some((p) => p.id === 'cacao-amargo' && (p.g ?? 0) >= 5) || !cacao.std.female?.parts.some((p) => p.id === 'cacao-amargo')) fails.push('Leche chocolatada: el cacao amargo no tiene gramos');
for (const id of ['mer-mug-cake', 'des-overnight-cacao-pera']) if (!CATALOG.find((d) => d.id === id)!.std.parts.some((p) => p.id === 'cacao-amargo')) fails.push(`${id}: cacao sin gramos`);
const meal = seedPlan().meals.find((m) => m.role === 'snack') ?? seedPlan().meals[0];
const mug = catalogDishForMeal('mer-mug-cake', { ...meal, role: 'snack', items: [] }, seedPlan());
if (!mug || mug.steps.some((s) => /\bsal\b|lim[oó]n|pimienta|provenzal/i.test(s))) fails.push(`Mug cake con condimentos salados: ${mug?.steps.join(' | ')}`);
if (flavorOf(['banana', 'huevo', 'avena', 'cacao-amargo'].map((id) => itemFromFood(id, 40)), 'Mug cake de banana') !== 'sweet') fails.push('Mug cake no se reconoce como dulce');
if (/cacao/.test(SEASONING_STEP.sweet)) fails.push('El condimento dulce nombra cacao sin gramos');
if (flavorOf(['nueces', 'almendras'].map((id) => itemFromFood(id, 20)), 'Puñado de frutos secos') !== 'plain') fails.push('Frutos secos con aderezo');
const db = seedFoodDb();
const mate = db.find((b) => /^mate cebado$/i.test(b.nombre))!;
if (mate.macros_por_porcion.kcal !== 0 || mate.macros_por_porcion.c !== 0) fails.push(`Mate cebado: ${mate.macros_por_porcion.kcal} kcal / ${mate.macros_por_porcion.c} g de carbos (debe ser 0)`);
if (!db.some((b) => /Fernet con Coca Zero/i.test(b.nombre)) || !db.some((b) => /Fernet con Coca común/i.test(b.nombre))) fails.push('Fernet: faltan las dos versiones (zero y común)');
for (const b of db.filter((x) => /milanesa/i.test(x.nombre))) if (!/\d+ g de pan rallado/.test(b.detalle ?? '') || !/\d+ g de (pechuga|nalga|merluza|carne)/.test(b.detalle ?? '')) fails.push(`${b.nombre}: sin desglose de carne y pan rallado (${b.detalle})`);
if (!/60 g de palta/.test(db.find((b) => /^avocado toast integral$/i.test(b.nombre))!.detalle ?? '')) fails.push('Avocado toast sin gramos de palta');

if (fails.length) {
  console.error(fails.slice(0, 30).join('\n'));
  process.exit(1);
}
console.log('✓ Protocolos Keto (≤ 50 g netos, proteína moderada) y Low Carb (≤ 100 g netos) con alergias y vegetarianismo, app con su filtro; cacao, mate, condimentos, milanesas y fernet auditados');
