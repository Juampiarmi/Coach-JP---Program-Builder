import { FOOD_ALLERGENS } from './allergens';
import type { ComboPart } from './menuOptions';
import { individual, inferYield, stepsWithYield, type YieldInfo, type YieldType } from './yieldInfo';

/**
 * RECETARIO COACH JP · 55+ preparaciones (desayunos, platos principales, meriendas y colaciones).
 *
 * Cada plato tiene sus metadatos para el coach (categoría, complejidad, variantes, ingredientes base, preparación y
 * guía de ajuste) y una RECETA ESTRUCTURADA por variante que entiende el motor del banco:
 *   P = proteína que se escala · C = carbohidrato que se escala · F = grasa que se escala · X = cantidad fija.
 * Así cada plato se escala solo a los macros de cada alumno (o de cada integrante de la pareja), dentro de los topes
 * por toma (portionCaps.ts), con huevos enteros, pisos de carne, alérgenos y variantes estrictas:
 *   · Sin TACC: avena certificada, pan / fideos / tapas aptas, salsa de soja sin TACC.
 *   · Vegetariana: sin carnes, aves ni pescados (huevo, lácteos, legumbres, tofu).
 *   · Mujer: sin leche fluida como bebida (receta `female`: yogur griego o agua).
 */
export type CatCategory = 'desayuno' | 'plato_principal' | 'merienda' | 'colacion';
export type CatComplexity = 'rapida' | 'elaborada';
export type CatVariant = 'Estandar' | 'Sin TACC' | 'Vegetariana';

export interface CatRecipe {
  title: string;
  parts: ComboPart[];
  steps: string[];
  /** Versión para mujer (sin leche fluida como bebida). */
  female?: CatRecipe;
}

export interface CatalogDish {
  id: string;
  title: string;
  category: CatCategory;
  complexity: CatComplexity;
  variants: CatVariant[];
  /** Ingredientes base (lista de compras de referencia). */
  base: string[];
  /** Preparación paso a paso (texto del recetario). */
  prep: string;
  /** Guía de ajuste de porciones. */
  adjust: string;
  std: CatRecipe;
  stacc?: CatRecipe;
  veg?: CatRecipe;
  /** Colación apta para antes / después de entrenar (fácil digestión). */
  peri?: boolean;
  /** Rendimiento: porción individual o receta de molde / tanda. */
  yieldType?: YieldType;
  /** Porciones que rinde la receta completa. */
  servings?: number;
  /** Qué sale de la receta entera (ej. «1 tarta mediana»). */
  yieldUnit?: string;
  /** Conservación y freezer. */
  storage?: string;
}

export const CAT_LABEL: Record<CatCategory, string> = {
  desayuno: 'Desayuno',
  plato_principal: 'Plato principal',
  merienda: 'Merienda',
  colacion: 'Colación',
};

const P = (id: string, extra: Partial<ComboPart> = {}): ComboPart => ({ id, r: 'p', ...extra });
const C = (id: string, extra: Partial<ComboPart> = {}): ComboPart => ({ id, r: 'c', ...extra });
const F = (id: string, extra: Partial<ComboPart> = {}): ComboPart => ({ id, r: 'f', ...extra });
const X = (id: string, g: number): ComboPart => ({ id, r: 'x', g });

