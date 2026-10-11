import { useAccent } from '../../../lib/accent'
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
/** Rótulos de categoría y números: blanco puro / cian muy claro (nunca grises oscuros). */
const LABEL = '#E6F4FF'
/** Trazo de contraste de la curva comparativa (población sin estímulo). */
const CMP = '#EF4444'

/** Forma de la curva en 0–1 según el preset, anclada a la zona óptima. */
function curveY(shape: CurveShape, t: number, zone: [number, number]) {
  const c = (zone[0] + zone[1]) / 2
  if (shape === 'bell') {
    const sigma = Math.max(zone[1] - zone[0], 0.14) * 0.85
    return 0.14 + 0.74 * Math.exp(-((t - c) ** 2) / (2 * sigma * sigma))
  }
  if (shape === 'plateau') {
    // Meseta alta sostenida: sube rápido, se mantiene y cae apenas al final.
    const up = 1 / (1 + Math.exp(-(t - 0.12) * 18))
    const down = 1 / (1 + Math.exp(-(t - 0.86) * 14))
    return 0.12 + 0.72 * up - 0.12 * down
  }
  if (shape === 'returns') {
    // Rendimientos decrecientes (asintótica): sube fuerte al principio y se aplana; la zona
    // efectiva cae donde la curva todavía rinde antes de la meseta.
    const k = 2.2 / Math.max(0.2, zone[1])
    return 0.08 + 0.74 * (1 - Math.exp(-k * t))
  }
  const k = 9
  const s = 1 / (1 + Math.exp(-(t - (shape === 'rise' ? zone[1] : zone[0])) * k))
  return shape === 'rise' ? 0.1 + 0.8 * s : 0.9 - 0.75 * s
}

