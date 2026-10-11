import { askStructured, type AiSettings } from '../../lib/ai'
import type { DirectorPace, MusicMood, StockType, SubtitleCue, TacticalDirectorOutput, TacticalOverlayEvent } from '../../types/timelineDirector'

/**
 * Director de Montaje IA (AI Timeline Director).
 * La app es un SPA estático (GitHub Pages, BYOK): este módulo cumple el rol del endpoint
 * `/api/ai/video-director` llamando a Gemini directo desde el navegador con Structured Outputs
 * (responseMimeType "application/json" + responseSchema) y normalizando el resultado.
 */

const S = (description?: string, extra: object = {}) => ({ type: 'STRING', ...(description ? { description } : {}), ...extra })
const N = (description?: string) => ({ type: 'NUMBER', ...(description ? { description } : {}) })
const E = (values: string[], description?: string) => S(description, { enum: values })

/** responseSchema (subset OpenAPI de Gemini) equivalente a TacticalDirectorOutput. */
export const DIRECTOR_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: S('Título interno del reel, en MAYÚSCULAS'),
    durationSeconds: N('Duración total del montaje en segundos'),
    pace: E(['fast_kinetic', 'technical_breakdown']),
    v1_video: {
      type: 'OBJECT',
      properties: {
        fallbackStockType: E(['dark_gym_heavy_lift', 'barbell_setup', 'athlete_chalk']),
        playbackRate: N('Velocidad del clip base: 1 = normal, 0.5–0.9 = cámara lenta en el desglose'),
      },
      required: ['fallbackStockType', 'playbackRate'],
    },
    v2_overlays: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: E(['goniometer', 'bar_path', 'badge_metric', 'flash_impact']),
          startTime: N(),
          duration: N(),
          label: S('Rótulo corto en MAYÚSCULAS'),
          config: {
            type: 'OBJECT',
            properties: {
              color: E(['orange', 'cyan', 'white']),
              position: { type: 'OBJECT', properties: { x: N('0–100 % del ancho'), y: N('0–100 % del alto') }, required: ['x', 'y'] },
              targetValue: S('Valor de la métrica o del ángulo objetivo (ej: "90°", "RIR 1", "-12%")'),
            },
          },
        },
        required: ['type', 'startTime', 'duration', 'config'],
      },
    },
    s1_subtitles: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          start: N(),
          end: N(),
          text: S('4 a 6 palabras como máximo'),
          highlightWord: S('La palabra clave del segmento (una sola, tal cual aparece en text)'),
          accentColor: E(['orange', 'cyan', 'white']),
        },
        required: ['start', 'end', 'text', 'accentColor'],
      },
    },
    a1_voiceover: {
      type: 'OBJECT',
      properties: {
        fullScript: S('Guion completo de la voz en off, en español rioplatense'),
        estimatedDuration: N(),
        targetWpm: N('Palabras por minuto objetivo'),
      },
      required: ['fullScript', 'estimatedDuration', 'targetWpm'],
    },
    a2_music: {
      type: 'OBJECT',
      properties: {
        genreMood: E(['dark_tactical_bass', 'cyberpunk_industrial', 'minimal_drill']),
        duckingActive: { type: 'BOOLEAN' },
        baseVolume: N('0–100'),
        duckingVolume: N('0–100, volumen de la música mientras hay voz'),
      },
      required: ['genreMood', 'duckingActive', 'baseVolume', 'duckingVolume'],
    },
  },
  required: ['title', 'durationSeconds', 'pace', 'v1_video', 'v2_overlays', 's1_subtitles', 'a1_voiceover', 'a2_music'],
  propertyOrdering: ['title', 'durationSeconds', 'pace', 'v1_video', 'v2_overlays', 's1_subtitles', 'a1_voiceover', 'a2_music'],
} as const

export const DIRECTOR_SYSTEM = `Sos el DIRECTOR DE MONTAJE Y RITMO de COACH JP (@coachjp.training), High Performance System. Dirigís videos cortos de alto impacto (Instagram Reels 9:16) sobre rendimiento deportivo, fuerza y fisiología. Español rioplatense (voseo).
REGLAS DE MONTAJE:
1. HOOK DE RETENCIÓN: los primeros 2,0 s tienen una sentencia contundente en S1 (empieza antes de 0,5 s) y un "flash_impact" en V2 (antes de 1,0 s).
2. SUBTÍTULOS CINÉTICOS (S1): máximo 4 a 6 palabras por segmento, segmentos consecutivos sin solaparse y sincronizados con el guion de A1 al ritmo de targetWpm. En cada remate destacá UNA palabra clave ("highlightWord") con accentColor "orange" o "cyan"; el resto de los segmentos van en "white".
3. OVERLAYS TÁCTICOS (V2): anclá goniómetros ("goniometer", con el ángulo en targetValue) y métricas ("badge_metric") en los puntos de máxima tensión mecánica o sticking points (fondo de la sentadilla, despegue del peso muerto, bloqueo). "bar_path" marca dónde conviene trazar la trayectoria. Posiciones en % del cuadro dentro de la zona segura (x 10–80, y 15–75).
4. RITMO: "fast_kinetic" = cortes enérgicos, un evento de V2 cada 2–3 s; "technical_breakdown" = ritmo analítico con pausas de 1,5–3 s sobre cada goniómetro y playbackRate 0,6–0,85 para el desglose.
5. FILOSOFÍA: cero clichés de autoayuda («sé tu mejor versión», «rompé tus límites», «el dolor es temporal»). Lenguaje de fisiología aplicada, biomecánica y estándares innegociables. Cero emojis, cero signos de exclamación, cero cifras inventadas: si no hay certeza, usá un criterio técnico (RIR, rango, ángulo) en vez de un número falso.
6. MÚSICA (A2): ducking activo cuando hay voz en off; duckingVolume claramente menor que baseVolume.
Todos los tiempos en segundos, dentro de [0, durationSeconds].`

