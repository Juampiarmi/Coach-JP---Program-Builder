import { DEFAULT_TRAINING, fits, hhmm, isMidday, mainAnchors, r15, snackTries, trainingOf, type MainTimes, type Training } from './agenda';
import { allergiesOf, FOOD_ALLERGENS, safeRecipes, type Allergen } from './allergens';
import { CITES } from './evidence';
import { FOOD_BY_ID, unitStep } from './foods';
import { comboSteps, type Combo, type ComboPart } from './menuOptions';
import { isLiquid, mealVolumeCap, portionCap, solidGrams, type CapCtx } from './portionCaps';
import { itemFromFood, uid } from './seed';
import type { AthletePlan, FoodItem, Macros, Meal, MealDay, MealRole, Phase, Sex } from './types';

// =====================================================================================================
// BANCO DE PLANES MAESTROS (nutrición deportiva · Argentina)
// 8 planes maestros (mujer / hombre × definición, recomposición, hipertrofia, rendimiento) × 3 variantes
// (estándar, sin TACC, vegetariano) = 24 planes. Cada uno con día de entreno y de descanso, escalón calórico
// automático (A base / B denso) y 4-5 opciones reales por comida.
// Escalado: los gramos salen de los macros del objetivo (g/kg × peso del alumno), siempre dentro de la
// Tabla Única de Topes (portionCaps.ts). Si faltan calorías se suma densidad (más carbo / grasa dentro del tope,
// aceite, fruta de postre, frutos secos) o una colación extra; nunca se agranda un lácteo o una verdura.
// =====================================================================================================

export type BankGoal = 'def' | 'rec' | 'hip' | 'ren';
export type BankVariant = 'std' | 'stacc' | 'veg';
export type BankPlanId = `${Sex}-${BankGoal}`;

export interface BankSelection {
  plan: BankPlanId;
  variant: BankVariant;
}

interface GoalDef {
  id: BankGoal;
  label: string;
  short: string;
  phase: Phase;
  anamnesisGoal: string;
  /** g/kg: proteína por sexo; carbos y grasas por día. */
  p: Record<Sex, number>;
  on: { c: number; f: number };
  off: { c: number; f: number };
  balance: string;
  rationale: string;
  evidence: { label: string; doi?: string }[];
}

export const BANK_GOALS: GoalDef[] = [
  {
    id: 'def',
    label: 'Definición',
    short: 'Pérdida de grasa con proteína alta',
    phase: 'recomp',
    anamnesisGoal: 'cut',
    p: { F: 2.2, M: 2.4 },
    on: { c: 3.0, f: 0.8 },
    off: { c: 1.8, f: 1.0 },
    balance: 'Déficit de −15 a −20 %',
    rationale: 'Proteína alta para conservar el músculo en déficit, carbos alrededor del entreno los días de entreno y comidas de alta saciedad (proteína + verduras + fibra).',
    evidence: [CITES.protein, CITES.bodyComp, CITES.morton],
  },
  {
    id: 'rec',
    label: 'Recomposición',
    short: 'Déficit leve, ciclado entreno / descanso',
    phase: 'maintenance',
    anamnesisGoal: 'recomp',
    p: { F: 2.2, M: 2.2 },
    on: { c: 4.0, f: 0.9 },
    off: { c: 2.5, f: 1.1 },
    balance: 'Déficit leve a mantenimiento',
    rationale: 'Más carbos los días de entreno para rendir y recuperar, menos los de descanso; proteína constante para ganar músculo mientras baja la grasa.',
    evidence: [CITES.bodyComp, CITES.protein, CITES.timing],
  },
  {
    id: 'hip',
    label: 'Hipertrofia',
    short: 'Volumen limpio (+250 a +400 kcal)',
    phase: 'surplus',
    anamnesisGoal: 'hypertrophy',
    p: { F: 2.0, M: 2.0 },
    on: { c: 5.5, f: 1.0 },
    off: { c: 4.0, f: 1.1 },
    balance: 'Superávit controlado',
    rationale: 'Superávit chico para ganar músculo con poca grasa, proteína repartida en 5-6 tomas y carga de glucógeno antes y después de entrenar.',
    evidence: [CITES.iraki, CITES.protein, CITES.issnReview],
  },
  {
    id: 'ren',
    label: 'Rendimiento CrossFit / Híbrido',
    short: 'Alta disponibilidad de carbohidratos',
    phase: 'maintenance',
    anamnesisGoal: 'peri',
    p: { F: 1.8, M: 1.8 },
    on: { c: 6.0, f: 1.0 },
    off: { c: 3.5, f: 1.0 },
    balance: 'Mantenimiento, carbos altos los días de entreno',
    rationale: 'Carbos altos los días de entreno para sostener sesiones intensas y dobles, recarga rápida después de entrenar y proteína suficiente para recuperar.',
    evidence: [CITES.carbs, CITES.burke, CITES.timing],
  },
];

export const BANK_VARIANTS: { id: BankVariant; label: string; note: string }[] = [
  { id: 'std', label: 'Estándar', note: 'Omnívoro, comidas típicas de la mesa argentina.' },
  {
    id: 'stacc',
    label: 'Sin TACC',
    note: 'Apto celíacos: arroz, papa, batata, polenta, galletas de arroz y panqueques de harina de arroz primero; pan y fideos sin TACC como alternativa.',
  },
  { id: 'veg', label: 'Vegetariano', note: 'Ovo-lácteo: huevos, lácteos, legumbres, tofu y soja, con la proteína justa en cada comida principal.' },
];

export const STACC_WARNING =
  'SIN TACC: usá tostadora, tabla, colador y aceite de fritura aparte (contaminación cruzada). Fiambres, quesos, yogures, dulces, salsas y suplementos sólo con el sello oficial «Sin TACC».';

/** Pisos de energía: protegen la energía disponible (≥ 30 kcal/kg de masa magra). */
export const KCAL_FLOOR: Record<Sex, number> = { F: 1400, M: 1800 };
/** Escalón B (denso) a partir de estas kcal del día de entreno. */
const TIER_B: Record<Sex, number> = { F: 1700, M: 2600 };
export const SEX_LABEL: Record<Sex, string> = { F: 'Mujer activa', M: 'Hombre activo' };
export const SEX_RANGE: Record<Sex, string> = { F: '1.400 – 2.100 kcal', M: '2.000 – 3.200 kcal' };
/** Pesos de referencia (vista previa y prueba automática). */
export const REF_WEIGHTS: Record<Sex, number[]> = { F: [48, 54, 60, 66, 72, 78], M: [62, 70, 78, 86, 94, 102] };

export const BANK_PLAN_IDS: BankPlanId[] = (['F', 'M'] as Sex[]).flatMap((s) => BANK_GOALS.map((g) => `${s}-${g.id}` as BankPlanId));
export const goalOf = (id: BankPlanId) => BANK_GOALS.find((g) => g.id === id.split('-')[1])!;
export const sexOf = (id: BankPlanId) => id.split('-')[0] as Sex;

// ---------------------------------------------------------------------------------------------------------
// Recetas (4-5 opciones por comida y variante). r: macro que ajusta ese ingrediente; x: cantidad fija.
// ---------------------------------------------------------------------------------------------------------

type SlotKind = 'breakfast' | 'mid' | 'lunch' | 'pre' | 'merienda' | 'dinner' | 'dessert' | 'extra';
type R = Omit<Combo, 'roles'>;
const P = (id: string, extra: Partial<ComboPart> = {}): ComboPart => ({ id, r: 'p', ...extra });
const C = (id: string, extra: Partial<ComboPart> = {}): ComboPart => ({ id, r: 'c', ...extra });
const F = (id: string, extra: Partial<ComboPart> = {}): ComboPart => ({ id, r: 'f', ...extra });
const X = (id: string, g: number): ComboPart => ({ id, r: 'x', g });
const SELLO = 'Elegí fiambres, quesos, yogures, dulces y suplementos con el sello oficial «Sin TACC».';

