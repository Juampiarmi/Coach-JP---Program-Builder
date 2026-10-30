import { useRef, useState } from 'react'
import { generateContent, RateLimitError, type AiSettings, type Discipline, type GenerationResult } from '../lib/ai'
import { packDayFor, WEEKLY_PACK, type WeeklyDay } from '../lib/weeklyPack'
import { usePersistentState } from '../hooks/usePersistentState'

interface Props {
  settings: AiSettings
  hasKey: boolean
  discipline: Discipline
  onResult: (r: GenerationResult, meta: { topic: string; discipline: Discipline }) => void
  /** Carga el prompt del día en el campo del generador (para editarlo antes de generar) */
  onPrompt: (prompt: string) => void
  onNeedKey: () => void
  /** Carga el set del día como proyecto (con su fondo táctico); sin esto se carga como resultado suelto */
  onLoadDay?: (dayId: string) => void
}

/**
 * ▦ PLAN SEMANAL COACH JP: 7 días con tema, paper, estructura y prompt. «Cargar set» arma el contenido
 * precargado al instante (sin API Key); «Generar con IA» manda el prompt del día con formato,
 * objetivo y tono ya fijados.
 */
export function WeeklyPlan({ settings, hasKey, discipline, onResult, onPrompt, onNeedKey, onLoadDay }: Props) {
  const today = packDayFor()
  const [ui, setUi] = usePersistentState<{ open: boolean; day: string }>('jp-tactical-canvas:weekly-pack', { open: true, day: today.id })
  const day = WEEKLY_PACK.find((d) => d.id === ui.day) ?? today
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)

  const load = (d: WeeklyDay) => {
    if (onLoadDay) onLoadDay(d.id)
    else onResult({ format: d.format, slides: d.slides, caption: d.caption }, { topic: d.theme, discipline })
    setNote(`✓ ${d.day} cargado: ${d.slides.length} ${d.slides.length === 1 ? 'placa' : 'placas'} + caption con la referencia.`)
  }

  const generate = async (d: WeeklyDay) => {
    if (busy) {
      abort.current?.abort()
      return
    }
    if (!hasKey) return onNeedKey()
    abort.current = new AbortController()
    setBusy(true)
    setNote('')
    try {
      const result = await generateContent(settings, d.prompt, d.format, discipline, abort.current.signal, (s) => setNote(s ?? ''), undefined, {
        inputMode: 'brief',
        goal: d.goal,
        tone: d.tone,
        quote: d.quote ?? null,
      })
      onResult(result, { topic: d.theme, discipline })
      setNote(`✓ ${d.day} generado con IA: ${result.slides.length} placas. Verificá la referencia antes de publicar.`)
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setNote(err instanceof RateLimitError ? 'Cuota de la API alcanzada: usá «Cargar set» (no consume IA) o esperá un momento.' : err instanceof Error ? err.message : 'No se pudo generar.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-line bg-surface-2/60 p-2">
      <button type="button" onClick={() => setUi({ ...ui, open: !ui.open })} aria-expanded={ui.open} className="flex w-full items-center justify-between">
        <span className="font-mono text-[9px] font-semibold tracking-[0.16em] text-steel uppercase">▦ Plan semanal · papers & trends</span>
        <span className="font-mono text-[9px] tracking-wider text-steel/70">{ui.open ? '▴' : `▾ HOY: ${today.day} · ${today.theme.toUpperCase()}`}</span>
      </button>
      {ui.open && (
        <>
          <div className="grid grid-cols-7 gap-1">
            {WEEKLY_PACK.map((d) => {
              const on = d.id === day.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setUi({ ...ui, day: d.id })}
                  aria-pressed={on}
                  title={`${d.pillar} · ${d.theme}`}
                  className={`relative rounded-md border py-1.5 text-center font-mono text-[9px] font-semibold tracking-[0.1em] transition ${on ? 'border-fire/70 bg-fire/10 text-fire' : 'border-line text-steel hover:border-cyan/40 hover:text-white'}`}
                >
                  {d.id === today.id && <span className="absolute -top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-cyan" aria-hidden />}
                  {d.day}
                </button>
              )
            })}
          </div>
          <div className="space-y-1.5 rounded-md border border-line px-2.5 py-2">
            <p className="font-mono text-[9px] tracking-[0.14em] text-cyan uppercase">
              {day.day} · {day.pillar}
            </p>
            <p className="text-[12px] leading-snug font-semibold text-white">{day.theme}</p>
            <p className="font-mono text-[9px] tracking-wide text-steel">▸ {day.structure}</p>
            <p className="font-mono text-[9px] leading-relaxed text-gold/90">
              📄 {day.ref.cite} — «{day.ref.title}»
            </p>
            <p className="text-[11px] leading-snug text-steel">↳ {day.ref.finding}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => load(day)}
              title="Arma el set escrito a mano (no usa IA ni cuota)"
              className="rounded-md border border-fire/60 bg-fire/10 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] text-fire transition hover:bg-fire/20"
            >
              [ ⬇ CARGAR SET LISTO ]
            </button>
            <button
              type="button"
              onClick={() => generate(day)}
              aria-busy={busy}
              title="Genera una versión nueva con el prompt del día (formato, objetivo y tono ya fijados)"
              className={`rounded-md border py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] transition ${busy ? 'animate-pulse border-gold/60 text-gold' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
            >
              {busy ? '[ GENERANDO… · CANCELAR ]' : '[ ✨ GENERAR CON IA ]'}
            </button>
          </div>
          <button type="button" onClick={() => onPrompt(day.prompt)} className="w-full font-mono text-[9px] tracking-[0.12em] text-steel/80 hover:text-white">
            ✎ EDITAR EL PROMPT DEL DÍA EN EL GENERADOR
          </button>
          {note && <p className={`font-mono text-[10px] leading-relaxed ${note.startsWith('✓') ? 'text-cyan' : busy ? 'text-gold' : 'text-fire'}`}>{note}</p>}
        </>
      )}
    </div>
  )
}
