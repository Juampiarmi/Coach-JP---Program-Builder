import type { CanvasState, ServiceMode, ServiceSport, TemplateId } from '../../types'
/**
 * IA de Tactical Canvas: orquestación (generar, mapear copy, ráfagas, re-generar y herramientas).
 * Los prompts viven en ./prompts, el parseo de la respuesta en ./parser y los clientes de cada
 * proveedor en ./providers; esta es la API pública de siempre (`import … from '../lib/ai'`).
 */
import { detectStructuredCopy, guardMapped, mapLocally, type MappedBlock } from '../copyMapping'
import { JsonRepairError, safeParseJson } from '../safeJson'
import { deAI } from '../language'
import { SERVICE_BY_ID, SERVICES } from '../services'
import { type Discipline, type GenMode, type AiSettings, GEMINI_DEFAULT_MODEL, DEFAULT_AI_SETTINGS, type EditorialOptions, type EditorialTone, type StatusFn, type ModelChangeFn } from './config'
import { citeFromPaper, enforceLibrary, loadPaperLibrary, paperLibraryRule } from '../paperLibrary'
import { DISCIPLINE_RULE, TONE_RULE, buildUserPrompt, repairPrompt, MAPPING_SYSTEM, mappingPrompt, TOOL_SYSTEM } from './prompts'
import { callOpenAI, callAnthropic, HttpError, RateLimitError, rateLimitError, markExhausted, isExhausted, callGemini } from './providers'
import { obj, str, num, upper, stripBrackets, AI_DIAGRAM_TYPE, first, list, type SlideContext, slideToPatch, cleanText, sanitizePatch, cleanCaption, type GenerationResult, parseGeneration } from './parser'

