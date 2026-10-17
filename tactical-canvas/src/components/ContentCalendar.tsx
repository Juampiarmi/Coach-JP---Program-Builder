import { useRef, useState } from 'react'
import { RateLimitError, suggestTopics, type AiSettings, type Discipline, type TopicIdea } from '../lib/ai'
import { PILLARS, pillarForToday, type PillarId } from '../lib/pillars'

interface Props {
  settings: AiSettings
  hasKey: boolean
  discipline: Discipline
  /** Pilar activo (null = generador libre) */
  pillar: PillarId | null
  onSelect: (pillar: PillarId | null) => void
  /** Carga la idea elegida en el campo del generador */
  onPick: (topic: string) => void
  onNeedKey: () => void
}

/**
 * Calendario de contenido: LUN ciencia (Opus) · MIÉ rutina (Sesión) · VIE mindset (Manifiesto texto).
 * Elegir un día fija tono, objetivo, formato y plantilla del generador; «Proponer ideas» trae 5 temas
 * concretos con su evidencia (o sin cita si la IA no tiene certeza: nunca inventada).
 */
export function ContentCalendar({ settings, hasKey, discipline, pillar, onSelect, onPick, onNeedKey }: Props) {
  const today = pillarForToday()
  const isToday = today.weekday === new Date().getDay()
  const [ideas, setIdeas] = useState<TopicIdea[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)
  const active = PILLARS.find((p) => p.id === pillar) ?? null

  const propose = async () => {
    if (busy) {
      abort.current?.abort()
      return
    }
    if (!hasKey) return onNeedKey()
    const target = active ?? today
    if (!active) onSelect(target.id)
    abort.current = new AbortController()
    setBusy(true)
    setNote('')
    try {
      setIdeas(await suggestTopics(settings, { pillar: target.id, discipline, avoid: ideas.map((i) => i.title) }, abort.current.signal, (s) => setNote(s ?? '')))
      setNote('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setNote(err instanceof RateLimitError ? 'Cuota de la API alcanzada. Esperá un momento.' : err instanceof Error ? err.message : 'No se pudieron proponer ideas.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-line bg-surface-2/60 p-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-steel uppercase">▦ Calendario de pilares</p>
        {active && (
          <button type="button" onClick={() => onSelect(null)} className="font-mono text-[9px] tracking-wider text-steel/70 hover:text-white">
            × GENERADOR LIBRE
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {PILLARS.map((p) => {
          const on = pillar === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(on ? null : p.id)
                setIdeas([])
              }}
              aria-pressed={on}
              title={`${p.label} · plantilla ${p.template}`}
              className={`relative rounded-md border px-1 py-1.5 text-center transition ${on ? 'border-fire/70 bg-fire/10' : 'border-line hover:border-cyan/40'}`}
            >
              {today.id === p.id && <span className="absolute -top-1.5 right-1 rounded bg-cyan px-1 font-mono text-[7px] font-bold tracking-wider text-carbon">{isToday ? 'HOY' : 'PRÓXIMO'}</span>}
              <span className={`block font-mono text-[9px] tracking-[0.18em] ${on ? 'text-fire' : 'text-steel'}`}>{p.day}</span>
              <span className={`block text-[11px] leading-tight font-semibold ${on ? 'text-white' : 'text-steel'}`}>{p.short}</span>
            </button>
          )
        })}
      </div>
      {active && (
        <p className="font-mono text-[9px] leading-relaxed text-steel/80">
          ▸ {active.label} → {active.template} · {active.mode === 'carousel' ? 'carrusel' : '1 placa'} · tono {active.tone === 'academic' ? 'académico' : 'viral'}
        </p>
      )}
      <button
        type="button"
        onClick={propose}
        aria-busy={busy}
        className={`w-full rounded-md border py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] transition ${busy ? 'animate-pulse border-gold/60 text-gold' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
      >
        {busy ? '[ BUSCANDO TEMAS CON EVIDENCIA… · CANCELAR ]' : `[ 💡 PROPONER 5 IDEAS · ${(active ?? today).short} ]`}
      </button>
      {note && <p className="font-mono text-[10px] text-fire">{note}</p>}
      {ideas.length > 0 && (
        <div className="space-y-1.5">
          {ideas.map((idea, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(`${idea.title}. Ángulo: ${idea.angle}${idea.reference ? ` Evidencia: ${idea.reference}${idea.finding ? ` (${idea.finding})` : ''}.` : ''}`)}
              className="block w-full rounded-md border border-line px-2.5 py-2 text-left transition hover:border-cyan/50"
            >
              <span className="block text-[12px] leading-snug font-semibold text-white">{idea.title}</span>
              {idea.angle && <span className="mt-0.5 block text-[11px] leading-snug text-steel">↳ {idea.angle}</span>}
              <span className={`mt-1 block font-mono text-[9px] tracking-wide ${idea.reference ? 'text-cyan' : 'text-steel/60'}`}>
                {idea.reference ? `📄 ${idea.reference}${idea.finding ? ` · ${idea.finding}` : ''}` : 'Sin cita con certeza: buscá respaldo antes de publicar'}
              </span>
            </button>
          ))}
          <p className="font-mono text-[9px] leading-relaxed text-steel/60">Verificá cada referencia en PubMed / Google Scholar antes de publicar.</p>
        </div>
      )}
    </div>
  )
}
