import type { FoodRef, SwapGroup } from './foods';

export type BrandCategory =
  | 'protein'
  | 'starch'
  | 'fat'
  | 'dairy'
  | 'snack'
  | 'fruitveg'
  | 'supplement'
  | 'desayuno'
  | 'tarta'
  | 'minuta'
  | 'parrilla'
  | 'dulce';

export const BRAND_CATEGORY_LABEL: Record<BrandCategory, string> = {
  protein: 'Proteína Magra',
  starch: 'Almidón / Carbohidrato',
  fat: 'Grasa Saludable',
  dairy: 'Lácteo Proteico',
  snack: 'Cereal / Snack Táctico',
  fruitveg: 'Fruta / Vegetal',
  supplement: 'Suplemento',
  desayuno: 'Desayunos, Meriendas y Toast Bar',
  tarta: 'Tartas, Empanadas y Sfijas',
  minuta: 'Minutas y Platos Rioplatenses',
  parrilla: 'Parrilla y Flex-Meals (Rescate Social)',
  dulce: 'Clásicos Dulces y Quiosco Deportivo',
};
/** Categorías de platos preparados (porción casera estándar). */
export const DISH_CATEGORIES: BrandCategory[] = ['desayuno', 'tarta', 'minuta', 'parrilla', 'dulce'];
export const BRAND_CATEGORIES = Object.keys(BRAND_CATEGORY_LABEL) as BrandCategory[];

/** Grupo de intercambio equivalente en el motor del Builder (los suplementos no entran al selector de comidas). */
const GROUP_OF: Record<BrandCategory, SwapGroup | null> = {
  protein: 'lean-protein',
  starch: 'starch',
  fat: 'fat',
  dairy: 'dairy-protein',
  snack: 'cereal',
  fruitveg: 'fruit',
  supplement: null,
  desayuno: 'plato',
  tarta: 'plato',
  minuta: 'plato',
  parrilla: 'plato',
  dulce: 'plato',
};

/** Alimento / marca de la Food & Brand DB. Macros por porción base (como figura en la etiqueta). */
export interface BrandFood {
  id: string;
  nombre: string;
  marca: string;
  categoria: BrandCategory;
  porcion_base: { cantidad: number; unidad: string; gramos: number };
  macros_por_porcion: { kcal: number; p: number; c: number; f: number; leucina: number };
  es_marca_local: boolean;
  disponible_para_ia: boolean;
  /** Minutos de preparación (0 = listo para comer). Filtro «Preparación < 10 min» de la canasta. */
  prep_min?: number;
  /** Contiene lactosa (filtro «Sin Lactosa» de la canasta). */
  lactosa?: boolean;
  /** Flex-meal / permitido social (comida libre controlada). */
  flex?: boolean;
  /** Composición o aclaración de la porción (ej. "2 rebanadas de pan integral + 60 g de palta + 1 huevo"). */
  detalle?: string;
}

