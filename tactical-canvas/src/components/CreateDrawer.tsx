import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * MODO CREAR: el Plan Semanal (LUN–DOM), el Generador IA y el generador sin API viven juntos acá. El
 * Estudio de Edición queda limpio: al cargar un día o generar un set, el drawer se cierra solo.
 */
export function CreateDrawer({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  // Queda montado aunque esté cerrado: una generación en curso, el brief escrito y la rotación de
  // variantes locales no se pierden al cerrarlo.
  return (
    <div hidden={!open} className={`fixed inset-0 z-50 justify-start bg-black/60 backdrop-blur-sm ${open ? 'flex' : 'hidden'}`} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear · Plan semanal e IA"
        className="flex h-full w-full max-w-[460px] flex-col border-r border-line bg-carbon shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-mono text-[12px] font-semibold tracking-[0.18em] text-cyan">[ + CREAR · PLAN & IA ]</h2>
            <p className="mt-0.5 font-mono text-[9px] tracking-wider text-steel/70">Cargá un día del plan, generá con IA o armá una variante sin API.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-steel hover:text-white">
            ✕
          </button>
        </div>
        <div className="tc-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
