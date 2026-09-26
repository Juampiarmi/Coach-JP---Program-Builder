import { useLayoutEffect, useRef, useState } from 'react'

/** Escala que hace entrar un lienzo de w×h dentro del contenedor observado. */
export function useFitScale(w: number, h: number, gutter = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const cw = Math.max(0, el.clientWidth - gutter * 2)
      const ch = Math.max(0, el.clientHeight - gutter * 2)
      if (cw && ch) setScale(Math.min(cw / w, ch / h))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h, gutter])

  return { ref, scale }
}
