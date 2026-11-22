import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface MenuProps {
  /** Contenido del botón que abre el menú */
  label: ReactNode
  /** Nombre accesible del botón */
  ariaLabel: string
  title?: string
  buttonClass: string
  /** Lado al que se alinea el panel */
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
}

/** Menú desplegable de la barra superior (se cierra con Escape, clic afuera o al elegir). */
export function Menu({ label, ariaLabel, title, buttonClass, align = 'right', children }: MenuProps) {
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const open = pos !== null
  const toggle = () => {
    if (open) return setPos(null)
    const r = btn.current!.getBoundingClientRect()
    setPos(align === 'right' ? { top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) } : { top: r.bottom + 6, left: Math.max(8, r.left) })
  }
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node) && setPos(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    const onMove = () => setPos(null)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onMove)
    }
  }, [open])
  return (
    <div className="relative shrink-0">
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} title={title} onClick={toggle} className={buttonClass}>
        {label}
      </button>
      {/* En un portal con posición fija: ninguna barra con scroll ni contexto de apilamiento lo recorta. */}
      {pos &&
        createPortal(
          <div ref={panel} role="menu" aria-label={ariaLabel} style={{ position: 'fixed', top: pos.top, left: pos.left, right: pos.right }} className="z-[60] min-w-[240px] max-w-[calc(100vw-16px)] rounded-lg border border-line bg-surface p-1 shadow-2xl">
            {children(() => setPos(null))}
          </div>,
          document.body,
        )}
    </div>
  )
}

/** Opción de menú: acción simple o interruptor (menuitemcheckbox). */
export function MenuItem({ onSelect, checked, hint, disabled, children }: { onSelect: () => void; checked?: boolean; hint?: string; disabled?: boolean; children: ReactNode }) {
  const toggle = typeof checked === 'boolean'
  return (
    <button
      type="button"
      role={toggle ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={toggle ? checked : undefined}
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left font-mono text-[10px] font-semibold tracking-[0.08em] text-steel transition hover:bg-white/5 hover:text-white disabled:opacity-40"
    >
      <span className="flex flex-col gap-0.5">
        <span>{children}</span>
        {hint && <span className="font-normal tracking-normal text-steel/60 normal-case">{hint}</span>}
      </span>
      {toggle && <span className={`shrink-0 rounded px-1.5 py-px text-[9px] ${checked ? 'bg-cyan text-carbon' : 'border border-line text-steel/60'}`}>{checked ? 'ON' : 'OFF'}</span>}
    </button>
  )
}
