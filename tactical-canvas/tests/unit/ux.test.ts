import { describe, expect, it } from 'vitest'
import { contentFields } from '../../src/lib/templateFields'
import { pickTarget } from '../../src/lib/canvasFocus'
import { normalizeTab } from '../../src/components/PanelTabs'
import { slideCopy } from '../../src/lib/retentionDoctor'
import { DEFAULT_STATE } from '../../src/defaults'
import type { CanvasState, TemplateId } from '../../src/types'

const f = (template: TemplateId, o: Partial<CanvasState> = {}) => contentFields({ template, body: '', dataChips: [], kicker: '', ...o })

describe('formulario contextual por plantilla', () => {
  it('cada plantilla pide sólo sus campos', () => {
    expect(f('statement')).toMatchObject({ body: true, chips: false, kicker: true, kickerActive: false })
    expect(f('metric')).toMatchObject({ body: true, chips: true, kicker: false })
    expect(f('chart')).toMatchObject({ body: true, chips: true })
    expect(f('checklist')).toMatchObject({ body: false, chips: false })
    expect(f('bookmark')).toMatchObject({ body: false, chips: false })
    expect(f('myth')).toMatchObject({ body: false, chips: false })
    expect(f('quote')).toMatchObject({ body: false, chips: false })
  })
  it('el texto heredado que igual se ve en la placa aparece con aviso (nunca queda oculto)', () => {
    expect(f('checklist', { body: 'Bajada vieja', dataChips: ['RIR 1-2'] })).toMatchObject({ body: true, bodyInherited: true, chips: true, chipsInherited: true })
    // Guardado no dibuja la bajada: no hace falta mostrarla. Cita no dibuja cajas.
    expect(f('bookmark', { body: 'x' }).body).toBe(false)
    expect(f('quote', { dataChips: ['RIR 1-2'] }).chips).toBe(false)
    expect(f('statement', { kicker: 'EL MÉTODO NO SE NEGOCIA.' }).kickerActive).toBe(true)
  })
  it('el Doctor no cuenta cajas de datos que la plantilla no dibuja', () => {
    const quote = { ...DEFAULT_STATE, template: 'quote', dataChips: ['RIR 1-2', 'PAUSA 2-3 MIN'] } as CanvasState
    expect(slideCopy(quote).body.join(' ')).not.toContain('RIR')
    expect(slideCopy({ ...quote, template: 'metric' } as CanvasState).body).toContain('RIR 1-2')
  })
})

describe('click-to-focus', () => {
  it('cada parte del lienzo abre su campo', () => {
    expect(pickTarget('titular', 'headline', 'statement')).toEqual(['text', 'headlineA'])
    expect(pickTarget('remate', 'headline', 'statement')).toEqual(['text', 'headlineB'])
    expect(pickTarget('quote-text', 'block', 'quote')).toEqual(['text', 'quoteText'])
    expect(pickTarget('data-chip', 'block', 'metric')).toEqual(['text', 'chips'])
    expect(pickTarget('cite', null, 'metric')).toEqual(['text', 'cite'])
    expect(pickTarget(null, 'block', 'bookmark')).toEqual(['text', 'bookmark'])
    expect(pickTarget(null, null, 'statement')).toEqual(['style', 'bg'])
  })
})

describe('pestañas', () => {
  it('las pestañas viejas guardadas caen en las 3 nuevas', () => {
    expect(['ai', 'services', 'text', 'style', 'export'].map(normalizeTab)).toEqual(['text', 'text', 'text', 'style', 'export'])
  })
})
