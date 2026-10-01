import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_AI_SETTINGS,
  DISCIPLINE_LABEL,
  generateContent,
  MODE_LABEL,
  type AiSettings,
  type Discipline,
  type GenerationResult,
  type GenMode,
  RateLimitError,
  resetQuotaMemory,
} from '../lib/ai'
import { usePersistentState } from '../hooks/usePersistentState'
import { AiSettingsModal } from './AiSettingsModal'

interface Props {
  onResult: (r: GenerationResult, meta: { topic: string; discipline: Discipline }) => void
}

const MODES: GenMode[] = ['auto', 'single', 'stories', 'carousel']
/** Clave vieja: el enfriamiento ya no se persiste (recargar siempre deja el botón activo). */
const LEGACY_COOLDOWN_KEY = 'jp-tactical-canvas:ai-cooldown'

/** Cuenta regresiva en memoria para el límite por minuto (nunca bloquea más allá de la sesión). */
function useCooldown() {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_COOLDOWN_KEY)
    } catch {
      /* sin almacenamiento */
    }
  }, [])
  useEffect(() => {
    if (!until) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= until) setUntil(0)
    }, 250)
    return () => window.clearInterval(id)
  }, [until])
  const start = (seconds: number) => {
    setNow(Date.now())
    setUntil(Date.now() + seconds * 1000)
  }
  const clear = () => setUntil(0)
  const remaining = until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0
  return { remaining, start, clear }
}

