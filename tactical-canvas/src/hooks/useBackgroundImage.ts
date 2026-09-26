import { useCallback, useState } from 'react'

const KEY = 'jp-tactical-canvas:bg'

/** Foto de fondo con persistencia best-effort (si no entra en localStorage, queda en memoria). */
export function useBackgroundImage() {
  const [image, setImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  })
  const [persisted, setPersisted] = useState(true)

  const update = useCallback((next: string | null) => {
    setImage(next)
    try {
      if (next) localStorage.setItem(KEY, next)
      else localStorage.removeItem(KEY)
      setPersisted(true)
    } catch {
      setPersisted(false)
    }
  }, [])

  return { image, setImage: update, persisted }
}
