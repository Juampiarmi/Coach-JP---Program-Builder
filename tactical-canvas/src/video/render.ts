import { BRAND, FONT_MONO } from '../lib/brand'
import type { OverlayAlign, OverlayConfig, OverlayItem, OverlaySize } from './types'
import { OUT_H, OUT_W } from './types'

/**
 * Render de overlays tácticos en canvas 2D (1080×1920). La misma función dibuja la vista
 * previa (canvas sobre el <video>) y cada frame de la exportación: lo que se ve es lo que sale.
 */

const DISPLAY = "'Chakra Petch', sans-serif"
const ENTER = 0.3
const EXIT = 0.3
/** Márgenes de la zona segura de Reels (UI de Instagram arriba, columna derecha y pie). */
export const SAFE = { top: 250, bottom: 1480, left: 72, right: 1080 - 180 }
/** Escala de cada tamaño: S compacto, M estándar, L impacto. */
const SIZE_K: Record<OverlaySize, number> = { S: 0.7, M: 1, L: 1.3 }

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

const ease = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3

/** Entrada (fade / slide ascendente) y salida (inmediata, fade out o slide down) de 0,3 s. */
export function animation(item: OverlayItem, time: number) {
  const o = item.overlay
  const inP = ease((time - item.start) / ENTER)
  const outP = o.exit === 'none' ? 1 : ease((item.end - time) / EXIT)
  const alpha = (o.opacity / 100) * inP * outP
  const dy = (o.entrance === 'slide' ? (1 - inP) * 90 : 0) + (o.exit === 'slide' ? (1 - outP) * 90 : 0)
  return { alpha, dy }
}

/** Texto con el tratamiento del estilo: en Clean HUD, contorno oscuro + sombra de alto contraste. */
function text(ctx: Ctx, str: string, x: number, y: number, clean: boolean, size: number, glow?: string) {
  ctx.save()
  if (clean) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(4, size * 0.09)
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = size * 0.22
    ctx.shadowOffsetY = Math.max(2, size * 0.03)
    ctx.strokeText(str, x, y)
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
  } else if (glow) {
    ctx.shadowColor = glow
    ctx.shadowBlur = size * 0.2
  }
  ctx.fillText(str, x, y)
  ctx.restore()
}

/** Caja táctica: esquinas recortadas (chaflán), borde sutil y marcas de acento. */
function tacticalBox(ctx: Ctx, w: number, h: number) {
  const cut = 28
  ctx.beginPath()
  ctx.moveTo(cut, 0)
  ctx.lineTo(w, 0)
  ctx.lineTo(w, h - cut)
  ctx.lineTo(w - cut, h)
  ctx.lineTo(0, h)
  ctx.lineTo(0, cut)
  ctx.closePath()
  ctx.fillStyle = 'rgba(11,14,20,0.8)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.stroke()
  ctx.strokeStyle = BRAND.orange
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(cut + 4, 3)
  ctx.lineTo(cut + 84, 3)
  ctx.moveTo(w - cut - 4, h - 3)
  ctx.lineTo(w - cut - 64, h - 3)
  ctx.stroke()
}

/** Bloque medido en unidades sin escalar: se ubica, se escala y se dibuja en (0,0). */
interface Block {
  w: number
  h: number
  draw: (ctx: Ctx, clean: boolean, ax: (pad: number) => number) => void
}

function badgeBlock(ctx: Ctx, o: OverlayConfig, clean: boolean): Block {
  const value = o.value.trim() || '—'
  const label = o.label.trim().toUpperCase()
  font(ctx, 700, 190, DISPLAY, -2)
  const valueW = ctx.measureText(value).width
  font(ctx, 600, 36, FONT_MONO, 5)
  const lines = label ? wrap(ctx, label, 760) : []
  const labelW = Math.max(0, ...lines.map((l) => ctx.measureText(l).width))
  const pad = clean ? 12 : 56
  const w = Math.max(clean ? 0 : 380, valueW, labelW) + pad * 2
  const h = 60 + 170 + (lines.length ? 30 + lines.length * 50 : 0) + (clean ? 10 : 50)
  return {
    w,
    h,
    draw: (c, cl, ax) => {
      font(c, 700, 190, DISPLAY, -2)
      c.fillStyle = BRAND.orange
      text(c, value, ax(pad), 60 + 160, cl, 190, 'rgba(234,88,12,0.5)')
      font(c, 600, 36, FONT_MONO, 5)
      c.fillStyle = BRAND.white
      lines.forEach((l, i) => text(c, l, ax(pad), 60 + 170 + 30 + 38 + i * 50, cl, 36))
    },
  }
}

