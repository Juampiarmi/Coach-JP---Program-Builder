import { aiText } from './ai';
import { ALLERGEN_INFO, type Allergen, isDietTag, itemAllergens } from './allergens';
import { allergenHits } from './anamnesisPro';
import type { BrandCategory, BrandFood } from './foodBrandDb';
import { FOOD_BY_ID, macrosFor, matchFood, snapUnit, unitStep } from './foods';
import { houseMeasure } from './household';
import type { FoodSlot } from './mealSlots';
import type { AiSettings } from './types';
import { individual, inferYield, stepsWithYield, type YieldInfo } from './yieldInfo';

/**
 * CARGA RÁPIDA DE PLATOS: el coach escribe nombre + ingredientes aproximados + un tip, y el sistema devuelve la receta
 * lista para guardar: ingredientes mapeados a la base con gramos y medida casera, macros, pasos ordenados con el tip
 * integrado, alérgenos y categoría sugerida. Con API key de IA, la IA ordena y redacta; los gramos, macros y alérgenos
 * siempre se calculan con la base del sistema (nunca se inventan números).
 */
export interface QuickInput {
  name: string;
  ingredients: string;
  tip?: string;
}
export interface QuickItem {
  foodId: string;
  food: string;
  grams: number;
  household: string;
  /** Texto original del coach ("media berenjena"). */
  from: string;
}
export interface QuickDish {
  name: string;
  items: QuickItem[];
  /** Condimentos y básicos sin calorías relevantes (sal, ajo, vainilla, polvo de hornear…). */
  seasonings: string[];
  /** Lo que no se pudo reconocer (se avisa al coach). */
  unknown: string[];
  totals: { g: number; kcal: number; p: number; c: number; f: number; leucine: number };
  steps: string[];
  allergens: Allergen[];
  category: BrandCategory;
  momentos: FoodSlot[];
  prepMin: number;
  /** 'ia' si la IA ordenó y redactó; 'local' si se resolvió con el motor propio. */
  source: 'ia' | 'local';
  /** Rendimiento (porción individual o receta de molde / tanda) y conservación. */
  yieldInfo: YieldInfo;
  /** Receta de molde cargada entera: los gramos de `items` ya están divididos por porción. */
  dividedFrom?: number;
}

type YieldHint = { type?: string; servings?: number; storage?: string } | null;

const SEASONING = /^(sal|pimienta|or[eé]gano|ajo|perejil|condimentos?|especias?|comino|piment[oó]n|nuez moscada|lim[oó]n|jugo de lim[oó]n|vinagre|agua|vainilla|esencia|polvo de hornear|edulcorante|canela|cacao amargo|aceto|mostaza|ciboulette|albahaca|romero|tomillo|caldo|provenzal|aj[ií] molido|curry|c[uú]rcuma|jengibre|spray|rocío vegetal|hielo)\b/i;
const NUM_WORDS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, diez: 10, medio: 0.5, media: 0.5, '½': 0.5, '¼': 0.25, cuarto: 0.25 };
/** Unidades caseras → gramos (si el alimento no trae la suya). */
const UNITS: [RegExp, number | ((id: string) => number)][] = [
  [/^(kg|kilos?)\b/, 1000],
  [/^(g|gr|grs|gramos?)\b/, 1],
  [/^(ml|cc|mililitros?)\b/, 1],
  [/^(l|litros?)\b/, 1000],
  [/^(cdas?|cucharadas?)( soperas?)?\b/, (id) => (id === 'oliva' ? 13 : id === 'miel' ? 20 : id === 'mani' ? 16 : 15)],
  [/^(cditas?|cucharaditas?)\b/, (id) => (id === 'oliva' ? 5 : id === 'miel' ? 7 : 5)],
  [/^(tazas?)\b/, (id) => FOOD_BY_ID[id]?.unit?.label === 'taza' ? FOOD_BY_ID[id].unit!.grams : 200],
  [/^(latas?)\b/, (id) => (id === 'atun' ? 120 : 240)],
  [/^(fetas?)\b/, (id) => (id === 'jamon' ? 20 : 15)],
  [/^(rebanadas?|rodajas?)\b/, (id) => (id === 'pan' || id === 'pan-sin-tacc' ? 30 : 25)],
  [/^(pu[nñ]ados?)\b/, (id) => (FOOD_BY_ID[id]?.group === 'fat' ? 15 : 30)],
  [/^(scoops?|medidas?)\b/, 30],
  [/^(potes?)\b/, 190],
  [/^(unidad(es)?|u|piezas?)\b/, (id) => FOOD_BY_ID[id]?.unit?.grams ?? 100],
];
/** Porción por defecto cuando no hay cantidad ("cebolla", "aceite de oliva"). */
/** Peso de 1 unidad entera de lo que no trae unidad en la base. */
const COUNT_G: Record<string, number> = { palta: 160, frutillas: 15, champinones: 15, papa: 200, batata: 250, calabaza: 300, tofu: 100 };
const DEFAULT_G: Record<string, number> = { oliva: 5, miel: 10, semillas: 10, nueces: 15, mani: 15, queso: 30, 'queso-light': 30, untable: 15 };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const short = (id: string) => FOOD_BY_ID[id].name.split(' (')[0].split(' / ')[0].toLowerCase();

