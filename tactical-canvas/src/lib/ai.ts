import { DEFAULT_STATE } from '../defaults'
import type { Accent, CanvasState, ChartMode, CurveShape, TemplateId } from '../types'
import { DEFAULT_AUTHOR } from './brand'
import { listGeminiModels, preferredGeminiModel, type GeminiModel } from './geminiModels'

export type AiProvider = 'openai' | 'anthropic' | 'gemini'
export type Discipline = 'general' | 'sports' | 'crossfit'
export type GenMode = 'auto' | 'single' | 'stories' | 'carousel'

export interface AiSettings {
  provider: AiProvider
  keys: Record<AiProvider, string>
  models: Record<AiProvider, string>
  /** Modelos de Gemini detectados con ListModels para la key guardada */
  geminiModels?: GeminiModel[]
  geminiCheckedAt?: number
}

export const MODEL_OPTIONS: Record<AiProvider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini · rápido y barato' },
    { id: 'gpt-4o', label: 'GPT-4o · más calidad' },
  ],
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 · equilibrio' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 · rápido' },
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 · máxima calidad' },
  ],
  gemini: [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash · recomendado' },
  ],
}

/** Modelo de Gemini por defecto hasta detectar los habilitados para la key (ListModels). */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash'
export const PROVIDER_LABEL: Record<AiProvider, string> = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini' }
export const KEY_PLACEHOLDER: Record<AiProvider, string> = { openai: 'sk-...', anthropic: 'sk-ant-...', gemini: 'AIzaSy...' }

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'openai',
  keys: { openai: '', anthropic: '', gemini: '' },
  models: { openai: 'gpt-4o-mini', anthropic: 'claude-sonnet-5', gemini: GEMINI_DEFAULT_MODEL },
}

export const MODE_LABEL: Record<GenMode, string> = {
  auto: 'Auto / IA decide',
  single: '1 Placa',
  stories: 'Historias (3)',
  carousel: 'Carrusel (4-5)',
}

export const DISCIPLINE_LABEL: Record<Exclude<Discipline, 'general'>, string> = {
  sports: 'SPORTS & BODYBUILDING',
  crossfit: 'CROSSFIT & HYROX',
}

const DISCIPLINE_RULE: Record<Discipline, string> = {
  general: '',
  sports:
    'Disciplina: SPORTS & BODYBUILDING. Priorizá biomecánica, hipertrofia, fuerza, técnica de ejecución, RIR/RPE, volumen efectivo, rango de movimiento, tensión mecánica y recuperación muscular. Los ejemplos van en ejercicios de gimnasio (sentadilla, press, peso muerto, remo, aislamiento). Tags sugeridos: BIOMECÁNICA APLICADA, FUERZA · HIPERTROFIA.',
  crossfit:
    'Disciplina: CROSSFIT & HYROX. Priorizá bioenergética, pacing, umbrales de lactato, VO2máx, economía de movimiento bajo fatiga, transiciones, estrategia de carrera en Hyrox (running + estaciones), densidad de trabajo y recuperación entre WODs. Tags sugeridos: BIOENERGÉTICA · PACING, RESISTENCIA · UMBRAL DE LACTATO.',
}

const MODE_RULE: Record<GenMode, string> = {
  auto: 'Elegí vos el formato: 1 placa si el concepto entra en una sola idea; 3 historias si necesita gancho → evidencia → acción; carrusel de 4 a 5 slides si es un tema para desarrollar. Indicá tu elección en "format".',
  single: 'Devolvé exactamente 1 slide. format = "single".',
  stories: 'Devolvé exactamente 3 slides para Historias de Instagram (9:16): 1) gancho que frene el scroll, 2) evidencia o dato, 3) acción concreta o estándar. format = "stories".',
  carousel: 'Devolvé entre 4 y 5 slides para un carrusel de feed: portada con gancho, desarrollo con datos y evidencia, cierre con conclusión táctica o manifiesto. format = "carousel".',
}

