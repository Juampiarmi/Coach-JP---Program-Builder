import { useEffect, useRef, useState } from 'react'

/**
 * Estado sincronizado con localStorage (fusiona con los defaults para tolerar versiones viejas).
 * La escritura espera 250 ms para no serializar en cada tecla, pero se fuerza al cerrar o esconder
 * la pestaña: la última edición nunca se pierde.
 */
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
  // Último valor todavía sin escribir (null = ya está guardado). El valor recién leído del
  // almacenamiento no cuenta como pendiente: re-escribirlo podría pisar lo que guardó otra pestaña.
  const pending = useRef<T | null>(null)
  const loaded = useRef<T | null>(state)

  useEffect(() => {
    const write = () => {
      if (pending.current === null) return
      try {
        localStorage.setItem(key, JSON.stringify(pending.current))
      } catch {
        /* sin almacenamiento disponible */
      }
      pending.current = null
    }
    const onHide = () => document.visibilityState === 'hidden' && write()
    window.addEventListener('pagehide', write)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      write()
      window.removeEventListener('pagehide', write)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [key])

  useEffect(() => {
    if (state === loaded.current) return
    // Desde el primer cambio, todo se guarda (incluso volver con «deshacer» al estado inicial).
    loaded.current = null
    pending.current = state
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state))
        pending.current = null
      } catch {
        /* sin almacenamiento disponible */
      }
    }, 250)
    return () => window.clearTimeout(id)
  }, [key, state])

  return [state, setState] as const
}
