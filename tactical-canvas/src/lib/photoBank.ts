import type { Discipline } from './ai'
import type { CanvasState } from '../types'

/**
 * BANCO DE FOTOS REALES: fotos propias de atletas, sala o técnica, etiquetadas por disciplina. La
 * imagen completa vive en IndexedDB (mismo almacén que los fondos, por id); acá sólo se guardan las
 * etiquetas y una miniatura chica. El generador y el Plan Semanal eligen una foto acorde al tema
 * (rotando: primero la que hace más que no se usa).
 */

export type PhotoDiscipline = 'mtb' | 'crossfit' | 'hyrox' | 'fuerza'
export type PhotoKind = 'atleta' | 'sala' | 'tecnica'

export const PHOTO_DISCIPLINES: { id: PhotoDiscipline; label: string }[] = [
  { id: 'mtb', label: 'MTB' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'hyrox', label: 'Hyrox' },
  { id: 'fuerza', label: 'Fuerza' },
]

export const PHOTO_KINDS: { id: PhotoKind; label: string }[] = [
  { id: 'atleta', label: 'Atleta' },
  { id: 'sala', label: 'Sala' },
  { id: 'tecnica', label: 'Técnica' },
]

export interface BankPhoto {
  /** Id de la imagen en IndexedDB */
  id: string
  /** Miniatura JPEG (~160 px) para la galería */
  thumb: string
  disciplines: PhotoDiscipline[]
  kind: PhotoKind
  addedAt: number
  /** Última vez que el generador o el plan la usaron (rotación) */
  usedAt?: number
}

export interface PhotoBank {
  photos: BankPhoto[]
}

export const PHOTO_BANK_KEY = 'jp-tactical-canvas:photo-bank'
export const EMPTY_BANK: PhotoBank = { photos: [] }

const RX: Record<PhotoDiscipline, RegExp> = {
  mtb: /\b(mtb|bici\w*|bike|ciclis\w*|pedal\w*|enduro|xco?|downhill|trail|cadencia|vatios)\b/giu,
  hyrox: /\b(hyrox|sled|trineo|wall ?balls?|sandbag|ski ?erg|roxzone)\b/giu,
  crossfit: /\b(crossfit|wod|metcon|amrap|emom|box|thrusters?|burpees?|kipping|muscle ?ups?)\b/giu,
  fuerza: /\b(fuerza|hipertrofia|sentadilla\w*|squat|press|peso muerto|deadlift|powerlifting|halterofilia|banca|búlgara|tensión mecánica|sobrecarga|músculo|muscular|bodybuilding|culturismo|barra|rir|rpe|series|repeticiones|bisagra|good morning|rugby)\b/giu,
}

/** Disciplinas de foto que pide un tema, de la más a la menos nombrada (el pilar decide si no hay pistas). */
export function detectDisciplines(text: string, discipline: Discipline = 'general'): PhotoDiscipline[] {
  const hits = (Object.keys(RX) as PhotoDiscipline[])
    .map((d) => ({ d, n: (text.match(RX[d]) ?? []).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.d)
  const fallback: PhotoDiscipline[] = discipline === 'sports' ? ['fuerza'] : discipline === 'crossfit' ? ['crossfit', 'hyrox'] : []
  return [...new Set([...hits, ...fallback])]
}

/**
 * Foto acorde al tema: la de la disciplina más nombrada; a igual disciplina, la que hace más que no se
 * usa (así un mismo set no repite siempre la misma). null si el banco no tiene ninguna acorde.
 */
export function pickPhoto(bank: PhotoBank, ctx: { text: string; discipline?: Discipline }): BankPhoto | null {
  const wanted = detectDisciplines(ctx.text, ctx.discipline)
  if (!wanted.length) return null
  const rank = (p: BankPhoto) => Math.min(...p.disciplines.map((d) => (wanted.includes(d) ? wanted.indexOf(d) : 99)), 99)
  const candidates = bank.photos.filter((p) => rank(p) < 99)
  if (!candidates.length) return null
  return [...candidates].sort((a, b) => rank(a) - rank(b) || (a.usedAt ?? 0) - (b.usedAt ?? 0) || b.addedAt - a.addedAt)[0]
}

/** Tratamiento de una foto real de fondo: velo y degradé para que el titular se lea en el celular. */
export function photoBackground(id: string): Partial<CanvasState> {
  return { bgImageId: id, bgStyle: 'photo', bgMono: false, bgOverlay: 60, bgGradient: true, bgVignette: 30, bgZoom: 100, bgX: 0, bgY: 0 }
}

/** Aplica la foto a las placas que muestran foto de fondo (Opus Athletic usa su propio fondo). */
export function withPhoto(slides: CanvasState[], id: string): CanvasState[] {
  return slides.map((s) => (s.template === 'athletic' ? s : { ...s, ...photoBackground(id), floatingPlate: false }))
}

/** Miniatura cuadrada para la galería (recorte centrado). */
export async function makeThumb(dataUrl: string, side = 160): Promise<string> {
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const c = document.createElement('canvas')
  c.width = side
  c.height = side
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  c.getContext('2d')!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, side, side)
  return c.toDataURL('image/jpeg', 0.7)
}

/** Fusiona un banco importado sin duplicar ids. */
export function mergeBank(current: PhotoBank, incoming: BankPhoto[]): PhotoBank {
  const seen = new Set(current.photos.map((p) => p.id))
  return { photos: [...current.photos, ...incoming.filter((p) => p && typeof p.id === 'string' && !seen.has(p.id) && Array.isArray(p.disciplines))] }
}
