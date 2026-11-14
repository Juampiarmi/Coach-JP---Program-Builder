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
