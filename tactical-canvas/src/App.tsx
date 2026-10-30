import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BrandBar } from './components/BrandBar'
import { ModeSwitch, type WorkMode } from './components/ModeSwitch'
import { ControlPanel } from './components/controls/ControlPanel'
import { Segmented } from './components/controls/primitives'
import { ExportButtons } from './components/ExportButtons'
import { Preview } from './components/Preview'
import { AiGenerator } from './components/AiGenerator'
import { SlideBar } from './components/SlideBar'
import { DEFAULT_STATE } from './defaults'
import { harmonizeChart } from './lib/chartPillar'
import { migrateDiagram } from './lib/diagramPillar'
import { deriveBookmarkPoints, resolveBookmark } from './lib/bookmark'
import { DEFAULT_AI_SETTINGS, regenerateSlide, type AiSettings, type Discipline, type EditorialTone, type GenerationResult } from './lib/ai'
import { ASPECTS } from './lib/brand'
import { canShareFiles, downloadBlob, renderPng, shareBlobs, slugify } from './lib/exporter'
import { zipFiles } from './lib/zip'
import { remixToStories } from './lib/remix'
import { ctaSlide, diagnose, SCORE_COLOR, trimSlide, type DoctorFix } from './lib/retentionDoctor'
import { RetentionDoctor } from './components/RetentionDoctor'
import { buildPackSlides, packBackgroundUrl, packDayFor, WEEKLY_PACK } from './lib/weeklyPack'
import { WeekDayBar } from './components/WeekDayBar'
import { usePhotoLuma } from './hooks/usePhotoLuma'
import { CaptionBar } from './components/CaptionBar'
import { BrandKitBar } from './components/controls/BrandKitBar'
import { dropLegacyBackground, pruneBackgrounds, readLegacyBackground, useBackgroundImages } from './hooks/useBackgroundImage'
import { useMediaQuery } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import type { AspectId, CanvasState, Nudge, NudgeTarget } from './types'

const STORAGE_KEY = 'jp-tactical-canvas:v3'

// Video Studio en un chunk aparte: el editor de placas no carga su código hasta que se usa.
const VideoStudio = lazy(() => import('./video/VideoStudio'))

/** Ajustes de estilo que comparten todos los slides de una secuencia. */
const GLOBAL_KEYS = [
  'aspect',
  'headlineFont',
  'headlineScale',
  'floatingPlate',
  'contentAlign',
  'contentGap',
  'theme',
  'slideCounter',
  'seamlessThread',
  'panoramaImageId',
] as const

/** Fondo de cada placa: foto, capa, encuadre y tratamiento. Nunca se propaga a las demás al editar. */
const BG_KEYS = ['bgImageId', 'bgStyle', 'bgOverlay', 'bgGradient', 'bgVignette', 'bgMono', 'bgZoom', 'bgX', 'bgY'] as const

/** Lo que replica [ 📋 COPIAR ESTILO ]: tipografía, viñeta / contraste de la foto y paleta de acentos. */
const STYLE_KEYS = [
  'headlineFont',
  'headlineScale',
  'typePreset',
  'remateNewLine',
  'bgVignette',
  'bgOverlay',
  'bgGradient',
  'bgMono',
  'accentSwap',
  'metricAccent',
  'diagramAccent',
  'repeatAccent',
] as const

interface Deck {
  slides: CanvasState[]
  active: number
  /** Copy de Instagram generado por la IA para toda la pieza */
  caption?: string
  /** Tema y enfoque de la última generación con IA (para re-generar una placa con coherencia) */
  topic?: string
  discipline?: Discipline
  /** Día del Plan Semanal al que pertenece este set (sus ediciones se guardan en ese día) */
  packDay?: string
}

/** Proyectos del Plan Semanal: el set de cada día con las ediciones del usuario + el id de su fondo. */
interface WeeklyStore {
  decks: Record<string, Deck>
  bg: Record<string, string>
}

