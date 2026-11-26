'use client';

import { useState } from 'react';
import { ChevronDown, Rocket } from 'lucide-react';
import { computeTelemetry, fmt0 } from '@/lib/bioenergetics';
import { shownDayTotals } from '@/lib/netCarbView';
import { usePlanStore, type BuilderTab } from '@/store/usePlanStore';
import { cx } from '../hud/primitives';

const pctOf = (got: number, goal: number) => (goal ? Math.round((got / goal) * 100) : 0);
const tone = (p: number) => (Math.abs(p - 100) <= 10 ? 'text-[#4ADE80]' : Math.abs(p - 100) <= 20 ? 'text-gold' : 'text-fire');

/**
 * Celular: resumen compacto fijo arriba con el 100 % de calorías y macros (P / C / G) del día elegido, para saber si
 * cuadra mientras se agregan platos. Tocando se despliegan las barras de entreno y descanso.
 */
export function MobileMacroBar() {
  const plan = usePlanStore((s) => s.plan);
  const [day, setDay] = useState<'on' | 'off'>('on');
  const [open, setOpen] = useState(false);
  const t = computeTelemetry(plan);
  const row = (d: 'on' | 'off') => {
    const got = shownDayTotals(plan, d);
    const goal = d === 'on' ? { ...t.gramsOn, kcal: t.kcalOn } : { ...t.gramsOff, kcal: t.kcalOff };
    return { got, goal, k: pctOf(got.kcal, goal.kcal), p: pctOf(got.p, goal.p), c: pctOf(got.c, goal.c), f: pctOf(got.f, goal.f) };
  };
  const r = row(day);
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-carbon/95 px-3 py-1.5 backdrop-blur lg:hidden" data-mobile-macros>
      <div className="flex items-center gap-2">
        <div className="flex flex-none overflow-hidden rounded-md border border-line">
          {(['on', 'off'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDay(d)} className={cx('min-h-[36px] px-2.5 font-mono text-[10px] font-bold', day === d ? (d === 'on' ? 'bg-fire/15 text-fire' : 'bg-cyan-hud/15 text-cyan-hud') : 'text-mute')} data-mobile-day={d}>
              {d === 'on' ? 'ENT.' : 'DESC.'}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="tnum flex min-h-[36px] min-w-0 flex-1 items-center justify-between gap-1 font-mono text-[11px]" aria-expanded={open} data-mobile-macros-toggle>
          <span className={cx('font-bold', tone(r.k))}>{r.k}%</span>
          <span className="hidden text-mute min-[380px]:inline">{fmt0(r.got.kcal)}/{fmt0(r.goal.kcal)}</span>
          <span className={tone(r.p)}>P{r.p}</span>
          <span className={tone(r.c)}>C{r.c}</span>
          <span className={tone(r.f)}>G{r.f}</span>
          <ChevronDown className={cx('h-4 w-4 flex-none text-mute transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mt-1.5 grid grid-cols-2 gap-2 pb-1" data-mobile-macros-detail>
          {(['on', 'off'] as const).map((d) => {
            const x = row(d);
            return (
              <div key={d} className="space-y-1">
                <div className={cx('font-mono text-[9.5px] font-bold', d === 'on' ? 'text-fire' : 'text-cyan-hud')}>{d === 'on' ? 'ENTRENO' : 'DESCANSO'}</div>
                {(
                  [
                    ['Kcal', x.k],
                    ['Prot', x.p],
                    [x.got.net ? 'C.net' : 'Carb', x.c],
                    ['Gras', x.f],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="grid grid-cols-[30px_1fr_34px] items-center gap-1 text-[10px]">
                    <span className="text-mute">{l}</span>
                    <span className="h-1.5 overflow-hidden rounded bg-white/[0.06]">
                      <i className={cx('block h-full rounded', Math.abs(v - 100) > 10 ? 'bg-fire' : 'bg-cyan-hud')} style={{ width: `${Math.min(100, v)}%` }} />
                    </span>
                    <span className={cx('tnum text-right font-mono', tone(v))}>{v}%</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SHORT: Record<BuilderTab, string> = { athletes: 'Atletas', anamnesis: 'Anamnesis', intake: 'IA', profile: 'Alumno', periodization: 'Macros', meals: 'Comidas', global: 'Banco', fooddb: 'Marcas', library: 'Planes' };

/** Celular: barra de pestañas fija abajo (áreas táctiles de 48 px) con acceso directo a Publicar. */
export function MobileTabBar({ tabs }: { tabs: { id: BuilderTab; icon: React.ComponentType<{ className?: string }> }[] }) {
  const builderTab = usePlanStore((s) => s.builderTab);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);
  const setDeployTab = usePlanStore((s) => s.setDeployTab);
  const go = (id: BuilderTab) => {
    setBuilderTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-carbon/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" data-mobile-tabs aria-label="Secciones del Builder">
      <div className="scroll-thin flex overflow-x-auto">
        {tabs.map(({ id, icon: Icon }) => (
          <button key={id} type="button" onClick={() => go(id)} data-mobile-tab={id} className={cx('flex min-h-[52px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9.5px] font-semibold', builderTab === id ? 'text-cyan-hud' : 'text-mute')}>
            <Icon className="h-[18px] w-[18px]" />
            {SHORT[id]}
          </button>
        ))}
        <button
          type="button"
          data-mobile-tab="publish"
          onClick={() => {
            setDeployTab('export');
            document.querySelector('aside')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex min-h-[52px] min-w-[46px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9.5px] font-semibold text-fire"
        >
          <Rocket className="h-[18px] w-[18px]" />
          Publicar
        </button>
      </div>
    </nav>
  );
}
