'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, Eye, EyeOff, KeyRound, Loader2, Radio, ShieldAlert, Trash2, Zap } from 'lucide-react';
import { compileWithAi, MODEL_OPTIONS, pingProvider, planFromAi, SYSTEM_PROMPT, SYSTEM_PROMPT_EXTENSION, type PingResult } from '@/lib/ai';
import { computeTelemetry, fmt0 } from '@/lib/bioenergetics';
import type { AiProvider } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, HudButton, Label, Panel, Segmented, Select, Tag } from '../hud/primitives';

/** Plantillas de anamnesis: estructura completa lista para editar en un clic. */
const TEMPLATES: { id: string; label: string; text: string }[] = [
  {
    id: 'hyrox',
    label: 'Atleta Hyrox / Doble Turno',
    text: `Nombre: Franco, 31 años, masculino.
Medidas: 176 cm · 79 kg · 14 % graso (bioimpedancia).
Deporte: Hyrox Pro + CrossFit. DOBLE TURNO: 07:00 h carrera/ergómetros (60 min) y 19:00 h fuerza + estaciones Hyrox (75 min). Lunes a viernes; sábado fondo largo 90 min; domingo descanso.
Trabajo: oficina 9-18 h. Duerme 6,5 h.
Objetivo: recomposición manteniendo rendimiento (competencia en 10 semanas).
Gustos: carne vacuna, arroz, huevos, yogur, banana, mate.
Rechaza: pescado, hígado, brócoli. Intolerancias: ninguna.
Cafeína: 2 cafés/día. Presupuesto: medio.
Suplementos actuales: whey. Nunca usó creatina.`,
  },
  {
    id: 'bb',
    label: 'Musculación / Recomposición',
    text: `Nombre: Lucía, 27 años, femenino.
Medidas: 165 cm · 63 kg · 24 % graso (estimado visual).
Deporte: musculación 5 días (torso/pierna), sesiones de 70 min a las 18:30 h. Caminatas 8.000 pasos/día.
Trabajo: home office.
Objetivo: recomposición — bajar grasa y ganar masa muscular en glúteos y espalda.
Gustos: pollo, avena, batata, frutos rojos, yogur griego.
Rechaza: carnes rojas grasas. Intolerancias: lactosa leve (tolera yogur).
Cafeína: 1 café/día. Presupuesto: medio-alto.
Suplementos actuales: ninguno.`,
  },
  {
    id: 'cf',
    label: 'CrossFit / Mantenimiento',
    text: `Nombre: Martín, 35 años, masculino.
Medidas: 180 cm · 86 kg · 16 % graso.
Deporte: CrossFit RX, 4 WODs por semana (60 min, 07:00 h) + 1 sesión de halterofilia.
Trabajo: comercio, mucho tiempo de pie (~11.000 pasos/día).
Objetivo: mantener peso y rendimiento (normocalórica de control), mejorar recuperación.
Gustos: asado, pastas, arroz, huevos, mate, frutas.
Rechaza: legumbres. Intolerancias: ninguna.
Cafeína: 3 mates cebados + 1 café. Presupuesto: medio.
Suplementos actuales: creatina 5 g/día.`,
  },
];

const PING_LABEL: Record<Exclude<PingResult, { ok: true }>['kind'], string> = {
  auth: 'ERROR DE AUTENTICACIÓN',
  quota: 'ERROR DE CUOTA / RATE LIMIT',
  model: 'MODELO NO DISPONIBLE',
  network: 'SIN CONEXIÓN / BLOQUEO DE RED',
  other: 'ERROR DEL PROVEEDOR',
};

