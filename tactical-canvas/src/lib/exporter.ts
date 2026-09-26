import { getFontEmbedCSS, toBlob } from 'html-to-image'
import { BRAND } from './brand'

export const EXPORT_PIXEL_RATIO = 3

const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)

/** iOS Safari limita los canvas a ~16,7 MP: se ajusta el ratio sólo si hace falta. */
export function effectivePixelRatio(w: number, h: number) {
  if (!isIOS()) return EXPORT_PIXEL_RATIO
  const max = Math.sqrt(16_777_216 / (w * h))
  return Math.min(EXPORT_PIXEL_RATIO, Math.floor(max * 100) / 100)
}

let fontCSS: Promise<string> | null = null

/** Renderiza el nodo a PNG en alta resolución. */
export async function renderPng(node: HTMLElement, w: number, h: number): Promise<{ blob: Blob; ratio: number }> {
  await document.fonts.ready
  fontCSS ??= getFontEmbedCSS(node).catch((err) => {
    fontCSS = null
    throw err
  })
  const ratio = effectivePixelRatio(w, h)
  const options = {
    width: w,
    height: h,
    pixelRatio: ratio,
    backgroundColor: BRAND.bg,
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
