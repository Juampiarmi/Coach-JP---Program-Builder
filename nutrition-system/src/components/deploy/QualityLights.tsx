'use client';

import { useState } from 'react';
import { ChevronDown, ShieldAlert, ShieldCheck, Wand2 } from 'lucide-react';
import { qualityChecks, type Light } from '@/lib/quality';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Panel } from '../hud/primitives';

const DOT: Record<Light, string> = { ok: 'bg-[#22C55E]', warn: 'bg-gold', bad: 'bg-fire', block: 'bg-danger' };
const TXT: Record<Light, string> = { ok: 'text-[#4ADE80]', warn: 'text-gold', bad: 'text-fire', block: 'text-danger' };
const TAG: Record<Light, string> = { ok: 'OK', warn: 'REVISAR', bad: 'ATENCIÓN', block: 'BLOQUEA' };

/**
 * Semáforo de calidad antes de publicar: alergias, cena al final, horarios, calorías, proteína, energía disponible,
 * opciones por comida, porciones y proteína por comida. Las alergias bloquean la publicación (con corrección en un toque).
 */
export function QualityLights() {
  const plan = usePlanStore((s) => s.plan);
  const fixAllergens = usePlanStore((s) => s.fixAllergens);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const checks = qualityChecks(plan);
  const blocked = checks.some((c) => c.status === 'block');
  const warns = checks.filter((c) => c.status === 'warn' || c.status === 'bad').length;
  return (
    <Panel
      block="publicacion"
      tone={blocked ? 'danger' : 'gold'}
      title="SEMÁFORO DE CALIDAD · ANTES DE PUBLICAR"
      right={blocked ? <ShieldAlert className="h-4 w-4 text-danger" /> : <ShieldCheck className="h-4 w-4 text-[#4ADE80]" />}
    >
      <div data-quality={blocked ? 'blocked' : 'ok'} className={cx('-mt-1 mb-3 rounded-lg px-3 py-2 text-[13px] font-semibold', blocked ? 'border border-danger/50 bg-danger/10 text-[#FCA5A5]' : warns ? 'border border-gold/30 bg-gold/[0.06] text-[#FDE68A]' : 'border border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]')}>
        {blocked ? '⛔ Publicar está frenado: hay alérgenos declarados en el plan.' : warns ? `Listo para publicar · ${warns} punto${warns > 1 ? 's' : ''} para revisar (no bloquean).` : '✓ Todo en verde: listo para publicar.'}
      </div>
      <ul className="space-y-1">
        {checks.map((c) => {
          const expandable = !!c.where?.length;
          const isOpen = open === c.id || (c.status === 'block' && open !== `x${c.id}`);
          return (
            <li key={c.id} data-check={c.id} data-light={c.status} className="rounded-lg border border-line bg-carbon/40">
              <button
                type="button"
                disabled={!expandable}
                onClick={() => setOpen(isOpen ? `x${c.id}` : c.id)}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left disabled:cursor-default"
                aria-expanded={expandable ? isOpen : undefined}
              >
                <span className={cx('mt-1.5 h-2.5 w-2.5 flex-none rounded-full', DOT[c.status])} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <b className="text-[13px] text-ink">{c.label}</b>
                    <span className={cx('font-mono text-[9.5px] font-bold tracking-[0.14em]', TXT[c.status])}>{TAG[c.status]}</span>
                  </span>
                  <span className="block text-[12px] text-steel">{c.detail}</span>
                </span>
                {expandable && <ChevronDown className={cx('mt-1 h-4 w-4 flex-none text-mute transition-transform', isOpen && 'rotate-180')} />}
              </button>
              {expandable && isOpen && (
                <ul className="space-y-0.5 border-t border-line px-3 py-2 pl-8 text-[12px] text-steel">
                  {c.where!.slice(0, 12).map((w) => (
                    <li key={w} className={c.status === 'block' ? 'text-[#FCA5A5]' : ''}>
                      • {w}
                    </li>
                  ))}
                  {c.where!.length > 12 && <li className="text-mute">… y {c.where!.length - 12} más</li>}
                </ul>
              )}
              {c.id === 'allergens' && c.status === 'block' && (
                <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
                  <button
                    type="button"
                    data-fix-allergens
                    onClick={() => {
                      const r = fixAllergens();
                      setMsg(r.left ? `Corregí ${r.fixed} opción(es). Quedan ${r.left} alimento(s) cargados a mano sin equivalente: cambialos en Comidas.` : `Listo: corregí ${r.fixed} opción(es) con equivalentes seguros.`);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-[12.5px] font-bold text-white hover:brightness-110"
                  >
                    <Wand2 className="h-4 w-4" /> Corregir automáticamente
                  </button>
                  <button type="button" onClick={() => setBuilderTab('meals')} className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-steel hover:text-ink">
                    Ir a Comidas
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {msg && <p className="mt-2 text-[12.5px] text-steel">{msg}</p>}
    </Panel>
  );
}
