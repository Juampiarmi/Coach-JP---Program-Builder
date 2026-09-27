/** Modelo de Gemini detectado para la key del usuario. */
export interface GeminiModel {
  id: string
  label: string
}

/** Variantes que no sirven para generar texto/JSON (voz, imagen, embeddings, etc.). */
const EXCLUDE = /tts|image|audio|live|embedding|aqa|learnlm|gemma|veo|imagen|robotics|computer-use|native|thinking-exp|vision/i

interface Parsed {
  version: number
  family: 'flash' | 'flash-lite' | 'pro'
  stable: boolean
  alias: boolean
}

/** gemini-3.8-flash · gemini-3.8-flash-lite · gemini-2.5-pro-preview-06-05 · gemini-flash-latest … */
function parse(id: string): Parsed | null {
  const alias = id.match(/^gemini-(flash-lite|flash|pro)-latest$/)
  if (alias) return { version: 0, family: alias[1] as Parsed['family'], stable: true, alias: true }
  const m = id.match(/^gemini-(\d+(?:\.\d+)?)-(flash-lite|flash|pro)(.*)$/)
  if (!m) return null
  const rest = m[3]
  // Estable: sin sufijo, "-latest" o número de revisión ("-001"). Preview / exp quedan detrás.
  const stable = rest === '' || rest === '-latest' || /^-\d{3}$/.test(rest)
  return { version: Number(m[1]), family: m[2] as Parsed['family'], stable, alias: false }
}

const FAMILY_ORDER = { flash: 0, 'flash-lite': 1, pro: 2 } as const

/** Orden del selector: estables primero, versión más nueva primero, Flash > Flash-Lite > Pro. */
function compare(a: GeminiModel, b: GeminiModel) {
  const pa = parse(a.id)!
  const pb = parse(b.id)!
  if (pa.stable !== pb.stable) return pa.stable ? -1 : 1
  if (pa.alias !== pb.alias) return pa.alias ? 1 : -1
  if (pa.version !== pb.version) return pb.version - pa.version
  if (pa.family !== pb.family) return FAMILY_ORDER[pa.family] - FAMILY_ORDER[pb.family]
  return a.id.localeCompare(b.id)
}

/** GET v1beta/models: modelos que soportan generateContent para esta key (sigue la paginación). */
export async function listGeminiModels(apiKey: string, signal?: AbortSignal): Promise<GeminiModel[]> {
  const found = new Map<string, GeminiModel>()
  let pageToken = ''
  for (let page = 0; page < 5; page++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url, { signal })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error?.message ?? `Google respondió ${res.status} al listar modelos`)
    const models: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[] = json?.models ?? []
    for (const m of models) {
      const id = String(m.name ?? '').replace(/^models\//, '')
      if (!m.supportedGenerationMethods?.includes('generateContent')) continue
      if (!/flash|pro/.test(id) || EXCLUDE.test(id) || !parse(id)) continue
      found.set(id, { id, label: m.displayName ? `${m.displayName} · ${id}` : id })
    }
    pageToken = json?.nextPageToken ?? ''
    if (!pageToken) break
  }
  return [...found.values()].sort(compare)
}

/** Preferido: el Flash (no Lite) estable más moderno; si no hay, el primero de la lista ordenada. */
export function preferredGeminiModel(models: GeminiModel[]): string | null {
  if (!models.length) return null
  const flash = models.filter((m) => {
    const p = parse(m.id)
    return p && p.family === 'flash' && p.stable && !p.alias
  })
  return (flash[0] ?? models.find((m) => parse(m.id)?.family === 'flash') ?? models[0]).id
}
