import { useRef, useState } from 'react'
import { loadAiSettings, RateLimitError, suggestQuotes, type Discipline, type FamousQuote } from '../../lib/ai'
import type { CanvasState } from '../../types'
import { cleanQuote } from '../canvas/templates/QuoteTemplate'
import { autoEmphasis } from '../../lib/quoteIntent'
import { Field, TextArea, TextInput } from './primitives'

interface Props {
  state: CanvasState
  update: (patch: Partial<CanvasState>) => void
  discipline: Discipline
  /** Tema de la secuencia, para precargar la búsqueda */
  topic: string
}

const pill =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] transition disabled:opacity-40'

/** Editor de la placa 14 · Cita célebre: frase, autor, rol y buscador de citas reales con fuente. */
export function QuoteEditor({ state, update, discipline, topic }: Props) {
  const [theme, setTheme] = useState('')
  const [person, setPerson] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [options, setOptions] = useState<FamousQuote[]>([])
  const abort = useRef<AbortController | null>(null)

  const search = async () => {
    if (busy) {
      abort.current?.abort()
      return
    }
    abort.current = new AbortController()
    setBusy(true)
    setNote('')
    try {
      setOptions(await suggestQuotes(loadAiSettings(), { theme: theme || topic, person, discipline }, abort.current.signal, (s) => setNote(s ?? '')))
      setNote('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setNote(err instanceof RateLimitError ? 'Cuota de la API alcanzada. Esperá un momento.' : err instanceof Error ? err.message : 'No se pudo buscar.')
      }
    } finally {
      setBusy(false)
    }
  }

  const chars = cleanQuote(state.quoteText ?? '').length
  return (
    <div className="space-y-2">
      <Field label="Cita" hint={`${chars} car. · sin comillas, la placa las pone`}>
        <TextArea value={state.quoteText ?? ''} onChange={(quoteText) => update({ quoteText })} rows={3} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nombre">
          <TextInput value={state.quoteAuthor ?? ''} onChange={(quoteAuthor) => update({ quoteAuthor })} placeholder="Eliud Kipchoge" />
        </Field>
        <Field label="Rol / logro">
          <TextInput value={state.quoteRole ?? ''} onChange={(quoteRole) => update({ quoteRole })} placeholder="Bicampeón olímpico" />
        </Field>
      </div>
      <Field label="Remate en naranja" hint={state.quoteEmphasis ? undefined : `auto: «${autoEmphasis(cleanQuote(state.quoteText ?? ''))}»`}>
        <TextInput value={state.quoteEmphasis ?? ''} onChange={(quoteEmphasis) => update({ quoteEmphasis })} placeholder="palabras finales de la frase" />
      </Field>
      {state.quoteEmphasis && !cleanQuote(state.quoteText ?? '').toLowerCase().includes(state.quoteEmphasis.trim().toLowerCase()) && (
        <p className="font-mono text-[9px] text-gold/80">El remate tiene que ser texto literal de la cita para pintarse.</p>
      )}
      <Field label="Contexto Coach JP (máx. 2 líneas)" hint={`${(state.body ?? '').trim().split(/\s+/).filter(Boolean).length} / 24 palabras`}>
        <TextArea value={state.body ?? ''} onChange={(body) => update({ body })} rows={2} />
      </Field>
      <Field label="Fuente (no se dibuja)" hint="para verificar antes de publicar">
        <TextInput value={state.quoteSource ?? ''} onChange={(quoteSource) => update({ quoteSource })} placeholder="Entrevista, libro, discurso · año" />
      </Field>
      {!(state.quoteSource ?? '').trim() && (
        <p className="font-mono text-[9px] leading-relaxed text-gold/80">⚠ Cita sin fuente: verificá que la frase sea real y del autor antes de publicar.</p>
      )}

      <div className="space-y-2 rounded-lg border border-line bg-surface-2/60 p-2.5">
        <p className="font-mono text-[10px] tracking-[0.12em] text-steel uppercase">✦ Buscar cita real con IA</p>
        <div className="grid grid-cols-2 gap-2">
          <TextInput value={theme} onChange={setTheme} placeholder={topic ? `Tema: ${topic.slice(0, 24)}` : 'Tema: fracaso, disciplina…'} />
          <TextInput value={person} onChange={setPerson} placeholder="Persona (opcional)" />
        </div>
        <button
          type="button"
          onClick={search}
          aria-busy={busy}
          className={`${pill} ${busy ? 'border-gold/60 bg-gold/10 text-gold' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
        >
          {busy ? '[ BUSCANDO CITAS… · CANCELAR ]' : '[ ✦ SUGERIR 3 CITAS CON FUENTE ]'}
        </button>
        {note && <p className={`font-mono text-[10px] leading-relaxed ${busy ? 'animate-pulse text-gold/90' : 'text-fire'}`}>{note}</p>}
        {options.map((q, i) => {
          const on = state.quoteText === q.quote && state.quoteAuthor === q.author
          return (
            <button
              key={i}
              type="button"
              onClick={() => update({ quoteText: q.quote, quoteEmphasis: '', quoteAuthor: q.author, quoteRole: q.role, quoteSource: q.original ? `${q.source} · Original: «${q.original}»` : q.source })}
              aria-pressed={on}
              className={`block w-full rounded-lg border px-3 py-2 text-left transition ${on ? 'border-fire/70 bg-fire/10' : 'border-line hover:border-cyan/50'}`}
            >
              <span className="block text-[12px] leading-snug text-white">“{q.quote}”</span>
              <span className="mt-1 block font-mono text-[9px] tracking-[0.12em] text-cyan uppercase">
                — {q.author}
                {q.role ? ` · ${q.role}` : ''}
              </span>
              <span className="mt-0.5 block font-mono text-[9px] leading-relaxed text-steel/70">Fuente: {q.source}</span>
            </button>
          )
        })}
        <p className="font-mono text-[9px] leading-relaxed text-steel/60">
          Muchas «frases famosas» circulan con el autor equivocado: verificá la fuente antes de publicar.
        </p>
      </div>
    </div>
  )
}
