'use client';

import { useState } from 'react';
import { ChevronDown, ShoppingBasket } from 'lucide-react';
import { sanitizeAnamnesis } from '@/lib/anamnesisPro';
import { BRAND_CATEGORIES, BRAND_CATEGORY_LABEL, brandLabel, portionLabel, type BrandFood } from '@/lib/foodBrandDb';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx } from '../hud/primitives';

const quick = (b: BrandFood) => (b.prep_min ?? 0) < 10;

/**
 * Canasta de alimentos permitidos del atleta: matriz de la Food & Brand DB con checkboxes.
 * La IA usa ÚNICAMENTE lo tildado (null = sin canasta, usa todo lo habilitado para IA).
 */
export function BasketMatrix() {
  const items = useFoodDbStore((s) => s.items);
  const plan = usePlanStore((s) => s.plan);
  const setAnamnesis = usePlanStore((s) => s.setAnamnesis);
  const basket = sanitizeAnamnesis(plan.anamnesis).basket;
  const usable = items.filter((b) => b.disponible_para_ia);
  const selected = new Set(basket ?? usable.map((b) => b.id));
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const setSel = (ids: Iterable<string>) => setAnamnesis({ basket: [...new Set(ids)] });
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSel(next);
  };
  const current = usable.filter((b) => selected.has(b.id));
  const actions: { label: string; run: () => void; title: string }[] = [
    { label: 'Seleccionar Todo', run: () => setSel(usable.map((b) => b.id)), title: 'Tilda todo el catálogo habilitado para IA' },
    { label: 'Solo Marcas Locales', run: () => setSel(usable.filter((b) => b.es_marca_local).map((b) => b.id)), title: 'Deja tildadas sólo las marcas locales' },
    { label: 'Preparación < 10 min', run: () => setSel(current.filter(quick).map((b) => b.id)), title: 'Quita de la canasta lo que lleva 10 min o más' },
    { label: 'Sin Lactosa', run: () => setSel(current.filter((b) => !b.lactosa).map((b) => b.id)), title: 'Quita de la canasta todo lo que contiene lactosa' },
  ];

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        <ShoppingBasket className="h-4 w-4 text-cyan-hud" />
        <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink">[ CANASTA DE ALIMENTOS PERMITIDOS ]</span>
        <span
          className={cx(
            'ml-auto rounded border px-1.5 py-0.5 font-mono text-[9.5px]',
            basket ? 'border-fire/40 bg-fire/10 text-fire' : 'border-cyan-hud/25 bg-cyan-hud/10 text-cyan-hud',
          )}
        >
          {basket ? `${current.length} / ${usable.length} TILDADOS · IA USA SÓLO ESTOS` : `SIN CANASTA · IA USA LOS ${usable.length}`}
        </span>
      </div>
      <div className="border-t border-line px-4 pb-4 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              title={a.title}
              onClick={a.run}
              className="rounded-md border border-cyan-hud/30 bg-cyan-hud/10 px-2.5 py-1.5 font-mono text-[10.5px] font-bold text-cyan-hud transition hover:border-cyan-hud"
            >
              [ {a.label} ]
            </button>
          ))}
          {basket && (
            <button
              type="button"
              onClick={() => setAnamnesis({ basket: null })}
              className="rounded-md border border-line px-2.5 py-1.5 font-mono text-[10.5px] text-mute hover:text-ink"
            >
              Quitar canasta (usar todo)
            </button>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          {BRAND_CATEGORIES.map((c) => {
            const rows = items.filter((b) => b.categoria === c);
            if (!rows.length) return null;
            const okRows = rows.filter((b) => b.disponible_para_ia);
            const on = okRows.filter((b) => selected.has(b.id)).length;
            const isOpen = open[c] ?? false;
            const all = on === okRows.length && okRows.length > 0;
            return (
              <div key={c} className="rounded-lg border border-line bg-carbon">
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Toda la categoría ${BRAND_CATEGORY_LABEL[c]}`}
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = on > 0 && !all;
                    }}
                    onChange={() => {
                      const next = new Set(selected);
                      okRows.forEach((b) => (all ? next.delete(b.id) : next.add(b.id)));
                      setSel(next);
                    }}
                    className="h-4 w-4 accent-[#38BDF8]"
                  />
                  <button type="button" onClick={() => setOpen((o) => ({ ...o, [c]: !isOpen }))} className="flex flex-1 items-center gap-2 text-left">
                    <span className="text-[13px] font-semibold text-ink">{BRAND_CATEGORY_LABEL[c]}</span>
                    <span className="tnum font-mono text-[10px] text-mute">
                      {on}/{okRows.length}
                    </span>
                    <ChevronDown className={cx('ml-auto h-4 w-4 text-mute transition-transform', isOpen && 'rotate-180')} />
                  </button>
                </div>
                {isOpen && (
                  <div className="grid gap-x-4 gap-y-1 border-t border-line px-3 py-2 sm:grid-cols-2">
                    {rows.map((b) => (
                      <label key={b.id} className={cx('flex cursor-pointer items-start gap-2 py-0.5', !b.disponible_para_ia && 'cursor-not-allowed opacity-45')}>
                        <input
                          type="checkbox"
                          disabled={!b.disponible_para_ia}
                          checked={b.disponible_para_ia && selected.has(b.id)}
                          onChange={() => toggle(b.id)}
                          className="mt-0.5 h-3.5 w-3.5 flex-none accent-[#38BDF8]"
                        />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] leading-tight text-ink">
                            {brandLabel(b)}
                            {b.flex && <span className="ml-1 font-mono text-[9px] text-fire">FLEX</span>}
                          </span>
                          <span className="tnum block font-mono text-[9.5px] text-mute">
                            {portionLabel(b)} · {b.macros_por_porcion.kcal} kcal{quick(b) ? ' · < 10 min' : ` · ${b.prep_min} min`}
                            {b.lactosa ? ' · lactosa' : ''}
                            {!b.disponible_para_ia ? ' · IA OFF en la DB' : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
