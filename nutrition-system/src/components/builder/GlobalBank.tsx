'use client';

import { useMemo, useState } from 'react';
import { Globe2, Pencil, Plus, Search } from 'lucide-react';
import { ALLERGEN_INFO, FOOD_ALLERGENS, isDietTag, itemAllergens, protocolOf, type Allergen } from '@/lib/allergens';
import { previewAssign, previewTriple, totalsOf, type BankSource } from '@/lib/bankAssign';
import { CAT_LABEL, CATALOG, catalogRecipe, type CatalogDish } from '@/lib/catalog';
import { categoryLabel, DISH_CATEGORIES, dishYield, emptyDishBase, type BrandCategory, type BrandFood } from '@/lib/foodBrandDb';
import { FOOD_BY_ID, FOODS, GROUP_LABEL, macrosFor, type FoodRef } from '@/lib/foods';
import { houseMeasure } from '@/lib/household';
import { catalogDishForMeal, ROLES_OF_CATEGORY } from '@/lib/planBank';
import type { FoodItem, Meal, MealDay } from '@/lib/types';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Panel } from '../hud/primitives';
import { FoodModal } from './FoodBrandDatabase';
import { individual, stepsWithYield, yieldLabel, yieldTag, type YieldInfo } from '@/lib/yieldInfo';

type View = 'foods' | 'dishes';
type Group = string;
type Restriction = 'gluten' | 'lactose' | 'dairy' | 'veg' | 'keto' | 'lowcarb';
/** Categorías reales del Banco Global (alimentos base). */
const FOOD_CATS: { id: Group; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'carnes', label: 'Carnes y aves' },
  { id: 'pescados', label: 'Pescados y mariscos' },
  { id: 'huevos', label: 'Huevos y lácteos' },
  { id: 'cereales', label: 'Cereales y tubérculos' },
  { id: 'legumbres', label: 'Legumbres' },
  { id: 'verduras', label: 'Verduras y hortalizas' },
  { id: 'frutas', label: 'Frutas' },
  { id: 'grasas', label: 'Grasas saludables y frutos secos' },
  { id: 'extras', label: 'Condimentos / extras / infusiones' },
];
/** Platos armados por momento del día. */
const DISH_CATS: { id: Group; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'desayuno', label: 'Desayunos' },
  { id: 'plato_principal', label: 'Almuerzo / cena' },
  { id: 'merienda', label: 'Meriendas' },
  { id: 'colacion', label: 'Colaciones y postres' },
];
const FISH = /merluza|atun|salm[oó]n|pescad|camar|mariscos?/;
const LEGUMES = new Set(['lentejas', 'garbanzos', 'porotos', 'arvejas', 'tofu', 'soja-texturizada', 'fideos-legumbres', 'hummus']);
const catOfFood = (f: FoodRef): Group => {
  if (LEGUMES.has(f.id)) return 'legumbres';
  switch (f.group) {
    case 'lean-protein':
      return FISH.test(f.id) ? 'pescados' : 'carnes';
    case 'eggs':
    case 'dairy-protein':
    case 'whey':
      return 'huevos';
    case 'starch':
    case 'cereal':
      return 'cereales';
    case 'veg':
      return 'verduras';
    case 'fruit':
      return 'frutas';
    case 'fat':
      return 'grasas';
    default:
      return 'extras';
  }
};
const dbMoment = (b: BrandFood): Group => (b.categoria === 'desayuno' ? 'desayuno' : ['colacion', 'postre', 'licuado', 'snack'].includes(b.categoria) ? 'colacion' : 'plato_principal');
const RESTR: { id: Restriction; label: string }[] = [
  { id: 'gluten', label: 'Sin TACC' },
  { id: 'lactose', label: 'Sin lactosa' },
  { id: 'dairy', label: 'APLV' },
  { id: 'veg', label: 'Vegetariano' },
  { id: 'lowcarb', label: 'Low Carb' },
  { id: 'keto', label: 'Keto' },
];
const DAY_LABEL: Record<MealDay, string> = { on: 'Entreno', off: 'Descanso', both: 'Ambos días' };
const r1 = (n: number) => Math.round(n * 10) / 10;
const kc = (m: { p: number; c: number; f: number }) => Math.round(m.p * 4 + m.c * 4 + m.f * 9);

