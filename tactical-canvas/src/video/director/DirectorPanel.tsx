import type { DirectorPace } from '../../types/timelineDirector'
import { timecode } from '../render'
import type { DirectorState } from '../types'
import { barPathCues } from './inject'
import { MOOD_LABEL, STOCK_LABEL } from './stock'
import { PACE_RANGE } from './videoDirector'

interface Props {
  idea: string
  pace: DirectorPace
  busy: boolean
  /** Etapa en curso (IA, fondo, música) y progreso 0–1 si aplica */
  stage: string
  progress: number | null
  error: string
  director: DirectorState | null
  hasClip: boolean
  onIdea: (v: string) => void
  onPace: (p: DirectorPace) => void
  onGenerate: () => void
  onCancel: () => void
  onSeek: (t: number) => void
  onTeleprompter: () => void
}

const PACES: { id: DirectorPace; label: string; hint: string }[] = [
  { id: 'fast_kinetic', label: '⚡ BRUTALIST SHORT', hint: '15–20 s · cortes enérgicos' },
  { id: 'technical_breakdown', label: '🔬 DESGLOSE TÉCNICO', hint: '30–45 s · pausas de goniómetro' },
]

/** Panel del Director de Montaje IA: idea → montaje completo en V1, V2, S1, A1 y A2. */
export function DirectorPanel({ idea, pace, busy, stage, progress, error, director, hasClip, onIdea, onPace, onGenerate, onCancel, onSeek, onTeleprompter }: Props) {
  const out = director?.output
  const cues = director && out ? barPathCues(out, director.offset) : []
  return (
    <div className="space-y-3">
      <textarea
        className="tc-input resize-y text-[13px]"
        rows={4}
        value={idea}
        placeholder="Pegá tu idea, guion de placas o tema del reel"
        aria-label="Idea del reel"
        onChange={(e) => onIdea(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-1.5">
        {PACES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPace(p.id)}
            aria-pressed={pace === p.id}
            className={`rounded-lg border px-1.5 py-2 text-center font-mono transition ${pace === p.id ? 'border-fire bg-fire/15 text-fire' : 'border-line text-steel hover:text-white'}`}
          >
            <span className="block text-[10px] font-bold tracking-[0.06em]">[ {p.label} ]</span>
            <span className="mt-0.5 block text-[8px] tracking-wider opacity-80">
              ({PACE_RANGE[p.id][0]}-{PACE_RANGE[p.id][1]}s) · {p.hint.split(' · ')[1]}
            </span>
          </button>
        ))}
      </div>
      <p className="font-mono text-[9px] leading-relaxed text-steel/70">
        {hasClip ? 'Se monta sobre tu clip (la duración se ajusta al tramo recortado).' : 'Sin clip: se genera un fondo táctico de stock en tiempo real (después podés subir tu clip y regenerar).'} El montaje reemplaza V2, S1, B1, A3 y la música actual.
      </p>
      <button
        type="button"
        onClick={busy ? onCancel : onGenerate}
        disabled={!busy && !idea.trim()}
        className={`relative w-full overflow-hidden rounded-lg border py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
          busy ? 'border-fire/60 bg-fire/10 text-fire' : 'border-fire bg-fire text-carbon hover:brightness-110'
        }`}
      >
        {busy && <span className="absolute inset-y-0 left-0 bg-fire/25 transition-[width]" style={{ width: progress !== null ? `${progress * 100}%` : '33%' }} />}
        {busy && progress === null && <span className="absolute inset-y-0 left-0 w-1/3 animate-[tcscan_1.2s_ease-in-out_infinite] bg-fire/20" />}
        <span className="relative flex items-center justify-center gap-2">
          {busy && <span className="size-3 animate-spin rounded-full border-2 border-fire/30 border-t-fire" aria-hidden />}
          {busy ? '[ ✕ CANCELAR ]' : '[ ⚡ GENERAR MONTAJE COMPLETO ]'}
        </span>
      </button>
      {busy && stage && (
        <p role="status" className="animate-pulse font-mono text-[10px] leading-relaxed tracking-wider text-gold">
          {stage}
          {progress !== null ? ` ${Math.round(progress * 100)}%` : ''}
        </p>
      )}
      {error && <p className="font-mono text-[10px] leading-relaxed text-fire">{error}</p>}
      {out && director && !busy && (
        <div className="space-y-2 rounded-lg border border-line bg-surface-2/60 p-2.5">
          <p className="font-display text-[13px] leading-tight font-bold text-white uppercase">{out.title}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px] tracking-wider text-steel">
            <span>⏱ {out.durationSeconds.toFixed(1)} s · {out.pace === 'fast_kinetic' ? 'BRUTALIST' : 'TÉCNICO'}</span>
            <span>V1 · {STOCK_LABEL[out.v1_video.fallbackStockType]} · {out.v1_video.playbackRate}x</span>
            <span>V2 · {out.v2_overlays.length} eventos</span>
            <span>S1 · {out.s1_subtitles.length} segmentos</span>
            <span>A1 · {out.a1_voiceover.estimatedDuration}s · {out.a1_voiceover.targetWpm} ppm</span>
            <span>
              A2 · {MOOD_LABEL[out.a2_music.genreMood]} · {out.a2_music.baseVolume}%→{out.a2_music.duckingVolume}%
            </span>
          </div>
          {out.v1_video.playbackRate !== 1 && hasClip && (
            <p className="font-mono text-[9px] leading-relaxed text-gold/80">Velocidad sugerida para tu clip: {out.v1_video.playbackRate}x (el estudio lo reproduce a velocidad real; aplicala al grabar el clip).</p>
          )}
          {cues.length > 0 && (
            <div className="space-y-1">
              <p className="font-mono text-[9px] tracking-[0.12em] text-cyan uppercase">Trazar bar path en:</p>
              <div className="flex flex-wrap gap-1">
                {cues.map((c, i) => (
                  <button key={i} type="button" onClick={() => onSeek(c.t)} className="rounded border border-cyan/40 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-cyan hover:bg-cyan/10">
                    📍 {timecode(c.t).slice(0, 5)} · {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onTeleprompter}
            className="w-full rounded-lg border border-fire/60 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-fire transition hover:bg-fire/10"
          >
            [ 🎙 GRABAR CON TELEPROMPTER ]
          </button>
        </div>
      )}
    </div>
  )
}
