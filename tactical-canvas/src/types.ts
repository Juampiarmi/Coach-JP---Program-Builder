export type TemplateId = 'metric' | 'compare' | 'chart' | 'statement'
export type AspectId = 'feed' | 'story'
export type Accent = 'orange' | 'cyan' | 'gold' | 'white' | 'gray'
export type HeadlineFont = 'chakra' | 'barlow' | 'inter'

export interface CompareCard {
  label: string
  value: string
  caption: string
  accent: Accent
}

export type ChartMode = 'scatter' | 'curve'

export interface ChartConfig {
  mode: ChartMode
  title: string
  /** Pares "x,y" por línea (0–100) */
  scatter: string
  /** Serie principal: valores separados por coma */
  seriesA: string
  seriesALabel: string
  /** Serie secundaria (opcional) */
  seriesB: string
  seriesBLabel: string
  showZone: boolean
  zoneFrom: number
  zoneTo: number
  zoneLabel: string
  /** Umbral horizontal (0–100, en escala de Y) */
  showThreshold: boolean
  threshold: number
  thresholdLabel: string
  /** Marcador vertical (0–100, en escala de X) */
  showMarker: boolean
  marker: number
  markerLabel: string
  markerSub: string
}

export interface CanvasState {
  template: TemplateId
  aspect: AspectId
  headlineFont: HeadlineFont
  headlineScale: number
  tag: string
  headlineA: string
  headlineB: string
  body: string
  citeMain: string
  citeSub: string
  // Métrica gigante
  metricValue: string
  metricLabel: string
  metricAccent: Accent
  // Comparativa A/B
  cardA: CompareCard
  cardB: CompareCard
  verdict: string
  // Gráfico
  chart: ChartConfig
  // Sentencia
  kicker: string
}
