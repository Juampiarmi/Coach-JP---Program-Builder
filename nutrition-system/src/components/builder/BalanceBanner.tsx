'use client';

import { Scale } from 'lucide-react';
import { BALANCE_TOLERANCE, dayDeviation, isDayBalanced } from '@/lib/balance';
import { fmt0 } from '@/lib/bioenergetics';
import type { DayMode } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { cx } from '../hud/primitives';

const sign = (n: number) => `${n > 0 ? '+' : ''}${fmt0(n)} %`;

/**
 * Control de cierre: la suma de las comidas de cada día debe dar el 100 % ± 3 % de la meta.
 * Si no cierra, ofrece escalar carbos y grasas (ej. atleta que tilda 4/4 comidas y aún le "faltan" 465 kcal).
 */
export function BalanceBanner({ context = 'meals' }: { context?: 'meals' | 'export' }) {
  const plan = usePlanStore((s) => s.plan);
  const balanceMeals = usePlanStore((s) => s.balanceMeals);
  const days = (['on', 'off'] as DayMode[]).filter((d) => plan.meals.some((m) => m.day === d || m.day === 'both'));
  const open = days.filter((d) => !isDayBalanced(plan, d));
  const tol = fmt0(BALANCE_TOLERANCE * 100);

  if (!open.length)
    return (
      <div className="mt-3 font-mono text-[10.5px] tracking-[0.04em] text-cyan-hud">
        ✓ {days.map((d) => d.toUpperCase()).join(' y ')} cierran al 100 % ± {tol} % de la meta · el atleta llega a 0 kcal restantes al completar el día
      </div>
    );

  return (
    <div className={cx('mt-3 rounded-lg border border-fire/40 bg-fire/[0.07] p-3', context === 'export' && 'mt-0')}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-fire">[ BRECHA CALÓRICA · LAS COMIDAS NO CIERRAN EL 100 % ± {tol} % ]</div>
          <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-steel">
            {open.map((d) => {
              const x = dayDeviation(plan, d);
              return (
                <li key={d}>
                  DÍA {d.toUpperCase()}: {fmt0(x.got.kcal)}/{fmt0(x.target.kcal)} kcal ({sign(x.kcal)}) · C {fmt0(x.got.c)}/{fmt0(x.target.c)} g · G {fmt0(x.got.f)}/
                  {fmt0(x.target.f)} g
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-xs text-steel">
            {context === 'export'
              ? 'Si exportás así, el atleta tilda todas sus comidas y la app le sigue marcando kcal pendientes.'
              : 'Al tildar todas las comidas el atleta vería kcal pendientes en su dial.'}
          </p>
        </div>
        <button
          type="button"
          onClick={balanceMeals}
          className="flex items-center gap-1.5 rounded-md border border-fire bg-fire px-3 py-2 font-mono text-[10.5px] font-bold tracking-[0.1em] text-white transition hover:bg-fire-hot"
        >
          <Scale className="h-3.5 w-3.5" /> [ CERRAR BRECHA AL 100 % ]
        </button>
      </div>
    </div>
  );
}
