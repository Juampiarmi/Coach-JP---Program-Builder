'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ExternalLink, ShieldAlert, Zap } from 'lucide-react';
import { fmt0, fmt1 } from '@/lib/bioenergetics';
import { doiUrl } from '@/lib/evidence';
import { houseMeasure } from '@/lib/household';
import {
  BANK_GOALS,
  BANK_PLAN_IDS,
  BANK_VARIANTS,
  buildBankPlan,
  goalOf,
  planLabel,
  planSummary,
  SEX_LABEL,
  SEX_RANGE,
  sexOf,
  trainingOf,
  STACC_WARNING,
  type BankGoal,
  type BankSelection,
  type BankVariant,
} from '@/lib/planBank';
import type { DayMode, FoodItem, MealOption, Sex } from '@/lib/types';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, Panel, Segmented } from '../hud/primitives';

const KCAL_RANGES = [
  { id: 'all', label: 'Todas', lo: 0, hi: Infinity },
  { id: '1400', label: '1.400–1.700', lo: 1400, hi: 1700 },
  { id: '1700', label: '1.700–2.100', lo: 1700, hi: 2100 },
  { id: '2000', label: '2.000–2.600', lo: 2000, hi: 2600 },
  { id: '2600', label: '2.600–3.200', lo: 2600, hi: 3200 },
  { id: '3200', label: 'Más de 3.200', lo: 3200, hi: Infinity },
] as const;
const REF_W: Record<Sex, number> = { F: 60, M: 80 };

const chip = (on: boolean) =>
  cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition', on ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel hover:border-cyan-hud/40 hover:text-ink');