function headlineBlock(ctx: Ctx, o: OverlayConfig, clean: boolean): Block {
  const tag = o.tag.trim().toUpperCase()
  font(ctx, 700, 96, DISPLAY, -1)
  const a = wrap(ctx, o.headlineA.toUpperCase(), 840)
  const b = wrap(ctx, o.headlineB.toUpperCase(), 840)
  const widths = [...a, ...b].map((l) => ctx.measureText(l).width)
  font(ctx, 600, 30, FONT_MONO, 7)
  const tagW = tag ? ctx.measureText(`[ ${tag} ]`).width : 0
  const pad = clean ? 12 : 52
  const tagH = tag ? 64 : 0
  const w = Math.max(tagW, ...widths, clean ? 0 : 300) + pad * 2
  const h = pad * 2 + tagH + (a.length + b.length) * 100
  return {
    w,
    h,
    draw: (c, cl, ax) => {
      let cy = pad
      if (tag) {
        font(c, 600, 30, FONT_MONO, 7)
        c.fillStyle = BRAND.cyan
        text(c, `[ ${tag} ]`, ax(pad), cy + 30, cl, 30)
        cy += tagH
      }
      font(c, 700, 96, DISPLAY, -1)
      for (const [list, color] of [
        [a, BRAND.white],
        [b, BRAND.orange],
      ] as const) {
        for (const l of list) {
          c.fillStyle = color
          text(c, l, ax(pad), cy + 82, cl, 96)
          cy += 100
        }
      }
    },
  }
}

/** mm:ss.mmm */
function stopwatch(sec: number) {
  const ms = Math.max(0, Math.round(sec * 1000))
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}

function timerBlock(ctx: Ctx, o: OverlayConfig, item: OverlayItem, time: number, clean: boolean): Block {
  const total = item.end - item.start
  const elapsed = Math.min(total, Math.max(0, time - item.start))
  const value = stopwatch(o.timerDown ? total - elapsed : elapsed)
  const label = o.timerLabel.trim().toUpperCase()
  // Ancho fijo con el patrón más ancho: los dígitos monoespaciados no hacen "temblar" la caja.
  font(ctx, 700, 150, FONT_MONO, 0)
  const digitsW = ctx.measureText('00:00.000').width
  font(ctx, 600, 32, FONT_MONO, 5)
  const labelW = label ? ctx.measureText(`● ${label}`).width : 0
  const pad = clean ? 12 : 50
  const w = Math.max(digitsW, labelW) + pad * 2
  const h = pad + (label ? 52 : 0) + 140 + pad
  const blink = Math.floor(time * 2) % 2 === 0
  return {
    w,
    h,
    draw: (c, cl, ax) => {
      let cy = pad
      if (label) {
        font(c, 600, 32, FONT_MONO, 5)
        c.fillStyle = BRAND.orange
        text(c, `${blink ? '●' : '○'} ${label}`, ax(pad), cy + 30, cl, 32)
        cy += 52
      }
      font(c, 700, 150, FONT_MONO, 0)
      c.fillStyle = BRAND.white
      text(c, value, ax(pad), cy + 118, cl, 150)
    },
  }
}

function checklistBlock(ctx: Ctx, o: OverlayConfig, item: OverlayItem, time: number, clean: boolean): Block {
  const items = o.checks.filter((x) => x.text.trim()).slice(0, 3)
  const title = o.tag.trim().toUpperCase()
  font(ctx, 700, 50, FONT_MONO, 0)
  const markW = ctx.measureText('[ ✓ ]').width
  font(ctx, 700, 62, DISPLAY, 0)
  const textW = Math.max(0, ...items.map((x) => ctx.measureText(x.text.toUpperCase()).width))
  font(ctx, 600, 30, FONT_MONO, 7)
  const titleW = title ? ctx.measureText(`[ ${title} ]`).width : 0
  const pad = clean ? 12 : 48
  const gap = 26
  const rowH = 88
  const titleH = title ? 60 : 0
  const w = Math.max(titleW, markW + gap + textW) + pad * 2
  const h = pad * 2 + titleH + items.length * rowH - 10
  return {
    w,
    h,
    draw: (c, cl) => {
      // La checklist siempre se lee de izquierda a derecha; la alineación mueve el bloque.
      c.textAlign = 'left'
      let cy = pad
      if (title) {
        font(c, 600, 30, FONT_MONO, 7)
        c.fillStyle = BRAND.cyan
        text(c, `[ ${title} ]`, pad, cy + 30, cl, 30)
        cy += titleH
      }
      items.forEach((x, i) => {
        // Cada ítem entra 0,15 s después del anterior.
        const a = ease((time - item.start - 0.15 * i) / 0.25)
        c.save()
        c.globalAlpha *= a
        font(c, 700, 50, FONT_MONO, 0)
        c.fillStyle = x.ok ? BRAND.cyan : BRAND.orange
        text(c, x.ok ? '[ ✓ ]' : '[ ✗ ]', pad, cy + 60, cl, 50)
        font(c, 700, 62, DISPLAY, 0)
        c.fillStyle = BRAND.white
        text(c, x.text.toUpperCase(), pad + markW + gap, cy + 62, cl, 62)
        c.restore()
        cy += rowH
      })
    },
  }
}

