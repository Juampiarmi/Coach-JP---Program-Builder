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
const NUMBERED = /^\s*(\d{1,2})\s*[.)\-–—:]\s+/
const BULLET = /^\s*(?:[-•▸►▪●*]|—)\s+/

export interface MappedBlock {
  /** Texto del bloque sin el marcador («Placa 3:», «3.», «-») */
  text: string
}

/** Bloques de un copy estructurado, o null si el texto no tiene estructura de placas. */
export function detectStructuredCopy(raw: string): MappedBlock[] | null {
  const text = raw.replace(/\r/g, '').trim()
  if (!text) return null
  // 1) Marcadores «Placa N» en cualquier lugar: cada uno abre una placa (el texto previo es un título y se descarta).
  const marks = [...text.matchAll(MARKER_ANY)]
  if (marks.length >= 2) {
    const blocks = marks
      .map((m, i) => text.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : text.length))
      .map((t) => t.replace(/[\s*_#>\[\-–—📍•|]+$/u, '').trim())
      .filter(Boolean)
    if (blocks.length >= 2) return blocks.slice(0, MAX_MAPPED_SLIDES).map((t) => ({ text: t }))
  }
  const lines = text.split('\n')
  const splitBy = (rx: RegExp) => {
    const blocks: string[][] = []
    for (const line of lines) {
      if (rx.test(line)) blocks.push([line.replace(rx, '')])
      else if (blocks.length) blocks[blocks.length - 1].push(line)
      else if (line.trim()) blocks.push([line]) // texto antes del primer marcador = su propio bloque
    }
    return blocks.map((b) => b.join('\n').trim()).filter(Boolean)
  }
  const count = (rx: RegExp) => lines.filter((l) => rx.test(l)).length
  let blocks: string[] | null = null
  if (count(NUMBERED) >= 2) blocks = splitBy(NUMBERED)
  else if (count(BULLET) >= 2 && !lines.some((l) => LABEL_ANY.test(l))) blocks = splitBy(BULLET)
  else {
    const paras = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    // Párrafos separados: sólo cuenta como estructura si cada uno es corto (copy de placas, no un brief).
    if (paras.length >= 2 && paras.every((p) => p.split(/\s+/).length <= 45)) blocks = paras
  }
  if (!blocks || blocks.length < 2) return null
  return blocks.slice(0, MAX_MAPPED_SLIDES).map((t) => ({ text: t }))
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
const LABEL_ANY = /(?<![\p{L}])(tag(?: superior)?|etiqueta|titular|t[ií]tulo|premisa|blanco|remate|golpe(?: de impacto)?|acento|naranja|subt[ií]tulo|cierre|p[aá]rrafo|cuerpo)\s*[:：]/iu
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

/** Corte local de un bloque: respeta rótulos explícitos (aun en una sola línea), renglones y oraciones; nunca reescribe. */
export function splitBlock(block: string): Partial<CanvasState> {
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
      if (/tag|etiqueta/.test(k)) out.tag = value.replace(/^\[\s*|\s*\]$/g, '').toUpperCase()
      else if (/titular|t[ií]tulo|premisa|blanco/.test(k)) out.headlineA = [out.headlineA, value].filter(Boolean).join(' ')
      else if (/remate|golpe|acento|naranja/.test(k)) out.headlineB = [out.headlineB, value].filter(Boolean).join(' ')
      else out.body = [out.body, value].filter(Boolean).join('\n')
    })
    if (pre && out.headlineA === undefined) out.headlineA = pre
  } else {
    const rest = src
      .split('\n')
      .map((l) => cleanValue(l))
      .filter(Boolean)
    if (rest.length >= 2) {
      out.headlineA = rest[0]
      out.headlineB = rest[1]
      if (rest.length > 2) out.body = rest.slice(2).join('\n')
    } else if (rest.length === 1) {
      // «PREMISA / GOLPE» en un renglón: la barra separa titular y remate.
      const slash = rest[0].split(/\s+\/\s+/)
      const [a, b] = slash.length === 2 ? slash.map(cleanValue) : splitSentence(rest[0])
      out.headlineA = a
      out.headlineB = b
    }
  }
  out.headlineA = (out.headlineA ?? '').toUpperCase()
  out.headlineB = (out.headlineB ?? '').toUpperCase()
  return out
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
  if (sentences.length >= 2) return [sentences[0], sentences.slice(1).join(' ')]
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
    let p: Partial<CanvasState> = ai && fidelity(ai, block.text) >= 0.75 ? { ...ai } : { ...(ai ?? {}), ...local }
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
    if (anaphora) p = { ...p, template: 'manifesto' }
    else if (!p.template || (!TEXT_TEMPLATES.includes(p.template) && !wantsVisual && !(p.template === 'metric' && hasNumber))) p = { ...p, template: 'statement' }
    if (p.template === 'repeat') p = { ...p, repeatPhrase: `${p.headlineA ?? ''} ${p.headlineB ?? ''}`.trim(), repeatMode: 'justified' }
    if (!p.tag) p.tag = anaphora ? 'MANIFIESTO TÁCTICO' : 'DISCIPLINA Y MÉTODO'
    // Campos que el copy no trae van vacíos de forma explícita: nunca se cuela el texto de
    // ejemplo de fábrica (cita, párrafo o sentencia de la placa por defecto).
    return { ...p, citeMain: p.citeMain ?? '', citeSub: p.citeSub ?? '', body: p.body ?? '', kicker: p.kicker && fidelity({ body: p.kicker }, block.text) >= 0.75 ? p.kicker : '' }
  })
}

/** Mapeo 100 % local (sin IA o si la IA falla): mismo resultado estructural, sin inventar nada. */
export function mapLocally(blocks: MappedBlock[]): Partial<CanvasState>[] {
  return guardMapped(blocks, [], blocks.map((b) => b.text).join('\n'))
}
