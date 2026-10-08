/**
 * Base de alimentos habituales en Argentina. Valores por 100 g en el estado en que se pesan
 * (cocido cuando corresponde). Leucina estimada a partir del perfil aminoacídico (USDA / ARGENFOODS).
 */
export type SwapGroup =
  | 'lean-protein'
  | 'dairy-protein'
  | 'eggs'
  | 'whey'
  | 'starch'
  | 'cereal'
  | 'fruit'
  | 'fat'
  | 'veg'
  | 'sport-carb'
  | 'protein-snack';

export interface FoodRef {
  id: string;
  name: string;
  group: SwapGroup;
  /** Unidad casera opcional para el atleta (ej. "1 u = 50 g"). */
  unit?: { label: string; grams: number };
  p: number;
  c: number;
  f: number;
  leucine: number;
  /** Equivalencias preferidas (ids) que se muestran primero en «Equivale a». */
  equiv?: string[];
  /** Marca comercial (alimentos personalizados). */
  brand?: string;
  /** true = cargado por el coach desde «Crear alimento / marca» (persistido en localStorage). */
  custom?: boolean;
}

export type MacroPrincipal = 'protein' | 'carbs' | 'fat';

export const FOODS: FoodRef[] = [
  { id: 'pollo', name: 'Pechuga de pollo (cocida)', group: 'lean-protein', p: 31, c: 0, f: 3.6, leucine: 2.5 },
  { id: 'cuadril', name: 'Cuadril magro (cocido)', group: 'lean-protein', p: 29, c: 0, f: 7, leucine: 2.35 },
  { id: 'lomo', name: 'Lomo vacuno (cocido)', group: 'lean-protein', p: 28, c: 0, f: 8, leucine: 2.25 },
  { id: 'nalga', name: 'Nalga / peceto (cocido)', group: 'lean-protein', p: 30, c: 0, f: 5, leucine: 2.4 },
  { id: 'picada', name: 'Carne picada especial 5% (cocida)', group: 'lean-protein', p: 26, c: 0, f: 10, leucine: 2.1 },
  { id: 'merluza', name: 'Merluza (cocida)', group: 'lean-protein', p: 23, c: 0, f: 1.5, leucine: 1.9 },
  { id: 'atun', name: 'Atún al natural (escurrido)', group: 'lean-protein', p: 26, c: 0, f: 1, leucine: 2.1 },
  { id: 'cerdo', name: 'Bondiola / carré magro de cerdo (cocido)', group: 'lean-protein', p: 27, c: 0, f: 9, leucine: 2.15 },
  { id: 'huevo', name: 'Huevo entero', group: 'eggs', unit: { label: 'u', grams: 50 }, p: 12.6, c: 0.7, f: 9.5, leucine: 1.09 },
  { id: 'claras', name: 'Claras de huevo', group: 'eggs', unit: { label: 'clara', grams: 33 }, p: 10.9, c: 0.7, f: 0.2, leucine: 0.95 },
  { id: 'ricota', name: 'Ricota magra', group: 'dairy-protein', p: 11, c: 3.5, f: 4, leucine: 1.15 },
  { id: 'yogur', name: 'Yogur griego descremado', group: 'dairy-protein', p: 10, c: 4, f: 0.4, leucine: 1.0 },
  { id: 'untable', name: 'Queso untable descremado', group: 'dairy-protein', p: 10, c: 4, f: 1, leucine: 0.98 },
  { id: 'leche', name: 'Leche descremada', group: 'dairy-protein', unit: { label: 'taza', grams: 250 }, p: 3.3, c: 5, f: 0.1, leucine: 0.33 },
  { id: 'whey', name: 'Whey protein (concentrado)', group: 'whey', unit: { label: 'scoop', grams: 30 }, p: 78, c: 7, f: 6, leucine: 8.5 },
  { id: 'avena', name: 'Avena arrollada', group: 'cereal', p: 13, c: 60, f: 7, leucine: 1.0 },
  { id: 'pan', name: 'Pan integral', group: 'cereal', unit: { label: 'rebanada', grams: 30 }, p: 9, c: 45, f: 3.5, leucine: 0.65 },
  { id: 'galletas-arroz', name: 'Galletas de arroz inflado', group: 'cereal', unit: { label: 'u', grams: 9 }, p: 8, c: 80, f: 3, leucine: 0.6, equiv: ['tutucas', 'tostadas-arroz'] },
  {
    id: 'tutucas',
    name: 'Tutucas de maíz',
    group: 'cereal',
    unit: { label: 'porción', grams: 30 },
    p: 7.5,
    c: 84,
    f: 1.5,
    leucine: 0.9,
    equiv: ['copos-maiz', 'galletas-arroz', 'avena-instantanea', 'tostadas-arroz'],
  },
  {
    id: 'copos-maiz',
    name: 'Copos de maíz sin azúcar',
    group: 'cereal',
    unit: { label: 'porción', grams: 30 },
    p: 7,
    c: 84,
    f: 0.9,
    leucine: 0.85,
    equiv: ['tutucas', 'galletas-arroz', 'avena-instantanea'],
  },
  { id: 'avena-instantanea', name: 'Avena instantánea', group: 'cereal', p: 12, c: 66, f: 6.5, leucine: 0.95, equiv: ['avena', 'tutucas', 'copos-maiz'] },
  { id: 'tostadas-arroz', name: 'Tostadas de arroz', group: 'cereal', unit: { label: 'u', grams: 8 }, p: 7.5, c: 81, f: 2.8, leucine: 0.6, equiv: ['galletas-arroz', 'tutucas'] },
  { id: 'arroz', name: 'Arroz blanco (cocido)', group: 'starch', p: 2.7, c: 28, f: 0.3, leucine: 0.22 },
  { id: 'yamani', name: 'Arroz yamaní (cocido)', group: 'starch', p: 2.6, c: 23, f: 0.9, leucine: 0.21 },
  { id: 'fideos', name: 'Fideos (cocidos)', group: 'starch', p: 5.8, c: 31, f: 0.9, leucine: 0.45 },
  { id: 'batata', name: 'Batata (cocida)', group: 'starch', p: 1.6, c: 20, f: 0.1, leucine: 0.09 },
  { id: 'papa', name: 'Papa (hervida)', group: 'starch', p: 1.9, c: 20, f: 0.1, leucine: 0.1 },
  { id: 'lentejas', name: 'Lentejas (cocidas)', group: 'starch', p: 9, c: 20, f: 0.4, leucine: 0.65 },
  { id: 'banana', name: 'Banana', group: 'fruit', unit: { label: 'u', grams: 120 }, p: 1.1, c: 23, f: 0.3, leucine: 0.07 },
  { id: 'manzana', name: 'Manzana', group: 'fruit', unit: { label: 'u', grams: 180 }, p: 0.3, c: 14, f: 0.2, leucine: 0.01 },
  { id: 'frutillas', name: 'Frutillas', group: 'fruit', p: 0.7, c: 7.7, f: 0.3, leucine: 0.04 },
  { id: 'miel', name: 'Miel', group: 'sport-carb', p: 0.3, c: 82, f: 0, leucine: 0 },
  { id: 'isotonica', name: 'Bebida isotónica', group: 'sport-carb', unit: { label: 'botella', grams: 500 }, p: 0, c: 6, f: 0, leucine: 0 },
  { id: 'dulce-membrillo', name: 'Dulce de membrillo', group: 'sport-carb', p: 0.4, c: 65, f: 0, leucine: 0 },
  { id: 'mani', name: 'Pasta de maní', group: 'fat', p: 25, c: 16, f: 50, leucine: 1.6 },
  { id: 'palta', name: 'Palta', group: 'fat', p: 2, c: 8.5, f: 15, leucine: 0.14 },
  { id: 'oliva', name: 'Aceite de oliva extra virgen', group: 'fat', unit: { label: 'cda', grams: 13 }, p: 0, c: 0, f: 100, leucine: 0 },
  { id: 'nueces', name: 'Nueces', group: 'fat', p: 15, c: 14, f: 65, leucine: 1.17 },
  // Productos comerciales argentinos (valores promedio de etiqueta; ajustables con «Crear alimento / marca»).
  { id: 'alfajor-proteico', name: 'Alfajor proteico', group: 'protein-snack', unit: { label: 'u', grams: 50 }, p: 30, c: 42, f: 15, leucine: 2.5, equiv: ['barra-proteica', 'yogur-proteico'] },
  { id: 'barra-proteica', name: 'Barra proteica', group: 'protein-snack', unit: { label: 'u', grams: 46 }, p: 33, c: 36, f: 13, leucine: 2.7, equiv: ['alfajor-proteico', 'yogur-proteico'] },
  { id: 'yogur-proteico', name: 'Yogur bebible proteico (alto en proteínas)', group: 'dairy-protein', unit: { label: 'botella', grams: 250 }, p: 6, c: 5.5, f: 0.4, leucine: 0.6, equiv: ['yogur', 'leche'] },
  { id: 'queso-light', name: 'Queso cremoso light', group: 'dairy-protein', p: 22, c: 2, f: 14, leucine: 2.0, equiv: ['ricota', 'untable'] },
  { id: 'galletitas-agua', name: 'Galletitas de agua', group: 'cereal', unit: { label: 'u', grams: 6 }, p: 10, c: 70, f: 12, leucine: 0.75, equiv: ['galletas-arroz', 'tostadas-arroz', 'pan'] },
  { id: 'pan-lactal', name: 'Pan lactal integral', group: 'cereal', unit: { label: 'rebanada', grams: 25 }, p: 10, c: 43, f: 4, leucine: 0.7, equiv: ['pan', 'tostadas-arroz'] },
  { id: 'barrita-cereal', name: 'Barrita de cereal', group: 'sport-carb', unit: { label: 'u', grams: 23 }, p: 6, c: 70, f: 9, leucine: 0.4, equiv: ['banana', 'dulce-membrillo'] },
  { id: 'vegetales', name: 'Vegetales mixtos / ensalada', group: 'veg', p: 1.5, c: 4, f: 0.2, leucine: 0.08 },
];

