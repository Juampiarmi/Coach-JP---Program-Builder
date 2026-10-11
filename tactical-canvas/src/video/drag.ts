import type { PointerEvent as RPointerEvent } from 'react'

/**
 * Arrastre estricto: pointerdown → pointermove (sólo con el botón presionado) → pointerup.
 * Captura el puntero y se limpia ante pointerup, pointercancel o pérdida de captura; si llega
 * un movimiento sin botón presionado (se soltó fuera de la ventana), termina el arrastre en vez
 * de seguir al cursor. Así nada se mueve por simple hover.
 */
export function pressDrag(e: RPointerEvent, onMove: (ev: PointerEvent) => void, onEnd?: () => void) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const target = e.currentTarget as HTMLElement
  try {
    target.setPointerCapture(e.pointerId)
  } catch {
    /* sin captura disponible: igual se limpia en pointerup */
  }
  let active = true
  const end = () => {
    if (!active) return
    active = false
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', end)
    target.removeEventListener('pointercancel', end)
    target.removeEventListener('lostpointercapture', end)
    onEnd?.()
  }
  const move = (ev: PointerEvent) => {
    if (!active) return
    if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) return end()
    onMove(ev)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', end)
  target.addEventListener('pointercancel', end)
  target.addEventListener('lostpointercapture', end)
}
