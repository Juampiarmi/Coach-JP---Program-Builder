import type { CanvasState, TemplateId } from '../types'

/**
 * MODO 1 · Mapeo fiel de copy existente.
 * Cuando el usuario pega un texto ya estructurado (Placa 1… Placa 2…, lista numerada, viñetas
 * o párrafos separados), cada bloque es una placa: se respeta la cantidad exacta y el texto.
 * Este módulo detecta la estructura, corta cada bloque en tag / titular / remate / cierre sin IA
 * y valida lo que devuelva la IA (fidelidad, citas y plantillas) para que nunca invente.
 */

/** Tope de seguridad (Instagram admite hasta 20 placas por carrusel). */
export const MAX_MAPPED_SLIDES = 20

/**
 * Marcador de placa EN CUALQUIER POSICIÓN (no sólo a principio de renglón): «Placa 1:», «PLACA 2 —»,
 * «**Placa 3:**», «📍 Placa 4 (portada):», «[PLACA 5]», «Slide 6.». Así un guion pegado en una sola
 * línea (el campo de concepto borra los saltos) igual se parte en sus N placas.
 */
const MARKER_ANY = /(?<![\p{L}\p{N}])(?:placa|slide|diapositiva|l[aá]mina|tarjeta|card)\s*(?:n[°ºo.]?\s*)?(\d{1,2})(?![\p{N}])(?:\s*\/\s*\d{1,2})?(?:\s*\([^)\n]{0,40}\))?\s*\]?\s*\**\s*(?:[:.\-–—)|]+\s*)?/giu

export interface MappedBlock {
  /** Texto del bloque sin el marcador («Placa 3:», «3.», «-») */
  text: string
}

