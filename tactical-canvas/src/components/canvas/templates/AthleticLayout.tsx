import { useLayoutEffect, useRef, useState } from 'react'
import { FONT_BODY, FONT_MONO } from '../../../lib/brand'
import type { AthleticPos, AthleticRow, CanvasState } from '../../../types'

/** Paleta Light Editorial (Opus Athletic): papel claro, tinta negra, gris táctico y un solo acento. */
export const ATHLETIC = {
  paper: '#EFEFEF',
  paperEdge: '#DCDCDC',
  ink: '#0F0F0F',
  gray: '#525252',
  hair: 'rgba(15,15,15,0.14)',
  ring: 'rgba(0,0,0,0.08)',
  orange: '#F97316',
  cyan: '#0EA5E9',
} as const

interface Props {
  state: CanvasState
  w: number
  h: number
  /** Recorte del atleta (PNG con transparencia, idealmente B/N); usa la imagen de 03 · Fondo */
  cutout?: string | null
  /** Posición de la placa en el carrusel: decide el encuadre automático del recorte */
  slideIndex: number
}

/** auto → Placa 1 con el atleta al centro / tercio inferior; desde la Placa 2, a la derecha (40 %). */
export function resolveAthleticPos(pos: AthleticPos | undefined, slideIndex: number): Exclude<AthleticPos, 'auto'> {
  if (pos && pos !== 'auto') return pos
  return slideIndex === 0 ? 'center' : 'right'
}

/** Filas clave → valor: la etiqueta en negro bold, la descripción en gris oscuro regular. */
export function KeyValueList({ rows, s, width }: { rows: AthleticRow[]; s: number; width: number }) {
  return (
    <div data-part="kv-list" style={{ width, display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ padding: `${22 * s}px 0`, borderTop: `${Math.max(1, 1.5 * s)}px solid ${ATHLETIC.hair}`, fontFamily: FONT_BODY, fontSize: 31 * s, lineHeight: 1.34 }}>
          <span style={{ fontWeight: 800, color: ATHLETIC.ink, letterSpacing: '-0.01em', textTransform: 'uppercase', marginRight: 12 * s }}>{r.k.trim()}</span>
          <span style={{ fontWeight: 400, color: ATHLETIC.gray }}>{r.v.trim()}</span>
        </div>
      ))}
    </div>
  )
}

