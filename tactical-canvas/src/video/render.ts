import { BRAND, FONT_MONO } from '../lib/brand'
import type { OverlayConfig, OverlayItem } from './types'
import { OUT_H, OUT_W } from './types'

/**
 * Render de overlays tácticos en canvas 2D (1080×1920). La misma función dibuja la vista
 * previa (canvas sobre el <video>) y cada frame de la exportación: lo que se ve es lo que sale.
 */

const DISPLAY = "'Chakra Petch', sans-serif"
const ENTER = 0.3
const EXIT = 0.2
/** Márgenes de la zona segura de Reels (UI de Instagram arriba, columna derecha y pie). */
export const SAFE = { top: 250, bottom: 1480, left: 72, right: 1080 - 180 }

type Ctx = CanvasRenderingContext2D

function font(ctx: Ctx, weight: number, size: number, family: string, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`
  // letterSpacing existe en Chrome / Safari 17+; si no, se ignora sin romper nada.
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${spacing}px`
}

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.replace(/\*/g, '').trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && ctx.measureText(next).width > maxWidth) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Entrada (fade o slide ascendente de 0,3 s) y salida corta: opacidad y desplazamiento. */
export function animation(item: OverlayItem, time: number) {
  const ease = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3
  const inP = ease((time - item.start) / ENTER)
  const outP = Math.min(1, Math.max(0, (item.end - time) / EXIT))
  const alpha = (item.overlay.opacity / 100) * inP * outP
  const dy = item.overlay.entrance === 'slide' ? (1 - inP) * 90 : 0
  return { alpha, dy }
}

/** Ancla vertical del bloque según la posición elegida, siempre dentro de la zona segura. */
function anchorY(position: OverlayConfig['position'], blockH: number) {
  if (position === 'top') return SAFE.top + 40
  if (position === 'bottom') return SAFE.bottom - 60 - blockH
  return (SAFE.top + SAFE.bottom) / 2 - blockH / 2
}

function drawBadge(ctx: Ctx, o: OverlayConfig) {
  const value = o.value.trim() || '—'
  const label = o.label.trim().toUpperCase()
  font(ctx, 700, 190, DISPLAY, -2)
  const valueW = ctx.measureText(value).width
  font(ctx, 600, 36, FONT_MONO, 5)
  const labelLines = label ? wrap(ctx, label, 760) : []
  const labelW = Math.max(0, ...labelLines.map((l) => ctx.measureText(l).width))
  const padX = 56
  const w = Math.min(SAFE.right - SAFE.left, Math.max(380, valueW, labelW) + padX * 2)
  const h = 60 + 170 + (labelLines.length ? 30 + labelLines.length * 50 : 0) + 50
  const cx = o.position === 'bottom' ? SAFE.left + w / 2 : OUT_W / 2
  const x = cx - w / 2
  const y = anchorY(o.position, h)
  // Caja oscura semitransparente con filo de acento
  roundRect(ctx, x, y, w, h, 30)
  ctx.fillStyle = 'rgba(11,14,20,0.78)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.stroke()
  ctx.fillStyle = BRAND.orange
  roundRect(ctx, x + 28, y + 28, 70, 8, 4)
  ctx.fill()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  font(ctx, 700, 190, DISPLAY, -2)
  ctx.save()
  ctx.shadowColor = 'rgba(234,88,12,0.5)'
  ctx.shadowBlur = 40
  ctx.fillStyle = BRAND.orange
  ctx.fillText(value, cx, y + 60 + 160)
  ctx.restore()
  font(ctx, 600, 36, FONT_MONO, 5)
  ctx.fillStyle = BRAND.white
  labelLines.forEach((l, i) => ctx.fillText(l, cx, y + 60 + 170 + 30 + 38 + i * 50))
}

