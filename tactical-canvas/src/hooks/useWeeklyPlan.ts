import { useEffect } from 'react'
import { DEFAULT_STATE } from '../defaults'
import type { Discipline } from '../lib/ai'
import type { Deck } from '../lib/deck'
import { withPhoto } from '../lib/photoBank'
import { buildPackSlides, packBackgroundUrl, WEEKLY_PACK } from '../lib/weeklyPack'
import { usePersistentState } from './usePersistentState'

/** Proyectos del Plan Semanal: el set de cada día con las ediciones del usuario + el id de su fondo. */
export interface WeeklyStore {
  decks: Record<string, Deck>
  bg: Record<string, string>
}

interface Options {
  deck: Deck
  setDeck: (d: Deck | ((prev: Deck) => Deck)) => void
  /** Almacén de fotos (el fondo táctico del día se guarda ahí) */
  bg: { add: (dataUrl: string) => { id: string } }
  /** Antes de reemplazar el set (ej: guardar el trabajo suelto como borrador) */
  saveDraftIfNeeded: () => void
  /** Banco de fotos reales: id de una foto acorde al día (tiene prioridad sobre el fondo táctico del pack) */
  takePhoto?: (text: string, discipline?: Discipline) => string | null
}

/** Plan Semanal: el set de cada día como proyecto propio, con su fondo táctico y la carga en 1 clic. */
export function useWeeklyPlan({ deck, setDeck, bg, saveDraftIfNeeded, takePhoto }: Options) {
  const [weekly, setWeekly] = usePersistentState<WeeklyStore>('jp-tactical-canvas:weekly-decks', { decks: {}, bg: {} })

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
    saveDraftIfNeeded()
    const saved = weekly.decks[dayId]
    if (saved && !restore) return setDeck({ ...saved, active: 0 })
    // Foto real acorde al día (banco de fotos) o, si no hay, el fondo táctico del pack.
    const photo = takePhoto?.(`${day.pillar} ${day.theme} ${day.structure} ${day.prompt}`, deck.discipline) ?? null
    const slides = photo ? withPhoto(buildPackSlides(day, DEFAULT_STATE, null), photo) : buildPackSlides(day, DEFAULT_STATE, await packBackground(dayId))
    setDeck({
      slides,
      active: 0,
      caption: day.caption,
      topic: day.theme,
      discipline: deck.discipline,
      packDay: dayId,
    })
  }

  return { weekly, loadDay }
}