export { MODEL_OPTIONS, GEMINI_DEFAULT_MODEL, PROVIDER_LABEL, KEY_PLACEHOLDER, DEFAULT_AI_SETTINGS, MODE_LABEL, DISCIPLINE_LABEL, TONE_LABEL, GOAL_LABEL } from './config'
export type { AiProvider, Discipline, GenMode, AiSettings, InputMode, EditorialGoal, ResolvedGoal, EditorialOptions, EditorialTone, StatusFn, ModelChangeFn } from './config'
export { SYSTEM_PROMPT, detectGoal, formatForcedToCarousel, resolveFormat, EVIDENCE_RULE, salesEnrichment, BRIEF_EXPAND_WORDS, expandBriefInput, buildUserPrompt } from './prompts'
export { RateLimitError, resetQuotaMemory, OVERLOAD_FINAL_MSG, extractJson } from './providers'
export type { QuotaKind } from './providers'
export { slideToPatch, cleanText, cleanCaption, collapseRepeats, enforceSubstance, enforceQuote, parseGeneration } from './parser'
export type { SlideContext, GenerationResult } from './parser'

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
  // Biblioteca de papers en modo exclusivo: lista cerrada de citas en el prompt + guardia en la salida.
  const papers = loadPaperLibrary()
  const libRule = paperLibraryRule(papers)
  const user = buildUserPrompt(topic, mode, discipline, editorial) + (libRule ? `\n\n${libRule}` : '')
  const guard = (r: GenerationResult): GenerationResult => (libRule ? { ...r, slides: r.slides.map((x) => enforceLibrary(x, papers)) } : r)
  const ctx: SlideContext = { discipline, topic, quote: editorial?.quote ?? null }
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, onModelChange, settings.geminiModels ?? [])
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal)
        : callOpenAI(key, model, prompt, signal)
  const text = await ask(user)
  try {
    return guard(parseGeneration(safeParseJson(text), mode, ctx))
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    // Ni la limpieza local lo salvó: un único reintento pidiéndole al modelo la corrección.
    onStatus?.('[ Respuesta con JSON inválido · Pidiendo corrección sintáctica... ]')
    const fixed = await ask(repairPrompt(err))
    try {
      const result = guard(parseGeneration(safeParseJson(fixed), mode, ctx))
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
// MODO 1 · Mapeo fiel de copy existente (sin inventar nada).

export { detectStructuredCopy, mapLocally }

/**
 * Mapeo fiel: la IA sólo reparte el texto del usuario en tag / titular / remate / cierre; las
 * guardas locales (guardMapped) vuelven a validar fidelidad, citas y plantillas. Sin API Key o si
 * la IA falla, el mapeo se hace 100 % local con el mismo resultado estructural.
 */
export async function mapCopy(
  settings: AiSettings,
  text: string,
  blocks: MappedBlock[],
  discipline: Discipline,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
): Promise<GenerationResult & { local: boolean }> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  const done = (slides: Partial<CanvasState>[], caption: string, local: boolean) => ({
    format: (slides.length === 1 ? 'single' : 'carousel') as GenerationResult['format'],
    slides: slides.map((sl) => sanitizePatch({ ...sl }, true)),
    caption,
    plan: { goal: 'mapeo', intent: 'Maquetar el copy del usuario sin cambios', sequence: slides.map((sl) => sl.template ?? 'statement') },
    local,
  })
  if (!key) return done(mapLocally(blocks), '', true)
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const prompt = mappingPrompt(blocks, discipline)
  try {
    const raw =
      settings.provider === 'gemini'
        ? await callGemini(key, model, prompt, signal, onStatus, onModelChange, settings.geminiModels ?? [], MAPPING_SYSTEM)
        : settings.provider === 'anthropic'
          ? await callAnthropic(key, model, prompt, signal, MAPPING_SYSTEM)
          : await callOpenAI(key, model, prompt, signal, MAPPING_SYSTEM)
    const root = obj(safeParseJson(raw))
    const aiSlides = (Array.isArray(root.slides) ? root.slides : []).map((r) => slideToPatch(r, { discipline, topic: text }))
    return done(guardMapped(blocks, aiSlides, text), cleanCaption(str(root.caption)), false)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (err instanceof RateLimitError) throw err
    // Cualquier otro problema (JSON roto, modelo caído): el copy igual se maqueta localmente.
    onStatus?.(null)
    return done(mapLocally(blocks), '', true)
  }
}

// ---------------------------------------------------------------------------
// MODO 2 · Ráfagas de Mindset Táctico (1 a 7 variantes de titular + remate).

export interface MindsetBurst {
  white: string
  accent: string
}

/** Pseudociencia inflada prohibida en las ráfagas: si la IA igual la usa, la tarjeta se descarta. */
const PSEUDO = /fricci[oó]n cortical|dopamin|destrucci[oó]n del (snc|sistema nervioso)|destru\w* (el|tu|tus) (snc|sistema nervioso)|colapso del snc|snc (frito|destruido|quemado)|neuroplastic|cortisol t[oó]xico|cerebro reptil|qu[ií]mica cerebral|neuroqu[ií]mic/i

/** Remate naranja: 6 palabras como máximo. Lo que sobra al principio pasa al titular blanco (no se pierde texto). */
export const ACCENT_MAX_WORDS = 6
export function balanceBurst(b: MindsetBurst): MindsetBurst {
  const acc = b.accent.split(/\s+/).filter(Boolean)
  if (acc.length <= ACCENT_MAX_WORDS) return b
  const moved = acc.slice(0, acc.length - ACCENT_MAX_WORDS)
  return { white: [b.white, ...moved].filter(Boolean).join(' '), accent: acc.slice(-ACCENT_MAX_WORDS).join(' ') }
}

/** Clichés de autoayuda prohibidos: si la IA igual los usa, la tarjeta se descarta. */
const CLICHES = /mejor versi[oó]n|romp[eé]\w* (tus|los) l[ií]mites|hasta que el cuerpo diga basta|el dolor es temporal|no pain|sal de tu zona de confort|cree en ti|cre[eé] en vos|nunca te rindas|todo es posible|tu [uú]nico l[ií]mite|sue[nñ]a en grande|el [eé]xito es|actitud positiva/i

export async function generateMindsetBursts(
  settings: AiSettings,
  ctx: { topic: string; count: number; discipline: Discipline },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<MindsetBurst[]> {
  const n = Math.min(7, Math.max(1, Math.round(ctx.count)))
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `COACH JP · HIGH PERFORMANCE SYSTEM · RÁFAGA DE MINDSET TÁCTICO.
${ctx.topic.trim() ? `Eje del usuario: «${ctx.topic.trim()}».` : 'Eje: disciplina operativa en el entrenamiento.'}
${focus ? `${focus}
` : ''}Escribí ${n} titulares para una placa, en MAYÚSCULAS, cada uno partido en:
- "white": la FRASE PRINCIPAL de contexto, legible por sí sola (5 a 12 palabras). Lleva la idea completa.
- "accent": el remate corto que golpea (2 a 6 palabras, NUNCA más de 6). Contrasta o cierra la idea, no la explica.
  Ej: white «LAS GANAS APARECEN DESPUÉS DE CUMPLIR EL PROTOCOLO» · accent «NUNCA ANTES.»
TONO: brutalista, implacable, frío y operativo, en el terreno del alto rendimiento real. Vocabulario: protocolo, estándar operativo, consistencia, sistemas de carga, disciplina de ejecución, registro, progresión, sesión cumplida, carga medida.
PROHIBIDO el lenguaje pseudocientífico o inflado: «fricción cortical», «tasa de dopamina disponible», cualquier «dopamina», «destrucción / colapso del SNC», «SNC frito», «neuroplasticidad», «cortisol tóxico», «cerebro reptiliano», «química cerebral». Si no es una variable que un entrenador mide en la sala, no va.
PROHIBIDO: autoayuda barata y clichés («sé tu mejor versión», «rompé tus límites», «entrená hasta que el cuerpo diga basta», «el dolor es temporal», «salí de tu zona de confort», «creé en vos»), emojis, signos de exclamación y cifras inventadas.
Cada variante con un ángulo distinto (no repitas estructura ni palabras clave).
Forma exacta: { "bursts": [ ${n} objetos { "white": string, "accent": string } ] }`
  const res = await askJson(settings, user, signal, onStatus)
  const list = (Array.isArray(res.bursts) ? res.bursts : Array.isArray(res.hooks) ? res.hooks : []).map(obj)
  const out = list
    .map((b) => ({ white: cleanText(upper(first(b.white, b.titleWhite, b.blanco, b.titular))), accent: cleanText(upper(first(b.accent, b.titleAccent, b.remate))) }))
    .filter((b) => (b.white || b.accent) && !CLICHES.test(`${b.white} ${b.accent}`) && !PSEUDO.test(`${b.white} ${b.accent}`))
    .map(balanceBurst)
    .map((b) => ({ white: deAI(b.white), accent: deAI(b.accent) }))
    .slice(0, n)
  if (!out.length) throw new Error('La IA no devolvió ráfagas utilizables (o sólo clichés / pseudociencia descartados). Probá de nuevo.')
  return out
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
  matrix: 'matriz2x2',
  pipeline: 'pipeline',
  pyramid: 'piramide',
  checklist: 'checklist',
  bookmark: 'guardado',
  opus: 'opus',
  quote: 'cita',
  athletic: 'athletic',
  workout: 'rutina',
  fix: 'error_correccion',
  essay: 'manifiesto_texto',
  service: 'servicio',
  myth: 'mito_fisiologia',
}

export interface RegenerateRequest {
  topic: string
  discipline: Discipline
  /** Placa a reformular y su posición en la secuencia */
  slide: CanvasState
  index: number
  /** Titulares del resto de las placas, para mantener la coherencia del carrusel */
  others: { index: number; title: string }[]
  /** Tono editorial elegido en el generador */
  tone?: EditorialTone
}

function regeneratePrompt(req: RegenerateRequest) {
  const base = `${buildUserPrompt(req.topic, 'single', req.discipline)}\n\n${TONE_RULE[req.tone ?? 'viral']}`
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
          // Embudo y VS binario son variantes manuales: la IA no los genera, así que no se fija el tipo.
          req.slide.template === 'diagram' && req.slide.diagramKind in AI_DIAGRAM_TYPE
            ? ` con diagrama.recommendedType "${AI_DIAGRAM_TYPE[req.slide.diagramKind as keyof typeof AI_DIAGRAM_TYPE]}"`
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
  const papers = loadPaperLibrary()
  const libRule = paperLibraryRule(papers)
  const text = await ask(regeneratePrompt(req) + (libRule ? `\n\n${libRule}` : ''))
  let parsed: unknown
  try {
    parsed = safeParseJson(text)
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    onStatus?.('[ Respuesta con JSON inválido · Pidiendo corrección sintáctica... ]')
    parsed = safeParseJson(await ask(repairPrompt(err)))
  }
  onStatus?.(null)
  return enforceLibrary(parseGeneration(parsed, 'single', { discipline: req.discipline, topic: req.topic }).slides[0], papers)
}

/** Settings de IA guardados por el generador (BYOK), con fusión profunda sobre los defaults. */
export function loadAiSettings(): AiSettings {
  try {
    const raw = JSON.parse(localStorage.getItem('jp-tactical-canvas:ai') ?? '{}') as Partial<AiSettings>
    return { ...DEFAULT_AI_SETTINGS, ...raw, keys: { ...DEFAULT_AI_SETTINGS.keys, ...raw.keys }, models: { ...DEFAULT_AI_SETTINGS.models, ...raw.models } }
  } catch {
    return DEFAULT_AI_SETTINGS
  }
}

async function askJson(settings: AiSettings, user: string, signal?: AbortSignal, onStatus?: StatusFn): Promise<Record<string, unknown>> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave del Generador IA.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, undefined, settings.geminiModels ?? [], TOOL_SYSTEM)
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal, TOOL_SYSTEM)
        : callOpenAI(key, model, prompt, signal, TOOL_SYSTEM)
  const text = await ask(user)
  try {
    return obj(safeParseJson(text))
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    return obj(safeParseJson(await ask(repairPrompt(err))))
  } finally {
    onStatus?.(null)
  }
}

