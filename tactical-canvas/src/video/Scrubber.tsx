import { useRef, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import { pressDrag } from './drag'

interface Props {
  time: number
  duration: number
  /** Tramo recortado (In / Out) resaltado en la barra */
  trim?: { in: number; out: number } | null
  onSeek: (t: number) => void
}

/**
 * Scrubber del transporte. El tiempo cambia sólo con click directo o arrastre con el botón
 * presionado (nunca por hover) y con las flechas del teclado (±0,1 s; Shift ±1 s).
 */
export function Scrubber({ time, duration, trim, onSeek }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const d = Math.max(0.01, duration)
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / d) * 100))}%`
  const fromX = (x: number) => {
    const r = ref.current!.getBoundingClientRect()
    return Math.min(d, Math.max(0, ((x - r.left) / r.width) * d))
  }
  const onDown = (e: RPointerEvent) => {
    if (e.button !== 0) return
    onSeek(fromX(e.clientX))
    pressDrag(e, (ev) => onSeek(fromX(ev.clientX)))
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 1 : 0.1
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      onSeek(Math.min(d, Math.max(0, time + (e.key === 'ArrowRight' ? step : -step))))
    }
  }
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Scrubber"
      aria-valuemin={0}
      aria-valuemax={Math.round(d * 100) / 100}
      aria-valuenow={Math.round(time * 100) / 100}
      onPointerDown={onDown}
      onKeyDown={onKey}
      className="relative h-6 min-w-0 flex-1 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-cyan/60"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15" />
      {trim && <div className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-cyan/30" style={{ left: pct(trim.in), width: `calc(${pct(trim.out)} - ${pct(trim.in)})` }} />}
      <div className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-fire" style={{ width: pct(time) }} />
      <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fire shadow-[0_0_8px_rgba(234,88,12,.8)]" style={{ left: pct(time) }} />
    </div>
  )
}
