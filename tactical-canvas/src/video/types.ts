import type { TacticalDirectorOutput } from '../types/timelineDirector'

/**
 * Tactical Video Studio · modelo de datos.
 *
 * El proyecto es una lista de pistas (tracks) con ítems ubicados en el tiempo del clip base.
 * Cada pista declara su tipo: en la fase 1 existen "video" (V1) y "overlay" (V2); las fases
 * 2 y 3 suman "audio" (A1, A2) y "subtitle" sin tocar el núcleo: el timeline dibuja cualquier
 * pista genéricamente y el render consulta sólo las que sabe componer.
 */

export type TrackKind = 'video' | 'overlay' | 'audio' | 'subtitle' | 'bio'

/** Rango de tiempo en segundos, medido sobre el clip base (sin recorte). */
export interface TimeRange {
  start: number
  end: number
}

export type OverlayKind = 'badge' | 'headline' | 'timer' | 'checklist' | 'watermark'
export type OverlayPosition = 'top' | 'center' | 'bottom'
export type OverlayEntrance = 'fade' | 'slide'
export type OverlayExit = 'none' | 'fade' | 'slide'
/** Caja táctica (esquinas recortadas + borde) o texto puro con sombra de alto contraste */
export type OverlayStyle = 'box' | 'clean'
export type OverlayAlign = 'left' | 'center' | 'right'
/** XS = chip táctico compacto (≤ 15 % del ancho), para esquinas seguras */
export type OverlaySize = 'XS' | 'S' | 'M' | 'L'

export interface CheckItem {
  text: string
  ok: boolean
}

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
  /** Cronómetro: rótulo y sentido (progresivo o cuenta regresiva sobre la duración del bloque) */
  timerLabel: string
  timerDown: boolean
  /** Checklist rápido: 2 o 3 ítems */
  checks: CheckItem[]
  /** 0–100 */
  opacity: number
  /** Centro del bloque en % del marco 9:16 (0–100): idéntico en vista previa y en 1080×1920 */
  x: number
  y: number
  /** Legado (versiones anteriores): sólo se usan para migrar a x / y */
  position?: OverlayPosition
  align?: OverlayAlign
  size: OverlaySize
  style: OverlayStyle
  entrance: OverlayEntrance
  exit: OverlayExit
  /** Punch-in digital 1.15x del video mientras se ve el bloque */
  punch?: boolean
}

export interface OverlayItem extends TimeRange {
  id: string
  type: 'overlay'
  overlay: OverlayConfig
}

/** Ítem genérico (audio, subtítulos, biomecánica): el núcleo sólo necesita su rango. */
export interface GenericItem extends TimeRange {
  id: string
  type: Exclude<TrackKind, 'overlay' | 'video'>
  data?: Record<string, unknown>
  /** Edición en el timeline: mover y estirar ('range') o sólo mover ('move'). Sin valor, es de sólo lectura. */
  editable?: 'range' | 'move'
  /** Muestra el botón ✕ al seleccionarlo en el timeline */
  deletable?: boolean
}

export type TrackItem = OverlayItem | GenericItem

export interface Track {
  id: string
  kind: TrackKind
  /** Rótulo de la pista (ej: "V2 · OVERLAY TÁCTICO") */
  label: string
  items: TrackItem[]
  muted?: boolean
  /** Apila en carriles los ítems que se pisan (B1, A3) en vez de superponerlos */
  stack?: boolean
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

/** Palabra de subtítulo con tiempos en segundos del clip base. */
export interface SubtitleWord {
  word: string
  start: number
  end: number
  /** Inicio de bloque forzado (subtítulo cargado a mano): nunca se agrupa con la palabra anterior */
  br?: boolean
  /** Palabra clave del remate: va siempre en este color (Director IA) */
  color?: 'orange' | 'cyan'
}

export type SubtitleStyle = 'outline' | 'pill'
export type SubtitleAccent = 'orange' | 'cyan'

/** Pista S1 · subtítulos cinéticos (karaoke). */
export interface SubtitleTrack {
  words: SubtitleWord[]
  style: SubtitleStyle
  accent: SubtitleAccent
  enabled: boolean
  /** Desfase global en ms (±500): adelanta o atrasa todos los tiempos de S1 en bloque */
  offset?: number
}

/** Pista A2 · música de fondo. El archivo vive en memoria; esto es lo que se guarda. */
export interface MusicTrack {
  name: string
  duration: number
  /** 0–100 */
  volume: number
  ducking: boolean
  /** Nivel de la música durante el habla (0–1); por defecto 0,15 (−18 dB) */
  duckLevel?: number
}

/** Punto en el marco 9:16 en % (0–100). */
export interface FramePoint {
  x: number
  y: number
}

/** Punto del Bar Path con su instante (segundos del clip base). */
export interface PathPoint extends FramePoint {
  t: number
}

export interface BarPath {
  points: PathPoint[]
  thick: boolean
  /** Línea vertical de referencia (eje de gravedad) desde el primer punto */
  showVertical: boolean
}

/** Goniómetro articular: 3 puntos (a → vértice b → c) visibles en un rango de B1. */
export interface Goniometer extends TimeRange {
  id: string
  a: FramePoint
  b: FramePoint
  c: FramePoint
  label: string
  color: 'orange' | 'white'
  /** Punch-in digital 1.15x mientras dura el bloque */
  punch?: boolean
  /** false = colocado por el Director en una posición provisoria: no se exporta hasta que el
   *  usuario arrastra los 3 puntos sobre la articulación real */
  placed?: boolean
}

/** Pista B1 · HUD biomecánico. */
export interface Biomech {
  path: BarPath
  angles: Goniometer[]
}

/** 'shake' es un micro-efecto visual sin sonido (sacudida de pantalla). */
export type FxKind = 'impact' | 'whoosh' | 'beep' | 'bell' | 'shake' | 'flash'

export interface FxHit {
  id: string
  kind: FxKind
  /** Instante del disparo (segundos del clip base) */
  t: number
}

/** Pista A3 · Sound FX sintetizados. */
export interface SoundFx {
  hits: FxHit[]
  /** 0–100 */
  volume: number
  /** Screen shake automático en cada IMPACT · SUB (por defecto activo) */
  shake?: boolean
}

/**
 * Toma de voz en off (pista A1). El audio grabado vive en memoria (como el clip); esto es lo que
 * se guarda. `offset` / `duration` recortan la grabación (`total`) y `start` la ubica en el clip.
 */
export interface VoiceClip {
  id: string
  start: number
  offset: number
  duration: number
  total: number
  /** Cadena "Studio Clean": highpass 85 Hz + presencia 3,2 kHz + compresor */
  enhance: boolean
  /** 0–150 */
  gain: number
}

/** Montaje del Director IA inyectado en el proyecto. `offset` = In del clip al inyectar. */
export interface DirectorState {
  output: TacticalDirectorOutput
  idea: string
  offset: number
  createdAt: number
}

export interface VideoProject {
  version: 1
  clip: ClipInfo | null
  tracks: Track[]
  subtitles: SubtitleTrack
  music: MusicTrack | null
  biomech: Biomech
  fx: SoundFx
  /** A1 · voz en off */
  voice: VoiceClip[]
  /** Último montaje del Director IA (guion para el teleprompter, sugerencias de bar path) */
  director?: DirectorState
  /** Overlay seleccionado en el panel lateral */
  selectedId: string | null
  safeZone: boolean
}

/** Resolución de salida 9:16. */
export const OUT_W = 1080
export const OUT_H = 1920
