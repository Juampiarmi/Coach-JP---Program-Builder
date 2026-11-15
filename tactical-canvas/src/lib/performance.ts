import type { Discipline } from './ai'
import type { Project } from './projects'
import type { TemplateId } from '../types'

/**
 * MÉTRICAS REALES POR PROYECTO (sin la API de Meta): después de publicar, el coach carga Guardados,
 * Compartidos y Alcance. Con ese historial se calcula qué formatos, portadas y pilares rinden mejor y
 * se le da contexto real al Hook Score.
 */

export interface PostMetrics {
  saves: number
  shares: number
  reach: number
  /** Cuándo se cargaron (ms) */
  loggedAt: number
}

/** Guardados + compartidos cada 100 cuentas alcanzadas: las dos señales que más pesan en el algoritmo. */
export function engagementRate(m: Pick<PostMetrics, 'saves' | 'shares' | 'reach'>): number {
  if (!(m.reach > 0)) return 0
  return Math.round(((m.saves + m.shares) / m.reach) * 1000) / 10
}

/** Valida lo que se tipea en el panel (números enteros ≥ 0, alcance > 0). */
export function parseMetrics(raw: { saves: string; shares: string; reach: string }, now = Date.now()): PostMetrics | null {
  const n = (v: string) => {
    const t = v.trim().toLowerCase().replace(/\s/g, '')
    // «3,2k» / «3.2k» / «12.500»
    const k = t.match(/^(\d+(?:[.,]\d+)?)k$/)
    if (k) return Math.round(Number(k[1].replace(',', '.')) * 1000)
    return /^\d+$/.test(t.replace(/[.,]/g, '')) ? Number(t.replace(/[.,]/g, '')) : NaN
  }
  const m = { saves: n(raw.saves), shares: n(raw.shares), reach: n(raw.reach) }
  if (![m.saves, m.shares, m.reach].every((x) => Number.isFinite(x) && x >= 0) || m.reach <= 0) return null
  return { ...m, loggedAt: now }
}

export const TEMPLATE_LABEL: Record<TemplateId, string> = {
  metric: 'Métrica',
  compare: 'A/B',
  chart: 'Gráfico',
  statement: 'Sentencia',
  manifesto: 'Manifiesto',
  diagram: 'Diagrama',
  repeat: 'Repetición',
  matrix: 'Matriz 2x2',
  pipeline: 'Pipeline',
  pyramid: 'Pirámide',
  checklist: 'Checklist',
  bookmark: 'Guardado',
  opus: 'Mindset / Opus',
  quote: 'Cita célebre',
  athletic: 'Opus Athletic',
  essay: 'Manifiesto texto',
  workout: 'Sesión / Rutina',
  fix: 'Error vs Corrección',
  service: 'Servicios',
  case: 'Caso de atleta',
  myth: 'Mito vs Fisiología',
}

export const PILLAR_LABEL: Record<Discipline, string> = { general: 'General', sports: 'Sports & Bodybuilding', crossfit: 'CrossFit & Hyrox' }

/** Rasgos de un set que se comparan: formato, plantilla de la portada y pilar. */
export interface PostFeatures {
  format: 'carousel' | 'single'
  cover: TemplateId
  pillar: Discipline
  hook: string
}

export function featuresOf(deck: Project['deck']): PostFeatures {
  const s = deck.slides[0]
  const hook = (s?.template === 'quote' ? s.quoteText : `${s?.headlineA ?? ''} ${s?.headlineB ?? ''}`).replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  return { format: deck.slides.length > 1 ? 'carousel' : 'single', cover: s?.template ?? 'statement', pillar: deck.discipline ?? 'general', hook }
}

export interface Bucket {
  key: string
  label: string
  /** Tasa promedio (guardados + compartidos / alcance, %) */
  rate: number
  posts: number
}

export interface Measured {
  project: Project
  features: PostFeatures
  rate: number
}

export interface PerformanceSummary {
  posts: number
  /** Tasa promedio de todos los posts medidos */
  avgRate: number
  byFormat: Bucket[]
  byCover: Bucket[]
  byPillar: Bucket[]
  /** Mejores y peores portadas (por tasa) */
  top: Measured[]
  bottom: Measured[]
}

const round1 = (x: number) => Math.round(x * 10) / 10

