import { useEffect, useState } from 'react'
import { BRAND } from '../../../lib/brand'
import type { CanvasPalette } from '../../../lib/theme'
import type { CanvasState, ThemeId } from '../../../types'

interface Props {
  state: CanvasState
  palette: CanvasPalette
  theme: ThemeId
  fontFamily: string
  fontWeight: number
  contentWidth: number
  /** Alto disponible para la matriz (px del lienzo, antes del auto-ajuste) */
  maxHeight: number
  scale: number
}

const DIM: Record<ThemeId, string> = { dark: '#2E3440', paper: '#D8D2C8' }
/** Contorno de las líneas atenuadas (RGB); el alfa va explícito en cada línea, nunca < 0,2. */
const OUTLINE_RGB: Record<ThemeId, string> = { dark: '120,134,156', paper: '150,140,124' }

interface OutlineRowProps {
  text: string
  width: number
  fontSize: number
  lineHeight: number
  fontFamily: string
  fontWeight: number
  rgb: string
  alpha: number
  shift?: number
  /** Grosor del contorno (fracción del cuerpo) y opacidad relativa del relleno */
  strokeRatio?: number
  fillRatio?: number
}

/**
 * Línea atenuada en SVG: contorno + relleno rgba sólido. No usa color transparente,
 * -webkit-text-stroke ni opacity, que algunos motores descartan al rasterizar el PNG.
 * Si el contorno no se pintara, el relleno igual queda visible.
 */
function OutlineRow({ text, width, fontSize, lineHeight, fontFamily, fontWeight, rgb, alpha, shift = 0, strokeRatio = 0.018, fillRatio = 0.32 }: OutlineRowProps) {
  const h = fontSize * lineHeight
  const a = Math.max(0.2, Math.min(1, alpha))
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <text
        x={width / 2 + shift}
        y={h / 2 + fontSize * 0.36}
        textAnchor="middle"
        fill={`rgba(${rgb},${Math.max(0.06, a * fillRatio).toFixed(3)})`}
        stroke={`rgba(${rgb},${a.toFixed(3)})`}
        strokeWidth={Math.max(1.2, fontSize * strokeRatio)}
        strokeLinejoin="round"
        style={{ fontFamily, fontWeight, fontSize, letterSpacing: 0 }}
      >
        {text}
      </text>
    </svg>
  )
}

/** Ancho de cada texto a 100 px con la fuente real (canvas 2D: mismo resultado en preview y PNG). */
function useTextWidths(texts: string[], family: string, weight: number) {
  const key = texts.join('\n')
  const [widths, setWidths] = useState(() => texts.map((t) => t.length * 58))
  useEffect(() => {
    let alive = true
    const list = key.split('\n')
    const font = `${weight} 100px ${family}`
    const measure = () => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx || !alive) return
      ctx.font = font
      setWidths(list.map((t) => ctx.measureText(t).width || t.length * 58))
    }
    measure()
    document.fonts?.load(font, key).then(measure, measure)
    return () => {
      alive = false
    }
  }, [key, family, weight])
  return widths
}

