'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BellOff, Check, ChevronDown, Cloud, Copy, ExternalLink, Minus, Pencil, RefreshCw, Search, Users, Wand2 } from 'lucide-react';
import { applyDelta, type Adjustment } from '@/lib/adjust';
import { athleteLink } from '@/lib/cloud/config';
import { computeTelemetry } from '@/lib/bioenergetics';
import { createPortal } from 'react-dom';
import { cloudConfigured } from '@/lib/cloud/config';
import { humanError } from '@/lib/cloud/client';
import { ackAlert, loadBoard, localToday, type BoardRow } from '@/lib/cloud/board';
import { addDays, type AlertLevel, type Goal } from '@/lib/coachAlerts';
import { timeAgo } from '@/lib/planHash';
import { usePlanStore } from '@/store/usePlanStore';
import { useCloudStore } from '@/store/useCloudStore';
import { cx } from '../hud/primitives';
import { LoginDialog } from './CloudAccount';

const LEVEL: Record<AlertLevel, { dot: string; chip: string; label: string }> = {
  red: { dot: 'bg-danger', chip: 'border-danger/50 bg-danger/10 text-[#FCA5A5]', label: 'Urgente' },
  orange: { dot: 'bg-fire', chip: 'border-fire/50 bg-fire/10 text-[#FDBA74]', label: 'Revisar' },
  yellow: { dot: 'bg-gold', chip: 'border-gold/40 bg-gold/10 text-[#FDE68A]', label: 'Atención' },
  info: { dot: 'bg-steel', chip: 'border-line2 bg-white/[0.04] text-steel', label: 'Info' },
};
const GOAL_LABEL: Record<NonNullable<Goal>, string> = { cut: 'Definición', recomp: 'Recomposición', maintain: 'Mantenimiento', bulk: 'Volumen' };
const kg = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${kg(Math.abs(n))}`;

/** Flecha de peso: verde si va hacia el objetivo, roja si va en contra. */
function Trend({ d, goal }: { d: number | null; goal: Goal }) {
  if (d === null) return <span className="text-mute">—</span>;
  const want = goal === 'bulk' ? 1 : goal === 'cut' || goal === 'recomp' ? -1 : 0;
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  const tone = want === 0 || d === 0 ? 'text-steel' : Math.sign(d) === want ? 'text-[#4ADE80]' : 'text-[#FCA5A5]';
  return (
    <span className={cx('inline-flex items-center gap-0.5', tone)}>
      <Icon className="h-3.5 w-3.5" />
      {signed(d)}
    </span>
  );
}

function Spark({ data }: { data: (number | null)[] }) {
  return (
    <span className="flex h-6 items-end gap-[2px]" aria-hidden>
      {data.map((v, i) => (
        <i
          key={i}
          className={cx('block w-[5px] rounded-sm', v === null ? 'bg-white/[0.06]' : Math.abs(v - 100) <= 5 ? 'bg-[#22C55E]' : v < 80 || v > 110 ? 'bg-fire' : 'bg-cyan-hud')}
          style={{ height: v === null ? 4 : `${Math.max(18, Math.min(100, v * 0.8))}%` }}
        />
      ))}
    </span>
  );
}

/** Panel general del coach: todos los atletas, adherencia, peso y alertas (primero quien más atención necesita). */
export function CoachBoard() {
  const user = useCloudStore((s) => s.user);
  const links = useCloudStore((s) => s.links);
  const selectAthlete = usePlanStore((s) => s.selectAthlete);
  const setBuilderTab = usePlanStore((s) => s.setBuilderTab);
  const setDeployTab = usePlanStore((s) => s.setDeployTab);
  const activeId = usePlanStore((s) => s.plan.id);
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [err, setErr] = useState('');
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [login, setLogin] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [adjust, setAdjust] = useState<{ row: BoardRow; adj: Adjustment } | null>(null);
  const [copied, setCopied] = useState('');

  const refresh = useCallback(async () => {
    setErr('');
    try {
      setRows(await loadBoard());
      setAt(Date.now());
    } catch (e) {
      setErr(humanError(e));
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  if (!cloudConfigured)
    return (
      <Empty title="El panel de atletas necesita la nube" body="Cuando conectes Supabase vas a ver acá la adherencia, el peso y las alertas de todos tus atletas en una sola tabla." />
    );
  if (!user)
    return (
      <Empty title="Entrá a la nube para ver a tus atletas" body="Vas a ver cómo viene cada uno: comidas tildadas, kcal, proteína, peso y alertas automáticas.">
        <button onClick={() => setLogin(true)} className="mt-4 rounded-xl bg-fire px-5 py-3 text-[14px] font-bold text-white hover:bg-fire-hot">
          Entrar a la nube
        </button>
        {login && <LoginDialog onClose={() => setLogin(false)} />}
      </Empty>
    );

  const openInBuilder = (athleteId: string) => {
    const planId = Object.entries(links).find(([, l]) => l.athleteId === athleteId)?.[0];
    if (!planId) return;
    if (planId !== activeId) selectAthlete(planId);
    setBuilderTab('meals');
    setDeployTab('preview');
  };

  const need = rows?.filter((r) => r.alerts.some((a) => a.level !== 'info')).length ?? 0;
  const planIdOf = (athleteId: string) => Object.entries(links).find(([, l]) => l.athleteId === athleteId)?.[0];
  const q = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => (!q || r.input.name.toLowerCase().includes(q)) && FILTERS[filter].test(r));
  const copyLink = async (r: BoardRow) => {
    const l = links[planIdOf(r.input.id) ?? ''];
    const url = athleteLink(r.input.slug, l?.token ?? null);
    const msg = `¡Hola ${r.input.name.split(' ')[0]}! Acá tenés tu plan de nutrición (se actualiza solo cuando lo cambio): ${url}`;
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      window.prompt('Copiá el mensaje para WhatsApp:', msg);
    }
    setCopied(r.input.id);
    setTimeout(() => setCopied(''), 2000);
  };
  const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-mute';
  const td = 'px-3 py-3 align-top text-[12.5px]';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink">
            <Users className="h-5 w-5 text-cyan-hud" /> Mis atletas
          </h2>
          <p className="text-[12.5px] text-steel">Últimos 7 días cerrados. Primero, quien más atención necesita.</p>
        </div>
        {rows && rows.length > 0 && (
          <div className="flex gap-2 text-[12px]">
            <span className={cx('rounded-full border px-2.5 py-1 font-semibold', need ? 'border-fire/50 bg-fire/10 text-[#FDBA74]' : 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]')}>
              {need ? `${need} para revisar` : 'Todos al día'}
            </span>
            <span className="rounded-full border border-line px-2.5 py-1 text-steel">{rows.length} atleta{rows.length > 1 ? 's' : ''}</span>
          </div>
        )}
        <button onClick={() => void refresh()} className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-steel hover:text-ink" title="Volver a traer los registros de tus atletas">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar{at ? <span className="font-normal text-mute">· {timeAgo(at)}</span> : null}
        </button>
      </div>

      {rows && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
            <Search className="h-4 w-4 text-mute" />
            <input data-board-search value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar atleta por nombre" className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-mute" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button
                key={f}
                data-board-filter={f}
                onClick={() => setFilter(f)}
                className={cx('rounded-lg border px-3 py-1.5 text-[12px] font-semibold', filter === f ? 'border-cyan-hud bg-cyan-hud/10 text-ink' : 'border-line text-steel hover:text-ink')}
              >
                {FILTERS[f].label} <span className="text-mute">{(rows ?? []).filter((r) => FILTERS[f].test(r)).length}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {rows && rows.length > 0 && <Legend />}
      {err && <div className="rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] text-[#FCA5A5]">{err}</div>}
      {rows === null && !err && <div className="rounded-xl border border-line bg-panel p-6 text-center text-[13px] text-mute">Cargando tus atletas…</div>}
      {rows?.length === 0 && (
        <Empty title="Todavía no tenés atletas en la nube" body="Armá el plan de tu atleta (pasos 1 y 2) y tocá Publicar: se crea su link fijo y aparece acá con sus registros.">
          <button onClick={() => setDeployTab('export')} className="mt-4 rounded-xl bg-fire px-5 py-3 text-[14px] font-bold text-white hover:bg-fire-hot">
            Ir a Publicar
          </button>
        </Empty>
      )}

      {rows && rows.length > 0 && (
        <div className="scroll-thin overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead className="border-b border-line bg-white/[0.02]">
              <tr>
                <th className={th}>Atleta</th>
                <th className={th} title="Versión que ve el atleta en su link">Plan</th>
                <th className={th} title="Cuándo envió su último registro">Último registro</th>
                <th className={th} title="Días con adherencia total (todas las comidas y kcal ± 5 %) · barras: % de kcal de cada uno de los últimos 14 días">Adherencia 7 días</th>
                <th className={th} title="Comidas tildadas / planificadas en la semana">Comidas</th>
                <th className={th} title="Promedio de kcal comidas contra la meta, días ON y OFF">Kcal</th>
                <th className={th} title="Promedio de proteína contra la meta">Proteína</th>
                <th className={th} title="Promedio de agua contra la meta">Agua</th>
                <th className={th} title="Días con salida social o comida afuera">Salidas</th>
                <th className={th} title="Último peso y cambio en 7 días / 4 semanas (verde: hacia el objetivo)">Peso</th>
                <th className={th} title="Días seguidos en adherencia total">Racha</th>
                <th className={th}>Alertas</th>
                <th className={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-6 text-center text-[13px] text-mute">
                    Ningún atleta coincide con la búsqueda o el filtro.
                  </td>
                </tr>
              )}
              {shown.map((r) => {
                const s = r.stats, a = r.input, isOpen = open === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr data-athlete-row onClick={() => setOpen(isOpen ? null : a.id)} className={cx('cursor-pointer border-b border-line transition hover:bg-white/[0.02]', isOpen && 'bg-white/[0.03]')}>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <span className={cx('h-2 w-2 flex-none rounded-full', r.alerts[0] ? LEVEL[r.alerts[0].level].dot : 'bg-[#22C55E]')} />
                          <span>
                            <b className="block text-[13.5px] text-ink">{a.name}</b>
                            <span className="text-[11.5px] text-mute">{a.goal ? GOAL_LABEL[a.goal] : a.phase || '—'}</span>
                          </span>
                          <ChevronDown className={cx('ml-1 h-3.5 w-3.5 text-mute transition-transform', isOpen && 'rotate-180')} />
                        </div>
                      </td>
                      <td className={td}>
                        {a.published ? (
                          <>
                            <span className="text-ink">v{a.published.version}</span> <span className="text-mute">· {timeAgo(Date.parse(a.published.at))}</span>
                          </>
                        ) : (
                          <span className="text-mute">Sin publicar</span>
                        )}
                        {s.pendingPublish && <div className="mt-0.5 text-[11px] font-semibold text-fire">Cambios sin publicar</div>}
                      </td>
                      <td className={cx(td, s.daysSinceLog !== null && s.daysSinceLog >= 3 ? 'text-[#FCA5A5]' : 'text-steel')}>
                        {s.lastActivityAt ? timeAgo(Date.parse(s.lastActivityAt)) : <span className="text-mute">Nunca</span>}
                        {s.today && <div className="mt-0.5 text-[11px] text-mute">Hoy {s.today.done}/{s.today.total} comidas</div>}
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <b className="tnum text-ink">{s.adherentDays7}/7</b>
                          <Spark data={s.spark14} />
                        </div>
                      </td>
                      <td className={cx(td, 'tnum text-steel')}>
                        {s.meals7.done}/{s.meals7.planned}
                      </td>
                      <td className={cx(td, 'tnum whitespace-nowrap text-steel')}>
                        ON {s.kcalPct.on ?? '—'}
                        {s.kcalPct.on !== null && '%'} · OFF {s.kcalPct.off ?? '—'}
                        {s.kcalPct.off !== null && '%'}
                      </td>
                      <td className={cx(td, 'tnum', s.proteinPct !== null && s.proteinPct < 80 ? 'text-[#FDE68A]' : 'text-steel')}>{s.proteinPct !== null ? `${s.proteinPct}%` : '—'}</td>
                      <td className={cx(td, 'tnum', s.waterPct !== null && s.waterPct < 60 ? 'text-[#FDE68A]' : 'text-steel')}>{s.waterPct !== null ? `${s.waterPct}%` : '—'}</td>
                      <td className={cx(td, 'tnum text-steel')}>{s.social7}</td>
                      <td className={cx(td, 'tnum whitespace-nowrap')}>
                        {s.weight.last !== null ? (
                          <>
                            <b className="text-ink">{kg(s.weight.last)} kg</b>
                            <div className="mt-0.5 flex gap-2 text-[11px]">
                              <span title="7 días">
                                7d <Trend d={s.weight.d7} goal={a.goal} />
                              </span>
                              <span title="4 semanas">
                                4s <Trend d={s.weight.d28} goal={a.goal} />
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-mute">—</span>
                        )}
                      </td>
                      <td className={cx(td, 'tnum text-steel')}>{s.streak ? `🔥 ${s.streak}` : '—'}</td>
                      <td className={td}>
                        <div className="flex max-w-[240px] flex-wrap gap-1">
                          {r.alerts.slice(0, 2).map((x) => (
                            <span key={x.key} title={x.detail} className={cx('rounded-full border px-2 py-0.5 text-[11px] font-semibold', LEVEL[x.level].chip)}>
                              {x.title}
                            </span>
                          ))}
                          {r.alerts.length > 2 && <span className="px-1 text-[11px] text-mute">+{r.alerts.length - 2}</span>}
                          {!r.alerts.length && (
                            <span className="inline-flex items-center gap-1 text-[11.5px] text-[#4ADE80]">
                              <Check className="h-3.5 w-3.5" /> Al día
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={td} onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <button data-row-edit disabled={!planIdOf(a.id)} onClick={() => openInBuilder(a.id)} title={planIdOf(a.id) ? 'Abrir su plan en Comidas' : 'Su plan no está en este dispositivo'} className="flex items-center gap-1 whitespace-nowrap rounded-md border border-cyan-hud/40 px-2 py-1 text-[11.5px] font-semibold text-cyan-hud hover:bg-cyan-hud/10 disabled:border-line disabled:text-mute">
                            <Pencil className="h-3 w-3" /> Editar plan
                          </button>
                          <button data-row-wa onClick={() => void copyLink(r)} className="flex items-center gap-1 whitespace-nowrap rounded-md border border-[#22C55E]/40 px-2 py-1 text-[11.5px] font-semibold text-[#4ADE80] hover:bg-[#22C55E]/10">
                            <Copy className="h-3 w-3" /> {copied === a.id ? '¡Copiado!' : 'Copiar link WhatsApp'}
                          </button>
                          {r.adjustments.length > 0 && (
                            <button data-row-adjust onClick={() => setAdjust({ row: r, adj: r.adjustments[0] })} className="flex items-center gap-1 whitespace-nowrap rounded-md bg-fire px-2 py-1 text-[11.5px] font-bold text-white hover:bg-fire-hot">
                              <Wand2 className="h-3 w-3" /> Ver ajuste sugerido
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line bg-carbon/40">
                        <td colSpan={13} className="px-4 py-4">
                          <Detail row={r} onOpen={() => openInBuilder(a.id)} canOpen={Object.values(links).some((l) => l.athleteId === a.id)} onAck={refresh} onAdjust={(adj) => setAdjust({ row: r, adj })} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adjust && (
        <AdjustModal
          row={adjust.row}
          adj={adjust.adj}
          planId={planIdOf(adjust.row.input.id)}
          onClose={() => setAdjust(null)}
          onDone={() => {
            setAdjust(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

type Filter = 'all' | 'adjust' | 'nocheckin' | 'ok';
const daysSince = (week: string) => Math.round((Date.parse(`${localToday()}T12:00:00Z`) - Date.parse(`${week}T12:00:00Z`)) / 864e5);
const FILTERS: Record<Filter, { label: string; test: (r: BoardRow) => boolean }> = {
  all: { label: 'Todos', test: () => true },
  adjust: { label: 'Requieren ajuste', test: (r) => r.adjustments.length > 0 || r.alerts.some((a) => a.level === 'red' || a.level === 'orange') },
  nocheckin: { label: 'Sin check-in', test: (r) => !r.lastCheckin || daysSince(r.lastCheckin.week) > 13 },
  ok: { label: 'Al día', test: (r) => !r.alerts.some((a) => a.level !== 'info') },
};

const ENERGY = ['Agotado', 'Cansado', 'Normal', 'Bien', 'A full'];
const HUNGER = ['Nada', 'Poca', 'Normal', 'Bastante', 'Mucha'];

/** Último check-in semanal del atleta (energía, hambre, digestión, peso y foto). */
function CheckinCard({ c }: { c: BoardRow['lastCheckin'] }) {
  if (!c) return <p className="text-[12.5px] text-mute">Todavía no hizo su check-in semanal.</p>;
  return (
    <div data-checkin className="rounded-lg border border-line bg-panel px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="text-[13px] text-ink">Check-in · semana del {c.week.split('-').reverse().join('/')}</b>
        <span className="text-[11px] text-mute">hace {daysSince(c.week)} días</span>
      </div>
      <div className="mt-2 flex gap-3">
        {c.photo && <img src={c.photo} alt="Foto de progreso" className="h-20 w-20 flex-none rounded-md object-cover" />}
        <ul className="grid flex-1 gap-1 text-[12.5px] text-steel sm:grid-cols-2">
          <li>⚡ Energía: <b className={c.energy <= 2 ? 'text-[#FCA5A5]' : 'text-ink'}>{c.energy}/5 · {ENERGY[c.energy - 1]}</b></li>
          <li>🍽 Hambre: <b className={c.hunger >= 4 ? 'text-[#FDBA74]' : 'text-ink'}>{c.hunger}/5 · {HUNGER[c.hunger - 1]}</b></li>
          <li className="sm:col-span-2">🫃 Digestión: <b className={c.heavy ? 'text-[#FDE68A]' : 'text-ink'}>{c.heavy ? `algo le cayó pesado${c.note ? ` — «${c.note}»` : ''}` : 'bien'}</b></li>
          {c.kg !== null && <li>⚖ Peso: <b className="text-ink">{kg(c.kg)} kg</b></li>}
        </ul>
      </div>
    </div>
  );
}

/**
 * Vista previa del ajuste sugerido: macros y calorías de antes y después, con «Aplicar y publicar» en un clic
 * (abre su plan, aplica los nuevos g/kg, reescala las comidas y publica la versión nueva).
 */
function AdjustModal({ row, adj, planId, onClose, onDone }: { row: BoardRow; adj: Adjustment; planId?: string; onClose: () => void; onDone: () => void }) {
  const roster = usePlanStore((s) => s.roster);
  const active = usePlanStore((s) => s.plan);
  const selectAthlete = usePlanStore((s) => s.selectAthlete);
  const adjustMacros = usePlanStore((s) => s.adjustMacros);
  const publish = useCloudStore((s) => s.publish);
  const cloudErr = useCloudStore((s) => s.error);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const plan = planId ? (active.id === planId ? active : roster[planId]) : undefined;
  const others = row.adjustments.filter((x) => x.key !== adj.key);
  const apply = async () => {
    if (!plan || !planId) return;
    setBusy(true);
    setMsg('');
    if (usePlanStore.getState().plan.id !== planId) selectAthlete(planId);
    const cur = usePlanStore.getState().plan.periodization;
    adjustMacros(applyDelta({ on: cur.on, off: cur.off }, adj));
    const v = await publish(`Ajuste: ${adj.title}`);
    if (v) {
      try {
        if (!adj.alertKey.startsWith('bulk_')) await ackAlert(row.input.id, adj.alertKey, 14);
      } catch {}
      onDone();
    } else {
      setBusy(false);
      setMsg(useCloudStore.getState().error || 'No se pudo publicar. El ajuste quedó aplicado en su plan: publicalo desde Publicar.');
    }
  };
  let table: React.ReactNode = null;
  if (plan) {
    const before = computeTelemetry(plan);
    const next = applyDelta({ on: plan.periodization.on, off: plan.periodization.off }, adj);
    const after = computeTelemetry({ ...plan, periodization: { ...plan.periodization, ...next } });
    const rowsT: [string, string, string][] = [
      ['Día de entreno · kcal', `${Math.round(before.kcalOn)}`, `${Math.round(after.kcalOn)}`],
      ['Día de descanso · kcal', `${Math.round(before.kcalOff)}`, `${Math.round(after.kcalOff)}`],
      ['Entreno · P / C / G (g/kg)', `${plan.periodization.on.p} / ${plan.periodization.on.c} / ${plan.periodization.on.f}`, `${next.on.p} / ${next.on.c} / ${next.on.f}`],
      ['Descanso · P / C / G (g/kg)', `${plan.periodization.off.p} / ${plan.periodization.off.c} / ${plan.periodization.off.f}`, `${next.off.p} / ${next.off.c} / ${next.off.f}`],
    ];
    table = (
      <table className="tnum mt-3 w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-[11px] text-mute">
            <th className="py-1 font-normal"> </th>
            <th className="py-1 font-normal">Ahora</th>
            <th className="py-1 font-normal">Con el ajuste</th>
          </tr>
        </thead>
        <tbody>
          {rowsT.map(([l, a, b]) => (
            <tr key={l} className="border-t border-line">
              <td className="py-1.5 text-steel">{l}</td>
              <td className="py-1.5 text-steel">{a}</td>
              <td className={cx('py-1.5 font-semibold', a === b ? 'text-steel' : 'text-[#4ADE80]')}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Ajuste sugerido" onClick={onClose}>
      <div data-adjust-modal className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-fire">AJUSTE SUGERIDO · {row.input.name.toUpperCase()}</div>
        <h3 className="mt-1 text-[17px] font-bold leading-snug text-ink">{adj.title}</h3>
        <p className="mt-1.5 text-[13px] text-steel">{adj.why}</p>
        <p className="mt-1 text-[12px] text-mute">La proteína no cambia. Las porciones de sus comidas se reescalan solas y sigue dentro de los topes por toma.</p>
        {table ?? <p className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[12.5px] text-[#FDE68A]">Su plan no está guardado en este dispositivo. Abrilo desde la nube en el Builder para poder aplicar el ajuste.</p>}
        {others.length > 0 && <p className="mt-3 text-[12px] text-mute">También sugerido: {others.map((o) => o.title).join(' · ')}</p>}
        {(msg || (busy && cloudErr)) && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] text-[#FCA5A5]">{msg || cloudErr}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2.5 text-[13px] font-semibold text-steel hover:text-ink">
            Cancelar
          </button>
          <button data-adjust-apply disabled={!plan || busy} onClick={() => void apply()} className="flex items-center gap-1.5 rounded-lg bg-fire px-4 py-2.5 text-[13px] font-bold text-white hover:bg-fire-hot disabled:opacity-50">
            <Wand2 className="h-4 w-4" /> {busy ? 'Publicando…' : 'Aplicar y publicar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** ¿Qué significan los colores y las alertas? (plegable) */
function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-panel/60 px-3 py-2 text-[12.5px]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between font-semibold text-steel hover:text-ink" aria-expanded={open}>
        ¿Qué significan las alertas y los colores?
        <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 grid gap-1.5 text-steel sm:grid-cols-2">
          <p><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-danger" /><b className="text-ink">Urgente:</b> lleva días sin registrar, cumple poco el plan o el peso cambia demasiado rápido. Escribile hoy.</p>
          <p><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-fire" /><b className="text-ink">Revisar:</b> cumple el plan pero el peso no se mueve. Puede ser momento de ajustar las calorías.</p>
          <p><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold" /><b className="text-ink">Atención:</b> se saltea una comida, le falta proteína, se pasa de calorías, sale mucho a comer o toma poca agua.</p>
          <p><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-steel" /><b className="text-ink">Info:</b> detalles para ordenar: cambios sin publicar, días de entreno distintos o que dejó de pesarse.</p>
          <p className="sm:col-span-2"><b className="text-ink">Adherencia:</b> días en que tildó todas las comidas y comió lo planeado (± 5 %). Las barras muestran el % de calorías de cada uno de los últimos 14 días: <span className="text-[#4ADE80]">verde</span> justo, <span className="text-cyan-hud">celeste</span> cerca, <span className="text-[#FDBA74]">naranja</span> lejos. Tocá un atleta para ver el detalle. «Visto» oculta la alerta 7 días; «Posponer» la vuelve a mostrar en 3.</p>
        </div>
      )}
    </div>
  );
}

function Detail({ row, onOpen, canOpen, onAck, onAdjust }: { row: BoardRow; onOpen: () => void; canOpen: boolean; onAck: () => void; onAdjust: (a: Adjustment) => void }) {
  const today = localToday();
  const byDay = Object.fromEntries(row.input.logs.map((l) => [l.day, l]));
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, -27 + i));
  const missed: Record<string, number> = {};
  for (const d of days.slice(-14)) for (const m of byDay[d]?.missed ?? []) if (d !== today) missed[m] = (missed[m] ?? 0) + 1;
  const ws = [...row.input.weights].sort((x, y) => x.day.localeCompare(y.day)).filter((w) => w.day >= days[0]);
  const ack = async (key: string, d: number) => {
    await ackAlert(row.input.id, key, d);
    onAck();
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-2">
        <div className="text-[12px] font-semibold text-steel">Alertas</div>
        {row.alerts.length === 0 && <p className="text-[12.5px] text-mute">Sin alertas: viene cumpliendo el plan.{row.hidden ? ` (${row.hidden} pospuesta${row.hidden > 1 ? 's' : ''})` : ''}</p>}
        {row.alerts.map((x) => (
          <div key={x.key} className={cx('rounded-lg border px-3 py-2.5', LEVEL[x.level].chip)}>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[13px]">{x.title}</b>
              <span className="text-[10.5px] uppercase tracking-wide opacity-70">{LEVEL[x.level].label}</span>
              <span className="ml-auto flex gap-1.5">
                <button onClick={() => void ack(x.key, 7)} className="rounded-md border border-current/30 px-2 py-0.5 text-[11px] font-semibold opacity-80 hover:opacity-100" title="Ocultar esta alerta por 7 días">
                  Visto
                </button>
                <button onClick={() => void ack(x.key, 3)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] opacity-70 hover:opacity-100" title="Volver a mostrarla en 3 días">
                  <BellOff className="h-3 w-3" /> Posponer 3 días
                </button>
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-steel">{x.detail}</p>
            {row.adjustments.filter((j) => j.alertKey === x.key).map((j) => (
              <button key={j.key} data-alert-adjust onClick={() => onAdjust(j)} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-fire px-2.5 py-1 text-[12px] font-bold text-white hover:bg-fire-hot">
                <Wand2 className="h-3.5 w-3.5" /> Ver ajuste sugerido
              </button>
            ))}
          </div>
        ))}
        {row.adjustments.filter((j) => !row.alerts.some((x) => x.key === j.alertKey)).map((j) => (
          <div key={j.key} className="rounded-lg border border-fire/40 bg-fire/10 px-3 py-2.5 text-[#FDBA74]">
            <b className="text-[13px]">{j.title}</b>
            <p className="mt-1 text-[12.5px] text-steel">{j.why}</p>
            <button data-alert-adjust onClick={() => onAdjust(j)} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-fire px-2.5 py-1 text-[12px] font-bold text-white hover:bg-fire-hot">
              <Wand2 className="h-3.5 w-3.5" /> Ver ajuste sugerido
            </button>
          </div>
        ))}
        <div className="pt-1 text-[12px] font-semibold text-steel">Check-in semanal</div>
        <CheckinCard c={row.lastCheckin} />
        {canOpen && (
          <button onClick={onOpen} className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-cyan-hud/40 bg-cyan-hud/10 px-3 py-2 text-[12.5px] font-semibold text-cyan-hud hover:border-cyan-hud">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir su plan en el Builder
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-steel">Últimos 28 días</div>
          <div className="grid grid-cols-7 gap-1" aria-label="Calendario de adherencia">
            {days.map((d) => {
              const l = byDay[d];
              const pct = l && l.kcal_target ? l.kcal / l.kcal_target : null;
              return (
                <span
                  key={d}
                  title={`${d}: ${l ? `${l.meals_done}/${l.meals_total} comidas · ${pct !== null ? Math.round(pct * 100) : 0} % kcal` : 'sin registro'}`}
                  className={cx('h-5 rounded', !l ? 'bg-white/[0.05]' : l.adherent ? 'bg-[#22C55E]/80' : pct !== null && pct >= 0.8 ? 'bg-cyan-hud/60' : 'bg-fire/60', d === today && 'ring-1 ring-white/40')}
                />
              );
            })}
          </div>
          <div className="mt-1 flex gap-3 text-[10.5px] text-mute">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#22C55E]/80" />Cumplido</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-cyan-hud/60" />Parcial</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-fire/60" />Bajo</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-white/[0.08]" />Sin registro</span>
          </div>
        </div>
        {ws.length >= 2 && <WeightChart ws={ws} from={days[0]} />}
        {Object.keys(missed).length > 0 && (
          <div>
            <div className="mb-1 text-[12px] font-semibold text-steel">Comidas sin tildar (14 días)</div>
            <ul className="space-y-0.5 text-[12.5px]">
              {Object.entries(missed)
                .sort((x, y) => y[1] - x[1])
                .slice(0, 4)
                .map(([m, n]) => (
                  <li key={m} className="flex justify-between gap-2">
                    <span className="text-ink">{m}</span>
                    <span className="tnum text-mute">{n} día{n > 1 ? 's' : ''}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function WeightChart({ ws, from }: { ws: { day: string; kg: number }[]; from: string }) {
  const W = 300, H = 70, pad = 6;
  let min = Math.min(...ws.map((w) => w.kg)), max = Math.max(...ws.map((w) => w.kg));
  if (max - min < 1) [min, max] = [(min + max) / 2 - 0.5, (min + max) / 2 + 0.5];
  const x = (d: string) => pad + ((Date.parse(d) - Date.parse(from)) / (27 * 864e5)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (H - pad * 2);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px] font-semibold text-steel">
        <span>Peso · 4 semanas</span>
        <span className="tnum font-normal text-mute">
          {kg(min)}–{kg(max)} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[70px] w-full rounded-md bg-cyan-hud/[0.04]" preserveAspectRatio="none" aria-label="Curva de peso">
        <polyline points={ws.map((w) => `${x(w.day).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ')} fill="none" stroke="#38BDF8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {ws.map((w, i) => (
          <circle key={w.day} cx={x(w.day)} cy={y(w.kg)} r={i === ws.length - 1 ? 3.2 : 2} fill={i === ws.length - 1 ? '#F97316' : '#38BDF8'} />
        ))}
      </svg>
    </div>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line2 bg-panel/60 px-6 py-10 text-center">
      <Cloud className="mx-auto h-8 w-8 text-cyan-hud" />
      <div className="mt-3 text-[16px] font-bold text-ink">{title}</div>
      <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-steel">{body}</p>
      {children}
    </div>
  );
}