/** Gráfico simple en SVG: curva, barras o medidor de umbral. */
export function TelemetryChart({ chart, width, height, fontFamily, scale }: Props) {
  const A = useAccent()
  const ZONE_FILL = `rgba(${A.cyanRgb},.09)`
  const ZONE_STROKE = `rgba(${A.cyanRgb},.45)`
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
            ...mono(27, tk.hl ? A.cyan : AXIS),
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
    // Eje Y explícito: rejilla táctica punteada cada 25 % (10 % de opacidad) con rótulos de nivel.
    const yTicks = [0, 0.25, 0.5, 0.75, 1]
    const yAxisX = PAD_X
    const z = zone ?? [0.4, 0.6]
    const curve = (shape: CurveShape): Pt[] =>
      Array.from({ length: 33 }, (_, i) => {
        const t = i / 32
        return { x: px(t), y: py(curveY(shape, t, z)) }
      })
    const pts = curve(chart.shape)
    // Doble trazo: contraste (tenue, rojo) debajo y serie principal (sólida, con brillo) arriba.
    const dual = Boolean(chart.compare)
    const cmpPts = dual ? curve(chart.compareShape ?? 'fall') : null
    body = (
      <div style={{ position: 'relative' }}>
        <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            {/* Zona óptima rayada en diagonal (hatching táctico) */}
            <pattern id="tc-hatch" width={16 * scale} height={16 * scale} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={16 * scale} stroke={A.cyan} strokeOpacity={0.32} strokeWidth={5 * scale} />
            </pattern>
          </defs>
          {yTicks.map((y) => (
            <line key={y} x1={yAxisX} x2={width - PAD_X} y1={py(y)} y2={py(y)} stroke="#FFFFFF" strokeOpacity={0.1} strokeWidth={2} strokeDasharray={`${6 * scale} ${10 * scale}`} />
          ))}
          <line x1={yAxisX} x2={yAxisX} y1={top - 8} y2={height} stroke={AXIS} strokeOpacity={0.6} strokeWidth={3} />
          {zone && (
            <>
              <rect x={px(zone[0])} y={4} width={Math.max(2, px(zone[1]) - px(zone[0]))} height={height - 4} fill={ZONE_FILL} />
              <rect x={px(zone[0])} y={4} width={Math.max(2, px(zone[1]) - px(zone[0]))} height={height - 4} fill="url(#tc-hatch)" stroke={ZONE_STROKE} strokeWidth={2} rx={6} />
            </>
          )}
          <line x1={PAD_X} x2={width - PAD_X} y1={height} y2={height} stroke={BRAND.border} strokeWidth={3} />
          {cmpPts && (
            <path d={smoothPath(cmpPts, 0.5)} stroke={CMP} strokeOpacity={0.75} strokeWidth={6 * scale} strokeDasharray={`${16 * scale} ${10 * scale}`} strokeLinecap="round" fill="none" />
          )}
          {dual && <path d={smoothPath(pts, 0.5)} stroke={A.cyan} strokeOpacity={0.22} strokeWidth={30 * scale} strokeLinecap="round" fill="none" />}
          <path d={smoothPath(pts, 0.5)} stroke={A.cyan} strokeWidth={12 * scale} strokeLinecap="round" fill="none" />
        </svg>
        {zone && (
          <span
            style={{
              ...mono(20, BRAND.bg),
              position: 'absolute',
              top: 14 * scale,
              left: px((zone[0] + zone[1]) / 2),
              transform: 'translateX(-50%)',
              fontWeight: 700,
              background: A.cyan,
              padding: `${4 * scale}px ${10 * scale}px`,
              borderRadius: 4 * scale,
              letterSpacing: '0.12em',
              textShadow: 'none',
            }}
          >
            [ ZONA EFECTIVA ]
          </span>
        )}
        <span style={{ ...mono(18, AXIS), position: 'absolute', left: yAxisX + 10 * scale, top: py(1) - 30 * scale }}>▲ RESPUESTA</span>
        {axis}
        {dual && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${10 * scale}px ${36 * scale}px`, marginTop: 18 * scale, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 24 * scale }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 * scale, color: BRAND.white }}>
              <span style={{ width: 34 * scale, height: 8 * scale, borderRadius: 4, background: A.cyan, boxShadow: `0 0 ${12 * scale}px ${A.cyan}` }} />
              {chart.mainLabel?.trim() || 'Con estímulo'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 * scale, color: AXIS }}>
              <span style={{ width: 34 * scale, height: 0, borderTop: `${5 * scale}px dashed ${CMP}` }} />
              {chart.compareLabel?.trim() || 'Sin estímulo'}
            </span>
          </div>
        )}
      </div>
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
              <span style={{ fontFamily, fontWeight: 700, fontSize: 34 * scale, color: hl ? A.cyan : BRAND.white, marginBottom: 8 * scale, textShadow: hl ? `0 0 ${14 * scale}px ${A.cyan}` : undefined }}>
                {fmt(v)}
              </span>
              <div
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: '8px 8px 2px 2px',
                  background: hl ? A.cyan : DIM,
                  opacity: hl ? 1 : 0.75,
                  boxShadow: hl ? `0 0 ${26 * scale}px ${A.cyan}66` : undefined,
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
              <span key={i} style={{ ...mono(30, inZone(i) ? A.cyan : LABEL), fontWeight: 700, width: barW, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
    const color = within ? A.cyan : A.orange
    // Instrumental militar: 10 bloques de 10 en 10 %, encendidos hasta el valor actual.
    const SEG = 10
    const segGap = 8 * scale
    const segW = (innerW - segGap * (SEG - 1)) / SEG
    const trackH = 70 * scale
    const lit = Math.round(v * SEG * 10) / 10
    body = (
      <>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 * scale, marginBottom: 46 * scale }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * scale, paddingBottom: 10 * scale }}>
            {chart.gaugeLabel.trim() && <span style={{ ...mono(24, LABEL), fontWeight: 700, textTransform: 'uppercase' }}>{chart.gaugeLabel}</span>}
            <span style={{ ...mono(20, within ? A.cyan : A.orange), fontWeight: 700, letterSpacing: '0.14em' }}>{within ? '■ EN RANGO' : '■ FUERA DE RANGO'}</span>
          </div>
          {/* Valor masivo a la derecha */}
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 * scale }}>
            <span style={{ fontFamily, fontWeight: 700, fontSize: 168 * scale, lineHeight: 0.82, color, letterSpacing: '-0.03em', textShadow: `0 0 ${36 * scale}px ${color}55` }}>{fmt(chart.gaugeValue)}</span>
            {unit && <span style={{ ...mono(36, BRAND.white), fontWeight: 700 }}>{unit}</span>}
          </span>
        </div>
        <div style={{ position: 'relative', height: trackH, margin: `0 ${PAD_X}px` }}>
          {zone && (
            <div
              style={{
                position: 'absolute',
                top: -12 * scale,
                bottom: -12 * scale,
                left: zone[0] * innerW - 4 * scale,
                width: Math.max(4, (zone[1] - zone[0]) * innerW) + 8 * scale,
                background: ZONE_FILL,
                border: `2px dashed ${ZONE_STROKE}`,
                borderRadius: 8 * scale,
              }}
            />
          )}
          {Array.from({ length: SEG }, (_, i) => {
            const fill = Math.min(1, Math.max(0, lit - i))
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: i * (segW + segGap),
                  width: segW,
                  borderRadius: 4 * scale,
                  background: BRAND.surface,
                  border: `2px solid ${fill > 0 ? color : BRAND.border}`,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                {fill > 0 && <div style={{ position: 'absolute', inset: 0, right: `${(1 - fill) * 100}%`, background: color, boxShadow: `0 0 ${18 * scale}px ${color}88` }} />}
                <span style={{ ...mono(15, fill > 0.5 ? BRAND.bg : AXIS), position: 'absolute', bottom: 4 * scale, left: 6 * scale, fontWeight: 700, textShadow: 'none' }}>{(i + 1) * 10}</span>
              </div>
            )
          })}
          {/* Umbral: línea de delimitación clara + etiqueta en contraste */}
          <div style={{ position: 'absolute', left: th * innerW - 3 * scale, top: -30 * scale, bottom: -30 * scale, width: 6 * scale, background: BRAND.gold, borderRadius: 3, boxShadow: `0 0 ${12 * scale}px ${BRAND.gold}` }} />
          <span
            style={{
              ...mono(20, BRAND.bg),
              position: 'absolute',
              bottom: `calc(100% + ${32 * scale}px)`,
              left: th * innerW,
              transform: th > 0.85 ? 'translateX(-100%)' : th < 0.15 ? 'none' : 'translateX(-50%)',
              textTransform: 'uppercase',
              fontWeight: 700,
              background: BRAND.gold,
              padding: `${4 * scale}px ${10 * scale}px`,
              borderRadius: 4 * scale,
              textShadow: 'none',
            }}
          >
            ▼ UMBRAL {fmt(chart.gaugeThreshold)}
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
        // Leyenda como chip sólido: [ ■ Creatina: Grado A ]
        <div style={{ marginTop: 30 * scale }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12 * scale,
              padding: `${10 * scale}px ${18 * scale}px`,
              borderRadius: 8 * scale,
              background: '#0F1A24',
              border: `2px solid ${A.cyan}`,
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 25 * scale,
              color: BRAND.white,
              textShadow: 'none',
            }}
          >
            <span style={{ width: 18 * scale, height: 18 * scale, background: A.cyan, borderRadius: 2, flex: '0 0 auto' }} />
            {chart.zoneLabel.trim()}
          </span>
        </div>
      )}
    </div>
  )
}
