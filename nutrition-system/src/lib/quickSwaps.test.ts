// Reemplazos rápidos 1 a 1 y desglose del 100 % calórico. Uso: npm run test:unit
import { macroSplit, QUICK_SWAPS, quickSwapItems } from './quickSwaps';
import { itemFromFood } from './seed';

const fails: string[] = [];
const sw = (id: string) => QUICK_SWAPS.flatMap((g) => g.items).find((x) => x.id === id)!;
// Cada equivalencia de la tarjeta aporta su macro de referencia (±35 %): ~25 g P, ~40 g C, ~10 g G.
for (const g of QUICK_SWAPS) {
  const want = { p: 25, c: 40, f: 10 }[g.k];
  for (const x of g.items) {
    const tot = x.parts.reduce((a, [id, gr]) => a + itemFromFood(id, gr)[g.k], 0);
    if (Math.abs(tot / want - 1) > 0.35) fails.push(`${x.label}: ${tot.toFixed(1)} g de ${g.k} (referencia ${want} g)`);
  }
}
// Pollo 100 g cocido → huevos: mismo aporte de proteína, en huevos enteros.
const pollo = { ...itemFromFood('pollo', 100), id: 'x1' };
const eggs = quickSwapItems(pollo, sw('huevo'), { sex: 'M', role: 'lunch' });
if (eggs.length !== 1 || eggs[0].foodId !== 'huevo' || eggs[0].grams % 60 || eggs[0].id !== 'x1') fails.push(`pollo → huevos: ${JSON.stringify(eggs.map((e) => [e.foodId, e.grams]))}`);
if (Math.abs(eggs[0].p - pollo.p) > 8) fails.push(`pollo → huevos: proteína ${eggs[0].p.toFixed(1)} vs ${pollo.p.toFixed(1)}`);
// Compuesto: yogur + claras (2 ítems, claras de a una).
const yc = quickSwapItems(pollo, sw('yogur'), { sex: 'F', role: 'breakfast' });
if (yc.length !== 2 || yc[1].foodId !== 'claras' || yc[1].grams % 33) fails.push(`pollo → yogur + claras: ${JSON.stringify(yc.map((e) => [e.foodId, e.grams]))}`);
if (yc.some((x) => x.grams > 200 && x.foodId === 'yogur')) fails.push('yogur por encima del pote de 200 g');
// Arroz 200 g → papa: mismos carbos.
const arroz = itemFromFood('arroz', 200);
const papa = quickSwapItems(arroz, sw('papa'), { sex: 'M', role: 'dinner' })[0];
if (Math.abs(papa.c - arroz.c) > 6) fails.push(`arroz → papa: ${papa.c.toFixed(1)} vs ${arroz.c.toFixed(1)} g de carbos`);
// El desglose suma exactamente 100 %.
for (const m of [{ p: 140, c: 300, f: 60 }, { p: 106, c: 144, f: 48 }, { p: 1, c: 0, f: 0 }]) {
  const s = macroSplit(m);
  if (s.p.pct + s.c.pct + s.f.pct !== 100) fails.push(`desglose ${JSON.stringify(m)} suma ${s.p.pct + s.c.pct + s.f.pct} %`);
}
if (fails.length) {
  console.error(fails.join('\n'));
  console.error(`\n✗ ${fails.length} problemas en los reemplazos rápidos`);
  process.exit(1);
}
console.log('✓ Reemplazos rápidos 1 a 1: equivalencias coherentes, unidades enteras, topes y desglose al 100 %');
