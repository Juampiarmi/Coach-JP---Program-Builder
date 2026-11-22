'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, X, Zap } from 'lucide-react';
import { trainingOf } from '@/lib/agenda';
import { ALLERGIES } from '@/lib/anamnesisPro';
import { fmt0, fmt1 } from '@/lib/bioenergetics';
import { BANK_GOALS, buildBankPlan, planLabel, type BankGoal, type BankPlanId, type BankSelection } from '@/lib/planBank';
import { SPORTS } from '@/lib/precalc';
import type { DayMode, Sex, Sport } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Segmented } from '../hud/primitives';
import { MealPreview } from './PlanPreviewModal';

interface Draft {
  who: 'this' | 'new';
  name: string;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  sport: Sport;
  goal: BankGoal;
  allergies: string[];
  trainingTime: string;
}

const inputCls = 'w-full rounded-lg border border-line bg-carbon px-3 py-2 text-[14px] text-ink outline-none focus:border-cyan-hud/60';
const STEPS = ['Datos clave', 'Plan sugerido', 'Ajustar y publicar'];

/**
 * «+ Nuevo plan / Asignar rápido»: datos clave → plan maestro sugerido con vista previa → aplicar y pasar a Comidas
 * (ajustar y publicar). Para el alumno activo o para uno nuevo.
 */
