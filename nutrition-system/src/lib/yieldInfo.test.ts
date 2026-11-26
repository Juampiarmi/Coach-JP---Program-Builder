// Rendimiento (porción individual vs receta de molde / tanda) y conservación. Uso: npm run test:unit
import { CATALOG } from './catalog';
import { quickDishLocal, quickToBrandFood } from './dishQuick';
import { dishYield, emptyDishBase } from './foodBrandDb';
import { inferYield, isYieldStep, yieldLabel } from './yieldInfo';

const fails: string[] = [];
const expectBatch = ['pp-tarta-pollo-vegetales', 'pp-tarta-carne', 'pp-tarta-atun', 'pp-pastel-papa', 'pp-lentejas-guisadas', 'pp-carne-desmenuzada', 'pp-pasta-albondigas', 'pp-hamburguesas-ensalada', 'mer-tortitas-avena-zanahoria'];
for (const d of CATALOG) {
  const big = d.yieldType === 'batch';
  if (expectBatch.includes(d.id) && !big) fails.push(`${d.id}: debería rendir varias porciones`);
  if (/mug cake|tortilla (esponjosa|r[aá]pida) de avena/i.test(d.title) && big) fails.push(`${d.id}: es individual`);
  if (!d.storage) fails.push(`${d.id}: sin conservación`);
  for (const r of [d.std, d.stacc, d.veg].filter(Boolean)) {
    const first = r!.steps[0] ?? '';
    if (big && !(isYieldStep(first) && first.includes(`${d.servings} porciones`) && /TU porción/.test(first))) fails.push(`${d.id}: el primer paso no aclara el rendimiento («${first.slice(0, 60)}»)`);
    if (!big && r!.steps.some(isYieldStep)) fails.push(`${d.id}: plato individual con paso de rendimiento`);
    if (r!.steps.filter(isYieldStep).length > 1) fails.push(`${d.id}: paso de rendimiento repetido`);
  }
}
const label = yieldLabel(inferYield('Tarta de pollo y verduras')!);
if (!/Rinde 1 tarta mediana .*= 4 porciones · Los gramos de tu plan corresponden a 1 porción \(¼ de tarta\)/.test(label)) fails.push(`etiqueta de tarta: ${label}`);
for (const t of ['Budín de banana y avena', 'Tortilla de papa y cebolla', 'Guiso de lentejas', 'Lasaña de vegetales', 'Pan proteico de avena']) if (inferYield(t)?.yieldType !== 'batch') fails.push(`${t}: no se reconoce como tanda`);
for (const t of ['Tortilla esponjosa de avena y huevo', 'Mug cake de banana', 'Pollo a la plancha con arroz', 'Wrap de pollo']) if (inferYield(t)) fails.push(`${t}: es individual`);

// Carga rápida: tarta cargada entera → se divide por porción y queda con su rendimiento y conservación.
const q = quickDishLocal({ name: 'Tarta de zapallitos y queso', ingredients: '2 tapas de tarta, 6 zapallitos, 4 huevos, 200 g de queso light, 1 cebolla', tip: '' });
if (q.yieldInfo.yieldType !== 'batch' || q.yieldInfo.servings !== 4) fails.push(`carga rápida: tarta sin rendimiento (${JSON.stringify(q.yieldInfo)})`);
if (q.dividedFrom !== 4 || q.totals.kcal > 700) fails.push(`carga rápida: la receta entera no se dividió por porción (${q.totals.kcal} kcal)`);
if (!isYieldStep(q.steps[0])) fails.push('carga rápida: el primer paso no aclara el rendimiento');
const b = quickToBrandFood(q, emptyDishBase());
if (b.yieldType !== 'batch' || b.servings !== 4 || !b.storage) fails.push('carga rápida: el plato guardado no conserva rendimiento y conservación');
if (dishYield({ nombre: 'Ensalada de pollo', yieldType: 'individual' }).yieldType !== 'individual') fails.push('dishYield individual');
const ind = quickDishLocal({ name: 'Omelette de espinaca', ingredients: '2 huevos, espinaca, 30 g de queso', tip: '' });
if (ind.yieldInfo.yieldType !== 'individual' || ind.dividedFrom) fails.push('carga rápida: omelette debería ser individual');

if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log(`✓ Rendimiento: ${CATALOG.filter((d) => d.yieldType === 'batch').length} platos de molde / tanda del recetario con porciones, fracción y conservación en el primer paso; carga rápida que divide la receta entera`);
