import { useRef } from 'react'
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
export function SubtitlePanel({ track, groups, activeIndex, busy, note, canTranscribe, onChange, onTranscribe, onImport, onSeek, onEditText, onRetime, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan">[ S1 · SUBTÍTULOS ]</h3>
      <div className="grid grid-cols-[1.4fr_1fr] gap-1.5">
        <button
          type="button"
          onClick={onTranscribe}
          disabled={!canTranscribe && !busy}
          className={`rounded-lg border py-2 font-mono text-[10px] font-semibold tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
            busy ? 'border-gold/60 bg-gold/10 text-gold' : 'border-cyan/50 text-cyan hover:bg-cyan/10'
          }`}
        >
          {busy ? '[ TRANSCRIBIENDO… · CANCELAR ]' : '[ 🎙 TRANSCRIBIR AUDIO CON IA ]'}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-line py-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-steel transition hover:border-cyan/50 hover:text-cyan">
          [ 📄 IMPORTAR .SRT / .VTT ]
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
      </div>
      {note && <p className={`font-mono text-[10px] leading-relaxed ${busy ? 'animate-pulse text-gold/90' : 'text-steel'}`}>{note}</p>}
      {groups.length > 0 && (
        <>
          <Toggle label="Mostrar subtítulos" checked={track.enabled} onChange={(enabled) => onChange({ enabled })} />
          <Field label="Estilo" plain>
            <Segmented<SubtitleStyle>
              value={track.style}
              onChange={(style) => onChange({ style })}
              options={[
                { value: 'outline', label: 'TEXTO LIMPIO CON CONTORNO' },
                { value: 'pill', label: 'PASTILLA OSCURA' },
              ]}
              size="sm"
            />
          </Field>
          <Field label="Palabra activa" plain>
            <Segmented<SubtitleAccent>
              value={track.accent}
              onChange={(accent) => onChange({ accent })}
              options={[
                { value: 'orange', label: 'NARANJA ELÉCTRICO' },
                { value: 'cyan', label: 'CIAN TÁCTICO' },
              ]}
              size="sm"
            />
          </Field>
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
