import { Field, Range, Toggle } from '../components/controls/primitives'
import { timecode } from './render'
import type { VoiceClip } from './types'

interface Props {
  clips: VoiceClip[]
  selected: VoiceClip | null
  recording: { elapsed: number; level: number } | null
  /** Reproducir el video mientras se graba (para hablar al ritmo del levantamiento) */
  playWhileRec: boolean
  canRecord: boolean
  busy: boolean
  note: string
  onPlayWhileRec: (v: boolean) => void
  onRecord: () => void
  onStop: () => void
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<VoiceClip>) => void
  onTranscribe: (id: string) => void
  onRemove: (id: string) => void
}

/** VU meter: barra segmentada verde → ámbar → rojo con el pico en vivo. */
function Meter({ level }: { level: number }) {
  const n = 24
  const lit = Math.round(Math.min(1, level * 1.15) * n)
  return (
    <div className="flex h-3 gap-[2px]" role="meter" aria-label="Nivel del micrófono" aria-valuenow={Math.round(level * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`flex-1 rounded-[1px] ${i < lit ? (i >= n - 3 ? 'bg-fire' : i >= n - 8 ? 'bg-gold' : 'bg-cyan') : 'bg-surface-2'}`} />
      ))}
    </div>
  )
}

/** Panel A1: grabación de voz en off por micrófono, mejora de voz y transcripción a S1. */
export function VoicePanel({ clips, selected, recording, playWhileRec, canRecord, busy, note, onPlayWhileRec, onRecord, onStop, onSelect, onChange, onTranscribe, onRemove }: Props) {
  return (
    <div className="space-y-3">
      {recording ? (
        <div className="space-y-2 rounded-lg border border-fire/60 bg-fire/10 p-2.5">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold tracking-[0.12em] text-fire">
            <span className="flex items-center gap-2">
              <span className="size-2.5 animate-pulse rounded-full bg-fire" />
              REC
            </span>
            <span className="tabular-nums text-white">{timecode(recording.elapsed)}</span>
          </div>
          <Meter level={recording.level} />
          <button type="button" onClick={onStop} className="w-full rounded-lg border border-fire bg-fire py-2 font-mono text-[11px] font-bold tracking-[0.1em] text-carbon transition hover:brightness-110">
            [ ⏹ DETENER Y GUARDAR ]
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onRecord}
            disabled={!canRecord}
            className="w-full rounded-lg border border-fire/60 py-2.5 font-mono text-[11px] font-semibold tracking-[0.12em] text-fire transition hover:bg-fire/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            [ 🎙 GRABAR VOZ ]
          </button>
          <Toggle label="Reproducir el video mientras grabo" checked={playWhileRec} onChange={onPlayWhileRec} />
          <p className="font-mono text-[9px] leading-relaxed text-steel/70">
            La toma arranca en la posición del cabezal. Con el video corriendo podés narrar al ritmo del levantamiento; usá auriculares para que no se cuele el audio.
          </p>
        </>
      )}
      {note && <p className={`font-mono text-[10px] leading-relaxed ${busy ? 'animate-pulse text-gold' : 'text-steel'}`}>{note}</p>}
      {clips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {clips.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`rounded border px-2 py-0.5 font-mono text-[9px] tracking-wider ${c.id === selected?.id ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:text-white'}`}
            >
              🎙{String(i + 1).padStart(2, '0')} · {timecode(c.start).slice(0, 5)} · {c.duration.toFixed(1)}s{c.enhance ? ' · ✨' : ''}
            </button>
          ))}
        </div>
      )}
      {selected && !recording && (
        <div className="space-y-2.5 border-t border-line pt-3">
          <Toggle label="✨ Mejorar voz (Studio Clean)" checked={selected.enhance} onChange={(enhance) => onChange(selected.id, { enhance })} />
          <p className="font-mono text-[9px] leading-relaxed text-steel/70">
            {selected.enhance
              ? 'Highpass 85 Hz (rumble y popeo) · presencia +3,5 dB a 3,2 kHz · compresor −20 dB 4:1 para pegada de locución.'
              : 'Voz cruda, tal como la grabó el micrófono.'}
          </p>
          <Field label="Volumen de la voz">
            <Range value={selected.gain} onChange={(gain) => onChange(selected.id, { gain })} min={0} max={150} step={5} suffix="%" />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <button
              type="button"
              onClick={() => onTranscribe(selected.id)}
              disabled={busy}
              className="rounded-lg border border-cyan/50 py-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-cyan transition hover:bg-cyan/10 disabled:opacity-40"
            >
              [ ⚡ TRANSCRIBIR ESTA VOZ ]
            </button>
            <button type="button" onClick={() => onRemove(selected.id)} className="rounded-lg border border-line px-2.5 font-mono text-[9px] tracking-wider text-steel hover:border-fire/60 hover:text-fire">
              ELIMINAR
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
