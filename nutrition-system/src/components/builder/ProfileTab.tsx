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
import { Cite, cx, Label, NumberField, Panel, Readout, Segmented, Slider, TextField } from '../hud/primitives';

const EA_TONE = { optimal: 'cyan', reduced: 'gold', low: 'fire' } as const;
const EA_LABEL = { optimal: 'Óptima (≥45)', reduced: 'Reducida (30–45)', low: 'Baja (<30) · riesgo RED-S' } as const;

function ChoiceCard({ active, title, meta, hint, onClick }: { active: boolean; title: string; meta?: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-lg border p-3 text-left transition',
        active ? 'border-cyan-hud/45 bg-cyan-hud/[0.06]' : 'border-line2 bg-panel2 hover:border-steel/50',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={cx('text-sm font-semibold', active ? 'text-ink' : 'text-ink/85')}>{title}</span>
        {meta && <span className={cx('font-mono text-[10.5px]', active ? 'text-cyan-hud' : 'text-steel')}>{meta}</span>}
      </div>
      {hint && <div className="mt-1 text-xs leading-snug text-steel">{hint}</div>}
    </button>
  );
}

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
            'flex gap-3 rounded-lg border p-3 text-left transition',
            mode === id ? 'border-cyan-hud/45 bg-cyan-hud/[0.06]' : 'border-line2 bg-panel2 hover:border-steel/50',
          )}
        >
          <Icon className={cx('mt-0.5 h-4 w-4 flex-none', mode === id ? 'text-cyan-hud' : 'text-steel')} />
          <span>
            <span className={cx('block font-mono text-[10.5px] font-bold tracking-[0.14em]', mode === id ? 'text-cyan-hud' : 'text-steel')}>{title}</span>
            <span className="mt-1 block text-xs leading-snug text-steel">{hint}</span>
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
        <NumberField label="Peso" unit="kg" step={0.1} value={pr.weightKg} onChange={(weightKg) => weightKg > 20 && setProfile({ weightKg })} />
        <NumberField label="Altura" unit="cm" value={pr.heightCm} onChange={(heightCm) => heightCm > 100 && setProfile({ heightCm })} />
        <NumberField label="Edad" unit="años" value={pr.age} onChange={(age) => age > 10 && setProfile({ age })} />
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
        <NumberField label="Días de entreno por semana" value={pr.trainingDaysPerWeek} min={0} max={7} onChange={(v) => setProfile({ trainingDaysPerWeek: Math.max(0, Math.min(7, Math.round(v))) })} />
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
        <NumberField label="Peso" unit="kg" step={0.1} value={pr.weightKg} onChange={(weightKg) => weightKg > 20 && setProfile({ weightKg })} />
        <NumberField label="Talla" unit="cm" value={pr.heightCm} onChange={(heightCm) => heightCm > 100 && setProfile({ heightCm })} />
        <NumberField label="Edad" unit="años" value={pr.age} onChange={(age) => age > 10 && setProfile({ age })} />
        <NumberField label="% Graso" unit="%" step={0.1} value={pr.bodyFatPct} onChange={(bodyFatPct) => bodyFatPct >= 3 && bodyFatPct < 60 && setProfile({ bodyFatPct, measuredFfmKg: 0 })} />
      </div>
      <div>
        <Label>Pliegues cutáneos ISAK · Jackson-Pollock 7 (mm)</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {SKINFOLD_SITES.map((site) => (
            <NumberField key={site.id} label={site.label} step={0.5} value={pr.skinfolds[site.id]} onChange={(mm) => setSkinfold(site.id, mm)} />
          ))}
        </div>
        <div className={cx('mt-2 font-mono text-[11px]', jp7 !== null ? 'text-cyan-hud' : 'text-steel')}>
          Σ7 = {fmt1(sum)} mm · {jp7 !== null ? `% graso JP7 + Siri: ${fmt1(jp7)} % (aplicado)` : 'completá los 7 pliegues para calcular el % graso'}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Masa libre de grasa medida (DEXA / BIA) · opcional" unit="kg" step={0.1} value={pr.measuredFfmKg} onChange={setMeasuredFfm} />
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
        <NumberField label="Días de entreno por semana" value={pr.trainingDaysPerWeek} min={0} max={7} onChange={(v) => setProfile({ trainingDaysPerWeek: Math.max(0, Math.min(7, Math.round(v))) })} />
      </div>
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
              tone={pr.phase === 'recomp' ? 'fire' : pr.phase === 'surplus' ? 'gold' : 'cyan'}
              options={(Object.keys(PHASE_LABEL) as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
            />
          </div>
        </div>
      </Panel>

      <Panel title="GASTO ENERGÉTICO ESTIMADO" right={<Gauge className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Masa libre de grasa" value={fmt1(t.ffm)} unit="kg" sub={`${fmt1(pr.bodyFatPct)} % graso`} />
          <Readout label={`Metabolismo basal · ${pr.bmrFormula === 'katch' ? 'Katch' : 'Mifflin'}`} value={fmt0(t.bmr)} unit="kcal" tone="cyan" sub={`${pr.bmrFormula === 'katch' ? 'Mifflin' : 'Katch'}: ${fmt0(t.bmrAlt)}`} />
          <Readout label="Gasto día de descanso" value={fmt0(t.tdeeOff)} unit="kcal" tone="gold" />
          <Readout label="Gasto día de entreno" value={fmt0(t.tdeeOn)} unit="kcal" tone="cyan" sub={`Promedio semanal ${fmt0(t.tdeeWeekly)}`} />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Cite c={CITES.katch} />
          <Cite c={CITES.kliszczewicz} />
        </div>
      </Panel>

      <Panel title="DISPONIBILIDAD ENERGÉTICA · EA" tone={eaOn === 'low' || eaOff === 'low' ? 'fire' : 'cyan'}>
        <p className="mb-3 text-xs text-steel">Energía que le queda al cuerpo después de entrenar, por kg de masa magra (kcal/kg FFM/día).</p>
        <div className="grid grid-cols-2 gap-2">
          <Readout label="EA · Día ON" value={fmt1(t.eaOn)} tone={EA_TONE[eaOn]} sub={EA_LABEL[eaOn]} />
          <Readout label="EA · Día OFF" value={fmt1(t.eaOff)} tone={EA_TONE[eaOff]} sub={EA_LABEL[eaOff]} />
        </div>
        {(eaOn === 'low' || eaOff === 'low') && (
          <div className="mt-3 rounded-lg border border-fire/35 bg-fire/[0.07] p-3 text-xs leading-5 text-[#FDBA74]">
            EA por debajo de 30 kcal/kg FFM: riesgo de supresión hormonal. Subí los carbohidratos del día ON o reducí el déficit.
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