/** Renglón separador de placas: «---», «***», «___» o «Placa» / «Slide» sin número. */
const SEPARATOR_LINE = /^[ \t]*(?:-{3,}|\*{3,}|_{3,}|(?:placa|slide)[ \t]*[:.]?)[ \t]*$/gimu
const trimBlock = (t: string) => t.replace(/[\s*_#>\[\-–—📍•|]+$/u, '').replace(/^[\s\-–—*_]+$/u, '').trim()

/**
 * Corte del texto en placas (equivale a /(?:^|\n)(?:Placa\s*\d+|Slide\s*\d+|---|\bPlaca\b)/i, pero
 * aceptando también marcadores en medio de un renglón y con rótulos «(portada)», «**»…).
 * El texto antes del primer marcador «Placa N» se descarta (suele ser el título del guion).
 */
export function splitSlides(text: string): string[] {
  const parts = text.split(SEPARATOR_LINE)
  const marked = parts.map((p) => [...p.matchAll(MARKER_ANY)])
  const first = marked.findIndex((m) => m.length > 0)
  const out: string[] = []
  parts.forEach((part, pi) => {
    const marks = marked[pi]
    if (!marks.length) {
      // Tramo sin «Placa N»: es una placa si está separado por «---»; el preámbulo antes de la Placa 1 no.
      if (first === -1 || pi > first) out.push(trimBlock(part))
      return
    }
    const pre = part.slice(0, marks[0].index)
    if (pi > first && pre.trim()) out.push(trimBlock(pre))
    marks.forEach((m, i) => out.push(trimBlock(part.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : part.length))))
  })
  return out.filter(Boolean)
}

/** Bloques de un copy estructurado, o null si el texto no tiene estructura de placas. */
export interface DetectOptions {
  /** El usuario eligió [ 1 PLACA ]: todo el texto va a una sola placa, haya o no separadores. */
  single?: boolean
}

/** ¿Parece copy de placa (texto ya escrito) y no un brief? Renglones cortos y extensión acotada. */
function looksLikeCopy(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const total = text.split(/\s+/).filter(Boolean).length
  return lines.length >= 2 && total <= 90 && lines.every((l) => l.split(/\s+/).length <= 32)
}

/**
 * Bloques de un copy estructurado, o null si el texto no es copy de placas (ahí decide la IA).
 * Sólo los separadores EXPLÍCITOS cortan placas: «Placa N» / «Slide N» y renglones «---». Párrafos,
 * viñetas o listas numeradas sin separador son UNA placa (nunca se reparten en varias por su cuenta).
 */
export function detectStructuredCopy(raw: string, opts: DetectOptions = {}): MappedBlock[] | null {
  const text = raw.replace(/\r/g, '').trim()
  if (!text) return null
  const split = splitSlides(text)
  if (opts.single) {
    // 1 placa forzada: los tramos (sin sus marcadores) se juntan en una sola placa.
    if (split.length >= 2) return [{ text: split.join('\n') }]
    if (hasPaddedBlocks(text) || looksLikeCopy(text) || (split.length === 1 && split[0] !== text)) return [{ text: split[0] ?? text }]
    return null
  }
  if (split.length >= 2) return split.slice(0, MAX_MAPPED_SLIDES).map((t) => ({ text: t }))
  // Un solo «Placa 1:» explícito también es copy: una placa, sin el marcador.
  if (split.length === 1 && split[0] !== text) return [{ text: split[0] }]
  // Sin separadores explícitos: título + bloques «00001:», una cita o renglones de copy → UNA placa.
  if (hasPaddedBlocks(text) || looksLikeCopy(text)) return [{ text: split[0] ?? text }]
  return null
}

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Anáfora rítmica: 3+ bloques que arrancan con la(s) misma(s) palabra(s) («NO ES…», «NO ES…»). */
export function isAnaphora(blocks: MappedBlock[]): boolean {
  if (blocks.length < 3) return false
  // Se mira el titular de cada placa (sin rótulos «Titular:»), no el texto crudo del bloque.
  const heads0 = blocks.map((b) => splitBlock(b.text).headlineA || b.text)
  const heads = heads0.map((h) => words(h).slice(0, 2).join(' '))
  const firsts = heads0.map((h) => words(h)[0] ?? '')
  const most = (list: string[]) => Math.max(...list.map((h) => list.filter((x) => x === h).length))
  return most(heads) >= Math.ceil(blocks.length * 0.6) || most(firsts) >= Math.ceil(blocks.length * 0.7)
}

/** Rótulos del copy («Titular:», «Remate:», «Tag:», «Subtítulo:»…), en cualquier posición del bloque. */
const LABEL_ANY = /(?<![\p{L}])(header(?:_tag)?|tag(?: superior)?|etiqueta|t[ií]tulo principal|titular|t[ií]tulo|premisa|blanco|remate|golpe(?: de impacto)?|acento|subt[ií]tulo\s*\(\s*naranja\s*\)|naranja|subt[ií]tulo|bullets?|vi[ñn]etas?|texto inferior|texto central|footer|bajada|cierre|p[aá]rrafo|cuerpo)\s*[:：]/iu
const LABEL_ALL = new RegExp(LABEL_ANY.source, 'giu')

/** Limpia un valor: markdown, viñetas, separadores « / » sueltos y comillas envolventes. */
function cleanValue(v: string) {
  let t = v
    .replace(/\*\*|__/g, '')
    .replace(/^[\s\-•▸►▪●|/]+/u, '')
    .replace(/[\s|/\-–—]+$/u, '')
    .trim()
  const q = t.match(/^[«"“'‘](.*)[»"”'’]$/su)
  if (q) t = q[1].trim()
  return t.replace(/^[«"“]|[»"”]$/gu, '').trim()
}

/** Firma / sello de cierre («COACH JP · HIGH PERFORMANCE SYSTEM», «[MANIFIESTO]»): va al tag, nunca al titular. */
function isSignature(line: string) {
  const t = line.trim()
  if (/^\[[^\]]{2,48}\]$/.test(t)) return true
  if (/[.!?…:]$/.test(t) || t.split(/\s+/).length > 10) return false
  return /\s[·•|]\s/.test(t) || /^coach\s+jp\b/i.test(t)
}

const isUpperWord = (w: string) => /\p{L}/u.test(w) && w === w.toUpperCase()

/**
 * Un renglón con mayúsculas y minúsculas alternadas («NORMALIZAMOS TANTO LA DEBILIDAD que entrenar
 * la fuerza PARECE COSA DE CULTURISTAS.»): cada tramo es una parte (premisa / puente / remate).
 */
function caseRuns(line: string): string[] | null {
  const runs: { up: boolean; w: string[] }[] = []
  for (const w of line.split(/\s+/).filter(Boolean)) {
    const up = /\p{L}/u.test(w) ? isUpperWord(w) : (runs[runs.length - 1]?.up ?? true)
    if (runs.length && runs[runs.length - 1].up === up) runs[runs.length - 1].w.push(w)
    else runs.push({ up, w: [w] })
  }
  if (runs.length < 3 || !runs[0].up || !runs[runs.length - 1].up) return null
  return runs.map((r) => r.w.join(' '))
}

/**
 * Corte local de un bloque: respeta rótulos explícitos (aun en una sola línea), renglones y oraciones; nunca reescribe.
 * Estructura tripartita (PREMISA / PUENTE / REMATE): el titular blanco lleva premisa + puente con salto
 * forzado y el remate naranja la última parte. Ninguna línea se descarta.
 */
export function splitBlock(block: string): Partial<CanvasState> {
  // Cita célebre: «frase» / "frase" + renglón «— Nombre, rol».
  const quote = splitQuote(block)
  if (quote) return quote
  // Mindset / Opus: renglones «00001: texto» son bloques numerados aparte; el resto es el título.
  const opus = splitOpus(block)
  if (opus) return opus
  const out: Partial<CanvasState> = {}
  const src = block.replace(/\*\*|__/g, '')
  const labels = [...src.matchAll(LABEL_ALL)]
  if (labels.length) {
    // Texto antes del primer rótulo (si lo hay) cuenta como titular cuando no hay «Titular:».
    const pre = cleanValue(src.slice(0, labels[0].index))
    labels.forEach((m, i) => {
      const value = cleanValue(src.slice((m.index ?? 0) + m[0].length, i + 1 < labels.length ? labels[i + 1].index : src.length))
      const k = m[1].toLowerCase()
      if (!value) return
      // Los rótulos nunca llegan al texto: «Header:» → tag, «Título:» → titular, «Subtítulo (Naranja):»
      // → remate, «Subtítulo: / Texto inferior: / Footer: / Bullets:» → bajada.
      if (/header|tag|etiqueta/.test(k)) out.tag = value.replace(/^\[\s*|\s*\]$/g, '').toUpperCase()
      else if (/naranja|remate|golpe|acento/.test(k)) out.headlineB = [out.headlineB, value].filter(Boolean).join(' ')
      else if (/titular|t[ií]tulo|premisa|blanco/.test(k) && !/subt/.test(k)) out.headlineA = [out.headlineA, value].filter(Boolean).join(' ')
      else out.body = [out.body, value].filter(Boolean).join('\n')
    })
    if (pre && out.headlineA === undefined) out.headlineA = pre
  } else {
    let rest = src
      .split('\n')
      .map((l) => cleanValue(l))
      .filter(Boolean)
    // «PREMISA / PUENTE / GOLPE» en un renglón: la barra separa las partes igual que un salto.
    if (rest.length === 1) {
      const slash = rest[0].split(/\s+\/\s+/).map(cleanValue).filter(Boolean)
      if (slash.length >= 2) rest = slash
    }
    // Firma suelta (en su propio renglón o al final del bloque) → tag.
    const sigAt = rest.length >= 2 ? rest.findIndex(isSignature) : -1
    if (sigAt >= 0) out.tag = rest.splice(sigAt, 1)[0].replace(/^\[\s*|\s*\]$/g, '').toUpperCase()
    else if (rest.length === 1) {
      const tail = rest[0].match(/^(.*[.!?…])\s+((?:[\p{Lu}\p{N}&]+\s+){0,3}[\p{Lu}\p{N}&]+\s*[·|]\s*(?:[\p{Lu}\p{N}&]+\s*){1,5})$/u)
      if (tail) {
        rest[0] = tail[1].trim()
        out.tag = tail[2].trim().toUpperCase()
      }
    }
    if (rest.length >= 2) {
      let parts = rest
      // Un último renglón largo es párrafo de cierre, no remate.
      if (rest.length >= 3 && rest[rest.length - 1].split(/\s+/).length > 22) {
        out.body = rest[rest.length - 1]
        parts = rest.slice(0, -1)
      }
      if (parts.length >= 4) {
        // Copy largo en UNA placa: los dos primeros renglones son titular + remate y el resto, la
        // bajada (más chica), así todo entra armónico sin repartirse en varias placas.
        out.headlineA = parts[0]
        out.headlineB = parts[1]
        out.body = [parts.slice(2).join('\n'), out.body].filter(Boolean).join('\n')
      } else if (parts.length === 3 && /\p{Ll}/u.test(parts[2]) && parts[2].split(/\s+/).length >= 8) {
        // Último renglón en minúsculas y largo: es la bajada explicativa, no un remate de 12 palabras.
        out.headlineA = parts[0]
        out.headlineB = parts[1]
        out.body = [parts[2], out.body].filter(Boolean).join('\n')
      } else {
        out.headlineA = parts.slice(0, -1).join('\n')
        out.headlineB = parts[parts.length - 1]
      }
    } else if (rest.length === 1) {
      const runs = caseRuns(rest[0])
      const [a, b] = runs ? [runs.slice(0, -1).join('\n'), runs[runs.length - 1]] : splitSentence(rest[0])
      out.headlineA = a
      out.headlineB = b
    }
  }
  out.headlineA = (out.headlineA ?? '').toUpperCase()
  out.headlineB = (out.headlineB ?? '').toUpperCase()
  return out
}

/** Renglón de bloque numerado: «00001: texto», «01: texto», «- 00001: texto», «[00002] texto», «3. texto». */
const OPUS_LINE = /^\s*(?:[-•▸►▪*]\s*)?[[(]?(\d{1,6})[\])]?\s*[:.)\-–—]?\s+(.+)$/
/** Rótulo de bloque «de terminal»: con ceros a la izquierda (01, 00001) o de 3+ dígitos. Nunca «1.» de lista común. */
const PADDED = /^(?:0\d{1,5}|\d{3,6})$/
/** Bloques numerados dentro de un mismo renglón: «… 00001: texto 00002: texto». */
const INLINE_BLOCK = /(?:^|\s)(?:[-•▸►▪*]\s*)?[[(]?(0\d{1,5}|\d{3,6})[\])]?\s*:\s+/g

export interface NumberedSplit {
  /** Lo que no es bloque (título / cabecera), sin ningún rótulo «00001:» */
  rest: string
  blocks: { num: string; text: string }[]
}

/**
 * Separa los bloques numerados del resto del texto. Por renglón acepta cualquier número con
 * separador («1.», «01:», «00001:»); en línea corrida sólo rótulos acolchados con dos puntos, para no
 * confundir cifras («8.000 PASOS», «3 SERIES») con bloques.
 */
export function extractNumberedBlocks(text: string): NumberedSplit {
  const src = text.replace(/\*\*|__/g, '').replace(/\r/g, '')
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean)
  const hits = lines.map((l) => {
    const m = l.match(OPUS_LINE)
    // Sin separador explícito sólo vale un rótulo acolchado («00001 texto»).
    return m && (/[:.)\-–—]/.test(l.slice(0, l.indexOf(m[2]))) || PADDED.test(m[1])) ? m : null
  })
  const byLine = hits.filter((m): m is RegExpMatchArray => Boolean(m)).map((m) => ({ num: m[1], text: cleanValue(m[2]) }))
  if (byLine.length >= 2) return { rest: lines.filter((_, i) => !hits[i]).join('\n'), blocks: byLine }
  const marks = [...src.matchAll(INLINE_BLOCK)]
  if (marks.length >= 2) {
    const blocks = marks.map((m, i) => ({
      num: m[1],
      text: cleanValue(src.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : src.length).replace(/\s+/g, ' ')),
    }))
    return { rest: src.slice(0, marks[0].index).trim(), blocks: blocks.filter((b) => b.text) }
  }
  return { rest: src.trim(), blocks: [] }
}