/**
 * Pedido con Structured Outputs: en Gemini la respuesta se valida contra `schema`
 * (responseMimeType + responseSchema); en OpenAI / Anthropic el esquema va en el prompt.
 * Usa la misma cadena de modelos, reintentos y cuota que el generador de placas.
 */
export async function askStructured(
  settings: AiSettings,
  system: string,
  user: string,
  schema: object,
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<Record<string, unknown>> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave del Generador IA (modo placas).')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const withSchema = `${user}\n\nRespondé con un objeto JSON que cumpla exactamente este esquema (OpenAPI):\n${JSON.stringify(schema)}`
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, undefined, settings.geminiModels ?? [], system, schema)
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, withSchema, signal, system)
        : callOpenAI(key, model, withSchema, signal, system)
  const text = await ask(user)
  try {
    return obj(safeParseJson(text))
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    return obj(safeParseJson(await ask(repairPrompt(err))))
  } finally {
    onStatus?.(null)
  }
}

export type HookAngle = 'contrarian' | 'military' | 'science'
export interface HookVariant {
  angle: HookAngle
  white: string
  accent: string
}
export const HOOK_ANGLE_LABEL: Record<HookAngle, string> = {
  contrarian: 'CONTRARIAN',
  military: 'MILITAR',
  science: 'CIENTÍFICO',
}