const SHIELD = new Path2D('M32 2 L60 12 L60 36 C60 54 47 66 32 72 C17 66 4 54 4 36 L4 12 Z')
const BOLT = new Path2D('M36 18 L21 40 L30 40 L27 58 L43 34 L33 34 Z')

/** Firma Coach JP (siempre abajo, sobre el pie de Reels). */
function watermarkBlock(clean: boolean): Block {
  const pad = clean ? 8 : 22
  return {
    w: 440 + pad * 2,
    h: 84 + pad * 2,
    draw: (c, cl) => {
      c.save()
      c.translate(pad, pad)
      if (cl) {
        c.shadowColor = 'rgba(0,0,0,0.85)'
        c.shadowBlur = 18
      }
      c.scale(1.15, 1.15)
      const g = c.createLinearGradient(0, 0, 64, 74)
      g.addColorStop(0, '#FFE873')
      g.addColorStop(0.38, '#FFD600')
      g.addColorStop(0.72, '#C9A100')
      g.addColorStop(1, '#8A6B00')
      c.fillStyle = g
      c.fill(SHIELD)
      c.fillStyle = '#07080A'
      c.fill(BOLT)
      c.restore()
      c.textAlign = 'left'
      font(c, 700, 46, DISPLAY, 0)
      c.fillStyle = BRAND.white
      text(c, 'COACH', pad + 96, pad + 46, cl, 46)
      const w = c.measureText('COACH ').width
      c.fillStyle = BRAND.orange
      text(c, 'JP', pad + 96 + w, pad + 46, cl, 46)
      font(c, 400, 26, FONT_MONO, 2)
      c.fillStyle = cl ? BRAND.white : BRAND.gray
      text(c, '@coachjp.training', pad + 96, pad + 82, cl, 26)
    },
  }
}

/** Ancla vertical del bloque según la posición elegida, siempre dentro de la zona segura. */
function anchorY(position: OverlayConfig['position'], h: number) {
  if (position === 'top') return SAFE.top + 40
  if (position === 'bottom') return SAFE.bottom - 40 - h
  return (SAFE.top + SAFE.bottom) / 2 - h / 2
}

function anchorX(align: OverlayAlign, w: number) {
  const x = align === 'left' ? SAFE.left : align === 'right' ? SAFE.right - w : (OUT_W - w) / 2
  return Math.min(OUT_W - 24 - w, Math.max(24, x))
}

/** Dibuja los overlays activos en el instante `time` (segundos del clip base). */
export function drawOverlays(ctx: Ctx, items: OverlayItem[], time: number) {
  for (const item of items) {
    if (time < item.start || time > item.end) continue
    const o = item.overlay
    const { alpha, dy } = animation(item, time)
    if (alpha <= 0.001) continue
    const clean = o.style === 'clean'
    const block =
      o.kind === 'badge'
        ? badgeBlock(ctx, o, clean)
        : o.kind === 'headline'
          ? headlineBlock(ctx, o, clean)
          : o.kind === 'timer'
            ? timerBlock(ctx, o, item, time, clean)
            : o.kind === 'checklist'
              ? checklistBlock(ctx, o, item, time, clean)
              : watermarkBlock(clean)
    const k = SIZE_K[o.size] ?? 1
    // Nunca más ancho que la zona útil: si no entra, se achica.
    const fit = Math.min(k, (OUT_W - 48) / block.w)
    const w = block.w * fit
    const h = block.h * fit
    const x = anchorX(o.align, w)
    const y = anchorY(o.kind === 'watermark' ? 'bottom' : o.position, h)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y + dy)
    ctx.scale(fit, fit)
    if (!clean) tacticalBox(ctx, block.w, block.h)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = o.align === 'center' ? 'center' : o.align === 'right' ? 'right' : 'left'
    // Ancla horizontal del texto dentro del bloque según la alineación.
    const ax = (pad: number) => (o.align === 'center' ? block.w / 2 : o.align === 'right' ? block.w - pad : pad)
    block.draw(ctx, clean, ax)
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