/** Rol, tono y contrato de salida. Las claves mapean 1:1 con el estado de la app. */
export const SYSTEM_PROMPT = `Sos el Director Creativo y Copywriter de COACH JP (@coachjp.training), un sistema de entrenamiento de alto rendimiento. Escribís en español rioplatense (voseo: "tenés", "podés").

TONO: táctico, autoritario, preciso y basado en evidencia. Frases cortas, contundentes. Cero clichés motivacionales ("no pain no gain", "sin excusas", "sal de tu zona de confort"), cero emojis, cero hashtags, cero signos de exclamación. Desarmás mitos con fisiología y datos.

PLANTILLAS DISPONIBLES (templateId):
- "metric": un número gigante que resume el argumento (ej: "3X", "~600", "7700", "+14%").
- "ab": comparativa de dos tarjetas lado a lado (A vs B) con un veredicto.
- "chart": un gráfico simple (curva, barras o medidor de umbral) con zona óptima.
- "statement": titular de impacto + remate argumental + párrafo corto, sin números.
- "manifesto": frase de mentalidad o estándar de disciplina. Sin párrafo ni paper.

REGLAS DE CONTENIDO:
- tag: MAYÚSCULAS, formato "DISCIPLINA · CATEGORÍA" o una sola categoría (ej: "BIOMECÁNICA APLICADA", "FISIOLOGÍA · ELECTROLITOS"). Para manifesto usá "FILOSOFÍA TÁCTICA", "ESTÁNDAR OPERATIVO" o "DISCIPLINA Y MÉTODO". Sin corchetes.
- titleWhite + titleAccent: el titular en MAYÚSCULAS, entre 5 y 12 palabras en total. titleWhite es la base (blanco) y titleAccent el remate (naranja). Podés envolver UNA palabra de titleWhite en *asteriscos* para resaltarla.
- paragraph: 1 a 2 oraciones, máximo 200 caracteres. Vacío ("") en manifesto.
- citation: estudio REAL y verificable con formato "APELLIDO Y COL., AÑO · REVISTA" en mayúsculas. description: de qué trata ese estudio en una línea. Si no estás seguro de que el estudio exista tal cual, dejá ambos vacíos (""). Nunca inventes citas. Vacíos en manifesto.
- Los números deben ser coherentes con la literatura. No inventes precisión que no existe.

FORMATO DE SALIDA: respondé ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto alrededor, con esta forma exacta:
{
  "format": "single" | "stories" | "carousel",
  "caption": string,
  "slides": [
    {
      "templateId": "metric" | "ab" | "chart" | "statement" | "manifesto",
      "tag": string,
      "titleWhite": string,
      "titleAccent": string,
      "paragraph": string,
      "citation": string,
      "description": string,
      "data": { ...según templateId }
    }
  ]
}

"data" según templateId:
- metric: { "value": string (corto, máx 5 caracteres), "label": string (MAYÚSCULAS, qué mide), "accent": "orange" | "cyan" | "gold" }
- ab: { "a": { "label": string, "value": string (máx 14 caracteres), "caption": string }, "b": { ...igual }, "verdict": string (MAYÚSCULAS, 2 frases muy cortas) }
- chart: { "mode": "curve" | "bars" | "gauge", "title": string (MAYÚSCULAS, qué eje vs qué), "min": number, "max": number, "unit": string, "zone": "desde-hasta" (ej "70-90"), "zoneLabel": string, "shape": "bell" | "rise" | "fall" (solo curve), "barLabels": "a, b, c" (solo bars, 4 a 7 valores), "barValues": "1, 2, 3" (solo bars), "gaugeValue": number (solo gauge), "gaugeThreshold": number (solo gauge), "gaugeLabel": string (solo gauge) }
- statement: { "kicker": string (remate en MAYÚSCULAS, máx 14 palabras) }
- manifesto: { "author": string (usá "${DEFAULT_AUTHOR}" salvo que la frase sea de un autor real conocido) }

Variá las plantillas dentro de una secuencia: no repitas la misma más de dos veces seguidas.

"caption": el COPY COMPLETO para el pie de foto de Instagram de toda la pieza (placa, historias o carrusel). Estructura:
1. Primera línea: gancho de una oración que frene el scroll (sin repetir literal el titular).
2. 2 o 3 párrafos cortos (1 a 3 oraciones cada uno) que expliquen el porqué fisiológico, con el mismo tono táctico y autoritario.
3. Micro-bullets (3 a 5 líneas que empiezan con "▸ ") con los puntos accionables.
4. Llamado a la acción con PALABRA CLAVE en mayúsculas, por ejemplo: Comentá "RIR" y te mando la guía completa.
5. Cierre con 3 a 5 hashtags de nicho en español en la última línea.
Separá los bloques con una línea en blanco (usá \n\n dentro del string). Máximo 1800 caracteres. Sin emojis.`

