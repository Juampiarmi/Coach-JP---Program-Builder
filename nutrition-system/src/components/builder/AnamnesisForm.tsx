'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Clock3, Eye, HeartPulse, Plus, Trophy, UtensilsCrossed } from 'lucide-react';
import { BasketMatrix } from './BasketMatrix';
import { GOALS, SEASON_LABEL, sportLabel, SPORT_GROUPS, ALLERGIES, ANXIETY_LABEL, BUDGET_LABEL, CONDITIONS, COOKING_LABEL, FASTING_LABEL, FASTING_WINDOW_H, presetPatch, PRESETS, sanitizeAnamnesis, SLOT_LABEL, SLOTS, SNACK_OPTIONS, sleepHours, type PresetId } from '@/lib/anamnesisPro';
import { fmt1 } from '@/lib/bioenergetics';
import { buildPromptContext } from '@/lib/promptBuilder';
import { fmtHm, mealSchedule } from '@/lib/schedule';
import type { AnxietyZone, Budget, CookingLevel, Fasting, MealSlot, SeasonPhase } from '@/lib/types';
import { useFoodDbStore } from '@/store/useFoodDbStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx, inputCls, Label, Panel, Segmented, Toggle } from '../hud/primitives';

const timeCls =
  'tnum w-full rounded-lg border border-line bg-carbon px-3 py-2 font-mono text-sm text-ink outline-none [color-scheme:dark] focus:border-cyan-hud/60 disabled:opacity-60';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Bloque colapsable del formulario (abierto por defecto). */