/** Separa "3 huevos, 1 zucchini, media berenjena y 1 cda de aceite" en ingredientes sueltos. */
export function splitIngredients(text: string) {
  return text
    .split(/\n|,|;|\+|\s+y\s+(?=\d|un|una|medi|dos|tres|cuatro|½)/i)
    .map((x) => x.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean);
}

/** Un ingrediente en lenguaje natural → alimento de la base + gramos reales. */
export function parseIngredient(raw: string): QuickItem | { seasoning: string } | { unknown: string } {
  let t = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (SEASONING.test(t.replace(/^(\d+[.,]?\d*|un|una|media|medio)\s+(cditas?|cucharaditas?|cdas?|cucharadas?|pizcas?|chorritos?|gotas?)\s+(de\s+)?/, ''))) return { seasoning: raw.trim() };
  if (/^(a gusto|c\/n|cantidad necesaria)/.test(t)) return { seasoning: raw.trim() };
  let qty: number | null = null;
  const num = /^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?\s*/.exec(t);
  if (num) {
    qty = num[2] ? Number(num[1]) / Number(num[2]) : Number(num[1].replace(',', '.'));
    t = t.slice(num[0].length);
  } else {
    const w = /^(\S+)\s+/.exec(t);
    if (w && NUM_WORDS[w[1]] !== undefined) {
      qty = NUM_WORDS[w[1]];
      t = t.slice(w[0].length);
    }
  }
  // "1 y media" / "1 ½"
  const half = /^(y medi[oa]|½)\s+/.exec(t);
  if (half && qty !== null) {
    qty += 0.5;
    t = t.slice(half[0].length);
  }
  let unit: (typeof UNITS)[number] | undefined;
  for (const u of UNITS) {
    const m = u[0].exec(t);
    if (m) {
      unit = u;
      t = t.slice(m[0].length).replace(/^\s*(de\s+)?/, '');
      break;
    }
  }
  const name = t.replace(/\b(grande|chic[oa]|median[oa]|picad[oa]s?|rallad[oa]s?|cortad[oa]s?|en cubos|en rodajas|fresc[oa]s?|crud[oa]s?|cocid[oa]s?)\b/g, '').trim();
  // Primero la base de alimentos (un ingrediente nunca es un plato armado); después las marcas propias del coach.
  const q = name || t;
  const custom = matchFood(q);
  const ref = matchFood(q, { baseOnly: true }) ?? (custom && custom.group !== 'plato' ? custom : undefined);
  if (!ref || ref.group === 'plato') return { unknown: raw.trim() };
  const id = ref.id;
  let grams: number;
  if (unit) grams = (qty ?? 1) * (typeof unit[1] === 'function' ? unit[1](id) : unit[1]);
  else if (qty !== null) grams = qty >= 15 && !ref.unit ? qty : qty * (ref.unit?.grams ?? COUNT_G[id] ?? (qty >= 15 ? 1 : 100));
  else grams = DEFAULT_G[id] ?? ref.unit?.grams ?? 100;
  grams = unitStep(id) !== 5 ? snapUnit(id, grams) : Math.max(1, Math.round(grams));
  return { foodId: id, food: ref.name, grams, household: houseMeasure(id, grams), from: raw.trim() };
}

