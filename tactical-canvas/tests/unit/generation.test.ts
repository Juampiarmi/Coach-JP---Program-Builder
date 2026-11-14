import { describe, expect, it } from 'vitest'
import { parseGeneration } from '../../src/lib/ai'

const PAYLOAD = {
  format: 'carousel',
  caption: 'En resumen, es crucial anotar cada serie.',
  plan: { objetivo: 'ciencia', intencion: 'Explicar la sobrecarga' },
  slides: [
    { templateId: 'sentencia', text: { tagSuperior: 'FUERZA', titleWhite: 'SUMAR SERIES NO ES', titleAccent: 'PROGRESAR.', parrafo: 'Es fundamental subir la carga.' }, datos_clave: ['RIR 1-2', 'pausa 2-3 min', 'entrená duro', '10-20 series/sem', '70-85 % 1RM', 'extra 9'] },
    { templateId: 'metrica', text: { titleWhite: 'LA CARGA', titleAccent: 'MANDA.' }, metrica: { value: '+12%', label: 'fuerza en 8 semanas', accent: 'orange' } },
    { templateId: 'error_correccion', text: { titleWhite: 'EL ERROR', titleAccent: 'DEL DESPEGUE.' }, error_correccion: { wrong: { label: 'INCORRECTO', text: 'Cadera que sube primero' }, right: { label: 'CORRECCIÓN', text: 'Cadera y hombros juntos' } } },
    { templateId: 'mito_fisiologia', text: { titleWhite: 'LAS AGUJETAS', titleAccent: 'NO SON LÁCTICO.' }, mito_fisiologia: { myth: 'El ácido láctico causa agujetas', truth: 'El lactato se recicla en menos de una hora' } },
    { templateId: 'servicio', text: { titleWhite: 'SISTEMA MTB:', titleAccent: 'POTENCIA EN PEDAL.' }, servicio: { mode: 'single', sport: 'mtb', pillars: ['a', 'b', 'c'], cta: "mandá 'mtb' por dm" } },
    { templateId: 'guardado', text: { titleWhite: 'GUARDÁ', titleAccent: 'ESTO.' }, guardado: { points: ['uno', 'dos', 'tres'], cta: 'guardalo' } },
  ],
}

describe('parseo de la respuesta de la IA', () => {
  it('payload completo (snapshot)', () => expect(parseGeneration(PAYLOAD, 'carousel', { discipline: 'general', topic: 'sobrecarga' })).toMatchSnapshot())

  it('cajas de datos: sólo valores con número, máximo 4', () => {
    expect(parseGeneration(PAYLOAD, 'carousel').slides[0].dataChips).toEqual(['RIR 1-2', 'PAUSA 2-3 MIN', '10-20 SERIES/SEM', '70-85 % 1RM'])
  })

  it('blindaje de lenguaje en placas y caption', () => {
    const r = parseGeneration(PAYLOAD, 'carousel')
    expect(r.slides[0].body).toBe('Es clave subir la carga.')
    expect(r.caption).toBe('Es clave anotar cada serie.')
  })

  it('cita pedida: la IA eligió manifiesto → se fuerza la plantilla 14; la frase literal no se toca', () => {
    const q = { author: 'Michael Jordan', reason: 'iconic' as const }
    const forced = parseGeneration({ slides: [{ templateId: 'manifiesto_texto', text: { titleWhite: 'FALLÉ', titleAccent: 'POR ESO GANÉ.' }, manifiesto_texto: { paragraphs: ['a', 'b'] } }] }, 'single', { quote: q })
    expect(forced.slides[0]).toMatchObject({ template: 'quote', quoteAuthor: 'Michael Jordan' })
    const literal = parseGeneration({ slides: [{ templateId: 'cita', text: { titleWhite: 'A', titleAccent: 'B' }, cita: { quote: 'Lo fundamental es invisible a los ojos.', author: 'A. de Saint-Exupéry', source: 'El principito', regla: 'anotá lo crucial' } }] }, 'single', { quote: q })
    expect(literal.slides[0].quoteText).toBe('Lo fundamental es invisible a los ojos.')
    expect(literal.slides[0].quoteRule).toBe('ANOTÁ LO CLAVE')
  })

  it('cita sin fuente y sin pedido explícito → sentencia (defensa contra apócrifas)', () => {
    const r = parseGeneration({ slides: [{ templateId: 'cita', text: { titleWhite: 'A', titleAccent: 'B' }, cita: { quote: 'Frase', author: 'Alguien', source: '' } }] }, 'single', {})
    expect(r.slides[0].template).toBe('statement')
  })
})
