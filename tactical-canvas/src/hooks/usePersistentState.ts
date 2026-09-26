import { useEffect, useState } from 'react'

/** Estado sincronizado con localStorage (fusiona con los defaults para tolerar versiones viejas). */
export function usePersistentState<T extends object>(key: string, defaults: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<T>) }
    } catch {
      /* almacenamiento bloqueado o JSON corrupto: se usan los defaults */
    }
    return defaults
  })

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch {
        /* sin almacenamiento disponible */
      }
    }, 250)
    return () => window.clearTimeout(id)
  }, [key, state])

  return [state, setState] as const
}