type Seed = [string, string, BrandCategory, number, string, number, number, number, number, number, number, boolean];
// [nombre, marca, categoría, cantidad, unidad, gramos, kcal, P, C, G, leucina, marca local]
const SEED_ROWS: Seed[] = [
  ['Tutucas de maíz sin azúcar', 'Cisne / marcas locales', 'snack', 1, 'porción', 30, 114, 2.2, 25.2, 0.5, 0.25, true],
  ['Almohaditas de avena', 'Granix / marcas locales', 'snack', 1, 'porción', 30, 124, 2.6, 21.5, 3, 0.2, true],
  ['Galletas de arroz', 'Gallo Snacks', 'snack', 2, 'unidades', 18, 70, 1.4, 14.4, 0.5, 0.11, true],
  ['Chocolate amargo 70 %', 'Águila / Felfort', 'snack', 2, 'cuadraditos', 10, 58, 0.8, 3.8, 4.3, 0.05, true],
  ['Queso Untable Magro Balance', 'Finlandia', 'dairy', 2, 'cdas', 30, 33, 3.3, 1.5, 1.5, 0.32, true],
  ['Queso Untable Light', 'San Ignacio', 'dairy', 2, 'cdas', 30, 36, 3, 1.5, 2, 0.29, true],
  ['Queso Untable Descremado', 'Mendicrim', 'dairy', 2, 'cdas', 30, 30, 3.2, 1.6, 1.2, 0.31, true],
  ['Yogur Proteico Descremado', 'La Serenísima Pro', 'dairy', 1, 'pote', 160, 104, 15, 9.6, 0.5, 1.5, true],
  ['Yogur Proteico Descremado', 'Milkaut Pro', 'dairy', 1, 'pote', 160, 99, 14, 9, 0.6, 1.4, true],
  ['Pechuga de pollo (cocida)', 'Genérico', 'protein', 100, 'g', 100, 165, 31, 0, 3.6, 2.5, false],
  ['Nalga / peceto (cocido)', 'Genérico', 'protein', 100, 'g', 100, 165, 30, 0, 5, 2.4, false],
  ['Cuadril magro (cocido)', 'Genérico', 'protein', 100, 'g', 100, 179, 29, 0, 7, 2.35, false],
  ['Merluza (cocida)', 'Genérico', 'protein', 100, 'g', 100, 106, 23, 0, 1.5, 1.9, false],
  ['Huevo entero', 'Genérico', 'protein', 1, 'unidad', 50, 64, 6.3, 0.4, 4.8, 0.55, false],
  ['Claras de huevo', 'Genérico', 'protein', 1, 'clara', 33, 15, 3.6, 0.2, 0.1, 0.31, false],
  ['Arroz blanco (cocido)', 'Genérico', 'starch', 100, 'g', 100, 126, 2.7, 28, 0.3, 0.22, false],
  ['Papa (hervida)', 'Genérico', 'starch', 100, 'g', 100, 87, 1.9, 20, 0.1, 0.1, false],
  ['Batata (cocida)', 'Genérico', 'starch', 100, 'g', 100, 87, 1.6, 20, 0.1, 0.09, false],
  ['Avena instantánea', 'Quaker', 'starch', 1, 'porción', 40, 152, 4.8, 26.4, 2.6, 0.38, true],
  ['Palta', 'Genérico', 'fat', 1, 'porción (½ u chica)', 50, 46, 1, 4.3, 7.5, 0.07, false],
  ['Aceite de oliva extra virgen', 'Cocinero / Lira', 'fat', 1, 'cda', 13, 117, 0, 0, 13, 0, true],
  ['Pasta de maní', 'King', 'fat', 1, 'cda', 16, 96, 4, 2.6, 8, 0.26, true],
  ['Nueces', 'Genérico', 'fat', 1, 'puñado', 30, 196, 4.5, 4.2, 19.5, 0.35, false],
  ['Banana', 'Genérico', 'fruitveg', 1, 'unidad', 120, 106, 1.3, 27.6, 0.4, 0.08, false],
  ['Creatina Monohidrato', 'Star Nutrition / ENA', 'supplement', 1, 'medida', 5, 0, 0, 0, 0, 0, true],
  ['Beta-Alanina', 'ENA / Gentech', 'supplement', 1, 'medida', 3.2, 0, 0, 0, 0, 0, true],
  ['Cafeína anhidra', 'Star Nutrition / Gentech', 'supplement', 1, 'cápsula', 0.2, 0, 0, 0, 0, 0, true],
];


