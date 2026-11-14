import { describe, expect, it } from 'vitest'
import { buildUserPrompt, EVIDENCE_RULE, resolveFormat, SYSTEM_PROMPT, type EditorialOptions } from '../../src/lib/ai'
import { detectQuoteIntent } from '../../src/lib/quoteIntent'

const ed = (o: Partial<EditorialOptions> = {}): EditorialOptions => ({ inputMode: 'concept', goal: 'auto', tone: 'viral', ...o })

describe('prompts (snapshots: cualquier cambio de texto tiene que ser intencional)', () => {
  it('system prompt', () => expect(SYSTEM_PROMPT).toMatchSnapshot())
  it('regla evidencia → aplicación', () => expect(EVIDENCE_RULE).toMatchSnapshot())
  const cases: [string, string, Parameters<typeof buildUserPrompt>[1], EditorialOptions][] = [
    ['ciencia académica', 'Hipertrofia y tensión mecánica', 'carousel', ed({ goal: 'science', tone: 'academic' })],
    ['venta con brief', 'Creá un carrusel publicitando mis servicios online y presencial para captar alumnos', 'auto', ed({ inputMode: 'brief', goal: 'sales' })],
    ['mindset breve', 'disciplina', 'single', ed({ goal: 'mindset' })],
    ['paper nombrado', 'Qué dice el paper de Plotkin sobre progresar reps', 'single', ed({ goal: 'mindset' })],
    ['pilar rutina', 'Fuerza para MTB', 'single', ed({ pillar: 'workout' })],
    ['cita detectada', 'Kobe Bryant y la mentalidad', 'single', ed({ quote: detectQuoteIntent('Kobe Bryant y la mentalidad') })],
    ['cita sin autor', 'frase sobre constancia', 'single', ed({ quote: { author: '', reason: 'explicit' } })],
  ]
  for (const [name, topic, mode, opts] of cases) it(`user prompt · ${name}`, () => expect(buildUserPrompt(topic, mode, 'general', opts)).toMatchSnapshot())
})

describe('formato efectivo', () => {
  it('cita en AUTO → 1 placa, aunque el tono sea académico', () => expect(resolveFormat('Michael Jordan y el fracaso', 'auto', ed({ tone: 'academic', quote: { author: 'Michael Jordan', reason: 'iconic' } }))).toBe('single'))
  it('ciencia en AUTO → carrusel', () => expect(resolveFormat('qué es la sobrecarga', 'auto', ed({ goal: 'science' }))).toBe('carousel'))
  it('el formato elegido a mano se respeta', () => expect(resolveFormat('qué es la sobrecarga', 'stories', ed({ goal: 'science' }))).toBe('stories'))
})
