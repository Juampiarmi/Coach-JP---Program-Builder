'use client';

import { useEffect, useRef, useState } from 'react';
import { Cpu, Eye, EyeOff, FileText, KeyRound, Loader2, ShieldAlert, Trash2, Zap } from 'lucide-react';
import { compileWithAi, MODEL_OPTIONS, planFromAi, SYSTEM_PROMPT, SYSTEM_PROMPT_EXTENSION } from '@/lib/ai';
import { computeTelemetry, fmt0 } from '@/lib/bioenergetics';
import type { AiProvider } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, HudButton, Label, Panel, Segmented, Select, Tag } from '../hud/primitives';

const SAMPLE_NOTES = `Franco, 31 años, masculino. 176 cm, 79 kg, 14 % graso (bioimpedancia).
Compite en CrossFit (RX) y prepara Hyrox Doubles en 10 semanas. Entrena lunes a viernes 07:00 h (WOD + fuerza), sábados fondo largo.
Trabaja en oficina 9-18 h. Desayuna tarde, suele saltear la merienda.
Objetivo: bajar grasa manteniendo potencia (recomposición).
Le gustan: carne vacuna, arroz, huevos, yogur, banana, mate. No come: pescado, hígado, brócoli.
Intolerancias: ninguna. Toma café 2 veces al día. Presupuesto medio.
Suplementos actuales: whey. Nunca usó creatina.`;