type Dish = [string, BrandCategory, string, number, number, number, number, number, number, boolean, boolean, string, string?];
// [nombre, categoría, unidad, gramos, P, C, G, leucina, prep (min), lactosa, flex, detalle, marca]. Kcal = Atwater 4/4/9.
const DISH_ROWS: Dish[] = [
  // 1.1 · Desayunos, meriendas y toast bar
  ['Avocado Toast integral', 'desayuno', 'porción', 170, 13, 30, 15.5, 1, 8, false, false, '2 rebanadas de pan integral o de semillas + 60 g de palta + 1 huevo'],
  ['Avocado Toast en galletas de arroz', 'desayuno', 'porción', 127, 9, 23, 12.5, 0.7, 6, false, false, '3 galletas de arroz + 50 g de palta + 1 huevo'],
  ['Tostadas proteicas', 'desayuno', 'porción', 180, 25, 28, 13, 2.1, 8, true, false, '2 rebanadas de pan integral + 30 g de untable o port salut + 40 g de jamón cocido + 1 huevo'],
  ['Tostada liviana de galleta de arroz con queso y huevo', 'desayuno', 'porción', 88, 12, 15, 9, 1, 5, true, false, '2 galletas de arroz + 20 g de queso + 1 huevo'],
  ['Pancake de avena, coco y huevo', 'desayuno', 'porción', 160, 18, 33, 17, 1.4, 10, false, false, '40 g de avena + 10 g de coco + 2 huevos + 10 g de miel · variantes: vainilla, ralladura de limón, canela, cacao amargo o café'],
  ['Bowl de yogur proteico con granola y frutas', 'desayuno', 'bowl', 290, 18, 45, 5, 1.7, 3, true, false, '160 g de yogur proteico + 30 g de granola + 100 g de fruta'],
  ['Café con leche descremada', 'desayuno', 'taza', 250, 8, 12, 0.3, 0.8, 3, true, false, '250 ml · sin azúcar o con edulcorante'],
  ['Leche chocolatada fit', 'desayuno', 'taza', 250, 9, 14, 1.5, 0.85, 2, true, false, '250 ml de leche descremada + cacao amargo + edulcorante'],
  ['Mate cebado', 'desayuno', 'termo / ronda', 500, 0, 1, 0, 0, 3, false, false, 'Sin azúcar · cafeína ~70 mg por ronda'],
  // 1.2 · Tartas, empanadas y sfijas (porción casera estándar)
  ['Tarta de pollo y puerro', 'tarta', 'porción (1/8)', 150, 16, 22, 14, 1.3, 60, true, false, 'Masa casera o integral · relleno de pollo, puerro y queso'],
  ['Tarta de jamón, queso y huevo', 'tarta', 'porción (1/8)', 150, 15, 21, 18, 1.3, 50, true, false, ''],
  ['Tarta de atún y verduras', 'tarta', 'porción (1/8)', 150, 15, 22, 12, 1.2, 50, false, false, ''],
  ['Tarta de carne magra', 'tarta', 'porción (1/8)', 150, 16, 22, 14, 1.3, 60, false, false, ''],
  ['Tarta de zapallitos / Pascualina', 'tarta', 'porción (1/8)', 150, 10, 20, 13, 0.85, 60, true, false, ''],
  ['Empanada de carne al horno', 'tarta', 'unidad', 80, 9, 21, 9, 0.75, 45, false, false, ''],
  ['Empanada de pollo al horno', 'tarta', 'unidad', 80, 9, 21, 8, 0.75, 45, false, false, ''],
  ['Empanada de jamón y queso al horno', 'tarta', 'unidad', 80, 8, 20, 10, 0.7, 45, true, false, ''],
  ['Sfija / empanada árabe de carne', 'tarta', 'unidad', 70, 7, 18, 6, 0.6, 45, false, false, 'Carne con limón'],
  // 1.3 · Minutas y platos principales rioplatenses
  ['Milanesa de pechuga de pollo al horno', 'minuta', 'unidad', 150, 38, 14, 9, 3, 25, false, false, 'Rebozado con pan rallado y huevo, al horno'],
  ['Milanesa de nalga / peceto al horno', 'minuta', 'unidad', 150, 36, 14, 11, 2.9, 25, false, false, ''],
  ['Milanesa de merluza al horno', 'minuta', 'unidad', 150, 27, 15, 7, 2.2, 25, false, false, ''],
  ['Milanesa napolitana al horno', 'minuta', 'unidad', 200, 42, 18, 18, 3.4, 30, true, false, 'Con jamón, salsa de tomate y muzzarella'],
  ['Pastel de papa táctico', 'minuta', 'porción', 300, 32, 40, 13, 2.6, 60, true, false, 'Carne magra + puré de papa + huevo duro'],
  ['Matambre a la pizza', 'minuta', 'porción', 200, 40, 4, 22, 3.2, 90, true, false, ''],
  ['Pollo a la provenzal', 'minuta', 'porción', 200, 46, 2, 14, 3.7, 40, false, false, 'Ajo, perejil y aceite de oliva'],
  ['Guiso táctico de lentejas', 'minuta', 'plato', 350, 24, 52, 9, 1.9, 50, false, false, 'Lentejas + carne magra + verduras'],
  ['Guiso fit de garbanzos', 'minuta', 'plato', 350, 22, 50, 11, 1.7, 50, false, false, ''],
  ['Canelones de espinaca y ricota', 'minuta', '2 unidades', 300, 24, 40, 16, 2.3, 60, true, false, 'Con salsa de tomate'],
  ['Canelones de carne', 'minuta', '2 unidades', 300, 28, 38, 17, 2.4, 60, true, false, ''],
  ['Ensalada mixta', 'minuta', 'plato', 200, 2, 8, 0.4, 0.1, 5, false, false, 'Lechuga, tomate, zanahoria, cebolla · aliño aparte'],
  // 1.4 · Parrilla y flex-meals (rescate social)
  ['Cuadril a la parrilla con ensalada', 'parrilla', 'plato', 400, 58, 8, 15, 4.7, 40, false, false, '200 g de cuadril + 200 g de ensalada'],
  ['Entraña a la parrilla con papa', 'parrilla', 'plato', 330, 46, 30, 22, 3.7, 40, false, false, '180 g de entraña + 150 g de papa'],
  ['Asado de tira', 'parrilla', 'porción', 200, 44, 0, 34, 3.5, 90, false, false, ''],
  ['Molleja', 'parrilla', 'porción', 100, 12, 0, 20, 1, 40, false, false, 'Achura medida'],
  ['Chinchulín', 'parrilla', 'porción', 100, 11, 0, 25, 0.9, 40, false, false, 'Achura medida'],
  ['Choripán táctico', 'parrilla', 'unidad', 110, 11, 17, 16, 0.9, 20, false, true, '1/2 chorizo + 1/2 pan'],
  ['Pizza de pizzería (2 porciones)', 'parrilla', '2 porciones', 250, 26, 70, 26, 2.2, 0, true, true, 'Muzzarella'],
  ['Hamburguesa casera completa', 'parrilla', 'unidad', 300, 40, 35, 28, 3.2, 20, true, true, 'Pan + 150 g de carne + queso + lechuga y tomate'],
  ['Parrillada completa', 'parrilla', 'porción', 400, 70, 0, 60, 5.6, 90, false, true, 'Cortes + achuras + chorizo'],
  ['Helado artesanal (1/4 kg)', 'parrilla', '1/4 kg', 250, 10, 70, 28, 0.9, 0, true, true, ''],
  ['Cerveza (pinta)', 'parrilla', 'pinta 473 ml', 473, 2, 50, 0, 0, 0, false, true, 'Alcohol computado como carbos (~200 kcal)'],
  ['Fernet con cola', 'parrilla', 'vaso', 300, 0, 55, 0, 0, 0, false, true, 'Alcohol + azúcar computados como carbos (~220 kcal)'],
  ['Vino tinto (copa)', 'parrilla', 'copa 150 ml', 150, 0, 31, 0, 0, 0, false, true, 'Alcohol computado como carbos (~125 kcal)'],
  // 1.5 · Clásicos dulces y quiosco deportivo
  ['Postre Vigilante', 'dulce', 'porción', 100, 10, 27, 12, 0.9, 2, true, false, '60 g de queso fresco + 40 g de dulce de batata o membrillo'],
  ['Dulce de leche medido', 'dulce', '1 cda', 15, 1, 8, 1.2, 0.1, 0, true, false, '1 cda = 15 g'],
  ['Chipá', 'dulce', 'unidad', 25, 2.5, 9, 4, 0.2, 0, true, false, ''],
  ['Pan de queso', 'dulce', 'unidad', 30, 3, 10, 4.5, 0.25, 0, true, false, ''],
  ['Alfajor proteico', 'dulce', 'unidad', 50, 15, 21, 7, 1.3, 0, true, false, '', 'ENA / Integra / marcas locales'],
  ['Alfajor de arroz', 'dulce', 'unidad', 23, 1.2, 16, 4, 0.1, 0, false, false, '', 'Rice Up! / Gallo'],
  ['Barrita proteica local', 'dulce', 'unidad', 46, 15, 17, 6, 1.3, 0, true, false, '', 'ENA / Integra / marcas locales'],
  ['Turrón de maní', 'dulce', 'unidad', 25, 3, 15, 5, 0.3, 0, false, false, '', 'Misky / Arcor'],
  ['Manzana', 'fruitveg', 'unidad', 180, 0.5, 25, 0.4, 0.02, 0, false, false, ''],
  ['Frutillas', 'fruitveg', 'taza', 150, 1, 11.5, 0.5, 0.06, 0, false, false, ''],
  ['Vegetales grillados', 'fruitveg', 'plato', 200, 3, 10, 0.5, 0.15, 15, false, false, 'Zapallito, berenjena, morrón, cebolla'],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Versión del catálogo pre-cargado: al subirla, la DB guardada del coach recibe los ítems nuevos sin perder sus cambios. */
export const SEED_VERSION = 2;

const LACTOSE_RE = /yogur|untable|queso|leche|ricota|whey/i;

export function seedFoodDb(): BrandFood[] {
  const dishes: BrandFood[] = DISH_ROWS.map(([nombre, categoria, unidad, gramos, p, c, f, leucina, prep, lactosa, flex, detalle, marca]) => ({
    id: `db-${slug(nombre)}`,
    nombre,
    marca: marca ?? '',
    categoria,
    porcion_base: { cantidad: 1, unidad, gramos },
    macros_por_porcion: { kcal: Math.round(p * 4 + c * 4 + f * 9), p, c, f, leucina },
    es_marca_local: !!marca,
    disponible_para_ia: true,
    prep_min: prep,
    lactosa,
    flex,
    detalle: detalle || undefined,
  }));
  return [...baseItems(), ...dishes];
}

function baseItems(): BrandFood[] {
  return SEED_ROWS.map(([nombre, marca, categoria, cantidad, unidad, gramos, kcal, p, c, f, leucina, local]) => ({
    id: `db-${slug(nombre)}-${slug(marca).split('-')[0]}`,
    nombre,
    marca,
    categoria,
    porcion_base: { cantidad, unidad, gramos },
    macros_por_porcion: { kcal, p, c, f, leucina },
    es_marca_local: local,
    disponible_para_ia: true,
    prep_min: PREP_BY_NAME.find(([re]) => re.test(nombre))?.[1] ?? 0,
    lactosa: LACTOSE_RE.test(nombre),
  }));
}

/** Minutos de preparación de los básicos (lo que no figura es listo para comer). */
const PREP_BY_NAME: [RegExp, number][] = [
  [/pechuga|nalga|cuadril|merluza/i, 15],
  [/huevo|claras/i, 8],
  [/arroz blanco/i, 15],
  [/papa|batata/i, 20],
  [/avena/i, 2],
];

const num = (v: unknown, fb = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fb);

/** Valida un ítem importado (JSON externo); devuelve null si no tiene la forma mínima. */
export function sanitizeBrandFood(raw: unknown): BrandFood | null {
  const r = (raw ?? {}) as Partial<BrandFood>;
  if (typeof r.nombre !== 'string' || !r.nombre.trim()) return null;
  const cat = BRAND_CATEGORIES.includes(r.categoria as BrandCategory) ? (r.categoria as BrandCategory) : 'snack';
  const pb = (r.porcion_base ?? {}) as Partial<BrandFood['porcion_base']>;
  const mp = (r.macros_por_porcion ?? {}) as Partial<BrandFood['macros_por_porcion']>;
  const gramos = num(pb.gramos, 100) || 100;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `db-${slug(r.nombre)}-${Date.now().toString(36)}`,
    nombre: r.nombre.trim(),
    marca: typeof r.marca === 'string' ? r.marca.trim() : '',
    categoria: cat,
    porcion_base: { cantidad: num(pb.cantidad, 1) || 1, unidad: typeof pb.unidad === 'string' && pb.unidad ? pb.unidad : 'g', gramos },
    macros_por_porcion: { kcal: num(mp.kcal), p: num(mp.p), c: num(mp.c), f: num(mp.f), leucina: num(mp.leucina) },
    es_marca_local: !!r.es_marca_local,
    disponible_para_ia: r.disponible_para_ia !== false,
    prep_min: num(r.prep_min, 0),
    lactosa: typeof r.lactosa === 'boolean' ? r.lactosa : LACTOSE_RE.test(r.nombre),
    flex: !!r.flex,
    detalle: typeof r.detalle === 'string' && r.detalle.trim() ? r.detalle.trim() : undefined,
  };
}

