/**
 * IA · clientes de proveedor: Anthropic, OpenAI y Gemini (BYOK, directo desde el navegador), con
 * manejo de cuotas (429), saturación y cambio automático de modelo en Gemini.
 */
import { listGeminiModels, preferredGeminiModel, type GeminiModel } from '../geminiModels'
import { safeParseJson } from '../safeJson'
import { GEMINI_DEFAULT_MODEL, type StatusFn, type ModelChangeFn } from './config'
import { SYSTEM_PROMPT, COMPACT_SYSTEM_PROMPT } from './prompts'

// ---------------------------------------------------------------------------

export async function callOpenAI(key: string, model: string, user: string, signal?: AbortSignal, system: string = SYSTEM_PROMPT) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Rate limit')
  if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI respondió ${res.status}`)
  return String(json?.choices?.[0]?.message?.content ?? '')
}

export async function callAnthropic(key: string, model: string, user: string, signal?: AbortSignal, system: string = SYSTEM_PROMPT) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      // La app corre 100% en el navegador con la key del propio usuario (BYOK).
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 12000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Rate limit')
  if (!res.ok) throw new Error(json?.error?.message ?? `Anthropic respondió ${res.status}`)
  const blocks: { type: string; text?: string }[] = json?.content ?? []
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Tipo de límite detrás de un 429. */
export type QuotaKind = 'minute' | 'daily' | 'zero' | 'unknown'

/** Cuota agotada (429): tipo de límite, modelo y segundos sugeridos de espera. */
export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSec: number,
    readonly kind: QuotaKind = 'unknown',
    readonly model = '',
  ) {
    super(message)
  }
}

export const DEFAULT_RATE_WAIT_SEC = 30

export type QuotaDetail = { retryDelay?: string; violations?: { quotaId?: string; quotaMetric?: string; quotaValue?: string }[] }

/**
 * Segundos de espera que indica el proveedor ante un 429:
 * RetryInfo.retryDelay ("31s") de Google, "retry in 31.2s" en el mensaje o el header Retry-After.
 */
export function retryAfterSeconds(res: Response, details: QuotaDetail[], message: string) {
  const fromDetails = details.map((d) => d?.retryDelay).find(Boolean)
  const candidates = [
    fromDetails && parseFloat(fromDetails),
    parseFloat(message.match(/retry (?:in|after) ([\d.]+)\s*s/i)?.[1] ?? ''),
    parseFloat(res.headers.get('retry-after') ?? ''),
  ]
  const sec = candidates.find((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
  return Math.min(600, Math.ceil(sec ?? DEFAULT_RATE_WAIT_SEC))
}

/**
 * Clasifica el 429 con QuotaFailure.violations[].quotaId de Google
 * (…PerMinute… = RPM, …PerDay… = RPD) y, si no viene, con el texto del mensaje.
 * "limit: 0" = el modelo no tiene cuota gratuita para esta key.
 */
export function quotaKind(details: QuotaDetail[], message: string): QuotaKind {
  const violations = details.flatMap((d) => d?.violations ?? [])
  const ids = violations.map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`).join(' ')
  const text = `${ids} ${message}`
  if (/limit:\s*0\b/i.test(message) || violations.some((v) => v.quotaValue === '0')) return 'zero'
  if (/per ?day|daily|PerDay/i.test(text)) return 'daily'
  if (/per ?minute|PerMinute|rpm|tpm/i.test(text)) return 'minute'
  return 'unknown'
}

export function rateLimitError(res: Response, json: unknown, message: string, model = '') {
  const details = ((json as { error?: { details?: QuotaDetail[] } })?.error?.details ?? []) as QuotaDetail[]
  return new RateLimitError(message, retryAfterSeconds(res, details, message), quotaKind(details, message), model)
}

/**
 * Memoria de la sesión: modelos con cuota agotada. Los diarios / sin cuota se saltean hasta
 * recargar la página o forzar el reintento; los por-minuto, hasta que vence su espera.
 */
export const exhausted = new Map<string, { kind: QuotaKind; until: number }>()

export function markExhausted(err: RateLimitError) {
  const long = err.kind === 'daily' || err.kind === 'zero'
  exhausted.set(err.model, { kind: err.kind, until: long ? Infinity : Date.now() + err.retryAfterSec * 1000 })
}

export function isExhausted(model: string) {
  const e = exhausted.get(model)
  if (!e) return false
  if (e.until <= Date.now()) {
    exhausted.delete(model)
    return false
  }
  return true
}

/** REINTENTAR FORZADO: olvida los modelos marcados como agotados. */
export function resetQuotaMemory() {
  exhausted.clear()
}

export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Cancelado', 'AbortError'))
    })
  })

/** Espera máxima que se aguanta en pantalla antes de devolver el error (más que esto, mejor avisar). */
export const MAX_VISIBLE_WAIT_SEC = 60
/** Reintentos tras esperar un límite por minuto. */
export const RATE_RETRIES = 2

