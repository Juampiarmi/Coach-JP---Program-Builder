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
  if (!c.unit.trim()) c.unit = CHART_BY_DISCIPLINE[discipline].unit ?? ''
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
