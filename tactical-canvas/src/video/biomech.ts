import { FONT_MONO } from '../lib/brand'
import type { Biomech, FramePoint, Goniometer, PathPoint } from './types'
import { OUT_H, OUT_W } from './types'

/**
 * HUD biomecánico en canvas 2D (1080×1920): Bar Path y goniómetro articular. Lo dibuja la
 * vista previa y cada frame de la exportación, en sincronía con el tiempo del clip.
 */

type Ctx = CanvasRenderingContext2D

const CYAN = '#00E5FF'
const ORANGE = '#FF5500'
const DISPLAY = "'Chakra Petch', sans-serif"
/** El trazado queda visible 1,5 s después del último punto. */
const PATH_HOLD = 1.5

export const px = (p: FramePoint) => ({ x: (p.x / 100) * OUT_W, y: (p.y / 100) * OUT_H })

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

function drawPath(ctx: Ctx, bio: Biomech, time: number) {
  const pts = bio.path.points
  if (pts.length < 1 || time < pts[0].t || time > pts[pts.length - 1].t + PATH_HOLD) return
  const done = pts.filter((p) => p.t <= time).map(px)
  const cur = pathPointAt(pts, time)
  if (cur) done.push(px(cur))
  const core = bio.path.thick ? 11 : 6
  const start = px(pts[0])
  // Eje de gravedad: vertical pura desde el primer punto.
  if (bio.path.showVertical) {
    const ys = pts.map((p) => px(p).y)
    ctx.save()
    ctx.setLineDash([18, 14])
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(200,210,220,0.55)'
    ctx.beginPath()
    ctx.moveTo(start.x, Math.max(0, Math.min(...ys) - 120))
    ctx.lineTo(start.x, Math.min(OUT_H, Math.max(...ys) + 120))
    ctx.stroke()
    ctx.restore()
  }
  if (done.length > 1) {
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    const line = () => {
      ctx.beginPath()
      done.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
    }
    // Estela: halo ancho translúcido + núcleo con glow.
    ctx.strokeStyle = 'rgba(0,229,255,0.22)'
    ctx.lineWidth = core * 3.2
    line()
    ctx.shadowColor = CYAN
    ctx.shadowBlur = 18
    ctx.strokeStyle = CYAN
    ctx.lineWidth = core
    line()
    ctx.restore()
  }
  // Punto de inicio y mira en la posición actual con desvío horizontal respecto del inicio.
  ctx.save()
  ctx.fillStyle = CYAN
  ctx.beginPath()
  ctx.arc(start.x, start.y, 8, 0, Math.PI * 2)
  ctx.fill()
  const p = done[done.length - 1]
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(p.x, p.y, 26, 0, Math.PI * 2)
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    ctx.moveTo(p.x + dx * 14, p.y + dy * 14)
    ctx.lineTo(p.x + dx * 42, p.y + dy * 42)
  }
  ctx.stroke()
  const dxPct = ((p.x - start.x) / OUT_W) * 100
  const dyPct = ((start.y - p.y) / OUT_H) * 100
  ctx.font = `600 26px ${FONT_MONO}`
  ctx.textBaseline = 'middle'
  const label = `ΔX ${dxPct >= 0 ? '+' : ''}${dxPct.toFixed(1)}% · ΔY ${dyPct >= 0 ? '+' : ''}${dyPct.toFixed(1)}%`
  const tw = ctx.measureText(label).width
  const lx = p.x + 56 + tw > OUT_W - 20 ? p.x - 56 - tw : p.x + 56
  ctx.fillStyle = 'rgba(8,10,14,0.75)'
  ctx.beginPath()
  ctx.roundRect(lx - 12, p.y - 22, tw + 24, 44, 10)
  ctx.fill()
  ctx.fillStyle = CYAN
  ctx.textAlign = 'left'
  ctx.fillText(label, lx, p.y + 1)
  ctx.restore()
}

function drawAngle(ctx: Ctx, g: Goniometer, selected: boolean) {
  const a = px(g.a)
  const b = px(g.b)
  const c = px(g.c)
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
  // Pastilla con los grados, del lado de afuera del ángulo.
  const mid = from + delta / 2
  const out = r + 90
  let lx = b.x - Math.cos(mid) * out
  const ly = Math.min(OUT_H - 60, Math.max(60, b.y - Math.sin(mid) * out))
  const text = `${Math.round(deg)}°${g.label.trim() ? ` · ${g.label.trim().toUpperCase()}` : ''}`
  ctx.font = `700 38px ${DISPLAY}`
  const half = (ctx.measureText(text).width + 40) / 2
  lx = Math.min(OUT_W - 20 - half, Math.max(20 + half, lx))
  pill(ctx, text, lx, ly, color)
}

/** Dibuja el Bar Path y los goniómetros activos en `time`. */
export function drawBiomech(ctx: Ctx, bio: Biomech, time: number, selectedAngle: string | null = null) {
  drawPath(ctx, bio, time)
  for (const g of activeAngles(bio, time)) drawAngle(ctx, g, g.id === selectedAngle)
}
