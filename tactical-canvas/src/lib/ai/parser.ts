/**
 * IA · parser: convierte la respuesta JSON del modelo en placas de la app, con las guardas de
 * plantilla, sustancia, cita, datos y lenguaje.
 */
import type { Accent, CanvasState, ChartMode, CurveShape, DiagramData, DiagramKind, RepeatMode, ServiceSport, StructData, TemplateId } from '../../types'
import { DEFAULT_STATE } from '../../defaults'
import { coreToPatch, readCoreSlide } from '../slideSchema'
import { extractNumberedBlocks } from '../copyMapping'
import { MAX_MAPPED_SLIDES } from '../copyMapping'
import { diagramDefaults, inferPillar } from '../diagramPillar'
import { structDefaults } from '../structPillar'
import { BOOKMARK_CTA } from '../bookmark'
import { CHART_BY_DISCIPLINE } from '../chartPillar'
import { DEFAULT_AUTHOR } from '../brand'
import type { QuoteIntent } from '../quoteIntent'
import { cleanSlideLanguage, deAI } from '../language'
import { CATALOG_INCLUDES, SERVICE_BY_ID } from '../services'
import { type Discipline, type GenMode } from './config'

// ---------------------------------------------------------------------------
// Normalización defensiva: la salida del modelo nunca se usa sin validar.

export type Obj = Record<string, unknown>
export const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
export const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : fallback)
export const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}
export const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback
export const upper = (v: unknown, fallback = '') => str(v, fallback).toUpperCase()
export const stripBrackets = (s: string) => s.replace(/^\[\s*|\s*\]$/g, '')

export const TEMPLATE_MAP: Record<string, TemplateId> = {
  metric: 'metric',
  ab: 'compare',
  compare: 'compare',
  chart: 'chart',
  statement: 'statement',
  manifesto: 'manifesto',
  diagram: 'diagram',
  diagrama: 'diagram',
  repeat: 'repeat',
  repetition: 'repeat',
  repeticion: 'repeat',
  repetición: 'repeat',
  metrica: 'metric',
  métrica: 'metric',
  grafico: 'chart',
  gráfico: 'chart',
  sentencia: 'statement',
  manifiesto: 'manifesto',
  matriz2x2: 'matrix',
  matriz: 'matrix',
  matrix: 'matrix',
  pipeline: 'pipeline',
  flowchart: 'pipeline',
  piramide: 'pyramid',
  pirámide: 'pyramid',
  pyramid: 'pyramid',
  checklist: 'checklist',
  guardado: 'bookmark',
  opus: 'opus',
  cita: 'quote',
  quote: 'quote',
  athletic: 'athletic',
  rutina: 'workout',
  error_correccion: 'fix',
  servicio: 'service',
  service: 'service',
  mito_fisiologia: 'myth',
  mito: 'myth',
  myth: 'myth',
  programa: 'service',
  manifiesto_texto: 'essay',
  essay: 'essay',
  'error vs correccion': 'fix',
  fix: 'fix',
  sesion: 'workout',
  sesión: 'workout',
  workout: 'workout',
  opus_athletic: 'athletic',
  editorial: 'athletic',
  frase: 'quote',
  mindset_opus: 'opus',
  'mindset / opus': 'opus',
  bloques: 'opus',
  cheatsheet: 'bookmark',
  bookmark: 'bookmark',
}
export const ACCENTS: Accent[] = ['orange', 'cyan', 'gold', 'white', 'gray']
export const CHART_MODES: ChartMode[] = ['curve', 'bars', 'gauge']
export const SHAPES: CurveShape[] = ['bell', 'rise', 'fall', 'plateau']

export const REPEAT_MODES: RepeatMode[] = ['diagonal', 'echo', 'kinetic', 'justified']
/** Tipo de diagrama que entiende la IA (las variantes manuales no figuran). */
export const AI_DIAGRAM_TYPE = { radar: 'radar', domino: 'domino', circles: 'circulos', curve: 'trayectoria' } as const

export const DIAGRAM_KIND_MAP: Record<string, DiagramKind> = {
  radar: 'radar',
  domino: 'domino',
  dominó: 'domino',
  progression: 'domino',
  progresion: 'domino',
  circles: 'circles',
  circulos: 'circles',
  círculos: 'circles',
  trajectory: 'curve',
  trayectoria: 'curve',
  curve: 'curve',
}

