'use client';

import { ChevronDown, Clock, Dna } from 'lucide-react';
import { BODY_FAT_BANDS, computeTelemetry, fmt0, fmt1 } from '@/lib/bioenergetics';
import { CONDITIONS } from '@/lib/anamnesisPro';
import { BANK_GOALS } from '@/lib/planBank';
import { goalFor, sessionKcalFor, sportFor, SPORTS } from '@/lib/precalc';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Label, NumberField, Panel, Segmented, TextField } from '../hud/primitives';
import { AnamnesisForm } from './AnamnesisForm';
import { PeriodizationTab } from './PeriodizationTab';
import { addMinutes, AllergyChips, PrecalcPanel, ProfileTab, toMinutes, WeekdayPicker } from './ProfileTab';

const chip = (on: boolean, tone: 'cyan' | 'fire' = 'cyan') =>
  cx('rounded-lg border px-3 py-2 text-left transition', on ? (tone === 'fire' ? 'border-fire bg-fire/10' : 'border-cyan-hud bg-cyan-hud/10') : 'border-line bg-panel hover:border-white/20');
const timeCls = 'tnum w-full rounded-lg border border-line bg-carbon px-3 py-2 font-mono text-sm text-ink outline-none [color-scheme:dark] focus:border-cyan-hud/60';

/**
 * VISTA ÚNICA DEL ALUMNO: perfil, horarios, restricciones y macros en una sola pantalla.
 * 1 · Biometría y deporte → 2 · Horarios y restricciones → 3 · Macros precalculados (entreno vs. descanso).
 * Cambiar peso, deporte u objetivo recalcula al instante las calorías de la tarjeta 3.
 */