export const PACE_RANGE: Record<DirectorPace, [number, number]> = { fast_kinetic: [15, 20], technical_breakdown: [30, 45] }

export interface DirectorRequest {
  idea: string
  pace: DirectorPace
  /** Duración del tramo recortado del clip cargado (si hay): el montaje se ajusta a él */
  clipDuration?: number
}

/** Rango de duración efectivo: el del ritmo, recortado al clip si es más corto. */
export function targetRange(req: Pick<DirectorRequest, 'pace' | 'clipDuration'>): [number, number] {
  const [lo, hi] = PACE_RANGE[req.pace]
  if (!req.clipDuration) return [lo, hi]
  const c = Math.max(3, req.clipDuration)
  return [Math.min(lo, c), Math.min(hi, c)]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const num = (v: unknown, fb: number) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && Number.isFinite(Number(v)) ? Number(v) : fb)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const oneOf = <T extends string>(v: unknown, list: readonly T[], fb: T): T => (list.includes(v as T) ? (v as T) : fb)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const arr = (v: unknown) => (Array.isArray(v) ? v.map(obj) : [])
const wordsOf = (t: string) => t.split(/\s+/).filter(Boolean)
const clean = (w: string) => w.replace(/[^\p{L}\p{N}%°+-]/gu, '').toUpperCase()

/**
 * Normalización estricta: tiempos dentro del montaje, subtítulos de 4–6 palabras sin solaparse,
 * hook garantizado (sentencia en S1 antes de 0,5 s y flash en V2 antes de 1 s) y valores de audio
 * coherentes. Así cualquier respuesta (incluso de un proveedor sin schema) se puede inyectar.
 */
