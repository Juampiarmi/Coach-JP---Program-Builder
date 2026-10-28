import type { Budget } from './types';

/**
 * Marcas / canales de compra de referencia del mercado argentino en 3 niveles de presupuesto:
 *  1 · Económico / rápido (marcas propias de supermercado, sueltos de dietética)
 *  2 · Estándar / comercial (consumo masivo)
 *  3 · Premium / pro (líneas proteicas o especializadas)
 * Son sugerencias de compra: siempre se verifica la tabla nutricional del envase.
 */
export type BrandTier = [string, string, string];

export const TIER_LABEL: BrandTier = ['Nivel 1 · Económico / Rápido', 'Nivel 2 · Estándar / Comercial', 'Nivel 3 · Premium / Pro'];

// Frescos y carnes: los 3 niveles son canales de compra reales (no hay marca de góndola para un corte o una verdura).
const FRESH: BrandTier = ['Verdulería de barrio', 'Supermercado (Coto / Carrefour / Día)', 'Verdulería de estación / Selección'];
const MEAT: BrandTier = ['Carnicería de barrio', 'Bandeja Coto / Carrefour / Día', 'Frigorífico / Corte Premium Angus'];

export const BRAND_TIERS: Record<string, BrandTier> = {
  pollo: ['Pollería / carnicería de barrio', 'Bandeja Coto / Carrefour / Día', 'Frigorífico / Pollo de campo seleccionado'],
  cuadril: MEAT,
  lomo: MEAT,
  nalga: MEAT,
  picada: ['Carnicería de barrio (picada especial)', 'Bandeja Coto / Carrefour / Día (picada especial 5 %)', 'Frigorífico / Corte Premium (nalga picada a pedido)'],
  merluza: ['Pescadería de barrio', 'Bandeja Coto / Carrefour / Día (filet fresco o congelado)', 'Pescadería de selección (filet despinado)'],
  atun: ['Marolio / Día', 'La Campagnola', 'Gomes da Costa'],
  cerdo: ['Carnicería de barrio', 'Bandeja Coto / Carrefour / Día', 'Frigorífico / Corte Premium de cerdo'],
  tofu: ['Tofu de dietética', 'Tofu envasado de supermercado', 'Tofu orgánico de dietética'],
  huevo: ['Huevos sueltos de granja', 'Huevos blancos / color de supermercado', 'Huevos de gallinas libres de jaula'],
  claras: ['Huevos sueltos (separar las claras)', 'Claras líquidas pasteurizadas de supermercado', 'Claras pasteurizadas premium'],
  ricota: ['Ricota Día / Coto', 'La Serenísima', 'Ilolay (descremada)'],
  yogur: ['Yogur descremado Día / Coto', 'La Serenísima Ser', 'Milkaut Pro / La Serenísima Pro'],
  'yogur-proteico': ['Yogur bebible Día / Coto', 'La Serenísima Ser', 'Milkaut Pro / La Serenísima Pro'],
  'yogur-deslactosado': ['Yogur sin lactosa Día / Coto', 'La Serenísima Zero Lactosa', 'Yogur griego deslactosado (líneas Pro)'],
  untable: ['Mendicrim / Día', 'San Ignacio / La Serenísima', 'Finlandia Balance'],
  'queso-light': ['Port Salut light Día / Coto', 'La Serenísima light', 'Ilolay / Milkaut light'],
  leche: ['Leche descremada Día / Coto', 'La Serenísima / Ilolay', 'Leche alta en proteínas (líneas Pro)'],
  'leche-deslactosada': ['Leche sin lactosa Día / Coto', 'La Serenísima Zero Lactosa', 'Ilolay / Milkaut deslactosada'],
  whey: ['Whey suelto de dietética', 'ENA Whey / Gentech', 'Star Nutrition Platinum Whey'],
  'whey-isolate': ['Whey aislado de dietética', 'ENA Whey Isolate', 'Star Nutrition Whey Isolate'],
  avena: ['Avena suelta de dietética / Marolio', 'Quaker', 'Granix / avena sin TACC'],
  'avena-instantanea': ['Avena instantánea Día / Marolio', 'Quaker instantánea', 'Granix / avena sin TACC'],
  pan: ['Pan integral de panadería', 'Bimbo / Fargo integral', 'Pan de masa madre con semillas'],
  'pan-lactal': ['Pan lactal Día / Coto', 'Bimbo / Fargo integral', 'Pan lactal con semillas'],
  'galletas-arroz': ['Galletas de arroz Día / Coto', 'Gallo Snacks', 'Gallo Snacks integrales / con semillas'],
  'tostadas-arroz': ['Tostadas de arroz Día / Coto', 'Gallo Snacks', 'Gallo Snacks integrales / con semillas'],
  tutucas: ['Tutucas sueltas de dietética', 'Cisne', 'Granix'],
  'copos-maiz': ['Copos sueltos de dietética', "Kellogg's / Granix", 'Copos sin azúcar agregada (Granix)'],
  'galletitas-agua': ['Galletitas Día / Marolio', 'Criollitas / Express', 'Granix integrales'],
  arroz: ['Marolio / Día', 'Gallo Oro', 'Dos Hermanos / Gallo integral'],
  yamani: ['Yamaní suelto de dietética', 'Gallo / Dos Hermanos yamaní', 'Yamaní orgánico de dietética'],
  fideos: ['Marolio / Día', 'Lucchetti / Matarazzo', 'Don Vicente / fideos integrales'],
  lentejas: ['Lentejas sueltas de dietética', 'Marolio / Día (lata o paquete)', 'Legumbres orgánicas de dietética'],
  garbanzos: ['Garbanzos sueltos de dietética', 'Marolio / Día (lata o paquete)', 'Legumbres orgánicas de dietética'],
  papa: FRESH,
  batata: FRESH,
  vegetales: FRESH,
  banana: FRESH,
  manzana: FRESH,
  frutillas: FRESH,
  palta: FRESH,
  miel: ['Miel suelta de dietética', 'Miel de supermercado (frasco)', 'Miel pura de productor'],
  'dulce-membrillo': ['Dulce de membrillo Día / Coto', 'Arcor / Emeth', 'Dulce de membrillo sin azúcar agregada'],
  isotonica: ['Bebida isotónica Día / Coto', 'Gatorade / Powerade', 'Electrolitos en polvo (ENA / Star Nutrition)'],
  mani: ['Pasta de maní de dietética', 'King', 'King sin azúcar agregada'],
  oliva: ['Marolio / Día', 'Cocinero', 'Lira / Zuccardi extra virgen'],
  nueces: ['Nueces sueltas de dietética', 'Bolsita Día / Marolio', 'Nueces mariposa premium de dietética'],
  'alfajor-proteico': ['Alfajor proteico de dietética', 'Integra', 'ENA / Star Nutrition'],
  'barra-proteica': ['Barrita proteica de dietética', 'Integra', 'ENA / Star Nutrition'],
  'barrita-cereal': ['Barritas Día / Coto', 'Cereal Mix (Arcor)', 'Barritas sin azúcar agregada de dietética'],
};

export const TIER_OF_BUDGET: Record<Budget, 0 | 1 | 2> = { low: 0, mid: 1, high: 2 };

export const brandsFor = (foodId?: string) => (foodId ? BRAND_TIERS[foodId] : undefined);
