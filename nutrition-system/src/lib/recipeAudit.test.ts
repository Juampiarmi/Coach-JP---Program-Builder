// Auditoría culinaria del recetario: cada receta del banco y del generador de opciones tiene un título que nombra
// lo que lleva, ingredientes que se usan en la preparación y pasos que sólo hablan de ingredientes reales.
// Uso: npm run test:unit
import { FOOD_BY_ID } from './foods';
import { COMBOS, type ComboPart } from './menuOptions';
import { GLUTEN_FOODS, MEAT_FOODS, RECIPES } from './planBank';
import { CATALOG } from './catalog';

/** Palabras del título → alimentos que las justifican. */
const TITLE_WORDS: [RegExp, string[]][] = [
  [/\b(pollo|pechuga)\b/i, ['pollo']],
  [/\bhuevos?\b|omelette|revuelto/i, ['huevo', 'claras']],
  [/\bclaras\b/i, ['claras']],
  [/\bavena\b/i, ['avena', 'avena-instantanea', 'harina-avena', 'avena-sin-tacc']],
  [/\byogur\b/i, ['yogur', 'yogur-proteico', 'yogur-deslactosado', 'yogur-vegetal']],
  [/\bbanana\b/i, ['banana']],
  [/\bfrutillas\b/i, ['frutillas']],
  [/\bpalta\b/i, ['palta']],
  [/\bat[uú]n\b/i, ['atun']],
  [/\bmerluza\b/i, ['merluza']],
  [/\blentejas\b/i, ['lentejas']],
  [/\bgarbanzos\b/i, ['garbanzos']],
  [/\bporotos\b/i, ['porotos']],
  [/\btofu\b/i, ['tofu']],
  [/\bricota\b/i, ['ricota']],
  [/\bjam[oó]n\b/i, ['jamon']],
  [/\bbatatas?\b/i, ['batata']],
  [/\bpolenta\b/i, ['polenta']],
  [/\bfideos\b/i, ['fideos', 'fideos-sin-tacc', 'fideos-integrales', 'fideos-legumbres']],
  [/\bñoquis\b/i, ['noquis']],
  [/\bcalabaza\b/i, ['calabaza']],
  [/\bmiel\b/i, ['miel']],
  [/\bmanzana\b/i, ['manzana']],
  [/\bmandarina\b/i, ['naranja']],
  [/\bnueces|frutos secos\b/i, ['nueces', 'semillas']],
  [/\bman[ií]\b/i, ['mani']],
  [/\bgranola\b/i, ['granola', 'granola-sin-tacc']],
  [/\bquinoa\b/i, ['quinoa']],
  [/\bpera\b/i, ['pera']],
  [/\bar[aá]ndanos\b/i, ['arandanos']],
  [/\bhummus\b/i, ['hummus']],
  [/\bchampi[ñn]ones\b/i, ['champinones']],
  [/\bespinaca\b/i, ['espinaca']],
  [/\bmembrillo\b/i, ['dulce-membrillo']],
  [/\bqueso untable\b/i, ['untable', 'untable-deslactosado']],
  [/\bwhey|proteína en polvo\b/i, ['whey', 'whey-isolate', 'proteina-vegetal']],
];
/** Proteína y carbo que definen el plato → cómo se los nombra en el título. */
const NAMED: Record<string, RegExp> = {
  pollo: /pollo|pechuga/i,
  cuadril: /cuadril|bife/i,
  lomo: /lomo/i,
  nalga: /peceto|nalga|milanesa|carne|bife/i,
  picada: /picada|bolognesa|hamburguesa|carne|alb[oó]ndiga/i,
  merluza: /merluza|pescado/i,
  atun: /at[uú]n/i,
  huevo: /huevo|omelette|revuelt|tortilla|panqueque/i,
  claras: /clara|omelette|panqueque|huevo/i,
  tofu: /tofu/i,
  'soja-texturizada': /soja/i,
  arroz: /arroz/i,
  yamani: /arroz|yaman/i,
  papa: /papa|puré/i,
  batata: /batata/i,
  fideos: /fideos/i,
  'fideos-sin-tacc': /fideos/i,
  noquis: /ñoquis/i,
  polenta: /polenta/i,
  lentejas: /lentejas/i,
  garbanzos: /garbanzos/i,
  porotos: /porotos/i,
  avena: /avena/i,
  pan: /pan|tostad|sándwich|tostado/i,
  'pan-sin-tacc': /pan|tostad|sándwich/i,
  'pan-lactal': /pan|sándwich/i,
  'galletas-arroz': /galletas/i,
  'tostadas-arroz': /tostadas/i,
  'harina-arroz': /harina de arroz|panqueque/i,
  'avena-sin-tacc': /avena/i,
  quinoa: /quinoa/i,
  'fideos-integrales': /fideos/i,
  'fideos-legumbres': /fideos/i,
  'tapa-tarta': /tarta/i,
  'tortillas-maiz': /tortillas/i,
  leche: /leche|licuado/i,
  cerdo: /cerdo|solomillo|bondiola|carr[eé]/i,
  yogur: /yogur/i,
  ricota: /ricota/i,
  jamon: /jam[oó]n/i,
  'queso-light': /queso/i,
};

