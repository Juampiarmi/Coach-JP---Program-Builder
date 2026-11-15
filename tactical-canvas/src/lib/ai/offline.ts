/**
 * IA · MODO SIN API: variantes estructurales locales e instantáneas cuando no hay key, la API está
 * caída o se agotó la cuota. Combina las plantillas de la app con la Biblioteca de Papers (los más
 * relevantes al tema) y frases armadas con la voz de sala de Coach JP. Cada clic rota la variante.
 * No inventa datos: los números son rangos operativos estándar y las citas salen sólo de la biblioteca.
 */
import { citeFromPaper, relevantPapers, type OwnPaper } from '../paperLibrary'
import { structDefaults } from '../structPillar'
import { inferPillar } from '../diagramPillar'
import type { CanvasState, StructData, TemplateId } from '../../types'
import type { Discipline, EditorialOptions, GenMode } from './config'
import type { GenerationResult } from './parser'
import { detectGoal } from './prompts'
import type { HookVariant } from './index'

const EXERCISES: Record<Discipline, string[]> = {
  general: ['sentadilla', 'press de banca', 'peso muerto'],
  sports: ['sentadilla', 'press de banca', 'peso muerto rumano'],
  crossfit: ['thrusters', 'remo en ergómetro', 'wall balls'],
}

