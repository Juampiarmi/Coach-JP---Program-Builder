'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ExternalLink, ShieldAlert, X, Zap } from 'lucide-react';
import { fmt0, fmt1 } from '@/lib/bioenergetics';
import { doiUrl } from '@/lib/evidence';
import { houseMeasure } from '@/lib/household';
import type { FoodItem, Meal, MealOption } from '@/lib/types';
import { cx } from '../hud/primitives';

export interface PreviewData {
  /** "Hipertrofia · Mujer activa · Estándar", "Plantilla: Volumen CrossFit", "Plan de Juan". */
  title: string;
  /** Para quién quedó escalado: "Ana · 58 kg · entrena 18:00". */
  scaledFor: string;
  rationale?: string;
  evidence?: { label: string; doi?: string }[];
  /** Avisos fijos (Sin TACC, plan de otro sexo, etc.). */
  warnings?: string[];
  meals: Meal[];
  target?: { on: { kcal: number; p: number; c: number; f: number }; off: { kcal: number; p: number; c: number; f: number } };
  onApply: () => void;
}

const tot = (items: FoodItem[]) => {
  const t = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { p: 0, c: 0, f: 0 });
  return { ...t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
};

/**
 * Vista previa completa antes de aplicar: día de entreno y de descanso lado a lado, con las porciones ya escaladas
 * al alumno activo, todas las opciones de cada comida y el total del día contra su meta.
 */
export function PlanPreviewModal({ data, onClose }: { data: PreviewData; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:items-start sm:p-6" role="dialog" aria-modal="true" aria-label={`Vista previa: ${data.title}`} onClick={onClose}>
      <div className="max-h-[94dvh] w-full max-w-6xl overflow-y-auto rounded-t-2xl border border-line bg-panel shadow-2xl sm:max-h-none sm:overflow-visible sm:rounded-2xl" onClick={(e) => e.stopPropagation()} data-plan-preview>
        <div className="sticky top-0 z-10 flex flex-wrap items-start gap-3 rounded-t-2xl border-b border-line bg-panel/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-fire">VISTA PREVIA · TODAVÍA NO SE APLICÓ</div>
            <div className="mt-1 text-[18px] font-bold leading-tight text-ink">{data.title}</div>
            <div className="mt-0.5 text-[12.5px] text-steel">Porciones escaladas para {data.scaledFor}</div>
          </div>
          <button onClick={data.onApply} className="flex items-center gap-2 rounded-xl bg-fire px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_30px_-12px_rgba(249,115,22,.9)] hover:bg-fire-hot">
            <Zap className="h-4 w-4" /> Aplicar a este alumno
          </button>
          <button onClick={onClose} className="rounded-md p-2 text-mute hover:text-ink" aria-label="Cerrar vista previa">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {data.rationale && <p className="text-[13px] text-steel">{data.rationale}</p>}
          {!!data.evidence?.length && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {data.evidence.map((e) =>
                e.doi ? (
                  <a key={e.label} href={doiUrl(e.doi)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-hud hover:underline">
                    {e.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span key={e.label} className="text-mute">
                    {e.label}
                  </span>
                ),
              )}
            </div>
          )}
          {data.warnings?.map((w) => (
            <div key={w} className="flex gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[12.5px] text-[#FDE68A]">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" /> {w}
            </div>
          ))}
          <p className="text-[12px] text-mute">Al aplicarlo se reemplazan las comidas y los macros del alumno. Perfil, suplementos y anamnesis se mantienen, y podés deshacerlo con Ctrl+Z.</p>

          <div className="grid gap-4 lg:grid-cols-2">
            {(['on', 'off'] as const).map((day) => {
              const meals = data.meals.filter((m) => m.day === day || m.day === 'both');
              const t = tot(meals.flatMap((m) => m.items));
              const goal = data.target?.[day];
              return (
                <section key={day} className={cx('rounded-xl border p-3', day === 'on' ? 'border-fire/30 bg-fire/[0.03]' : 'border-cyan-hud/25 bg-cyan-hud/[0.03]')}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className={cx('font-mono text-[11px] font-bold tracking-[0.16em]', day === 'on' ? 'text-fire' : 'text-cyan-hud')}>{day === 'on' ? 'DÍA DE ENTRENO' : 'DÍA DE DESCANSO'}</h3>
                    <span className="tnum text-[12px] text-steel">
                      <b className="text-ink">{fmt0(t.kcal)} kcal</b>
                      {goal && <span className="text-mute"> / meta {fmt0(goal.kcal)}</span>} · P {fmt0(t.p)} · C {fmt0(t.c)} · G {fmt0(t.f)} g
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {meals.length === 0 && <p className="text-[12.5px] text-mute">Sin comidas para este día.</p>}
                    {meals.map((m) => (
                      <MealPreview key={m.id} name={m.name} time={m.time} options={[{ title: m.title ?? m.name, items: m.items }, ...(m.alts ?? [])]} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Una comida en la vista previa: horario, nombre, plato y todas sus opciones al desplegarla. */
export function MealPreview({ name, time, options }: { name: string; time: string; options: MealOption[] }) {
  const [open, setOpen] = useState(false);
  const t0 = tot(options[0].items);
  return (
    <div className="rounded-lg border border-line bg-carbon/40">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left" aria-expanded={open}>
        <span className="tnum w-12 flex-none font-mono text-[12px] text-cyan-hud">{time}</span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13.5px] text-ink">{name}</b>
          <span className="block truncate text-[12px] text-steel">{options[0].title}</span>
        </span>
        <span className="tnum flex-none text-right text-[11.5px] text-steel">
          {fmt0(t0.kcal)} kcal
          <br />
          {options.length} {options.length === 1 ? 'opción' : 'opciones'}
        </span>
        <ChevronDown className={cx('h-4 w-4 flex-none text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {!open && (
        <div className="-mt-1 px-3 pb-2.5 pl-[72px] text-[11.5px] text-mute">
          {options[0].items.map((it) => `${fmt0(it.grams)} g ${it.food.split(' (')[0].toLowerCase()}`).join(' · ')}
        </div>
      )}
      {open && (
        <ol className="space-y-2 border-t border-line px-3 py-3">
          {options.map((o, i) => {
            const t = tot(o.items);
            return (
              <li key={i} className="rounded-md border border-line/70 p-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cx('text-[11px] font-bold', i === 0 ? 'text-cyan-hud' : 'text-fire')}>Opción {i + 1}</span>
                  <b className="text-[13px] text-ink">{o.title}</b>
                  {i === 0 && <Check className="h-3.5 w-3.5 text-cyan-hud" />}
                </div>
                <div className="tnum mt-0.5 text-[11.5px] text-mute">
                  {fmt0(t.kcal)} kcal · Proteínas {fmt0(t.p)} g · Carbos {fmt0(t.c)} g · Grasas {fmt0(t.f)} g
                </div>
                <ul className="mt-1.5 grid gap-x-4 gap-y-0.5 text-[12.5px] text-steel sm:grid-cols-2">
                  {o.items.map((it) => (
                    <li key={it.id}>
                      <b className="tnum text-ink">{fmt0(it.grams)} g</b> {it.food} <span className="text-mute">{houseMeasure(it.foodId, it.grams)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export const scaledLabel = (name: string, kg: number, time: string) => `${name} · ${fmt1(kg)} kg · entrena ${time || '18:00'}`;
