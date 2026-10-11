import { Field, Range, Toggle } from '../components/controls/primitives'
import { timecode } from './render'
import type { MusicTrack } from './types'

interface Props {
  music: MusicTrack | null
  hasSpeech: boolean
  /** Abre el selector de archivo (el input vive en el estudio para poder dispararlo desde el timeline) */
  onPick: () => void
  onChange: (patch: Partial<MusicTrack>) => void
  onRemove: () => void
}

/** Panel A2: beat / música de fondo con volumen y auto-ducking. */
export function MusicPanel({ music, hasSpeech, onPick, onChange, onRemove }: Props) {
  return (
    <div className="space-y-3">
      <button type="button" onClick={onPick} className="w-full rounded-lg border border-dashed border-cyan/50 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-cyan transition hover:bg-cyan/10">
        [ 🎵 SUBIR AUDIO / BEAT (.MP3 / .WAV) ]
      </button>
      {music && (
        <>
          <div className="flex items-center justify-between font-mono text-[10px] text-steel">
            <span className="truncate">
              {music.name} · {timecode(music.duration)}
            </span>
            <button type="button" onClick={onRemove} className="ml-2 shrink-0 rounded border border-line px-2 py-0.5 tracking-wider hover:border-fire/60 hover:text-fire">
              QUITAR
            </button>
          </div>
          <Field label="Volumen de la música">
            <Range value={music.volume} onChange={(volume) => onChange({ volume })} min={0} max={100} step={1} suffix="%" />
          </Field>
          <Toggle label="⚡ Auto-ducking inteligente" checked={music.ducking} onChange={(ducking) => onChange({ ducking })} />
          <p className="font-mono text-[9px] leading-relaxed text-steel/70">
            {music.ducking
              ? hasSpeech
                ? 'Mientras hay palabras en S1 la música baja a −18 dB (15 %) y vuelve con una rampa de 0,2 s.'
                : 'El ducking usa los tiempos de S1: transcribí o importá subtítulos para activarlo.'
              : 'La música suena al volumen elegido durante todo el video.'}
          </p>
        </>
      )}
    </div>
  )
}
