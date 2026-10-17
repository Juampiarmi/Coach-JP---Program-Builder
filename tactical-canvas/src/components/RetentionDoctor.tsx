import { forwardRef } from 'react'
import { LIMITS, SCORE_COLOR, type DoctorFix, type DoctorReport } from '../lib/retentionDoctor'

interface Props {
  report: DoctorReport
  active: number
  open: boolean
  onToggle: () => void
  onSelect: (i: number) => void
  onFix: (fix: DoctorFix) => void
  onFixAll: () => void
}

/** 🩺 Doctor de retención: puntaje en vivo, lectura por placa y hallazgos con su fix de 1 clic. */
export const RetentionDoctor = forwardRef<HTMLDivElement, Props>(function RetentionDoctor({ report, active, open, onToggle, onSelect, onFix, onFixAll }, ref) {
  const { score, stats, findings, totalSeconds } = report
  const color = SCORE_COLOR(score)
  const fixable = findings.filter((f) => f.fix).length
  const max = Math.max(LIMITS.critical, ...stats.map((s) => s.words))
  return (
    <div ref={ref} id="retention-doctor" className="border-b border-line px-5 py-3">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-steel uppercase">🩺 Doctor de retención</span>
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-steel/80">
          {findings.length ? `${findings.length} hallazgo${findings.length > 1 ? 's' : ''}` : 'sin hallazgos'} · ~{totalSeconds} s
          <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-carbon" style={{ background: color }}>
            {score}
          </span>
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {/* Lectura por placa: barra = palabras (marcas en el límite de swipe), color = estado */}
          <div className="flex items-end gap-1" role="list" aria-label="Palabras por placa">
            {stats.map((s, i) => {
              const limit = i === 0 && stats.length > 1 ? LIMITS.cover : LIMITS.warn
              const tone = s.words > (i === 0 && stats.length > 1 ? LIMITS.warn : LIMITS.critical) ? 'bg-fire' : s.words > limit ? 'bg-gold' : 'bg-cyan/70'
              return (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  onClick={() => onSelect(i)}
                  title={`Placa ${i + 1}: ${s.words} palabras · ~${s.seconds} s${s.contrast ? ` · contraste ${s.contrast.toFixed(1)}:1` : ''}`}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md p-1 transition ${i === active ? 'bg-white/5 ring-1 ring-cyan/40' : 'hover:bg-white/5'}`}
                >
                  <span className="relative flex h-12 w-full items-end overflow-hidden rounded-sm bg-surface-2">
                    <span className={`w-full ${tone}`} style={{ height: `${Math.max(6, (s.words / max) * 100)}%` }} />
                    <span className="absolute inset-x-0 border-t border-dashed border-white/30" style={{ bottom: `${(limit / max) * 100}%` }} />
                  </span>
                  <span className="font-mono text-[9px] text-steel">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-[8px] text-steel/70">{s.seconds}s</span>
                </button>
              )
            })}
          </div>
          {findings.length === 0 ? (
            <p className="font-mono text-[10px] text-cyan">✓ Listo para publicar: lectura ágil, cierre con CTA, formatos variados y titulares legibles.</p>
          ) : (
            <ul className="space-y-1.5">
              {findings.map((f) => (
                <li key={f.id} className={`rounded-md border-l-2 bg-surface-2/60 px-2.5 py-2 ${f.severity === 'critical' ? 'border-fire' : 'border-gold'}`}>
                  <button type="button" onClick={() => f.slide !== null && onSelect(f.slide)} className="block w-full text-left">
                    <span className={`block text-[12px] leading-snug font-semibold ${f.severity === 'critical' ? 'text-fire' : 'text-gold'}`}>{f.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-steel">{f.detail}</span>
                  </button>
                  {f.fix && (
                    <button
                      type="button"
                      onClick={() => onFix(f.fix!)}
                      className="mt-1.5 rounded border border-cyan/50 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-cyan transition hover:bg-cyan/10"
                    >
                      ⚡ FIX · {f.fixLabel}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {fixable > 1 && (
            <button type="button" onClick={onFixAll} className="w-full rounded-md border border-cyan/60 bg-cyan/5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-cyan transition hover:bg-cyan/10">
              [ ⚡ APLICAR LOS {fixable} FIXES ]
            </button>
          )}
        </div>
      )}
    </div>
  )
})
