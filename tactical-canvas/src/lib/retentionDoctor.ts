import { BRAND } from './brand'
import { swapHex } from './accent'
import { effectiveTheme, PALETTES } from './theme'
import type { CanvasState, TemplateId } from '../types'

/**
 * DOCTOR DE RETENCIÓN: auditoría local e instantánea (sin IA) del carrusel completo antes de exportar.
 * Mide lo que hace que alguien deje de deslizar: placas que no se leen en el tiempo de un swipe,
 * cierre sin llamado a la acción, la misma plantilla repetida (el ojo deja de registrar el cambio)
 * y titulares con poco contraste sobre la foto. Cada hallazgo trae, cuando se puede, su fix de 1 clic.
 */

export type Severity = 'critical' | 'warn'

export type DoctorFix =
  | { kind: 'trim'; slide: number }
  | { kind: 'cta' }
  | { kind: 'swap'; slide: number; to: TemplateId }
  | { kind: 'contrast'; slide: number; overlay: number }

export interface Finding {
  id: string
  /** Índice de la placa (null = afecta al set completo) */
  slide: number | null
  severity: Severity
  title: string
  detail: string
  fix?: DoctorFix
  fixLabel?: string
}

export interface SlideStat {
  words: number
  /** Segundos estimados de lectura (lectura en el feed ~4 palabras/s + 1 s de escaneo visual) */
  seconds: number
  /** Contraste del titular (peor de blanco / acento) contra el fondo efectivo; null = no se pudo medir */
  contrast: number | null
}

export interface DoctorReport {
  score: number
  totalSeconds: number
  stats: SlideStat[]
  findings: Finding[]
}

/** Luminancia de la foto de fondo (medida en una miniatura): promedio y percentil 75 en sRGB 0–255. */
export interface PhotoLuma {
  avg: [number, number, number]
  /** Color del percentil 75 de brillo: lo «claro» de la foto, donde un titular se pierde */
  bright: [number, number, number]
}

const WPS = 4
/** Palabras a partir de las que una placa no se lee en un swipe (portada: el gancho, mucho más corto) */
export const LIMITS = { cover: 22, warn: 55, critical: 80 }
/** Contraste mínimo de un titular grande sobre foto (WCAG AA texto grande = 3; pedimos 4,5 en el celular) */
const MIN_CONTRAST = 4.5