const STD: Record<SlotKind, R[]> = {
  breakfast: [
    { title: 'Café con leche, tostadas integrales con queso untable y huevos revueltos', parts: [P('huevo'), C('pan'), X('leche', 200), X('untable', 15)], steps: ['Prepará el café con {leche} de leche descremada.', 'Batí {huevo} y cocinalos revueltos en sartén antiadherente 2-3 min.', 'Tostá {pan} de pan integral y untalo con {untable} de queso untable.'] },
    { title: 'Panqueques de avena con frutillas y yogur', parts: [P('claras', { min: 66 }), C('avena'), X('huevo', 60), X('frutillas', 150), X('yogur', 150)], steps: ['Mezclá {avena} de avena con {huevo} y {claras}.', 'Cociná los panqueques en sartén antiadherente 1-2 min por lado.', 'Serví con {yogur} de yogur y {frutillas} de frutillas. Con mate o café.'] },
    { title: 'Yogur con granola y banana[ con proteína|whey][ y nueces|nueces]', parts: [X('yogur', 200), P('whey', { min: 0 }), C('granola'), F('nueces'), X('banana', 100)], steps: ['Poné {yogur} de yogur en un bowl[ y mezclá {whey} de proteína en polvo].', 'Sumá {granola} de granola y {banana} de banana en rodajas.', '[Terminá con {nueces} de nueces picadas.] Con mate o café.'] },
    { title: 'Tostado de jamón y queso con café con leche y una mandarina', parts: [P('jamon'), C('pan'), X('queso-light', 30), X('leche', 200), X('naranja', 150)], steps: ['Armá el tostado con {pan} de pan integral, {jamon} de jamón cocido natural y {queso-light} de queso light.', 'Tostalo en sandwichera o sartén hasta que se derrita el queso.', 'Acompañá con café con {leche} de leche y {naranja} de mandarina.'] },
    { title: 'Mate con tostadas, ricota y miel + huevos duros', parts: [P('huevo'), C('pan'), X('ricota', 60), X('miel', 10)], steps: ['Herví {huevo} 9-10 min.', 'Tostá {pan} de pan integral y untalo con {ricota} de ricota y {miel} de miel.', 'Con mate amargo o café.'] },
  ],
  mid: [
    { title: 'Yogur con avena y frutillas', parts: [P('yogur', { min: 150 }), C('avena'), X('frutillas', 100)], steps: ['Mezclá {yogur} de yogur con {avena} de avena.', 'Sumá {frutillas} de frutillas cortadas.'] },
    { title: 'Sándwich integral de atún con tomate', parts: [P('atun'), C('pan'), X('vegetales', 50)], steps: ['Escurrí {atun} de atún al natural.', 'Armá el sándwich con {pan} de pan integral, el atún y {vegetales} de tomate y lechuga.'] },
    { title: 'Mate con galletas de arroz, pasta de maní y banana', parts: [C('galletas-arroz'), F('mani'), X('banana', 120)], steps: ['Untá {galletas-arroz} de galletas de arroz con {mani} de pasta de maní.', 'Acompañá con {banana} de banana. Con mate.'] },
    { title: 'Frutos secos, fruta y un vaso de leche', parts: [P('leche', { min: 200 }), F('nueces'), X('manzana', 180)], steps: ['Serví {nueces} de nueces y {manzana} de manzana.', 'Tomá {leche} de leche descremada.'] },
    { title: 'Yogur bebible y una banana', parts: [P('yogur-proteico', { min: 150 }), C('banana')], steps: ['Llevá {yogur-proteico} de yogur bebible y {banana} de banana: se toma en cualquier lado.'] },
    { title: 'Barra proteica y una manzana', parts: [X('barra-proteica', 46), C('manzana')], steps: ['Llevá 1 barra proteica entera ({barra-proteica}, 15-20 g de proteína) y {manzana} de manzana en la mochila.', 'Elegí una barra nacional y revisá el rótulo: suele tener gluten, lácteos y maní o frutos secos.'] },
  ],
  lunch: [
    { title: 'Pechuga grillada con arroz yamaní y ensalada mixta', parts: [P('pollo'), C('yamani'), F('oliva'), X('vegetales', 200)], steps: ['Grillá {pollo} de pechuga 5-6 min por lado.', 'Serví con {yamani} de arroz yamaní cocido.', 'Ensalada mixta con {vegetales} de verduras y {oliva} de aceite de oliva.'] },
    { title: 'Peceto al horno con papas al natural y ensalada', parts: [P('nalga'), C('papa'), F('oliva'), X('vegetales', 200)], steps: ['Cociná {nalga} de peceto al horno a 200 °C, 25-30 min.', 'Herví {papa} de papa con cáscara.', 'Ensalada de {vegetales} de tomate y lechuga con {oliva} de aceite de oliva.'] },
    { title: 'Fideos con bolognesa magra', parts: [P('picada'), C('fideos'), F('oliva', { max: 10 }), X('vegetales', 100)], steps: ['Dorá {picada} de carne picada especial con cebolla[ y {oliva} de aceite].', 'Sumá {vegetales} de salsa de tomate natural y cociná 10 min.', 'Mezclá con {fideos} de fideos cocidos al dente.'] },
    { title: 'Merluza a la plancha con puré de calabaza y papa', parts: [P('merluza'), C('papa'), F('oliva'), X('calabaza', 150)], steps: ['Cociná {merluza} de merluza a la plancha 3-4 min por lado.', 'Pisá {papa} de papa y {calabaza} de calabaza hervidas con {oliva} de aceite de oliva.'] },
    { title: 'Ensalada completa de pollo, huevo y arroz', parts: [P('pollo'), C('arroz'), F('oliva'), X('huevo', 60), X('vegetales', 200)], steps: ['Cortá {pollo} de pollo grillado en tiras y {huevo} de huevo duro.', 'Mezclá con {arroz} de arroz frío y {vegetales} de verduras.', 'Condimentá con {oliva} de aceite de oliva y limón.'] },
  ],
  pre: [
    { title: 'Yogur con banana y galletas de arroz', parts: [P('yogur', { min: 150 }), C('banana'), X('galletas-arroz', 18)], steps: ['Serví {yogur} de yogur con {banana} de banana en rodajas.', 'Acompañá con {galletas-arroz} de galletas de arroz. Con mate.'] },
    { title: 'Licuado de leche, banana y avena[ con proteína|whey]', parts: [P('whey', { min: 0 }), C('banana'), X('leche', 250), X('avena', 20)], steps: ['Licuá {leche} de leche con {banana} de banana, {avena} de avena[ y {whey} de proteína en polvo].'] },
    { title: 'Sándwich de pan lactal con jamón y miel', parts: [P('jamon'), C('pan-lactal'), X('miel', 10)], steps: ['Armá el sándwich con {pan-lactal} de pan lactal y {jamon} de jamón cocido.', 'Sumá {miel} de miel en una de las tapas.'] },
    { title: 'Galletas de arroz con dulce de membrillo y un vaso de leche', parts: [P('leche', { min: 200 }), C('galletas-arroz'), X('dulce-membrillo', 20)], steps: ['Untá {galletas-arroz} de galletas de arroz con {dulce-membrillo} de dulce de membrillo.', 'Tomá {leche} de leche.'] },
    { title: 'Alfajor proteico con fruta', parts: [X('alfajor-proteico', 50), C('banana')], steps: ['Comé 1 alfajor proteico entero ({alfajor-proteico}) y {banana} de banana 60-90 min antes de entrenar.', 'Revisá el rótulo: suele tener gluten y lácteos.'] },
    { title: 'Banana con galletas de arroz y miel', parts: [C('banana'), X('galletas-arroz', 18), X('miel', 10)], steps: ['Comé {banana} de banana con {galletas-arroz} de galletas de arroz y {miel} de miel 60-90 min antes de entrenar.'] },
  ],
  merienda: [
    { title: 'Mate con yogur y frutillas[ + nueces|nueces]', parts: [P('yogur', { min: 150 }), F('nueces'), X('frutillas', 150)], steps: ['Serví {yogur} de yogur con {frutillas} de frutillas.', '[Sumá {nueces} de nueces.] Con mate.'] },
    { title: 'Tostadas de arroz con ricota y tomate', parts: [P('ricota'), C('tostadas-arroz'), X('vegetales', 50)], steps: ['Untá {tostadas-arroz} de tostadas de arroz con {ricota} de ricota.', 'Sumá {vegetales} de tomate en rodajas, sal y orégano.'] },
    { title: 'Mate, huevo duro y fruta', parts: [P('huevo'), X('manzana', 180)], steps: ['Herví {huevo} 9-10 min.', 'Acompañá con {manzana} de manzana. Con mate.'] },
    { title: 'Café con leche y tostado de jamón y queso', parts: [P('jamon'), C('pan'), X('leche', 200), X('queso-light', 30)], steps: ['Armá el tostado con {pan} de pan integral, {jamon} de jamón y {queso-light} de queso light.', 'Acompañá con café con {leche} de leche.'] },
  ],
  dinner: [
    { title: 'Wok de pollo con verduras y arroz', parts: [P('pollo'), C('arroz'), F('oliva'), X('vegetales', 200)], steps: ['Saltá {pollo} de pollo en tiras con {oliva} de aceite.', 'Sumá {vegetales} de verduras (morrón, zanahoria, zucchini) 3-4 min.', 'Serví con {arroz} de arroz cocido.'] },
    { title: 'Hamburguesas caseras de carne magra con batata al horno y ensalada', parts: [P('picada'), C('batata'), F('oliva'), X('vegetales', 150)], steps: ['Formá las hamburguesas con {picada} de carne picada especial y cocinalas a la plancha.', 'Asá {batata} de batata en gajos a 200 °C, 30 min.', 'Ensalada de {vegetales} de verduras con {oliva} de aceite.'] },
    { title: 'Omelette de huevos y claras con queso y verduras + pan integral', parts: [P('claras', { min: 66 }), C('pan'), X('huevo', 120), X('queso-light', 30), X('vegetales', 150)], steps: ['Batí {huevo} con {claras}.', 'Cociná el omelette con {vegetales} de verduras salteadas y {queso-light} de queso light.', 'Acompañá con {pan} de pan integral.'] },
    { title: 'Merluza al horno con papas rústicas', parts: [P('merluza'), C('papa'), F('oliva'), X('vegetales', 150)], steps: ['Hacé {merluza} de merluza al horno con limón, 15 min.', 'Asá {papa} de papa en gajos con {oliva} de aceite de oliva.', 'Sumá {vegetales} de ensalada.'] },
    { title: 'Wok de lomo con arroz y verduras', parts: [P('lomo'), C('arroz'), F('oliva'), X('vegetales', 200)], steps: ['Saltá {lomo} de lomo en tiras con {oliva} de aceite a fuego fuerte.', 'Sumá {vegetales} de verduras y salsa de soja.', 'Serví con {arroz} de arroz.'] },
  ],
  // Postre saludable: va dentro de la cena (nunca una comida suelta a la noche); sólo se suma en volumen alto.
  dessert: [
    { title: 'Yogur con frutillas y granola', parts: [P('yogur', { min: 150 }), C('granola'), X('frutillas', 100)], steps: ['De postre: {yogur} de yogur con {frutillas} de frutillas y {granola} de granola.'] },
    { title: 'Banana con pasta de maní', parts: [C('banana'), F('mani')], steps: ['De postre: {banana} de banana en rodajas con {mani} de pasta de maní.'] },
  ],
  extra: [
    { title: 'Sándwich integral de jamón y queso', parts: [P('jamon'), C('pan'), X('queso-light', 30)], steps: ['Armá el sándwich con {pan} de pan integral, {jamon} de jamón y {queso-light} de queso light.'] },
    { title: 'Yogur con granola y banana', parts: [P('yogur', { min: 150 }), C('granola'), X('banana', 100)], steps: ['Serví {yogur} de yogur con {granola} de granola y {banana} de banana.'] },
    { title: 'Frutos secos y fruta', parts: [C('banana'), F('nueces')], steps: ['Comé {nueces} de nueces con {banana} de banana.'] },
    { title: 'Licuado de leche, banana y avena', parts: [P('leche', { min: 200 }), C('avena'), X('banana', 120)], steps: ['Licuá {leche} de leche con {banana} de banana y {avena} de avena.'] },
  ],
};