/** ¿El texto trae 2+ bloques con rótulo de terminal («00001:», «01:»)? Decide el layout Mindset / Opus. */
export function hasPaddedBlocks(text: string) {
  const { blocks } = extractNumberedBlocks(text)
  return blocks.length >= 2 && blocks.every((b) => PADDED.test(b.num))
}

/** Bloque con 2+ bloques numerados → plantilla 13 · Mindset / Opus. El título nunca lleva «00001:». */
function splitOpus(block: string): Partial<CanvasState> | null {
  const { rest, blocks } = extractNumberedBlocks(block)
  if (blocks.length < 2) return null
  // Lista común «1. … 2. …» sin título ni rótulos acolchados: no es Opus (queda como estaba).
  if (!rest && !blocks.every((b) => PADDED.test(b.num))) return null
  const head = rest ? splitBlock(rest) : { headlineA: '', headlineB: '' }
  return { ...head, template: 'opus', opusBlocks: blocks.slice(0, 6) }
}

/** «"La frase." — Nombre Apellido, rol» (en uno o dos renglones) → plantilla 14 · Cita célebre. */
const QUOTE_RX = /^\s*(?:cita\s*[:：]\s*)?[«"“]([^«»"“”]{8,320})[»"”]\s*(?:\n\s*)?(?:[—–-]|autor\s*[:：])\s*([^\n,·|(]{3,60})(?:\s*[,·|(]\s*([^\n)]{2,80})\)?)?\s*$/iu
function splitQuote(block: string): Partial<CanvasState> | null {
  const m = block.replace(/\*\*|__/g, '').trim().match(QUOTE_RX)
  if (!m) return null
  return { template: 'quote', quoteText: m[1].trim(), quoteAuthor: m[2].trim(), quoteRole: (m[3] ?? '').trim(), quoteSource: '', headlineA: '', headlineB: '' }
}

/** Una sola frase → premisa + golpe: 2ª oración, o tras la última coma / dos puntos, o el último ~40 %. */
function splitSentence(s: string): [string, string] {
  const t = s.trim()
  // Corte de oración sólo si después viene espacio + palabra nueva y el token no es una abreviatura
  // («col.», «vs.», «etc.», «Dr.», iniciales o números).
  const sentences: string[] = []
  let from = 0
  for (const m of t.matchAll(/[.!?…]+(?=\s+[¿¡"«]?\p{L})/gu)) {
    const end = (m.index ?? 0) + m[0].length
    const token = t.slice(0, m.index).split(/\s+/).pop() ?? ''
    if (/^(col|cols|vs|etc|dr|dra|sr|sra|ej|aprox|fig|p|pp|n|nº)$/i.test(token) || /^\p{L}$/u.test(token) || /^\d+$/.test(token)) continue
    sentences.push(t.slice(from, end).trim())
    from = end
  }
  if (from < t.length) sentences.push(t.slice(from).trim())
  if (sentences.length >= 2) {
    // «… RESISTIR. NO ES QUE ENTRENAR SEA EXIGENTE: ES QUE …»: los dos puntos de la última oración
    // abren el remate; todo lo anterior (completo) queda en el titular.
    const last = sentences[sentences.length - 1]
    const colon = last.search(/[:;]\s/)
    if (colon > 0 && colon < last.length - 3) return [[...sentences.slice(0, -1), last.slice(0, colon + 1)].join('\n'), last.slice(colon + 1).trim()]
    // Staccato «CRITERIO. FISIOLOGÍA. ALTO RENDIMIENTO. QUE SEA COMÚN…»: las oraciones cortas son el titular.
    if (sentences.length >= 3 && sentences.slice(0, -1).every((x) => x.split(/\s+/).length <= 3)) return [sentences.slice(0, -1).join(' '), last]
    return [sentences[0], sentences.slice(1).join(' ')]
  }
  const cut = Math.max(t.lastIndexOf(','), t.lastIndexOf(':'), t.lastIndexOf(';'), t.lastIndexOf(' — '))
  if (cut > t.length * 0.25 && cut < t.length - 3) return [t.slice(0, cut + 1).trim(), t.slice(cut + 1).trim()]
  const w = t.split(/\s+/)
  if (w.length < 4) return [t, '']
  const k = Math.ceil(w.length * 0.6)
  return [w.slice(0, k).join(' '), w.slice(k).join(' ')]
}

/** Proporción de palabras de la placa que existen en el bloque original (1 = texto 100 % del usuario). */
export function fidelity(patch: Partial<CanvasState>, block: string): number {
  const src = new Set(words(block))
  const used = words(`${patch.headlineA ?? ''} ${patch.headlineB ?? ''} ${patch.body ?? ''}`)
  if (!used.length) return 0
  return used.filter((w) => src.has(w)).length / used.length
}

/** Proporción de palabras del bloque (sin rótulos) que llegan visibles a la placa: tag, titular y remate. */
export function coverage(patch: Partial<CanvasState>, block: string): number {
  const src = words(block.replace(LABEL_ALL, ' '))
  if (!src.length) return 1
  const used = new Set(words(`${patch.tag ?? ''} ${patch.headlineA ?? ''} ${patch.headlineB ?? ''}`))
  return src.filter((w) => used.has(w)).length / src.length
}

/** Plantillas permitidas al mapear: sólo de texto (más métrica si el bloque trae un número). */
const TEXT_TEMPLATES: TemplateId[] = ['statement', 'manifesto', 'repeat']
const ASKS_VISUAL = /gr[aá]fic|diagrama|tabla|matriz|curva|barras|radar|embudo|checklist|pir[aá]mide/i

/**
 * Guardas finales del mapeo: misma cantidad y orden de placas que el copy, texto fiel (si la IA
 * reescribió, se usa el corte local), citas sólo si están literalmente en el texto y plantillas
 * de texto salvo pedido explícito. En anáfora, la misma plantilla para todo el set.
 */
export function guardMapped(blocks: MappedBlock[], aiSlides: Partial<CanvasState>[], source: string): Partial<CanvasState>[] {
  const anaphora = isAnaphora(blocks)
  const norm = (s: string) => words(s).join(' ')
  const src = norm(source)
  return blocks.map((block, i) => {
    const local = splitBlock(block.text)
    const ai = aiSlides[i]
    // La IA sólo gana en bloques de un renglón sin rótulos, y sólo si no inventa (fidelidad) NI
    // omite (cobertura): un puente o una conclusión descartados la invalidan. Con renglones, el
    // corte local es exacto y manda siempre.
    const oneLine = !/\n/.test(block.text.trim()) && !LABEL_ANY.test(block.text)
    const aiOk = ai && oneLine && fidelity(ai, block.text) >= 0.75 && coverage(ai, block.text) >= 0.9
    let p: Partial<CanvasState> = aiOk ? { ...ai } : { ...(ai ?? {}), ...local, body: local.body ?? '' }
    // Rótulos explícitos del usuario («Tag:», «Titular:», «Remate:») siempre ganan.
    if (/(?<![\p{L}])tag(?: superior)?\s*[:：]/iu.test(block.text) && local.tag) p.tag = local.tag
    if (/(?<![\p{L}])(titular|t[ií]tulo|premisa)\s*[:：]/iu.test(block.text)) p.headlineA = local.headlineA
    if (/(?<![\p{L}])(remate|golpe(?: de impacto)?)\s*[:：]/iu.test(block.text) && local.headlineB) p.headlineB = local.headlineB
    // Cero citas inventadas: sólo se conserva una cita que aparece literalmente en el copy.
    if (p.citeMain && !src.includes(norm(p.citeMain))) p.citeMain = ''
    if (p.citeSub && !src.includes(norm(p.citeSub))) p.citeSub = ''
    if (!p.citeMain) p.citeSub = ''
    // Nada de gráficos / diagramas que el usuario no pidió.
    const wantsVisual = ASKS_VISUAL.test(block.text)
    const hasNumber = /\d/.test(block.text)
    if (local.template === 'opus' || local.template === 'quote') p = { ...p, ...local, template: local.template }
    else if (anaphora) p = { ...p, template: 'manifesto' }
    else if (!p.template || (!TEXT_TEMPLATES.includes(p.template) && !wantsVisual && !(p.template === 'metric' && hasNumber))) p = { ...p, template: 'statement' }
    if (p.template === 'repeat') p = { ...p, repeatPhrase: `${p.headlineA ?? ''} ${p.headlineB ?? ''}`.trim(), repeatMode: 'justified' }
    if (!p.tag) p.tag = anaphora ? 'MANIFIESTO TÁCTICO' : 'DISCIPLINA Y MÉTODO'
    // Campos que el copy no trae van vacíos de forma explícita: nunca se cuela el texto de
    // ejemplo de fábrica (cita, párrafo o sentencia de la placa por defecto).
    return { ...p, remateNewLine: true, citeMain: p.citeMain ?? '', citeSub: p.citeSub ?? '', body: p.body ?? '', kicker: p.kicker && fidelity({ body: p.kicker }, block.text) >= 0.75 ? p.kicker : '' }
  })
}

/** Mapeo 100 % local (sin IA o si la IA falla): mismo resultado estructural, sin inventar nada. */
export function mapLocally(blocks: MappedBlock[]): Partial<CanvasState>[] {
  return guardMapped(blocks, [], blocks.map((b) => b.text).join('\n'))
}