export function IntakeTab() {
  const ai = usePlanStore((s) => s.ai);
  const setAi = usePlanStore((s) => s.setAi);
  const notes = usePlanStore((s) => s.intakeNotes);
  const setNotes = usePlanStore((s) => s.setIntakeNotes);
  const loadPlan = usePlanStore((s) => s.loadPlan);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);

  const [showKey, setShowKey] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [ping, setPing] = useState<PingResult | 'testing' | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  // Zustand persiste en localStorage en cada cambio: el indicador lo confirma al instante.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaved(true);
    setPing(null);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  }, [ai.apiKey, ai.provider, ai.model]);

  const setProvider = (provider: AiProvider) => setAi({ provider, model: MODEL_OPTIONS[provider][0].id });

  async function testConnection() {
    setPing('testing');
    setPing(await pingProvider(usePlanStore.getState().ai));
  }

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
        <p className="mb-4 text-sm leading-relaxed text-steel">
          Volcá las notas del atleta. El motor devuelve un JSON estructurado (Katch-McArdle, periodización ON/OFF, comidas con alimentos argentinos, leucina
          por comida y protocolo AIS Grupo A) y rellena todas las pestañas del Builder.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">API key</span>
            <span className={cx('flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-cyan-hud transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>
              <Check className="h-3 w-3" /> Guardado localmente
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
              <input
                type={showKey ? 'text' : 'password'}
                value={ai.apiKey}
                autoComplete="off"
                spellCheck={false}
                placeholder={ai.provider === 'claude' ? 'sk-ant-…' : ai.provider === 'gemini' ? 'AIza…' : 'sk-…'}
                onChange={(e) => setAi({ apiKey: e.target.value.trim() })}
                className="w-full rounded-lg border border-line bg-carbon py-2 pl-9 pr-3 font-mono text-sm text-ink outline-none focus:border-cyan-hud/60"
              />
            </div>
            <HudButton tone="steel" variant="ghost" onClick={() => setShowKey((v) => !v)} className="px-3" title={showKey ? 'Ocultar' : 'Mostrar'}>
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </HudButton>
            <HudButton tone="steel" variant="ghost" onClick={() => setAi({ apiKey: '' })} className="px-3" disabled={!ai.apiKey} title="Olvidar key">
              <Trash2 className="h-4 w-4" />
            </HudButton>
            <HudButton tone="cyan" onClick={testConnection} disabled={!ai.apiKey || ping === 'testing'}>
              {ping === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />} [ Probar conexión ]
            </HudButton>
          </div>
          <div className="mt-2 min-h-[18px] font-mono text-[11px] tracking-[0.06em]">
            {ping === 'testing' && <span className="text-mute">• SONDEANDO {ai.model.toUpperCase()}…</span>}
            {ping && ping !== 'testing' && ping.ok && (
              <span className="text-cyan-hud">
                • CONECTADO (LATENCIA {ping.latencyMs} ms) · {ping.model}
              </span>
            )}
            {ping && ping !== 'testing' && !ping.ok && (
              <span className={ping.kind === 'auth' ? 'text-danger' : 'text-fire'}>
                • {PING_LABEL[ping.kind]} <span className="text-mute">· {ping.message.slice(0, 140)}</span>
              </span>
            )}
          </div>
          <span className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] text-mute">
            <ShieldAlert className="h-3 w-3" /> La key vive sólo en este navegador y nunca se embebe en el index.html del atleta. Usá una key con límite de gasto.
          </span>
        </div>
      </Panel>

      <Panel title="NOTAS DEL ATLETA · ANAMNESIS">
        <div className="mb-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setNotes(t.text)}
              className="rounded-md border border-cyan-hud/20 bg-cyan-hud/10 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.04em] text-cyan-hud transition hover:border-cyan-hud/60"
            >
              [ + {t.label} ]
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={11}
          placeholder="Peso, talla, % graso, edad, horarios de entrenamiento (CrossFit / Hyrox / Bodybuilding), gustos, alimentos rechazados, intolerancias, presupuesto…"
          className="scroll-thin w-full resize-y rounded-lg border border-line bg-carbon p-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-mute/70 focus:border-cyan-hud/60"
        />
        <HudButton onClick={compile} disabled={busy} className={cx('mt-3 w-full py-4 text-[13px]', busy && 'relative overflow-hidden scanline')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {busy ? `COMPILANDO BIOENERGÉTICA · ${elapsed}s` : 'COMPILAR PLAN CON IA'}
        </HudButton>
        {error && <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 font-mono text-[11px] text-danger">⚠ FALLO DE COMPILACIÓN · {error}</div>}
        {log.length > 0 && (
          <div className="mt-3 rounded-lg border border-cyan-hud/20 bg-carbon p-3">
            <Tag className="mb-2">TELEMETRÍA DE COMPILACIÓN</Tag>
            <pre className="tnum whitespace-pre-wrap font-mono text-[11px] leading-6 text-ink">{log.join('\n')}</pre>
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

      <section className="rounded-xl border border-line bg-panel">
        <button type="button" onClick={() => setAdvanced((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-mute">
            [ Configuración avanzada del motor IA ] <span className="text-steel">({advanced ? 'Contraer' : 'Expandir'})</span>
          </span>
          <ChevronDown className={cx('h-4 w-4 text-mute transition-transform', advanced && 'rotate-180')} />
        </button>
        {advanced && (
          <div className="border-t border-line px-4 pb-4 pt-3 sm:px-5">
            <p className="mb-2 text-xs text-steel">System prompt del motor: contrato JSON estricto de Coach JP + reglas de cálculo ON/OFF. La respuesta se valida y se recalcula con el motor local.</p>
            <pre className="scroll-thin max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-carbon p-3 font-mono text-[10.5px] leading-5 text-steel">
              {SYSTEM_PROMPT + '\n' + SYSTEM_PROMPT_EXTENSION}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