const STACC: Record<SlotKind, R[]> = {
  breakfast: [
    { title: 'Panqueques de harina de arroz con huevo, queso untable y frutillas', parts: [P('huevo'), C('harina-arroz'), X('leche', 100), X('untable', 15), X('frutillas', 150)], steps: ['Mezclá {harina-arroz} de harina de arroz con {huevo} y {leche} de leche.', 'Cociná los panqueques en sartén antiadherente 1-2 min por lado.', 'Untalos con {untable} de queso untable y serví con {frutillas} de frutillas.', SELLO] },
    { title: 'Mate con galletas de arroz, queso untable y huevos revueltos', parts: [P('huevo'), C('galletas-arroz'), X('untable', 20), X('naranja', 150)], steps: ['Batí {huevo} y cocinalos revueltos 2-3 min.', 'Untá {galletas-arroz} de galletas de arroz con {untable} de queso untable.', 'Acompañá con {naranja} de mandarina. Con mate.', SELLO] },
    { title: 'Yogur con frutillas y banana[ + nueces|nueces]', parts: [P('yogur', { min: 150 }), C('banana'), F('nueces'), X('frutillas', 100)], steps: ['Serví {yogur} de yogur con {banana} de banana y {frutillas} de frutillas.', '[Sumá {nueces} de nueces.]', SELLO] },
    { title: 'Café con leche y tostadas de pan sin TACC con jamón y queso', parts: [P('jamon'), C('pan-sin-tacc'), X('leche', 200), X('queso-light', 30)], steps: ['Tostá {pan-sin-tacc} de pan sin TACC en tostadora propia.', 'Armá con {jamon} de jamón y {queso-light} de queso light.', 'Acompañá con café con {leche} de leche.', SELLO] },
    { title: 'Tostadas de arroz con ricota y miel + huevos duros', parts: [P('huevo'), C('tostadas-arroz'), X('ricota', 60), X('miel', 10)], steps: ['Herví {huevo} 9-10 min.', 'Untá {tostadas-arroz} de tostadas de arroz con {ricota} de ricota y {miel} de miel.', SELLO] },
  ],
  mid: [
    { title: 'Yogur con banana', parts: [P('yogur', { min: 150 }), C('banana')], steps: ['Serví {yogur} de yogur con {banana} de banana en rodajas.', SELLO] },
    { title: 'Galletas de arroz con queso untable y fruta', parts: [C('galletas-arroz'), X('untable', 30), X('naranja', 150)], steps: ['Untá {galletas-arroz} de galletas de arroz con {untable} de queso untable.', 'Acompañá con {naranja} de mandarina.', SELLO] },
    { title: 'Mate con frutos secos y fruta', parts: [F('nueces'), C('manzana')], steps: ['Comé {nueces} de nueces con {manzana} de manzana. Con mate.'] },
    { title: 'Leche con cacao amargo y tostadas de arroz', parts: [P('leche', { min: 200 }), C('tostadas-arroz')], steps: ['Tomá {leche} de leche con cacao amargo.', 'Acompañá con {tostadas-arroz} de tostadas de arroz.', SELLO] },
    { title: 'Sándwich chico de pan sin TACC con jamón y queso', parts: [P('jamon'), C('pan-sin-tacc'), X('queso-light', 30)], steps: ['Armá el sándwich con {pan-sin-tacc} de pan sin TACC, {jamon} de jamón y {queso-light} de queso light.', 'Llevalo en un táper propio.', SELLO] },
    { title: 'Yogur bebible y una banana', parts: [P('yogur-proteico', { min: 150 }), C('banana')], steps: ['Llevá {yogur-proteico} de yogur bebible y {banana} de banana.', SELLO] },
  ],
  lunch: [
    { title: 'Pechuga grillada con arroz y ensalada mixta', parts: [P('pollo'), C('arroz'), F('oliva'), X('vegetales', 200)], steps: ['Grillá {pollo} de pechuga 5-6 min por lado.', 'Serví con {arroz} de arroz cocido.', 'Ensalada mixta con {vegetales} de verduras y {oliva} de aceite de oliva.'] },
    { title: 'Peceto al horno con papas y batatas al natural', parts: [P('nalga'), C('papa'), F('oliva'), X('batata', 100), X('vegetales', 150)], steps: ['Cociná {nalga} de peceto al horno a 200 °C, 25-30 min.', 'Herví {papa} de papa y {batata} de batata.', 'Ensalada de {vegetales} de verduras con {oliva} de aceite de oliva.'] },
    { title: 'Merluza a la plancha con polenta cremosa y ensalada', parts: [P('merluza'), C('polenta'), F('oliva'), X('vegetales', 150)], steps: ['Cociná {merluza} de merluza a la plancha 3-4 min por lado.', 'Prepará {polenta} de polenta cremosa con agua y sal.', 'Ensalada de {vegetales} de verduras con {oliva} de aceite de oliva.'] },
    { title: 'Fideos de arroz sin TACC con bolognesa magra', parts: [P('picada'), C('fideos-sin-tacc'), F('oliva', { max: 10 }), X('vegetales', 100)], steps: ['Dorá {picada} de carne picada con cebolla[ y {oliva} de aceite].', 'Sumá {vegetales} de salsa de tomate (con sello Sin TACC) y cociná 10 min.', 'Mezclá con {fideos-sin-tacc} de fideos sin TACC, cocidos en una olla y colador propios.'] },
    { title: 'Milanesas de peceto rebozadas en harina de arroz, al horno, con puré de calabaza', parts: [P('nalga'), C('papa'), X('harina-arroz', 20), X('huevo', 60), X('calabaza', 150)], steps: ['Pasá {nalga} de peceto en finas láminas por {huevo} batido y {harina-arroz} de harina de arroz.', 'Hornealas a 200 °C, 10 min por lado.', 'Pisá {papa} de papa y {calabaza} de calabaza hervidas.'] },
  ],
  pre: [
    { title: 'Banana con galletas de arroz y miel', parts: [C('banana'), X('galletas-arroz', 18), X('miel', 10)], steps: ['Comé {banana} de banana con {galletas-arroz} de galletas de arroz y {miel} de miel 60-90 min antes de entrenar.'] },
    { title: 'Yogur con banana', parts: [P('yogur', { min: 150 }), C('banana')], steps: ['Serví {yogur} de yogur con {banana} de banana.', SELLO] },
    { title: 'Licuado de leche y banana[ con proteína|whey]', parts: [P('whey', { min: 0 }), C('banana'), X('leche', 250)], steps: ['Licuá {leche} de leche con {banana} de banana[ y {whey} de proteína en polvo con sello Sin TACC].'] },
    { title: 'Tostadas de pan sin TACC con dulce de membrillo y un vaso de leche', parts: [P('leche', { min: 200 }), C('pan-sin-tacc'), X('dulce-membrillo', 20)], steps: ['Tostá {pan-sin-tacc} de pan sin TACC y untalo con {dulce-membrillo} de dulce de membrillo.', 'Tomá {leche} de leche.', SELLO] },
  ],
  merienda: [
    { title: 'Mate con yogur y frutillas[ + nueces|nueces]', parts: [P('yogur', { min: 150 }), F('nueces'), X('frutillas', 150)], steps: ['Serví {yogur} de yogur con {frutillas} de frutillas.', '[Sumá {nueces} de nueces.] Con mate.', SELLO] },
    { title: 'Tostadas de arroz con ricota y tomate', parts: [P('ricota'), C('tostadas-arroz'), X('vegetales', 50)], steps: ['Untá {tostadas-arroz} de tostadas de arroz con {ricota} de ricota.', 'Sumá {vegetales} de tomate, sal y orégano.', SELLO] },
    { title: 'Mate, huevo duro y fruta', parts: [P('huevo'), X('manzana', 180)], steps: ['Herví {huevo} 9-10 min.', 'Acompañá con {manzana} de manzana. Con mate.'] },
    { title: 'Café con leche y pan sin TACC con queso', parts: [P('queso-light'), C('pan-sin-tacc'), X('leche', 200)], steps: ['Tostá {pan-sin-tacc} de pan sin TACC con {queso-light} de queso light.', 'Acompañá con café con {leche} de leche.', SELLO] },
  ],
  dinner: [
    { title: 'Wok de pollo con verduras y arroz', parts: [P('pollo'), C('arroz'), F('oliva'), X('vegetales', 200)], steps: ['Saltá {pollo} de pollo en tiras con {oliva} de aceite.', 'Sumá {vegetales} de verduras 3-4 min (salsa de soja con sello Sin TACC).', 'Serví con {arroz} de arroz.'] },
    { title: 'Hamburguesas caseras de carne pura con batata al horno', parts: [P('picada'), C('batata'), F('oliva'), X('vegetales', 150)], steps: ['Formá las hamburguesas con {picada} de carne picada pura (sin pan rallado) y cocinalas a la plancha.', 'Asá {batata} de batata en gajos con {oliva} de aceite.', 'Sumá {vegetales} de ensalada.'] },
    { title: 'Pizza de polenta con pollo, queso y tomate', parts: [P('pollo'), C('polenta'), X('queso-light', 30), X('vegetales', 100)], steps: ['Extendé {polenta} de polenta firme en una placa y dorala 15 min a 200 °C.', 'Cubrí con {vegetales} de tomate, {pollo} de pollo desmenuzado y {queso-light} de queso light.', 'Gratiná 5 min.', SELLO] },
    { title: 'Merluza al horno con papas rústicas', parts: [P('merluza'), C('papa'), F('oliva'), X('vegetales', 150)], steps: ['Hacé {merluza} de merluza al horno con limón, 15 min.', 'Asá {papa} de papa en gajos con {oliva} de aceite de oliva.', 'Sumá {vegetales} de ensalada.'] },
    { title: 'Omelette con queso y verduras + pan sin TACC', parts: [P('claras', { min: 66 }), C('pan-sin-tacc'), X('huevo', 120), X('queso-light', 30), X('vegetales', 150)], steps: ['Batí {huevo} con {claras}.', 'Cociná el omelette con {vegetales} de verduras y {queso-light} de queso light.', 'Acompañá con {pan-sin-tacc} de pan sin TACC.', SELLO] },
  ],
  dessert: [
    { title: 'Yogur con frutillas y banana', parts: [P('yogur', { min: 150 }), C('banana'), X('frutillas', 100)], steps: ['De postre: {yogur} de yogur con {frutillas} de frutillas y {banana} de banana.', SELLO] },
    { title: 'Banana con pasta de maní', parts: [C('banana'), F('mani')], steps: ['De postre: {banana} de banana en rodajas con {mani} de pasta de maní.', SELLO] },
  ],
  extra: [
    { title: 'Yogur con banana', parts: [P('yogur', { min: 150 }), C('banana')], steps: ['Serví {yogur} de yogur con {banana} de banana.', SELLO] },
    { title: 'Galletas de arroz con pasta de maní y fruta', parts: [C('galletas-arroz'), F('mani'), X('naranja', 150)], steps: ['Untá {galletas-arroz} de galletas de arroz con {mani} de pasta de maní.', 'Acompañá con {naranja} de mandarina.'] },
    { title: 'Frutos secos y fruta', parts: [C('banana'), F('nueces')], steps: ['Comé {nueces} de nueces con {banana} de banana.'] },
    { title: 'Licuado de leche y banana', parts: [P('leche', { min: 200 }), C('banana')], steps: ['Licuá {leche} de leche con {banana} de banana.'] },
  ],
};

