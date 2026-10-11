import { useRef, useState } from 'react'
import { Field, Segmented, Toggle } from '../components/controls/primitives'
import { timecode } from './render'
import type { SubtitleGroup } from './subtitles'
import type { SubtitleAccent, SubtitleStyle, SubtitleTrack } from './types'

interface Props {
  track: SubtitleTrack
  groups: SubtitleGroup[]
  activeIndex: number
  busy: boolean
  note: string
  canTranscribe: boolean
  /** Instante del cabezal: ahí se crea el subtítulo manual */
  time: number
  onManual: (text: string) => void
  onChange: (patch: Partial<SubtitleTrack>) => void
  onTranscribe: () => void
  onImport: (file: File) => void
  onSeek: (t: number) => void
  onEditText: (g: SubtitleGroup, text: string) => void
  onRetime: (g: SubtitleGroup, start: number, end: number) => void
  onRemove: (g: SubtitleGroup) => void
}

const numCls = 'tc-input w-[68px] shrink-0 px-1 text-center font-mono text-[10px] tabular-nums'

/** Panel S1: transcripción con IA, importación .SRT/.VTT, edición rápida y estilo karaoke. */
export function SubtitlePanel({ track, groups, activeIndex, busy, note, canTranscribe, time, onManual, onChange, onTranscribe, onImport, onSeek, onEditText, onRetime, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [manual, setManual] = useState<string | null>(null)
  const offset = track.offset ?? 0
  const addManual = () => {
    if (manual?.trim()) onManual(manual)
    setManual(null)
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onTranscribe}
          disabled={!canTranscribe && !busy}
          className={`rounded-lg border py-2 font-mono text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40 ${
            busy ? 'border-gold/60 bg-gold/10 text-gold' : 'border-cyan/50 text-cyan hover:bg-cyan/10'
          }`}
        >
          {busy ? '[ ✕ CANCELAR ]' : '[ 🎙 TRANSCRIBIR IA ]'}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} title="Importar subtítulos .SRT o .VTT" className="rounded-lg border border-line py-2 font-mono text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap text-steel transition hover:border-cyan/50 hover:text-cyan">
          [ 📄 IMPORTAR .SRT ]
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".srt,.vtt,text/vtt,application/x-subrip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImport(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => setManual((m) => (m === null ? '' : null))}
          aria-pressed={manual !== null}
          className={`col-span-2 rounded-lg border py-2 font-mono text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap transition ${
            manual !== null ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:border-fire/50 hover:text-fire'
          }`}
        >
          [ + AGREGAR MANUAL ]
        </button>
      </div>
      {manual !== null && (
        <div className="space-y-1.5 rounded-md border border-fire/40 bg-fire/5 p-2">
          <p className="font-mono text-[9px] tracking-[0.14em] text-fire uppercase">Nuevo bloque en {timecode(time)}</p>
          <div className="flex gap-1.5">
            <input
              autoFocus
              className="tc-input min-w-0 flex-1 text-[12px]"
              value={manual}
              placeholder="Ej: RIR 1 REAL"
              aria-label="Texto del subtítulo manual"
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addManual()
                if (e.key === 'Escape') setManual(null)
              }}
            />
            <button type="button" onClick={addManual} disabled={!manual.trim()} className="rounded-md border border-fire bg-fire px-3 font-mono text-[10px] font-bold tracking-wider text-carbon disabled:opacity-40">
              ✓ CREAR
            </button>
          </div>
        </div>
      )}
      {busy ? (
        <div className="space-y-1.5 rounded-md border border-gold/40 bg-gold/5 p-2" role="status" aria-live="polite">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-gold">
            <span className="size-3 shrink-0 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            PROCESANDO AUDIO CON GEMINI…
          </p>
          <div className="relative h-1 overflow-hidden rounded-full bg-surface-2">
            <span className="absolute inset-y-0 left-0 w-1/3 animate-[tcscan_1.2s_ease-in-out_infinite] rounded-full bg-gold" />
          </div>
          {note && <p className="font-mono text-[9px] leading-relaxed text-gold/80">{note}</p>}
        </div>
      ) : (
        note && <p className="font-mono text-[10px] leading-relaxed text-steel">{note}</p>
      )}
      <Field label="Estilo de fondo" plain>
        <Segmented<SubtitleStyle>
          value={track.style}
          onChange={(style) => onChange({ style })}
          options={[
            { value: 'outline', label: 'TEXTO PURO C/ CONTORNO' },
            { value: 'pill', label: 'PASTILLA OSCURA' },
          ]}
          size="sm"
        />
      </Field>
      <Field label="Acento de palabra activa" plain>
        <Segmented<SubtitleAccent>
          value={track.accent}
          onChange={(accent) => onChange({ accent })}
          options={[
            { value: 'orange', label: '🟧 NARANJA' },
            { value: 'cyan', label: '🟦 CIAN' },
          ]}
          size="sm"
        />
      </Field>
      <Field label={`⏱ Desfase global: ${offset > 0 ? '+' : ''}${offset} ms`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-500}
            max={500}
            step={10}
            value={offset}
            onChange={(e) => onChange({ offset: Number(e.target.value) })}
            aria-label="Desfase global de subtítulos"
            className="h-1.5 flex-1 cursor-pointer accent-cyan"
          />
          <button type="button" onClick={() => onChange({ offset: 0 })} disabled={!offset} className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-steel hover:text-white disabled:opacity-30">
            0
          </button>
        </div>
        <p className="mt-1 flex justify-between font-mono text-[8px] tracking-wider text-steel/60">
          <span>◀ ADELANTA</span>
          <span>ATRASA ▶</span>
        </p>
      </Field>
      {groups.length > 0 && (
        <>
          <Toggle label="Mostrar subtítulos" checked={track.enabled} onChange={(enabled) => onChange({ enabled })} />
          <div>
            <p className="mb-1 flex justify-between font-mono text-[9px] tracking-[0.14em] text-steel uppercase">
              <span>Edición rápida · {groups.length} bloques</span>
              <span>inicio · fin (s)</span>
            </p>
            <div className="tc-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {groups.map((g, i) => (
                <div key={`${g.from}-${g.start}`} className={`space-y-1 rounded-md border p-1.5 ${i === activeIndex ? 'border-fire/60 bg-fire/5' : 'border-line'}`}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onSeek(g.start)} title="Ir a este bloque" className="font-mono text-[9px] tracking-wider text-steel hover:text-cyan">
                      ▶ {timecode(g.start)}
                    </button>
                    <span className="flex-1" />
                    <input className={numCls} type="number" step={0.05} min={0} value={g.start.toFixed(2)} onChange={(e) => onRetime(g, Number(e.target.value), g.end + (Number(e.target.value) - g.start))} aria-label="Inicio del bloque" />
                    <input className={numCls} type="number" step={0.05} min={0} value={g.end.toFixed(2)} onChange={(e) => onRetime(g, g.start, Math.max(g.start + 0.1, Number(e.target.value)))} aria-label="Fin del bloque" />
                    <button type="button" onClick={() => onRemove(g)} title="Eliminar bloque" className="w-6 rounded border border-line font-mono text-[11px] text-steel hover:text-fire">
                      ×
                    </button>
                  </div>
                  <input
                    className="tc-input w-full text-[12px]"
                    defaultValue={g.text}
                    key={g.text}
                    onBlur={(e) => e.target.value.trim() !== g.text && onEditText(g, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    aria-label="Texto del bloque"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
