import { getImage, putImage } from './imageStore'
import type { Discipline } from './ai'
import type { CanvasState } from '../types'
import type { PostMetrics } from './performance'
import type { BankPhoto } from './photoBank'
import type { OwnPaper } from './paperLibrary'

/**
 * BIBLIOTECA DE PROYECTOS: sets guardados con nombre (campañas, programas, series de contenido).
 * El set abierto queda vinculado a su proyecto y cada edición se guarda sola. Las fotos no viajan
 * dentro del proyecto (viven en IndexedDB por id); el respaldo .json sí las incluye.
 */

/** Set guardado (mismo contenido que el set activo de la app, sin los vínculos). */
export interface SavedDeck {
  slides: CanvasState[]
  active: number
  caption?: string
  topic?: string
  discipline?: Discipline
}

export interface Project {
  id: string
  name: string
  deck: SavedDeck
  createdAt: number
  updatedAt: number
  /** Miniatura JPEG chica (data URL) de la placa que estaba en pantalla al guardar */
  thumb?: string
  /** Borrador automático: el último set sin guardar (hay uno solo; se pisa) */
  draft?: boolean
  /** Métricas de Instagram cargadas después de publicar */
  metrics?: PostMetrics
}

export interface ProjectStore {
  projects: Project[]
}

export const DRAFT_ID = 'draft'
export const EMPTY_LIBRARY: ProjectStore = { projects: [] }

export const newProjectId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `prj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** El set sin los vínculos de la app (proyecto / día del plan): lo que se guarda. */
export function toSaved(d: SavedDeck & { projectId?: string; packDay?: string }): SavedDeck {
  return { slides: d.slides, active: d.active, caption: d.caption, topic: d.topic, discipline: d.discipline }
}

/** Ids de todas las fotos que usa un set (fondo, Error vs Corrección y panorámica). */
export function deckImageIds(d: SavedDeck): string[] {
  return d.slides.flatMap((s) => [s.bgImageId, s.fixWrongImageId, s.fixRightImageId, s.panoramaImageId]).filter((id): id is string => Boolean(id))
}

/** Nombre sugerido para un set: el titular de la portada. */
export function suggestName(d: SavedDeck) {
  const s = d.slides[0]
  const t = (s?.template === 'quote' ? `${s.quoteAuthor}: ${s.quoteText}` : `${s?.headlineA ?? ''} ${s?.headlineB ?? ''}`).replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  return t ? (t.length > 48 ? `${t.slice(0, 46)}…` : t) : 'Set sin título'
}

/** «hace 5 min», «ayer», «12/03». */
export function relativeTime(ts: number, now = Date.now()) {
  const m = Math.round((now - ts) / 60000)
  if (m < 1) return 'recién'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  if (h < 48) return 'ayer'
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

const BACKUP_APP = 'jp-tactical-canvas/projects'

/** Respaldo completo: proyectos + banco de fotos + Biblioteca de Papers + las imágenes que usan (para restaurar en otro navegador o equipo). */
export async function exportLibrary(projects: Project[], photoBank: BankPhoto[] = [], papers: OwnPaper[] = []): Promise<Blob> {
  const ids = [...new Set([...projects.flatMap((p) => deckImageIds(p.deck)), ...photoBank.map((p) => p.id)])]
  const images: Record<string, string> = {}
  for (const id of ids) {
    const url = await getImage(id).catch(() => undefined)
    if (url) images[id] = url
  }
  const payload = { app: BACKUP_APP, version: 3, exportedAt: new Date().toISOString(), projects, photoBank, papers, images }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

/**
 * Importa un respaldo: guarda sus fotos en IndexedDB (mismo id) y devuelve sus proyectos con ids
 * nuevos (nunca pisan los existentes) y las fotos del banco. Lanza un error legible si el archivo no
 * es un respaldo. Acepta respaldos v1 (sólo proyectos), v2 (con banco de fotos) y v3 (con papers).
 */
export async function importLibrary(text: string): Promise<{ projects: Project[]; photoBank: BankPhoto[]; papers: OwnPaper[] }> {
  let data: { app?: string; projects?: unknown; photoBank?: unknown; papers?: unknown; images?: Record<string, unknown> }
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (data.app !== BACKUP_APP || !Array.isArray(data.projects)) throw new Error('El archivo no es un respaldo de proyectos de Tactical Canvas.')
  const images = data.images ?? {}
  for (const [id, url] of Object.entries(images)) {
    if (typeof url === 'string' && url.startsWith('data:image/')) await putImage(id, url).catch(() => undefined)
  }
  const now = Date.now()
  const projects = (data.projects as Project[])
    .filter((p) => p && typeof p.name === 'string' && p.deck && Array.isArray(p.deck.slides) && p.deck.slides.length)
    .map((p) => ({ ...p, id: newProjectId(), draft: false, updatedAt: p.updatedAt ?? now, createdAt: p.createdAt ?? now }))
  // Del banco sólo vuelven las fotos cuya imagen viajó en el respaldo.
  const photoBank = (Array.isArray(data.photoBank) ? (data.photoBank as BankPhoto[]) : []).filter((p) => p && typeof p.id === 'string' && typeof images[p.id] === 'string')
  const papers = (Array.isArray(data.papers) ? (data.papers as OwnPaper[]) : []).filter((p) => p && typeof p.title === 'string' && typeof p.year === 'number')
  return { projects, photoBank, papers }
}