/** Tabla de 2 columnas (ej: Intensidad | Reps × series): encabezado mono, filas bold / regular. */
export function KeyValueTable({ head, rows, s, width }: { head: [string, string]; rows: AthleticRow[]; s: number; width: number }) {
  const cell = (bold: boolean): React.CSSProperties => ({
    padding: `${20 * s}px ${16 * s}px ${20 * s}px 0`,
    fontFamily: FONT_BODY,
    fontSize: 31 * s,
    lineHeight: 1.25,
    fontWeight: bold ? 800 : 400,
    color: bold ? ATHLETIC.ink : ATHLETIC.gray,
    borderTop: `${Math.max(1, 1.5 * s)}px solid ${ATHLETIC.hair}`,
    verticalAlign: 'top',
  })
  return (
    <table data-part="kv-table" style={{ width, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={i}
              style={{ textAlign: 'left', padding: `0 ${16 * s}px ${14 * s}px 0`, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 21 * s, letterSpacing: '0.16em', textTransform: 'uppercase', color: ATHLETIC.gray, width: i === 0 ? '46%' : undefined }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={cell(true)}>{r.k.trim()}</td>
            <td style={cell(false)}>{r.v.trim()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Círculos concéntricos de trazo ultrafino, centrados detrás del atleta. */
function Rings({ cx, cy, w, h, accent, s }: { cx: number; cy: number; w: number; h: number; accent: string; s: number }) {
  const radii = Array.from({ length: 9 }, (_, i) => (140 + i * 82) * s)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      {radii.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={ATHLETIC.ring} strokeWidth={Math.max(1, 1.5 * s)} />
      ))}
      {/* Líneas guía en acento: cruz fina en el centro de los anillos */}
      <line x1={cx - 46 * s} y1={cy} x2={cx + 46 * s} y2={cy} stroke={accent} strokeWidth={2 * s} opacity={0.9} />
      <line x1={cx} y1={cy - 46 * s} x2={cx} y2={cy + 46 * s} stroke={accent} strokeWidth={2 * s} opacity={0.9} />
    </svg>
  )
}

/**
 * Plantilla 15 · Opus Athletic (Light Editorial): composición completa de la placa. Papel claro con
 * viñeta radial suave, anillos concéntricos detrás del recorte del atleta, etiqueta «[Nr. X] TAG»,
 * titular negro alineado a la izquierda y datos en lista clave → valor o tabla de 2 columnas.
 */
export function AthleticLayout({ state, w, h, cutout, slideIndex }: Props) {
  const s = w / 1080
  const isStory = state.aspect === 'story'
  const accent = state.accentSwap ? ATHLETIC.cyan : ATHLETIC.orange
  const pos = resolveAthleticPos(state.athleticPos, slideIndex)
  const showCut = Boolean(cutout) && pos !== 'none'
  const side = showCut && pos === 'right'
  const padX = 84 * s
  const padTop = (isStory ? 250 : 92) * s
  const contentW = w - padX * 2
  // Con el atleta a la derecha, el texto ocupa el 60 % izquierdo.
  const textW = side ? contentW * 0.6 : contentW
  const rows = (state.athleticRows ?? []).filter((r) => r.k.trim() || r.v.trim()).slice(0, 6)
  const title = state.headlineA.replace(/\*/g, '').trim()
  const sub = state.headlineB.replace(/\*/g, '').trim()
  const body = state.body.trim()
  const titleSize = Math.round((side ? 74 : 84) * s * ((state.headlineScale ?? 100) / 100))
  // Anillos: detrás del atleta (o, sin recorte, en el cuadrante inferior derecho como textura).
  const ring = pos === 'center' && showCut ? { cx: w * 0.5, cy: h * (isStory ? 0.7 : 0.72) } : { cx: w * 0.8, cy: h * 0.62 }
  const cut = side
    ? { right: -w * 0.02, width: w * 0.42, height: h * (isStory ? 0.62 : 0.74), bottom: h * 0.06 }
    : { left: w * 0.22, width: w * 0.56, height: h * (isStory ? 0.36 : 0.4), bottom: h * 0.06 }
  // El bloque de texto nunca invade al atleta: con el recorte al centro, su alto máximo termina
  // encima de la cabeza; si no entra, se reduce en bloque (sin cortar ni partir palabras).
  const footerZone = (isStory ? 300 : 110) * s
  const maxTextH = showCut && !side ? h - cut.bottom - cut.height - padTop - 36 * s : h - padTop - footerZone
  const textRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const key = JSON.stringify([state.headlineA, state.headlineB, state.body, state.tag, state.athleticRows, state.athleticMode, state.athleticHead, state.headlineScale, pos, showCut, w, h])
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    const natural = el.scrollHeight
    setFit(natural > maxTextH ? Math.max(0.55, maxTextH / natural) : 1)
  }, [key, maxTextH])

  return (
    <div
      data-template="athletic"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: `radial-gradient(ellipse 85% 75% at 50% 45%, #F6F6F6 0%, ${ATHLETIC.paper} 55%, ${ATHLETIC.paperEdge} 100%)`,
        color: ATHLETIC.ink,
      }}
    >
      <Rings cx={ring.cx} cy={ring.cy} w={w} h={h} accent={accent} s={s} />

      {showCut && (
        <>
          {/* Sombra de contacto: elipse tenue bajo los pies del atleta */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: (side ? w - cut.width - (cut.right ?? 0) : (cut.left ?? 0)) + cut.width * 0.18,
              width: cut.width * 0.64,
              bottom: cut.bottom - 18 * s,
              height: 44 * s,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 72%)',
            }}
          />
          <img
            src={cutout!}
            alt=""
            data-part="athlete"
            style={{
              position: 'absolute',
              ...('right' in cut ? { right: cut.right } : { left: cut.left }),
              bottom: cut.bottom,
              width: cut.width,
              height: cut.height,
              objectFit: 'contain',
              objectPosition: 'bottom center',
              filter: 'grayscale(1) contrast(1.15)',
            }}
          />
        </>
      )}

      <div
        ref={textRef}
        data-part="athletic-text"
        style={{ position: 'absolute', left: padX, top: padTop, width: contentW, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', transform: fit < 1 ? `scale(${fit})` : undefined, transformOrigin: 'top left' }}
      >
        <p style={{ margin: 0, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 23 * s, letterSpacing: '0.14em', textTransform: 'uppercase', color: ATHLETIC.ink }}>
          <span style={{ color: accent }}>[Nr. {(state.athleticNr ?? '').trim() || slideIndex + 1}]</span>
          {state.tag.trim() ? <span>&nbsp;&nbsp;{state.tag.trim()}</span> : null}
        </p>
        <span aria-hidden style={{ display: 'block', width: 72 * s, height: Math.max(2, 3 * s), background: accent, margin: `${26 * s}px 0 ${40 * s}px` }} />
        <h1
          style={{
            margin: 0,
            width: textW,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: titleSize,
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
            textAlign: 'left',
            textTransform: 'uppercase',
            color: ATHLETIC.ink,
            textWrap: 'balance',
          }}
        >
          {title}
          {sub && <span style={{ display: 'block', color: ATHLETIC.gray, marginTop: 10 * s }}>{sub}</span>}
        </h1>
        {body && (
          <p style={{ margin: `${30 * s}px 0 0`, width: textW, fontFamily: FONT_BODY, fontSize: 30 * s, lineHeight: 1.4, color: ATHLETIC.gray }}>{body}</p>
        )}
        {rows.length > 0 && (
          <div style={{ marginTop: (isStory ? 70 : 52) * s }}>
            {state.athleticMode === 'table' ? (
              <KeyValueTable head={state.athleticHead ?? ['', '']} rows={rows} s={s} width={textW} />
            ) : (
              <KeyValueList rows={rows} s={s} width={textW} />
            )}
          </div>
        )}
      </div>

      <p
        style={{
          position: 'absolute',
          left: padX,
          bottom: (isStory ? 240 : 54) * s,
          margin: 0,
          fontFamily: FONT_MONO,
          fontWeight: 600,
          fontSize: 20 * s,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: ATHLETIC.gray,
        }}
      >
        COACH JP <span style={{ color: accent }}>·</span> @coachjp.training
      </p>
    </div>
  )
}