/** Espera con cuenta regresiva visible: «Límite por minuto alcanzado, reintentando en 8 s...». */
export async function countdown(seconds: number, signal?: AbortSignal, onStatus?: StatusFn, what = 'Límite por minuto alcanzado') {
  for (let left = Math.max(1, Math.ceil(seconds)); left > 0; left--) {
    onStatus?.(`[ ${what}, reintentando en ${left} s... ]`)
    await sleep(1000, signal)
  }
  onStatus?.('[ Reintentando... ]')
}

/** ¿Este 429 se arregla esperando? Sólo el límite por minuto (o sin clasificar) con una espera corta. */
export const isShortRateLimit = (err: unknown): err is RateLimitError =>
  err instanceof RateLimitError && (err.kind === 'minute' || err.kind === 'unknown') && err.retryAfterSec <= MAX_VISIBLE_WAIT_SEC

/**
 * Backoff para OpenAI / Anthropic: ante un límite por minuto espera lo que indica el proveedor (con
 * cuenta regresiva) y reintenta, hasta 2 veces. La cuota diaria o «límite 0» se informa directo.
 */
export async function withBackoff<T>(run: () => Promise<T>, signal?: AbortSignal, onStatus?: StatusFn): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run()
    } catch (err) {
      if (!isShortRateLimit(err) || attempt >= RATE_RETRIES) throw err
      await countdown(err.retryAfterSec, signal, onStatus)
    }
  }
}

/** Saturación temporal del servicio (503 / "high demand"): se reintenta el mismo modelo. */
export function isOverloaded(err: unknown) {
  if (!(err instanceof HttpError)) return false
  if (err.status === 503) return true
  return /high demand|spikes in demand|overloaded/i.test(err.message)
}

/** Modelos que rechazaron la configuración de razonamiento (se manda sin ella desde entonces). */
const noThinking = new Set<string>()

/**
 * Razonamiento interno al mínimo: en Flash, los tokens de «thinking» se cobran como salida y queman la
 * cuota sin mejorar un copy corto. 2.5 Flash / Flash-Lite: presupuesto 0; 3.x Flash: nivel bajo. Pro no
 * permite apagarlo (se deja como viene).
 */
export function thinkingFor(model: string): Record<string, unknown> | null {
  if (noThinking.has(model) || /pro/.test(model)) return null
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 }
  if (/^gemini-([3-9]|\d{2,})(\.\d+)?-flash/.test(model)) return { thinkingLevel: 'low' }
  return null
}

/** Tope de salida: el payload ya no trae todas las plantillas por placa, alcanza con 8k. */
export const GEMINI_MAX_OUTPUT = 8192

export async function requestGemini(key: string, model: string, prompt: string, signal?: AbortSignal, schema?: object): Promise<string> {
  const apiKey = key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const thinking = thinkingFor(model)
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: GEMINI_MAX_OUTPUT,
        ...(thinking ? { thinkingConfig: thinking } : {}),
        // Structured Outputs: Gemini valida la respuesta contra el esquema (OpenAPI subset).
        ...(schema ? { responseSchema: schema } : {}),
      },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Quota exceeded', model)
  // El modelo no acepta la configuración de razonamiento: se recuerda y se reintenta sin ella.
  if (res.status === 400 && thinking && /thinking/i.test(json?.error?.message ?? '')) {
    noThinking.add(model)
    return requestGemini(key, model, prompt, signal, schema)
  }
  if (!res.ok) throw new HttpError(json?.error?.message ?? `Gemini respondió ${res.status}`, res.status)
  const cand = json?.candidates?.[0]
  if (!cand?.content) throw new Error(`Gemini no devolvió contenido${cand?.finishReason ? ` (${cand.finishReason})` : ''}.`)
  const parts: { text?: string; thought?: boolean }[] = cand.content.parts ?? []
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
  if (cand.finishReason === 'MAX_TOKENS') {
    try {
      extractJson(text)
    } catch {
      throw new Error('La respuesta de Gemini se cortó por largo. Probá con 1 placa o un tema más acotado.')
    }
  }
  return text
}

export const OVERLOAD_FINAL_MSG =
  'El servidor de Google está recibiendo alto tráfico en este instante. Esperá 15-30 segundos y volvé a presionar Generar.'
/** Esperas antes de cada reintento con el MISMO modelo (3 intentos en total). */
export const OVERLOAD_WAITS_MS = [2500, 4000]

/** Flash ↔ Flash-Lite de la misma versión («gemini-2.5-flash» ↔ «gemini-2.5-flash-lite»). */
export function siblingModel(model: string): string | null {
  if (/-flash-lite(\b|-)/.test(model)) return model.replace(/-flash-lite/, '-flash')
  if (/-flash(\b|-)/.test(model)) return model.replace(/-flash/, '-flash-lite')
  if (/-pro(\b|-)/.test(model)) return model.replace(/-pro.*$/, '-flash')
  return null
}

