interface Props {
  /** Nombre del proyecto abierto (null = el set no está en la biblioteca) */
  projectName: string | null
  /** Día del Plan Semanal abierto (se guarda en el plan, no en la biblioteca) */
  packDayLabel: string | null
  count: number
  /** El set en pantalla es el de ejemplo, sin cambios: no hay nada pendiente de guardar */
  pristine?: boolean
  onOpenLibrary: () => void
  onSave: () => void
  compact?: boolean
}

/** Estado del set en pantalla + acceso a la biblioteca: «📁 PROYECTOS · Rugby pretemporada ✓». */
export function ProjectBar({ projectName, packDayLabel, count, pristine = false, onOpenLibrary, onSave, compact = false }: Props) {
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onOpenLibrary}
        title="Biblioteca de proyectos guardados"
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-steel transition hover:border-cyan/50 hover:text-cyan"
      >
        📁 {compact ? '' : 'PROYECTOS'}
        {count > 0 && <span className="rounded bg-surface-2 px-1 text-[9px] text-steel/80">{count}</span>}
      </button>
      {projectName ? (
        <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] tracking-wide text-steel" title={`Proyecto «${projectName}»: cada cambio se guarda solo`}>
          <span className="max-w-[160px] truncate text-white">{projectName}</span>
          <span className="shrink-0 text-cyan">✓</span>
        </span>
      ) : packDayLabel ? (
        <span className="hidden font-mono text-[10px] tracking-wide text-steel/80 sm:inline" title="Este set se guarda en el Plan Semanal">
          📅 {packDayLabel}
        </span>
      ) : pristine ? null : (
        <button
          type="button"
          onClick={onSave}
          title="El set actual no está en la biblioteca: guardalo con nombre"
          className="shrink-0 rounded-md border border-gold/50 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-gold transition hover:bg-gold/10"
        >
          ● SIN GUARDAR · 💾
        </button>
      )}
    </div>
  )
}