/** Categoría sugerida por el nombre y lo que lleva (editable antes de guardar). */
export function suggestCategory(name: string, ids: string[]): BrandCategory {
  const n = name.toLowerCase();
  const g = (grp: string) => ids.some((id) => FOOD_BY_ID[id]?.group === grp);
  if (/tortilla|omelette|revuelto|frittata|tarta|pascualina|quiche|fritata/.test(n)) return 'tortilla';
  if (/ensalada|bowl verde/.test(n)) return 'ensalada';
  if (/licuado|batido|smoothie|shake/.test(n)) return 'licuado';
  if (/postre|mousse|flan|helado|gelatina|brownie|budin|budín|cheesecake/.test(n)) return 'postre';
  if (/panqueque|pancake|tostada|avena|overnight|yogur|granola|desayuno|merienda/.test(n)) return 'desayuno';
  if (/snack|barrita|bocadito|bolitas|galleta|chips/.test(n)) return 'colacion';
  if (/guarnici[oó]n|pur[eé]|salteado de verduras|verduras asadas|al vapor/.test(n) || (g('veg') && !g('lean-protein') && !g('eggs') && !g('starch'))) return 'guarnicion';
  return 'principal';
}

const slotsOf = (cat: BrandCategory, name: string): FoodSlot[] =>
  cat === 'desayuno' ? ['am'] : cat === 'licuado' || cat === 'colacion' || cat === 'postre' ? ['am', 'peri'] : cat === 'tortilla' && !/tarta|pascualina/i.test(name) ? ['main', 'am'] : ['main'];

/** Pasos locales: técnica real según el tipo de plato, con el tip del coach integrado. */
function localSteps(name: string, items: QuickItem[], seasonings: string[], tip: string, cat: BrandCategory): string[] {
  const has = (grp: string) => items.filter((i) => FOOD_BY_ID[i.foodId]?.group === grp);
  const list = (xs: QuickItem[]) => xs.map(qtyText).join(', ').replace(/, ([^,]*)$/, ' y $1');
  const veg = has('veg');
  const eggs = has('eggs');
  const oil = items.find((i) => i.foodId === 'oliva');
  const oilTxt = oil ? qtyText(oil) : '';
  const cond = seasonings.length ? seasonings.join(', ').toLowerCase() : 'sal, pimienta y las hierbas que te gusten';
  const n = name.toLowerCase();
  const steps: string[] = [];
  if (/panqueque|pancake/.test(n)) {
    steps.push(`Mixeá ${list(items.filter((i) => !['fruit', 'sport-carb'].includes(FOOD_BY_ID[i.foodId].group)))} hasta lograr una mezcla lisa (sumá ${cond}).`);
    steps.push('Dejá reposar 5 min para que se hidrate.');
    steps.push('En sartén antiadherente a fuego medio-bajo, cociná de a 2-3 cucharadas: cuando aparecen burbujitas, dalos vuelta y 1-2 min más.');
    const top = items.filter((i) => ['fruit', 'sport-carb'].includes(FOOD_BY_ID[i.foodId].group));
    if (top.length) steps.push(`Serví con ${list(top)}.`);
  } else if (cat === 'tortilla' && eggs.length) {
    if (veg.length) steps.push(`Lavá y cortá ${list(veg)} en rodajas finas o cubitos.`);
    if (veg.length) steps.push(`Saltealos en sartén antiadherente${oil ? ` con ${oilTxt}` : ' con rocío vegetal'} a fuego medio 6-8 min, hasta que estén tiernos.`);
    const rest = items.filter((i) => !veg.includes(i) && !eggs.includes(i) && i !== oil);
    steps.push(`Batí ${list(eggs)}${rest.length ? ` con ${list(rest)},` : ' con'} ${cond}.`);
    steps.push(`Volcá el batido sobre ${veg.length ? 'las verduras' : 'la sartén caliente'}, tapá y cociná a fuego bajo 5-6 min hasta que cuaje el borde.`);
    steps.push('Dala vuelta con ayuda de un plato y cociná 2-3 min más.');
  } else if (cat === 'licuado') {
    steps.push(`Poné en la licuadora ${list(items)}${seasonings.length ? ` y ${cond}` : ''}.`);
    steps.push('Licuá 30-40 segundos (con hielo si querés) y tomalo en el momento.');
  } else if (cat === 'ensalada') {
    steps.push(`Lavá y cortá ${list(veg.length ? veg : items)}.`);
    const rest = items.filter((i) => !veg.includes(i) && i !== oil);
    if (rest.length) steps.push(`Sumá ${list(rest)}.`);
    steps.push(`Aliñá con ${oil ? `${oilTxt}, ` : ''}${cond} justo antes de servir.`);
  } else {
    const prot = items.filter((i) => ['lean-protein', 'eggs'].includes(FOOD_BY_ID[i.foodId].group));
    const carb = items.filter((i) => ['starch', 'cereal'].includes(FOOD_BY_ID[i.foodId].group));
    if (veg.length) steps.push(`Lavá y cortá ${list(veg)}.`);
    if (prot.length) steps.push(`Cociná ${list(prot)} a la plancha o al horno con ${cond}, hasta que esté bien cocido por dentro.`);
    if (carb.length) steps.push(`Prepará ${list(carb)} (hervido o al horno, según corresponda).`);
    if (veg.length) steps.push(`Saltea o asá las verduras${oil ? ` con ${oilTxt}` : ''} 6-8 min.`);
    const rest = items.filter((i) => !veg.includes(i) && !prot.includes(i) && !carb.includes(i) && i !== oil);
    if (rest.length) steps.push(`Sumá ${list(rest)} al servir.`);
    if (!steps.length) steps.push(`Prepará ${list(items)} con ${cond}.`);
  }
  return integrateTip(steps, tip);
}

