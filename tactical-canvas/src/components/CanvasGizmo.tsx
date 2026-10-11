import { useCallback, useEffect, useLayoutEffect, useState, type PointerEvent as RPointerEvent, type RefObject } from 'react'
import type { CanvasState, Nudge, NudgeTarget } from '../types'

interface Props {
  state: CanvasState
  /** Nodo del lienzo nativo (1080 px) */
  canvasRef: RefObject<HTMLDivElement | null>
  /** Escala de la vista previa (px de pantalla por px del lienzo) */
  scale: number
  onNudge: (target: NudgeTarget, nudge: Nudge | null) => void
}

const LABEL: Record<NudgeTarget, string> = { headline: 'TITULAR', block: 'BLOQUE' }
const IDENTITY: Nudge = { x: 0, y: 0, s: 1 }
const clampS = (s: number) => Math.min(1.6, Math.max(0.6, s))

/** Arrastre estricto (sólo con el botón presionado; se limpia en up / cancel / pérdida de captura). */
function drag(e: RPointerEvent, onMove: (ev: PointerEvent) => void) {
  e.preventDefault()
  e.stopPropagation()
  const el = e.currentTarget as HTMLElement
  try {
    el.setPointerCapture(e.pointerId)
  } catch {
    /* sin captura */
  }
  const move = (ev: PointerEvent) => (ev.buttons & 1 ? onMove(ev) : end())
  const end = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', end)
    el.removeEventListener('pointercancel', end)
    el.removeEventListener('lostpointercapture', end)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', end)
  el.addEventListener('lostpointercapture', end)
}

/**
 * Herramientas sobre el lienzo (sólo pantalla, nunca se exportan): click sobre el titular o el
 * bloque central lo selecciona con una caja táctica; arrastrar lo mueve y los nodos de esquina
 * lo escalan. El ajuste se guarda en px del lienzo nativo (`state.nudge`).
 */
export function CanvasGizmo({ state, canvasRef, scale, onNudge }: Props) {
  const [sel, setSel] = useState<NudgeTarget | null>(null)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)

  const target = useCallback((t: NudgeTarget) => canvasRef.current?.querySelector<HTMLElement>(`[data-nudge="${t}"]`) ?? null, [canvasRef])

  // Caja de selección alineada con el elemento real (se recalcula en cada render y al redimensionar).
  const measure = useCallback(() => {
    const el = sel ? target(sel) : null
    if (!el || !host) return setBox(null)
    const r = el.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    setBox({ x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height })
  }, [sel, target, host])
  useLayoutEffect(measure, [measure, state, scale])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])
  useEffect(() => {
    if (!sel) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSel(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel])
  // La plantilla cambió y el elemento ya no existe: se suelta la selección.
  useEffect(() => {
    if (sel && !target(sel)) setSel(null)
  }, [sel, target, state.template])

  const current = (t: NudgeTarget): Nudge => ({ ...IDENTITY, ...state.nudge?.[t] })

  const onDown = (e: RPointerEvent) => {
    if (e.button !== 0) return
    // ¿Qué bloque hay debajo del puntero? (la capa es transparente: se mira el lienzo de abajo)
    const hits = document.elementsFromPoint(e.clientX, e.clientY)
    const hit = hits.map((n) => (n as HTMLElement).closest?.('[data-nudge]') as HTMLElement | null).find((n) => n && canvasRef.current?.contains(n))
    const t = (hit?.dataset.nudge as NudgeTarget | undefined) ?? null
    setSel(t)
    if (!t) return
    const start = current(t)
    const x0 = e.clientX
    const y0 = e.clientY
    drag(e, (ev) => onNudge(t, { ...start, x: Math.round(start.x + (ev.clientX - x0) / scale), y: Math.round(start.y + (ev.clientY - y0) / scale) }))
  }

  const onCorner = (e: RPointerEvent) => {
    if (!sel || !box || e.button !== 0) return
    const start = current(sel)
    // Escala por distancia al centro de la caja (proporcional, sin deformar).
    const h = host!.getBoundingClientRect()
    const cx = h.left + box.x + box.w / 2
    const cy = h.top + box.y + box.h / 2
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1
    drag(e, (ev) => onNudge(sel, { ...start, s: Math.round(clampS(start.s * (Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0)) * 100) / 100 }))
  }

  const n = sel ? current(sel) : IDENTITY
  const handle = 'absolute size-3 rounded-[2px] border-2 border-cyan bg-carbon'
  return (
    <div ref={setHost} className="absolute inset-0" style={{ cursor: sel ? 'move' : 'default', touchAction: 'none' }} onPointerDown={onDown}>
      {sel && box && (
        <div className="pointer-events-none absolute border border-cyan shadow-[0_0_0_1px_rgba(0,0,0,.6)]" style={{ left: box.x - 4, top: box.y - 4, width: box.w + 8, height: box.h + 8 }}>
          <span className="absolute -top-5 left-0 flex items-center gap-1.5 rounded-sm bg-cyan px-1.5 py-px font-mono text-[9px] font-bold tracking-[0.12em] text-carbon">
            ◆ {LABEL[sel]} · {Math.round(n.s * 100)}%{n.x || n.y ? ` · ${n.x > 0 ? '+' : ''}${n.x},${n.y > 0 ? '+' : ''}${n.y}` : ''}
          </span>
          {(['-left-1.5 -top-1.5 cursor-nwse-resize', '-right-1.5 -top-1.5 cursor-nesw-resize', '-left-1.5 -bottom-1.5 cursor-nesw-resize', '-right-1.5 -bottom-1.5 cursor-nwse-resize'] as const).map((pos) => (
            <span key={pos} className={`${handle} ${pos} pointer-events-auto`} onPointerDown={onCorner} style={{ touchAction: 'none' }} />
          ))}
          <button
            type="button"
            title="Volver a la posición y escala original"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onNudge(sel, null)}
            className="pointer-events-auto absolute -top-5 right-0 rounded-sm border border-cyan/60 bg-carbon px-1 font-mono text-[9px] text-cyan hover:bg-cyan hover:text-carbon"
          >
            ⟲
          </button>
        </div>
      )}
    </div>
  )
}
