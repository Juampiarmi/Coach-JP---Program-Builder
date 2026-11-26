'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChefHat, Database, Download, Pencil, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { fmt0 } from '@/lib/bioenergetics';
import { BRAND_CATEGORIES as BRAND_CATEGORY_KEYS, BRAND_CATEGORY_LABEL, categoryLabel, DISH_CATEGORIES, dishYield, emptyDishBase, FOOD_CATEGORIES, NEW_DISH_CATEGORIES, portionLabel, type BrandCategory, type BrandFood } from '@/lib/foodBrandDb';
import { FOOD_BY_ID, FOODS, macrosFor } from '@/lib/foods';
import { ALLERGEN_INFO, isDietTag, itemAllergens, type Allergen } from '@/lib/allergens';
import { auditDish } from '@/lib/dishAudit';
import { quickDish, quickToBrandFood, type QuickDish } from '@/lib/dishQuick';
import { yieldLabel, yieldTag } from '@/lib/yieldInfo';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, HudButton, inputCls, Label, NumInput, Panel, Toggle } from '../hud/primitives';

const empty = (): BrandFood => ({
  id: `db-${Date.now().toString(36)}`,
  nombre: '',
  marca: '',
  categoria: 'dairy',
  porcion_base: { cantidad: 1, unidad: 'porción', gramos: 100 },
  macros_por_porcion: { kcal: 0, p: 0, c: 0, f: 0, leucina: 0 },
  es_marca_local: true,
  disponible_para_ia: true,
});

function Num({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block min-w-0">
      <Label>{label}</Label>
      <div className="relative">
        <NumInput value={value} min={0} max={5000} onChange={onChange} ariaLabel={label} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mute">{unit}</span>
      </div>
    </label>
  );
}

/** Modal de alta / edición con la tabla nutricional por porción base. */
/** Plato / preparación nuevo del coach (receta con ingredientes). */
export const emptyDish = (): BrandFood => emptyDishBase();

type Ingr = NonNullable<BrandFood['ingredientes']>[number];

/** Totales de una receta a partir de sus ingredientes (base del Builder / Food & Brand DB). */
function recipeTotals(list: Ingr[]) {
  return list.reduce(
    (a, x) => {
      const m = x.foodId && FOOD_BY_ID[x.foodId] ? macrosFor(x.foodId, x.gramos)! : { p: 0, c: 0, f: 0, leucine: 0 };
      return { g: a.g + x.gramos, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f, l: a.l + m.leucine };
    },
    { g: 0, p: 0, c: 0, f: 0, l: 0 },
  );
}

