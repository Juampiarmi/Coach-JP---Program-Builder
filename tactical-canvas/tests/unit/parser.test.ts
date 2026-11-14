import { describe, expect, it } from 'vitest'
import { detectStructuredCopy, mapLocally } from '../../src/lib/copyMapping'

const map = (text: string, single = false) => {
  const blocks = detectStructuredCopy(text, { single })
  return blocks ? mapLocally(blocks) : null
}

describe('parser de copy pegado (mapeo fiel)', () => {
  it('corta sólo con separadores explícitos «Placa N»', () => {
    const r = map('Placa 1: EL VOLUMEN NO ES EL OBJETIVO. ES LA HERRAMIENTA.\nPlaca 2: ANOTÁ CADA SERIE. LO QUE NO SE MIDE NO SE AJUSTA.')
    expect(r).toHaveLength(2)
    expect(r!.map((s) => s.template)).toEqual(['statement', 'statement'])
  })

  it('un texto libre sin separadores no es copy (decide la IA)', () => {
    expect(detectStructuredCopy('Sobrecarga progresiva en sentadilla')).toBeNull()
  })

  it('cita clásica «"frase" — Autor, rol» → plantilla 14', () => {
    const [s] = map('"La disciplina es elegir entre lo que querés ahora y lo que más querés." — Abraham Lincoln, presidente')!
    expect(s).toMatchObject({ template: 'quote', quoteAuthor: 'Abraham Lincoln', quoteRole: 'presidente' })
  })

  it('cita con firma en renglón propio + contexto → plantilla 14 (nunca manifiesto)', () => {
    const [s] = map('Kobe Bryant, 5 veces campeón de la NBA\n\nTodo lo negativo es una oportunidad para crecer.\n\nEn tu sistema, una sesión mala es un dato: anotalo y ajustá.')!
    expect(s).toMatchObject({ template: 'quote', quoteAuthor: 'Kobe Bryant', quoteRole: '5 veces campeón de la NBA', quoteText: 'Todo lo negativo es una oportunidad para crecer.' })
    expect(s.body).toBe('En tu sistema, una sesión mala es un dato: anotalo y ajustá.')
  })

  it('«Error: … / Corrección: …» → plantilla 18', () => {
    const [s] = map('EL ERROR QUE TE FRENA\nError: rodillas hacia adentro al subir\nCorrección: empujá el piso hacia afuera')!
    expect(s).toMatchObject({ template: 'fix', fixWrongText: 'Rodillas hacia adentro al subir', fixRightText: 'Empujá el piso hacia afuera' })
  })

  it('«Mito: … / Realidad: …» → plantilla 21', () => {
    const [s] = map('LAS AGUJETAS\nMito: son ácido láctico acumulado\nRealidad: el lactato se recicla en menos de una hora')!
    expect(s).toMatchObject({ template: 'myth', mythText: 'Son ácido láctico acumulado', truthText: 'El lactato se recicla en menos de una hora' })
  })

  it('renglones de rutina «A1 …» → plantilla 17', () => {
    const [s] = map('FUERZA DÍA A\nA1 Sentadilla trasera 4x5 RIR 2 3:00\nB1 Peso muerto rumano 3x8 RIR 2 2:00\nB2 Estocada 3x10 RIR 3 1:30')!
    expect(s.template).toBe('workout')
    expect(s.workoutRows?.map((r) => r.code)).toEqual(['A1', 'B1', 'B2'])
  })

  it('bloques numerados «00001:» → plantilla Opus', () => {
    const [s] = map('EL ESTÁNDAR NO NEGOCIA\n00001: Entrenás aunque el día no acompañe.\n00002: Registrás la carga, no la sensación.')!
    expect(s.template).toBe('opus')
    expect(s.opusBlocks).toHaveLength(2)
  })

  it('[ 1 PLACA ] forzado junta todo en una sola placa', () => {
    expect(map('Placa 1: UNO DOS.\nPlaca 2: TRES CUATRO.', true)).toHaveLength(1)
  })
})