/** "3 huevos (180 g)", "40 g de avena (≈ 4 cdas soperas)": la medida casera nombra al alimento o lo acompaña. */
function qtyText(i: QuickItem) {
  const name = short(i.foodId);
  const hh = i.household.replace('≈ ', '');
  const word = name.split(' ')[0].replace(/s$/, '');
  if (hh && hh.toLowerCase().includes(word)) return `${hh} (${i.grams} g)`;
  return `${i.grams} g de ${name}${hh ? ` (≈ ${hh})` : ''}`;
}

/** El tip del coach entra después del paso de cocción con el que más se relaciona (o al final), como consejo. */
function integrateTip(steps: string[], tip: string) {
  const t = tip.trim().replace(/\.$/, '');
  if (!t) return steps;
  const sentence = `👌 Tip: ${cap(t)}.`;
  const KEYS = ['sart', 'tap', 'vuelta', 'fuego', 'horno', 'plancha', 'cocin', 'batí', 'reposa', 'licu', 'serv', 'aliñ'];
  const score = (s: string) => KEYS.filter((k) => s.toLowerCase().includes(k) && t.toLowerCase().includes(k)).length;
  let at = -1;
  let best = 0;
  steps.forEach((s, i) => {
    const sc = score(s);
    if (sc && sc >= best) {
      best = sc;
      at = i;
    }
  });
  const out = [...steps];
  if (at >= 0) out.splice(at + 1, 0, sentence);
  else out.push(sentence);
  return out;
}

function totalsOf(items: QuickItem[]) {
  return items.reduce(
    (a, i) => {
      const m = macrosFor(i.foodId, i.grams)!;
      return { g: a.g + i.grams, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f, leucine: a.leucine + m.leucine, kcal: a.kcal + m.p * 4 + m.c * 4 + m.f * 9 };
    },
    { g: 0, kcal: 0, p: 0, c: 0, f: 0, leucine: 0 },
  );
}