export const FOOD_BY_ID: Record<string, FoodRef> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export const GROUP_LABEL: Record<SwapGroup, string> = {
  'lean-protein': 'Proteína magra',
  'dairy-protein': 'Lácteo proteico',
  eggs: 'Huevo',
  whey: 'Suplemento proteico',
  starch: 'Almidón',
  cereal: 'Almidón / Carbos rápidos / Cereales',
  fruit: 'Fruta',
  fat: 'Grasa',
  veg: 'Vegetal',
  'sport-carb': 'Carbo rápido',
  'protein-snack': 'Snack proteico comercial',
};

/** Macro dominante que define la equivalencia del grupo en los Smart Swaps. */
export const GROUP_ANCHOR: Record<SwapGroup, 'p' | 'c' | 'f'> = {
  'lean-protein': 'p',
  'dairy-protein': 'p',
  eggs: 'p',
  whey: 'p',
  starch: 'c',
  cereal: 'c',
  fruit: 'c',
  fat: 'f',
  veg: 'c',
  'sport-carb': 'c',
  'protein-snack': 'p',
};

/** Kcal por 100 g (Atwater 4/4/9). */
export const kcalPer100 = (f: Pick<FoodRef, 'p' | 'c' | 'f'>) => f.p * 4 + f.c * 4 + f.f * 9;