export const brandLabel = (b: BrandFood) => (b.marca && b.marca !== 'Genérico' ? `${b.nombre} · ${b.marca}` : b.nombre);
export const portionLabel = (b: BrandFood) =>
  b.porcion_base.unidad === 'g' ? `${b.porcion_base.gramos} g` : `${b.porcion_base.cantidad} ${b.porcion_base.unidad} (${b.porcion_base.gramos} g)`;

/**
 * Las marcas locales con macros entran al motor de comidas como FoodRef (valores por 100 g), así aparecen en el
 * selector, en los Smart Swaps, en la PWA y la IA puede mapear sus platos a ellas.
 */
export function brandFoodsToRefs(db: BrandFood[]): FoodRef[] {
  return db
    // Marcas locales y platos preparados (las porciones genéricas ya existen en la base del Builder).
    .filter((b) => (b.es_marca_local || DISH_CATEGORIES.includes(b.categoria)) && GROUP_OF[b.categoria] && b.porcion_base.gramos > 0 && b.macros_por_porcion.kcal > 0)
    .map((b) => {
      const k = 100 / b.porcion_base.gramos;
      const m = b.macros_por_porcion;
      return {
        id: b.id,
        name: brandLabel(b),
        brand: b.marca,
        group: GROUP_OF[b.categoria]!,
        unit: b.porcion_base.unidad === 'g' ? undefined : { label: b.porcion_base.unidad, grams: b.porcion_base.gramos },
        p: Math.round(m.p * k * 10) / 10,
        c: Math.round(m.c * k * 10) / 10,
        f: Math.round(m.f * k * 10) / 10,
        leucine: Math.round(m.leucina * k * 100) / 100,
        ai: b.disponible_para_ia,
      };
    });
}

