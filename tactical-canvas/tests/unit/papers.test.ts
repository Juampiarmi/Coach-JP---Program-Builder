import { describe, expect, it, vi, afterEach } from 'vitest'
import { citeFromMatch, journalMatches, judge, lookupDoi, parseCitation, verifyCitation, type PaperMatch } from '../../src/lib/paperVerify'
import { citeFromPaper, enforceLibrary, findInLibrary, firstSurname, mergePapers, paperLibraryRule, weeklyPapers, type OwnPaper } from '../../src/lib/paperLibrary'

const m = (o: Partial<PaperMatch>): PaperMatch => ({ title: 'T', author: 'Schoenfeld', authorCount: 3, year: 2010, journal: 'Journal of Strength and Conditioning Research', source: 'crossref', ...o })

describe('parseCitation', () => {
  it('lee el formato de placa', () => {
    expect(parseCitation('SCHOENFELD Y COL., 2017 · J SPORTS SCI')).toEqual({ author: 'schoenfeld', year: 2017, journal: 'J SPORTS SCI' })
    expect(parseCitation('Rønnestad y col., 2015 · Scand J Med Sci Sports')).toEqual({ author: 'ronnestad', year: 2015, journal: 'Scand J Med Sci Sports' })
    expect(parseCitation('Schoenfeld BJ et al. (2010). J Strength Cond Res')).toEqual({ author: 'schoenfeld', year: 2010, journal: 'J Strength Cond Res' })
    expect(parseCitation('KIVINIEMI Y COL., 2007 · EUROPEAN J. OF APPLIED PHYSIOLOGY')?.journal).toBe('EUROPEAN J. OF APPLIED PHYSIOLOGY')
  })
  it('ignora lo que no es un paper', () => {
    expect(parseCitation('Marco Aurelio · Meditaciones, Libro X, 16')).toBeNull()
    expect(parseCitation('')).toBeNull()
    expect(parseCitation('SCHOENFELD, 2010')).toBeNull()
  })
})

describe('journalMatches', () => {
  it.each([
    ['J STRENGTH COND RES', 'Journal of Strength and Conditioning Research'],
    ['BR J SPORTS MED', 'British Journal of Sports Medicine'],
    ['MED SCI SPORTS EXERC', 'Medicine & Science in Sports & Exercise'],
    ['Scand J Med Sci Sports', 'Scandinavian Journal of Medicine & Science in Sports'],
    ['EUROPEAN J. OF APPLIED PHYSIOLOGY', 'European Journal of Applied Physiology'],
    ['THE LANCET', 'The Lancet'],
    ['PEERJ', 'PeerJ'],
    ['J APPL PHYSIOL', 'Journal of Applied Physiology'],
  ])('%s = %s', (a, b) => expect(journalMatches(a, b)).toBe(true))
  it.each([
    ['J STRENGTH COND RES', 'Journal of Sports Sciences'],
    ['J SPORTS SCI', 'Journal of Science and Medicine in Sport'],
    ['SPORTS MED', 'British Journal of Sports Medicine'],
  ])('%s ≠ %s', (a, b) => expect(journalMatches(a, b)).toBe(false))
})

describe('judge', () => {
  const c = parseCitation('SCHOENFELD Y COL., 2010 · J STRENGTH COND RES')!
  it('verificado con autor, año y revista', () => expect(judge(c, [m({ author: 'Grgic' }), m({})]).state).toBe('verified'))
  it('inconsistencia de año con los datos reales', () => {
    const r = judge({ ...c, year: 2019 }, [m({})])
    expect(r).toMatchObject({ state: 'mismatch', issues: ['el año publicado es 2010, no 2019'] })
  })
  it('sin coincidencias de autor → no encontrado', () => expect(judge(c, [m({ author: 'Helms' })]).state).toBe('notfound'))
  it('cita corregida', () => expect(citeFromMatch(m({}))).toBe('SCHOENFELD Y COL., 2010 · JOURNAL OF STRENGTH AND CONDITIONING RESEARCH'))
})

