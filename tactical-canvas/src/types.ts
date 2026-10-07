export type TemplateId = 'metric' | 'compare' | 'chart' | 'statement' | 'manifesto' | 'diagram' | 'repeat' | 'matrix' | 'pipeline' | 'pyramid' | 'checklist' | 'bookmark'
export type ThemeId = 'dark' | 'paper'
export type DiagramKind = 'radar' | 'circles' | 'domino' | 'curve'
export type DiagramAccent = 'blue' | 'orange' | 'cyan'
export type RepeatAccent = 'white' | 'orange' | 'cyan'
export type RepeatMode = 'diagonal' | 'echo' | 'kinetic' | 'justified'
export type ManifestoStyle = 'bar' | 'quotes'
export type ContentAlign = 'auto' | 'top' | 'center' | 'bottom'
export type AspectId = 'feed' | 'story'
export type Accent = 'orange' | 'cyan' | 'gold' | 'white' | 'gray'
export type HeadlineFont = 'chakra' | 'barlow' | 'inter' | 'serif'

/** Datos dinámicos de la plantilla 06 · Diagrama (por placa). */
export interface DiagramData {
  /** Ejes y valores 0–100 separados por coma; serie comparativa opcional ("" = sin comparación) */
  radar: { axes: string; values: string; compare: string; labelA: string; labelB: string }
  domino: { count: number; start: string; end: string }
  /** Divisiones por círculo ("1, 3, 12") y un texto por línea (4 círculos) */
  circles: { divisions: string; captions: string }
  /** Trayectoria «ruido vs claridad» */
  trajectory: { noise: string; clarity: string; goal: string }
}

/** Plantillas 08–11 · estructuras tácticas (por placa). */
export interface MatrixQuadrant {
  /** Badge del cuadrante (ej: ÓPTIMO) */
  label: string
  /** Descripción breve */
  tag: string
}
export interface StructData {
  /** 08 · Matriz 2x2: cuadrantes en orden sup-izq, sup-der, inf-izq, inf-der; highlight = cuadrante destacado */
  matrix: { axisX: string; axisY: string; quadrants: MatrixQuadrant[]; highlight: number }
  /** 09 · Pipeline: 3 o 4 pasos */
  pipeline: { steps: { title: string; desc: string }[]; dir: 'vertical' | 'horizontal' }
  /** 10 · Pirámide: 3 o 4 estratos, el primero es la base */
  pyramid: { levels: { name: string; desc: string }[] }
  /** 11 · Checklist: 3 o 4 ítems binarios */
  checklist: { items: { status: 'ok' | 'err'; text: string; detail: string }[] }
}

/** 12 · Placa de guardado / cheat sheet */
export interface BookmarkData {
  /** 3 o 4 viñetas clave del carrusel */
  points: string[]
  cta: string
  accent: 'orange' | 'cyan'
}

export interface CompareCard {
  label: string
  value: string
  caption: string
  accent: Accent
}

export type ChartMode = 'curve' | 'bars' | 'gauge'
export type CurveShape = 'bell' | 'rise' | 'fall' | 'plateau'

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
  /** Curva comparativa (doble trazo): la serie principal (sólida, con brillo) contra una de contraste (tenue, roja) */
  compare?: boolean
  mainLabel?: string
  compareLabel?: string
  compareShape?: CurveShape
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
  /** Datos de los 4 subtipos (de la IA o editados). null = todavía no se cargaron: se usan los del pilar del tema. */
  diagramData: DiagramData | null
  /** Plantillas 08–11 (IA o editados). null = todavía no se cargaron: se usan los del pilar del tema. */
  structData: StructData | null
  /** Placa de guardado. null = viñetas extraídas automáticamente del resto del carrusel. */
  bookmarkData: BookmarkData | null
  // Repetición matrix (plantilla 07)
  repeatPhrase: string
  repeatAccent: RepeatAccent
  /** Diagonal (palabra i en el renglón i) o Eco vertical (frase repetida, la del medio encendida) */
  repeatMode: RepeatMode
  /** Escala del texto (% del máximo que entra en el ancho) e interlineado (% del relleno automático) */
  repeatScale: number
  repeatLeading: number
  /** Eco vertical: cantidad de repeticiones */
  repeatCount: number
  /** Eco con jerarquía: tamaño de la frase central (% de las demás) y banda oscura detrás */
  repeatCenterScale: number
  repeatBand: boolean
  // Layout
  contentAlign: ContentAlign
  /** Separación titular → bloque de plantilla, en % del valor base */
  contentGap: number
}
