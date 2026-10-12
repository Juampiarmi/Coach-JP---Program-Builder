/**
 * Fotos de fondo por placa: cada imagen vive en IndexedDB bajo un id propio y la placa sólo guarda
 * ese id (`bgImageId`). Así el carrusel no revienta la cuota de localStorage con N fotos en base64,
 * y cambiar la foto de una placa nunca toca las demás (una foto nueva = un id nuevo).
 */

const DB = 'jp-tactical-canvas'
const STORE = 'bg-images'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'))
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbPromise.catch(() => (dbPromise = null))
  }
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export function newImageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const putImage = (id: string, dataUrl: string) => tx('readwrite', (s) => s.put(dataUrl, id)).then(() => undefined)
export const getImage = (id: string) => tx<string | undefined>('readonly', (s) => s.get(id) as IDBRequest<string | undefined>)
export const deleteImage = (id: string) => tx('readwrite', (s) => s.delete(id)).then(() => undefined)
export const listImageIds = () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((keys) => keys.map(String))
