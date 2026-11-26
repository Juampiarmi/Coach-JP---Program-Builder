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
  | 'protein-snack'
  | 'plato';

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
  /** true = cargado por el coach desde «Crear alimento / marca» o la Food & Brand DB (persistido en localStorage). */
  custom?: boolean;
  /** false = la IA no puede mapear sus platos a este producto (toggle «disponible para IA» de la Food & Brand DB). */
  ai?: boolean;
  /** Plato / receta: categoría de la Food & Brand DB (desayuno, minuta, tarta…). */
  dishCat?: string;
  flex?: boolean;
  /** Receta: ingredientes por porción base (para el desglose táctico) y técnica de cocción. */
  recipe?: { name: string; grams: number }[];
  technique?: string;
  /** Preparación paso a paso del plato. */
  steps?: string[];
  /** Plato con lactosa / minutos de preparación (filtros de preferencia de la Biblioteca de planes). */
  lactose?: boolean;
  prep?: number;
  /** Franjas del día permitidas (platos). Sin definir = según el grupo (ver mealSlots). */
  slots?: ('am' | 'main' | 'peri')[];
  /** Detalle legible de la porción (cuando no hay receta estructurada). */
  detail?: string;
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
  { id: 'huevo', name: 'Huevo entero', group: 'eggs', unit: { label: 'u', grams: 60 }, p: 12.6, c: 0.7, f: 9.5, leucine: 1.09 },
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
  // Verduras de todos los días (crudas, por 100 g · ARGENFOODS / USDA): para recetas propias y la carga rápida.
  { id: 'tomate', name: 'Tomate', group: 'veg', unit: { label: 'u', grams: 150 }, p: 0.9, c: 3.9, f: 0.2, leucine: 0.03 },
  { id: 'lechuga', name: 'Lechuga', group: 'veg', unit: { label: 'taza', grams: 40 }, p: 1.4, c: 2.9, f: 0.2, leucine: 0.08 },
  { id: 'zanahoria', name: 'Zanahoria', group: 'veg', unit: { label: 'u', grams: 100 }, p: 0.9, c: 9.6, f: 0.2, leucine: 0.1 },
  { id: 'zucchini', name: 'Zucchini / zapallito largo', group: 'veg', unit: { label: 'u', grams: 200 }, p: 1.2, c: 3.1, f: 0.3, leucine: 0.07 },
  { id: 'zapallito', name: 'Zapallito redondo', group: 'veg', unit: { label: 'u', grams: 150 }, p: 1.1, c: 3.4, f: 0.2, leucine: 0.06 },
  { id: 'berenjena', name: 'Berenjena', group: 'veg', unit: { label: 'u', grams: 250 }, p: 1, c: 5.9, f: 0.2, leucine: 0.06 },
  { id: 'espinaca', name: 'Espinaca', group: 'veg', unit: { label: 'taza', grams: 30 }, p: 2.9, c: 3.6, f: 0.4, leucine: 0.22 },
  { id: 'brocoli', name: 'Brócoli', group: 'veg', unit: { label: 'taza', grams: 90 }, p: 2.8, c: 6.6, f: 0.4, leucine: 0.13 },
  { id: 'morron', name: 'Morrón', group: 'veg', unit: { label: 'u', grams: 180 }, p: 1, c: 6, f: 0.3, leucine: 0.04 },
  { id: 'cebolla', name: 'Cebolla', group: 'veg', unit: { label: 'u', grams: 150 }, p: 1.1, c: 9.3, f: 0.1, leucine: 0.03 },
  { id: 'champinones', name: 'Champiñones', group: 'veg', unit: { label: 'taza', grams: 70 }, p: 3.1, c: 3.3, f: 0.3, leucine: 0.12 },
  { id: 'choclo', name: 'Choclo (granos cocidos)', group: 'starch', unit: { label: 'taza', grams: 150 }, p: 3.3, c: 19, f: 1.4, leucine: 0.35, equiv: ['papa', 'arroz'] },
  { id: 'arvejas', name: 'Arvejas (cocidas)', group: 'starch', unit: { label: 'taza', grams: 150 }, p: 5.4, c: 14, f: 0.4, leucine: 0.32, equiv: ['lentejas'] },
  { id: 'harina-avena', name: 'Harina de avena', group: 'cereal', p: 13, c: 60, f: 7, leucine: 1.0, equiv: ['avena'] },
  // Recetario Coach JP (55 preparaciones): ingredientes que faltaban (valores por 100 g · ARGENFOODS / USDA / etiqueta).
  { id: 'pepino', name: 'Pepino', group: 'veg', unit: { label: 'u', grams: 200 }, p: 0.7, c: 3.6, f: 0.1, leucine: 0.03 },
  { id: 'rucula', name: 'Rúcula', group: 'veg', unit: { label: 'taza', grams: 20 }, p: 2.6, c: 3.7, f: 0.7, leucine: 0.15 },
  { id: 'apio', name: 'Apio', group: 'veg', unit: { label: 'rama', grams: 40 }, p: 0.7, c: 3, f: 0.2, leucine: 0.03 },
  { id: 'pera', name: 'Pera', group: 'fruit', unit: { label: 'u', grams: 180 }, p: 0.4, c: 15, f: 0.1, leucine: 0.02 },
  { id: 'kiwi', name: 'Kiwi', group: 'fruit', unit: { label: 'u', grams: 75 }, p: 1.1, c: 15, f: 0.5, leucine: 0.07 },
  { id: 'arandanos', name: 'Arándanos', group: 'fruit', unit: { label: 'taza', grams: 150 }, p: 0.7, c: 14, f: 0.3, leucine: 0.04 },
  { id: 'almendras', name: 'Almendras', group: 'fat', p: 21, c: 22, f: 50, leucine: 1.5, equiv: ['nueces'] },
  { id: 'pasas', name: 'Pasas de uva', group: 'fruit', p: 3, c: 79, f: 0.5, leucine: 0.1 },
  { id: 'quinoa', name: 'Quinoa (cocida)', group: 'starch', p: 4.4, c: 21, f: 1.9, leucine: 0.26, equiv: ['arroz', 'yamani'] },
  { id: 'fideos-integrales', name: 'Fideos integrales (cocidos)', group: 'starch', p: 5.5, c: 27, f: 1, leucine: 0.4, equiv: ['fideos'] },
  { id: 'fideos-legumbres', name: 'Fideos de legumbres sin TACC (cocidos)', group: 'starch', p: 11, c: 25, f: 1.5, leucine: 0.8, equiv: ['fideos-sin-tacc'] },
  { id: 'tapa-tarta', name: 'Tapa de tarta integral', group: 'cereal', unit: { label: 'porción (¼ tapa)', grams: 50 }, p: 8, c: 50, f: 14, leucine: 0.55 },
  { id: 'tapa-tarta-sin-tacc', name: 'Tapa de tarta sin TACC', group: 'cereal', unit: { label: 'porción (¼ tapa)', grams: 50 }, p: 4, c: 55, f: 12, leucine: 0.3 },
  { id: 'tortillas-maiz', name: 'Tortillas de maíz', group: 'cereal', unit: { label: 'u', grams: 30 }, p: 5.7, c: 45, f: 2.9, leucine: 0.7 },
  { id: 'hummus', name: 'Hummus de garbanzos', group: 'fat', unit: { label: 'cda', grams: 20 }, p: 8, c: 14, f: 10, leucine: 0.55 },
  { id: 'cottage', name: 'Queso cottage', group: 'dairy-protein', p: 11, c: 3.4, f: 4, leucine: 1.1, equiv: ['ricota'] },
  { id: 'aceitunas', name: 'Aceitunas', group: 'fat', p: 0.8, c: 4, f: 11, leucine: 0.03 },
  // Cacao amargo en polvo (sin azúcar): carbos disponibles (la fibra, ~33 g/100 g, no se cuenta).
  { id: 'cacao-amargo', name: 'Cacao amargo en polvo', group: 'fat', unit: { label: 'cda', grams: 10 }, p: 20, c: 16, f: 14, leucine: 1.2 },
  { id: 'avena-sin-tacc', name: 'Avena certificada sin TACC', group: 'cereal', p: 13, c: 60, f: 7, leucine: 1.0, equiv: ['galletas-arroz'] },
  { id: 'granola-sin-tacc', name: 'Granola sin TACC', group: 'cereal', p: 8, c: 66, f: 12, leucine: 0.6, equiv: ['avena-sin-tacc'] },
  // Biblioteca de planes: variantes sin lactosa y plant-based.
  { id: 'leche-deslactosada', name: 'Leche descremada deslactosada', group: 'dairy-protein', unit: { label: 'taza', grams: 250 }, p: 3.3, c: 5, f: 0.1, leucine: 0.33, equiv: ['leche'] },
  { id: 'yogur-deslactosado', name: 'Yogur descremado deslactosado', group: 'dairy-protein', p: 6, c: 6, f: 0.5, leucine: 0.6, equiv: ['yogur'] },
  { id: 'whey-isolate', name: 'Whey protein aislado (sin lactosa)', group: 'whey', unit: { label: 'scoop', grams: 30 }, p: 88, c: 2, f: 1, leucine: 9.5, equiv: ['whey'] },
  { id: 'tofu', name: 'Tofu firme', group: 'lean-protein', p: 15, c: 2, f: 8, leucine: 1.2 },
  { id: 'garbanzos', name: 'Garbanzos (cocidos)', group: 'starch', p: 8.9, c: 27, f: 2.6, leucine: 0.63, equiv: ['lentejas'] },
  // Banco de planes maestros: platos típicos argentinos y variantes Sin TACC / vegetariana (valores promedio de tabla AR).
  { id: 'jamon', name: 'Jamón cocido natural', group: 'lean-protein', unit: { label: 'feta', grams: 20 }, p: 19, c: 1, f: 3.5, leucine: 1.5 },
  { id: 'granola', name: 'Granola', group: 'cereal', p: 9, c: 64, f: 14, leucine: 0.7, equiv: ['avena'] },
  { id: 'polenta', name: 'Polenta (cocida)', group: 'starch', p: 1.6, c: 15, f: 0.3, leucine: 0.15, equiv: ['papa', 'arroz'] },
  { id: 'calabaza', name: 'Calabaza / zapallo (cocido)', group: 'starch', p: 1, c: 7, f: 0.1, leucine: 0.05, equiv: ['papa', 'batata'] },
  { id: 'harina-arroz', name: 'Harina de arroz sin TACC', group: 'cereal', p: 6, c: 80, f: 1.4, leucine: 0.5 },
  { id: 'pan-sin-tacc', name: 'Pan sin TACC (sello oficial)', group: 'cereal', unit: { label: 'rebanada', grams: 30 }, p: 3, c: 50, f: 5, leucine: 0.2, equiv: ['galletas-arroz', 'tostadas-arroz'] },
  { id: 'fideos-sin-tacc', name: 'Fideos de arroz o maíz sin TACC (cocidos)', group: 'starch', p: 2.5, c: 30, f: 0.5, leucine: 0.2, equiv: ['arroz', 'papa'] },
  { id: 'pan-arabe', name: 'Pan árabe integral', group: 'cereal', unit: { label: 'u', grams: 60 }, p: 9, c: 50, f: 2.5, leucine: 0.65, equiv: ['pan'] },
  { id: 'noquis', name: 'Ñoquis de papa (cocidos)', group: 'starch', p: 3.5, c: 30, f: 1, leucine: 0.25, equiv: ['fideos', 'papa'] },
  { id: 'porotos', name: 'Porotos (cocidos)', group: 'starch', p: 8.5, c: 22, f: 0.5, leucine: 0.7, equiv: ['lentejas', 'garbanzos'] },
  { id: 'soja-texturizada', name: 'Soja texturizada (hidratada)', group: 'lean-protein', p: 17, c: 11, f: 0.4, leucine: 1.3, equiv: ['tofu'] },
  { id: 'naranja', name: 'Naranja / mandarina', group: 'fruit', unit: { label: 'u', grams: 150 }, p: 0.9, c: 10, f: 0.2, leucine: 0.02 },
  { id: 'pan-rallado', name: 'Pan rallado (rebozado)', group: 'cereal', p: 12, c: 72, f: 2, leucine: 0.8 },
  // Sustitutos seguros para alergias / intolerancias (lib/allergens.ts).
  { id: 'semillas', name: 'Semillas de girasol y chía', group: 'fat', p: 20, c: 15, f: 48, leucine: 1.3, equiv: ['palta', 'oliva'] },
  { id: 'untable-deslactosado', name: 'Queso untable descremado sin lactosa', group: 'dairy-protein', p: 10, c: 3, f: 1, leucine: 0.98, equiv: ['untable'] },
  { id: 'queso-deslactosado', name: 'Queso cremoso light sin lactosa', group: 'dairy-protein', p: 22, c: 1, f: 14, leucine: 2.0, equiv: ['queso-light'] },
  // Alergia a la proteína de la leche (APLV): alternativas vegetales fortificadas con calcio.
  { id: 'bebida-soja', name: 'Bebida de soja fortificada (calcio)', group: 'dairy-protein', unit: { label: 'taza', grams: 250 }, p: 3.3, c: 2.5, f: 1.8, leucine: 0.27, equiv: ['leche'] },
  { id: 'bebida-almendra', name: 'Bebida de almendras fortificada (calcio)', group: 'dairy-protein', unit: { label: 'taza', grams: 250 }, p: 0.6, c: 1.5, f: 1.2, leucine: 0.04, equiv: ['leche'] },
  { id: 'yogur-vegetal', name: 'Yogur de soja fortificado', group: 'dairy-protein', p: 4, c: 6, f: 2, leucine: 0.33, equiv: ['yogur'] },
  { id: 'proteina-vegetal', name: 'Proteína vegetal aislada (arveja)', group: 'whey', unit: { label: 'scoop', grams: 30 }, p: 80, c: 3, f: 6, leucine: 6.6, equiv: ['whey'] },
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
  plato: 'Plato preparado',
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
  // Platos preparados: se intercambian por proteína (el macro que define la comida principal).
  plato: 'p',
};