const fails: string[] = [];
let checks = 0;
type Rec = { title: string; parts: ComboPart[]; steps?: string[] };
function audit(where: string, r: Rec) {
  const ids = new Set(r.parts.map((p) => p.id));
  const text = (r.steps ?? []).join(' ');
  const title = r.title.replace(/\[[^\]]*\]/g, (m) => m.slice(1, m.indexOf('|') > 0 ? m.indexOf('|') : -1));
  checks++;
  for (const id of r.parts.map((p) => p.id)) if (!FOOD_BY_ID[id]) fails.push(`${where} · ${r.title}: ingrediente desconocido «${id}»`);
  // 1 · Los pasos sólo nombran ingredientes de la receta.
  for (const m of text.matchAll(/\{([a-z-]+)\}/g)) if (!ids.has(m[1])) fails.push(`${where} · ${r.title}: el paso usa {${m[1]}} que no está en los ingredientes`);
  // 2 · Todo ingrediente se usa en la preparación.
  for (const p of r.parts) if (!text.includes(`{${p.id}}`)) fails.push(`${where} · ${r.title}: «${FOOD_BY_ID[p.id]?.name ?? p.id}» no aparece en los pasos`);
  // 3 · Lo que dice el título está en el plato.
  // Las alternativas entre paréntesis («(o pera)», «(o manzana)») son sugerencias, no ingredientes.
  const named = title.replace(/\(o [^)]*\)/g, '');
  for (const [re, foods] of TITLE_WORDS) if (re.test(named) && !foods.some((f) => ids.has(f))) fails.push(`${where} · ${r.title}: el título nombra ${re.source} pero no lleva ${foods.join(' / ')}`);
  // 4 · La proteína y el carbo que definen el plato están en el título.
  for (const p of r.parts.filter((x) => (x.r === 'p' || x.r === 'c') && (x.min ?? 1) > 0)) {
    const re = NAMED[p.id];
    if (re && !re.test(title)) fails.push(`${where} · ${r.title}: la base «${FOOD_BY_ID[p.id].name}» no figura en el título`);
  }
}
for (const [variant, slots] of Object.entries(RECIPES)) for (const [slot, list] of Object.entries(slots)) for (const r of list) audit(`banco ${variant}/${slot}`, r);
for (const c of COMBOS) audit('opciones', c);
for (const d of CATALOG) {
  for (const [v, r] of [['estándar', d.std], ['sin TACC', d.stacc], ['vegetariana', d.veg]] as const) {
    if (!r) continue;
    audit(`recetario ${v} · ${d.id}`, r);
    if (r.female) audit(`recetario ${v} (mujer) · ${d.id}`, r.female);
  }
  if (d.variants.includes('Sin TACC')) for (const p of (d.stacc ?? d.std).parts) if (GLUTEN_FOODS.has(p.id)) fails.push(`recetario sin TACC · ${d.id}: lleva ${p.id}`);
  if (d.variants.includes('Vegetariana')) for (const p of (d.veg ?? d.std).parts) if (MEAT_FOODS.has(p.id)) fails.push(`recetario vegetariano · ${d.id}: lleva ${p.id}`);
  if (!d.prep || !d.adjust || !d.base.length) fails.push(`recetario · ${d.id}: faltan preparación, guía de ajuste o ingredientes base`);
}

