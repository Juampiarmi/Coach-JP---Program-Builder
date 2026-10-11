import { Field, Range } from '../components/controls/primitives'
import { FX_META } from './fx'
import { timecode } from './render'
import type { FxKind, SoundFx } from './types'

interface Props {
  fx: SoundFx
  time: number
  onAdd: (kind: FxKind) => void
  onChange: (patch: Partial<SoundFx>) => void
  onRemove: (id: string) => void
}

/** Panel A3: disparos de Sound FX en la posición del cabezal y volumen maestro. */
export function FxPanel({ fx, time, onAdd, onChange, onRemove }: Props) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[9px] leading-relaxed text-steel/70">Tocá un efecto para agregarlo en {timecode(time)} (posición del cabezal). Después arrastralo en la pista A3.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(FX_META) as FxKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onAdd(k)}
            className="rounded-lg border border-line px-2 py-2 text-left font-mono text-[10px] font-semibold tracking-[0.06em] text-steel transition hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan"
          >
            <span className="mr-1">{FX_META[k].icon}</span>
            {FX_META[k].label}
          </button>
        ))}
      </div>
      <Field label="Volumen maestro Sound FX">
        <Range value={fx.volume} onChange={(volume) => onChange({ volume })} min={0} max={100} step={1} suffix="%" />
      </Field>
      {fx.hits.length > 0 && (
        <div className="space-y-1">
          <p className="flex justify-between font-mono text-[9px] tracking-[0.14em] text-steel uppercase">
            <span>{fx.hits.length} disparos</span>
            <button type="button" onClick={() => onChange({ hits: [] })} className="tracking-wider hover:text-fire">
              BORRAR TODOS
            </button>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...fx.hits]
              .sort((a, b) => a.t - b.t)
              .map((h) => (
                <span key={h.id} className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-steel">
                  {FX_META[h.kind].icon} {timecode(h.t)}
                  <button type="button" onClick={() => onRemove(h.id)} aria-label="Quitar disparo" className="text-steel/70 hover:text-fire">
                    ×
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
