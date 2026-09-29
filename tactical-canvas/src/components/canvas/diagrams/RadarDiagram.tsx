import { clamp, LABEL_FONT, MONO_FONT, toList, toNumbers, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  axes: string
  values: string
  compare: string
  labelA: string
  labelB: string
}

/** Radar / telaraña de 3 a 8 ejes con valores 0–100 y serie comparativa opcional. */
export function RadarDiagram({ axes, values, compare, labelA, labelB, width, height, ink, muted, line, accent, bg, scale }: Props) {
  const names = toList(axes).slice(0, 8)
  while (names.length < 3) names.push(`Eje ${names.length + 1}`)
  const n = names.length
  const vals = names.map((_, i) => clamp(toNumbers(values)[i] ?? 0, 0, 100))
  const cmpRaw = toNumbers(compare)
  const cmp = cmpRaw.length ? names.map((_, i) => clamp(cmpRaw[i] ?? 0, 0, 100)) : null

  const legendH = labelA.trim() || (cmp && labelB.trim()) ? 56 * scale : 0
  const plotH = height - legendH
  const cx = width / 2
  const cy = plotH / 2
  // Radar un 25 % más grande que la base (0,30 del ancho / 0,36 del alto), limitado para que
  // las etiquetas laterales no se salgan del ancho útil.
  const labelSize = 32 * scale
  const longest = Math.max(...names.map((s) => s.length))
  const sideRoom = width / 2 - 30 * scale - longest * labelSize * 0.56
  // Arriba y abajo hace falta lugar para la etiqueta + su valor (≈ 2 renglones).
  const vertRoom = plotH / 2 - labelSize * 2.6
  const R = Math.max(80 * scale, Math.min(width * 0.3 * 1.25, plotH * 0.36 * 1.25, sideRoom, vertRoom))
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, v: number) => [cx + Math.cos(angle(i)) * R * (v / 100), cy + Math.sin(angle(i)) * R * (v / 100)]
  const poly = (vs: number[]) => vs.map((v, i) => pt(i, v).join(',')).join(' ')

  return (
    <div>
      <svg width={width} height={plotH} viewBox={`0 0 ${width} ${plotH}`} style={{ display: 'block', overflow: 'visible' }}>
        {[25, 50, 75, 100].map((ring) => (
          <polygon key={ring} points={poly(names.map(() => ring))} fill="none" stroke={line} strokeWidth={ring === 100 ? 3 : 2} />
        ))}
        {names.map((_, i) => {
          const [x, y] = pt(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={line} strokeWidth={2} />
        })}
        {cmp && <polygon points={poly(cmp)} fill="none" stroke={muted} strokeWidth={4 * scale} strokeDasharray={`${14 * scale} ${10 * scale}`} />}
        <polygon points={poly(vals)} fill={accent} fillOpacity={0.16} stroke={accent} strokeWidth={6 * scale} strokeLinejoin="round" />
        {vals.map((v, i) => {
          const [x, y] = pt(i, v)
          return <circle key={i} cx={x} cy={y} r={9 * scale} fill={accent} stroke={bg} strokeWidth={3 * scale} />
        })}
        {names.map((name, i) => {
          const a = angle(i)
          const cos = Math.cos(a)
          const sin = Math.sin(a)
          const x = cx + cos * (R + 30 * scale)
          const y = cy + sin * (R + 30 * scale)
          const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
          const dy = sin > 0.3 ? 28 * scale : sin < -0.3 ? -36 * scale : -4 * scale
          return (
            <g key={name + i}>
              <text x={x} y={y + dy} textAnchor={anchor} fill={ink} style={{ fontFamily: LABEL_FONT, fontWeight: 700, fontSize: labelSize }}>
                {name}
              </text>
              <text x={x} y={y + dy + 32 * scale} textAnchor={anchor} fill={muted} style={{ fontFamily: MONO_FONT, fontSize: 23 * scale }}>
                {vals[i]}
              </text>
            </g>
          )
        })}
      </svg>
      {legendH > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40 * scale, marginTop: 20 * scale, fontFamily: LABEL_FONT, fontSize: 23 * scale, color: ink }}>
          {labelA.trim() && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 * scale }}>
              <span style={{ width: 26 * scale, height: 6 * scale, background: accent, borderRadius: 3 }} />
              {labelA.trim()}
            </span>
          )}
          {cmp && labelB.trim() && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 * scale, color: muted }}>
              <span style={{ width: 26 * scale, borderTop: `${4 * scale}px dashed ${muted}` }} />
              {labelB.trim()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
