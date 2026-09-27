import { useRef, useState } from 'react'
import {
  DEFAULT_AI_SETTINGS,
  DISCIPLINE_LABEL,
  generateContent,
  MODE_LABEL,
  type AiSettings,
  type Discipline,
  type GenerationResult,
  type GenMode,
} from '../lib/ai'
import { usePersistentState } from '../hooks/usePersistentState'
import { AiSettingsModal } from './AiSettingsModal'

interface Props {
  onResult: (r: GenerationResult) => void
}

const MODES: GenMode[] = ['auto', 'single', 'stories', 'carousel']

/** Barra de generación táctica con IA (BYOK). */
export function AiGenerator({ onResult }: Props) {
  const [stored, setSettings] = usePersistentState<AiSettings>('jp-tactical-canvas:ai', DEFAULT_AI_SETTINGS)
  // Fusión profunda: settings guardados antes de sumar un proveedor no traen su key/modelo.
  const settings: AiSettings = {
    ...stored,
    keys: { ...DEFAULT_AI_SETTINGS.keys, ...stored.keys },
    models: { ...DEFAULT_AI_SETTINGS.models, ...stored.models },
  }
  const [topic, setTopic] = useState('')
  const [mode, setMode] = usePersistentState<{ mode: GenMode; discipline: Discipline }>('jp-tactical-canvas:ai-mode', {
    mode: 'auto',
    discipline: 'general',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const hasKey = Boolean(settings.keys[settings.provider])

  const run = async () => {
    if (busy) {
      abort.current?.abort()
      return
    }
    if (!hasKey) {
      setModal(true)
      return
    }
    if (!topic.trim()) {
      setError('Escribí el tema o concepto a comunicar.')
      return
    }
    setBusy(true)
    setError('')
    setStatus(null)
    abort.current = new AbortController()
    try {
      onResult(
        await generateContent(settings, topic, mode.mode, mode.discipline ?? 'general', abort.current.signal, setStatus, (model, detected) =>
          // El modelo guardado no existe para esta key: se persiste el detectado con ListModels.
          setSettings((s) => ({
            ...s,
            models: { ...DEFAULT_AI_SETTINGS.models, ...s.models, gemini: model },
            geminiModels: detected,
            geminiCheckedAt: Date.now(),
          })),
        ),
      )
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-b border-line bg-gradient-to-b from-cyan/[.06] to-transparent px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.18em] text-cyan">[ 00 · GENERADOR IA ]</h2>
        <button
          type="button"
          onClick={() => setModal(true)}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] tracking-wider transition ${
            hasKey ? 'border-line text-steel hover:text-white' : 'border-gold/50 text-gold'
          }`}
          title="Configurar API Key"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="8" cy="15" r="4" />
            <path d="m10.8 12.2 8.2-8.2M17 6l2 2M14 9l2 2" />
          </svg>
          {hasKey ? `${settings.provider.toUpperCase()} · ${settings.models[settings.provider]}` : 'CARGAR API KEY'}
        </button>
      </div>
      <textarea
        className="tc-input resize-none"
        rows={2}
        value={topic}
        placeholder="Tema o concepto a comunicar (ej: Sobrecarga progresiva y RIR)"
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
        }}
      />
      <div className="mt-2 flex gap-1.5">
        {(Object.keys(DISCIPLINE_LABEL) as Exclude<Discipline, 'general'>[]).map((d) => {
          const on = mode.discipline === d
          return (
            <button
              key={d}
              type="button"
              onClick={() => setMode({ ...mode, discipline: on ? 'general' : d })}
              aria-pressed={on}
              title={on ? 'Tocá de nuevo para volver a enfoque general' : undefined}
              className={`flex-1 rounded-md border px-1.5 py-1.5 font-mono text-[9px] font-semibold tracking-wider transition ${
                on
                  ? d === 'sports'
                    ? 'border-fire/70 bg-fire/15 text-fire'
                    : 'border-gold/70 bg-gold/10 text-gold'
                  : 'border-line text-steel hover:text-white'
              }`}
            >
              [ {DISCIPLINE_LABEL[d]} ]
            </button>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode({ ...mode, mode: m })}
            aria-pressed={mode.mode === m}
            className={`rounded-md px-1 py-1.5 font-mono text-[9px] leading-tight tracking-wider transition ${
              mode.mode === m ? 'bg-cyan text-carbon' : 'text-steel hover:bg-white/5 hover:text-white'
            }`}
          >
            {MODE_LABEL[m].toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={run}
        className={`relative mt-2 w-full overflow-hidden rounded-lg border py-2.5 font-mono text-[11px] font-bold tracking-[0.14em] transition ${
          busy ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-cyan bg-cyan text-carbon hover:brightness-110'
        }`}
      >
        {busy && <span className="absolute inset-y-0 left-0 w-1/3 animate-[tcscan_1.2s_ease-in-out_infinite] bg-cyan/25" />}
        <span className="relative">{busy ? 'GENERANDO… (TOCÁ PARA CANCELAR)' : 'GENERAR CONTENIDO [IA]'}</span>
      </button>
      {status && (
        <p
          role="status"
          className={`mt-2 font-mono text-[10px] leading-relaxed tracking-wider ${busy ? 'animate-pulse text-gold/90' : 'text-steel/80'}`}
        >
          {status}
        </p>
      )}
      {error && <p className="mt-2 font-mono text-[10px] leading-relaxed text-fire">{error}</p>}
      {modal && <AiSettingsModal settings={settings} onSave={setSettings} onClose={() => setModal(false)} />}
    </div>
  )
}
