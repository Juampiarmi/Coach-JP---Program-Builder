import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BrandBar } from './components/BrandBar'
import { ModeSwitch, type WorkMode } from './components/ModeSwitch'
import { ControlPanel, type PanelTab } from './components/controls/ControlPanel'
import { normalizeTab, PanelTabs } from './components/PanelTabs'
import { FOCUS_EVENT } from './components/controls/primitives'
import { useExportPng } from './components/ExportButtons'
import { Menu, MenuItem } from './components/Menu'
import { CreateDrawer } from './components/CreateDrawer'
import type { CanvasPick } from './components/CanvasGizmo'
import { pickTarget } from './lib/canvasFocus'
import { Preview } from './components/Preview'
import { AiGenerator } from './components/AiGenerator'
import { SlideBar } from './components/SlideBar'
import { DEFAULT_STATE } from './defaults'
import { harmonizeChart } from './lib/chartPillar'
import { deriveBookmarkPoints, resolveBookmark } from './lib/bookmark'
import { DEFAULT_AI_SETTINGS, regenerateSlide, type AiSettings, type Discipline, type EditorialTone } from './lib/ai'
import { ASPECTS } from './lib/brand'
import { canShareFiles, downloadBlob, renderPng, shareBlobs, slugify } from './lib/exporter'
import { zipFiles } from './lib/zip'
import { remixToStories } from './lib/remix'
import { diagnose, SCORE_COLOR, type DoctorFix } from './lib/retentionDoctor'
import { RetentionDoctor } from './components/RetentionDoctor'
import { WEEKLY_PACK } from './lib/weeklyPack'
import { deckImageIds } from './lib/projects'
import { ProjectBar } from './components/ProjectBar'
import { ProjectLibrary } from './components/ProjectLibrary'
import { FeedGridPreview } from './components/FeedGridPreview'
import { usePhotoLuma } from './hooks/usePhotoLuma'
import { CaptionBar } from './components/CaptionBar'
import { BrandKitBar } from './components/controls/BrandKitBar'
import { dropLegacyBackground, pruneBackgrounds, readLegacyBackground, useBackgroundImages } from './hooks/useBackgroundImage'
import { useMediaQuery } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import { useUndoHistory } from './hooks/useUndoHistory'
import { useDeck } from './hooks/useDeck'
import { useProjects } from './hooks/useProjects'
import { useWeeklyPlan } from './hooks/useWeeklyPlan'
import { useCitationChecks } from './hooks/useCitationChecks'
import { usePhotoBank } from './hooks/usePhotoBank'
import { DEFAULT_DECK, applyFixes, fallbackCaption, GLOBAL_KEYS, BG_KEYS } from './lib/deck'
import type { AspectId, CanvasState } from './types'


// Video Studio en un chunk aparte: el editor de placas no carga su código hasta que se usa.
const VideoStudio = lazy(() => import('./video/VideoStudio'))


