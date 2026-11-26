'use client';

import { useEffect, useState } from 'react';
import { Rocket, ShieldAlert } from 'lucide-react';
import { computeTelemetry, fmt0 } from '@/lib/bioenergetics';
import { shownDayTotals } from '@/lib/netCarbView';
import { cloudConfigured } from '@/lib/cloud/config';
import { qualityChecks, type Light } from '@/lib/quality';
import { useExportFreshness } from '@/components/deploy/ExportFreshness';
import { useCloudStore } from '@/store/useCloudStore';
import { usePlanStore } from '@/store/usePlanStore';
import { cx } from '../hud/primitives';

const DOT: Record<Light, string> = { ok: 'bg-[#22C55E]', warn: 'bg-gold', bad: 'bg-fire', block: 'bg-danger' };

function Bar({ label, got, goal }: { label: string; got: number; goal: number }) {
  const pct = goal ? got / goal : 0;
  const off = Math.abs(pct - 1) > 0.1;
  return (
    <div className="grid grid-cols-[34px_1fr_auto] items-center gap-1.5 text-[10.5px]">
      <span className="text-mute">{label}</span>
      <span className="h-1.5 overflow-hidden rounded bg-white/[0.06]">
        <i className={cx('block h-full rounded', off ? 'bg-fire' : 'bg-cyan-hud')} style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </span>
      <span className={cx('tnum font-mono', off ? 'text-fire' : 'text-steel')}>{Math.round(pct * 100)}%</span>
    </div>
  );
}

/**
 * Resumen fijo al editar comidas: calorías y macros de entreno y descanso contra la meta, el semáforo de calidad
 * compacto y el botón principal «Publicar en la nube».
 */
export function StickySummary() {
  const plan = usePlanStore((s) => s.plan);
  const setDeployTab = usePlanStore((s) => s.setDeployTab);
  const publish = useCloudStore((s) => s.publish);
  const busy = useCloudStore((s) => s.busy);
  const user = useCloudStore((s) => s.user);
  const fresh = useExportFreshness().state;
  // Queda fijo justo debajo del encabezado (su alto cambia con el ancho de pantalla).
  const [top, setTop] = useState(112);
  useEffect(() => {
    const h = document.querySelector('header');
    if (!h) return;
    const ro = new ResizeObserver(() => setTop(Math.round(h.getBoundingClientRect().height) + 8));
    ro.observe(h);
    return () => ro.disconnect();
  }, []);
  const t = computeTelemetry(plan);
  const checks = qualityChecks(plan);
  const blocked = checks.some((c) => c.status === 'block');
  const issues = checks.filter((c) => c.status !== 'ok');
  const day = (d: 'on' | 'off') => {
    const got = shownDayTotals(plan, d);
    const goal = d === 'on' ? { ...t.gramsOn, kcal: t.kcalOn } : { ...t.gramsOff, kcal: t.kcalOff };
    return (
      <div className="min-w-[150px] flex-1 space-y-0.5 max-lg:hidden">
        <div className={cx('font-mono text-[9.5px] font-bold tracking-[0.14em]', d === 'on' ? 'text-fire' : 'text-cyan-hud')}>
          {d === 'on' ? 'ENTRENO' : 'DESCANSO'} · {fmt0(got.kcal)}/{fmt0(goal.kcal)} KCAL
        </div>
        <Bar label="Kcal" got={got.kcal} goal={goal.kcal} />
        <Bar label="Prot" got={got.p} goal={goal.p} />
        <Bar label={got.net ? 'C.net' : 'Carb'} got={got.c} goal={goal.c} />
        <Bar label="Gras" got={got.f} goal={goal.f} />
      </div>
    );
  };
  const onPublish = async () => {
    if (!cloudConfigured || !user) return setDeployTab('export');
    await publish();
  };
  return (
    <div data-sticky-summary style={{ top }} className="z-20 -mx-1 rounded-xl border border-line bg-carbon/95 px-3 py-2.5 shadow-[0_12px_30px_-18px_rgba(0,0,0,.9)] backdrop-blur lg:sticky">
      <div className="flex flex-wrap items-center gap-3">
        {day('on')}
        {day('off')}
        <button type="button" onClick={() => setDeployTab('export')} title={issues.map((c) => `${c.label}: ${c.detail}`).join('\n') || 'Todo en verde'} className="flex flex-col items-start gap-1 rounded-lg border border-line px-2.5 py-1.5 text-left hover:border-white/20">
          <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-mute">SEMÁFORO</span>
          <span className="flex gap-1">
            {checks.map((c) => (
              <i key={c.id} className={cx('h-2.5 w-2.5 rounded-full', DOT[c.status])} title={`${c.label}: ${c.detail}`} />
            ))}
          </span>
          <span className={cx('text-[10.5px] font-semibold', blocked ? 'text-[#FCA5A5]' : issues.length ? 'text-[#FDE68A]' : 'text-[#4ADE80]')}>{blocked ? 'Alérgenos: frenado' : issues.length ? `${issues.length} para revisar` : 'Todo en verde'}</span>
        </button>
        <button
          type="button"
          data-sticky-publish
          onClick={() => void onPublish()}
          disabled={blocked || !!busy || (fresh === 'fresh' && !!user)}
          className={cx('flex items-center gap-1.5 rounded-xl px-4 py-3 text-[13.5px] font-bold transition disabled:cursor-default', blocked ? 'bg-danger/20 text-[#FCA5A5]' : fresh === 'fresh' && user ? 'border border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]' : 'bg-fire text-white hover:bg-fire-hot')}
        >
          {blocked ? <ShieldAlert className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
          {blocked ? 'Frenado por alérgenos' : busy ?? (!cloudConfigured ? 'Publicar' : !user ? 'Entrar y publicar' : fresh === 'fresh' ? 'Publicado ✓' : 'Publicar en la nube')}
        </button>
      </div>
    </div>
  );
}
