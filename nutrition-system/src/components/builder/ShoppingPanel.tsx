'use client';

import { useState } from 'react';
import { ChevronDown, ShoppingCart } from 'lucide-react';
import { kg, shoppingText, weeklyShopping } from '@/lib/shopping';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Panel } from '../hud/primitives';

/**
 * LISTA DE COMPRAS DINÁMICA del Builder: se recalcula en cada render con las comidas del plan. Elegir, reemplazar o
 * quitar un plato (o cambiar el peso del alumno) la actualiza al instante, agrupada por rubro. En Modo Parejas,
 * opción de sumar lo de los dos.
 */
export function ShoppingPanel() {
  const plan = usePlanStore((s) => s.plan);
  const roster = usePlanStore((s) => s.roster);
  const [open, setOpen] = useState(false);
  const [couple, setCouple] = useState(true);
  const partner = plan.partnerId && roster[plan.partnerId]?.partnerId === plan.id ? roster[plan.partnerId] : undefined;
  const both = !!partner && couple;
  const groups = open ? weeklyShopping(both ? [plan, partner!] : [plan]) : [];
  const first = (n: string) => n.split(' ')[0];
  return (
    <Panel title="LISTA DE COMPRAS SEMANAL · SE ACTUALIZA SOLA" block="opciones" right={<ShoppingCart className="h-4 w-4 text-cyan-hud/80" />}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-[13px] text-steel" data-shop-toggle>
        Suma los ingredientes ya escalados de las comidas elegidas (7 días), carnes en crudo y secos en paquete, agrupados por rubro.
        <ChevronDown className={cx('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3" data-shop-list>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {partner && (
              <label className="flex items-center gap-1.5 text-[12.5px] text-steel">
                <input type="checkbox" checked={couple} onChange={(e) => setCouple(e.target.checked)} /> Pareja: {first(plan.profile.name)} + {first(partner.profile.name)}
              </label>
            )}
            <button
              type="button"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shoppingText(`LISTA DE COMPRAS · ${plan.profile.name}${both ? ` + ${partner!.profile.name}` : ''}`, groups))}`, '_blank')}
              className="ml-auto rounded-md border border-line px-2 py-1 text-[12px] text-steel hover:text-ink"
            >
              📲 Mandar por WhatsApp
            </button>
          </div>
          {groups.map((g) => (
            <div key={g.cat} className="mb-2" data-shop-cat={g.cat}>
              <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-cyan-hud">{g.cat.toUpperCase()}</div>
              <table className="tnum w-full text-[12.5px]">
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.key} className="border-t border-line/60" data-shop-row={r.key}>
                      <td className="py-1 pr-2 text-ink">
                        {r.name}
                        {r.note && <span className="text-mute"> ({r.note})</span>}
                      </td>
                      <td className="py-1 pr-2 font-semibold text-ink">{kg(r.grams)}</td>
                      <td className="py-1 text-[11.5px] text-mute">
                        {r.hint}
                        {both && ` · ${kg(r.by[0])} + ${kg(r.by[1])}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