/** Reparte las palabras en renglones de largo parejo para el bloque justificado. */
function justifyLines(words: string[]) {
  if (words.length <= 1) return words.length ? [words[0]] : []
  const target = Math.min(6, Math.max(2, Math.round(Math.sqrt(words.length * 1.6))))
  const total = words.join(' ').length
  const longest = Math.max(...words.map((w) => w.length))
  const max = Math.max(longest, Math.ceil(total / target))
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    // Se corta antes de pasarse del largo objetivo (con 25 % de tolerancia para no dejar viudas cortas).
    if (cur && next.length > max * 1.25) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * Plantilla 07 · Repetición matrix (4 modos).
 * - Diagonal escalonada: la frase se repite una vez por palabra y en el renglón i se resalta la palabra i.
 * - Eco con jerarquía: la frase se repite N veces en outline apagado; la del medio va encendida,
 *   más grande (slider propio) y opcionalmente sobre una banda oscura de contraste.
 * - Kinetic brutalist: 1-2 palabras al ~90 % del ancho con versiones de contorno fino arriba y abajo.
 * - Bloque justificado: póster tipográfico donde cada renglón llena exactamente el ancho.
 * El bloque siempre queda centrado verticalmente y se ajusta al alto disponible.
 */
export function RepeatTemplate({ state, palette, theme, fontFamily, fontWeight, contentWidth, maxHeight, scale }: Props) {
  const phrase = state.repeatPhrase.trim().toUpperCase() || 'ESCRIBÍ TU FRASE'
  const words = phrase.split(/\s+/)
  const mode = state.repeatMode
  const kinetic = mode === 'kinetic'
  const echo = mode === 'echo'
  const justified = mode === 'justified'
  const lines = justified ? justifyLines(words) : [phrase]
  const widths = useTextWidths(lines, fontFamily, fontWeight)
  const width100 = widths[0]
  const availH = maxHeight * scale
  const userScale = Math.min(1, Math.max(0.4, state.repeatScale / 100))
  const leading = state.repeatLeading / 100
  const hi = state.repeatAccent === 'orange' ? BRAND.orange : state.repeatAccent === 'cyan' ? BRAND.cyan : palette.ink
  const rgb = OUTLINE_RGB[theme]
  const base = { fontFamily, fontWeight, letterSpacing: 0, textTransform: 'uppercase' as const, textShadow: 'none' }

  if (justified) {
    const rule = Math.round(6 * scale)
    const inner = Math.round(22 * scale)
    const lh = Math.max(0.74, 0.9 * leading)
    let sizes = widths.map((w) => (contentWidth / w) * 100 * 0.995 * userScale)
    const total = sizes.reduce((a, f) => a + f * lh, 0)
    const room = availH - 2 * (rule + inner)
    if (total > room) sizes = sizes.map((f) => (f * room) / total)
    const biggest = sizes.indexOf(Math.max(...sizes))
    const ruleColor = hi === palette.ink ? BRAND.orange : hi
    return (
      <div style={{ ...base, textAlign: 'center', borderTop: `${rule}px solid ${ruleColor}`, borderBottom: `${rule}px solid ${ruleColor}`, padding: `${inner}px 0` }}>
        {lines.map((line, i) => (
          <div key={i} style={{ whiteSpace: 'nowrap', fontSize: sizes[i], lineHeight: lh, color: i === biggest ? hi : palette.ink }}>
            {line}
          </div>
        ))}
      </div>
    )
  }

  if (echo || kinetic) {
    const rows = kinetic ? 3 : Math.min(11, Math.max(3, Math.round(state.repeatCount)))
    const mid = Math.floor(rows / 2)
    // Eco: la frase central mide repeatCenterScale % del resto y tiene que entrar en el ancho.
    const center = kinetic ? 1 : Math.min(1.8, Math.max(1, state.repeatCenterScale / 100))
    const band = echo && state.repeatBand
    const widthUse = kinetic ? 0.9 : band ? 0.9 : 0.985
    const byWidth = ((contentWidth * widthUse) / width100) * 100 / center
    const units = rows - 1 + center
    const byHeight = availH / (units * (kinetic ? 0.9 : 1.0))
    const fontSize = Math.max(8, Math.min(byWidth, byHeight) * userScale)
    const fill = availH / (units * fontSize)
    const auto = kinetic ? 0.92 : Math.min(1.6, Math.max(0.98, fill * 0.92))
    const lineHeight = Math.min(fill, Math.max(0.8, auto * leading))
    const centerColor = band && theme === 'paper' && hi === palette.ink ? palette.bg : hi
    return (
      <div style={{ ...base, fontSize, lineHeight, color: DIM[theme], textAlign: 'center' }}>
        {Array.from({ length: rows }, (_, row) => {
          const d = Math.abs(row - mid)
          if (row === mid) {
            const h = fontSize * center * lineHeight
            return (
              <div key={row} style={{ position: 'relative', height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {band && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: h * 0.04,
                      bottom: h * 0.04,
                      borderRadius: Math.min(h / 2, 28 * scale),
                      background: theme === 'dark' ? 'rgba(4,6,9,0.9)' : '#15181D',
                      boxShadow: theme === 'dark' ? `inset 0 0 0 ${Math.max(1, 2 * scale)}px rgba(${rgb},0.35)` : 'none',
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'relative',
                    whiteSpace: 'nowrap',
                    fontSize: fontSize * center,
                    lineHeight: 1,
                    color: centerColor,
                    letterSpacing: '-0.01em',
                    // Contraste garantizado sobre cualquier foto de fondo (en Táctico Dark).
                    textShadow: theme === 'dark' && !band ? '0 4px 24px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)' : 'none',
                  }}
                >
                  {phrase}
                </div>
              </div>
            )
          }
          return (
            <OutlineRow
              key={row}
              text={phrase}
              width={contentWidth}
              fontSize={fontSize}
              lineHeight={lineHeight}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              rgb={rgb}
              // Eco: las secundarias se apagan con la distancia; Kinetic: contorno fino parejo.
              alpha={kinetic ? 0.8 : Math.max(0.25, 0.85 - d * 0.15)}
              strokeRatio={kinetic ? 0.008 : 0.016}
              fillRatio={kinetic ? 0.1 : 0.22}
              // Kinetic brutalist: las versiones outline se corren hacia los lados.
              shift={kinetic ? (row < mid ? -1 : 1) * contentWidth * 0.045 : 0}
            />
          )
        })}
      </div>
    )
  }

  // Diagonal escalonada
  const rows = words.length
  const byWidth = (contentWidth / width100) * 100 * 0.985
  const byHeight = availH / (rows * 1.08)
  const fontSize = Math.max(8, Math.min(byWidth, byHeight) * userScale)
  const fill = availH / (rows * fontSize)
  const auto = Math.min(2.4, Math.max(1.08, fill * 0.92))
  const lineHeight = Math.min(fill, Math.max(0.8, auto * leading))
  return (
    <div style={{ ...base, fontSize, lineHeight, color: DIM[theme], textAlign: 'left' }}>
      {words.map((_, row) => (
        <div key={row} style={{ whiteSpace: 'nowrap' }}>
          {words.map((w, i) => (
            <span key={i} style={i === row ? { color: hi } : undefined}>
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
