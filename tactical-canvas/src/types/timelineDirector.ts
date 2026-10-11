/**
 * Director de Montaje IA · contrato de datos.
 * Es la forma exacta que devuelve Gemini (Structured Outputs, validada con el responseSchema de
 * `video/director/schema.ts`) y que el estudio inyecta en las pistas V1, V2, S1, A1 y A2.
 * Todos los tiempos están en segundos desde el inicio del montaje.
 */

export interface SubtitleCue {
  start: number
  end: number
  text: string
  highlightWord?: string
  accentColor: 'orange' | 'cyan' | 'white'
}

export interface TacticalOverlayEvent {
  type: 'goniometer' | 'bar_path' | 'badge_metric' | 'flash_impact'
  startTime: number
  duration: number
  label?: string
  config: {
    color?: string
    position?: { x: number; y: number }
    targetValue?: string | number
  }
}

export type DirectorPace = 'fast_kinetic' | 'technical_breakdown'
export type StockType = 'dark_gym_heavy_lift' | 'barbell_setup' | 'athlete_chalk'
export type MusicMood = 'dark_tactical_bass' | 'cyberpunk_industrial' | 'minimal_drill'

export interface TacticalDirectorOutput {
  title: string
  durationSeconds: number
  pace: DirectorPace
  v1_video: {
    fallbackStockType: StockType
    playbackRate: number
  }
  v2_overlays: TacticalOverlayEvent[]
  s1_subtitles: SubtitleCue[]
  a1_voiceover: {
    fullScript: string
    estimatedDuration: number
    targetWpm: number
  }
  a2_music: {
    genreMood: MusicMood
    duckingActive: boolean
    baseVolume: number
    duckingVolume: number
  }
}
