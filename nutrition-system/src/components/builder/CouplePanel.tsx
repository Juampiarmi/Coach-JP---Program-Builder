'use client';

import { useState } from 'react';
import { Heart, RefreshCw, Send, ShoppingCart, Unlink, UserPlus } from 'lucide-react';
import { cloudConfigured } from '@/lib/cloud/config';
import { coupleShopping, coupleShopText, kgText, pairMeals, partnerOutOfSync } from '@/lib/couple';
import { FOOD_BY_ID } from '@/lib/foods';
import type { AthletePlan, FoodItem } from '@/lib/types';
import { useCloudStore } from '@/store/useCloudStore';
import { listAthletes, usePlanStore } from '@/store/usePlanStore';
import { cx, Panel, Segmented } from '../hud/primitives';

const who = (p: AthletePlan) => `${p.profile.sex === 'F' ? 'Ella' : 'Él'} · ${p.profile.name.split(' ')[0]}`;
const itemsText = (xs: FoodItem[]) =>
  xs
    .filter((i) => i.grams > 0)
    .map((i) => `${i.grams} g ${(i.foodId ? FOOD_BY_ID[i.foodId]?.name.split(' (')[0] : i.food)?.toLowerCase()}`)
    .join(' + ');

/**
 * MODO PAREJAS: dos alumnos que cocinan lo mismo. Mismas comidas, recetas y opciones; cada uno con sus gramos (sexo,
 * peso, objetivo, alergias). Vista lado a lado por plato, links individuales en un clic y lista de compras combinada.
 */