function assemble(input: QuickInput, parsed: ReturnType<typeof parseIngredient>[], steps: string[] | null, catHint: BrandCategory | null, source: 'ia' | 'local', yieldHint: YieldHint = null): QuickDish {
  const items: QuickItem[] = [];
  const seasonings: string[] = [];
  const unknown: string[] = [];
  for (const x of parsed) {
    if ('seasoning' in x) seasonings.push(x.seasoning);
    else if ('unknown' in x) unknown.push(x.unknown);
    else {
      // El mismo alimento dos veces se suma ("2 huevos" + "1 huevo").
      const dup = items.find((i) => i.foodId === x.foodId);
      if (dup) {
        dup.grams += x.grams;
        dup.household = houseMeasure(dup.foodId, dup.grams);
      } else items.push({ ...x });
    }
  }
  const name = cap(input.name.trim() || 'Plato nuevo');
  // Rendimiento: la IA lo declara o se deduce del nombre (tarta, budín, tortilla grande, guiso…). Si la receta de
  // molde se cargó entera (más de ~900 kcal), los gramos se dividen por porción: el plan siempre usa 1 porción.
  // Por el nombre (sin declaración de la IA): una «tortilla de verduras» de 3 huevos es individual, no un molde.
  const named = inferYield(name);
  const guess = named && !yieldHint?.type && totalsOf(items).kcal < 600 ? null : named;
  const servings = Math.round(Number(yieldHint?.servings) || guess?.servings || 0);
  const yieldInfo: YieldInfo =
    (yieldHint?.type === 'batch' || (!yieldHint?.type && guess)) && servings >= 2
      ? { yieldType: 'batch', servings, unit: guess?.unit ?? 'la receta entera', storage: (yieldHint?.storage ?? '').trim() || guess?.storage || 'Se conserva 3–4 días en heladera en recipiente hermético o hasta 2 meses freezada en porciones individuales.' }
      : individual((yieldHint?.storage ?? '').trim() || undefined);
  let dividedFrom: number | undefined;
  if (yieldInfo.yieldType === 'batch' && totalsOf(items).kcal > 900) {
    dividedFrom = yieldInfo.servings;
    for (const it of items) {
      const g = it.grams / yieldInfo.servings;
      it.grams = unitStep(it.foodId) !== 5 ? snapUnit(it.foodId, g) : Math.max(5, Math.round(g / 5) * 5);
      Object.assign(it, macrosFor(it.foodId, it.grams));
      it.household = houseMeasure(it.foodId, it.grams);
    }
  }
  const category = catHint ?? suggestCategory(name, items.map((i) => i.foodId));
  const allergens = [...new Set([...items.flatMap((i) => itemAllergens({ foodId: i.foodId, food: i.food })), ...unknown.flatMap((u) => allergenHits(u, Object.keys(ALLERGEN_INFO)) as Allergen[])])].filter((a) => !isDietTag(a)) as Allergen[];
  const t = totalsOf(items);
  const finalSteps = stepsWithYield(steps?.length ? integrateTip(steps, steps.some((s) => s.includes('Tip')) ? '' : (input.tip ?? '')) : localSteps(name, items, seasonings, input.tip ?? '', category), yieldInfo);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    name,
    items,
    seasonings,
    unknown,
    totals: { g: Math.round(t.g), kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f), leucine: Math.round(t.leucine * 100) / 100 },
    steps: finalSteps,
    allergens,
    category,
    momentos: slotsOf(category, name),
    prepMin: Math.min(60, 5 + finalSteps.length * 4),
    source,
    yieldInfo,
    dividedFrom,
  };
}

/** Motor local (sin IA): siempre disponible. */
export function quickDishLocal(input: QuickInput): QuickDish {
  return assemble(input, splitIngredients(input.ingredients).map(parseIngredient), null, null, 'local');
}

