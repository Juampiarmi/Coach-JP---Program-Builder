'use client';

import { Activity, Gauge, Ruler, Zap } from 'lucide-react';
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
} from '@/lib/bioenergetics';
import { CITES } from '@/lib/evidence';
import type { Phase, PrecisionMode } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { ChoiceCard, Cite, cx, Label, NumberField, Panel, Readout, Segmented, Slider, TextField } from '../hud/primitives';

const EA_LABEL = { optimal: 'ÓPTIMA (>45)', reduced: 'REDUCIDA (30–45)', low: 'BAJA (<30) · ALERTA RED-S' } as const;

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
          <Label>Fórmula de BMR</Label>
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
        <Slider label="Factor de actividad (NEAT)" value={pr.activityFactor} min={1.2} max={1.7} step={0.05} onChange={(activityFactor) => setProfile({ activityFactor })} suffix="× BMR" />
        <Slider label="Gasto de la sesión (día ON)" value={pr.sessionKcal} min={200} max={1200} step={25} tone="fire" onChange={(sessionKcal) => setProfile({ sessionKcal })} suffix="kcal" />
      </div>
      <div className="w-full sm:w-1/3">
        <NumberField label="Días de entreno por semana" value={pr.trainingDaysPerWeek} min={0} max={7} decimals={false} onChange={(trainingDaysPerWeek) => setProfile({ trainingDaysPerWeek })} />
      </div>
    </div>
  );
}

function EaCard({ label, value, status, formula }: { label: string; value: number; status: 'optimal' | 'reduced' | 'low'; formula: string }) {
  const color = { optimal: 'text-cyan-hud', reduced: 'text-fire', low: 'text-danger' }[status];
  const border = { optimal: 'border-cyan-hud/30', reduced: 'border-fire/40', low: 'border-danger/50' }[status];
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
  const pr = plan.profile;
  const t = computeTelemetry(plan);
  const eaOn = eaStatus(t.eaOn);
  const eaOff = eaStatus(t.eaOff);

  return (
    <div className="space-y-4">
      <Panel title="01 · PERFIL BIOLÓGICO" right={<Activity className="h-4 w-4 text-cyan-hud/80" />}>
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

      <Panel title="DISCIPLINA & FASE">
        <div className="space-y-4">
          <div>
            <Label>Disciplina</Label>
            <Segmented
              value={pr.discipline}
              onChange={(discipline) => setProfile({ discipline })}
              options={[
                { value: 'bodybuilding', label: 'Sports & Bodybuilding' },
                { value: 'hybrid', label: 'CrossFit & Hyrox' },
              ]}
            />
          </div>
          <div>
            <Label>Fase · aplica el preset de macros ON/OFF</Label>
            <Segmented<Phase>
              value={pr.phase}
              onChange={applyPhasePreset}
              tone="fire"
              options={(Object.keys(PHASE_LABEL) as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
            />
          </div>
        </div>
      </Panel>

      <Panel title="GASTO ENERGÉTICO ESTIMADO" right={<Gauge className="h-4 w-4 text-cyan-hud/80" />}>
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

      <Panel title="DISPONIBILIDAD ENERGÉTICA · EA" tone={eaOn === 'low' || eaOff === 'low' ? 'danger' : eaOn === 'reduced' || eaOff === 'reduced' ? 'fire' : 'cyan'}>
        <p className="mb-3 text-xs leading-relaxed text-steel">
          Energía que le queda al cuerpo después de entrenar, por kg de masa libre de grasa. Se calcula con las kcal que suman las comidas planificadas de cada día.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <EaCard
            label="EA · DÍA ON"
            value={t.eaOn}
            status={eaOn}
            formula={`(${fmt0(t.intakeOn)} kcal − ${fmt0(pr.sessionKcal)} kcal sesión) / ${fmt1(t.ffm)} kg FFM`}
          />
          <EaCard label="EA · DÍA OFF" value={t.eaOff} status={eaOff} formula={`(${fmt0(t.intakeOff)} kcal − 0 kcal sesión) / ${fmt1(t.ffm)} kg FFM`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9.5px] tracking-[0.06em] text-mute">
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-hud" />&gt;45 ÓPTIMA</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-fire" />30–45 REDUCIDA</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-danger" />&lt;30 RED-S</span>
        </div>
        {Math.abs(t.eaOn - t.eaOff) < 3 && (
          <p className="mt-3 text-xs leading-relaxed text-steel">
            EA ON y OFF quedan parecidas porque las kcal extra del día ON ({fmt0(t.intakeOn - t.intakeOff)} kcal) compensan casi todo el gasto de la sesión ({fmt0(pr.sessionKcal)} kcal).
            Es el objetivo de una buena periodización: la sesión no hunde la disponibilidad energética.
          </p>
        )}
        {(eaOn === 'low' || eaOff === 'low') && (
          <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-danger">
            ⚠ ALERTA RED-S: EA por debajo de 30 kcal/kg FFM. Riesgo de supresión hormonal (T3, LH, leptina). Subí los carbohidratos del día ON o reducí el déficit.
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