/** Primer texto no vacío de la lista. */
export const first = (...vals: unknown[]) => {
  for (const v of vals) {
    const t = str(v)
    if (t) return t
  }
  return ''
}
export const list = (v: unknown) =>
  Array.isArray(v)
    ? v.map((x) => str(x)).filter(Boolean)
    : str(v)
        .split(/[,\n;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
export const scores = (v: unknown) =>
  list(v)
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.min(100, Math.max(0, Math.round(n))))

/**
 * Bloque "diagram" de la IA → datos de los 4 subtipos. Acepta el payload multiformato
 * (domino.inicio, circulos.c1, trayectoria.caotico, radar.axes) y el formato plano anterior
 * (kind + axes/start/captions/noise). Lo que falte sale del pilar del tema, nunca de otra sesión.
 */
export function diagramFromAi(b: Record<string, unknown>, fb: DiagramData): DiagramData {
  const radar = obj(b.radar)
  const domino = obj(b.domino ?? b.dominó)
  const circles = obj(b.circulos ?? b.circles)
  const tray = obj(b.trayectoria ?? b.trajectory)
  const axes = list(radar.axes ?? radar.ejes ?? b.axes)
  const useAxes = axes.length >= 3 ? axes.slice(0, 8) : list(fb.radar.axes)
  const fit = (vals: number[], fallback: string) => {
    const src = vals.length ? vals : scores(fallback)
    return useAxes.map((_, i) => src[i] ?? 50).join(', ')
  }
  const cmp = scores(radar.compare ?? radar.ideal ?? b.compare)
  const capList = list(b.captions)
  const caps = [1, 2, 3, 4].map((i, j) => first(circles[`c${i}`], obj(circles.captions)[`c${i}`], list(circles.captions)[j], capList[j], fb.circles.captions.split('\n')[j]))
  const div = list(circles.divisions ?? b.divisions)
    .map((x) => Math.round(Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0)
  return {
    radar: {
      axes: useAxes.join(', '),
      values: fit(scores(radar.values ?? radar.valores ?? b.values), fb.radar.values),
      compare: cmp.length ? fit(cmp, fb.radar.compare) : axes.length >= 3 ? '' : fb.radar.compare,
      // Con ejes propios de la IA, las leyendas de respaldo son neutras (no las del pilar).
      labelA: first(radar.labelA, b.labelA, axes.length >= 3 ? 'Estado actual' : fb.radar.labelA),
      labelB: first(radar.labelB, b.labelB, axes.length >= 3 ? 'Estado ideal' : fb.radar.labelB),
    },
    domino: {
      count: Math.min(9, Math.max(4, Math.round(first(domino.count, b.count) ? num(domino.count ?? b.count, fb.domino.count) : fb.domino.count))),
      start: first(domino.inicio, domino.start, b.start, b.inicio, fb.domino.start),
      end: first(domino.final, domino.end, b.end, b.final, fb.domino.end),
    },
    circles: { divisions: div.length ? div.slice(0, 3).join(', ') : fb.circles.divisions, captions: caps.join('\n') },
    trajectory: {
      noise: first(tray.caotico, tray.caótico, tray.noise, b.noise, b.ruido, fb.trajectory.noise),
      clarity: first(tray.limpio, tray.clarity, b.clarity, b.claridad, fb.trajectory.clarity),
      goal: first(tray.meta, tray.goal, b.goal, b.meta, fb.trajectory.goal),
    },
  }
}

/**
 * Árbol de decisión visual: en una pieza de venta / servicios, los círculos (que sólo
 * representan fracciones de un todo) no pueden listar modalidades: la placa pasa a pipeline.
 */
export function enforceSemantics(p: Partial<CanvasState>, goal: string): Partial<CanvasState> {
  if (p.template === 'diagram' && p.diagramKind === 'circles' && /venta|sales|servicio/.test(goal)) {
    return { ...p, template: 'pipeline' }
  }
  return p
}

/** Lista de objetos de la IA (acepta array u objeto indexado). */
export const objList = (v: unknown) => (Array.isArray(v) ? v : Object.values(obj(v))).map(obj).filter((o) => Object.keys(o).length)

/**
 * Bloques "matriz2x2", "pipeline", "piramide" y "checklist" de la IA → datos de las plantillas
 * 08–11. Cada uno se toma completo o, si falta o viene vacío, sale del pilar del tema.
 */
export function structFromAi(s: Record<string, unknown>, fb: StructData): StructData {
  const m = obj(s.matriz2x2 ?? s.matriz ?? s.matrix)
  const quads = objList(m.quadrants ?? m.cuadrantes)
    .map((q) => ({ label: upper(first(q.label, q.badge, q.titulo, q.title)), tag: first(q.tag, q.desc, q.descripcion, q.description) }))
    .filter((q) => q.label || q.tag)
  const steps = objList(obj(s.pipeline ?? s.flowchart).steps ?? obj(s.pipeline).pasos)
    .map((x) => ({ title: first(x.title, x.titulo, x.accion), desc: first(x.desc, x.descripcion, x.condicion, x.criterio) }))
    .filter((x) => x.title)
  const levels = objList(obj(s.piramide ?? s.pyramid).levels ?? obj(s.piramide).niveles)
    .sort((a, b) => num(a.level ?? a.nivel, 0) - num(b.level ?? b.nivel, 0))
    .map((x) => ({
      // "BASE: Balance energético" → "Balance energético" (la placa ya marca base y cúspide).
      name: first(x.name, x.nombre, x.label).replace(/^(base|c[uú]spide|nivel\s*\d+|top)\s*[:·\-–]\s*/i, ''),
      desc: first(x.desc, x.descripcion, x.description),
    }))
    .filter((x) => x.name)
  const items = objList(obj(s.checklist).items ?? obj(s.checklist).checks)
    .map((x) => ({
      status: (/^(err|error|fail|falla|no|x|✗|false)$/i.test(str(x.status ?? x.estado)) ? 'err' : 'ok') as 'ok' | 'err',
      text: first(x.text, x.texto, x.condicion, x.label),
      detail: first(x.detail, x.detalle, x.desc),
    }))
    .filter((x) => x.text)
  const fit = <T,>(list: T[], fallback: T[]) => (list.length >= 3 ? list.slice(0, 4) : fallback)
  return {
    matrix:
      quads.length === 4
        ? { axisX: first(m.axisX, m.ejeX, fb.matrix.axisX), axisY: first(m.axisY, m.ejeY, fb.matrix.axisY), quadrants: quads, highlight: Math.min(3, Math.max(0, Math.round(num(m.highlight, 0)))) }
        : fb.matrix,
    pipeline: { steps: fit(steps, fb.pipeline.steps), dir: 'vertical' },
    pyramid: { levels: fit(levels, fb.pyramid.levels) },
    checklist: { items: fit(items, fb.checklist.items) },
  }
}

/** Contexto de la generación: el pilar y el tema deciden los datos de respaldo del diagrama. */
export interface SlideContext {
  discipline?: Discipline
  topic?: string
  /** Cita célebre pedida: la plantilla 14 se respeta aunque la IA no traiga la fuente */
  quote?: QuoteIntent | null
}

/**
 * Convierte un slide de la IA en un parche del estado de la app. Llena los datos de TODAS las
 * plantillas (no sólo la elegida) para que al cambiar de pestaña no aparezcan datos de otra sesión.
 */
/**
 * Si la IA dejó bloques «00001: …» dentro del titular, el remate o el párrafo, se sacan de ahí:
 * pasan a bloques numerados y la placa cambia al layout Mindset / Opus. El título queda limpio.
 */
export function liftNumberedBlocks(patch: Partial<CanvasState>) {
  const found: { num: string; text: string }[] = []
  for (const k of ['headlineA', 'headlineB', 'body'] as const) {
    const v = patch[k]
    if (!v) continue
    const { rest, blocks } = extractNumberedBlocks(v)
    if (blocks.length >= 2 || (blocks.length && found.length)) {
      found.push(...blocks)
      patch[k] = rest
    }
  }
  if (found.length < 2) return
  const fromAi = (patch.opusBlocks ?? []).filter((b) => b.text.trim())
  patch.opusBlocks = (fromAi.length ? fromAi : found).slice(0, 6)
  patch.template = 'opus'
}

export function slideToPatch(raw: unknown, ctx: SlideContext = {}): Partial<CanvasState> {
  const s = obj(raw)
  const d = obj(s.data)
  const t = obj(s.text ?? s.texto)
  const template = TEMPLATE_MAP[str(s.templateId).toLowerCase()] ?? 'statement'
  const base = DEFAULT_STATE
  const op = obj(s.opus ?? s.mindset ?? s.mindsetOpus)
  const titulo = upper(first(op.titulo_principal, op.titulo, s.titulo_principal, t.titulo_principal))
  // Sin titleWhite/titleAccent, el título principal de Opus hace de titular (nunca queda vacío).
  const headlineA = upper(first(t.titleWhite, s.titleWhite)) || titulo
  const headlineB = upper(first(t.titleAccent, s.titleAccent))
  const patch: Partial<CanvasState> = {
    template,
    tag: stripBrackets(upper(first(t.tagSuperior, t.tag, s.tag, base.tag))),
    headlineA,
    headlineB,
    body: first(t.parrafo, t.paragraph, s.paragraph),
    citeMain: stripBrackets(upper(s.citation)),
    citeSub: str(s.description),
  }
  const headline = `${headlineA} ${headlineB}`.replace(/\*/g, '').trim()
  // Cajas de datos: sólo valores operativos cortos y con número (nada de frases sueltas).
  patch.dataChips = list(s.datos_clave ?? s.dataChips ?? s.data_chips)
    .map((c) => upper(c).replace(/^[«"“\s]+|[»"”\s]+$/gu, ''))
    .filter((c) => c.length <= 24 && /\d/.test(c))
    .slice(0, 4)

  // 01 · Métrica
  const m = obj(s.metrica ?? s.metric)
  const md = template === 'metric' ? d : {}
  const metricValue = first(m.value, m.valor, md.value)
  if (metricValue) {
    const label = upper(first(m.label, m.etiqueta, md.label))
    const unit = upper(first(m.unidad, m.unit))
    patch.metricValue = metricValue
    patch.metricLabel = unit && !label.includes(unit) ? `${label} · ${unit}` : label
    patch.metricAccent = oneOf(m.accent ?? md.accent, ACCENTS, 'orange')
  } else {
    // Sin bloque de métrica: el número del propio titular o párrafo, nunca el de fábrica (7700).
    const found = `${headlineA} ${headlineB} ${patch.body}`.match(/[-+~]?\d+(?:[.,]\d+)?\s?(?:%|x\b|kg\b|km\b|min\b|h\b|g\b)?/i)
    patch.metricValue = found ? found[0].replace(/\s+/g, '') : '—'
    patch.metricLabel = upper(first(t.tagSuperior, s.tag, `${headlineA} ${headlineB}`))
    patch.metricAccent = 'orange'
  }

  // 02 · A/B (mapeo tolerante: Gemini a veces usa otros nombres o pone las tarjetas fuera de "data")
  const sources = [obj(s.ab), d, s]
  const pick = (paths: string[], fallback: string) => {
    for (const src of sources) {
      for (const path of paths) {
        const text = str(path.split('.').reduce<unknown>((acc, k) => obj(acc)[k], src))
        if (text) return text
      }
    }
    return fallback
  }
  const card = (side: 'A' | 'B', accent: Accent, fbLabel: string, fbValue: string) => {
    const l = side.toLowerCase()
    const groups = [`card${side}`, `option${side}`, `tarjeta${side}`, side, l, `card_${l}`, `opcion${side}`]
    const keys = (fields: string[]) => [...fields.map((f) => `card${side}_${f}`), ...groups.flatMap((g) => fields.map((f) => `${g}.${f}`))]
    return {
      label: pick(keys(['label', 'etiqueta', 'title', 'titulo', 'name', 'nombre']), fbLabel).toUpperCase(),
      value: pick(keys(['value', 'valor', 'metric', 'metrica', 'dato']), fbValue),
      caption: pick(keys(['desc', 'description', 'descripcion', 'caption', 'detail', 'detalle', 'subtitle']), ''),
      accent,
    }
  }
  patch.cardA = card('A', 'gray', 'PARÁMETRO A', 'VALOR')
  patch.cardB = card('B', 'cyan', 'PARÁMETRO B', 'VALOR')
  patch.verdict = pick(['verdict', 'veredicto', 'conclusion', 'conclusión'], '').toUpperCase()

  // 03 · Gráfico (sólo cuando es la plantilla elegida)
  const chartBlock = obj(s.grafico ?? s.chart)
  if (template === 'chart' || Object.keys(chartBlock).length) {
    // Respaldo del pilar (nunca la curva de fábrica de otro tema).
    const c = { ...base.chart, ...CHART_BY_DISCIPLINE[ctx.discipline ?? 'general'] }
    const cd = Object.keys(chartBlock).length ? chartBlock : d
    const compare = cd.compare === true || cd.compare === 'true' || Boolean(first(cd.compareLabel))
    const csv = (v: unknown, fb: string) => (Array.isArray(v) ? v.join(', ') : first(v, fb))
    patch.chart = {
      ...c,
      mode: oneOf(cd.mode, CHART_MODES, 'curve'),
      title: upper(first(cd.title, c.title)),
      min: num(cd.min, c.min),
      max: num(cd.max, c.max),
      unit: str(cd.unit),
      zone: first(cd.zone, c.zone),
      zoneLabel: str(cd.zoneLabel),
      shape: oneOf(cd.shape, SHAPES, 'bell'),
      barLabels: csv(cd.barLabels, c.barLabels),
      barValues: csv(cd.barValues, c.barValues),
      gaugeValue: num(cd.gaugeValue, c.gaugeValue),
      gaugeThreshold: num(cd.gaugeThreshold, c.gaugeThreshold),
      gaugeLabel: str(cd.gaugeLabel),
      compare,
      mainLabel: first(cd.mainLabel, cd.labelA),
      compareLabel: first(cd.compareLabel, cd.labelB),
      compareShape: oneOf(cd.compareShape, SHAPES, 'fall'),
    }
  } else {
    patch.chart = { ...base.chart, ...CHART_BY_DISCIPLINE[ctx.discipline ?? 'general'] }
  }

  // 04 · Sentencia
  patch.kicker = upper(first(obj(s.sentencia).highlight, obj(s.statement).kicker, template === 'statement' ? d.kicker : '', s.kicker))

  // 05 · Manifiesto
  patch.manifestoAuthor = upper(first(obj(s.manifiesto ?? s.manifesto).author, template === 'manifesto' ? d.author : '', DEFAULT_AUTHOR))

  // 06 · Diagrama: siempre con datos propios del tema (IA o pilar), nunca los de otra placa.
  const db = obj(s.diagram ?? s.diagrama ?? (template === 'diagram' ? d : undefined))
  const pillar = inferPillar(ctx.discipline ?? 'general', `${ctx.topic ?? ''} ${str(s.theme)}`, `${patch.tag} ${headline}`, patch.body ?? '')
  patch.diagramData = diagramFromAi(db, diagramDefaults(pillar))
  const kind = DIAGRAM_KIND_MAP[first(db.recommendedType, db.kind, db.type).toLowerCase()]
  if (kind) patch.diagramKind = kind

  // 08–11 · Estructuras: siempre con datos propios del tema (IA o pilar), nunca los de otra placa.
  patch.structData = structFromAi(s, structDefaults(pillar))

  // 12 · Guardado: viñetas de la IA; sin ellas, la app las extrae del resto del carrusel.
  const g = obj(s.guardado ?? s.cheatsheet ?? s.bookmark)
  const gPoints = list(g.points ?? g.puntos ?? g.items).slice(0, 4)
  if (template === 'bookmark' && gPoints.length >= 3) {
    patch.bookmarkData = { points: gPoints, cta: upper(first(g.cta, BOOKMARK_CTA)), accent: 'orange' }
  }

  // 16 · Manifiesto texto: párrafos continuos.
  const es = obj(s.manifiesto_texto ?? s.essay)
  const paras = list(es.paragraphs ?? es.parrafos).slice(0, 6)
  if (paras.length >= 2) {
    patch.essayParas = paras
    // Con cita pedida, el párrafo de la IA es la bajada de contexto de la Cita táctica: no se borra.
    if (!ctx.quote) patch.body = ''
  } else if (template === 'essay') patch.template = 'statement'

  // 21 · Mito vs Fisiología: sin las dos tarjetas no hay placa (vuelve a sentencia).
  const mf = obj(s.mito_fisiologia ?? s.mito ?? s.myth)
  const mythText = first(mf.myth, mf.mito)
  const truthText = first(mf.truth, mf.verdad, mf.realidad, mf.fisiologia)
  if (mythText && truthText) Object.assign(patch, { mythText, truthText })
  else if (template === 'myth') patch.template = 'statement'

  // 19 · Servicios & Programas: ficha técnica o carátula de catálogo.
  const sv = obj(s.servicio ?? s.service)
  if (template === 'service' || Object.keys(sv).length) {
    const sport = str(sv.sport).toLowerCase() as ServiceSport
    const pillars = list(sv.pillars ?? sv.pilares ?? sv.items).slice(0, 5)
    patch.serviceMode = sv.mode === 'catalog' ? 'catalog' : 'single'
    if (SERVICE_BY_ID[sport]) patch.serviceSport = sport
    if (pillars.length) patch.serviceItems = pillars
    else if (template === 'service') patch.serviceItems = patch.serviceMode === 'catalog' ? CATALOG_INCLUDES : (SERVICE_BY_ID[sport] ?? SERVICE_BY_ID.rugby).pillars
    if (str(sv.availability)) patch.serviceAvailability = upper(str(sv.availability))
    if (str(sv.cta)) patch.serviceCta = upper(str(sv.cta))
    if (template === 'service') Object.assign(patch, { citeMain: '', citeSub: '', body: '' })
  }

  // 18 · Error vs Corrección
  const fx = obj(s.error_correccion ?? s.fix)
  const fw = obj(fx.wrong ?? fx.error), fr = obj(fx.right ?? fx.correccion)
  if (str(fw.text) || str(fr.text)) {
    Object.assign(patch, {
      fixWrongLabel: upper(first(fw.label, 'INCORRECTO')),
      fixWrongText: first(fw.text, fw.texto),
      fixRightLabel: upper(first(fr.label, 'CORRECCIÓN TÁCTICA')),
      fixRightText: first(fr.text, fr.texto),
    })
  } else if (template === 'fix') patch.template = 'statement'

  // 17 · Sesión / rutina: ejercicios con prescripción completa.
  const wk = obj(s.rutina ?? s.workout ?? s.sesion)
  const wkRows = objList(wk.rows ?? wk.ejercicios)
    .map((r, i) => ({ code: first(r.code, r.codigo) || `${String.fromCharCode(65 + i)}1`, name: first(r.name, r.ejercicio, r.nombre), scheme: first(r.scheme, r.series), intensity: first(r.intensity, r.intensidad), rest: first(r.rest, r.pausa, r.descanso) }))
    .filter((r) => r.name)
    .slice(0, 8)
  if (wkRows.length) {
    patch.workoutRows = wkRows
    patch.workoutNote = first(wk.note, wk.nota)
  } else if (template === 'workout') patch.template = 'statement'

  // 15 · Opus Athletic: filas clave → valor o tabla de 2 columnas.
  const at = obj(s.athletic ?? s.opusAthletic)
  const atRows = objList(at.rows ?? at.filas)
    .map((r) => ({ k: first(r.k, r.key, r.clave, r.label), v: first(r.v, r.value, r.valor, r.desc) }))
    .filter((r) => r.k || r.v)
    .slice(0, 6)
  if (template === 'athletic' || Object.keys(at).length) {
    patch.athleticTheme = at.theme === 'light' ? 'light' : 'dark'
    patch.athleticNr = str(at.nr)
    patch.athleticCta = str(first(at.cta, s.cta)).replace(/^cta\s*[:：]\s*/i, '')
  }
  if (atRows.length) {
    patch.athleticRows = atRows
    patch.athleticMode = at.mode === 'table' || at.modo === 'tabla' ? 'table' : 'list'
    const head = Array.isArray(at.head ?? at.encabezado) ? ((at.head ?? at.encabezado) as unknown[]).map((x) => str(x)) : []
    if (head.length >= 2) patch.athleticHead = [head[0], head[1]]
  } else if (template === 'athletic') patch.athleticRows = []

  // 14 · Cita célebre: sin fuente concreta no se acepta (defensa contra frases apócrifas).
  const ci = obj(s.cita ?? s.quote)
  const quoteText = first(ci.quote, ci.frase, ci.cita).replace(/^[«"“\s]+|[»"”\s]+$/gu, '')
  const quoteAuthor = first(ci.author, ci.autor)
  const quoteSource = first(ci.source, ci.fuente)
  if (quoteText && quoteAuthor) {
    const emph = first(ci.enfasis, ci.emphasis, ci.remate).replace(/^[«"“\s]+|[»"”\s.]+$/gu, '')
    const rule = upper(first(ci.regla, ci.rule, ci.regla_coach)).replace(/^[«"“\s]+|[»"”\s]+$/gu, '')
    Object.assign(patch, { quoteText, quoteAuthor, quoteRole: first(ci.role, ci.rol), quoteSource, quoteEmphasis: emph && quoteText.toLowerCase().includes(emph.toLowerCase()) ? emph : '', quoteRule: rule.split(/\s+/).length <= 14 ? rule : '' })
  }
  // Sin una cita pedida, una frase sin fuente concreta no se acepta (defensa contra apócrifas). Con la
  // cita pedida, la plantilla se respeta: el panel avisa que falta verificar la fuente.
  if (template === 'quote' && !(quoteText && quoteAuthor && (quoteSource.length >= 6 || ctx.quote))) patch.template = 'statement'

  // 13 · Mindset / Opus: bloques numerados separados del título (nunca un único párrafo).
  const rawBlocks = Array.isArray(op.bloques ?? op.items ?? op.blocks ?? s.bloques ?? s.items)
    ? ((op.bloques ?? op.items ?? op.blocks ?? s.bloques ?? s.items) as unknown[])
    : []
  const opusBlocks = rawBlocks
    .map((b, i) => {
      if (typeof b === 'string') {
        const m = b.match(/^\s*(\d{1,6})\s*[:.)\-–—]\s*(.+)$/)
        return { num: m ? m[1] : String(i + 1).padStart(5, '0'), text: (m ? m[2] : b).trim() }
      }
      const o = obj(b)
      return { num: str(first(o.numero, o.num, o.n, o.id)), text: cleanText(first(o.texto, o.text, o.desc)) }
    })
    .map((b, i) => ({ num: b.num || String(i + 1).padStart(5, '0'), text: b.text }))
    .filter((b) => b.text)
    .slice(0, 6)
  if (opusBlocks.length) patch.opusBlocks = opusBlocks
  else if (template === 'opus') {
    // Opus sin bloques: las oraciones del párrafo pasan a bloques; nunca el ejemplo de fábrica.
    const sentences = (patch.body ?? '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean).slice(0, 6)
    patch.opusBlocks = sentences.length >= 2 ? sentences.map((text, i) => ({ num: String(i + 1).padStart(5, '0'), text })) : []
    if (sentences.length >= 2) patch.body = ''
  }

  // 07 · Repetición
  const r = obj(s.repeticion ?? s.repeat ?? (template === 'repeat' ? d : undefined))
  const short = upper(first(r.phrase, r.frase))
  const long = upper(first(r.phraseLarga, r.phraseLong))
  const aiMode = REPEAT_MODES.find((x) => x === str(r.mode))
  const mode: RepeatMode = aiMode ?? (template === 'repeat' && short && short.split(/\s+/).length <= 2 ? 'echo' : 'diagonal')
  const wantsShort = mode === 'echo' || mode === 'kinetic'
  patch.repeatPhrase = (wantsShort ? first(short, long) : first(long, short)) || headline || base.repeatPhrase
  if (template === 'repeat' || aiMode) patch.repeatMode = mode

  // Contrato estructurado (slide_number, layout, header_tag, titulo_principal, accent_words, bloques,
  // cta): si viene, sus campos se inyectan directo en la placa y mandan sobre el formato anterior.
  const core = readCoreSlide(s)
  if (core) {
    Object.assign(patch, coreToPatch(core, patch.template))
    // Las filas explícitas de athletic.rows mandan sobre los bloques genéricos del contrato.
    if (atRows.length) patch.athleticRows = atRows
    if (patch.template === 'repeat') patch.repeatPhrase = `${patch.headlineA ?? ''} ${patch.headlineB ?? ''}`.replace(/\*/g, '').trim() || patch.repeatPhrase
  }
  liftNumberedBlocks(patch)
  // «[Nr. 2] PRINCIPIOS OPERATIVOS» → número de etiqueta + tag limpio (sin corchetes ni «Nr.» pegados).
  const nrTag = (patch.tag ?? '').match(/^\[?\s*NR\.?\s*(\d{1,2})\s*\]?\s*[-–—·:]?\s*(.*)$/i)
  if (nrTag) {
    patch.athleticNr = nrTag[1]
    patch.tag = nrTag[2].replace(/^\[\s*|\s*\]$/g, '').trim()
  } else if (patch.tag) patch.tag = patch.tag.replace(/^\[\s*|\s*\]$/g, '').trim()
  return sanitizePatch(patch)
}

/** Rótulos que a veces la IA deja delante del texto («Parte 1:», «Remate:», «Titular:»…). */
export const LABEL_PREFIX = /^(parte\s*\d|header(?:_tag)?|blanco|remate|acento|t[ií]tulo principal|titular|t[ií]tulo|gancho|hook|p[aá]rrafo|subt[ií]tulo(?:\s*\(\s*naranja\s*\))?|bullets?|vi[ñn]etas?|texto (?:inferior|central)|footer|bajada|label|tag)\s*[:：-]\s*/i

/** Limpia un texto de la IA: markdown en negrita, rótulos, comillas envolventes y espacios. */
export function cleanText(t: string, keepBreaks = false) {
  let out = t.replace(/\*\*(.+?)\*\*/g, '$1')
  out = keepBreaks
    ? out
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
    : out.replace(/\s+/g, ' ').trim()
  out = out.replace(LABEL_PREFIX, '')
  const m = out.match(/^[«"“](.+)[»"”]$/)
  return (m ? m[1] : out).trim()
}

/**
 * Saneamiento final de la placa: cada campo de texto queda limpio y sin residuos antes de
 * pasar al estado (los *asteriscos* simples del titular se conservan: marcan la palabra destacada).
 */
export function sanitizePatch(patch: Partial<CanvasState>, keepBreaks = false): Partial<CanvasState> {
  for (const k of ['tag', 'headlineA', 'headlineB', 'body', 'kicker', 'metricValue', 'metricLabel', 'verdict', 'repeatPhrase', 'citeSub'] as const) {
    const v = patch[k]
    // En el mapeo de copy, el titular y el párrafo conservan los saltos forzados (premisa \n puente).
    if (typeof v === 'string') patch[k] = cleanText(v, keepBreaks && (k === 'headlineA' || k === 'body'))
  }
  for (const k of ['cardA', 'cardB'] as const) {
    const c = patch[k]
    if (c) patch[k] = { ...c, label: cleanText(c.label), value: cleanText(c.value), caption: cleanText(c.caption) }
  }
  if (patch.bookmarkData) {
    // La placa ya numera las reglas: «01. Regla» → «Regla».
    patch.bookmarkData = { ...patch.bookmarkData, points: patch.bookmarkData.points.map((p) => cleanText(p).replace(/^(regla\s*)?\d{1,2}\s*[.)\-:·]\s*/i, '')).filter(Boolean) }
  }
  return patch
}

/**
 * Caption listo para copiar: saltos de línea normalizados, viñetas unificadas en «▸ », sin
 * espacios colgando ni más de una línea en blanco seguida.
 */
export function cleanCaption(raw: string) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, '').replace(/^\s*(?:[-•*·▪►▶]|\d+[.)])\s+/, '▸ ').replace(/\*\*(.+?)\*\*/g, '$1'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface GenerationResult {
  format: 'single' | 'stories' | 'carousel'
  slides: Partial<CanvasState>[]
  caption: string
  /** Fase 1 del planner: objetivo detectado y secuencia de plantillas */
  plan?: { goal: string; intent: string; sequence: TemplateId[] }
}

/** «EJECUTAR EJECUTAR EJECUTAR» → «EJECUTAR»: una palabra repetida en fila nunca es una frase. */
export function collapseRepeats(t: string) {
  return t.replace(/(?<![\p{L}\p{N}])([\p{L}\p{N}*]+)(?:[\s,.·—-]+\1(?![\p{L}\p{N}]))+/giu, '$1')
}

export const distinctWords = (t: string) => new Set(t.toUpperCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)).size

