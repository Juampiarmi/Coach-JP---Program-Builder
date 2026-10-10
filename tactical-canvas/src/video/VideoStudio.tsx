import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { downloadBlob } from '../lib/exporter'
import { exportVideo, extractThumbs, pickMime } from './exporter'
import { OverlayPanel } from './OverlayPanel'
import { defaultProject, findItem, fitToClip, newOverlayItem, overlayItems, patchItem, timelineDuration } from './project'
import { ReelsSafeZone } from './ReelsSafeZone'
import { drawOverlays, loadOverlayFonts, timecode } from './render'
import { Timeline } from './Timeline'
import type { OverlayConfig, VideoProject } from './types'
import { OUT_H, OUT_W } from './types'

interface Props {
  /** Visible: el estudio queda montado al cambiar de modo para no perder el clip cargado. */
  active: boolean
  header: ReactNode
}

const STORAGE_KEY = 'jp-tactical-video:v1'
/**
 * Duración real del clip. Los WebM grabados con MediaRecorder no la traen en los metadatos
 * (Infinity): se fuerza un seek al final para que el navegador la calcule y se vuelve a 0.
 */
function resolveDuration(v: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(v.duration) && v.duration > 0) return Promise.resolve(v.duration)
  return new Promise((resolve) => {
    const done = () => {
      if (!Number.isFinite(v.duration)) return
      v.removeEventListener('durationchange', done)
      v.removeEventListener('timeupdate', done)
      v.currentTime = 0
      resolve(v.duration)
    }
    v.addEventListener('durationchange', done)
    v.addEventListener('timeupdate', done)
    v.currentTime = 1e7
  })
}

const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.name)