export function QuickAssignButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-quick-assign
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-fire px-3 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,.9)] hover:bg-fire-hot"
      >
        <Plus className="h-4 w-4" /> Nuevo plan / Asignar rápido
      </button>
      {open && <QuickAssign onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAssign({ onClose }: { onClose: () => void }) {
  const plan = usePlanStore((s) => s.plan);
  const st = usePlanStore.getState;
  const pr = plan.profile;
  const [step, setStep] = useState(0);
  const [day, setDay] = useState<DayMode>('on');
  const [d, setD] = useState<Draft>({
    who: 'this',
    name: pr.name,
    sex: pr.sex,
    weightKg: pr.weightKg,
    heightCm: pr.heightCm,
    age: pr.age,
    sport: pr.sport ?? (pr.discipline === 'bodybuilding' ? 'gym' : 'crossfit'),
    goal: pr.phase === 'surplus' ? 'hip' : pr.phase === 'recomp' ? 'def' : 'rec',
    allergies: plan.anamnesis?.allergies ?? [],
    trainingTime: pr.trainingTime || '18:00',
  });
  const up = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const sel: BankSelection = { plan: `${d.sex}-${d.goal}` as BankPlanId, variant: d.allergies.includes('gluten') ? 'stacc' : 'std' };
  const preview = useMemo(
    () => buildBankPlan(sel, d.weightKg, trainingOf({ trainingTime: d.trainingTime, sessionMinutes: pr.sessionMinutes }), {}, d.allergies as never),
    [sel.plan, sel.variant, d.weightKg, d.trainingTime, d.allergies.join(), pr.sessionMinutes], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const canNext = step > 0 || (d.name.trim() && d.weightKg >= 30 && d.heightCm >= 100 && d.age >= 10);

  const apply = () => {
    if (d.who === 'new') st().newAthlete();
    st().setProfile({ name: d.name.trim() || 'Atleta', sex: d.sex, weightKg: d.weightKg, heightCm: d.heightCm, age: d.age, trainingTime: d.trainingTime });
    st().setSport(d.sport);
    st().setObjective(d.goal);
    st().setAnamnesis({ allergies: d.allergies });
    st().applyTemplate(sel); // abre Comidas con el plan escalado
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Nuevo plan / Asignar rápido" onClick={onClose}>
      <div data-quick-modal className="w-full max-w-3xl rounded-2xl border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-fire">NUEVO PLAN · ASIGNAR RÁPIDO</div>
            <ol className="mt-2 flex flex-wrap gap-2">
              {STEPS.map((s, i) => (
                <li key={s} className={cx('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold', i === step ? 'border-fire bg-fire/10 text-ink' : i < step ? 'border-[#22C55E]/40 text-[#4ADE80]' : 'border-line text-mute')}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>} {s}
                </li>
              ))}
            </ol>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-mute hover:text-ink" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          {step === 0 && (
            <div className="space-y-4">
              <div className="w-80 max-w-full">
                <Segmented
                  value={d.who}
                  onChange={(who) => up(who === 'new' ? { who, name: '', allergies: [] } : { who, name: pr.name, allergies: plan.anamnesis?.allergies ?? [] })}
                  options={[
                    { value: 'this', label: `Para ${pr.name}` },
                    { value: 'new', label: 'Alumno nuevo' },
                  ]}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <label className="block">
                  <span className="text-[12px] font-semibold text-steel">Nombre</span>
                  <input data-qa-name value={d.name} onChange={(e) => up({ name: e.target.value })} placeholder="Nombre del alumno" className={cx(inputCls, 'mt-1')} />
                </label>
                <div>
                  <span className="text-[12px] font-semibold text-steel">Sexo</span>
                  <div className="mt-1">
                    <Segmented value={d.sex} onChange={(sex) => up({ sex })} options={[{ value: 'F', label: 'Mujer' }, { value: 'M', label: 'Hombre' }]} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ['Peso (kg)', 'weightKg', 0.1],
                    ['Talla (cm)', 'heightCm', 1],
                    ['Edad', 'age', 1],
                  ] as const
                ).map(([l, k, stp]) => (
                  <label key={k} className="block">
                    <span className="text-[12px] font-semibold text-steel">{l}</span>
                    <input type="number" step={stp} value={d[k]} onChange={(e) => up({ [k]: Number(e.target.value) } as Partial<Draft>)} className={cx(inputCls, 'tnum mt-1')} />
                  </label>
                ))}
                <label className="block">
                  <span className="text-[12px] font-semibold text-steel">Entrena a las</span>
                  <input type="time" value={d.trainingTime} onChange={(e) => e.target.value && up({ trainingTime: e.target.value })} className={cx(inputCls, 'tnum mt-1 [color-scheme:dark]')} />
                </label>
              </div>
              <div>
                <span className="text-[12px] font-semibold text-steel">Deporte</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {SPORTS.map((s) => (
                    <button key={s.id} type="button" onClick={() => up({ sport: s.id, goal: d.who === 'new' ? s.goal : d.goal })} className={cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold', d.sport === s.id ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel')}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[12px] font-semibold text-steel">Objetivo</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {BANK_GOALS.map((g) => (
                    <button key={g.id} type="button" data-qa-goal={g.id} onClick={() => up({ goal: g.id })} className={cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold', d.goal === g.id ? 'border-fire bg-fire/10 text-ink' : 'border-line text-steel')}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[12px] font-semibold text-steel">Alergias e intolerancias</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ALLERGIES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => up({ allergies: d.allergies.includes(a.id) ? d.allergies.filter((x) => x !== a.id) : [...d.allergies, a.id] })}
                      className={cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold', d.allergies.includes(a.id) ? 'border-danger bg-danger/15 text-[#FCA5A5]' : 'border-line text-steel')}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-fire/30 bg-fire/[0.05] px-4 py-3">
                <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-fire">PLAN MAESTRO SUGERIDO</div>
                <div className="text-[16px] font-bold text-ink">{planLabel(sel)}</div>
                <div className="tnum mt-1 text-[12.5px] text-steel">
                  Entreno <b className="text-ink">{fmt0(preview.target.on.kcal)} kcal</b> · descanso <b className="text-ink">{fmt0(preview.target.off.kcal)} kcal</b> · proteína {fmt1(preview.gkg.on.p)} g/kg · porciones para {fmt1(d.weightKg)} kg
                  {d.allergies.length > 0 && <> · adaptado a sus alergias</>}
                </div>
              </div>
              <div className="w-80 max-w-full">
                <Segmented value={day} onChange={setDay} size="sm" options={[{ value: 'on', label: 'Día de entreno' }, { value: 'off', label: 'Día de descanso' }]} />
              </div>
              <div className="space-y-2">
                {preview.meals
                  .filter((m) => m.day === day)
                  .map((m) => (
                    <MealPreview key={m.id} name={m.name} time={m.time} options={[{ title: m.title ?? m.name, items: m.items }, ...(m.alts ?? [])]} />
                  ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2 text-[13.5px] text-steel">
              <p>
                Se va a {d.who === 'new' ? <>crear a <b className="text-ink">{d.name || 'el alumno nuevo'}</b> y </> : null}aplicar <b className="text-ink">{planLabel(sel)}</b> con las porciones para {fmt1(d.weightKg)} kg y los horarios para entrenar a las {d.trainingTime}.
              </p>
              <p>Después vas a Comidas: ajustás lo que quieras (opciones, base proteica, copiar al descanso) y publicás con el botón fijo «Publicar en la nube».</p>
              {d.who === 'this' && <p className="text-[12.5px] text-mute">Reemplaza las comidas y macros actuales de {pr.name} (podés deshacerlo con Ctrl+Z).</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
          <button onClick={() => (step ? setStep(step - 1) : onClose())} className="rounded-lg border border-line px-4 py-2.5 text-[13px] font-semibold text-steel hover:text-ink">
            {step ? 'Atrás' : 'Cancelar'}
          </button>
          {step < 2 ? (
            <button data-qa-next disabled={!canNext} onClick={() => setStep(step + 1)} className="rounded-lg bg-cyan-hud px-5 py-2.5 text-[13px] font-bold text-carbon disabled:opacity-40">
              Siguiente
            </button>
          ) : (
            <button data-qa-apply onClick={apply} className="flex items-center gap-1.5 rounded-lg bg-fire px-5 py-2.5 text-[13px] font-bold text-white hover:bg-fire-hot">
              <Zap className="h-4 w-4" /> Aplicar y ajustar comidas
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
