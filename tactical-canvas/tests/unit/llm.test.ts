import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAiCache, DEFAULT_AI_SETTINGS, generateContent, generateOffline, localHooks, resetQuotaMemory, RateLimitError, type AiSettings } from '../../src/lib/ai'
import { buildUserPrompt, SYSTEM_PROMPT, TOOL_SYSTEM, VOICE_SHOTS, templatesFor } from '../../src/lib/ai/prompts'
import { siblingModel, thinkingFor } from '../../src/lib/ai/providers'
import { relevantPapers, type OwnPaper } from '../../src/lib/paperLibrary'

const ANSWER = { format: 'single', caption: 'c', slides: [{ templateId: 'sentencia', text: { titleWhite: 'LA CARGA', titleAccent: 'MANDA.', parrafo: 'p' } }] }
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
const gemini = (model = 'gemini-2.5-flash'): AiSettings => ({ ...DEFAULT_AI_SETTINGS, provider: 'gemini', keys: { ...DEFAULT_AI_SETTINGS.keys, gemini: 'KEY' }, models: { ...DEFAULT_AI_SETTINGS.models, gemini: model } })
const okGemini = () => json({ candidates: [{ content: { parts: [{ text: JSON.stringify(ANSWER) }] } }] })
const quota = (msg: string, quotaId: string) => json({ error: { message: msg, details: [{ violations: [{ quotaId }] }, { retryDelay: '1s' }] } }, 429)

beforeEach(() => {
  clearAiCache()
  resetQuotaMemory()
})
afterEach(() => vi.unstubAllGlobals())

describe('prompt compacto y voz por ejemplos', () => {
  it('el system prompt entra en ~600 tokens (≤ 2150 caracteres) y trae los few-shot', () => {
    expect(SYSTEM_PROMPT.length).toBeLessThanOrEqual(2150)
    expect(SYSTEM_PROMPT).toContain(VOICE_SHOTS)
    expect(SYSTEM_PROMPT).toContain('Si hace 4 meses movés los mismos kilos para las mismas reps')
    expect(SYSTEM_PROMPT).toContain('fatiga basura')
    expect(SYSTEM_PROMPT).toMatch(/Prohibido introducir/)
    expect(TOOL_SYSTEM.length).toBeLessThanOrEqual(1200)
  })
  it('el pedido sólo trae las plantillas que puede usar', () => {
    const science = buildUserPrompt('tensión mecánica', 'carousel', 'sports', { inputMode: 'concept', goal: 'science', tone: 'viral' })
    expect(science).toContain('"athletic": placa editorial')
    expect(science).not.toContain('"servicio"')
    expect(science).not.toContain('"repeticion"')
    expect(templatesFor('sales', 'carousel', { inputMode: 'concept', goal: 'sales', tone: 'viral' })).toEqual(['sentencia', 'ab', 'pipeline', 'checklist', 'servicio', 'guardado'])
    expect(templatesFor('science', 'carousel', { inputMode: 'concept', goal: 'science', tone: 'viral', pillar: 'workout' })).toEqual(['rutina'])
  })
  it('sólo los 3 papers más relevantes al tema', () => {
    const p = (id: string, title: string, year = 2020): OwnPaper => ({ id, title, authors: 'X', year, journal: 'J', finding: '' })
    const lib = [p('a', 'Sleep and recovery in athletes'), p('b', 'Muscle hypertrophy and mechanical tension'), p('c', 'Protein intake'), p('d', 'Hypertrophy with low loads', 2022), p('e', 'Cycling economy')]
    expect(relevantPapers(lib, 'hipertrofia y tensión mecánica').map((x) => x.id).slice(0, 2)).toEqual(['b', 'd'])
    expect(relevantPapers(lib, 'x')).toHaveLength(3)
  })
})

describe('caché por hash del pedido', () => {
  it('el mismo pedido no vuelve a la API', async () => {
    const f = vi.fn(async () => okGemini())
    vi.stubGlobal('fetch', f)
    const statuses: (string | null)[] = []
    const a = await generateContent(gemini(), 'sobrecarga', 'single', 'general')
    const b = await generateContent(gemini(), 'sobrecarga', 'single', 'general', undefined, (s) => statuses.push(s))
    expect(f).toHaveBeenCalledTimes(1)
    expect(b).toEqual(a)
    expect(statuses[0]).toContain('caché (0 tokens)')
    await generateContent(gemini(), 'otra cosa', 'single', 'general')
    expect(f).toHaveBeenCalledTimes(2)
    clearAiCache()
    await generateContent(gemini(), 'sobrecarga', 'single', 'general')
    expect(f).toHaveBeenCalledTimes(3)
  })
  it('una respuesta que no es JSON no se cachea', async () => {
    const f = vi.fn().mockResolvedValueOnce(json({ candidates: [{ content: { parts: [{ text: 'no es json' }] } }] })).mockImplementation(async () => okGemini())
    vi.stubGlobal('fetch', f)
    await generateContent(gemini(), 'tema', 'single', 'general') // repara con un segundo pedido
    await generateContent(gemini(), 'tema', 'single', 'general')
    expect(f).toHaveBeenCalledTimes(3)
  })
})