const VEG: Record<SlotKind, R[]> = {
  breakfast: [
    STD.breakfast[0],
    STD.breakfast[1],
    STD.breakfast[2],
    { title: 'Tostado de queso y tomate con café con leche', parts: [P('queso-light'), C('pan'), X('leche', 200), X('vegetales', 50)], steps: ['Armá el tostado con {pan} de pan integral, {queso-light} de queso light y {vegetales} de tomate.', 'Acompañá con café con {leche} de leche.'] },
    STD.breakfast[4],
  ],
  mid: [
    STD.mid[0],
    { title: 'Sándwich integral de huevo duro y tomate', parts: [P('huevo'), C('pan'), X('vegetales', 50)], steps: ['Herví {huevo} 9-10 min y cortalo en rodajas.', 'Armá el sándwich con {pan} de pan integral y {vegetales} de tomate y lechuga.'] },
    STD.mid[2],
    STD.mid[3],
    STD.mid[4],
    STD.mid[5],
  ],
  lunch: [
    { title: 'Guiso de lentejas con arroz y huevo duro + yogur de postre', parts: [P('huevo'), C('lentejas'), F('oliva', { max: 10 }), X('arroz', 80), X('vegetales', 150), X('yogur', 150)], steps: ['Cociná {lentejas} de lentejas con {vegetales} de cebolla, morrón y zanahoria[ y {oliva} de aceite].', 'Serví con {arroz} de arroz y {huevo} de huevo duro.', 'De postre, {yogur} de yogur (suma la proteína que le falta a la legumbre).'] },
    { title: 'Tofu grillado con arroz yamaní y verduras salteadas', parts: [P('tofu'), C('yamani'), F('oliva'), X('vegetales', 200)], steps: ['Grillá {tofu} de tofu firme en cubos con salsa de soja.', 'Saltá {vegetales} de verduras con {oliva} de aceite.', 'Serví con {yamani} de arroz yamaní.'] },
    { title: 'Milanesas de soja al horno con puré de papa', parts: [P('soja-texturizada'), C('papa'), F('oliva'), X('huevo', 60), X('pan-rallado', 20)], steps: ['Mezclá {soja-texturizada} de soja texturizada hidratada con {huevo} y formá las milanesas.', 'Pasalas por {pan-rallado} de pan rallado y hornealas 10 min por lado.', 'Serví con puré de {papa} de papa y {oliva} de aceite de oliva.'] },
    { title: 'Ensalada completa de garbanzos, huevo, queso y arroz', parts: [P('huevo'), C('garbanzos'), F('oliva'), X('queso-light', 30), X('vegetales', 200)], steps: ['Mezclá {garbanzos} de garbanzos cocidos con {vegetales} de verduras.', 'Sumá {huevo} de huevo duro y {queso-light} de queso light en cubos.', 'Condimentá con {oliva} de aceite de oliva.'] },
    { title: 'Omelette de claras con queso, papas al horno y ensalada', parts: [P('claras', { min: 66 }), C('papa'), F('oliva'), X('huevo', 60), X('queso-light', 30), X('vegetales', 150)], steps: ['Batí {huevo} con {claras} y cociná el omelette con {queso-light} de queso light.', 'Asá {papa} de papa en gajos con {oliva} de aceite.', 'Sumá {vegetales} de ensalada.'] },
    { title: 'Polenta cremosa con salsa de tomate, huevo poché y queso', parts: [P('huevo'), C('polenta'), X('queso-light', 30), X('vegetales', 100)], steps: ['Prepará {polenta} de polenta cremosa con agua y sal.', 'Cociná {huevo} poché en la salsa de {vegetales} de tomate.', 'Serví con {queso-light} de queso por encima.'] },
    { title: 'Papas al horno con huevo, queso y ensalada', parts: [P('huevo'), C('papa'), F('oliva'), X('queso-light', 30), X('vegetales', 150)], steps: ['Asá {papa} de papa en gajos con {oliva} de aceite, 30 min a 200 °C.', 'Sumá {huevo} a la plancha y {queso-light} de queso.', 'Acompañá con {vegetales} de ensalada.'] },
  ],
  pre: [STD.pre[0], STD.pre[1], { title: 'Tostadas de pan lactal con queso untable y miel', parts: [P('untable'), C('pan-lactal'), X('miel', 10)], steps: ['Untá {pan-lactal} de pan lactal con {untable} de queso untable y {miel} de miel.'] }, STD.pre[3], STD.pre[4]],
  merienda: [STD.merienda[0], STD.merienda[1], STD.merienda[2], { title: 'Café con leche y tostado de queso', parts: [P('queso-light'), C('pan'), X('leche', 200)], steps: ['Armá el tostado con {pan} de pan integral y {queso-light} de queso light.', 'Acompañá con café con {leche} de leche.'] }],
  dinner: [
    { title: 'Wok de tofu con verduras y arroz', parts: [P('tofu'), C('arroz'), F('oliva'), X('vegetales', 200)], steps: ['Saltá {tofu} de tofu en cubos con {oliva} de aceite.', 'Sumá {vegetales} de verduras y salsa de soja.', 'Serví con {arroz} de arroz.'] },
    { title: 'Pizza casera de pan árabe con queso, huevo y verduras', parts: [P('huevo'), C('pan-arabe'), X('queso-light', 40), X('vegetales', 100)], steps: ['Cubrí {pan-arabe} de pan árabe con {vegetales} de tomate y verduras.', 'Sumá {queso-light} de queso light y {huevo} de huevo.', 'Horneá 8-10 min a 220 °C.'] },
    STD.dinner[2],
    { title: 'Guiso de porotos y calabaza con huevo', parts: [P('huevo'), C('porotos'), F('oliva', { max: 10 }), X('calabaza', 150), X('vegetales', 100)], steps: ['Cociná {porotos} de porotos con {calabaza} de calabaza y {vegetales} de verduras[ con {oliva} de aceite].', 'Serví con {huevo} de huevo duro o poché.'] },
    { title: 'Ñoquis de papa con salsa de tomate y ricota', parts: [P('ricota'), C('noquis'), F('oliva', { max: 10 }), X('vegetales', 100)], steps: ['Herví {noquis} de ñoquis hasta que floten.', 'Serví con {vegetales} de salsa de tomate[, {oliva} de aceite] y {ricota} de ricota por encima.'] },
  ],
  dessert: STD.dessert,
  extra: [
    { title: 'Sándwich integral de queso y tomate', parts: [P('queso-light'), C('pan'), X('vegetales', 50)], steps: ['Armá el sándwich con {pan} de pan integral, {queso-light} de queso light y {vegetales} de tomate.'] },
    STD.extra[1],
    STD.extra[2],
    STD.extra[3],
  ],
};

export const RECIPES: Record<BankVariant, Record<SlotKind, R[]>> = { std: STD, stacc: STACC, veg: VEG };

// ---------------------------------------------------------------------------------------------------------
// Estructura de cada día: comidas según escalón y reparto de macros por comida.
// ---------------------------------------------------------------------------------------------------------

interface SlotDef {
  kind: SlotKind;
  name: string;
  role: MealRole;
  time: string;
  /** Peso relativo de proteína / carbos / grasas en el día. */
  w: [number, number, number];
}
const SLOT: Record<SlotKind, SlotDef> = {
  breakfast: { kind: 'breakfast', name: 'Desayuno', role: 'breakfast', time: '07:30', w: [1, 1, 1] },
  mid: { kind: 'mid', name: 'Colación de media mañana', role: 'snack', time: '10:30', w: [0.5, 0.5, 0.6] },
  lunch: { kind: 'lunch', name: 'Almuerzo', role: 'lunch', time: '13:00', w: [1.3, 1.2, 1.2] },
  pre: { kind: 'pre', name: 'Antes de entrenar', role: 'peri', time: '17:15', w: [0.5, 1, 0.2] },
  merienda: { kind: 'merienda', name: 'Merienda', role: 'snack', time: '17:00', w: [0.6, 0.5, 0.7] },
  dinner: { kind: 'dinner', name: 'Cena', role: 'dinner', time: '21:00', w: [1.3, 1.1, 1.1] },
  dessert: { kind: 'dessert', name: 'Postre', role: 'dinner', time: '21:00', w: [0.2, 0.3, 0.2] },
  extra: { kind: 'extra', name: 'Colación de tarde', role: 'snack', time: '16:00', w: [0.4, 0.5, 0.4] },
};

/**
 * Cantidad de comidas del día: 4 (mujer, escalón base), 5, o 6 sólo el día de entreno del hombre en escalón denso.
 * Entreno al mediodía (11:30-14:00): 5 tomas limpias (media mañana antes, almuerzo después, merienda y cena).
 */
export function mealCount(sex: Sex, tierB: boolean, day: MealDay, tr: BankTraining = DEFAULT_TRAINING) {
  if (sex === 'F') return tierB ? 5 : 4;
  return tierB && day === 'on' && !isMidday(tr) ? 6 : 5;
}

