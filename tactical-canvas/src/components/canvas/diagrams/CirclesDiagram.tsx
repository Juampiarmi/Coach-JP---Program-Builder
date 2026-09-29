import { LABEL_FONT, MONO_FONT, toList, toNumbers, type DiagramStyle } from './shared'

interface Props extends DiagramStyle {
  divisions: string
  captions: string
}

function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
  return `M${cx},${cy} L${p(a0)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`
}

/**
 * Círculos fraccionados: el objetivo entero, luego dividido en partes cada vez más chicas
 * y, al final, una sola fracción destacada ("lo de hoy").
 */
export function CirclesDiagram({ divisions, captions, width, height, ink, muted, accent, scale }: Props) {
  const divs = toNumbers(divisions)
    .map((d) => Math.max(1, Math.min(48, Math.round(d))))
    .slice(0, 4)
  if (!divs.length) divs.push(1, 3, 12)
  const circles = [...divs, divs[divs.length - 1]] // el último se repite con una fracción resaltada
  const texts = toList(captions.replace(/\n/g, ';'))
  const c = circles.length
  const gap = 58 * scale
  const captionH = 90 * scale
  const D = Math.min((width - gap * (c - 1)) / c, height - captionH - 20 * scale)
  const total = c * D + (c - 1) * gap
  const x0 = (width - total) / 2
  const r = D / 2 - 4 * scale
  const cy = D / 2 + 4 * scale
  const stroke = 4 * scale

  return (
    <div>
      <svg width={width} height={D + 8 * scale} viewBox={`0 0 ${width} ${D + 8 * scale}`} style={{ display: 'block', overflow: 'visible' }}>
        {circles.map((d, i) => {
          const cx = x0 + i * (D + gap) + D / 2
          const last = i === c - 1
          const start = -Math.PI / 2
          return (
            <g key={i}>
              {last && <path d={wedge(cx, cy, r, start, start + (2 * Math.PI) / d)} fill={accent} />}
              {i === 0 && d === 1 && <circle cx={cx} cy={cy} r={r} fill={ink} fillOpacity={0.06} />}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={stroke} />
              {d > 1 &&
                Array.from({ length: d }, (_, k) => {
                  const a = start + (k * 2 * Math.PI) / d
                  return <line key={k} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={ink} strokeWidth={stroke * 0.7} />
                })}
              {i < c - 1 && (
                <g stroke={muted} strokeWidth={3 * scale} fill="none" strokeLinecap="round">
                  <line x1={cx + D / 2 + gap * 0.2} y1={cy} x2={cx + D / 2 + gap * 0.8} y2={cy} />
                  <polyline points={`${cx + D / 2 + gap * 0.62},${cy - 9 * scale} ${cx + D / 2 + gap * 0.8},${cy} ${cx + D / 2 + gap * 0.62},${cy + 9 * scale}`} />
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap, marginLeft: x0, marginTop: 22 * scale }}>
        {circles.map((_, i) => (
          <div key={i} style={{ width: D, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO_FONT, fontSize: 18 * scale, color: i === c - 1 ? accent : muted, letterSpacing: '0.1em' }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{ fontFamily: LABEL_FONT, fontWeight: 600, fontSize: 24 * scale, lineHeight: 1.25, color: ink, marginTop: 6 * scale }}>
              {texts[i] ?? ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
