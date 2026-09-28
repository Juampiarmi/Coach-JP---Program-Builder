import { useState } from 'react'
import { KEY_PLACEHOLDER, MODEL_OPTIONS, PROVIDER_LABEL, type AiProvider, type AiSettings } from '../lib/ai'
import { listGeminiModels, preferredGeminiModel } from '../lib/geminiModels'
import { Field, Segmented } from './controls/primitives'

interface Props {
  settings: AiSettings
  onSave: (s: AiSettings) => void
  onClose: () => void
}

export function AiSettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AiSettings>(settings)
  const [show, setShow] = useState(false)
  const p = draft.provider
  const setKey = (v: string) => setDraft({ ...draft, keys: { ...draft.keys, [p]: v } })
  const setModel = (v: string) => setDraft({ ...draft, models: { ...draft.models, [p]: v } })
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const detected = p === 'gemini' ? (draft.geminiModels ?? []) : []

  /** ListModels: trae los modelos reales habilitados para la key y elige el Flash más moderno. */
  const detectGemini = async (base: AiSettings = draft): Promise<AiSettings | null> => {
    const key = (base.keys.gemini ?? '').trim()
    if (!key) {
      setCheckError('Pegá primero tu API Key de Gemini.')
      return null
    }
    setChecking(true)
    setCheckError('')
    try {
      const models = await listGeminiModels(key)
      if (!models.length) throw new Error('La key es válida pero no tiene modelos Gemini de texto habilitados.')
      const current = base.models.gemini
      const keep = models.some((m) => m.id === current)
      const next: AiSettings = {
        ...base,
        geminiModels: models,
        geminiCheckedAt: Date.now(),
        models: { ...base.models, gemini: keep ? current : (preferredGeminiModel(models) ?? current) },
      }
      setDraft(next)
      return next
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'No se pudo verificar la key.')
      return null
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurar IA"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[12px] font-semibold tracking-[0.18em] text-cyan">[ MOTOR IA · API KEY ]</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-steel hover:text-white">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Proveedor" plain>
            <Segmented<AiProvider>
              value={p}
              onChange={(provider) => setDraft({ ...draft, provider })}
              options={[
                { value: 'openai', label: 'OPENAI' },
                { value: 'anthropic', label: 'ANTHROPIC' },
                { value: 'gemini', label: 'GEMINI' },
              ]}
              size="sm"
            />
          </Field>
          <Field label={`API Key de ${PROVIDER_LABEL[p]}`} hint={draft.keys[p] ? 'guardada' : undefined}>
            <div className="flex gap-2">
              <input
                className="tc-input font-mono"
                type={show ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                placeholder={KEY_PLACEHOLDER[p]}
                value={draft.keys[p] ?? ''}
                onChange={(e) => {
                  setKey(e.target.value.trim())
                  setCheckError('')
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setShow((v) => !v)
                }}
                className="shrink-0 rounded-md border border-line px-2.5 font-mono text-[10px] text-steel hover:text-white"
              >
                {show ? 'OCULTAR' : 'VER'}
              </button>
            </div>
          </Field>
          {p === 'gemini' && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => detectGemini()}
                disabled={checking}
                className="w-full rounded-md border border-cyan/50 bg-cyan/5 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-cyan transition hover:bg-cyan/10 disabled:opacity-60"
              >
                {checking ? 'VERIFICANDO KEY…' : '⟳ VERIFICAR KEY Y DETECTAR MODELOS'}
              </button>
              {checkError ? (
                <p className="font-mono text-[10px] leading-relaxed text-fire">{checkError}</p>
              ) : (
                detected.length > 0 && (
                  <p className="font-mono text-[10px] text-steel/80">
                    ✓ {detected.length} modelos habilitados para esta key
                    {draft.geminiCheckedAt ? ` · detectados ${new Date(draft.geminiCheckedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                )
              )}
            </div>
          )}
          <Field label="Modelo" plain={detected.length > 0}>
            {detected.length > 0 ? (
              <select className="tc-input font-mono" value={draft.models.gemini ?? ''} onChange={(e) => setModel(e.target.value)}>
                {!detected.some((m) => m.id === draft.models.gemini) && draft.models.gemini && (
                  <option value={draft.models.gemini}>{draft.models.gemini} · no figura para esta key</option>
                )}
                {detected.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === preferredGeminiModel(detected) ? `★ ${m.label}` : m.label}
                  </option>
                ))}
              </select>
            ) : (
              <input className="tc-input font-mono" list={`models-${p}`} value={draft.models[p] ?? ''} onChange={(e) => setModel(e.target.value)} />
            )}
            <datalist id={`models-${p}`}>
              {MODEL_OPTIONS[p].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </datalist>
          </Field>
          <div className={`flex flex-wrap gap-1.5 ${detected.length ? 'hidden' : ''}`}>
            {MODEL_OPTIONS[p].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wider ${
                  draft.models[p] === m.id ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-line text-steel hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {p === 'gemini' && (
            <p className="font-mono text-[10px] leading-relaxed text-steel/80">
              Conseguí tu key gratis en aistudio.google.com → Get API key. Al guardar, la app consulta a Google qué modelos
              tiene habilitados tu key y elige el Flash más moderno. Si hay alta demanda, reintenta sola a los 2,5 y 4 s.
            </p>
          )}
          <p className="rounded-md border border-gold/20 bg-gold/5 p-2.5 font-mono text-[10px] leading-relaxed text-steel">
            La key se guarda sólo en este navegador (localStorage) y viaja directo al proveedor. No uses esta app en computadoras
            compartidas con tu key cargada, y ponele un límite de gasto en el panel del proveedor.
          </p>
        </div>
        <p className="mt-3 text-right font-mono text-[9px] tracking-wider text-steel/50">BUILD {__APP_BUILD__}</p>
        <div className="mt-3 flex gap-2">
          {draft.keys[p] && (
            <button
              type="button"
              onClick={() => {
                setKey('')
                setCheckError('')
              }}
              className="rounded-md border border-line px-3 py-2 font-mono text-[10px] tracking-wider text-steel hover:border-fire/60 hover:text-fire"
            >
              BORRAR KEY
            </button>
          )}
          <button
            type="button"
            disabled={checking}
            onClick={async () => {
              let toSave = draft
              // Gemini: al guardar se verifica la key y se detectan los modelos reales (salvo que
              // ya haya fallado la verificación: el segundo clic guarda igual).
              if (p === 'gemini' && (draft.keys.gemini ?? '').trim() && !checkError) {
                const verified = await detectGemini(draft)
                if (!verified) return
                toSave = verified
              }
              onSave(toSave)
              onClose()
            }}
            className="flex-1 rounded-md bg-cyan py-2 font-mono text-[11px] font-bold tracking-[0.12em] text-carbon hover:brightness-110 disabled:opacity-60"
          >
            {checking ? 'VERIFICANDO…' : p === 'gemini' && checkError ? 'GUARDAR IGUAL' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
