'use client';

import { useState } from 'react';
import { ArrowLeftRight, ChevronDown, PieChart } from 'lucide-react';
import { FOOD_BY_ID } from '@/lib/foods';
import { macroOf, macroSplit, QUICK_SWAPS, quickSwapItems, type QuickSwap } from '@/lib/quickSwaps';
import { allowedFor } from '@/lib/allergens';
import { usePlanStore } from '@/store/usePlanStore';
import type { Meal } from '@/lib/types';
import { cx, Panel } from '../hud/primitives';

const COLORS = { p: '#F97316', c: '#38BDF8', f: '#A78BFA' } as const;
const NAMES = { p: 'Proteínas', c: 'Carbohidratos', f: 'Grasas' } as const;

/** El 100 % de las calorías del día y cuánto aporta cada macro (en % y en gramos), entreno y descanso. */
export function MacroSplitBars() {
  const plan = usePlanStore((s) => s.plan);
  const kg = plan.profile.weightKg;
  return (
    <div className="grid gap-3 md:grid-cols-2" data-macro-split>
      {(['on', 'off'] as const).map((d) => {
        const g = plan.periodization[d];
        const s = macroSplit({ p: g.p * kg, c: g.c * kg, f: g.f * kg });
        return (
          <div key={d} className="rounded-xl border border-line bg-carbon/40 p-3" data-split-day={d}>
            <div className="flex items-baseline justify-between">
              <span className={cx('text-[13px] font-semibold', d === 'on' ? 'text-fire' : 'text-cyan-hud')}>{d === 'on' ? 'Día de entreno' : 'Día de descanso'}</span>
              <span className="tnum font-mono text-[13px] font-bold text-ink">
                {s.kcal.toLocaleString('es-AR')} kcal <span className="text-mute">= 100 %</span>
              </span>
            </div>
            <div className="mt-2 flex h-3.5 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`Proteínas ${s.p.pct} %, carbohidratos ${s.c.pct} %, grasas ${s.f.pct} %`}>
              {(['p', 'c', 'f'] as const).map((k) => (
                <div key={k} style={{ width: `${s[k].pct}%`, background: COLORS[k] }} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['p', 'c', 'f'] as const).map((k) => (
                <div key={k} className="rounded-lg border border-line px-2 py-1.5" data-split={k}>
                  <div className="flex items-center gap-1.5 text-[11px] text-mute">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[k] }} />
                    {NAMES[k]}
                  </div>
                  <div className="tnum font-mono text-[15px] font-bold text-ink">{s[k].pct} %</div>
                  <div className="tnum text-[11.5px] text-steel">
                    {s[k].g} g · {(s[k].g * (k === 'f' ? 9 : 4)).toLocaleString('es-AR')} kcal
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const dayLabel = (m: Meal) => (m.day === 'on' ? 'Entreno' : m.day === 'off' ? 'Descanso' : 'Ambos días');
const short = (id?: string) => (id ? FOOD_BY_ID[id]?.name.split(' (')[0] : '') ?? '';

/**
 * REEMPLAZOS RÁPIDOS DE MACROS (1 A 1): equivalencias de cocina en lenguaje simple. Tocá una y la tarjeta lista los
 * ingredientes del plan que se pueden cambiar por ella, con los gramos ya calculados: un clic y queda aplicado.
 */
export function QuickSwapsCard() {
  const plan = usePlanStore((s) => s.plan);
  const quickSwap = usePlanStore((s) => s.quickSwap);
  const [pick, setPick] = useState<{ k: 'p' | 'c' | 'f'; sw: QuickSwap } | null>(null);
  const [open, setOpen] = useState(false);
  const safe = allowedFor(plan);
  const ctx = (m: Meal) => ({ sex: plan.profile.sex, role: m.role });
  const targets = pick
    ? plan.meals.flatMap((m) => m.items.filter((i) => macroOf(i.foodId) === pick.k && i.foodId !== pick.sw.parts[0][0] && i.grams > 0).map((i) => ({ m, i })))
    : [];
  return (
    <div className="mt-3 rounded-xl border border-line bg-panel/60" data-quick-swaps>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-ink">
        <ArrowLeftRight className="h-4 w-4 text-cyan-hud" /> Reemplazos rápidos de macros (1 a 1)
        <span className="font-normal text-mute">· cambiá una fuente por otra sin desarmar el plan</span>
        <ChevronDown className={cx('ml-auto h-4 w-4 text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-line p-3">
          <div className="grid gap-3 lg:grid-cols-3">
            {QUICK_SWAPS.map((g) => (
              <div key={g.k}>
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: COLORS[g.k] }}>
                  {g.title} <span className="font-normal text-mute">({g.ref} cada uno)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items
                    .filter((sw) => sw.parts.every(([id]) => safe(id)))
                    .map((sw, i) => (
                      <button
                        key={sw.id}
                        type="button"
                        data-qswap={sw.id}
                        onClick={() => setPick(pick?.sw.id === sw.id ? null : { k: g.k, sw })}
                        className={cx('rounded-lg border px-2.5 py-1.5 text-left text-[12px]', pick?.sw.id === sw.id ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel hover:text-ink')}
                      >
                        {i > 0 && <span className="text-mute">≈ </span>}
                        {sw.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          {pick && (
            <div className="mt-3 rounded-lg border border-cyan-hud/30 bg-cyan-hud/[0.04] p-2.5">
              <div className="mb-1.5 text-[12px] text-steel">
                Cambiar por <b className="text-ink">{pick.sw.label}</b> en:
              </div>
              {targets.length === 0 && <div className="text-[12px] text-mute">No hay {NAMES[pick.k].toLowerCase()} para reemplazar en las comidas.</div>}
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {targets.map(({ m, i }) => {
                  const next = quickSwapItems(i, pick.sw, ctx(m));
                  return (
                    <div key={`${m.id}-${i.id}`} className="flex flex-wrap items-center gap-2 border-t border-line/60 py-1.5 text-[12px]">
                      <span className="min-w-0 flex-1 text-steel">
                        <b className="text-ink">{m.name}</b> · {dayLabel(m)} — {short(i.foodId)} {i.grams} g → <b className="text-ink">{next.map((x) => `${x.grams} g ${short(x.foodId).toLowerCase()}`).join(' + ')}</b>
                      </span>
                      <button type="button" data-qswap-apply onClick={() => quickSwap(m.id, i.id, pick.sw.id)} className="rounded-md border border-cyan-hud/50 px-2 py-1 font-semibold text-cyan-hud hover:bg-cyan-hud/10">
                        Cambiar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Panel de la pestaña Comidas: el 100 % calórico y los reemplazos rápidos. */
export function MacroSplitPanel() {
  return (
    <Panel title="MACROS DEL DÍA · EL 100 % DE LAS CALORÍAS" block="macros" tone="cyan" right={<PieChart className="h-4 w-4 text-cyan-hud/80" />}>
      <MacroSplitBars />
      <QuickSwapsCard />
    </Panel>
  );
}
