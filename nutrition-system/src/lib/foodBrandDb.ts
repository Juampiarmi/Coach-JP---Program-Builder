import type { FoodRef, SwapGroup } from './foods';

export type BrandCategory = 'protein' | 'starch' | 'fat' | 'dairy' | 'snack' | 'fruitveg' | 'supplement';

export const BRAND_CATEGORY_LABEL: Record<BrandCategory, string> = {
  protein: 'Proteína Magra',
  starch: 'Almidón / Carbohidrato',
  fat: 'Grasa Saludable',
  dairy: 'Lácteo Proteico',
  snack: 'Cereal / Snack Táctico',
  fruitveg: 'Fruta / Vegetal',
  supplement: 'Suplemento',
};
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

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function seedFoodDb(): BrandFood[] {
  return SEED_ROWS.map(([nombre, marca, categoria, cantidad, unidad, gramos, kcal, p, c, f, leucina, local]) => ({
    id: `db-${slug(nombre)}-${slug(marca).split('-')[0]}`,
    nombre,
    marca,
    categoria,
    porcion_base: { cantidad, unidad, gramos },
    macros_por_porcion: { kcal, p, c, f, leucina },
    es_marca_local: local,
    disponible_para_ia: true,
  }));
}

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
    .filter((b) => b.es_marca_local && GROUP_OF[b.categoria] && b.porcion_base.gramos > 0 && b.macros_por_porcion.kcal > 0)
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

/** Catálogo activo formateado para el Prompt Engine (sólo lo habilitado para IA). */
export function foodDbPromptBlock(db: BrandFood[]) {
  const active = db.filter((b) => b.disponible_para_ia);
  if (!active.length) return '';
  const byCat = BRAND_CATEGORIES.map((c) => {
    const rows = active.filter((b) => b.categoria === c);
    if (!rows.length) return '';
    return `${BRAND_CATEGORY_LABEL[c].toUpperCase()}:\n${rows
      .map((b) => {
        const m = b.macros_por_porcion;
        if (b.categoria === 'supplement') return `- ${brandLabel(b)} · ${portionLabel(b)}`;
        return `- ${brandLabel(b)} · porción ${portionLabel(b)} · ${m.kcal} kcal · P ${m.p} g · C ${m.c} g · G ${m.f} g${m.leucina ? ` · Leu ${m.leucina} g` : ''}`;
      })
      .join('\n')}`;
  }).filter(Boolean);
  return `CATÁLOGO DE ALIMENTOS Y MARCAS REALES (Food & Brand DB del coach):
Usa prioritariamente esta lista de productos y marcas reales para componer los platos del atleta. Respeta las porciones y combinaciones culinarias lógicas. Nombrá los productos de marca tal como figuran (ej. "Yogur Proteico Descremado · La Serenísima Pro").
${byCat.join('\n')}`;
}
