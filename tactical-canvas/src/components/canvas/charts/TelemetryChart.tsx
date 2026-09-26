import { BRAND, FONT_BODY, FONT_MONO } from '../../../lib/brand'
import { normalize, parseScatter, parseSeries, smoothPath, type Pt } from '../../../lib/chart'
import type { ChartConfig } from '../../../types'

interface Props {
  chart: ChartConfig
  width: number
  height: number
  scale: number
}

const PAD = 18
const DOT_OFF = '#4B5566'

/** Gráfico SVG en coordenadas nativas del canvas (sin librerías, 100% exportable). */
export function TelemetryChart({ chart, width, height, scale }: Props) {
  const innerW = width - PAD * 2
  const innerH = height - PAD * 2
  const px = (x: number) => PAD + (x / 100) * innerW
  const py = (y: number) => PAD + innerH - (y / 100) * innerH

  const zoneA = Math.min(chart.zoneFrom, chart.zoneTo)
  const zoneB = Math.max(chart.zoneFrom, chart.zoneTo)
  const inZone = (x: number) => chart.showZone && x >= zoneA && x <= zoneB

  let content: React.ReactNode = null
  if (chart.mode === 'scatter') {
    const pts = parseScatter(chart.scatter)
    const r = 13 * scale
    content = pts.map((p, i) => (
      <circle
        key={i}
        cx={px(p.x)}
        cy={py(p.y)}
        r={r}
        fill={inZone(p.x) ? BRAND.cyan : DOT_OFF}
        fillOpacity={inZone(p.x) ? 0.85 : 0.72}
      />
    ))
  } else {
    const a = parseSeries(chart.seriesA)
    const b = parseSeries(chart.seriesB)
    const [na, nb] = normalize([a, b])
    const toPts = (s: number[]): Pt[] =>
      s.map((v, i) => ({ x: px(s.length === 1 ? 50 : (i / (s.length - 1)) * 100), y: py(v) }))
    const stroke = 13 * scale
    content = (
      <>
        {nb && nb.length > 0 && (
          <path d={smoothPath(toPts(nb), 0.35)} stroke={BRAND.orange} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
        {na && na.length > 0 && (
          <path d={smoothPath(toPts(na), 0.35)} stroke={BRAND.cyan} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
      </>
    )
  }

  const markerX = px(chart.marker)
  const showLegend =
    (chart.showZone && chart.zoneLabel.trim()) ||
    (chart.mode === 'curve' && (chart.seriesALabel.trim() || (chart.seriesB.trim() && chart.seriesBLabel.trim()))) ||
    (chart.showThreshold && chart.thresholdLabel.trim())

  return (
    <div>
      {chart.title.trim() && (
        <p
          style={{
            margin: `0 0 ${22 * scale}px`,
            fontFamily: FONT_MONO,
            fontSize: 21 * scale,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: BRAND.gray,
          }}
        >
          {chart.title.trim()}
        </p>
      )}
      <div style={{ position: 'relative', width, height }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
          {/* Retícula técnica mínima */}
          {[25, 50, 75].map((g) => (
            <line key={g} x1={PAD} x2={width - PAD} y1={py(g)} y2={py(g)} stroke={BRAND.border} strokeWidth={1.5} strokeOpacity={0.55} />
          ))}
          {chart.showZone && (
            <rect
              x={px(zoneA)}
              y={PAD - 12}
              width={Math.max(0, px(zoneB) - px(zoneA))}
              height={innerH + 24}
              fill={BRAND.cyan}
              fillOpacity={0.07}
              stroke={BRAND.cyan}
              strokeOpacity={0.4}
              strokeWidth={2}
              rx={6}
            />
          )}
          {chart.showThreshold && (
            <line
              x1={PAD}
              x2={width - PAD}
              y1={py(chart.threshold)}
              y2={py(chart.threshold)}
              stroke="#5A6B82"
              strokeWidth={4 * scale}
              strokeDasharray={`${18 * scale} ${16 * scale}`}
            />
          )}
          {content}
          {chart.showMarker && (
            <line
              x1={markerX}
              x2={markerX}
              y1={PAD - 10}
              y2={height + 40 * scale}
              stroke={BRAND.orange}
              strokeWidth={5 * scale}
              strokeDasharray={`${22 * scale} ${22 * scale}`}
            />
          )}
        </svg>
      </div>
      {chart.showMarker && (chart.markerLabel.trim() || chart.markerSub.trim()) && (
        <div
          style={{
            marginTop: 60 * scale,
            paddingLeft: Math.min(Math.max(markerX - 64 * scale, 0), width - 380 * scale),
            fontFamily: FONT_BODY,
          }}
        >
          <p style={{ margin: 0, fontSize: 25 * scale, fontWeight: 700, color: BRAND.orange }}>{chart.markerLabel}</p>
          <p style={{ margin: `${4 * scale}px 0 0`, fontSize: 20 * scale, color: BRAND.gray }}>{chart.markerSub}</p>
        </div>
      )}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: `${16 * scale}px ${40 * scale}px`,
            marginTop: 38 * scale,
            fontFamily: FONT_BODY,
            fontSize: 23 * scale,
            color: BRAND.white,
          }}
        >
          {chart.showZone && chart.zoneLabel.trim() && (
            <LegendItem scale={scale} label={chart.zoneLabel} swatch={{ background: 'rgba(0,229,255,.18)', border: `2px solid ${BRAND.cyan}` }} />
          )}
          {chart.mode === 'curve' && chart.seriesALabel.trim() && (
            <LegendItem scale={scale} label={chart.seriesALabel} swatch={{ background: BRAND.cyan }} />
          )}
          {chart.mode === 'curve' && chart.seriesB.trim() && chart.seriesBLabel.trim() && (
            <LegendItem scale={scale} label={chart.seriesBLabel} swatch={{ background: BRAND.orange }} />
          )}
          {chart.showThreshold && chart.thresholdLabel.trim() && (
            <LegendItem
              scale={scale}
              label={chart.thresholdLabel}
              swatch={{ background: 'transparent', borderTop: `4px dashed #5A6B82`, height: 0, alignSelf: 'center' }}
              muted
            />
          )}
        </div>
      )}
    </div>
  )
}

function LegendItem({
  label,
  swatch,
  scale,
  muted,
}: {
  label: string
  swatch: React.CSSProperties
  scale: number
  muted?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 * scale }}>
      <span style={{ width: 24 * scale, height: 24 * scale, borderRadius: 3, flex: '0 0 auto', boxSizing: 'border-box', ...swatch }} />
      <span style={{ color: muted ? BRAND.gray : BRAND.white }}>{label}</span>
    </div>
  )
}
