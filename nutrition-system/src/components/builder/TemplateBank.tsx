'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Copy, Eye, FolderHeart, ShieldAlert, Trash2 } from 'lucide-react';
import { fmt0, fmt1 } from '@/lib/bioenergetics';
import { fixedFromAnamnesis } from '@/lib/agenda';
import { ALLERGEN_INFO, allergiesOf, fixPlanAllergens } from '@/lib/allergens';
import { adaptPlan, sourceOf, type PlanTemplate } from '@/lib/planAdapt';
import { goalFor, variantFor } from '@/lib/precalc';
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
import type { AthletePlan, Sex } from '@/lib/types';
import { listAthletes, usePlanStore } from '@/store/usePlanStore';
import { cx, Panel, Segmented } from '../hud/primitives';
import { PlanPreviewModal, scaledLabel, type PreviewData } from './PlanPreviewModal';

const KCAL_RANGES = [
  { id: 'all', label: 'Todas', lo: 0, hi: Infinity },
  { id: '1400', label: '1.400–1.700', lo: 1400, hi: 1700 },
  { id: '1700', label: '1.700–2.100', lo: 1700, hi: 2100 },
  { id: '2000', label: '2.000–2.600', lo: 2000, hi: 2600 },
  { id: '2600', label: '2.600–3.200', lo: 2600, hi: 3200 },
  { id: '3200', label: 'Más de 3.200', lo: 3200, hi: Infinity },
] as const;