/**
 * Guarda anti-texto vacío: colapsa palabras repetidas, la repetición nunca usa una frase de menos de
 * 3 palabras distintas (pasa a titular + remate) y en 1 placa la repetición pasa a sentencia para
 * mostrar titular, remate y bajada.
 */
export function enforceSubstance(p: Partial<CanvasState>, single: boolean): Partial<CanvasState> {
  const out = { ...p }
  if (out.headlineA) out.headlineA = collapseRepeats(out.headlineA)
  if (out.headlineB) out.headlineB = collapseRepeats(out.headlineB)
  if (out.repeatPhrase !== undefined && distinctWords(collapseRepeats(out.repeatPhrase)) < 3) {
    const full = collapseRepeats(`${out.headlineA ?? ''} ${out.headlineB ?? ''}`.replace(/\*/g, '').trim())
    if (distinctWords(full) >= 3) {
      out.repeatPhrase = full
      if (out.repeatMode === 'echo' || out.repeatMode === 'kinetic') out.repeatMode = 'justified'
    }
  }
  if (single && out.template === 'repeat') out.template = 'statement'
  return out
}

/**
 * Cita célebre pedida: la placa protagonista (la 1, o la que ya traiga la cita) va SIEMPRE en la
 * plantilla 14. Si la IA eligió otra (manifiesto, sentencia…), se convierte: la cita que trajo o, en
 * último caso, su titular como frase (sin fuente: el panel lo marca para verificar).
 */