/** Sin TACC: mismos pasos con los ingredientes aptos (ids y texto). */
const SIN_TACC: Record<string, string> = { pan: 'pan-sin-tacc', avena: 'avena-sin-tacc', granola: 'granola-sin-tacc', fideos: 'fideos-sin-tacc', 'fideos-integrales': 'fideos-sin-tacc', 'tapa-tarta': 'tapa-tarta-sin-tacc' };
const TEXT_STACC: [RegExp, string][] = [
  [/pan integral( o de masa madre)?/g, 'pan sin TACC'],
  [/de pan\b(?! sin TACC)/g, 'de pan sin TACC'],
  [/de avena( arrollada)?(?! certificada)/g, 'de avena certificada sin TACC'],
  [/(?<![{-])granola(?! sin TACC|-sin-tacc)/g, 'granola sin TACC'],
  [/fideos integrales/g, 'fideos de arroz sin TACC'],
  [/tapa integral/g, 'tapa sin TACC'],
  [/salsa de soja(?! sin TACC)/g, 'salsa de soja sin TACC'],
];
function stacc(r: CatRecipe, title?: string): CatRecipe {
  const swapTxt = (t: string) => TEXT_STACC.reduce((a, [re, to]) => a.replace(re, to), Object.entries(SIN_TACC).reduce((a, [from, to]) => a.split(`{${from}}`).join(`{${to}}`), t));
  return {
    title: title ?? TEXT_STACC.reduce((a, [re, to]) => a.replace(re, to), r.title),
    parts: r.parts.map((p) => (SIN_TACC[p.id] ? { ...p, id: SIN_TACC[p.id] } : p)),
    steps: [...r.steps.map(swapTxt), 'Elegí los envasados (quesos, fiambres, yogures, salsas) con el sello oficial «Sin TACC».'],
    female: r.female ? stacc(r.female) : undefined,
  };
}

const ALL: CatVariant[] = ['Estandar', 'Sin TACC', 'Vegetariana'];
const STD_STACC: CatVariant[] = ['Estandar', 'Sin TACC'];

function dish(d0: Omit<CatalogDish, 'stacc'> & { stacc?: CatRecipe | true }): CatalogDish {
  const d = { ...d0, stacc: d0.stacc === true ? stacc(d0.std) : d0.stacc ?? (d0.variants.includes('Sin TACC') ? stacc(d0.std) : undefined) };
  // Rendimiento (auditoría de platos grandes): tartas, pastel de papa, guisos, albóndigas, muffins… rinden varias
  // porciones; el primer paso de cada variante dice cuánto rinde el molde y qué fracción es la porción del alumno.
  const y: YieldInfo = YIELD_OVERRIDE[d.id] ?? inferYield(d.title) ?? individual();
  const withY = (r?: CatRecipe): CatRecipe | undefined => (r ? { ...r, steps: stepsWithYield(r.steps, y), female: withY(r.female) } : undefined);
  return { ...d, std: withY(d.std)!, stacc: withY(d.stacc), veg: withY(d.veg), yieldType: y.yieldType, servings: y.servings, yieldUnit: y.unit, storage: y.storage };
}

/** Platos cuyo rendimiento no se deduce del nombre. */
const YIELD_OVERRIDE: Record<string, YieldInfo> = {
  'pp-polenta-bolognesa': { yieldType: 'batch', servings: 4, unit: '1 olla de salsa bolognesa (la polenta se hace en el momento)', storage: 'La salsa se conserva 4 días en heladera o hasta 3 meses freezada en porciones; la polenta, hacela fresca.' },
  'pp-pasta-albondigas': { yieldType: 'batch', servings: 4, unit: '1 tanda de albóndigas con salsa (la pasta se hace en el momento)', storage: 'Albóndigas con salsa: 3 días en heladera o hasta 3 meses freezadas en porciones; la pasta, hacela fresca.' },
  'pp-solomillo-cerdo-batatas': { yieldType: 'batch', servings: 3, unit: '1 solomillo entero (~500 g crudo) con su bandeja de batatas y manzanas', storage: 'Se conserva 3 días en heladera en recipiente hermético o hasta 2 meses freezado en porciones (en fetas con su jugo).' },
};

// =====================================================================================================
// 1 · DESAYUNOS
// =====================================================================================================
const DESAYUNOS: CatalogDish[] = [
  dish({
    id: 'des-huevos-revueltos-pan-tomate',
    title: 'Huevos revueltos cremosos con pan integral tostado y tomate',
    category: 'desayuno',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['huevos', 'pan integral o sin TACC', 'tomate', 'orégano', 'aceite o rocío vegetal'],
    prep: 'Batí los huevos con sal y pimienta; cocinalos a fuego bajo/medio en sartén antiadherente con apenas rocío vegetal (sin aceite agregado), revolviendo suave hasta que queden cremosos sin secarse. Acompañá con pan tostado y rodajas de tomate con orégano.',
    adjust: 'Escalá cantidad de huevos y rebanadas de pan según proteína y carbohidratos requeridos.',
    std: {
      title: 'Huevos revueltos cremosos con pan integral tostado y tomate',
      parts: [P('huevo'), C('pan'), X('tomate', 100)],
      steps: [
        'Batí {huevo} con sal y pimienta.',
        'Cocinalos a fuego bajo-medio en sartén antiadherente con rocío vegetal (sin aceite agregado), revolviendo suave hasta que queden cremosos, sin secarse.',
        'Tostá {pan} de pan integral.',
        'Acompañá con {tomate} de tomate en rodajas con orégano.',
      ],
    },
  }),
  dish({
    id: 'des-tortilla-avena-huevo',
    title: 'Tortilla esponjosa de avena y huevo (base versátil: banana, limón o vainilla)',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['huevos', 'avena', 'polvo de hornear', 'banana', 'limón', 'esencia de vainilla', 'canela'],
    prep: 'Mezclá huevo entero (o huevo + claras) con avena, polvo de hornear y elegí tu sabor: banana pisada + canela; o ralladura de limón + vainilla. Volcá en sartén antiadherente tapada a fuego mínimo 3-4 min hasta que haga burbujas, dala vuelta y dorá 1-2 min más.',
    adjust: 'Escalá gramos de avena y unidades de huevo; podés sumar yogur griego o fruta fresca según macros.',
    std: {
      title: 'Tortilla esponjosa de avena y huevo con banana y canela',
      parts: [P('huevo'), C('avena'), X('banana', 60)],
      steps: [
        'Mezclá en un bowl {huevo} (o huevo + claras) con {avena} de avena y 1 cdita de polvo de hornear.',
        'Elegí el sabor: {banana} de banana madura pisada con canela (o ralladura de limón + esencia de vainilla).',
        'Volcá en sartén antiadherente tapada a fuego mínimo 3-4 min, hasta que haga burbujas.',
        'Dala vuelta y dorá 1-2 min más.',
      ],
    },
  }),
  dish({
    id: 'des-porridge-banana',
    title: 'Avena cocida tipo porridge con banana y canela',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['avena', 'leche o bebida vegetal', 'banana', 'canela'],
    prep: 'Llevá a hervor suave la avena con agua o leche (o bebida vegetal) revolviendo hasta lograr textura cremosa. Retirá del fuego, sumá canela y banana en rodajas.',
    adjust: 'Regulá gramos de avena y líquido; agregá yogur o claras cocidas al final para subir proteína.',
    std: {
      title: 'Avena cocida tipo porridge con banana, canela y yogur',
      parts: [C('avena'), P('yogur', { min: 100 }), X('leche', 200), X('banana', 100)],
      steps: [
        'Llevá a hervor suave {avena} de avena con {leche} de leche (o bebida vegetal), revolviendo hasta que quede cremosa.',
        'Retirá del fuego y sumá canela y {banana} de banana en rodajas.',
        'Terminá con {yogur} de yogur griego para sumar proteína.',
      ],
      female: {
        title: 'Avena cocida tipo porridge con banana, canela y yogur',
        parts: [C('avena'), P('yogur', { min: 120 }), X('banana', 100)],
        steps: [
          'Llevá a hervor suave {avena} de avena con agua (o mitad agua y un chorrito de leche), revolviendo hasta que quede cremosa.',
          'Retirá del fuego y sumá canela y {banana} de banana en rodajas.',
          'Terminá con {yogur} de yogur griego para sumar proteína.',
        ],
      },
    },
  }),
  dish({
    id: 'des-revuelto-claras-espinaca',
    title: 'Revuelto de claras y huevo entero con espinaca y queso untable',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['huevos', 'claras', 'espinaca fresca', 'queso untable magro'],
    prep: 'Salteá espinaca lavada en sartén caliente hasta que reduzca. Sumá huevos y claras batidos, cociná revolviendo despacio y, al apagar el fuego, mezclá una cucharada de queso untable magro para dar cremosidad.',
    adjust: 'Regulá proporción claras/huevo entero para proteína magra; acompañá con pan o fruta según carbohidratos.',
    std: {
      title: 'Revuelto de claras y huevo con espinaca y queso untable + tostadas integrales y fruta',
      parts: [P('claras', { min: 66 }), C('pan'), X('huevo', 60), X('espinaca', 60), X('untable', 15), X('naranja', 120)],
      steps: [
        'Salteá {espinaca} de espinaca lavada en sartén caliente hasta que reduzca.',
        'Sumá {huevo} y {claras} batidos y cociná revolviendo despacio.',
        'Al apagar el fuego, mezclá {untable} de queso untable magro para dar cremosidad.',
        'Acompañá con {pan} de pan integral tostado y {naranja} de fruta de estación (naranja o mandarina).',
      ],
    },
  }),
  dish({
    id: 'des-yogur-granola-frutos-rojos',
    title: 'Yogur natural o griego con granola casera y frutos rojos o manzana',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['yogur natural o griego', 'granola', 'frutos rojos o manzana'],
    prep: 'Serví el yogur en un bowl, sumá la fruta cortada en cubos y coroná con la granola justo antes de comer para mantener crocancia.',
    adjust: 'Ajustá yogur para proteína y granola/fruta para energía total.',
    std: {
      title: 'Yogur griego con granola y frutillas (o manzana)',
      parts: [P('yogur', { min: 150 }), C('granola'), X('frutillas', 120)],
      steps: ['Serví {yogur} de yogur en un bowl.', 'Sumá {frutillas} de frutillas (o manzana) en cubos.', 'Coroná con {granola} de granola justo antes de comer para que quede crocante.'],
    },
  }),
  dish({
    id: 'des-tostadas-palta-huevo',
    title: 'Tostadas con palta pisada y huevo poché o a la plancha',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['pan integral o sin TACC', 'palta', 'huevos', 'limón'],
    prep: 'Tostá el pan; pisá la palta con tenedor, limón, sal y pimienta. Untá sobre las tostadas y coroná con huevo a la plancha o poché.',
    adjust: 'Medí la palta en gramos según calorías; ajustá huevos y pan para macros.',
    std: {
      title: 'Tostadas integrales con palta pisada y huevo poché',
      parts: [P('huevo'), C('pan'), F('palta')],
      steps: ['Tostá {pan} de pan integral.', 'Pisá {palta} de palta con tenedor, limón, sal y pimienta y untá las tostadas.', 'Coroná con {huevo} poché (3 min en agua apenas hirviendo) o a la plancha.'],
    },
  }),
  dish({
    id: 'des-crepes-avena',
    title: 'Panqueques rápidos de avena y huevo (estilo crepes proteicos)',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['avena', 'huevos', 'leche o bebida vegetal', 'fruta o queso untable'],
    prep: 'Licuá avena, huevos y un chorrito de leche o agua hasta lograr una mezcla fluida. Cociná en sartén antiadherente en discos finos 1,5 minutos por lado y rellená con fruta o queso untable.',
    adjust: 'Escalá la mezcla base según gasto energético.',
    std: {
      title: 'Panqueques rápidos de avena y huevo rellenos de frutillas',
      parts: [P('huevo'), C('avena'), X('leche', 60), X('frutillas', 120)],
      steps: [
        'Licuá {avena} de avena con {huevo} y {leche} de leche (o agua) hasta lograr una mezcla fluida; dejá reposar 5 min.',
        'Cociná discos finos en sartén antiadherente, 1,5 min por lado.',
        'Rellenalos con {frutillas} de frutillas (o queso untable) y enrollalos.',
      ],
    },
  }),
  dish({
    id: 'des-tostado-jamon-queso',
    title: 'Tostado caliente de jamón cocido natural y queso magro',
    category: 'desayuno',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['pan integral o sin TACC', 'jamón cocido natural', 'queso magro'],
    prep: 'Armá el sándwich con pan, fetas de jamón cocido natural y queso magro. Dorá en tostadora o sartén tapada hasta fundir.',
    adjust: 'Variá cantidad de fetas y pan según macros.',
    std: {
      title: 'Tostado caliente de pan integral, jamón cocido natural y queso magro',
      parts: [P('jamon'), C('pan'), X('queso-light', 30)],
      steps: ['Armá el sándwich con {pan} de pan integral, {jamon} de jamón cocido natural y {queso-light} de queso magro.', 'Dorálo en tostadora o sartén tapada hasta que funda el queso.'],
    },
  }),
  dish({
    id: 'des-overnight-cacao-pera',
    title: 'Bowl de avena remojada en frío (overnight oats) con cacao y pera',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['avena', 'leche o bebida vegetal', 'cacao amargo', 'esencia de vainilla', 'pera'],
    prep: 'Mezclá en un frasco avena, leche o bebida vegetal, cacao amargo y esencia de vainilla; llevá a heladera mínimo 4 horas o toda la noche. Al servir, sumá pera en cubos.',
    adjust: 'Regulá avena y fruta para carbohidratos.',
    std: {
      title: 'Overnight oats de avena, yogur y cacao con pera',
      parts: [C('avena'), P('yogur', { min: 100 }), X('leche', 100), X('pera', 120), X('cacao-amargo', 5)],
      steps: [
        'Mezclá en un frasco {avena} de avena, {leche} de leche (o bebida vegetal), {yogur} de yogur, {cacao-amargo} de cacao amargo y esencia de vainilla.',
        'Llevalo a la heladera mínimo 4 h (o toda la noche).',
        'Al servir, sumá {pera} de pera en cubos.',
      ],
    },
  }),
  dish({
    id: 'des-omelette-champinones',
    title: 'Omelette relleno de champiñones y queso',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['huevos', 'champiñones frescos', 'queso magro'],
    prep: 'Fileteá y dorá champiñones en sartén; volcá huevos batidos encima, dejá cuajar la base, sumá queso en el centro, doblá y terminá un minuto más.',
    adjust: 'Ajustá huevos y queso para proteína/grasa; sumá tostadas si hace falta carbohidrato.',
    std: {
      title: 'Omelette relleno de champiñones y queso con tostadas integrales',
      parts: [P('huevo'), C('pan'), X('champinones', 80), X('queso-light', 30)],
      steps: [
        'Fileteá {champinones} de champiñones y dorálos en sartén antiadherente.',
        'Volcá encima {huevo} batido y dejá cuajar la base a fuego bajo.',
        'Sumá {queso-light} de queso magro en el centro, doblá y cociná 1 min más.',
        'Acompañá con {pan} de pan integral tostado.',
      ],
    },
  }),
  dish({
    id: 'des-waffles-avena-banana',
    title: 'Waffles rápidos de avena, huevo y banana',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['banana', 'huevos', 'avena', 'polvo de hornear', 'canela'],
    prep: 'Pisá banana madura, mezclá con huevo, avena, canela y pizca de polvo de hornear. Cociná en waflera precalentada hasta dorar.',
    adjust: 'Escalá porciones de masa y sumá yogur o fruta encima.',
    std: {
      title: 'Waffles rápidos de avena, huevo y banana',
      parts: [P('huevo'), C('avena'), X('banana', 100)],
      steps: ['Pisá {banana} de banana madura.', 'Mezclala con {huevo}, {avena} de avena, canela y una pizca de polvo de hornear.', 'Cociná en waflera precalentada 3-4 min, hasta dorar.'],
    },
  }),
  dish({
    id: 'des-ricota-fruta-nueces',
    title: 'Ricota magra condimentada con fruta fresca y nueces',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['ricota magra', 'fruta de estación', 'nueces', 'canela o esencia de vainilla'],
    prep: 'Colocá ricota magra en un bowl con esencia de vainilla o canela, sumá fruta fresca en trozos y nueces picadas.',
    adjust: 'Escalá ricota para proteína y fruta/nueces para carbohidratos y grasas.',
    std: {
      title: 'Ricota magra con vainilla, manzana (o fruta de estación) y nueces',
      parts: [P('ricota'), C('manzana'), F('nueces')],
      steps: ['Poné {ricota} de ricota magra en un bowl con esencia de vainilla o canela.', 'Sumá {manzana} de manzana (o fruta de estación) en trozos.', 'Terminá con {nueces} de nueces picadas.'],
    },
  }),
  dish({
    id: 'des-tostadas-untable-huevos-semillas',
    title: 'Tostadas con queso untable, huevos revueltos y semillas de chía o sésamo',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['pan integral o sin TACC', 'queso untable magro', 'huevos', 'semillas de chía o sésamo'],
    prep: 'Tostá el pan, untá queso descremado, colocá huevos revueltos encima y terminá con semillas y pimienta negra.',
    adjust: 'Escalá pan y huevos según requerimiento.',
    std: {
      title: 'Tostadas integrales con queso untable, huevos revueltos y semillas',
      parts: [P('huevo'), C('pan'), F('semillas', { max: 10 }), X('untable', 20)],
      steps: ['Tostá {pan} de pan integral y untalo con {untable} de queso untable.', 'Revolvé {huevo} a fuego bajo hasta que queden cremosos y ponelos encima.', 'Terminá con {semillas} de semillas de chía o sésamo y pimienta negra.'],
    },
  }),
  dish({
    id: 'des-yogur-avena-arandanos',
    title: 'Bowl de yogur griego con avena, arándanos y miel',
    category: 'desayuno',
    complexity: 'rapida',
    variants: ALL,
    base: ['yogur griego', 'avena', 'arándanos', 'miel'],
    prep: 'Mezclá el yogur con la avena, sumá los arándanos y un hilo de miel.',
    adjust: 'Yogur para proteína; avena, arándanos y miel para carbohidratos.',
    std: {
      title: 'Bowl de yogur griego con avena, arándanos y miel',
      parts: [P('yogur', { min: 150 }), C('avena'), X('arandanos', 80), X('miel', 10)],
      steps: ['Mezclá {yogur} de yogur griego con {avena} de avena.', 'Sumá {arandanos} de arándanos.', 'Terminá con {miel} de miel.'],
    },
  }),
];

// =====================================================================================================
// 2 · PLATOS PRINCIPALES
// =====================================================================================================
const PRINCIPALES: CatalogDish[] = [
  dish({
    id: 'pp-pollo-arroz-ensalada',
    title: 'Pollo a la plancha con arroz y ensalada fresca',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['pechuga de pollo', 'arroz', 'lechuga', 'rúcula', 'tomate', 'pepino', 'aceite de oliva', 'limón'],
    prep: 'Cociná arroz en agua o caldo suave. Marcá pechuga o supremas de pollo en plancha condimentadas hasta dorar. Acompañá con hojas verdes, tomate y pepino con aceite de oliva y limón.',
    adjust: 'Escalá gramos de pollo para proteína y de arroz para carbohidratos.',
    std: {
      title: 'Pollo a la plancha con arroz y ensalada fresca',
      parts: [P('pollo'), C('arroz'), F('oliva'), X('lechuga', 40), X('tomate', 100), X('pepino', 60)],
      steps: [
        'Cociná {arroz} de arroz en agua o caldo suave.',
        'Marcá {pollo} de pechuga condimentada en plancha bien caliente, 5-6 min por lado, hasta dorar.',
        'Armá la ensalada con {lechuga} de lechuga y rúcula, {tomate} de tomate y {pepino} de pepino.',
        'Aliñá con {oliva} de aceite de oliva y limón.',
      ],
    },
  }),
  dish({
    id: 'pp-carne-pure',
    title: 'Carne magra (nalga, cuadril o lomo) con puré de papa o calabaza',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['corte magro vacuno (nalga, cuadril o lomo)', 'papa', 'calabaza', 'aceite de oliva', 'leche', 'nuez moscada'],
    prep: 'Herví papa y/o calabaza en cubos hasta tiernizar, pisá con un toque de aceite de oliva o leche y nuez moscada. Sellá el bife magro en plancha al punto deseado.',
    adjust: 'Ajustá corte y puré según macros; mezclar papa y calabaza permite regular calorías fácilmente.',
    std: {
      title: 'Bife de carne magra con puré de papa y calabaza',
      parts: [P('nalga'), C('papa'), F('oliva', { max: 10 }), X('calabaza', 150)],
      steps: [
        'Herví {papa} de papa y {calabaza} de calabaza en cubos hasta que estén tiernas.',
        'Pisalas con {oliva} de aceite de oliva (o un chorrito de leche) y nuez moscada.',
        'Sellá {nalga} de bife magro (nalga, cuadril o lomo) en plancha bien caliente, al punto que te guste.',
      ],
    },
  }),
  dish({
    id: 'pp-salteado-pollo-fideos',
    title: 'Salteado de pollo o carne con vegetales y fideos o arroz',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['pollo o carne magra', 'zanahoria', 'morrón', 'zucchini', 'fideos o arroz', 'aceite de oliva'],
    prep: 'Salteá tiras de carne o pollo con bastones de zanahoria, morrón y zucchini a fuego fuerte; mezclá con pasta o arroz cocido y condimentos.',
    adjust: 'Escalá proteína y base de hidrato según el día de entrenamiento.',
    std: {
      title: 'Salteado de pollo con vegetales y fideos',
      parts: [P('pollo'), C('fideos'), F('oliva'), X('zanahoria', 60), X('morron', 60), X('zucchini', 80)],
      steps: [
        'Cociná {fideos} de fideos al dente.',
        'Salteá {pollo} de pollo en tiras con {oliva} de aceite a fuego fuerte.',
        'Sumá {zanahoria} de zanahoria, {morron} de morrón y {zucchini} de zucchini en bastones, 4-5 min.',
        'Mezclá con los fideos y condimentá.',
      ],
    },
    stacc: stacc(
      {
        title: 'Salteado de pollo con vegetales y fideos de arroz',
        parts: [P('pollo'), C('fideos-sin-tacc'), F('oliva'), X('zanahoria', 60), X('morron', 60), X('zucchini', 80)],
        steps: [
          'Cociná {fideos-sin-tacc} de fideos de arroz en olla y colador propios.',
          'Salteá {pollo} de pollo en tiras con {oliva} de aceite a fuego fuerte.',
          'Sumá {zanahoria} de zanahoria, {morron} de morrón y {zucchini} de zucchini en bastones, 4-5 min.',
          'Mezclá con los fideos y condimentá.',
        ],
      },
      'Salteado de pollo con vegetales y fideos de arroz',
    ),
  }),
  dish({
    id: 'pp-merluza-batatas',
    title: 'Merluza o filet de pescado al horno con batatas asadas',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['filet de merluza', 'batata', 'aceite de oliva', 'limón', 'ajo', 'romero'],
    prep: 'Horneá batatas en gajos con aceite de oliva y romero hasta dorar; en los últimos minutos sumá filets de merluza con limón, ajo y perejil hasta que estén opacos.',
    adjust: 'Regulá filets y batata según macros.',
    std: {
      title: 'Merluza al horno con batatas asadas',
      parts: [P('merluza'), C('batata'), F('oliva')],
      steps: [
        'Horneá {batata} de batata en gajos con {oliva} de aceite de oliva y romero, 30 min a 200 °C.',
        'En los últimos 12-15 min sumá {merluza} de merluza con limón, ajo y perejil, hasta que esté opaca.',
      ],
    },
  }),
  dish({
    id: 'pp-lentejas-guisadas',
    title: 'Lentejas guisadas con vegetales y carne magra (o versión vegetariana con huevo)',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: ALL,
    base: ['lentejas', 'cebolla', 'morrón', 'zanahoria', 'ajo', 'tomate triturado', 'caldo', 'carne magra (o huevos)'],
    prep: 'Rehogá cebolla, ajo, morrón y zanahoria; sumá lentejas cocidas/enjuagadas, tomate triturado y caldo. Cociná a fuego bajo hasta espesar, con cubos de carne magra o coronada con huevo duro en versión vegetariana.',
    adjust: 'Ajustá porción de guiso y fuente proteica según requerimiento.',
    std: {
      title: 'Lentejas guisadas con vegetales y carne magra',
      parts: [P('nalga'), C('lentejas'), F('oliva', { max: 10 }), X('cebolla', 50), X('morron', 40), X('zanahoria', 40), X('tomate', 80)],
      steps: [
        'Rehogá {cebolla} de cebolla, ajo, {morron} de morrón y {zanahoria} de zanahoria con {oliva} de aceite.',
        'Sumá {nalga} de carne magra en cubos y dorala.',
        'Agregá {lentejas} de lentejas cocidas y enjuagadas, {tomate} de tomate triturado y un poco de caldo.',
        'Cociná a fuego bajo 15-20 min, hasta espesar.',
      ],
    },
    veg: {
      title: 'Lentejas guisadas con vegetales y huevo duro',
      parts: [P('huevo'), C('lentejas'), F('oliva', { max: 10 }), X('cebolla', 50), X('morron', 40), X('zanahoria', 40), X('tomate', 80)],
      steps: [
        'Rehogá {cebolla} de cebolla, ajo, {morron} de morrón y {zanahoria} de zanahoria con {oliva} de aceite.',
        'Agregá {lentejas} de lentejas cocidas y enjuagadas, {tomate} de tomate triturado y un poco de caldo.',
        'Cociná a fuego bajo 15-20 min, hasta espesar.',
        'Serví coronado con {huevo} duro (9-10 min de hervor).',
      ],
    },
  }),
  dish({
    id: 'pp-wok-pollo-fideos-arroz',
    title: 'Wok de pollo con fideos de arroz, pimiento, zanahoria y cebolla asada con salsa de soja',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['pechuga de pollo', 'fideos de arroz', 'pimiento', 'zanahoria', 'cebolla', 'salsa de soja', 'ajo', 'jengibre', 'aceite'],
    prep: 'Cortá pechuga en tiras y los vegetales; dorá bien los vegetales hasta que la cebolla quede asada en los bordes; sumá el pollo con ajo y jengibre, salteá y agregá los fideos de arroz cocidos con salsa de soja.',
    adjust: 'Escalá pollo para proteína y fideos de arroz para carbohidratos; regulá salsa de soja.',
    std: {
      title: 'Wok de pollo con fideos de arroz, morrón, zanahoria y cebolla asada',
      parts: [P('pollo'), C('fideos-sin-tacc'), F('oliva'), X('morron', 60), X('zanahoria', 50), X('cebolla', 60)],
      steps: [
        'Cociná {fideos-sin-tacc} de fideos de arroz según el paquete y escurrilos.',
        'Dorá {morron} de morrón en tiras, {zanahoria} de zanahoria en juliana y {cebolla} de cebolla en pluma con {oliva} de aceite, hasta que la cebolla quede asada en los bordes.',
        'Sumá {pollo} de pollo en tiras finas con ajo y jengibre y salteá hasta cocinar.',
        'Incorporá los fideos con un chorrito de salsa de soja (baja en sodio).',
      ],
    },
  }),
  dish({
    id: 'pp-hamburguesas-ensalada',
    title: 'Hamburguesas caseras de carne o legumbres a la plancha con ensalada completa',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: ALL,
    base: ['carne picada magra (o legumbres)', 'hojas verdes', 'tomate', 'cebolla', 'huevos'],
    prep: 'Armá medallones caseros de carne picada magra (o lentejas/garbanzos procesados con especias) y cociná a la plancha. Serví con ensalada mixta y huevo duro.',
    adjust: 'Regulá medallones y sumá papa o arroz si el objetivo calórico es alto.',
    std: {
      title: 'Hamburguesas caseras de carne magra con papas al horno y ensalada completa',
      parts: [P('picada'), C('papa'), F('oliva', { max: 10 }), X('lechuga', 40), X('tomate', 100), X('huevo', 60)],
      steps: [
        'Formá medallones con {picada} de carne picada magra y especias; cocinalos a la plancha 4 min por lado.',
        'Asá {papa} de papa en gajos 30 min a 200 °C.',
        'Armá la ensalada con {lechuga} de hojas verdes, {tomate} de tomate y {huevo} duro, aliñada con {oliva} de aceite.',
      ],
    },
    veg: {
      title: 'Hamburguesas caseras de lentejas con ensalada completa y huevo duro',
      parts: [P('huevo'), C('lentejas'), F('oliva', { max: 10 }), X('lechuga', 40), X('tomate', 100)],
      steps: [
        'Procesá {lentejas} de lentejas cocidas con especias, formá medallones y cocinalos a la plancha 4 min por lado.',
        'Armá la ensalada con {lechuga} de hojas verdes y {tomate} de tomate, aliñada con {oliva} de aceite.',
        'Sumá {huevo} duro en cuartos.',
      ],
    },
  }),
  dish({
    id: 'pp-pasta-albondigas',
    title: 'Pasta saludable con salsa de tomate casera y albóndigas o carne picada magra',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['fideos integrales, de arroz o de legumbres', 'carne picada magra', 'tomate triturado', 'cebolla', 'ajo', 'albahaca'],
    prep: 'Cociná al dente los fideos. En paralelo, prepará salsa de tomate natural con cebolla, ajo, albahaca y albóndigas o carne picada magra. Uní y serví.',
    adjust: 'Ajustá gramos de pasta seca y gramaje de carne/albóndigas según requerimiento.',
    std: {
      title: 'Fideos integrales con salsa de tomate casera y albóndigas de carne magra',
      parts: [P('picada'), C('fideos-integrales'), F('oliva', { max: 10 }), X('tomate', 120), X('cebolla', 40)],
      steps: [
        'Formá albóndigas chicas con {picada} de carne picada magra y especias.',
        'Rehogá {cebolla} de cebolla y ajo con {oliva} de aceite, sumá {tomate} de tomate triturado y albahaca y cociná las albóndigas en la salsa 15 min.',
        'Cociná {fideos-integrales} de fideos integrales al dente y serví con la salsa.',
      ],
    },
    stacc: {
      title: 'Fideos de legumbres sin TACC con salsa de tomate casera y albóndigas de carne magra',
      parts: [P('picada'), C('fideos-legumbres'), F('oliva', { max: 10 }), X('tomate', 120), X('cebolla', 40)],
      steps: [
        'Formá albóndigas chicas con {picada} de carne picada magra pura y especias (sin pan rallado).',
        'Rehogá {cebolla} de cebolla y ajo con {oliva} de aceite, sumá {tomate} de tomate triturado con sello Sin TACC y albahaca y cociná las albóndigas en la salsa 15 min.',
        'Cociná {fideos-legumbres} de fideos de legumbres al dente en olla y colador propios y serví con la salsa.',
      ],
    },
  }),
  dish({
    id: 'pp-tarta-pollo-vegetales',
    title: 'Tarta casera de pollo y vegetales (base integral o sin masa)',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['pechuga de pollo', 'cebolla', 'morrón', 'espinaca o puerro', 'huevos', 'queso untable magro', 'tapa de tarta integral'],
    prep: 'Salteá cebolla, morrón y espinaca o puerro; mezclá con pollo cocido desmenuzado, huevo batido, queso untable magro y condimentos. Volcá sobre tapa integral o en fuente sin masa y horneá 25-30 minutos.',
    adjust: 'Escalá porción de tarta y acompañá con ensalada fresca.',
    std: {
      title: 'Tarta integral de pollo y vegetales',
      parts: [P('pollo'), C('tapa-tarta'), X('huevo', 60), X('cebolla', 50), X('morron', 40), X('espinaca', 50), X('untable', 15)],
      steps: [
        'Salteá {cebolla} de cebolla, {morron} de morrón y {espinaca} de espinaca.',
        'Mezclá con {pollo} de pollo cocido y desmenuzado, {huevo} batido y {untable} de queso untable magro.',
        'Volcá sobre {tapa-tarta} de tapa integral y horneá 25-30 min a 180 °C, hasta dorar.',
      ],
    },
    stacc: {
      title: 'Tarta sin masa de pollo y vegetales con papas al horno',
      parts: [P('pollo'), C('papa'), X('huevo', 60), X('cebolla', 50), X('morron', 40), X('espinaca', 50), X('untable', 20)],
      steps: [
        'Salteá {cebolla} de cebolla, {morron} de morrón y {espinaca} de espinaca.',
        'Mezclá con {pollo} de pollo cocido y desmenuzado, {huevo} batido y {untable} de queso untable magro con sello Sin TACC.',
        'Volcá en una fuente aceitada (sin masa) y horneá 25 min a 180 °C, junto con {papa} de papa en gajos.',
      ],
    },
  }),
  dish({
    id: 'pp-tarta-carne',
    title: 'Tarta casera de carne picada magra con cebolla, morrón y huevo',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['carne picada magra', 'cebolla', 'morrón', 'cebolla de verdeo', 'huevos', 'aceitunas', 'tapa de tarta integral'],
    prep: 'Rehogá cebolla, morrón y verdeo; sumá carne picada magra, comino, pimentón y aceitunas. Dejá entibiar, integrá huevo batido y huevo duro picado, colocá sobre base integral o en molde sin masa y horneá hasta dorar.',
    adjust: 'Escalá tamaño de porción según macros.',
    std: {
      title: 'Tarta integral de carne picada magra con cebolla, morrón y huevo',
      parts: [P('picada'), C('tapa-tarta'), X('huevo', 60), X('cebolla', 60), X('morron', 50), X('aceitunas', 10)],
      steps: [
        'Rehogá {cebolla} de cebolla y verdeo con {morron} de morrón.',
        'Sumá {picada} de carne picada magra con comino y pimentón y {aceitunas} de aceitunas picadas.',
        'Dejá entibiar e integrá {huevo} (mitad batido, mitad duro y picado).',
        'Colocá sobre {tapa-tarta} de tapa integral y horneá 25 min a 180 °C, hasta dorar.',
      ],
    },
    stacc: {
      title: 'Tarta sin masa de carne picada magra con cebolla, morrón y huevo + papas',
      parts: [P('picada'), C('papa'), X('huevo', 60), X('cebolla', 60), X('morron', 50), X('aceitunas', 10)],
      steps: [
        'Rehogá {cebolla} de cebolla y verdeo con {morron} de morrón.',
        'Sumá {picada} de carne picada magra con comino y pimentón y {aceitunas} de aceitunas picadas.',
        'Dejá entibiar, integrá {huevo} batido y horneá en molde aceitado (sin masa) 25 min a 180 °C.',
        'Acompañá con {papa} de papa hervida o al horno.',
      ],
    },
  }),
  dish({
    id: 'pp-tarta-atun',
    title: 'Tarta liviana de atún al natural, tomate y queso magro',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['atún al natural', 'cebolla', 'tomate', 'huevos', 'queso magro', 'orégano', 'tapa de tarta integral'],
    prep: 'Mezclá atún bien escurrido con cebolla salteada, tomate en cubos sin semillas, huevo batido, queso magro y orégano. Horneá sobre tapa integral o en molde sin masa hasta cuajar y gratinar.',
    adjust: 'Ajustá porciones según requerimiento proteico y calórico.',
    std: {
      title: 'Tarta integral liviana de atún al natural, tomate y queso magro',
      parts: [P('atun'), C('tapa-tarta'), X('huevo', 60), X('tomate', 80), X('cebolla', 40), X('queso-light', 30)],
      steps: [
        'Mezclá {atun} de atún al natural bien escurrido con {cebolla} de cebolla salteada y {tomate} de tomate en cubos sin semillas.',
        'Sumá {huevo} batido, {queso-light} de queso magro y orégano.',
        'Volcá sobre {tapa-tarta} de tapa integral y horneá 25 min a 180 °C, hasta cuajar y gratinar.',
      ],
    },
  }),
  dish({
    id: 'pp-polenta-bolognesa',
    title: 'Polenta cremosa con salsa bolognesa magra y queso',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['polenta', 'carne picada magra', 'tomate triturado', 'cebolla', 'zanahoria', 'ajo', 'leche descremada', 'queso magro'],
    prep: 'Prepará bolognesa con carne picada magra, cebolla, zanahoria rallada, ajo y tomate triturado a fuego suave. Herví agua o caldo con leche descremada y volcá la polenta en forma de lluvia revolviendo 2-3 minutos hasta espesar. Serví con bolognesa y queso magro.',
    adjust: 'Regulá gramos de polenta cruda para carbohidratos y bolognesa para proteína.',
    std: {
      title: 'Polenta cremosa con salsa bolognesa magra y queso',
      parts: [P('picada'), C('polenta'), X('tomate', 120), X('cebolla', 40), X('zanahoria', 40), X('queso-light', 20)],
      steps: [
        'Rehogá {cebolla} de cebolla, ajo y {zanahoria} de zanahoria rallada; sumá {picada} de carne picada magra y {tomate} de tomate triturado y cociná 15 min a fuego suave.',
        'Herví agua (o caldo con un chorrito de leche descremada) y volcá la polenta en lluvia, revolviendo 2-3 min: tiene que quedar {polenta} de polenta cremosa.',
        'Serví con la bolognesa caliente y {queso-light} de queso magro.',
      ],
    },
  }),
  dish({
    id: 'pp-pastel-papa',
    title: 'Pastel de papa casero con carne magra y queso gratinado',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['papa', 'carne picada magra', 'cebolla', 'morrón', 'huevos', 'leche descremada', 'queso magro'],
    prep: 'Herví papas y pisalas con leche tibia, nuez moscada y sal. Salteá cebolla, morrón y carne picada magra con pimentón, comino y huevo duro picado. Armá: base de carne, cubrí con puré y queso magro y gratiná 15 minutos.',
    adjust: 'Porcioná según objetivo energético del usuario o pareja.',
    std: {
      title: 'Pastel de papa casero con carne magra y queso gratinado',
      parts: [P('picada'), C('papa'), X('cebolla', 40), X('morron', 40), X('huevo', 60), X('queso-light', 20)],
      steps: [
        'Herví {papa} de papa y pisala con un chorrito de leche tibia, nuez moscada y sal.',
        'Salteá {cebolla} de cebolla y {morron} de morrón, sumá {picada} de carne picada magra con pimentón y comino y {huevo} duro picado.',
        'En una fuente, poné la carne de base, cubrí con el puré y {queso-light} de queso magro.',
        'Gratiná 15 min a 200 °C, hasta dorar.',
      ],
    },
  }),
  dish({
    id: 'pp-sandwich-completo',
    title: 'Sándwich completo saludable en pan integral o de masa madre',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: ALL,
    base: ['pan integral o de masa madre', 'pechuga de pollo o carne magra', 'palta', 'rúcula o lechuga', 'tomate', 'zanahoria', 'limón'],
    prep: 'Tostá levemente dos rebanadas de pan. Untá palta pisada con limón o queso untable magro, sumá pollo o carne desmenuzada, hojas verdes, tomate y zanahoria rallada.',
    adjust: 'Ajustá pan y gramaje del relleno proteico.',
    std: {
      title: 'Sándwich completo de pollo, palta y vegetales en pan integral',
      parts: [P('pollo'), C('pan'), F('palta'), X('lechuga', 30), X('tomate', 60), X('zanahoria', 30)],
      steps: [
        'Tostá levemente {pan} de pan integral (o de masa madre).',
        'Untá con {palta} de palta pisada con limón.',
        'Sumá {pollo} de pollo desmenuzado, {lechuga} de hojas verdes, {tomate} de tomate y {zanahoria} de zanahoria rallada.',
      ],
    },
    veg: {
      title: 'Sándwich completo de huevo revuelto, queso, palta y vegetales en pan integral',
      parts: [P('huevo'), C('pan'), F('palta'), X('queso-light', 30), X('lechuga', 30), X('tomate', 60)],
      steps: [
        'Tostá levemente {pan} de pan integral (o de masa madre).',
        'Untá con {palta} de palta pisada con limón.',
        'Sumá {huevo} revuelto, {queso-light} de queso magro, {lechuga} de hojas verdes y {tomate} de tomate.',
      ],
    },
  }),
  dish({
    id: 'pp-ensalada-cesar',
    title: 'Ensalada completa proteica (estilo César saludable o bowl mediterráneo)',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: ALL,
    base: ['lechuga', 'rúcula', 'espinaca', 'tomate cherry', 'pepino', 'zanahoria', 'pollo o atún o huevos y garbanzos', 'yogur natural', 'mostaza', 'aceite de oliva', 'limón'],
    prep: 'Armá base de hojas verdes, tomate cherry, pepino y zanahoria rallada. Sumá proteína (pollo grillado, atún al natural o huevos duros + garbanzos), arroz o quinoa fría si corresponde, y aderezo de yogur natural, limón, mostaza y aceite de oliva.',
    adjust: 'Modificá proteína y carbohidrato base según el día.',
    std: {
      title: 'Ensalada César saludable de pollo grillado con quinoa',
      parts: [P('pollo'), C('quinoa'), F('oliva', { max: 10 }), X('lechuga', 40), X('tomate', 80), X('pepino', 60), X('yogur', 40)],
      steps: [
        'Grillá {pollo} de pollo y cortalo en tiras.',
        'Armá la base con {lechuga} de hojas verdes, {tomate} de tomate cherry y {pepino} de pepino; sumá {quinoa} de quinoa fría.',
        'Aderezo: {yogur} de yogur natural con limón, mostaza y {oliva} de aceite de oliva.',
      ],
    },
    veg: {
      title: 'Bowl mediterráneo de garbanzos, huevo duro y queso',
      parts: [P('huevo'), C('garbanzos'), F('oliva', { max: 10 }), X('lechuga', 40), X('tomate', 80), X('pepino', 60), X('queso-light', 30)],
      steps: [
        'Armá la base con {lechuga} de hojas verdes, {tomate} de tomate cherry y {pepino} de pepino.',
        'Sumá {garbanzos} de garbanzos cocidos, {huevo} duro y {queso-light} de queso magro en cubos.',
        'Aliñá con {oliva} de aceite de oliva, limón y mostaza.',
      ],
    },
  }),
  dish({
    id: 'pp-ensalada-tibia-quinoa-calabaza',
    title: 'Ensalada tibia de arroz integral o quinoa, calabaza asada, espinaca, queso y semillas',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: ALL,
    base: ['calabaza', 'arroz integral o quinoa', 'espinaca fresca', 'queso magro o huevos', 'semillas de girasol o zapallo', 'aceite de oliva'],
    prep: 'Asá cubos de calabaza al horno con aceite de oliva y hierbas. Mezclá con arroz integral o quinoa cocida, espinaca fresca, queso magro o huevo duro y semillas tostadas.',
    adjust: 'Ajustá cereal y fuente proteica según requerimiento.',
    std: {
      title: 'Ensalada tibia de quinoa, calabaza asada, espinaca, huevo, queso y semillas',
      parts: [P('huevo'), C('quinoa'), F('semillas', { max: 15 }), X('calabaza', 150), X('espinaca', 40), X('queso-light', 30)],
      steps: [
        'Asá {calabaza} de calabaza en cubos con hierbas 25 min a 200 °C.',
        'Mezclá con {quinoa} de quinoa cocida tibia y {espinaca} de espinaca fresca.',
        'Sumá {huevo} duro, {queso-light} de queso magro en cubos y {semillas} de semillas tostadas.',
      ],
    },
  }),
  dish({
    id: 'pp-solomillo-cerdo-batatas',
    title: 'Solomillo de cerdo braseado con batatas y manzanas asadas',
    category: 'plato_principal',
    complexity: 'elaborada',
    variants: STD_STACC,
    base: ['solomillo de cerdo', 'batata', 'manzana verde', 'ajo', 'romero', 'aceite de oliva', 'limón o caldo'],
    prep: 'Sellá el solomillo con ajo, romero y pimienta. Llevá a fuente con gajos de batata y manzana verde y un chorrito de caldo o limón; cociná tapado 25 minutos y destapá 10 más para dorar. Cortá en medallones.',
    adjust: 'Ideal para comidas especiales o con tiempo; regulá medallones y batata.',
    std: {
      title: 'Solomillo de cerdo braseado con batatas y manzanas asadas',
      parts: [P('cerdo'), C('batata'), F('oliva', { max: 10 }), X('manzana', 100)],
      steps: [
        'Sellá {cerdo} de solomillo de cerdo en sartén caliente con {oliva} de aceite, ajo, romero y pimienta.',
        'Pasalo a una fuente con {batata} de batata y {manzana} de manzana verde en gajos y un chorrito de caldo o limón.',
        'Cociná tapado 25 min a 190 °C y destapá 10 min más para dorar.',
        'Cortalo en medallones para servir.',
      ],
    },
  }),
  dish({
    id: 'pp-carne-desmenuzada',
    title: 'Carne desmenuzada (roast beef o paleta magra) a cocción lenta con vegetales asados y arroz o tortillas',
    category: 'plato_principal',
    complexity: 'elaborada',
    variants: STD_STACC,
    base: ['roast beef o paleta magra', 'cebolla', 'morrón', 'zanahoria', 'ajo', 'laurel', 'pimentón', 'caldo', 'arroz o tortillas', 'tomate', 'limón'],
    prep: 'Sellá el corte en olla gruesa, sumá cebolla, morrón, ajo, zanahoria, laurel, pimentón y caldo. Cociná tapado a fuego mínimo 2 a 2,5 horas hasta que se desarme. Desmenuzá en su jugo y serví con arroz o tortillas y pico de gallo.',
    adjust: 'Pesá la carne desmenuzada y acompañá con la porción de hidratos correspondiente.',
    std: {
      title: 'Carne desmenuzada a cocción lenta con vegetales y arroz',
      parts: [P('nalga'), C('arroz'), X('cebolla', 50), X('morron', 50), X('zanahoria', 50), X('tomate', 60)],
      steps: [
        'Sellá el corte (roast beef o paleta magra) en olla gruesa; sumá {cebolla} de cebolla, {morron} de morrón, ajo, {zanahoria} de zanahoria, laurel, pimentón y caldo.',
        'Cociná tapado a fuego mínimo 2-2,5 h, hasta que se desarme con un tenedor; desmenuzá en su jugo: {nalga} de carne por porción.',
        'Serví con {arroz} de arroz y pico de gallo de {tomate} de tomate, cebolla, cilantro y limón.',
      ],
    },
    stacc: {
      title: 'Carne desmenuzada a cocción lenta con vegetales y tortillas de maíz',
      parts: [P('nalga'), C('tortillas-maiz'), X('cebolla', 50), X('morron', 50), X('zanahoria', 50), X('tomate', 60)],
      steps: [
        'Sellá el corte (roast beef o paleta magra) en olla gruesa; sumá {cebolla} de cebolla, {morron} de morrón, ajo, {zanahoria} de zanahoria, laurel, pimentón y caldo apto celíacos.',
        'Cociná tapado a fuego mínimo 2-2,5 h, hasta que se desarme; desmenuzá en su jugo: {nalga} de carne por porción.',
        'Serví en {tortillas-maiz} de tortillas de maíz con sello Sin TACC y pico de gallo de {tomate} de tomate, cebolla, cilantro y limón.',
      ],
    },
  }),
  dish({
    id: 'pp-pollo-calabaza-brocoli',
    title: 'Pollo al horno con calabaza y brócoli',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: STD_STACC,
    base: ['pechuga de pollo', 'calabaza', 'brócoli', 'aceite de oliva', 'pimentón'],
    prep: 'Horneá pechuga y calabaza en cubos con aceite y pimentón 25 minutos; sumá brócoli los últimos 10.',
    adjust: 'Pollo para proteína; calabaza para carbohidratos (sumá papa si hace falta más).',
    std: {
      title: 'Pollo al horno con calabaza y brócoli',
      parts: [P('pollo'), C('calabaza'), F('oliva'), X('brocoli', 120)],
      steps: ['Condimentá {pollo} de pechuga con pimentón, ajo y limón.', 'Horneala junto con {calabaza} de calabaza en cubos y {oliva} de aceite, 25 min a 200 °C.', 'Sumá {brocoli} de brócoli en ramitos los últimos 10 min.'],
    },
  }),
  dish({
    id: 'pp-tofu-quinoa-vegetales',
    title: 'Tofu salteado con quinoa y vegetales',
    category: 'plato_principal',
    complexity: 'rapida',
    variants: ALL,
    base: ['tofu firme', 'quinoa', 'morrón', 'zucchini', 'cebolla', 'salsa de soja', 'aceite'],
    prep: 'Dorá el tofu en cubos, salteá los vegetales y mezclá con quinoa cocida y salsa de soja.',
    adjust: 'Tofu para proteína; quinoa para carbohidratos.',
    std: {
      title: 'Tofu salteado con quinoa y vegetales',
      parts: [P('tofu'), C('quinoa'), F('oliva'), X('morron', 60), X('zucchini', 80), X('cebolla', 40)],
      steps: [
        'Dorá {tofu} de tofu firme en cubos con {oliva} de aceite.',
        'Salteá {morron} de morrón, {zucchini} de zucchini y {cebolla} de cebolla 4-5 min.',
        'Mezclá con {quinoa} de quinoa cocida y un chorrito de salsa de soja.',
      ],
    },
  }),
];

// =====================================================================================================
// 3 · MERIENDAS
// =====================================================================================================
const MERIENDAS: CatalogDish[] = [
  dish({
    id: 'mer-tortilla-avena',
    title: 'Tortilla rápida de avena y huevo (dulce o cítrica) con yogur o fruta',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['huevos', 'avena', 'esencia de vainilla', 'limón', 'canela', 'polvo de hornear', 'fruta o yogur'],
    prep: 'Batí 1 huevo (o claras + 1 huevo) con avena, vainilla, ralladura de limón o canela y pizca de polvo de hornear. Cociná tapada a fuego bajo 3 minutos por lado. Serví sola, con fruta o con yogur.',
    adjust: 'Escalá avena y huevos según gasto de la tarde.',
    std: {
      title: 'Tortilla rápida de avena y huevo con banana',
      parts: [P('huevo'), C('avena'), X('banana', 80)],
      steps: [
        'Batí {huevo} con {avena} de avena, esencia de vainilla, ralladura de limón o canela y una pizca de polvo de hornear.',
        'Cociná tapada a fuego bajo en sartén antiadherente, 3 min por lado.',
        'Serví con {banana} de banana en rodajas (o yogur).',
      ],
    },
  }),
  dish({
    id: 'mer-tostadas-palta-huevo',
    title: 'Tostadas integrales o sin TACC con palta y huevo revuelto o duro',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['pan integral o sin TACC', 'palta', 'huevos', 'limón'],
    prep: 'Tostá el pan, untá con palta pisada con limón y sumá el huevo.',
    adjust: 'Regulá rebanadas de pan y gramos de palta.',
    std: {
      title: 'Tostadas integrales con palta y huevo duro',
      parts: [P('huevo'), C('pan'), F('palta')],
      steps: ['Tostá {pan} de pan integral.', 'Untá con {palta} de palta pisada con limón.', 'Sumá {huevo} duro en rodajas (o revuelto).'],
    },
  }),
  dish({
    id: 'mer-yogur-fruta-frutos-secos',
    title: 'Yogur griego o natural con fruta picada y frutos secos',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['yogur griego o natural', 'fruta fresca', 'nueces o almendras'],
    prep: 'Mezclá el yogur con fruta fresca y sumá un puñado medido de nueces o almendras.',
    adjust: 'Ajustá yogur para proteína y fruta/frutos secos para energía.',
    std: {
      title: 'Yogur griego con manzana picada y nueces',
      parts: [P('yogur', { min: 150 }), C('manzana'), F('nueces')],
      steps: ['Serví {yogur} de yogur griego en un bowl.', 'Sumá {manzana} de manzana (o la fruta de estación) picada.', 'Terminá con {nueces} de nueces (o la misma cantidad de almendras).'],
    },
  }),
  dish({
    id: 'mer-galletas-untable-jamon',
    title: 'Galletas de arroz con queso untable y jamón cocido natural (o huevo/palta vegetariano)',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['galletas de arroz o tostadas', 'queso untable magro', 'jamón cocido natural o lomo horneado (o huevos y palta)'],
    prep: 'Untá las galletas de arroz con queso untable magro y colocá encima jamón cocido natural o lomo horneado; en variante vegetariana, huevo duro o palta con tomate cherry.',
    adjust: 'Ajustá unidades de galletas y fetas según proteína e hidratos.',
    std: {
      title: 'Galletas de arroz con queso untable y jamón cocido natural',
      parts: [P('jamon'), C('galletas-arroz'), X('untable', 20)],
      steps: ['Untá {galletas-arroz} de galletas de arroz con {untable} de queso untable magro.', 'Colocá encima {jamon} de jamón cocido natural.'],
    },
    veg: {
      title: 'Galletas de arroz con queso untable, huevo duro y palta',
      parts: [P('huevo'), C('galletas-arroz'), F('palta'), X('untable', 15)],
      steps: ['Untá {galletas-arroz} de galletas de arroz con {untable} de queso untable magro.', 'Sumá {huevo} duro en rodajas y {palta} de palta con tomate cherry.'],
    },
  }),
  dish({
    id: 'mer-licuado-banana-avena',
    title: 'Licuado o batido de leche o bebida vegetal con banana y avena',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['leche o bebida vegetal', 'banana', 'avena', 'canela'],
    prep: 'Licuá leche o bebida vegetal fría, banana, avena y canela hasta integrar bien.',
    adjust: 'Escalá avena, banana o líquido según energía necesaria.',
    std: {
      title: 'Licuado de leche con banana y avena',
      parts: [P('leche', { min: 200 }), C('banana'), X('avena', 20)],
      steps: ['Licuá {leche} de leche fría (o bebida vegetal) con {banana} de banana, {avena} de avena y canela.'],
      female: {
        title: 'Licuado de yogur con banana y avena',
        parts: [P('yogur', { min: 120 }), C('banana'), X('avena', 20)],
        steps: ['Licuá {yogur} de yogur griego con agua fría, {banana} de banana, {avena} de avena y canela.'],
      },
    },
  }),
  dish({
    id: 'mer-mug-cake',
    title: 'Mug cake rápido de banana, avena y cacao al microondas',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['banana', 'huevo', 'avena', 'cacao amargo', 'polvo de hornear'],
    prep: 'Pisá banana madura, mezclá con 1 huevo, avena, cacao amargo y polvo de hornear en taza apta microondas. Cociná 2,5 minutos hasta que quede firme.',
    adjust: 'Escalá avena y huevo según macros.',
    std: {
      title: 'Mug cake de banana, avena, huevo y cacao al microondas',
      parts: [P('huevo'), C('avena'), X('banana', 80), X('cacao-amargo', 5)],
      steps: ['En una taza apta microondas, pisá {banana} de banana madura.', 'Mezclala con {huevo}, {avena} de avena, {cacao-amargo} de cacao amargo y una pizca de polvo de hornear.', 'Cociná 2,5 min en el microondas, hasta que quede firme.'],
    },
  }),
  dish({
    id: 'mer-tostado-queso-tomate',
    title: 'Tostado caliente de pan integral o sin TACC con queso magro y tomate',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['pan integral o sin TACC', 'queso magro', 'tomate', 'orégano'],
    prep: 'Armá el sándwich con queso magro, rodajas de tomate y orégano; dorá en tostadora o sartén hasta fundir.',
    adjust: 'Regulá unidades de pan y queso.',
    std: {
      title: 'Tostado de pan integral con queso magro y tomate',
      parts: [P('queso-light'), C('pan'), X('tomate', 50)],
      steps: ['Armá el sándwich con {pan} de pan integral, {queso-light} de queso magro, {tomate} de tomate en rodajas y orégano.', 'Dorálo en tostadora o sartén hasta que funda.'],
    },
  }),
  dish({
    id: 'mer-ricota-canela-fruta',
    title: 'Bowl de ricota magra o queso cottage con canela, vainilla y fruta',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['ricota magra o queso cottage', 'esencia de vainilla', 'canela', 'fruta fresca'],
    prep: 'Mezclá ricota magra o queso cottage con esencia de vainilla y canela; acompañá con manzana, pera o frutillas.',
    adjust: 'Ajustá ricota/cottage para proteína y fruta para carbohidratos.',
    std: {
      title: 'Bowl de ricota magra con canela, vainilla y pera',
      parts: [P('ricota'), C('pera')],
      steps: ['Mezclá {ricota} de ricota magra (o queso cottage) con esencia de vainilla y canela.', 'Acompañá con {pera} de pera (o manzana o frutillas) en cubos.'],
    },
  }),
  dish({
    id: 'mer-avena-manzana',
    title: 'Avena tibia con leche y manzana salteada con canela',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['avena', 'leche o bebida vegetal', 'manzana', 'canela'],
    prep: 'Salteá cubos de manzana con canela unos minutos hasta ablandar e incorporalos a la avena cocida con leche.',
    adjust: 'Ajustá gramos de avena y leche.',
    std: {
      title: 'Avena tibia con leche y manzana salteada con canela',
      parts: [C('avena'), X('leche', 200), X('manzana', 120)],
      steps: ['Cociná {avena} de avena con {leche} de leche (o bebida vegetal) hasta que quede cremosa.', 'Salteá {manzana} de manzana en cubos con canela 3-4 min e incorporala.'],
      female: {
        title: 'Avena tibia con manzana salteada, canela y yogur',
        parts: [C('avena'), P('yogur', { min: 120 }), X('manzana', 120)],
        steps: ['Cociná {avena} de avena con agua hasta que quede cremosa.', 'Salteá {manzana} de manzana en cubos con canela 3-4 min e incorporala.', 'Serví con {yogur} de yogur griego.'],
      },
    },
  }),
  dish({
    id: 'mer-omelette-espinaca-queso',
    title: 'Omelette o tortilla salada rápida de huevo, espinaca y queso',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['huevos', 'espinaca', 'queso magro'],
    prep: 'Batí huevos con espinaca picada y sal; cociná en sartén vuelta y vuelta, agregá queso magro y doblá.',
    adjust: 'Ajustá huevos y queso según proteína/grasa.',
    std: {
      title: 'Omelette de huevo, espinaca y queso',
      parts: [P('huevo'), X('espinaca', 40), X('queso-light', 20)],
      steps: ['Batí {huevo} con {espinaca} de espinaca picada y sal.', 'Cociná en sartén antiadherente vuelta y vuelta.', 'Sumá {queso-light} de queso magro, doblá y serví.'],
    },
  }),
  dish({
    id: 'mer-tostadas-mani-banana',
    title: 'Tostadas con pasta de maní 100% natural y rodajas de banana',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['pan integral o sin TACC', 'pasta de maní natural', 'banana'],
    prep: 'Untá pan tostado con pasta de maní natural y colocá rodajas de banana encima.',
    adjust: 'Medí la pasta de maní en gramos exactos por su densidad calórica.',
    std: {
      title: 'Tostadas integrales con pasta de maní y banana',
      parts: [C('pan'), F('mani'), X('banana', 80)],
      steps: ['Tostá {pan} de pan integral.', 'Untá con {mani} de pasta de maní 100 % natural (medida en gramos).', 'Colocá encima {banana} de banana en rodajas.'],
    },
  }),
  dish({
    id: 'mer-tortitas-avena-zanahoria',
    title: 'Tortitas o muffins salados de avena, zanahoria rallada y huevo',
    category: 'merienda',
    complexity: 'rapida',
    variants: ALL,
    base: ['avena', 'zanahoria', 'huevos', 'polvo de hornear'],
    prep: 'Mezclá avena, zanahoria rallada fina, huevo, condimentos y polvo de hornear; cociná en sartén tapada o moldes hasta dorar.',
    adjust: 'Escalá cantidad de tortitas según requerimiento.',
    std: {
      title: 'Tortitas saladas de avena, zanahoria y huevo',
      parts: [P('huevo'), C('avena'), X('zanahoria', 60)],
      steps: ['Mezclá {avena} de avena con {zanahoria} de zanahoria rallada fina, {huevo}, condimentos y una pizca de polvo de hornear.', 'Cociná de a cucharadas en sartén antiadherente tapada (o en moldes al horno 15 min), hasta dorar.'],
    },
  }),
];

// =====================================================================================================
// 4 · COLACIONES
// =====================================================================================================
const COLACIONES: CatalogDish[] = [
  dish({
    id: 'col-frutas-rojas-kiwi',
    title: 'Kiwi, frutillas o arándanos frescos',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['kiwi', 'frutillas', 'arándanos'],
    prep: 'Lavá bien y consumí frescos (vitamina C, antioxidantes y fibra con baja carga calórica).',
    adjust: 'Escalá gramos según carbohidratos asignados.',
    std: { title: 'Frutillas, kiwi y arándanos frescos', parts: [C('frutillas'), X('kiwi', 75), X('arandanos', 50)], steps: ['Lavá {frutillas} de frutillas, {arandanos} de arándanos y pelá {kiwi} de kiwi.', 'Comelos frescos.'] },
  }),
  dish({
    id: 'col-banana',
    title: 'Banana fresca',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['banana'],
    prep: 'Lista para consumir; aporta potasio, vitamina B6 y carbohidratos prácticos.',
    adjust: 'Ajustá tamaño o cantidad según requerimiento.',
    std: { title: 'Banana fresca', parts: [C('banana')], steps: ['Comé {banana} de banana: potasio y carbohidratos prácticos.'] },
  }),
  dish({
    id: 'col-manzana-pera',
    title: 'Manzana o pera entera con cáscara',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['manzana o pera'],
    prep: 'Lavá bien y consumí con cáscara para aprovechar fibra y saciedad.',
    adjust: 'Ajustá tamaño o sumá frutos secos si se requiere más energía.',
    std: { title: 'Manzana (o pera) entera con cáscara', parts: [C('manzana')], steps: ['Lavá bien {manzana} de manzana (o pera) y comela con cáscara.'] },
  }),
  dish({
    id: 'col-citricos',
    title: 'Naranja, mandarina o pomelo en gajos',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['naranja, mandarina o pomelo'],
    prep: 'Pelá y consumí en gajos manteniendo la fibra.',
    adjust: '1 a 2 unidades según tamaño.',
    std: { title: 'Naranja, mandarina o pomelo en gajos', parts: [C('naranja')], steps: ['Pelá {naranja} de naranja, mandarina o pomelo y comela en gajos.'] },
  }),
  dish({
    id: 'col-frutos-secos',
    title: 'Puñado medido de frutos secos (almendras, nueces o castañas)',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    base: ['almendras', 'nueces', 'castañas'],
    prep: 'Pesá la porción exacta indicada en el plan.',
    adjust: 'Respetá gramaje exacto por alta densidad calórica.',
    std: { title: 'Puñado medido de frutos secos (nueces y almendras)', parts: [F('nueces'), X('almendras', 10)], steps: ['Pesá {nueces} de nueces y {almendras} de almendras (o castañas): por su densidad, siempre la porción exacta.'] },
  }),
  dish({
    id: 'col-yogur-pote',
    title: 'Yogur griego o descremado en pote',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['yogur griego o descremado'],
    prep: 'Listo para consumir; podés sumar canela.',
    adjust: 'Ajustá tamaño del pote según proteína requerida.',
    std: { title: 'Yogur griego en pote con canela', parts: [P('yogur', { min: 150 })], steps: ['Comé {yogur} de yogur griego (o descremado), con canela si querés.'] },
  }),
  dish({
    id: 'col-huevos-duros',
    title: 'Huevos duros (1 o 2 unidades)',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    base: ['huevos'],
    prep: 'Herví 9-11 minutos, enfriá en agua, pelá y condimentá.',
    adjust: '1 o 2 unidades según aporte proteico.',
    std: { title: 'Huevos duros (1 o 2 unidades)', parts: [P('huevo', { max: 120 })], steps: ['Herví {huevo} 9-11 min, enfrialos en agua fría, pelalos y condimentá.'] },
  }),
  dish({
    id: 'col-bastones-hummus',
    title: 'Bastones de zanahoria, apio o pepino con hummus o queso untable magro',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    base: ['zanahoria', 'apio', 'pepino', 'hummus o queso untable magro'],
    prep: 'Cortá vegetales en bastones y acompañá con cucharada de hummus o queso untable.',
    adjust: 'Regulá el dip según grasas permitidas.',
    std: {
      title: 'Bastones de zanahoria, apio y pepino con hummus',
      parts: [F('hummus'), X('zanahoria', 80), X('apio', 40), X('pepino', 60)],
      steps: ['Cortá en bastones {zanahoria} de zanahoria, {apio} de apio y {pepino} de pepino.', 'Acompañá con {hummus} de hummus (o queso untable magro).'],
    },
  }),
  dish({
    id: 'col-mix-frutos-secos-pasas',
    title: 'Mix portátil de frutos secos y pasas de uva o arándanos deshidratados',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['frutos secos variados', 'pasas de uva o arándanos deshidratados'],
    prep: 'Armá la porción pesada en recipiente o bolsita.',
    adjust: 'Regulá gramaje total según gasto del día.',
    std: { title: 'Mix portátil de frutos secos y pasas de uva', parts: [C('pasas'), F('nueces')], steps: ['Armá en una bolsita {nueces} de nueces y frutos secos variados con {pasas} de pasas de uva (o arándanos deshidratados).'] },
  }),
  dish({
    id: 'col-leche-cacao',
    title: 'Vaso de leche o bebida vegetal con cacao amargo o café',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    base: ['leche o bebida vegetal', 'cacao amargo en polvo (10 g)'],
    prep: 'Mezclá frío o tibio sin azúcar agregada.',
    adjust: 'Ajustá mililitros según macros.',
    std: {
      title: 'Vaso de leche chocolatada con cacao amargo',
      parts: [P('leche', { min: 200 }), X('cacao-amargo', 10)],
      steps: ['Mezclá {leche} de leche (o bebida vegetal) con {cacao-amargo} de cacao amargo en polvo, frío o tibio, sin azúcar (edulcorante a gusto). Si preferís café, mismo vaso sin el cacao.'],
      female: { title: 'Yogur griego con cacao amargo', parts: [P('yogur', { min: 120 }), X('cacao-amargo', 5)], steps: ['Mezclá {yogur} de yogur griego con {cacao-amargo} de cacao amargo (sin azúcar).'] },
    },
  }),
  dish({
    id: 'col-galletas-mani',
    title: 'Galletas de arroz con pasta de maní natural',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['galletas de arroz', 'pasta de maní natural'],
    prep: 'Untá una capa fina sobre las galletas.',
    adjust: 'Ajustá galletas y gramos de pasta de maní.',
    std: { title: 'Galletas de arroz con pasta de maní natural', parts: [C('galletas-arroz'), F('mani')], steps: ['Untá {galletas-arroz} de galletas de arroz con una capa fina de {mani} de pasta de maní natural.'] },
  }),
  dish({
    id: 'col-manzana-mani',
    title: 'Manzana en gajos con pasta de maní o ricota',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    base: ['manzana', 'pasta de maní natural o ricota magra'],
    prep: 'Cortá la manzana y acompañá con pasta de maní o ricota con canela.',
    adjust: 'Ajustá acompañante según macros.',
    std: { title: 'Manzana en gajos con pasta de maní', parts: [C('manzana'), F('mani')], steps: ['Cortá {manzana} de manzana en gajos.', 'Acompañá con {mani} de pasta de maní natural (o ricota con canela).'] },
  }),
  dish({
    id: 'col-yogur-arandanos',
    title: 'Yogur griego con arándanos',
    category: 'colacion',
    complexity: 'rapida',
    variants: ALL,
    peri: true,
    base: ['yogur griego', 'arándanos'],
    prep: 'Serví el yogur con los arándanos.',
    adjust: 'Yogur para proteína y arándanos para carbohidratos.',
    std: { title: 'Yogur griego con arándanos', parts: [P('yogur', { min: 150 }), C('arandanos')], steps: ['Serví {yogur} de yogur griego con {arandanos} de arándanos.'] },
  }),
];

export const CATALOG: CatalogDish[] = [...DESAYUNOS, ...PRINCIPALES, ...MERIENDAS, ...COLACIONES];
export const CATALOG_BY_ID: Record<string, CatalogDish> = Object.fromEntries(CATALOG.map((d) => [d.id, d]));

export type BankVariantKey = 'std' | 'stacc' | 'veg' | 'keto' | 'lowcarb';
export const VARIANT_OF: Record<BankVariantKey, CatVariant> = { std: 'Estandar', stacc: 'Sin TACC', veg: 'Vegetariana', keto: 'Estandar', lowcarb: 'Estandar' };

/** Receta del plato para una variante (null si el plato no admite esa variante). */
export function catalogRecipe(d: CatalogDish, v: BankVariantKey): CatRecipe | null {
  // Keto / Low Carb: sólo los platos cuyos ingredientes respetan el protocolo (sin sustituciones forzadas).
  if (v === 'keto' || v === 'lowcarb') {
    const r = d.std;
    return r.parts.every((p) => !(FOOD_ALLERGENS[p.id] ?? []).includes(v)) ? r : null;
  }
  if (!d.variants.includes(VARIANT_OF[v])) return null;
  if (v === 'stacc') return d.stacc ?? d.std;
  if (v === 'veg') return d.veg ?? d.std;
  return d.std;
}
