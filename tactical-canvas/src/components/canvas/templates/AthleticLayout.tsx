import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { FONT_BODY, FONT_BRAND, FONT_MONO } from '../../../lib/brand'
import { ShieldLogo } from '../../ShieldLogo'
import { TacticalBackdrop } from '../TacticalBackdrop'
import type { AthleticPos, AthleticRow, CanvasState } from '../../../types'

/** Paleta de la plantilla 15. Light Editorial (Opus Athletic) y Dark Brutalist (marca Coach JP) comparten estructura. */
export interface AthleticPalette {
  /** Fondo CSS completo (con su viñeta) */
  background: string
  /** Color de respaldo del contenedor */
  base: string
  ink: string
  gray: string
  hair: string
  ring: string
  orange: string
  cyan: string
  /** Cian de marca para el texto del tag y encabezados de tabla (legible sobre este fondo) */
  tag: string
  /** RGB del velo sobre la foto de fondo (mismo tono que el papel / charcoal) */
  veil: string
  /** Grano de textura sobre el fondo (0 = sin grano) */
  grain: number
  /** Sombra de contacto bajo el atleta */
  shadow: string
}

/** Light Editorial (Opus Athletic): papel claro, tinta negra, gris táctico y un solo acento. */
export const ATHLETIC: AthleticPalette = {
  background: 'radial-gradient(ellipse 85% 75% at 50% 45%, #F6F6F6 0%, #EFEFEF 55%, #DCDCDC 100%)',
  base: '#EFEFEF',
  ink: '#0F0F0F',
  gray: '#525252',
  hair: 'rgba(15,15,15,0.14)',
  ring: 'rgba(0,0,0,0.08)',
  orange: '#F97316',
  cyan: '#0EA5E9',
  tag: '#0E7490',
  veil: '239,239,239',
  grain: 0,
  shadow: 'rgba(0,0,0,0.30)',
}

interface Props {
  state: CanvasState
  w: number
  h: number
  /** Recorte del atleta (PNG con transparencia, idealmente B/N); usa la imagen de 03 · Fondo */
  cutout?: string | null
  /** Posición de la placa en el carrusel: decide el encuadre automático del recorte */
  slideIndex: number
  palette?: AthleticPalette
  /** Capa entre el fondo y el contenido (ej: hilo del carrusel continuo) */
  under?: ReactNode
}

/** auto → Placa 1 con el atleta al centro / tercio inferior; desde la Placa 2, a la derecha (40 %). */
export function resolveAthleticPos(pos: AthleticPos | undefined, slideIndex: number): Exclude<AthleticPos, 'auto'> {
  if (pos && pos !== 'auto') return pos
  return slideIndex === 0 ? 'center' : 'right'
}

/** Filas clave → valor: la etiqueta en tinta bold, la descripción en gris regular. */
export function KeyValueList({ rows, s, width, palette: P = ATHLETIC }: { rows: AthleticRow[]; s: number; width: number; palette?: AthleticPalette }) {
  return (
    <div data-part="kv-list" style={{ width, display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ padding: `${22 * s}px 0`, borderTop: `${Math.max(1, 1.5 * s)}px solid ${P.hair}`, fontFamily: FONT_BODY, fontSize: 31 * s, lineHeight: 1.34 }}>
          <span style={{ fontFamily: FONT_BRAND, fontWeight: 700, color: P.ink, letterSpacing: '0.01em', textTransform: 'uppercase', marginRight: 12 * s }}>{r.k.trim()}</span>
          <span style={{ fontWeight: 400, color: P.gray }}>{r.v.trim()}</span>
        </div>
      ))}
    </div>
  )
}

