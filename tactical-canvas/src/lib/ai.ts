import { DEFAULT_STATE } from '../defaults'
import type { Accent, CanvasState, ChartMode, CurveShape, DiagramData, DiagramKind, RepeatMode, TemplateId } from '../types'
import { diagramDefaults, inferPillar } from './diagramPillar'
import { DEFAULT_AUTHOR } from './brand'
import { listGeminiModels, preferredGeminiModel, type GeminiModel } from './geminiModels'
import { JsonRepairError, safeParseJson } from './safeJson'

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
    'Disciplina: SPORTS & BODYBUILDING. Priorizá biomecánica, hipertrofia, fuerza, técnica de ejecución, RIR/RPE, volumen efectivo, rango de movimiento, tensión mecánica y recuperación muscular. Los ejemplos van en ejercicios de gimnasio (sentadilla, press, peso muerto, remo, aislamiento). En gráficos usá series/semana, RIR, RPE, %1RM o kg. Tags sugeridos: BIOMECÁNICA APLICADA, FUERZA · HIPERTROFIA.',
  crossfit:
    'Disciplina: CROSSFIT & HYROX. Priorizá bioenergética, pacing, umbrales de lactato, VO2máx, economía de movimiento bajo fatiga, transiciones, estrategia de carrera en Hyrox (running + estaciones), densidad de trabajo y recuperación entre WODs. En gráficos usá W, min/km, mmol/L, lpm o % VO2máx. Tags sugeridos: BIOENERGÉTICA · PACING, RESISTENCIA · UMBRAL DE LACTATO.',
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
- "metrica": un número gigante que resume el argumento (ej: "3X", "~600", "7700", "+14%").
- "ab": comparativa de dos tarjetas lado a lado (A vs B) con un veredicto.
- "grafico": un gráfico simple (curva, barras o medidor de umbral) con zona óptima.
- "sentencia": titular de impacto + remate argumental + párrafo corto, sin números.
- "manifiesto": frase de mentalidad o estándar de disciplina. Sin párrafo ni paper.
- "diagrama": modelo mental visual (radar de 6 factores, dominó de progresión, círculos fraccionados o trayectoria «ruido vs claridad»).
- "repeticion": póster tipográfico que repite una frase corta (diagonal, eco, kinetic o bloque justificado). Sin párrafo ni paper.

MAPEO CONCEPTUAL (elegí la plantilla según la idea central del slide, no al azar):
- Dualidad o contraste entre dos estados («Ego vs Progreso», «Estático vs Dinámico», «Volumen vs Intensidad»): "ab", o "grafico" con curva y zona umbral.
- Progresión o acumulación en el tiempo («Persistencia», «Constancia», «Sobrecarga progresiva», «Hábitos»): "diagrama" con recommendedType "domino", o "repeticion".
- Equilibrio o fenómeno multifactorial («Obsesión», «Fatiga», «Recuperación», «Rendimiento global»): "diagrama" con recommendedType "radar".
- Foco o dirección («Ruido vs Foco», «Claridad», «Prioridades», «Plan vs Improvisación»): "diagrama" con recommendedType "trayectoria" o "circulos".
- Frase de mentalidad corta y memorable: "repeticion" o "manifiesto".

DIRECTOR EDITORIAL TÁCTICO · PLANNER ESTRATÉGICO: el pedido puede ser un concepto corto o un brief libre (una orden completa, un objetivo de venta, servicios, una idea abierta). Trabajás en dos fases continuas dentro de la misma respuesta:
FASE 1 · ANÁLISIS EDITORIAL: antes de escribir, completás el objeto "plan" (va primero en el JSON): detectás la intención del pedido ("objetivo": "venta" | "ciencia" | "mindset"), definís el formato y armás la secuencia de plantillas. Secuencias tipo:
- VENTA / SERVICIOS (publicitar modalidades, planes, asesorías, captar clientes): carrusel de conversión táctica de 5 placas.
  1) "sentencia": gancho contra el entrenamiento genérico.
  2) "ab": enfoque tradicional (tarjeta A) vs. Sistema Coach JP (tarjeta B).
  3) "diagrama" con recommendedType "circulos" o "radar": desglose de las modalidades o pilares del servicio (cada círculo o eje es una modalidad o pilar real del brief).
  4) "metrica": dato de autoridad o personalización (ej: «100%» individualizado, seguimiento semanal).
  5) "manifiesto": cierre con llamado a la acción e instrucción de contacto concreta (ej: Enviá «SISTEMA» al MD).
  Usá las modalidades y servicios que nombra el brief. Si no las detalla, usá modalidades típicas de coaching (online 1:1, presencial, programación para competencia) sin inventar precios, cupos ni resultados garantizados.
- CIENCIA / TÉCNICO (explicar, informar, divulgar un tema): carrusel de divulgación rigurosa de 5 placas.
  1) "sentencia": desmitificadora.
  2) "grafico" de curva o umbral con variables fisiológicas reales.
  3) "diagrama" con recommendedType "domino" o "trayectoria": el mecanismo biológico paso a paso.
  4) placa de respaldo ("metrica" o "sentencia") con cita científica indexada REAL en "citation" (si no tenés certeza de un paper real, elegí otro argumento: nunca inventes).
  5) "sentencia" o "manifiesto": conclusión práctica aplicable al entrenamiento.