/** 3 variantes de titular de portada (blanco + remate) con enfoques distintos. */
export async function generateHooks(
  settings: AiSettings,
  ctx: { topic: string; discipline: Discipline; headline: string },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<HookVariant[]> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `Tema del carrusel: "${ctx.topic}".
Titular actual de la portada: "${ctx.headline}".
${focus ? `${focus}\n` : ''}Escribí 3 titulares alternativos para la PLACA 1 (portada), en MAYÚSCULAS, de 5 a 12 palabras en total cada uno, partidos en "white" (base, en blanco) y "accent" (remate, en naranja). Un enfoque por titular:
1. "contrarian": desmitificador, rompe un mito común de fuerza o nutrición.
2. "military": estándar operativo, directivo, directo y riguroso.
3. "science": curiosidad científica, foco en un mecanismo fisiológico o un dato empírico real (sin inventar cifras).
Forma exacta: { "hooks": [ { "angle": "contrarian", "white": string, "accent": string }, { "angle": "military", "white": string, "accent": string }, { "angle": "science", "white": string, "accent": string } ] }`
  const res = await askJson(settings, user, signal, onStatus)
  const angles: HookAngle[] = ['contrarian', 'military', 'science']
  const hooks = (Array.isArray(res.hooks) ? res.hooks : []).map(obj)
  const out = angles
    .map((angle, i) => {
      const h = hooks.find((x) => str(x.angle).toLowerCase() === angle) ?? hooks[i] ?? {}
      return { angle, white: deAI(upper(first(h.white, h.titleWhite, h.blanco))), accent: deAI(upper(first(h.accent, h.titleAccent, h.remate))) }
    })
    .filter((h) => h.white || h.accent)
  if (!out.length) throw new Error('La IA no devolvió ganchos utilizables. Probá de nuevo.')
  return out
}

export interface TopicIdea {
  /** Tema concreto, listo para el generador (no una categoría) */
  title: string
  /** Ángulo: el error, el mito o la pregunta que lo vuelve publicable */
  angle: string
  /** Referencia real y verificable («Apellido y col., año · revista») o "" si no hay certeza */
  reference: string
  /** Qué encontró esa evidencia, en una línea */
  finding: string
}

const PILLAR_BRIEF: Record<'science' | 'workout' | 'mindset', string> = {
  science: 'LUNES · CIENCIA / FISIOLOGÍA: un mecanismo o hallazgo de fisiología del ejercicio, fuerza, hipertrofia, resistencia o nutrición deportiva que cambie cómo entrena alguien.',
  workout: 'MIÉRCOLES · RUTINA / SESIÓN: una sesión de entrenamiento aplicable (objetivo, estructura, método) respaldada por evidencia: ej. series por grupo muscular, pérdida de velocidad, descansos, frecuencia, autorregulación por RIR.',
  mindset: 'VIERNES · MINDSET / MANIFIESTO: una idea sobre adherencia, hábitos, consistencia o identidad de quien entrena, apoyada en psicología del comportamiento o del deporte (hábitos, intención de implementación, autoeficacia), nunca autoayuda.',
}

/**
 * Ideas de temas para el pilar del día: concretas, con ángulo de redes y respaldadas por evidencia real.
 * La regla anti-genérico y anti-invención va explícita: sin certeza del paper, la referencia queda vacía.
 */
