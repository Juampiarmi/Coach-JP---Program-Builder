import type { CanvasState, ServiceMode, ServiceSport } from '../types'

/**
 * SERVICIOS & PROGRAMAS COACH JP: catálogo de especialidades para placas de conversión.
 * Cada disciplina trae su titular de ficha técnica, sus pilares (demandas reales del deporte, no
 * frases de catálogo) y una línea corta para la carátula «System Offer».
 */
export interface ServiceSpec {
  id: ServiceSport
  label: string
  /** Rótulo corto en MAYÚSCULAS (badge «// ESPECIFICIDAD» y grilla del catálogo) */
  short: string
  /** Titular de la ficha técnica: premisa en blanco + remate en naranja */
  headlineA: string
  headlineB: string
  /** 4 pilares técnicos por defecto */
  pillars: string[]
  /** Línea de la grilla del catálogo */
  line: string
}

export const SERVICES: ServiceSpec[] = [
  {
    id: 'hypertrophy',
    label: 'Musculación / Hipertrofia',
    short: 'HIPERTROFIA',
    headlineA: 'HIPERTROFIA CON MÉTODO:',
    headlineB: 'VOLUMEN QUE SE MIDE.',
    pillars: [
      'Volumen semanal por músculo (10–20 series) ajustado a tu recuperación',
      'Proximidad al fallo controlada: RIR 0–3 según ejercicio y bloque',
      'Progresión de cargas registrada sesión a sesión',
      'Ejercicios elegidos por perfil de resistencia y palancas',
    ],
    line: 'Volumen, RIR y progresión registrada',
  },
  {
    id: 'crossfit',
    label: 'CrossFit',
    short: 'CROSSFIT',
    headlineA: 'CROSSFIT SIN ROMPERTE:',
    headlineB: 'MOTOR, FUERZA Y TÉCNICA.',
    pillars: [
      'Motor aeróbico y umbral láctico trabajados por zonas',
      'Fuerza base y halterofilia con técnica auditada en video',
      'Volumen e impacto dosificados para cuidar hombro y zona lumbar',
      'Programación RPE / RIR integrada a tus WODs',
    ],
    line: 'Motor + fuerza + gimnásticos',
  },
  {
    id: 'hyrox',
    label: 'Hyrox',
    short: 'HYROX',
    headlineA: 'SISTEMA HYROX:',
    headlineB: 'CORRER CANSADO, EMPUJAR PESADO.',
    pillars: [
      'Running por zonas y tolerancia a correr después de cada estación (8 × 1 km)',
      'Fuerza-resistencia específica: sled push / pull, wall balls y lunges',
      'Bloques compromised que simulan transiciones y ritmo de carrera',
      'Periodización hacia la fecha de competencia, con taper',
    ],
    line: 'Running + 8 estaciones',
  },
  {
    id: 'mtb',
    label: 'Mountain Bike (MTB)',
    short: 'MTB',
    headlineA: 'SISTEMA MTB:',
    headlineB: 'POTENCIA EN PEDAL.',
    pillars: [
      'Potencia sostenida y repetida en subida (umbral y VO2máx)',
      'Fuerza de tren inferior y core para el control técnico en bajada',
      'Tolerancia a esfuerzos intermitentes de alta intensidad',
      'Prevención de lesiones lumbares, de rodilla y de hombro',
    ],
    line: 'Potencia, umbral y control',
  },
  {
    id: 'rugby',
    label: 'Rugby',
    short: 'RUGBY',
    headlineA: 'PREPARACIÓN FÍSICA',
    headlineB: 'PARA RUGBY.',
    pillars: [
      'Fuerza máxima y potencia para contacto, scrum y tackle',
      'Capacidad de esfuerzos repetidos de alta intensidad (RSA)',
      'Robustez de cuello, hombro e isquiotibiales',
      'Carga semanal ajustada a partido y entrenamiento de campo (RPE de sesión)',
    ],
    line: 'Contacto, potencia y RSA',
  },
  {
    id: 'hockey',
    label: 'Hockey',
    short: 'HOCKEY',
    headlineA: 'PREPARACIÓN FÍSICA',
    headlineB: 'PARA HOCKEY.',
    pillars: [
      'Aceleración, frenado y cambios de dirección en postura baja',
      'Esfuerzos intermitentes repetidos con recuperación incompleta',
      'Fuerza de cadera, aductores y zona lumbar para la flexión sostenida',
      'Prevención de lesiones de tobillo, rodilla e isquiotibiales',
    ],
    line: 'Velocidad, COD y repetición',
  },
  {
    id: 'golf',
    label: 'Golf',
    short: 'GOLF',
    headlineA: 'GOLF:',
    headlineB: 'VELOCIDAD DE PALO SIN DOLOR LUMBAR.',
    pillars: [
      'Potencia rotacional y transferencia de fuerza desde el piso',
      'Movilidad de cadera y columna torácica para el backswing',
      'Estabilidad lumbar y de hombro frente a la repetición del swing',
      'Fuerza general dosificada por RPE en pretemporada y en torneo',
    ],
    line: 'Potencia rotacional + movilidad',
  },
  {
    id: 'weightlifting',
    label: 'Levantamiento Olímpico (Weightlifting)',
    short: 'WEIGHTLIFTING',
    headlineA: 'LEVANTAMIENTO OLÍMPICO:',
    headlineB: 'TÉCNICA BAJO CARGA.',
    pillars: [
      'Técnica de arranque y envión auditada en video, cuadro a cuadro',
      'Fuerza específica: sentadillas, tirones y jerks por porcentaje',
      'Movilidad overhead y de tobillo para recepciones profundas',
      'Periodización por bloques con pico hacia la competencia',
    ],
    line: 'Arranque, envión y fuerza',
  },
  {
    id: 'powerlifting',
    label: 'Powerlifting',
    short: 'POWERLIFTING',
    headlineA: 'POWERLIFTING:',
    headlineB: 'TU TOTAL, CON DATOS.',
    pillars: [
      'Sentadilla, banca y peso muerto con RPE e intentos planificados',
      'Volumen e intensidad por bloques: acumulación → intensificación → peaking',
      'Variantes para atacar el punto débil de cada levantamiento',
      'Control de fatiga y prevención de lesiones lumbares y de hombro',
    ],
    line: 'SBD, RPE y peaking',
  },
  {
    id: 'combat',
    label: 'Deportes de Combate (MMA / Kickboxing / Boxeo / BJJ)',
    short: 'COMBATE',
    headlineA: 'DEPORTES DE COMBATE:',
    headlineB: 'POTENCIA QUE AGUANTA 5 ROUNDS.',
    pillars: [
      'Capacidad anaeróbica y recuperación entre rounds',
      'Fuerza y potencia para golpes, clinch y derribos',
      'Robustez de cuello, hombro y rodilla para el contacto',
      'Carga física ajustada al sparring y al corte de peso',
    ],
    line: 'Rounds, potencia y robustez',
  },
]

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<ServiceSport, ServiceSpec>

