import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { downloadBlob } from '../lib/exporter'
import { loadAiSettings, RateLimitError, transcribeAudio } from '../lib/ai'
import { clipToWavBase64 } from './audio'
import { MusicPanel } from './MusicPanel'
import { SubtitlePanel } from './SubtitlePanel'
import { activeGroup, duckGain, editGroupText, groupWords, parseSubtitleFile, removeGroup, retimeGroup, speechSegments } from './subtitles'
import { exportVideo, extractThumbs, pickMime } from './exporter'
import { Accordion } from './Accordion'
import { activeAngles, drawBiomech, px as toPx } from './biomech'
import { BiomechPanel } from './BiomechPanel'
import { FxPanel } from './FxPanel'
import { FX_META, playFx } from './fx'
import { OverlayPanel } from './OverlayPanel'
import { defaultProject, findItem, fitToClip, newOverlayItem, overlayItems, patchItem, timelineDuration, uid } from './project'
import { ReelsSafeZone } from './ReelsSafeZone'
import { pressDrag } from './drag'
import { clampCenter, drawOverlays, drawSubtitles, loadOverlayFonts, timecode, type OverlayRect } from './render'
import { Scrubber } from './Scrubber'
import { Timeline } from './Timeline'
import type { Biomech, FxKind, Goniometer, MusicTrack, OverlayConfig, SoundFx, SubtitleTrack, Track, VideoProject } from './types'
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