/** Kcal por 100 g (Atwater 4/4/9). */
export const kcalPer100 = (f: Pick<FoodRef, 'p' | 'c' | 'f'>) => f.p * 4 + f.c * 4 + f.f * 9;

const BUILTIN_IDS = new Set(FOODS.map((f) => f.id));

/**
 * Registra los alimentos / marcas personalizados del coach en la base viva (FOODS + FOOD_BY_ID),
 * así quedan disponibles en el selector, los Smart Swaps, el motor de macros y la PWA exportada.
 */
const SOURCES: Record<'custom' | 'db', FoodRef[]> = { custom: [], db: [] };

/** Registra una fuente de alimentos propios (marcas creadas a mano o Food & Brand DB) y reconstruye la base viva. */
export function registerFoodSource(source: 'custom' | 'db', list: FoodRef[]) {
  SOURCES[source] = list;
  rebuildCustom();
}

export function registerCustomFoods(list: FoodRef[]) {
  registerFoodSource('custom', list);
}

function rebuildCustom() {
  for (let i = FOODS.length - 1; i >= 0; i--) if (FOODS[i].custom) FOODS.splice(i, 1);
  for (const id of Object.keys(FOOD_BY_ID)) if (FOOD_BY_ID[id].custom) delete FOOD_BY_ID[id];
  for (const f of [...SOURCES.custom, ...SOURCES.db]) {
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
/**
 * Paso real de cada alimento que se come por unidad: huevo entero (~60 g), claras (de a una, mínimo 2), barras y
 * alfajores proteicos (siempre 1 unidad entera). El resto, de a 5 g.
 */
export function unitStep(id: string | undefined) {
  if (!id) return 5;
  if (id === 'huevo') return 60;
  if (id === 'claras') return 33;
  const f = FOOD_BY_ID[id];
  if (f?.group === 'protein-snack' && f.unit) return f.unit.grams;
  return 5;
}
/** Redondea a unidades enteras (huevos, claras, barras) o a 5 g; nunca menos de una unidad. */
export function snapUnit(id: string | undefined, grams: number) {
  const st = unitStep(id);
  return Math.max(st, Math.round(grams / st) * st);
}

export function equivalentGrams(fromId: string, grams: number, toId: string) {
  const from = FOOD_BY_ID[fromId];
  const to = FOOD_BY_ID[toId];
  if (!from || !to || fromId === toId) return grams;
  const anchor = GROUP_ANCHOR[from.group];
  if (!(to[anchor] > 0)) return grams;
  return snapUnit(toId, (from[anchor] * grams) / to[anchor]);
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
export function matchFood(name: string, opts: { baseOnly?: boolean } = {}): FoodRef | undefined {
  const n = normalize(name);
  if (opts.baseOnly) return matchAlias(n);
  // Primero las marcas / alimentos personalizados del coach (coincidencia por nombre).
  // Nombre completo con marca primero ("yogur proteico descremado · milkaut pro"), después el nombre base.
  const exact = FOODS.find((f) => f.custom && f.ai !== false && n.length >= 4 && n.includes(normalize(f.name)));
  if (exact) return exact;
  const custom = FOODS.find((f) => {
    if (!f.custom || f.ai === false || n.length < 4) return false;
    const base = normalize(f.name.split(' · ')[0]);
    return n.includes(base) || base.includes(n);
  });
  if (custom) return custom;
  return matchAlias(n);
}

function matchAlias(n: string): FoodRef | undefined {
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
    [/harina de avena/, 'harina-avena'],
    [/avena (instantanea|rapida|quick)/, 'avena-instantanea'],
    [/tostada.*arroz/, 'tostadas-arroz'],
    [/avena/, 'avena'],
    [/galleta.*arroz|arroz inflado/, 'galletas-arroz'],
    [/yamani|integral.*arroz|arroz.*integral/, 'yamani'],
    [/arroz/, 'arroz'],
    [/fideo|pasta seca|spaghetti|tallarin/, 'fideos'],
    [/batata|camote/, 'batata'],
    [/papa/, 'papa'],
    [/garbanzo/, 'garbanzos'],
    [/poroto/, 'porotos'],
    [/lenteja|legumbre/, 'lentejas'],
    [/tofu/, 'tofu'],
    [/choclo|maiz dulce/, 'choclo'],
    [/arveja/, 'arvejas'],
    [/calabaza|zapallo(?!s? ?(redondo|ito))|anco/, 'calabaza'],
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
    [/berenjena/, 'berenjena'],
    [/zucchini|zuchini|zapallito largo|calabacin/, 'zucchini'],
    [/zapallito/, 'zapallito'],
    [/espinaca|acelga/, 'espinaca'],
    [/brocoli|brocol/, 'brocoli'],
    [/morron|pimiento/, 'morron'],
    [/cebolla|cebolleta|puerro|verdeo/, 'cebolla'],
    [/tomate/, 'tomate'],
    [/zanahoria/, 'zanahoria'],
    [/lechuga|rucula|hojas verdes/, 'lechuga'],
    [/champi|hongo/, 'champinones'],
    [/semilla|chia|lino|girasol/, 'semillas'],
    [/queso/, 'queso-light'],
    [/vegetal|ensalada|verdura/, 'vegetales'],
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

/**
 * Fibra (g / 100 g) de los alimentos con carbos relevantes: carbos netos = carbos totales − fibra. Es la medida que
 * usan los protocolos Keto (≤ 30-50 g netos/día) y Low Carb (~50-100 g netos/día). Fuente: tablas USDA / ARGENFOOD.
 */
export const FIBER: Record<string, number> = {
  palta: 6.7, nueces: 6.7, almendras: 12.5, mani: 6, semillas: 15, aceitunas: 3.2, frutillas: 2, arandanos: 2.4, manzana: 2.4, pera: 3.1, kiwi: 3, naranja: 2.4, banana: 2.6,
  lentejas: 7.9, garbanzos: 7.6, porotos: 6.4, arvejas: 5.5, quinoa: 2.8, avena: 10, 'avena-sin-tacc': 10, 'harina-avena': 10, pan: 7, 'fideos-integrales': 4, 'fideos-legumbres': 7, yamani: 1.8, choclo: 2.7, batata: 3, papa: 1.8, calabaza: 2,
  espinaca: 2.2, brocoli: 2.6, lechuga: 1.3, tomate: 1.2, zucchini: 1, zapallito: 1.1, champinones: 1, morron: 2, rucula: 1.6, pepino: 0.5, apio: 1.6, cebolla: 1.7, berenjena: 3, zanahoria: 2.8, vegetales: 2.5,
  hummus: 6, granola: 7, 'granola-sin-tacc': 7, 'galletas-arroz': 3, tofu: 0.3, 'soja-texturizada': 13, 'bebida-almendra': 0.4,
};
/** Carbos netos de un ingrediente (g). */
export const netCarbsOf = (it: { foodId?: string; grams: number; c: number }) => Math.max(0, it.c - (it.foodId ? ((FIBER[it.foodId] ?? 0) * it.grams) / 100 : 0));
/** Carbos netos de una lista de ingredientes (g). */
export const netCarbs = (items: { foodId?: string; grams: number; c: number }[]) => items.reduce((a, i) => a + netCarbsOf(i), 0);
