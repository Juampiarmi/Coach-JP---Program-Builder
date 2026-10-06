import { Fragment, type ReactNode } from 'react'
import { BRAND } from '../../../lib/brand'
import { resolveStructData } from '../../../lib/structPillar'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState, StructData, ThemeId } from '../../../types'
import { LABEL_FONT, MONO_FONT } from '../diagrams/shared'
import { Paragraph } from '../Paragraph'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  theme: ThemeId
  contentWidth: number
  scale: number
}

interface Look {
  palette: CanvasPalette
  /** Fondo de cuadrantes, nodos y estratos */
  fill: string
  ok: string
  err: string
  width: number
  scale: number
  story: boolean
}

const FILL: Record<ThemeId, string> = { dark: '#11161B', paper: '#F0ECE4' }
const OK: Record<ThemeId, string> = { dark: BRAND.cyan, paper: '#0E7490' }

/** Badge monoespaciado (cuadrantes de la matriz, estado del checklist). */
function Badge({ children, color, solid, look }: { children: ReactNode; color: string; solid?: boolean; look: Look }) {
  const s = look.scale
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: MONO_FONT,
        fontWeight: 700,
        fontSize: 19 * s,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: `${6 * s}px ${12 * s}px`,
        borderRadius: 6 * s,
        border: `${Math.max(1.5, 2 * s)}px solid ${color}`,
        background: solid ? color : 'transparent',
        color: solid ? look.palette.bg : color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/** 08 · Matriz 2x2: dos ejes perpendiculares y cuatro cuadrantes con badge y descripción. */
function Matrix({ data, look }: { data: StructData['matrix']; look: Look }) {
  const { palette, scale: s } = look
  const gutter = 58 * s
  const gridW = look.width - gutter
  const gridH = (look.story ? 820 : 560) * s
  const gap = 12 * s
  const qW = (gridW - gap) / 2
  const qH = (gridH - gap) / 2
  const axis = palette.muted
  const stroke = Math.max(2, 3 * s)
  const head = 14 * s
  const small = { fontFamily: MONO_FONT, fontSize: 17 * s, letterSpacing: '0.16em', color: palette.muted, fontWeight: 600 } as const
  const axisName = { fontFamily: MONO_FONT, fontSize: 21 * s, letterSpacing: '0.14em', color: palette.ink, fontWeight: 700, textTransform: 'uppercase' } as const
  const quads = [0, 1, 2, 3].map((i) => data.quadrants[i] ?? { label: '', tag: '' })

  return (
    <div style={{ position: 'relative', width: look.width, height: gridH + gutter }}>
      {/* Eje Y (izquierda, hacia arriba) y eje X (abajo, hacia la derecha) */}
      <svg width={look.width} height={gridH + gutter} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden>
        <g stroke={axis} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1={gutter - 14 * s} y1={gridH + 14 * s} x2={gutter - 14 * s} y2={0} />
          <polyline points={`${gutter - 14 * s - head * 0.7},${head} ${gutter - 14 * s},0 ${gutter - 14 * s + head * 0.7},${head}`} />
          <line x1={gutter - 14 * s} y1={gridH + 14 * s} x2={look.width} y2={gridH + 14 * s} />
          <polyline points={`${look.width - head},${gridH + 14 * s - head * 0.7} ${look.width},${gridH + 14 * s} ${look.width - head},${gridH + 14 * s + head * 0.7}`} />
        </g>
      </svg>
      {/* Nombre del eje Y (vertical) con extremos BAJO / ALTO */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: gridH,
          height: gutter - 22 * s,
          transform: `translateY(${gridH}px) rotate(-90deg)`,
          transformOrigin: 'top left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${26 * s}px`,
          boxSizing: 'border-box',
        }}
      >
        <span style={small}>BAJO</span>
        <span style={axisName}>{data.axisY}</span>
        <span style={small}>ALTO</span>
      </div>
      {/* Nombre del eje X con extremos BAJO / ALTO */}
      <div
        style={{
          position: 'absolute',
          left: gutter,
          right: 0,
          top: gridH + 26 * s,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: 24 * s,
        }}
      >
        <span style={small}>BAJO</span>
        <span style={axisName}>{data.axisX}</span>
        <span style={small}>ALTO</span>
      </div>
      {quads.map((q, i) => {
        const on = i === data.highlight
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: gutter + (i % 2) * (qW + gap),
              top: Math.floor(i / 2) * (qH + gap),
              width: qW,
              height: qH,
              boxSizing: 'border-box',
              background: look.fill,
              border: `${Math.max(1.5, 2 * s)}px solid ${on ? palette.accent : palette.line}`,
              borderRadius: 14 * s,
              padding: `${26 * s}px ${24 * s}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12 * s,
            }}
          >
            <div>
              <Badge color={on ? palette.accent : palette.ink} solid={on} look={look}>
                {q.label}
              </Badge>
            </div>
            <p style={{ margin: 0, fontFamily: LABEL_FONT, fontWeight: 600, fontSize: 27 * s, lineHeight: 1.28, color: on ? palette.ink : palette.muted, textWrap: 'pretty' }}>
              {q.tag}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/** Flecha ortogonal entre nodos del pipeline. */
function Arrow({ dir, size, color, stroke }: { dir: 'down' | 'right'; size: number; color: string; stroke: number }) {
  const w = dir === 'down' ? stroke * 8 : size
  const h = dir === 'down' ? size : stroke * 8
  const d =
    dir === 'down'
      ? `M${w / 2},0 V${h - 2} M${w / 2 - stroke * 2.6},${h - stroke * 3} L${w / 2},${h - 2} L${w / 2 + stroke * 2.6},${h - stroke * 3}`
      : `M0,${h / 2} H${w - 2} M${w - stroke * 3},${h / 2 - stroke * 2.6} L${w - 2},${h / 2} L${w - stroke * 3},${h / 2 + stroke * 2.6}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', flexShrink: 0, overflow: 'visible' }} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 09 · Pipeline: pasos numerados conectados por flechas ortogonales (vertical u horizontal). */
function Pipeline({ data, look }: { data: StructData['pipeline']; look: Look }) {
  const { palette, scale: s } = look
  const steps = data.steps.slice(0, 4)
  const horizontal = data.dir === 'horizontal'
  const stroke = Math.max(2, 3 * s)
  const node = (st: (typeof steps)[number], i: number) => (
    <div
      style={{
        flex: horizontal ? 1 : undefined,
        minWidth: 0,
        boxSizing: 'border-box',
        background: look.fill,
        border: `${Math.max(1.5, 2 * s)}px solid ${i === steps.length - 1 ? palette.accent : palette.line}`,
        borderRadius: 14 * s,
        padding: horizontal ? `${24 * s}px ${18 * s}px` : `${22 * s}px ${26 * s}px`,
        display: 'flex',
        flexDirection: horizontal ? 'column' : 'row',
        alignItems: horizontal ? 'flex-start' : 'center',
        gap: horizontal ? 12 * s : 26 * s,
      }}
    >
      <span style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: (horizontal ? 34 : 44) * s, color: palette.accent, lineHeight: 1, flexShrink: 0, width: horizontal ? undefined : 70 * s }}>
        {String(i + 1).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: LABEL_FONT, fontWeight: 700, fontSize: (horizontal ? 26 : 34) * s, lineHeight: 1.18, color: palette.ink, textWrap: 'pretty' }}>
          {st.title}
        </p>
        {st.desc && (
          <p style={{ margin: `${6 * s}px 0 0`, fontFamily: LABEL_FONT, fontWeight: 500, fontSize: (horizontal ? 21 : 26) * s, lineHeight: 1.3, color: palette.muted, textWrap: 'pretty' }}>
            {st.desc}
          </p>
        )}
      </div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', alignItems: horizontal ? 'center' : 'stretch', width: look.width }}>
      {steps.map((st, i) => (
        <Fragment key={i}>
          {node(st, i)}
          {i < steps.length - 1 &&
            (horizontal ? (
              <div style={{ padding: `0 ${8 * s}px` }}>
                <Arrow dir="right" size={30 * s} color={palette.muted} stroke={stroke} />
              </div>
            ) : (
              // La flecha baja alineada con la columna de números.
              <div style={{ paddingLeft: 26 * s + 35 * s - stroke * 4, height: (look.story ? 52 : 34) * s, display: 'flex', alignItems: 'center' }}>
                <Arrow dir="down" size={(look.story ? 40 : 26) * s} color={palette.muted} stroke={stroke} />
              </div>
            ))}
        </Fragment>
      ))}
    </div>
  )
}

/** 10 · Pirámide: estratos apilados (base ancha → cúspide angosta) con conector hacia su descripción. */
function Pyramid({ data, look }: { data: StructData['pyramid']; look: Look }) {
  const { palette, scale: s } = look
  const levels = data.levels.slice(0, 4)
  const n = levels.length
  const pw = look.width * 0.44
  const levelH = (look.story ? 168 : 124) * s
  const gap = 8 * s
  const h = n * levelH + (n - 1) * gap
  const textX = pw + 40 * s
  const widthAt = (y: number) => pw * (1 - (1 - y / h) * 0.8) // y medido desde arriba: 20 % arriba, 100 % abajo
  const strata = levels.map((lv, i) => {
    const bottom = h - i * (levelH + gap)
    const top = bottom - levelH
    const wb = widthAt(bottom)
    const wt = widthAt(top)
    return { ...lv, i, top, bottom, wb, wt, mid: (top + bottom) / 2 }
  })
  return (
    <div style={{ position: 'relative', width: look.width, height: h }}>
      <svg width={look.width} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden>
        {strata.map((st) => {
          const base = st.i === 0
          const cx = pw / 2
          const midW = (st.wb + st.wt) / 2
          return (
            <g key={st.i}>
              <path
                d={`M${cx - st.wb / 2},${st.bottom} L${cx - st.wt / 2},${st.top} L${cx + st.wt / 2},${st.top} L${cx + st.wb / 2},${st.bottom} Z`}
                fill={base ? palette.accent : look.fill}
                fillOpacity={base ? 0.16 : 1}
                stroke={base ? palette.accent : palette.line}
                strokeWidth={Math.max(1.5, 2 * s)}
                strokeLinejoin="round"
              />
              <text x={cx} y={st.mid + 9 * s} textAnchor="middle" fill={base ? palette.accent : palette.muted} style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 24 * s, letterSpacing: '0.1em' }}>
                {String(st.i + 1).padStart(2, '0')}
              </text>
              <line x1={cx + midW / 2 + 10 * s} y1={st.mid} x2={textX - 12 * s} y2={st.mid} stroke={palette.muted} strokeWidth={Math.max(1.5, 2 * s)} strokeDasharray={`${6 * s} ${6 * s}`} />
              <circle cx={textX - 12 * s} cy={st.mid} r={5 * s} fill={palette.accent} />
            </g>
          )
        })}
      </svg>
      {strata.map((st) => (
        <div key={st.i} style={{ position: 'absolute', left: textX, right: 0, top: st.mid, transform: 'translateY(-50%)' }}>
          {(st.i === 0 || st.i === n - 1) && (
            <p style={{ margin: `0 0 ${4 * s}px`, fontFamily: MONO_FONT, fontWeight: 600, fontSize: 15 * s, letterSpacing: '0.18em', color: palette.muted }}>
              {st.i === 0 ? 'BASE · NO NEGOCIABLE' : 'CÚSPIDE · DETALLE'}
            </p>
          )}
          <p style={{ margin: 0, fontFamily: LABEL_FONT, fontWeight: 800, fontSize: 31 * s, lineHeight: 1.15, color: palette.accent, textTransform: 'uppercase' }}>{st.name}</p>
          {st.desc && <p style={{ margin: `${4 * s}px 0 0`, fontFamily: LABEL_FONT, fontWeight: 500, fontSize: 24 * s, lineHeight: 1.3, color: palette.muted, textWrap: 'pretty' }}>{st.desc}</p>}
        </div>
      ))}
    </div>
  )
}

