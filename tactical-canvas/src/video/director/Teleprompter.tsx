import { useEffect, useMemo, useRef } from 'react'
import { timecode } from '../render'
import type { DirectorState } from '../types'
import { scriptTimeline } from './inject'

interface Props {
  director: DirectorState
  time: number
  recording: { elapsed: number; level: number } | null
  onRecord: () => void
  onStop: () => void
  onClose: () => void
}

/**
 * Teleprompter del guion de A1: la frase que corresponde al segundo del cabezal se resalta y
 * queda centrada. Grabar arranca el video desde el inicio del montaje, captura el micrófono y
 * deja la toma en A1 con la cadena Studio Clean (high-pass + presencia + compresor).
 */
export function Teleprompter({ director, time, recording, onRecord, onStop, onClose }: Props) {
  const lines = useMemo(() => scriptTimeline(director.output, director.offset), [director])
  const current = lines.findIndex((l) => time >= l.start && time < l.end)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-line="${current}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [current])
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex max-h-[46%] flex-col rounded-t-xl border border-fire/50 bg-carbon/95 shadow-[0_-20px_60px_rgba(0,0,0,.8)] backdrop-blur" role="dialog" aria-label="Teleprompter">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-fire">[ 🎙 TELEPROMPTER · {director.output.title} ]</span>
        <span className="font-mono text-[11px] tracking-wider text-white tabular-nums">{timecode(time)}</span>
      </div>
      <div ref={listRef} className="tc-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
        {lines.map((l, i) => (
          <p
            key={i}
            data-line={i}
            className={`font-display text-[22px] leading-snug font-bold uppercase transition-colors lg:text-[28px] ${i === current ? 'text-white' : i < current ? 'text-steel/40' : 'text-steel/70'}`}
          >
            {i === current && <span className="mr-2 text-fire">▶</span>}
            {l.text}
          </p>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        {recording ? (
          <>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.12em] text-fire">
              <span className="size-2.5 animate-pulse rounded-full bg-fire" /> REC {timecode(recording.elapsed)}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full bg-cyan transition-[width]" style={{ width: `${Math.min(100, recording.level * 115)}%` }} />
            </span>
            <button type="button" onClick={onStop} className="rounded-lg border border-fire bg-fire px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] text-carbon">
              [ ⏹ DETENER Y GUARDAR ]
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onRecord} className="flex-1 rounded-lg border border-fire bg-fire py-2 font-mono text-[11px] font-bold tracking-[0.1em] text-carbon hover:brightness-110">
              [ ● GRABAR DESDE 00:00 ]
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-2 font-mono text-[10px] tracking-wider text-steel hover:text-white">
              CERRAR
            </button>
          </>
        )}
      </div>
    </div>
  )
}