export async function suggestTopics(
  settings: AiSettings,
  ctx: { pillar: 'science' | 'workout' | 'mindset'; discipline: Discipline; avoid?: string[] },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<TopicIdea[]> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `Sos el editor de contenido de COACH JP (alto rendimiento, Instagram, español argentino neutro). Proponé 5 temas para publicar hoy.
PILAR: ${PILLAR_BRIEF[ctx.pillar]}
${focus ? `${focus}\n` : ''}${ctx.avoid?.length ? `No repitas estos temas ya propuestos: ${ctx.avoid.map((t) => `«${t}»`).join(', ')}.\n` : ''}REGLAS:
- Nada genérico ni con olor a IA: prohibidos «la importancia de…», «tips para…», «beneficios de…», «todo lo que tenés que saber». Cada tema es una afirmación o pregunta concreta y específica (ej: «Por qué cortar la serie con 20 % de pérdida de velocidad te da la misma fuerza con la mitad de fatiga»).
- Cada tema se apoya en evidencia comprobable: "reference" con un estudio REAL y verificable en formato «Apellido y col., año · Revista» y "finding" con lo que encontró en una línea. Si no tenés certeza absoluta de que ese paper exista tal cual, dejá "reference" y "finding" vacíos (""): preferimos sin cita a una cita inventada.
- "angle": el gancho para redes en 1 línea (el error que comete el lector, el mito que se rompe o la pregunta que abre).
- Variá los temas (distintos mecanismos, ejercicios o situaciones); aplicables a gente que entrena de verdad.
Forma exacta: { "ideas": [ 5 objetos { "title": string, "angle": string, "reference": string, "finding": string } ] }`
  const res = await askJson(settings, user, signal, onStatus)
  const ideas = (Array.isArray(res.ideas) ? res.ideas : [])
    .map(obj)
    .map((i) => ({ title: str(first(i.title, i.tema)), angle: str(first(i.angle, i.angulo)), reference: str(first(i.reference, i.referencia)), finding: str(first(i.finding, i.hallazgo)) }))
    .filter((i) => i.title && !/^(la importancia|tips para|beneficios de|todo lo que)/i.test(i.title))
    .slice(0, 5)
  if (!ideas.length) throw new Error('La IA no devolvió ideas utilizables. Probá de nuevo.')
  return ideas
}

export interface HookScore {
  /** Puntaje global 1-10 */
  score: number
  /** Subpuntajes 1-10 */
  clarity: number
  impact: number
  retention: number
  /** Diagnóstico en una oración: qué funciona y qué le falta */
  verdict: string
  variants: { white: string; accent: string; why: string }[]
}

const clamp10 = (v: unknown) => Math.min(10, Math.max(1, Math.round(Number(v) || 0)))

/**
 * Puntaje del gancho: la IA evalúa el titular de la portada (claridad, impacto, retención) del 1 al 10
 * y propone 3 variantes más directas en voz Coach JP. Rúbrica explícita para que el número no sea humo.
 */
export async function scoreHook(
  settings: AiSettings,
  ctx: { topic: string; discipline: Discipline; headline: string },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<HookScore> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `Sos editor de contenido de alto rendimiento para Instagram (COACH JP). Evaluá el titular de la PORTADA de un carrusel.
Titular: «${ctx.headline}».
Tema del carrusel: «${ctx.topic || ctx.headline}».
${focus ? `${focus}
` : ''}RÚBRICA (1 a 10 cada una, sé exigente: un 8+ tiene que frenar el scroll de verdad):
- clarity: ¿se entiende en 2 segundos, sin contexto? Penalizá jerga, frases largas (más de 12 palabras) y dobles negaciones.
- impact: ¿choca con una creencia común, promete algo concreto o nombra un error que el lector comete? Penalizá lo genérico («la importancia de…», «tips para…»).
- retention: ¿abre una pregunta que obliga a deslizar? Penalizá si ya responde todo en la portada.
- score: promedio ponderado (impact 40 %, retention 35 %, clarity 25 %), redondeado.
- verdict: una oración en español argentino neutro: qué funciona y qué le falta.
Después escribí 3 variantes MEJORES en MAYÚSCULAS (5 a 12 palabras cada una), partidas en "white" (base) y "accent" (remate en naranja, máx 6 palabras), con un ángulo distinto cada una (desmitificar, error concreto, curiosidad con dato real). Voz Coach JP: directa, de sala, voseo, sin clickbait vacío, sin emojis ni signos de exclamación, sin cifras inventadas. "why": por qué rinde más, en 1 línea.
Forma exacta: { "score": number, "clarity": number, "impact": number, "retention": number, "verdict": string, "variants": [ 3 objetos { "white": string, "accent": string, "why": string } ] }`
  const res = await askJson(settings, user, signal, onStatus)
  const variants = (Array.isArray(res.variants) ? res.variants : [])
    .map(obj)
    .map((v) => ({ white: deAI(upper(first(v.white, v.blanco))), accent: deAI(upper(first(v.accent, v.remate))), why: str(first(v.why, v.porque)) }))
    .filter((v) => v.white || v.accent)
    .slice(0, 3)
  if (!res.score && !variants.length) throw new Error('La IA no devolvió una evaluación utilizable. Probá de nuevo.')
  return {
    score: clamp10(res.score),
    clarity: clamp10(res.clarity),
    impact: clamp10(res.impact),
    retention: clamp10(res.retention),
    verdict: str(res.verdict),
    variants,
  }
}

