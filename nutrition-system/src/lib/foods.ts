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
  | 'sport-carb';

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
}

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
  { id: 'galletas-arroz', name: 'Galletas de arroz', group: 'cereal', unit: { label: 'u', grams: 9 }, p: 8, c: 80, f: 3, leucine: 0.6 },
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
  { id: 'vegetales', name: 'Vegetales mixtos / ensalada', group: 'veg', p: 1.5, c: 4, f: 0.2, leucine: 0.08 },
];

export const FOOD_BY_ID: Record<string, FoodRef> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export const GROUP_LABEL: Record<SwapGroup, string> = {
  'lean-protein': 'Proteína magra',
  'dairy-protein': 'Lácteo proteico',
  eggs: 'Huevo',
  whey: 'Suplemento proteico',
  starch: 'Almidón',
  cereal: 'Cereal',
  fruit: 'Fruta',
  fat: 'Grasa',
  veg: 'Vegetal',
  'sport-carb': 'Carbo rápido',
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
};

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

/** Busca un alimento de la base por nombre aproximado (para mapear la respuesta de la IA). */
export function matchFood(name: string): FoodRef | undefined {
  const n = normalize(name);
  const aliases: [RegExp, string][] = [
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
    [/avena/, 'avena'],
    [/pan/, 'pan'],
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