/** Mismo prompt sin sangrías ni espacios repetidos: menos tokens por pedido. */
const COMPACT_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(/[ \t]+/g, ' ')
  .replace(/\n /g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

export function buildUserPrompt(topic: string, mode: GenMode, discipline: Discipline = 'general') {
  const focus = DISCIPLINE_RULE[discipline]
  return `Tema o concepto a comunicar: "${topic.trim()}"\n\n${focus ? `${focus}\n\n` : ''}${MODE_RULE[mode]}`
}

// ---------------------------------------------------------------------------

async function callOpenAI(key: string, model: string, user: string, signal?: AbortSignal) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Rate limit')
  if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI respondió ${res.status}`)
  return String(json?.choices?.[0]?.message?.content ?? '')
}

async function callAnthropic(key: string, model: string, user: string, signal?: AbortSignal) {
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
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
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

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Cuota por minuto agotada (429): trae los segundos que hay que esperar. */
export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSec: number,
  ) {
    super(message)
  }
}

const DEFAULT_RATE_WAIT_SEC = 30

/**
 * Segundos de espera que indica el proveedor ante un 429:
 * RetryInfo.retryDelay ("31s") de Google, "retry in 31.2s" en el mensaje o el header Retry-After.
 */
function retryAfterSeconds(res: Response, json: unknown, message: string) {
  const details = (json as { error?: { details?: { retryDelay?: string }[] } })?.error?.details ?? []
  const fromDetails = details.map((d) => d?.retryDelay).find(Boolean)
  const candidates = [
    fromDetails && parseFloat(fromDetails),
    parseFloat(message.match(/retry (?:in|after) ([\d.]+)\s*s/i)?.[1] ?? ''),
    parseFloat(res.headers.get('retry-after') ?? ''),
  ]
  const sec = candidates.find((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
  return Math.min(600, Math.ceil(sec ?? DEFAULT_RATE_WAIT_SEC))
}

function rateLimitError(res: Response, json: unknown, message: string) {
  return new RateLimitError(message, retryAfterSeconds(res, json, message))
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Cancelado', 'AbortError'))
    })
  })

/** Saturación temporal del servicio (503 / "high demand"): se reintenta el mismo modelo. */
function isOverloaded(err: unknown) {
  if (!(err instanceof HttpError)) return false
  if (err.status === 503) return true
  return /high demand|spikes in demand|overloaded/i.test(err.message)
}

async function requestGemini(key: string, model: string, prompt: string, signal?: AbortSignal) {
  const apiKey = key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
      },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Quota exceeded')
  if (!res.ok) throw new HttpError(json?.error?.message ?? `Gemini respondió ${res.status}`, res.status)
  const cand = json?.candidates?.[0]
  if (!cand?.content) throw new Error(`Gemini no devolvió contenido${cand?.finishReason ? ` (${cand.finishReason})` : ''}.`)
  const parts: { text?: string }[] = cand.content.parts ?? []
  const text = parts.map((p) => p.text ?? '').join('')
  if (cand.finishReason === 'MAX_TOKENS') {
    try {
      extractJson(text)
    } catch {
      throw new Error('La respuesta de Gemini se cortó por largo. Probá con 1 placa o un tema más acotado.')
    }
  }
  return text
}

export type StatusFn = (message: string | null) => void

export const OVERLOAD_FINAL_MSG =
  'El servidor de Google está recibiendo alto tráfico en este instante. Esperá 15-30 segundos y volvé a presionar Generar.'
/** Esperas antes de cada reintento con el MISMO modelo (3 intentos en total). */
const OVERLOAD_WAITS_MS = [2500, 4000]

/** Modelo inexistente o no habilitado para esta key. */
function isModelGone(err: unknown) {
  if (!(err instanceof HttpError)) return false
  return err.status === 404 || err.status === 410 || /not found|no longer available|not supported/i.test(err.message)
}

export type ModelChangeFn = (model: string, detected: GeminiModel[]) => void

/**
 * Llamada a Gemini:
 * - Saturación (503 / "experiencing high demand"): espera 2,5 s y reintenta el mismo modelo;
 *   luego espera 4 s y reintenta. Tras 3 intentos, mensaje claro para el usuario.
 * - Modelo inexistente para esta key: consulta ListModels una vez, elige el Flash más
 *   moderno disponible, lo guarda y reintenta con él.
 */
async function callGemini(
  key: string,
  model: string,
  user: string,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
) {
  // Un solo turno con el prompt completo (sistema + pedido), sin espacios redundantes.
  const prompt = `${COMPACT_SYSTEM_PROMPT}\n\n${user}`
  let current = model.trim() || GEMINI_DEFAULT_MODEL
  let retries = 0
  let redetected = false
  for (;;) {
    try {
      const text = await requestGemini(key, current, prompt, signal)
      onStatus?.(null)
      return text
    } catch (err) {
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
        const next = preferredGeminiModel(detected)
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
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('La IA no devolvió JSON.')
  return JSON.parse(text.slice(start, end + 1))
}

// ---------------------------------------------------------------------------
// Normalización defensiva: la salida del modelo nunca se usa sin validar.

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : fallback)
const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback
const upper = (v: unknown, fallback = '') => str(v, fallback).toUpperCase()
const stripBrackets = (s: string) => s.replace(/^\[\s*|\s*\]$/g, '')

const TEMPLATE_MAP: Record<string, TemplateId> = {
  metric: 'metric',
  ab: 'compare',
  compare: 'compare',
  chart: 'chart',
  statement: 'statement',
  manifesto: 'manifesto',
}
const ACCENTS: Accent[] = ['orange', 'cyan', 'gold', 'white', 'gray']
const CHART_MODES: ChartMode[] = ['curve', 'bars', 'gauge']
const SHAPES: CurveShape[] = ['bell', 'rise', 'fall']

/** Convierte un slide de la IA en un parche del estado de la app. */
export function slideToPatch(raw: unknown): Partial<CanvasState> {
  const s = obj(raw)
  const d = obj(s.data)
  const template = TEMPLATE_MAP[str(s.templateId).toLowerCase()] ?? 'statement'
  const base = DEFAULT_STATE
  const patch: Partial<CanvasState> = {
    template,
    tag: stripBrackets(upper(s.tag, base.tag)),
    headlineA: upper(s.titleWhite),
    headlineB: upper(s.titleAccent),
    body: template === 'manifesto' ? '' : str(s.paragraph),
    citeMain: template === 'manifesto' ? '' : stripBrackets(upper(s.citation)),
    citeSub: template === 'manifesto' ? '' : str(s.description),
  }

  if (template === 'metric') {
    patch.metricValue = str(d.value, base.metricValue)
    patch.metricLabel = upper(d.label)
    patch.metricAccent = oneOf(d.accent, ACCENTS, 'orange')
  } else if (template === 'compare') {
    const card = (c: unknown, accent: Accent) => {
      const o = obj(c)
      return { label: upper(o.label), value: str(o.value), caption: str(o.caption), accent }
    }
    patch.cardA = card(d.a, 'gray')
    patch.cardB = card(d.b, 'cyan')
    patch.verdict = upper(d.verdict)
  } else if (template === 'chart') {
    const c = base.chart
    const list = (v: unknown, fb: string) => (Array.isArray(v) ? v.join(', ') : str(v, fb))
    patch.chart = {
      ...c,
      mode: oneOf(d.mode, CHART_MODES, 'curve'),
      title: upper(d.title, c.title),
      min: num(d.min, c.min),
      max: num(d.max, c.max),
      unit: str(d.unit),
      zone: str(d.zone, c.zone),
      zoneLabel: str(d.zoneLabel),
      shape: oneOf(d.shape, SHAPES, 'bell'),
      barLabels: list(d.barLabels, c.barLabels),
      barValues: list(d.barValues, c.barValues),
      gaugeValue: num(d.gaugeValue, c.gaugeValue),
      gaugeThreshold: num(d.gaugeThreshold, c.gaugeThreshold),
      gaugeLabel: str(d.gaugeLabel),
    }
  } else if (template === 'statement') {
    patch.kicker = upper(d.kicker)
  } else {
    patch.manifestoAuthor = upper(d.author, DEFAULT_AUTHOR)
  }
  return patch
}

export interface GenerationResult {
  format: 'single' | 'stories' | 'carousel'
  slides: Partial<CanvasState>[]
  caption: string
}

export function parseGeneration(payload: unknown, mode: GenMode): GenerationResult {
  const root = obj(payload)
  const rawSlides = Array.isArray(root.slides) ? root.slides : Array.isArray(payload) ? payload : [payload]
  let slides = rawSlides.map(slideToPatch).filter((p) => p.headlineA || p.headlineB)
  if (!slides.length) throw new Error('La IA no devolvió slides utilizables.')
  const limit = mode === 'single' ? 1 : mode === 'stories' ? 3 : mode === 'carousel' ? 5 : 5
  slides = slides.slice(0, limit)
  const declared = oneOf(root.format, ['single', 'stories', 'carousel'] as const, 'single')
  const format = mode === 'auto' ? (slides.length === 1 ? 'single' : declared === 'single' ? 'carousel' : declared) : mode
  const caption = str(root.caption).replace(/\r\n/g, '\n')
  return { format, slides, caption }
}

export async function generateContent(
  settings: AiSettings,
  topic: string,
  mode: GenMode,
  discipline: Discipline,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
): Promise<GenerationResult> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const user = buildUserPrompt(topic, mode, discipline)
  const text =
    settings.provider === 'gemini'
      ? await callGemini(key, model, user, signal, onStatus, onModelChange)
      : settings.provider === 'anthropic'
        ? await callAnthropic(key, model, user, signal)
        : await callOpenAI(key, model, user, signal)
  return parseGeneration(extractJson(text), mode)
}