describe('cuota: límite por minuto vs diaria', () => {
  it('Gemini: 429 por minuto → prueba Flash-Lite, sin razonamiento caro', async () => {
    const urls: string[] = []
    const bodies: { generationConfig: Record<string, unknown> }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        urls.push(String(url))
        bodies.push(JSON.parse(String(init.body)))
        return urls.length === 1 ? quota('Quota exceeded per minute', 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier') : okGemini()
      }),
    )
    const statuses: (string | null)[] = []
    const r = await generateContent(gemini(), 'sobrecarga', 'single', 'general', undefined, (s) => statuses.push(s))
    expect(r.slides[0].headlineA).toBe('LA CARGA')
    expect(urls[1]).toContain('/models/gemini-2.5-flash-lite:generateContent')
    expect(bodies[0].generationConfig).toMatchObject({ maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } })
    expect(statuses.some((s) => s?.includes('Límite por minuto de gemini-2.5-flash · probando gemini-2.5-flash-lite'))).toBe(true)
  })
  it('Gemini: los dos modelos con límite por minuto → espera visible y reintenta', async () => {
    let n = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/models?')) return json({ models: [] })
        n++
        return n <= 2 ? quota('Quota exceeded per minute', 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier') : okGemini()
      }),
    )
    const statuses: (string | null)[] = []
    const r = await generateContent(gemini(), 'tema', 'single', 'general', undefined, (s) => statuses.push(s))
    expect(r.slides).toHaveLength(1)
    expect(statuses).toContain('[ Límite por minuto alcanzado, reintentando en 1 s... ]')
  })
  it('Gemini: cuota diaria en los dos → error claro sin quemar pedidos en Pro', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(String(url))
        if (String(url).includes('/models?')) return json({ models: [{ name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] }] })
        return quota('Quota exceeded per day', 'GenerateRequestsPerDayPerProjectPerModel-FreeTier')
      }),
    )
    const err = await generateContent(gemini(), 'tema', 'single', 'general').catch((e) => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect((err as RateLimitError).kind).toBe('daily')
    expect(urls.filter((u) => u.includes(':generateContent'))).toHaveLength(2)
    expect(urls.some((u) => u.includes('gemini-2.5-pro:generateContent'))).toBe(false)
  })
  it('OpenAI: 429 por minuto → cuenta regresiva y reintento', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ error: { message: 'Rate limit reached for requests per minute (RPM)' } }, 429, { 'retry-after': '1' }))
      .mockImplementation(async () => json({ choices: [{ message: { content: JSON.stringify(ANSWER) } }] }))
    vi.stubGlobal('fetch', f)
    const statuses: (string | null)[] = []
    const settings: AiSettings = { ...DEFAULT_AI_SETTINGS, provider: 'openai', keys: { ...DEFAULT_AI_SETTINGS.keys, openai: 'KEY' } }
    await generateContent(settings, 'tema', 'single', 'general', undefined, (s) => statuses.push(s))
    expect(f).toHaveBeenCalledTimes(2)
    expect(statuses).toContain('[ Límite por minuto alcanzado, reintentando en 1 s... ]')
  })
  it('modelo hermano y razonamiento por versión', () => {
    expect(siblingModel('gemini-2.5-flash')).toBe('gemini-2.5-flash-lite')
    expect(siblingModel('gemini-2.5-flash-lite')).toBe('gemini-2.5-flash')
    expect(siblingModel('gemini-3.8-flash')).toBe('gemini-3.8-flash-lite')
    expect(thinkingFor('gemini-2.5-flash-lite')).toEqual({ thinkingBudget: 0 })
    expect(thinkingFor('gemini-3.8-flash')).toEqual({ thinkingLevel: 'low' })
    expect(thinkingFor('gemini-2.5-pro')).toBeNull()
  })
  it('si el modelo rechaza la config de razonamiento, se reintenta sin ella', async () => {
    const bodies: { generationConfig: Record<string, unknown> }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)))
        return bodies.length === 1 ? json({ error: { message: 'Thinking level is not supported for this model.' } }, 400) : okGemini()
      }),
    )
    await generateContent(gemini('gemini-3.9-flash'), 'tema', 'single', 'general')
    expect(bodies[0].generationConfig.thinkingConfig).toBeDefined()
    expect(bodies[1].generationConfig.thinkingConfig).toBeUndefined()
  })
})

describe('modo sin API', () => {
  const paper: OwnPaper = { id: 'a', title: 'Mechanisms of muscle hypertrophy', authors: 'Schoenfeld BJ', year: 2010, journal: 'J Strength Cond Res', finding: 'La tensión mecánica es el estímulo central.' }
  it('carrusel de ciencia con la Biblioteca de Papers y cierre de guardado', () => {
    const r = generateOffline('hipertrofia y tensión mecánica', 'carousel', 'sports', undefined, [paper], 0)
    expect(r.format).toBe('carousel')
    expect(r.slides).toHaveLength(5)
    expect(r.slides[0].template).toBe('statement')
    expect(r.slides.at(-1)?.template).toBe('bookmark')
    expect(r.slides.find((s) => s.citeMain)?.citeMain).toBe('SCHOENFELD, 2010 · J STRENGTH COND RES')
    expect(r.caption).toContain('▸ ')
    expect(JSON.stringify(r.slides)).not.toMatch(/crucial|fundamental|desencaden/i)
  })
  it('cada clic rota la variante; 1 placa, historias y venta', () => {
    const a = generateOffline('sobrecarga progresiva', 'carousel', 'sports', undefined, [], 0)
    const b = generateOffline('sobrecarga progresiva', 'carousel', 'sports', undefined, [], 1)
    expect(a.slides[0].headlineA).not.toBe(b.slides[0].headlineA)
    expect(a.slides.map((s) => s.template)).not.toEqual(b.slides.map((s) => s.template))
    expect(generateOffline('sobrecarga', 'single', 'general', undefined, [], 0).slides).toHaveLength(1)
    expect(generateOffline('sobrecarga', 'stories', 'general', undefined, [], 0).slides).toHaveLength(3)
    expect(generateOffline('quiero vender mi servicio de coaching', 'carousel', 'general', undefined, [], 0).plan?.goal).toBe('venta')
    expect(localHooks('sentadilla').map((h) => h.angle)).toEqual(['contrarian', 'military', 'science'])
  })
})
