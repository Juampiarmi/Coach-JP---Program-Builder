import { useCallback, useRef, useState } from 'react'
import { BrandBar } from './components/BrandBar'
import { ControlPanel } from './components/controls/ControlPanel'
import { Segmented } from './components/controls/primitives'
import { ExportButtons } from './components/ExportButtons'
import { Preview } from './components/Preview'
import { AiGenerator } from './components/AiGenerator'
import { SlideBar } from './components/SlideBar'
import { DEFAULT_STATE } from './defaults'
import type { GenerationResult } from './lib/ai'
import { ASPECTS } from './lib/brand'
import { canShareFiles, downloadBlob, renderPng, shareBlobs, slugify } from './lib/exporter'
import { zipFiles } from './lib/zip'
import { CaptionBar } from './components/CaptionBar'
import { useBackgroundImage } from './hooks/useBackgroundImage'
import { useMediaQuery } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import type { AspectId, CanvasState } from './types'

const STORAGE_KEY = 'jp-tactical-canvas:v3'

/** Ajustes de estilo que comparten todos los slides de una secuencia. */
const GLOBAL_KEYS = ['aspect', 'headlineFont', 'headlineScale', 'bgOverlay', 'floatingPlate'] as const

interface Deck {
  slides: CanvasState[]
  active: number
  /** Copy de Instagram generado por la IA para toda la pieza */
  caption?: string
}

const DEFAULT_DECK: Deck = { slides: [DEFAULT_STATE], active: 0, caption: '' }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [deck, setDeck] = usePersistentState<Deck>(STORAGE_KEY, DEFAULT_DECK)
  const slides = deck.slides.length ? deck.slides.map((s) => ({ ...DEFAULT_STATE, ...s })) : [DEFAULT_STATE]
  const active = Math.min(deck.active, slides.length - 1)
  const state = slides[active]
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
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
    (r: GenerationResult) =>
      setDeck((d) => {
        const current = { ...DEFAULT_STATE, ...d.slides[Math.min(d.active, d.slides.length - 1)] }
        const globals: Partial<CanvasState> = {}
        for (const k of GLOBAL_KEYS) Object.assign(globals, { [k]: current[k] })
        if (r.format === 'stories') globals.aspect = 'story'
        if (r.format === 'carousel') globals.aspect = 'feed'
        return { slides: r.slides.map((p) => ({ ...DEFAULT_STATE, ...globals, ...p })), active: 0, caption: r.caption }
      }),
    [setDeck],
  )

  const selectSlide = (i: number) => setDeck((d) => ({ ...d, active: i }))
  const addSlide = () =>
    setDeck((d) => ({ ...d, slides: [...d.slides.slice(0, active + 1), { ...state }, ...d.slides.slice(active + 1)], active: active + 1 }))
  const removeSlide = () =>
    setDeck((d) => (d.slides.length > 1 ? { ...d, slides: d.slides.filter((_, i) => i !== active), active: Math.max(0, active - 1) } : d))
  const setCaption = (caption: string) => setDeck((d) => ({ ...d, caption }))
  const caption = deck.caption ?? ''

  /** Recorre la secuencia y renderiza cada placa a 3x con nombre numerado. */
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
        const extras = caption.trim() ? [{ name: 'caption.txt', text: caption }] : []
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

  const slideBar = (
    <SlideBar
      count={slides.length}
      active={active}
      onSelect={selectSlide}
      onAdd={addSlide}
      onRemove={removeSlide}
      onExportAll={() => runBatch('png')}
      onExportZip={() => runBatch('zip')}
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

  if (isDesktop) {
    return (
      <div className="flex h-dvh overflow-hidden">
        <aside className="flex w-[420px] shrink-0 flex-col border-r border-line bg-surface/40">
          <div className="border-b border-line px-5 py-4">
            <BrandBar />
          </div>
          <div className="tc-scroll flex-1 overflow-y-auto">
            {panel}
          </div>
        </aside>
        <main className="tc-grid-bg flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-carbon/80 px-6 py-3 backdrop-blur">
            {slideBar}
            <div className="w-64 shrink-0">{aspectToggle}</div>
          </div>
          <div className="min-h-0 flex-1 p-6">
            <Preview state={state} bgImage={bg.image} canvasRef={canvasRef} gutter={16} />
          </div>
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-6 pb-6">
            <CaptionBar caption={caption} onChange={setCaption} />
            <ExportButtons target={canvasRef} state={state} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <BrandBar />
        <div className="w-32 shrink-0">{aspectToggle}</div>
      </header>

      <div className="border-b border-line px-4 py-2">{slideBar}</div>
      <main className="tc-grid-bg min-h-0 flex-1 px-4 pt-3 pb-6">
        <Preview state={state} bgImage={bg.image} canvasRef={canvasRef} gutter={4} />
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
}