function bucket<K extends string>(rows: Measured[], key: (r: Measured) => K, label: (k: K) => string): Bucket[] {
  const groups = new Map<K, number[]>()
  for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r.rate])
  return [...groups.entries()]
    .map(([k, rates]) => ({ key: k, label: label(k), rate: round1(rates.reduce((a, b) => a + b, 0) / rates.length), posts: rates.length }))
    .sort((a, b) => b.rate - a.rate || b.posts - a.posts)
}

/** Resumen del historial: sólo proyectos guardados (no el borrador) con métricas cargadas. */
export function summarize(projects: Project[]): PerformanceSummary {
  const rows: Measured[] = projects
    .filter((p) => !p.draft && p.metrics && p.metrics.reach > 0)
    .map((p) => ({ project: p, features: featuresOf(p.deck), rate: engagementRate(p.metrics!) }))
  const sorted = [...rows].sort((a, b) => b.rate - a.rate)
  return {
    posts: rows.length,
    avgRate: rows.length ? round1(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0,
    byFormat: bucket(rows, (r) => r.features.format, (k) => (k === 'carousel' ? 'Carrusel' : 'Placa única')),
    byCover: bucket(rows, (r) => r.features.cover, (k) => TEMPLATE_LABEL[k] ?? k),
    byPillar: bucket(rows, (r) => r.features.pillar, (k) => PILLAR_LABEL[k] ?? k),
    top: sorted.slice(0, 3),
    bottom: sorted.length > 3 ? sorted.slice(-2).reverse() : [],
  }
}

/** Mínimo de posts medidos para que el historial opine (con menos, es ruido). */
export const MIN_POSTS = 3

/**
 * Lo que dice el historial sobre la portada que se está evaluando: cómo rindieron antes su plantilla,
 * su formato y su pilar contra el promedio. null si todavía no hay historial suficiente.
 */
export function historyVerdict(s: PerformanceSummary, f: Omit<PostFeatures, 'hook'>): { delta: number; lines: string[] } | null {
  if (s.posts < MIN_POSTS) return null
  const lines: string[] = []
  let delta = 0
  let weight = 0
  const add = (list: Bucket[], key: string, what: string) => {
    const b = list.find((x) => x.key === key)
    if (!b) return lines.push(`${what}: sin historial todavía`)
    const d = round1(b.rate - s.avgRate)
    lines.push(`${what} «${b.label}»: ${b.rate} % (${b.posts} ${b.posts === 1 ? 'post' : 'posts'}) · ${d >= 0 ? '+' : ''}${d} vs promedio`)
    delta += d * b.posts
    weight += b.posts
  }
  add(s.byCover, f.cover, 'Portada')
  add(s.byFormat, f.format, 'Formato')
  add(s.byPillar, f.pillar, 'Pilar')
  return { delta: weight ? round1(delta / weight) : 0, lines }
}

/** Contexto para el prompt del Hook Score: el historial real del coach (vacío sin historial suficiente). */
export function hookHistoryContext(s: PerformanceSummary): string {
  if (s.posts < MIN_POSTS) return ''
  const fmt = (m: Measured) => `«${m.features.hook}» ${m.rate} %`
  const best = (b: Bucket[]) => b[0] ? `${b[0].label} ${b[0].rate} %` : '-'
  return `HISTORIAL REAL (${s.posts} posts; guardados + compartidos / alcance; promedio ${s.avgRate} %). Mejores: ${s.top.slice(0, 2).map(fmt).join(' · ')}.${s.bottom.length ? ` Peor: ${fmt(s.bottom[0])}.` : ''} Rinden más: portada ${best(s.byCover)}, ${best(s.byFormat)}, pilar ${best(s.byPillar)}.
Subí impacto/retención si el titular comparte el ángulo de los mejores, bajalo si se parece al peor; las variantes se inspiran en los ganadores sin copiarlos.`
}

/** Historial leído directo del almacenamiento (el Hook Score lo consulta al evaluar). */
export function loadSummary(): PerformanceSummary {
  try {
    const raw = JSON.parse(localStorage.getItem('jp-tactical-canvas:projects') ?? '{"projects":[]}') as { projects?: Project[] }
    return summarize(Array.isArray(raw.projects) ? raw.projects : [])
  } catch {
    return summarize([])
  }
}
