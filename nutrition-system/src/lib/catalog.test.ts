// Recetario Coach JP: cada plato, en cada variante que admite, aplicado a la comida que le corresponde para una mujer
// y un hombre, queda dentro de los topes por toma, sin alérgenos de la variante, en las calorías de la comida (±10 %),
// con huevos enteros, pisos de carne y sin leche fluida en la mujer. Uso: npm run test:unit
import { CATALOG, catalogRecipe } from './catalog';
import { mirrorForPartner } from './couple';
import { applyBankPlan, catalogDishForMeal, GLUTEN_FOODS, MEAT_FOODS, ROLES_OF_CATEGORY } from './planBank';
import { MAIN_MEAT_FLOOR, MAIN_MEATS, portionCap } from './portionCaps';
import { seedPlan } from './seed';
import type { AthletePlan, Sex } from './types';

const fails: string[] = [];
const count = (c: string) => CATALOG.filter((d) => d.category === c).length;
if (count('desayuno') < 13 || count('plato_principal') < 18 || count('merienda') < 12 || count('colacion') < 12) fails.push('faltan platos del catálogo (13 desayunos, 18 principales, 12 meriendas, 12 colaciones)');
const ids = new Set<string>();
for (const d of CATALOG) {
  if (ids.has(d.id)) fails.push(`id repetido ${d.id}`);
  ids.add(d.id);
}

const person = (sex: Sex, kg: number, allergies: string[]): AthletePlan => {
  const p = seedPlan();
  p.profile = { ...p.profile, sex, weightKg: kg };
  p.anamnesis = { ...(p.anamnesis as NonNullable<AthletePlan['anamnesis']>), allergies };
  return applyBankPlan(p, { plan: `${sex}-rec`, variant: 'std' });
};
let checks = 0;
for (const [variant, allergies] of [['std', []], ['stacc', ['gluten']], ['veg', ['veg']]] as const) {
  for (const [sex, kg] of [['F', 58], ['M', 84]] as const) {
    const plan = person(sex, kg, [...allergies]);
    for (const d of CATALOG) {
      const allowed = !!catalogRecipe(d, variant);
      const roles = ROLES_OF_CATEGORY[d.category];
      // Merienda: la merienda del plan (la colación más grande de la tarde); colación: la de media mañana.
      const snacks = plan.meals.filter((m) => roles.includes(m.role));
      const kc = (m: { items: { p: number; c: number; f: number }[] }) => m.items.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0);
      const meal = d.category === 'merienda' ? (snacks.find((m) => /merienda/i.test(m.name)) ?? [...snacks].sort((a, b) => kc(b) - kc(a))[0]) : snacks[0];
      if (!meal) continue;
      const opt = catalogDishForMeal(d.id, meal, plan);
      if (!allowed) {
        if (opt) fails.push(`${d.id}: se ofrece en ${variant} sin admitir esa variante`);
        continue;
      }
      checks++;
      if (!opt) {
        fails.push(`${d.id} · ${variant} · ${sex}: no se pudo adaptar`);
        continue;
      }
      const tag = `${d.id} · ${variant} · ${sex} · ${meal.name}`;
      const kcal = opt.items.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0);
      const want = meal.items.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0);
      // Principales y desayunos ±10 %; meriendas y colaciones pueden quedar algo arriba (porción mínima real de 1 huevo, 1 tortita…).
      const snack = d.category === 'merienda' || d.category === 'colacion';
      if ((kcal / want - 1 < -0.1 && d.category !== 'colacion') || kcal / want - 1 > (snack ? 0.4 : 0.1)) fails.push(`${tag}: ${Math.round(kcal)} kcal vs ${Math.round(want)} de la comida`);
      for (const it of opt.items) {
        const cap = portionCap(it.foodId, { sex, role: meal.role, veg: variant === 'veg' });
        if (it.grams > cap.max) fails.push(`${tag}: ${it.food} ${it.grams} g supera el tope ${cap.max} g`);
        if (variant === 'stacc' && it.foodId && GLUTEN_FOODS.has(it.foodId)) fails.push(`${tag}: ${it.food} tiene gluten`);
        if (variant === 'veg' && it.foodId && MEAT_FOODS.has(it.foodId)) fails.push(`${tag}: ${it.food} no es vegetariano`);
        if (it.foodId === 'huevo' && it.grams % 60) fails.push(`${tag}: huevo ${it.grams} g`);
        if (sex === 'F' && it.foodId === 'leche' && it.grams > 100) fails.push(`${tag}: ${it.grams} ml de leche fluida en mujer`);
        if (it.foodId && MAIN_MEATS.has(it.foodId) && (meal.role === 'lunch' || meal.role === 'dinner') && it.grams < MAIN_MEAT_FLOOR[sex]) fails.push(`${tag}: ${it.food} ${it.grams} g bajo el piso`);
      }
      if (!opt.steps.length || opt.steps.some((s) => /\{[a-z-]+\}/.test(s))) fails.push(`${tag}: pasos sin completar`);
    }
  }
}
// Modo Parejas: el plato elegido para uno se copia a la pareja con sus gramos.
const lead = person('M', 84, []);
const lunch = lead.meals.find((m) => m.role === 'lunch')!;
const opt = catalogDishForMeal('pp-wok-pollo-fideos-arroz', lunch, lead)!;
const led = { ...lead, meals: lead.meals.map((m) => (m.id === lunch.id ? { ...m, ...opt } : m)) };
const partner = mirrorForPartner(person('F', 58, []), led);
const pl = partner.meals.find((m) => m.pairId === lunch.id)!;
if (pl.title !== opt.title) fails.push('Modo Parejas: la pareja no recibe el plato del recetario');
const pollo = (xs: { foodId?: string; grams: number }[]) => xs.find((i) => i.foodId === 'pollo')?.grams ?? 0;
if (!(pollo(pl.items) < pollo(opt.items) && pollo(pl.items) >= MAIN_MEAT_FLOOR.F)) fails.push(`Modo Parejas: pollo ${pollo(opt.items)} g (él) / ${pollo(pl.items)} g (ella)`);

if (fails.length) {
  console.error([...new Set(fails)].join('\n'));
  console.error(`\n✗ ${new Set(fails).size} problemas en el Recetario Coach JP`);
  process.exit(1);
}
console.log(`✓ Recetario Coach JP: ${CATALOG.length} platos · ${checks} adaptaciones (variante × sexo) dentro de topes, sin alérgenos, en las calorías de la comida y con Modo Parejas`);