export function CouplePanel() {
  const state = usePlanStore();
  const { plan, roster, linkPartner, createPartner, pushMenuToPartner, pullMenuFromPartner, selectAthlete } = state;
  const publish = useCloudStore((s) => s.publish);
  const user = useCloudStore((s) => s.user);
  const [pick, setPick] = useState('');
  const [day, setDay] = useState<'on' | 'off'>('on');
  const [shop, setShop] = useState(false);
  const [msg, setMsg] = useState('');
  const partner = plan.partnerId && roster[plan.partnerId]?.partnerId === plan.id ? roster[plan.partnerId] : undefined;
  const others = listAthletes(state).filter((a) => a.id !== plan.id);

  if (!partner) {
    return (
      <Panel title="MODO PAREJAS · MISMA COMIDA, GRAMOS DE CADA UNO" block="opciones" right={<Heart className="h-4 w-4 text-fire/80" />}>
        <p className="-mt-1 text-[13px] text-steel">
          Para alumnos que conviven y cocinan lo mismo: comparten las comidas, recetas y opciones de este plan y el motor calcula los gramos de cada uno según su sexo, peso, objetivo y alergias.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2" data-couple-setup>
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-[220px] rounded-lg border border-line bg-carbon px-3 py-2 text-[13px] text-ink" data-couple-pick>
            <option value="">Elegir a la otra persona…</option>
            {others.map((a) => (
              <option key={a.id} value={a.id}>
                {a.profile.name} · {a.profile.sex === 'F' ? 'mujer' : 'hombre'} · {a.profile.weightKg} kg
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pick}
            onClick={() => {
              const o = roster[pick];
              if (o && window.confirm(`El menú de ${o.profile.name} pasa a ser el de este plan (con sus propios gramos). ¿Seguimos?`)) linkPartner(pick);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-fire/60 px-3 py-2 text-[12.5px] font-semibold text-fire hover:bg-fire/10 disabled:opacity-40"
            data-couple-link
          >
            <Heart className="h-4 w-4" /> Vincular y planificar en pareja
          </button>
          <button type="button" onClick={createPartner} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-steel hover:text-ink" data-couple-create>
            <UserPlus className="h-4 w-4" /> Crear Persona B
          </button>
        </div>
      </Panel>
    );
  }

  const isLead = !plan.partnerSyncAt;
  const lead = isLead ? plan : partner;
  const mirror = isLead ? partner : plan;
  const stale = partnerOutOfSync(lead, mirror);
  const rows = pairMeals(lead, mirror).filter(({ lead: m }) => m.day === day || m.day === 'both');
  const shopRows = shop ? coupleShopping(lead, mirror) : [];

  const publishBoth = async () => {
    setMsg('Publicando los dos planes…');
    const a = await publish('Modo Parejas', plan);
    const b = a !== null ? await publish('Modo Parejas', partner) : null;
    setMsg(a !== null && b !== null ? `✓ Publicados: ${plan.profile.name.split(' ')[0]} (versión ${a}) y ${partner.profile.name.split(' ')[0]} (versión ${b}). Cada uno usa su propio link.` : useCloudStore.getState().error || 'No se pudo publicar: revisá la conexión.');
  };

  return (
    <Panel title="MODO PAREJAS · MISMA COMIDA, GRAMOS DE CADA UNO" block="opciones" right={<Heart className="h-4 w-4 text-fire/80" />}>
      <div className="flex flex-wrap items-center gap-2" data-couple-linked>
        <span className="text-[13.5px] text-ink">
          <b>{lead.profile.name}</b> <span className="text-mute">+</span> <b>{mirror.profile.name}</b>
        </span>
        <span className="text-[12px] text-mute">· menú de {lead.profile.name.split(' ')[0]}, gramos de cada uno · se sincroniza solo</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button type="button" onClick={() => selectAthlete(partner.id)} className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-steel hover:text-ink">
            Abrir a {partner.profile.name.split(' ')[0]}
          </button>
          <button type="button" onClick={() => window.confirm('¿Desvincular a la pareja? Cada plan queda como está.') && linkPartner(null)} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-steel hover:text-ink">
            <Unlink className="h-3.5 w-3.5" /> Desvincular
          </button>
        </div>
      </div>
      {stale && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[12.5px] text-[#FDE68A]" data-couple-stale>
          {isLead ? `Cambiaste el menú: ${partner.profile.name.split(' ')[0]} todavía tiene el anterior.` : `${partner.profile.name.split(' ')[0]} cambió el menú: tus gramos son del anterior.`}
          <button type="button" onClick={isLead ? pushMenuToPartner : pullMenuFromPartner} className="flex items-center gap-1 rounded-md border border-gold/60 px-2 py-1 font-semibold hover:bg-gold/10" data-couple-sync>
            <RefreshCw className="h-3.5 w-3.5" /> {isLead ? `Pasar el menú a ${partner.profile.name.split(' ')[0]}` : 'Recalcular mis gramos'}
          </button>
        </div>
      )}
      {!isLead && !stale && (
        <p className="mt-2 text-[12px] text-mute">
          Este plan es el espejo del de {partner.profile.name.split(' ')[0]}: si cambiás el peso, el objetivo o las restricciones, las porciones se recalculan solas (
          <button type="button" className="text-cyan-hud underline" onClick={pullMenuFromPartner}>
            recalcular ahora
          </button>
          ). Para que este menú sea el de los dos,{' '}
          <button type="button" className="text-cyan-hud underline" onClick={pushMenuToPartner}>
            pasarlo a {partner.profile.name.split(' ')[0]}
          </button>
          .
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Segmented value={day} onChange={setDay} size="sm" options={[{ value: 'on', label: 'Entreno' }, { value: 'off', label: 'Descanso' }]} />
        </div>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="tnum w-full text-[12.5px] sm:min-w-[560px]" data-couple-table>
          <thead className="max-sm:hidden">
            <tr className="text-left font-mono text-[10px] tracking-[0.12em] text-mute">
              <th className="py-1.5 font-normal">PLATO</th>
              <th className="py-1.5 font-normal">{who(lead).toUpperCase()}</th>
              <th className="py-1.5 font-normal">{who(mirror).toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lead: a, partner: b }) => (
              <tr key={a.id} className="border-t border-line align-top max-sm:block max-sm:py-2">
                <td className="py-2 pr-3 max-sm:block max-sm:py-0.5">
                  <div className="font-mono text-[11px] text-mute">
                    {a.time} · {a.name}
                  </div>
                  <div className="font-semibold text-ink">{a.title || '—'}</div>
                </td>
                <td className="py-2 pr-3 text-steel max-sm:block max-sm:py-0.5">
                  <b className="mr-1 font-mono text-[10px] text-cyan-hud sm:hidden">{who(lead).toUpperCase()}:</b>
                  {itemsText(a.items)}
                </td>
                <td className={cx('py-2 text-steel max-sm:block max-sm:py-0.5', !b && 'text-mute')}>
                  <b className="mr-1 font-mono text-[10px] text-[#F472B6] sm:hidden">{who(mirror).toUpperCase()}:</b>
                  {b ? itemsText(b.items) : 'Sin copiar todavía'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {cloudConfigured && user && (
          <button type="button" onClick={publishBoth} className="flex items-center gap-1.5 rounded-lg bg-fire px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-fire/90" data-couple-publish>
            <Send className="h-4 w-4" /> Publicar los dos links
          </button>
        )}
        <button type="button" onClick={() => setShop(!shop)} className="flex items-center gap-1.5 rounded-lg border border-cyan-hud/50 px-3 py-2 text-[12.5px] font-semibold text-cyan-hud hover:bg-cyan-hud/10" data-couple-shop>
          <ShoppingCart className="h-4 w-4" /> Lista de compras de la pareja
        </button>
      </div>
      {msg && <p className="mt-2 text-[12.5px] text-steel">{msg}</p>}
      {shop && (
        <div className="mt-3 rounded-lg border border-line p-3" data-couple-shoplist>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-steel">Totales para 7 días ({lead.profile.name.split(' ')[0]} + {mirror.profile.name.split(' ')[0]}) · carnes en crudo, arroz y fideos en seco.</span>
            <button
              type="button"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(coupleShopText(lead, mirror))}`, '_blank')}
              className="ml-auto rounded-md border border-line px-2 py-1 text-[12px] text-steel hover:text-ink"
            >
              📲 Mandar por WhatsApp
            </button>
          </div>
          <table className="tnum w-full text-[12.5px]">
            <tbody>
              {shopRows.map((r) => (
                <tr key={r.key} className="border-t border-line/60">
                  <td className="py-1.5 pr-2 text-ink">
                    {r.name}
                    {r.note && <span className="text-mute"> ({r.note})</span>}
                  </td>
                  <td className="py-1.5 pr-2 font-semibold text-ink">
                    {kgText(r.total)} {r.hint && <span className="font-normal text-mute">{r.hint}</span>}
                  </td>
                  <td className="py-1.5 text-[11.5px] text-mute">
                    {kgText(r.a)} + {kgText(r.b)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
