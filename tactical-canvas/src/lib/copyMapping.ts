import type { CanvasState, TemplateId } from '../types'
import { detectQuoteIntent } from './quoteIntent'

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

/**
 * ¿Es un manifiesto / reflexión de texto continuo? 2+ párrafos separados por línea en blanco, sin
 * etiquetas «[Nr. X]» ni bloques «00001:», ni rótulos «Titular:», y de extensión de placa (≤ 260 palabras).
 */
export function isEssayText(text: string) {
  const paras = text.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean)
  if (paras.length < 2) return false
  // Una cita célebre (figura icónica + frase) nunca es manifiesto de párrafos: va a la plantilla 14.
  if (splitQuoteLoose(text)) return false
  if (/\[\s*nr\.?\s*\d/i.test(text) || hasPaddedBlocks(text) || LABEL_ANY.test(text)) return false
  if (paras.every((p) => QUOTE_RX.test(p))) return false
  return text.split(/\s+/).filter(Boolean).length <= 260
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
    if (hasPaddedBlocks(text) || looksLikeCopy(text) || isEssayText(text) || (split.length === 1 && split[0] !== text)) return [{ text: split[0] ?? text }]
    return null
  }
  if (split.length >= 2) return split.slice(0, MAX_MAPPED_SLIDES).map((t) => ({ text: t }))
  // Una cita ya escrita («"…" — Autor», o firma + frase de una figura icónica): una placa de Cita táctica.
  if (QUOTE_RX.test(text) || splitQuoteLoose(text)) return [{ text }]
  // Varias citas «"…" — Autor» separadas por línea en blanco: una placa por cita.
  const paras = text.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean)
  if (paras.length >= 2 && paras.every((p) => QUOTE_RX.test(p))) return paras.slice(0, MAX_MAPPED_SLIDES).map((t) => ({ text: t }))
  // Manifiesto / reflexión de texto continuo: párrafos sin «[Nr.]» ni «00001:» → UNA placa de texto.
  if (isEssayText(text)) return [{ text: split[0] ?? text }]
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
  // Técnica: «❌ / Error: …» + «✅ / Corrección: …» → plantilla 18 · Error vs Corrección.
  const fix = splitFix(block)
  if (fix) return fix
  // Rutina: renglones «A1 Sentadilla 4x5 RIR 2 3:00» → plantilla 17 · Sesión.
  const workout = splitWorkout(block)
  if (workout) return workout
  // Manifiesto texto: párrafos continuos (línea en blanco entre ellos) → plantilla 16.
  const essay = splitEssay(block)
  if (essay) return essay
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

const WRONG_LINE = /^\s*(?:(?:❌|✗|✖|✕|🚫)\s*(?:(?:error|incorrecto|mal)\s*[:：\-–—]?)?|(?:error|incorrecto|mal|lo que no)\s*[:：\-–—])\s*(.+)$/iu
const RIGHT_LINE = /^\s*(?:(?:✅|✓|✔|☑️?)\s*(?:(?:correcci[oó]n(?: t[aá]ctica)?|correcto|bien|as[ií] s[ií])\s*[:：\-–—]?)?|(?:correcci[oó]n(?: t[aá]ctica)?|correcto|bien|as[ií] s[ií]|soluci[oó]n)\s*[:：\-–—])\s*(.+)$/iu

/** Un renglón de error y uno de corrección → plantilla 18. El resto del bloque es el título. */
function splitFix(block: string): Partial<CanvasState> | null {
  const lines = block.replace(/\*\*|__/g, '').split('\n').map((l) => l.trim()).filter(Boolean)
  const wi = lines.findIndex((l) => WRONG_LINE.test(l))
  const ri = lines.findIndex((l) => RIGHT_LINE.test(l))
  if (wi < 0 || ri < 0) return null
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  const wrong = cap(cleanValue(lines[wi].match(WRONG_LINE)![1]))
  const right = cap(cleanValue(lines[ri].match(RIGHT_LINE)![1]))
  const title = lines.filter((_, i) => i !== wi && i !== ri)
  const head = title.length ? splitBlock(title.join('\n')) : { headlineA: 'ERROR VS', headlineB: 'CORRECCIÓN.' }
  return { headlineA: head.headlineA ?? '', headlineB: head.headlineB ?? '', template: 'fix', fixWrongText: wrong, fixRightText: right, body: '' }
}

