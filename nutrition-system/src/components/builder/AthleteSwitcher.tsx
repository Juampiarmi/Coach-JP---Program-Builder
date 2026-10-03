'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Trash2, UserPlus, Users } from 'lucide-react';
import { PHASE_LABEL } from '@/lib/bioenergetics';
import { listAthletes, usePlanStore } from '@/store/usePlanStore';
import { cx } from '../hud/primitives';

/** Selector rápido de la base local de atletas (localStorage). */
export function AthleteSwitcher() {
  const plan = usePlanStore((s) => s.plan);
  const roster = usePlanStore((s) => s.roster);
  const newAthlete = usePlanStore((s) => s.newAthlete);
  const switchAthlete = usePlanStore((s) => s.switchAthlete);
  const deleteAthlete = usePlanStore((s) => s.deleteAthlete);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const athletes = listAthletes({ plan, roster });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[220px] items-center gap-2 rounded-md border border-line bg-panel px-2.5 py-1.5 text-left transition hover:border-white/20"
      >
        <Users className="h-3.5 w-3.5 flex-none text-cyan-hud" />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-ink">{plan.profile.name}</span>
          <span className="block font-mono text-[9px] tracking-[0.1em] text-mute">{athletes.length} EN BASE LOCAL</span>
        </span>
        <ChevronDown className={cx('h-3.5 w-3.5 flex-none text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-line bg-panel p-2 shadow-[0_20px_50px_-20px_rgba(5,8,13,.9)]">
          <div className="px-2 pb-2 pt-1 font-mono text-[9.5px] tracking-[0.18em] text-mute">[ ATLETAS · BASE LOCAL ]</div>
          <div className="scroll-thin max-h-72 space-y-1 overflow-y-auto">
            {athletes.map((a) => {
              const active = a.id === plan.id;
              return (
                <div
                  key={a.id}
                  className={cx('group flex items-center gap-2 rounded-lg border px-2.5 py-2', active ? 'border-cyan-hud bg-cyan-hud/[0.08]' : 'border-transparent hover:bg-white/[0.03]')}
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      switchAthlete(a.id);
                      setOpen(false);
                    }}
                  >
                    <span className={cx('block truncate text-sm', active ? 'font-semibold text-ink' : 'text-steel')}>{a.profile.name}</span>
                    <span className="block font-mono text-[9.5px] text-mute">
                      {a.profile.weightKg} kg · {PHASE_LABEL[a.profile.phase]}
                    </span>
                  </button>
                  {active && <span className="rounded border border-cyan-hud/30 bg-cyan-hud/10 px-1.5 font-mono text-[8.5px] font-bold text-cyan-hud">ACTIVO</span>}
                  <button
                    title="Eliminar de la base local"
                    onClick={() => confirm(`¿Eliminar a ${a.profile.name} de la base local?`) && deleteAthlete(a.id)}
                    className="p-1 text-mute opacity-0 transition hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              newAthlete();
              setOpen(false);
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-fire/40 px-3 py-2 font-mono text-[10.5px] font-bold tracking-[0.12em] text-fire transition hover:border-fire hover:bg-fire/10"
          >
            <UserPlus className="h-3.5 w-3.5" /> [ + NUEVO ATLETA ]
          </button>
        </div>
      )}
    </div>
  );
}