const DEFAULT_DECK: Deck = { slides: [DEFAULT_STATE], active: 0, caption: '' }
/** Caption de respaldo para el ZIP cuando no hubo generación con IA: gancho, puntos y CTA. */
function fallbackCaption(slides: CanvasState[]) {
  const clean = (t: string) => t.replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const title = (s: CanvasState) => clean(s.template === 'repeat' ? s.repeatPhrase : `${s.headlineA} ${s.headlineB}`)
  const [first, ...rest] = slides
  const lines = [title(first)]
  if (clean(first.body)) lines.push('', clean(first.body))
  const points = rest.map((s) => `▸ ${title(s)}`).filter((l) => l.length > 2)
  if (points.length) lines.push('', ...points)
  lines.push('', 'Guardá este post y compartilo con quien lo necesite.', '', '@coachjp.training')
  return lines.join('\n')
}

/** Aplica fixes del Doctor de retención sobre el deck (el CTA va último: agrega una placa al final). */
function applyFixes(d: Deck, fixes: DoctorFix[]): Deck {
  let slides = d.slides.map((s) => ({ ...DEFAULT_STATE, ...s }) as CanvasState)
  const moved: string[] = []
  let active = d.active
  for (const f of [...fixes].sort((a, b) => Number(a.kind === 'cta') - Number(b.kind === 'cta'))) {
    if (f.kind === 'cta') {
      slides = [...slides, ctaSlide(slides[slides.length - 1])]
      active = slides.length - 1
      continue
    }
    const i = f.slide
    if (!slides[i]) continue
    let patch: Partial<CanvasState> = {}
    if (f.kind === 'trim') {
      const t = trimSlide(slides[i], i === 0 && slides.length > 1)
      patch = t.patch
      if (t.removed.trim()) moved.push(t.removed.trim())
    } else if (f.kind === 'swap') patch = { template: f.to }
    else if (f.kind === 'contrast') patch = { bgOverlay: f.overlay, bgGradient: true }
    slides = slides.map((s, j) => (j === i ? { ...s, ...patch } : s))
  }
  // Lo recortado no se pierde: pasa al caption, donde se lee con calma.
  const caption = moved.length ? [d.caption?.trim(), ...moved].filter(Boolean).join('\n\n') : d.caption
  return { ...d, slides, active, caption }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [deck, setDeck] = usePersistentState<Deck>(STORAGE_KEY, DEFAULT_DECK)
  const [weekly, setWeekly] = usePersistentState<WeeklyStore>('jp-tactical-canvas:weekly-decks', { decks: {}, bg: {} })
  const slides = deck.slides.length ? deck.slides.map((s) => ({ ...DEFAULT_STATE, ...migrateDiagram(s) }) as CanvasState) : [DEFAULT_STATE]
  const active = Math.min(deck.active, slides.length - 1)
  const state = slides[active]
  // Placa de guardado sin viñetas propias: se extraen del resto del carrusel en cada render.
  const bookmarkAuto = state.template === 'bookmark' ? deriveBookmarkPoints(slides, active) : []
  const canvasState: CanvasState =
    state.template === 'bookmark' && !state.bookmarkData ? { ...state, bookmarkData: resolveBookmark(state, slides, active) } : state
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  // Modo de trabajo: placas o video. Cada uno conserva su estado al alternar.
  const [modeState, setModeState] = usePersistentState<{ mode: WorkMode }>('jp-tactical-canvas:mode', { mode: 'canvas' })
  const mode = modeState.mode
  const [videoVisited, setVideoVisited] = useState(mode === 'video')
  const setMode = (m: WorkMode) => {
    if (m === 'video') setVideoVisited(true)
    setModeState({ mode: m })
  }
  // Simulador de UI de Instagram (sólo pantalla; nunca entra en el PNG ni en el ZIP).
  const [overlay, setOverlay] = useState(false)
  // Guía de recorte de la grilla del perfil (sólo pantalla; nunca entra en el PNG).
  const [gridGuide, setGridGuide] = useState(false)
  // Fotos de todas las placas: fondo y las imágenes propias de Error vs Corrección.
  const bg = useBackgroundImages(slides.flatMap((s) => [s.bgImageId, s.fixWrongImageId, s.fixRightImageId, s.panoramaImageId]).filter((id): id is string => Boolean(id)))
  const bgImage = bg.get(state.bgImageId)
  // Doctor de retención: diagnóstico en vivo del set (la foto de cada placa se mide una vez).
  const photoId = (s: CanvasState) => s.panoramaImageId ?? ((s.bgStyle ?? 'photo') === 'photo' ? s.bgImageId : null)
  const luma = usePhotoLuma(slides.map(photoId), bg.get)
  const report = diagnose(slides, (i) => luma(photoId(slides[i])))
  const [doctorOpen, setDoctorOpen] = usePersistentState<{ open: boolean }>('jp-tactical-canvas:doctor', { open: true })
  const doctorRef = useRef<HTMLDivElement>(null)
  // Una sola vez: la foto global de versiones anteriores pasa a ser la foto propia de cada placa
  // existente (se ven igual que antes, pero desde ahora cada una se cambia por separado).
  const migrated = useRef(false)
  useEffect(() => {
    if (migrated.current) return
    migrated.current = true
    const legacy = readLegacyBackground()
    // Todas las fotos referenciadas (fondo + Error vs Corrección): ninguna se borra en la limpieza.
    const ids = deck.slides.flatMap((s) => [s.bgImageId, s.fixWrongImageId, s.fixRightImageId, s.panoramaImageId]).filter((id): id is string => Boolean(id))
    // Los proyectos guardados del Plan Semanal (y sus fondos) también se conservan.
    ids.push(...Object.values(weekly.bg), ...Object.values(weekly.decks).flatMap((d) => d.slides.flatMap((s) => [s.bgImageId, s.fixWrongImageId, s.fixRightImageId, s.panoramaImageId]).filter((id): id is string => Boolean(id))))
    if (!legacy) {
      void pruneBackgrounds(ids)
      return
    }
    const { id, saved } = bg.add(legacy)
    setDeck((d) => ({ ...d, slides: d.slides.map((s) => (s.bgImageId ? s : { ...s, bgImageId: id })) }))
    void saved.then((ok) => {
      if (!ok) return
      dropLegacyBackground()
      void pruneBackgrounds([...ids, id])
    })
  }, [bg, deck.slides, setDeck])

  const update = useCallback(
    (patch: Partial<CanvasState>) =>
      setDeck((d) => {
        const globals: Partial<CanvasState> = {}
        for (const k of GLOBAL_KEYS) if (k in patch) Object.assign(globals, { [k]: patch[k] })
        const i = Math.min(d.active, d.slides.length - 1)
        return {
          ...d,
          slides: d.slides.map((s, j) => ({ ...s, ...globals, ...(j === i ? patch : {}) })),
        }
      }),
    [setDeck],
  )
  const reset = useCallback(() => setDeck(DEFAULT_DECK), [setDeck])

  // Plan Semanal: cada edición del set de un día queda guardada en su proyecto.
  useEffect(() => {
    if (!deck.packDay) return
    setWeekly((w) => (w.decks[deck.packDay!] === deck ? w : { ...w, decks: { ...w.decks, [deck.packDay!]: deck } }))
  }, [deck, setWeekly])

  /** Fondo táctico del día: se descarga una vez (SVG del pack), se guarda en IndexedDB y se reutiliza. */
  const packBackground = async (dayId: string): Promise<string | null> => {
    const known = weekly.bg[dayId]
    if (known) return known
    const day = WEEKLY_PACK.find((d) => d.id === dayId)
    if (!day) return null
    try {
      const svg = await (await fetch(packBackgroundUrl(day))).text()
      if (!svg.includes('<svg')) return null
      const { id } = bg.add(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`)
      setWeekly((w) => ({ ...w, bg: { ...w.bg, [dayId]: id } }))
      return id
    } catch {
      return null // sin red: el set se arma igual con los fondos tácticos propios de cada plantilla
    }
  }

  /**
   * [ 📅 CARGAR DÍA ]: muestra al instante el set diseñado del día. Si ya lo editaste, vuelve tu versión;
   * «restaurar» descarta tus cambios y lo arma de nuevo desde el pack.
   */
  const loadDay = async (dayId: string, restore = false) => {
    const day = WEEKLY_PACK.find((d) => d.id === dayId)
    if (!day) return
    const saved = weekly.decks[dayId]
    if (saved && !restore) return setDeck({ ...saved, active: 0 })
    const bgId = await packBackground(dayId)
    setDeck({
      slides: buildPackSlides(day, DEFAULT_STATE, bgId),
      active: 0,
      caption: day.caption,
      topic: day.theme,
      discipline: deck.discipline,
      packDay: dayId,
    })
  }
  /** Foto nueva SÓLO para la placa activa (null = quitarla de esta placa). */
  const setBgImage = useCallback(
    (img: string | null) => {
      if (!img) return update({ bgImageId: null })
      update({ bgImageId: bg.add(img).id })
    },
    [bg, update],
  )
  /** [ 📋 COPIAR ESTILO A TODAS LAS PLACAS ]: tipografía, viñeta y paleta de acentos de la placa activa. */
  const copyStyle = useCallback(
    () =>
      setDeck((d) => {
        const src = { ...DEFAULT_STATE, ...d.slides[Math.min(d.active, d.slides.length - 1)] }
        const style: Partial<CanvasState> = {}
        for (const k of STYLE_KEYS) Object.assign(style, { [k]: src[k] })
        return { ...d, slides: d.slides.map((s) => ({ ...s, ...style })) }
      }),
    [setDeck],
  )
  /** [ KIT DE MARCA ]: aplica un preset visual a TODAS las placas (nunca toca contenido ni imágenes). */
  const applyKit = useCallback(
    (patch: Partial<CanvasState>) => setDeck((d) => ({ ...d, slides: d.slides.map((s) => ({ ...s, ...patch })) })),
    [setDeck],
  )
  /** Ajuste fino desde el lienzo (null = volver a la posición y escala original). */
  const nudge = useCallback(
    (target: NudgeTarget, n: Nudge | null) =>
      setDeck((d) => {
        const i = Math.min(d.active, d.slides.length - 1)
        return {
          ...d,
          slides: d.slides.map((s, j) => {
            if (j !== i) return s
            const next = { ...s.nudge }
            if (n) next[target] = n
            else delete next[target]
            return { ...s, nudge: Object.keys(next).length ? next : undefined }
          }),
        }
      }),
    [setDeck],
  )

  const applyGeneration = useCallback(
    (r: GenerationResult, meta?: { topic: string; discipline: Discipline }) =>
      setDeck((d) => {
        const current = { ...DEFAULT_STATE, ...d.slides[Math.min(d.active, d.slides.length - 1)] }
        const globals: Partial<CanvasState> = {}
        for (const k of GLOBAL_KEYS) Object.assign(globals, { [k]: current[k] })
        // El set nuevo arranca con el fondo de la placa activa (luego cada placa se edita por separado).
        for (const k of BG_KEYS) Object.assign(globals, { [k]: current[k] })
        // Identidad de marca: todo set nuevo arranca con titulares en Chakra Petch (se puede cambiar a mano).
        globals.headlineFont = 'chakra'
        globals.typePreset = 'none'
        if (r.format === 'stories') globals.aspect = 'story'
        if (r.format === 'carousel') globals.aspect = 'feed'
        const discipline = meta?.discipline ?? d.discipline ?? 'general'
        return {
          // Los gráficos de la IA se ponen en caja (rango, zona, barras) antes de mostrarse.
          slides: r.slides.map((p) => {
            const s = { ...DEFAULT_STATE, ...globals, ...p }
            // Todas las placas traen su nodo de gráfico (multiformato): se armoniza siempre.
            return { ...s, chart: harmonizeChart(s.chart, discipline) }
          }),
          active: 0,
          caption: r.caption,
          packDay: undefined,
          topic: meta?.topic ?? d.topic,
          discipline: meta?.discipline ?? d.discipline,
        }
      }),
    [setDeck],
  )

  /** Pilar activo: el chip del generador IA si está marcado; si no, el de la última generación. */
  const getDiscipline = useCallback((): Discipline => {
    try {
      const chip = (JSON.parse(localStorage.getItem('jp-tactical-canvas:ai-mode') ?? '{}') as { discipline?: Discipline }).discipline
      if (chip && chip !== 'general') return chip
    } catch {
      /* sin preferencia guardada */
    }
    return deck.discipline ?? 'general'
  }, [deck.discipline])

  /** Mueve la placa activa una posición (◀ / ▶) y la sigue seleccionando. */
  const moveSlide = (dir: -1 | 1) =>
    setDeck((d) => {
      const i = Math.min(d.active, d.slides.length - 1)
      const j = i + dir
      if (j < 0 || j >= d.slides.length) return d
      const next = [...d.slides]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...d, slides: next, active: j }
    })

  const selectSlide = (i: number) => setDeck((d) => ({ ...d, active: i }))
  const addSlide = () =>
    setDeck((d) => ({ ...d, slides: [...d.slides.slice(0, active + 1), { ...state }, ...d.slides.slice(active + 1)], active: active + 1 }))
  const removeSlide = () =>
    setDeck((d) => (d.slides.length > 1 ? { ...d, slides: d.slides.filter((_, i) => i !== active), active: Math.max(0, active - 1) } : d))
  const setCaption = (caption: string) => setDeck((d) => ({ ...d, caption }))
  const caption = deck.caption ?? ''

  /** Recorre la secuencia y renderiza cada placa a 4x con nombre numerado (prefix = carpeta del ZIP). */
  const renderAll = async (aspect: AspectId = state.aspect, prefix = '', label = 'RENDER') => {
    const { w, h } = ASPECTS[aspect]
    const files: { blob: Blob; name: string }[] = []
    for (let i = 0; i < slides.length; i++) {
      setExporting(`${label} ${i + 1}/${slides.length}…`)
      selectSlide(i)
      await wait(450) // deja que React pinte y el auto-ajuste converja
      if (!canvasRef.current) continue
      // Cada placa tiene su propia foto: se espera a que esté decodificada antes de rasterizar.
      await Promise.all([...canvasRef.current.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)))
      const { blob } = await renderPng(canvasRef.current, w, h)
      const s = slides[i]
      files.push({ blob, name: `${prefix}coachjp_${String(i + 1).padStart(2, '0')}_${s.template}_${slugify(`${s.headlineA} ${s.headlineB}`)}.png` })
    }
    return files
  }

  /** [ ⇅ REMIX 9:16 ]: el set pasa a historias con reacomodo vertical y zonas de sticker. */
  const remix = () => setDeck((d) => ({ ...d, slides: remixToStories(d.slides.map((s) => ({ ...DEFAULT_STATE, ...s }) as CanvasState)) }))

  /**
   * ZIP unificado: /feed_4x5/ + /stories_9x16/ + caption.txt. Renderiza el set en los dos formatos
   * (las historias con sus stickers o, si nunca se remixó, con la asignación automática) y al final
   * devuelve el deck exactamente como estaba.
   */
  const runDual = async () => {
    const back = active
    const snapshot = deck.slides
    const full = snapshot.map((s) => ({ ...DEFAULT_STATE, ...s }) as CanvasState)
    try {
      setDeck((d) => ({ ...d, slides: full.map((s) => ({ ...s, aspect: 'feed' })) }))
      await wait(300)
      const feed = await renderAll('feed', 'feed_4x5/', 'FEED')
      setDeck((d) => ({ ...d, slides: remixToStories(full) }))
      await wait(300)
      const stories = await renderAll('story', 'stories_9x16/', 'HISTORIA')
      setExporting('EMPAQUETANDO .ZIP…')
      const extras = [{ name: 'caption.txt', text: caption.trim() ? caption : fallbackCaption(slides) }]
      const zip = await zipFiles([...feed, ...stories], extras)
      downloadBlob(zip, `coachjp_feed+historias_${slugify(`${slides[0].headlineA} ${slides[0].headlineB}`)}.zip`)
    } catch (err) {
      console.error(err)
      alert('Falló la exportación Feed + Historias.')
    } finally {
      setDeck((d) => ({ ...d, slides: snapshot, active: back }))
      setExporting(null)
    }
  }

  const runBatch = async (kind: 'png' | 'zip') => {
    const back = active
    try {
      const files = await renderAll()
      if (kind === 'zip') {
        setExporting('EMPAQUETANDO .ZIP…')
        const first = slides[0]
        // caption.txt siempre: el de la IA o, si no hay, uno armado con los textos de las placas.
        const extras = [{ name: 'caption.txt', text: caption.trim() ? caption : fallbackCaption(slides) }]
        const zip = await zipFiles(files, extras)
        downloadBlob(zip, `coachjp_${state.aspect === 'story' ? 'historias' : 'carrusel'}_${slugify(`${first.headlineA} ${first.headlineB}`)}.zip`)
      } else if (!isDesktop && canShareFiles()) {
        try {
          await shareBlobs(files)
        } catch (err) {
          if (!(err instanceof DOMException && err.name === 'AbortError')) files.forEach((f) => downloadBlob(f.blob, f.name))
        }
      } else {
        for (const f of files) {
          downloadBlob(f.blob, f.name)
          await wait(250)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Falló la exportación de la secuencia.')
    } finally {
      selectSlide(back)
      setExporting(null)
    }
  }

  const [regen, setRegen] = useState<{ busy: boolean; note: string }>({ busy: false, note: '' })
  const regenAbort = useRef<AbortController | null>(null)

  /** Re-genera sólo la placa activa con IA; el resto de la secuencia queda intacto. */
  const regenerateActive = async () => {
    if (regen.busy) {
      regenAbort.current?.abort()
      return
    }
    let settings: AiSettings = DEFAULT_AI_SETTINGS
    try {
      const raw = JSON.parse(localStorage.getItem('jp-tactical-canvas:ai') ?? '{}') as Partial<AiSettings>
      settings = { ...DEFAULT_AI_SETTINGS, ...raw, keys: { ...DEFAULT_AI_SETTINGS.keys, ...raw.keys }, models: { ...DEFAULT_AI_SETTINGS.models, ...raw.models } }
    } catch {
      /* se usan los defaults */
    }
    const index = active
    const slide = slides[index]
    const topic = deck.topic?.trim() || `${slide.headlineA} ${slide.headlineB}`.replace(/\*/g, '').trim()
    regenAbort.current = new AbortController()
    setRegen({ busy: true, note: '' })
    try {
      const patch = await regenerateSlide(
        settings,
        {
          topic,
          discipline: deck.discipline ?? 'general',
          slide,
          index,
          others: slides.map((s, i) => ({ index: i, title: `${s.headlineA} ${s.headlineB}`.trim() })).filter((o) => o.index !== index),
          tone: (() => {
            try {
              return (JSON.parse(localStorage.getItem('jp-tactical-canvas:ai-mode') ?? '{}') as { tone?: EditorialTone }).tone ?? 'viral'
            } catch {
              return 'viral' as const
            }
          })(),
        },
        regenAbort.current.signal,
        (note) => note && setRegen({ busy: true, note }),
      )
      // El payload trae datos de todas las plantillas: se aplican todos, pero la placa conserva su
      // plantilla, el subtipo de diagrama y el modo de repetición que eligió el usuario.
      const safe: Partial<CanvasState> = { ...patch, template: slide.template, diagramKind: slide.diagramKind, repeatMode: slide.repeatMode }
      for (const k of [...GLOBAL_KEYS, ...BG_KEYS]) delete (safe as Record<string, unknown>)[k]
      if (safe.chart) safe.chart = harmonizeChart(safe.chart, deck.discipline ?? 'general')
      setDeck((d) => ({ ...d, slides: d.slides.map((s, i) => (i === index ? { ...DEFAULT_STATE, ...s, ...safe } : s)) }))
      setRegen({ busy: false, note: `Placa ${index + 1} re-generada ✓` })
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      const note = aborted ? '' : err instanceof Error ? err.message : 'No se pudo re-generar.'
      setRegen({ busy: false, note })
      // En pantallas chicas la nota no entra en la barra: se avisa con un alert.
      if (note && !isDesktop) window.alert(note)
    }
    window.setTimeout(() => setRegen((r) => (r.busy ? r : { busy: false, note: '' })), 9000)
  }

  const slideBar = (trailing?: ReactNode) => (
    <SlideBar
      trailing={trailing}
      count={slides.length}
      active={active}
      onSelect={selectSlide}
      onAdd={addSlide}
      onRemove={removeSlide}
      onExportAll={() => runBatch('png')}
      onExportZip={() => runBatch('zip')}
      onExportDual={runDual}
      onRegenerate={regenerateActive}
      onMove={moveSlide}
      regenBusy={regen.busy}
      regenNote={regen.note}
      exporting={exporting}
    />
  )

  const fixDoctor = (fixes: DoctorFix[]) => setDeck((d) => applyFixes(d, fixes))
  const showDoctor = () => {
    setDoctorOpen({ open: true })
    setDrawerOpen(true)
    window.setTimeout(() => doctorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const panel = (
    <>
      <AiGenerator onResult={applyGeneration} onLoadDay={(id) => void loadDay(id, true)} onBurst={(b) => update({ headlineA: b.white, headlineB: b.accent })} />
      <RetentionDoctor
        ref={doctorRef}
        report={report}
        active={active}
        open={doctorOpen.open}
        onToggle={() => setDoctorOpen({ open: !doctorOpen.open })}
        onSelect={selectSlide}
        onFix={(f) => fixDoctor([f])}
        onFixAll={() => fixDoctor(report.findings.flatMap((f) => (f.fix ? [f.fix] : [])))}
      />
      <BrandKitBar state={state} onApply={applyKit} slideCount={slides.length} />
      <ControlPanel
        state={state}
        update={update}
        onReset={reset}
        bgImage={bgImage}
        setBgImage={setBgImage}
        addImage={(img) => bg.add(img).id}
        resolveImage={bg.get}
        bgPersisted={bg.persisted}
        getDiscipline={getDiscipline}
        slideIndex={active}
        topic={deck.topic?.trim() || `${slides[0].headlineA} ${slides[0].headlineB}`.replace(/\*/g, '').trim()}
        bookmarkAuto={bookmarkAuto}
        onCopyStyle={copyStyle}
        slideCount={slides.length}
        onCaption={setCaption}
      />
    </>
  )

  const aspectToggle = (
    <Segmented<AspectId>
      value={state.aspect}
      onChange={(aspect) => update({ aspect })}
      options={[
        { value: 'feed', label: isDesktop ? '4:5 FEED' : '4:5' },
        { value: 'story', label: isDesktop ? '9:16 STORY' : '9:16' },
      ]}
      size="sm"
    />
  )

  const overlayToggle = (
    <>
    <button
      type="button"
      onClick={showDoctor}
      title={`Doctor de retención: ${report.score}/100 · ${report.findings.length} hallazgo(s). Revisalo antes de exportar.`}
      className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-steel transition hover:text-white"
    >
      🩺
      <span className="rounded px-1 text-[10px] font-bold text-carbon" style={{ background: SCORE_COLOR(report.score) }}>
        {report.score}
      </span>
    </button>
    {state.aspect === 'feed' && (
      <button
        type="button"
        onClick={remix}
        title="Convierte todo el carrusel 4:5 en historias 9:16: reacomoda el texto en vertical y reserva zonas para stickers (encuesta, preguntas, link)"
        className="rounded-lg border border-gold/60 bg-gold/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-gold transition hover:bg-gold/20"
      >
        {isDesktop ? '[ ⇅ REMIX 9:16 ]' : '⇅ 9:16'}
      </button>
    )}
    <button
      type="button"
      onClick={() => update({ accentSwap: !state.accentSwap })}
      aria-pressed={Boolean(state.accentSwap)}
      title="Alterna naranja ⇄ cian en toda la placa"
      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap transition ${
        state.accentSwap ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-fire/60 bg-fire/10 text-fire'
      }`}
    >
      {isDesktop ? '[ ⚡ SWAP ACCENT ]' : '⚡'}
    </button>
    <button
      type="button"
      onClick={() => setOverlay((o) => !o)}
      aria-pressed={overlay}
      title="Simula la interfaz de Instagram sobre la placa (no se exporta)"
      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap transition ${
        overlay ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-line text-steel hover:text-white'
      }`}
    >
      {isDesktop ? '[ 👁 OVERLAY INSTAGRAM ]' : '👁 IG'}
    </button>
    <button
      type="button"
      onClick={() => setGridGuide((g) => !g)}
      aria-pressed={gridGuide}
      title="Muestra cómo recorta Instagram la miniatura en la grilla del perfil (no se exporta)"
      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap transition ${
        gridGuide ? 'border-cyan/70 bg-cyan/15 text-cyan' : 'border-line text-steel hover:text-white'
      }`}
    >
      {isDesktop ? '[ ▦ GRILLA PERFIL ]' : '▦'}
    </button>
    <button
      type="button"
      onClick={() => update({ slideCounter: !state.slideCounter })}
      aria-pressed={Boolean(state.slideCounter)}
      title="Contador «01 / 05» y «DESLIZÁ →» en todas las placas (se exporta)"
      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap transition ${
        state.slideCounter ? 'border-fire/70 bg-fire/15 text-fire' : 'border-line text-steel hover:text-white'
      }`}
    >
      {isDesktop ? '[ 01/05 CONTADOR ]' : '01/05'}
    </button>
    </>
  )

  const canvasUI = isDesktop ? (
      <div className="flex h-dvh overflow-hidden">
        <aside className="flex w-[420px] shrink-0 flex-col border-r border-line bg-surface/40">
          <div className="space-y-3 border-b border-line px-5 py-4">
            <BrandBar />
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>
          <div className="tc-scroll flex-1 overflow-y-auto">
            {panel}
          </div>
        </aside>
        <main className="tc-grid-bg flex min-w-0 flex-1 flex-col">
          {/* Barra superior: pestañas (flex-1, scroll horizontal) + utilidades fijas a la derecha. */}
          <div className="border-b border-line bg-carbon/80 px-6 py-3 backdrop-blur">
            <WeekDayBar active={deck.packDay ?? null} today={packDayFor().id} edited={Object.keys(weekly.decks)} onLoad={(id) => void loadDay(id)} onRestore={(id) => void loadDay(id, true)} />
            {slideBar(
              <>
                {overlayToggle}
                <div className="w-56 shrink-0">{aspectToggle}</div>
              </>,
            )}
          </div>
          <div className="min-h-0 flex-1 p-6">
            <Preview state={canvasState} bgImage={bgImage} canvasRef={canvasRef} gutter={16} overlay={overlay && !exporting} gridGuide={gridGuide && !exporting} resolveImage={bg.get} slideCount={slides.length} slideIndex={active} onNudge={exporting ? undefined : nudge} />
          </div>
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pb-6">
            <CaptionBar caption={caption} onChange={setCaption} />
            <ExportButtons target={canvasRef} state={state} />
          </div>
        </main>
      </div>
  ) : (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <BrandBar />
        <div className="w-32 shrink-0">{aspectToggle}</div>
      </header>

      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        {/* El selector de modo conserva su ancho; las herramientas se desplazan si no entran. */}
        <div className="w-40 shrink-0">
          <ModeSwitch mode={mode} onChange={setMode} compact />
        </div>
        <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">{overlayToggle}</div>
      </div>
      <div className="border-b border-line px-4 py-2">
        <WeekDayBar active={deck.packDay ?? null} today={packDayFor().id} edited={Object.keys(weekly.decks)} onLoad={(id) => void loadDay(id)} onRestore={(id) => void loadDay(id, true)} compact />
        {slideBar()}
      </div>
      <main className="tc-grid-bg min-h-0 flex-1 px-4 pt-3 pb-6">
        <Preview state={canvasState} bgImage={bgImage} canvasRef={canvasRef} gutter={4} overlay={overlay && !exporting} gridGuide={gridGuide && !exporting} resolveImage={bg.get} slideCount={slides.length} slideIndex={active} onNudge={exporting ? undefined : nudge} />
      </main>

      <section
        className={`flex shrink-0 flex-col border-t border-line bg-carbon transition-[height] duration-300 ease-out ${
          drawerOpen ? 'h-[58dvh]' : 'h-auto'
        }`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          className="flex items-center justify-between px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan"
        >
          <span>[ {drawerOpen ? 'CERRAR PANEL' : 'EDITAR PLACA'} ]</span>
          <svg
            viewBox="0 0 24 24"
            className={`size-4 transition-transform ${drawerOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
        {drawerOpen && (
          <div className="tc-scroll min-h-0 flex-1 overflow-y-auto border-t border-line">
            {panel}
          </div>
        )}
        <div className="border-t border-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2">
            <CaptionBar caption={caption} onChange={setCaption} />
            <ExportButtons target={canvasRef} state={state} compact />
          </div>
        </div>
      </section>
    </div>
  )

  return (
    <>
      {mode === 'canvas' && canvasUI}
      {/* El estudio queda montado tras la primera visita: alternar de modo no pierde el clip ni el timeline. */}
      {videoVisited && (
        <div hidden={mode !== 'video'}>
          <Suspense fallback={<div className="flex h-dvh items-center justify-center font-mono text-[11px] tracking-[0.18em] text-steel">CARGANDO VIDEO STUDIO…</div>}>
            <VideoStudio
              active={mode === 'video'}
              header={
                <>
                  <BrandBar />
                  <ModeSwitch mode={mode} onChange={setMode} compact={!isDesktop} />
                </>
              }
            />
          </Suspense>
        </div>
      )}
    </>
  )
}
