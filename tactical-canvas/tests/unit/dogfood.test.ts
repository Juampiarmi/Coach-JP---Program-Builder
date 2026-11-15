import { describe, expect, it } from 'vitest'
import { isValidElement, type ReactElement } from 'react'
import { isolateRemate } from '../../src/components/canvas/Headline'
import { keepRanges } from '../../src/components/canvas/KeepRanges'
import { importLibrary } from '../../src/lib/projects'
import { DEFAULT_STATE } from '../../src/defaults'
import { diagnose } from '../../src/lib/retentionDoctor'
import type { CanvasState } from '../../src/types'

describe('titular · palabras funcionales al final', () => {
  it('pasan al remate cuando quedan colgando', () => {
    expect(isolateRemate('MÁS FALLO NO ES', 'MÁS MÚSCULO.')).toEqual(['MÁS FALLO', 'NO ES MÁS MÚSCULO.'])
  })
  it('una palabra con puntuación final cierra la idea y se queda («TIER A:»)', () => {
    expect(isolateRemate('TIER A:', 'LO QUE SÍ FUNCIONA.')).toEqual(['TIER A:', 'LO QUE SÍ FUNCIONA.'])
    expect(isolateRemate('ESTO NO ES.', 'ES OTRA COSA.')).toEqual(['ESTO NO ES.', 'ES OTRA COSA.'])
  })
})

describe('rangos numéricos sin corte', () => {
  const nowrapParts = (n: unknown) =>
    (Array.isArray(n) ? n : [n]).filter((x): x is ReactElement<{ style?: { whiteSpace?: string }; children?: string }> => isValidElement(x) && (x.props as { style?: { whiteSpace?: string } }).style?.whiteSpace === 'nowrap').map((x) => x.props.children)
  it('envuelve los rangos y deja el resto igual', () => {
    expect(nowrapParts(keepRanges('Beta-alanina: 4-6 g/día, 2-4 semanas'))).toEqual(['4-6', '2-4'])
    expect(nowrapParts(keepRanges('Proteína 1,8-2,2 g/kg y 80–90 % 1RM'))).toEqual(['1,8-2,2', '80–90 %'])
    expect(keepRanges('Sin rangos acá')).toBe('Sin rangos acá')
  })
})

describe('respaldo v3', () => {
  it('importa también la Biblioteca de Papers (y acepta respaldos sin papers)', async () => {
    const project = { id: 'x', name: 'Set', deck: { slides: [DEFAULT_STATE], active: 0 }, createdAt: 1, updatedAt: 1 }
    const paper = { id: 'p', title: 'T', authors: 'Kerksick CM', year: 2018, journal: 'J Int Soc Sports Nutr', finding: 'f' }
    const v3 = await importLibrary(JSON.stringify({ app: 'jp-tactical-canvas/projects', version: 3, projects: [project], papers: [paper, { nope: 1 }], images: {} }))
    expect(v3.projects).toHaveLength(1)
    expect(v3.papers).toEqual([paper])
    const v2 = await importLibrary(JSON.stringify({ app: 'jp-tactical-canvas/projects', version: 2, projects: [project], images: {} }))
    expect(v2.papers).toEqual([])
  })
})

describe('doctor · portada densa explica qué cuenta', () => {
  it('desglosa titular y resto, y avisa del remate de la barra naranja', () => {
    const cover = { ...DEFAULT_STATE, template: 'statement', headlineA: 'UNO DOS', headlineB: 'TRES', body: 'a b c d e f g h i j k l m n o p q r s t', kicker: 'REMATE OCULTO' } as CanvasState
    const f = diagnose([cover, { ...DEFAULT_STATE } as CanvasState], () => null).findings.find((x) => x.id === 'cover-0')
    expect(f?.detail).toContain('Cuenta: titular 3 + resto 22 (incluye el remate de la barra naranja).')
  })
})
