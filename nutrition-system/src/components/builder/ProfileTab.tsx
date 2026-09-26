'use client';

import { Activity, Gauge } from 'lucide-react';
import { computeTelemetry, eaStatus, fmt0, fmt1, PHASE_LABEL } from '@/lib/bioenergetics';
import { CITES } from '@/lib/evidence';
import type { Phase } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { Cite, Label, NumberField, Panel, Readout, Segmented, Slider, TextField } from '../hud/primitives';

const EA_TONE = { optimal: 'cyan', reduced: 'gold', low: 'fire' } as const;
const EA_LABEL = { optimal: 'ÓPTIMA ≥45', reduced: 'REDUCIDA 30–45', low: 'BAJA <30 · RIESGO RED-S' } as const;

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
      <Panel title="01 · PERFIL BIOLÓGICO" right={<Activity className="h-4 w-4 text-cyan-hud" />}>
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
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField label="Peso" unit="kg" step={0.1} value={pr.weightKg} onChange={(weightKg) => weightKg > 20 && setProfile({ weightKg })} />
          <NumberField label="% Graso" unit="%" step={0.5} value={pr.bodyFatPct} onChange={(bodyFatPct) => bodyFatPct >= 3 && bodyFatPct < 60 && setProfile({ bodyFatPct })} />
          <NumberField label="Talla" unit="cm" value={pr.heightCm} onChange={(heightCm) => heightCm > 100 && setProfile({ heightCm })} />
          <NumberField label="Edad" unit="años" value={pr.age} onChange={(age) => age > 10 && setProfile({ age })} />
        </div>
        <div className="mt-4">
          <Label>Disciplina</Label>
          <Segmented
            value={pr.discipline}
            onChange={(discipline) => setProfile({ discipline })}
            options={[
              { value: 'bodybuilding', label: '[ Sports & Bodybuilding ]' },
              { value: 'hybrid', label: '[ CrossFit & Hyrox ]' },
            ]}
          />
        </div>
        <div className="mt-4">
          <Label>Fase · aplica preset g/kg a la matriz ON/OFF</Label>
          <Segmented<Phase>
            value={pr.phase}
            onChange={applyPhasePreset}
            tone={pr.phase === 'recomp' ? 'fire' : pr.phase === 'surplus' ? 'gold' : 'cyan'}
            options={(Object.keys(PHASE_LABEL) as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
          />
        </div>
      </Panel>

      <Panel title="GASTO ENERGÉTICO · FISIOLOGÍA" right={<Gauge className="h-4 w-4 text-cyan-hud" />}>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <NumberField label="Días ON por semana" value={pr.trainingDaysPerWeek} min={0} max={7} onChange={(v) => setProfile({ trainingDaysPerWeek: Math.max(0, Math.min(7, Math.round(v))) })} />
          <Slider label="Factor NEAT (sin entrenamiento)" value={pr.activityFactor} min={1.2} max={1.7} step={0.05} onChange={(activityFactor) => setProfile({ activityFactor })} suffix="× BMR" />
          <Slider label="Gasto de la sesión (día ON)" value={pr.sessionKcal} min={200} max={1200} step={25} tone="fire" onChange={(sessionKcal) => setProfile({ sessionKcal })} suffix="kcal" />
        </div>
        <div className="mt-2">
          <Cite c={CITES.kliszczewicz} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Masa libre de grasa" value={fmt1(t.ffm)} unit="kg" />
          <Readout label={`BMR · ${pr.bmrFormula === 'katch' ? 'Katch' : 'Mifflin'}`} value={fmt0(t.bmr)} unit="kcal" tone="cyan" sub={`${pr.bmrFormula === 'katch' ? 'Mifflin' : 'Katch'}: ${fmt0(t.bmrAlt)}`} />
          <Readout label="TDEE · Día OFF" value={fmt0(t.tdeeOff)} unit="kcal" tone="gold" />
          <Readout label="TDEE · Día ON" value={fmt0(t.tdeeOn)} unit="kcal" tone="fire" sub={`Semanal ${fmt0(t.tdeeWeekly)}`} />
        </div>
      </Panel>

      <Panel title="DISPONIBILIDAD ENERGÉTICA · EA" tone={eaOn === 'low' || eaOff === 'low' ? 'fire' : 'cyan'}>
        <p className="mb-3 font-mono text-[11px] text-steel">EA = (Kcal ingeridas − Gasto del ejercicio) / FFM · kcal/kg FFM/día</p>
        <div className="grid grid-cols-2 gap-2">
          <Readout label="EA · Día ON" value={fmt1(t.eaOn)} tone={EA_TONE[eaOn]} sub={EA_LABEL[eaOn]} />
          <Readout label="EA · Día OFF" value={fmt1(t.eaOff)} tone={EA_TONE[eaOff]} sub={EA_LABEL[eaOff]} />
        </div>
        {(eaOn === 'low' || eaOff === 'low') && (
          <div className="mt-3 rounded-lg border border-fire/50 bg-fire/10 p-3 font-mono text-[11px] leading-5 text-fire">
            ⚠ EA por debajo de 30 kcal/kg FFM: riesgo de supresión endocrina (T3, LH, leptina). Subí carbos del día ON o reducí el déficit.
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