const BUILTIN_IDS = new Set(FOODS.map((f) => f.id));

/**
 * Registra los alimentos / marcas personalizados del coach en la base viva (FOODS + FOOD_BY_ID),
 * así quedan disponibles en el selector, los Smart Swaps, el motor de macros y la PWA exportada.
 */
export function registerCustomFoods(list: FoodRef[]) {
  for (let i = FOODS.length - 1; i >= 0; i--) if (FOODS[i].custom) FOODS.splice(i, 1);
  for (const id of Object.keys(FOOD_BY_ID)) if (FOOD_BY_ID[id].custom) delete FOOD_BY_ID[id];
  for (const f of list) {
    if (!f?.id || BUILTIN_IDS.has(f.id)) continue;
    const ref = { ...f, custom: true };
    FOODS.push(ref);
    FOOD_BY_ID[ref.id] = ref;
  }
}

const MACRO_GROUP: Record<MacroPrincipal, SwapGroup> = { protein: 'lean-protein', carbs: 'cereal', fat: 'fat' };
const ANCHOR_OF: Record<MacroPrincipal, 'p' | 'c' | 'f'> = { protein: 'p', carbs: 'c', fat: 'f' };

/** Macro principal de un alimento libre: el declarado por la IA o el que más kcal aporta. */
export function inferMacroPrincipal(item: { p: number; c: number; f: number; macroPrincipal?: string }): MacroPrincipal | null {
  if (item.macroPrincipal === 'protein' || item.macroPrincipal === 'carbs' || item.macroPrincipal === 'fat') return item.macroPrincipal;
  const kp = item.p * 4;
  const kc = item.c * 4;
  const kf = item.f * 9;
  if (kp + kc + kf <= 0) return null;
  if (kp >= kc && kp >= kf) return 'protein';
  return kc >= kf ? 'carbs' : 'fat';
}

