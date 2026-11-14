import { useEffect, useState, type RefObject } from 'react'
import { ASPECTS } from '../lib/brand'
import { DEFAULT_DECK, type Deck } from '../lib/deck'
import { downloadBlob, renderThumb } from '../lib/exporter'
import { DRAFT_ID, EMPTY_LIBRARY, exportLibrary, importLibrary, newProjectId, suggestName, toSaved, type Project, type ProjectStore } from '../lib/projects'
import type { AspectId } from '../types'
import { usePersistentState } from './usePersistentState'

interface Options {
  deck: Deck
  setDeck: (d: Deck | ((prev: Deck) => Deck)) => void
  /** Lienzo en pantalla (miniaturas de los proyectos) */
  canvasRef: RefObject<HTMLDivElement | null>
  aspect: AspectId
}

/** Biblioteca de proyectos: vínculo del set con su proyecto, autoguardado, borrador automático y acciones. */
export function useProjects({ deck, setDeck, canvasRef, aspect }: Options) {
  // Biblioteca de proyectos: si el navegador se queda sin cuota, se avisa en la biblioteca (nunca en silencio).
  const [libraryFull, setLibraryFull] = useState(false)
  const [library, setLibrary] = usePersistentState<ProjectStore>('jp-tactical-canvas:projects', EMPTY_LIBRARY, () => setLibraryFull(true))
  const [libraryOpen, setLibraryOpen] = useState<null | 'browse' | 'save'>(null)

  // Biblioteca: el set vinculado a un proyecto se guarda solo en cada edición.
  useEffect(() => {
    const id = deck.projectId
    if (!id) return
    const p = library.projects.find((x) => x.id === id)
    // Proyecto borrado (en otra pestaña, por ejemplo): el set queda suelto, sin perder nada.
    if (!p) return setDeck((d) => ({ ...d, projectId: undefined }))
    const changed = p.deck.slides !== deck.slides || p.deck.caption !== deck.caption
    if (!changed && p.deck.active === deck.active) return
    // Tras recargar las referencias difieren aunque el contenido sea igual: se compara una vez.
    const same = !changed || (JSON.stringify(p.deck.slides) === JSON.stringify(deck.slides) && p.deck.caption === deck.caption)
    setLibrary((l) => ({
      projects: l.projects.map((x) => (x.id === id ? { ...x, deck: toSaved(deck), updatedAt: same ? x.updatedAt : Date.now() } : x)),
    }))
  }, [deck, library.projects, setDeck, setLibrary])

  /**
   * Nunca perder trabajo: antes de reemplazar un set que no está guardado en ningún lado (ni proyecto
   * ni día del plan), se guarda como BORRADOR AUTOMÁTICO. Hay uno solo y se pisa cada vez.
   */
  const saveDraftIfNeeded = () => {
    if (deck.projectId || deck.packDay) return
    if (JSON.stringify(deck.slides) === JSON.stringify(DEFAULT_DECK.slides)) return
    const now = Date.now()
    setLibrary((l) => {
      const prev = l.projects.find((p) => p.id === DRAFT_ID)
      const draft: Project = { id: DRAFT_ID, name: 'Borrador automático', draft: true, deck: toSaved(deck), createdAt: prev?.createdAt ?? now, updatedAt: now }
      return { projects: [draft, ...l.projects.filter((p) => p.id !== DRAFT_ID)] }
    })
  }

  /** Miniatura de la placa en pantalla para un proyecto (best-effort: si falla, queda el ícono). */
  const captureThumb = async (id: string) => {
    if (!canvasRef.current) return
    try {
      const { w, h } = ASPECTS[aspect]
      const thumb = await renderThumb(canvasRef.current, w, h)
      setLibrary((l) => ({ projects: l.projects.map((p) => (p.id === id ? { ...p, thumb } : p)) }))
    } catch {
      /* sin miniatura */
    }
  }

  const projectActions = {
    /** Guarda el set actual como proyecto nuevo y lo deja vinculado. */
    saveAs: (name: string) => {
      const id = newProjectId()
      const now = Date.now()
      setLibrary((l) => ({ projects: [...l.projects, { id, name: name.trim() || suggestName(deck), deck: toSaved(deck), createdAt: now, updatedAt: now }] }))
      setDeck((d) => ({ ...d, projectId: id, packDay: undefined }))
      void captureThumb(id)
    },
    open: (id: string) => {
      const p = library.projects.find((x) => x.id === id)
      if (!p) return
      if (id !== deck.projectId) saveDraftIfNeeded()
      // El borrador se abre suelto (guardarlo es ponerle nombre); el resto queda vinculado.
      setDeck({ ...p.deck, active: Math.min(p.deck.active ?? 0, p.deck.slides.length - 1), projectId: p.draft ? undefined : p.id, packDay: undefined })
      setLibraryOpen(null)
    },
    newSet: () => {
      saveDraftIfNeeded()
      setDeck(DEFAULT_DECK)
      setLibraryOpen(null)
    },
    duplicate: (id: string) => {
      const p = library.projects.find((x) => x.id === id)
      if (!p) return
      const now = Date.now()
      setLibrary((l) => ({ projects: [...l.projects, { ...p, id: newProjectId(), name: p.draft ? suggestName(p.deck) : `${p.name} (copia)`, draft: false, createdAt: now, updatedAt: now }] }))
    },
    rename: (id: string, name: string) => {
      const n = name.trim()
      if (!n) return
      // Renombrar el borrador lo convierte en un proyecto propio.
      setLibrary((l) => ({ projects: l.projects.map((p) => (p.id === id ? { ...p, name: n, draft: false, id: p.draft ? newProjectId() : p.id } : p)) }))
    },
    remove: (id: string) => {
      setLibrary((l) => ({ projects: l.projects.filter((p) => p.id !== id) }))
      if (deck.projectId === id) setDeck((d) => ({ ...d, projectId: undefined }))
    },
    exportAll: async () => {
      const blob = await exportLibrary(library.projects)
      downloadBlob(blob, `coachjp_proyectos_${new Date().toISOString().slice(0, 10)}.json`)
    },
    importFile: async (file: File) => {
      const imported = await importLibrary(await file.text())
      setLibrary((l) => ({ projects: [...l.projects, ...imported] }))
      return imported.length
    },
  }

  const currentProject = library.projects.find((p) => p.id === deck.projectId) ?? null
  const openLibrary = (mode: 'browse' | 'save') => {
    // La miniatura del proyecto abierto se refresca con lo que está en pantalla.
    if (deck.projectId) void captureThumb(deck.projectId)
    setLibraryOpen(mode)
  }

  return { library, libraryFull, libraryOpen, setLibraryOpen, saveDraftIfNeeded, captureThumb, projectActions, currentProject, openLibrary }
}
