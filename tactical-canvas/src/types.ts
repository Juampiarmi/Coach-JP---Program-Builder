export type TemplateId = 'metric' | 'compare' | 'chart' | 'statement' | 'manifesto' | 'diagram' | 'repeat'
export type ThemeId = 'dark' | 'paper'
export type DiagramKind = 'radar' | 'circles' | 'domino' | 'curve'
export type DiagramAccent = 'blue' | 'orange' | 'cyan'
export type RepeatAccent = 'white' | 'orange' | 'cyan'
export type ManifestoStyle = 'bar' | 'quotes'
export type ContentAlign = 'auto' | 'top' | 'center' | 'bottom'
export type AspectId = 'feed' | 'story'
export type Accent = 'orange' | 'cyan' | 'gold' | 'white' | 'gray'
export type HeadlineFont = 'chakra' | 'barlow' | 'inter' | 'serif'

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
  // Manifiesto
  manifestoAuthor: string
  manifestoStyle: ManifestoStyle
  // Fondo fotográfico
  bgOverlay: number
  floatingPlate: boolean
  /** Encuadre de la foto: zoom 100–160 %, desplazamiento -50…+50 % */
  /** Degradé oscuro de contraste sobre la foto */
  bgGradient: boolean
  /** Tratamiento táctico B/N de la foto */
  bgMono: boolean
  bgZoom: number
  bgX: number
  bgY: number
  // Tema visual (Minimal Paper aplica a Diagrama y Repetición)
  theme: ThemeId
  // Diagrama visual (plantilla 06)
  diagramKind: DiagramKind
  diagramAccent: DiagramAccent
  /** Radar: ejes y valores 0–100 separados por coma; serie comparativa opcional */
  radarAxes: string
  radarValues: string
  radarCompare: string
  radarLabelA: string
  radarLabelB: string
  /** Círculos: divisiones por círculo ("1, 3, 12") y un texto breve por línea */
  circleDivisions: string
  circleCaptions: string
  /** Dominó */
  dominoCount: number
  dominoStart: string
  dominoEnd: string
  /** Curva de trayectoria */
  curveExpected: string
  curveReal: string
  curveGoal: string
  // Repetición matrix (plantilla 07)
  repeatPhrase: string
  repeatAccent: RepeatAccent
  // Layout
  contentAlign: ContentAlign
  /** Separación titular → bloque de plantilla, en % del valor base */
  contentGap: number
}