const chip = (on: boolean) =>
  cx('rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition', on ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel hover:border-cyan-hud/40 hover:text-ink');

/** Vista previa de un plan del banco escalado al alumno activo (la usan Planes listos y el precálculo del perfil). */
export function bankPreview(athlete: AthletePlan, sel: BankSelection, onApply: () => void): PreviewData {
  const g = goalOf(sel.plan);
  const allergies = allergiesOf(athlete);
  const bp = buildBankPlan(sel, athlete.profile.weightKg, trainingOf(athlete.profile), fixedFromAnamnesis(athlete.anamnesis), allergies);
  const warnings = [
    ...(sel.variant === 'stacc' || allergies.includes('gluten') ? [STACC_WARNING] : []),
    ...(allergies.length ? [`Adaptado a las restricciones de ${athlete.profile.name}: ${allergies.map((a) => ALLERGEN_INFO[a].label.toLowerCase()).join(', ')}. Los platos con esos ingredientes se cambian por otros aptos o se sustituye el ingrediente por un equivalente seguro.`] : []),
    ...(sexOf(sel.plan) !== athlete.profile.sex ? [`Es un plan de ${SEX_LABEL[sexOf(sel.plan)].toLowerCase()} y ${athlete.profile.name} está cargado con el otro sexo: revisá que sea el que querés.`] : []),
  ];
  return {
    title: planLabel(sel),
    scaledFor: scaledLabel(athlete.profile.name, athlete.profile.weightKg, athlete.profile.trainingTime),
    rationale: g.rationale,
    evidence: g.evidence,
    warnings,
    meals: bp.meals,
    target: bp.target,
    onApply,
  };
}

/** Planes listos: banco de 24 planes maestros (8 perfiles × 3 variantes) con filtros y aplicación en 1 clic. */
export function TemplateBank() {
  const athlete = usePlanStore((s) => s.plan);
  const applyTemplate = usePlanStore((s) => s.applyTemplate);
  const suggestedGoal = goalFor(athlete);
  const [goal, setGoal] = useState<BankGoal | 'all'>('all');
  const [sex, setSex] = useState<Sex>(athlete.profile.sex);
  const [variant, setVariant] = useState<BankVariant>(variantFor(athlete));
  const [range, setRange] = useState<(typeof KCAL_RANGES)[number]['id']>('all');
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Todo se calcula con el peso y el horario de entreno del alumno activo (lo que ves es lo que se aplica).
  const weight = athlete.profile.weightKg;
  const training = trainingOf(athlete.profile);
  const r = KCAL_RANGES.find((x) => x.id === range)!;

  const cards = useMemo(
    () =>
      BANK_PLAN_IDS.filter((id) => sexOf(id) === sex && (goal === 'all' || goalOf(id).id === goal))
        .map((id) => {
          const sel: BankSelection = { plan: id, variant };
          return { sel, sum: planSummary(sel, weight, training) };
        })
        .filter((c) => (c.sum.kcal.on >= r.lo && c.sum.kcal.on < r.hi) || (c.sum.kcal.off >= r.lo && c.sum.kcal.off < r.hi)),
    [sex, goal, variant, weight, training.start, training.end, r.lo, r.hi], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const open = (sel: BankSelection) =>
    setPreview(
      bankPreview(athlete, sel, () => {
        setPreview(null);
        applyTemplate(sel); // el store abre la pestaña Comidas con el plan nuevo
      }),
    );

  return (
    <div className="space-y-4">
      <Panel block="estructura" title="📚 PLANES LISTOS · BANCO DE PLANES MAESTROS" right={<BookOpen className="h-4 w-4 text-cyan-hud/80" />}>
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
                onChange={setSex}
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
          Calorías y porciones calculadas para <b className="text-steel">{athlete.profile.name}</b> ({fmt1(weight)} kg, entrena a las {athlete.profile.trainingTime || '18:00'}). Tocá un plan para ver la vista previa completa antes de aplicarlo.{' '}
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
            const suggested = sex === athlete.profile.sex && sel.plan === `${athlete.profile.sex}-${suggestedGoal}`;
            return (
              <button
                key={sel.plan}
                data-bank-card
                onClick={() => open(sel)}
                className={cx('group relative rounded-xl border p-3 text-left transition', suggested ? 'border-fire/50 bg-fire/[0.05]' : 'border-line bg-panel hover:border-white/20')}
              >
                {suggested && <span className="absolute right-2 top-2 rounded border border-fire/40 bg-fire/10 px-1.5 py-px font-mono text-[8.5px] font-bold tracking-[0.12em] text-fire">SUGERIDO</span>}
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
                <div className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold text-cyan-hud opacity-80 group-hover:opacity-100">
                  <Eye className="h-3.5 w-3.5" /> Ver vista previa
                </div>
              </button>
            );
          })}
        </div>
      </Panel>


      <MyTemplates onPreview={setPreview} />
      <CopyFromAthlete onPreview={setPreview} />
      {preview && <PlanPreviewModal data={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** Mis plantillas: planes que el coach guardó desde Comidas, listos para adaptar a otro atleta. */
function MyTemplates({ onPreview }: { onPreview: (d: PreviewData | null) => void }) {
  const athlete = usePlanStore((s) => s.plan);
  const templates = usePlanStore((s) => s.templates);
  const applyAdapted = usePlanStore((s) => s.applyAdapted);
  const deleteTemplate = usePlanStore((s) => s.deleteTemplate);
  const preview = (t: PlanTemplate) => {
    const adapted = fixPlanAllergens(adaptPlan(athlete, t)).plan;
    onPreview({
      title: `Plantilla: ${t.name}`,
      scaledFor: scaledLabel(athlete.profile.name, athlete.profile.weightKg, athlete.profile.trainingTime),
      rationale: `Guardada desde el plan de ${t.from} (${fmt1(t.weightKg)} kg). Las porciones se reescalan al peso de ${athlete.profile.name}, dentro de los topes por toma, y el cierre de macros la deja en sus calorías.`,
      warnings: t.sex !== athlete.profile.sex ? [`La plantilla salió de un plan de ${SEX_LABEL[t.sex].toLowerCase()}: las porciones se ajustan a los topes de ${athlete.profile.name}.`] : [],
      meals: adapted.meals,
      onApply: () => {
        onPreview(null);
        applyAdapted(t);
      },
    });
  };
  return (
    <Panel block="estructura" title="⭐ MIS PLANTILLAS" right={<FolderHeart className="h-4 w-4 text-fire/80" />}>
      {templates.length === 0 ? (
        <p className="-mt-1 text-[13px] text-steel">
          Todavía no guardaste plantillas. Armá o editá un plan en <b className="text-ink">Comidas</b> y tocá <b className="text-ink">«Guardar como plantilla»</b>: queda acá para reutilizarlo con otros atletas, reescalado a su peso.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} data-template-card className="rounded-xl border border-line bg-panel p-3">
              <div className="text-[14px] font-bold text-ink">{t.name}</div>
              <div className="text-[11.5px] text-mute">
                De {t.from} · {SEX_LABEL[t.sex]} · {fmt1(t.weightKg)} kg · {t.meals.length} comidas
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => preview(t)} className="flex items-center gap-1 rounded-md border border-cyan-hud/40 px-2.5 py-1 text-[12px] font-semibold text-cyan-hud hover:bg-cyan-hud/10">
                  <Eye className="h-3.5 w-3.5" /> Vista previa y aplicar
                </button>
                <button onClick={() => confirm(`¿Borrar la plantilla «${t.name}»?`) && deleteTemplate(t.id)} className="ml-auto rounded-md p-1.5 text-mute hover:text-danger" aria-label={`Borrar plantilla ${t.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** Duplicar el plan de otro alumno al activo, reescalado a su peso, objetivo y horario de entreno. */
function CopyFromAthlete({ onPreview }: { onPreview: (d: PreviewData | null) => void }) {
  const athlete = usePlanStore((s) => s.plan);
  const roster = usePlanStore((s) => s.roster);
  const applyAdapted = usePlanStore((s) => s.applyAdapted);
  const others = listAthletes({ plan: athlete, roster }).filter((a) => a.id !== athlete.id && a.meals.length > 0);
  const preview = (src: AthletePlan) => {
    const adapted = fixPlanAllergens(adaptPlan(athlete, sourceOf(src))).plan;
    onPreview({
      title: `Plan de ${src.profile.name}`,
      scaledFor: scaledLabel(athlete.profile.name, athlete.profile.weightKg, athlete.profile.trainingTime),
      rationale: `Copia del plan de ${src.profile.name} (${fmt1(src.profile.weightKg)} kg): mismas comidas y macros por kilo, con las porciones recalculadas para ${athlete.profile.name} y los horarios de su entreno.`,
      warnings: src.profile.sex !== athlete.profile.sex ? [`${src.profile.name} es de otro sexo: las porciones se ajustan a los topes de ${athlete.profile.name}.`] : [],
      meals: adapted.meals,
      onApply: () => {
        onPreview(null);
        applyAdapted(sourceOf(src));
      },
    });
  };
  return (
    <Panel block="estructura" title="👥 COPIAR EL PLAN DE OTRO ALUMNO" right={<Copy className="h-4 w-4 text-cyan-hud/80" />}>
      {others.length === 0 ? (
        <p className="-mt-1 text-[13px] text-steel">Cuando tengas otros atletas con comidas cargadas, vas a poder copiar su plan a {athlete.profile.name} con un toque (se reescala solo a su peso).</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {others.map((a) => (
            <button key={a.id} data-copy-athlete onClick={() => preview(a)} className="rounded-lg border border-line px-3 py-2 text-left hover:border-cyan-hud/50">
              <span className="block text-[13px] font-semibold text-ink">{a.profile.name}</span>
              <span className="block text-[11px] text-mute">
                {fmt1(a.profile.weightKg)} kg · {a.meals.length} comidas
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