/** Ítems de la canasta del atleta: `basket` = ids tildados (null / undefined = todo lo habilitado para IA). */
export function basketItems(db: BrandFood[], basket?: string[] | null) {
  const set = basket ? new Set(basket) : null;
  return db.filter((b) => b.disponible_para_ia && (!set || set.has(b.id)));
}

/** Catálogo formateado para el Prompt Engine: canasta del atleta ∩ habilitado para IA. */
export function foodDbPromptBlock(db: BrandFood[], basket?: string[] | null) {
  const active = basketItems(db, basket);
  if (!active.length) return '';
  const strict = Array.isArray(basket);
  const byCat = BRAND_CATEGORIES.map((c) => {
    const rows = active.filter((b) => b.categoria === c);
    if (!rows.length) return '';
    return `${BRAND_CATEGORY_LABEL[c].toUpperCase()}:\n${rows
      .map((b) => {
        const m = b.macros_por_porcion;
        if (b.categoria === 'supplement') return `- ${brandLabel(b)} · ${portionLabel(b)}`;
        return `- ${brandLabel(b)}${b.flex ? ' [FLEX]' : ''} · porción ${portionLabel(b)}${b.detalle ? ` (${b.detalle})` : ''} · ${m.kcal} kcal · P ${m.p} g · C ${m.c} g · G ${m.f} g${m.leucina ? ` · Leu ${m.leucina} g` : ''}`;
      })
      .join('\n')}`;
  }).filter(Boolean);
  const head = strict
    ? 'CANASTA DE ALIMENTOS PERMITIDOS DEL ATLETA (Food & Brand DB):\nUsá ÚNICAMENTE estos alimentos, marcas y preparaciones para componer los platos; fuera de la lista sólo se permiten vegetales de hoja, condimentos, agua e infusiones sin azúcar.'
    : 'CATÁLOGO DE ALIMENTOS Y MARCAS REALES (Food & Brand DB del coach):\nUsa prioritariamente esta lista de productos y marcas reales para componer los platos del atleta.';
  return `${head} Respetá porciones y combinaciones culinarias lógicas. Nombrá productos y platos tal como figuran (ej. "Yogur Proteico Descremado · La Serenísima Pro"). Los ítems [FLEX] son permitidos sociales: máximo 1 por semana y nunca en la ventana post-entreno.
${byCat.join('\n')}`;
}
