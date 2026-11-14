import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '../../src/defaults'
import { diagnose } from '../../src/lib/retentionDoctor'
import { buildPackSlides, WEEKLY_PACK } from '../../src/lib/weeklyPack'
import type { CanvasState } from '../../src/types'

describe('doctor de retención', () => {
  for (const day of WEEKLY_PACK) {
    it(`plan semanal · ${day.day} da 100 en feed y en historias`, () => {
      const feed = buildPackSlides(day, DEFAULT_STATE, null)
      expect(diagnose(feed, () => null).findings).toEqual([])
      const story = feed.map((s) => ({ ...s, aspect: 'story' as const }))
      expect(diagnose(story, () => null).score).toBe(100)
    })
  }

  it('marca CTA faltante, portada densa y muletillas de IA', () => {
    const base = { ...DEFAULT_STATE, template: 'statement' } as CanvasState
    const slides = [
      { ...base, headlineA: 'ES CRUCIAL', headlineB: 'ANOTAR.', body: 'palabra '.repeat(40), kicker: '' },
      { ...base, headlineA: 'LA CARGA', headlineB: 'MANDA.', body: 'Corto.', kicker: '' },
    ]
    const ids = diagnose(slides, () => null).findings.map((f) => f.id)
    expect(ids).toEqual(expect.arrayContaining(['cta', 'cover-0', 'lang-0']))
  })
})

describe('doctor · verificador de papers', () => {
  const s = (citeMain: string, template: CanvasState['template'] = 'metric') => ({ ...DEFAULT_STATE, template, citeMain }) as CanvasState
  const match = { title: 'Q', author: 'Hall', authorCount: 2, year: 2011, journal: 'The Lancet', source: 'crossref' as const }
  it('una alerta por cita, aunque se repita en varias placas', () => {
    const slides = [s('PEREZ, 2021 · J X'), s('PEREZ, 2021 · J X'), s('PEREZ, 2021 · J X', 'quote')]
    const f = diagnose(slides, () => null, () => ({ state: 'notfound' })).findings.filter((x) => x.id.startsWith('cite'))
    expect(f).toHaveLength(1)
    expect(f[0].title).toBe('⚠ CITA SIN VERIFICAR en las placas 1, 2')
  })
  it('inconsistencia con fix a los datos reales; verificado, error o pendiente no alertan', () => {
    const r = diagnose([s('HALL Y COL., 2012 · THE LANCET')], () => null, () => ({ state: 'mismatch', match, issues: ['el año publicado es 2011, no 2012'] }))
    expect(r.findings.find((x) => x.id === 'cite-0')?.fix).toEqual({ kind: 'cite', slide: 0, from: 'HALL Y COL., 2012 · THE LANCET', to: 'HALL Y COL., 2011 · THE LANCET' })
    for (const st of [{ state: 'verified', match }, { state: 'error', message: 'x' }, { state: 'pending' }] as const)
      expect(diagnose([s('HALL Y COL., 2011 · THE LANCET')], () => null, () => st).findings.some((x) => x.id.startsWith('cite'))).toBe(false)
  })
})
