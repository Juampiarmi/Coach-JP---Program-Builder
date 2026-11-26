/**
 * RENDIMIENTO Y CONSERVACIÓN de los platos.
 *
 * En preparaciones de molde o tanda (tartas, budines, tortillas grandes, panes proteicos, guisos, lasañas, pastel de
 * papa, albóndigas, hamburguesas caseras…) los gramos del plan son SIEMPRE los de 1 porción: la etiqueta deja claro
 * cuánto rinde la receta entera, qué fracción le toca al alumno y cómo conservar el resto.
 */
export type YieldType = 'individual' | 'batch';

export interface YieldInfo {
  yieldType: YieldType;
  /** Porciones que rinde la receta completa (1 si es individual). */
  servings: number;
  /** Qué sale de la receta entera (ej. «1 tarta mediana», «1 budinera», «6 muffins»). */
  unit?: string;
  /** Conservación y freezer. */
  storage: string;
  /** Título base del plato al que corresponde (si el coach cambia el plato, la etiqueta se recalcula). */
  for?: string;
}

const HELADERA_FREEZER = (dias: string, meses: string, extra = '') => `Se conserva ${dias} días en heladera en recipiente hermético o hasta ${meses} meses freezada en porciones individuales${extra}.`;
const FREEZE_RAW = 'Crudas o cocidas: 2 días en heladera o hasta 3 meses en el freezer, separadas con papel manteca para sacar de a 1 porción.';
export const STORAGE_INDIVIDUAL = 'Se prepara y se consume en el momento; si sobra, heladera en recipiente hermético hasta 24 h.';

interface Rule {
  re: RegExp;
  servings: number;
  unit: string;
  storage: string;
}
// El orden importa: lo más específico primero.
const RULES: Rule[] = [
  { re: /\b(tarta|tartas|quiche|pascualina|tartaleta grande)\b/, servings: 4, unit: '1 tarta mediana (24-26 cm)', storage: HELADERA_FREEZER('3–4', '2', ' (envueltas en film; se recalientan en horno o sartén tapada)') },
  { re: /\b(pastel de papa|pastel de batata|lasa[ñn]a|canelones|budín salado|bud[ií]n de (verdura|zapallit|espinaca|calabaza|br[oó]coli)|souffl[ée] grande)\b/, servings: 4, unit: '1 fuente mediana', storage: HELADERA_FREEZER('3–4', '2', ' (porciones cortadas en frío)') },
  { re: /\b(bud[ií]n|bizcochuelo|pan proteico|pan de (avena|banana|molde casero)|torta)\b/, servings: 8, unit: '1 budinera', storage: 'Se conserva 4–5 días en heladera bien tapado o hasta 3 meses freezado en rodajas (se descongelan en tostadora).' },
  { re: /\b(muffins?|magdalenas|tortitas? (al horno|de avena y zanahoria)|bocaditos al horno)\b/, servings: 3, unit: '6 muffins (2 por porción)', storage: 'Se conservan 3–4 días en heladera en recipiente hermético o hasta 2 meses freezados (de a 2, listos para llevar).' },
  { re: /\b(guiso|guisad[ao]s?|estofado|locro|carbonada|chili|cazuela|cocci[oó]n lenta|desmenuzad[ao]|bolognesa|ragú)\b/, servings: 4, unit: '1 olla', storage: HELADERA_FREEZER('4', '3', ' (enfriá rápido y freezá en tuppers de 1 porción)') },
  { re: /\b(alb[oó]ndigas|croquetas)\b/, servings: 4, unit: '1 tanda de 12 albóndigas (3 por porción)', storage: FREEZE_RAW },
  { re: /\b(hamburguesas?|medallones|milanesas)( caseras?)?\b/, servings: 4, unit: '4 hamburguesas (1 por porción)', storage: FREEZE_RAW },
  { re: /\btortilla (de (papa|papas|verduras?|espinaca|acelga|zapallito|zucchini|berenjena|calabaza|cebolla)|española|grande|al horno)\b/, servings: 4, unit: '1 tortilla grande (sartén de 24 cm)', storage: HELADERA_FREEZER('3', '1', ' (mejor en heladera; se come fría o tibia)') },
];