/**
 * Equivalencias para un alimento libre (cargado por IA): se asocia por macro principal a los grupos de la
 * base y se eligen los alimentos de densidad calórica más parecida. Gramos = mismo aporte del macro ancla.
 */
export function freeEquivalents(item: { grams: number; p: number; c: number; f: number; macroPrincipal?: string }, n = 2) {
  const macro = inferMacroPrincipal(item);
  if (!macro || item.grams <= 0) return [];
  const anchor = ANCHOR_OF[macro];
  const amount = item[anchor];
  if (!(amount > 0)) return [];
  const density = ((item.p * 4 + item.c * 4 + item.f * 9) / item.grams) * 100;
  const groups: SwapGroup[] =
    macro === 'protein' ? ['lean-protein', 'dairy-protein', 'eggs', 'protein-snack'] : macro === 'fat' ? ['fat'] : ['cereal', 'starch', 'fruit', 'sport-carb'];
  return FOODS.filter((f) => groups.includes(f.group) && f[anchor] > 0)
    .map((f) => ({ food: f, diff: Math.abs(kcalPer100(f) - density) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, n)
    .map(({ food }) => ({ food, grams: Math.max(5, Math.round((amount / food[anchor]) * 100 / 5) * 5) }));
}

/** Grupo de referencia de un alimento libre (etiqueta y destino de swaps). */
export const freeGroup = (item: { p: number; c: number; f: number; macroPrincipal?: string }) => {
  const m = inferMacroPrincipal(item);
  return m ? MACRO_GROUP[m] : null;
};

/** Alternativas para «Equivale a»: primero las preferidas del alimento, luego las de densidad calórica más cercana del grupo. */
export function alternativesFor(ref: FoodRef, n = 2) {
  const pool = FOODS.filter((f) => f.group === ref.group && f.id !== ref.id);
  const preferred = (ref.equiv ?? []).map((id) => FOOD_BY_ID[id]).filter((f): f is FoodRef => !!f && f.id !== ref.id);
  const rest = pool
    .filter((f) => !preferred.includes(f))
    .sort((a, b) => Math.abs(kcalPer100(a) - kcalPer100(ref)) - Math.abs(kcalPer100(b) - kcalPer100(ref)));
  return [...preferred, ...rest].slice(0, n);
}

export function macrosFor(foodId: string, grams: number) {
  const ref = FOOD_BY_ID[foodId];
  if (!ref) return null;
  const k = grams / 100;
  return {
    p: round1(ref.p * k),
    c: round1(ref.c * k),
    f: round1(ref.f * k),
    leucine: round2(ref.leucine * k),
  };
}

/** Gramos de `toId` que aportan lo mismo del macro ancla del grupo que `grams` de `fromId` (redondeo a 5 g). */
export function equivalentGrams(fromId: string, grams: number, toId: string) {
  const from = FOOD_BY_ID[fromId];
  const to = FOOD_BY_ID[toId];
  if (!from || !to || fromId === toId) return grams;
  const anchor = GROUP_ANCHOR[from.group];
  if (!(to[anchor] > 0)) return grams;
  return Math.max(5, Math.round((from[anchor] * grams) / to[anchor] / 5) * 5);
}

/** Medida casera legible ("≈ 3 u", "≈ 1 scoop"). Vacío si no aplica. */
export function householdHint(foodId: string | undefined, grams: number) {
  const ref = foodId ? FOOD_BY_ID[foodId] : undefined;
  if (!ref?.unit) return '';
  const q = Math.round((grams / ref.unit.grams) * 2) / 2;
  if (q < 0.5) return '';
  const u = ref.unit.label;
  const label = q > 1 && u.length > 3 ? (u.endsWith('ón') ? `${u.slice(0, -2)}ones` : `${u}s`) : u;
  return `≈ ${String(q).replace('.', ',')} ${label}`;
}

/** Busca un alimento de la base por nombre aproximado (para mapear la respuesta de la IA). */
export function matchFood(name: string): FoodRef | undefined {
  const n = normalize(name);
  // Primero las marcas / alimentos personalizados del coach (coincidencia por nombre).
  const custom = FOODS.find((f) => {
    if (!f.custom || n.length < 4) return false;
    const base = normalize(f.name.split(' · ')[0]);
    return n.includes(base) || base.includes(n);
  });
  if (custom) return custom;
  const aliases: [RegExp, string][] = [
    // Productos comerciales primero (más específicos que «yogur», «pan», «galleta»).
    [/alfajor.*prote|prote.*alfajor/, 'alfajor-proteico'],
    [/barr(a|ita).*prote|prote.*barr(a|ita)|protein bar/, 'barra-proteica'],
    [/barrita|barra de cereal/, 'barrita-cereal'],
    [/yogur.*(bebible|proteic|pro\b)|ser pro/, 'yogur-proteico'],
    [/queso (cremoso|fresco|port salut)/, 'queso-light'],
    [/galletit.*agua|criollita|crackers?/, 'galletitas-agua'],
    [/pan lactal|lactal/, 'pan-lactal'],
    [/pechuga|pollo/, 'pollo'],
    [/cuadril/, 'cuadril'],
    [/lomo/, 'lomo'],
    [/nalga|peceto|bola de lomo|carne magra|vacuna|carne roja/, 'nalga'],
    [/picada/, 'picada'],
    [/merluza|pescado|abadejo/, 'merluza'],
    [/atun/, 'atun'],
    [/cerdo|bondiola|carre/, 'cerdo'],
    [/clara/, 'claras'],
    [/huevo/, 'huevo'],
    [/ricota/, 'ricota'],
    [/yogur/, 'yogur'],
    [/untable|queso crema/, 'untable'],
    [/leche/, 'leche'],
    [/whey|proteina en polvo|suero/, 'whey'],
    [/pan/, 'pan'],
    [/tutuca|pochoclo|maiz inflado/, 'tutucas'],
    [/copos? de maiz|corn ?flakes|cereal de maiz/, 'copos-maiz'],
    [/avena (instantanea|rapida|quick)/, 'avena-instantanea'],
    [/tostada.*arroz/, 'tostadas-arroz'],
    [/avena/, 'avena'],
    [/galleta.*arroz|arroz inflado/, 'galletas-arroz'],
    [/yamani|integral.*arroz|arroz.*integral/, 'yamani'],
    [/arroz/, 'arroz'],
    [/fideo|pasta seca|spaghetti|tallarin/, 'fideos'],
    [/batata|camote/, 'batata'],
    [/papa/, 'papa'],
    [/lenteja|legumbre|garbanzo/, 'lentejas'],
    [/banana/, 'banana'],
    [/manzana/, 'manzana'],
    [/frutilla|frutos rojos/, 'frutillas'],
    [/miel/, 'miel'],
    [/isotonic|gatorade|powerade/, 'isotonica'],
    [/membrillo|batata.*dulce|dulce de/, 'dulce-membrillo'],
    [/mani/, 'mani'],
    [/palta|aguacate/, 'palta'],
    [/oliva|aceite/, 'oliva'],
    [/nuez|nueces|almendra|frutos secos/, 'nueces'],
    [/vegetal|ensalada|verdura|brocoli|zapallito/, 'vegetales'],
  ];
  for (const [re, id] of aliases) if (re.test(n)) return FOOD_BY_ID[id];
  return undefined;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;