export type BankTraining = Training;
export type BankMainTimes = MainTimes;
export { DEFAULT_TRAINING, trainingOf };

interface Placed extends SlotDef {
  at: number;
}

/**
 * Agenda argentina del día (agenda.ts): Desayuno · Colación de media mañana · Almuerzo · Merienda · Antes de
 * entrenar · Cena. La cena siempre cierra el día. A la mañana el desayuno pasa a después de entrenar y la colación
 * queda a media mañana; a la tarde-noche la merienda se refuerza como «antes de entrenar».
 */
function daySlots(n: number, day: MealDay, tr: BankTraining = DEFAULT_TRAINING, fixed: BankMainTimes = {}): Placed[] {
  const on = day === 'on';
  const a = mainAnchors(on, tr, fixed);
  const at = (kind: SlotKind, t: number, name = SLOT[kind].name): Placed => ({ ...SLOT[kind], name, time: hhmm(t), at: t });
  const mains = [at('breakfast', a.B, a.bName), at('lunch', a.L, a.lName), at('dinner', a.D)];
  const evening = on && tr.start >= 15 * 60;
  const n0 = n - 3;
  let order: ('mid' | 'merienda' | 'pre')[] = n0 === 1 ? (evening ? ['pre', 'merienda'] : ['merienda', 'mid']) : n0 === 2 ? (evening ? ['mid', 'pre', 'merienda'] : ['mid', 'merienda']) : evening ? ['mid', 'pre', 'merienda'] : ['mid', 'merienda', 'pre'];
  if (!on) order = order.filter((k) => k !== 'pre');
  const taken = [...mains];
  let left = n0;
  for (const kind of order) {
    if (!left) break;
    const { times, lo, hi } = snackTries(kind, a, tr);
    const t = times.find((x) => x > lo && x < hi && fits(x, taken.map((p) => p.at), a, tr, on));
    if (t === undefined) continue;
    taken.push(at(kind, t));
    left--;
  }
  // Carbos alrededor del entreno: la toma de antes suma carbos y baja grasas (digestión liviana); la de después
  // repone glucógeno. El total del día no cambia, sólo cómo se reparte.
  const shift = (p: Placed): Placed => {
    if (!on || p.kind === 'pre') return p;
    if (/después de entrenar/.test(p.name)) return { ...p, w: [p.w[0], p.w[1] * 1.3, p.w[2] * 0.8] };
    if (/antes de entrenar/.test(p.name)) return { ...p, w: [p.w[0] * 0.8, p.w[1] * 1.2, p.w[2] * 0.6] };
    return p;
  };
  return taken
    .map((p) => {
      if (p.kind === 'pre') {
        const solo = !taken.some((x) => x.kind === 'merienda') && p.at >= 15 * 60 + 30 && p.at <= 19 * 60;
        const morning = !taken.some((x) => x.kind === 'mid') && p.at >= 9 * 60 && p.at < 12 * 60;
        return { ...p, name: solo ? 'Merienda (antes de entrenar)' : morning ? 'Colación de media mañana (antes de entrenar)' : p.name };
      }
      if ((p.kind === 'mid' || p.kind === 'merienda') && on) {
        if (p.at >= tr.end && p.at <= tr.end + 120) return { ...p, name: `${p.name} (después de entrenar)` };
        if (p.at < tr.start && p.at >= tr.start - 120) return { ...p, name: `${p.name} (antes de entrenar)` };
      }
      return p;
    })
    .map((p) => shift({ ...p, name: p.kind === 'breakfast' ? a.bName : p.kind === 'lunch' ? a.lName : p.name }))
    .sort((x, y) => x.at - y.at);
}

// ---------------------------------------------------------------------------------------------------------
// Motor: macros del objetivo → gramos dentro de los topes → cierre del día por densidad energética.
// ---------------------------------------------------------------------------------------------------------

type Tot = { p: number; c: number; f: number; kcal: number };
const kcalOf = (m: { p: number; c: number; f: number }) => m.p * 4 + m.c * 4 + m.f * 9;
const totals = (items: FoodItem[]): Tot => {
  const t = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { p: 0, c: 0, f: 0 });
  return { ...t, kcal: kcalOf(t) };
};

/** Macros del día (g) a partir del objetivo y el peso; respeta el piso de energía subiendo los carbos. */
export function dayTargets(goal: GoalDef, sex: Sex, weightKg: number) {
  const mk = (d: { c: number; f: number }) => {
    const p = goal.p[sex];
    let c = d.c;
    const kcal = kcalOf({ p: p * weightKg, c: c * weightKg, f: d.f * weightKg });
    if (kcal < KCAL_FLOOR[sex]) c += (KCAL_FLOOR[sex] - kcal) / 4 / weightKg;
    return { p, c: Math.round(c * 100) / 100, f: d.f };
  };
  const on = mk(goal.on);
  const off = mk(goal.off);
  const grams = (g: Macros) => ({ p: g.p * weightKg, c: g.c * weightKg, f: g.f * weightKg });
  return { gkg: { on, off }, on: { ...grams(on), kcal: kcalOf(grams(on)) }, off: { ...grams(off), kcal: kcalOf(grams(off)) } };
}

const stepOf = (id: string) => {
  const u = FOOD_BY_ID[id]?.unit;
  if (id === 'huevo' || id === 'claras' || FOOD_BY_ID[id]?.group === 'protein-snack') return unitStep(id);
  if (u && u.grams <= 60 && FOOD_BY_ID[id].group !== 'dairy-protein') return u.grams;
  return 5;
};

interface Ctx extends CapCtx {
  sex: Sex;
  /** Filtro de alérgenos del alumno para los módulos de densidad (nueces, etc.). */
  ok?: (foodId: string) => boolean;
}

/** Gramos de una receta para un objetivo de macros, cada ingrediente dentro de su rango (tope duro incluido). */
function solve(rec: R, T: Tot, ctx: Ctx): Record<string, number> {
  const g: Record<string, number> = {};
  const lim = (p: ComboPart) => {
    const cap = portionCap(p.id, ctx);
    // La proteína y el carbo que dan nombre al plato siempre van (al menos su porción mínima real);
    // la grasa y lo marcado con min: 0 (proteína en polvo opcional, nueces) pueden quedar afuera.
    const lo = p.min !== undefined && p.min > 0 ? Math.min(p.min, cap.min) : (p.min ?? (p.r === 'p' || p.r === 'c' ? cap.min : 0));
    return { lo: Math.min(lo, cap.max), hi: Math.min(p.max ?? Infinity, cap.max), capMin: cap.min };
  };
  rec.parts.forEach((p) => (g[p.id] = p.r === 'x' ? Math.min(fixedGrams(p, ctx), portionCap(p.id, ctx).max) : 0));
  const macro = (k: 'p' | 'c' | 'f', skip: string) => rec.parts.reduce((a, p) => (p.id === skip ? a : a + (FOOD_BY_ID[p.id][k] * g[p.id]) / 100), 0);
  for (let it = 0; it < 6; it++) {
    for (const k of ['p', 'c', 'f'] as const) {
      const part = rec.parts.find((p) => p.r === k);
      if (!part) continue;
      const per = FOOD_BY_ID[part.id][k] / 100;
      if (!(per > 0)) continue;
      const { lo, hi, capMin } = lim(part);
      const st = stepOf(part.id);
      let v = Math.round(Math.max(0, (T[k] - macro(k, part.id)) / per) / st) * st;
      // Porciones mínimas reales: un ingrediente o va en porción de verdad o no va (nada de 8 g de whey).
      if (v > 0 && v < capMin) v = v >= capMin / 2 || lo > 0 ? capMin : 0;
      g[part.id] = Math.min(hi, Math.max(lo, v));
    }
  }
  fitVolume(rec, g, ctx);
  return g;
}

/** Cantidad fija de un ingrediente: en la mujer, guarniciones de verdura y fruta un 25 % más chicas y leche ≤ 200 ml. */
function fixedGrams(p: ComboPart, ctx: Ctx) {
  const g = p.g ?? 0;
  if (ctx.sex !== 'F') return g;
  const grp = FOOD_BY_ID[p.id]?.group;
  if (grp === 'veg' || grp === 'fruit') return Math.max(50, Math.round((g * 0.75) / 5) * 5);
  if (p.id === 'leche' || p.id === 'leche-deslactosada') return Math.min(g, 200);
  return g;
}

/**
 * Tope de volumen sólido de la toma (MEAL_VOLUME): si el plato quedó grande, achica primero la guarnición de
 * verdura / fruta (hasta el 60 %), después el carbo y por último la proteína, nunca por debajo de su porción mínima.
 */
function fitVolume(rec: R, g: Record<string, number>, ctx: Ctx, cap = mealVolumeCap(ctx.sex, ctx.role)) {
  const order: { id: string; floor: number }[] = [
    ...rec.parts.filter((p) => p.r === 'x' && ['veg', 'fruit'].includes(FOOD_BY_ID[p.id]?.group ?? '')).map((p) => ({ id: p.id, floor: Math.round(fixedGrams(p, ctx) * 0.6) })),
    ...rec.parts.filter((p) => p.r === 'c').map((p) => ({ id: p.id, floor: p.min ?? portionCap(p.id, ctx).min })),
    ...rec.parts.filter((p) => p.r === 'f').map((p) => ({ id: p.id, floor: 0 })),
    ...rec.parts.filter((p) => p.r === 'p').map((p) => ({ id: p.id, floor: p.min !== undefined && p.min > 0 ? Math.min(p.min, portionCap(p.id, ctx).min) : (p.min ?? portionCap(p.id, ctx).min) })),
  ];
  for (const { id, floor } of order) {
    const over = solidGrams(g) - cap;
    if (over <= 0) return;
    if (isLiquid(id) || !(g[id] > floor)) continue;
    const st = stepOf(id);
    const next = Math.max(floor, Math.floor((g[id] - over) / st) * st);
    g[id] = next < portionCap(id, ctx).min && floor === 0 ? 0 : next;
  }
}

