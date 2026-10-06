import { useRef, useState } from 'react'
import { generateHooks, HOOK_ANGLE_LABEL, loadAiSettings, RateLimitError, suggestCitation, type Discipline, type HookVariant } from '../../lib/ai'
import type { CanvasState } from '../../types'

interface Ctx {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  /** Tema de la secuencia (o el titular si no hubo generación) */
  topic: string
  discipline: Discipline
}

const errorText = (err: unknown) =>
  err instanceof RateLimitError
    ? 'Cuota de la API alcanzada. Esperá un momento o cambiá de key en el Generador IA.'
    : err instanceof Error
      ? err.message
      : 'No se pudo completar el pedido.'

/** Pedido a la IA con cancelación y estado de carga. */
function useAiTask() {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)
  const run = async <T,>(task: (signal: AbortSignal, onStatus: (s: string | null) => void) => Promise<T>, onDone: (r: T) => void) => {
    if (busy) {
      abort.current?.abort()
      return
    }
    abort.current = new AbortController()
    setBusy(true)
    setNote('')
    try {
      onDone(await task(abort.current.signal, (s) => setNote(s ?? '')))
      setNote('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setNote(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return { busy, note, run }
}

const pill =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] transition disabled:opacity-40'

/** [ ✨ GENERAR 3 GANCHOS ]: variantes de titular para la portada (Placa 1). */
export function HookGenerator({ state, update, topic, discipline }: Ctx) {
  const { busy, note, run } = useAiTask()
  const [hooks, setHooks] = useState<HookVariant[]>([])
  const headline = `${state.headlineA} ${state.headlineB}`.replace(/\*/g, '').trim()
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run((signal, onStatus) => generateHooks(loadAiSettings(), { topic: topic || headline, discipline, headline }, signal, onStatus), setHooks)}
        className={`${pill} ${busy ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-cyan/40 text-cyan hover:bg-cyan/10'}`}
        aria-busy={busy}
      >
        {busy ? '[ GENERANDO GANCHOS… · CANCELAR ]' : '[ ✨ GENERAR 3 GANCHOS ]'}
      </button>
      {note && <p className={`font-mono text-[10px] leading-relaxed ${busy ? 'animate-pulse text-gold/90' : 'text-fire'}`}>{note}</p>}
      {hooks.length > 0 && (
        <div className="space-y-1.5">
          {hooks.map((h) => {
            const on = state.headlineA === h.white && state.headlineB === h.accent
            return (
              <button
                key={h.angle}
                type="button"
                onClick={() => update({ headlineA: h.white, headlineB: h.accent })}
                aria-pressed={on}
                className={`block w-full rounded-lg border px-3 py-2 text-left transition ${on ? 'border-fire/70 bg-fire/10' : 'border-line hover:border-cyan/50'}`}
              >
                <span className="mb-0.5 block font-mono text-[9px] tracking-[0.16em] text-steel">[ {HOOK_ANGLE_LABEL[h.angle]} ]</span>
                <span className="text-[12px] leading-snug font-bold text-white">
                  {h.white.replace(/\*/g, '')} <span className="text-fire">{h.accent}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** [ 🔬 SUGERIR PAPER INDEXADO ]: completa la fuente científica con un estudio real. */
export function CitationSuggester({ state, update, topic, discipline }: Ctx) {
  const { busy, note, run } = useAiTask()
  const slide = [state.tag, state.headlineA, state.headlineB, state.body].map((t) => t.replace(/\*/g, '').trim()).filter(Boolean).join(' · ')
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => run((signal, onStatus) => suggestCitation(loadAiSettings(), { topic: topic || slide, discipline, slide }, signal, onStatus), update)}
        className={`${pill} ${busy ? 'border-gold/60 bg-gold/10 text-gold' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
        aria-busy={busy}
      >
        {busy ? '[ BUSCANDO PAPER… · CANCELAR ]' : '[ 🔬 SUGERIR PAPER INDEXADO ]'}
      </button>
      {note ? (
        <p className={`font-mono text-[10px] leading-relaxed ${busy ? 'animate-pulse text-gold/90' : 'text-fire'}`}>{note}</p>
      ) : (
        <p className="font-mono text-[9px] leading-relaxed text-steel/60">Verificá la cita en PubMed antes de publicar.</p>
      )}
    </div>
  )
}