function Block({ title, icon, badge, children }: { title: string; icon: ReactNode; badge?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-line bg-panel">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        <span className="text-cyan-hud">{icon}</span>
        <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-ink">{title}</span>
        <span className="ml-auto flex items-center gap-2">
          {badge}
          <ChevronDown className={cx('h-4 w-4 text-mute transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && <div className="border-t border-line px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}

function Chip({ on, onClick, children, tone = 'cyan' }: { on: boolean; onClick: () => void; children: ReactNode; tone?: 'cyan' | 'fire' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.04em] transition',
        on
          ? tone === 'fire'
            ? 'border-fire bg-fire/15 text-fire'
            : 'border-cyan-hud bg-cyan-hud/10 text-cyan-hud'
          : 'border-line text-steel hover:border-line2 hover:text-ink',
      )}
    >
      [ {children} ]
    </button>
  );
}

/** 00 · Anamnesis Pro & Lifestyle: perfil 360° del atleta que alimenta el Prompt Engine. */
export function AnamnesisForm() {
  const plan = usePlanStore((s) => s.plan);
  const setAnamnesis = usePlanStore((s) => s.setAnamnesis);
  const setProfile = usePlanStore((s) => s.setProfile);
  const applyToMeals = usePlanStore((s) => s.applyAnamnesisToMeals);
  const applyPhasePreset = usePlanStore((s) => s.applyPhasePreset);
  const [applied, setApplied] = useState<string | null>(null);
  const foodDb = useFoodDbStore((s) => s.items);
  const intakeNotes = usePlanStore((s) => s.intakeNotes);
  const an = sanitizeAnamnesis(plan.anamnesis);
  const pr = plan.profile;
  const sch = mealSchedule(pr, an);
  const [customSnack, setCustomSnack] = useState('');
  const [customSport, setCustomSport] = useState('');
  const knownSports = new Set<string>(SPORT_GROUPS.flatMap((g) => g.sports.map(([id]) => id as string)));
  const [preview, setPreview] = useState(false);
  const context = useMemo(() => (preview ? buildPromptContext(plan, foodDb, intakeNotes) : ''), [preview, plan, foodDb, intakeNotes]);

  const sleep = sleepHours(an.bedTime, an.wakeTime);
  const end = fmtHm(sch.end);
  const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const setConditions = (id: string) => {
    if (id === 'none') return setAnamnesis({ conditions: ['none'] });
    const next = toggleIn(an.conditions.filter((c) => c !== 'none'), id);
    setAnamnesis({ conditions: next.length ? next : ['none'] });
  };
  const setMealTime = (slot: MealSlot, v: string) => {
    if (!v) return;
    // Al editar un horario se pasa a modo manual partiendo de los horarios vigentes.
    const base = Object.fromEntries(SLOTS.map((k) => [k, fmtHm(sch.slots[k])])) as Record<MealSlot, string>;
    setAnamnesis({ mealTimesAuto: false, mealTimes: { ...base, [slot]: v } });
  };
  const enabled = SLOTS.filter((k) => !an.disabledSlots.includes(k));
  const ordered = [...enabled].sort((a, b) => sch.slots[a] - sch.slots[b]);
  const winH = FASTING_WINDOW_H[an.fasting];
  const span = enabled.length ? (sch.slots[ordered[ordered.length - 1]] - sch.slots[ordered[0]]) / 60 : 0;

  // Ayuno 16/8 → sin desayuno; volver a «Ninguno» lo reactiva.
  const setFasting = (fasting: Fasting) => {
    const off = new Set(an.disabledSlots);
    if (fasting === '16-8') off.add('breakfast');
    else if (an.fasting === '16-8') off.delete('breakfast');
    setAnamnesis({ fasting, disabledSlots: SLOTS.filter((k) => off.has(k)) });
  };
  const toggleSlot = (k: MealSlot) => setAnamnesis({ disabledSlots: an.disabledSlots.includes(k) ? an.disabledSlots.filter((x) => x !== k) : [...an.disabledSlots, k] });
  const applyPreset = (id: PresetId) => {
    if (!confirm(`¿Aplicar el preset «${PRESETS.find((x) => x.id === id)?.label}»? Pisa los campos de anamnesis que define.`)) return;
    setAnamnesis(presetPatch(id));
    if (id === 'crossfit') setProfile({ discipline: 'hybrid', trainingTime: '16:00', sessionMinutes: 120, trainingDaysPerWeek: 5, trainingWeekdays: [1, 2, 3, 4, 5] });
    if (id === 'recomp') applyPhasePreset('recomp');
  };
  const orderOk = ordered.join() === enabled.join();
  const outside = enabled.filter((k) => {
    const t = sch.slots[k];
    const wake = toMin(an.wakeTime);
    const bed = toMin(an.bedTime) < wake ? toMin(an.bedTime) + 1440 : toMin(an.bedTime);
    return t < wake || t > bed;
  });

  return (
    <div className="space-y-3">
      <Panel title="00 · ANAMNESIS PRO & LIFESTYLE" right={<HeartPulse className="h-4 w-4 text-cyan-hud" />}>
        <p className="text-sm leading-relaxed text-steel">
          Perfil 360° de <b className="text-ink">{pr.name}</b>. Todo lo que cargues acá viaja al Prompt Engine junto con las notas: horarios exactos, patologías, alergias, gustos y el catálogo
          de marcas de la Food &amp; Brand DB. Se guarda en este navegador y en el backup JSON del perfil.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9.5px] tracking-[0.14em] text-mute">PRESETS RÁPIDOS:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="rounded-md border border-fire/40 bg-fire/10 px-2.5 py-1.5 font-mono text-[10.5px] font-bold text-fire transition hover:border-fire hover:bg-fire/20"
            >
              [ {p.label} ]
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="mt-3 flex items-center gap-1.5 rounded-md border border-cyan-hud/30 px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] text-cyan-hud hover:border-cyan-hud hover:bg-cyan-hud/10"
        >
          <Eye className="h-3.5 w-3.5" /> [ {preview ? 'OCULTAR' : 'VER'} CONTEXTO QUE RECIBE LA IA ]
        </button>
        {preview && (
          <pre className="scroll-thin mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-carbon p-3 font-mono text-[10.5px] leading-relaxed text-steel">
            {context.trim()}
          </pre>
        )}
      </Panel>

      <Block
        title="CRONOBIOLOGÍA Y HORARIOS"
        icon={<Clock3 className="h-4 w-4" />}
        badge={<span className="tnum rounded border border-cyan-hud/25 bg-cyan-hud/10 px-1.5 py-0.5 font-mono text-[9.5px] text-cyan-hud">{fmt1(sleep)} h SUEÑO</span>}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <Label>Despertar</Label>
            <input type="time" value={an.wakeTime} onChange={(e) => e.target.value && setAnamnesis({ wakeTime: e.target.value })} className={timeCls} />
          </label>
          <label className="block">
            <Label>Acostarse</Label>
            <input type="time" value={an.bedTime} onChange={(e) => e.target.value && setAnamnesis({ bedTime: e.target.value })} className={timeCls} />
          </label>
          <label className="block">
            <Label>Entreno · inicio</Label>
            <input type="time" value={pr.trainingTime} onChange={(e) => e.target.value && setProfile({ trainingTime: e.target.value })} className={timeCls} />
          </label>
          <label className="block">
            <Label>Entreno · fin ({pr.sessionMinutes} min)</Label>
            <input
              type="time"
              value={end}
              onChange={(e) => {
                if (!e.target.value) return;
                const mins = (toMin(e.target.value) - toMin(pr.trainingTime) + 1440) % 1440;
                if (mins >= 15 && mins <= 300) setProfile({ sessionMinutes: mins });
              }}
              className={timeCls}
            />
          </label>
        </div>
        {sleep < 7 && <p className="mt-2 font-mono text-[10px] text-fire">⚠ Menos de 7 h de sueño: impacta recuperación, apetito y sensibilidad a la insulina.</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Label>Horarios de comidas · día ON</Label>
          <div className="w-72">
            <Toggle
              checked={an.mealTimesAuto}
              onChange={(v) => setAnamnesis({ mealTimesAuto: v })}
              tone="cyan"
              label={<span className="text-xs text-steel">Auto desde el entreno (pre −45′ · post +15′ · cena +3 h)</span>}
            />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SLOTS.map((k) => {
            const off = an.disabledSlots.includes(k);
            return (
              <div key={k} className={cx('block', off && 'opacity-60')}>
                <Label>{SLOT_LABEL[k]}</Label>
                <input type="time" disabled={off} value={fmtHm(sch.slots[k])} onChange={(e) => setMealTime(k, e.target.value)} className={timeCls} aria-label={SLOT_LABEL[k]} />
                <button
                  type="button"
                  onClick={() => toggleSlot(k)}
                  aria-pressed={off}
                  className={cx(
                    'mt-1.5 w-full rounded-md border px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.06em] transition',
                    off ? 'border-fire bg-fire/15 text-fire' : 'border-line text-mute hover:text-steel',
                  )}
                >
                  {off ? '[ EXCLUIDA · REACTIVAR ]' : '[ Excluir / Desactivar ]'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={cx('font-mono text-[10px]', orderOk && !outside.length ? 'text-cyan-hud' : 'text-fire')}>
            {orderOk ? '✓ Orden cronológico correcto' : '⚠ El orden no es Desayuno → Almuerzo → Pre → Post → Cena'}
            {outside.length ? ` · ⚠ ${outside.map((k) => SLOT_LABEL[k]).join(', ')} fuera del horario de vigilia` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              if (an.disabledSlots.length && !confirm('Se quitan del plan las comidas desactivadas y sus kcal / macros se redistribuyen en el resto. ¿Continuar?')) return;
              const removed = applyToMeals();
              setApplied(removed ? `✓ ${removed} comida(s) quitada(s) · macros redistribuidos · horarios aplicados` : '✓ Horarios aplicados y cierre de macros recalculado');
            }}
            className="ml-auto rounded-md border border-cyan-hud/40 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-cyan-hud hover:border-cyan-hud hover:bg-cyan-hud/10"
          >
            [ ⏱ APLICAR HORARIOS Y EXCLUSIONES ]
          </button>
        </div>
        {applied && <p className="mt-1 font-mono text-[10px] text-cyan-hud">{applied}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Ayuno</Label>
            <Segmented<Fasting> value={an.fasting} onChange={setFasting} size="sm" options={(['none', '16-8', '14-10', 'circadian'] as Fasting[]).map((v) => ({ value: v, label: FASTING_LABEL[v] }))} />
            {winH && (
              <p className={cx('mt-1 font-mono text-[10px]', span > winH ? 'text-fire' : 'text-cyan-hud')}>
                Ventana actual ≈ {fmt1(span)} h {span > winH ? `· excede ${winH} h: la IA la comprime` : `· dentro de ${winH} h`}
              </p>
            )}
          </div>
          <div>
            <Label>Zona crítica de ansiedad (snacks tácticos)</Label>
            <Segmented<AnxietyZone> value={an.anxiety} onChange={(anxiety) => setAnamnesis({ anxiety })} size="sm" options={(['morning', 'afternoon', 'night'] as AnxietyZone[]).map((v) => ({ value: v, label: ANXIETY_LABEL[v] }))} />
          </div>
        </div>
      </Block>

      <Block
        title="SALUD, PATOLOGÍAS Y SENSIBILIDADES"
        icon={<HeartPulse className="h-4 w-4" />}
        badge={
          an.allergies.length + an.conditions.filter((c) => c !== 'none').length > 0 ? (
            <span className="rounded border border-fire/40 bg-fire/10 px-1.5 py-0.5 font-mono text-[9.5px] text-fire">
              {an.allergies.length + an.conditions.filter((c) => c !== 'none').length} RESTRICCIONES
            </span>
          ) : undefined
        }
      >
        <Label>Patologías / condiciones</Label>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <Chip key={c.id} on={an.conditions.includes(c.id)} onClick={() => setConditions(c.id)} tone={c.id === 'none' ? 'cyan' : 'fire'}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="mt-4">
          <Label>Alergias e intolerancias (se excluyen por completo)</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGIES.map((a) => (
              <Chip key={a.id} on={an.allergies.includes(a.id)} onClick={() => setAnamnesis({ allergies: toggleIn(an.allergies, a.id) })} tone="fire">
                {a.label}
              </Chip>
            ))}
          </div>
        </div>
      </Block>

      <Block
        title="DISCIPLINAS, OBJETIVO Y TEMPORADA"
        icon={<Trophy className="h-4 w-4" />}
        badge={<span className="rounded border border-cyan-hud/25 bg-cyan-hud/10 px-1.5 py-0.5 font-mono text-[9.5px] text-cyan-hud">{an.sports.length} DEPORTE(S)</span>}
      >
        <div className="space-y-2.5">
          {SPORT_GROUPS.map((g) => (
            <div key={g.id}>
              <Label>{g.label}</Label>
              <div className="flex flex-wrap gap-1.5">
                {g.sports.map(([id, label]) => (
                  <Chip key={id} on={an.sports.includes(id)} onClick={() => setAnamnesis({ sports: toggleIn(an.sports, id) })}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label>Personalizados</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {an.sports
                .filter((x) => !knownSports.has(x))
                .map((x) => (
                  <Chip key={x} on onClick={() => setAnamnesis({ sports: an.sports.filter((y) => y !== x) })}>
                    {sportLabel(x)} ✕
                  </Chip>
                ))}
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = customSport.trim();
                  if (v && !an.sports.includes(v)) setAnamnesis({ sports: [...an.sports, v] });
                  setCustomSport('');
                }}
              >
                <input value={customSport} onChange={(e) => setCustomSport(e.target.value)} placeholder="Ej. Escalada, Natación…" className={cx(inputCls, 'w-48 py-1.5 text-xs')} />
                <button type="submit" className="flex items-center gap-1 rounded-md border border-line px-2.5 font-mono text-[10px] text-steel hover:text-ink">
                  <Plus className="h-3.5 w-3.5" /> [ ➕ Agregar Deporte Personalizado ]
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Label>Objetivo nutricional deportivo</Label>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <Chip key={g.id} on={an.goal === g.id} onClick={() => setAnamnesis({ goal: g.id })} tone="fire">
                {g.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Label>Fase de temporada</Label>
          <Segmented<SeasonPhase>
            value={an.season}
            onChange={(season) => setAnamnesis({ season })}
            size="sm"
            options={(['pre', 'comp', 'peak', 'rest'] as SeasonPhase[]).map((v) => ({ value: v, label: SEASON_LABEL[v] }))}
          />
        </div>
      </Block>

      <Block title="PERFIL GASTRONÓMICO Y CONTROL DE ANTOJOS" icon={<UtensilsCrossed className="h-4 w-4" />}>
        <label className="block">
          <Label>Alimentos de preferencia / favoritos</Label>
          <textarea rows={2} value={an.favorites} onChange={(e) => setAnamnesis({ favorites: e.target.value })} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <Label>Aversiones / rechazos (la IA no los usa)</Label>
          <textarea rows={2} value={an.aversions} onChange={(e) => setAnamnesis({ aversions: e.target.value })} className={inputCls} />
        </label>
        <div className="mt-3">
          <Label>Snacks tácticos · picoteo controlado</Label>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...SNACK_OPTIONS, ...an.snacks])].map((s) => (
              <Chip key={s} on={an.snacks.includes(s)} onClick={() => setAnamnesis({ snacks: toggleIn(an.snacks, s) })}>
                {s}
              </Chip>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = customSnack.trim();
              if (v && !an.snacks.includes(v)) setAnamnesis({ snacks: [...an.snacks, v] });
              setCustomSnack('');
            }}
          >
            <input value={customSnack} onChange={(e) => setCustomSnack(e.target.value)} placeholder="Otro snack (ej. gelatina light)" className={cx(inputCls, 'py-1.5 text-xs')} />
            <button type="submit" className="flex items-center gap-1 rounded-md border border-line px-2.5 font-mono text-[10px] text-steel hover:text-ink">
              <Plus className="h-3.5 w-3.5" /> SUMAR
            </button>
          </form>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Presupuesto</Label>
            <Segmented<Budget>
              value={an.budget}
              onChange={(budget) => setAnamnesis({ budget })}
              size="sm"
              options={(['low', 'mid', 'high'] as Budget[]).map((v) => ({ value: v, label: BUDGET_LABEL[v] }))}
            />
          </div>
          <div>
            <Label>Nivel de cocina</Label>
            <Segmented<CookingLevel>
              value={an.cooking}
              onChange={(cooking) => setAnamnesis({ cooking })}
              size="sm"
              options={(['quick', 'batch', 'gourmet'] as CookingLevel[]).map((v) => ({ value: v, label: COOKING_LABEL[v] }))}
            />
          </div>
        </div>
      </Block>

      <BasketMatrix />
    </div>
  );
}
