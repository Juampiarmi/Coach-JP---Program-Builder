import { FONT_MONO } from '../lib/brand'
import type { BarRep, Biomech, FramePoint, Goniometer, PathPoint } from './types'
import { SAFE } from './render'
import { OUT_H, OUT_W } from './types'

/**
 * HUD biomecánico en canvas 2D (1080×1920): Bar Path y goniómetro articular. Lo dibuja la
 * vista previa y cada frame de la exportación, en sincronía con el tiempo del clip.
 */

type Ctx = CanvasRenderingContext2D

const CYAN = '#00E5FF'
const ORANGE = '#FF5500'
const DISPLAY = "'Chakra Petch', sans-serif"

export const px = (p: FramePoint) => ({ x: (p.x / 100) * OUT_W, y: (p.y / 100) * OUT_H })

/** Zoom del cuadro (punch-in) con el que se dibuja el HUD en este momento. */
let zoom = 1
/** Punto en pantalla: la geometría sigue al zoom del video; rótulos y pastillas se ubican sobre esto, sin escalar. */
const sp = (p: FramePoint) => {
  const q = px(p)
  return zoom === 1 ? q : { x: OUT_W / 2 + (q.x - OUT_W / 2) * zoom, y: OUT_H / 2 + (q.y - OUT_H / 2) * zoom }
}

/** Ángulo interior en el vértice b (0–180°). */
export function jointAngle(g: Pick<Goniometer, 'a' | 'b' | 'c'>) {
  const a = px(g.a)
  const b = px(g.b)
  const c = px(g.c)
  const v1 = Math.atan2(a.y - b.y, a.x - b.x)
  const v2 = Math.atan2(c.y - b.y, c.x - b.x)
  let d = Math.abs(v1 - v2)
  if (d > Math.PI) d = 2 * Math.PI - d
  return (d * 180) / Math.PI
}

/** Posición interpolada de la barra en `time` (o null fuera del trazado). */
export function pathPointAt(points: PathPoint[], time: number): FramePoint | null {
  if (!points.length || time < points[0].t) return null
  const last = points[points.length - 1]
  if (time >= last.t) return last
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    if (time <= p1.t) {
      const k = (time - p0.t) / Math.max(1e-6, p1.t - p0.t)
      return { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k }
    }
  }
  return last
}

/** Goniómetros visibles en `time`. */
export const activeAngles = (bio: Biomech, time: number) => bio.angles.filter((g) => time >= g.start && time <= g.end)

/** Caja de la pastilla de grados en el cuadro (para arrastrar el goniómetro entero). */
export interface AnglePillRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

function pill(ctx: Ctx, text: string, x: number, y: number, color: string) {
  ctx.font = `700 38px ${DISPLAY}`
  const w = ctx.measureText(text).width + 40
  const h = 60
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 14)
  ctx.fillStyle = 'rgba(8,10,14,0.86)'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 2
  ctx.strokeStyle = color === ORANGE ? 'rgba(255,85,0,0.7)' : 'rgba(255,255,255,0.35)'
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y + 2)
  ctx.restore()
}

// ── Bar Path paramétrico ─────────────────────────────────────────────────────────

/** Desvanecimiento al terminar la repetición (no queda flotando mientras el atleta camina). */
export const REP_FADE = 0.35

/**
 * La repetición del Bar Path: la calibrada o, en proyectos viejos con puntos sueltos, una
 * derivada de ellos (tope = primer punto, fondo = punto más bajo, bloqueo = último punto).
 */
export function resolveRep(path: Biomech['path']): BarRep | null {
  if (path.rep) return path.rep
  const pts = path.points
  if (pts.length < 2) return null
  const low = pts.reduce((m, q) => (q.y > m.y ? q : m), pts[0])
  const first = pts[0]
  const last = pts[pts.length - 1]
  return { anchor: first, top: first, bottom: low, start: first.t, bottomT: Math.min(Math.max(low.t, first.t + 0.1), last.t - 0.1), end: last.t }
}

const smooth = (u: number) => {
  const x = Math.min(1, Math.max(0, u))
  return x * x * (3 - 2 * x)
}

