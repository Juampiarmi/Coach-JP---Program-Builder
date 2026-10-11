import type { OverlayConfig, OverlayItem, Track, VideoProject } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_OVERLAY: OverlayConfig = {
  kind: 'badge',
  value: '82%',
  label: 'DEL TIEMPO CAMINANDO',
  tag: 'ANÁLISIS TÁCTICO',
  headlineA: 'NO CORRE MÁS.',
  headlineB: 'CORRE MEJOR.',
  timerLabel: 'TUT EXCÉNTRICO',
  timerDown: false,
  checks: [
    { text: 'RIR 1 REAL', ok: true },
    { text: 'RANGO COMPLETO', ok: true },
    { text: 'TEMPO 3-1-1', ok: true },
  ],
  opacity: 100,
  x: 50,
  y: 45,
  size: 'M',
  style: 'box',
  entrance: 'slide',
  exit: 'fade',
}

export function newOverlayItem(start = 0, end = 3, overlay: Partial<OverlayConfig> = {}): OverlayItem {
  return { id: uid(), type: 'overlay', start, end, overlay: { ...DEFAULT_OVERLAY, ...overlay } }
}

export function defaultProject(): VideoProject {
  const first = newOverlayItem(0.5, 3.5)
  return {
    version: 1,
    clip: null,
    tracks: [
      { id: 'v1', kind: 'video', label: 'V1 · VIDEO BASE', items: [] },
      { id: 'v2', kind: 'overlay', label: 'V2 · OVERLAY TÁCTICO', items: [first] },
      // Fase 2: { id: 'a1', kind: 'audio', label: 'A1 · MÚSICA', items: [] } y subtítulos.
    ],
    selectedId: first.id,
    safeZone: true,
    subtitles: { words: [], style: 'outline', accent: 'orange', enabled: true },
    music: null,
  }
}

/** Posición de proyectos guardados antes del arrastre libre (botones de posición / alineación). */
function migratePosition(o: Partial<OverlayConfig>): Pick<OverlayConfig, 'x' | 'y'> {
  if (typeof o.x === 'number' && typeof o.y === 'number') return { x: o.x, y: o.y }
  if (o.kind === 'watermark') return { x: o.align === 'right' ? 66 : 28, y: 74 }
  return {
    x: o.align === 'left' ? 30 : o.align === 'right' ? 64 : 50,
    y: o.position === 'top' ? 22 : o.position === 'bottom' ? 68 : 45,
  }
}

/** Overlay completo: defaults para campos nuevos + migración de la posición. */
export function normalizeOverlay(o: Partial<OverlayConfig>): OverlayConfig {
  return { ...DEFAULT_OVERLAY, ...o, ...migratePosition(o) }
}

/**
 * Todos los overlays de todas las pistas de overlay (en orden de pista: la última queda arriba).
 * Se completan con los defaults: proyectos guardados con versiones anteriores no traen los
 * campos nuevos (estilo, alineación, escala, salida…).
 */
export function overlayItems(p: VideoProject): OverlayItem[] {
  return p.tracks
    .filter((t) => t.kind === 'overlay' && !t.muted)
    .flatMap((t) => t.items.filter((i): i is OverlayItem => i.type === 'overlay'))
    .map((i) => ({ ...i, overlay: normalizeOverlay(i.overlay) }))
}

export function findItem(p: VideoProject, id: string | null): OverlayItem | null {
  return overlayItems(p).find((i) => i.id === id) ?? null
}

/** Actualiza un ítem por id en cualquier pista. */
export function patchItem(p: VideoProject, id: string, fn: (i: OverlayItem) => OverlayItem): VideoProject {
  return {
    ...p,
    tracks: p.tracks.map((t): Track => ({
      ...t,
      items: t.items.map((i) => (i.id === id && i.type === 'overlay' ? fn({ ...i, overlay: normalizeOverlay(i.overlay) }) : i)),
    })),
  }
}

/** Duración visible del timeline (clip cargado o 10 s de referencia sin clip). */
export const timelineDuration = (p: VideoProject) => p.clip?.duration ?? 10

/** Clampea los rangos de los ítems a la duración del clip. */
export function fitToClip(p: VideoProject): VideoProject {
  const d = timelineDuration(p)
  return {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      items: t.items.map((i) => {
        const len = Math.min(i.end - i.start, d)
        const start = Math.min(Math.max(0, i.start), d - len)
        return { ...i, start, end: start + len }
      }),
    })),
  }
}