/** Tabla de 2 columnas (ej: Intensidad | Reps × series): encabezado mono, filas bold / regular. */
export function KeyValueTable({ head, rows, s, width, palette: P = ATHLETIC, headColor }: { head: [string, string]; rows: AthleticRow[]; s: number; width: number; palette?: AthleticPalette; headColor?: string }) {
  const cell = (bold: boolean): React.CSSProperties => ({
    padding: `${20 * s}px ${16 * s}px ${20 * s}px 0`,
    fontFamily: bold ? FONT_BRAND : FONT_BODY,
    fontSize: 31 * s,
    lineHeight: 1.25,
    fontWeight: bold ? 700 : 400,
    color: bold ? P.ink : P.gray,
    borderTop: `${Math.max(1, 1.5 * s)}px solid ${P.hair}`,
    verticalAlign: 'top',
  })
  return (
    <table data-part="kv-table" style={{ width, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      {(head[0] || head[1]) && (
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                style={{ textAlign: 'left', padding: `0 ${16 * s}px ${14 * s}px 0`, fontFamily: FONT_MONO, fontWeight: 500, fontSize: 21 * s, letterSpacing: '0.16em', textTransform: 'uppercase', color: headColor ?? P.tag, width: i === 0 ? '46%' : undefined }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ ...cell(true), width: '46%' }}>{r.k.trim()}</td>
            <td style={cell(false)}>{r.v.trim()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Círculos concéntricos de trazo ultrafino, centrados detrás del atleta. */
function Rings({ cx, cy, w, h, accent, ring, s, cross }: { cx: number; cy: number; w: number; h: number; accent: string; ring: string; s: number; cross: boolean }) {
  const radii = Array.from({ length: 9 }, (_, i) => (140 + i * 82) * s)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      {radii.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={ring} strokeWidth={Math.max(1, 1.5 * s)} />
      ))}
      {/* Líneas guía en acento: cruz fina en el centro de los anillos (sólo detrás del atleta) */}
      {cross && (
        <>
          <line x1={cx - 46 * s} y1={cy} x2={cx + 46 * s} y2={cy} stroke={accent} strokeWidth={2 * s} opacity={0.9} />
          <line x1={cx} y1={cy - 46 * s} x2={cx} y2={cy + 46 * s} stroke={accent} strokeWidth={2 * s} opacity={0.9} />
        </>
      )}
    </svg>
  )
}

/** Grilla táctica: retícula fina + una cruz de acento en una intersección (misma familia que los anillos). */
function Grid({ w, h, line, accent, s }: { w: number; h: number; line: string; accent: string; s: number }) {
  const step = 90 * s
  const xs = Array.from({ length: Math.ceil(w / step) + 1 }, (_, i) => i * step)
  const ys = Array.from({ length: Math.ceil(h / step) + 1 }, (_, i) => i * step)
  const cx = xs[Math.max(1, xs.length - 3)]
  const cy = ys[Math.max(1, ys.length - 4)]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} y1={0} x2={x} y2={h} stroke={line} strokeWidth={Math.max(1, 1.2 * s)} />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} y1={y} x2={w} y2={y} stroke={line} strokeWidth={Math.max(1, 1.2 * s)} />
      ))}
      <line x1={cx - 22 * s} y1={cy} x2={cx + 22 * s} y2={cy} stroke={accent} strokeWidth={2 * s} />
      <line x1={cx} y1={cy - 22 * s} x2={cx} y2={cy + 22 * s} stroke={accent} strokeWidth={2 * s} />
    </svg>
  )
}

/** Grano de textura (ruido fractal SVG): da cuerpo al charcoal sin ensuciar el texto. */
function Grain({ w, h, opacity }: { w: number; h: number; opacity: number }) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }} aria-hidden>
      <filter id="athletic-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={w} height={h} filter="url(#athletic-grain)" />
    </svg>
  )
}

/**
 * Título con identidad de marca: blanco / negro + remate en naranja. Con remate explícito, el remate va
 * en acento; con *palabra* marcada, esa palabra; sin ninguno de los dos, la última palabra clave.
 */
export function splitAthleticTitle(a: string, b: string): { parts: { t: string; hl: boolean }[]; remate: string } {
  const A = a.trim()
  const B = b.replace(/\*/g, '').trim()
  if (B) return { parts: segmentsOf(A), remate: B }
  if (/\*[^*]+\*/.test(A)) return { parts: segmentsOf(A), remate: '' }
  const words = A.split(/\s+/).filter(Boolean)
  if (words.length < 2) return { parts: [{ t: A, hl: false }], remate: '' }
  // Sin marca: la última palabra (la palabra clave, con sus signos) pasa al acento.
  const k = words.length - 1
  return { parts: [{ t: `${words.slice(0, k).join(' ')} `, hl: false }, { t: words.slice(k).join(' '), hl: true }], remate: '' }
}
function segmentsOf(t: string) {
  return t
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((x) => (x.startsWith('*') && x.endsWith('*') ? { t: x.slice(1, -1), hl: true } : { t: x, hl: false }))
}

/** «[ GUÍA DE RENDIMIENTO // COACH JP ]» → el texto sin corchetes (los dibuja la placa en acento). */
const unbracket = (t: string) => t.trim().replace(/^\[\s*|\s*\]$/g, '')

/**
 * Plantilla 15 · Opus Athletic: composición completa de la placa (claro u oscuro según la paleta).
 * Anillos concéntricos detrás del recorte del atleta, etiqueta «[Nr. X] TAG», titular alineado a la
 * izquierda, bajada, datos en lista clave → valor o tabla de 2 columnas y CTA opcional.
 */
