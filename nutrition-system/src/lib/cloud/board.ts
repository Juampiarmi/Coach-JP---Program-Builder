'use client';

import { addDays, computeAlerts, computeStats, riskScore, type Alert, type AthleteInput, type AthleteStats, type Goal, type LogRow } from '../coachAlerts';
import { supa } from './client';

export interface BoardRow {
  input: AthleteInput & { slug: string; phase: string };
  stats: AthleteStats;
  alerts: Alert[];
  hidden: number;
  risk: number;
}

export const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Baja de la nube lo necesario para el panel (sólo resúmenes, nunca los planes completos). */
export async function loadBoard(today = localToday()): Promise<BoardRow[]> {
  const sb = supa();
  const [ath, logs, ws, pubs, drafts, acks] = await Promise.all([
    sb.from('athletes').select('id, slug, name, goal, phase, training_weekdays, created_at').is('archived_at', null),
    sb.from('daily_logs').select('athlete_id, day, mode, meals_done, meals_total, missed, kcal, kcal_target, p, p_target, water_ml, water_target_ml, social, adherent, updated_at').gte('day', addDays(today, -40)),
    sb.from('weight_logs').select('athlete_id, day, kg').gte('day', addDays(today, -60)),
    sb.from('published_plans').select('athlete_id, version, hash, published_at').eq('is_active', true),
    sb.from('plan_drafts').select('athlete_id, hash, updated_at'),
    sb.from('alert_acks').select('athlete_id, alert_key, until'),
  ]);
  for (const r of [ath, logs, ws, pubs, drafts, acks]) if (r.error) throw r.error;
  const group = <T extends { athlete_id: string }>(rows: T[] | null) => {
    const m: Record<string, T[]> = {};
    for (const r of rows ?? []) (m[r.athlete_id] ??= []).push(r);
    return m;
  };
  const L = group(logs.data), W = group(ws.data), A = group(acks.data);
  const P = Object.fromEntries((pubs.data ?? []).map((p) => [p.athlete_id, p]));
  const Dr = Object.fromEntries((drafts.data ?? []).map((d) => [d.athlete_id, d]));
  const now = Date.now();
  return (ath.data ?? [])
    .map((a) => {
      const input = {
        id: a.id,
        slug: a.slug,
        phase: a.phase ?? '',
        name: a.name,
        goal: (a.goal ?? null) as Goal,
        trainingWeekdays: a.training_weekdays ?? [],
        createdAt: a.created_at,
        published: P[a.id] ? { version: P[a.id].version, at: P[a.id].published_at, hash: P[a.id].hash } : null,
        draft: Dr[a.id] ? { hash: Dr[a.id].hash, at: Dr[a.id].updated_at } : null,
        logs: (L[a.id] ?? []).map((l) => ({ ...l, p: Number(l.p), p_target: Number(l.p_target) }) as LogRow),
        weights: (W[a.id] ?? []).map((w) => ({ day: w.day, kg: Number(w.kg) })),
      };
      const stats = computeStats(input, today);
      const all = computeAlerts(input, stats, today, now);
      const acked = new Set((A[a.id] ?? []).filter((k) => Date.parse(k.until) > now).map((k) => k.alert_key));
      const alerts = all.filter((x) => !acked.has(x.key));
      return { input, stats, alerts, hidden: all.length - alerts.length, risk: riskScore(alerts) };
    })
    .sort((x, y) => y.risk - x.risk || x.input.name.localeCompare(y.input.name));
}

/** "Visto" / "Posponer": oculta la alerta hasta `days` días. */
export async function ackAlert(athleteId: string, key: string, days: number) {
  const sb = supa();
  const { data } = await sb.auth.getUser();
  const until = new Date(Date.now() + days * 864e5).toISOString();
  const { error } = await sb.from('alert_acks').upsert({ athlete_id: athleteId, alert_key: key, until, created_by: data.user?.id });
  if (error) throw error;
}