/** Guarniciones de verdura / fruta de la opción 1 que se pueden achicar (hasta el 60 %) para hacer lugar a un carbo. */
const sides = (w: Work, ctx: Ctx) =>
  w.recipes[0].parts.filter((p) => p.r === 'x' && ['veg', 'fruit'].includes(FOOD_BY_ID[p.id]?.group ?? '')).map((p) => ({ id: p.id, floor: Math.round(fixedGrams(p, ctx) * 0.6) }));

/** Gramos sólidos que todavía entran en la toma (los líquidos no cuentan), contando lo que ceden las guarniciones. */
function roomFor(w: Work, id: string, ctx: Ctx) {
  if (isLiquid(id)) return Infinity;
  const cap = w.vol ? w.vol() : mealVolumeCap(ctx.sex, w.slot.role);
  const give = sides(w, ctx).filter((s) => s.id !== id).reduce((a, s) => a + Math.max(0, (w.grams[0][s.id] ?? 0) - s.floor), 0);
  return cap - solidGrams(w.grams[0]) + give;
}

/** Hace lugar achicando guarniciones de verdura / fruta (poca energía por gramo) antes de agrandar un carbo denso. */
function makeRoom(w: Work, id: string, need: number, ctx: Ctx) {
  const cap = w.vol ? w.vol() : mealVolumeCap(ctx.sex, w.slot.role);
  let over = solidGrams(w.grams[0]) + need - cap;
  for (const s of sides(w, ctx)) {
    if (over <= 0) return;
    if (s.id === id) continue;
    const cur = w.grams[0][s.id] ?? 0;
    const cut = Math.min(over, Math.max(0, cur - s.floor));
    const st = stepOf(s.id);
    const next = Math.max(s.floor, Math.floor((cur - cut) / st) * st);
    w.grams[0][s.id] = next;
    over -= cur - next;
  }
}

const toItems = (g: Record<string, number>) =>
  Object.entries(g)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => itemFromFood(id, v));

interface Work {
  slot: SlotDef;
  T: Tot;
  recipes: R[];
  /** Gramos de cada opción (la 1 es la que cierra el día). */
  grams: Record<string, number>[];
  added: Set<string>;
  /** Volumen sólido disponible (el postre comparte el de la cena). */
  vol?: () => number;
}

/** Ingrediente ajustable de la opción 1 para subir / bajar energía (los fijos y las verduras no se tocan). */
const adjustable = (w: Work, k: 'p' | 'c' | 'f') => w.recipes[0].parts.filter((p) => p.r === k).map((p) => p.id);

/** Módulos de densidad por comida: lo que se suma (en este orden) cuando faltan calorías. */
const MODULES: Record<SlotKind, { c: string[]; f: string[] }> = {
  breakfast: { c: ['miel', 'naranja'], f: ['nueces'] },
  mid: { c: ['banana', 'miel'], f: ['nueces'] },
  lunch: { c: ['naranja'], f: ['oliva', 'palta'] },
  pre: { c: ['miel', 'banana'], f: [] },
  merienda: { c: ['dulce-membrillo', 'manzana'], f: ['nueces'] },
  dinner: { c: ['naranja'], f: ['oliva'] },
  dessert: { c: [], f: [] },
  extra: { c: [], f: [] },
};
const moduleTitle = (id: string, kind: SlotKind) =>
  id === 'naranja' ? (kind === 'lunch' || kind === 'dinner' ? ' + fruta de postre' : ' + una mandarina') : ({ nueces: ' + nueces', banana: ' + banana', manzana: ' + manzana', miel: ' + miel', 'dulce-membrillo': ' + dulce de membrillo', palta: ' + palta', semillas: ' + semillas', isotonica: ' + bebida isotónica para el entreno' } as Record<string, string>)[id] ?? '';
/** Título con tramos opcionales "[ con proteína|whey]": sólo se nombra lo que el plato lleva de verdad. */
const titleFor = (title: string, g: Record<string, number>) => title.replace(/\[([^|\]]*)\|([a-z-]+)\]/g, (_, txt: string, id: string) => ((g[id] ?? 0) > 0 ? txt : ''));

function dayKcal(ws: Work[]) {
  return ws.reduce((a, w) => a + totals(toItems(w.grams[0])).kcal, 0);
}

/** Cambia una cantidad dentro de su rango; devuelve las kcal que movió. */
function nudge(w: Work, id: string, kcalWanted: number, ctx: Ctx, opts: { allowNew?: boolean; floor?: number; max?: number } = {}): number {
  const g = w.grams[0];
  const ref = FOOD_BY_ID[id];
  const kpg = kcalOf(ref) / 100;
  if (!(kpg > 0)) return 0;
  const base = portionCap(id, { ...ctx, role: w.slot.role });
  const cap = { min: base.min, max: Math.min(base.max, opts.max ?? Infinity) };
  const cur = g[id] ?? 0;
  if (cur === 0 && !opts.allowNew) return 0;
  const st = stepOf(id);
  let next: number;
  if (kcalWanted > 0) {
    const want = cur + Math.max(st, Math.round(kcalWanted / kpg / st) * st);
    next = Math.min(cap.max, Math.max(cur === 0 ? cap.min : cur, want));
    // Tope de volumen de la toma: si no entra, se agranda hasta donde entra (o se busca densidad en otro lado).
    const room = roomFor(w, id, ctx);
    if (next - cur > room) next = cur + Math.max(0, Math.floor(room / st) * st);
    if (next > 0 && next < cap.min) return 0;
    if (!isLiquid(id) && next > cur) makeRoom(w, id, next - cur, ctx);
  } else {
    const floor = opts.floor ?? cap.min;
    const want = cur - Math.max(st, Math.round(-kcalWanted / kpg / st) * st);
    next = Math.max(floor, want);
    if (next < cap.min && floor === 0) next = 0;
  }
  if (next === cur) return 0;
  g[id] = next;
  if (cur === 0) w.added.add(id);
  if (next === 0) {
    delete g[id];
    w.added.delete(id);
  }
  return (next - cur) * kpg;
}

function dayMacros(ws: Work[]): Tot {
  return ws.reduce((a, w) => {
    const t = totals(toItems(w.grams[0]));
    return { p: a.p + t.p, c: a.c + t.c, f: a.f + t.f, kcal: a.kcal + t.kcal };
  }, { p: 0, c: 0, f: 0, kcal: 0 });
}

type Move = [Work, string, { allowNew?: boolean; floor?: number; max?: number }];
/** Módulo de densidad: como mucho 1 unidad por comida (1 fruta de postre, 1 banana, 1 cda de aceite). */
const MODULE_MAX: Record<string, number> = { naranja: 150, banana: 120, manzana: 180, nueces: 30, semillas: 30, oliva: 15, miel: 20, 'dulce-membrillo': 20, palta: 50 };
/** Equivalente seguro de un módulo de densidad para un alumno con alergia. */
const MODULE_SAFE: Record<string, string> = { nueces: 'semillas' };

/**
 * Cierre del día: lleva la opción 1 de cada comida al total de calorías (±2 %) corrigiendo primero el macro más
 * desviado. Faltan calorías: sube el macro (carbos o grasas) más por debajo de su meta, con los ingredientes de la
 * receta hasta su tope y después con módulos de densidad (fruta de postre, aceite, frutos secos); si todo está al
 * tope, colación extra. Sobran: baja el macro más pasado (lo agregado primero; la proteína nunca por debajo de su
 * porción mínima real). Lejos de la meta reparte entre todas las comidas; cerca, hace el ajuste fino que mejor cierra.
 */