const words = (t: string | undefined | null) => (t ?? '').replace(/[*_[\]]/g, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length

/** Texto que el lector tiene que leer en la placa, por plantilla (titular + cuerpo). */
export function slideCopy(s: CanvasState): { headline: string; body: string[] } {
  const headline = s.template === 'repeat' ? s.repeatPhrase : s.template === 'quote' ? s.quoteText : `${s.headlineA} ${s.headlineB}`
  const sd = s.structData
  const body: string[] = (() => {
    switch (s.template) {
      case 'metric':
        return [s.metricValue, s.metricLabel, s.body]
      case 'compare':
        return [s.cardA.label, s.cardA.value, s.cardA.caption, s.cardB.label, s.cardB.value, s.cardB.caption, s.verdict, s.body]
      case 'chart':
      case 'diagram':
        return [s.body]
      case 'statement':
        return [s.kicker, s.body]
      case 'matrix':
        return [s.body, ...(sd?.matrix.quadrants.map((q) => `${q.label} ${q.tag}`) ?? [])]
      case 'pipeline':
        return [s.body, ...(sd?.pipeline.steps.map((x) => `${x.title} ${x.desc}`) ?? [])]
      case 'pyramid':
        return [s.body, ...(sd?.pyramid.levels.map((x) => `${x.name} ${x.desc}`) ?? [])]
      case 'checklist':
        return [s.body, ...(sd?.checklist.items.map((x) => `${x.text} ${x.detail}`) ?? [])]
      case 'bookmark':
        return [...(s.bookmarkData?.points ?? []), s.bookmarkData?.cta ?? '']
      case 'opus':
        return s.opusBlocks.map((b) => b.text)
      case 'quote':
        return [s.quoteAuthor, s.quoteRole]
      case 'athletic':
        return [s.body, ...s.athleticRows.map((r) => `${r.k} ${r.v}`), s.athleticCta]
      case 'essay':
        return s.essayParas
      case 'workout':
        return [...s.workoutRows.map((r) => `${r.name} ${r.scheme}`), s.workoutNote]
      case 'fix':
        return [s.fixWrongLabel, s.fixWrongText, s.fixRightLabel, s.fixRightText]
      default:
        return []
    }
  })()
  return { headline, body: body.filter((t) => t && t.trim()) }
}

const CTA_RE = /\b(guard[aá]|compart[ií]|coment[aá]|segu[ií]|seguime|escrib[ií]|escribime|mand[aá]|reserv[aá]|link|bio|dm|etiquet[aá]|aplic[aá]lo|prob[aá]lo|anot[aá]te|inscrib[ií]|descarg[aá]|agend[aá]|sum[aá]te|empez[aá])\b/i

/** ¿La placa tiene un llamado a la acción explícito? */
export function hasCta(s: CanvasState) {
  if (s.template === 'bookmark') return true
  const { headline, body } = slideCopy(s)
  return CTA_RE.test([headline, ...body, s.athleticCta].join(' '))
}

// --- contraste (WCAG) ---
const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const lin = (c: number) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const lum = ([r, g, b]: [number, number, number]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export const contrastRatio = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const mix = (top: [number, number, number], alpha: number, under: [number, number, number]): [number, number, number] =>
  [0, 1, 2].map((i) => top[i] * alpha + under[i] * (1 - alpha)) as [number, number, number]

/** Fondo efectivo detrás del titular: la parte clara de la foto bajo el velo de la placa. */
function headlineContrast(s: CanvasState, photo: PhotoLuma | null, overlay = s.bgOverlay / 100) {
  const theme = effectiveTheme(s)
  const p = PALETTES[theme]
  const ink = hexRgb(p.ink)
  const accent = hexRgb(s.accentSwap ? swapHex(p.accent, true) : p.accent)
  const veil = p.overlayRgb.split(',').map(Number) as [number, number, number]
  // Placa flotante: el texto va sobre el vidrio con 75 % de velo extra.
  const a = s.floatingPlate ? 1 - (1 - overlay) * 0.25 : overlay
  const bg = photo ? mix(veil, a, photo.bright) : hexRgb(p.bg)
  return Math.min(contrastRatio(ink, bg), s.headlineB.trim() ? contrastRatio(accent, bg) : Infinity)
}

/** Velo mínimo (múltiplos de 5 %) para que el titular llegue al contraste objetivo. */
function overlayFor(s: CanvasState, photo: PhotoLuma) {
  for (let o = Math.ceil(s.bgOverlay / 5) * 5; o <= 92; o += 5) if (headlineContrast(s, photo, o / 100) >= MIN_CONTRAST) return o
  return 92
}

/** Plantilla alternativa que conserva el texto visible (titular + cuerpo) para cortar una racha. */
function alternative(t: TemplateId): TemplateId {
  if (t === 'statement') return 'manifesto'
  return 'statement'
}
const TEMPLATE_NAME: Partial<Record<TemplateId, string>> = {
  metric: 'Métrica',
  compare: 'Comparativa',
  chart: 'Gráfico',
  statement: 'Sentencia',
  manifesto: 'Manifiesto',
  diagram: 'Diagrama',
  opus: 'Mindset / Opus',
  essay: 'Manifiesto texto',
  quote: 'Cita',
  workout: 'Sesión',
  fix: 'Error vs Corrección',
}

/**
 * Diagnóstico del set. `photoLuma(i)` devuelve la luminancia medida de la foto de la placa i (null si
 * no tiene foto o todavía no se midió: en ese caso se usa el fondo liso de la paleta).
 */
export function diagnose(slides: CanvasState[], photoLuma: (i: number) => PhotoLuma | null): DoctorReport {
  const findings: Finding[] = []
  const n = slides.length
  const stats: SlideStat[] = slides.map((s, i) => {
    const { headline, body } = slideCopy(s)
    const w = words(headline) + body.reduce((acc, t) => acc + words(t), 0)
    const photo = s.template === 'athletic' ? null : photoLuma(i)
    return { words: w, seconds: Math.round((w / WPS + 1) * 10) / 10, contrast: s.template === 'athletic' ? null : headlineContrast(s, photo) }
  })

  slides.forEach((s, i) => {
    const st = stats[i]
    const trimmable = (s.template !== 'essay' && words(s.body) > 12) || (s.template === 'essay' && s.essayParas.length > 1) || (s.template === 'opus' && s.opusBlocks.length > 3)
    const trimFix = trimmable ? { fix: { kind: 'trim', slide: i } as DoctorFix, fixLabel: 'Recortar (el resto va al caption)' } : {}
    if (i === 0 && n > 1 && st.words > LIMITS.cover) {
      findings.push({
        id: `cover-${i}`,
        slide: i,
        severity: st.words > LIMITS.warn ? 'critical' : 'warn',
        title: `Portada densa: ${st.words} palabras (~${st.seconds} s)`,
        detail: `La portada decide el swipe en ~1,5 s. Dejá el gancho y que el desarrollo viva en las placas siguientes (ideal ≤ ${LIMITS.cover} palabras).`,
        ...trimFix,
      })
    } else if (st.words > LIMITS.warn) {
      findings.push({
        id: `dense-${i}`,
        slide: i,
        severity: st.words > LIMITS.critical ? 'critical' : 'warn',
        title: `Placa ${i + 1} densa: ${st.words} palabras (~${st.seconds} s)`,
        detail: `Más de ${LIMITS.warn} palabras no se leen en un swipe: el lector desliza sin terminar. Una idea por placa.`,
        ...trimFix,
      })
    }
    const hw = words(slideCopy(s).headline)
    if (hw > 14) {
      findings.push({ id: `head-${i}`, slide: i, severity: 'warn', title: `Titular largo en la placa ${i + 1} (${hw} palabras)`, detail: 'Un titular que no se lee de un vistazo pierde el gancho. Apuntá a ≤ 10 palabras: el detalle va en el cuerpo.' })
    }
    if (st.contrast !== null && st.contrast < MIN_CONTRAST) {
      const photo = photoLuma(i)
      findings.push({
        id: `contrast-${i}`,
        slide: i,
        severity: st.contrast < 3 ? 'critical' : 'warn',
        title: `Titular con poco contraste en la placa ${i + 1} (${st.contrast.toFixed(1)}:1)`,
        detail: photo
          ? 'La parte clara de la foto se come el titular en la pantalla del celular. Objetivo ≥ 4,5:1.'
          : 'El titular no se despega del fondo. Objetivo ≥ 4,5:1.',
        ...(photo ? { fix: { kind: 'contrast', slide: i, overlay: overlayFor(s, photo) } as DoctorFix, fixLabel: `Subir velo a ${overlayFor(s, photo)} % + degradé` } : {}),
      })
    }
  })

  if (n > 1 && !hasCta(slides[n - 1])) {
    findings.push({
      id: 'cta',
      slide: n - 1,
      severity: 'critical',
      title: 'La última placa no tiene llamado a la acción',
      detail: 'Sin un «guardá / compartí / comentá» el carrusel termina y el algoritmo no recibe la señal que más pesa (guardados y envíos).',
      fix: { kind: 'cta' },
      fixLabel: 'Agregar placa de cierre con CTA',
    })
  }

  // Rachas de 3+ placas con la misma plantilla (Opus Athletic es una serie a propósito: no cuenta).
  for (let i = 1; i < n - 1; i++) {
    const t = slides[i].template
    if (t === 'athletic' || slides[i - 1].template !== t || slides[i + 1].template !== t) continue
    if (findings.some((f) => f.id === `run-${i - 1}`)) continue
    const to = alternative(t)
    findings.push({
      id: `run-${i}`,
      slide: i,
      severity: 'warn',
      title: `3 placas seguidas en ${TEMPLATE_NAME[t] ?? t} (${i}–${i + 2})`,
      detail: 'Cuando la forma no cambia, el ojo deja de registrar que pasó de placa y la atención cae. Intercalá un formato distinto en el medio.',
      fix: { kind: 'swap', slide: i, to },
      fixLabel: `Pasar la placa ${i + 1} a ${TEMPLATE_NAME[to]}`,
    })
  }

  findings.sort((a, b) => (a.severity === b.severity ? (a.slide ?? -1) - (b.slide ?? -1) : a.severity === 'critical' ? -1 : 1))
  const score = Math.max(0, 100 - findings.reduce((acc, f) => acc + (f.severity === 'critical' ? 18 : 7), 0))
  return { score, totalSeconds: Math.round(stats.reduce((a, s) => a + s.seconds, 0)), stats, findings }
}

// --- fixes ---

const splitSentences = (t: string) => t.match(/[^.!?…]+[.!?…]+["»”]?\s*|[^.!?…]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [t]

/**
 * Recorta la placa a lo esencial; devuelve el patch y el texto quitado (para sumarlo al caption).
 * En la portada el presupuesto descuenta lo que ya ocupan el titular y el resto de la placa.
 */
export function trimSlide(s: CanvasState, cover = false): { patch: Partial<CanvasState>; removed: string } {
  const { headline, body } = slideCopy(s)
  const others = words(headline) + body.reduce((a, t) => a + words(t), 0) - words(s.body)
  const budget = cover ? Math.max(0, LIMITS.cover - others) : 26
  if (s.template === 'essay') {
    const keep: string[] = []
    let count = 0
    for (const p of s.essayParas) {
      if (keep.length && count + words(p) > budget * 2) break
      keep.push(p)
      count += words(p)
    }
    return { patch: { essayParas: keep }, removed: s.essayParas.slice(keep.length).join('\n\n') }
  }
  if (s.template === 'opus' && s.opusBlocks.length > 3) {
    return { patch: { opusBlocks: s.opusBlocks.slice(0, 3) }, removed: s.opusBlocks.slice(3).map((b) => `▸ ${b.text}`).join('\n') }
  }
  const sentences = splitSentences(s.body.trim())
  const keep: string[] = []
  let count = 0
  for (const x of sentences) {
    if ((keep.length || cover) && count + words(x) > budget) break
    keep.push(x)
    count += words(x)
  }
  return { patch: { body: keep.join(' ') }, removed: sentences.slice(keep.length).join(' ') }
}

/** Placa de cierre con CTA, con el estilo y el fondo de la última placa del set. */
export function ctaSlide(last: CanvasState): CanvasState {
  return {
    ...last,
    template: 'statement',
    tag: 'GUARDÁ · COMPARTÍ',
    headlineA: 'GUARDÁ ESTE POST',
    headlineB: 'Y APLICALO EN TU PRÓXIMA SESIÓN.',
    kicker: 'COMPARTILO CON QUIEN ENTRENA CON VOS.',
    body: '',
    citeMain: '',
    citeSub: '',
    nudge: undefined,
    storySticker: last.aspect === 'story' ? 'question' : last.storySticker,
  }
}

export const SCORE_COLOR = (score: number) => (score >= 85 ? BRAND.cyan : score >= 60 ? '#FACC15' : BRAND.orange)
