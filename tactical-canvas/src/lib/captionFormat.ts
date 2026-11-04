import { hasCallToAction } from './retentionDoctor'
import { SERVICE_BY_ID } from './services'
import type { CanvasState } from '../types'

/**
 * CAPTION DE INSTAGRAM listo para pegar: gancho en MAYÚSCULAS, cuerpo con viñetas tácticas «▸» y
 * saltos de línea limpios, cierre con CTA (si el texto no trae uno) y un bloque de 6-8 hashtags
 * tácticos según la disciplina y el tema del set.
 */

/** Reglas de hashtags por tema: la primera que coincide aporta sus etiquetas, en orden. */
const TOPIC_TAGS: [RegExp, string[]][] = [
  [/hipertrofi|masa muscular|músculo|tensi[oó]n mec/i, ['#Hipertrofia', '#EntrenamientoDeFuerza']],
  [/biomec|t[eé]cnica|peso muerto|sentadilla|bisagra|despegue|error vs/i, ['#BiomecanicaAplicada', '#TecnicaDeLevantamiento']],
  [/\bmtb\b|mountain bike|ciclis|pedal/i, ['#MTB', '#CiclismoDeMontaña']],
  [/hyrox/i, ['#Hyrox', '#HybridTraining']],
  [/crossfit|\bwod\b/i, ['#CrossFit', '#Halterofilia']],
  [/rugby/i, ['#Rugby', '#PreparacionFisicaRugby']],
  [/hockey/i, ['#Hockey', '#PreparacionFisicaHockey']],
  [/golf/i, ['#Golf', '#GolfFitness']],
  [/powerlifting|press de banca|\bsbd\b/i, ['#Powerlifting', '#Fuerza']],
  [/weightlifting|levantamiento ol[ií]mpico|arranque|env[ií]o/i, ['#LevantamientoOlimpico', '#Weightlifting']],
  [/\bmma\b|boxeo|kickboxing|\bbjj\b|combate/i, ['#DeportesDeCombate', '#PreparacionFisicaMMA']],
  [/fatiga|recuperaci|descanso|sue[ñn]o|\bsnc\b/i, ['#Recuperacion', '#Fisiologia']],
  [/sobrecarga|progresi[oó]n|\brir\b|\brpe\b|periodiz/i, ['#SobrecargaProgresiva', '#Periodizacion']],
  [/unilateral|potencia|pliom|salto/i, ['#Potencia', '#RendimientoDeportivo']],
  [/mito|fisiolog/i, ['#MitosDelGimnasio', '#Fisiologia']],
  [/disciplina|mentalidad|mindset|autorrespeto|h[aá]bito/i, ['#Disciplina', '#MentalidadDeAtleta']],
  [/servicio|programa|cupos|evaluaci[oó]n|asesor/i, ['#EntrenamientoPersonalizado', '#CoachingOnline']],
]
const BASE_TAGS = ['#CoachJP', '#AltoRendimiento']
const FILL_TAGS = ['#EntrenamientoDeFuerza', '#CienciaDelEntrenamiento', '#PreparacionFisica', '#Periodizacion', '#RendimientoDeportivo']

const HASHTAG_RX = /#[\p{L}\p{N}_]+/gu
const BULLET_RX = /^\s*(?:[-•*►→✓✔·]|▸)\s+/

/** Texto de un set para detectar el tema (titulares, cuerpo y disciplina de servicio). */
function setText(slides: CanvasState[]) {
  return slides
    .map((s) => [s.tag, s.headlineA, s.headlineB, s.body, s.template === 'service' ? SERVICE_BY_ID[s.serviceSport]?.label : '', s.template === 'case' ? s.caseDiscipline : '', s.template === 'myth' ? `${s.mythText} ${s.truthText}` : ''].join(' '))
    .join(' ')
}

/** 6-8 hashtags tácticos: base de marca + los del tema detectado + relleno técnico, sin repetir. */
export function tacticalHashtags(text: string, existing: string[] = []): string[] {
  const out: string[] = []
  const add = (t: string) => {
    if (out.length < 8 && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t)
  }
  BASE_TAGS.forEach(add)
  existing.forEach(add)
  for (const [rx, tags] of TOPIC_TAGS) if (rx.test(text)) tags.forEach(add)
  for (const t of FILL_TAGS) if (out.length < 6) add(t)
  return out
}

/** Caption final para pegar en Instagram. */
export function formatInstagramCaption(raw: string, slides: CanvasState[]): string {
  const existing = [...new Set(raw.match(HASHTAG_RX) ?? [])]
  // Sin hashtags ni espacios colgantes; párrafos separados por UNA línea en blanco.
  const clean = raw.replace(/\r/g, '').replace(HASHTAG_RX, '').replace(/[ \t]+$/gm, '')
  const paras = clean
    .split(/\n[ \t]*\n+/)
    .map((p) =>
      p
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => (BULLET_RX.test(l) ? `▸ ${l.replace(BULLET_RX, '')}` : l)),
    )
    .filter((p) => p.length)
  if (!paras.length) return ''
  // Gancho: la primera línea en MAYÚSCULAS (es lo único que se ve antes del «más»).
  paras[0][0] = paras[0][0].toLocaleUpperCase('es-AR')
  const body = paras.map((p) => p.join('\n'))
  const all = body.join('\n')
  if (!hasCallToAction(body[body.length - 1]) && !hasCallToAction(all.slice(-240))) {
    const sells = slides.some((s) => s.template === 'service' || s.template === 'case')
    body.push(sells ? 'Mandá «PROGRAMA» por DM y te paso la evaluación de ingreso.' : 'Guardalo para tu próxima sesión y compartilo con quien entrena con vos.')
  }
  const tags = tacticalHashtags(`${all} ${setText(slides)}`, existing)
  return `${body.join('\n\n')}\n\n${tags.join(' ')}`
}