/** 11 · Checklist: auditoría binaria estilo terminal. */
function Checklist({ data, look }: { data: StructData['checklist']; look: Look }) {
  const { palette, scale: s } = look
  const items = data.items.slice(0, 4)
  return (
    <div style={{ width: look.width, borderTop: `${Math.max(1.5, 2 * s)}px solid ${palette.line}` }}>
      {items.map((it, i) => {
        const ok = it.status === 'ok'
        const color = ok ? look.ok : look.err
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 24 * s,
              padding: `${(look.story ? 40 : 30) * s}px 0`,
              borderBottom: `${Math.max(1.5, 2 * s)}px dashed ${palette.line}`,
            }}
          >
            <span style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 35 * s, lineHeight: 1.1, color, whiteSpace: 'pre', flexShrink: 0 }}>{ok ? '[ ✓ ]' : '[ ✗ ]'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 35 * s, lineHeight: 1.22, color: palette.ink, textWrap: 'pretty' }}>{it.text}</p>
              {it.detail && <p style={{ margin: `${6 * s}px 0 0`, fontFamily: LABEL_FONT, fontWeight: 500, fontSize: 26 * s, lineHeight: 1.3, color: palette.muted }}>{it.detail}</p>}
            </div>
            <div style={{ paddingTop: 4 * s, flexShrink: 0 }}>
              <Badge color={color} look={look}>
                {ok ? 'PASA' : 'FALLA'}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Plantillas 08–11 · estructuras tácticas. Sólo dibujan los datos de la placa (IA o editados). */
export function StructTemplate({ state, palette, theme, contentWidth, scale }: Props) {
  const data = resolveStructData(state)
  const look: Look = { palette, fill: FILL[theme], ok: OK[theme], err: palette.accent, width: contentWidth, scale, story: state.aspect === 'story' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', textShadow: 'none' }}>
      {state.template === 'matrix' && <Matrix data={data.matrix} look={look} />}
      {state.template === 'pipeline' && <Pipeline data={data.pipeline} look={look} />}
      {state.template === 'pyramid' && <Pyramid data={data.pyramid} look={look} />}
      {state.template === 'checklist' && <Checklist data={data.checklist} look={look} />}
      {state.body.trim() && (
        <div style={{ marginTop: 36 * scale }}>
          <Paragraph text={state.body} scale={scale} color={palette.muted} />
        </div>
      )}
    </div>
  )
}
