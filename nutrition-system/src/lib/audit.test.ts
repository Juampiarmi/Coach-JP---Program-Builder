// Auditoría integral con casos simulados (mujeres 50-65 kg, hombres 75-95 kg × estándar, Keto, Low Carb, celíaco,
// sin lactosa, vegetariano + Modo Parejas): cierre diario, variantes equivalentes, topes de volumen, lista de
// compras crudo/cocido sin duplicados ni omisiones y cero fugas de alimentos prohibidos. Uso: npm run test:unit
import { acceptForPlan, allergiesOf, foodIsSafe, protocolOf } from './allergens';
import { computeTelemetry, dayTotals, mealsForDay } from './bioenergetics';
import { coupleShopping, mirrorForPartner } from './couple';
import { SHOP_RULES } from './exportHtml';
import { FOOD_BY_ID, FOODS, netCarbs } from './foods';
import { applyBankPlan } from './planBank';
import { equivalentOptions, isEquivalent } from './planBuild';
import { portionCap } from './portionCaps';
import { precalc } from './precalc';
import { QUICK_SWAPS } from './quickSwaps';
import { seedPlan } from './seed';
import { weeklyShopping } from './shopping';
import type { AthletePlan, MealDay, Sex } from './types';

const fails: string[] = [];
const person = (sex: Sex, kg: number, allergies: string[]): AthletePlan => {
  const p = seedPlan();
  p.profile = { ...p.profile, sex, weightKg: kg };
  p.anamnesis = { ...(p.anamnesis as NonNullable<AthletePlan['anamnesis']>), allergies };
  return p;
};
const build = (p: AthletePlan) => equivalentOptions(applyBankPlan(p, precalc(p).sel), 2);
const pct = (a: number, b: number) => Math.abs(a / Math.max(1, b) - 1);