export function AthleticLayout({ state, w, h, cutout, slideIndex, palette: P = ATHLETIC, under }: Props) {
  const s = w / 1080
  const isStory = state.aspect === 'story'
  const accent = state.accentSwap ? P.cyan : P.orange
  const pos = resolveAthleticPos(state.athleticPos, slideIndex)
  // Fondo: foto real B/N a sangre (con velo), o patrón de la familia (auto alterna anillos / grilla por placa).
  const bgMode = state.athleticBg ?? 'auto'
  const photoBg = bgMode === 'photo' && Boolean(cutout)
  const pattern = bgMode === 'concrete' || bgMode === 'radial' ? bgMode : bgMode === 'grid' || (bgMode === 'auto' && slideIndex % 2 === 1) ? 'grid' : 'rings'
  // Texto muy largo (más de 90 palabras): el recorte se oculta para que nada se superponga.
  const allWords = [state.headlineA, state.headlineB, state.body, ...(state.athleticRows ?? []).map((r) => `${r.k} ${r.v}`)].join(' ').split(/\s+/).filter(Boolean).length
  const showCut = Boolean(cutout) && pos !== 'none' && !photoBg && allWords <= 90
  const side = showCut && pos === 'right'
  const padX = 84 * s
  const padTop = (isStory ? 250 : 92) * s
  const contentW = w - padX * 2
  // Con el atleta a la derecha, el texto ocupa el 60 % izquierdo.
  const textW = side ? contentW * 0.6 : photoBg ? contentW * 0.78 : contentW
  const rows = (state.athleticRows ?? []).filter((r) => r.k.trim() || r.v.trim()).slice(0, 6)
  const titled = splitAthleticTitle(state.headlineA, state.headlineB)
  // Segundo color de marca: cian en el tag y encabezados (con SWAP ACCENT, se invierten).
  const accent2 = state.accentSwap ? P.orange : P.tag
  const body = state.body.trim()
  const cta = (state.athleticCta ?? '').trim()
  const nr = (state.athleticNr ?? '').trim()
  const tag = unbracket(state.tag)
  const titleSize = Math.round((side ? 74 : 84) * s * ((state.headlineScale ?? 100) / 100))
  // Layout defensivo: con 3+ filas de datos el recorte se achica para no competir con el texto.
  const dense = rows.length >= 3 || allWords > 40
  const ring = pos === 'center' && showCut ? { cx: w * 0.5, cy: h * (isStory ? 0.7 : 0.72) } : { cx: w * 0.8, cy: h * 0.62 }
  const cut = side
    ? { right: -w * 0.02, width: w * (dense ? 0.36 : 0.42), height: h * (isStory ? (dense ? 0.52 : 0.62) : dense ? 0.62 : 0.74), bottom: h * 0.06 }
    : { left: w * (dense ? 0.28 : 0.22), width: w * (dense ? 0.44 : 0.56), height: h * (isStory ? (dense ? 0.28 : 0.36) : dense ? 0.3 : 0.4), bottom: h * 0.06 }
  // El bloque de texto nunca invade al atleta: con el recorte al centro, su alto máximo termina
  // encima de la cabeza; si no entra, se reduce en bloque (sin cortar ni partir palabras).
  const footerZone = (isStory ? 330 : 150) * s
  const maxTextH = showCut && !side ? h - cut.bottom - cut.height - padTop - 36 * s : h - padTop - footerZone
  const textRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const key = JSON.stringify([state.headlineA, state.headlineB, state.body, state.tag, state.athleticRows, state.athleticMode, state.athleticHead, state.athleticCta, state.headlineScale, pos, showCut, photoBg, w, h])
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    const natural = el.scrollHeight
    setFit(natural > maxTextH ? Math.max(0.55, maxTextH / natural) : 1)
  }, [key, maxTextH])

  return (
    <div data-template="athletic" data-theme={state.athleticTheme ?? 'light'} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.background, color: P.ink }}>
      {photoBg && (
        <>
          <img
            src={cutout!}
            alt=""
            data-part="athletic-photo"
            style={{ position: 'absolute', inset: 0, width: w, height: h, objectFit: 'cover', objectPosition: '70% 30%', filter: 'grayscale(1) contrast(1.12) brightness(0.92)' }}
          />
          {/* Velo: denso del lado del texto, abierto hacia la foto; base oscura para el logo */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(${P.veil},0.94) 0%, rgba(${P.veil},0.82) 48%, rgba(${P.veil},0.42) 100%)` }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(0deg, rgba(${P.veil},0.92) 0%, rgba(${P.veil},0) 32%)` }} />
        </>
      )}
      {!photoBg && (pattern === 'concrete' || pattern === 'radial') && (
        <TacticalBackdrop style={pattern} w={w} h={h} accent={accent} tone={state.athleticTheme === 'dark' ? 'dark' : 'light'} />
      )}
      {!photoBg && pattern === 'concrete' && showCut && <Rings cx={ring.cx} cy={ring.cy} w={w} h={h} accent={accent} ring={P.ring} s={s} cross={showCut} />}
      {!photoBg && pattern === 'grid' && <Grid w={w} h={h} line={P.ring} accent={accent} s={s} />}
      {!photoBg && pattern === 'rings' && <Rings cx={ring.cx} cy={ring.cy} w={w} h={h} accent={accent} ring={P.ring} s={s} cross={showCut} />}
      {P.grain > 0 && <Grain w={w} h={h} opacity={P.grain} />}
      {under}

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
              background: `radial-gradient(ellipse at center, ${P.shadow} 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 72%)`,
            }}
          />
          {/* Recorte PNG transparente, sin marco ni caja: sólo la silueta sobre el fondo */}
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
              background: 'transparent',
              border: 'none',
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
        <p data-part="athletic-header" style={{ margin: 0, fontFamily: FONT_BRAND, fontWeight: 600, fontSize: 25 * s, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.ink }}>
          {nr ? <span style={{ color: accent, textTransform: 'none' }}>[Nr. {nr}]</span> : <span style={{ color: accent }}>[</span>}
          {tag ? <span style={{ color: accent2 }}>&nbsp;&nbsp;{tag}</span> : null}
          {!nr && <span style={{ color: accent }}>&nbsp;&nbsp;]</span>}
        </p>
        <span aria-hidden style={{ display: 'block', width: 72 * s, height: Math.max(2, 3 * s), background: accent, margin: `${26 * s}px 0 ${40 * s}px` }} />
        <h1
          style={{
            margin: 0,
            width: textW,
            fontFamily: FONT_BRAND,
            fontWeight: 700,
            fontSize: titleSize,
            lineHeight: 0.98,
            letterSpacing: '-0.01em',
            textAlign: 'left',
            textTransform: 'uppercase',
            color: P.ink,
            textWrap: 'balance',
          }}
        >
          {titled.parts.map((p, i) => (
            <span key={i} style={p.hl ? { color: accent } : undefined}>
              {p.t}
            </span>
          ))}
          {titled.remate && <span data-part="athletic-remate" style={{ display: 'block', color: accent, marginTop: 6 * s }}>{titled.remate}</span>}
        </h1>
        {body && (
          <p data-part="athletic-body" style={{ margin: `${30 * s}px 0 0`, width: textW, fontFamily: FONT_BODY, fontSize: 30 * s, lineHeight: 1.42, color: P.gray }}>
            {body}
          </p>
        )}
        {rows.length > 0 && (
          <div style={{ marginTop: (isStory ? 70 : 52) * s }}>
            {state.athleticMode === 'table' ? (
              <KeyValueTable head={state.athleticHead ?? ['', '']} rows={rows} s={s} width={textW} palette={P} headColor={accent2} />
            ) : (
              <KeyValueList rows={rows} s={s} width={textW} palette={P} />
            )}
          </div>
        )}
        {cta && (
          <div
            data-part="athletic-cta"
            style={{ marginTop: 52 * s, width: textW, boxSizing: 'border-box', border: `${Math.max(2, 3 * s)}px solid ${accent}`, padding: `${22 * s}px ${28 * s}px`, fontFamily: FONT_BRAND, fontWeight: 700, fontSize: 27 * s, lineHeight: 1.35, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.ink }}
          >
            <span style={{ color: accent }}>→ </span>
            {cta}
          </div>
        )}
      </div>

      {/* Firma de marca: el mismo escudo + COACH JP de las placas nativas */}
      <div data-part="athletic-logo" style={{ position: 'absolute', left: padX, bottom: (isStory ? 236 : 50) * s, display: 'flex', alignItems: 'center', gap: 18 * s }}>
        <ShieldLogo size={54 * s} />
        <div>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 27 * s, letterSpacing: '-0.01em', color: P.ink, lineHeight: 1.1 }}>
            COACH <span style={{ color: P.orange }}>JP</span>
          </p>
          <p style={{ margin: `${5 * s}px 0 0`, fontFamily: FONT_MONO, fontSize: 17 * s, color: P.gray }}>@coachjp.training</p>
        </div>
      </div>
    </div>
  )
}