export function normalizeDirector(raw: unknown, req: DirectorRequest): TacticalDirectorOutput {
  const r = obj(raw)
  const pace = oneOf(r.pace, ['fast_kinetic', 'technical_breakdown'] as const, req.pace)
  const [lo, hi] = targetRange({ pace: req.pace, clipDuration: req.clipDuration })
  const D = Math.round(clamp(num(r.durationSeconds, hi), lo, hi) * 100) / 100

  // S1 · subtítulos cinéticos
  let cues: SubtitleCue[] = []
  for (const c of arr(r.s1_subtitles)) {
    const text = str(c.text)
    if (!text) continue
    const start = clamp(num(c.start, 0), 0, D)
    const end = clamp(num(c.end, start + 1.2), start + 0.25, D)
    const accent = oneOf(c.accentColor, ['orange', 'cyan', 'white'] as const, 'white')
    const hl = str(c.highlightWord)
    const ws = wordsOf(text)
    // Más de 6 palabras: se parte en segmentos de ≤ 5 con el tiempo repartido por palabras.
    const chunks: string[][] = []
    for (let i = 0; i < ws.length; i += ws.length > 6 ? 5 : 6) chunks.push(ws.slice(i, i + (ws.length > 6 ? 5 : 6)))
    let t = start
    chunks.forEach((ch) => {
      const len = ((end - start) * ch.length) / ws.length
      const has = hl && ch.some((w) => clean(w) === clean(hl))
      cues.push({ start: t, end: t + len, text: ch.join(' '), highlightWord: has ? hl : undefined, accentColor: has ? (accent === 'white' ? 'orange' : accent) : chunks.length > 1 ? 'white' : accent })
      t += len
    })
  }
  cues.sort((a, b) => a.start - b.start)
  cues = cues.filter((c) => c.end - c.start >= 0.2)
  for (let i = 0; i < cues.length - 1; i++) if (cues[i].end > cues[i + 1].start) cues[i].end = Math.max(cues[i].start + 0.2, cues[i + 1].start)
  // Hook: la primera sentencia arranca antes de 0,5 s.
  if (cues.length && cues[0].start > 0.5) cues[0] = { ...cues[0], start: 0.15 }
  // Cada remate con acento tiene su palabra clave (si falta, la más larga del segmento).
  cues = cues.map((c) => {
    if (c.accentColor === 'white') return { ...c, highlightWord: c.highlightWord && wordsOf(c.text).some((w) => clean(w) === clean(c.highlightWord!)) ? c.highlightWord : undefined }
    const ok = c.highlightWord && wordsOf(c.text).some((w) => clean(w) === clean(c.highlightWord!))
    return { ...c, highlightWord: ok ? c.highlightWord : [...wordsOf(c.text)].sort((a, b) => clean(b).length - clean(a).length)[0] }
  })

  // V2 · overlays tácticos
  const overlays: TacticalOverlayEvent[] = arr(r.v2_overlays)
    .map((o) => {
      const type = oneOf(o.type, ['goniometer', 'bar_path', 'badge_metric', 'flash_impact'] as const, 'badge_metric')
      const cfg = obj(o.config)
      const pos = obj(cfg.position)
      const startTime = clamp(num(o.startTime, 0), 0, Math.max(0, D - 0.2))
      const dur = type === 'flash_impact' ? 0.2 : type === 'goniometer' ? clamp(num(o.duration, 1.8), 1.2, 3) : clamp(num(o.duration, 2), 1, 5)
      const position = cfg.position ? { x: clamp(num(pos.x, 50), 10, 80), y: clamp(num(pos.y, 45), 15, 75) } : undefined
      return {
        type,
        startTime,
        duration: Math.min(dur, D - startTime),
        label: str(o.label).toUpperCase() || undefined,
        config: { color: oneOf(cfg.color, ['orange', 'cyan', 'white'] as const, 'orange'), ...(position ? { position } : {}), ...(cfg.targetValue !== undefined && str(cfg.targetValue) ? { targetValue: str(cfg.targetValue) } : {}) },
      }
    })
    .sort((a, b) => a.startTime - b.startTime)
  // Hook visual: flash antes de 1 s.
  if (!overlays.some((o) => o.type === 'flash_impact' && o.startTime < 1)) overlays.unshift({ type: 'flash_impact', startTime: 0.15, duration: 0.2, config: { color: 'orange' } })

  // A1 · voz en off
  const vo = obj(r.a1_voiceover)
  const script = str(vo.fullScript) || cues.map((c) => c.text).join(' ')
  const wpm = clamp(num(vo.targetWpm, pace === 'fast_kinetic' ? 170 : 145), 110, 210)
  const estimated = clamp(num(vo.estimatedDuration, (wordsOf(script).length / wpm) * 60), 1, D)

  // A2 · música
  const mu = obj(r.a2_music)
  const base = clamp(num(mu.baseVolume, 35), 5, 100)
  const duck = clamp(num(mu.duckingVolume, base * 0.3), 0, base * 0.6)

  const v1 = obj(r.v1_video)
  return {
    title: str(r.title).toUpperCase() || 'MONTAJE TÁCTICO',
    durationSeconds: D,
    pace,
    v1_video: {
      fallbackStockType: oneOf(v1.fallbackStockType, ['dark_gym_heavy_lift', 'barbell_setup', 'athlete_chalk'] as const, 'dark_gym_heavy_lift') as StockType,
      playbackRate: Math.round(clamp(num(v1.playbackRate, 1), 0.5, 1.5) * 100) / 100,
    },
    v2_overlays: overlays,
    s1_subtitles: cues,
    a1_voiceover: { fullScript: script, estimatedDuration: Math.round(estimated * 10) / 10, targetWpm: Math.round(wpm) },
    a2_music: { genreMood: oneOf(mu.genreMood, ['dark_tactical_bass', 'cyberpunk_industrial', 'minimal_drill'] as const, 'dark_tactical_bass') as MusicMood, duckingActive: mu.duckingActive !== false, baseVolume: Math.round(base), duckingVolume: Math.round(duck) },
  }
}

/** Pide el montaje a la IA (Structured Outputs) y devuelve el contrato normalizado. */
export async function runDirector(settings: AiSettings, req: DirectorRequest, signal?: AbortSignal, onStatus?: (m: string | null) => void): Promise<TacticalDirectorOutput> {
  const [lo, hi] = targetRange(req)
  const user = `PREMISA / GUION / TEMA DEL REEL:
---
${req.idea.trim()}
---
RITMO: ${req.pace === 'fast_kinetic' ? '⚡ BRUTALIST SHORT · cortes enérgicos' : '🔬 DESGLOSE TÉCNICO · ritmo analítico con pausas de goniómetro'}.
DURACIÓN: entre ${lo} y ${hi} s${req.clipDuration ? ` (el clip del usuario dura ${req.clipDuration.toFixed(1)} s: el montaje no puede superarlo)` : ''}.
Si el texto ya es un guion, respetá sus frases en el guion de A1 y en S1 (no lo reescribas). Devolvé el montaje completo.`
  const raw = await askStructured(settings, DIRECTOR_SYSTEM, user, DIRECTOR_SCHEMA, signal, onStatus ?? undefined)
  return normalizeDirector(raw, req)
}