export function enforceQuote(slides: Partial<CanvasState>[], q: QuoteIntent): Partial<CanvasState>[] {
  if (slides.some((p) => p.template === 'quote' && p.quoteText)) return slides
  const i = Math.max(0, slides.findIndex((p) => p.quoteText && p.quoteAuthor))
  const p = slides[i]
  const fromHead = `${p.headlineA ?? ''} ${p.headlineB ?? ''}`.replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const quoteText = p.quoteText || fromHead
  const fixed: Partial<CanvasState> = {
    ...p,
    template: 'quote',
    quoteText,
    quoteAuthor: p.quoteAuthor || q.author,
    quoteRole: p.quoteRole ?? '',
    quoteSource: p.quoteText ? (p.quoteSource ?? '') : '',
    quoteEmphasis: p.quoteText ? (p.quoteEmphasis ?? '') : (p.headlineB ?? '').replace(/\*/g, '').trim(),
  }
  return slides.map((x, j) => (j === i ? fixed : x))
}

export function parseGeneration(payload: unknown, mode: GenMode, ctx: SlideContext = {}): GenerationResult {
  const root = obj(payload)
  const rawSlides0 = Array.isArray(root.slides) ? root.slides : Array.isArray(payload) ? payload : [payload]
  // Orden por slide_number cuando todas las placas lo traen (contrato estructurado); si no, el del array.
  const nums = rawSlides0.map((r) => Number(obj(r).slide_number))
  const rawSlides = nums.every((n) => Number.isFinite(n) && n > 0) && new Set(nums).size === nums.length
    ? rawSlides0.map((r, i) => ({ r, n: nums[i] })).sort((a, b) => a.n - b.n).map((x) => x.r)
    : rawSlides0
  const goal = str(obj(root.plan).objetivo ?? obj(root.plan).goal).toLowerCase()
  let slides = rawSlides.map((raw) => slideToPatch(raw, ctx)).map((p) => enforceSemantics(p, goal)).filter((p) => p.headlineA || p.headlineB || (p.template === 'quote' && p.quoteText))
  if (!slides.length) throw new Error('La IA no devolvió slides utilizables.')
  // Sin tope fijo de 5: el carrusel admite todas las placas que devuelva la IA (máx. de Instagram).
  const limit = mode === 'single' ? 1 : mode === 'stories' ? 3 : MAX_MAPPED_SLIDES
  slides = slides.slice(0, limit)
  const declared = oneOf(root.format, ['single', 'stories', 'carousel'] as const, 'single')
  const format = mode === 'auto' ? (slides.length === 1 ? 'single' : declared === 'single' ? 'carousel' : declared) : mode
  slides = slides.map((p) => enforceSubstance(p, format === 'single'))
  if (ctx.quote) slides = enforceQuote(slides, ctx.quote)
  // Blindaje de lenguaje: las muletillas de IA que se colaron se reemplazan por lenguaje de sala.
  slides = slides.map((p) => cleanSlideLanguage(p))
  const caption = deAI(cleanCaption(str(root.caption)))
  const rawPlan = obj(root.plan)
  const plan = Object.keys(rawPlan).length
    ? { goal: str(rawPlan.objetivo ?? rawPlan.goal), intent: str(rawPlan.intencion ?? rawPlan.intent), sequence: slides.map((sl) => sl.template ?? 'statement') }
    : undefined
  return { format, slides, caption, plan }
}