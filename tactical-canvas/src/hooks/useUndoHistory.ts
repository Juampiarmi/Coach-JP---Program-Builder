import { useCallback, useEffect, useRef, useState } from 'react'

/** Pasos de historial guardados (los más viejos se descartan). */
const MAX_STEPS = 60
/** Cambios más seguidos que esto (tipeo continuo, arrastre) son UN solo paso de deshacer. */
const COALESCE_MS = 700

interface Options<T> {
  /** ¿El cambio entre dos estados merece un paso de historial? (ej: cambiar de pestaña de placa, no) */
  meaningful: (prev: T, next: T) => boolean
  /** Mientras es true (exportación en curso), los cambios no entran al historial */
  paused: boolean
}

/**
 * Deshacer / rehacer sobre un estado existente: observa sus cambios y guarda instantáneas. Los
 * cambios rápidos se agrupan en un solo paso, los que no importan (selección) no se guardan, y una
 * edición nueva descarta lo que se podía rehacer.
 */
export function useUndoHistory<T>(value: T, setValue: (v: T) => void, { meaningful, paused }: Options<T>) {
  const h = useRef({ past: [] as T[], future: [] as T[], prev: value, last: 0, applying: false })
  const [, setTick] = useState(0)
  const meaningfulRef = useRef(meaningful)
  meaningfulRef.current = meaningful

  useEffect(() => {
    const s = h.current
    if (s.prev === value) return
    if (s.applying || paused || !meaningfulRef.current(s.prev, value)) {
      s.applying = false
      s.prev = value
      return
    }
    const now = Date.now()
    if (now - s.last > COALESCE_MS) {
      s.past.push(s.prev)
      if (s.past.length > MAX_STEPS) s.past.shift()
    }
    s.last = now
    s.future = []
    s.prev = value
    setTick((t) => t + 1)
  }, [value, paused])

  const go = useCallback(
    (dir: 'undo' | 'redo') => {
      const s = h.current
      const from = dir === 'undo' ? s.past : s.future
      const to = dir === 'undo' ? s.future : s.past
      const target = from.pop()
      if (target === undefined) return
      to.push(s.prev)
      s.applying = true
      s.last = 0
      setValue(target)
      setTick((t) => t + 1)
    },
    [setValue],
  )

  return {
    undo: useCallback(() => go('undo'), [go]),
    redo: useCallback(() => go('redo'), [go]),
    canUndo: h.current.past.length > 0,
    canRedo: h.current.future.length > 0,
  }
}
