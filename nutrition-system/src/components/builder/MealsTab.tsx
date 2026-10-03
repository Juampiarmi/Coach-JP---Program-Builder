'use client';

import { useState } from 'react';
import { CopyPlus, ExternalLink, Pill, Plus, Trash2, Utensils, X } from 'lucide-react';
import { computeTelemetry, dayTotals, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals } from '@/lib/bioenergetics';
import { CITES, doiUrl } from '@/lib/evidence';
import { equivalentGrams, FOOD_BY_ID, FOODS, GROUP_LABEL, householdHint, type SwapGroup } from '@/lib/foods';
import type { DayMode, FoodItem, Meal, MealDay, MealRole } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { Cite, cx, HudButton, Label, NumInput, Panel, Segmented, Toggle } from '../hud/primitives';
import { FoodScanner } from './FoodScanner';

const ROLE_LABEL: Record<MealRole, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  peri: 'Pre / intra entreno',
  post: 'Post entreno',
  snack: 'Colación',
  dinner: 'Cena',
};
const DAY_LABEL: Record<MealDay, string> = { on: 'Día ON', off: 'Día OFF', both: 'Todos los días' };
const DAY_ORDER: Record<MealDay, number> = { both: 0, on: 1, off: 2 };

const GROUPS = Object.keys(GROUP_LABEL) as SwapGroup[];

const smallSelect = 'rounded-md border border-line bg-carbon px-2 py-1 text-xs text-steel outline-none focus:border-cyan-hud/50';

// Leucina aportada por 1 huevo (50 g) y por gramo de whey (base de alimentos).
const LEU_PER_EGG = (FOOD_BY_ID.huevo.leucine * 50) / 100;
const LEU_PER_G_WHEY = FOOD_BY_ID.whey.leucine / 100;

function FoodPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="w-full cursor-pointer rounded-lg border border-dashed border-line2 bg-transparent px-3 py-2 text-xs text-steel outline-none hover:border-steel/60 hover:text-ink"
    >
      <option value="">+ Agregar alimento…</option>
      {GROUPS.map((g) => (
        <optgroup key={g} label={GROUP_LABEL[g]}>
          {FOODS.filter((f) => f.group === g).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function ProteinSensor({ meal }: { meal: Meal }) {
  const t = mealTotals(meal);
  if (!isMpsMeal(meal))
    return (
      <span className="inline-flex items-center rounded-md border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-[10.5px] tracking-[0.06em] text-mute">
        [ BLOQUE GLUCOLÍTICO · LEUCINA NO PRIORITARIA ]
      </span>
    );
  const ok = t.leucine >= LEUCINE_THRESHOLD;
  if (ok)
    return (
      <span className="tnum inline-flex items-center gap-2 rounded-md border border-cyan-hud/30 bg-cyan-hud/10 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.06em] text-cyan-hud">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-hud" />[ mTOR / MPS: ACTIVADO • {fmt1(t.leucine)} g LEUCINA ]
      </span>
    );
  const need = LEUCINE_THRESHOLD - t.leucine;
  const eggs = Math.max(1, Math.ceil(need / LEU_PER_EGG));
  const whey = Math.max(5, Math.ceil(need / LEU_PER_G_WHEY / 5) * 5);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="tnum inline-flex items-center gap-2 rounded-md border border-fire/60 bg-fire/10 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.06em] text-fire">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fire" />[ SUB-UMBRAL mTOR • {fmt1(t.leucine)} g LEUCINA ]
      </span>
      <span className="text-xs text-steel">
        Sugerencia: +{eggs} huevo{eggs > 1 ? 's' : ''} o +{whey} g whey
      </span>
    </span>
  );
}

/** Alternativas del mismo grupo que aportan lo mismo del macro que importa (clic = reemplazar). */
function Equivalences({ mealId, item }: { mealId: string; item: FoodItem }) {
  const swapItem = usePlanStore((s) => s.swapItem);
  const ref = item.foodId ? FOOD_BY_ID[item.foodId] : undefined;
  if (!ref) return <span className="text-xs text-steel/70">Alimento cargado por IA · sin equivalencias</span>;
  const alts = FOODS.filter((f) => f.group === ref.group && f.id !== ref.id).slice(0, 2);
  if (!alts.length) return <span className="text-xs text-steel/70">Única opción de su grupo</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {alts.map((f) => {
        const g = equivalentGrams(ref.id, item.grams, f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => swapItem(mealId, item.id, f.id)}
            title="Reemplazar por esta opción"
            className="rounded-md border border-line2 bg-panel2 px-2 py-0.5 text-[11.5px] text-steel transition hover:border-cyan-hud/35 hover:text-ink"
          >
            o <b className="font-semibold text-ink/90">{g} g</b> {f.name.replace(/ \(.*\)$/, '')}
          </button>
        );
      })}
    </div>
  );
}

function ItemRow({ meal, item, technical }: { meal: Meal; item: FoodItem; technical: boolean }) {
  const setItemGrams = usePlanStore((s) => s.setItemGrams);
  const swapItem = usePlanStore((s) => s.swapItem);
  const removeItem = usePlanStore((s) => s.removeItem);
  const ref = item.foodId ? FOOD_BY_ID[item.foodId] : undefined;
  const hint = householdHint(item.foodId, item.grams);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-t border-line py-3 sm:grid-cols-[minmax(0,1.3fr)_150px_minmax(0,1.4fr)_auto] sm:items-center">
      <div className="min-w-0">
        {ref ? (
          <select
            value={ref.id}
            onChange={(e) => swapItem(meal.id, item.id, e.target.value)}
            className="w-full cursor-pointer truncate bg-transparent text-[15px] font-medium text-ink outline-none hover:text-white"
            title="Cambiar por otro alimento del mismo grupo (se recalcula la porción)"
          >
            {FOODS.filter((f) => f.group === ref.group).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[15px] font-medium text-ink">{item.food}</span>
        )}
        <div className="text-[11px] text-steel">{ref ? GROUP_LABEL[ref.group] : 'Alimento libre'}</div>
      </div>
      <button onClick={() => removeItem(meal.id, item.id)} title="Quitar" className="self-start p-1 text-steel hover:text-fire sm:order-last sm:self-center">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <div className="relative w-[84px]">
          <NumInput
            value={item.grams}
            min={0}
            max={3000}
            decimals={false}
            ariaLabel={`Gramos de ${item.food}`}
            onChange={(g) => setItemGrams(meal.id, item.id, g)}
            className="py-1.5 pl-2 pr-6 text-right"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-mute">g</span>
        </div>
        {hint && <span className="whitespace-nowrap text-[11px] text-steel">{hint}</span>}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <Equivalences mealId={meal.id} item={item} />
      </div>
      {technical && (
        <div className="col-span-2 font-mono text-[10.5px] text-steel sm:col-span-4">
          Prot {fmt1(item.p)} g · Carbs {fmt1(item.c)} g · Grasas {fmt1(item.f)} g · Leucina {fmt1(item.leucine)} g
        </div>
      )}
    </div>
  );
}

function MealCard({ meal, technical }: { meal: Meal; technical: boolean }) {
  const updateMeal = usePlanStore((s) => s.updateMeal);
  const removeMeal = usePlanStore((s) => s.removeMeal);
  const duplicateMeal = usePlanStore((s) => s.duplicateMeal);
  const addFood = usePlanStore((s) => s.addFood);
  const t = mealTotals(meal);
  const kcal = t.p * 4 + t.c * 4 + t.f * 9;
  const lowLeu = isMpsMeal(meal) && t.leucine < LEUCINE_THRESHOLD;

  return (
    <Panel tone={lowLeu ? 'fire' : meal.day === 'off' ? 'gold' : 'cyan'} className={cx(lowLeu && 'border-fire/35')}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={meal.time}
          onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
          className="rounded-md border border-cyan-hud/25 bg-cyan-hud/[0.05] px-2 py-1 font-mono text-xs text-cyan-hud outline-none [color-scheme:dark]"
        />
        <input
          value={meal.name}
          onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-lg font-bold tracking-tight text-ink outline-none"
        />
        {meal.day !== 'both' && (
          <button
            onClick={() => duplicateMeal(meal.id)}
            title={`Clonar esta comida en el día ${meal.day === 'on' ? 'OFF' : 'ON'}`}
            className="flex items-center gap-1.5 rounded-md border border-cyan-hud/25 px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.1em] text-cyan-hud transition hover:border-cyan-hud/60 hover:bg-cyan-hud/10"
          >
            <CopyPlus className="h-3.5 w-3.5" /> [ + DUPLICAR AL OTRO DÍA ]
          </button>
        )}
        <button onClick={() => removeMeal(meal.id)} title="Eliminar comida" className="rounded-md p-1.5 text-steel hover:bg-fire/10 hover:text-fire">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={meal.day} onChange={(e) => updateMeal(meal.id, { day: e.target.value as MealDay })} className={smallSelect}>
          {(Object.keys(DAY_LABEL) as MealDay[]).map((d) => (
            <option key={d} value={d}>
              {DAY_LABEL[d]}
            </option>
          ))}
        </select>
        <select value={meal.role} onChange={(e) => updateMeal(meal.id, { role: e.target.value as MealRole })} className={smallSelect}>
          {(Object.keys(ROLE_LABEL) as MealRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-steel">
          <b className="font-semibold text-ink">{fmt0(kcal)}</b> kcal · <b className="font-semibold text-ink">{fmt0(t.p)} g</b> proteína
        </span>
      </div>

      <div className="mt-3 hidden grid-cols-[minmax(0,1.3fr)_150px_minmax(0,1.4fr)_auto] gap-x-3 pb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel sm:grid">
        <span>Alimento</span>
        <span>Porción sugerida</span>
        <span>Equivale a</span>
        <span className="w-6" />
      </div>
      {meal.items.map((it) => (
        <ItemRow key={it.id} meal={meal} item={it} technical={technical} />
      ))}

      <div className="mt-2 border-t border-line pt-3">
        <ProteinSensor meal={meal} />
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
  const rows: [string, number, number][] = [
    ['Kcal', got.kcal, target.kcal],
    ['Proteína', got.p, target.p],
    ['Carbos', got.c, target.c],
    ['Grasas', got.f, target.f],
  ];
  return (
    <div className="rounded-lg border border-line bg-carbon p-3">
      <div className="mb-2.5 font-mono text-[10px] font-bold tracking-[0.16em] text-mute">{day === 'on' ? 'DÍA ON' : 'DÍA OFF'} · COMIDAS vs OBJETIVO</div>
      <div className="space-y-2">
        {rows.map(([l, g, tg]) => {
          const diff = tg ? (g / tg - 1) * 100 : 0;
          const abs = Math.abs(diff);
          // Tolerancia táctica: ±10 % se considera calibrado; sólo desvíos mayores se marcan en naranja.
          const off = abs > 10;
          return (
            <div key={l} className="grid grid-cols-[56px_1fr_84px_112px] items-center gap-2 text-[11.5px]">
              <span className="text-steel">{l}</span>
              <div className="h-1.5 overflow-hidden rounded bg-white/[0.06]">
                <div className={cx('h-full rounded transition-all', off ? 'bg-fire' : 'bg-cyan-hud')} style={{ width: `${Math.min(100, (g / (tg || 1)) * 100)}%` }} />
              </div>
              <span className="tnum text-right font-mono text-ink">
                {fmt0(g)}/{fmt0(tg)}
              </span>
              <span className={cx('tnum whitespace-nowrap text-right font-mono text-[9px] tracking-[0.04em]', off ? 'text-fire' : 'text-cyan-hud')}>
                {off ? `DESVÍO ${diff > 0 ? '+' : ''}${fmt0(diff)}%` : abs <= 5 ? 'CALIBRADO (±5%)' : 'TOLERANCIA (±10%)'}
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
  const [technical, setTechnical] = useState(false);

  const meals = [...plan.meals]
    .filter((m) => filter === 'all' || m.day === filter)
    .sort((a, b) => (a.day === b.day ? a.time.localeCompare(b.time) : DAY_ORDER[a.day] - DAY_ORDER[b.day]));
  const shared = plan.meals.filter((m) => m.day === 'both').length;
  const lowCount = plan.meals.filter((m) => isMpsMeal(m) && mealTotals(m).leucine < LEUCINE_THRESHOLD).length;

  return (
    <div className="space-y-4">
      <Panel title="03 · COMIDAS DEL PLAN" right={<Utensils className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <DayCompare day="on" />
          <DayCompare day="off" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="w-72">
            <Segmented
              value={filter}
              onChange={setFilter}
              size="sm"
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'on', label: 'Día ON' },
                { value: 'off', label: 'Día OFF' },
              ]}
            />
          </div>
          <div className="w-64">
            <Toggle checked={technical} onChange={setTechnical} tone="cyan" label={<span className="text-xs text-steel">Ver detalle técnico (macros y leucina)</span>} />
          </div>
          <span className={cx('text-xs', lowCount ? 'text-[#FDBA74]' : 'text-steel')}>
            {lowCount ? `${lowCount} comida(s) con poca proteína` : '✓ Todas las comidas principales tienen proteína suficiente'}
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <Cite c={CITES.leucine} />
          <Cite c={CITES.aragon} />
        </div>
      </Panel>

      <FoodScanner />

      {filter !== 'all' && shared > 0 && (
        <div className="rounded-lg border border-line bg-panel px-4 py-2.5 font-mono text-[10.5px] tracking-[0.04em] text-mute">
          Filtro estricto DÍA {filter.toUpperCase()}: {shared} comida{shared > 1 ? 's' : ''} compartida{shared > 1 ? 's' : ''} (ON + OFF) se ve{shared > 1 ? 'n' : ''} en «Todas» y
          sigue{shared > 1 ? 'n' : ''} sumando en las barras de arriba.
        </div>
      )}
      {meals.length === 0 && (
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-mute">Sin comidas exclusivas del día {filter === 'all' ? '' : filter.toUpperCase()}.</div>
      )}
      {meals.map((m) => (
        <MealCard key={m.id} meal={m} technical={technical} />
      ))}

      <div className="grid grid-cols-2 gap-2">
        <HudButton tone="cyan" variant="ghost" onClick={() => addMeal('on')}>
          <Plus className="h-4 w-4" /> Comida día ON
        </HudButton>
        <HudButton tone="gold" variant="ghost" onClick={() => addMeal('off')}>
          <Plus className="h-4 w-4" /> Comida día OFF
        </HudButton>
      </div>

      <Panel title="SUPLEMENTOS · AIS GRUPO A" tone="gold" right={<Pill className="h-4 w-4 text-gold/80" />}>
        <div className="divide-y divide-line">
          {plan.supplements.map((s) => (
            <div key={s.id} className="py-3">
              <Toggle tone="cyan" checked={s.enabled} onChange={() => toggleSupplement(s.id)} label={<b className="text-[15px] font-semibold text-ink">{s.name}</b>} />
              <div className={cx('mt-3 grid gap-3 sm:pl-14', !s.enabled && 'opacity-40')}>
                <label className="block">
                  <Label>Cuánto</Label>
                  <input
                    value={s.dose}
                    onChange={(e) => updateSupplement(s.id, { dose: e.target.value })}
                    className="w-full rounded-md border border-line bg-carbon px-2.5 py-2 text-sm text-ink outline-none focus:border-cyan-hud/60"
                  />
                </label>
                <label className="block">
                  <Label>Cuándo</Label>
                  <input
                    value={s.timing}
                    onChange={(e) => updateSupplement(s.id, { timing: e.target.value })}
                    className="w-full rounded-md border border-line bg-carbon px-2.5 py-2 text-sm text-ink outline-none focus:border-cyan-hud/60"
                  />
                </label>
                {s.doi && (
                  <a href={doiUrl(s.doi)} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[9.5px] tracking-[0.06em] text-mute hover:text-cyan-hud">
                    [ {s.evidence} ] <ExternalLink className="h-3 w-3" />
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
