'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink, Zap } from 'lucide-react';
import { computeTelemetry, dayTotals, fmt0, fmt1, mealsForDay, mealTotals } from '@/lib/bioenergetics';
import { BRAND_TIERS, TIER_LABEL } from '@/lib/brandTiers';
import { doiUrl } from '@/lib/evidence';
import { optionSteps, optionTotals } from '@/lib/menuOptions';
import { FOOD_SLOT_LABEL, SLOT_OF } from '@/lib/mealSlots';
import {
  goalById,
  previewTemplate,
  profileById,
  TEMPLATE_GOALS,
  TEMPLATE_PREFS,
  TEMPLATE_PROFILES,
  type TemplateGoalId,
  type TemplatePref,
  type TemplateSelection,
} from '@/lib/templateBank';
import type { DayMode, FoodItem, Meal, MealOption, Sex } from '@/lib/types';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, HudButton, Panel, Segmented } from '../hud/primitives';

const chip = (on: boolean) =>
  cx(
    'rounded-md border px-2.5 py-1.5 text-left font-mono text-[10.5px] tracking-[0.04em] transition',
    on ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel hover:border-cyan-hud/40 hover:text-ink',
  );

/** Biblioteca de planes master: planes semilla por sexo, peso, objetivo y preferencia, con carga en un toque. */
export function TemplateBank() {
  // Recalcula cuando cambia la Food & Brand DB (los platos del catálogo alimentan las opciones 2 a 5).
  const dbItems = useFoodDbStore((s) => s.items);
  const athlete = usePlanStore((s) => s.plan);
  const applyTemplate = usePlanStore((s) => s.applyTemplate);
  const [sex, setSex] = useState<Sex>('M');
  const [sel, setSel] = useState<TemplateSelection>({ profile: 'm80', goal: 'recomp', pref: 'omni' });
  const [day, setDay] = useState<DayMode>('on');
  const plan = useMemo(() => previewTemplate(sel), [sel, dbItems]);
  const pr = profileById(sel.profile);
  const goal = goalById(sel.goal);
  const t = computeTelemetry(plan);
  const ffm = pr.weightKg * (1 - pr.bodyFatPct / 100);
  const meals = mealsForDay(plan.meals, day);
  const got = dayTotals(plan.meals, day);
  const athleteT = computeTelemetry({ ...athlete, periodization: { ...athlete.periodization, on: goal.on, off: goal.off } });

  const pickSex = (s: Sex) => {
    setSex(s);
    setSel((x) => ({ ...x, profile: s === 'M' ? 'm80' : 'f60' }));
  };
  const load = () => {
    if (
      !window.confirm(
        `¿Cargar "${goal.label}" (${TEMPLATE_PREFS.find((p) => p.id === sel.pref)?.label}) a ${athlete.profile.name}?\n\nSe reemplazan sus comidas y su matriz ON / OFF; los gramos se recalculan a ${athlete.profile.weightKg} kg (${fmt0(athleteT.kcalOn)} kcal ON · ${fmt0(athleteT.kcalOff)} kcal OFF). Perfil, suplementos y anamnesis se mantienen.`,
      )
    )
      return;
    applyTemplate(sel);
  };

  return (
    <div className="space-y-4">
      <Panel title="[ 📚 BIBLIOTECA DE PLANES MASTER ]" right={<BookOpen className="h-4 w-4 text-cyan-hud/80" />}>
        <p className="text-[13px] text-steel">
          Planes semilla validados con las posiciones de la ISSN (2017 / 2018) y el Gatorade Sports Science Institute, armados con alimentos, platos y marcas del
          mercado argentino. Elegí el perfil más parecido a tu atleta y cargalo: los macros y los gramos se adaptan solos a su peso real.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-mute">SEXO BIOLÓGICO</div>
            <div className="w-64">
              <Segmented
                value={sex}
                onChange={pickSex}
                size="sm"
                options={[
                  { value: 'M', label: 'Hombre' },
                  { value: 'F', label: 'Mujer' },
                ]}
              />
            </div>
            <div className="mb-1.5 mt-3 font-mono text-[10px] tracking-[0.14em] text-mute">PESO BASE Y COMPOSICIÓN</div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PROFILES.filter((p) => p.sex === sex).map((p) => (
                <button key={p.id} type="button" onClick={() => setSel((x) => ({ ...x, profile: p.id }))} className={chip(sel.profile === p.id)}>
                  <b className="block text-[12px] text-ink">{p.label}</b>~{p.bodyFatPct} % graso · FFM {fmt1(p.weightKg * (1 - p.bodyFatPct / 100))} kg
                </button>
              ))}
            </div>
            <div className="mb-1.5 mt-3 font-mono text-[10px] tracking-[0.14em] text-mute">TOLERANCIAS Y PREFERENCIAS</div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PREFS.map((p) => (
                <button key={p.id} type="button" title={p.hint} onClick={() => setSel((x) => ({ ...x, pref: p.id as TemplatePref }))} className={chip(sel.pref === p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-mute">OBJETIVO DEPORTIVO Y FASE</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {TEMPLATE_GOALS.map((g) => (
                <button key={g.id} type="button" onClick={() => setSel((x) => ({ ...x, goal: g.id as TemplateGoalId }))} className={chip(sel.goal === g.id)}>
                  <b className="block text-[12px] text-ink">{g.label}</b>
                  {g.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-line bg-carbon p-3 md:grid-cols-[1fr_auto]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] text-cyan-hud">
              [ {pr.sex === 'M' ? 'HOMBRE' : 'MUJER'} {pr.label} · ~{pr.bodyFatPct} % GRASO · FFM {fmt1(ffm)} KG ] · {goal.label.toUpperCase()}
            </div>
            <div className="tnum mt-1.5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] text-ink">
              <span>
                ON {fmt0(t.kcalOn)} kcal · P {t.gramsOn.p} · C {t.gramsOn.c} · G {t.gramsOn.f} g
              </span>
              <span className="text-steel">
                OFF {fmt0(t.kcalOff)} kcal · P {t.gramsOff.p} · C {t.gramsOff.c} · G {t.gramsOff.f} g
              </span>
              <span className="text-mute">
                g/kg ON {fmt1(goal.on.p)} / {fmt1(goal.on.c)} / {fmt1(goal.on.f)} · OFF {fmt1(goal.off.p)} / {fmt1(goal.off.c)} / {fmt1(goal.off.f)}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-steel">{goal.rationale}</p>
            <div className="mt-2 flex flex-col gap-0.5">
              {goal.evidence.map((c) =>
                c.doi ? (
                  <a key={c.label} href={doiUrl(c.doi)} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[9.5px] text-mute hover:text-cyan-hud">
                    [ {c.label} ] <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span key={c.label} className="font-mono text-[9.5px] text-mute">
                    [ {c.label} ]
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-1.5 md:w-72">
            <HudButton tone="fire" onClick={load}>
              <Zap className="h-4 w-4" /> [ ⚡ CARGAR ESTE PLAN AL ATLETA ACTIVO ]
            </HudButton>
            <span className="text-center font-mono text-[9.5px] text-mute">
              {athlete.profile.name} · {athlete.profile.weightKg} kg → {fmt0(athleteT.kcalOn)} kcal ON · {fmt0(athleteT.kcalOff)} kcal OFF
            </span>
          </div>
        </div>
      </Panel>

      <Panel
        title={`PLAN SEMILLA · ${day === 'on' ? 'DÍA ON (ENTRENO)' : 'DÍA OFF (DESCANSO)'}`}
        right={
          <div className="w-56">
            <Segmented
              value={day}
              onChange={setDay}
              size="sm"
              options={[
                { value: 'on', label: 'Día ON' },
                { value: 'off', label: 'Día OFF' },
              ]}
            />
          </div>
        }
      >
        <div className="tnum mb-3 font-mono text-[11px] text-steel">
          Total del día {fmt0(got.kcal)} kcal · P {fmt0(got.p)} · C {fmt0(got.c)} · G {fmt0(got.f)} g · objetivo {fmt0(day === 'on' ? t.kcalOn : t.kcalOff)} kcal
        </div>
        <div className="space-y-3">
          {meals.map((m) => (
            <TemplateMeal key={m.id} meal={m} />
          ))}
        </div>
        <p className="mt-3 font-mono text-[9.5px] text-mute">
          Marcas de referencia del mercado argentino en 3 niveles de presupuesto; verificá siempre la tabla nutricional del envase.
        </p>
      </Panel>
    </div>
  );
}

function TemplateMeal({ meal }: { meal: Meal }) {
  const t = mealTotals(meal);
  const options: MealOption[] = [{ title: meal.title ?? 'Opción 1', items: meal.items, steps: meal.steps, technique: meal.technique }, ...(meal.alts ?? [])];
  return (
    <div className="rounded-lg border border-line bg-carbon">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="tnum rounded border border-cyan-hud/30 px-1.5 py-0.5 font-mono text-[10px] text-cyan-hud">{meal.time}</span>
        <b className="text-[14px] text-ink">{meal.name}</b>
        <span className="font-mono text-[9px] tracking-[0.12em] text-mute">[ {FOOD_SLOT_LABEL[SLOT_OF[meal.role]]} ]</span>
        <span className="tnum ml-auto font-mono text-[10.5px] text-steel">
          {fmt0(t.p * 4 + t.c * 4 + t.f * 9)} kcal · P {fmt0(t.p)} · C {fmt0(t.c)} · G {fmt0(t.f)} · {options.length} opciones
        </span>
      </div>
      <div className="divide-y divide-line">
        {options.map((o, k) => (
          <TemplateOption key={k} option={o} n={k + 1} />
        ))}
      </div>
    </div>
  );
}

function TemplateOption({ option, n }: { option: MealOption; n: number }) {
  const [open, setOpen] = useState(n === 1);
  const t = optionTotals(option.items);
  return (
    <div className="px-3 py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left" aria-expanded={open}>
        <span className={cx('rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em]', n === 1 ? 'border-cyan-hud/40 text-cyan-hud' : 'border-fire/50 text-fire')}>
          [ OPCIÓN {n} ]
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-ink">{option.title}</span>
        <span className="tnum hidden font-mono text-[10px] text-mute sm:inline">{fmt0(t.kcal)} kcal</span>
        <ChevronDown className={cx('h-4 w-4 flex-none text-mute transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          <div>
            <div className="mb-1 font-mono text-[9.5px] tracking-[0.12em] text-mute">INGREDIENTES Y MARCAS (3 NIVELES)</div>
            <div className="space-y-1.5">
              {option.items.map((it) => (
                <Ingredient key={it.id} item={it} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 font-mono text-[9.5px] tracking-[0.12em] text-mute">PREPARACIÓN PASO A PASO</div>
            <ol className="space-y-1">
              {optionSteps(option).map((st, k) => (
                <li key={k} className="flex gap-2 text-[12.5px] leading-snug text-ink">
                  <span className="tnum mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-cyan-hud/40 font-mono text-[9.5px] text-cyan-hud">{k + 1}</span>
                  <span>{st}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function Ingredient({ item }: { item: FoodItem }) {
  const tiers = item.foodId ? BRAND_TIERS[item.foodId] : undefined;
  return (
    <div className="rounded-md border border-line bg-panel2 px-2.5 py-1.5">
      <div className="flex items-baseline gap-2 text-[12.5px]">
        <b className="tnum font-mono text-ink">{fmt0(item.grams)} g</b>
        <span className="min-w-0 flex-1 text-ink">{item.food}</span>
        <span className="tnum font-mono text-[10px] text-mute">
          P{fmt0(item.p)} C{fmt0(item.c)} G{fmt0(item.f)}
        </span>
      </div>
      {tiers && (
        <div className="mt-1 grid gap-x-3 font-mono text-[9.5px] text-steel sm:grid-cols-3">
          {tiers.map((b, k) => (
            <span key={k} title={TIER_LABEL[k]}>
              <span className={k === 0 ? 'text-[#22C55E]' : k === 1 ? 'text-cyan-hud' : 'text-fire'}>N{k + 1}</span> {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
