import { useCallback } from 'react'
import type { Discipline } from '../lib/ai'
import { loadBackground } from '../lib/image'
import { EMPTY_BANK, makeThumb, mergeBank, pickPhoto, PHOTO_BANK_KEY, type BankPhoto, type PhotoBank, type PhotoDiscipline, type PhotoKind } from '../lib/photoBank'
import { usePersistentState } from './usePersistentState'

interface Store {
  add: (dataUrl: string) => { id: string; saved: Promise<boolean> }
}

/** Banco de fotos reales (etiquetas en localStorage, imágenes en el almacén de fotos por id). */
export function usePhotoBank(store: Store) {
  const [bank, setBank] = usePersistentState<PhotoBank>(PHOTO_BANK_KEY, EMPTY_BANK)

  /** Sube fotos con sus etiquetas; devuelve cuántas entraron. */
  const addFiles = async (files: File[], tags: { disciplines: PhotoDiscipline[]; kind: PhotoKind }) => {
    const added: BankPhoto[] = []
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      const dataUrl = await loadBackground(f)
      const { id } = store.add(dataUrl)
      added.push({ id, thumb: await makeThumb(dataUrl), disciplines: tags.disciplines, kind: tags.kind, addedAt: Date.now() })
    }
    if (added.length) setBank((b) => ({ photos: [...added, ...b.photos] }))
    return added.length
  }

  const update = (id: string, patch: Partial<Pick<BankPhoto, 'disciplines' | 'kind'>>) =>
    setBank((b) => ({ photos: b.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const remove = (id: string) => setBank((b) => ({ photos: b.photos.filter((p) => p.id !== id) }))
  const importPhotos = (photos: BankPhoto[]) => setBank((b) => mergeBank(b, photos))
  const markUsed = useCallback((id: string) => setBank((b) => ({ photos: b.photos.map((p) => (p.id === id ? { ...p, usedAt: Date.now() } : p)) })), [setBank])

  /** Foto acorde al tema (y la marca como usada para rotar). null si no hay ninguna acorde. */
  const take = (text: string, discipline?: Discipline): string | null => {
    const p = pickPhoto(bank, { text, discipline })
    if (!p) return null
    markUsed(p.id)
    return p.id
  }

  return { bank, addFiles, update, remove, importPhotos, take }
}
