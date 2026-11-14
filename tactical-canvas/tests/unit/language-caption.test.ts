import { describe, expect, it } from 'vitest'
import { aiTells, deAI } from '../../src/lib/language'
import { formatInstagramCaption, tacticalHashtags } from '../../src/lib/captionFormat'

describe('blindaje de lenguaje', () => {
  it.each([
    ['Es CRUCIAL registrar la carga.', 'Es CLAVE registrar la carga.'],
    ['La tensión es fundamental y desencadena adaptaciones.', 'La tensión es clave y dispara adaptaciones.'],
    ['En resumen, anotá cada serie.', 'Anotá cada serie.'],
    ['Descubre el método revolucionario de fuerza.', 'Mirá el método de fuerza.'],
  ])('%s', (src, out) => expect(deAI(src)).toBe(out))

  it('los ganchos gastados se marcan para reescribir (sin reemplazo automático)', () => {
    expect(aiTells('Estás entrenando mal').map((t) => t.fixable)).toEqual([false])
  })
})

describe('caption de Instagram', () => {
  it('gancho en mayúsculas, viñetas ▸, CTA y 6-8 hashtags', () => {
    const out = formatInstagramCaption('el bombeo no es progreso\n- carga registrada\n* reps que suben\n\n\nla tensión manda', [])
    const lines = out.split('\n')
    expect(lines[0]).toBe('EL BOMBEO NO ES PROGRESO')
    expect(out).toContain('▸ carga registrada')
    expect(out).toContain('Guardalo para tu próxima sesión')
    const tags = lines[lines.length - 1].split(' ')
    expect(tags.length).toBeGreaterThanOrEqual(6)
    expect(tags.length).toBeLessThanOrEqual(8)
  })
  it('hashtags por tema', () => expect(tacticalHashtags('sesión de MTB con potencia en subida')).toEqual(expect.arrayContaining(['#CoachJP', '#MTB'])))
})