/** Tactical Video Studio: reproductor 9:16, timeline V1/V2/S1/A2, overlays, subtítulos karaoke, música y exportación. */
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
  // S1 · subtítulos y A2 · música (el archivo de audio vive en memoria, como el clip).
  const subtitles = project.subtitles
  const groups = useMemo(() => groupWords(subtitles.words), [subtitles.words])
  const segments = useMemo(() => speechSegments(subtitles.words), [subtitles.words])
  const [musicUrl, setMusicUrl] = useState<string | null>(null)
  const music = musicUrl ? project.music : null
  const musicRef = useRef<HTMLAudioElement>(null)
  const musicLevel = useCallback((t: number) => (music ? (music.volume / 100) * (music.ducking ? duckGain(segments, t) : 1) : 0), [music, segments])
  /** La música arranca en el In del clip y sigue al video; corrige desvíos de más de 0,12 s. */
  const syncMusic = useCallback(
    (t: number, play: boolean) => {
      const a = musicRef.current
      if (!a || !music || !clip) return
      const want = t - clip.in
      if (want < 0 || want >= (a.duration || music.duration)) {
        if (!a.paused) a.pause()
        return
      }
      if (Math.abs(a.currentTime - want) > 0.12) a.currentTime = want
      a.volume = Math.min(1, Math.max(0, musicLevel(t)))
      if (play && a.paused) a.play().catch(() => undefined)
      if (!play && !a.paused) a.pause()
    },
    [music, clip, musicLevel],
  )

  // B1 · HUD biomecánico y A3 · Sound FX
  const bio = project.biomech
  const fx = project.fx
  const [tracing, setTracing] = useState(false)
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null)
  const setBio = (patch: Partial<Biomech>) => setProject((p) => ({ ...p, biomech: { ...p.biomech, ...patch } }))
  const setFx = (patch: Partial<SoundFx>) => setProject((p) => ({ ...p, fx: { ...p.fx, ...patch } }))
  // Motor de vista previa de los Sound FX (AudioContext propio, creado con el primer gesto).
  const fxCtx = useRef<{ ctx: AudioContext; bus: GainNode } | null>(null)
  const fxEngine = () => {
    if (!fxCtx.current) {
      const ctx = new AudioContext()
      const bus = ctx.createGain()
      bus.connect(ctx.destination)
      fxCtx.current = { ctx, bus }
    }
    const eng = fxCtx.current
    if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => undefined)
    eng.bus.gain.value = fxRef.current.volume / 100
    return eng
  }
  const fxPrev = useRef(0)
  const fxRef = useRef(fx)
  fxRef.current = fx

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
      syncMusic(next, false)
      fxPrev.current = next
    },
    [duration, url, syncMusic],
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
        syncMusic(v.currentTime, !v.paused)
        // A3: dispara los efectos cuyo instante cruzó el cabezal desde el frame anterior.
        const prev = fxPrev.current
        const now = v.currentTime
        if (now > prev && now - prev < 0.5) {
          const due = fxRef.current.hits.filter((h) => h.t > prev && h.t <= now)
          if (due.length) {
            const eng = fxEngine()
            due.forEach((h) => playFx(eng.ctx, h.kind, eng.ctx.currentTime, eng.bus))
          }
        }
        fxPrev.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      musicRef.current?.pause()
    }
  }, [playing, clip, syncMusic])

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
  const [rects, setRects] = useState<OverlayRect[]>([])
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, OUT_W, OUT_H)
    drawBiomech(ctx, bio, time, selectedAngle)
    const next = drawOverlays(ctx, items, time)
    drawSubtitles(ctx, subtitles, groups, time)
    setRects((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [items, time, fontsReady, active, subtitles, groups, bio, selectedAngle])

  // ── Arrastre libre en el visor (posición en % del marco, con imán al centro) ──
  const layerRef = useRef<HTMLDivElement>(null)
  const [guides, setGuides] = useState<{ v: boolean; h: boolean } | null>(null)
  const [hoverMove, setHoverMove] = useState(false)
  const toFrame = (clientX: number, clientY: number) => {
    const r = layerRef.current!.getBoundingClientRect()
    return { px: ((clientX - r.left) / r.width) * OUT_W, py: ((clientY - r.top) / r.height) * OUT_H }
  }
  const hitTest = (px: number, py: number) => [...rects].reverse().find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) ?? null
  /** Manija de goniómetro (articulación) bajo el puntero, si hay uno visible ahora. */
  const handleAt = (px: number, py: number) => {
    for (const g of [...activeAngles(bio, time)].reverse()) {
      for (const k of ['b', 'a', 'c'] as const) {
        const p = toPx(g[k])
        if (Math.hypot(p.x - px, p.y - py) < 44) return { id: g.id, k }
      }
    }
    return null
  }
  /** Agrega o reemplaza el punto del Bar Path en el instante actual del video. */
  const addPathPoint = (px: number, py: number) => {
    const t = videoRef.current?.currentTime ?? time
    const pt = { t, x: Math.min(100, Math.max(0, (px / OUT_W) * 100)), y: Math.min(100, Math.max(0, (py / OUT_H) * 100)) }
    setProject((p) => {
      const pts = p.biomech.path.points.filter((q) => Math.abs(q.t - t) > 1 / 60)
      return { ...p, biomech: { ...p.biomech, path: { ...p.biomech.path, points: [...pts, pt].sort((a, b) => a.t - b.t) } } }
    })
  }
  const onLayerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const { px, py } = toFrame(e.clientX, e.clientY)
    // Bar Path: click = un punto; mantener presionado mientras reproduce = trazo continuo.
    if (tracing) {
      addPathPoint(px, py)
      pressDrag(e, (ev) => {
        const pt = toFrame(ev.clientX, ev.clientY)
        addPathPoint(pt.px, pt.py)
      })
      return
    }
    // Goniómetro: arrastrar cada articulación.
    const handle = handleAt(px, py)
    if (handle) {
      setSelectedAngle(handle.id)
      setSections((st) => ({ ...st, b1: true }))
      pressDrag(e, (ev) => {
        const pt = toFrame(ev.clientX, ev.clientY)
        const pos = { x: Math.min(100, Math.max(0, (pt.px / OUT_W) * 100)), y: Math.min(100, Math.max(0, (pt.py / OUT_H) * 100)) }
        setProject((p) => ({ ...p, biomech: { ...p.biomech, angles: p.biomech.angles.map((g) => (g.id === handle.id ? { ...g, [handle.k]: pos } : g)) } }))
      })
      return
    }
    const hit = hitTest(px, py)
    if (!hit) {
      if (!url) fileRef.current?.click()
      return
    }
    setProject((p) => ({ ...p, selectedId: hit.id }))
    const offX = px - (hit.x + hit.w / 2)
    const offY = py - (hit.y + hit.h / 2)
    const SNAP = 18
    setGuides({ v: false, h: false })
    pressDrag(
      e,
      (ev) => {
        const pt = toFrame(ev.clientX, ev.clientY)
        let cx = pt.px - offX
        let cy = pt.py - offY
        const v = Math.abs(cx - OUT_W / 2) < SNAP
        const h = Math.abs(cy - OUT_H / 2) < SNAP
        if (v) cx = OUT_W / 2
        if (h) cy = OUT_H / 2
        // Límite: el bloque entero queda en el marco y nunca pisa la columna de acciones de Reels.
        ;({ cx, cy } = clampCenter(cx, cy, hit.w, hit.h))
        setGuides({ v, h })
        setProject((p) => patchItem(p, hit.id, (i) => ({ ...i, overlay: { ...i.overlay, x: (cx / OUT_W) * 100, y: (cy / OUT_H) * 100 } })))
      },
      () => setGuides(null),
    )
  }
  const onLayerHover = (e: ReactPointerEvent) => {
    // Sólo cambia el cursor: el hover nunca mueve nada.
    if (e.buttons) return
    const { px, py } = toFrame(e.clientX, e.clientY)
    const over = Boolean(hitTest(px, py) || handleAt(px, py))
    if (over !== hoverMove) setHoverMove(over)
  }
  const selRect = rects.find((r) => r.id === project.selectedId)

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
  /** Clona el bloque activo (tipo, estilo, tamaño, opacidad, animaciones y posición) y lo pone justo después. */
  const duplicateItem = () => {
    if (!selected) return
    const len = selected.end - selected.start
    // Inmediatamente después; si no entra antes del final, 1 s después del inicio del original.
    let start = selected.end
    if (start + len > duration) start = Math.min(selected.start + 1, Math.max(0, duration - len))
    const item = newOverlayItem(start, Math.min(duration, start + len), { ...selected.overlay, checks: selected.overlay.checks.map((c) => ({ ...c })) })
    setProject((p) => ({
      ...p,
      selectedId: item.id,
      tracks: p.tracks.map((t) => {
        if (t.kind !== 'overlay') return t
        const i = t.items.findIndex((x) => x.id === selected.id)
        return { ...t, items: i < 0 ? [...t.items, item] : [...t.items.slice(0, i + 1), item, ...t.items.slice(i + 1)] }
      }),
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

  // ── Panel en acordeones (V2 abierto por defecto cuando hay clip) ─────────────
  const [sections, setSections] = useState({ v2: false, s1: false, a2: false, b1: false, a3: false })
  const toggle = (k: keyof typeof sections) => setSections((st) => ({ ...st, [k]: !st[k] }))
  useEffect(() => {
    if (url) setSections((st) => ({ ...st, v2: true }))
  }, [url])
  const musicInputRef = useRef<HTMLInputElement>(null)

  // ── S1 · Subtítulos ───────────────────────────────────────────────────────────
  const [tr, setTr] = useState<{ busy: boolean; note: string }>({ busy: false, note: '' })
  const trAbort = useRef<AbortController | null>(null)
  const setSubs = (patch: Partial<SubtitleTrack>) => setProject((p) => ({ ...p, subtitles: { ...p.subtitles, ...patch } }))
  const runTranscribe = async () => {
    if (tr.busy) {
      trAbort.current?.abort()
      return
    }
    if (!url || !clip) return
    trAbort.current = new AbortController()
    setTr({ busy: true, note: '[ Extrayendo audio del tramo recortado… ]' })
    try {
      const { base64, duration: span } = await clipToWavBase64(url, clip.in, clip.out)
      const words = await transcribeAudio(loadAiSettings(), base64, span, trAbort.current.signal, (note) => note && setTr({ busy: true, note }))
      // Los tiempos vuelven relativos al audio recortado: se pasan al tiempo del clip.
      setSubs({ words: words.map((w) => ({ ...w, start: w.start + clip.in, end: w.end + clip.in })), enabled: true })
      setTr({ busy: false, note: words.length ? `${words.length} palabras transcriptas. Revisá los términos técnicos en la lista.` : 'No se detectó habla en el tramo recortado.' })
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      setTr({
        busy: false,
        note: aborted ? 'Transcripción cancelada.' : err instanceof RateLimitError ? 'Cuota de Gemini alcanzada. Esperá un momento o cambiá de key.' : err instanceof Error ? err.message : 'No se pudo transcribir.',
      })
    }
  }
  const importSubs = async (file: File) => {
    const words = parseSubtitleFile(await file.text())
    if (!words.length) {
      setTr({ busy: false, note: 'El archivo no tiene subtítulos con tiempos válidos (.srt / .vtt).' })
      return
    }
    setSubs({ words, enabled: true })
    setTr({ busy: false, note: `${file.name}: ${words.length} palabras importadas.` })
  }
  const current = activeGroup(groups, time)
  const activeIndex = current ? groups.indexOf(current) : -1

  // ── A2 · Música ───────────────────────────────────────────────────────────────
  const uploadMusic = (file: File) => {
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac)$/i.test(file.name)) {
      setTr((s) => ({ ...s, note: 'El archivo de música no es de audio (.mp3 / .wav).' }))
      return
    }
    if (musicUrl) URL.revokeObjectURL(musicUrl)
    const next = URL.createObjectURL(file)
    const probe = new Audio(next)
    probe.onloadedmetadata = () => {
      setMusicUrl(next)
      setProject((p) => ({ ...p, music: { name: file.name, duration: probe.duration, volume: p.music?.volume ?? 20, ducking: p.music?.ducking ?? true } }))
    }
  }
  const setMusic = (patch: Partial<MusicTrack>) => setProject((p) => (p.music ? { ...p, music: { ...p.music, ...patch } } : p))
  const removeMusic = () => {
    if (musicUrl) URL.revokeObjectURL(musicUrl)
    setMusicUrl(null)
    setProject((p) => ({ ...p, music: null }))
  }

  // ── B1 · Goniómetros ──────────────────────────────────────────────────────────
  const addAngle = () => {
    const start = Math.min(time, Math.max(0, duration - 0.5))
    const g: Goniometer = {
      id: `gon:${uid()}`,
      start,
      end: Math.min(duration, start + 2.5),
      a: { x: 44, y: 46 },
      b: { x: 58, y: 57 },
      c: { x: 50, y: 70 },
      label: 'PROFUNDIDAD VÁLIDA',
      color: 'orange',
    }
    setTracing(false)
    setSelectedAngle(g.id)
    setBio({ angles: [...bio.angles, g] })
  }
  const setAngle = (id: string, patch: Partial<Goniometer>) => setBio({ angles: bio.angles.map((g) => (g.id === id ? { ...g, ...patch } : g)) })

  // ── A3 · Sound FX ─────────────────────────────────────────────────────────────
  const addFx = (kind: FxKind) => {
    setFx({ hits: [...fx.hits, { id: `fx:${uid()}`, kind, t: Math.min(time, Math.max(0, duration - 0.05)) }] })
    const eng = fxEngine()
    playFx(eng.ctx, kind, eng.ctx.currentTime, eng.bus) // escucha inmediata
  }

  // Pistas que muestra el timeline: V1 + V2 del proyecto y S1 / A2 derivadas.
  const timelineTracks: Track[] = [
    ...project.tracks,
    { id: 's1', kind: 'subtitle', label: 'S1 · SUBTÍTULOS', items: groups.map((g, i) => ({ id: `s1-${i}`, type: 'subtitle', start: g.start, end: g.end, data: { text: g.text } })) },
    {
      id: 'a2',
      kind: 'audio',
      label: 'A2 · MÚSICA',
      items:
        music && clip
          ? [{ id: 'a2', type: 'audio', start: clip.in, end: Math.min(duration, clip.in + music.duration), data: { text: `${music.name} · ${music.volume}%`, volume: music.volume, segments: music.ducking ? segments : [] } }]
          : [],
    },
    {
      id: 'b1',
      kind: 'bio',
      label: 'B1 · HUD BIOMECÁNICO',
      items: [
        ...(bio.path.points.length > 1
          ? [{ id: 'barpath', type: 'bio' as const, start: bio.path.points[0].t, end: bio.path.points[bio.path.points.length - 1].t, data: { text: `BAR PATH · ${bio.path.points.length} pts` } }]
          : []),
        ...bio.angles.map((g) => ({ id: g.id, type: 'bio' as const, start: g.start, end: g.end, editable: 'range' as const, data: { text: `∠ ${g.label || 'ÁNGULO'}` } })),
      ],
    },
    {
      id: 'a3',
      kind: 'audio',
      label: 'A3 · SOUND FX',
      items: fx.hits.map((h) => ({ id: h.id, type: 'audio' as const, start: h.t, end: Math.min(duration, h.t + FX_META[h.kind].duration), editable: 'move' as const, data: { text: FX_META[h.kind].icon } })),
    },
  ]

  // Estados vacíos del timeline: abren su acordeón y disparan la acción.
  const placeholders = {
    s1: {
      label: clip ? '+ TRANSCRIBIR AUDIO' : '+ SUBÍ UN CLIP PARA TRANSCRIBIR',
      onClick: () => {
        setSections((st) => ({ ...st, s1: true }))
        if (clip) runTranscribe()
        else fileRef.current?.click()
      },
    },
    b1: {
      label: '+ TRAZAR BAR PATH / MEDIR ÁNGULO',
      onClick: () => setSections((st) => ({ ...st, b1: true })),
    },
    a3: {
      label: '+ AGREGAR SOUND FX',
      onClick: () => setSections((st) => ({ ...st, a3: true })),
    },
    a2: {
      label: '+ CARGAR BEAT',
      onClick: () => {
        setSections((st) => ({ ...st, a2: true }))
        musicInputRef.current?.click()
      },
    },
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
      const res = await exportVideo({ url, musicUrl, project, signal: abortRef.current.signal, onProgress: (progress) => setExp((s) => ({ ...s, progress })) })
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
      <aside className="order-2 flex shrink-0 flex-col border-t border-line bg-surface/40 lg:order-1 lg:min-h-0 lg:w-[380px] lg:border-t-0 lg:border-r">
        <div className="hidden space-y-3 border-b border-line px-5 py-4 lg:block">{header}</div>
        <div className="tc-scroll flex-1 space-y-3 px-5 py-4 lg:min-h-0 lg:overflow-y-auto">
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
          <Accordion title="V2 · OVERLAYS TÁCTICOS" badge={`${items.length} ${items.length === 1 ? 'BLOQUE' : 'BLOQUES'}`} open={sections.v2} onToggle={() => toggle('v2')}>
            <OverlayPanel items={items} selected={selected} onSelect={(id) => setProject((p) => ({ ...p, selectedId: id }))} onChange={setOverlay} onAdd={addItem} onRemove={removeItem} onDuplicate={duplicateItem} />
          </Accordion>
          <Accordion title="S1 · SUBTÍTULOS CINÉTICOS" badge={groups.length ? `${groups.length} BLOQUES` : 'VACÍO'} open={sections.s1} onToggle={() => toggle('s1')}>
            <SubtitlePanel
              track={subtitles}
              groups={groups}
              activeIndex={activeIndex}
              busy={tr.busy}
              note={tr.note}
              canTranscribe={Boolean(clip)}
              onChange={setSubs}
              onTranscribe={runTranscribe}
              onImport={importSubs}
              onSeek={seek}
              onEditText={(g, text) => setSubs({ words: editGroupText(subtitles.words, g, text) })}
              onRetime={(g, a, b) => setSubs({ words: retimeGroup(subtitles.words, g, Math.max(0, a), Math.max(0, b)) })}
              onRemove={(g) => setSubs({ words: removeGroup(subtitles.words, g) })}
            />
          </Accordion>
          <Accordion title="A2 · MÚSICA & BEAT" badge={music ? `${music.volume}%${music.ducking ? ' · DUCKING' : ''}` : 'VACÍO'} open={sections.a2} onToggle={() => toggle('a2')}>
            <MusicPanel music={music} hasSpeech={segments.length > 0} onPick={() => musicInputRef.current?.click()} onChange={setMusic} onRemove={removeMusic} />
          </Accordion>
          <Accordion
            title="B1 · BIOMECÁNICA HUD"
            badge={[bio.path.points.length ? `${bio.path.points.length} PTS` : '', bio.angles.length ? `${bio.angles.length} ∠` : ''].filter(Boolean).join(' · ') || 'VACÍO'}
            open={sections.b1}
            onToggle={() => toggle('b1')}
          >
            <BiomechPanel
              bio={bio}
              tracing={tracing}
              selectedAngle={selectedAngle}
              canEdit={Boolean(clip)}
              onToggleTrace={() => setTracing((v) => !v)}
              onChange={setBio}
              onAddAngle={addAngle}
              onSelectAngle={setSelectedAngle}
              onAngle={setAngle}
              onRemoveAngle={(id) => {
                setBio({ angles: bio.angles.filter((g) => g.id !== id) })
                setSelectedAngle(null)
              }}
            />
          </Accordion>
          <Accordion title="A3 · SOUND FX TÁCTICOS" badge={fx.hits.length ? `${fx.hits.length} FX · ${fx.volume}%` : 'VACÍO'} open={sections.a3} onToggle={() => toggle('a3')}>
            <FxPanel fx={fx} time={time} onAdd={addFx} onChange={setFx} onRemove={(id) => setFx({ hits: fx.hits.filter((h) => h.id !== id) })} />
          </Accordion>
          <input
            ref={musicInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadMusic(f)
              e.target.value = ''
            }}
          />
        </div>
        {/* Exportar siempre a la vista: pie fijo del panel. */}
        <div className="sticky bottom-0 z-10 space-y-2 border-t border-line bg-carbon/95 px-5 py-3 backdrop-blur">
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
      </aside>

      {/* Visor + timeline */}
      {/* En escritorio el visor se lleva todo el alto libre: sin barra superior y con márgenes mínimos. */}
      <main className="tc-grid-bg order-1 flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 lg:order-2 lg:gap-2 lg:px-5 lg:py-3">
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
            {/* Capa de interacción: tomar y arrastrar overlays (sin clip, un click abre el selector de archivo). */}
            <div
              ref={layerRef}
              onPointerDown={onLayerDown}
              onPointerMove={onLayerHover}
              onPointerLeave={() => setHoverMove(false)}
              className="absolute inset-0"
              style={{ cursor: tracing ? 'crosshair' : guides ? 'grabbing' : hoverMove ? 'grab' : url ? 'default' : 'pointer', touchAction: 'none' }}
            >
              {selRect && (
                <div
                  className="pointer-events-none absolute border border-dashed border-cyan/80"
                  style={{ left: `${(selRect.x / OUT_W) * 100}%`, top: `${(selRect.y / OUT_H) * 100}%`, width: `${(selRect.w / OUT_W) * 100}%`, height: `${(selRect.h / OUT_H) * 100}%` }}
                />
              )}
              {guides && (
                <>
                  <div className={`pointer-events-none absolute inset-y-0 left-1/2 w-px ${guides.v ? 'bg-cyan' : 'bg-cyan/25'}`} />
                  <div className={`pointer-events-none absolute inset-x-0 top-1/2 h-px ${guides.h ? 'bg-cyan' : 'bg-cyan/25'}`} />
                </>
              )}
            </div>
            {project.safeZone && <ReelsSafeZone />}
          </div>
        </div>
        {/* Transporte */}
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-line bg-carbon/90 px-3 py-1.5">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!clip}
            aria-label={playing ? 'Pausa' : 'Reproducir'}
            title="Espaciadora"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan text-carbon disabled:opacity-40"
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
          <Scrubber time={Math.min(time, duration)} duration={duration} trim={clip} onSeek={seek} />
          <button
            type="button"
            onClick={() => setProject((p) => ({ ...p, safeZone: !p.safeZone }))}
            aria-pressed={project.safeZone}
            title="Zonas tapadas por la interfaz de Instagram Reels"
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap transition ${
              project.safeZone ? 'border-fire/70 bg-fire/15 text-fire' : 'border-line text-steel hover:text-white'
            }`}
          >
            [ 👁 <span className="hidden sm:inline">REELS </span>SAFE ZONE ]
          </button>
        </div>
        {musicUrl && <audio ref={musicRef} src={musicUrl} preload="auto" hidden />}
        <Timeline
          tracks={timelineTracks}
          placeholders={placeholders}
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
          onItem={(id, start, end) => {
            if (id.startsWith('gon:')) setProject((p) => ({ ...p, biomech: { ...p.biomech, angles: p.biomech.angles.map((g) => (g.id === id ? { ...g, start, end } : g)) } }))
            else if (id.startsWith('fx:')) setProject((p) => ({ ...p, fx: { ...p.fx, hits: p.fx.hits.map((h) => (h.id === id ? { ...h, t: start } : h)) } }))
            else setProject((p) => patchItem(p, id, (it) => ({ ...it, start, end })))
          }}
          onSelect={(id) => {
            if (id.startsWith('gon:')) {
              setSelectedAngle(id)
              setSections((st) => ({ ...st, b1: true }))
            } else if (!id.startsWith('fx:')) setProject((p) => ({ ...p, selectedId: id }))
          }}
        />
      </main>
    </div>
  )
}