const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const crossrefItem = { DOI: '10.1519/JSC.0b013e3181e840f3', title: ['The mechanisms of muscle hypertrophy'], author: [{ family: 'Schoenfeld', sequence: 'first' }], 'container-title': ['Journal of Strength and Conditioning Research'], issued: { 'date-parts': [[2010, 10]] } }

describe('verifyCitation (fetch simulado)', () => {
  afterEach(() => vi.restoreAllMocks())
  it('Crossref confirma la cita sin consultar PubMed', async () => {
    const f = vi.fn(async (url: string) => (url.includes('crossref') ? res({ message: { items: [crossrefItem] } }) : res({}, 500)))
    const r = await verifyCitation('SCHOENFELD Y COL., 2010 · J STRENGTH COND RES', f as unknown as typeof fetch)
    expect(r).toMatchObject({ state: 'verified', match: { doi: '10.1519/JSC.0b013e3181e840f3', source: 'crossref' } })
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0][0])).toContain('filter=from-pub-date%3A2009%2Cuntil-pub-date%3A2011')
  })
  it('PubMed como respaldo con abreviatura NLM', async () => {
    const f = vi.fn(async (url: string) => {
      if (url.includes('crossref')) return res({ message: { items: [] } })
      if (url.includes('esearch')) return res({ esearchresult: { idlist: ['20847704'] } })
      return res({ result: { uids: ['20847704'], '20847704': { uid: '20847704', title: 'The mechanisms…', authors: [{ name: 'Schoenfeld BJ' }], fulljournalname: 'Journal of strength and conditioning research', source: 'J Strength Cond Res', pubdate: '2010 Oct' } } })
    })
    const r = await verifyCitation('Schoenfeld, 2010 · J Strength Cond Res', f as unknown as typeof fetch)
    expect(r).toMatchObject({ state: 'verified', match: { pmid: '20847704', source: 'pubmed' } })
  })
  it('cita inventada → no encontrada', async () => {
    const f = vi.fn(async (url: string) => (url.includes('crossref') ? res({ message: { items: [] } }) : url.includes('esearch') ? res({ esearchresult: { idlist: [] } }) : res({})))
    expect(await verifyCitation('PEREZ Y COL., 2021 · J STRENGTH COND RES', f as unknown as typeof fetch)).toEqual({ state: 'notfound' })
  })
  it('sin red → error (no es una falla de la cita)', async () => {
    const f = vi.fn(async () => res({}, 403))
    expect((await verifyCitation('SCHOENFELD Y COL., 2010 · J STRENGTH COND RES', f as unknown as typeof fetch))?.state).toBe('error')
  })
  it('lookupDoi', async () => {
    const f = vi.fn(async () => res({ message: crossrefItem }))
    expect(await lookupDoi('https://doi.org/10.1519/JSC.0b013e3181e840f3', f as unknown as typeof fetch)).toMatchObject({ author: 'Schoenfeld', year: 2010, doi: '10.1519/JSC.0b013e3181e840f3' })
    expect(await lookupDoi('no-es-un-doi', f as unknown as typeof fetch)).toBeNull()
  })
})

