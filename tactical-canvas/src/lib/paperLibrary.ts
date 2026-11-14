import { citeFromMatch, fold, parseCitation, type PaperMatch } from './paperVerify'
import { WEEKLY_PACK } from './weeklyPack'

/**
 * BIBLIOTECA DE PAPERS PROPIOS: la base de evidencia validada por el coach. Con el modo exclusivo
 * activo, la IA sólo puede citar estos papers (regla en el prompt + guardia que borra cualquier otra
 * cita que devuelva).
 */

export interface OwnPaper {
  id: string
  title: string
  /** Autores como se publican («Schoenfeld BJ, Grgic J») o sólo el primero */
  authors: string
  year: number
  journal: string
  /** Hallazgo en una línea de sala */
  finding: string
  doi?: string
  /** Se cargó con los datos de Crossref / PubMed (o se verificó contra ellos) */
  verified?: boolean
}

export interface PaperLibrary {
  papers: OwnPaper[]
  /** La IA cita exclusivamente de esta biblioteca */
  exclusive: boolean
}

export const PAPERS_KEY = 'jp-tactical-canvas:papers'
export const EMPTY_PAPERS: PaperLibrary = { papers: [], exclusive: false }

export const newPaperId = () => `pp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Lectura directa (las funciones de IA la consultan al momento de generar). */
export function loadPaperLibrary(): PaperLibrary {
  try {
    const raw = JSON.parse(localStorage.getItem(PAPERS_KEY) ?? 'null') as Partial<PaperLibrary> | null
    if (raw && Array.isArray(raw.papers)) return { papers: raw.papers, exclusive: Boolean(raw.exclusive) }
  } catch {
    /* almacenamiento bloqueado o JSON corrupto */
  }
  return EMPTY_PAPERS
}

const authorList = (p: Pick<OwnPaper, 'authors'>) =>
  p.authors
    .split(/\s*(?:[;,]|\s&\s|\sand\s|\sy\s)\s*/)
    .map((x) => x.trim())
    .filter(Boolean)

/** Apellido del primer autor: «Schoenfeld BJ», «Schoenfeld y col.» o «Brad J. Schoenfeld» → «Schoenfeld». */
export function firstSurname(p: Pick<OwnPaper, 'authors'>): string {
  const first = p.authors.replace(/\s+(?:y col|et al)\.?.*$/i, '').split(/\s*(?:[;,]|\s&\s|\sand\s)\s*/)[0].trim()
  const initials = first.match(/^(.+?)(?:\s+\p{Lu}{1,3}\.?)+$/u)
  if (initials) return initials[1]
  // «Nombre I. Apellido»: con una inicial en el medio, el apellido es la última palabra.
  return /\s\p{Lu}\.\s/u.test(first) ? first.split(/\s+/).pop()! : first
}

/** Cita de la placa: «SCHOENFELD Y COL., 2010 · J STRENGTH COND RES» + hallazgo. */
export function citeFromPaper(p: OwnPaper): { citeMain: string; citeSub: string } {
  const many = authorList(p).length > 1 || /y col|et al/i.test(p.authors)
  return { citeMain: citeFromMatch({ author: firstSurname(p), authorCount: many ? 2 : 1, year: p.year, journal: p.journal }), citeSub: p.finding.slice(0, 140) }
}

/** Paper a partir de un resultado verificado de Crossref / PubMed. */
export function paperFromMatch(m: PaperMatch, finding = ''): OwnPaper {
  return { id: newPaperId(), title: m.title, authors: m.authorCount > 1 ? `${m.author} y col.` : m.author, year: m.year, journal: m.journal, finding, doi: m.doi, verified: true }
}

/** ¿Esta cita de placa corresponde a un paper de la biblioteca? (primer autor + año) */
export function findInLibrary(citeMain: string, papers: OwnPaper[]): OwnPaper | null {
  const c = parseCitation(citeMain)
  if (!c) return null
  const a = c.author.replace(/[^a-z]/g, '')
  return papers.find((p) => p.year === c.year && fold(firstSurname(p)).replace(/[^a-z]/g, '') === a) ?? null
}

/** Los papers del Plan Semanal (los que tienen año: la cita filosófica no es un paper). */
export function weeklyPapers(): OwnPaper[] {
  return WEEKLY_PACK.flatMap((d) => {
    const m = d.ref.cite.match(/^(.+?),\s*((?:19|20)\d{2})\s*·\s*(.+)$/)
    if (!m) return []
    return [{ id: `pp_weekly_${d.id}`, title: d.ref.title, authors: m[1], year: Number(m[2]), journal: m[3], finding: d.ref.finding }]
  })
}

/** Agrega papers sin duplicar (mismo DOI, o mismo primer autor + año + título). */
export function mergePapers(current: OwnPaper[], incoming: OwnPaper[]): OwnPaper[] {
  const key = (p: OwnPaper) => (p.doi ? `doi:${p.doi.toLowerCase()}` : `${fold(firstSurname(p))}|${p.year}|${fold(p.title).slice(0, 60)}`)
  const seen = new Set(current.map(key))
  return [...current, ...incoming.filter((p) => !seen.has(key(p)) && (seen.add(key(p)), true))]
}

/**
 * Regla para el prompt cuando el modo exclusivo está activo: la lista cerrada de papers citables.
 * Sin biblioteca o sin modo exclusivo no se agrega nada (el prompt queda idéntico).
 */
export function paperLibraryRule(lib: PaperLibrary): string {
  if (!lib.exclusive || !lib.papers.length) return ''
  const list = lib.papers.map((p, i) => `${i + 1}. ${citeFromPaper(p).citeMain} — «${p.title}» — Hallazgo: ${p.finding}`).join('\n')
  return `BIBLIOTECA DE EVIDENCIA DEL COACH (modo exclusivo, inquebrantable):
Sólo podés citar papers de esta lista, con el autor, el año y la revista EXACTOS como figuran:
${list}
- citeMain de cualquier placa: copiá la cita de la lista tal cual; citeSub: su hallazgo.
- Si ningún paper de la lista respalda el contenido, dejá citeMain y citeSub vacíos y no menciones estudios en el caption. Prohibido citar cualquier otro paper, aunque exista.`
}

/** Guardia post-IA: con el modo exclusivo, toda cita que no esté en la biblioteca se borra. */
export function enforceLibrary<T extends { citeMain?: string; citeSub?: string }>(patch: T, lib: PaperLibrary): T {
  if (!lib.exclusive || !lib.papers.length || !patch.citeMain?.trim() || !parseCitation(patch.citeMain)) return patch
  const p = findInLibrary(patch.citeMain, lib.papers)
  // Si está, se normaliza a la cita exacta de la biblioteca (la IA a veces abrevia distinto la revista).
  return p ? { ...patch, citeMain: citeFromPaper(p).citeMain, citeSub: patch.citeSub?.trim() ? patch.citeSub : p.finding } : { ...patch, citeMain: '', citeSub: '' }
}
