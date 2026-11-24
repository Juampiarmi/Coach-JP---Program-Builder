import { DISH_CATEGORIES, type BrandFood } from './foodBrandDb';
import { FOOD_BY_ID, macrosFor } from './foods';

/**
 * AUDITORÍA DE PLATOS GUARDADOS (Food & Brand DB): título, ingredientes, gramos, macros y pasos coherentes.
 * Se usa en la prueba automática del recetario de fábrica y en el Builder para avisar qué platos del coach revisar.
 */
const WORDS: [RegExp, RegExp][] = [
  // [palabra en el título, cómo tiene que aparecer en la composición / pasos]
  [/\b(pollo|pechuga)\b/i, /pollo|pechuga/i],
  [/\bhuevos?\b|omelette|revuelto|tortilla(?! de (trigo|ma[ií]z))/i, /huevo|clara/i],
  [/\bavena\b/i, /avena/i],
  [/\byogur\b/i, /yogur/i],
  [/\bbanana\b/i, /banana/i],
  [/\bpalta\b|avocado/i, /palta/i],
  [/\bat[uú]n\b/i, /at[uú]n/i],
  [/\bmerluza\b/i, /merluza/i],
  [/\blentejas\b/i, /lentejas/i],
  [/\bgarbanzos\b/i, /garbanzos/i],
  [/\bricota\b/i, /ricota/i],
  [/\bjam[oó]n\b/i, /jam[oó]n/i],
  [/\bqueso\b/i, /queso|ricota|untable/i],
  [/\bberenjenas?\b/i, /berenjena/i],
  [/\bzucchini|zapallitos?\b/i, /zucchini|zapallito/i],
  [/\bespinaca\b/i, /espinaca/i],
  [/\bcalabaza\b/i, /calabaza|zapallo/i],
  [/\bbatata\b/i, /batata/i],
  [/\bpapas?\b/i, /papa/i],
  [/\barroz\b/i, /arroz/i],
  [/\bfideos\b/i, /fideos|pasta/i],
  [/\bwhey\b|proteico\b/i, /whey|prote/i],
  [/\bcoco\b/i, /coco/i],
  [/\bdulce de leche\b/i, /dulce de leche/i],
];

export interface DishIssue {
  kind: 'title' | 'macros' | 'steps' | 'recipe';
  msg: string;
}

const kcal = (m: { p: number; c: number; f: number }) => m.p * 4 + m.c * 4 + m.f * 9;

export function auditDish(b: BrandFood): DishIssue[] {
  const out: DishIssue[] = [];
  const isDish = DISH_CATEGORIES.includes(b.categoria) || b.categoria === 'custom';
  const ingr = (b.ingredientes ?? []).filter((x) => x.gramos > 0);
  const comp = [b.detalle ?? '', ...ingr.map((x) => `${x.nombre} ${x.foodId ? FOOD_BY_ID[x.foodId]?.name ?? '' : ''}`)].join(' · ');
  const text = `${comp} · ${(b.pasos ?? []).join(' ')} · ${b.tecnica ?? ''}`;
  // 1 · Lo que dice el título tiene que estar en el plato.
  if (isDish && comp.trim()) for (const [t, c] of WORDS) if (t.test(b.nombre) && !c.test(text)) out.push({ kind: 'title', msg: `El nombre menciona «${t.source.replace(/\\b|\(|\)|\?|\[.*?\]|\|.*$/g, '')}» pero no figura en los ingredientes` });
  // 2 · Las calorías cuadran con los macros (Atwater 4/4/9, ±15 %).
  const m = b.macros_por_porcion;
  const at = kcal(m);
  if (m.kcal > 0 && at > 0 && Math.abs(m.kcal / at - 1) > 0.15) out.push({ kind: 'macros', msg: `Las calorías (${m.kcal}) no cuadran con los macros (${Math.round(at)} kcal)` });
  // 3 · Receta con ingredientes: la porción y los macros salen de la suma.
  if (ingr.length && ingr.every((x) => x.foodId && FOOD_BY_ID[x.foodId])) {
    const t = ingr.reduce((a, x) => { const mm = macrosFor(x.foodId!, x.gramos)!; return { g: a.g + x.gramos, p: a.p + mm.p, c: a.c + mm.c, f: a.f + mm.f }; }, { g: 0, p: 0, c: 0, f: 0 });
    if (Math.abs(t.g - b.porcion_base.gramos) > Math.max(10, t.g * 0.1)) out.push({ kind: 'recipe', msg: `La porción (${b.porcion_base.gramos} g) no coincide con la suma de ingredientes (${Math.round(t.g)} g)` });
    if (at > 0 && Math.abs(kcal(t) / at - 1) > 0.15) out.push({ kind: 'recipe', msg: `Los macros no coinciden con los ingredientes (${Math.round(kcal(t))} kcal según la receta)` });
  }
  // 4 · Un plato casero necesita preparación.
  if (isDish && (b.prep_min ?? 0) > 0 && !(b.pasos?.length || b.tecnica)) out.push({ kind: 'steps', msg: 'Le faltan los pasos de preparación' });
  if (b.pasos?.length && b.pasos.some((p) => p.trim().length < 8)) out.push({ kind: 'steps', msg: 'Hay pasos vacíos o demasiado cortos' });
  return out;
}