let n = 0;
let short = 0;
for (const [sex, kg] of [['F', 50], ['F', 57], ['F', 65], ['M', 75], ['M', 85], ['M', 95]] as const) {
  for (const al of [[], ['keto'], ['lowcarb'], ['gluten'], ['lactose'], ['veg']]) {
    const tag = `${sex}${kg} ${al.join('+') || 'estándar'}`;
    const plan = build(person(sex, kg, al));
    const proto = protocolOf(allergiesOf(plan));
    const t = computeTelemetry(plan);
    n++;
    // 1 · Cierre diario: kcal ±5 %, proteína ±12 %, grasas ±15 %; carbos netos ≤ techo del protocolo.
    for (const d of ['on', 'off'] as const) {
      const got = dayTotals(plan.meals, d);
      const goal = d === 'on' ? { ...t.gramsOn, kcal: t.kcalOn } : { ...t.gramsOff, kcal: t.kcalOff };
      if (pct(got.kcal, goal.kcal) > 0.05) fails.push(`${tag} ${d}: ${Math.round(got.kcal)}/${Math.round(goal.kcal)} kcal`);
      if (pct(got.p, goal.p) > 0.12) fails.push(`${tag} ${d}: proteína ${Math.round(got.p)}/${Math.round(goal.p)} g`);
      if (pct(got.f, goal.f) > 0.15) fails.push(`${tag} ${d}: grasas ${Math.round(got.f)}/${Math.round(goal.f)} g`);
      const net = netCarbs(mealsForDay(plan.meals, d).flatMap((m) => m.items));
      if (proto && net > goal.c * 1.15) fails.push(`${tag} ${d}: carbos netos ${Math.round(net)} > objetivo ${Math.round(goal.c)}`);
      if (!proto && pct(got.c, goal.c) > 0.15) fails.push(`${tag} ${d}: carbos ${Math.round(got.c)}/${Math.round(goal.c)} g`);
    }
    const accept = acceptForPlan(plan);
    for (const m of plan.meals) {
      // 2 · Variantes de verdad equivalentes a la Opción 1.
      for (const o of m.alts ?? []) if (!isEquivalent(m.items, o.items, 1.5)) fails.push(`${tag} · ${m.name}: «${o.title}» no es equivalente`);
      if ((m.alts?.length ?? 0) < 2) short++;
      for (const [where, items] of [['op1', m.items], ...(m.alts ?? []).map((o) => [o.title, o.items] as const)] as const) {
        for (const it of items) {
          if (!it.foodId) continue;
          // 3 · Topes de volumen por comida (pan, guarniciones cocidas, galletas de arroz…).
          const cap = portionCap(it.foodId, { sex, role: m.role, diet: proto ?? undefined, veg: al.includes('veg') }).max;
          if (it.grams > cap * 1.01) fails.push(`${tag} · ${m.name} [${where}]: ${it.food} ${it.grams} g > tope ${cap} g`);
          // 4 · Cero fugas: nada prohibido por alergia, intolerancia, vegetarianismo o protocolo.
          if (accept && !accept(it.foodId) && !foodIsSafe(it.foodId, allergiesOf(plan))) fails.push(`${tag} · ${m.name}: alimento prohibido ${it.food}`);
          else if (!foodIsSafe(it.foodId, allergiesOf(plan))) fails.push(`${tag} · ${m.name}: alimento prohibido ${it.food}`);
        }
      }
    }
    // 5 · Lista de compras: cada alimento aparece una sola vez, convertido a crudo / seco con su factor, sin omisiones.
    const groups = weeklyShopping([plan]);
    const rows = groups.flatMap((g) => g.rows);
    if (new Set(rows.map((r) => r.key)).size !== rows.length) fails.push(`${tag}: filas duplicadas en la lista de compras`);
    const on = plan.profile.trainingDaysPerWeek;
    const mult: Record<MealDay, number> = { on, off: 7 - on, both: 7 };
    const expect: Record<string, number> = {};
    for (const m of plan.meals) for (const it of m.items) if (it.grams > 0) { const r = (it.foodId && SHOP_RULES[it.foodId]) || {}; const k = r.key || it.foodId || `x:${it.food}`; expect[k] = (expect[k] ?? 0) + it.grams * mult[m.day] * (r.factor ?? 1); }
    for (const [k, g] of Object.entries(expect)) {
      const row = rows.find((r) => r.key === k);
      if (!row) fails.push(`${tag}: falta ${k} en la lista de compras`);
      else if (row.grams < g - 10) fails.push(`${tag}: ${k} ${row.grams} g en la lista vs ${Math.round(g)} g del plan`);
    }
    for (const r of rows) if (r.key in SHOP_RULES && SHOP_RULES[r.key].state === 'raw' && r.note !== 'crudo') fails.push(`${tag}: ${r.name} sin aclarar «crudo»`);
    for (const r of rows) if (FOOD_BY_ID[r.key] && !foodIsSafe(r.key, allergiesOf(plan))) fails.push(`${tag}: la lista de compras trae ${r.name}`);
    // 6 · Reemplazos 1 a 1 / Mi heladera: el payload marca como «evitar» todo lo no apto (la app los oculta).
    const avoid = new Set(FOODS.filter((f) => !foodIsSafe(f.id, allergiesOf(plan))).map((f) => f.id));
    for (const g of QUICK_SWAPS) for (const s of g.items) for (const [id] of s.parts) if (!foodIsSafe(id, allergiesOf(plan)) && !avoid.has(id)) fails.push(`${tag}: reemplazo ${s.label} no se oculta`);
  }
}

// 7 · Modo Parejas: lista combinada = suma exacta de las dos personas, sin duplicados.
for (const [a, b] of [[person('M', 85, []), person('F', 57, [])], [person('M', 95, ['gluten']), person('F', 50, ['gluten', 'lactose'])], [person('M', 75, ['veg']), person('F', 65, ['veg'])]] as const) {
  const lead = build(a);
  const partner = mirrorForPartner(b, lead);
  const rows = coupleShopping(lead, partner);
  const single = weeklyShopping([lead]).flatMap((g) => g.rows);
  if (new Set(rows.map((r) => r.key)).size !== rows.length) fails.push('Parejas: filas duplicadas');
  for (const r of rows) if (r.total < r.a + r.b - 10) fails.push(`Parejas: ${r.name} total ${r.total} < ${r.a}+${r.b}`);
  for (const s of single) { const r = rows.find((x) => x.key === s.key); if (!r || Math.abs(r.a - s.by[0]) > 10) fails.push(`Parejas: ${s.name} de la persona A no coincide con su lista individual`); }
  for (const m of partner.meals) for (const it of m.items) if (it.foodId && !foodIsSafe(it.foodId, allergiesOf(partner))) fails.push(`Parejas: ${it.food} prohibido para la persona B`);
}

if (fails.length) {
  console.error([...new Set(fails)].slice(0, 60).join('\n'));
  console.error(`\n✗ ${new Set(fails).size} problemas en la auditoría integral`);
  process.exit(1);
}
console.log(`✓ Auditoría integral: ${n} planes simulados + 3 parejas · cierre diario, variantes equivalentes, topes, compras y cero fugas (${short} comidas con menos de 3 opciones equivalentes)`);
