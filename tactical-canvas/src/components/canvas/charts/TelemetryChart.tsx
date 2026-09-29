import { BRAND, FONT_BODY, FONT_MONO } from '../../../lib/brand'
import { fmt, parseList, parseNumbers, parseRange, ratio, smoothPath, type Pt } from '../../../lib/chart'
import type { ChartConfig, CurveShape } from '../../../types'

interface Props {
  chart: ChartConfig
  width: number
  height: number
  fontFamily: string
  scale: number
}

const PAD_X = 14
const DIM = '#4B5566'
/** Etiquetas numéricas de los ejes: más claras y grandes para que no se pierdan en el fondo oscuro. */
const AXIS = '#94A3B8'
const ZONE_FILL = 'rgba(56,189,248,.09)'
const ZONE_STROKE = 'rgba(56,189,248,.45)'

/** Forma de la curva en 0–1 según el preset, anclada a la zona óptima. */
function curveY(shape: CurveShape, t: number, zone: [number, number]) {
  const c = (zone[0] + zone[1]) / 2
  if (shape === 'bell') {
    const sigma = Math.max(zone[1] - zone[0], 0.14) * 0.85
    return 0.14 + 0.74 * Math.exp(-((t - c) ** 2) / (2 * sigma * sigma))
  }
  const k = 9
  const s = 1 / (1 + Math.exp(-(t - (shape === 'rise' ? zone[1] : zone[0])) * k))
  return shape === 'rise' ? 0.1 + 0.8 * s : 0.9 - 0.75 * s
}