describe('biblioteca de papers', () => {
  const p: OwnPaper = { id: 'a', title: 'The mechanisms of muscle hypertrophy', authors: 'Schoenfeld BJ', year: 2010, journal: 'J Strength Cond Res', finding: 'La tensión mecánica manda.' }
  it('apellido del primer autor', () => {
    expect(firstSurname({ authors: 'Schoenfeld BJ, Grgic J' })).toBe('Schoenfeld')
    expect(firstSurname({ authors: 'Rønnestad y col.' })).toBe('Rønnestad')
    expect(firstSurname({ authors: 'Brad J. Schoenfeld' })).toBe('Schoenfeld')
  })
  it('cita de placa', () => {
    expect(citeFromPaper(p)).toEqual({ citeMain: 'SCHOENFELD, 2010 · J STRENGTH COND RES', citeSub: 'La tensión mecánica manda.' })
    expect(citeFromPaper({ ...p, authors: 'Schoenfeld BJ, Ogborn D' }).citeMain).toBe('SCHOENFELD Y COL., 2010 · J STRENGTH COND RES')
  })
  it('busca por primer autor + año', () => {
    expect(findInLibrary('SCHOENFELD Y COL., 2010 · JOURNAL OF STRENGTH AND CONDITIONING RESEARCH', [p])).toBe(p)
    expect(findInLibrary('SCHOENFELD Y COL., 2017 · J SPORTS SCI', [p])).toBeNull()
  })
  it('regla del prompt sólo en modo exclusivo', () => {
    expect(paperLibraryRule({ papers: [p], exclusive: false })).toBe('')
    expect(paperLibraryRule({ papers: [], exclusive: true })).toBe('')
    expect(paperLibraryRule({ papers: [p], exclusive: true })).toContain('1. SCHOENFELD, 2010 · J STRENGTH COND RES')
  })
  it('guardia: borra citas fuera de la biblioteca y normaliza las de adentro', () => {
    const lib = { papers: [p], exclusive: true }
    expect(enforceLibrary({ citeMain: 'HELMS Y COL., 2014 · J INT SOC SPORTS NUTR', citeSub: 'x' }, lib)).toEqual({ citeMain: '', citeSub: '' })
    expect(enforceLibrary({ citeMain: 'Schoenfeld y col., 2010 · JSCR', citeSub: '' }, lib)).toEqual({ citeMain: 'SCHOENFELD, 2010 · J STRENGTH COND RES', citeSub: 'La tensión mecánica manda.' })
    expect(enforceLibrary({ citeMain: 'HELMS Y COL., 2014 · X', citeSub: 'x' }, { ...lib, exclusive: false }).citeMain).toBe('HELMS Y COL., 2014 · X')
  })
  it('papers del Plan Semanal sin la cita filosófica y sin duplicados', () => {
    const w = weeklyPapers()
    expect(w).toHaveLength(6)
    expect(w.every((x) => x.year > 2000)).toBe(true)
    expect(mergePapers(w, weeklyPapers())).toHaveLength(6)
  })
})

describe('IA con biblioteca exclusiva', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('agrega la lista al prompt y borra la cita inventada', async () => {
    const { DEFAULT_AI_SETTINGS, generateContent } = await import('../../src/lib/ai')
    const lib = { exclusive: true, papers: [{ id: 'a', title: 'The mechanisms of muscle hypertrophy', authors: 'Schoenfeld BJ', year: 2010, journal: 'J Strength Cond Res', finding: 'La tensión mecánica manda.' }] }
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'jp-tactical-canvas:papers' ? JSON.stringify(lib) : null), setItem: () => {} })
    const answer = {
      format: 'carousel',
      caption: 'c',
      slides: [
        { templateId: 'sentencia', citation: 'PEREZ Y COL., 2021 · J FAKE RES', text: { titleWhite: 'LA CARGA', titleAccent: 'MANDA.', parrafo: 'p' } },
        { templateId: 'sentencia', citation: 'Schoenfeld y col., 2010 · Journal of Strength and Conditioning Research', text: { titleWhite: 'LA TENSIÓN', titleAccent: 'MANDA.', parrafo: 'p' } },
      ],
    }
    let prompt = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        prompt = JSON.stringify(JSON.parse(String(init.body)).messages)
        return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(answer) }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }),
    )
    const settings = { ...DEFAULT_AI_SETTINGS, provider: 'anthropic' as const, keys: { ...DEFAULT_AI_SETTINGS.keys, anthropic: 'KEY' } }
    const r = await generateContent(settings, 'tensión mecánica', 'carousel', 'general')
    expect(prompt).toContain('BIBLIOTECA DE EVIDENCIA DEL COACH')
    expect(prompt).toContain('SCHOENFELD, 2010 · J STRENGTH COND RES')
    expect(r.slides[0].citeMain).toBe('')
    expect(r.slides[1].citeMain).toBe('SCHOENFELD, 2010 · J STRENGTH COND RES')
  })
})
