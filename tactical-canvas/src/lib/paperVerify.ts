/**
 * VERIFICADOR DE PAPERS: contrasta la cita de una placa («SCHOENFELD Y COL., 2010 · J STRENGTH COND RES»)
 * contra las APIs públicas de Crossref y PubMed. Coincide autor (primer autor), año y revista →
 * verificado; si aparece el paper pero algún dato no cuadra → inconsistencia (con los datos reales);
 * si no aparece → sin verificar. Todo corre en el navegador del usuario, sin claves.
 */

export interface ParsedCitation {
  /** Apellido del primer autor, normalizado (minúsculas, sin acentos) */
  author: string
  year: number
  /** Revista tal como figura en la placa (puede estar abreviada) */
  journal: string
}

/** Lo que devolvió la fuente para un paper candidato */
export interface PaperMatch {
  title: string
  /** Apellido del primer autor tal como lo publica la fuente */
  author: string
  authorCount: number
  year: number
  journal: string
  doi?: string
  pmid?: string
  source: 'crossref' | 'pubmed'
}

export type CitationStatus =
  | { state: 'pending' }
  | { state: 'verified'; match: PaperMatch }
  /** Apareció el paper del autor pero el año o la revista no coinciden */
  | { state: 'mismatch'; match: PaperMatch; issues: string[] }
  | { state: 'notfound' }
  /** No se pudo consultar (sin red, API caída): no es una falla de la cita */
  | { state: 'error'; message: string }

