import type { FoodRef, SwapGroup } from './foods';
import type { MealRole } from './types';

/**
 * Franjas culinarias (meal_slot): relación estricta CATEGORÍA ↔ MOMENTO DEL DÍA.
 *  · am   → Desayuno / Merienda: toast bar, huevos, pancakes, yogures, granola, frutas y panadería integral.
 *  · main → Almuerzo / Cena: platos principales, minutas, tartas, pastas, guisos, parrilla y ensaladas.
 *  · peri → Pre-WOD / Post-WOD: fácil digestión, carbos de IG rápido / medio, lácteos proteicos, frutas,
 *           frutos secos, galletas de arroz y snacks de quiosco / dietética aprobados.
 * Se aplica en el generador de opciones, en el selector manual y los swaps del Builder, en los swaps de la PWA
 * y en el contexto que recibe la IA.
 */
export type FoodSlot = 'am' | 'main' | 'peri';

export const SLOT_OF: Record<MealRole, FoodSlot> = {
  breakfast: 'am',
  snack: 'am',
  lunch: 'main',
  dinner: 'main',
  peri: 'peri',
  post: 'peri',
};

export const FOOD_SLOT_LABEL: Record<FoodSlot, string> = {
  am: 'DESAYUNO / MERIENDA',
  main: 'ALMUERZO / CENA',
  peri: 'PRE-WOD / POST-WOD',
};

/** Franjas por grupo de alimento base (los platos traen las suyas desde la Food & Brand DB). */
const GROUP_SLOTS: Record<SwapGroup, FoodSlot[]> = {
  'lean-protein': ['main'],
  eggs: ['am', 'main'],
  'dairy-protein': ['am', 'peri', 'main'],
  whey: ['am', 'peri'],
  starch: ['main'],
  cereal: ['am', 'peri', 'main'],
  fruit: ['am', 'peri', 'main'],
  fat: ['am', 'main'],
  veg: ['am', 'main'],
  'sport-carb': ['peri', 'am'],
  'protein-snack': ['peri', 'am'],
  plato: ['main'],
};

/** Excepciones por alimento: frutos secos y carbos de IG medio sí van en las colaciones peri-entreno. */
const FOOD_SLOTS: Record<string, FoodSlot[]> = {
  nueces: ['am', 'peri', 'main'],
  mani: ['am', 'peri'],
  arroz: ['main', 'peri'],
  batata: ['main', 'peri'],
  oliva: ['am', 'main'],
  isotonica: ['peri'],
};

export function foodSlots(ref: Pick<FoodRef, 'id' | 'group' | 'slots'>): FoodSlot[] {
  return ref.slots?.length ? ref.slots : (FOOD_SLOTS[ref.id] ?? GROUP_SLOTS[ref.group] ?? ['main']);
}

export const fitsSlot = (ref: Pick<FoodRef, 'id' | 'group' | 'slots'> | undefined, role: MealRole) => !ref || foodSlots(ref).includes(SLOT_OF[role]);

/**
 * Franjas de un plato del catálogo según su categoría y composición (sin carnes rojas ni minutas a la mañana,
 * sin platos pesados o grasos antes / después de entrenar).
 */
export function dishSlots(categoria: string, nombre: string, detalle: string, fatPerPortion: number): FoodSlot[] {
  const txt = `${nombre} ${detalle}`;
  switch (categoria) {
    case 'desayuno':
      // Huevos, jamón y tostados quedan para el desayuno; lo liviano y bajo en grasa también sirve de colación peri-entreno.
      return fatPerPortion <= 10 && !/huevo|omelette|revuelto|tostado|jam[oó]n|palta|avocado/i.test(txt) ? ['am', 'peri'] : ['am'];
    case 'dulce':
      if (/alfajor proteico|alfajor de arroz|barrita|turr[oó]n|arroz con leche|gelatina/i.test(txt)) return ['peri', 'am'];
      return ['am'];
    case 'fruitveg':
      return /vegetal|ensalada/i.test(txt) ? ['main'] : ['am', 'peri', 'main'];
    default:
      // minuta, tarta, parrilla y platos del coach: almuerzo / cena.
      return ['main'];
  }
}