/** Gráfico simple en SVG: curva, barras o medidor de umbral. */
export function TelemetryChart({ chart, width, height, fontFamily, scale }: Props) {
  const min = Math.min(chart.min, chart.max)
  const max = Math.max(chart.min, chart.max)
  const range = parseRange(chart.zone)
  const zone: [number, number] | null = range ? [ratio(range[0], min, max), ratio(range[1], min, max)] : null
  const innerW = width - PAD_X * 2
  const px = (t: number) => PAD_X + t * innerW
  const unit = chart.unit.trim()

  const mono = (size: number, color: string = BRAND.gray): React.CSSProperties => ({
    fontFamily: FONT_MONO,
    fontSize: size * scale,
    letterSpacing: '0.06em',
    color,
    whiteSpace: 'nowrap',
  })

  // Ticks del eje: mínimo, límites de la zona y máximo (evitando solapamientos).
  const ticks: { t: number; label: string; hl: boolean }[] = [{ t: 0, label: fmt(min), hl: false }]
  if (range && zone) {
    ticks.push({ t: zone[0], label: fmt(range[0]), hl: true }, { t: zone[1], label: fmt(range[1]), hl: true })
  }
  ticks.push({ t: 1, label: `${fmt(max)}${unit ? ` ${unit}` : ''}`, hl: false })
  const visibleTicks = ticks.filter((tk, i) => tk.hl || ticks.every((o, j) => j === i || !o.hl || Math.abs(o.t - tk.t) > 0.09))

  const axis = (
    <div style={{ position: 'relative', height: 40 * scale, marginTop: 16 * scale }}>
      {visibleTicks.map((tk, i) => (
        <span
          key={i}
          style={{
            ...mono(27, tk.hl ? BRAND.cyan : AXIS),
            position: 'absolute',
            left: px(tk.t),
            transform: tk.t === 0 ? 'none' : tk.t === 1 ? 'translateX(-100%)' : 'translateX(-50%)',
          }}
        >
          {tk.label}
        </span>
      ))}
    </div>
  )

  let body: React.ReactNode
  if (chart.mode === 'curve') {
    const top = 20
    const plotH = height - top - 10
    const py = (y: number) => top + plotH - y * plotH
    const z = zone ?? [0.4, 0.6]
    const pts: Pt[] = Array.from({ length: 33 }, (_, i) => {
      const t = i / 32
      return { x: px(t), y: py(curveY(chart.shape, t, z)) }
    })
    body = (
      <>
        <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
          {zone && (
            <rect x={px(zone[0])} y={4} width={Math.max(2, px(zone[1]) - px(zone[0]))} height={height - 4} fill={ZONE_FILL} stroke={ZONE_STROKE} strokeWidth={2} rx={6} />
          )}
          <line x1={PAD_X} x2={width - PAD_X} y1={height} y2={height} stroke={BRAND.border} strokeWidth={3} />
          <path d={smoothPath(pts, 0.5)} stroke={BRAND.cyan} strokeWidth={12 * scale} strokeLinecap="round" fill="none" />
        </svg>
        {axis}
      </>
    )
  } else if (chart.mode === 'bars') {
    const values = parseNumbers(chart.barValues)
    const labels = parseList(chart.barLabels)
    const n = Math.max(values.length, 1)
    const gap = Math.min(28, innerW / n / 4)
    const barW = (innerW - gap * (n - 1)) / n
    const peak = values.indexOf(Math.max(...values))
    const inZone = (i: number) => {
      const lv = Number((labels[i] ?? '').replace(/[^\d.-]/g, ''))
      return range && labels[i] && Number.isFinite(lv) && /\d/.test(labels[i]) ? lv >= range[0] && lv <= range[1] : i === peak
    }
    const valueH = 44 * scale
    body = (
      <div style={{ display: 'flex', gap, height: height + valueH, alignItems: 'flex-end', padding: `0 ${PAD_X}px` }}>
        {values.map((v, i) => {
          const hl = inZone(i)
          const h = Math.max(6, ratio(v, Math.min(min, 0), max) * height)
          return (
            <div key={i} style={{ width: barW, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily, fontWeight: 700, fontSize: 30 * scale, color: hl ? BRAND.cyan : BRAND.gray, marginBottom: 8 * scale }}>
                {fmt(v)}
              </span>
              <div
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: '8px 8px 2px 2px',
                  background: hl ? BRAND.cyan : DIM,
                  opacity: hl ? 0.92 : 0.6,
                }}
              />
            </div>
          )
        })}
      </div>
    )
    if (labels.length) {
      body = (
        <>
          {body}
          <div style={{ display: 'flex', gap, padding: `${12 * scale}px ${PAD_X}px 0`, borderTop: `3px solid ${BRAND.border}` }}>
            {values.map((_, i) => (
              <span key={i} style={{ ...mono(25, AXIS), width: barW, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {labels[i] ?? ''}
              </span>
            ))}
          </div>
        </>
      )
    }
  } else {
    const v = ratio(chart.gaugeValue, min, max)
    const th = ratio(chart.gaugeThreshold, min, max)
    const within = range ? chart.gaugeValue >= range[0] && chart.gaugeValue <= range[1] : chart.gaugeValue <= chart.gaugeThreshold
    const color = within ? BRAND.cyan : BRAND.orange
    const trackH = 64 * scale
    body = (
      <>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 * scale, marginBottom: 34 * scale }}>
          <span style={{ fontFamily, fontWeight: 700, fontSize: 120 * scale, lineHeight: 0.9, color, letterSpacing: '-0.02em' }}>
            {fmt(chart.gaugeValue)}
          </span>
          {unit && <span style={{ ...mono(30, BRAND.white), fontWeight: 600 }}>{unit}</span>}
          {chart.gaugeLabel.trim() && <span style={{ ...mono(21), marginLeft: 'auto', textTransform: 'uppercase' }}>{chart.gaugeLabel}</span>}
        </div>
        <div style={{ position: 'relative', height: trackH, margin: `0 ${PAD_X}px` }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: trackH / 2, background: BRAND.surface, border: `2px solid ${BRAND.border}` }} />
          {zone && (
            <div
              style={{
                position: 'absolute',
                top: -10,
                bottom: -10,
                left: zone[0] * innerW,
                width: Math.max(4, (zone[1] - zone[0]) * innerW),
                background: ZONE_FILL,
                border: `2px solid ${ZONE_STROKE}`,
                borderRadius: 10,
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              top: 10 * scale,
              bottom: 10 * scale,
              left: 10 * scale,
              width: Math.max(0, v * innerW - 20 * scale),
              borderRadius: trackH,
              background: color,
              boxShadow: `0 0 ${30 * scale}px ${color}55`,
            }}
          />
          <div style={{ position: 'absolute', left: th * innerW - 3, top: -24 * scale, bottom: -24 * scale, width: 6 * scale, background: BRAND.gold, borderRadius: 3 }} />
          <span
            style={{
              ...mono(18, BRAND.gold),
              position: 'absolute',
              bottom: `calc(100% + ${30 * scale}px)`,
              left: th * innerW,
              transform: th > 0.85 ? 'translateX(-100%)' : 'translateX(-50%)',
              textTransform: 'uppercase',
            }}
          >
            UMBRAL {fmt(chart.gaugeThreshold)}
          </span>
        </div>
        <div style={{ height: 14 * scale }} />
        {axis}
      </>
    )
  }

  return (
    <div>
      {chart.title.trim() && (
        <p style={{ ...mono(21), margin: `0 0 ${chart.mode === 'gauge' ? 18 : 26}px`, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'normal' }}>
          {chart.title.trim()}
        </p>
      )}
      {body}
      {zone && chart.zoneLabel.trim() && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 * scale, marginTop: 30 * scale, fontFamily: FONT_BODY, fontSize: 23 * scale, color: BRAND.white }}>
          <span style={{ width: 24 * scale, height: 24 * scale, borderRadius: 3, background: 'rgba(56,189,248,.2)', border: `2px solid ${BRAND.cyan}`, boxSizing: 'border-box', flex: '0 0 auto' }} />
          {chart.zoneLabel.trim()}
        </div>
      )}
    </div>
  )
}