export interface FamousQuote {
  /** Frase en español (traducción fiel si el original es en otro idioma) */
  quote: string
  /** Texto original, si no estaba en español */
  original: string
  author: string
  /** Rol corto: «Bicampeón olímpico de maratón», «Fundador de Apple» */
  role: string
  /** Dónde lo dijo: entrevista, libro, discurso, comercial, con año */
  source: string
}

/**
 * Citas célebres REALES de deportistas y personas de éxito, con su fuente verificable. Las frases
 * apócrifas o mal atribuidas (muy comunes en las «frases de famosos») se descartan: sin fuente
 * concreta, no hay cita.
 */
export async function suggestQuotes(
  settings: AiSettings,
  ctx: { theme: string; person?: string; discipline: Discipline },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<FamousQuote[]> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `Buscá 3 citas célebres REALES para una placa estilo «Forbes Quotes» de COACH JP (alto rendimiento).
Tema: «${ctx.theme.trim() || 'disciplina, constancia y alto rendimiento'}».${ctx.person?.trim() ? `
Persona pedida: «${ctx.person.trim()}» (sólo citas de esa persona).` : '\nAutores: deportistas de élite, entrenadores, empresarios o personas de éxito reconocidas (variá el perfil).'}
${focus ? `${focus}
` : ''}REGLAS INQUEBRANTABLES:
- Sólo frases que la persona DIJO O ESCRIBIÓ de verdad, con una fuente concreta y verificable (entrevista, libro, discurso, documental, comercial) y su año.
- Prohibidas las frases apócrifas o de atribución dudosa (muchas «frases famosas» circulan con el autor equivocado). Ante la mínima duda, no la incluyas.
- Si el original no está en español, "quote" es una traducción fiel al español rioplatense neutro (sin adornos) y "original" el texto exacto en su idioma.
- Frases cortas a medianas (máx 220 caracteres). Nada de autoayuda vacía.
- Si no tenés certeza de ninguna, devolvé "quotes": [].
Forma exacta: { "quotes": [ { "quote": string, "original": string, "author": string (nombre y apellido), "role": string (rol corto en español, ej «Bicampeón olímpico de maratón»), "source": string (dónde y cuándo lo dijo) } ] }`
  const res = await askJson(settings, user, signal, onStatus)
  const list = (Array.isArray(res.quotes) ? res.quotes : []).map(obj)
  const out = list
    .map((q) => ({
      quote: str(first(q.quote, q.cita)).replace(/^[«"“\s]+|[»"”\s]+$/gu, ''),
      original: str(first(q.original)),
      author: str(first(q.author, q.autor)),
      role: str(first(q.role, q.rol)),
      source: str(first(q.source, q.fuente)),
    }))
    // Sin autor o sin fuente concreta no se ofrece: es la defensa contra las citas inventadas.
    .filter((q) => q.quote && q.author && q.source.length >= 6)
    .slice(0, 3)
  if (!out.length) throw new Error('La IA no encontró citas con fuente verificable para ese tema. Probá con otro tema o con una persona concreta.')
  return out
}

/** Paper indexado real para la placa: autor y año, journal y hallazgo en una línea. */
export async function suggestCitation(
  settings: AiSettings,
  ctx: { topic: string; discipline: Discipline; slide: string },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<{ citeMain: string; citeSub: string }> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  // Modo exclusivo: la IA sólo elige cuál de los papers de la biblioteca respalda la placa.
  const papers = loadPaperLibrary()
  if (paperLibraryRule(papers)) {
    const list = papers.papers.map((p, i) => `${i + 1}. ${citeFromPaper(p).citeMain} — «${p.title}» — ${p.finding}`).join('\n')
    const pick = await askJson(
      settings,
      `Contenido de la placa: "${ctx.slide}".\nTema general: "${ctx.topic}".\nBiblioteca de papers del coach:\n${list}\nElegí el paper de la lista que respalde MÁS directamente el contenido. Si ninguno lo respalda, devolvé 0. Forma exacta: { "index": number }`,
      signal,
      onStatus,
    )
    const p = papers.papers[Number(pick.index) - 1]
    if (!p) throw new Error('Ningún paper de tu biblioteca respalda esta placa. Sumá uno o desactivá el modo exclusivo.')
    return citeFromPaper(p)
  }
  const user = `Contenido de la placa: "${ctx.slide}".
Tema general: "${ctx.topic}".
${focus ? `${focus}\n` : ''}Sugerí UN estudio científico REAL, publicado en una revista indexada (ej: Journal of Strength and Conditioning Research, Sports Medicine, Medicine & Science in Sports & Exercise, British Journal of Sports Medicine, Journal of the International Society of Sports Nutrition), que respalde directamente ese contenido. Preferí revisiones sistemáticas y metaanálisis muy citados (ej: Schoenfeld y col. sobre volumen e hipertrofia, Morton y col. 2018 sobre proteína, Helms y col. 2014 sobre nutrición de culturismo). Si no tenés certeza de que el estudio exista exactamente con ese autor, año y revista, devolvé "found": false: nunca inventes una cita.
Forma exacta: { "found": boolean, "author": string (apellido del primer autor + «y col.», ej «Schoenfeld y col.»), "year": number, "journal": string (nombre completo de la revista), "finding": string (hallazgo principal en 1 línea técnica, máx 110 caracteres) }`
  const res = await askJson(settings, user, signal, onStatus)
  const author = first(res.author, res.autor)
  const year = first(res.year, res.anio, res.año)
  const journal = first(res.journal, res.revista)
  if (res.found === false || !author || !year || !journal) throw new Error('La IA no encontró un paper con certeza para esta placa. Ajustá el texto o cargalo a mano.')
  return {
    citeMain: stripBrackets(`${author}, ${year} · ${journal}`.toUpperCase()),
    citeSub: first(res.finding, res.hallazgo).slice(0, 140),
  }
}

