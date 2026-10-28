'use client';

import { useState } from 'react';
import { ChevronDown, CopyPlus, ExternalLink, Pill, Plus, RefreshCw, Trash2, Utensils, X, Zap } from 'lucide-react';
import { computeTelemetry, dayTotals, fmt0, fmt1, isMpsMeal, LEUCINE_THRESHOLD, mealTotals } from '@/lib/bioenergetics';
import { CITES, doiUrl } from '@/lib/evidence';
import { alternativesFor, equivalentGrams, macrosFor, FOOD_BY_ID, FOODS, freeEquivalents, freeGroup, GROUP_LABEL, householdHint, type SwapGroup } from '@/lib/foods';
import { MAX_OPTIONS, type DayMode, type FoodItem, type Meal, type MealDay, type MealOption, type MealRole } from '@/lib/types';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { ALT_TARGET, autoSteps, autoTechnique, autoTitle, compensateSwap, optionTotals } from '@/lib/menuOptions';
import { usePlanStore } from '@/store/usePlanStore';
import { Cite, cx, HudButton, Label, NumInput, Panel, Segmented, Toggle } from '../hud/primitives';
import { BalanceBanner } from './BalanceBanner';
import { NewDishButton } from './FoodBrandDatabase';
import { dayAnchors, timeToMinutes } from '@/lib/schedule';
import { CustomFoodsBar } from './CustomFoods';
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
  const custom = usePlanStore((s) => s.customFoods);
  // Re-render al editar la Food & Brand DB; sus marcas locales ya viven en FOODS como custom.
  useFoodDbStore((s) => s.items);
  const customIds = new Set(custom.map((f) => f.id));
  const brands = FOODS.filter((f) => f.custom && !customIds.has(f.id));
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="w-full cursor-pointer rounded-lg border border-dashed border-line2 bg-transparent px-3 py-2 text-xs text-steel outline-none hover:border-steel/60 hover:text-ink"
    >
      <option value="">+ Agregar alimento…</option>
      {custom.length > 0 && (
        <optgroup label="★ Mis alimentos / marcas">
          {custom.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </optgroup>
      )}
      {brands.length > 0 && (
        <optgroup label="★ Food & Brand DB · marcas locales y platos">
          {brands.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </optgroup>
      )}
      {GROUPS.map((g) => (
        <optgroup key={g} label={GROUP_LABEL[g]}>
          {FOODS.filter((f) => f.group === g && !f.custom).map((f) => (
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
  // Umbral mTOR sólo en comidas principales: colaciones / meriendas son ingestas auxiliares (sin sugerir huevo o whey).
  if (!isMpsMeal(meal))
    return (
      <span className="inline-flex items-center rounded-md border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-[10.5px] tracking-[0.06em] text-mute">
        {meal.role === 'post'
          ? '[ RECUPERACIÓN POST-WOD · INGESTA AUXILIAR ]'
          : meal.role === 'snack'
          ? '[ INGESTA AUXILIAR / MODULACIÓN GLUCÉMICA ]'
          : meal.day === 'off'
            ? '[ MODULACIÓN GLUCÉMICA / SACIEDAD ]'
            : '[ BLOQUE GLUCOLÍTICO · LEUCINA NO PRIORITARIA ]'}
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

const microBtn =
  'grid h-7 w-7 flex-none place-items-center rounded-md border border-line2 bg-panel2 font-mono text-sm font-bold text-steel transition hover:border-cyan-hud/50 hover:text-cyan-hud active:scale-95';

/** Paso de los micro-ajustadores: la unidad casera chica (huevo, rebanada, scoop) o 5 / 10 g. */
function gramStep(item: FoodItem) {
  const ref = item.foodId ? FOOD_BY_ID[item.foodId] : undefined;
  if (ref?.unit && ref.unit.grams <= 60) return ref.unit.grams;
  if (ref?.group === 'fat' || item.grams < 60) return 5;
  return 10;
}

const chipCls = 'rounded-md border border-line2 bg-panel2 px-2 py-0.5 text-[11.5px] text-steel transition hover:border-cyan-hud/35 hover:text-ink';
const shortName = (n: string) => n.replace(/ \(.*\)$/, '');

/**
 * Alternativas que aportan lo mismo del macro que importa (clic = reemplazar).
 * Alimentos de la base: equivalencias preferidas + mismo grupo por densidad calórica.
 * Alimentos libres de la IA: se asocian por macro principal a los grupos de la base.
 */
function Equivalences({ mealId, item }: { mealId: string; item: FoodItem }) {
  const swapItem = usePlanStore((s) => s.swapItem);
  const ref = item.foodId ? FOOD_BY_ID[item.foodId] : undefined;
  const alts = ref
    ? alternativesFor(ref).map((f) => ({ food: f, grams: equivalentGrams(ref.id, item.grams, f.id) }))
    : freeEquivalents(item);
  if (!alts.length) return <span className="text-xs text-steel/70">{ref ? 'Única opción de su grupo' : 'Sin macros para equivaler'}</span>;
  // Vista previa de la compensación (Swap Matrix): qué ajusta el resto de la comida para no descuadrarse.
  const meal = usePlanStore.getState().plan.meals.find((m) => m.id === mealId);
  const preview = (toId: string, grams: number) => {
    if (!meal) return [];
    const ref2 = FOOD_BY_ID[toId];
    const swapped = { ...item, foodId: toId, food: ref2.name, grams, ...macrosFor(toId, grams)! };
    return compensateSwap(meal.items.map((i) => (i.id === item.id ? swapped : i)), item.id, item).adjust;
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {alts.map(({ food, grams }) => {
        const adj = preview(food.id, grams);
        const note = adj.map((a) => `${shortName(a.name)} ${a.from}→${a.to} g`).join(' · ');
        return (
          <button
            key={food.id}
            type="button"
            onClick={() => swapItem(mealId, item.id, food.id)}
            title={note ? `Reemplazar · compensa: ${note}` : 'Reemplazar por esta opción (mismos macros)'}
            className={chipCls}
          >
            o <b className="font-semibold text-ink/90">{grams} g</b> {shortName(food.name)}
            {adj.length > 0 && <span className="ml-1 font-mono text-[9px] text-cyan-hud">↺ {note}</span>}
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-t border-line py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(150px,auto)_minmax(0,1.3fr)_auto] sm:items-center">
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
        <div className="text-[11px] text-steel">
          {ref ? `${GROUP_LABEL[ref.group]}${ref.custom ? ' · mi marca' : ''}` : (() => {
            const g = freeGroup(item);
            return g ? `Cargado por IA · equivale como ${GROUP_LABEL[g].split(' / ')[0].toLowerCase()}` : 'Alimento libre';
          })()}
        </div>
      </div>
      <button onClick={() => removeItem(meal.id, item.id)} title="Quitar" className="self-start p-1 text-steel hover:text-fire sm:order-last sm:self-center">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setItemGrams(meal.id, item.id, Math.max(0, item.grams - gramStep(item)))}
          aria-label={`Restar ${gramStep(item)} g de ${item.food}`}
          title={`−${gramStep(item)} g`}
          className={microBtn}
        >
          −
        </button>
        <div className="relative w-[76px]">
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
        <button
          type="button"
          onClick={() => setItemGrams(meal.id, item.id, Math.min(3000, item.grams + gramStep(item)))}
          aria-label={`Sumar ${gramStep(item)} g de ${item.food}`}
          title={`+${gramStep(item)} g`}
          className={microBtn}
        >
          +
        </button>
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

      <OptionHeader meal={meal} />
      <div className="mt-3 hidden grid-cols-[minmax(0,1.2fr)_minmax(150px,auto)_minmax(0,1.3fr)_auto] gap-x-3 pb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel sm:grid">
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
      <TechniqueBox meal={meal} />
      <AltOptions meal={meal} />
    </Panel>
  );
}

const optTag = 'rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em]';
const pctTxt = (a: number, b: number) => (b > 0 ? `${a >= b ? '+' : ''}${fmt0((a / b - 1) * 100)} %` : '—');

/** Opción 1 · sugerida: nombre del plato real (editable; vacío = automático desde los ingredientes). */
function OptionHeader({ meal }: { meal: Meal }) {
  const setMealOption = usePlanStore((s) => s.setMealOption);
  const auto = autoTitle(meal.items);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-hud/20 bg-cyan-hud/[0.04] px-3 py-2">
      <span className={cx(optTag, 'border-cyan-hud/40 text-cyan-hud')}>[ OPCIÓN 1 · SUGERIDA ]</span>
      <input
        value={meal.title ?? ''}
        onChange={(e) => setMealOption(meal.id, { title: e.target.value || undefined })}
        placeholder={auto}
        aria-label="Nombre del plato · Opción 1"
        className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:text-ink/70"
      />
      {!meal.title && <span className="font-mono text-[9px] text-mute">AUTO</span>}
    </div>
  );
}

/** Lista de pasos editable: una línea = un paso (vacío = preparación automática desde los ingredientes). */
function StepsEditor({ steps, auto, onChange }: { steps?: string[]; auto: string[]; onChange: (v: string[] | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = steps?.length ? steps : auto;
  return (
    <div>
      <ol className="space-y-1">
        {shown.map((st, k) => (
          <li key={k} className="flex gap-2 text-[12.5px] leading-snug text-ink">
            <span className="tnum mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-cyan-hud/40 font-mono text-[9.5px] text-cyan-hud">{k + 1}</span>
            <span>{st}</span>
          </li>
        ))}
      </ol>
      {draft === null ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setDraft(shown.join('\n'))} className="rounded-md border border-line px-2 py-1 font-mono text-[9.5px] text-steel hover:text-ink">
            EDITAR PASOS
          </button>
          {steps?.length ? (
            <button type="button" onClick={() => onChange(undefined)} className="rounded-md border border-line px-2 py-1 font-mono text-[9.5px] text-steel hover:text-ink">
              VOLVER A AUTOMÁTICO
            </button>
          ) : (
            <span className="font-mono text-[9px] text-mute">AUTO · SE ARMA CON LOS INGREDIENTES Y GRAMOS</span>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <textarea
            rows={Math.max(3, shown.length + 1)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Pasos de preparación (uno por línea)"
            className="w-full resize-y rounded-md border border-line bg-panel2 p-2 text-[12.5px] text-ink outline-none focus:border-cyan-hud/50"
          />
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const list = draft.split('\n').map((x) => x.trim()).filter(Boolean);
                onChange(list.length ? list : undefined);
                setDraft(null);
              }}
              className="rounded-md border border-cyan-hud/40 px-2 py-1 font-mono text-[9.5px] font-bold text-cyan-hud"
            >
              GUARDAR PASOS
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-md border border-line px-2 py-1 font-mono text-[9.5px] text-steel">
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Desglose táctico de la Opción 1: preparación paso a paso + tip de técnica y condimentos. */
function TechniqueBox({ meal }: { meal: Meal }) {
  const setMealOption = usePlanStore((s) => s.setMealOption);
  const [open, setOpen] = useState(false);
  const auto = autoTechnique(meal.items);
  const autoS = autoSteps(meal.items);
  return (
    <div className="mt-3 rounded-lg border border-line bg-carbon">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-steel">[ DESGLOSE TÁCTICO · PREPARACIÓN PASO A PASO ]</span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-mute">{(meal.steps?.length ? meal.steps : autoS).length} pasos · {meal.technique || auto}</span>
        <ChevronDown className={cx('h-4 w-4 flex-none text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-3">
          <StepsEditor steps={meal.steps} auto={autoS} onChange={(v) => setMealOption(meal.id, { steps: v })} />
          <label className="block">
            <span className="font-mono text-[9.5px] tracking-[0.12em] text-mute">TIP DE TÉCNICA Y CONDIMENTOS</span>
            <textarea
              rows={2}
              value={meal.technique ?? ''}
              placeholder={auto}
              onChange={(e) => setMealOption(meal.id, { technique: e.target.value || undefined })}
              className="mt-1 w-full resize-y rounded-md border border-line bg-panel2 p-2 text-[12.5px] text-ink outline-none placeholder:text-steel/70 focus:border-cyan-hud/50"
            />
          </label>
        </div>
      )}
    </div>
  );
}

/** Opciones 2 a 5 · alternativas equivalentes en macros (platos del catálogo y combinaciones caseras). */
function AltOptions({ meal }: { meal: Meal }) {
  const generateAlt = usePlanStore((s) => s.generateAlt);
  const [none, setNone] = useState(false);
  const alts = meal.alts ?? [];
  const canAdd = alts.length < ALT_TARGET && optionTotals(meal.items).kcal >= 80;
  return (
    <div className="mt-3 space-y-2">
      {alts.map((a, k) => (
        <AltCard key={`${k}-${a.title}`} meal={meal} alt={a} slot={k} />
      ))}
      {canAdd && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNone(!generateAlt(meal.id, alts.length, 0))}
            className="flex items-center gap-1.5 rounded-md border border-fire/40 bg-fire/10 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] text-fire transition hover:border-fire hover:bg-fire/20"
          >
            <Zap className="h-3.5 w-3.5" /> [ ⚡ GENERAR OPCIÓN {alts.length + 2} EQUIVALENTE ]
          </button>
          <span className="font-mono text-[9.5px] text-mute">
            {alts.length + 1}/{MAX_OPTIONS} OPCIONES
          </span>
          {none && <span className="font-mono text-[10px] text-mute">No hay más platos distintos del catálogo / canasta para este momento del día.</span>}
        </div>
      )}
    </div>
  );
}

function AltCard({ meal, alt, slot }: { meal: Meal; alt: MealOption; slot: number }) {
  const generateAlt = usePlanStore((s) => s.generateAlt);
  const setAlt = usePlanStore((s) => s.setAlt);
  const setAltItemGrams = usePlanStore((s) => s.setAltItemGrams);
  const removeAltItem = usePlanStore((s) => s.removeAltItem);
  const [cycle, setCycle] = useState(0);
  const [open, setOpen] = useState(false);
  const main = optionTotals(meal.items);
  const t = optionTotals(alt.items);
  const n = slot + 2;
  return (
    <div className="rounded-lg border border-fire/30 bg-fire/[0.04] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx(optTag, 'border-fire/50 text-fire')}>[ OPCIÓN {n} · ALTERNATIVA ]</span>
        <input
          value={alt.title}
          onChange={(e) => setAlt(meal.id, slot, { title: e.target.value })}
          aria-label={`Nombre del plato · Opción ${n}`}
          className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none"
        />
        <button
          type="button"
          title="Probar otro plato del catálogo para esta opción"
          onClick={() => {
            const c = cycle + 1;
            setCycle(c);
            generateAlt(meal.id, slot, c);
          }}
          className="flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[9.5px] text-steel hover:text-ink"
        >
          <RefreshCw className="h-3 w-3" /> OTRA
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md border border-line px-2 py-1 font-mono text-[9.5px] text-steel hover:text-ink" aria-expanded={open}>
          {open ? 'OCULTAR' : 'VER DESGLOSE'}
        </button>
        <button type="button" onClick={() => setAlt(meal.id, slot, null)} title={`Quitar Opción ${n}`} className="p-1 text-mute hover:text-fire">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="tnum mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px]">
        <span className="text-ink">{fmt0(t.kcal)} kcal ({pctTxt(t.kcal, main.kcal)})</span>
        <span className="text-steel">P {fmt0(t.p)} g ({pctTxt(t.p, main.p)})</span>
        <span className="text-steel">C {fmt0(t.c)} g ({pctTxt(t.c, main.c)})</span>
        <span className="text-steel">G {fmt0(t.f)} g ({pctTxt(t.f, main.f)})</span>
        <span className="text-mute">vs Opción 1</span>
      </div>
      {open && (
        <>
          <div className="mt-2 divide-y divide-line">
            {alt.items.map((it: FoodItem) => (
              <div key={it.id} className="flex items-center gap-2 py-1.5">
                <div className="relative w-[76px]">
                  <NumInput value={it.grams} min={0} max={3000} decimals={false} ariaLabel={`Gramos de ${it.food}`} onChange={(g) => setAltItemGrams(meal.id, slot, it.id, g)} className="py-1 pl-2 pr-6 text-right" />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-mute">g</span>
                </div>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{it.food}</span>
                <span className="tnum hidden font-mono text-[10px] text-mute sm:inline">
                  P{fmt0(it.p)} C{fmt0(it.c)} G{fmt0(it.f)}
                </span>
                <button type="button" onClick={() => removeAltItem(meal.id, slot, it.id)} className="p-1 text-mute hover:text-fire" aria-label={`Quitar ${it.food}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-md border border-line bg-carbon p-2.5">
            <div className="mb-1.5 font-mono text-[9.5px] font-bold tracking-[0.12em] text-steel">[ PREPARACIÓN PASO A PASO ]</div>
            <StepsEditor steps={alt.steps} auto={autoSteps(alt.items)} onChange={(v) => setAlt(meal.id, slot, { steps: v })} />
          </div>
          {alt.technique && <p className="mt-1.5 text-[11.5px] text-steel">Tip: {alt.technique}</p>}
        </>
      )}
    </div>
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
  // Re-render al crear / borrar marcas propias (la base viva FOODS se actualiza en el store).
  usePlanStore((s) => s.customFoods);
  const addMeal = usePlanStore((s) => s.addMeal);
  const toggleSupplement = usePlanStore((s) => s.toggleSupplement);
  const updateSupplement = usePlanStore((s) => s.updateSupplement);
  const [filter, setFilter] = useState<'all' | DayMode>('all');
  const [technical, setTechnical] = useState(false);

  const meals = [...plan.meals]
    .filter((m) => filter === 'all' || m.day === filter)
    .sort((a, b) => (a.day === b.day ? timeToMinutes(a.time) - timeToMinutes(b.time) : DAY_ORDER[a.day] - DAY_ORDER[b.day]));
  const shared = plan.meals.filter((m) => m.day === 'both').length;
  const lowCount = plan.meals.filter((m) => isMpsMeal(m) && mealTotals(m).leucine < LEUCINE_THRESHOLD).length;

  return (
    <div className="space-y-4">
      <Panel title="03 · COMIDAS DEL PLAN" right={<Utensils className="h-4 w-4 text-cyan-hud/80" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <DayCompare day="on" />
          <DayCompare day="off" />
        </div>
        <BalanceBanner />
        <RetimeBar />
        <AltsBar />
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
        <CustomFoodsBar />
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

const hhmm = (min: number) => `${String(Math.floor((((min % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((min % 60) + 60) % 60).padStart(2, '0')}`;

/** Agenda deportiva derivada de la franja de entreno: muestra la secuencia y la aplica con un toque. */
function RetimeBar() {
  const pr = usePlanStore((s) => s.plan.profile);
  const retime = usePlanStore((s) => s.retimeMeals);
  const a = dayAnchors(pr);
  const seq: [string, number][] = [
    ['Desayuno', a.breakfast],
    ['Almuerzo', a.lunch],
    ['Pre-WOD', a.peri],
    ['Post-WOD', a.post],
    ['Cena', a.dinner],
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-carbon px-3 py-2">
      <span className="font-mono text-[10px] tracking-[0.12em] text-mute">
        ENTRENO {hhmm(a.start)}–{hhmm(a.end)} ·
      </span>
      <span className="tnum min-w-0 flex-1 font-mono text-[10.5px] text-steel">
        {seq
          .sort((x, y) => timeToMinutes(hhmm(x[1])) - timeToMinutes(hhmm(y[1])))
          .map(([n, t]) => `${n} ${hhmm(t)}`)
          .join(' → ')}
      </span>
      <button
        type="button"
        onClick={retime}
        className="rounded-md border border-cyan-hud/40 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-cyan-hud transition hover:border-cyan-hud hover:bg-cyan-hud/10"
      >
        [ ⏱ AJUSTAR HORARIOS AL ENTRENO ]
      </button>
    </div>
  );
}

/** Opciones culinarias: hasta 5 opciones equivalentes por comida para todo el plan en un toque. */
function AltsBar() {
  const meals = usePlanStore((s) => s.plan.meals);
  const generateAllAlts = usePlanStore((s) => s.generateAllAlts);
  const main = meals.filter((m) => optionTotals(m.items).kcal >= 80);
  const full = main.filter((m) => (m.alts?.length ?? 0) >= 2).length;
  const total = main.reduce((a, m) => a + 1 + (m.alts?.length ?? 0), 0);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-carbon px-3 py-2">
      <span className="font-mono text-[10px] tracking-[0.12em] text-mute">OPCIONES CULINARIAS ·</span>
      <span className="tnum flex-1 font-mono text-[10.5px] text-steel">
        {full}/{main.length} comidas con 3 a 5 opciones · {total} opciones en total
      </span>
      <button
        type="button"
        onClick={() => generateAllAlts(false)}
        title="Completa hasta 5 opciones equivalentes por comida, sin repetir la base de la anterior"

        className="rounded-md border border-fire/40 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-fire transition hover:border-fire hover:bg-fire/10"
      >
        [ ⚡ COMPLETAR 5 OPCIONES EN TODO EL PLAN ]
      </button>
      <NewDishButton />
    </div>
  );
}
