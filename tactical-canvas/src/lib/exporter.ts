import { getFontEmbedCSS, toBlob } from 'html-to-image'
import { BRAND } from './brand'

/** Multiplicador fijo de render (independiente del viewport y del devicePixelRatio). */
export const EXPORT_PIXEL_RATIO = 4
/** Piso de nitidez: nunca por debajo de 3x salvo que el navegador no lo soporte (iOS). */
const MIN_PIXEL_RATIO = 3
/** Tope de área segura para canvas en navegadores de escritorio / Android (~40 MP). */
const MAX_CANVAS_AREA = 40_000_000

const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)

/** 4x por defecto (Feed 4320×5400, Story 4320×7680); iOS Safari limita los canvas a ~16,7 MP. */
export function effectivePixelRatio(w: number, h: number) {
  const area = isIOS() ? 16_777_216 : MAX_CANVAS_AREA
  const max = Math.floor(Math.sqrt(area / (w * h)) * 100) / 100
  return isIOS() ? Math.min(EXPORT_PIXEL_RATIO, max) : Math.max(MIN_PIXEL_RATIO, Math.min(EXPORT_PIXEL_RATIO, max))
}

/**
 * CSS de fuentes embebidas, en caché por combinación de familias usadas: html-to-image sólo
 * incluye las fuentes presentes en el nodo, así que si cambia la tipografía hay que recalcularlo.
 */
const fontCSSCache = new Map<string, Promise<string>>()

function usedFontsKey(node: HTMLElement) {
  const fams = new Set<string>()
  const walk = (el: Element) => {
    fams.add(getComputedStyle(el).fontFamily)
    for (const child of Array.from(el.children)) walk(child)
  }
  walk(node)
  return [...fams].sort().join('|')
}

/** Renderiza el nodo a PNG en alta resolución. */
export async function renderPng(node: HTMLElement, w: number, h: number): Promise<{ blob: Blob; ratio: number }> {
  await document.fonts.ready
  // Dos cuadros de animación: el layout final (fuentes, SVG, auto-ajuste) ya está pintado.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  const key = usedFontsKey(node)
  let fontCSS = fontCSSCache.get(key)
  if (!fontCSS) {
    fontCSS = getFontEmbedCSS(node).catch((err) => {
      fontCSSCache.delete(key)
      throw err
    })
    fontCSSCache.set(key, fontCSS)
  }
  const ratio = effectivePixelRatio(w, h)
  const options = {
    width: w,
    height: h,
    pixelRatio: ratio,
    // El fondo de la propia placa (carbón o marfil de Minimal Paper).
    backgroundColor: getComputedStyle(node).backgroundColor || BRAND.bg,
    fontEmbedCSS: await fontCSS,
    style: { transform: 'none', margin: '0' },
  }
  // Safari a veces omite fuentes/SVG en la primera pasada: se hace una de calentamiento.
  if (isSafari()) await toBlob(node, options)
  const blob = await toBlob(node, options)
  if (!blob) throw new Error('No se pudo generar la imagen')
  return { blob, ratio }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function canShareFiles() {
  try {
    const probe = new File([new Blob()], 'x.png', { type: 'image/png' })
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export async function shareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  await navigator.share({ files: [file], title: 'Placa táctica · Coach JP' })
}

export function slugify(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\*/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'placa'
  )
}

/** Comparte varias placas juntas (carrusel / historias) desde el celular. */
export async function shareBlobs(items: { blob: Blob; name: string }[]) {
  const files = items.map((i) => new File([i.blob], i.name, { type: 'image/png' }))
  if (!navigator.canShare?.({ files })) throw new Error('No se pueden compartir varios archivos')
  await navigator.share({ files, title: 'Secuencia táctica · Coach JP' })
}