/** Rendimiento por el nombre del plato (null = no se reconoce como preparación de molde o tanda). */
export function inferYield(title: string): YieldInfo | null {
  const t = (title || '').toLowerCase();
  // Tortilla individual de avena / desayuno, mug cake y wraps: siempre de a una.
  if (/mug cake|tortilla (esponjosa|r[aá]pida) de avena|tortillas? de (trigo|ma[ií]z)|wrap/.test(t) && !/\btarta\b/.test(t)) return null;
  const r = RULES.find((x) => x.re.test(t));
  return r ? { yieldType: 'batch', servings: r.servings, unit: r.unit, storage: r.storage } : null;
}

export const individual = (storage = STORAGE_INDIVIDUAL): YieldInfo => ({ yieldType: 'individual', servings: 1, storage });

/** Rendimiento del plato: el declarado (si sigue correspondiendo a ese plato) o el inferido por el nombre. */
export function yieldOf(o: { title?: string; yieldInfo?: YieldInfo }): YieldInfo {
  const y = o.yieldInfo;
  if (y && (!y.for || (o.title ?? '').startsWith(y.for))) return y;
  return inferYield(o.title ?? '') ?? individual();
}

const FRAC: Record<number, string> = { 2: '½', 3: '⅓', 4: '¼', 5: '⅕', 6: '⅙', 8: '⅛', 10: '1/10', 12: '1/12' };
export const fractionOf = (n: number) => FRAC[n] ?? `1/${n}`;
/** «¼ de tarta», «⅛ de budín»… */
function pieceOf(y: YieldInfo) {
  const u = (y.unit ?? '').toLowerCase();
  const what = /tarta/.test(u) ? 'tarta' : /budinera/.test(u) ? 'budín' : /fuente/.test(u) ? 'fuente' : /olla/.test(u) ? 'olla' : /tortilla/.test(u) ? 'tortilla' : /muffin/.test(u) ? null : /tanda/.test(u) ? 'tanda' : null;
  return what ? `${fractionOf(y.servings)} de ${what}` : '1 porción';
}

export const INDIVIDUAL_LABEL = 'Porción individual — lista para consumir en esta comida';
/** Etiqueta corta: «Receta de molde / tanda — rinde 4 porciones». */
export function yieldTag(y: YieldInfo) {
  return y.yieldType === 'batch' ? `Receta de molde / tanda — rinde ${y.servings} porciones` : 'Porción individual';
}
/** Texto completo: «Rinde 1 tarta mediana = 4 porciones · Los gramos de tu plan corresponden a 1 porción (¼ de tarta)». */
export function yieldLabel(y: YieldInfo) {
  if (y.yieldType !== 'batch') return INDIVIDUAL_LABEL;
  return `Rinde ${y.unit ?? 'la receta entera'} = ${y.servings} porciones · Los gramos de tu plan corresponden a 1 porción (${pieceOf(y)})`;
}
/** Primer paso de la preparación en las recetas de molde o tanda. */
export function yieldStep(y: YieldInfo) {
  return `Rinde ${y.unit ?? 'la receta entera'} = ${y.servings} porciones. Para la receta entera multiplicá cada ingrediente × ${y.servings}; los gramos de esta lista son TU porción (${pieceOf(y)}). Guardá el resto: ${y.storage.charAt(0).toLowerCase()}${y.storage.slice(1)}`;
}
export const isYieldStep = (s: string) => /^Rinde .+ porciones\. /.test(s);
/** Pasos con el rendimiento al principio (una sola vez). */
export function stepsWithYield(steps: string[], y: YieldInfo) {
  const rest = steps.filter((s) => !isYieldStep(s));
  return y.yieldType === 'batch' ? [yieldStep(y), ...rest] : rest;
}