function closeDay(ws: Work[], target: Tot, ctx: Ctx, extraLeft: { n: number }, mkExtra: () => Work | null) {
  // Mujer: la energía que falta sale primero de densidad limpia (miel, membrillo, frutos secos, palta, aceite) y
  // recién después de agrandar el plato. Hombre: primero el plato (dentro de su tope), después los módulos.
  const up = (k: 'c' | 'f'): Move[] => (ctx.sex === 'F' ? [...mods(k), ...parts(k)] : [...parts(k), ...mods(k)]);
  const parts = (k: 'c' | 'f'): Move[] => ws.flatMap((w) => adjustable(w, k).map((id): Move => [w, id, { allowNew: k === 'f' }]));
  // Carbo líquido para el entreno (isotónica): en la toma pegada al entreno (antes o después), sin volumen sólido.
  const preTraining = (w: Work) => w.slot.kind === 'pre' || /(antes|después) de entrenar/.test(w.slot.name);
  const mods = (k: 'c' | 'f'): Move[] => [
    ...ws.flatMap((w) => (k === 'c' && preTraining(w) ? [[w, 'isotonica', { allowNew: true, max: 500 }] as Move] : [])),
    ...ws.flatMap((w) =>
      MODULES[w.slot.kind][k]
        .filter((id) => !adjustable(w, k).includes(id) && !(k === 'f' && w.recipes[0].parts.some((p) => p.r === 'f' && FOOD_BY_ID[p.id].group === 'fat')))
        // Alergia: el módulo se cambia por su equivalente seguro (nueces → semillas) o se saltea.
        .map((id) => (ctx.ok && !ctx.ok(id) ? (MODULE_SAFE[id] ?? '') : id))
        .filter((id) => id && (!ctx.ok || ctx.ok(id)) && !adjustable(w, k).includes(id))
        // Con postre en la cena, nada de fruta de postre aparte (un solo postre).
        .filter((id) => !(w.slot.kind === 'dinner' && ws.some((d) => d.slot.kind === 'dessert')))
        .map((id): Move => [w, id, { allowNew: true, max: MODULE_MAX[id] }]),
    ),
  ];
  const down = (k: 'p' | 'c' | 'f'): Move[] => [
    ...ws.flatMap((w) => [...w.added].filter((id) => (k === 'f' ? [...MODULES[w.slot.kind].f, 'semillas'] : [...MODULES[w.slot.kind].c, 'isotonica']).includes(id)).map((id): Move => [w, id, { floor: 0 }])),
    ...ws.flatMap((w) => adjustable(w, k).map((id): Move => [w, id, k === 'f' ? { floor: 0 } : {}])),
  ];
  const kpgOf = (id: string) => kcalOf(FOOD_BY_ID[id]) / 100;
  // Antes de cerrar: proteína muy por encima de la meta (varias comidas en su porción mínima) se recorta una vez
  // hacia la mínima real; después el cierre nunca la vuelve a subir salvo que todo lo demás esté al tope.
  for (let i = 0; i < 20; i++) {
    const D = dayMacros(ws);
    if (D.p <= target.p * 1.1) break;
    let m = 0;
    for (const [w, id, o] of down('p')) m += Math.abs(nudge(w, id, -Math.min(120, (D.p - target.p * 1.1) * 4), ctx, o));
    if (!m) break;
  }
  for (let guard = 0; guard < 400; guard++) {
    const D = dayMacros(ws);
    const gap = target.kcal - D.kcal;
    const dev = { p: D.p / target.p - 1, c: D.c / target.c - 1, f: D.f / target.f - 1 };
    if (Math.abs(gap) <= target.kcal * 0.02) return;
    let lists: Move[][];
    if (gap > 0) {
      const order = (['c', 'f'] as const).slice().sort((a, b) => dev[a] - dev[b]);
      lists = [up(order[0]), up(order[1])];
    } else {
      const order = (['p', 'c', 'f'] as const).slice().sort((a, b) => dev[b] - dev[a]);
      lists = order.map((k) => down(k));
    }
    let moved = 0;
    const fine = Math.abs(gap) < target.kcal * 0.08;
    for (const list of lists) {
      if (!list.length) continue;
      if (fine) {
        // Ajuste fino: el único movimiento que más acerca al total sin pasarse.
        let best: { m: Move; err: number } | null = null;
        for (const m of list) {
          const [w, id] = m;
          const cur = w.grams[0][id] ?? 0;
          const base = portionCap(id, { ...ctx, role: w.slot.role });
          const cap = { min: base.min, max: Math.min(base.max, m[2].max ?? Infinity) };
          const st = stepOf(id);
          const g = Math.round(gap / kpgOf(id) / st) * st || Math.sign(gap) * st;
          const floor = m[2].floor ?? cap.min;
          let next = gap > 0 ? Math.min(cap.max, Math.max(cur === 0 ? cap.min : cur, cur + g)) : Math.max(floor, cur + g);
          if (gap > 0) {
            const room = roomFor(w, id, ctx);
            if (next - cur > room) next = cur + Math.max(0, Math.floor(room / st) * st);
            if (next > 0 && next < cap.min) continue;
          }
          if (gap < 0 && next < cap.min && floor === 0) next = 0;
          if (cur === 0 && !m[2].allowNew) continue;
          const err = Math.abs(gap - (next - cur) * kpgOf(id));
          if (next !== cur && err < Math.abs(gap) && (!best || err < best.err)) best = { m, err };
        }
        if (best) moved = Math.abs(nudge(best.m[0], best.m[1], gap, ctx, best.m[2]));
      } else {
        // Reparto con presupuesto: cada comida toma su parte del faltante y nunca se mueve más de lo que falta.
        let rem = gap;
        list.forEach(([w, id, o], k) => {
          if (Math.abs(rem) < target.kcal * 0.01 || Math.sign(rem) !== Math.sign(gap)) return;
          const left = list.length - k;
          const m = nudge(w, id, rem / left, ctx, o);
          rem -= m;
          moved += Math.abs(m);
        });
      }
      if (moved) break;
    }
    if (!moved && gap > 0 && extraLeft.n > 0) {
      const ex = mkExtra();
      if (ex) {
        ws.push(ex);
        extraLeft.n--;
        continue;
      }
    }
    if (!moved && gap > 0) for (const [w, id, o] of down('p').map((m): Move => [m[0], m[1], {}])) if (!moved) moved = nudge(w, id, gap, ctx, o);
    if (!moved) return;
  }
}

/** Lleva una alternativa a las kcal de la opción 1 (dentro de los topes) moviendo sus carbos, grasas y proteína. */
function fitAlt(rec: R, g: Record<string, number>, kcal: number, slot: SlotDef, ctx: Ctx, volCap?: number) {
  const w: Work = { slot, T: { p: 0, c: 0, f: 0, kcal }, recipes: [rec], grams: [g], added: new Set(), vol: volCap === undefined ? undefined : () => volCap };
  if (volCap !== undefined) fitVolume(rec, g, ctx, volCap);
  for (let guard = 0; guard < 60; guard++) {
    const gap = kcal - totals(toItems(g)).kcal;
    if (Math.abs(gap) <= kcal * 0.05) return;
    let moved = 0;
    for (const k of (gap > 0 ? ['c', 'f', 'p'] : ['f', 'c', 'p']) as ('p' | 'c' | 'f')[]) {
      for (const id of adjustable(w, k)) {
        moved = nudge(w, id, gap, ctx, { floor: gap < 0 && k !== 'p' ? 0 : undefined });
        if (moved) break;
      }
      if (moved) break;
    }
    if (!moved) return;
  }
}

/**
 * Orden de las opciones según el objetivo: en hipertrofia y rendimiento (más carbos, proteína 1,8-2 g/kg) las
 * colaciones arrancan por las livianas en proteína; en definición y recomposición, por las proteicas (saciedad).
 */
function ordered(goal: BankGoal, kind: SlotKind, recs: R[]): R[] {
  if (!['pre', 'mid', 'merienda', 'dessert'].includes(kind)) return recs;
  const lean = (r: R) => (r.parts.some((p) => p.r === 'p' && (p.min ?? 1) > 0) || r.parts.some((p) => p.r === 'x' && /alfajor|yogur|whey/.test(p.id)) ? 1 : 0);
  const carbFirst = goal === 'hip' || goal === 'ren';
  return [...recs].sort((a, b) => (carbFirst ? lean(a) - lean(b) : lean(b) - lean(a)));
}

/**
 * MUJER SIN LECHE FLUIDA: la leche como bebida (vaso de leche, café con leche, licuados, leche con cacao) cuesta
 * volumen y saciedad. En la mujer el café con leche pasa a café apenas cortado (un chorrito de 30 ml), el vaso de
 * leche y el licuado de leche a yogur griego chico, y el licuado con proteína se hace con agua.
 */
const MILK = new Set(['leche', 'leche-deslactosada']);
function femaleNoMilk(rec: R): R {
  const milk = rec.parts.find((p) => MILK.has(p.id));
  if (!milk) return rec;
  const steps = rec.steps ?? [];
  // Café con leche → café apenas cortado.
  if (milk.r === 'x' && /caf[eé] con leche/i.test(rec.title)) {
    return {
      ...rec,
      title: rec.title.replace(/(C|c)af[eé] con leche/g, (_, c: string) => (c === 'C' ? 'Café' : 'café') + ' apenas cortado'),
      parts: rec.parts.map((p) => (p === milk ? { ...p, g: 30 } : p)),
      steps: steps.map((t) => t.replace(/caf[eé] con \{(leche[a-z-]*)\} de leche( descremada)?/g, 'café apenas cortado (un chorrito: {$1} de leche$2)')),
    };
  }
  // Licuado con proteína: con agua fría (la proteína deja de ser opcional).
  if (milk.r === 'x' && rec.parts.some((p) => p.id === 'whey')) {
    return {
      ...rec,
      title: rec.title.replace(/Licuado de leche, banana y avena\[ con proteína\|whey\]/, 'Licuado con agua, banana, avena y proteína').replace(/Licuado de leche y banana\[ con proteína\|whey\]/, 'Licuado con agua, banana y proteína'),
      parts: rec.parts.filter((p) => p !== milk).map((p) => (p.id === 'whey' ? { ...p, min: 20 } : p)),
      steps: steps.map((t) => t.replace(/Licuá \{leche[a-z-]*\} de leche con/, 'Licuá 250 ml de agua fría con').replace(/\[ y (\{whey\}[^\]]*)\]/, ' y $1')),
    };
  }
  // Vaso de leche / licuado de leche / leche con cacao → yogur griego chico.
  if (milk.r === 'p') {
    return {
      ...rec,
      title: rec.title
        .replace(/un vaso de leche/, 'un yogur griego chico')
        .replace(/^Licuado de leche, banana y avena/, 'Yogur griego con banana y avena')
        .replace(/^Licuado de leche y banana/, 'Yogur griego con banana')
        .replace(/^Leche con cacao amargo/, 'Yogur griego con cacao amargo'),
      parts: rec.parts.map((p) => (p === milk ? { id: 'yogur', r: 'p' as const, min: 120 } : p)),
      steps: steps.map((t) =>
        t
          .replace(/Tomá \{leche[a-z-]*\} de leche con cacao amargo\./, 'Mezclá {yogur} de yogur griego con 1 cdita de cacao amargo.')
          .replace(/Tomá \{leche[a-z-]*\} de leche( descremada)?\./, 'Sumá {yogur} de yogur griego.')
          .replace(/Licuá \{leche[a-z-]*\} de leche con/, 'Mezclá {yogur} de yogur griego con'),
      ),
    };
  }
  return rec;
}

