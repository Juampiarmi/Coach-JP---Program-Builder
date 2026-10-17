import { useEffect, useState } from 'react'
import type { PhotoLuma } from '../lib/retentionDoctor'

/** Caché de módulo: la foto se mide una sola vez por id (miniatura 48 px, unos ms). */
const cache = new Map<string, PhotoLuma>()

function measure(src: string): Promise<PhotoLuma> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const S = 48
      const c = document.createElement('canvas')
      c.width = S
      c.height = Math.max(1, Math.round((S * img.height) / img.width))
      const x = c.getContext('2d', { willReadFrequently: true })
      if (!x) return reject(new Error('sin canvas'))
      x.drawImage(img, 0, 0, c.width, c.height)
      const d = x.getImageData(0, 0, c.width, c.height).data
      const px: [number, number, number, number][] = []
      const sum = [0, 0, 0]
      for (let i = 0; i < d.length; i += 4) {
        px.push([d[i], d[i + 1], d[i + 2], 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]])
        sum[0] += d[i]
        sum[1] += d[i + 1]
        sum[2] += d[i + 2]
      }
      px.sort((a, b) => a[3] - b[3])
      // Banda p70–p80 del brillo: lo claro de la foto (donde se pierde un titular), sin reflejos puntuales.
      const band = px.slice(Math.floor(px.length * 0.7), Math.max(Math.floor(px.length * 0.7) + 1, Math.floor(px.length * 0.8)))
      const avg = (arr: number[][], k: number) => arr.reduce((a, p) => a + p[k], 0) / arr.length
      resolve({
        avg: [sum[0] / px.length, sum[1] / px.length, sum[2] / px.length],
        bright: [avg(band, 0), avg(band, 1), avg(band, 2)],
      })
    }
    img.onerror = () => reject(new Error('no se pudo leer la foto'))
    img.src = src
  })
}

/** Luminancia medida de cada foto (por id). Devuelve un lector que da null mientras se mide. */
export function usePhotoLuma(ids: (string | null)[], resolve: (id: string | null | undefined) => string | null) {
  const [, setTick] = useState(0)
  const key = ids.map((id) => (id && resolve(id) ? id : '')).join('|')
  useEffect(() => {
    let alive = true
    for (const id of key.split('|')) {
      const src = id ? resolve(id) : null
      if (!id || !src || cache.has(id)) continue
      measure(src)
        .then((l) => {
          cache.set(id, l)
          if (alive) setTick((t) => t + 1)
        })
        .catch(() => undefined)
    }
    return () => {
      alive = false
    }
    // resolve cambia con el caché de imágenes; key ya refleja qué fotos están cargadas.
  }, [key])
  return (id: string | null | undefined) => (id ? (cache.get(id) ?? null) : null)
}