const WORKOUT_LINE = /^\s*(?:[-•▸►*]\s*)?([A-Za-z]\d{1,2})\s*[.):\-–—]?\s+(.+)$/
const SCHEME_RX = /\d+\s*[x×]\s*\d+(?:[-–]\d+)?(?:\s*(?:s|seg|"|m|c\/p|por lado))?/i
const INTENSITY_RX = /(?:RIR|RPE)\s*\d+(?:[.,]\d)?(?:\s*[-–]\s*\d+)?|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*%(?:\s*(?:de\s*)?1RM)?|\d+(?:[.,]\d+)?\s*kg/i
const REST_RX = /\d+:\d{2}|\d+(?:[.,]\d+)?\s*(?:'|’|min\b|seg\b|s\b)/i

/** Un renglón de rutina → ejercicio: separa prescripción (series × reps), intensidad y pausa del nombre. */
function parseWorkoutLine(code: string, rest: string) {
  let t = ` ${rest} `
  const take = (rx: RegExp) => {
    const m = t.match(rx)
    if (!m) return ''
    t = t.replace(m[0], ' ')
    return m[0].replace(/\s+/g, ' ').replace(/\s*x\s*/i, ' × ').trim()
  }
  const scheme = take(SCHEME_RX)
  const intensity = take(INTENSITY_RX)
  const pause = take(REST_RX).replace(/[’']$/, ' min').replace(/\bseg\b/i, 's')
  const name = t.replace(/(?:pausa|descanso|rest)\s*[:]?/gi, ' ').replace(/[|·—–\-/,@]+/g, ' ').replace(/\s+/g, ' ').trim()
  return { code: code.toUpperCase(), name, scheme, intensity, rest: pause }
}

/** 2+ renglones de rutina con código (A1, B2…) → plantilla 17 · Sesión. El resto del bloque es el título. */
function splitWorkout(block: string): Partial<CanvasState> | null {
  const lines = block.replace(/\*\*|__/g, '').split('\n').map((l) => l.trim()).filter(Boolean)
  const hits = lines.map((l) => l.match(WORKOUT_LINE))
  const rows = hits
    .map((m) => (m ? parseWorkoutLine(m[1], m[2]) : null))
    .filter((r): r is NonNullable<typeof r> => Boolean(r && r.name && (r.scheme || r.intensity || r.rest)))
  if (rows.length < 2) return null
  const rest = lines.filter((_, i) => !hits[i])
  const note = rest.find((l) => /^(nota|progresi[oó]n|tip|criterio)\s*[:：]/i.test(l)) ?? ''
  const titleLines = rest.filter((l) => l !== note)
  const head = titleLines.length ? splitBlock(titleLines.join('\n')) : { headlineA: 'SESIÓN', headlineB: '' }
  // Sin remate, la última palabra del título pasa al naranja (identidad de marca).
  if (!head.headlineB && head.headlineA && head.headlineA.includes(' ') && !head.headlineA.includes('\n')) {
    const words = head.headlineA.split(' ')
    // «FUERZA DÍA A» → «FUERZA» + «DÍA A»: una letra suelta nunca es el remate sola.
    const k = words.length > 2 && words[words.length - 1].replace(/[^\p{L}\p{N}]/gu, '').length <= 2 ? 2 : 1
    head.headlineB = words.slice(-k).join(' ')
    head.headlineA = words.slice(0, -k).join(' ')
  }
  return { ...head, template: 'workout', workoutRows: rows.slice(0, 8), workoutNote: note.replace(/^(nota|tip)\s*[:：]\s*/i, '') }
}

/**
 * Párrafos de texto continuo → plantilla 16 · Manifiesto texto. Un primer párrafo corto en MAYÚSCULAS
 * es el título (titular + remate); el resto queda en párrafos, en su orden y sin reescribir.
 */
function splitEssay(block: string): Partial<CanvasState> | null {
  if (!isEssayText(block.trim())) return null
  const paras = block.trim().split(/\n[ \t]*\n+/).map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\*\*|__/g, '').trim()).filter(Boolean)
  const first = paras[0]
  const titled = first.split(/\s+/).length <= 12 && /\p{L}/u.test(first) && first === first.toUpperCase()
  const head = titled ? splitBlock(first.replace(/\s+/g, ' ')) : { headlineA: '', headlineB: '' }
  return { headlineA: head.headlineA ?? '', headlineB: head.headlineB ?? '', template: 'essay', essayParas: titled ? paras.slice(1) : paras, body: '' }
}

/** «"La frase." — Nombre Apellido, rol» (en uno o dos renglones) → plantilla 14 · Cita célebre. */
const QUOTE_RX = /^\s*(?:cita\s*[:：]\s*)?[«"“]([^«»"“”]{8,320})[»"”]\s*(?:\n\s*)?(?:[—–-]|autor\s*[:：])\s*([^\n,·|(]{3,60})(?:\s*[,·|(]\s*([^\n)]{2,80})\)?)?\s*$/iu
function splitQuote(block: string): Partial<CanvasState> | null {
  const m = block.replace(/\*\*|__/g, '').trim().match(QUOTE_RX)
  if (!m) return splitQuoteLoose(block)
  return { template: 'quote', quoteText: m[1].trim(), quoteAuthor: m[2].trim(), quoteRole: (m[3] ?? '').trim(), quoteSource: '', quoteEmphasis: '', headlineA: '', headlineB: '', body: '' }
}

/** Renglón que es sólo la firma: «Michael Jordan», «— Kobe Bryant, 5 veces campeón», «Autor: Séneca». */
const AUTHOR_LINE_RX = /^\s*(?:[—–-]\s*|autor\s*[:：]\s*|cita\s*[:：]\s*)?([\p{Lu}][\p{L}'’.-]+(?:\s+(?:de\s+)?[\p{Lu}][\p{L}'’.-]+){0,3})\s*(?:[,·|(]\s*([^\n)]{2,80})\)?)?\s*[:：]?\s*$/u
/** Frase entre comillas en cualquier parte del bloque */
const QUOTED_RX = /[«"“]([^«»"“”]{8,320})[»"”]/u

/**
 * Cita sin el formato clásico, cuando el bloque nombra a una figura icónica o pide una cita:
 * - un renglón con la firma (nombre ± rol) y la frase en los demás renglones;
 * - o una frase entre comillas en cualquier parte («Como dijo Kobe: "…"») y el resto como contexto.
 * Nunca Manifiesto / párrafos: la cita va a la plantilla 14 y lo que sobra es la bajada de contexto.
 */
function splitQuoteLoose(block: string): Partial<CanvasState> | null {
  const src = block.replace(/\*\*|__/g, '').trim()
  const intent = detectQuoteIntent(src)
  if (!intent) return null
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean)
  const out = (quoteText: string, author: string, role: string, body: string): Partial<CanvasState> => ({
    template: 'quote',
    quoteText: quoteText.replace(/^[«"“\s]+|[»"”\s]+$/gu, '').trim(),
    quoteAuthor: author,
    quoteRole: role,
    quoteSource: '',
    quoteEmphasis: '',
    headlineA: '',
    headlineB: '',
    body,
  })
  const quoted = src.match(QUOTED_RX)
  if (quoted) {
    // Contexto: el texto fuera de las comillas, sin la atribución («Como dijo Kobe:», «— Kobe Bryant»).
    const rest = src
      .replace(quoted[0], ' ')
      .split('\n')
      .map((l) => l.trim())
      // Fuera: la firma y los renglones cortos de atribución («Como dijo Kobe:», «— Kobe Bryant»).
      .filter((l) => l && !AUTHOR_LINE_RX.test(l) && !(l.split(/\s+/).length <= 6 && detectQuoteIntent(l)))
      .map((l) => l.replace(/^[—–\-:\s]+|[:\s]+$/g, ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const sign = lines.map((l) => l.match(AUTHOR_LINE_RX)).find((m) => m && detectQuoteIntent(m[1]))
    return out(quoted[1], intent.author || sign?.[1] || '', (sign?.[2] ?? '').trim(), rest)
  }
  // Firma en su propio renglón (primero o último) + la frase en los demás.
  if (lines.length >= 2) {
    for (const idx of [lines.length - 1, 0]) {
      const m = lines[idx].match(AUTHOR_LINE_RX)
      if (!m || !detectQuoteIntent(m[1])) continue
      const others = lines.filter((_, j) => j !== idx)
      // Primer renglón (o párrafo) = la frase; si hay más, el último es el contexto de Coach JP.
      const [phrase, ...ctx] = others
      return out(phrase, intent.author || m[1], (m[2] ?? '').trim(), ctx.join(' '))
    }
  }
  return null
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
    if (local.template === 'opus' || local.template === 'quote' || local.template === 'essay' || local.template === 'workout' || local.template === 'fix') p = { ...p, ...local, template: local.template }
    else if (anaphora) p = { ...p, template: 'manifesto' }
    else if (!p.template || (!TEXT_TEMPLATES.includes(p.template) && !wantsVisual && !(p.template === 'metric' && hasNumber))) p = { ...p, template: 'statement' }
    if (p.template === 'repeat') p = { ...p, repeatPhrase: `${p.headlineA ?? ''} ${p.headlineB ?? ''}`.trim(), repeatMode: 'justified' }
    if (!p.tag) p.tag = p.template === 'quote' ? 'CITA TÁCTICA' : anaphora ? 'MANIFIESTO TÁCTICO' : 'DISCIPLINA Y MÉTODO'
    // Campos que el copy no trae van vacíos de forma explícita: nunca se cuela el texto de
    // ejemplo de fábrica (cita, párrafo o sentencia de la placa por defecto).
    return { ...p, remateNewLine: true, citeMain: p.citeMain ?? '', citeSub: p.citeSub ?? '', body: p.body ?? '', kicker: p.kicker && fidelity({ body: p.kicker }, block.text) >= 0.75 ? p.kicker : '' }
  })
}

/** Mapeo 100 % local (sin IA o si la IA falla): mismo resultado estructural, sin inventar nada. */
export function mapLocally(blocks: MappedBlock[]): Partial<CanvasState>[] {
  return guardMapped(blocks, [], blocks.map((b) => b.text).join('\n'))
}