/** Punto de la trayectoria (px) en el parámetro s ∈ [0, 1] (0 = tope, 1 = fondo); pasa por la inflexión. */
function repPoint(r: BarRep, s: number) {
  const A = sp(r.top)
  const B = sp(r.bottom)
  const M = r.mid ? sp(r.mid) : { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
  // Control cuadrático para que la curva pase exactamente por la inflexión en s = 0,5.
  const C = { x: 2 * M.x - (A.x + B.x) / 2, y: 2 * M.y - (A.y + B.y) / 2 }
  const k = 1 - s
  return { x: k * k * A.x + 2 * s * k * C.x + s * s * B.x, y: k * k * A.y + 2 * s * k * C.y + s * s * B.y }
}

/** Profundidad actual (0 tope → 1 fondo) según la curva temporal de la repetición, o null fuera de ella. */
export function repDepthAt(r: BarRep, t: number): { s: number; phase: 'down' | 'up' | 'done'; alpha: number } | null {
  if (t < r.start || t > r.end + REP_FADE) return null
  const fadeIn = Math.min(1, (t - r.start) / 0.12)
  if (t > r.end) return { s: 0, phase: 'done', alpha: 1 - (t - r.end) / REP_FADE }
  if (t <= r.bottomT) return { s: smooth((t - r.start) / Math.max(0.05, r.bottomT - r.start)), phase: 'down', alpha: fadeIn }
  return { s: 1 - smooth((t - r.bottomT) / Math.max(0.05, r.end - r.bottomT)), phase: 'up', alpha: 1 }
}

/** Manijas editables del Bar Path (sólo vista previa). */
export const repHandles = (r: BarRep) =>
  [
    { k: 'top' as const, p: r.top, label: 'TOPE SUPERIOR' },
    { k: 'bottom' as const, p: r.bottom, label: 'PROFUNDIDAD MÁXIMA' },
    ...(r.mid ? [{ k: 'mid' as const, p: r.mid, label: 'INFLEXIÓN' }] : []),
  ]

/**
 * Trazador paramétrico limpio: trayectoria cian #00E5FF de 2,5 px (tope → inflexión → fondo),
 * regla táctica con marcas de % o cm, marcador sincronizado con el cabezal y lectura ΔY / ΔX.
 * Sólo existe entre el inicio del excéntrico y el bloqueo (+ fade de 0,35 s).
 */
function drawPath(ctx: Ctx, bio: Biomech, time: number, editing: boolean) {
  const r = resolveRep(bio.path)
  if (!r) return
  const st = repDepthAt(r, time)
  if (!st) return
  const A = sp(r.top)
  const B = sp(r.bottom)
  const N = 40
  const curve = Array.from({ length: N + 1 }, (_, i) => repPoint(r, i / N))
  const line = (pts: { x: number; y: number }[]) => {
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  }
  const reached = st.phase === 'down' ? st.s : 1
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, st.alpha))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Eje de gravedad: vertical pura desde el tope.
  if (bio.path.showVertical) {
    ctx.setLineDash([16, 12])
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(200,210,220,0.5)'
    ctx.beginPath()
    ctx.moveTo(A.x, A.y - 40)
    ctx.lineTo(A.x, Math.max(A.y, B.y) + 50)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // Recorrido completo tenue + tramo ya recorrido brillante (2,5 px con glow).
  ctx.strokeStyle = 'rgba(0,229,255,0.28)'
  ctx.lineWidth = 2.5
  line(curve)
  const done = curve.slice(0, Math.max(1, Math.round(reached * N)) + 1)
  ctx.strokeStyle = 'rgba(0,229,255,0.35)'
  ctx.lineWidth = 9
  line(done)
  ctx.shadowColor = CYAN
  ctx.shadowBlur = 12
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 2.5
  line(done)
  ctx.shadowBlur = 0
  // Regla táctica a la izquierda: marcas cada 10 % del recorrido vertical (o cm si hay ROM real).
  const rx = Math.max(40, Math.min(A.x, B.x) - 70)
  const y0 = A.y
  const y1 = B.y
  ctx.strokeStyle = 'rgba(0,229,255,0.75)'
  ctx.fillStyle = 'rgba(230,244,255,0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(rx, y0)
  ctx.lineTo(rx, y1)
  ctx.stroke()
  ctx.font = `600 20px ${FONT_MONO}`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 10; i++) {
    const y = y0 + ((y1 - y0) * i) / 10
    const major = i % 5 === 0
    ctx.beginPath()
    ctx.moveTo(rx - (major ? 16 : 9), y)
    ctx.lineTo(rx, y)
    ctx.stroke()
    if (major || (i % 25 === 0)) ctx.fillText(r.romCm ? `${Math.round((r.romCm * i) / 10)} cm` : `${i * 10}%`, rx - 22, y)
  }
  // Marcador activo sobre la trayectoria y su reflejo en la regla.
  const P = repPoint(r, st.s)
  const cy = y0 + (y1 - y0) * st.s
  ctx.fillStyle = CYAN
  ctx.beginPath()
  ctx.moveTo(rx + 4, cy)
  ctx.lineTo(rx + 18, cy - 9)
  ctx.lineTo(rx + 18, cy + 9)
  ctx.fill()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(P.x, P.y, 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(P.x, P.y, 6, 0, Math.PI * 2)
  ctx.fill()
  // Lectura ΔY (profundidad) · ΔX (drift horizontal respecto del tope).
  const travel = Math.max(1, Math.abs(y1 - y0))
  const dyTxt = r.romCm ? `${(st.s * r.romCm).toFixed(0)} cm` : `${Math.round(st.s * 100)}%`
  const dxPx = P.x - A.x
  const dxTxt = r.romCm ? `${dxPx >= 0 ? '+' : ''}${((dxPx / travel) * r.romCm).toFixed(1)} cm` : `${dxPx >= 0 ? '+' : ''}${((dxPx / OUT_W) * 100).toFixed(1)}%`
  const label = `ΔY ${dyTxt} · ΔX ${dxTxt}`
  ctx.font = `600 24px ${FONT_MONO}`
  const tw = ctx.measureText(label).width
  const lx = P.x + 34 + tw > OUT_W - 20 ? P.x - 34 - tw : P.x + 34
  ctx.fillStyle = 'rgba(8,10,14,0.8)'
  ctx.beginPath()
  ctx.roundRect(lx - 10, P.y - 20, tw + 20, 40, 8)
  ctx.fill()
  ctx.fillStyle = CYAN
  ctx.textAlign = 'left'
  ctx.fillText(label, lx, P.y + 1)
  // Manijas editables (vista previa): tope, fondo e inflexión.
  if (editing) {
    ctx.font = `700 18px ${FONT_MONO}`
    for (const h of repHandles(r)) {
      const q = sp(h.p)
      ctx.fillStyle = 'rgba(5,7,10,0.85)'
      ctx.strokeStyle = CYAN
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.rect(q.x - 12, q.y - 12, 24, 24)
      ctx.fill()
      ctx.stroke()
      ctx.textAlign = q.x > OUT_W - 260 ? 'right' : 'left'
      const tx = q.x + (q.x > OUT_W - 260 ? -22 : 22)
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'
      ctx.strokeText(`[ ${h.label} ]`, tx, q.y - 22)
      ctx.fillStyle = CYAN
      ctx.fillText(`[ ${h.label} ]`, tx, q.y - 22)
    }
  }
  ctx.restore()
}

