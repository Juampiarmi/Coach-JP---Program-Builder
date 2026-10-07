import type { Discipline } from './ai'
import type { ChartConfig } from '../types'

/** Gráfico por defecto según el pilar: nada de cadencia ciclista en un post de fuerza. */
export const CHART_BY_DISCIPLINE: Record<Discipline, Partial<ChartConfig>> = {
  general: {
    mode: 'curve',
    shape: 'bell',
    title: 'SERIES SEMANALES VS. ESTÍMULO DE HIPERTROFIA',
    min: 0,
    max: 30,
    unit: 'series',
    zone: '10-18',
    zoneLabel: 'VENTANA HIPERTROFIA',
    barLabels: '4, 8, 12, 16, 20, 24',
    barValues: '38, 60, 84, 92, 80, 62',
    gaugeValue: 14,
    gaugeThreshold: 22,
    gaugeLabel: 'Series semanales',
  },
  sports: {
    mode: 'curve',
    shape: 'bell',
    title: 'SERIES SEMANALES VS. ESTÍMULO DE HIPERTROFIA',
    min: 0,
    max: 30,
    unit: 'series',
    zone: '10-18',
    zoneLabel: 'VENTANA HIPERTROFIA',
    barLabels: '4, 8, 12, 16, 20, 24',
    barValues: '38, 60, 84, 92, 80, 62',
    gaugeValue: 14,
    gaugeThreshold: 22,
    gaugeLabel: 'Series semanales',
  },
  crossfit: {
    mode: 'curve',
    shape: 'rise',
    title: 'LACTATO SANGUÍNEO VS. POTENCIA (W)',
    min: 100,
    max: 400,
    unit: 'W',
    zone: '240-280',
    zoneLabel: 'ZONA DE UMBRAL',
    barLabels: '150, 200, 250, 300, 350',
    barValues: '20, 35, 62, 88, 100',
    gaugeValue: 165,
    gaugeThreshold: 172,
    gaugeLabel: 'FC en el WOD',
  },
}

/** ¿El gráfico sigue siendo el de cadencia de ejemplo (sin editar)? */
export function isCadenceSample(chart: ChartConfig) {
  return chart.unit === 'rpm' && /CADENCIA/i.test(chart.title)
}

const AGE_RX = /\bedad\b|\ba[ñn]os\b|d[eé]cada|longevidad|envejec|sarcopenia|vida\b/i
// «semanas de bloque» sí; «series semanales» o «series por semana» (una tasa) no.
const WEEK_RX = /(?<!por |\/)\bsemanas?\b/i
const MONTH_RX = /(?<!por |\/)\bmes(es)?\b/i
const DAY_RX = /(?<!por |\/)\bd[ií]as?\b/i
const MASS_UNIT = /^(kg|kgs|kilos?|lb|lbs|g|gr)$/i

/**
 * Eje temporal o por etapas (edad, décadas, semanas): la unidad nunca es de peso. Devuelve la
 * unidad correcta («años», «semanas», «meses», «días» o "" si las etiquetas ya se explican
 * solas, ej. «30, 50, 70, 80+»), o null si el gráfico no es temporal.
 */
export function timeUnit(c: ChartConfig): string | null {
  const text = `${c.title} ${c.zoneLabel}${c.mode === 'gauge' ? ` ${c.gaugeLabel}` : ''}`
  const unit = c.unit.trim()
  const kind = AGE_RX.test(text) ? 'años' : WEEK_RX.test(text) ? 'semanas' : MONTH_RX.test(text) ? 'meses' : DAY_RX.test(text) ? 'días' : null
  if (!kind) return null
  // Unidad propia y coherente (no de peso): se respeta.
  if (unit && !MASS_UNIT.test(unit)) return unit
  // Barras con etiquetas autoexplicativas («30, 50, 70, 80+» o «Sem 1»): sin unidad.
  if (c.mode === 'bars' && /[+]|sem|año|mes|día/i.test(c.barLabels)) return ''
  return kind
}

const nums = (raw: string) =>
  raw
    .split(/[,;\n]+/)
    .map((s) => Number(s.trim().replace(',', '.')))
    .filter((n) => Number.isFinite(n))

/**
 * Pone en caja los números de un gráfico (por ejemplo, los que devuelve la IA): min < max,
 * zona dentro del rango, misma cantidad de etiquetas y valores en barras y medidor dentro
 * del rango. Si falta la unidad, usa la del pilar.
 */
export function harmonizeChart(chart: ChartConfig, discipline: Discipline): ChartConfig {
  const c = { ...chart }
  if (c.min > c.max) [c.min, c.max] = [c.max, c.min]
  if (c.min === c.max) c.max = c.min + 1
  const time = timeUnit(c)
  if (time !== null) c.unit = time
  else if (!c.unit.trim()) c.unit = CHART_BY_DISCIPLINE[discipline].unit ?? ''
  // "desde-hasta": el guion del medio es separador, sólo el primer número puede ser negativo.
  const m = c.zone.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?)/)
  if (m) {
    const [a, b] = [Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.'))]
    const lo = Math.max(c.min, Math.min(a, b))
    const hi = Math.min(c.max, Math.max(a, b))
    if (lo < hi) c.zone = `${lo}-${hi}`
  }
  if (c.mode === 'bars') {
    const labels = c.barLabels.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    const values = nums(c.barValues)
    const n = Math.min(labels.length || values.length, values.length)
    if (n) {
      if (labels.length) c.barLabels = labels.slice(0, n).join(', ')
      c.barValues = values.slice(0, n).join(', ')
    }
  }
  c.gaugeValue = Math.min(c.max, Math.max(c.min, c.gaugeValue))
  c.gaugeThreshold = Math.min(c.max, Math.max(c.min, c.gaugeThreshold))
  return c
}
