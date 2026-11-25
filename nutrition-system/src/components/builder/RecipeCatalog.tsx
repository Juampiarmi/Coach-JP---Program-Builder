'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Plus, Replace } from 'lucide-react';
import { CAT_LABEL, CATALOG, type CatCategory, type CatComplexity, catalogRecipe } from '@/lib/catalog';
import { catalogDishForMeal, ROLES_OF_CATEGORY, variantFor } from '@/lib/planBank';
import { FOOD_BY_ID } from '@/lib/foods';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Panel } from '../hud/primitives';

const VARIANT_LABEL = { std: 'Estándar', stacc: 'Sin TACC', veg: 'Vegetariana' } as const;
const DAY = { on: 'Entreno', off: 'Descanso', both: 'Ambos días' } as const;
const short = (id?: string) => (id ? FOOD_BY_ID[id]?.name.split(' (')[0].toLowerCase() : '') ?? '';

/**
 * RECETARIO COACH JP: 55+ preparaciones con filtro estricto por la variante del alumno (celíaco → Sin TACC,
 * vegetariano → Vegetariana) y sus alergias. Cada plato se aplica a una comida como opción 1 o como alternativa,
 * escalado a lo que aporta esa comida (topes, pisos, huevos enteros); en Modo Parejas se copia con los gramos de la
 * pareja y la lista de compras se recalcula sola.
 */
export function RecipeCatalog() {
  const plan = usePlanStore((s) => s.plan);
  const applyCatalogDish = usePlanStore((s) => s.applyCatalogDish);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<CatCategory | 'all'>('all');
  const [cx2, setCx] = useState<CatComplexity | 'all'>('all');
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const variant = variantFor(plan);
  const sorted = [...plan.meals].sort((a, b) => (a.day === b.day ? a.time.localeCompare(b.time) : a.day.localeCompare(b.day)));
  const list = useMemo(
    () =>
      CATALOG.filter(
        (d) =>
          (cat === 'all' || d.category === cat) &&
          (cx2 === 'all' || d.complexity === cx2) &&
          !!catalogRecipe(d, variant) &&
          (!q.trim() || `${d.title} ${d.base.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [cat, cx2, q, variant],
  );
  return (
    <Panel title="RECETARIO COACH JP · DESAYUNOS, PRINCIPALES, MERIENDAS Y COLACIONES" block="opciones" right={<BookOpen className="h-4 w-4 text-[#34D399]/80" />}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-[13px] text-steel" data-catalog-toggle>
        <b className="text-ink">{CATALOG.length} platos</b> · variante del alumno: <b className="text-[#34D399]">{VARIANT_LABEL[variant]}</b> (sin lo que no puede comer) · se escalan a cada comida y a la pareja
        <ChevronDown className={cx('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3" data-catalog>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'desayuno', 'plato_principal', 'merienda', 'colacion'] as const).map((c) => (
              <button key={c} type="button" data-catalog-cat={c} onClick={() => setCat(c)} className={cx('rounded-md border px-2.5 py-1 text-[12px]', cat === c ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel')}>
                {c === 'all' ? 'Todos' : CAT_LABEL[c]} ({CATALOG.filter((d) => (c === 'all' || d.category === c) && catalogRecipe(d, variant)).length})
              </button>
            ))}
            {(['all', 'rapida', 'elaborada'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setCx(c)} className={cx('rounded-md border px-2.5 py-1 text-[12px]', cx2 === c ? 'border-gold bg-gold/10 text-ink' : 'border-line text-steel')}>
                {c === 'all' ? 'Rápidas y elaboradas' : c === 'rapida' ? 'Rápidas' : 'Elaboradas'}
              </button>
            ))}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plato o ingrediente…" className="min-w-[180px] flex-1 rounded-md border border-line bg-carbon px-2.5 py-1 text-[12.5px] text-ink" />
          </div>
          {msg && <p className="mt-2 text-[12.5px] text-[#34D399]">{msg}</p>}
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {list.map((d) => {
              const meals = sorted.filter((m) => ROLES_OF_CATEGORY[d.category].includes(m.role));
              const mealId = target[d.id] && meals.some((m) => m.id === target[d.id]) ? target[d.id] : meals[0]?.id;
              const meal = meals.find((m) => m.id === mealId);
              const preview = meal ? catalogDishForMeal(d.id, meal, plan) : null;
              return (
                <details key={d.id} className="rounded-lg border border-line bg-carbon/40 p-2.5" data-catalog-dish={d.id}>
                  <summary className="cursor-pointer list-none">
                    <div className="text-[13.5px] font-semibold text-ink">{d.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded border border-cyan-hud/40 px-1.5 text-[10.5px] text-cyan-hud">{CAT_LABEL[d.category]}</span>
                      <span className="rounded border border-gold/40 px-1.5 text-[10.5px] text-gold">{d.complexity === 'rapida' ? 'Rápida' : 'Elaborada'}</span>
                      {d.variants.map((v) => (
                        <span key={v} className="rounded border border-line px-1.5 text-[10.5px] text-steel">
                          {v === 'Estandar' ? 'Estándar' : v}
                        </span>
                      ))}
                    </div>
                  </summary>
                  <div className="mt-2 space-y-1.5 text-[12px] text-steel">
                    <p>
                      <b className="text-ink">Ingredientes base:</b> {d.base.join(', ')}.
                    </p>
                    <p>
                      <b className="text-ink">Preparación:</b> {d.prep}
                    </p>
                    <p>
                      <b className="text-ink">Ajuste de porciones:</b> {d.adjust}
                    </p>
                    {meals.length ? (
                      <div className="rounded-md border border-line p-2">
                        <select value={mealId} onChange={(e) => setTarget({ ...target, [d.id]: e.target.value })} className="w-full rounded-md border border-line bg-carbon px-2 py-1 text-[12px] text-ink" data-catalog-meal>
                          {meals.map((m) => (
                            <option key={m.id} value={m.id}>
                              {DAY[m.day]} · {m.time} · {m.name}
                            </option>
                          ))}
                        </select>
                        {preview ? (
                          <p className="mt-1.5 text-[11.5px]" data-catalog-preview>
                            <b className="text-ink">{preview.title}</b> · {preview.items.map((i) => `${i.grams} g ${short(i.foodId)}`).join(' + ')} · {Math.round(preview.items.reduce((a, i) => a + i.p * 4 + i.c * 4 + i.f * 9, 0))} kcal
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11.5px] text-gold">No apto para las restricciones de este alumno.</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={!preview}
                            data-catalog-replace
                            onClick={() => mealId && applyCatalogDish(mealId, d.id, 'replace') && setMsg(`✓ «${d.title}» es ahora la opción 1 de ${meal?.name}. La lista de compras ya se actualizó${plan.partnerId ? ' (y la pareja recibió el plato con sus gramos)' : ''}.`)}
                            className="flex items-center gap-1 rounded-md border border-[#34D399]/60 px-2 py-1 font-semibold text-[#34D399] hover:bg-[#34D399]/10 disabled:opacity-40"
                          >
                            <Replace className="h-3.5 w-3.5" /> Usar como opción 1
                          </button>
                          <button
                            type="button"
                            disabled={!preview}
                            data-catalog-alt
                            onClick={() => mealId && applyCatalogDish(mealId, d.id, 'alt') && setMsg(`✓ «${d.title}» se sumó como opción de ${meal?.name}.`)}
                            className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-steel hover:text-ink disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" /> Sumar como opción
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11.5px] text-mute">El plan no tiene una comida de este tipo.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
