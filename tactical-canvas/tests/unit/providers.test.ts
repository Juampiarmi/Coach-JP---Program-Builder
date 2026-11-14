import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AI_SETTINGS, generateContent, type AiProvider, type AiSettings } from '../../src/lib/ai'

const ANSWER = { format: 'single', caption: 'c', slides: [{ templateId: 'sentencia', text: { titleWhite: 'LA CARGA', titleAccent: 'MANDA.', parrafo: 'p' } }] }
const RESPONSE: Record<AiProvider, unknown> = {
  anthropic: { content: [{ type: 'text', text: JSON.stringify(ANSWER) }] },
  openai: { choices: [{ message: { content: JSON.stringify(ANSWER) } }] },
  gemini: { candidates: [{ content: { parts: [{ text: JSON.stringify(ANSWER) }] } }] },
}

afterEach(() => vi.unstubAllGlobals())

describe('clientes de proveedor (request exacto: snapshot)', () => {
  for (const provider of ['anthropic', 'openai', 'gemini'] as AiProvider[]) {
    it(provider, async () => {
      const calls: { url: string; headers: unknown; body: unknown }[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
          calls.push({ url: String(url).replace(/key=[^&]+/, 'key=KEY'), headers: init.headers, body: JSON.parse(String(init.body)) })
          return new Response(JSON.stringify(RESPONSE[provider]), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }),
      )
      const settings: AiSettings = { ...DEFAULT_AI_SETTINGS, provider, keys: { ...DEFAULT_AI_SETTINGS.keys, [provider]: 'KEY' } }
      const r = await generateContent(settings, 'sobrecarga progresiva', 'single', 'general')
      expect(r.slides[0]).toMatchObject({ headlineA: 'LA CARGA', headlineB: 'MANDA.' })
      expect(calls).toMatchSnapshot()
    })
  }
})