export function IntakeTab() {
  const ai = usePlanStore((s) => s.ai);
  const setAi = usePlanStore((s) => s.setAi);
  const notes = usePlanStore((s) => s.intakeNotes);
  const setNotes = usePlanStore((s) => s.setIntakeNotes);
  const loadPlan = usePlanStore((s) => s.loadPlan);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);

  const [showKey, setShowKey] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const setProvider = (provider: AiProvider) => setAi({ provider, model: MODEL_OPTIONS[provider][0].id });

  async function compile() {
    setBusy(true);
    setError(null);
    setLog([]);
    setElapsed(0);
    const t0 = Date.now();
    timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    try {
      const json = await compileWithAi(ai, notes);
      const next = planFromAi(json, usePlanStore.getState().plan);
      loadPlan(next);
      const t = computeTelemetry(next);
      setLog([
        `ATLETA ............ ${next.profile.name.toUpperCase()}`,
        `BMR (IA) .......... ${json.bmr ? fmt0(json.bmr) : '—'} kcal · MOTOR LOCAL ${fmt0(t.bmr)} kcal`,
        `DÍA ON ............ ${fmt0(t.kcalOn)} kcal · P${t.gramsOn.p} C${t.gramsOn.c} F${t.gramsOn.f}`,
        `DÍA OFF ........... ${fmt0(t.kcalOff)} kcal · P${t.gramsOff.p} C${t.gramsOff.c} F${t.gramsOff.f}`,
        `BLOQUES ........... ${next.meals.length} · SUPLEMENTOS ${next.supplements.length}`,
        'ESTADO ............ BUILDER SINCRONIZADO ✓',
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="IA PROMPT ENGINE // INTAKE INTELIGENTE" right={<Cpu className="h-4 w-4 text-cyan-hud" />}>
        <p className="mb-4 text-sm text-steel">
          Volcá las notas brutas del atleta. El motor devuelve un JSON estructurado (Katch-McArdle, periodización ON/OFF, bloques con alimentos
          argentinos, leucina por bolo y protocolo AIS Grupo A) y rellena todas las pestañas del Builder.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <div>
            <Label>Proveedor</Label>
            <Segmented
              value={ai.provider}
              onChange={setProvider}
              size="sm"
              options={[
                { value: 'claude', label: 'Claude' },
                { value: 'gemini', label: 'Gemini' },
                { value: 'openai', label: 'OpenAI' },
              ]}
            />
          </div>
          <Select
            label="Modelo"
            value={ai.model}
            onChange={(model) => setAi({ model })}
            options={[
              ...MODEL_OPTIONS[ai.provider].map((m) => ({ value: m.id, label: m.label })),
              ...(MODEL_OPTIONS[ai.provider].some((m) => m.id === ai.model) ? [] : [{ value: ai.model, label: ai.model }]),
            ]}
          />
        </div>
        <label className="mt-3 block">
          <Label>API key · se guarda sólo en este navegador (localStorage)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-steel" />
              <input
                type={showKey ? 'text' : 'password'}
                value={ai.apiKey}
                autoComplete="off"
                spellCheck={false}
                placeholder={ai.provider === 'claude' ? 'sk-ant-…' : ai.provider === 'gemini' ? 'AIza…' : 'sk-…'}
                onChange={(e) => setAi({ apiKey: e.target.value.trim() })}
                className="w-full rounded-lg border border-line2 bg-panel2 py-2 pl-9 pr-3 font-mono text-sm outline-none focus:border-cyan-hud"
              />
            </div>
            <HudButton tone="steel" variant="ghost" onClick={() => setShowKey((v) => !v)} className="px-3">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </HudButton>
            <HudButton tone="steel" variant="ghost" onClick={() => setAi({ apiKey: '' })} className="px-3" disabled={!ai.apiKey}>
              <Trash2 className="h-4 w-4" />
            </HudButton>
          </div>
          <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[9.5px] text-steel/80">
            <ShieldAlert className="h-3 w-3" /> La key nunca se embebe en el index.html del atleta. Usá una key con límite de gasto.
          </span>
        </label>
      </Panel>

      <Panel
        title="NOTAS BRUTAS DEL ATLETA · ANAMNESIS"
        right={
          <button onClick={() => setNotes(SAMPLE_NOTES)} className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-steel hover:text-cyan-hud">
            <FileText className="h-3.5 w-3.5" /> CARGAR EJEMPLO
          </button>
        }
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={11}
          placeholder="Peso, talla, % graso, edad, horarios de entrenamiento (CrossFit / Hyrox / Bodybuilding), gustos, alimentos rechazados, intolerancias, presupuesto…"
          className="scroll-thin w-full resize-y rounded-lg border border-line2 bg-panel2 p-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-steel/50 focus:border-cyan-hud"
        />
        <HudButton onClick={compile} disabled={busy} className={cx('mt-3 w-full py-4 text-[13px]', busy && 'relative overflow-hidden scanline')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {busy ? `COMPILANDO BIOENERGÉTICA · ${elapsed}s` : 'COMPILAR PLAN CON IA'}
        </HudButton>
        {error && (
          <div className="mt-3 rounded-lg border border-fire/50 bg-fire/10 p-3 font-mono text-[11px] text-fire">⚠ FALLO DE COMPILACIÓN · {error}</div>
        )}
        {log.length > 0 && (
          <div className="mt-3 rounded-lg border border-cyan-hud/30 bg-carbon p-3">
            <Tag className="mb-2">TELEMETRÍA DE COMPILACIÓN</Tag>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-6 text-ink">{log.join('\n')}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <HudButton tone="cyan" variant="ghost" onClick={() => setBuilderTab('profile')}>
                Revisar perfil
              </HudButton>
              <HudButton tone="cyan" variant="ghost" onClick={() => setBuilderTab('meals')}>
                Revisar ingestas
              </HudButton>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="SYSTEM PROMPT DEL MOTOR" tone="steel" right={<button onClick={() => setShowPrompt((v) => !v)} className="font-mono text-[10px] tracking-[0.12em] text-steel hover:text-ink">{showPrompt ? 'OCULTAR' : 'VER'}</button>}>
        {showPrompt ? (
          <pre className="scroll-thin max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] leading-5 text-steel">{SYSTEM_PROMPT + '\n' + SYSTEM_PROMPT_EXTENSION}</pre>
        ) : (
          <p className="text-xs text-steel">Contrato JSON estricto de Coach JP + reglas de cálculo ON/OFF. La respuesta se valida y se recalcula con el motor local.</p>
        )}
      </Panel>
    </div>
  );
}