function buildDay(sel: BankSelection, day: MealDay, tierB: boolean, target: Tot, tr: BankTraining, fixed: BankMainTimes, allergies: Allergen[]): Meal[] {
  const sex = sexOf(sel.plan);
  const veg = sel.variant === 'veg';
  const ctx: Ctx = { sex, veg, ok: allergies.length ? (id) => !(FOOD_ALLERGENS[id] ?? []).some((a) => allergies.includes(a)) : undefined };
  const goalId = goalOf(sel.plan).id;
  const base = sex === 'F' ? (Object.fromEntries(Object.entries(RECIPES[sel.variant]).map(([k, list]) => [k, list.map(femaleNoMilk)])) as Record<SlotKind, R[]>) : RECIPES[sel.variant];
  // Alergias: recetas aptas primero; si no alcanzan, las otras con el ingrediente sustituido por un equivalente seguro.
  const recipes = Object.fromEntries(
    // Como mucho 5 opciones por comida (la sugerida + 4 alternativas), igual que en el Builder.
    (Object.keys(base) as SlotKind[]).map((k) => [k, ordered(goalId, k, safeRecipes(base[k], allergies, { veg, role: SLOT[k].role, sex })).slice(0, 5)]),
  ) as Record<SlotKind, R[]>;
  const slots = daySlots(mealCount(sex, tierB, day, tr), day, tr, fixed);
  const wsum = slots.reduce((a, k) => [a[0] + k.w[0], a[1] + k.w[1], a[2] + k.w[2]], [0, 0, 0]);
  const mkWork = (slot: SlotDef, share?: [number, number, number], only?: R[]): Work => {
    const s = share ?? [slot.w[0] / wsum[0], slot.w[1] / wsum[1], slot.w[2] / wsum[2]];
    const T = { p: target.p * s[0], c: target.c * s[1], f: target.f * s[2], kcal: 0 };
    T.kcal = kcalOf(T);
    const recs = only ?? recipes[slot.kind];
    return { slot, T, recipes: recs, grams: recs.map((r) => solve(r, T, { ...ctx, role: slot.role })), added: new Set() };
  };
  const ws = slots.map((k) => mkWork(k));
  // Atletas grandes que con los topes no llegan: primero una colación de tarde (o de media mañana) donde entre en la
  // agenda; si no hay lugar, un postre saludable dentro de la cena. Nunca una comida suelta después de cenar.
  const extraLeft = { n: 2 };
  const busy = (t: number) => day === 'on' && t > tr.start - 30 && t < tr.end + 15;
  const dinnerAt = slots.find((x) => x.kind === 'dinner')!.at;
  const mkExtra = (): Work | null => {
    const placed = ws.map((w) => (w.slot as Placed).at).filter((x) => x !== undefined);
    const lunchAt = slots.find((x) => x.kind === 'lunch')!.at;
    const t = [16 * 60, 15 * 60 + 30, 15 * 60, 11 * 60, 11 * 60 + 30, 18 * 60 + 30, 19 * 60, r15(tr.end + 30)].find(
      (x) => ws.length < 6 && x >= 9 * 60 && x <= dinnerAt - 120 && !busy(x) && placed.every((y) => Math.abs(y - x) >= 120),
    );
    if (t !== undefined) {
      const name = t < lunchAt ? 'Colación de media mañana' : 'Colación de tarde';
      return mkWork({ ...SLOT.extra, name, time: hhmm(t), at: t } as Placed, [0.12, 0.12, 0.1]);
    }
    if (ws.some((w) => w.slot.kind === 'dessert')) return null;
    // Postre: si la cena ya tenía fruta de postre, la reemplaza (un solo postre).
    const dinner = ws.find((w) => w.slot.kind === 'dinner')!;
    if (dinner.added.has('naranja')) {
      delete dinner.grams[0].naranja;
      dinner.added.delete('naranja');
    }
    const dw = mkWork({ ...SLOT.dessert, at: dinnerAt, time: hhmm(dinnerAt) } as Placed, [0.08, 0.1, 0.08], [recipes.dessert[0]]);
    // El postre comparte el volumen de la cena (es parte de la misma toma).
    dw.vol = () => mealVolumeCap(sex, 'dinner') - solidGrams(dinner.grams[0]);
    dinner.vol = () => mealVolumeCap(sex, 'dinner') - solidGrams(dw.grams[0]);
    fitVolume(dw.recipes[0], dw.grams[0], { ...ctx, role: 'dinner' }, dw.vol());
    return dw;
  };
  closeDay(ws, target, ctx, extraLeft, mkExtra);

  const dessert = ws.find((w) => w.slot.kind === 'dessert');
  const dItems = dessert ? toItems(dessert.grams[0]) : [];
  const dTitle = dessert ? titleFor(dessert.recipes[0].title, dessert.grams[0]) : '';
  const dSteps = dessert ? comboSteps({ ...dessert.recipes[0], roles: ['dinner'] }, dItems) : [];
  return ws
    .filter((w) => w.slot.kind !== 'dessert')
    .map((w) => {
      const main = toItems(w.grams[0]);
      const kcal = totals(main).kcal;
      const suffix = [...w.added].map((id) => moduleTitle(id, w.slot.kind)).join('');
      const withDessert = w.slot.kind === 'dinner' && dessert;
      const opts = w.recipes.map((rec, i) => {
        const g = i === 0 ? w.grams[0] : { ...w.grams[i] };
        // Con postre, cada alternativa de la cena deja lugar para el postre (es la misma toma).
        if (i > 0) fitAlt(rec, g, kcal, w.slot, { ...ctx, role: w.slot.role }, withDessert ? mealVolumeCap(sex, 'dinner') - solidGrams(dItems) : undefined);
        const items = toItems(g);
        const combo: Combo = { ...rec, roles: [w.slot.role] };
        const title = titleFor(rec.title, g) + (i === 0 ? suffix : '');
        if (!withDessert) return { title, items, steps: comboSteps(combo, items) };
        return { title: `${title} + postre: ${dTitle.charAt(0).toLowerCase()}${dTitle.slice(1)}`, items: [...items, ...dItems.map((it) => ({ ...it, id: uid() }))], steps: [...comboSteps(combo, items), ...dSteps] };
      });
      const [first, ...alts] = opts;
      return {
        id: uid(),
        name: w.slot.name,
        time: w.slot.time,
        day,
        role: w.slot.role,
        items: first.items,
        title: first.title,
        steps: first.steps,
        alts: alts.map((a) => ({ title: a.title, items: a.items, steps: a.steps })),
      } satisfies Meal;
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

export interface BankPlan {
  sel: BankSelection;
  weightKg: number;
  tier: 'A' | 'B';
  gkg: { on: Macros; off: Macros };
  target: { on: Tot; off: Tot };
  meals: Meal[];
}

/**
 * Arma el plan completo (día de entreno + día de descanso) para un peso. Los horarios siguen la agenda argentina y
 * el horario de entreno del alumno (por defecto 18:00, 1 h); `fixed`: desayuno / almuerzo / cena fijados por el coach.
 */
export function buildBankPlan(sel: BankSelection, weightKg: number, tr: BankTraining = DEFAULT_TRAINING, fixed: BankMainTimes = {}, allergies: Allergen[] = []): BankPlan {
  // Celíaco: siempre la variante Sin TACC (las vegetarianas sustituyen pan y fideos por los certificados).
  if (allergies.includes('gluten') && sel.variant === 'std') sel = { ...sel, variant: 'stacc' };
  const sex = sexOf(sel.plan);
  const goal = goalOf(sel.plan);
  const t = dayTargets(goal, sex, weightKg);
  const tierB = t.on.kcal > TIER_B[sex];
  const meals = [...buildDay(sel, 'on', tierB, t.on, tr, fixed, allergies), ...buildDay(sel, 'off', tierB, t.off, tr, fixed, allergies)];
  return { sel, weightKg, tier: tierB ? 'B' : 'A', gkg: t.gkg, target: { on: t.on, off: t.off }, meals };
}

/** Alimentos con gluten (prohibidos en la variante Sin TACC) y carnes (prohibidas en la vegetariana). */
export const GLUTEN_FOODS = new Set(['pan', 'pan-lactal', 'pan-arabe', 'pan-rallado', 'fideos', 'noquis', 'avena', 'avena-instantanea', 'granola', 'galletitas-agua', 'alfajor-proteico', 'barra-proteica', 'barrita-cereal', 'copos-maiz']);
export const MEAT_FOODS = new Set(['pollo', 'cuadril', 'lomo', 'nalga', 'picada', 'merluza', 'atun', 'cerdo', 'jamon']);

export const planLabel = (sel: BankSelection) => `${goalOf(sel.plan).label} · ${SEX_LABEL[sexOf(sel.plan)]} · ${BANK_VARIANTS.find((v) => v.id === sel.variant)!.label}`;

/**
 * "Aplicar a este alumno": el plan del banco con las porciones calculadas para su peso actual (siempre dentro de
 * la Tabla Única de Topes), la matriz de macros del objetivo y los horarios según su entreno.
 * Perfil, suplementos, anamnesis y nota del coach se conservan (Sin TACC suma su aviso fijo).
 */
export function applyBankPlan<T extends { profile: { weightKg: number; phase: Phase; trainingTime?: string; sessionMinutes?: number }; periodization: { on: Macros; off: Macros }; meals: Meal[]; coachNote: string; anamnesis?: AthletePlan['anamnesis'] }>(
  base: T,
  sel: BankSelection,
  fixed: BankMainTimes = {},
): T {
  const goal = goalOf(sel.plan);
  const allergies = allergiesOf(base);
  const bp = buildBankPlan(sel, base.profile.weightKg, trainingOf(base.profile), fixed, allergies);
  const celiac = sel.variant === 'stacc' || allergies.includes('gluten');
  const note = [base.coachNote.trim() || goal.rationale, celiac && !base.coachNote.includes('SIN TACC') ? STACC_WARNING : ''].filter(Boolean).join('\n\n');
  return {
    ...base,
    profile: { ...base.profile, phase: goal.phase },
    periodization: { ...base.periodization, on: bp.gkg.on, off: bp.gkg.off },
    meals: bp.meals,
    coachNote: note,
  };
}

/** Resumen para la tarjeta del banco (sin armar las comidas): macros, calorías y cantidad de comidas por día. */
export function planSummary(sel: BankSelection, weightKg: number, tr: BankTraining = DEFAULT_TRAINING) {
  const sex = sexOf(sel.plan);
  const t = dayTargets(goalOf(sel.plan), sex, weightKg);
  const tierB = t.on.kcal > TIER_B[sex];
  const opts = (kinds: SlotKind[]) => kinds.reduce((a, k) => a + RECIPES[sel.variant][k].length, 0) / kinds.length;
  const on = daySlots(mealCount(sex, tierB, 'on', tr), 'on', tr).map((x) => x.kind);
  const off = daySlots(mealCount(sex, tierB, 'off', tr), 'off', tr).map((x) => x.kind);
  return { gkg: t.gkg, kcal: { on: Math.round(t.on.kcal), off: Math.round(t.off.kcal) }, tier: tierB ? 'B' : 'A', meals: { on: on.length, off: off.length }, optionsPerMeal: Math.round(Math.min(opts(on), opts(off))) };
}