const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const { deck, setDeck, slides, active, state, update, reset, copyStyle, applyKit, nudge, applyGeneration, moveSlide, selectSlide, addSlide, removeSlide, setCaption, caption, remix } = useDeck()
  // Placa de guardado sin viñetas propias: se extraen del resto del carrusel en cada render.
  const bookmarkAuto = state.template === 'bookmark' ? deriveBookmarkPoints(slides, active) : []
  const canvasState: CanvasState =
    state.template === 'bookmark' && !state.bookmarkData ? { ...state, bookmarkData: resolveBookmark(state, slides, active) } : state
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  // Deshacer / rehacer: cualquier edición del set (no la selección de placa ni la exportación).
  const history = useUndoHistory(deck, setDeck, {
    meaningful: (a, b) => a.slides !== b.slides || a.caption !== b.caption,
    paused: Boolean(exporting),
  })
  // Modo de trabajo: placas o video. Cada uno conserva su estado al alternar.
  const [modeState, setModeState] = usePersistentState<{ mode: WorkMode }>('jp-tactical-canvas:mode', { mode: 'canvas' })
  const mode = modeState.mode
  const [videoVisited, setVideoVisited] = useState(mode === 'video')
  // ⌘/Ctrl+Z deshace y ⌘/Ctrl+⇧+Z (o Ctrl+Y) rehace. Dentro de un campo de texto manda el deshacer
  // nativo del campo; en el Video Studio, sus propios atajos.
  const { undo, redo } = history
  useEffect(() => {
    if (mode !== 'canvas') return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, undo, redo])
  const setMode = (m: WorkMode) => {
    if (m === 'video') setVideoVisited(true)
    setModeState({ mode: m })
  }
  // Simulador de UI de Instagram (sólo pantalla; nunca entra en el PNG ni en el ZIP).
  const [overlay, setOverlay] = useState(false)
  // Guía de recorte de la grilla del perfil (sólo pantalla; nunca entra en el PNG).
  const [gridGuide, setGridGuide] = useState(false)
  // Vista previa en grilla 3×3 del perfil (modal; sólo pantalla).
  const [feedGrid, setFeedGrid] = useState(false)
  // Fotos de todas las placas: fondo y las imágenes propias de Error vs Corrección.
  const bg = useBackgroundImages(slides.flatMap((s) => [s.bgImageId, s.fixWrongImageId, s.fixRightImageId, s.panoramaImageId]).filter((id): id is string => Boolean(id)))
  const bgImage = bg.get(state.bgImageId)
  // Biblioteca de proyectos y Plan Semanal (el set suelto se guarda como borrador antes de reemplazarlo).
  // Banco de fotos reales etiquetadas: el generador y el Plan Semanal eligen una acorde al tema.
  const photos = usePhotoBank(bg)
  const { library, libraryFull, libraryOpen, setLibraryOpen, saveDraftIfNeeded, projectActions, currentProject, openLibrary } = useProjects({
    deck,
    setDeck,
    canvasRef,
    aspect: state.aspect,
    photoBank: photos.bank.photos,
    onImportPhotos: photos.importPhotos,
  })
  const { weekly, loadDay } = useWeeklyPlan({ deck, setDeck, bg, saveDraftIfNeeded, takePhoto: photos.take })
  // Doctor de retención: diagnóstico en vivo del set (la foto de cada placa se mide una vez).
  const photoId = (s: CanvasState) => s.panoramaImageId ?? ((s.bgStyle ?? 'photo') === 'photo' ? s.bgImageId : null)
  const luma = usePhotoLuma(slides.map(photoId), bg.get)
  // Verificador de papers: cada cita científica visible del set se contrasta con Crossref / PubMed.
  const citations = useCitationChecks(slides.filter((s) => !['manifesto', 'repeat', 'quote'].includes(s.template)).map((s) => s.citeMain))
  const report = diagnose(slides, (i) => luma(photoId(slides[i])), citations.get)
  const [doctorOpen, setDoctorOpen] = usePersistentState<{ open: boolean }>('jp-tactical-canvas:doctor', { open: true })
  const doctorRef = useRef<HTMLDivElement>(null)
  const [panelTab, setPanelTab] = usePersistentState<{ tab: PanelTab }>('jp-tactical-canvas:panel-tab', { tab: 'text' })
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
    // …y las de todos los proyectos de la biblioteca.
    ids.push(...library.projects.flatMap((p) => deckImageIds(p.deck)))
    // …y las del banco de fotos reales.
    ids.push(...photos.bank.photos.map((p) => p.id))
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




  const projectBar = (compact = false) => (
    <ProjectBar
      projectName={currentProject?.name ?? null}
      packDayLabel={deck.packDay ? `PLAN · ${WEEKLY_PACK.find((d) => d.id === deck.packDay)?.day ?? ''}` : null}
      count={library.projects.filter((p) => !p.draft).length}
      pristine={JSON.stringify(deck.slides) === JSON.stringify(DEFAULT_DECK.slides)}
      onOpenLibrary={() => openLibrary('browse')}
      onSave={() => openLibrary('save')}
      onRename={currentProject ? (name) => projectActions.rename(currentProject.id, name) : undefined}
      compact={compact}
    />
  )

  /** Foto nueva SÓLO para la placa activa (null = quitarla de esta placa). */
  const setBgImage = useCallback(
    (img: string | null) => {
      if (!img) return update({ bgImageId: null })
      update({ bgImageId: bg.add(img).id })
    },
    [bg, update],
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
      onRegenerate={regenerateActive}
      onMove={moveSlide}
      regenBusy={regen.busy}
      regenNote={regen.note}
      exporting={exporting}
    />
  )

  const fixDoctor = (fixes: DoctorFix[]) => setDeck((d) => applyFixes(d, fixes))
  const showDoctor = () => {
    setPanelTab({ tab: 'export' })
    setDoctorOpen({ open: true })
    setDrawerOpen(true)
    window.setTimeout(() => doctorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  /**
   * CLICK-TO-FOCUS: abre la pestaña del campo, despliega su sección y lo enfoca con un destello.
   * Las secciones plegadas escuchan FOCUS_EVENT (ver Section · focusKeys).
   */
  const focusField = (tab: PanelTab, key: string) => {
    setPanelTab({ tab })
    setDrawerOpen(true)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: key }))
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`)
        if (!el) return
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        el.focus({ preventScroll: true })
        el.classList.add('tc-flash')
        window.setTimeout(() => el.classList.remove('tc-flash'), 1200)
      }, 90)
    }, 60)
  }
  const onPick = ({ part, block }: CanvasPick) => {
    const target = pickTarget(part, block, state.template)
    focusField(target[0], target[1])
  }

  const controls = (tab: PanelTab) => (
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
      tab={tab}
      citation={['manifesto', 'repeat', 'quote'].includes(state.template) ? null : citations.get(state.citeMain)}
      onRecheckCitation={() => citations.recheck(state.citeMain)}
      photoBank={photos}
    />
  )

  // MODO CREAR: Plan Semanal + Generador IA + variantes sin API. Al cargar o generar, se cierra solo.
  const [createOpen, setCreateOpen] = useState(false)
  const createFlow = (
    <>
      {deck.packDay && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 font-mono text-[10px] text-steel">
          <span>📅 En el lienzo: {WEEKLY_PACK.find((d) => d.id === deck.packDay)?.day} (con tus ediciones)</span>
          <button
            type="button"
            onClick={() => {
              const day = WEEKLY_PACK.find((d) => d.id === deck.packDay)
              if (day && confirm(`¿Descartar tus cambios del ${day.day} y volver al set original?`)) (setCreateOpen(false), void loadDay(day.id, true))
            }}
            className="shrink-0 rounded-md border border-line px-2 py-1 tracking-[0.1em] transition hover:border-fire/50 hover:text-fire"
          >
            ↺ ORIGINAL
          </button>
        </div>
      )}
      <AiGenerator
        onResult={(r, meta) => {
          saveDraftIfNeeded()
          applyGeneration(r, { ...meta, photoId: photos.take(`${meta.topic} ${r.slides.map((x) => `${x.tag ?? ''} ${x.headlineA ?? ''} ${x.headlineB ?? ''}`).join(' ')}`, meta.discipline) })
          setCreateOpen(false)
        }}
        // Cargar el set listo: si ya lo editaste, vuelve tu versión (↺ ORIGINAL lo rehace desde el pack).
        onLoadDay={(id) => (setCreateOpen(false), void loadDay(id))}
        onBurst={(b) => update({ headlineA: b.white, headlineB: b.accent })}
      />
    </>
  )

  const exportPng = useExportPng(canvasRef, state)

  /** Panel lateral en 3 pestañas: contenido · diseño & foto · carrusel & caption. */
  const tab = normalizeTab(panelTab.tab)
  const panel = (
    <>
      <PanelTabs tab={tab} onChange={(t) => setPanelTab({ tab: t })} score={report.score} />
      {tab === 'text' && controls('text')}
      {tab === 'style' && (
        <>
          <BrandKitBar state={state} onApply={applyKit} slideCount={slides.length} />
          {controls('style')}
        </>
      )}
      {tab === 'export' && (
        <>
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
          <div className="space-y-2 border-b border-line px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-cyan uppercase">Caption + hashtags</p>
            <CaptionBar caption={caption} onChange={setCaption} slides={slides} fallback={fallbackCaption(slides)} />
          </div>
          <div className="space-y-2 border-b border-line px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-cyan uppercase">Formato y exportación</p>
            <div className="grid grid-cols-2 gap-1.5">
              {state.aspect === 'feed' ? (
                <button
                  type="button"
                  onClick={remix}
                  title="Convierte todo el carrusel 4:5 en historias 9:16: reacomoda el texto en vertical y reserva zonas para stickers (encuesta, preguntas, link)"
                  className="rounded-lg border border-gold/60 bg-gold/10 px-2 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-gold transition hover:bg-gold/20"
                >
                  [ ⇅ REMIX 9:16 ]
                </button>
              ) : (
                <button type="button" onClick={() => update({ aspect: 'feed' })} className="rounded-lg border border-line px-2 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-steel transition hover:text-white">
                  [ ⇅ VOLVER A 4:5 ]
                </button>
              )}
              <button type="button" onClick={() => void exportPng.run('download')} disabled={exportPng.status === 'busy'} className="rounded-lg bg-fire px-2 py-2 font-mono text-[10px] font-bold tracking-[0.08em] text-carbon transition hover:brightness-110 disabled:opacity-60">
                ⬇ PNG 4K · ESTA PLACA
              </button>
              <button type="button" onClick={() => runBatch('zip')} disabled={Boolean(exporting)} className="rounded-lg border border-fire/60 px-2 py-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-fire transition hover:bg-fire/10 disabled:opacity-50">
                ⬇ ZIP COMPLETO
              </button>
              <button type="button" onClick={runDual} disabled={Boolean(exporting)} className="rounded-lg border border-gold/60 px-2 py-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-gold transition hover:bg-gold/10 disabled:opacity-50">
                ⬇ FEED + HISTORIAS
              </button>
            </div>
            {(exporting || exportPng.note) && <p className="font-mono text-[10px] text-steel">{exporting ?? exportPng.note}</p>}
          </div>
          {controls('export')}
        </>
      )}
    </>
  )

  const iconBtn = 'rounded-lg border border-line px-2.5 py-1.5 font-mono text-[12px] text-steel transition hover:text-white disabled:opacity-30'
  const undoButtons = (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={history.undo} disabled={!history.canUndo} title="Deshacer (⌘/Ctrl + Z)" aria-label="Deshacer" className={iconBtn}>
        ↶
      </button>
      <button type="button" onClick={history.redo} disabled={!history.canRedo} title="Rehacer (⌘/Ctrl + ⇧ + Z)" aria-label="Rehacer" className={iconBtn}>
        ↷
      </button>
    </span>
  )

  /** Centro: formato (4:5 · 9:16) + Vista Feed 3×3 en un solo selector segmentado. */
  const seg = (on: boolean) =>
    `rounded-md px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap transition ${on ? 'bg-cyan text-carbon' : 'text-steel hover:bg-white/5 hover:text-white'}`
  const formatSwitch = (
    <div role="group" aria-label="Formato" className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
      <button type="button" aria-pressed={state.aspect === 'feed'} onClick={() => update({ aspect: 'feed' })} className={seg(state.aspect === 'feed')}>
        {isDesktop ? '4:5 FEED' : '4:5'}
      </button>
      <button type="button" aria-pressed={state.aspect === 'story'} onClick={() => update({ aspect: 'story' })} className={seg(state.aspect === 'story')}>
        {isDesktop ? '9:16 STORY' : '9:16'}
      </button>
      <button
        type="button"
        onClick={() => setFeedGrid(true)}
        title="Grilla 3×3: la portada nueva junto a tus últimos posts del perfil, con contraste y armonía (no se exporta)"
        aria-label="Grilla 3×3"
        className={seg(false)}
      >
        {isDesktop ? '⊞ 3×3' : '⊞'}
      </button>
    </div>
  )

  /** Derecha: guías de pantalla, doctor y exportar (cada grupo en un solo control). */
  const guidesOn = [overlay, gridGuide, Boolean(state.slideCounter), Boolean(state.accentSwap)].filter(Boolean).length
  const toolsRight = (
    <>
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        title="Plan Semanal, Generador IA y variantes sin API"
        className="shrink-0 rounded-lg border border-cyan bg-cyan/10 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-cyan transition hover:bg-cyan/20"
      >
        + CREAR
      </button>
      <Menu
        ariaLabel="Guías"
        title="Overlay de Instagram, grilla del perfil, contador y swap de acento"
        buttonClass={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap transition ${guidesOn ? 'border-cyan/60 text-cyan' : 'border-line text-steel hover:text-white'}`}
        label={<>👁 GUÍAS{guidesOn ? ` · ${guidesOn}` : ''} ▾</>}
      >
        {() => (
          <>
            <MenuItem checked={overlay} onSelect={() => setOverlay((o) => !o)} hint="Simula la interfaz de Instagram (no se exporta)">
              OVERLAY INSTAGRAM
            </MenuItem>
            <MenuItem checked={gridGuide} onSelect={() => setGridGuide((g) => !g)} hint="Recorte de la miniatura en el perfil (no se exporta)">
              GRILLA PERFIL
            </MenuItem>
            <MenuItem checked={Boolean(state.slideCounter)} onSelect={() => update({ slideCounter: !state.slideCounter })} hint="«01 / 05» y «DESLIZÁ →» en todas las placas (se exporta)">
              CONTADOR 01/05
            </MenuItem>
            <MenuItem checked={Boolean(state.accentSwap)} onSelect={() => update({ accentSwap: !state.accentSwap })} hint="Naranja ⇄ cian en toda la placa (se exporta)">
              SWAP ACCENT
            </MenuItem>
          </>
        )}
      </Menu>
      <button
        type="button"
        onClick={showDoctor}
        title={`Doctor de retención: ${report.score}/100 · ${report.findings.length} hallazgo(s). Revisalo antes de exportar.`}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap text-steel transition hover:text-white"
      >
        🩺
        <span className="rounded px-1 text-[10px] font-bold text-carbon" style={{ background: SCORE_COLOR(report.score) }}>
          {report.score}
        </span>
      </button>
      <Menu
        ariaLabel="Exportar"
        buttonClass="rounded-lg bg-fire px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-carbon transition hover:brightness-110"
        label={exportPng.status === 'busy' || exporting ? '⬇ EXPORTANDO…' : '⬇ EXPORTAR ▾'}
      >
        {(close) => (
          <>
            <MenuItem onSelect={() => (close(), void exportPng.run('download'))} disabled={exportPng.status === 'busy'} hint="Placa activa en alta resolución">
              {exportPng.label}
            </MenuItem>
            {exportPng.shareable && (
              <MenuItem onSelect={() => (close(), void exportPng.run('share'))} hint="Instagram, WhatsApp…">
                COMPARTIR ESTA PLACA
              </MenuItem>
            )}
            {slides.length > 1 && (
              <MenuItem onSelect={() => (close(), runBatch('zip'))} disabled={Boolean(exporting)} hint="Todas las placas + caption.txt">
                DESCARGAR TODAS (.ZIP)
              </MenuItem>
            )}
            {slides.length > 1 && (
              <MenuItem onSelect={() => (close(), runBatch('png'))} disabled={Boolean(exporting)} hint="Cada placa por separado (en el celular: compartir)">
                {slides.length} PNG SUELTOS
              </MenuItem>
            )}
            <MenuItem onSelect={() => (close(), runDual())} disabled={Boolean(exporting)} hint="Un .zip con /feed_4x5/ y /stories_9x16/">
              FEED + HISTORIAS (.ZIP)
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  )

  const preview = (gutter: number) => (
    <Preview
      state={canvasState}
      bgImage={bgImage}
      canvasRef={canvasRef}
      gutter={gutter}
      overlay={overlay && !exporting}
      gridGuide={gridGuide && !exporting}
      resolveImage={bg.get}
      slideCount={slides.length}
      slideIndex={active}
      onNudge={exporting ? undefined : nudge}
      onPick={exporting ? undefined : onPick}
    />
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
          {/* Barra superior en UNA fila: proyecto + deshacer · formato · crear, guías, doctor y exportar. */}
          <div className="relative z-30 flex min-w-0 items-center gap-2.5 border-b border-line bg-carbon/80 px-4 py-2.5 backdrop-blur">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {projectBar()}
              {undoButtons}
            </div>
            {formatSwitch}
            <div className="flex shrink-0 items-center justify-end gap-1.5">{toolsRight}</div>
          </div>
          <div className="min-h-0 flex-1 p-6">{preview(16)}</div>
          <div className="border-t border-line bg-carbon/60 px-5 py-2.5">{slideBar()}</div>
        </main>
      </div>
  ) : (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <BrandBar />
        <div className="w-36 shrink-0">
          <ModeSwitch mode={mode} onChange={setMode} compact />
        </div>
      </header>
      <div className="relative z-30 flex items-center gap-2 overflow-x-auto border-b border-line px-4 py-2 scrollbar-none">
        {/* Fila con scroll horizontal: nada se encoge (si no entra, se desliza). */}
        <div className="shrink-0">{projectBar(true)}</div>
        {undoButtons}
        {formatSwitch}
        {toolsRight}
      </div>
      <main className="tc-grid-bg min-h-0 flex-1 px-4 pt-3 pb-3">{preview(4)}</main>
      <div className="border-t border-line px-4 py-2">{slideBar()}</div>

      <section
        className={`flex shrink-0 flex-col border-t border-line bg-carbon transition-[height] duration-300 ease-out ${
          drawerOpen ? 'h-[58dvh]' : 'h-auto'
        }`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          className="flex items-center justify-between px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan"
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
      </section>
    </div>
  )

  return (
    <>
      {mode === 'canvas' && canvasUI}
      {mode === 'canvas' && (
        <CreateDrawer open={createOpen} onClose={() => setCreateOpen(false)}>
          {createFlow}
        </CreateDrawer>
      )}
      {mode === 'canvas' && libraryOpen && (
        <ProjectLibrary
          projects={library.projects}
          currentId={deck.projectId ?? null}
          current={deck}
          currentSaved={Boolean(deck.projectId || deck.packDay)}
          initialMode={libraryOpen}
          actions={projectActions}
          storageFull={libraryFull}
          photoCount={photos.bank.photos.length}
          onClose={() => setLibraryOpen(null)}
        />
      )}
      {feedGrid && (
        <FeedGridPreview
          cover={slides[0]}
          coverImage={bg.get(slides[0].bgImageId)}
          resolveImage={bg.get}
          slideCount={slides.length}
          projects={library.projects}
          currentProjectId={deck.projectId ?? null}
          onClose={() => setFeedGrid(false)}
        />
      )}
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
