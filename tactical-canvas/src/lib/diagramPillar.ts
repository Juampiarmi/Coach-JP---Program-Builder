import type { Discipline } from './ai'
import type { CanvasState, DiagramData } from '../types'

/** Universo temático de los textos por defecto del diagrama. */
export type DiagramPillar = 'nutrition' | 'strength' | 'crossfit'

const SETS: Record<DiagramPillar, DiagramData> = {
  nutrition: {
    radar: {
      axes: 'Glucógeno, Hidratación, Proteína, Electrolitos, Timing, Digestión',
      values: '55, 40, 80, 35, 50, 65',
      compare: '85, 85, 85, 80, 80, 80',
      labelA: 'Tu protocolo actual',
      labelB: 'Protocolo óptimo',
    },
    domino: { count: 7, start: 'Déficit calórico crónico', end: 'Pérdida de fuerza y masa' },
    circles: { divisions: '1, 3, 12', captions: 'Calorías base\nProteína (2g/kg)\nCarbohidratos intra\nTiming y digestión' },
    trajectory: { noise: 'Hipoglucemia / Fatiga', clarity: 'Glucógeno estable', goal: 'Rendimiento óptimo' },
    funnel: { levels: 'Suplementos en el mercado\nCon estudios en humanos\nMetaanálisis consistentes\nCreatina · Cafeína' },
    versus: { leftTitle: 'MARKETING', rightTitle: 'EVIDENCIA', left: 'Quemadores de grasa\nDetox de 3 días\nBCAA con proteína suficiente', right: 'Déficit sostenido\nProteína 1,6–2,2 g/kg\nCreatina 3–5 g/día' },
  },
  strength: {
    radar: {
      axes: 'Tensión mecánica, RIR / Esfuerzo, Volumen efectivo, Recuperación, Frecuencia, Técnica',
      values: '85, 40, 90, 35, 60, 55',
      compare: '85, 80, 75, 80, 75, 85',
      labelA: 'Tu bloque actual',
      labelB: 'Bloque equilibrado',
    },
    domino: { count: 7, start: 'Sobrecarga progresiva', end: 'Adaptación miofibrilar' },
    circles: { divisions: '1, 3, 12', captions: 'Macrociclo\nMesociclos\nMicrociclos\nEsta sesión' },
    trajectory: { noise: 'Rutinas al azar', clarity: 'Progresión planificada', goal: 'Nuevo 1RM' },
    funnel: { levels: 'Ejercicios posibles\nEstímulo alto / fatiga baja\nProgresables en carga\nTus 4 básicos' },
    versus: { leftTitle: 'MITO', rightTitle: 'REALIDAD', left: 'Hay que llegar al fallo siempre\nMás series = más músculo\nSin dolor no hay ganancia', right: 'RIR 1–2 alcanza\nVentana de 10–18 series\nEl DOMS no mide el estímulo' },
  },
  crossfit: {
    radar: {
      axes: 'VO2máx, Umbral de lactato, Fuerza, Pacing, Transiciones, Recuperación',
      values: '75, 45, 70, 35, 50, 55',
      compare: '80, 80, 75, 80, 75, 80',
      labelA: 'Tu perfil actual',
      labelB: 'Perfil de competencia',
    },
    domino: { count: 7, start: 'Pacing sostenible', end: 'Mejor split final' },
    circles: { divisions: '1, 8, 16', captions: 'La carrera\nLos 8 tramos\nLas estaciones\nEste split' },
    trajectory: { noise: 'Salida a fondo / Lactato', clarity: 'Pacing sostenido', goal: 'Mejor tiempo' },
    funnel: { levels: 'Estaciones del circuito\nLimitantes reales\nTransiciones lentas\nTu prioridad del bloque' },
    versus: { leftTitle: 'MITO', rightTitle: 'REALIDAD', left: 'Salir a fondo y aguantar\nEntrenar siempre al máximo\nMás volumen = mejor tiempo', right: 'Pacing negativo\n80 % del volumen en Z2\nTransiciones entrenadas' },
  },
}

const NUTRITION_RX = /nutri|aliment|comida|dieta|glucóg|glucog|carbohidrat|hidrat|prote[ií]n|calor[ií]|macro|electrolit|sodio|ayuno|suplement|creatina|cafe[ií]na|digest|déficit|deficit|superávit|superavit|gluc|insulin/i
const STRENGTH_RX = /fuerza|hipertrof|sobrecarga|músculo|musculo|miofibril|series|rir\b|rpe\b|1rm|volumen|tensión|tension|sentadilla|press|peso muerto|remo|técnica|tecnica|entren|rutina|biomec/i
const CROSSFIT_RX = /crossfit|hyrox|wod\b|lactato|pacing|vo2|umbral|aeróbic|aerobic|metcon|running|carrera|ritmo|split/i

/**
 * Pilar del diagrama: primero el tema escrito, en orden de prioridad (tema / titular antes que
 * el párrafo; dentro de cada texto nutrición > resistencia > fuerza), después el pilar del
 * generador (Sports & Bodybuilding → nutrición deportiva).
 */