interface Entry {
  key: string;
  src: BankSource;
  name: string;
  sub: string;
  /** Macro dominante (para el filtro de grupo). */
  group: Group;
  allergens: Allergen[];
  dish?: CatalogDish;
  db?: BrandFood;
  food?: FoodRef;
  /** Rendimiento del plato (porción individual o receta de molde / tanda). */
  yieldInfo?: YieldInfo;
}
const catYield = (d: CatalogDish): YieldInfo => (d.yieldType === 'batch' ? { yieldType: 'batch', servings: d.servings ?? 4, unit: d.yieldUnit, storage: d.storage ?? '' } : individual(d.storage));
const yieldSub = (y?: YieldInfo) => (y?.yieldType === 'batch' ? ` · 🥧 rinde ${y.servings} porciones` : '');

const partsAllergens = (ids: string[]) => [...new Set(ids.flatMap((id) => FOOD_ALLERGENS[id] ?? []))] as Allergen[];

/** Comida de referencia para la ficha de un plato del recetario (porción estándar del alumno activo). */
const refMeal = (d: CatalogDish, meals: Meal[]): Meal => meals.find((m) => ROLES_OF_CATEGORY[d.category].includes(m.role)) ?? { id: 'ref', name: CAT_LABEL[d.category], time: '13:00', day: 'on', role: ROLES_OF_CATEGORY[d.category][0], items: [] };
const DB_CAT: Record<CatalogDish['category'], BrandCategory> = { desayuno: 'desayuno', plato_principal: 'principal', merienda: 'desayuno', colacion: 'colacion' };

/**
 * BANCO GLOBAL: explorador de todos los alimentos base y platos armados (Recetario Coach JP + platos del coach), con
 * buscador en vivo, filtros por grupo y por restricción, ficha técnica (macros por 100 g y por porción, medida casera,
 * alérgenos, ingredientes y pasos editables) y «+ Asignar a comida» auto-escalado al alumno activo (y a su pareja).
 */
