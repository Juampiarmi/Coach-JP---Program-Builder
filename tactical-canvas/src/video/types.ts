/**
 * Tactical Video Studio · modelo de datos.
 *
 * El proyecto es una lista de pistas (tracks) con ítems ubicados en el tiempo del clip base.
 * Cada pista declara su tipo: en la fase 1 existen "video" (V1) y "overlay" (V2); las fases
 * 2 y 3 suman "audio" (A1, A2) y "subtitle" sin tocar el núcleo: el timeline dibuja cualquier
 * pista genéricamente y el render consulta sólo las que sabe componer.
 */

export type TrackKind = 'video' | 'overlay' | 'audio' | 'subtitle'

/** Rango de tiempo en segundos, medido sobre el clip base (sin recorte). */
export interface TimeRange {
  start: number
  end: number
}

export type OverlayKind = 'badge' | 'headline' | 'watermark'
export type OverlayPosition = 'top' | 'center' | 'bottom'
export type OverlayEntrance = 'fade' | 'slide'

/** Contenido y estilo de una capa gráfica táctica. */
export interface OverlayConfig {
  kind: OverlayKind
  /** Badge / métrica flotante */
  value: string
  label: string
  /** Placa tipográfica */
  tag: string
  headlineA: string
  headlineB: string
  /** 0–100 */
  opacity: number
  position: OverlayPosition
  entrance: OverlayEntrance
}

export interface OverlayItem extends TimeRange {
  id: string
  type: 'overlay'
  overlay: OverlayConfig
}

/** Ítem genérico de pistas futuras (audio, subtítulos): el núcleo sólo necesita su rango. */
export interface GenericItem extends TimeRange {
  id: string
  type: Exclude<TrackKind, 'overlay' | 'video'>
  data?: Record<string, unknown>
}

export type TrackItem = OverlayItem | GenericItem

export interface Track {
  id: string
  kind: TrackKind
  /** Rótulo de la pista (ej: "V2 · OVERLAY TÁCTICO") */
  label: string
  items: TrackItem[]
  muted?: boolean
}

/** Clip base de la pista V1. El archivo vive sólo en memoria (object URL), nunca en el autosave. */
export interface ClipInfo {
  name: string
  duration: number
  width: number
  height: number
  /** Recorte (trim) In / Out en segundos */
  in: number
  out: number
}

export interface VideoProject {
  version: 1
  clip: ClipInfo | null
  tracks: Track[]
  /** Overlay seleccionado en el panel lateral */
  selectedId: string | null
  safeZone: boolean
}

/** Resolución de salida 9:16. */
export const OUT_W = 1080
export const OUT_H = 1920