export function AthleteSheet() {
  const plan = usePlanStore((s) => s.plan);
  const setProfile = usePlanStore((s) => s.setProfile);
  const selectBodyFatBand = usePlanStore((s) => s.selectBodyFatBand);
  const setSport = usePlanStore((s) => s.setSport);
  const setObjective = usePlanStore((s) => s.setObjective);
  const setAnamnesis = usePlanStore((s) => s.setAnamnesis);
  const pr = plan.profile;
  const sport = sportFor(plan);
  const goal = goalFor(plan);
  const conditions = plan.anamnesis?.conditions ?? [];
  const t = computeTelemetry(plan);

  return (
    <div className="space-y-4" data-athlete-sheet>
      <Panel block="perfil" title="1 · BIOMETRÍA Y DEPORTE" right={<Dna className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <TextField label="Nombre del atleta" value={pr.name} onChange={(name) => setProfile({ name })} />
          <div>
            <Label>Sexo</Label>
            <Segmented
              value={pr.sex}
              onChange={(sex) => setProfile({ sex })}
              options={[
                { value: 'F', label: 'Mujer' },
                { value: 'M', label: 'Hombre' },
              ]}
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <NumberField label="Peso" unit="kg" step={0.1} value={pr.weightKg} min={25} max={250} onChange={(weightKg) => setProfile({ weightKg })} />
          <NumberField label="Talla" unit="cm" value={pr.heightCm} min={100} max={230} decimals={false} onChange={(heightCm) => setProfile({ heightCm })} />
          <NumberField label="Edad" unit="años" value={pr.age} min={10} max={99} decimals={false} onChange={(age) => setProfile({ age })} />
        </div>
        <div className="mt-3">
          <Label>Grasa corporal estimada · {fmt1(pr.bodyFatPct)} %</Label>
          <div className="flex flex-wrap gap-1.5">
            {BODY_FAT_BANDS[pr.sex].map((b) => (
              <button key={b.id} type="button" onClick={() => selectBodyFatBand(b.id)} title={b.hint} className={cx('rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold', pr.bodyFatBand === b.id ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel hover:text-ink')}>
                {b.label} <span className="text-mute">{b.range}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Label>Deporte principal · define cuánto gasta en cada sesión</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPORTS.map((sp) => (
              <button key={sp.id} type="button" data-sport={sp.id} onClick={() => setSport(sp.id)} className={chip(sport?.id === sp.id)}>
                <span className="block text-[13px] font-semibold text-ink">{sp.label}</span>
                <span className="block text-[11px] text-mute">~{sessionKcalFor(sp, pr.weightKg, pr.sessionMinutes)} kcal / {pr.sessionMinutes} min</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Label>Objetivo · elige el plan maestro sugerido</Label>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {BANK_GOALS.map((g) => (
              <button key={g.id} type="button" data-goal={g.id} onClick={() => setObjective(g.id)} className={chip(goal === g.id, 'fire')}>
                <span className="block text-[13px] font-semibold text-ink">{g.label}</span>
                <span className="block text-[11px] text-mute">{g.short}</span>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel block="perfil" title="2 · HORARIOS Y RESTRICCIONES" right={<Clock className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <Label>Entreno · inicio</Label>
            <input type="time" value={pr.trainingTime} onChange={(e) => e.target.value && setProfile({ trainingTime: e.target.value })} className={timeCls} />
          </label>
          <label className="block">
            <Label>Entreno · fin ({pr.sessionMinutes} min)</Label>
            <input
              type="time"
              value={addMinutes(pr.trainingTime, pr.sessionMinutes)}
              onChange={(e) => {
                if (!e.target.value) return;
                const mins = (toMinutes(e.target.value) - toMinutes(pr.trainingTime) + 1440) % 1440;
                if (mins >= 15 && mins <= 300) setProfile({ sessionMinutes: mins });
              }}
              className={timeCls}
            />
          </label>
          <label className="block">
            <Label>Se levanta</Label>
            <input type="time" value={plan.anamnesis?.wakeTime ?? '07:00'} onChange={(e) => e.target.value && setAnamnesis({ wakeTime: e.target.value })} className={timeCls} />
          </label>
          <label className="block">
            <Label>Se acuesta</Label>
            <input type="time" value={plan.anamnesis?.bedTime ?? '23:00'} onChange={(e) => e.target.value && setAnamnesis({ bedTime: e.target.value })} className={timeCls} />
          </label>
        </div>
        <WeekdayPicker />
        <div className="mt-4">
          <AllergyChips />
        </div>
        <div className="mt-4">
          <Label>Condiciones de salud</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.filter((c) => c.id !== 'none').map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAnamnesis({ conditions: conditions.includes(c.id) ? conditions.filter((x) => x !== c.id) : [...conditions.filter((x) => x !== 'none'), c.id] })}
                className={cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold', conditions.includes(c.id) ? 'border-gold bg-gold/10 text-[#FDE68A]' : 'border-line text-steel hover:text-ink')}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <PrecalcPanel title="3 · MACROS PRECALCULADOS · ENTRENO VS. DESCANSO" />
      <p className="-mt-2 px-1 text-[12px] text-mute">
        En uso ahora: entreno <b className="text-steel">{fmt0(t.kcalOn)} kcal</b> (P {fmt1(plan.periodization.on.p)} · C {fmt1(plan.periodization.on.c)} · G {fmt1(plan.periodization.on.f)} g/kg) · descanso{' '}
        <b className="text-steel">{fmt0(t.kcalOff)} kcal</b> (P {fmt1(plan.periodization.off.p)} · C {fmt1(plan.periodization.off.c)} · G {fmt1(plan.periodization.off.f)} g/kg).
      </p>

      <div className="pt-2 font-mono text-[10px] tracking-[0.2em] text-mute">DETALLE AVANZADO</div>
      <Advanced title="Perfil físico completo · precisión ISAK, actividad diaria, gasto y energía disponible">
        <ProfileTab advanced />
      </Advanced>
      <Advanced title="Ajuste fino de macros · deslizadores g/kg, refeed y diet break">
        <PeriodizationTab />
      </Advanced>
      <Advanced title="Anamnesis completa · sueño, ayuno, hábitos, gustos, presupuesto y canasta de alimentos">
        <AnamnesisForm />
      </Advanced>
    </div>
  );
}

function Advanced({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-panel/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-steel hover:text-ink">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /> {title}
      </summary>
      <div className="border-t border-line p-3">{children}</div>
    </details>
  );
}