function drawHeadline(ctx: Ctx, o: OverlayConfig) {
  const maxW = 840
  const tag = o.tag.trim().toUpperCase()
  font(ctx, 700, 96, DISPLAY, -1)
  const a = wrap(ctx, o.headlineA.toUpperCase(), maxW)
  const b = wrap(ctx, o.headlineB.toUpperCase(), maxW)
  const lineH = 100
  const pad = 52
  const tagH = tag ? 64 : 0
  const h = pad * 2 + tagH + (a.length + b.length) * lineH
  const widths = [...a, ...b].map((l) => ctx.measureText(l).width)
  font(ctx, 600, 30, FONT_MONO, 7)
  const tagW = tag ? ctx.measureText(`[ ${tag} ]`).width : 0
  const w = Math.min(SAFE.right - SAFE.left + 100, Math.max(tagW, ...widths, 300) + pad * 2)
  const x = o.position === 'bottom' ? SAFE.left : (OUT_W - w) / 2
  const y = anchorY(o.position, h)
  roundRect(ctx, x, y, w, h, 26)
  ctx.fillStyle = 'rgba(11,14,20,0.72)'
  ctx.fill()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  let cy = y + pad
  if (tag) {
    font(ctx, 600, 30, FONT_MONO, 7)
    ctx.fillStyle = BRAND.cyan
    ctx.fillText(`[ ${tag} ]`, x + pad, cy + 30)
    cy += tagH
  }
  font(ctx, 700, 96, DISPLAY, -1)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 16
  a.forEach((l) => {
    ctx.fillStyle = BRAND.white
    ctx.fillText(l, x + pad, cy + 82)
    cy += lineH
  })
  b.forEach((l) => {
    ctx.fillStyle = BRAND.orange
    ctx.fillText(l, x + pad, cy + 82)
    cy += lineH
  })
  ctx.restore()
}

const SHIELD = new Path2D('M32 2 L60 12 L60 36 C60 54 47 66 32 72 C17 66 4 54 4 36 L4 12 Z')
const BOLT = new Path2D('M36 18 L21 40 L30 40 L27 58 L43 34 L33 34 Z')

/** Firma Coach JP fija en la esquina inferior izquierda (sobre el pie de Reels). */
function drawWatermark(ctx: Ctx) {
  const x = SAFE.left
  const y = SAFE.bottom - 110
  roundRect(ctx, x - 18, y - 16, 470, 118, 22)
  ctx.fillStyle = 'rgba(11,14,20,0.55)'
  ctx.fill()
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1.15, 1.15)
  const g = ctx.createLinearGradient(0, 0, 64, 74)
  g.addColorStop(0, '#FFE873')
  g.addColorStop(0.38, '#FFD600')
  g.addColorStop(0.72, '#C9A100')
  g.addColorStop(1, '#8A6B00')
  ctx.fillStyle = g
  ctx.fill(SHIELD)
  ctx.fillStyle = '#07080A'
  ctx.fill(BOLT)
  ctx.restore()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  font(ctx, 700, 46, DISPLAY, 0)
  ctx.fillStyle = BRAND.white
  ctx.fillText('COACH', x + 96, y + 48)
  const w = ctx.measureText('COACH ').width
  ctx.fillStyle = BRAND.orange
  ctx.fillText('JP', x + 96 + w, y + 48)
  font(ctx, 400, 26, FONT_MONO, 2)
  ctx.fillStyle = BRAND.gray
  ctx.fillText('@coachjp.training', x + 96, y + 84)
}

/** Dibuja los overlays activos en el instante `time` (segundos del clip base). */
export function drawOverlays(ctx: Ctx, items: OverlayItem[], time: number) {
  for (const item of items) {
    if (time < item.start || time > item.end) continue
    const { alpha, dy } = animation(item, time)
    if (alpha <= 0.001) continue
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(0, dy)
    if (item.overlay.kind === 'badge') drawBadge(ctx, item.overlay)
    else if (item.overlay.kind === 'headline') drawHeadline(ctx, item.overlay)
    else drawWatermark(ctx)
    ctx.restore()
  }
}

/** Frame del video con encuadre "cover" en 1080×1920 (recorta los lados de un clip horizontal). */
export function drawVideoCover(ctx: Ctx, video: HTMLVideoElement) {
  const vw = video.videoWidth || OUT_W
  const vh = video.videoHeight || OUT_H
  const s = Math.max(OUT_W / vw, OUT_H / vh)
  const sw = OUT_W / s
  const sh = OUT_H / s
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, OUT_W, OUT_H)
}

/** Las fuentes de marca tienen que estar listas antes de dibujar en canvas. */
export function loadOverlayFonts() {
  return Promise.all([
    document.fonts.load(`700 96px ${DISPLAY}`),
    document.fonts.load(`600 36px ${FONT_MONO}`),
    document.fonts.load(`400 26px ${FONT_MONO}`),
  ]).catch(() => undefined)
}

/** 00:00.00 */
export function timecode(t: number) {
  const s = Math.max(0, t)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.floor((s * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