- MINDSET / TÁCTICO (filosofía, disciplina, frase contundente): "repeticion" (mode "kinetic" o "echo") y "manifiesto"; si es una sola frase, 1 placa.
Si el usuario indica una cantidad de placas o un formato, respetalo por encima de estas secuencias.
FASE 2 · REDACCIÓN TÁCTICA: escribís cada placa con el tono militar, científico y quirúrgico de Coach JP, con su templateId preseleccionado y TODOS sus datos completos (tarjetas A/B, subtipo y valores del diagrama, puntos del gráfico, frase de repetición). Las placas forman una sola historia: no repitas titulares ni ideas entre placas.

REGLAS DE CONTENIDO:
- text.tagSuperior: MAYÚSCULAS, formato "DISCIPLINA · CATEGORÍA" o una sola categoría (ej: "BIOMECÁNICA APLICADA", "FISIOLOGÍA · ELECTROLITOS"). Para manifesto usá "FILOSOFÍA TÁCTICA", "ESTÁNDAR OPERATIVO" o "DISCIPLINA Y MÉTODO". Sin corchetes.
- text.titleWhite + text.titleAccent: el titular en MAYÚSCULAS, entre 5 y 12 palabras en total. titleWhite es la base (blanco) y titleAccent el remate (naranja). Podés envolver UNA palabra de titleWhite en *asteriscos* para resaltarla.
- text.parrafo: 1 a 2 oraciones, máximo 200 caracteres (se oculta solo en manifesto y repeat, pero escribilo igual).
- citation: estudio REAL y verificable con formato "APELLIDO Y COL., AÑO · REVISTA" en mayúsculas. description: de qué trata ese estudio en una línea. Si no estás seguro de que el estudio exista tal cual, dejá ambos vacíos (""). Nunca inventes citas. Vacíos en manifesto.
- Los números deben ser coherentes con la literatura. No inventes precisión que no existe.

