'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Pill, Plus, Trash2, Utensils, X } from 'lucide-react';
import { computeTelemetry, dayTotals, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals } from '@/lib/bioenergetics';
import { CITES, doiUrl } from '@/lib/evidence';
import { FOOD_BY_ID, FOODS, GROUP_LABEL, type SwapGroup } from '@/lib/foods';
import type { DayMode, Meal, MealDay, MealRole } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { Cite, cx, HudButton, Panel, Segmented, Toggle } from '../hud/primitives';

const ROLE_LABEL: Record<MealRole, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  peri: 'Peri-entreno',
  post: 'Post-inmediato',
  snack: 'Colación',
  dinner: 'Cena',
};
const DAY_LABEL: Record<MealDay, string> = { on: 'ON', off: 'OFF', both: 'ON + OFF' };

const DAY_ORDER: Record<MealDay, number> = { both: 0, on: 1, off: 2 };

const GROUPS = Object.keys(GROUP_LABEL) as SwapGroup[];

function FoodPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="w-full cursor-pointer rounded-lg border border-dashed border-line2 bg-transparent px-3 py-2 font-mono text-[11px] text-steel outline-none hover:border-cyan-hud hover:text-cyan-hud"
    >
      <option value="">+ AGREGAR ALIMENTO DE LA BASE ARGENTINA…</option>
      {GROUPS.map((g) => (
        <optgroup key={g} label={GROUP_LABEL[g]}>
          {FOODS.filter((f) => f.group === g).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · P{f.p} C{f.c} F{f.f} /100 g
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function LeucineSensor({ meal }: { meal: Meal }) {
  const t = mealTotals(meal);
  if (!isMpsMeal(meal))
    return <span className="font-mono text-[10px] tracking-[0.1em] text-steel">● BLOQUE GLUCOLÍTICO · LEU {fmt1(t.leucine)} g · N/A</span>;
  const ok = t.leucine >= LEUCINE_THRESHOLD;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em]',
        ok ? 'bg-cyan-hud/10 text-cyan-hud' : 'animate-pulse bg-fire/15 text-fire shadow-fire',
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', ok ? 'bg-cyan-hud' : 'bg-fire')} />
      LEUCINA {fmt1(t.leucine)} g · {ok ? 'mTOR/MPS ✓' : `SUB-UMBRAL <${fmt1(LEUCINE_THRESHOLD)} g`}
    </span>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const { updateMeal, removeMeal, duplicateMeal, addFood, setItemGrams, swapItem, removeItem } = usePlanStore.getState();
  const t = mealTotals(meal);
  const kcal = t.p * 4 + t.c * 4 + t.f * 9;
  const lowLeu = isMpsMeal(meal) && t.leucine < LEUCINE_THRESHOLD;

  return (
    <Panel tone={lowLeu ? 'fire' : meal.day === 'off' ? 'gold' : 'cyan'} className={cx(lowLeu && 'border-fire/40')}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={meal.time}
          onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
          className="rounded-md border border-cyan-hud/30 bg-cyan-hud/5 px-2 py-1 font-mono text-xs text-cyan-hud outline-none [color-scheme:dark]"
        />
        <input
          value={meal.name}
          onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
          className="min-w-0 flex-1 bg-transparent font-display text-lg font-bold uppercase tracking-wide outline-none focus:text-cyan-hud"
        />
        <select
          value={meal.role}
          onChange={(e) => updateMeal(meal.id, { role: e.target.value as MealRole })}
          className="rounded-md border border-line2 bg-panel2 px-2 py-1 font-mono text-[10px] uppercase text-steel outline-none"
        >
          {(Object.keys(ROLE_LABEL) as MealRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <select
          value={meal.day}
          onChange={(e) => updateMeal(meal.id, { day: e.target.value as MealDay })}
          className={cx(
            'rounded-md border px-2 py-1 font-mono text-[10px] font-bold outline-none',
            meal.day === 'on' ? 'border-cyan-hud/40 bg-cyan-hud/10 text-cyan-hud' : meal.day === 'off' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-line2 bg-panel2 text-ink',
          )}
        >
          {(Object.keys(DAY_LABEL) as MealDay[]).map((d) => (
            <option key={d} value={d}>
              DÍA {DAY_LABEL[d]}
            </option>
          ))}
        </select>
        <button onClick={() => duplicateMeal(meal.id)} title="Duplicar al día opuesto" className="rounded-md p-1.5 text-steel hover:bg-line hover:text-ink">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => removeMeal(meal.id)} title="Eliminar bloque" className="rounded-md p-1.5 text-steel hover:bg-fire/15 hover:text-fire">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="scroll-thin mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="font-mono text-[9px] uppercase tracking-[0.14em] text-steel">
              <th className="py-1.5 text-left font-normal">Alimento · Smart Swap</th>
              <th className="w-20 py-1.5 text-right font-normal">Gramos</th>
              <th className="w-12 py-1.5 text-right font-normal">P</th>
              <th className="w-12 py-1.5 text-right font-normal">C</th>
              <th className="w-12 py-1.5 text-right font-normal">F</th>
              <th className="w-12 py-1.5 text-right font-normal">Leu</th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {meal.items.map((it) => {
              const ref = it.foodId ? FOOD_BY_ID[it.foodId] : undefined;
              return (
                <tr key={it.id} className="border-t border-line/70">
                  <td className="py-1.5 pr-2">
                    {ref ? (
                      <select
                        value={ref.id}
                        onChange={(e) => swapItem(meal.id, it.id, e.target.value)}
                        className="w-full cursor-pointer truncate bg-transparent text-sm text-ink outline-none hover:text-cyan-hud"
                        title={`Grupo: ${GROUP_LABEL[ref.group]}`}
                      >
                        {FOODS.filter((f) => f.group === ref.group).map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">
                        {it.food} <span className="font-mono text-[9px] text-gold">· IA</span>
                      </span>
                    )}
                  </td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      value={it.grams}
                      min={0}
                      step={5}
                      onChange={(e) => setItemGrams(meal.id, it.id, parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-line2 bg-panel2 px-1.5 py-1 text-right font-mono text-xs outline-none focus:border-cyan-hud"
                    />
                  </td>
                  <td className="py-1.5 text-right font-mono text-xs">{fmt1(it.p)}</td>
                  <td className="py-1.5 text-right font-mono text-xs">{fmt1(it.c)}</td>
                  <td className="py-1.5 text-right font-mono text-xs">{fmt1(it.f)}</td>
                  <td className="py-1.5 text-right font-mono text-xs text-cyan-hud">{fmt1(it.leucine)}</td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => removeItem(meal.id, it.id)} className="p-1 text-steel hover:text-fire">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-line2 font-mono text-xs font-bold">
              <td className="py-2 text-steel">{fmt0(kcal)} KCAL</td>
              <td />
              <td className="py-2 text-right">{fmt0(t.p)}</td>
              <td className="py-2 text-right">{fmt0(t.c)}</td>
              <td className="py-2 text-right">{fmt0(t.f)}</td>
              <td className="py-2 text-right text-cyan-hud">{fmt1(t.leucine)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <LeucineSensor meal={meal} />
      </div>
      <div className="mt-3">
        <FoodPicker onPick={(id) => addFood(meal.id, id, FOOD_BY_ID[id].unit?.grams ?? 100)} />
      </div>
    </Panel>
  );
}

function DayCompare({ day }: { day: DayMode }) {
  const plan = usePlanStore((s) => s.plan);
  const t = computeTelemetry(plan);
  const target = day === 'on' ? { ...t.gramsOn, kcal: t.kcalOn } : { ...t.gramsOff, kcal: t.kcalOff };
  const got = dayTotals(plan.meals, day);
  const rows: [string, number, number, string][] = [
    ['KCAL', got.kcal, target.kcal, '#F9FAFB'],
    ['P', got.p, target.p, '#00E5FF'],
    ['C', got.c, target.c, '#FFD600'],
    ['F', got.f, target.f, '#FF6B00'],
  ];
  return (
    <div className="rounded-lg border border-line bg-panel2 p-3">
      <div className={cx('mb-2 font-mono text-[10px] font-bold tracking-[0.16em]', day === 'on' ? 'text-cyan-hud' : 'text-gold')}>
        DÍA {day.toUpperCase()} · INGESTAS vs OBJETIVO
      </div>
      <div className="space-y-2">
        {rows.map(([l, g, tg, c]) => {
          const diff = tg ? (g / tg - 1) * 100 : 0;
          return (
            <div key={l} className="grid grid-cols-[38px_1fr_92px] items-center gap-2 font-mono text-[10.5px]">
              <span className="text-steel">{l}</span>
              <div className="h-1.5 overflow-hidden rounded bg-line">
                <div className="h-full rounded" style={{ width: `${Math.min(100, (g / (tg || 1)) * 100)}%`, background: c }} />
              </div>
              <span className={cx('text-right', Math.abs(diff) > 7 ? 'text-fire' : 'text-ink')}>
                {fmt0(g)}/{fmt0(tg)} {Math.abs(diff) > 7 && `(${diff > 0 ? '+' : ''}${fmt0(diff)}%)`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MealsTab() {
  const plan = usePlanStore((s) => s.plan);
  const addMeal = usePlanStore((s) => s.addMeal);
  const toggleSupplement = usePlanStore((s) => s.toggleSupplement);
  const updateSupplement = usePlanStore((s) => s.updateSupplement);
  const [filter, setFilter] = useState<'all' | DayMode>('all');

  const meals = [...plan.meals]
    .filter((m) => filter === 'all' || m.day === 'both' || m.day === filter)
    .sort((a, b) => (a.day === b.day ? a.time.localeCompare(b.time) : DAY_ORDER[a.day] - DAY_ORDER[b.day]));
  const lowCount = plan.meals.filter((m) => isMpsMeal(m) && mealTotals(m).leucine < LEUCINE_THRESHOLD).length;

  return (
    <div className="space-y-4">
      <Panel title="03 · CONSTRUCTOR DE BLOQUES HORARIOS" right={<Utensils className="h-4 w-4 text-cyan-hud" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <DayCompare day="on" />
          <DayCompare day="off" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="w-64">
            <Segmented
              value={filter}
              onChange={setFilter}
              size="sm"
              options={[
                { value: 'all', label: 'Todo' },
                { value: 'on', label: 'Día ON' },
                { value: 'off', label: 'Día OFF' },
              ]}
            />
          </div>
          <span className={cx('font-mono text-[10.5px] tracking-[0.1em]', lowCount ? 'text-fire' : 'text-cyan-hud')}>
            {lowCount ? `⚠ ${lowCount} BOLO(S) SUB-UMBRAL DE LEUCINA` : '✓ TODOS LOS BOLOS SUPERAN 2,7 g DE LEUCINA'}
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <Cite c={CITES.leucine} />
          <Cite c={CITES.aragon} />
        </div>
      </Panel>

      {meals.map((m) => (
        <MealCard key={m.id} meal={m} />
      ))}

      <div className="grid grid-cols-2 gap-2">
        <HudButton tone="cyan" variant="ghost" onClick={() => addMeal('on')}>
          <Plus className="h-4 w-4" /> Bloque día ON
        </HudButton>
        <HudButton tone="gold" variant="ghost" onClick={() => addMeal('off')}>
          <Plus className="h-4 w-4" /> Bloque día OFF
        </HudButton>
      </div>

      <Panel title="SUPLEMENTACIÓN · AIS GRUPO A" tone="gold" right={<Pill className="h-4 w-4 text-gold" />}>
        <div className="divide-y divide-line">
          {plan.supplements.map((s) => (
            <div key={s.id} className="py-3">
              <Toggle checked={s.enabled} onChange={() => toggleSupplement(s.id)} label={<b className="font-display text-base uppercase tracking-wide">{s.name}</b>} />
              <div className={cx('mt-2 grid gap-2 pl-14 sm:grid-cols-2', !s.enabled && 'opacity-40')}>
                <input
                  value={s.dose}
                  onChange={(e) => updateSupplement(s.id, { dose: e.target.value })}
                  className="rounded border border-line2 bg-panel2 px-2 py-1 font-mono text-xs text-cyan-hud outline-none focus:border-cyan-hud"
                />
                <input
                  value={s.timing}
                  onChange={(e) => updateSupplement(s.id, { timing: e.target.value })}
                  className="rounded border border-line2 bg-panel2 px-2 py-1 text-xs text-ink outline-none focus:border-cyan-hud"
                />
                {s.doi && (
                  <a href={doiUrl(s.doi)} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[9.5px] tracking-[0.06em] text-steel hover:text-cyan-hud sm:col-span-2">
                    [ {s.evidence} · DOI {s.doi} ] <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