/** Lo que incluye cualquier programa (viñetas [ ✓ ] de la carátula). */
export const CATALOG_INCLUDES = ['Evaluación de ingreso', 'Programación a medida', 'Video-análisis técnico', 'Seguimiento 1:1 con RPE / RIR']
export const DEFAULT_AVAILABILITY = 'CUPOS LIMITADOS · EVALUACIÓN DE INGRESO'
export const DEFAULT_SERVICE_CTA = "MANDÁ 'PROGRAMA' POR DM"

/** Patch para cargar una placa de servicio (carátula o ficha) con los textos de fábrica. */
export function servicePatch(mode: ServiceMode, sport: ServiceSport, catalog: ServiceSport[]): Partial<CanvasState> {
  const common = { template: 'service' as const, serviceMode: mode, serviceSport: sport, body: '', citeMain: '', citeSub: '', serviceAvailability: DEFAULT_AVAILABILITY, serviceCta: DEFAULT_SERVICE_CTA }
  if (mode === 'catalog') {
    return {
      ...common,
      tag: 'SYSTEM OFFER // COACH JP',
      headlineA: 'SERVICIOS COACH JP:',
      headlineB: 'ELEGÍ TU PROGRAMA.',
      serviceCatalog: catalog.length ? catalog : SERVICES.map((s) => s.id),
      serviceItems: CATALOG_INCLUDES,
    }
  }
  const s = SERVICE_BY_ID[sport]
  return { ...common, tag: `PROGRAMA ALTO RENDIMIENTO // ${s.short}`, headlineA: s.headlineA, headlineB: s.headlineB, serviceItems: s.pillars }
}
