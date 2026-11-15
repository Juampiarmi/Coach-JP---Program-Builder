/**
 * VISTA PREVIA EN GRILLA DE INSTAGRAM: la portada nueva arriba a la izquierda del perfil, junto a los
 * últimos posts (capturas propias o proyectos de la biblioteca). Mide si la portada se despega de sus
 * vecinos (contraste de luminancia) y si respeta la paleta del feed (armonía de color).
 */

export type RGB = [number, number, number]

export interface FeedPost {
  id: string
  /** Miniatura JPEG (data URL) */
  thumb: string
  addedAt: number
}

export interface FeedGridStore {
  /** Últimos posts reales del perfil, del más nuevo al más viejo */
  posts: FeedPost[]
  /** Recorte de la grilla: 3:4 (actual) o 1:1 (clásica) */
  crop: '3:4' | '1:1'
}

export const FEED_GRID_KEY = 'jp-tactical-canvas:feed-grid'
export const EMPTY_FEED: FeedGridStore = { posts: [], crop: '3:4' }
/** La portada nueva ocupa la primera celda: entran 8 posts anteriores en la grilla 3×3. */
export const GRID_SLOTS = 8

/** Luminancia relativa (WCAG) de un color sRGB 0–255, de 0 (negro) a 1 (blanco). */
export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Contraste WCAG entre dos luminancias (1 a 21). */
export const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/** Promedio de color de una lista de píxeles RGBA. */
export function averageColor(data: ArrayLike<number>): RGB {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    n++
  }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [0, 0, 0]
}

/** Matiz (0–360) y saturación (0–1) de un color. */
export function hueSat([r, g, b]: RGB): { h: number; s: number } {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) h = max === R ? 60 * (((G - B) / d) % 6) : max === G ? 60 * ((B - R) / d + 2) : 60 * ((R - G) / d + 4)
  return { h: (h + 360) % 360, s }
}

/** Distancia de color perceptual simple (RGB ponderado «redmean»), normalizada 0–1. */
export function colorDistance(a: RGB, b: RGB): number {
  const rm = (a[0] + b[0]) / 2
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  const d = Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
  return Math.min(1, d / 764.8)
}

export interface GridVerdict {
  /** Contraste de luminancia de la portada contra el promedio de sus vecinos inmediatos */
  contrast: number
  /** La portada se despega de los posts que la rodean */
  standsOut: boolean
  /** Distancia de color de la portada a la paleta media del feed (0 = idéntica) */
  paletteDistance: number
  harmonious: boolean
  notes: string[]
}

/** Vecinos de la primera celda en una grilla de 3 columnas: derecha, abajo y diagonal. */
export const NEIGHBORS = [0, 2, 3] as const

/**
 * Diagnóstico de la portada en la grilla. `feed` son los colores medios de los posts anteriores (del
 * más nuevo al más viejo; los primeros son los vecinos de la portada). null sin posts para comparar.
 */
export function gridVerdict(cover: RGB, feed: RGB[]): GridVerdict | null {
  if (!feed.length) return null
  const near = NEIGHBORS.map((i) => feed[i]).filter(Boolean)
  const nearL = near.reduce((a, c) => a + luminance(c), 0) / near.length
  const contrast = Math.round(contrastRatio(luminance(cover), nearL) * 100) / 100
  const mean: RGB = [0, 1, 2].map((k) => Math.round(feed.reduce((a, c) => a + c[k], 0) / feed.length)) as RGB
  const paletteDistance = Math.round(colorDistance(cover, mean) * 100) / 100
  const standsOut = contrast >= 1.6
  const harmonious = paletteDistance <= 0.28
  const notes = [
    standsOut
      ? `La portada se despega de sus vecinos (contraste ${contrast.toFixed(2)}:1): frena el scroll del perfil.`
      : `La portada se pierde entre los posts de al lado (contraste ${contrast.toFixed(2)}:1, objetivo ≥ 1,6:1). ${luminance(cover) > nearL ? 'Oscurecé los vecinos o aclarala más.' : 'Probá fondo más claro, Minimal Paper o más acento.'}`,
    harmonious
      ? `Paleta coherente con el feed (Δ ${paletteDistance.toFixed(2)}).`
      : `Rompe la paleta del feed (Δ ${paletteDistance.toFixed(2)}, objetivo ≤ 0,28): revisá acento, velo o B/N de la foto.`,
  ]
  return { contrast, standsOut, paletteDistance, harmonious, notes }
}

/** Color medio de una imagen (data URL), muestreada en 24×24. */
export async function sampleColor(src: string): Promise<RGB> {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = 24
  c.height = 24
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, 24, 24)
  return averageColor(ctx.getImageData(0, 0, 24, 24).data)
}

/** Miniatura para la grilla (3:4, 240 px de ancho, recorte centrado) a partir de una captura. */
export async function feedThumb(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const W = 240
    const H = 320
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (W - img.naturalWidth * k) / 2, (H - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k)
    return c.toDataURL('image/jpeg', 0.75)
  } finally {
    URL.revokeObjectURL(url)
  }
}
