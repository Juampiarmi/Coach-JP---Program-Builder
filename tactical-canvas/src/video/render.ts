import { BRAND, FONT_MONO } from '../lib/brand'
import { activeGroup, type SubtitleGroup } from './subtitles'
import type { OverlayAlign, OverlayConfig, OverlayItem, OverlaySize, SubtitleTrack } from './types'
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

/**
 * Subtítulo en Clean HUD: pastilla táctica oscura con borde fino detrás del texto, para que
 * no se pierda contra el fondo (gimnasio, luces). En caja táctica se dibuja como texto normal.
 */
function subtitle(ctx: Ctx, str: string, x: number, y: number, clean: boolean, size: number) {
  if (!clean) {
    ctx.fillText(str, x, y)
    return
  }
  const w = ctx.measureText(str).width
  const align = ctx.textAlign
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  const padX = size * 0.45
  const padY = size * 0.32
  ctx.save()
  roundRect(ctx, left - padX, y - size * 0.86 - padY, w + padX * 2, size * 1.1 + padY * 2, size * 0.28)
  ctx.fillStyle = 'rgba(8,10,14,0.82)'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = size * 0.5
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = Math.max(1.5, size * 0.05)
  ctx.strokeStyle = 'rgba(255,255,255,0.24)'
  ctx.stroke()
  ctx.restore()
  ctx.fillText(str, x, y)
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
  const pad = clean ? 30 : 56
  const w = Math.max(clean ? 0 : 380, valueW, labelW) + pad * 2
  const h = 60 + 170 + (lines.length ? 30 + lines.length * (clean ? 62 : 50) : 0) + (clean ? 24 : 50)
  return {
    w,
    h,
    draw: (c, cl, ax) => {
      font(c, 700, 190, DISPLAY, -2)
      c.fillStyle = BRAND.orange
      text(c, value, ax(pad), 60 + 160, cl, 190, 'rgba(234,88,12,0.5)')
      font(c, 600, 36, FONT_MONO, 5)
      c.fillStyle = BRAND.white
      lines.forEach((l, i) => subtitle(c, l, ax(pad), 60 + 170 + 30 + 38 + i * (cl ? 62 : 50), cl, 36))
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
  const pad = clean ? 26 : 52
  const tagH = tag ? (clean ? 76 : 64) : 0
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
        subtitle(c, `[ ${tag} ]`, ax(pad), cy + 30, cl, 30)
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
  const pad = clean ? 26 : 50
  const w = Math.max(digitsW, labelW) + pad * 2
  const h = pad + (label ? (clean ? 64 : 52) : 0) + 140 + pad
  const blink = Math.floor(time * 2) % 2 === 0
  return {
    w,
    h,
    draw: (c, cl, ax) => {
      let cy = pad
      if (label) {
        font(c, 600, 32, FONT_MONO, 5)
        c.fillStyle = BRAND.orange
        subtitle(c, `${blink ? '●' : '○'} ${label}`, ax(pad), cy + 30, cl, 32)
        cy += cl ? 64 : 52
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
  const pad = clean ? 26 : 48
  const gap = 26
  const rowH = 88
  const titleH = title ? (clean ? 74 : 60) : 0
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
        subtitle(c, `[ ${title} ]`, pad, cy + 30, cl, 30)
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
  const pad = clean ? 14 : 22
  return {
    w: 440 + pad * 2,
    h: (clean ? 96 : 84) + pad * 2,
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
      subtitle(c, '@coachjp.training', pad + 96 + (cl ? 10 : 0), pad + 84, cl, 24)
    },
  }
}

/** Rectángulo dibujado de cada overlay (coordenadas 1080×1920), para tomarlo con el mouse. */
export interface OverlayRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

/** Ancho máximo de cualquier overlay: 85 % del marco (nunca pisa la columna de Reels entera). */
const MAX_W = OUT_W * 0.85
/** Margen mínimo contra los bordes del marco. */
const EDGE = 16

/** Tamaño final del bloque en el marco (escala S/M/L y tope del 85 % de ancho). */
function blockScale(o: OverlayConfig, w: number) {
  return Math.min(SIZE_K[o.size] ?? 1, MAX_W / w)
}

/** Esquina superior izquierda a partir del centro en % (x, y), sin salirse del marco. */
export function placeBlock(o: OverlayConfig, w: number, h: number) {
  const cx = (o.x / 100) * OUT_W
  const cy = (o.y / 100) * OUT_H
  return {
    x: Math.min(OUT_W - EDGE - w, Math.max(EDGE, cx - w / 2)),
    y: Math.min(OUT_H - EDGE - h, Math.max(EDGE, cy - h / 2)),
  }
}

/** Alineación del texto dentro del bloque según en qué tercio horizontal está. */
function textAlignFor(o: OverlayConfig): OverlayAlign {
  return o.x < 38 ? 'left' : o.x > 62 ? 'right' : 'center'
}

function buildBlock(ctx: Ctx, item: OverlayItem, time: number, clean: boolean): Block {
  const o = item.overlay
  return o.kind === 'badge'
    ? badgeBlock(ctx, o, clean)
    : o.kind === 'headline'
      ? headlineBlock(ctx, o, clean)
      : o.kind === 'timer'
        ? timerBlock(ctx, o, item, time, clean)
        : o.kind === 'checklist'
          ? checklistBlock(ctx, o, item, time, clean)
          : watermarkBlock(clean)
}

/** Dibuja los overlays activos en el instante `time` y devuelve dónde quedó cada uno. */
export function drawOverlays(ctx: Ctx, items: OverlayItem[], time: number): OverlayRect[] {
  const rects: OverlayRect[] = []
  for (const item of items) {
    if (time < item.start || time > item.end) continue
    const o = item.overlay
    const { alpha, dy } = animation(item, time)
    if (alpha <= 0.001) continue
    const clean = o.style === 'clean'
    const block = buildBlock(ctx, item, time, clean)
    const fit = blockScale(o, block.w)
    const w = block.w * fit
    const h = block.h * fit
    const { x, y } = placeBlock(o, w, h)
    const align = textAlignFor(o)
    rects.push({ id: item.id, x, y, w, h })
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y + dy)
    ctx.scale(fit, fit)
    if (!clean) tacticalBox(ctx, block.w, block.h)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = align
    // Ancla horizontal del texto dentro del bloque según la alineación.
    const ax = (pad: number) => (align === 'center' ? block.w / 2 : align === 'right' ? block.w - pad : pad)
    block.draw(ctx, clean, ax)
    ctx.restore()
  }
  return rects
}

/** Colores de acento de la palabra activa. */
const SUB_ACCENT: Record<SubtitleTrack['accent'], string> = { orange: '#FF5500', cyan: '#00E5FF' }
const SUB_SIZE = 86
const SUB_MAX_W = OUT_W * 0.85
/** Centro vertical del bloque: tercio inferior, por encima del pie de Reels (descripción y audio). */
const SUB_Y = SAFE.bottom - 150

/**
 * Subtítulos cinéticos estilo karaoke: el bloque activo (2 a 4 palabras) centrado en el tercio
 * inferior; la palabra que se está diciendo va en acento y un 8 % más grande.
 */
export function drawSubtitles(ctx: Ctx, track: SubtitleTrack, groups: SubtitleGroup[], time: number) {
  if (!track.enabled || !groups.length) return
  const g = activeGroup(groups, time)
  if (!g) return
  const words = track.words.slice(g.from, g.to)
  const pill = track.style === 'pill'
  font(ctx, 700, SUB_SIZE, DISPLAY, 0)
  const upperWords = words.map((w) => w.word.toUpperCase())
  // El espacio de Chakra Petch es muy angosto: se abre para que cada palabra se lea suelta.
  const space = ctx.measureText(' ').width * 1.7
  const widths = upperWords.map((w) => ctx.measureText(w).width)
  // Una o dos líneas: se parte cuando el bloque supera el 85 % del ancho.
  const lines: number[][] = [[]]
  let lineW = 0
  widths.forEach((w, i) => {
    const add = (lines[lines.length - 1].length ? space : 0) + w
    if (lines[lines.length - 1].length && lineW + add > SUB_MAX_W) {
      lines.push([i])
      lineW = w
    } else {
      lines[lines.length - 1].push(i)
      lineW += add
    }
  })
  const fit = Math.min(1, SUB_MAX_W / Math.max(...lines.map((l) => l.reduce((n, i, k) => n + widths[i] + (k ? space : 0), 0))))
  const lineH = SUB_SIZE * 1.12
  const blockH = lines.length * lineH
  // Entrada del bloque: 0,1 s de fade + leve escala.
  const enter = ease((time - g.start) / 0.1)
  ctx.save()
  ctx.globalAlpha = enter
  ctx.translate(OUT_W / 2, SUB_Y)
  ctx.scale(fit * (0.94 + 0.06 * enter), fit * (0.94 + 0.06 * enter))
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  lines.forEach((line, li) => {
    const total = line.reduce((n, i, k) => n + widths[i] + (k ? space : 0), 0)
    const y = -blockH / 2 + lineH * (li + 0.5)
    if (pill) {
      roundRect(ctx, -total / 2 - 30, y - lineH / 2 + 2, total + 60, lineH - 4, 18)
      ctx.fillStyle = 'rgba(11,14,20,0.66)'
      ctx.fill()
    }
    let x = -total / 2
    line.forEach((i) => {
      const w = words[i]
      const active = time >= w.start && time < w.end + 0.05
      const cx = x + widths[i] / 2
      ctx.save()
      ctx.translate(cx, y)
      if (active) ctx.scale(1.08, 1.08)
      font(ctx, 700, SUB_SIZE, DISPLAY, 0)
      ctx.textAlign = 'center'
      if (!pill) {
        ctx.lineJoin = 'round'
        ctx.lineWidth = SUB_SIZE * 0.13
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'
        ctx.shadowColor = 'rgba(0,0,0,0.75)'
        ctx.shadowBlur = SUB_SIZE * 0.25
        ctx.shadowOffsetY = 4
        ctx.strokeText(upperWords[i], 0, 0)
        ctx.shadowColor = 'transparent'
      }
      ctx.fillStyle = active ? SUB_ACCENT[track.accent] : '#FFFFFF'
      ctx.fillText(upperWords[i], 0, 0)
      ctx.restore()
      x += widths[i] + space
    })
  })
  ctx.restore()
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