export function GlobalBank() {
  const state = usePlanStore();
  const { plan, assignFromBank } = state;
  const db = useFoodDbStore((s) => s.items);
  const [view, setView] = useState<View>('dishes');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const own = (plan.anamnesis?.allergies ?? []).filter((a): a is Restriction => ['gluten', 'lactose', 'dairy', 'veg', 'keto', 'lowcarb'].includes(a));
  const [restr, setRestr] = useState<Restriction[]>(own);
  const [sel, setSel] = useState<string>('');
  const [editing, setEditing] = useState<BrandFood | null>(null);
  const [day, setDay] = useState<'on' | 'off'>('on');
  const [mealId, setMealId] = useState('');
  const [mode, setMode] = useState<'replace' | 'alt' | 'triple'>('triple');
  const [confirmPlan, setConfirmPlan] = useState(false);
  const { assignTriple, buildFromBank } = state;
  const [msg, setMsg] = useState('');

  const entries = useMemo<Entry[]>(() => {
    if (view === 'foods')
      return FOODS.filter((f) => !f.custom && f.group !== 'plato').map((f) => ({
        key: `food:${f.id}`,
        src: { kind: 'food', id: f.id },
        name: f.name,
        sub: `${GROUP_LABEL[f.group]} · ${kc(f)} kcal/100 g`,
        group: catOfFood(f),
        allergens: (FOOD_ALLERGENS[f.id] ?? []) as Allergen[],
        food: f,
      }));
    const variant = restr.includes('keto') ? 'keto' : restr.includes('lowcarb') ? 'lowcarb' : restr.includes('veg') ? 'veg' : restr.includes('gluten') ? 'stacc' : 'std';
    const cat: Entry[] = CATALOG.flatMap((d) => {
      const r = catalogRecipe(d, variant);
      if (!r) return [];
      const ids = r.parts.map((x) => x.id);
      const m = ids.reduce((a, id) => { const x = macrosFor(id, 100)!; return { p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }; }, { p: 0, c: 0, f: 0 });
      return [{ key: `cat:${d.id}`, src: { kind: 'catalog' as const, id: d.id }, name: r.title.replace(/\[([^|\]]*)\|[^\]]*\]/g, '$1'), sub: `Recetario Coach JP · ${CAT_LABEL[d.category]} · ${d.complexity === 'rapida' ? 'rápida' : 'elaborada'}`, group: d.category, allergens: partsAllergens(ids), dish: d, yieldInfo: catYield(d) }];
    });
    const mine: Entry[] = db
      .filter((b) => DISH_CATEGORIES.includes(b.categoria))
      .map((b) => ({
        key: `db:${b.id}`,
        src: { kind: 'dish' as const, id: b.id },
        name: b.nombre,
        sub: `${b.ingredientes?.length ? 'Plato propio' : 'Plato preparado'} · ${categoryLabel(b)} · ${b.macros_por_porcion.kcal} kcal / porción`,
        group: dbMoment(b),
        allergens: [...new Set([...(b.ingredientes ?? []).flatMap((x) => itemAllergens({ foodId: x.foodId, food: x.nombre })), ...itemAllergens({ food: b.nombre }), ...(b.lactosa ? (['lactose', 'dairy'] as Allergen[]) : [])])] as Allergen[],
        db: b,
        yieldInfo: dishYield(b),
      }));
    return [...cat, ...mine];
  }, [view, db, restr]);

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = entries.filter((e) => (group === 'all' || e.group === group) && !restr.some((r) => e.allergens.includes(r)) && (!q.trim() || norm(`${e.name} ${e.dish?.title ?? ''} ${e.sub} ${e.dish?.base.join(' ') ?? ''}`).includes(norm(q.trim()))));
  const cur = entries.find((e) => e.key === sel);
  const dayMeals = [...plan.meals].filter((m) => m.day === day || m.day === 'both').sort((a, b) => a.time.localeCompare(b.time));
  const meal = dayMeals.find((m) => m.id === mealId) ?? dayMeals[0];
  const preview = cur && meal ? previewAssign(cur.src, meal, plan, db) : null;
  const triple = cur && meal && mode === 'triple' ? previewTriple(cur.src, meal, plan, db) : [];
  const partner = plan.partnerId && state.roster[plan.partnerId]?.partnerId === plan.id && !plan.partnerSyncAt ? state.roster[plan.partnerId] : undefined;

  // Ficha técnica.
  const sheet = (() => {
    if (!cur) return null;
    if (cur.food) {
      const f = cur.food;
      const portion = f.unit?.grams ?? 100;
      const pm = macrosFor(f.id, portion)!;
      return { per100: { p: f.p, c: f.c, f: f.f }, portion, portionLabel: houseMeasure(f.id, portion) || `${portion} g`, perPortion: pm, ingredients: null as FoodItem[] | null, base: null as string[] | null, steps: null as string[] | null };
    }
    if (cur.dish) {
      const ref = catalogDishForMeal(cur.dish.id, refMeal(cur.dish, plan.meals), plan);
      if (!ref) return null;
      const t = totalsOf(ref.items);
      return { per100: { p: (t.p / t.g) * 100, c: (t.c / t.g) * 100, f: (t.f / t.g) * 100 }, portion: Math.round(t.g), portionLabel: `porción para ${plan.profile.name.split(' ')[0]}`, perPortion: t, ingredients: ref.items, base: cur.dish.base, steps: ref.steps };
    }
    const b = cur.db!;
    const g = b.porcion_base.gramos || 1;
    const m = b.macros_por_porcion;
    const items = (b.ingredientes ?? []).filter((x) => x.foodId && FOOD_BY_ID[x.foodId]).map((x) => ({ id: x.foodId!, foodId: x.foodId, food: FOOD_BY_ID[x.foodId!].name, grams: x.gramos, ...macrosFor(x.foodId!, x.gramos)! }));
    return { per100: { p: (m.p / g) * 100, c: (m.c / g) * 100, f: (m.f / g) * 100 }, portion: g, portionLabel: `${b.porcion_base.cantidad} ${b.porcion_base.unidad}`, perPortion: m, ingredients: items.length ? items : null, base: null, steps: stepsWithYield(b.pasos ?? (b.tecnica ? [b.tecnica] : []), dishYield(b)) };
  })();

  const editCatalog = (d: CatalogDish) => {
    const ref = catalogDishForMeal(d.id, refMeal(d, plan.meals), plan);
    if (!ref) return;
    const t = totalsOf(ref.items);
    setEditing({
      ...emptyDishBase(),
      nombre: ref.title,
      categoria: DB_CAT[d.category],
      porcion_base: { cantidad: 1, unidad: 'porción', gramos: Math.round(t.g) },
      macros_por_porcion: { kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f), leucina: r1(ref.items.reduce((a, i) => a + i.leucine, 0)) },
      ingredientes: ref.items.map((i) => ({ nombre: i.food, gramos: i.grams, foodId: i.foodId })),
      yieldType: d.yieldType ?? 'individual',
      servings: d.servings ?? 1,
      storage: d.storage,
      pasos: ref.steps,
      detalle: d.base.join(', '),
      prep_min: d.complexity === 'rapida' ? 15 : 60,
    });
  };

  return (
    <div className="space-y-3" data-global-bank>
      <Panel title="BANCO GLOBAL · ALIMENTOS Y PLATOS" right={<Globe2 className="h-4 w-4 text-cyan-hud/80" />}>
        <p className="-mt-1 text-[13px] text-steel">
          Todo lo que el sistema sabe cocinar: alimentos base con su ficha técnica y platos armados (Recetario Coach JP y los tuyos). Elegí uno y asignalo a una comida de <b className="text-ink">{plan.profile.name}</b>: los gramos se calculan solos para sus macros.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/[0.05] p-2.5" data-bank-build>
          <div className="min-w-0 flex-1 text-[12.5px] text-steel">
            <b className="text-ink">⚡ Armar plan completo desde el Banco Global</b> · día de entreno y descanso con 3 opciones por comida, escalado a las calorías, macros{protocolOf(plan.anamnesis?.allergies ?? []) ? `, protocolo ${protocolOf(plan.anamnesis?.allergies ?? []) === 'keto' ? 'Keto' : 'Low Carb'}` : ''} y restricciones de {plan.profile.name}.
          </div>
          {!confirmPlan ? (
            <button type="button" onClick={() => setConfirmPlan(true)} className="min-h-[40px] rounded-lg bg-[#10B981] px-3 py-1.5 text-[12.5px] font-semibold text-white" data-bank-build-start>
              Armar plan
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-[12px] text-gold">Reemplaza las comidas actuales.</span>
              <button type="button" onClick={() => { buildFromBank(); setConfirmPlan(false); }} className="min-h-[40px] rounded-lg bg-[#10B981] px-3 py-1.5 text-[12.5px] font-semibold text-white" data-bank-build-confirm>
                Confirmar
              </button>
              <button type="button" onClick={() => setConfirmPlan(false)} className="min-h-[40px] rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-steel">
                Cancelar
              </button>
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(['dishes', 'foods'] as View[]).map((v) => (
            <button key={v} type="button" data-bank-view={v} onClick={() => { setView(v); setSel(''); setGroup('all'); }} className={cx('rounded-lg border px-3 py-1.5 text-[13px] font-semibold', view === v ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel')}>
              {v === 'dishes' ? 'Platos armados' : 'Alimentos base'}
            </button>
          ))}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el banco…" className="w-full rounded-lg border border-line bg-carbon py-1.5 pl-8 pr-3 text-[13px] text-ink" data-bank-search />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(view === 'foods' ? FOOD_CATS : DISH_CATS).map((g) => (
            <button key={g.id} type="button" data-bank-group={g.id} onClick={() => setGroup(g.id)} className={cx('rounded-md border px-2.5 py-1 text-[12px]', group === g.id ? 'border-fire bg-fire/10 text-ink' : 'border-line text-steel')}>
              {g.label}
            </button>
          ))}
          <span className="mx-1 self-center text-mute">·</span>
          {RESTR.map((r) => (
            <button key={r.id} type="button" data-bank-restr={r.id} onClick={() => setRestr(restr.includes(r.id) ? restr.filter((x) => x !== r.id) : [...restr, r.id])} className={cx('rounded-md border px-2.5 py-1 text-[12px]', restr.includes(r.id) ? 'border-[#34D399] bg-[#34D399]/10 text-ink' : 'border-line text-steel')}>
              {restr.includes(r.id) ? '✓ ' : ''}
              {r.label}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-panel p-2" data-bank-list>
          <div className="px-2 pb-1 font-mono text-[10px] text-mute">{list.length} resultados</div>
          {list.map((e) => (
            <button key={e.key} type="button" data-bank-item={e.key} onClick={() => { setSel(e.key); setMsg(''); }} className={cx('block w-full rounded-lg px-2.5 py-2 text-left', sel === e.key ? 'bg-cyan-hud/10' : 'hover:bg-white/5')}>
              <div className="text-[13.5px] font-medium text-ink">{e.name}</div>
              <div className="text-[11.5px] text-mute">
                {e.sub}
                {yieldSub(e.yieldInfo)}
                {e.allergens.filter((a) => !isDietTag(a)).length > 0 && ` · ${e.allergens.filter((a) => !isDietTag(a)).map((a) => ALLERGEN_INFO[a].short).join(', ')}`}
              </div>
            </button>
          ))}
          {!list.length && <div className="p-4 text-center text-[13px] text-mute">Nada para ese filtro.</div>}
        </div>

        <div className="rounded-xl border border-line bg-panel p-3" data-bank-sheet>
          {!cur || !sheet ? (
            <p className="p-6 text-center text-[13px] text-mute">Elegí un alimento o un plato para ver su ficha técnica y asignarlo.</p>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold text-ink">{cur.name}</div>
                  <div className="text-[12px] text-mute">{cur.sub}</div>
                </div>
                {cur.db?.ingredientes && (
                  <button type="button" onClick={() => setEditing(cur.db!)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-steel hover:text-ink" data-bank-edit>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                )}
                {cur.dish && (
                  <button type="button" onClick={() => editCatalog(cur.dish!)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-steel hover:text-ink" data-bank-edit>
                    <Pencil className="h-3.5 w-3.5" /> Editar como plato propio
                  </button>
                )}
              </div>
              <table className="tnum mt-3 w-full text-[12.5px]" data-bank-macros>
                <thead>
                  <tr className="text-left font-mono text-[10px] text-mute">
                    <th className="font-normal" />
                    <th className="font-normal">KCAL</th>
                    <th className="font-normal">PROT.</th>
                    <th className="font-normal">CARBOS</th>
                    <th className="font-normal">GRASAS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line">
                    <td className="py-1 text-steel">Por 100 g</td>
                    <td className="font-semibold text-ink">{kc(sheet.per100)}</td>
                    <td>{r1(sheet.per100.p)} g</td>
                    <td>{r1(sheet.per100.c)} g</td>
                    <td>{r1(sheet.per100.f)} g</td>
                  </tr>
                  <tr className="border-t border-line">
                    <td className="py-1 text-steel">
                      Porción · {sheet.portion} g <span className="text-mute">({sheet.portionLabel})</span>
                    </td>
                    <td className="font-semibold text-ink">{kc(sheet.perPortion)}</td>
                    <td>{r1(sheet.perPortion.p)} g</td>
                    <td>{r1(sheet.perPortion.c)} g</td>
                    <td>{r1(sheet.perPortion.f)} g</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 flex flex-wrap gap-1.5" data-bank-allergens>
                {cur.allergens.filter((a) => !isDietTag(a)).map((a) => (
                  <span key={a} className="rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#FCA5A5]">
                    {ALLERGEN_INFO[a].label}
                  </span>
                ))}
                {!cur.allergens.includes('veg') && <span className="rounded border border-[#34D399]/40 px-1.5 py-0.5 text-[11px] text-[#34D399]">Apto vegetariano</span>}
                {!cur.allergens.includes('lowcarb') && <span className="rounded border border-[#34D399]/40 px-1.5 py-0.5 text-[11px] text-[#34D399]" data-bank-lowcarb>Low Carb</span>}
                {!cur.allergens.includes('keto') && <span className="rounded border border-[#34D399]/40 px-1.5 py-0.5 text-[11px] text-[#34D399]" data-bank-keto>Apto Keto</span>}
                {!cur.allergens.filter((a) => !isDietTag(a)).length && <span className="text-[11.5px] text-[#34D399]">Sin alérgenos declarados</span>}
              </div>
              {cur.yieldInfo && (
                <div className={cx('mt-2 rounded-md border-l-2 px-2.5 py-1.5 text-[12.5px]', cur.yieldInfo.yieldType === 'batch' ? 'border-[#22C55E] bg-[#22C55E]/[0.07] text-steel' : 'border-line text-mute')} data-bank-yield={cur.yieldInfo.yieldType}>
                  <b className="text-ink">{cur.yieldInfo.yieldType === 'batch' ? `🥧 ${yieldTag(cur.yieldInfo)}` : '🍽 Porción individual'}</b>
                  <div>{yieldLabel(cur.yieldInfo)}</div>
                  {cur.yieldInfo.yieldType === 'batch' && !sheet.ingredients && (
                    <div className="mt-1 text-[12px]" data-bank-whole>
                      <b className="text-[#4ADE80]">Receta entera ({cur.yieldInfo.servings} porciones):</b> ≈ {sheet.portion * cur.yieldInfo.servings} g en total · tu porción {sheet.portion} g
                    </div>
                  )}
                  {cur.yieldInfo.yieldType === 'batch' && sheet.ingredients && (
                    <div className="mt-1 text-[12px]" data-bank-whole>
                      <b className="text-[#4ADE80]">Receta entera ({cur.yieldInfo.servings} porciones):</b> {sheet.ingredients.map((i) => `${i.grams * cur.yieldInfo!.servings} g ${i.food.split(' (')[0].toLowerCase()}`).join(' · ')}
                    </div>
                  )}
                  {cur.yieldInfo.yieldType === 'batch' && cur.yieldInfo.storage && <div className="mt-1 text-[12px]">❄️ <b className="text-ink">Conservación:</b> {cur.yieldInfo.storage}</div>}
                </div>
              )}
              {sheet.base && <p className="mt-2 text-[12px] text-steel"><b className="text-ink">Ingredientes base:</b> {sheet.base.join(', ')}.</p>}
              {sheet.ingredients && (
                <ul className="mt-2 space-y-0.5 text-[12.5px] text-steel" data-bank-ingredients>
                  {sheet.ingredients.map((i, k) => (
                    <li key={k}>
                      <b className="text-ink">{i.grams} g</b> {i.food} <span className="text-mute">{houseMeasure(i.foodId, i.grams)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {sheet.steps && (
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[12.5px] text-steel" data-bank-steps>
                  {sheet.steps.map((s, k) => (
                    <li key={k}>{s}</li>
                  ))}
                </ol>
              )}

              <div className="mt-3 rounded-lg border border-[#34D399]/30 bg-[#34D399]/[0.04] p-2.5" data-bank-assign>
                <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#34D399]">[ + ASIGNAR A COMIDA · {plan.profile.name.toUpperCase()} ]</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <select value={day} onChange={(e) => { setDay(e.target.value as 'on' | 'off'); setMealId(''); }} className="rounded-md border border-line bg-carbon px-2 py-1.5 text-[12.5px] text-ink" data-bank-day>
                    <option value="on">Día de entreno</option>
                    <option value="off">Día de descanso</option>
                  </select>
                  <select value={meal?.id ?? ''} onChange={(e) => setMealId(e.target.value)} className="rounded-md border border-line bg-carbon px-2 py-1.5 text-[12.5px] text-ink" data-bank-meal>
                    {dayMeals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.time} · {m.name}
                        {m.day === 'both' ? ` (${DAY_LABEL.both})` : ''}
                      </option>
                    ))}
                  </select>
                  <select value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'alt' | 'triple')} className="rounded-md border border-line bg-carbon px-2 py-1.5 text-[12.5px] text-ink" data-bank-mode>
                    <option value="triple">Opción 1 + 2 variantes (3 opciones)</option>
                    <option value="replace">Sólo Opción 1 (principal)</option>
                    <option value="alt">Alternativa</option>
                  </select>
                </div>
                {preview ? (
                  <div className="mt-2 text-[12px] text-steel" data-bank-preview>
                    <b className="text-ink">{preview.title}</b>
                    <div className="mt-0.5">{preview.items.map((i) => `${i.grams} g ${FOOD_BY_ID[i.foodId ?? '']?.name.split(' (')[0].toLowerCase() ?? i.food}`).join(' + ')}</div>
                    <div className="mt-0.5 font-mono text-[11px]">
                      {kc(totalsOf(preview.items))} kcal · P {r1(totalsOf(preview.items).p)} · C {r1(totalsOf(preview.items).c)} · G {r1(totalsOf(preview.items).f)}
                      {meal && <span className="text-mute"> · la comida hoy: {kc(totalsOf(meal.items))} kcal</span>}
                    </div>
                    {meal && totalsOf(meal.items).kcal > 0 && Math.abs(totalsOf(preview.items).kcal / totalsOf(meal.items).kcal - 1) > 0.25 && (
                      <div className="mt-0.5 text-[11.5px] text-gold" data-bank-kcal-warn>
                        Ojo: queda {totalsOf(preview.items).kcal > totalsOf(meal.items).kcal ? 'por encima' : 'por debajo'} de lo que pide esta comida (es un plato pensado para otra toma). Revisá el cierre del día.
                      </div>
                    )}
                    {triple.length > 1 && (
                      <ol className="mt-1.5 space-y-0.5 border-l-2 border-[#22C55E]/50 pl-2 text-[11.5px]" data-bank-triple>
                        {triple.map((o, k) => (
                          <li key={k}>
                            <b className="text-ink">{k === 0 ? 'Opción 1' : `Opción ${k + 1}`}:</b> {o.title} <span className="font-mono text-mute">· {kc(totalsOf(o.items))} kcal · P {r1(totalsOf(o.items).p)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {partner && <div className="mt-0.5 text-[11.5px] text-cyan-hud">Se copia a {partner.profile.name} con sus propios gramos.</div>}
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-gold">{meal ? 'No apto para las restricciones de este alumno.' : 'Este día no tiene comidas.'}</p>
                )}
                <button
                  type="button"
                  disabled={!preview || !meal}
                  data-bank-confirm
                  onClick={() => meal && (mode === 'triple' ? assignTriple(meal.id, cur.src) : assignFromBank(meal.id, cur.src, mode)) && setMsg(`✓ Asignado a ${meal.name} (${DAY_LABEL[meal.day]}) como ${mode === 'triple' ? `opción 1 + ${triple.length - 1} variantes equivalentes` : mode === 'replace' ? 'opción 1' : 'alternativa'}${partner ? `; ${partner.profile.name} lo recibió con sus gramos` : ''}.`)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#10B981] px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Confirmar asignación
                </button>
                {msg && <p className="mt-1.5 text-[12px] text-[#34D399]" data-bank-msg>{msg}</p>}
              </div>
            </>
          )}
        </div>
      </div>
      {editing && <FoodModal initial={editing} onClose={() => { setEditing(null); }} />}
    </div>
  );
}
