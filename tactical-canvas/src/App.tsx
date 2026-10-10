import { lazy, Suspense, useCallback, useRef, useState } from 'react'
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
import { CaptionBar } from './components/CaptionBar'
import { useBackgroundImage } from './hooks/useBackgroundImage'
import { useMediaQuery } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import type { AspectId, CanvasState } from './types'

const STORAGE_KEY = 'jp-tactical-canvas:v3'

// Video Studio en un chunk aparte: el editor de placas no carga su código hasta que se usa.
const VideoStudio = lazy(() => import('./video/VideoStudio'))

/** Ajustes de estilo que comparten todos los slides de una secuencia. */
const GLOBAL_KEYS = [
  'aspect',
  'headlineFont',
  'headlineScale',
  'bgOverlay',
  'floatingPlate',
  'bgGradient',
  'bgMono',
  'bgZoom',
  'bgX',
  'bgY',
  'contentAlign',
  'contentGap',
  'theme',
] as const

interface Deck {
  slides: CanvasState[]
  active: number
  /** Copy de Instagram generado por la IA para toda la pieza */
  caption?: string
  /** Tema y enfoque de la última generación con IA (para re-generar una placa con coherencia) */
  topic?: string
  discipline?: Discipline
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [deck, setDeck] = usePersistentState<Deck>(STORAGE_KEY, DEFAULT_DECK)
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
  const bg = useBackgroundImage()

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

  const applyGeneration = useCallback(
    (r: GenerationResult, meta?: { topic: string; discipline: Discipline }) =>
      setDeck((d) => {
        const current = { ...DEFAULT_STATE, ...d.slides[Math.min(d.active, d.slides.length - 1)] }
        const globals: Partial<CanvasState> = {}
        for (const k of GLOBAL_KEYS) Object.assign(globals, { [k]: current[k] })
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

  /** Recorre la secuencia y renderiza cada placa a 4x con nombre numerado. */
  const renderAll = async () => {
    const { w, h } = ASPECTS[state.aspect]
    const files: { blob: Blob; name: string }[] = []
    for (let i = 0; i < slides.length; i++) {
      setExporting(`RENDER ${i + 1}/${slides.length}…`)
      selectSlide(i)
      await wait(450) // deja que React pinte y el auto-ajuste converja
      if (!canvasRef.current) continue
      const { blob } = await renderPng(canvasRef.current, w, h)
      const s = slides[i]
      files.push({ blob, name: `coachjp_${String(i + 1).padStart(2, '0')}_${s.template}_${slugify(`${s.headlineA} ${s.headlineB}`)}.png` })
    }
    return files
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
      for (const k of GLOBAL_KEYS) delete (safe as Record<string, unknown>)[k]
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

  const slideBar = (
    <SlideBar
      count={slides.length}
      active={active}
      onSelect={selectSlide}
      onAdd={addSlide}
      onRemove={removeSlide}
      onExportAll={() => runBatch('png')}
      onExportZip={() => runBatch('zip')}
      onRegenerate={regenerateActive}
      onMove={moveSlide}
      regenBusy={regen.busy}
      regenNote={regen.note}
      exporting={exporting}
    />
  )

  const panel = (
    <>
      <AiGenerator onResult={applyGeneration} />
      <ControlPanel
        state={state}
        update={update}
        onReset={reset}
        bgImage={bg.image}
        setBgImage={bg.setImage}
        bgPersisted={bg.persisted}
        getDiscipline={getDiscipline}
        slideIndex={active}
        topic={deck.topic?.trim() || `${slides[0].headlineA} ${slides[0].headlineB}`.replace(/\*/g, '').trim()}
        bookmarkAuto={bookmarkAuto}
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
          <div className="flex items-center justify-between gap-4 border-b border-line bg-carbon/80 px-6 py-3 backdrop-blur">
            {slideBar}
            <div className="flex shrink-0 items-center gap-2">
              {overlayToggle}
              <div className="w-64">{aspectToggle}</div>
            </div>
          </div>
          <div className="min-h-0 flex-1 p-6">
            <Preview state={canvasState} bgImage={bg.image} canvasRef={canvasRef} gutter={16} overlay={overlay && !exporting} slideCount={slides.length} slideIndex={active} />
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
        <div className="min-w-0 flex-1">
          <ModeSwitch mode={mode} onChange={setMode} compact />
        </div>
        {overlayToggle}
      </div>
      <div className="border-b border-line px-4 py-2">{slideBar}</div>
      <main className="tc-grid-bg min-h-0 flex-1 px-4 pt-3 pb-6">
        <Preview state={canvasState} bgImage={bg.image} canvasRef={canvasRef} gutter={4} overlay={overlay && !exporting} slideCount={slides.length} slideIndex={active} />
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