export function inferPillar(discipline: Discipline, ...texts: string[]): DiagramPillar {
  for (const text of texts) {
    if (NUTRITION_RX.test(text)) return 'nutrition'
    if (CROSSFIT_RX.test(text) && !STRENGTH_RX.test(text)) return 'crossfit'
    if (STRENGTH_RX.test(text)) return 'strength'
  }
  if (discipline === 'sports') return 'nutrition'
  if (discipline === 'crossfit') return 'crossfit'
  return 'strength'
}

/** Copia nueva de los datos por defecto de un pilar (cada placa edita la suya). */
export function diagramDefaults(pillar: DiagramPillar): DiagramData {
  const s = SETS[pillar]
  return { radar: { ...s.radar }, domino: { ...s.domino }, circles: { ...s.circles }, trajectory: { ...s.trajectory }, funnel: { ...s.funnel! }, versus: { ...s.versus! } }
}

/** Textos de la placa que sirven para deducir el tema, de mayor a menor peso. */
export const slideText = (s: Pick<CanvasState, 'tag' | 'headlineA' | 'headlineB' | 'body'>): [string, string] => [`${s.tag} ${s.headlineA} ${s.headlineB}`, s.body]

/** Datos que dibuja el diagrama: los de la placa o, si nunca se cargaron, los del pilar del tema. */
export function resolveDiagramData(state: CanvasState, discipline: Discipline = 'general'): DiagramData {
  const fb = () => diagramDefaults(inferPillar(discipline, ...slideText(state)))
  const d = state.diagramData
  if (!d) return fb()
  // Placas guardadas antes del embudo / VS binario: esas variantes toman los datos del pilar.
  if (d.funnel && d.versus) return d
  const f = fb()
  return { ...d, funnel: d.funnel ?? f.funnel, versus: d.versus ?? f.versus }
}

// ---------------------------------------------------------------------------
// Migración de placas guardadas con los campos planos viejos (radarAxes, dominoStart, ...).

/** Textos de ejemplo de productividad de versiones anteriores: no se migran. */
const LEGACY_SAMPLES = new Set([
  'Sueño, Nutrición, Fuerza, Volumen, Estrés, Movilidad',
  'El objetivo\nLos bloques\nLas semanas\nHoy',
  'Hábito mínimo',
  'Resultado masivo',
  'Lo que esperás',
  'Lo que realmente pasa',
  'Ruido',
  'Claridad',
])

type Legacy = Partial<Record<'radarAxes' | 'radarValues' | 'radarCompare' | 'radarLabelA' | 'radarLabelB' | 'circleDivisions' | 'circleCaptions' | 'dominoStart' | 'dominoEnd' | 'curveExpected' | 'curveReal' | 'curveGoal', string>> & {
  dominoCount?: number
}

/** Convierte los campos planos viejos en diagramData sólo si el usuario los había personalizado. */
export function migrateDiagram(raw: Partial<CanvasState>): Partial<CanvasState> {
  const l = raw as Partial<CanvasState> & Legacy
  if (l.diagramData !== undefined || l.radarAxes === undefined) return raw
  const {
    radarAxes, radarValues, radarCompare, radarLabelA, radarLabelB, circleDivisions, circleCaptions, dominoCount, dominoStart, dominoEnd, curveExpected, curveReal, curveGoal,
    ...rest
  } = l
  const own = (...vals: (string | undefined)[]) => vals.some((v) => v !== undefined && v.trim() !== '' && !LEGACY_SAMPLES.has(v))
  const ownRadar = own(radarAxes)
  const ownDomino = own(dominoStart, dominoEnd)
  const ownCircles = own(circleCaptions)
  const ownCurve = own(curveExpected, curveReal)
  if (!ownRadar && !ownDomino && !ownCircles && !ownCurve) return { ...rest, diagramData: null }
  // Cada subtipo personalizado se conserva; el resto toma los datos del pilar del tema.
  const fb = diagramDefaults(inferPillar('general', ...slideText({ tag: '', headlineA: '', headlineB: '', body: '', ...rest })))
  return {
    ...rest,
    diagramData: {
      radar: ownRadar
        ? { axes: radarAxes!, values: radarValues ?? fb.radar.values, compare: radarCompare ?? '', labelA: radarLabelA ?? fb.radar.labelA, labelB: radarLabelB ?? fb.radar.labelB }
        : fb.radar,
      domino: ownDomino ? { count: dominoCount ?? 7, start: dominoStart ?? '', end: dominoEnd ?? '' } : fb.domino,
      circles: ownCircles ? { divisions: circleDivisions ?? fb.circles.divisions, captions: circleCaptions! } : fb.circles,
      trajectory: ownCurve ? { noise: curveExpected ?? '', clarity: curveReal ?? '', goal: curveGoal ?? fb.trajectory.goal } : fb.trajectory,
    },
  }
}
