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

export type ChartMode = 'curve' | 'bars' | 'gauge'
export type CurveShape = 'bell' | 'rise' | 'fall'

/** Gráfico simplificado: todo se define con pocos inputs. */
export interface ChartConfig {
  mode: ChartMode
  /** Etiqueta de la curva / título del gráfico */
  title: string
  min: number
  max: number
  unit: string
  /** Rango de la zona óptima en texto libre, ej: "70-90" o "70–90 rpm" */
  zone: string
  zoneLabel: string
  /** Curva: forma */
  shape: CurveShape
  /** Barras: etiquetas y valores separados por coma */
  barLabels: string
  barValues: string
  /** Medidor: valor actual y umbral */
  gaugeValue: number
  gaugeThreshold: number
  gaugeLabel: string
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
  // Fondo fotográfico
  bgOverlay: number
  floatingPlate: boolean
}
