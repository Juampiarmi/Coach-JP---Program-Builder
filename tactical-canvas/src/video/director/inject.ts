import type { TacticalDirectorOutput } from '../../types/timelineDirector'
import { newOverlayItem, uid } from '../project'
import { distribute } from '../subtitles'
import type { FxHit, Goniometer, OverlayItem, SubtitleWord, Track, VideoProject } from '../types'

/** Sugerencias que no se pueden automatizar (bar path: hay que trazarlo sobre el disco real). */
export interface DirectorCue {
  t: number
  label: string
}

/** Goniómetros del Director que todavía hay que ubicar sobre el atleta. */
export function unplacedAngles(p: VideoProject): DirectorCue[] {
  return p.biomech.angles.filter((g) => g.placed === false).map((g) => ({ t: g.start + 0.05, label: g.label }))
}

export function barPathCues(out: TacticalDirectorOutput, offset: number): DirectorCue[] {
  return out.v2_overlays.filter((o) => o.type === 'bar_path').map((o) => ({ t: offset + o.startTime, label: o.label || 'TRAZAR BAR PATH' }))
}

/**
 * Inyecta el montaje en el proyecto: V2 (métricas), B1 (goniómetros), A3 (flash + impacto),
 * S1 (subtítulos con palabra clave en acento) y los ajustes de A2. Todo se corre `offset`
 * segundos (el In del clip) y se recorta a `limit`. Reemplaza el montaje anterior.
 */
export function injectDirector(p: VideoProject, out: TacticalDirectorOutput, idea: string, offset: number, limit: number): VideoProject {
  const T = (t: number) => Math.min(limit, offset + t)
  const technical = out.pace === 'technical_breakdown'

  // V2 · métricas tácticas
  const badges: OverlayItem[] = out.v2_overlays
    .filter((o) => o.type === 'badge_metric')
    .map((o) => {
      const value = o.config.targetValue !== undefined ? String(o.config.targetValue) : (o.label ?? '').split(/\s+/)[0] || '■'
      return newOverlayItem(T(o.startTime), T(o.startTime + o.duration), {
        kind: 'badge',
        value: value.slice(0, 8),
        label: o.config.targetValue !== undefined ? (o.label ?? '') : (o.label ?? '').split(/\s+/).slice(1).join(' '),
        // Chip compacto (≤ 15 % del ancho) en la esquina superior izquierda segura: nunca sobre el
        // cuerpo del atleta ni sobre la banda de subtítulos. El usuario lo puede arrastrar.
        size: 'XS',
        x: 14,
        y: 17,
        style: 'box',
        entrance: 'slide',
        exit: 'fade',
      })
    })

  // B1 · goniómetros en los puntos de máxima tensión (vértice en la posición indicada)
  const angles: Goniometer[] = out.v2_overlays
    .filter((o) => o.type === 'goniometer')
    .map((o) => {
      // Posición provisoria siempre en la zona de piernas (rodilla), nunca en el techo ni en la cara.
      const b = { x: Math.min(65, Math.max(35, o.config.position?.x ?? 55)), y: Math.min(72, Math.max(55, o.config.position?.y ?? 62)) }
      // Geometría inicial que ya mide el ángulo objetivo (si viene en grados): el segmento a
      // (cadera) sale hacia arriba-izquierda y c (tobillo) se abre exactamente ese ángulo.
      const target = Number(String(o.config.targetValue ?? '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0])
      const deg = Number.isFinite(target) && target >= 20 && target <= 180 ? target : 110
      const R = 230 // px del cuadro 1080×1920
      const th = (-140 * Math.PI) / 180
      const pt = (ang: number) => ({
        x: Math.min(95, Math.max(5, b.x + ((Math.cos(ang) * R) / 1080) * 100)),
        y: Math.min(95, Math.max(5, b.y + ((Math.sin(ang) * R) / 1920) * 100)),
      })
      return {
        id: `gon:${uid()}`,
        start: T(o.startTime),
        end: T(o.startTime + o.duration),
        a: pt(th),
        b,
        c: pt(th - (deg * Math.PI) / 180),
        label: o.label || (Number.isFinite(target) ? `OBJETIVO ${o.config.targetValue}` : String(o.config.targetValue ?? '')) || 'PUNTO CRÍTICO',
        color: o.config.color === 'white' ? 'white' : 'orange',
        punch: technical,
        // Posición provisoria: no se exporta hasta que el usuario lo ubica sobre la articulación.
        placed: false,
      }
    })

  // A3 · flash de impacto (visual) + IMPACT · SUB (sonido + sacudida) en el mismo instante
  const hits: FxHit[] = out.v2_overlays
    .filter((o) => o.type === 'flash_impact')
    .flatMap((o) => [
      { id: `fx:${uid()}`, kind: 'flash' as const, t: T(o.startTime) },
      { id: `fx:${uid()}`, kind: 'impact' as const, t: T(o.startTime) },
    ])

  // S1 · cada segmento es un bloque propio; la palabra clave va en su color
  const words: SubtitleWord[] = out.s1_subtitles.flatMap((c) => {
    const texts = c.text.split(/\s+/).filter(Boolean)
    const key = (c.highlightWord ?? '').replace(/[^\p{L}\p{N}%°+-]/gu, '').toUpperCase()
    return distribute(texts, T(c.start), T(c.end)).map((w, i) => ({
      ...w,
      ...(i === 0 ? { br: true } : {}),
      ...(c.accentColor !== 'white' && key && w.word.replace(/[^\p{L}\p{N}%°+-]/gu, '').toUpperCase() === key ? { color: c.accentColor } : {}),
    }))
  })
  const cyan = out.s1_subtitles.filter((c) => c.accentColor === 'cyan').length
  const orange = out.s1_subtitles.filter((c) => c.accentColor === 'orange').length

  return {
    ...p,
    tracks: p.tracks.map((t): Track => (t.kind === 'overlay' ? { ...t, items: badges } : t)),
    selectedId: badges[0]?.id ?? null,
    subtitles: { ...p.subtitles, words, enabled: true, accent: cyan > orange ? 'cyan' : 'orange', offset: 0 },
    biomech: { ...p.biomech, angles },
    fx: { ...p.fx, hits, shake: true },
    music: p.music ? { ...p.music, volume: out.a2_music.baseVolume, ducking: out.a2_music.duckingActive, duckLevel: out.a2_music.duckingVolume / Math.max(1, out.a2_music.baseVolume) } : p.music,
    director: { output: out, idea, offset, createdAt: Date.now() },
  }
}

/** Frases del guion con su ventana de tiempo (proporcional a las palabras, al ritmo targetWpm). */
export function scriptTimeline(out: TacticalDirectorOutput, offset: number): { text: string; start: number; end: number }[] {
  const sentences = out.a1_voiceover.fullScript.match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) ?? []
  const total = sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) || 1
  const start0 = out.s1_subtitles[0]?.start ?? 0
  const span = Math.max(1, Math.min(out.durationSeconds - start0, out.a1_voiceover.estimatedDuration))
  let t = offset + start0
  return sentences.map((s) => {
    const d = (span * s.split(/\s+/).length) / total
    const seg = { text: s, start: t, end: t + d }
    t += d
    return seg
  })
}