// ---------------------------------------------------------------------------
// Video Studio · transcripción de audio con Gemini (multimodal: audio WAV en línea + prompt).

export interface TranscribedWord {
  word: string
  start: number
  end: number
}

const TRANSCRIBE_PROMPT = (duration: number) => `Transcribí el habla de este audio (español rioplatense) con marcas de tiempo a nivel PALABRA.
El audio dura ${duration.toFixed(2)} segundos. Los tiempos van en segundos con 2 decimales, relativos al inicio del audio, en orden y sin superponerse.
Es contenido de entrenamiento: respetá exactamente términos técnicos como RIR, RPE, 1RM, mTOR, excéntrico, concéntrico, isométrico, hipertrofia, sobrecarga progresiva, Hyrox, CrossFit, WOD, VO2máx, glucógeno.
Escribí cada palabra con su puntuación pegada (coma, punto, signos de pregunta). No inventes texto: si no hay habla, devolvé "words": [].
Respondé SOLO con JSON: { "words": [ { "word": string, "start": number, "end": number } ] }`

async function requestGeminiAudio(key: string, model: string, wavBase64: string, duration: number, signal?: AbortSignal) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: 'audio/wav', data: wavBase64 } }, { text: TRANSCRIBE_PROMPT(duration) }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 16384, temperature: 0 },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Quota exceeded', model)
  if (!res.ok) throw new HttpError(json?.error?.message ?? `Gemini respondió ${res.status}`, res.status)
  const cand = json?.candidates?.[0]
  if (!cand?.content) throw new Error(`Gemini no devolvió la transcripción${cand?.finishReason ? ` (${cand.finishReason})` : ''}.`)
  return ((cand.content.parts ?? []) as { text?: string }[]).map((p) => p.text ?? '').join('')
}

/**
 * Transcribe el audio (WAV mono en base64) y devuelve palabras con tiempos relativos al inicio
 * del audio, ordenadas, dentro de la duración y sin superposiciones. Usa la key de Gemini
 * guardada; si el modelo elegido no existe o agotó la cuota, prueba con los detectados.
 */
