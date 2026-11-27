'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, Library, X } from 'lucide-react';
import { acceptForPlan, allergiesOf, protocolOf } from '@/lib/allergens';
import { bankCandidates, previewAssign, totalsOf, type BankCandidate } from '@/lib/bankAssign';
import { fmt0 } from '@/lib/bioenergetics';
import { pairMeals } from '@/lib/couple';
import { crossSwapOptions } from '@/lib/crossSwaps';
import { householdHint } from '@/lib/foods';
import { autoTitle } from '@/lib/menuOptions';
import type { FoodItem, Meal } from '@/lib/types';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx } from '../hud/primitives';

const pct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)} %`;
const short = (n: string) => n.replace(/ \(.*\)$/, '');

/** Botón «Cambiar por plato del Banco Global» de una opción (0 = Opción 1). */
export function BankSwapButton({ meal, slot, compact }: { meal: Meal; slot: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-bank-swap={slot}
        onClick={() => setOpen(true)}
        title="Abre el Banco Global filtrado para este alumno y ordenado por cercanía a esta opción"
        className={cx(
          'flex items-center gap-1.5 rounded-md border border-[#22C55E]/40 px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.08em] text-[#4ADE80] transition hover:border-[#22C55E]/70 hover:bg-[#22C55E]/10',
          compact && 'px-1.5',
        )}
      >
        <Library className="h-3.5 w-3.5" /> {compact ? 'BANCO' : 'Cambiar por plato del Banco Global'}
      </button>
      {open && <BankSwapModal meal={meal} slot={slot} onClose={() => setOpen(false)} />}
    </>
  );
}

function BankSwapModal({ meal, slot, onClose }: { meal: Meal; slot: number; onClose: () => void }) {
  const plan = usePlanStore((s) => s.plan);
  const roster = usePlanStore((s) => s.roster);
  const replaceOption = usePlanStore((s) => s.replaceOption);
  const db = useFoodDbStore((s) => s.items);
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<BankCandidate | null>(null);
  const items = slot === 0 ? meal.items : (meal.alts?.[slot - 1]?.items ?? []);
  const title = (slot === 0 ? meal.title : meal.alts?.[slot - 1]?.title) || autoTitle(items);
  const cur = totalsOf(items);
  const list = useMemo(() => bankCandidates(meal, items, plan, db, title), [meal, items, plan, db, title]);
  const shown = list.filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40);
  // Modo Parejas: vista previa con los gramos de la pareja (misma comida, sus calorías).
  const partner = plan.partnerId && roster[plan.partnerId]?.partnerId === plan.id && !plan.partnerSyncAt ? roster[plan.partnerId] : undefined;
  const partnerPrev = useMemo(() => {
    if (!pick || !partner) return null;
    const pm = pairMeals(plan, partner).find((x) => x.lead.id === meal.id)?.partner;
    if (!pm) return null;
    const pItems = slot === 0 ? pm.items : (pm.alts?.[slot - 1]?.items ?? pm.items);
    return previewAssign(pick.src, { ...pm, items: pItems }, partner, db);
  }, [pick, partner, plan, meal.id, slot, db]);
  const n = slot + 1;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Cambiar Opción ${n} por plato del Banco Global`} onClick={onClose}>
      <div data-bank-swap-modal className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#4ADE80]">BANCO GLOBAL · {meal.name.toUpperCase()} · OPCIÓN {n}</div>
            <div className="text-[13px] text-steel">
              Hoy: <b className="text-ink">{title}</b> · {fmt0(cur.kcal)} kcal · P {fmt0(cur.p)} g
            </div>
            <div className="text-[11px] text-mute">Sólo platos aptos para {plan.profile.name.split(' ')[0] || 'el alumno'} (alergias, intolerancias, protocolo y topes), ordenados por cercanía.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-steel hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!pick ? (
          <>
            <div className="px-4 pt-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plato…" aria-label="Buscar plato" className="w-full rounded-lg border border-line bg-carbon px-3 py-2 text-[14px] text-ink outline-none focus:border-cyan-hud/60" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-bank-swap-list>
              {!shown.length && <p className="text-[13px] text-mute">No hay platos aptos para esta comida con ese nombre.</p>}
              <div className="space-y-1.5">
                {shown.map((c) => {
                  const u = totalsOf(c.preview.items);
                  return (
                    <button key={`${c.src.kind}:${c.src.id}`} type="button" data-bank-cand onClick={() => setPick(c)} className="w-full rounded-lg border border-line bg-carbon px-3 py-2 text-left transition hover:border-[#22C55E]/50">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-ink">{c.preview.title}</span>
                        <span className="flex-none rounded border border-line px-1.5 py-px font-mono text-[9px] text-mute">{c.origin}</span>
                      </div>
                      <div className="tnum mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-steel">
                        <span className={Math.abs(c.dk) > 0.1 ? 'text-fire' : 'text-ink'}>
                          {fmt0(u.kcal)} kcal ({pct(c.dk)})
                        </span>
                        <span className={Math.abs(c.dp) > 0.15 ? 'text-fire' : ''}>P {fmt0(u.p)} g</span>
                        <span>C {fmt0(u.c)}</span>
                        <span>G {fmt0(u.f)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-bank-swap-preview>
            <button type="button" onClick={() => setPick(null)} className="mb-2 text-[12px] font-semibold text-cyan-hud hover:underline">
              ← Volver a la lista
            </button>
            <PreviewBlock who={plan.profile.name.split(' ')[0] || 'Alumno'} title={pick.preview.title} items={pick.preview.items} ref0={cur} />
            {partnerPrev && <PreviewBlock who={`${partner!.profile.name.split(' ')[0] || 'Pareja'} (pareja)`} title={partnerPrev.title} items={partnerPrev.items} />}
            {pick.preview.steps?.length ? (
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[12px] text-steel">
                {pick.preview.steps.slice(0, 6).map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ol>
            ) : null}
          </div>
        )}
        {pick && (
          <div className="flex gap-2 border-t border-line px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <button type="button" onClick={() => setPick(null)} className="min-h-[44px] flex-1 rounded-lg border border-line text-[13px] text-steel hover:text-ink">
              Elegir otro
            </button>
            <button
              type="button"
              data-bank-swap-apply
              onClick={() => {
                if (replaceOption(meal.id, slot, pick.src)) onClose();
              }}
              className="min-h-[44px] flex-[2] rounded-lg bg-[#22C55E] text-[13.5px] font-bold text-carbon hover:bg-[#4ADE80]"
            >
              Reemplazar Opción {n}
              {partnerPrev ? ' (y pareja)' : ''}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function PreviewBlock({ who, title, items, ref0 }: { who: string; title: string; items: FoodItem[]; ref0?: { kcal: number; p: number } }) {
  const u = totalsOf(items);
  return (
    <div className="mb-2 rounded-lg border border-line bg-carbon p-3">
      <div className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-mute">{who.toUpperCase()} · GRAMOS YA ESCALADOS</div>
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      <ul className="mt-1.5 space-y-0.5 text-[12.5px]">
        {items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <b className="tnum w-14 flex-none text-right font-mono text-ink">{fmt0(i.grams)} g</b>
            <span className="text-steel">
              {short(i.food)}
              {householdHint(i.foodId, i.grams) && <em className="ml-1 not-italic text-mute">{householdHint(i.foodId, i.grams)}</em>}
            </span>
          </li>
        ))}
      </ul>
      <div className="tnum mt-1.5 font-mono text-[11px] text-steel">
        {fmt0(u.kcal)} kcal{ref0 && ref0.kcal > 0 ? ` (${pct(u.kcal / ref0.kcal - 1)} vs hoy)` : ''} · P {fmt0(u.p)} · C {fmt0(u.c)} · G {fmt0(u.f)}
      </div>
    </div>
  );
}

/** Reemplazo cruzado por macro de un ingrediente (proteína ⇄ otra familia, carbo ⇄ otra fuente). */
export function CrossSwapButton({ meal, slot, item }: { meal: Meal; slot: number; item: FoodItem }) {
  const plan = usePlanStore((s) => s.plan);
  const crossSwap = usePlanStore((s) => s.crossSwap);
  const [open, setOpen] = useState(false);
  const opts = useMemo(
    () =>
      open
        ? crossSwapOptions(item, {
            sex: plan.profile.sex,
            role: meal.role,
            diet: protocolOf(allergiesOf(plan)) ?? undefined,
            veg: allergiesOf(plan).includes('veg'),
            accept: acceptForPlan(plan),
            mealFoods: meal.items.map((i) => i.foodId ?? ''),
          })
        : [],
    [open, item, plan, meal.role, meal.items],
  );
  if (!crossSwapOptions(item, { sex: plan.profile.sex, role: meal.role }).length && !open) return null;
  return (
    <>
      <button
        type="button"
        data-cross-swap
        onClick={() => setOpen(true)}
        title="Reemplazo cruzado: otra familia con la misma proteína / carbos"
        aria-label={`Reemplazo cruzado de ${item.food}`}
        className="flex min-h-[32px] items-center gap-1 rounded-md border border-cyan-hud/30 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-cyan-hud hover:bg-cyan-hud/10"
      >
        <ArrowLeftRight className="h-3 w-3" /> CRUZADO
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Reemplazo cruzado de ${item.food}`} onClick={() => setOpen(false)}>
            <div data-cross-modal className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-cyan-hud">REEMPLAZO CRUZADO · {meal.name.toUpperCase()} · OPCIÓN {slot + 1}</div>
                  <div className="text-[13.5px] text-ink">
                    Cambiar <b>{fmt0(item.grams)} g de {short(item.food).toLowerCase()}</b> por…
                  </div>
                  <div className="text-[11px] text-mute">
                    Mismo aporte de {item.p * 4 >= item.c * 4 ? `proteína (${fmt0(item.p)} g)` : `carbohidratos (${fmt0(item.c)} g)`}, con topes, unidades enteras y sin lo que el alumno no puede comer.
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="p-1.5 text-steel hover:text-ink">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
                {!opts.length && <p className="text-[13px] text-mute">No hay reemplazos cruzados aptos dentro de los topes para esta porción.</p>}
                {opts.map((o) => (
                  <button
                    key={o.target.id}
                    type="button"
                    data-cross-opt={o.target.id}
                    onClick={() => {
                      if (crossSwap(meal.id, slot, item.id, o.target.id)) setOpen(false);
                    }}
                    className="w-full rounded-lg border border-line bg-carbon px-3 py-2 text-left transition hover:border-cyan-hud/50"
                  >
                    <div className="flex items-center gap-2">
                      <b className="text-[13px] text-ink">{o.target.label}</b>
                      <span className="rounded border border-line px-1.5 py-px font-mono text-[9px] text-mute">{o.same ? 'misma familia' : o.veg ? 'vegetariana' : o.target.family}</span>
                      <span className="tnum ml-auto font-mono text-[10.5px] text-steel">{fmt0(o.kcal)} kcal</span>
                    </div>
                    <div className="text-[12px] text-steel">{o.text}</div>
                    {o.warn && <div className="mt-0.5 text-[11px] text-gold">⚠ {o.warn}</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