/** Texto claro según el tipo de límite que devolvió el proveedor. */
function quotaMessage(err: RateLimitError, provider: string) {
  const m = err.model ? ` de ${err.model}` : ''
  const others = provider === 'gemini' ? ' Ya se probaron los otros modelos habilitados de tu key.' : ''
  switch (err.kind) {
    case 'minute':
      return `Límite por minuto (RPM)${m} alcanzado.${others} Se libera solo al terminar la cuenta regresiva.`
    case 'daily':
      return `Cuota diaria (RPD)${m} consumida por completo.${others} Se renueva a medianoche (hora del Pacífico): cambiá de API Key o de proveedor para seguir hoy.`
    case 'zero':
      return `El modelo${m ? ` ${err.model}` : ''} no tiene cuota gratuita para esta key (límite 0).${others} Elegí otro modelo o usá una key con facturación.`
    default:
      return `El proveedor rechazó la petición por cuota (429).${others} Esperá unos segundos o cambiá de API Key.`
  }
}

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
  // Candado síncrono: bloquea el doble clic antes de que React re-renderice el botón.
  const inFlight = useRef(false)
  const cooldown = useCooldown()
  const locked = busy || cooldown.remaining > 0
  const [quotaError, setQuotaError] = useState<RateLimitError | null>(null)
  // Cambiar de proveedor, key o modelo libera el botón al instante (es otra cuota).
  const quotaScope = `${settings.provider}|${settings.keys[settings.provider] ?? ''}|${settings.models[settings.provider] ?? ''}`
  useEffect(() => {
    cooldown.clear()
    setQuotaError(null)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotaScope])
  // Al vencer el límite por minuto se limpia el aviso y el botón vuelve a quedar activo.
  useEffect(() => {
    if (cooldown.remaining === 0 && quotaError && (quotaError.kind === 'minute' || quotaError.kind === 'unknown')) {
      setQuotaError(null)
      setError('')
    }
  }, [cooldown.remaining, quotaError])
  const hasKey = Boolean(settings.keys[settings.provider])

  const run = async (force = false) => {
    if (inFlight.current || busy || (!force && cooldown.remaining > 0)) return
    if (force) {
      resetQuotaMemory()
      cooldown.clear()
    }
    if (!hasKey) {
      setModal(true)
      return
    }
    if (!topic.trim()) {
      setError('Escribí el tema o concepto a comunicar.')
      return
    }
    inFlight.current = true
    setBusy(true)
    setError('')
    setQuotaError(null)
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
        { topic, discipline: mode.discipline ?? 'general' },
      )
    } catch (err) {
      if (err instanceof RateLimitError) {
        // Sólo el límite por minuto tiene sentido esperarlo; el diario / límite 0 no se
        // arregla con un contador: se informa y el botón queda libre para cambiar key o modelo.
        if (err.kind === 'minute' || err.kind === 'unknown') cooldown.start(err.retryAfterSec)
        setQuotaError(err)
        setError(quotaMessage(err, settings.provider))
      } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
      setStatus(null)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <div className="border-b border-line bg-gradient-to-b from-cyan/[.06] to-transparent px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="shrink-0 font-mono text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap text-cyan">[ 00 · GENERADOR IA ]</h2>
        <button
          type="button"
          onClick={() => setModal(true)}
          className={`flex max-w-[58%] min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] tracking-wider transition ${
            hasKey ? 'border-line text-steel hover:text-white' : 'border-gold/50 text-gold'
          }`}
          title="Configurar API Key"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="8" cy="15" r="4" />
            <path d="m10.8 12.2 8.2-8.2M17 6l2 2M14 9l2 2" />
          </svg>
          <span className="truncate">{hasKey ? `${settings.provider.toUpperCase()} · ${settings.models[settings.provider]}` : 'CARGAR API KEY'}</span>
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
        onClick={() => run()}
        disabled={locked}
        aria-busy={busy}
        className={`relative mt-2 w-full overflow-hidden rounded-lg border py-2.5 font-mono text-[11px] font-bold tracking-[0.14em] transition disabled:cursor-not-allowed ${
          busy
            ? 'border-cyan/60 bg-cyan/10 text-cyan'
            : cooldown.remaining > 0
              ? 'border-gold/50 bg-gold/10 text-gold'
              : 'border-cyan bg-cyan text-carbon hover:brightness-110'
        }`}
      >
        {busy && <span className="absolute inset-y-0 left-0 w-1/3 animate-[tcscan_1.2s_ease-in-out_infinite] bg-cyan/25" />}
        <span className="relative flex items-center justify-center gap-2">
          {busy && <span className="size-3 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" aria-hidden />}
          {busy
            ? '[ GENERANDO... ]'
            : cooldown.remaining > 0
              ? `[ ESPERÁ ${cooldown.remaining}s · CUOTA RESETEANDO ]`
              : '[ ✨ GENERAR PLACAS ]'}
        </span>
      </button>
      {busy && (
        <button
          type="button"
          onClick={() => abort.current?.abort()}
          className="mt-1 w-full font-mono text-[9px] tracking-[0.14em] text-steel/60 hover:text-fire"
        >
          CANCELAR
        </button>
      )}
      {status && (
        <p
          role="status"
          className={`mt-2 font-mono text-[10px] leading-relaxed tracking-wider ${busy ? 'animate-pulse text-gold/90' : 'text-steel/80'}`}
        >
          {status}
        </p>
      )}
      {error && (
        <div className="mt-2 space-y-2">
          <p className="font-mono text-[10px] leading-relaxed text-fire">{error}</p>
          {!busy && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => run(true)}
                title="Ignora la cuenta regresiva y vuelve a probar todos los modelos"
                className="flex-1 whitespace-nowrap rounded-md border border-fire/50 bg-fire/10 px-1.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.04em] text-fire transition hover:bg-fire/20"
              >
                [ 🔄 REINTENTAR FORZADO ]
              </button>
              <button
                type="button"
                onClick={() => setModal(true)}
                className="flex-1 whitespace-nowrap rounded-md border border-line px-1.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.04em] text-steel transition hover:border-cyan/50 hover:text-cyan"
              >
                [ 🔑 CAMBIAR KEY ]
              </button>
            </div>
          )}
        </div>
      )}
      {modal && <AiSettingsModal settings={settings} onSave={setSettings} onClose={() => setModal(false)} />}
    </div>
  )
}
