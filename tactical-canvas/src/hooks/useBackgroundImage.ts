import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteImage, getImage, listImageIds, newImageId, putImage } from '../lib/imageStore'

/** Clave de la foto global de versiones anteriores (una sola foto para todo el carrusel). */
const LEGACY_KEY = 'jp-tactical-canvas:bg'

/**
 * Caché en memoria de las fotos de fondo por placa (id → dataURL), respaldada en IndexedDB.
 * Si IndexedDB no está disponible (modo privado), las fotos quedan sólo en memoria.
 */
export function useBackgroundImages(ids: string[]) {
  const [cache, setCache] = useState<Record<string, string>>({})
  const [persisted, setPersisted] = useState(true)
  const asked = useRef(new Set<string>())
  const key = [...new Set(ids)].sort().join('|')

  useEffect(() => {
    for (const id of key ? key.split('|') : []) {
      if (asked.current.has(id)) continue
      asked.current.add(id)
      getImage(id)
        .then((url) => url && setCache((c) => (c[id] ? c : { ...c, [id]: url })))
        .catch(() => asked.current.delete(id))
    }
  }, [key])

  /** Guarda una foto nueva: devuelve su id (para asignarlo a la placa) y si quedó persistida. */
  const add = useCallback((dataUrl: string) => {
    const id = newImageId()
    asked.current.add(id)
    setCache((c) => ({ ...c, [id]: dataUrl }))
    const saved = putImage(id, dataUrl).then(
      () => (setPersisted(true), true),
      () => (setPersisted(false), false),
    )
    return { id, saved }
  }, [])

  const get = useCallback((id: string | null | undefined) => (id ? (cache[id] ?? null) : null), [cache])

  return { get, add, persisted }
}

/** Foto global de versiones anteriores (una sola para todo el carrusel), si quedó guardada. */
export function readLegacyBackground(): string | null {
  try {
    return localStorage.getItem(LEGACY_KEY)
  } catch {
    return null
  }
}

export function dropLegacyBackground() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* sin acceso a localStorage */
  }
}

/** Borra de IndexedDB las fotos que ninguna placa usa (best-effort). */
export async function pruneBackgrounds(referenced: string[]) {
  try {
    const keep = new Set(referenced)
    for (const k of await listImageIds()) if (!keep.has(k)) await deleteImage(k)
  } catch {
    /* limpieza best-effort */
  }
}