export async function transcribeAudio(
  settings: AiSettings,
  wavBase64: string,
  duration: number,
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<TranscribedWord[]> {
  const key = (settings.keys.gemini ?? '').trim()
  if (!key) throw new Error('La transcripción usa Gemini: cargá tu API Key de Gemini en el Generador IA (modo placas).')
  const preferred = (settings.models.gemini ?? '').trim() || GEMINI_DEFAULT_MODEL
  const models = [preferred, ...(settings.geminiModels ?? []).map((m) => m.id).filter((id) => id !== preferred)].slice(0, 4)
  let lastErr: unknown = null
  for (const model of models) {
    if (isExhausted(model)) continue
    try {
      onStatus?.(`[ Transcribiendo con ${model}… ]`)
      const text = await requestGeminiAudio(key, model, wavBase64, duration, signal)
      const raw = obj(safeParseJson(text))
      const list = (Array.isArray(raw.words) ? raw.words : Array.isArray(raw) ? (raw as unknown[]) : []).map(obj)
      const words: TranscribedWord[] = []
      for (const w of list) {
        const word = str(w.word ?? w.text).trim()
        let start = num(w.start, NaN)
        let end = num(w.end, NaN)
        if (!word || !Number.isFinite(start)) continue
        start = Math.min(duration, Math.max(0, start))
        end = Math.min(duration, Math.max(start + 0.05, Number.isFinite(end) ? end : start + 0.3))
        words.push({ word, start, end })
      }
      words.sort((a, b) => a.start - b.start)
      for (let i = 0; i < words.length - 1; i++) if (words[i].end > words[i + 1].start) words[i].end = Math.max(words[i].start + 0.05, words[i + 1].start)
      onStatus?.(null)
      return words
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      lastErr = err
      if (err instanceof RateLimitError) {
        markExhausted(err)
        continue
      }
      if (err instanceof HttpError && (err.status === 404 || err.status === 400)) continue
      throw err
    }
  }
  onStatus?.(null)
  throw lastErr instanceof Error ? lastErr : new Error('No se pudo transcribir el audio con los modelos disponibles.')
}

// ---------------------------------------------------------------------------
// SERVICIOS & PROGRAMAS · copy de venta por disciplina.

export interface ServiceCopy {
  white: string
  accent: string
  /** Ficha: pilares técnicos. Carátula: lo que incluye todo programa. */
  pillars: string[]
  cta: string
  availability: string
  caption: string
}

/**
 * Copy de conversión para la placa de servicio: gancho con las demandas físicas reales del deporte
 * (nada de «llevá tu rendimiento al siguiente nivel»), los 3 pilares de la metodología Coach JP para
 * esa disciplina y un caption de Instagram orientado a lead (DM o evaluación de ingreso).
 */
export async function generateServiceCopy(
  settings: AiSettings,
  ctx: { mode: ServiceMode; sport: ServiceSport; catalog: ServiceSport[] },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<ServiceCopy> {
  const sp = SERVICE_BY_ID[ctx.sport]
  const catalog = (ctx.catalog.length ? ctx.catalog : SERVICES.map((x) => x.id)).map((id) => SERVICE_BY_ID[id]?.label).filter(Boolean)
  const target =
    ctx.mode === 'single'
      ? `FICHA TÉCNICA de UN programa: ${sp.label.toUpperCase()}.
- "white" + "accent": gancho directo (máx 9 palabras entre los dos, MAYÚSCULAS) que nombre una DEMANDA FÍSICA REAL y específica de ${sp.label} (ej. para rugby: contactos repetidos y esfuerzos de alta intensidad con pausas cortas; para golf: velocidad de palo y carga rotacional sobre la zona lumbar). "accent" es el remate (va en naranja).
- "pillars": EXACTAMENTE 3 pilares técnicos de la metodología Coach JP para ${sp.label} (máx 90 caracteres cada uno), cubriendo: fisiología aplicada y demandas energéticas del deporte, prevención de lesiones típicas de ese deporte, y programación con RPE / RIR. Con datos concretos (zonas, rangos, ejercicios, sistemas energéticos), nunca frases de folleto.`
      : `CARÁTULA «SYSTEM OFFER» con el catálogo de programas: ${catalog.join(', ')}.
- "white" + "accent": gancho directo para la carátula (máx 9 palabras entre los dos, MAYÚSCULAS): que el lector se identifique por su deporte y entienda que hay un programa específico, no una rutina genérica.
- "pillars": EXACTAMENTE 3 cosas que incluye TODO programa (máx 34 caracteres cada una, ej «Evaluación de ingreso», «Video-análisis técnico», «Ajustes semanales por RPE»).`
  const user = `Sos el redactor de conversión de COACH JP (preparador físico de alto rendimiento, Instagram, español rioplatense con voseo). Escribí el copy de venta de una placa de servicio.
${target}
- "cta": botón de llamado a la acción en MAYÚSCULAS, máx 6 palabras, a DM con palabra clave o a la evaluación de ingreso (ej «MANDÁ '${ctx.mode === 'single' ? sp.short : 'PROGRAMA'}' POR DM»).
- "availability": etiqueta corta de disponibilidad en MAYÚSCULAS (ej «CUPOS LIMITADOS · EVALUACIÓN DE INGRESO»). No inventes cifras de cupos.
- "caption": caption de Instagram orientado a lead: 1) primera línea = gancho con la demanda real del deporte, 2) 2-3 líneas sobre el problema de entrenar sin especificidad, 3) qué incluye el programa en viñetas «▸», 4) cierre con la acción concreta (mandar la palabra clave por DM o completar la evaluación). Entre 60 y 140 palabras, sin hashtags genéricos (máx 4 específicos al final).
PROHIBIDO: clichés y promesas vacías («llevá tu rendimiento al siguiente nivel», «tu mejor versión», «resultados garantizados», «sin excusas»), testimonios o cifras inventadas, y pseudociencia.
Forma exacta: { "white": string, "accent": string, "pillars": [3 strings], "cta": string, "availability": string, "caption": string }`
  const res = await askJson(settings, user, signal, onStatus)
  const pillars = list(res.pillars ?? res.pilares).map((p) => p.replace(/^[▸•\-\s]+/, '').trim()).filter(Boolean).slice(0, 4)
  const white = upper(str(first(res.white, res.titleWhite)))
  const accent = upper(str(first(res.accent, res.titleAccent)))
  if (!white || pillars.length < 2) throw new Error('La IA no devolvió un copy de servicio utilizable. Probá de nuevo.')
  return {
    white: deAI(white),
    accent: deAI(accent),
    pillars: pillars.map(deAI),
    cta: deAI(upper(str(res.cta))),
    availability: upper(str(first(res.availability, res.disponibilidad))),
    caption: deAI(cleanCaption(str(res.caption))),
  }
}