/** Modelo inexistente o no habilitado para esta key. */
export function isModelGone(err: unknown) {
  if (!(err instanceof HttpError)) return false
  return err.status === 404 || err.status === 410 || /not found|no longer available|not supported/i.test(err.message)
}

/**
 * Llamada a Gemini:
 * - Saturación (503 / "experiencing high demand"): espera 2,5 s y reintenta el mismo modelo;
 *   luego espera 4 s y reintenta. Tras 3 intentos, mensaje claro para el usuario.
 * - Modelo inexistente para esta key: consulta ListModels una vez, elige el Flash más
 *   moderno disponible, lo guarda y reintenta con él.
 */
export async function callGemini(
  key: string,
  model: string,
  user: string,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
  known: GeminiModel[] = [],
  system: string = COMPACT_SYSTEM_PROMPT,
  schema?: object,
) {
  // Un solo turno con el prompt completo (sistema + pedido), sin espacios redundantes.
  const prompt = `${system}\n\n${user}`
  const selected = model.trim() || GEMINI_DEFAULT_MODEL
  let current = selected
  let retries = 0
  let redetected = false
  let switches = 0
  let candidates = known
  let lastQuota: RateLimitError | null = null

  /**
   * Modelo de respaldo ante un 429: primero el hermano de la misma versión (Flash ↔ Flash-Lite, cada
   * uno con cuota propia); si no, otro Flash habilitado. Nunca Pro (sin cuota gratuita en casi todas
   * las keys: cada intento quemaba un pedido más).
   */
  const fallbackModel = async (): Promise<string | null> => {
    const sibling = siblingModel(current)
    if (sibling && !isExhausted(sibling) && sibling !== current && (!candidates.length || candidates.some((m) => m.id === sibling))) return sibling
    if (!candidates.length) candidates = await listGeminiModels(key, signal).catch(() => [] as GeminiModel[])
    return candidates.find((m) => m.id !== current && /flash/.test(m.id) && !/pro/.test(m.id) && !isExhausted(m.id))?.id ?? (sibling && !isExhausted(sibling) ? sibling : null)
  }

  // Si el modelo elegido ya agotó su cuota en esta sesión, se arranca directo con el respaldo.
  if (isExhausted(current)) {
    const alt = await fallbackModel()
    if (alt) current = alt
  }
  let waits = 0

  for (;;) {
    try {
      const text = await requestGemini(key, current, prompt, signal, schema)
      onStatus?.(current !== selected ? `Generado con ${current} (la cuota de ${selected} está agotada).` : null)
      return text
    } catch (err) {
      if (err instanceof RateLimitError) {
        // 429: límite por minuto (se espera y se reintenta) vs. cuota diaria / sin cuota (no se arregla
        // esperando). En ambos casos se prueba primero el modelo hermano, que tiene cuota propia.
        const long = err.kind === 'daily' || err.kind === 'zero'
        markExhausted(err)
        lastQuota = err
        const alt = switches < 2 ? await fallbackModel() : null
        if (alt) {
          switches++
          onStatus?.(`[ ${long ? 'Cuota diaria' : 'Límite por minuto'} de ${current} · probando ${alt}... ]`)
          current = alt
          continue
        }
        if (isShortRateLimit(err) && waits < RATE_RETRIES) {
          waits++
          await countdown(err.retryAfterSec, signal, onStatus)
          // Pasada la ventana del minuto, se vuelve al modelo elegido (si su cuota no es la diaria).
          exhausted.delete(current)
          if (!isExhausted(selected)) current = selected
          continue
        }
        onStatus?.(null)
        throw lastQuota
      }
      if (isOverloaded(err)) {
        if (retries < OVERLOAD_WAITS_MS.length) {
          const wait = OVERLOAD_WAITS_MS[retries]
          retries++
          onStatus?.(`[ Servidor de Google saturado · Reintento ${retries}/${OVERLOAD_WAITS_MS.length} en ${wait / 1000} s... ]`)
          await sleep(wait, signal)
          continue
        }
        onStatus?.(null)
        throw new Error(OVERLOAD_FINAL_MSG)
      }
      if (isModelGone(err) && !redetected) {
        redetected = true
        onStatus?.('[ Modelo no disponible para tu key · Detectando modelos habilitados... ]')
        const detected = await listGeminiModels(key, signal).catch(() => [] as GeminiModel[])
        if (detected.length) candidates = detected
        const next = preferredGeminiModel(detected.filter((m) => !isExhausted(m.id)))
        if (next && next !== current) {
          onModelChange?.(next, detected)
          current = next
          continue
        }
      }
      onStatus?.(null)
      throw err
    }
  }
}

/** Extrae el primer objeto JSON de la respuesta (tolera ```json ... ``` o texto alrededor). */
export function extractJson(text: string): unknown {
  return safeParseJson(text)
}