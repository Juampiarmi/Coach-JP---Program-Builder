import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE } from '../../src/defaults'
import { engagementRate, historyVerdict, hookHistoryContext, parseMetrics, summarize, MIN_POSTS } from '../../src/lib/performance'
import { detectDisciplines, pickPhoto, withPhoto, type BankPhoto } from '../../src/lib/photoBank'
import { averageColor, colorDistance, contrastRatio, gridVerdict, luminance, type RGB } from '../../src/lib/feedGrid'
import type { Project } from '../../src/lib/projects'
import type { CanvasState } from '../../src/types'

const slide = (o: Partial<CanvasState> = {}) => ({ ...DEFAULT_STATE, ...o }) as CanvasState
let n = 0
const project = (o: { slides?: CanvasState[]; discipline?: Project['deck']['discipline']; m?: [number, number, number]; draft?: boolean }): Project => ({
  id: `p${n++}`,
  name: `P${n}`,
  deck: { slides: o.slides ?? [slide()], active: 0, discipline: o.discipline },
  createdAt: 0,
  updatedAt: n,
  draft: o.draft,
  metrics: o.m ? { saves: o.m[0], shares: o.m[1], reach: o.m[2], loggedAt: 1 } : undefined,
})

describe('métricas por proyecto', () => {
  it('tasa = (guardados + compartidos) / alcance × 100', () => {
    expect(engagementRate({ saves: 120, shares: 30, reach: 3000 })).toBe(5)
    expect(engagementRate({ saves: 1, shares: 1, reach: 0 })).toBe(0)
  })
  it('parsea lo que se tipea (3,2k, 12.500) y rechaza alcance 0', () => {
    expect(parseMetrics({ saves: '120', shares: '30', reach: '3,2k' }, 5)).toEqual({ saves: 120, shares: 30, reach: 3200, loggedAt: 5 })
    expect(parseMetrics({ saves: '1.200', shares: '0', reach: '12.500' }, 5)?.reach).toBe(12500)
    expect(parseMetrics({ saves: '5', shares: '1', reach: '0' })).toBeNull()
    expect(parseMetrics({ saves: 'mucho', shares: '1', reach: '100' })).toBeNull()
  })
  const carousel = [slide({ template: 'metric', headlineA: 'EL RIR', headlineB: 'MANDA' }), slide()]
  const projects = [
    project({ slides: carousel, discipline: 'sports', m: [200, 50, 2500] }), // 10 %
    project({ slides: carousel, discipline: 'sports', m: [90, 30, 2000] }), // 6 %
    project({ slides: [slide({ template: 'quote', quoteText: 'Sé uno' })], discipline: 'general', m: [10, 10, 1000] }), // 2 %
    project({ slides: carousel, discipline: 'crossfit' }), // sin métricas
    project({ slides: carousel, draft: true, m: [999, 999, 1000] }), // borrador: no cuenta
  ]
  it('resume por formato, portada y pilar (sin borradores ni proyectos sin métricas)', () => {
    const s = summarize(projects)
    expect(s.posts).toBe(3)
    expect(s.avgRate).toBe(6)
    expect(s.byFormat[0]).toMatchObject({ key: 'carousel', label: 'Carrusel', rate: 8, posts: 2 })
    expect(s.byCover[0]).toMatchObject({ key: 'metric', label: 'Métrica', rate: 8 })
    expect(s.byPillar.map((b) => b.key)).toEqual(['sports', 'general'])
    expect(s.top[0].features.hook).toBe('EL RIR MANDA')
  })
  it('el Hook Score recibe historial sólo con 3+ posts medidos', () => {
    expect(MIN_POSTS).toBe(3)
    expect(hookHistoryContext(summarize(projects.slice(0, 2)))).toBe('')
    const ctx = hookHistoryContext(summarize(projects))
    expect(ctx).toContain('HISTORIAL REAL DE ESTA CUENTA (3 posts medidos')
    expect(ctx).toContain('«EL RIR MANDA» → 10 %')
    const v = historyVerdict(summarize(projects), { cover: 'metric', format: 'carousel', pillar: 'sports' })
    expect(v?.delta).toBe(2)
    expect(v?.lines[0]).toBe('Portada «Métrica»: 8 % (2 posts) · +2 vs promedio')
    expect(historyVerdict(summarize(projects), { cover: 'myth', format: 'single', pillar: 'crossfit' })?.lines[0]).toBe('Portada: sin historial todavía')
  })
})

describe('banco de fotos', () => {
  const photo = (id: string, disciplines: BankPhoto['disciplines'], usedAt?: number): BankPhoto => ({ id, thumb: '', disciplines, kind: 'atleta', addedAt: 1, usedAt })
  it('detecta la disciplina del tema', () => {
    expect(detectDisciplines('Fuerza pesada para ciclistas de MTB: pedaleo y cadencia')[0]).toBe('mtb')
    expect(detectDisciplines('Hyrox: sled push y wall balls')[0]).toBe('hyrox')
    expect(detectDisciplines('Hipertrofia y tensión mecánica')).toEqual(['fuerza'])
    expect(detectDisciplines('Mindset y disciplina', 'crossfit')).toEqual(['crossfit', 'hyrox'])
    expect(detectDisciplines('Mindset y disciplina')).toEqual([])
  })
  it('elige la foto acorde y rota por uso', () => {
    const bank = { photos: [photo('a', ['fuerza'], 50), photo('b', ['fuerza'], 10), photo('c', ['mtb'])] }
    expect(pickPhoto(bank, { text: 'sentadilla búlgara y fuerza' })?.id).toBe('b')
    expect(pickPhoto(bank, { text: 'ciclistas de ruta' })?.id).toBe('c')
    expect(pickPhoto(bank, { text: 'Hyrox' })).toBeNull()
    expect(pickPhoto({ photos: [] }, { text: 'fuerza' })).toBeNull()
  })
  it('aplica la foto a todo el set salvo Opus Athletic', () => {
    const out = withPhoto([slide({ template: 'metric' }), slide({ template: 'athletic', bgImageId: null })], 'img1')
    expect(out[0]).toMatchObject({ bgImageId: 'img1', bgStyle: 'photo', bgOverlay: 60, bgGradient: true })
    expect(out[1].bgImageId).toBeNull()
  })
})

describe('grilla 3×3', () => {
  const dark: RGB = [12, 14, 20]
  const light: RGB = [235, 230, 220]
  it('luminancia, contraste y distancia de color', () => {
    expect(luminance([255, 255, 255])).toBeCloseTo(1)
    expect(contrastRatio(1, 0)).toBe(21)
    expect(colorDistance(dark, dark)).toBe(0)
    expect(averageColor([10, 20, 30, 255, 30, 40, 50, 255, 0, 0, 0, 0])).toEqual([20, 30, 40])
  })
  it('portada clara en un feed oscuro: se despega pero rompe la paleta', () => {
    const v = gridVerdict(light, [dark, dark, dark, dark])!
    expect(v.standsOut).toBe(true)
    expect(v.harmonious).toBe(false)
  })
  it('portada oscura entre oscuras: armónica pero se pierde', () => {
    const v = gridVerdict([20, 22, 28], [dark, dark, dark])!
    expect(v.standsOut).toBe(false)
    expect(v.harmonious).toBe(true)
    expect(v.notes[0]).toContain('se pierde')
  })
  it('sin posts no opina', () => expect(gridVerdict(dark, [])).toBeNull())
})