const QUICK_SYSTEM = `Sos chef y nutricionista deportivo en Argentina. Te paso un plato con ingredientes aproximados y un tip.
Devolvé SOLO un JSON: {"ingredients":[{"name":"huevo","amount":"3 unidades"}],"steps":["..."],"category":"tortilla","yield":{"type":"individual","servings":1,"storage":"..."}}.
- ingredients: cada ingrediente real, con nombre simple en castellano rioplatense (huevo, claras, zucchini, berenjena, aceite de oliva, avena, yogur griego…) y cantidad casera o en gramos ("3 unidades", "200 g", "1 cda"). Condimentos (sal, pimienta, ajo, orégano, vainilla, polvo de hornear) como ingredientes con amount "a gusto".
- steps: 3-6 pasos claros, ordenados y reales de cocina casera (cortar, saltear, batir, cocinar, dar vuelta, servir), integrando el tip del coach donde corresponde. Sin cantidades inventadas distintas de las de los ingredientes.
- category: una de desayuno, principal, guarnicion, tortilla, ensalada, colacion, postre, licuado.
- yield: "batch" si se cocina en molde o tanda grande (tarta, budín, tortilla grande, pan proteico, guiso, lasaña, pastel, albóndigas, muffins) con servings = cuántas porciones rinde la receta entera (los ingredientes son los del molde entero); "individual" (servings 1) si es una porción lista para esa comida. storage: una frase breve de conservación y freezer (ej. "3–4 días en heladera en recipiente hermético o hasta 2 meses freezada en porciones individuales").`;

/** Con IA (si hay key): la IA ordena y redacta; gramos, macros y alérgenos los calcula la base. Si falla, motor local. */
export async function quickDish(input: QuickInput, ai?: AiSettings): Promise<QuickDish & { aiError?: string }> {
  if (!ai?.apiKey?.trim()) return quickDishLocal(input);
  try {
    const raw = await aiText(ai, QUICK_SYSTEM, `Plato: ${input.name}\nIngredientes: ${input.ingredients}\nTip del coach: ${input.tip || '(sin tip)'}`);
    const j = JSON.parse(raw.replace(/```(?:json)?/gi, '').slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { ingredients?: { name: string; amount?: string }[]; steps?: string[]; category?: string; yield?: YieldHint };
    const parsed = (j.ingredients ?? []).map((x) => parseIngredient(/a gusto/i.test(x.amount ?? '') ? x.name : `${x.amount ?? ''} ${x.name}`.trim()));
    if (!parsed.some((x) => 'foodId' in x)) throw new Error('La IA no devolvió ingredientes reconocibles.');
    const cats: BrandCategory[] = ['desayuno', 'principal', 'guarnicion', 'tortilla', 'ensalada', 'colacion', 'postre', 'licuado'];
    const cat = cats.includes(j.category as BrandCategory) ? (j.category as BrandCategory) : null;
    const steps = (j.steps ?? []).filter((s) => typeof s === 'string' && s.trim().length > 8).slice(0, 8);
    return assemble(input, parsed, steps, cat, 'ia', j.yield && typeof j.yield === 'object' ? j.yield : null);
  } catch (e) {
    return { ...quickDishLocal(input), aiError: e instanceof Error ? e.message : 'La IA no respondió.' };
  }
}

/** Plato listo para guardar en la Food & Brand DB. */
export function quickToBrandFood(d: QuickDish, base: BrandFood, catLabel?: string): BrandFood {
  return {
    ...base,
    nombre: d.name,
    categoria: catLabel ? 'custom' : d.category,
    catLabel: catLabel || undefined,
    porcion_base: { cantidad: 1, unidad: 'porción', gramos: d.totals.g },
    macros_por_porcion: { kcal: d.totals.kcal, p: d.totals.p, c: d.totals.c, f: d.totals.f, leucina: d.totals.leucine },
    ingredientes: d.items.map((i) => ({ nombre: i.food, gramos: i.grams, foodId: i.foodId })),
    detalle: [d.items.map((i) => `${i.grams} g de ${short(i.foodId)}${i.household ? ` (${i.household.replace('≈ ', '≈')})` : ''}`).join(' + '), d.seasonings.length ? `condimentos: ${d.seasonings.join(', ')}` : ''].filter(Boolean).join(' · '),
    pasos: d.steps,
    tecnica: undefined,
    prep_min: d.prepMin,
    lactosa: d.allergens.includes('lactose'),
    alergenos: d.allergens,
    momentos: d.momentos,
    yieldType: d.yieldInfo.yieldType,
    servings: d.yieldInfo.servings,
    storage: d.yieldInfo.storage,
  };
}