const tot = (items: FoodItem[]) => {
  const t = items.reduce((a, i) => ({ p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { p: 0, c: 0, f: 0 });
  return { ...t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
};

/** Planes listos: banco de 24 planes maestros (8 perfiles × 3 variantes) con filtros y aplicación en 1 clic. */
export function TemplateBank() {
  const athlete = usePlanStore((s) => s.plan);
  const applyTemplate = usePlanStore((s) => s.applyTemplate);
  const celiac = (athlete.anamnesis?.allergies ?? []).includes('gluten');
  const [goal, setGoal] = useState<BankGoal | 'all'>('all');
  const [sex, setSex] = useState<Sex>(athlete.profile.sex);
  const [variant, setVariant] = useState<BankVariant>(celiac ? 'stacc' : 'std');
  const [range, setRange] = useState<(typeof KCAL_RANGES)[number]['id']>('all');
  const [picked, setPicked] = useState<BankSelection | null>(null);
  const [day, setDay] = useState<DayMode>('on');

  // Vista con el peso del alumno si el sexo coincide; si no, con un peso de referencia (al aplicar se recalcula).
  const sameSex = sex === athlete.profile.sex;
  const weight = sameSex ? athlete.profile.weightKg : REF_W[sex];
  const training = trainingOf(athlete.profile);
  const r = KCAL_RANGES.find((x) => x.id === range)!;

  const cards = useMemo(
    () =>
      BANK_PLAN_IDS.filter((id) => sexOf(id) === sex && (goal === 'all' || goalOf(id).id === goal))
        .map((id) => {
          const sel: BankSelection = { plan: id, variant };
          return { sel, sum: planSummary(sel, weight, training) };
        })
        .filter((c) => c.sum.kcal.on >= r.lo && c.sum.kcal.on < r.hi || (c.sum.kcal.off >= r.lo && c.sum.kcal.off < r.hi)),
    [sex, goal, variant, weight, training.start, training.end, r.lo, r.hi], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const current = picked && sexOf(picked.plan) === sex ? { ...picked, variant } : null;
  const preview = useMemo(() => (current ? buildBankPlan(current, weight, training) : null), [current?.plan, current?.variant, weight, training.start, training.end]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    if (!current) return;
    const sum = planSummary(current, athlete.profile.weightKg, training);
    const mismatch = sexOf(current.plan) !== athlete.profile.sex ? `\n\nOjo: es un plan de ${SEX_LABEL[sexOf(current.plan)].toLowerCase()} y ${athlete.profile.name} está cargado con el otro sexo.` : '';
    if (
      !window.confirm(
        `¿Aplicar "${planLabel(current)}" a ${athlete.profile.name}?\n\nSe reemplazan sus comidas y sus macros. Las porciones se calculan para ${fmt1(athlete.profile.weightKg)} kg: ${fmt0(sum.kcal.on)} kcal los días de entreno y ${fmt0(sum.kcal.off)} kcal los de descanso, sin superar nunca los topes por toma. Perfil, suplementos y anamnesis se mantienen.${mismatch}`,
      )
    )
      return;
    applyTemplate(current); // el store abre la pestaña Comidas con el plan nuevo
  };

  return (
    <div className="space-y-4">
      <Panel title="📚 PLANES LISTOS · BANCO DE PLANES MAESTROS" right={<BookOpen className="h-4 w-4 text-cyan-hud/80" />}>
        <p className="-mt-1 text-[13px] text-steel">
          24 planes con comidas típicas argentinas y macros según ISSN / ACSM: 4 objetivos × mujer / hombre × estándar, sin TACC y vegetariano. Cada uno trae día de entreno y de descanso, 4-5 opciones
          por comida y porciones reales: al aplicarlo se adapta solo al peso de tu alumno, sin pasar nunca los topes por toma (por ejemplo, yogur hasta 1 pote de 200 g).
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[11.5px] font-semibold text-mute">Objetivo</div>
            <div className="flex flex-wrap gap-1.5">
              <button className={chip(goal === 'all')} onClick={() => setGoal('all')}>
                Todos
              </button>
              {BANK_GOALS.map((g) => (
                <button key={g.id} className={chip(goal === g.id)} onClick={() => setGoal(g.id)} title={g.short}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-semibold text-mute">Sexo</div>
            <div className="w-72">
              <Segmented
                value={sex}
                onChange={(s) => {
                  setSex(s);
                  setPicked(null);
                }}
                size="sm"
                options={[
                  { value: 'F', label: `Mujer · ${SEX_RANGE.F}` },
                  { value: 'M', label: `Hombre · ${SEX_RANGE.M}` },
                ]}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-semibold text-mute">Variante</div>
            <div className="flex flex-wrap gap-1.5">
              {BANK_VARIANTS.map((v) => (
                <button key={v.id} className={chip(variant === v.id)} onClick={() => setVariant(v.id)} title={v.note}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11.5px] font-semibold text-mute">Rango de calorías (para {fmt1(weight)} kg)</div>
            <div className="flex flex-wrap gap-1.5">
              {KCAL_RANGES.map((x) => (
                <button key={x.id} className={chip(range === x.id)} onClick={() => setRange(x.id)}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-mute">
          {sameSex ? (
            <>
              Calorías y porciones calculadas para <b className="text-steel">{athlete.profile.name}</b> ({fmt1(athlete.profile.weightKg)} kg).
            </>
          ) : (
            <>Vista con un peso de referencia de {REF_W[sex]} kg: al aplicarlo se recalcula al peso de tu alumno.</>
          )}{' '}
          {BANK_VARIANTS.find((v) => v.id === variant)!.note}
        </p>
        {variant === 'stacc' && (
          <div className="mt-2 flex gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[12.5px] text-[#FDE68A]">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" /> {STACC_WARNING}
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {cards.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-line2 p-4 text-center text-[13px] text-mute">Ningún plan cae en ese rango de calorías para este peso. Probá con «Todas».</p>}
          {cards.map(({ sel, sum }) => {
            const g = goalOf(sel.plan);
            const on = current?.plan === sel.plan;
            return (
              <button
                key={sel.plan}
                data-bank-card
                onClick={() => setPicked(sel)}
                className={cx('rounded-xl border p-3 text-left transition', on ? 'border-fire/70 bg-fire/[0.08]' : 'border-line bg-panel hover:border-white/20')}
              >
                <div className="text-[14px] font-bold text-ink">{g.label}</div>
                <div className="text-[11.5px] text-mute">{g.short}</div>
                <div className="tnum mt-2 text-[12.5px] text-steel">
                  <b className="text-ink">{fmt0(sum.kcal.on)}</b> kcal entreno · <b className="text-ink">{fmt0(sum.kcal.off)}</b> descanso
                </div>
                <div className="tnum mt-1 text-[11.5px] text-steel">
                  Proteínas {fmt1(sum.gkg.on.p)} g/kg · Carbos {fmt1(sum.gkg.on.c)} / {fmt1(sum.gkg.off.c)} · Grasas {fmt1(sum.gkg.on.f)} / {fmt1(sum.gkg.off.f)}
                </div>
                <div className="mt-1 text-[11.5px] text-mute">
                  {sum.meals.on} comidas · {sum.optionsPerMeal}+ opciones cada una · {g.balance}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>


      {current && preview && (
        <Panel title={`PLAN · ${planLabel(current).toUpperCase()}`} tone="fire">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 text-[13px] text-steel">
              <p>{goalOf(current.plan).rationale}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                {goalOf(current.plan).evidence.map((e) =>
                  e.doi ? (
                    <a key={e.label} href={doiUrl(e.doi)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-hud hover:underline">
                      {e.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span key={e.label}>{e.label}</span>
                  ),
                )}
              </div>
            </div>
            <button onClick={apply} className="flex items-center gap-2 rounded-xl bg-fire px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_30px_-12px_rgba(249,115,22,.9)] hover:bg-fire-hot">
              <Zap className="h-4 w-4" /> Aplicar a este alumno
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="w-72">
              <Segmented
                value={day}
                onChange={setDay}
                size="sm"
                options={[
                  { value: 'on', label: `Día de entreno · ${fmt0(preview.target.on.kcal)} kcal` },
                  { value: 'off', label: `Día de descanso · ${fmt0(preview.target.off.kcal)} kcal` },
                ]}
              />
            </div>
            <span className="text-[12px] text-mute">
              Escalón {preview.tier === 'B' ? 'denso' : 'base'} · porciones para {fmt1(weight)} kg · horarios para entrenar a las {athlete.profile.trainingTime || '18:00'}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {preview.meals
              .filter((m) => m.day === day)
              .map((m) => (
                <MealPreview key={m.id} name={m.name} time={m.time} options={[{ title: m.title ?? '', items: m.items }, ...(m.alts ?? [])]} />
              ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function MealPreview({ name, time, options }: { name: string; time: string; options: MealOption[] }) {
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
        <span className="tnum hidden flex-none text-right text-[11.5px] text-steel sm:block">
          {fmt0(t0.kcal)} kcal
          <br />
          {options.length} opciones
        </span>
        <ChevronDown className={cx('h-4 w-4 flex-none text-mute transition-transform', open && 'rotate-180')} />
      </button>
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
