import { useState } from 'react'
import { KEY_PLACEHOLDER, MODEL_OPTIONS, PROVIDER_LABEL, type AiProvider, type AiSettings } from '../lib/ai'
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
                onChange={(e) => setKey(e.target.value.trim())}
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
          <Field label="Modelo">
            <input className="tc-input font-mono" list={`models-${p}`} value={draft.models[p] ?? ''} onChange={(e) => setModel(e.target.value)} />
            <datalist id={`models-${p}`}>
              {MODEL_OPTIONS[p].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </datalist>
          </Field>
          <div className="flex flex-wrap gap-1.5">
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
              Conseguí tu key gratis en aistudio.google.com → Get API key. Google retira modelos viejos: si 1.5 responde "not
              found", usá gemini-2.5-flash.
            </p>
          )}
          <p className="rounded-md border border-gold/20 bg-gold/5 p-2.5 font-mono text-[10px] leading-relaxed text-steel">
            La key se guarda sólo en este navegador (localStorage) y viaja directo al proveedor. No uses esta app en computadoras
            compartidas con tu key cargada, y ponele un límite de gasto en el panel del proveedor.
          </p>
        </div>
        <div className="mt-5 flex gap-2">
          {draft.keys[p] && (
            <button
              type="button"
              onClick={() => setKey('')}
              className="rounded-md border border-line px-3 py-2 font-mono text-[10px] tracking-wider text-steel hover:border-fire/60 hover:text-fire"
            >
              BORRAR KEY
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
            className="flex-1 rounded-md bg-cyan py-2 font-mono text-[11px] font-bold tracking-[0.12em] text-carbon hover:brightness-110"
          >
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  )
}