function drawAngle(ctx: Ctx, g: Goniometer, selected: boolean): AnglePillRect {
  const a = sp(g.a)
  const b = sp(g.b)
  const c = sp(g.c)
  const color = g.color === 'orange' ? ORANGE : '#FFFFFF'
  const deg = jointAngle(g)
  ctx.save()
  ctx.lineCap = 'round'
  // Segmentos con contorno oscuro para leerse sobre cualquier fondo.
  for (const [w, s] of [
    [12, 'rgba(0,0,0,0.6)'],
    [5, '#FFFFFF'],
  ] as const) {
    ctx.lineWidth = w
    ctx.strokeStyle = s
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(c.x, c.y)
    ctx.stroke()
  }
  // Arco del ángulo interior.
  const r = 78
  const t1 = Math.atan2(a.y - b.y, a.x - b.x)
  const t2 = Math.atan2(c.y - b.y, c.x - b.x)
  let from = t1
  let delta = t2 - t1
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  if (delta < 0) {
    from = t2
    delta = -delta
  }
  ctx.beginPath()
  ctx.moveTo(b.x, b.y)
  ctx.arc(b.x, b.y, r, from, from + delta)
  ctx.closePath()
  ctx.fillStyle = g.color === 'orange' ? 'rgba(255,85,0,0.22)' : 'rgba(255,255,255,0.18)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(b.x, b.y, r, from, from + delta)
  ctx.lineWidth = 4
  ctx.strokeStyle = color
  ctx.stroke()
  // Articulaciones (manijas arrastrables).
  for (const p of [a, b, c]) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p === b ? 15 : 12, 0, Math.PI * 2)
    ctx.fillStyle = p === b ? color : '#FFFFFF'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'
    ctx.stroke()
    if (selected) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 30, 0, Math.PI * 2)
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(0,229,255,0.8)'
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
  ctx.restore()
  // Pastilla con los grados: al costado, nunca sobre la rodilla ni sobre los segmentos.
  const text = `${Math.round(deg)}°${g.label.trim() ? ` · ${g.label.trim().toUpperCase()}` : ''}`
  ctx.font = `700 38px ${DISPLAY}`
  const { x: lx, y: ly } = placePill(a, b, c, ctx.measureText(text).width + 40, 60, from + delta / 2)
  pill(ctx, text, lx, ly, color)
  const pw = ctx.measureText(text).width + 40
  const rect = { id: g.id, x: lx - pw / 2, y: ly - 30, w: pw, h: 60 }
  // Colocado por el Director: aviso para ubicarlo sobre la articulación real (sólo vista previa).
  if (g.placed === false) {
    ctx.save()
    ctx.font = `700 24px ${FONT_MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const msg = '⇲ ARRASTRÁ CADERA · RODILLA · TOBILLO SOBRE EL ATLETA'
    const mw = ctx.measureText(msg).width + 36
    const my = Math.max(60, Math.min(...[a.y, b.y, c.y]) - 80)
    ctx.fillStyle = 'rgba(0,229,255,0.92)'
    ctx.beginPath()
    ctx.roundRect(OUT_W / 2 - mw / 2, my - 24, mw, 48, 10)
    ctx.fill()
    ctx.fillStyle = '#05070A'
    ctx.fillText(msg, OUT_W / 2, my + 1)
    ctx.restore()
  }
  // Nombres de las articulaciones mientras se edita (sólo vista previa).
  if (selected || g.placed === false) {
    ctx.save()
    ctx.font = `700 22px ${FONT_MONO}`
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'
    ctx.fillStyle = CYAN
    for (const [p, name] of [
      [a, 'CADERA'],
      [b, 'RODILLA'],
      [c, 'TOBILLO'],
    ] as const) {
      // La rodilla rotula del lado contrario a la pastilla; el resto, hacia adentro del marco.
      const left = p === b ? lx > b.x : p.x > OUT_W - 200
      ctx.textAlign = left ? 'right' : 'left'
      const tx = p.x + (left ? -40 : 40)
      ctx.strokeText(name, tx, p.y - 30)
      ctx.fillText(name, tx, p.y - 30)
    }
    ctx.restore()
  }
  return rect
}

/**
 * Centro de la pastilla de grados. Prueba posiciones a los costados del vértice (separadas al
 * menos 70 px en horizontal) y a distintas alturas; se queda con la que no pisa la rodilla,
 * los segmentos ni las otras articulaciones y entra en el marco. Prefiere el lado de afuera
 * del ángulo y la altura de la rodilla.
 */
function placePill(a: FramePoint, b: FramePoint, c: FramePoint, w: number, h: number, mid: number) {
  const outSide = Math.cos(mid) > 0 ? -1 : 1 // lado opuesto a la apertura del ángulo
  const GAP = 70
  const samples: FramePoint[] = []
  for (const [p, q] of [
    [b, a],
    [b, c],
  ] as const) {
    for (let i = 0; i <= 24; i++) samples.push({ x: p.x + ((q.x - p.x) * i) / 24, y: p.y + ((q.y - p.y) * i) / 24 })
  }
  let best = { x: b.x + outSide * (GAP + w / 2), y: b.y, score: Infinity }
  for (const side of [outSide, -outSide]) {
    for (const dy of [0, -110, 110, -220, 220, -330, 330, -440, -550]) {
      let x = b.x + side * (GAP + w / 2)
      const y = Math.min(OUT_H - 50 - h / 2, Math.max(50 + h / 2, b.y + dy))
      x = Math.min(OUT_W - 20 - w / 2, Math.max(20 + w / 2, x))
      const pad = 14
      const inside = (p: FramePoint, r = 0) => Math.abs(p.x - x) < w / 2 + pad + r && Math.abs(p.y - y) < h / 2 + pad + r
      let score = Math.abs(dy) / 110 + (side === outSide ? 0 : 0.5)
      if (x + w / 2 > SAFE.right) score += 2.5 // mejor fuera de la columna de acciones de Reels
      // Nunca sobre la banda de subtítulos (S1, centrada en SAFE.bottom − 150) ni sobre el pie de Reels.
      const top = y - h / 2
      const bottom = y + h / 2
      if (bottom > SAFE.bottom - 150 - 110 && top < SAFE.bottom - 150 + 110) score += 400
      if (bottom > SAFE.bottom) score += 300
      if (inside(b, 50)) score += 1000 // nunca sobre la rodilla
      for (const p of [a, c]) if (inside(p, 20)) score += 200
      for (const p of samples) if (inside(p)) score += 8
      if (score < best.score) best = { x, y, score }
    }
  }
  return best
}

/** Dibuja el Bar Path y los goniómetros activos en `time`. */
export function drawBiomech(ctx: Ctx, bio: Biomech, time: number, selectedAngle: string | null = null, _calibrating = false, scale = 1, exporting = false): AnglePillRect[] {
  zoom = scale
  drawPath(ctx, bio, time, !exporting)
  // En la exportación no salen los goniómetros que nadie ubicó sobre el atleta.
  return activeAngles(bio, time)
    .filter((g) => !exporting || g.placed !== false)
    .map((g) => drawAngle(ctx, g, g.id === selectedAngle))
}
