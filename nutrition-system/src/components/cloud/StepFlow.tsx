'use client';

import { Check } from 'lucide-react';
import { usePlanStore, type BuilderTab } from '@/store/usePlanStore';
import { useExportFreshness } from '../deploy/ExportFreshness';
import { cx } from '../hud/primitives';

const PROFILE_TABS: BuilderTab[] = ['anamnesis', 'intake', 'profile', 'periodization'];
const MEAL_TABS: BuilderTab[] = ['meals', 'library', 'fooddb'];

/** Guía visual del Builder: 1. Armar perfil → 2. Ajustar comidas → 3. Publicar link. */
export function StepFlow() {
  const plan = usePlanStore((s) => s.plan);
  const tab = usePlanStore((s) => s.builderTab);
  const deployTab = usePlanStore((s) => s.deployTab);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);
  const setDeployTab = usePlanStore((s) => s.setDeployTab);
  const { state, cloud } = useExportFreshness();

  const profileOk = !!plan.profile.name.trim() && plan.profile.weightKg > 0;
  const mealsOk = plan.meals.length > 0 && plan.meals.every((m) => m.items.length > 0);
  const sentOk = state === 'fresh';
  const steps = [
    { n: 1, title: 'Armar perfil', hint: 'Anamnesis, datos físicos y macros ON/OFF del atleta.', ok: profileOk, on: PROFILE_TABS.includes(tab) && deployTab !== 'export', go: () => setBuilderTab('profile') },
    { n: 2, title: 'Ajustar comidas', hint: 'Comidas del día con hasta 5 opciones cada una (o cargá un plan de la Biblioteca).', ok: mealsOk, on: MEAL_TABS.includes(tab) && deployTab !== 'export', go: () => setBuilderTab('meals') },
    {
      n: 3,
      title: cloud ? 'Publicar link' : 'Entregar plan',
      hint: cloud ? 'Publicá y tu alumno ve el plan al instante en su link fijo.' : 'Publicá con link fijo (nube) o exportá el archivo de respaldo.',
      ok: sentOk,
      on: deployTab === 'export',
      go: () => setDeployTab('export'),
      warn: state === 'stale',
    },
  ];
  return (
    <ol className="mb-3 grid grid-cols-3 gap-1.5" aria-label="Pasos para armar el plan">
      {steps.map((s, i) => (
        <li key={s.n}>
          <button
            onClick={s.go}
            title={s.hint}
            className={cx(
              'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition sm:px-3',
              s.on ? 'border-fire/70 bg-fire/[0.1]' : 'border-line bg-panel hover:border-white/20',
            )}
          >
            <span
              className={cx(
                'grid h-6 w-6 flex-none place-items-center rounded-full text-[12px] font-bold',
                s.ok ? 'bg-[#22C55E]/20 text-[#4ADE80]' : s.on ? 'bg-fire text-white' : 'bg-white/[0.06] text-steel',
              )}
            >
              {s.ok ? <Check className="h-3.5 w-3.5" /> : s.n}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-ink sm:text-[13px]">{s.title}</span>
              <span className={cx('hidden truncate text-[11px] sm:block', 'warn' in s && s.warn ? 'text-fire' : 'text-mute')}>
                {'warn' in s && s.warn ? 'Tenés cambios sin publicar' : s.ok ? (i === 2 ? 'Al día' : 'Listo') : 'Pendiente'}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
