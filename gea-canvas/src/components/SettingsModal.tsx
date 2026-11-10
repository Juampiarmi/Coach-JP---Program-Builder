'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, KeyRound, Loader2, ShieldAlert, X } from 'lucide-react';
import { testAI } from '@/lib/ai/copyAI';
import { aiReady, DEFAULT_ANTHROPIC_MODEL, useAi, type AiProvider } from '@/lib/ai/settings';
import { Btn, Field, Segmented, inputCls } from './ui';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const ai = useAi();
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<{ state: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({ state: 'idle' });

  const run = async () => {
    setTest({ state: 'busy' });
    try {
      setTest({ state: 'ok', msg: await testAI() });
    } catch (e) {
      setTest({ state: 'err', msg: (e as Error).message });
    }
  };

  const isA = ai.provider === 'anthropic';

  // portal al body: el header tiene backdrop-filter y recortaría un modal fijo anidado
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="scroll-thin max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-carbon p-5 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-white">Configuración</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <KeyRound className="h-4 w-4 text-neon" /> Copys con IA (opcional)
        </h3>
        <p className="mb-4 text-[12px] leading-snug text-white/55">
          Con una API key, el Módulo B escribe cada pieza en vivo con la voz de GEA. Sin key, sigue usando el banco de copys de la marca.
        </p>

        <div className="space-y-3">
          <Field label="Proveedor">
            <Segmented
              value={ai.provider}
              onChange={(provider: AiProvider) => {
                ai.set({ provider });
                setTest({ state: 'idle' });
              }}
              options={[
                { value: 'anthropic', label: 'Anthropic (Claude)' },
                { value: 'openai', label: 'OpenAI' },
              ]}
            />
          </Field>
          <Field label="API key">
            <div className="flex gap-1">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                className={`${inputCls} font-mono text-xs`}
                placeholder={isA ? 'sk-ant-…' : 'sk-…'}
                value={isA ? ai.anthropicKey : ai.openaiKey}
                onChange={(e) => ai.set(isA ? { anthropicKey: e.target.value } : { openaiKey: e.target.value })}
              />
              <Btn onClick={() => setShow(!show)} className="shrink-0">
                {show ? 'Ocultar' : 'Ver'}
              </Btn>
            </div>
          </Field>
          <Field label="Modelo">
            <input
              className={`${inputCls} font-mono text-xs`}
              placeholder={isA ? DEFAULT_ANTHROPIC_MODEL : 'Nombre del modelo de OpenAI'}
              value={isA ? ai.anthropicModel : ai.openaiModel}
              onChange={(e) => ai.set(isA ? { anthropicModel: e.target.value } : { openaiModel: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] text-white/75">
            <input type="checkbox" checked={ai.enabled} onChange={(e) => ai.set({ enabled: e.target.checked })} className="accent-[#FF2E88]" />
            Usar IA por defecto al generar copys
          </label>

          <div className="flex items-center gap-2">
            <Btn variant="primary" onClick={run} disabled={!aiReady(ai) || test.state === 'busy'}>
              {test.state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Probar conexión
            </Btn>
            {(ai.anthropicKey || ai.openaiKey) && (
              <Btn variant="danger" onClick={() => ai.set({ anthropicKey: '', openaiKey: '' })}>
                Borrar keys
              </Btn>
            )}
          </div>
          {test.state === 'ok' && (
            <p className="rounded-lg bg-emerald-500/10 p-2.5 text-[12px] text-emerald-200 ring-1 ring-emerald-400/30">Funciona. Gancho de prueba: “{test.msg}”</p>
          )}
          {test.state === 'err' && <p className="rounded-lg bg-red-500/10 p-2.5 text-[12px] text-red-200 ring-1 ring-red-400/30">{test.msg}</p>}

          <div className="flex gap-2 rounded-lg bg-white/[0.03] p-3 text-[11px] leading-snug text-white/50 ring-1 ring-white/5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" />
            <span>
              La key se guarda solo en este navegador (no entra en los respaldos JSON) y se envía directo al proveedor. Usá una key propia con límite de gasto y no la cargues en equipos compartidos. Cada pieza generada consume créditos de tu cuenta.
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