/** Tactical Video Studio · Fase 1: reproductor 9:16, timeline V1/V2, overlays y exportación. */
export default function VideoStudio({ active, header }: Props) {
  const [stored, setProject] = usePersistentState<VideoProject>(STORAGE_KEY, defaultProject())
  // El archivo no se guarda: tras recargar se conserva el diseño pero hay que volver a subir el clip.
  const [url, setUrl] = useState<string | null>(null)
  const project: VideoProject = url ? stored : { ...stored, clip: null }
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [thumbs, setThumbs] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [exp, setExp] = useState<{ busy: boolean; progress: number; note: string }>({ busy: false, progress: 0, note: '' })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const duration = timelineDuration(project)
  const clip = project.clip
  const items = overlayItems(project)
  const selected = findItem(project, project.selectedId)

  // ── Carga del clip ────────────────────────────────────────────────────────────
  const loadFile = (file: File | undefined) => {
    if (!file) return
    if (!isVideoFile(file)) {
      setExp((s) => ({ ...s, note: 'El archivo no es un video (.mp4, .mov o .webm).' }))
      return
    }
    if (url) URL.revokeObjectURL(url)
    setThumbs([])
    setPlaying(false)
    setTime(0)
    setExp({ busy: false, progress: 0, note: '' })
    const next = URL.createObjectURL(file)
    setUrl(next)
    setProject((p) => ({ ...p, clip: { name: file.name, duration: 0, width: 0, height: 0, in: 0, out: 0 } }))
  }
  const onMeta = async () => {
    const v = videoRef.current
    if (!v || !url) return
    const d = await resolveDuration(v)
    setProject((p) => fitToClip({ ...p, clip: { name: p.clip?.name ?? 'clip', duration: d, width: v.videoWidth, height: v.videoHeight, in: 0, out: d } }))
    extractThumbs(url, d, 12).then(setThumbs, () => setThumbs([]))
  }
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  // ── Transporte ────────────────────────────────────────────────────────────────
  const seek = useCallback(
    (t: number) => {
      const v = videoRef.current
      const next = Math.min(Math.max(0, t), duration)
      if (v && url) v.currentTime = next
      setTime(next)
    },
    [duration, url],
  )
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v || !clip) return
    if (!v.paused) {
      v.pause()
      return
    }
    // Siempre dentro del tramo recortado In → Out.
    if (v.currentTime < clip.in || v.currentTime >= clip.out - 0.03) v.currentTime = clip.in
    v.play().catch(() => setPlaying(false))
  }, [clip])

  // Cabezal sincronizado frame a frame con el <video> y corte automático en Out.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v) {
        if (clip && v.currentTime >= clip.out) {
          v.pause()
          v.currentTime = clip.out
        }
        setTime(v.currentTime)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, clip])

  // Espaciadora = play / pausa (salvo escribiendo en un campo).
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return
      e.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, togglePlay])

  // ── Overlay en vivo (mismo render que la exportación) ───────────────────────
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    loadOverlayFonts().then(() => setFontsReady(true))
  }, [])
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, OUT_W, OUT_H)
    drawOverlays(ctx, items, time)
  }, [items, time, fontsReady, active])

  // ── Edición ───────────────────────────────────────────────────────────────────
  const setOverlay = (patch: Partial<OverlayConfig>) => {
    if (!selected) return
    setProject((p) => patchItem(p, selected.id, (i) => ({ ...i, overlay: { ...i.overlay, ...patch } })))
  }
  const addItem = () => {
    const start = Math.min(time, Math.max(0, duration - 1))
    const item = newOverlayItem(start, Math.min(duration, start + 3), selected ? { ...selected.overlay } : {})
    setProject((p) => ({
      ...p,
      selectedId: item.id,
      tracks: p.tracks.map((t) => (t.kind === 'overlay' ? { ...t, items: [...t.items, item] } : t)),
    }))
  }
  const removeItem = () => {
    if (!selected) return
    setProject((p) => {
      const tracks = p.tracks.map((t) => ({ ...t, items: t.items.filter((i) => i.id !== selected.id) }))
      const left = tracks.flatMap((t) => t.items)
      return { ...p, tracks, selectedId: left[0]?.id ?? null }
    })
  }

  // ── Exportación ───────────────────────────────────────────────────────────────
  const runExport = async () => {
    if (exp.busy) {
      abortRef.current?.abort()
      return
    }
    if (!url || !clip) {
      setExp((s) => ({ ...s, note: 'Subí un clip antes de exportar.' }))
      return
    }
    videoRef.current?.pause()
    abortRef.current = new AbortController()
    setExp({ busy: true, progress: 0, note: '' })
    try {
      const res = await exportVideo({ url, project, signal: abortRef.current.signal, onProgress: (progress) => setExp((s) => ({ ...s, progress })) })
      const base = clip.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').toLowerCase() || 'clip'
      downloadBlob(res.blob, `coachjp_video_${base}.${res.ext}`)
      setExp({ busy: false, progress: 1, note: `Exportado · ${res.ext.toUpperCase()} · ${(res.blob.size / 1024 / 1024).toFixed(1)} MB` })
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      setExp({ busy: false, progress: 0, note: aborted ? 'Exportación cancelada.' : err instanceof Error ? err.message : 'Falló la exportación.' })
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    loadFile(e.dataTransfer.files[0])
  }
  const mime = pickMime()
  const format = mime?.startsWith('video/mp4') ? 'MP4' : mime ? 'WEBM' : null

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* En celular: header arriba, después visor + timeline y el panel al final (con scroll de página). */}
      <div className="space-y-3 border-b border-line px-4 py-3 lg:hidden">{header}</div>
      {/* Panel lateral */}
      <aside className="order-2 flex shrink-0 flex-col border-t border-line bg-surface/40 lg:order-1 lg:w-[380px] lg:border-t-0 lg:border-r">
        <div className="hidden space-y-3 border-b border-line px-5 py-4 lg:block">{header}</div>
        <div className="tc-scroll flex-1 space-y-5 px-5 py-4 lg:overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan">[ V1 · VIDEO BASE ]</h3>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-cyan/50 py-2.5 font-mono text-[11px] font-semibold tracking-[0.12em] text-cyan transition hover:bg-cyan/10"
            >
              [ ⬆ SUBIR CLIP (.MP4 / .MOV) ]
            </button>
            <input ref={fileRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
            {clip && (
              <p className="font-mono text-[10px] leading-relaxed text-steel">
                {clip.name} · {clip.width}×{clip.height} · recorte {timecode(clip.in)} → {timecode(clip.out)}
              </p>
            )}
          </div>
          <OverlayPanel items={items} selected={selected} onSelect={(id) => setProject((p) => ({ ...p, selectedId: id }))} onChange={setOverlay} onAdd={addItem} onRemove={removeItem} />
          <div className="space-y-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={runExport}
              disabled={!clip && !exp.busy}
              className={`relative w-full overflow-hidden rounded-lg border py-3 font-mono text-[12px] font-bold tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                exp.busy ? 'border-fire/60 bg-fire/10 text-fire' : 'border-fire bg-fire text-carbon hover:brightness-110'
              }`}
            >
              {exp.busy && <span className="absolute inset-y-0 left-0 bg-fire/25" style={{ width: `${exp.progress * 100}%` }} />}
              <span className="relative">{exp.busy ? `[ RENDERIZANDO ${Math.round(exp.progress * 100)}% · CANCELAR ]` : '[ ⚡ EXPORTAR VIDEO TÁCTICO ]'}</span>
            </button>
            {exp.busy && (
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(exp.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-fire transition-[width]" style={{ width: `${exp.progress * 100}%` }} />
              </div>
            )}
            <p className="font-mono text-[9px] leading-relaxed text-steel/70">
              {exp.note ||
                (format
                  ? `Salida 1080×1920 · ${format}. El render es en tiempo real: dejá esta pestaña visible hasta que termine.`
                  : 'Este navegador no permite grabar video.')}
            </p>
          </div>
        </div>
      </aside>

      {/* Visor + timeline */}
      <main className="tc-grid-bg order-1 flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 lg:order-2 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.18em] text-steel">9:16 · 1080×1920 · REELS / SHORTS / STORIES</span>
          <button
            type="button"
            onClick={() => setProject((p) => ({ ...p, safeZone: !p.safeZone }))}
            aria-pressed={project.safeZone}
            className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] transition ${
              project.safeZone ? 'border-fire/70 bg-fire/15 text-fire' : 'border-line text-steel hover:text-white'
            }`}
          >
            [ 👁 REELS SAFE ZONE ]
          </button>
        </div>
        <div className="flex h-[64dvh] min-h-0 items-center justify-center lg:h-auto lg:flex-1">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative h-full max-h-full overflow-hidden rounded-xl bg-carbon shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] ring-1 ${dragOver ? 'ring-2 ring-cyan' : 'ring-line'}`}
            style={{ aspectRatio: '9 / 16', maxWidth: '100%' }}
          >
            {url ? (
              <video
                ref={videoRef}
                src={url}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                preload="auto"
                onLoadedMetadata={onMeta}
                onPlay={() => setPlaying(true)}
                onPause={() => {
                  setPlaying(false)
                  if (videoRef.current) setTime(videoRef.current.currentTime)
                }}
                onSeeked={() => videoRef.current && setTime(videoRef.current.currentTime)}
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="tc-grid-bg absolute inset-0 flex flex-col items-center justify-center gap-2 font-mono text-[11px] tracking-[0.14em] text-steel hover:text-cyan"
              >
                <span className="text-2xl">⬆</span>
                ARRASTRÁ UN CLIP O HACÉ CLIC
                <span className="text-[9px] text-steel/60">.MP4 · .MOV · .WEBM</span>
              </button>
            )}
            <canvas ref={canvasRef} width={OUT_W} height={OUT_H} className="pointer-events-none absolute inset-0 h-full w-full" />
            {project.safeZone && <ReelsSafeZone />}
          </div>
        </div>
        {/* Transporte */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-carbon/90 px-3 py-2">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!clip}
            aria-label={playing ? 'Pausa' : 'Reproducir'}
            title="Espaciadora"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan text-carbon disabled:opacity-40"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="shrink-0 font-mono text-[12px] tracking-wider text-white tabular-nums">
            {timecode(time)} <span className="text-steel">/ {timecode(duration)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={Math.min(time, duration)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Scrubber"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-fire"
          />
        </div>
        <Timeline
          tracks={project.tracks}
          clip={clip}
          duration={duration}
          time={time}
          thumbs={thumbs}
          selectedId={project.selectedId}
          onSeek={seek}
          onTrim={(i, o) => {
            // El visor muestra el frame del corte que se está moviendo.
            if (clip) seek(i !== clip.in ? i : o)
            setProject((p) => (p.clip ? { ...p, clip: { ...p.clip, in: i, out: o } } : p))
          }}
          onItem={(id, start, end) => setProject((p) => patchItem(p, id, (it) => ({ ...it, start, end })))}
          onSelect={(id) => setProject((p) => ({ ...p, selectedId: id }))}
        />
      </main>
    </div>
  )
}