/** Pasa a minúsculas ASCII: «Rønnestad» → «ronnestad», «Müller» → «muller». */
export function fold(s: string): string {
  return s
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[łŁ]/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Lee la cita de una placa. Devuelve null cuando no es una cita científica (sin año, o una fuente
 * como «Marco Aurelio · Meditaciones»): esas no se verifican.
 */
export function parseCitation(citeMain: string): ParsedCitation | null {
  const raw = (citeMain ?? '').trim()
  if (!raw) return null
  const m = raw.match(/^(.+?)[,(\s]+((?:18|19|20)\d{2})[a-z]?\)?\s*(?:[·•|,;:–—-]\s*)?(.*)$/i)
  if (!m) return null
  const year = Number(m[2])
  const journal = m[3].replace(/^[·•|,;:.–—\s-]+/, '').trim()
  // «Schoenfeld y col.», «SCHOENFELD ET AL.», «Schoenfeld & Grgic», «Schoenfeld BJ»
  const who = fold(m[1])
    .replace(/\b(y|e) col(?:s|aboradores)?\b\.?/g, ' ')
    .replace(/\bet al\b\.?/g, ' ')
    .split(/\s*(?:&|\band\b|\by\b|,|;)\s*/)[0]
    .replace(/[^a-z\s'-]/g, ' ')
    .trim()
  if (!who || !journal) return null
  // Primer autor: el apellido. Si viene con iniciales al final («schoenfeld bj»), se descartan.
  const parts = who.split(/\s+/)
  while (parts.length > 1 && /^[a-z]{1,2}$/.test(parts[parts.length - 1])) parts.pop()
  const author = parts.join(' ').trim()
  if (author.length < 2) return null
  return { author, year, journal }
}

/** Palabras que no distinguen revistas (artículos, conectores). «journal» sí cuenta: «J» abrevia «Journal». */
const STOP = new Set(['the', 'of', 'and', 'in', 'for', 'on', 'de', 'la', 'el', 'y', 'des', 'du', 'der', 'und', 'a', 'an'])

const journalTokens = (s: string) =>
  fold(s)
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))

/**
 * ¿La revista de la placa es esta revista? Acepta abreviaturas ISO/NLM: cada palabra de la placa
 * tiene que ser el comienzo de una palabra de la revista, en orden («J STRENGTH COND RES» →
 * «Journal of Strength and Conditioning Research», «BR J SPORTS MED» → «British Journal of Sports Medicine»).
 */
export function journalMatches(cited: string, candidate: string): boolean {
  const a = journalTokens(cited)
  const b = journalTokens(candidate)
  if (!a.length || !b.length) return false
  if (a.join(' ') === b.join(' ')) return true
  // Cada palabra citada consume una palabra de la revista, en orden; se toleran palabras salteadas
  // de la revista sólo si son pocas (evita que «J SPORTS» coincida con cualquier revista de deportes).
  let j = 0
  let skipped = 0
  for (const t of a) {
    while (j < b.length && !b[j].startsWith(t)) {
      j++
      skipped++
    }
    if (j >= b.length) return false
    j++
  }
  skipped += b.length - j
  return skipped <= 1
}

const authorMatches = (cited: string, published: string) => {
  const a = fold(cited).replace(/[^a-z]/g, '')
  const b = fold(published).replace(/[^a-z]/g, '')
  return Boolean(a && b) && (a === b || (a.length >= 4 && (b.endsWith(a) || a.endsWith(b))))
}

/** Evalúa un candidato contra la cita: qué coincide y qué no. */
export function compare(c: ParsedCitation, m: PaperMatch): { author: boolean; year: boolean; journal: boolean } {
  return { author: authorMatches(c.author, m.author), year: m.year === c.year, journal: journalMatches(c.journal, m.journal) }
}

/** El mejor candidato de una lista: verificado si hay uno que coincide en todo; si no, la inconsistencia más cercana. */
export function judge(c: ParsedCitation, candidates: PaperMatch[]): CitationStatus {
  let near: { m: PaperMatch; issues: string[] } | null = null
  for (const m of candidates) {
    const r = compare(c, m)
    if (!r.author) continue
    if (r.year && r.journal) return { state: 'verified', match: m }
    // Del autor y en la revista con otro año, o del autor y el año en otra revista.
    if (r.year || r.journal) {
      const issues = [
        ...(r.year ? [] : [`el año publicado es ${m.year}, no ${c.year}`]),
        ...(r.journal ? [] : [`la revista es «${m.journal}», no «${c.journal}»`]),
      ]
      if (!near || (r.journal && !compare(c, near.m).journal)) near = { m, issues }
    }
  }
  return near ? { state: 'mismatch', match: near.m, issues: near.issues } : { state: 'notfound' }
}

/** Cita en el formato de la placa a partir de los datos reales del paper. */
export function citeFromMatch(m: Pick<PaperMatch, 'author' | 'authorCount' | 'year' | 'journal'>): string {
  return `${m.author}${m.authorCount > 1 ? ' Y COL.' : ''}, ${m.year} · ${m.journal}`.toUpperCase()
}

// ---------------------------------------------------------------------------
// Fuentes

type Fetch = typeof fetch

interface CrossrefItem {
  DOI?: string
  title?: string[]
  author?: { family?: string; name?: string; sequence?: string }[]
  'container-title'?: string[]
  'short-container-title'?: string[]
  issued?: { 'date-parts'?: number[][] }
  'published-print'?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
}

/** Un ítem de Crossref como candidatos (uno por nombre de revista y por fecha publicada). */
export function fromCrossref(it: CrossrefItem): PaperMatch[] {
  const authors = it.author ?? []
  const firstA = authors.find((a) => a.sequence === 'first') ?? authors[0]
  const author = firstA?.family ?? firstA?.name ?? ''
  if (!author) return []
  const years = [it['published-print'], it['published-online'], it.issued]
    .map((d) => d?.['date-parts']?.[0]?.[0])
    .filter((y): y is number => typeof y === 'number')
  const journals = [...(it['container-title'] ?? []), ...(it['short-container-title'] ?? [])].filter(Boolean)
  if (!years.length || !journals.length) return []
  const base = { title: it.title?.[0] ?? '', author, authorCount: authors.length, doi: it.DOI, source: 'crossref' as const }
  const out: PaperMatch[] = []
  for (const year of [...new Set(years)]) for (const journal of journals) out.push({ ...base, year, journal })
  return out
}

async function getJson(f: Fetch, url: string, signal?: AbortSignal) {
  const res = await f(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${new URL(url).host} respondió ${res.status}`)
  return res.json()
}

export async function searchCrossref(c: ParsedCitation, f: Fetch = fetch, signal?: AbortSignal, withYear = true): Promise<PaperMatch[]> {
  const q = new URLSearchParams({
    'query.author': c.author,
    'query.bibliographic': c.journal,
    rows: '25',
    select: 'DOI,title,author,container-title,short-container-title,issued,published-print,published-online',
  })
  if (withYear) q.set('filter', `from-pub-date:${c.year - 1},until-pub-date:${c.year + 1}`)
  const json = await getJson(f, `https://api.crossref.org/works?${q}`, signal)
  return ((json?.message?.items ?? []) as CrossrefItem[]).flatMap(fromCrossref)
}

interface PubmedSummary {
  uid?: string
  title?: string
  authors?: { name?: string }[]
  fulljournalname?: string
  source?: string
  pubdate?: string
  epubdate?: string
  articleids?: { idtype?: string; value?: string }[]
}

/** Un resumen de PubMed como candidatos (revista completa y abreviatura NLM). */
export function fromPubmed(s: PubmedSummary): PaperMatch[] {
  const authors = s.authors ?? []
  // «Schoenfeld BJ» → «Schoenfeld»; «Rønnestad BR» → «Rønnestad»
  const author = (authors[0]?.name ?? '').replace(/\s+[A-Z]{1,3}$/, '').trim()
  const years = [s.pubdate, s.epubdate].map((d) => Number((d ?? '').slice(0, 4))).filter((y) => y > 1800)
  const journals = [s.fulljournalname, s.source].filter((x): x is string => Boolean(x))
  if (!author || !years.length || !journals.length) return []
  const doi = s.articleids?.find((a) => a.idtype === 'doi')?.value
  const base = { title: s.title ?? '', author, authorCount: authors.length, doi, pmid: s.uid, source: 'pubmed' as const }
  const out: PaperMatch[] = []
  for (const year of [...new Set(years)]) for (const journal of journals) out.push({ ...base, year, journal })
  return out
}

export async function searchPubmed(c: ParsedCitation, f: Fetch = fetch, signal?: AbortSignal): Promise<PaperMatch[]> {
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
  // Primer autor en el rango de años (±1: la versión online suele salir antes que la impresa).
  const term = `${c.author}[1au] AND ${c.year - 1}:${c.year + 1}[dp]`
  const ids = (await getJson(f, `${base}/esearch.fcgi?${new URLSearchParams({ db: 'pubmed', retmode: 'json', retmax: '40', term })}`, signal))?.esearchresult?.idlist as string[] | undefined
  if (!ids?.length) return []
  const sum = await getJson(f, `${base}/esummary.fcgi?${new URLSearchParams({ db: 'pubmed', retmode: 'json', id: ids.join(',') })}`, signal)
  const result = sum?.result ?? {}
  return ((result.uids ?? []) as string[]).flatMap((uid) => fromPubmed(result[uid] ?? {}))
}

/**
 * Verifica una cita: Crossref primero (todas las revistas con DOI), PubMed como respaldo (biomedicina,
 * con las abreviaturas NLM que usan las placas). Si ninguna fuente responde, el estado es «error».
 */
export async function verifyCitation(citeMain: string, f: Fetch = fetch, signal?: AbortSignal): Promise<CitationStatus | null> {
  const c = parseCitation(citeMain)
  if (!c) return null
  const found: PaperMatch[] = []
  const errors: string[] = []
  const attempt = async (run: () => Promise<PaperMatch[]>) => {
    try {
      found.push(...(await run()))
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      errors.push((err as Error)?.message ?? String(err))
    }
    return judge(c, found)
  }
  let r = await attempt(() => searchCrossref(c, f, signal))
  if (r.state === 'verified') return r
  r = await attempt(() => searchPubmed(c, f, signal))
  if (r.state === 'verified') return r
  // Sin coincidencia en el rango de años: se busca el autor en esa revista en cualquier año para
  // poder decir «el año es otro» en lugar de «no existe».
  if (r.state === 'notfound' && errors.length < 2) r = await attempt(() => searchCrossref(c, f, signal, false))
  if (r.state === 'notfound' && errors.length >= 2) return { state: 'error', message: errors[0] }
  return r
}

/** Clave de caché: la misma cita escrita con otras mayúsculas o espacios es la misma consulta. */
export const citationKey = (citeMain: string) => fold(citeMain).replace(/\s+/g, ' ').trim()

/** Datos de un paper por DOI (Crossref), para cargarlo en la biblioteca sin tipear. */
export async function lookupDoi(doi: string, f: Fetch = fetch, signal?: AbortSignal): Promise<PaperMatch | null> {
  const clean = doi.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '')
  if (!/^10\.\d{4,9}\/\S+$/.test(clean)) return null
  const json = await getJson(f, `https://api.crossref.org/works/${encodeURIComponent(clean)}`, signal)
  const all = fromCrossref((json?.message ?? {}) as CrossrefItem)
  if (!all.length) return null
  // Revista con el nombre completo y el año de la versión impresa (la primera fecha publicada).
  return { ...all[0], doi: clean }
}
