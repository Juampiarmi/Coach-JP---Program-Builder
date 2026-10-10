export type WorkMode = 'canvas' | 'video'

/** Selector de modo de trabajo: placas estáticas o Video Studio (cada uno conserva su estado). */
export function ModeSwitch({ mode, onChange, compact = false }: { mode: WorkMode; onChange: (m: WorkMode) => void; compact?: boolean }) {
  const opts: { value: WorkMode; label: string; short: string }[] = [
    { value: 'canvas', label: '[ 🖼 TACTICAL CANVAS ]', short: '🖼 CANVAS' },
    { value: 'video', label: '[ 🎬 TACTICAL VIDEO ]', short: '🎬 VIDEO' },
  ]
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-0.5" role="tablist" aria-label="Modo de trabajo">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={mode === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap transition ${
            mode === o.value ? (o.value === 'video' ? 'bg-fire text-carbon' : 'bg-cyan text-carbon') : 'text-steel hover:bg-white/5 hover:text-white'
          }`}
        >
          {compact ? o.short : o.label}
        </button>
      ))}
    </div>
  )
}