const uniq = [...new Set(fails)];
if (uniq.length) {
  console.error(uniq.join('\n'));
  console.error(`\n✗ ${uniq.length} incoherencias en el recetario`);
  process.exit(1);
}
console.log(`✓ Recetario: ${checks} recetas con título, ingredientes y pasos coherentes`);

// Platos de fábrica de la Food & Brand DB: nombre, composición, macros y pasos coherentes.
import('./foodBrandDb').then(async ({ seedFoodDb, DISH_CATEGORIES }) => {
  const { auditDish } = await import('./dishAudit');
  const bad: string[] = [];
  const dishes = seedFoodDb().filter((b) => DISH_CATEGORIES.includes(b.categoria));
  for (const b of dishes) for (const i of auditDish(b)) bad.push(`plato «${b.nombre}»: ${i.msg}`);
  if (bad.length) {
    console.error(bad.join('\n'));
    console.error(`\n✗ ${bad.length} platos de fábrica para corregir`);
    process.exit(1);
  }
  console.log(`✓ Platos de fábrica: ${dishes.length} con nombre, composición, macros y preparación coherentes`);
});

// Tabla de alimentos base: lo cotidiano para cocinar en Argentina, valores por 100 g plausibles, medida casera en
// verduras y alérgenos etiquetados (lo que el nombre delata tiene que estar en la etiqueta).
Promise.all([import('./foods'), import('./allergens'), import('./anamnesisPro'), import('./household')]).then(([{ FOODS, FOOD_BY_ID: BY }, { FOOD_ALLERGENS, ALLERGENS }, { allergenHits }, { houseMeasure }]) => {
  const bad: string[] = [];
  const NEED = ['berenjena', 'zucchini', 'zapallito', 'calabaza', 'espinaca', 'brocoli', 'morron', 'cebolla', 'tomate', 'zanahoria', 'lechuga', 'pollo', 'cuadril', 'nalga', 'lomo', 'merluza', 'huevo', 'claras', 'avena', 'harina-avena', 'lentejas', 'garbanzos', 'porotos', 'queso-light', 'ricota', 'semillas', 'oliva', 'yogur'];
  for (const id of NEED) if (!BY[id]) bad.push(`falta el alimento cotidiano «${id}»`);
  for (const f of FOODS) {
    const k = f.p * 4 + f.c * 4 + f.f * 9;
    if (!(k >= 0 && k <= 920) || f.p + f.c + f.f > 101) bad.push(`${f.name}: valores por 100 g imposibles`);
    if (f.group === 'veg' && f.id !== 'vegetales' && !houseMeasure(f.id, f.unit?.grams ?? 100)) bad.push(`${f.name}: sin medida casera`);
    const named = allergenHits(f.name, ALLERGENS as unknown as string[]);
    const tagged = FOOD_ALLERGENS[f.id] ?? [];
    for (const a of named) if (!tagged.includes(a as never)) bad.push(`${f.name}: el nombre indica «${a}» pero no está etiquetado`);
  }
  if (bad.length) {
    console.error(bad.join('\n'));
    console.error(`\n✗ ${bad.length} problemas en la tabla de alimentos`);
    process.exit(1);
  }
  console.log(`✓ Alimentos base: ${FOODS.length} con valores por 100 g, medida casera y alérgenos coherentes`);
});