/** Editor de receta: ingredientes con gramos → macros por porción calculados solos. */
function RecipeEditor({ list, onChange }: { list: Ingr[]; onChange: (l: Ingr[]) => void }) {
  const options = FOODS.filter((f) => f.group !== 'plato').sort((a, b) => a.name.localeCompare(b.name));
  const t = recipeTotals(list);
  return (
    <div className="mt-3 rounded-lg border border-cyan-hud/25 bg-cyan-hud/[0.04] p-3">
      <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-cyan-hud">[ RECETA · INGREDIENTES POR PORCIÓN ]</div>
      <div className="mt-2 space-y-1.5">
        {list.map((x, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={x.foodId ?? ''}
              aria-label={`Ingrediente ${i + 1}`}
              onChange={(e) => {
                const ref = FOOD_BY_ID[e.target.value];
                onChange(list.map((y, j) => (j === i ? { ...y, foodId: e.target.value, nombre: ref?.name ?? y.nombre } : y)));
              }}
              className={cx(inputCls, 'min-w-0 flex-1 py-1.5 text-xs')}
            >
              <option value="">— elegí un ingrediente —</option>
              {options.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="relative w-24">
              <NumInput value={x.gramos} min={0} max={3000} decimals={false} ariaLabel={`Gramos del ingrediente ${i + 1}`} onChange={(gramos) => onChange(list.map((y, j) => (j === i ? { ...y, gramos } : y)))} className="py-1.5 pr-7 text-right" />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mute">g</span>
            </div>
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="p-1 text-mute hover:text-fire" aria-label={`Quitar ingrediente ${i + 1}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...list, { nombre: '', gramos: 100 }])}
        className="mt-2 flex items-center gap-1 rounded-md border border-line px-2.5 py-1 font-mono text-[10px] text-steel hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" /> Ingrediente
      </button>
      <p className="tnum mt-2 font-mono text-[10.5px] text-steel">
        Porción: {fmt0(t.g)} g · {fmt0(t.p * 4 + t.c * 4 + t.f * 9)} kcal · P {fmt0(t.p)} · C {fmt0(t.c)} · G {fmt0(t.f)} · Leu {t.l.toFixed(1)}
      </p>
    </div>
  );
}

/** Categorías: las de platos (o de alimentos) + las propias del coach + «+ Nueva categoría» escrita a mano. */
function CategoryPicker({ d, setD, dish }: { d: BrandFood; setD: (b: BrandFood) => void; dish: boolean }) {
  const customCats = useFoodDbStore((s) => s.customCats);
  const addCategory = useFoodDbStore((s) => s.addCategory);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const chip = (on: boolean) => cx('rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] transition', on ? 'border-fire bg-fire/15 text-fire' : 'border-line text-steel hover:text-ink');
  const save = () => {
    const label = addCategory(name);
    if (label) setD({ ...d, categoria: 'custom', catLabel: label });
    setName('');
    setAdding(false);
  };
  return (
    <div className="mt-3" data-category-picker>
      <Label>Categoría</Label>
      <div className="flex flex-wrap gap-1.5">
        {(dish ? NEW_DISH_CATEGORIES : FOOD_CATEGORIES).map((c) => (
          <button key={c} type="button" data-cat={c} onClick={() => setD({ ...d, categoria: c, catLabel: undefined })} className={chip(d.categoria === c)}>
            {BRAND_CATEGORY_LABEL[c]}
          </button>
        ))}
        {dish &&
          customCats.map((c) => (
            <button key={c} type="button" data-cat-custom={c} onClick={() => setD({ ...d, categoria: 'custom', catLabel: c })} className={chip(d.categoria === 'custom' && d.catLabel === c)}>
              ★ {c}
            </button>
          ))}
        {dish && d.categoria === 'custom' && d.catLabel && !customCats.includes(d.catLabel) && <span className={chip(true)}>★ {d.catLabel}</span>}
        {dish &&
          (adding ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    save();
                  }
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setAdding(false);
                  }
                }}
                placeholder="Ej. Tortillas de verduras"
                className={cx(inputCls, 'w-48 py-1 text-xs')}
                data-new-cat-input
              />
              <button type="button" onClick={save} disabled={name.trim().length < 2} className="rounded-md border border-cyan-hud/50 px-2 py-1 font-mono text-[10px] text-cyan-hud disabled:opacity-40" data-new-cat-save>
                Guardar
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-cyan-hud/50 px-2.5 py-1.5 font-mono text-[10.5px] text-cyan-hud hover:bg-cyan-hud/10" data-new-cat>
              + Nueva categoría
            </button>
          ))}
      </div>
    </div>
  );
}

/**
 * CARGA RÁPIDA CON IA: nombre + ingredientes aproximados + tip → receta mapeada a la base, macros, pasos, alérgenos y
 * categoría sugerida. Con API key usa la IA para ordenar y redactar; sin key, el motor local. Los números salen siempre
 * de la base de alimentos.
 */
function QuickLoad({ base, onUse }: { base: BrandFood; onUse: (b: BrandFood) => void }) {
  const ai = usePlanStore((s) => s.ai);
  const [name, setName] = useState(base.nombre);
  const [ingr, setIngr] = useState('');
  const [tip, setTip] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<(QuickDish & { aiError?: string }) | null>(null);
  const hasKey = !!ai.apiKey?.trim();
  const run = async () => {
    setBusy(true);
    setRes(await quickDish({ name, ingredients: ingr, tip }, hasKey ? ai : undefined));
    setBusy(false);
  };
  return (
    <div className="mb-3 rounded-xl border border-fire/30 bg-fire/[0.04] p-3" data-quick-load>
      <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-fire">[ ⚡ CARGA RÁPIDA CON IA ]</div>
      <p className="mt-1 text-[12px] text-steel">Escribilo como te sale: el sistema arma la receta con gramos, medidas caseras, macros, pasos, alérgenos y categoría.</p>
      <div className="mt-2 grid gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del plato · ej. Tortilla de berenjena y zucchini" className={inputCls} data-ql-name />
        <textarea rows={2} value={ingr} onChange={(e) => setIngr(e.target.value)} placeholder="Ingredientes aproximados · ej. 3 huevos, 1 zucchini, media berenjena, 1 cda aceite de oliva, condimentos" className={inputCls} data-ql-ingredients />
        <input value={tip} onChange={(e) => setTip(e.target.value)} placeholder="Tip o nota (opcional) · ej. vuelta y vuelta en sartén antiadherente tapada" className={inputCls} data-ql-tip />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <HudButton onClick={run} disabled={busy || name.trim().length < 2 || ingr.trim().length < 3}>
          <ChefHat className="h-4 w-4" /> {busy ? 'Calculando…' : 'Ordenar y calcular con IA'}
        </HudButton>
        <span className="text-[11px] text-mute">{hasKey ? `IA: ${ai.provider} · ${ai.model}` : 'Sin API key de IA: lo resuelve el motor propio con la base de alimentos'}</span>
      </div>
      {res && (
        <div className="mt-3 rounded-lg border border-line bg-panel p-3" data-ql-result>
          {res.aiError && <p className="mb-2 text-[11.5px] text-gold">La IA no respondió ({res.aiError}): lo resolvimos con el motor propio.</p>}
          <div className="flex flex-wrap items-baseline gap-2">
            <b className="text-[14px] text-ink">{res.name}</b>
            <span className="rounded border border-cyan-hud/40 px-1.5 font-mono text-[10px] text-cyan-hud">{BRAND_CATEGORY_LABEL[res.category]}</span>
            <span className="font-mono text-[10px] text-mute">{res.source === 'ia' ? 'ordenado con IA' : 'motor local'}</span>
          </div>
          <table className="tnum mt-2 w-full text-[12px]">
            <tbody>
              {res.items.map((i) => (
                <tr key={i.foodId} className="border-t border-line/60">
                  <td className="py-1 font-semibold text-ink">{i.grams} g</td>
                  <td className="py-1 text-steel">{i.food}</td>
                  <td className="py-1 text-mute">{i.household}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {res.seasonings.length > 0 && <p className="mt-1 text-[11.5px] text-mute">Condimentos y básicos: {res.seasonings.join(', ')}</p>}
          {res.unknown.length > 0 && <p className="mt-1 text-[11.5px] text-gold">No reconocí: {res.unknown.join(', ')} · cargalos a mano o como marca propia.</p>}
          <div className="tnum mt-2 font-mono text-[12px] text-ink" data-ql-macros>
            {res.totals.kcal} kcal · P {res.totals.p} g · C {res.totals.c} g · G {res.totals.f} g · porción {res.totals.g} g
          </div>
          <div className={`mt-2 rounded-md border-l-2 px-2 py-1 text-[12px] ${res.yieldInfo.yieldType === 'batch' ? 'border-[#22C55E] bg-[#22C55E]/[0.07] text-steel' : 'border-line text-mute'}`} data-ql-yield={res.yieldInfo.yieldType}>
            <b className="text-ink">{res.yieldInfo.yieldType === 'batch' ? `🥧 ${yieldTag(res.yieldInfo)}` : '🍽 Porción individual'}</b>
            {res.yieldInfo.yieldType === 'batch' && <> · {yieldLabel(res.yieldInfo)}</>}
            {res.dividedFrom && <div className="text-[11.5px] text-gold">Cargaste la receta entera: dividí los gramos por {res.dividedFrom} (lo de arriba es 1 porción).</div>}
            {res.yieldInfo.yieldType === 'batch' && <div className="text-[11.5px] text-mute">❄️ {res.yieldInfo.storage}</div>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" data-ql-allergens>
            {res.allergens.length ? (
              res.allergens.map((a) => (
                <span key={a} className="rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#FCA5A5]">
                  {ALLERGEN_INFO[a].label}
                </span>
              ))
            ) : (
              <span className="text-[11.5px] text-[#34D399]">Sin alérgenos declarados</span>
            )}
          </div>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[12.5px] text-steel" data-ql-steps>
            {res.steps.map((x, k) => (
              <li key={k}>{x}</li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => onUse(quickToBrandFood(res, base))}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-cyan-hud/60 bg-cyan-hud/10 px-3 py-2 text-[12.5px] font-semibold text-cyan-hud hover:bg-cyan-hud/20"
            data-ql-use
          >
            <Save className="h-4 w-4" /> Usar este plato (revisar y guardar)
          </button>
        </div>
      )}
    </div>
  );
}

export function FoodModal({ initial, onClose }: { initial: BrandFood; onClose: () => void }) {
  const upsert = useFoodDbStore((s) => s.upsert);
  const [d, setD] = useState<BrandFood>(initial);
  const m = d.macros_por_porcion;
  const atwater = m.p * 4 + m.c * 4 + m.f * 9;
  const setM = (patch: Partial<BrandFood['macros_por_porcion']>) => setD((x) => ({ ...x, macros_por_porcion: { ...x.macros_por_porcion, ...patch } }));
  const setP = (patch: Partial<BrandFood['porcion_base']>) => setD((x) => ({ ...x, porcion_base: { ...x.porcion_base, ...patch } }));
  const [dishMode] = useState(DISH_CATEGORIES.includes(initial.categoria));
  const isDish = dishMode || DISH_CATEGORIES.includes(d.categoria);
  const liveAllergens = [...new Set((d.ingredientes ?? []).filter((x) => x.foodId).flatMap((x) => itemAllergens({ foodId: x.foodId, food: x.nombre })))].filter((a) => !isDietTag(a)) as Allergen[];
  const ingr = d.ingredientes ?? [];
  const hasRecipe = isDish && ingr.some((x) => x.foodId && x.gramos > 0);
  const valid = d.nombre.trim().length >= 2 && (hasRecipe || d.porcion_base.gramos > 0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alimento o marca"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-cyan-hud/25 bg-panel p-5 shadow-cyan sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-cyan-hud">{isDish ? '[ ➕ PLATO / PREPARACIÓN ]' : '[ + AGREGAR NUEVA MARCA / ALIMENTO ]'}</div>
          <button onClick={onClose} className="rounded-md p-1 text-steel hover:text-ink" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Label>Nombre</Label>
            <input autoFocus value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} placeholder="Yogur Griego Descremado Pro" className={inputCls} />
          </label>
          <label className="block">
            <Label>Marca</Label>
            <input value={d.marca} onChange={(e) => setD({ ...d, marca: e.target.value })} placeholder="La Serenísima / Milkaut / Ilolay" className={inputCls} />
          </label>
        </div>
        {dishMode && !d.ingredientes?.length && <QuickLoad base={d} onUse={(x) => setD(x)} />}
        <CategoryPicker d={d} setD={setD} dish={dishMode} />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Num label="Cantidad" unit="" value={d.porcion_base.cantidad} onChange={(cantidad) => setP({ cantidad })} />
          <label className="block">
            <Label>Unidad</Label>
            <input value={d.porcion_base.unidad} onChange={(e) => setP({ unidad: e.target.value })} placeholder="pote / cda / g" className={inputCls} />
          </label>
          <Num label="Peso porción" unit="g" value={d.porcion_base.gramos} onChange={(gramos) => setP({ gramos })} />
        </div>
        {isDish && (
          <>
            <RecipeEditor list={ingr} onChange={(ingredientes) => setD({ ...d, ingredientes })} />
            {liveAllergens.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5" data-dish-allergens>
                <span className="font-mono text-[10px] text-mute">ALÉRGENOS:</span>
                {liveAllergens.map((a) => (
                  <span key={a} className="rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#FCA5A5]">
                    {ALLERGEN_INFO[a].label}
                  </span>
                ))}
              </div>
            )}
            <label className="mt-3 block">
              <Label>Preparación paso a paso (un paso por línea)</Label>
              <textarea rows={4} value={(d.pasos ?? []).join('\n')} onChange={(e) => setD({ ...d, pasos: e.target.value.split('\n') })} placeholder={'Cortá las verduras.\nSalteá…'} className={inputCls} data-dish-steps />
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px]" data-dish-yield>
              <label className="block">
                <Label>Rendimiento</Label>
                <select
                  value={dishYield(d).yieldType}
                  onChange={(e) => {
                    const yt = e.target.value as 'individual' | 'batch';
                    const g = dishYield({ ...d, yieldType: yt });
                    setD({ ...d, yieldType: yt, servings: yt === 'batch' ? g.servings : 1, storage: d.storage || g.storage });
                  }}
                  className={inputCls}
                  data-dish-yield-type
                >
                  <option value="individual">Porción individual — lista para consumir en esta comida</option>
                  <option value="batch">Receta de molde / tanda — rinde varias porciones</option>
                </select>
              </label>
              {dishYield(d).yieldType === 'batch' && (
                <label className="block">
                  <Label>Rinde (porciones)</Label>
                  <input type="number" min={2} max={24} value={dishYield(d).servings} onChange={(e) => setD({ ...d, yieldType: 'batch', servings: Math.max(2, Math.min(24, Number(e.target.value) || 2)) })} className={inputCls} data-dish-servings />
                </label>
              )}
            </div>
            {dishYield(d).yieldType === 'batch' && <p className="mt-1 text-[11.5px] text-[#4ADE80]/90">{yieldLabel(dishYield(d))}. Los ingredientes y macros de esta ficha son de 1 porción.</p>}
            <label className="mt-2 block">
              <Label>Conservación / freezer</Label>
              <input value={d.storage ?? ''} onChange={(e) => setD({ ...d, storage: e.target.value || undefined })} placeholder={dishYield(d).storage} className={inputCls} data-dish-storage />
            </label>
            <label className="mt-3 block">
              <Label>Técnica de cocción rápida y condimentos</Label>
              <textarea rows={2} value={d.tecnica ?? ''} onChange={(e) => setD({ ...d, tecnica: e.target.value || undefined })} placeholder="Ej. al horno 200 °C 25 min con spray de oliva, orégano y limón" className={inputCls} />
            </label>
          </>
        )}
        <div className="mt-3">
          <Label>Macros por porción ({portionLabel(d)})</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Num label="Kcal" unit="kcal" value={m.kcal} onChange={(kcal) => setM({ kcal })} />
            <Num label="Proteínas" unit="g" value={m.p} onChange={(p) => setM({ p })} />
            <Num label="Carbos" unit="g" value={m.c} onChange={(c) => setM({ c })} />
            <Num label="Grasas" unit="g" value={m.f} onChange={(f) => setM({ f })} />
            <Num label="Leucina" unit="g" value={m.leucina} onChange={(leucina) => setM({ leucina })} />
          </div>
          <p className="tnum mt-2 font-mono text-[10px] text-mute">
            Atwater 4/4/9: {fmt0(atwater)} kcal
            {m.kcal > 0 && atwater > 0 && Math.abs(m.kcal / atwater - 1) > 0.15 && <span className="text-fire"> · difiere &gt;15 % de la etiqueta</span>}
            {m.p > 0 && !m.leucina && <span> · leucina sugerida ≈ {(m.p * 0.09).toFixed(1)} g</span>}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Num label="Preparación" unit="min" value={d.prep_min ?? 0} onChange={(prep_min) => setD({ ...d, prep_min })} />
          <label className="col-span-1 block sm:col-span-3">
            <Label>Detalle / composición</Label>
            <input value={d.detalle ?? ''} onChange={(e) => setD({ ...d, detalle: e.target.value || undefined })} placeholder="Ej. 2 rebanadas de pan integral + 60 g de palta + 1 huevo" className={inputCls} />
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle checked={!!d.lactosa} onChange={(v) => setD({ ...d, lactosa: v })} tone="cyan" label={<span className="text-xs text-steel">Contiene lactosa</span>} />
          <Toggle checked={!!d.flex} onChange={(v) => setD({ ...d, flex: v })} tone="cyan" label={<span className="text-xs text-steel">Flex-meal / permitido social</span>} />
          <Toggle checked={d.es_marca_local} onChange={(v) => setD({ ...d, es_marca_local: v })} tone="cyan" label={<span className="text-xs text-steel">Marca local (entra al selector de comidas)</span>} />
          <Toggle checked={d.disponible_para_ia} onChange={(v) => setD({ ...d, disponible_para_ia: v })} tone="cyan" label={<span className="text-xs text-steel">Disponible para la IA</span>} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <HudButton tone="steel" variant="ghost" onClick={onClose}>
            Cancelar
          </HudButton>
          <HudButton
            disabled={!valid}
            onClick={() => {
              // Receta: la porción base y los macros salen de la suma de ingredientes.
              const rec = hasRecipe ? recipeTotals(ingr.filter((x) => x.foodId && x.gramos > 0)) : null;
              upsert({
                ...d,
                pasos: (d.pasos ?? []).map((x) => x.trim()).filter(Boolean).length ? (d.pasos ?? []).map((x) => x.trim()).filter(Boolean) : undefined,
                ...(hasRecipe ? { alergenos: liveAllergens, lactosa: liveAllergens.includes('lactose') } : {}),
                nombre: d.nombre.trim(),
                marca: d.marca.trim(),
                ingredientes: hasRecipe ? ingr.filter((x) => x.foodId && x.gramos > 0) : d.ingredientes?.length ? d.ingredientes : undefined,
                ...(rec
                  ? {
                      porcion_base: { cantidad: 1, unidad: d.porcion_base.unidad || 'porción', gramos: Math.round(rec.g) },
                      macros_por_porcion: { kcal: Math.round(rec.p * 4 + rec.c * 4 + rec.f * 9), p: Math.round(rec.p * 10) / 10, c: Math.round(rec.c * 10) / 10, f: Math.round(rec.f * 10) / 10, leucina: Math.round(rec.l * 100) / 100 },
                    }
                  : {}),
              });
              onClose();
            }}
          >
            <Save className="h-4 w-4" /> [ Guardar ]
          </HudButton>
        </div>
      </div>
    </div>
  );
}

/** Botón reutilizable (Ingestas & leucina): abre el editor de recetas del coach. */
export function NewDishButton({ className }: { className?: string }) {
  const [open, setOpen] = useState<BrandFood | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(emptyDish())}
        className={cx(
          'flex items-center gap-1.5 rounded-md border border-cyan-hud/40 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-cyan-hud transition hover:border-cyan-hud hover:bg-cyan-hud/10',
          className,
        )}
      >
        <ChefHat className="h-3.5 w-3.5" /> [ ➕ AGREGAR NUEVO PLATO / PREPARACIÓN ]
      </button>
      {open && <FoodModal initial={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Food & Brand DB: catálogo de alimentos y marcas locales que usa la IA y el selector de comidas. */
export function FoodBrandDatabase() {
  const items = useFoodDbStore((s) => s.items);
  const toggleAi = useFoodDbStore((s) => s.toggleAi);
  const remove = useFoodDbStore((s) => s.remove);
  const importJson = useFoodDbStore((s) => s.importJson);
  const resetSeed = useFoodDbStore((s) => s.resetSeed);
  const [q, setQ] = useState('');
  // Filtro: 'all', una categoría o «custom:<nombre>» para las categorías propias del coach.
  const [cat, setCat] = useState<string>('all');
  const [review, setReview] = useState(false);
  const [editing, setEditing] = useState<BrandFood | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  const list = useMemo(
    () =>
      items.filter(
        (b) =>
          (cat === 'all' || (cat.startsWith('custom:') ? b.categoria === 'custom' && b.catLabel === cat.slice(7) : b.categoria === cat)) &&
          (!review || auditDish(b).length > 0) &&
          (!q.trim() || norm(`${b.nombre} ${b.marca}`).includes(norm(q.trim()))),
      ),
    [items, q, cat, review],
  );
  const toReview = items.filter((b) => auditDish(b).length > 0).length;
  const usedCats = [...BRAND_CATEGORY_KEYS.filter((c) => c !== 'custom' && items.some((b) => b.categoria === c)), ...[...new Set(items.filter((b) => b.categoria === 'custom' && b.catLabel).map((b) => b.catLabel!))].map((c) => `custom:${c}`)];
  const active = items.filter((b) => b.disponible_para_ia).length;

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'coachjp-food-db', version: 1, exportedAt: new Date().toISOString(), items }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-brand-db-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onImport(f: File | undefined) {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const replace = confirm('¿Reemplazar toda la base por el archivo? (Cancelar = sumar / actualizar por id)');
      const n = importJson(data, replace ? 'replace' : 'merge');
      alert(n ? `${n} alimentos importados.` : 'El archivo no contiene alimentos válidos.');
    } catch {
      alert('JSON inválido.');
    } finally {
      if (file.current) file.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <Panel title="04 · FOOD & BRAND DB · MARCAS LOCALES" right={<Database className="h-4 w-4 text-cyan-hud" />}>
        <p className="text-sm text-steel">
          Catálogo real de productos y marcas argentinas. Los habilitados para IA (<b className="text-ink">{active}</b> de {items.length}) se inyectan en el Prompt Engine; las marcas locales
          además aparecen en el selector de comidas y en los SWAP de la app del atleta. Valores de referencia: verificá siempre con la etiqueta.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <HudButton onClick={() => setEditing(empty())}>
            <Plus className="h-4 w-4" /> [ + AGREGAR NUEVA MARCA / ALIMENTO ]
          </HudButton>
          <HudButton tone="cyan" onClick={() => setEditing(emptyDish())}>
            <ChefHat className="h-4 w-4" /> [ ➕ AGREGAR NUEVO PLATO / PREPARACIÓN ]
          </HudButton>
          <HudButton tone="cyan" variant="ghost" onClick={exportJson}>
            <Download className="h-4 w-4" /> [ 📤 EXPORTAR FOOD DB JSON ]
          </HudButton>
          <HudButton tone="cyan" variant="ghost" onClick={() => file.current?.click()}>
            <Upload className="h-4 w-4" /> [ 📥 IMPORTAR FOOD DB ]
          </HudButton>
          <HudButton tone="steel" variant="ghost" onClick={() => confirm('¿Restaurar el catálogo argentino de ejemplo? Se pierden los cambios.') && resetSeed()}>
            <RotateCcw className="h-4 w-4" /> Seed
          </HudButton>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
      </Panel>

      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o marca…" className={cx(inputCls, 'pl-9')} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['all', ...usedCats].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cx(
                'rounded-md border px-2 py-1 font-mono text-[10px] transition',
                cat === c ? 'border-cyan-hud bg-cyan-hud/10 text-cyan-hud' : 'border-line text-steel hover:text-ink',
              )}
            >
              {c === 'all'
                ? `Todas (${items.length})`
                : c.startsWith('custom:')
                  ? `★ ${c.slice(7)} (${items.filter((b) => b.categoria === 'custom' && b.catLabel === c.slice(7)).length})`
                  : `${BRAND_CATEGORY_LABEL[c as BrandCategory]} (${items.filter((b) => b.categoria === c).length})`}
            </button>
          ))}
        </div>
        {toReview > 0 && (
          <button type="button" onClick={() => setReview(!review)} className={cx('mt-2 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold', review ? 'border-gold bg-gold/15 text-[#FDE68A]' : 'border-gold/40 text-gold')} data-review-filter>
            ⚠ {toReview} plato{toReview > 1 ? 's' : ''} para revisar (nombre, ingredientes, macros o pasos)
          </button>
        )}

        <div className="mt-3 divide-y divide-line">
          {list.map((b) => {
            const m = b.macros_por_porcion;
            return (
              <div key={b.id} className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5', !b.disponible_para_ia && 'opacity-55')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[14px] font-medium text-ink">{b.nombre}</span>
                    {b.marca && b.marca !== 'Genérico' && <span className="text-xs text-steel">· {b.marca}</span>}
                    {b.es_marca_local && <span className="rounded border border-fire/30 bg-fire/10 px-1 font-mono text-[8.5px] font-bold text-fire">LOCAL</span>}
                    {b.flex && <span className="rounded border border-gold/40 bg-gold/10 px-1 font-mono text-[8.5px] font-bold text-gold">FLEX</span>}
                  </div>
                  <div className="tnum font-mono text-[10.5px] text-mute">
                    {categoryLabel(b)} · {portionLabel(b)} · {fmt0(m.kcal)} kcal · P {m.p} · C {m.c} · G {m.f}
                    {m.leucina ? ` · Leu ${m.leucina}` : ''}
                    {b.prep_min ? ` · ${b.prep_min} min` : ''}
                    {b.lactosa ? ' · lactosa' : ''}
                  </div>
                  {b.detalle && <div className="text-[11px] text-steel/80">{b.detalle}</div>}
                  {auditDish(b).map((i, k) => (
                    <div key={k} className="text-[11px] text-gold" data-dish-issue>
                      ⚠ {i.msg}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toggleAi(b.id)}
                  aria-pressed={b.disponible_para_ia}
                  title="Disponible para la IA"
                  className={cx(
                    'rounded-md border px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.08em]',
                    b.disponible_para_ia ? 'border-cyan-hud/50 bg-cyan-hud/10 text-cyan-hud' : 'border-line text-mute',
                  )}
                >
                  IA {b.disponible_para_ia ? 'ON' : 'OFF'}
                </button>
                <button type="button" onClick={() => setEditing(b)} aria-label={`Editar ${b.nombre}`} className="rounded-md p-1.5 text-steel hover:text-cyan-hud">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => confirm(`¿Eliminar «${b.nombre}» de la base?`) && remove(b.id)}
                  aria-label={`Eliminar ${b.nombre}`}
                  className="rounded-md p-1.5 text-steel hover:text-fire"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {!list.length && <div className="py-6 text-center text-sm text-mute">Sin resultados para el filtro.</div>}
        </div>
      </div>
      {editing && <FoodModal initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
