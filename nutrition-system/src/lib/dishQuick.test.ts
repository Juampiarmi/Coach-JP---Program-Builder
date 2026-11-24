// Carga rápida de platos (motor local): ingredientes en lenguaje natural → receta, macros, alérgenos y categoría.
// Uso: npm run test:unit
import { quickDishLocal, quickToBrandFood, parseIngredient } from './dishQuick';
import { auditDish } from './dishAudit';
import { emptyDishBase } from './foodBrandDb';

const fails: string[] = [];
const ok = (c: boolean, m: string) => !c && fails.push(m);
const g = (d: ReturnType<typeof quickDishLocal>, id: string) => d.items.find((i) => i.foodId === id)?.grams;

const t = quickDishLocal({ name: 'tortilla de berenjena y zucchini', ingredients: '3 huevos, 1 zucchini, media berenjena, 1 cda aceite de oliva, condimentos', tip: 'Hacerla vuelta y vuelta en sartén antiadherente tapada para que quede jugosa' });
ok(g(t, 'huevo') === 180 && g(t, 'zucchini') === 200 && g(t, 'berenjena') === 125 && g(t, 'oliva') === 13, `tortilla: gramos ${JSON.stringify(t.items.map((i) => [i.foodId, i.grams]))}`);
ok(t.category === 'tortilla' && t.allergens.join() === 'egg', `tortilla: categoría ${t.category} / alérgenos ${t.allergens}`);
ok(t.steps.length >= 4 && t.steps.some((s) => /Tip: Hacerla vuelta y vuelta/.test(s)) && t.steps.some((s) => /Batí 3 huevos/.test(s)), 'tortilla: pasos reales con el tip integrado');
ok(Math.abs(t.totals.kcal - (t.totals.p * 4 + t.totals.c * 4 + t.totals.f * 9)) < 3 && t.totals.kcal > 380 && t.totals.kcal < 500, `tortilla: macros ${JSON.stringify(t.totals)}`);
ok(t.items.every((i) => i.household), 'tortilla: medidas caseras en todos los ingredientes');
ok(t.name === 'Tortilla de berenjena y zucchini', 'tortilla: nombre con mayúscula inicial');

const p = quickDishLocal({ name: 'Panqueques de avena y yogur', ingredients: '40 g de avena\n1 huevo\n2 claras\n50 g de yogur griego\n1 cdita de polvo de hornear\nesencia de vainilla' });
ok(p.category === 'desayuno' && ['gluten', 'egg', 'lactose', 'dairy'].every((a) => p.allergens.includes(a as never)), `panqueques: ${p.category} / ${p.allergens}`);
ok(p.seasonings.length === 2 && p.steps.some((s) => /reposar/i.test(s)) && p.steps.some((s) => /vuelta/.test(s)), 'panqueques: polvo de hornear y vainilla como básicos, reposo y vuelta y vuelta');

// Cantidades caseras.
const one = (s: string) => parseIngredient(s) as { foodId?: string; grams?: number; unknown?: string; seasoning?: string };
ok(one('1 lata de atún').grams === 120 && one('1/2 palta').grams === 80 && one('2 tazas de espinaca').grams === 60, 'cantidades: lata, media palta, tazas');
ok(one('1 cdita de aceite de oliva').grams === 5 && one('200 g de pechuga de pollo').grams === 200 && one('2 claras').grams === 66, 'cantidades: cdita, gramos y claras');
ok(!!one('harina de mandioca').unknown, 'ingrediente desconocido: se avisa en vez de inventar');
ok(!!one('sal y pimienta').seasoning, 'condimentos: sin calorías');

// Celíaco: lo que no está en la base pero el nombre delata gluten también se etiqueta.
const pan = quickDishLocal({ name: 'Sándwich de milanesa casera', ingredients: '1 pan de miga, 150 g de nalga, 1 huevo, pan rallado' });
ok(pan.allergens.includes('gluten') && pan.allergens.includes('egg'), `alérgenos por nombre: ${pan.allergens}`);

// Lo cargado así pasa la auditoría de platos guardados.
const bf = quickToBrandFood(t, emptyDishBase());
ok(auditDish(bf).length === 0, `auditoría del plato cargado: ${JSON.stringify(auditDish(bf))}`);
const custom = quickToBrandFood(t, emptyDishBase(), 'Tortillas de verduras');
ok(custom.categoria === 'custom' && custom.catLabel === 'Tortillas de verduras', 'categoría propia del coach');

if (fails.length) {
  console.error(fails.join('\n'));
  console.error(`\n✗ ${fails.length} problemas en la carga rápida de platos`);
  process.exit(1);
}
console.log('✓ Carga rápida de platos: ingredientes en lenguaje natural, gramos y medidas, macros, pasos con tip, alérgenos y categoría');