/** «la sobrecarga progresiva en el gimnasio» → «LA SOBRECARGA PROGRESIVA» (≤ 4 palabras con contenido). */
export function topicTitle(topic: string): string {
  const words = topic
    .replace(/[«»"“”.¿?¡!:;]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  return (words.slice(0, 4).join(' ') || 'EL ENTRENAMIENTO').toUpperCase()
}

const COVERS = (t: string): [string, string][] => [
  [`${t} NO ES`, 'LO QUE TE CONTARON.'],
  [`${t}: MENOS TEORÍA,`, 'MÁS KILOS EN LA BARRA.'],
  ['SI NO LO ANOTÁS,', `${t} NO EXISTE.`],
]

const SCENES = (ex: string): string[] => [
  `Si hace 4 meses movés los mismos kilos en ${ex} para las mismas reps, no estás entrenando: estás haciendo actividad física.`,
  `Pausar 45 segundos entre series pesadas de ${ex} no te hace más intenso. Te hace levantar menos carga y acumular fatiga basura.`,
  `Tu última serie de ${ex} terminó con 5 reps en reserva. Eso no fue una serie efectiva: fue una entrada en calor larga.`,
]

/** Datos de las otras estructuras (matriz, pipeline, pirámide): los del pilar, por si se cambia de plantilla. */
const structBase = (d: Discipline): StructData => structDefaults(inferPillar(d))

const s = (template: TemplateId, p: Partial<CanvasState>): Partial<CanvasState> => ({ template, citeMain: '', citeSub: '', dataChips: [], ...p })

function evidenceSlide(p: OwnPaper, ex: string): Partial<CanvasState> {
  const { citeMain, citeSub } = citeFromPaper(p)
  return s('statement', {
    tag: 'EVIDENCIA · APLICACIÓN',
    headlineA: 'LO QUE MIDIÓ',
    headlineB: `${citeMain.split(',')[0]}.`,
    body: `${p.finding || p.title} En la sala: anotá carga, reps y RIR de cada serie de ${ex}.`.slice(0, 200),
    citeMain,
    citeSub,
    dataChips: ['RIR 1-2', 'PAUSA 2-3 MIN'],
  })
}

function closer(points: string[]): Partial<CanvasState> {
  return s('bookmark', {
    tag: 'GUARDÁ ESTA REFERENCIA',
    headlineA: 'ESTÁNDAR',
    headlineB: 'OPERATIVO.',
    bookmarkData: { points: points.slice(0, 4), cta: 'ESTÁNDAR OPERATIVO: GUARDÁ ESTA REFERENCIA PARA TU PRÓXIMO BLOQUE', accent: 'orange' },
  })
}

function scienceSet(t: string, ex: string, papers: OwnPaper[], v: number, discipline: Discipline): Partial<CanvasState>[] {
  const [a, b] = COVERS(t)[v % 3]
  const scenes = SCENES(ex)
  const cover = s('statement', { tag: 'COACH JP · SALA', headlineA: a, headlineB: b, body: scenes[v % 3] })
  const myth = s('myth', {
    tag: 'MITO VS FISIOLOGÍA',
    headlineA: 'EL BOMBEO',
    headlineB: 'NO ES LA PRUEBA.',
    mythText: 'Si no terminás destruido y con bombeo, no creciste.',
    truthText: 'Manda la tensión mecánica: series cerca del fallo (RIR 0-3) y kilos que suben con el tiempo. El ardor no mide nada.',
  })
  const fix = s('fix', {
    tag: 'ERROR VS CORRECCIÓN',
    headlineA: 'NO ES MÁS VOLUMEN.',
    headlineB: 'ES MEJOR SERIE.',
    fixWrongText: `Sumar series de ${ex} lejos del fallo y con pausas de 45 s.`,
    fixRightText: 'Menos series, RIR 1-2, pausa 2-3 min y la carga anotada.',
  })
  const check = s('checklist', {
    tag: 'AUDITORÍA DE SERIE',
    headlineA: '¿TU SERIE',
    headlineB: 'CUENTA?',
    structData: {
      ...structBase(discipline),
      checklist: {
        items: [
          { status: 'ok', text: '¿Terminaste a 1-2 reps del fallo?', detail: 'Si te sobraban 5, fue entrada en calor.' },
          { status: 'ok', text: '¿Anotaste carga, reps y RIR?', detail: 'Sin registro no hay progresión, hay memoria.' },
          { status: 'err', text: '¿Recortaste el rango para cargar más?', detail: 'Rango completo antes que kilos de ego.' },
        ],
      },
    },
  })
  const evidence = papers.slice(0, 2).map((p) => evidenceSlide(p, ex))
  const middle = [[myth, fix, check], [fix, check, myth], [check, myth, fix]][v % 3]
  const body = [...evidence, ...middle].slice(0, 3)
  return [
    cover,
    ...body,
    closer(['Rango completo antes que kilos de ego.', 'Series efectivas: RIR 1-2, no 5.', 'Pausá 2-3 min en los básicos.', 'Anotá carga y reps: si no sube, ajustá.']),
  ]
}

function mindsetSet(t: string, ex: string, v: number): Partial<CanvasState>[] {
  const covers: [string, string][] = [
    ['NO ENTRENÁS CUANDO TENÉS GANAS.', 'ENTRENÁS PORQUE TOCA.'],
    [`${t} NO ES MOTIVACIÓN.`, 'ES PROTOCOLO.'],
    ['EL DÍA QUE NO QUERÉS', 'ES EL QUE CUENTA.'],
  ]
  const [a, b] = covers[v % 3]
  return [
    s('statement', { tag: 'DISCIPLINA Y MÉTODO', headlineA: a, headlineB: b, body: `Cumplir la sesión de ${ex} sin ganas vale más que tres sesiones perfectas cuando el ánimo acompaña.` }),
    s('manifesto', { tag: 'ESTÁNDAR OPERATIVO', headlineA: 'EL ÁNIMO OPINA.', headlineB: 'EL PLAN DECIDE.' }),
    s('opus', {
      tag: 'REGLAS DE SALA',
      headlineA: 'TRES REGLAS',
      headlineB: 'QUE NO SE NEGOCIAN.',
      opusBlocks: [
        { num: '00001', text: 'La sesión de hoy no se pasa a mañana.' },
        { num: '00002', text: 'Anotá la serie que fallaste: es dato, no derrota.' },
        { num: '00003', text: 'Dormí como si fuera parte del programa. Porque lo es.' },
      ],
    }),
    closer(['La sesión de hoy no se pasa a mañana.', 'El plan decide, el ánimo opina.', 'Anotá la serie que fallaste.']),
  ]
}

function salesSet(v: number): Partial<CanvasState>[] {
  const covers: [string, string][] = [
    ['SI ENTRENÁS IMPROVISANDO,', 'TU CUERPO TAMBIÉN IMPROVISA.'],
    ['NO NECESITÁS MÁS GANAS.', 'NECESITÁS UN SISTEMA.'],
    ['ESTO NO ES PARA TODOS.', 'ES PARA LOS QUE CUMPLEN.'],
  ]
  const [a, b] = covers[v % 3]
  return [
    s('statement', { tag: 'HIGH PERFORMANCE SYSTEM', headlineA: a, headlineB: b, body: 'Programación a medida, cargas auditadas y ajustes según tu rendimiento real, no según el ánimo.' }),
    s('compare', {
      tag: 'DIAGNÓSTICO',
      headlineA: 'IMPROVISAR',
      headlineB: 'VS. MEDIR.',
      cardA: { label: 'SIN PLAN', value: 'AL AZAR', caption: 'Cargas sin registro, mismo estímulo hace meses.', accent: 'gray' },
      cardB: { label: 'SISTEMA', value: 'MEDIDO', caption: 'Series, reps y RIR anotados; progresión semanal.', accent: 'orange' },
      verdict: 'LO QUE NO SE MIDE NO PROGRESA. EL SISTEMA LO MIDE.',
    }),
    closer(['Programación a medida según objetivo y nivel.', 'Análisis biomecánico en video.', 'Auditoría de cargas semana a semana.', 'Seguimiento 1:1 con ajustes reales.']),
  ]
}

/**
 * Variante local de un set completo. `variant` rota portada, escenario y orden de las placas. Formato:
 * 1 placa = portada con escenario; historias = 3; carrusel / auto = set completo (4-5).
 */
export function generateOffline(
  topic: string,
  mode: GenMode,
  discipline: Discipline,
  editorial: EditorialOptions | undefined,
  papers: OwnPaper[],
  variant = 0,
): GenerationResult {
  const t = topicTitle(topic)
  const ex = EXERCISES[discipline][variant % 3]
  const goal = detectGoal(topic, editorial?.goal)
  const pool = relevantPapers(papers, topic, 3)
  let slides = goal === 'sales' ? salesSet(variant) : goal === 'mindset' ? mindsetSet(t, ex, variant) : scienceSet(t, ex, pool, variant, discipline)
  if (mode === 'single') slides = slides.slice(0, 1)
  else if (mode === 'stories') slides = [slides[0], slides[1], slides[slides.length - 1]]
  const cite = pool[0] ? citeFromPaper(pool[0]).citeMain : ''
  const keyword = (goal === 'sales' ? 'SISTEMA' : goal === 'mindset' ? 'PROTOCOLO' : 'RIR').toUpperCase()
  const caption = [
    `${slides[0].headlineA} ${slides[0].headlineB}`.replace(/\s+/g, ' ').trim(),
    [`▸ ${SCENES(ex)[variant % 3]}`, '▸ Series efectivas: RIR 1-2, pausa 2-3 min en los básicos.', `▸ Anotá carga y reps: si en 3 semanas no sube, ajustá.${cite ? ` (${cite})` : ''}`].join('\n'),
    `Comentá «${keyword}» y te mando el protocolo.\n#entrenamientodefuerza #coachjp #hipertrofia`,
  ].join('\n\n')
  return {
    format: slides.length === 1 ? 'single' : mode === 'stories' ? 'stories' : 'carousel',
    slides,
    caption,
    plan: { goal: goal === 'sales' ? 'venta' : goal === 'mindset' ? 'mindset' : 'ciencia', intent: 'Variante local sin API', sequence: slides.map((x) => x.template ?? 'statement') },
  }
}

/** 3 ganchos de portada sin API (contrarian, militar, ciencia) a partir del tema. */
export function localHooks(topic: string, variant = 0): HookVariant[] {
  const t = topicTitle(topic)
  const sets: HookVariant[][] = [
    [
      { angle: 'contrarian', white: `${t} NO ES`, accent: 'LO QUE TE CONTARON.' },
      { angle: 'military', white: `${t}:`, accent: 'PROTOCOLO, NO OPINIÓN.' },
      { angle: 'science', white: 'LO QUE MIDE LA EVIDENCIA', accent: `SOBRE ${t}.` },
    ],
    [
      { angle: 'contrarian', white: 'MÁS SERIES NO ES', accent: 'MÁS RESULTADO.' },
      { angle: 'military', white: 'SI NO LO ANOTÁS,', accent: 'NO EXISTE.' },
      { angle: 'science', white: `${t} TIENE UN NÚMERO:`, accent: 'RIR 1-2.' },
    ],
  ]
  return sets[variant % sets.length]
}
