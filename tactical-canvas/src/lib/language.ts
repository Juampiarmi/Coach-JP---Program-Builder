import type { CanvasState } from '../types'

/**
 * BLINDAJE DE LENGUAJE COACH JP: argentino neutro de sala de entrenamiento, sin muletillas de IA.
 * Una sola lista alimenta tres cosas: la regla del prompt, el filtro que limpia lo que devuelve la IA
 * y el aviso del Doctor de retención sobre placas ya armadas.
 */

/** Límites de palabra con letras acentuadas (\b no las reconoce). */
const W = (core: string) => new RegExp(`(?<![\\p{L}])(${core})(?![\\p{L}])`, 'giu')

/** Muletillas con reemplazo directo: se corrigen solas en la salida de la IA. */
const REPLACEABLE: { rx: RegExp; label: string; to: (m: string) => string }[] = [
  { rx: W('cruciales|crucial'), label: 'crucial', to: (m) => (/es$/i.test(m) ? 'claves' : 'clave') },
  { rx: W('fundamentales|fundamental'), label: 'fundamental', to: (m) => (/es$/i.test(m) ? 'claves' : 'clave') },
  { rx: W('desencadenar|desencadena|desencadenan|desencadenó|desencadenando'), label: 'desencadenar', to: (m) => m.toLowerCase().replace('desencaden', 'dispar') },
  { rx: W('descubre|descubrí|descubrilo|descubrelo'), label: 'descubrí', to: () => 'mirá' },
  { rx: W('descubrir'), label: 'descubrir', to: () => 'ver' },
  { rx: W('revolucionarios|revolucionarias|revolucionario|revolucionaria'), label: 'revolucionario', to: () => '' },
  { rx: /(^|[.!?·:]\s*)en resumen[,:]?\s*/giu, label: 'en resumen', to: (m) => m.replace(/en resumen[,:]?\s*/i, '') },
]

/** Ganchos gastados sin reemplazo automático: hay que reescribirlos (el Doctor los marca). */
const TELLS: { rx: RegExp; label: string }[] = [
  { rx: /est[aá]s entrenando mal/iu, label: '«estás entrenando mal»' },
  { rx: /sistema nervioso (?:no )?est[aá] (?:«)?frito|snc (?:«)?frito/iu, label: '«tu sistema nervioso no está frito»' },
  { rx: /siguiente nivel/iu, label: '«siguiente nivel»' },
  { rx: /mejor versi[oó]n/iu, label: '«tu mejor versión»' },
]

/** Respeta mayúsculas: «CRUCIAL» → «CLAVE», «Crucial» → «Clave». */
function matchCase(src: string, out: string) {
  if (!out) return out
  if (src === src.toUpperCase() && /\p{L}/u.test(src)) return out.toUpperCase()
  if (src[0] === src[0].toUpperCase()) return out[0].toUpperCase() + out.slice(1)
  return out
}

/** Reemplaza las muletillas de IA por lenguaje de sala (sin tocar el resto del texto). */
export function deAI(text: string): string {
  if (!text) return text
  let t = text
  for (const r of REPLACEABLE) t = t.replace(r.rx, (m) => matchCase(m.trim(), r.to(m)))
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([,.;:])/g, '$1')
  // Si se fue la muletilla del arranque («En resumen, …»), la frase vuelve a empezar en mayúscula.
  if (/^\p{Lu}/u.test(text) && /^\p{Ll}/u.test(t)) t = t[0].toUpperCase() + t.slice(1)
  return t
}

/** Muletillas y ganchos gastados presentes en un texto (para avisar). */
export function aiTells(text: string): { label: string; fixable: boolean }[] {
  const out: { label: string; fixable: boolean }[] = []
  for (const r of REPLACEABLE) if (new RegExp(r.rx.source, r.rx.flags.replace('g', '')).test(text)) out.push({ label: `«${r.label}»`, fixable: true })
  for (const r of TELLS) if (r.rx.test(text)) out.push({ label: r.label, fixable: false })
  return out
}

/**
 * Aplica deAI a todos los textos redactados de una placa. La frase de una cita (quoteText) NO se
 * toca: es literal de su autor.
 */
export function cleanSlideLanguage<T extends Partial<CanvasState>>(p: T): T {
  const s = (v: string | undefined) => (typeof v === 'string' ? deAI(v) : v)
  const out: Partial<CanvasState> = { ...p }
  for (const k of ['tag', 'headlineA', 'headlineB', 'body', 'kicker', 'verdict', 'metricLabel', 'quoteRule', 'athleticCta', 'workoutNote', 'fixWrongText', 'fixRightText', 'mythText', 'truthText', 'serviceCta', 'serviceAvailability'] as const) {
    if (typeof out[k] === 'string') (out as Record<string, unknown>)[k] = s(out[k] as string)
  }
  if (out.essayParas) out.essayParas = out.essayParas.map((x) => deAI(x))
  if (out.opusBlocks) out.opusBlocks = out.opusBlocks.map((b) => ({ ...b, text: deAI(b.text) }))
  if (out.athleticRows) out.athleticRows = out.athleticRows.map((r) => ({ k: deAI(r.k), v: deAI(r.v) }))
  if (out.serviceItems) out.serviceItems = out.serviceItems.map((x) => deAI(x))
  if (out.bookmarkData) out.bookmarkData = { ...out.bookmarkData, points: out.bookmarkData.points.map((x) => deAI(x)), cta: deAI(out.bookmarkData.cta) }
  if (out.cardA) out.cardA = { ...out.cardA, caption: deAI(out.cardA.caption) }
  if (out.cardB) out.cardB = { ...out.cardB, caption: deAI(out.cardB.caption) }
  return out as T
}

/** Regla de lenguaje para los system prompts (generación, re-generación y herramientas). */
export const ARG_LANGUAGE_RULE = `LENGUAJE COACH JP · ARGENTINO NEUTRO DE SALA (inquebrantable, aplica a titulares, bajadas, listas, CTA y caption):
- Voseo profesional en todos los imperativos y verbos dirigidos al lector: entrená, buscá, anotá, ajustá, cargá, descansá, hacelo, probalo, mandá. Nunca tuteo («entrena», «busca», «descubre», «hazlo») ni «usted».
- PROHIBIDO, suena a IA o a folleto: «desencadenar», «crucial», «fundamental», «en resumen», «descubre / descubrí», «revolucionario», «estás entrenando mal», «tu sistema nervioso no está frito», «llevá tu entrenamiento al siguiente nivel», «tu mejor versión», «sumergite en», «en el mundo del fitness», «es importante destacar», «por otro lado».
- Vocabulario de sala que SÍ se usa: series efectivas, RIR / RPE, tensión mecánica, fallo real, pausas completas, estímulo vs fatiga, sobrecarga progresiva, laburo de fuerza, volumen semanal, patrón de movimiento, técnica bajo carga, registro de cargas.
- Frases cortas con sujeto concreto (vos, la serie, la barra, la carga). Cero conectores de redacción escolar.
- ADAPTACIÓN CIENTÍFICA: cuando hables de papers o fisiología, prohibida la explicación teórica abstracta. Cada hallazgo se traduce en UNA regla directa para la barra, en tono Coach JP (ej: «Anotá carga y RIR de cada serie: si no sube en 3 semanas, ajustá el volumen»). Si una oración no termina en algo que se hace en el gimnasio, sobra.`
