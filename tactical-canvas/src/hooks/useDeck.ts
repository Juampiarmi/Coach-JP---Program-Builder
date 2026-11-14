import { useCallback } from 'react'
import { DEFAULT_STATE } from '../defaults'
import type { Discipline, GenerationResult } from '../lib/ai'
import { harmonizeChart } from '../lib/chartPillar'
import { BG_KEYS, DEFAULT_DECK, GLOBAL_KEYS, STORAGE_KEY, STYLE_KEYS, type Deck } from '../lib/deck'
import { migrateDiagram } from '../lib/diagramPillar'
import { remixToStories } from '../lib/remix'
import type { CanvasState, Nudge, NudgeTarget } from '../types'
import { usePersistentState } from './usePersistentState'

/**
 * Set activo (persistido): las placas normalizadas, la placa seleccionada y todas las operaciones de
 * edición (los ajustes globales se propagan a todo el set; el resto, sólo a la placa activa).
 */
export function useDeck() {
  const [deck, setDeck] = usePersistentState<Deck>(STORAGE_KEY, DEFAULT_DECK)
  const slides = deck.slides.length ? deck.slides.map((s) => ({ ...DEFAULT_STATE, ...migrateDiagram(s) }) as CanvasState) : [DEFAULT_STATE]
  const active = Math.min(deck.active, slides.length - 1)
  const state = slides[active]

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

  /** [ ⇅ REMIX 9:16 ]: el set pasa a historias con reacomodo vertical y zonas de sticker. */
  const remix = () => setDeck((d) => ({ ...d, slides: remixToStories(d.slides.map((s) => ({ ...DEFAULT_STATE, ...s }) as CanvasState)) }))

  return { deck, setDeck, slides, active, state, update, reset, copyStyle, applyKit, nudge, applyGeneration, moveSlide, selectSlide, addSlide, removeSlide, setCaption, caption, remix }
}
