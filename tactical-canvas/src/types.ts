export type TemplateId = 'metric' | 'compare' | 'chart' | 'statement' | 'manifesto' | 'diagram' | 'repeat' | 'matrix' | 'pipeline' | 'pyramid' | 'checklist' | 'bookmark' | 'opus' | 'quote' | 'athletic'
export type ThemeId = 'dark' | 'paper'
export type DiagramKind = 'radar' | 'circles' | 'domino' | 'curve' | 'funnel' | 'versus'
export type DiagramAccent = 'blue' | 'orange' | 'cyan'
export type RepeatAccent = 'white' | 'orange' | 'cyan'
export type RepeatMode = 'diagonal' | 'echo' | 'kinetic' | 'justified'
export type ManifestoStyle = 'bar' | 'quotes'
export type ContentAlign = 'auto' | 'top' | 'center' | 'bottom'
export type AspectId = 'feed' | 'story'
export type Accent = 'orange' | 'cyan' | 'gold' | 'white' | 'gray'
export type HeadlineFont = 'chakra' | 'barlow' | 'inter' | 'serif'
/** Presets tipográficos rápidos (none = la fuente y medidas elegidas a mano) */
export type TypePreset = 'none' | 'brutalist' | 'tactical' | 'editorial'
/** Diagonal de la plantilla 07: ↘ arranca arriba a la izquierda, ↗ abajo a la izquierda */
export type RepeatDirection = 'down' | 'up'

/** Ajuste fino sobre el lienzo (arrastre / escala con la caja de selección). */
export interface Nudge {
  /** Desplazamiento en px del lienzo nativo (1080 de ancho) */
  x: number
  y: number
  /** Escala 0.6–1.6 */
  s: number
}
export type NudgeTarget = 'headline' | 'block'

/** Datos dinámicos de la plantilla 06 · Diagrama (por placa). */
export interface DiagramData {
  /** Ejes y valores 0–100 separados por coma; serie comparativa opcional ("" = sin comparación) */
  radar: { axes: string; values: string; compare: string; labelA: string; labelB: string }
  /** labels: un rótulo opcional por ficha (uno por línea) */
  domino: { count: number; start: string; end: string; labels?: string }
  /** Divisiones por círculo ("1, 3, 12") y un texto por línea (4 círculos) */
  circles: { divisions: string; captions: string }
  /** Trayectoria «ruido vs claridad» */
  trajectory: { noise: string; clarity: string; goal: string }
  /** Embudo táctico: 3–4 niveles (uno por línea), de lo general a lo seleccionado */
  funnel?: { levels: string }
  /** VS binario: dos columnas enfrentadas con ítems (uno por línea) */
  versus?: { leftTitle: string; rightTitle: string; left: string; right: string }
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
  matrix: { axisX: string; axisY: string; quadrants: MatrixQuadrant[]; highlight: number; highlightAccent?: 'orange' | 'cyan' }
  /** 09 · Pipeline: 3 o 4 pasos */
  pipeline: { steps: { title: string; desc: string }[]; dir: 'vertical' | 'horizontal' }
  /** 10 · Pirámide: 3 o 4 estratos, el primero es la base */
  pyramid: { levels: { name: string; desc: string }[] }
  /** 11 · Checklist: 3 o 4 ítems binarios */
  checklist: { items: { status: 'ok' | 'err'; text: string; detail: string }[] }
}

/** 12 · Placa de guardado / cheat sheet */
/** Plantilla 13 · Mindset / Opus: un bloque numerado («00001:» + texto). */
export interface OpusBlock {
  /** Rótulo del bloque tal cual se muestra (ej: «00001»). Vacío = se numera solo. */
  num: string
  text: string
}

/** Plantilla 15 · Opus Athletic: una fila clave → valor («CARGAS PESADAS:» → «3-5 reps al 85 %»). */
export interface AthleticRow {
  k: string
  v: string
}
export type AthleticMode = 'list' | 'table'
/** Posición del recorte del atleta: auto = placa 1 centrado abajo, el resto a la derecha (40 %). */
export type AthleticPos = 'auto' | 'center' | 'right' | 'none'
/** Variante visual de la plantilla 15: Light Editorial (Opus Athletic) o Dark Brutalist (marca Coach JP) */
export type AthleticTheme = 'light' | 'dark'
/** Fondo de la plantilla 15: auto alterna anillos / grilla por placa; photo usa la imagen como fondo B/N a sangre */
export type AthleticBg = 'auto' | 'rings' | 'grid' | 'photo' | 'concrete' | 'radial'
/** Tipo de fondo de la placa: foto real (B/N con velo) o fondos tácticos sin foto */
export type BgStyle = 'photo' | 'concrete' | 'blueprint' | 'radial'

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
/** returns: rendimientos decrecientes (asintótica) — retorno de inversión / evidencia */
export type CurveShape = 'bell' | 'rise' | 'fall' | 'plateau' | 'returns'

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
  /** El remate arranca siempre en un renglón nuevo (evita que su primera palabra cuelgue del titular) */
  remateNewLine: boolean
  /** Aire entre titular y remate cuando va en renglón nuevo (% del cuerpo, 0–60) */
  remateGap?: number
  typePreset: TypePreset
  /** Intercambia naranja ⇄ cian en toda la placa */
  accentSwap: boolean
  /** Ajuste fino en el lienzo del titular y del bloque central */
  nudge?: Partial<Record<NudgeTarget, Nudge>>
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
  // Fondo fotográfico (propio de cada placa: foto, capa, encuadre y tratamiento)
  /** Foto de fondo de ESTA placa (id en IndexedDB, ver lib/imageStore). null = carbón sólido */
  bgImageId: string | null
  /** Tipo de fondo: photo (la imagen de la placa, si hay) o concreto / grilla blueprint / luz radial */
  bgStyle: BgStyle
  bgOverlay: number
  floatingPlate: boolean
  /** Encuadre de la foto: zoom 100–160 %, desplazamiento -50…+50 % */
  /** Degradé oscuro de contraste sobre la foto */
  bgGradient: boolean
  /** Gradiente inferior / viñeta sobre la foto (0–100) */
  bgVignette: number
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
  /** Mindset / Opus (plantilla 13): bloques numerados debajo del título principal */
  opusBlocks: OpusBlock[]
  /** Cita célebre (plantilla 14): frase, autor y rol (ej: «Bicampeón olímpico de maratón») */
  quoteText: string
  quoteAuthor: string
  quoteRole: string
  /** Fuente de la cita (entrevista, libro, discurso). Sólo para verificar en el panel: no se dibuja. */
  quoteSource: string
  /** Opus Athletic (plantilla 15): número de la etiqueta «[Nr. X]» */
  athleticNr: string
  athleticRows: AthleticRow[]
  /** Lista clave → valor o tabla de 2 columnas con encabezado */
  athleticMode: AthleticMode
  athleticHead: [string, string]
  athleticPos: AthleticPos
  athleticTheme: AthleticTheme
  athleticBg: AthleticBg
  /** Llamado a la acción de la placa de cierre (caja de acento al pie del bloque de texto) */
  athleticCta: string
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
  repeatDirection: RepeatDirection
  /** Giro del bloque completo (−30° a +30°) */
  repeatTilt: number
  /** Eco: palabra clave de la frase central que va en acento */
  repeatKeyword: string
  /** Kinetic: desplazamiento escalonado −10 % / 0 / +10 % */
  repeatStagger: boolean
  // Layout
  contentAlign: ContentAlign
  /** Separación titular → bloque de plantilla, en % del valor base */
  contentGap: number
}
