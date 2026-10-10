import { drawOverlays, drawVideoCover, loadOverlayFonts } from './render'
import { overlayItems } from './project'
import type { VideoProject } from './types'
import { OUT_H, OUT_W } from './types'

/**
 * Formatos en orden de preferencia: MP4 sólo con H.264 (Chrome 126+, Safari), que es el que
 * aceptan Instagram y los reproductores móviles; si el navegador no codifica H.264, WebM
 * explícito (nunca un MP4 "genérico" con VP9 adentro, que muchas apps rechazan).
 */
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1,opus',
  'video/mp4;codecs=avc1',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

export interface ExportResult {
  blob: Blob
  mime: string
  ext: 'mp4' | 'webm'
}

interface Options {
  url: string
  project: VideoProject
  onProgress: (ratio: number) => void
  signal?: AbortSignal
}

type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }

/**
 * Exportación en tiempo real: un <video> fuera de pantalla reproduce el tramo In→Out, cada
 * frame se compone (video "cover" + overlays) en un canvas 1080×1920 y MediaRecorder graba
 * canvas.captureStream() junto con el audio original del clip.
 */
export async function exportVideo({ url, project, onProgress, signal }: Options): Promise<ExportResult> {
  const clip = project.clip
  if (!clip) throw new Error('Primero subí un clip.')
  const mime = pickMime()
  if (!mime) throw new Error('Este navegador no puede grabar video (MediaRecorder no disponible).')
  await loadOverlayFonts()

  const video = document.createElement('video') as FrameVideo
  video.src = url
  video.playsInline = true
  video.preload = 'auto'
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('No se pudo leer el clip.'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d')!
  const stream = canvas.captureStream(30)

  // Audio original: el elemento se enruta a un destino de grabación (no suena por los parlantes).
  let audioCtx: AudioContext | null = null
  try {
    audioCtx = new AudioContext()
    const source = audioCtx.createMediaElementSource(video)
    const dest = audioCtx.createMediaStreamDestination()
    source.connect(dest)
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  } catch {
    audioCtx = null // sin audio: se exporta sólo la imagen
  }

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 160_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const stopped = new Promise<void>((r) => (recorder.onstop = () => r()))

  const items = overlayItems(project)
  const span = Math.max(0.1, clip.out - clip.in)
  const frame = () => {
    drawVideoCover(ctx, video)
    drawOverlays(ctx, items, video.currentTime)
  }

  video.currentTime = clip.in
  await new Promise<void>((r) => (video.onseeked = () => r()))
  frame()

  let done = false
  const finish = () => {
    if (done) return
    done = true
    video.pause()
    frame()
    if (recorder.state !== 'inactive') recorder.stop()
  }
  signal?.addEventListener('abort', finish)
  video.onended = finish

  recorder.start(250)
  if (audioCtx?.state === 'suspended') await audioCtx.resume().catch(() => undefined)
  await video.play()

  // Bucle de composición: requestVideoFrameCallback (un dibujo por frame real) o rAF.
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (done) return resolve()
      frame()
      onProgress(Math.min(1, (video.currentTime - clip.in) / span))
      if (video.currentTime >= clip.out - 0.01) {
        finish()
        return resolve()
      }
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick)
      else requestAnimationFrame(tick)
    }
    tick()
    // Red de seguridad si el navegador deja de entregar frames (pestaña en segundo plano).
    const guard = window.setInterval(() => {
      if (done || video.currentTime >= clip.out - 0.01 || video.ended) {
        window.clearInterval(guard)
        finish()
        resolve()
      }
    }, 200)
  })

  await stopped
  stream.getTracks().forEach((t) => t.stop())
  await audioCtx?.close().catch(() => undefined)
  video.removeAttribute('src')
  video.load()
  if (signal?.aborted) throw new DOMException('Exportación cancelada', 'AbortError')
  onProgress(1)
  const type = mime.split(';')[0]
  return { blob: new Blob(chunks, { type }), mime, ext: type === 'video/mp4' ? 'mp4' : 'webm' }
}

/** Miniaturas del clip para la pista V1 (seek en un <video> aparte). */
export async function extractThumbs(url: string, duration: number, count: number): Promise<string[]> {
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.preload = 'auto'
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error('thumbs'))
  })
  const canvas = document.createElement('canvas')
  canvas.width = 72
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    video.currentTime = Math.min(duration - 0.05, ((i + 0.5) / count) * duration)
    await new Promise<void>((r) => (video.onseeked = () => r()))
    const vw = video.videoWidth || 72
    const vh = video.videoHeight || 128
    const s = Math.max(72 / vw, 128 / vh)
    ctx.drawImage(video, (vw - 72 / s) / 2, (vh - 128 / s) / 2, 72 / s, 128 / s, 0, 0, 72, 128)
    out.push(canvas.toDataURL('image/jpeg', 0.6))
  }
  video.removeAttribute('src')
  video.load()
  return out
}
