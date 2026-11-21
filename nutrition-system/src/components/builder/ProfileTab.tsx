'use client';

import { useState } from 'react';
import { Activity, Calculator, Eye, Gauge, Ruler, SlidersHorizontal, Zap } from 'lucide-react';
import {
  ACTIVITY_PRESETS,
  BODY_FAT_BANDS,
  computeTelemetry,
  eaStatus,
  fmt0,
  fmt1,
  jp7BodyFat,
  PHASE_LABEL,
  SESSION_PRESETS,
  SKINFOLD_SITES,
  skinfoldSum,
  trainingWeekdays,
} from '@/lib/bioenergetics';
import { CITES } from '@/lib/evidence';
import { BANK_GOALS, planLabel } from '@/lib/planBank';
import { goalFor, precalc, sessionKcalFor, sportFor, SPORTS } from '@/lib/precalc';
import type { Phase, PrecisionMode } from '@/lib/types';
import { bankPreview } from './TemplateBank';
import { PlanPreviewModal, type PreviewData } from './PlanPreviewModal';
import { usePlanStore } from '@/store/usePlanStore';
import { ChoiceCard, Cite, cx, Label, NumberField, Panel, Readout, Segmented, Slider, TextField } from '../hud/primitives';

// Escala de EA (kcal/kg FFM): < 30 riesgo RED-S · 30-45 rango táctico de recomposición (seguro) · > 45 óptima.
const EA_LABEL = { optimal: '[ ÓPTIMA · MÁS DE 45 ]', reduced: '[ SEGURA PARA RECOMPONER · 30-45 ]', low: '[ RIESGO PARA LA SALUD · MENOS DE 30 ]' } as const;