FORMATO DE SALIDA: respondé estrictamente con un objeto JSON válido, sin bloques de código markdown (\`\`\`json), sin saltos de línea sin escapar dentro de strings y sin comillas dobles internas sin escapar (\\"). Dentro de los textos usá comillas angulares « » en lugar de comillas dobles. Nada de texto antes ni después del JSON.

PAYLOAD MULTIFORMATO: cada slide trae los datos de TODAS las plantillas, escritos sobre el tema pedido, aunque templateId elija una sola. Así, si el usuario cambia de plantilla, ve contenido del mismo tema y nunca datos de otra sesión. Forma exacta:
{
  "plan": { "objetivo": "venta" | "ciencia" | "mindset", "intencion": string (qué tiene que lograr la pieza, 1 oración), "secuencia": [templateId de cada placa, en orden] },
  "format": "single" | "stories" | "carousel",
  "caption": string,
  "slides": [
    {
      "templateId": "sentencia" | "ab" | "grafico" | "diagrama" | "metrica" | "manifiesto" | "repeticion",
      "theme": string (el tema de este slide en 2-4 palabras),
      "text": { "titleWhite": string, "titleAccent": string, "tagSuperior": string, "parrafo": string },
      "citation": string,
      "description": string,
      "sentencia": { "highlight": string (remate en MAYÚSCULAS, máx 14 palabras) },
      "metrica": { "value": string (corto, máx 5 caracteres), "label": string (MAYÚSCULAS, qué mide), "unidad": string, "accent": "orange" | "cyan" | "gold" },
      "ab": {
        "cardA": { "label": string (MAYÚSCULAS), "value": string (máx 14 caracteres), "desc": string },
        "cardB": { "label": string (MAYÚSCULAS), "value": string (máx 14 caracteres), "desc": string },
        "verdict": string (MAYÚSCULAS, 2 frases muy cortas)
      },
      "diagrama": {
        "recommendedType": "radar" | "domino" | "circulos" | "trayectoria",
        "domino": { "inicio": string (la causa o acción mínima), "final": string (la consecuencia acumulada) },
        "circulos": { "c1": string (el todo), "c2": string, "c3": string, "c4": string (la parte de hoy) },
        "trayectoria": { "caotico": string (rótulo del tramo caótico), "limpio": string (rótulo del tramo limpio), "meta": string (meta en la bandera) },
        "radar": { "axes": [6 strings cortos], "values": [6 números 0-100, estado actual], "compare": [6 números 0-100, estado ideal], "labelA": string, "labelB": string }
      },
      "repeticion": { "phrase": string (MAYÚSCULAS, 1-2 palabras clave), "phraseLarga": string (MAYÚSCULAS, 4-10 palabras), "mode": "diagonal" | "echo" | "kinetic" | "justified" },
      "manifiesto": { "author": string (usá "${DEFAULT_AUTHOR}" salvo que la frase sea de un autor real conocido) },
      "grafico": { ... } (OBLIGATORIO sólo si templateId es "grafico"; en los demás omitilo)
    }
  ]
}

"grafico" (sólo con templateId "grafico"): { "mode": "curve" | "bars" | "gauge", "title": string (MAYÚSCULAS, qué eje vs qué), "min": number, "max": number, "unit": string, "zone": "desde-hasta" (ej "70-90"), "zoneLabel": string, "shape": "bell" | "rise" | "fall" (solo curve), "barLabels": "a, b, c" (solo bars, 4 a 7 valores), "barValues": "1, 2, 3" (solo bars), "gaugeValue": number (solo gauge), "gaugeThreshold": number (solo gauge), "gaugeLabel": string (solo gauge) }

CONGRUENCIA TEMÁTICA DEL DIAGRAMA: los 4 subtipos de "diagrama" hablan del tema del slide, nunca de productividad genérica ni autoayuda (prohibido «Hábito mínimo», «Resultado masivo», «Ruido», «Claridad», «El objetivo», «Los bloques» o «Hoy» como rótulos). Ejemplos:
- Nutrición deportiva: radar con ejes Glucógeno, Hidratación, Proteína, Electrolitos, Timing, Digestión; dominó «Déficit calórico crónico» → «Pérdida de fuerza y masa»; trayectoria «Hipoglucemia / Fatiga» → «Glucógeno estable» → meta «Rendimiento óptimo»; círculos Calorías base, Proteína (2g/kg), Carbohidratos intra, Timing y digestión.
- Fuerza e hipertrofia: radar con ejes Tensión mecánica, RIR / Esfuerzo, Volumen efectivo, Recuperación, Frecuencia, Técnica; dominó «Sobrecarga progresiva» → «Adaptación miofibrilar».
- Cualquier otro tema (ej: automatización): rótulos con el vocabulario técnico de ese tema.

CAMPOS OBLIGATORIOS: completá SIEMPRE todos los bloques (text, sentencia, metrica, ab, diagram con sus 4 subtipos, repeticion, manifiesto) con contenido real del tema. Nunca devuelvas arrays vacíos ([]), strings vacíos ("") ni null dentro de esos bloques. Los rótulos de diagram son de 1 a 4 palabras. "citation" y "description" son la única excepción: van vacíos si no tenés un estudio real.

Variá las plantillas dentro de una secuencia: no repitas la misma más de dos veces seguidas.

DATOS NUMÉRICOS CONGRUENTES CON CADA PLANTILLA:
- chart: los ejes y la unidad salen del tema y del pilar. Sports & Bodybuilding: series/semana, RIR, RPE, %1RM, kg o repeticiones. CrossFit & Hyrox: W, min/km, mmol/L de lactato, lpm o % VO2máx. No uses cadencia (rpm) salvo que el tema sea ciclismo. "min" < "max"; la "zone" desde-hasta va dentro de [min, max]; en bars, barLabels y barValues tienen la misma cantidad y los valores están dentro de [min, max]; en gauge, gaugeValue y gaugeThreshold están dentro de [min, max]. El "title" nombra los ejes reales (ej: "SERIES SEMANALES VS. HIPERTROFIA").
- metrica: "value" es el número del argumento, "label" dice qué mide y "unidad" en qué se mide.
- ab: los dos "value" se comparan en la misma unidad o dimensión.
- diagram.radar: "axes", "values" y "compare" tienen exactamente 6 elementos.

"caption": el COPY ESTRATÉGICO para el pie de foto de Instagram de toda la pieza (placa, historias o carrusel), sincronizado con el tema y el objetivo del plan. Tres bloques:
1. GANCHO: una oración que frene el scroll (sin repetir literal el titular) y 1 o 2 oraciones que expliquen el porqué con el mismo tono táctico.
2. PUNTOS TÉCNICOS: 3 a 5 micro-bullets que empiezan con "▸ " (en venta: qué incluye el sistema y para quién es; en ciencia: el mecanismo y lo accionable).
3. CTA + HASHTAGS: llamado a la acción con PALABRA CLAVE en mayúsculas entre comillas angulares (ej: Comentá «RIR» y te mando la guía completa; en venta: Enviá «SISTEMA» al MD) y, en la última línea, 3 a 5 hashtags de nicho en español.
Separá los bloques con una línea en blanco (usá \n\n dentro del string). Máximo 1800 caracteres. Sin emojis.`

/** Mismo prompt sin sangrías ni espacios repetidos: menos tokens por pedido. */
const COMPACT_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(/[ \t]+/g, ' ')
  .replace(/\n /g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

// ---------------------------------------------------------------------------
// Director editorial: tipo de entrada, objetivo y formato automático.

/** Concepto rápido (keywords) o brief libre (instrucciones completas). */
export type InputMode = 'concept' | 'brief'
export type EditorialGoal = 'auto' | 'sales' | 'science' | 'mindset'
export type ResolvedGoal = Exclude<EditorialGoal, 'auto'>

export interface EditorialOptions {
  inputMode: InputMode
  goal: EditorialGoal
}

export const GOAL_LABEL: Record<EditorialGoal, string> = {
  auto: 'Auto / Detectar',
  sales: 'Venta / Servicios',
  science: 'Ciencia / Técnico',
  mindset: 'Mindset / Táctico',
}

const SALES_RX = /servicio|modalidad|asesor[ií]a|coaching|mentor[ií]a|planes|precio|cupo|inscrip|vend|venta|public[ií]c|promocion|promo\b|clientes?\b|oferta|contrat|sum[aá]te|mi (sistema|m[eé]todo|equipo|programa)|1 ?a ?1|presencial/i
const SCIENCE_RX = /hipertrof|fisiolog|ciencia|cient[ií]fic|evidencia|estudio|paper|mecanismo|explic|informativ|divulg|c[oó]mo funciona|qu[eé] es|por qu[eé]|t[eé]cnic|biomec|metab|gluc[oó]geno|lactato|sobrecarga|volumen|rir\b|rpe\b|nutri/i
const MINDSET_RX = /mentalidad|mindset|disciplina|motivaci|constancia|filosof|actitud|frase|car[aá]cter|voluntad|\bego\b|enfoque/i
const PROCESS_RX = /carr?ou?sel|proceso|paso a paso|pasos|explic|modalidades|etapas|fases|gu[ií]a|c[oó]mo (hacer|funciona)/i

/** Objetivo editorial: el elegido o, en AUTO, el que se deduce del texto (venta > mindset puro > ciencia, por defecto). */
export function detectGoal(text: string, goal: EditorialGoal = 'auto'): ResolvedGoal {
  if (goal !== 'auto') return goal
  if (SALES_RX.test(text)) return 'sales'
  if (MINDSET_RX.test(text) && !SCIENCE_RX.test(text)) return 'mindset'
  // Sin señales claras, en una app de entrenamiento el contenido es técnico.
  return 'science'
}

/**
 * Formato efectivo. Sólo decide cuando el usuario dejó AUTO: explicar un proceso o publicitar
 * servicios → carrusel; una frase contundente o sentencia rápida → 1 placa; si no, decide la IA.
 */
export function resolveFormat(text: string, mode: GenMode, opts: EditorialOptions): GenMode {
  if (mode !== 'auto') return mode
  const goal = detectGoal(text, opts.goal)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (goal === 'sales' || PROCESS_RX.test(text)) return 'carousel'
  if (opts.inputMode === 'brief' && goal === 'science') return 'carousel'
  const quoted = /^[«"“'].+[»"”']$/.test(text.trim())
  // Frase contundente (3+ palabras de mentalidad) o cita entre comillas: 1 placa. Una keyword suelta decide la IA.
  if (quoted || (goal === 'mindset' && words >= 3 && words <= 14)) return 'single'
  return 'auto'
}

const GOAL_RULE: Record<ResolvedGoal, string> = {
  sales:
    'OBJETIVO EDITORIAL: VENTA / SERVICIOS. plan.objetivo = "venta". Usá la secuencia de conversión táctica (sentencia → ab → diagrama de modalidades → metrica de autoridad → manifiesto con CTA de contacto).',
  science:
    'OBJETIVO EDITORIAL: CIENCIA / TÉCNICO. plan.objetivo = "ciencia". Usá la secuencia de divulgación rigurosa (sentencia desmitificadora → grafico fisiológico → diagrama del mecanismo → placa con cita real → conclusión práctica).',
  mindset:
    'OBJETIVO EDITORIAL: MINDSET / TÁCTICO. plan.objetivo = "mindset". Priorizá "repeticion" (kinetic o echo) y "manifiesto", con frases cortas y contundentes.',
}

export function buildUserPrompt(topic: string, mode: GenMode, discipline: Discipline = 'general', editorial?: EditorialOptions) {
  const focus = DISCIPLINE_RULE[discipline]
  const text = topic.trim()
  const head =
    editorial?.inputMode === 'brief'
      ? `BRIEF DEL USUARIO (instrucciones completas: interpretá la intención, los servicios, el público y el objetivo antes de planificar):\n---\n${text}\n---`
      : `Tema o concepto a comunicar: "${text}"`
  const goal = editorial ? `${GOAL_RULE[detectGoal(text, editorial.goal)]}\n\n` : ''
  return `${head}\n\n${goal}${editorial ? 'Si el formato termina siendo de menos placas que la secuencia tipo, quedate con las plantillas más fuertes de esa secuencia, en el mismo orden narrativo.\n\n' : ''}${focus ? `${focus}\n\n` : ''}${MODE_RULE[mode]}`
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
      max_tokens: 8000,
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

const DEFAULT_RATE_WAIT_SEC = 30

type QuotaDetail = { retryDelay?: string; violations?: { quotaId?: string; quotaMetric?: string; quotaValue?: string }[] }

/**
 * Segundos de espera que indica el proveedor ante un 429:
 * RetryInfo.retryDelay ("31s") de Google, "retry in 31.2s" en el mensaje o el header Retry-After.
 */
function retryAfterSeconds(res: Response, details: QuotaDetail[], message: string) {
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
function quotaKind(details: QuotaDetail[], message: string): QuotaKind {
  const violations = details.flatMap((d) => d?.violations ?? [])
  const ids = violations.map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`).join(' ')
  const text = `${ids} ${message}`
  if (/limit:\s*0\b/i.test(message) || violations.some((v) => v.quotaValue === '0')) return 'zero'
  if (/per ?day|daily|PerDay/i.test(text)) return 'daily'
  if (/per ?minute|PerMinute|rpm|tpm/i.test(text)) return 'minute'
  return 'unknown'
}

function rateLimitError(res: Response, json: unknown, message: string, model = '') {
  const details = ((json as { error?: { details?: QuotaDetail[] } })?.error?.details ?? []) as QuotaDetail[]
  return new RateLimitError(message, retryAfterSeconds(res, details, message), quotaKind(details, message), model)
}

/**
 * Memoria de la sesión: modelos con cuota agotada. Los diarios / sin cuota se saltean hasta
 * recargar la página o forzar el reintento; los por-minuto, hasta que vence su espera.
 */
const exhausted = new Map<string, { kind: QuotaKind; until: number }>()

function markExhausted(err: RateLimitError) {
  const long = err.kind === 'daily' || err.kind === 'zero'
  exhausted.set(err.model, { kind: err.kind, until: long ? Infinity : Date.now() + err.retryAfterSec * 1000 })
}

function isExhausted(model: string) {
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
        maxOutputTokens: 8192,
      },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Quota exceeded', model)
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
  known: GeminiModel[] = [],
) {
  // Un solo turno con el prompt completo (sistema + pedido), sin espacios redundantes.
  const prompt = `${COMPACT_SYSTEM_PROMPT}\n\n${user}`
  const selected = model.trim() || GEMINI_DEFAULT_MODEL
  let current = selected
  let retries = 0
  let redetected = false
  let switches = 0
  let candidates = known
  let lastQuota: RateLimitError | null = null

  /** Siguiente modelo habilitado para la key cuya cuota no esté agotada (cada modelo tiene cuota propia). */
  const nextModel = async () => {
    if (!candidates.length) candidates = await listGeminiModels(key, signal).catch(() => [] as GeminiModel[])
    return candidates.find((m) => m.id !== current && !isExhausted(m.id))?.id ?? null
  }

  // Si el modelo elegido ya agotó su cuota en esta sesión, se arranca directo con otro.
  if (isExhausted(current)) {
    const alt = await nextModel()
    if (alt) current = alt
  }

  for (;;) {
    try {
      const text = await requestGemini(key, current, prompt, signal)
      onStatus?.(current !== selected ? `Generado con ${current} (la cuota de ${selected} está agotada).` : null)
      return text
    } catch (err) {
      if (err instanceof RateLimitError) {
        // 429: se marca el modelo y se prueba otro habilitado (hasta 3 cambios). Recién si
        // todos están agotados se informa al usuario, con el tipo de límite (RPM / RPD).
        markExhausted(err)
        lastQuota = err
        const alt = switches < 3 ? await nextModel() : null
        if (alt) {
          switches++
          onStatus?.(`[ Cuota de ${current} agotada · probando ${alt}... ]`)
          current = alt
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

/** Pedido de corrección sintáctica: mismo contenido, JSON válido. */
function repairPrompt(err: JsonRepairError) {
  return `Tu respuesta anterior no es JSON válido (error: ${err.message}). Devolvé EXACTAMENTE el mismo contenido corregido como un único objeto JSON válido con la misma estructura: escapá las comillas dobles internas como \\" (o reemplazalas por « »), usá \\n para los saltos de línea dentro de strings, sin comas sobrantes y sin markdown.\n\nRespuesta a corregir:\n${err.raw.slice(0, 12000)}`
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
  diagram: 'diagram',
  diagrama: 'diagram',
  repeat: 'repeat',
  repetition: 'repeat',
  repeticion: 'repeat',
  repetición: 'repeat',
  metrica: 'metric',
  métrica: 'metric',
  grafico: 'chart',
  gráfico: 'chart',
  sentencia: 'statement',
  manifiesto: 'manifesto',
}
const ACCENTS: Accent[] = ['orange', 'cyan', 'gold', 'white', 'gray']
const CHART_MODES: ChartMode[] = ['curve', 'bars', 'gauge']
const SHAPES: CurveShape[] = ['bell', 'rise', 'fall']

const REPEAT_MODES: RepeatMode[] = ['diagonal', 'echo', 'kinetic', 'justified']
const DIAGRAM_KIND_MAP: Record<string, DiagramKind> = {
  radar: 'radar',
  domino: 'domino',
  dominó: 'domino',
  progression: 'domino',
  progresion: 'domino',
  circles: 'circles',
  circulos: 'circles',
  círculos: 'circles',
  trajectory: 'curve',
  trayectoria: 'curve',
  curve: 'curve',
}

/** Primer texto no vacío de la lista. */
const first = (...vals: unknown[]) => {
  for (const v of vals) {
    const t = str(v)
    if (t) return t
  }
  return ''
}
const list = (v: unknown) =>
  Array.isArray(v)
    ? v.map((x) => str(x)).filter(Boolean)
    : str(v)
        .split(/[,\n;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
const scores = (v: unknown) =>
  list(v)
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.min(100, Math.max(0, Math.round(n))))

/**
 * Bloque "diagram" de la IA → datos de los 4 subtipos. Acepta el payload multiformato
 * (domino.inicio, circulos.c1, trayectoria.caotico, radar.axes) y el formato plano anterior
 * (kind + axes/start/captions/noise). Lo que falte sale del pilar del tema, nunca de otra sesión.
 */
function diagramFromAi(b: Record<string, unknown>, fb: DiagramData): DiagramData {
  const radar = obj(b.radar)
  const domino = obj(b.domino ?? b.dominó)
  const circles = obj(b.circulos ?? b.circles)
  const tray = obj(b.trayectoria ?? b.trajectory)
  const axes = list(radar.axes ?? radar.ejes ?? b.axes)
  const useAxes = axes.length >= 3 ? axes.slice(0, 8) : list(fb.radar.axes)
  const fit = (vals: number[], fallback: string) => {
    const src = vals.length ? vals : scores(fallback)
    return useAxes.map((_, i) => src[i] ?? 50).join(', ')
  }
  const cmp = scores(radar.compare ?? radar.ideal ?? b.compare)
  const capList = list(b.captions)
  const caps = [1, 2, 3, 4].map((i, j) => first(circles[`c${i}`], obj(circles.captions)[`c${i}`], list(circles.captions)[j], capList[j], fb.circles.captions.split('\n')[j]))
  const div = list(circles.divisions ?? b.divisions)
    .map((x) => Math.round(Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0)
  return {
    radar: {
      axes: useAxes.join(', '),
      values: fit(scores(radar.values ?? radar.valores ?? b.values), fb.radar.values),
      compare: cmp.length ? fit(cmp, fb.radar.compare) : axes.length >= 3 ? '' : fb.radar.compare,
      // Con ejes propios de la IA, las leyendas de respaldo son neutras (no las del pilar).
      labelA: first(radar.labelA, b.labelA, axes.length >= 3 ? 'Estado actual' : fb.radar.labelA),
      labelB: first(radar.labelB, b.labelB, axes.length >= 3 ? 'Estado ideal' : fb.radar.labelB),
    },
    domino: {
      count: Math.min(9, Math.max(4, Math.round(first(domino.count, b.count) ? num(domino.count ?? b.count, fb.domino.count) : fb.domino.count))),
      start: first(domino.inicio, domino.start, b.start, b.inicio, fb.domino.start),
      end: first(domino.final, domino.end, b.end, b.final, fb.domino.end),
    },
    circles: { divisions: div.length ? div.slice(0, 3).join(', ') : fb.circles.divisions, captions: caps.join('\n') },
    trajectory: {
      noise: first(tray.caotico, tray.caótico, tray.noise, b.noise, b.ruido, fb.trajectory.noise),
      clarity: first(tray.limpio, tray.clarity, b.clarity, b.claridad, fb.trajectory.clarity),
      goal: first(tray.meta, tray.goal, b.goal, b.meta, fb.trajectory.goal),
    },
  }
}

/** Contexto de la generación: el pilar y el tema deciden los datos de respaldo del diagrama. */
export interface SlideContext {
  discipline?: Discipline
  topic?: string
}

/**
 * Convierte un slide de la IA en un parche del estado de la app. Llena los datos de TODAS las
 * plantillas (no sólo la elegida) para que al cambiar de pestaña no aparezcan datos de otra sesión.
 */
export function slideToPatch(raw: unknown, ctx: SlideContext = {}): Partial<CanvasState> {
  const s = obj(raw)
  const d = obj(s.data)
  const t = obj(s.text ?? s.texto)
  const template = TEMPLATE_MAP[str(s.templateId).toLowerCase()] ?? 'statement'
  const base = DEFAULT_STATE
  const headlineA = upper(first(t.titleWhite, s.titleWhite))
  const headlineB = upper(first(t.titleAccent, s.titleAccent))
  const patch: Partial<CanvasState> = {
    template,
    tag: stripBrackets(upper(first(t.tagSuperior, t.tag, s.tag, base.tag))),
    headlineA,
    headlineB,
    body: first(t.parrafo, t.paragraph, s.paragraph),
    citeMain: stripBrackets(upper(s.citation)),
    citeSub: str(s.description),
  }
  const headline = `${headlineA} ${headlineB}`.replace(/\*/g, '').trim()

  // 01 · Métrica
  const m = obj(s.metrica ?? s.metric)
  const md = template === 'metric' ? d : {}
  const metricValue = first(m.value, m.valor, md.value)
  if (metricValue) {
    const label = upper(first(m.label, m.etiqueta, md.label))
    const unit = upper(first(m.unidad, m.unit))
    patch.metricValue = metricValue
    patch.metricLabel = unit && !label.includes(unit) ? `${label} · ${unit}` : label
    patch.metricAccent = oneOf(m.accent ?? md.accent, ACCENTS, 'orange')
  }

  // 02 · A/B (mapeo tolerante: Gemini a veces usa otros nombres o pone las tarjetas fuera de "data")
  const sources = [obj(s.ab), d, s]
  const pick = (paths: string[], fallback: string) => {
    for (const src of sources) {
      for (const path of paths) {
        const text = str(path.split('.').reduce<unknown>((acc, k) => obj(acc)[k], src))
        if (text) return text
      }
    }
    return fallback
  }
  const card = (side: 'A' | 'B', accent: Accent, fbLabel: string, fbValue: string) => {
    const l = side.toLowerCase()
    const groups = [`card${side}`, `option${side}`, `tarjeta${side}`, side, l, `card_${l}`, `opcion${side}`]
    const keys = (fields: string[]) => [...fields.map((f) => `card${side}_${f}`), ...groups.flatMap((g) => fields.map((f) => `${g}.${f}`))]
    return {
      label: pick(keys(['label', 'etiqueta', 'title', 'titulo', 'name', 'nombre']), fbLabel).toUpperCase(),
      value: pick(keys(['value', 'valor', 'metric', 'metrica', 'dato']), fbValue),
      caption: pick(keys(['desc', 'description', 'descripcion', 'caption', 'detail', 'detalle', 'subtitle']), ''),
      accent,
    }
  }
  patch.cardA = card('A', 'gray', 'PARÁMETRO A', 'VALOR')
  patch.cardB = card('B', 'cyan', 'PARÁMETRO B', 'VALOR')
  patch.verdict = pick(['verdict', 'veredicto', 'conclusion', 'conclusión'], '').toUpperCase()

  // 03 · Gráfico (sólo cuando es la plantilla elegida)
  if (template === 'chart') {
    const c = base.chart
    const chartBlock = obj(s.grafico ?? s.chart)
    const cd = Object.keys(chartBlock).length ? chartBlock : d
    const csv = (v: unknown, fb: string) => (Array.isArray(v) ? v.join(', ') : first(v, fb))
    patch.chart = {
      ...c,
      mode: oneOf(cd.mode, CHART_MODES, 'curve'),
      title: upper(first(cd.title, c.title)),
      min: num(cd.min, c.min),
      max: num(cd.max, c.max),
      unit: str(cd.unit),
      zone: first(cd.zone, c.zone),
      zoneLabel: str(cd.zoneLabel),
      shape: oneOf(cd.shape, SHAPES, 'bell'),
      barLabels: csv(cd.barLabels, c.barLabels),
      barValues: csv(cd.barValues, c.barValues),
      gaugeValue: num(cd.gaugeValue, c.gaugeValue),
      gaugeThreshold: num(cd.gaugeThreshold, c.gaugeThreshold),
      gaugeLabel: str(cd.gaugeLabel),
    }
  }

  // 04 · Sentencia
  patch.kicker = upper(first(obj(s.sentencia).highlight, obj(s.statement).kicker, template === 'statement' ? d.kicker : '', s.kicker))

  // 05 · Manifiesto
  patch.manifestoAuthor = upper(first(obj(s.manifiesto ?? s.manifesto).author, template === 'manifesto' ? d.author : '', DEFAULT_AUTHOR))

  // 06 · Diagrama: siempre con datos propios del tema (IA o pilar), nunca los de otra placa.
  const db = obj(s.diagram ?? s.diagrama ?? (template === 'diagram' ? d : undefined))
  const pillar = inferPillar(ctx.discipline ?? 'general', `${ctx.topic ?? ''} ${str(s.theme)}`, `${patch.tag} ${headline}`, patch.body ?? '')
  patch.diagramData = diagramFromAi(db, diagramDefaults(pillar))
  const kind = DIAGRAM_KIND_MAP[first(db.recommendedType, db.kind, db.type).toLowerCase()]
  if (kind) patch.diagramKind = kind

  // 07 · Repetición
  const r = obj(s.repeticion ?? s.repeat ?? (template === 'repeat' ? d : undefined))
  const short = upper(first(r.phrase, r.frase))
  const long = upper(first(r.phraseLarga, r.phraseLong))
  const aiMode = REPEAT_MODES.find((x) => x === str(r.mode))
  const mode: RepeatMode = aiMode ?? (template === 'repeat' && short && short.split(/\s+/).length <= 2 ? 'echo' : 'diagonal')
  const wantsShort = mode === 'echo' || mode === 'kinetic'
  patch.repeatPhrase = (wantsShort ? first(short, long) : first(long, short)) || headline || base.repeatPhrase
  if (template === 'repeat' || aiMode) patch.repeatMode = mode
  return patch
}

export interface GenerationResult {
  format: 'single' | 'stories' | 'carousel'
  slides: Partial<CanvasState>[]
  caption: string
  /** Fase 1 del planner: objetivo detectado y secuencia de plantillas */
  plan?: { goal: string; intent: string; sequence: TemplateId[] }
}

export function parseGeneration(payload: unknown, mode: GenMode, ctx: SlideContext = {}): GenerationResult {
  const root = obj(payload)
  const rawSlides = Array.isArray(root.slides) ? root.slides : Array.isArray(payload) ? payload : [payload]
  let slides = rawSlides.map((raw) => slideToPatch(raw, ctx)).filter((p) => p.headlineA || p.headlineB)
  if (!slides.length) throw new Error('La IA no devolvió slides utilizables.')
  const limit = mode === 'single' ? 1 : mode === 'stories' ? 3 : mode === 'carousel' ? 5 : 5
  slides = slides.slice(0, limit)
  const declared = oneOf(root.format, ['single', 'stories', 'carousel'] as const, 'single')
  const format = mode === 'auto' ? (slides.length === 1 ? 'single' : declared === 'single' ? 'carousel' : declared) : mode
  const caption = str(root.caption).replace(/\r\n/g, '\n')
  const rawPlan = obj(root.plan)
  const plan = Object.keys(rawPlan).length
    ? { goal: str(rawPlan.objetivo ?? rawPlan.goal), intent: str(rawPlan.intencion ?? rawPlan.intent), sequence: slides.map((sl) => sl.template ?? 'statement') }
    : undefined
  return { format, slides, caption, plan }
}

export async function generateContent(
  settings: AiSettings,
  topic: string,
  mode: GenMode,
  discipline: Discipline,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
  editorial?: EditorialOptions,
): Promise<GenerationResult> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const user = buildUserPrompt(topic, mode, discipline, editorial)
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, onModelChange, settings.geminiModels ?? [])
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal)
        : callOpenAI(key, model, prompt, signal)
  const text = await ask(user)
  try {
    return parseGeneration(safeParseJson(text), mode, { discipline, topic })
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    // Ni la limpieza local lo salvó: un único reintento pidiéndole al modelo la corrección.
    onStatus?.('[ Respuesta con JSON inválido · Pidiendo corrección sintáctica... ]')
    const fixed = await ask(repairPrompt(err))
    try {
      const result = parseGeneration(safeParseJson(fixed), mode, { discipline, topic })
      onStatus?.(null)
      return result
    } catch (again) {
      onStatus?.(null)
      if (again instanceof JsonRepairError) throw new Error(`La IA devolvió un JSON inválido dos veces (${again.message}). Probá de nuevo.`)
      throw again
    }
  }
}

// ---------------------------------------------------------------------------
// Re-generación de una sola placa (usa el mismo prompt de sistema, llamadas y parser).

/** Plantillas de la app → templateId que entiende la IA. */
const AI_TEMPLATE_ID: Partial<Record<TemplateId, string>> = {
  metric: 'metrica',
  compare: 'ab',
  chart: 'grafico',
  statement: 'sentencia',
  manifesto: 'manifiesto',
  diagram: 'diagrama',
  repeat: 'repeticion',
}

export interface RegenerateRequest {
  topic: string
  discipline: Discipline
  /** Placa a reformular y su posición en la secuencia */
  slide: CanvasState
  index: number
  /** Titulares del resto de las placas, para mantener la coherencia del carrusel */
  others: { index: number; title: string }[]
}

function regeneratePrompt(req: RegenerateRequest) {
  const base = buildUserPrompt(req.topic, 'single', req.discipline)
  const current = `${req.slide.headlineA} ${req.slide.headlineB}`.trim()
  const aiTemplate = AI_TEMPLATE_ID[req.slide.template]
  const context = req.others.length
    ? `Es la placa ${req.index + 1} de una secuencia de ${req.others.length + 1}. Las otras placas (no las repitas ni las contradigas):\n${req.others
        .map((o) => `- Placa ${o.index + 1}: ${o.title}`)
        .join('\n')}`
    : 'Es una placa única.'
  return `${base}

REFORMULÁ ÚNICAMENTE ESTA PLACA. ${context}
Versión actual de la placa ${req.index + 1}: "${current}".
Escribí una versión nueva y mejor (otro ángulo, otro dato o una frase más contundente), coherente con el tema principal.${
    aiTemplate
      ? ` Mantené templateId "${aiTemplate}"${
          req.slide.template === 'diagram'
            ? ` con diagrama.recommendedType "${({ radar: 'radar', domino: 'domino', circles: 'circulos', curve: 'trayectoria' } as const)[req.slide.diagramKind]}"`
            : req.slide.template === 'repeat'
              ? ` con repeticion.mode "${req.slide.repeatMode}"`
              : ''
        }.`
      : ''
  } Devolvé exactamente 1 slide y "caption": "".`
}

/** Pide a la IA una versión nueva de la placa activa, sin tocar el resto de la secuencia. */
export async function regenerateSlide(
  settings: AiSettings,
  req: RegenerateRequest,
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<Partial<CanvasState>> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave del Generador IA.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, undefined, settings.geminiModels ?? [])
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal)
        : callOpenAI(key, model, prompt, signal)
  const text = await ask(regeneratePrompt(req))
  let parsed: unknown
  try {
    parsed = safeParseJson(text)
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    onStatus?.('[ Respuesta con JSON inválido · Pidiendo corrección sintáctica... ]')
    parsed = safeParseJson(await ask(repairPrompt(err)))
  }
  onStatus?.(null)
  return parseGeneration(parsed, 'single', { discipline: req.discipline, topic: req.topic }).slides[0]
}