function PrecisionSelector() {
  const mode = usePlanStore((s) => s.plan.profile.precisionMode);
  const setProfile = usePlanStore((s) => s.setProfile);
  const opts: { id: PrecisionMode; title: string; hint: string; icon: typeof Zap }[] = [
    { id: 'quick', title: '[ MODO ESTIMACIÓN RÁPIDA ]', hint: 'Peso, altura y una tarjeta visual. El gasto se infiere solo.', icon: Zap },
    { id: 'isak', title: '[ MODO PRECISIÓN ISAK ]', hint: 'Pliegues cutáneos o masa libre de grasa medida (DEXA / BIA).', icon: Ruler },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {opts.map(({ id, title, hint, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setProfile({ precisionMode: id })}
          className={cx(
            'relative flex gap-3 rounded-lg border p-3 text-left transition',
            mode === id ? 'border-cyan-hud bg-cyan-hud/[0.08]' : 'border-white/[0.06] bg-panel hover:border-white/[0.14]',
          )}
        >
          {mode === id && <span className="absolute right-2 top-2 rounded border border-cyan-hud/30 bg-cyan-hud/10 px-1.5 py-px font-mono text-[8.5px] font-bold tracking-[0.14em] text-cyan-hud">✓ ACTIVO</span>}
          <Icon className={cx('mt-0.5 h-4 w-4 flex-none', mode === id ? 'text-cyan-hud' : 'text-mute')} />
          <span className="pr-14">
            <span className={cx('block font-mono text-[10.5px] font-bold tracking-[0.14em]', mode === id ? 'text-ink' : 'text-mute')}>{title}</span>
            <span className={cx('mt-1 block text-xs leading-snug', mode === id ? 'text-steel' : 'text-mute')}>{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function QuickMode() {
  const pr = usePlanStore((s) => s.plan.profile);
  const setProfile = usePlanStore((s) => s.setProfile);
  const selectBodyFatBand = usePlanStore((s) => s.selectBodyFatBand);
  const activeActivity = ACTIVITY_PRESETS.find((a) => Math.abs(a.factor - pr.activityFactor) < 0.001)?.id;
  const activeSession = SESSION_PRESETS.find((a) => a.kcal === pr.sessionKcal)?.id;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Peso" unit="kg" step={0.1} value={pr.weightKg} min={25} max={250} onChange={(weightKg) => setProfile({ weightKg })} />
        <NumberField label="Altura" unit="cm" value={pr.heightCm} min={100} max={230} decimals={false} onChange={(heightCm) => setProfile({ heightCm })} />
        <NumberField label="Edad" unit="años" value={pr.age} min={10} max={99} decimals={false} onChange={(age) => setProfile({ age })} />
      </div>
      <div>
        <Label>¿Cómo se ve el atleta? · grasa corporal estimada</Label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {BODY_FAT_BANDS[pr.sex].map((b) => (
            <ChoiceCard key={b.id} active={pr.bodyFatBand === b.id} title={b.label} meta={b.range} hint={b.hint} onClick={() => selectBodyFatBand(b.id)} />
          ))}
        </div>
      </div>
      <div>
        <Label>Actividad fuera del entrenamiento</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACTIVITY_PRESETS.map((a) => (
            <ChoiceCard key={a.id} active={activeActivity === a.id} title={a.label} hint={a.hint} onClick={() => setProfile({ activityFactor: a.factor })} />
          ))}
        </div>
      </div>
      <div>
        <Label>Tipo de sesión (día ON)</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {SESSION_PRESETS.map((a) => (
            <ChoiceCard key={a.id} active={activeSession === a.id} title={a.label} meta={`~${a.kcal} kcal`} hint={a.hint} onClick={() => setProfile({ sessionKcal: a.kcal })} />
          ))}
        </div>
      </div>
      <div className="w-full sm:w-1/3">
        <NumberField label="Días de entreno por semana" value={pr.trainingDaysPerWeek} min={0} max={7} decimals={false} onChange={(trainingDaysPerWeek) => setProfile({ trainingDaysPerWeek })} />
      </div>
    </div>
  );
}

function IsakMode() {
  const pr = usePlanStore((s) => s.plan.profile);
  const setProfile = usePlanStore((s) => s.setProfile);
  const setSkinfold = usePlanStore((s) => s.setSkinfold);
  const setMeasuredFfm = usePlanStore((s) => s.setMeasuredFfm);
  const jp7 = jp7BodyFat(pr.sex, pr.age, pr.skinfolds);
  const sum = skinfoldSum(pr.skinfolds);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="Peso" unit="kg" step={0.1} value={pr.weightKg} min={25} max={250} onChange={(weightKg) => setProfile({ weightKg })} />
        <NumberField label="Talla" unit="cm" value={pr.heightCm} min={100} max={230} decimals={false} onChange={(heightCm) => setProfile({ heightCm })} />
        <NumberField label="Edad" unit="años" value={pr.age} min={10} max={99} decimals={false} onChange={(age) => setProfile({ age })} />
        <NumberField label="% Graso" unit="%" step={0.1} value={pr.bodyFatPct} min={3} max={60} onChange={(bodyFatPct) => setProfile({ bodyFatPct, measuredFfmKg: 0 })} />
      </div>
      <div>
        <Label>Pliegues cutáneos ISAK · Jackson-Pollock 7 (mm)</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {SKINFOLD_SITES.map((site) => (
            <NumberField key={site.id} label={site.label} step={0.5} value={pr.skinfolds[site.id]} min={0} max={80} onChange={(mm) => setSkinfold(site.id, mm)} />
          ))}
        </div>
        <div className={cx('mt-2 font-mono text-[11px]', jp7 !== null ? 'text-cyan-hud' : 'text-steel')}>
          Σ7 = {fmt1(sum)} mm · {jp7 !== null ? `% graso JP7 + Siri: ${fmt1(jp7)} % (aplicado)` : 'completá los 7 pliegues para calcular el % graso'}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Masa libre de grasa medida (DEXA / BIA) · opcional" unit="kg" value={pr.measuredFfmKg} min={0} max={200} onChange={setMeasuredFfm} />
        <div>
          <Label>Fórmula del metabolismo basal (BMR)</Label>
          <Segmented
            value={pr.bmrFormula}
            onChange={(bmrFormula) => setProfile({ bmrFormula })}
            size="sm"
            options={[
              { value: 'katch', label: 'Katch-McArdle' },
              { value: 'mifflin', label: 'Mifflin-St Jeor' },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Actividad fuera del gimnasio (NEAT)" value={pr.activityFactor} min={1.2} max={1.7} step={0.05} onChange={(activityFactor) => setProfile({ activityFactor })} suffix="× BMR" />
        <Slider label="Gasto de la sesión (día ON)" value={pr.sessionKcal} min={200} max={1200} step={25} tone="fire" onChange={(sessionKcal) => setProfile({ sessionKcal })} suffix="kcal" />
      </div>
      <div className="w-full sm:w-1/3">
        <NumberField label="Días de entreno por semana" value={pr.trainingDaysPerWeek} min={0} max={7} decimals={false} onChange={(trainingDaysPerWeek) => setProfile({ trainingDaysPerWeek })} />
      </div>
    </div>
  );
}

function EaCard({ label, value, status, formula }: { label: string; value: number; status: 'optimal' | 'reduced' | 'low'; formula: string }) {
  const color = { optimal: 'text-[#22C55E]', reduced: 'text-cyan-hud', low: 'text-danger' }[status];
  const border = { optimal: 'border-[#22C55E]/40', reduced: 'border-cyan-hud/35', low: 'border-danger/50' }[status];
  return (
    <div className={cx('rounded-lg border bg-carbon p-3', border)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] tracking-[0.16em] text-mute">{label}</span>
        <span className={cx('font-mono text-[9.5px] font-bold tracking-[0.1em]', color)}>{EA_LABEL[status]}</span>
      </div>
      <div className={cx('tnum mt-1 font-mono text-3xl font-bold', color)}>
        {fmt1(value)} <span className="text-[10px] font-normal text-mute">kcal/kg FFM</span>
      </div>
      <div className="tnum mt-1 font-mono text-[10px] text-steel">{formula}</div>
    </div>
  );
}

export function ProfileTab() {
  const plan = usePlanStore((s) => s.plan);
  const setProfile = usePlanStore((s) => s.setProfile);
  const applyPhasePreset = usePlanStore((s) => s.applyPhasePreset);
  const setPlanMeta = usePlanStore((s) => s.setPlanMeta);
  const pr = plan.profile;
  const t = computeTelemetry(plan);
  const eaOn = eaStatus(t.eaOn);
  const eaOff = eaStatus(t.eaOff);

  return (
    <div className="space-y-4">
      <Panel block="perfil" title="PASO 1 · PERFIL FÍSICO" right={<Activity className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Nombre del atleta" value={pr.name} onChange={(name) => setProfile({ name })} />
          <div>
            <Label>Sexo</Label>
            <Segmented
              value={pr.sex}
              onChange={(sex) => setProfile({ sex })}
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Femenino' },
              ]}
            />
          </div>
        </div>
        <div className="mt-4">
          <Label>Precisión de los datos</Label>
          <PrecisionSelector />
        </div>
        <div className="mt-5 border-t border-line pt-5">{pr.precisionMode === 'quick' ? <QuickMode /> : <IsakMode />}</div>
      </Panel>

      <SportGoalPanel />
      <PrecalcPanel />

      <Panel block="perfil" title="AGENDA DE ENTRENAMIENTO & HIDRATACIÓN">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <Label>Entreno · inicio</Label>
            <input
              type="time"
              value={pr.trainingTime}
              onChange={(e) => e.target.value && setProfile({ trainingTime: e.target.value })}
              className="tnum w-full rounded-lg border border-line bg-carbon px-3 py-2 font-mono text-sm text-ink outline-none [color-scheme:dark] focus:border-cyan-hud/60"
            />
          </label>
          <label className="block">
            <Label>Entreno · fin ({pr.sessionMinutes} min)</Label>
            <input
              type="time"
              value={addMinutes(pr.trainingTime, pr.sessionMinutes)}
              onChange={(e) => {
                if (!e.target.value) return;
                // Franja exacta de la anamnesis (ej. 16:00 a 18:00 → 120 min); cruza la medianoche si el fin es menor.
                const mins = (toMinutes(e.target.value) - toMinutes(pr.trainingTime) + 1440) % 1440;
                if (mins >= 15 && mins <= 300) setProfile({ sessionMinutes: mins });
              }}
              className="tnum w-full rounded-lg border border-line bg-carbon px-3 py-2 font-mono text-sm text-ink outline-none [color-scheme:dark] focus:border-cyan-hud/60"
            />
          </label>
          <NumberField label="Agua · día ON" unit="L" min={0.5} max={8} value={plan.hydration.onMl / 1000} onChange={(l) => setPlanMeta({ hydration: { ...plan.hydration, onMl: Math.round(l * 1000) } })} />
          <NumberField label="Agua · día OFF" unit="L" min={0.5} max={8} value={plan.hydration.offMl / 1000} onChange={(l) => setPlanMeta({ hydration: { ...plan.hydration, offMl: Math.round(l * 1000) } })} />
        </div>
        <WeekdayPicker />
        <p className="mt-2 font-mono text-[10px] text-mute">
          Base 35 ml/kg + ~750 ml por hora de sesión. La franja inicio–fin alimenta el timeline peri-entreno de la app del atleta.
        </p>
      </Panel>

      <Panel block="macros" title="GASTO ENERGÉTICO ESTIMADO" right={<Gauge className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Masa libre de grasa" value={fmt1(t.ffm)} unit="kg" sub={`${fmt1(pr.bodyFatPct)} % graso`} />
          <Readout label={`Metabolismo basal · ${pr.bmrFormula === 'katch' ? 'Katch' : 'Mifflin'}`} value={fmt0(t.bmr)} unit="kcal" tone="cyan" sub={`${pr.bmrFormula === 'katch' ? 'Mifflin' : 'Katch'}: ${fmt0(t.bmrAlt)}`} />
          <Readout label="Gasto día de descanso" value={fmt0(t.tdeeOff)} unit="kcal" tone="cyan" />
          <Readout label="Gasto día de entreno" value={fmt0(t.tdeeOn)} unit="kcal" tone="cyan" sub={`Promedio semanal ${fmt0(t.tdeeWeekly)}`} />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Cite c={CITES.katch} />
          <Cite c={CITES.kliszczewicz} />
        </div>
      </Panel>

      <Panel block="macros" title="ENERGÍA DISPONIBLE (EA)" tone={eaOn === 'low' || eaOff === 'low' ? 'danger' : 'cyan'}>
        <p className="-mt-1 mb-3 text-[13px] text-steel">Lo que le queda al cuerpo para funcionar después de entrenar, por kg de masa magra. Si baja de 30, el déficit es demasiado agresivo y se resiente la salud hormonal (síndrome RED-S).</p>
        <p className="mb-3 text-xs leading-relaxed text-steel">
          Energía que le queda al cuerpo después de entrenar, por kg de masa libre de grasa. Se calcula con las kcal que suman las comidas planificadas de cada día.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <EaCard
            label="DÍA DE ENTRENO"
            value={t.eaOn}
            status={eaOn}
            formula={`(${fmt0(t.intakeOn)} kcal − ${fmt0(pr.sessionKcal)} kcal sesión) / ${fmt1(t.ffm)} kg FFM`}
          />
          <EaCard label="DÍA DE DESCANSO" value={t.eaOff} status={eaOff} formula={`(${fmt0(t.intakeOff)} kcal − 0 kcal sesión) / ${fmt1(t.ffm)} kg FFM`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9.5px] tracking-[0.06em] text-mute">
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" />&gt;45 ÓPTIMO</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-hud" />30–45 RANGO TÁCTICO / RECOMPOSICIÓN SEGURO</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-danger" />&lt;30 RIESGO PARA LA SALUD</span>
        </div>
        {Math.abs(t.eaOn - t.eaOff) < 3 && (
          <p className="mt-3 text-xs leading-relaxed text-steel">
            EA ON y OFF quedan parecidas porque las kcal extra del día ON ({fmt0(t.intakeOn - t.intakeOff)} kcal) compensan casi todo el gasto de la sesión ({fmt0(pr.sessionKcal)} kcal).
            Es el objetivo de una buena periodización: la sesión no hunde la disponibilidad energética.
          </p>
        )}
        {(eaOn === 'low' || eaOff === 'low') && (
          <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-danger">
            ⚠ Energía disponible por debajo de 30: el déficit es demasiado agresivo y puede frenar hormonas clave (tiroides, testosterona/estrógenos, leptina). Subí los carbohidratos del día de entreno o achicá el déficit.
          </div>
        )}
        <div className="mt-3 flex flex-col gap-1">
          <Cite c={CITES.ea} />
          <Cite c={CITES.reds} />
        </div>
      </Panel>
    </div>
  );
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const addMinutes = (hhmm: string, min: number) => {
  const t = (((toMinutes(hhmm) + min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Cronograma semanal: define qué días la app del atleta arranca sola en DÍA ON (con switch manual igual). */
function WeekdayPicker() {
  const pr = usePlanStore((s) => s.plan.profile);
  const setProfile = usePlanStore((s) => s.setProfile);
  const days = trainingWeekdays(pr);
  const toggle = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    setProfile({ trainingWeekdays: next.sort(), trainingDaysPerWeek: next.length });
  };
  return (
    <div className="mt-3">
      <Label>Días de entreno (ON automático en la app)</Label>
      <div className="flex flex-wrap gap-1.5">
        {WEEK_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={
              days.includes(d)
                ? 'rounded-md border border-fire bg-fire/15 px-2.5 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.08em] text-fire'
                : 'rounded-md border border-line px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.08em] text-mute hover:text-steel'
            }
          >
            {WEEKDAYS[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

const chip = (on: boolean, tone: 'cyan' | 'fire' = 'cyan') =>
  cx(
    'rounded-lg border px-3 py-2 text-left transition',
    on ? (tone === 'fire' ? 'border-fire bg-fire/10' : 'border-cyan-hud bg-cyan-hud/10') : 'border-line bg-panel hover:border-white/20',
  );

/** Deporte (define el gasto de la sesión) y objetivo (elige el plan maestro y la fase). */
function SportGoalPanel() {
  const plan = usePlanStore((s) => s.plan);
  const setSport = usePlanStore((s) => s.setSport);
  const setObjective = usePlanStore((s) => s.setObjective);
  const applyPhasePreset = usePlanStore((s) => s.applyPhasePreset);
  const pr = plan.profile;
  const sport = sportFor(plan);
  const goal = goalFor(plan);
  return (
    <Panel block="perfil" title="PASO 2 · DEPORTE Y OBJETIVO">
      <div className="space-y-4">
        <div>
          <Label>Deporte principal · define cuánto gasta en cada sesión</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPORTS.map((sp) => (
              <button key={sp.id} type="button" data-sport={sp.id} onClick={() => setSport(sp.id)} className={chip(sport?.id === sp.id)}>
                <span className="block text-[13px] font-semibold text-ink">{sp.label}</span>
                <span className="block text-[11px] text-mute">
                  {sp.hint} · ~{sessionKcalFor(sp, pr.weightKg, pr.sessionMinutes)} kcal / {pr.sessionMinutes} min
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Objetivo · elige el plan maestro del banco</Label>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {BANK_GOALS.map((g) => (
              <button key={g.id} type="button" data-goal={g.id} onClick={() => setObjective(g.id)} className={chip(goal === g.id, 'fire')}>
                <span className="block text-[13px] font-semibold text-ink">{g.label}</span>
                <span className="block text-[11px] text-mute">{g.short}</span>
              </button>
            ))}
          </div>
        </div>
        <details className="rounded-lg border border-line px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-steel">Avanzado · preset de macros por fase (reemplaza los macros de entreno y descanso)</summary>
          <div className="mt-2">
            <Segmented<Phase> value={pr.phase} onChange={applyPhasePreset} tone="fire" options={(Object.keys(PHASE_LABEL) as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))} />
          </div>
        </details>
      </div>
    </Panel>
  );
}

const pct = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`;

/** Precálculo en vivo: metabolismo, gasto y el plan maestro sugerido con sus calorías y macros de entreno y descanso. */
function PrecalcPanel() {
  const plan = usePlanStore((s) => s.plan);
  const applyTemplate = usePlanStore((s) => s.applyTemplate);
  const applyPrecalcMacros = usePlanStore((s) => s.applyPrecalcMacros);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const pc = precalc(plan);
  const pr = plan.profile;
  const same = (['on', 'off'] as const).every((d) => (['p', 'c', 'f'] as const).every((k) => Math.abs(plan.periodization[d][k] - pc.gkg[d][k]) < 0.01));
  return (
    <Panel block="macros" title="PRECÁLCULO EN VIVO · CALORÍAS Y MACROS" tone="cyan" right={<Calculator className="h-4 w-4 text-cyan-hud/80" />}>
      <p className="-mt-1 text-[12.5px] text-steel">
        Se recalcula solo con sexo, peso, talla, edad, deporte y objetivo. {pr.sex === 'F' ? 'Mujer' : 'Hombre'} · {fmt1(pr.weightKg)} kg · {fmt0(pr.heightCm)} cm · {fmt0(pr.age)} años
        {sportFor(plan) ? ` · ${sportFor(plan)!.label}` : ''}.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-precalc>
        <Readout label={`Metabolismo basal · ${pc.bmrLabel}`} value={fmt0(pc.bmr)} unit="kcal" tone="cyan" />
        <Readout label="Gasto día de descanso" value={fmt0(pc.tdeeOff)} unit="kcal" tone="cyan" />
        <Readout label="Gasto día de entreno" value={fmt0(pc.tdeeOn)} unit="kcal" tone="cyan" sub={`Sesión ~${fmt0(pr.sessionKcal)} kcal`} />
        <Readout label="Plan sugerido · comidas" value={`${pc.meals.on} / ${pc.meals.off}`} sub="entreno / descanso" />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="tnum w-full min-w-[460px] text-[12.5px]">
          <thead>
            <tr className="text-left font-mono text-[10px] tracking-[0.12em] text-mute">
              <th className="py-1.5 font-normal"> </th>
              <th className="py-1.5 font-normal">CALORÍAS</th>
              <th className="py-1.5 font-normal">PROTEÍNAS</th>
              <th className="py-1.5 font-normal">CARBOS</th>
              <th className="py-1.5 font-normal">GRASAS</th>
              <th className="py-1.5 font-normal">VS. GASTO</th>
            </tr>
          </thead>
          <tbody>
            {(['on', 'off'] as const).map((d) => (
              <tr key={d} className="border-t border-line">
                <td className={cx('py-2 font-semibold', d === 'on' ? 'text-fire' : 'text-cyan-hud')}>{d === 'on' ? 'Día de entreno' : 'Día de descanso'}</td>
                <td className="py-2 font-bold text-ink">{fmt0(pc.kcal[d])} kcal</td>
                <td className="py-2 text-steel">
                  {pc.grams[d].p} g <span className="text-mute">({fmt1(pc.gkg[d].p)} g/kg)</span>
                </td>
                <td className="py-2 text-steel">
                  {pc.grams[d].c} g <span className="text-mute">({fmt1(pc.gkg[d].c)})</span>
                </td>
                <td className="py-2 text-steel">
                  {pc.grams[d].f} g <span className="text-mute">({fmt1(pc.gkg[d].f)})</span>
                </td>
                <td className="py-2 text-steel">{pct(pc.balance[d])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-fire/30 bg-fire/[0.05] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9.5px] font-bold tracking-[0.16em] text-fire">PLAN MAESTRO SUGERIDO</div>
          <div className="text-[13.5px] font-semibold text-ink">{planLabel(pc.sel)}</div>
          <div className="text-[11.5px] text-mute">{pc.goal.balance} · porciones escaladas a {fmt1(pr.weightKg)} kg y horarios para entrenar a las {pr.trainingTime || '18:00'}</div>
        </div>
        <button
          type="button"
          data-precalc-preview
          onClick={() =>
            setPreview(
              bankPreview(plan, pc.sel, () => {
                setPreview(null);
                applyTemplate(pc.sel);
              }),
            )
          }
          className="flex items-center gap-1.5 rounded-lg border border-fire/50 px-3 py-2 text-[12.5px] font-semibold text-fire hover:bg-fire/10"
        >
          <Eye className="h-4 w-4" /> Ver plan sugerido
        </button>
        <button
          type="button"
          disabled={same}
          onClick={applyPrecalcMacros}
          title="Copia estos g/kg a la pestaña Macros entreno / descanso (no toca las comidas)"
          className="flex items-center gap-1.5 rounded-lg border border-cyan-hud/50 px-3 py-2 text-[12.5px] font-semibold text-cyan-hud hover:bg-cyan-hud/10 disabled:cursor-default disabled:border-line disabled:text-mute disabled:hover:bg-transparent"
        >
          <SlidersHorizontal className="h-4 w-4" /> {same ? 'Macros en uso' : 'Usar estos macros'}
        </button>
      </div>
      {preview && <PlanPreviewModal data={preview} onClose={() => setPreview(null)} />}
    </Panel>
  );
}
