'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { planFingerprint, timeAgo } from '@/lib/planHash';
import { usePlanStore } from '@/store/usePlanStore';
import { useCloudStore } from '@/store/useCloudStore';

/**
 * Estado de entrega del atleta activo: nunca entregado, al día o con cambios sin entregar.
 * Con la nube conectada se compara contra el plan publicado; si no, contra la última exportación del archivo.
 */
export function useExportFreshness(mode: 'auto' | 'file' = 'auto') {
  const plan = usePlanStore((s) => s.plan);
  const exported = usePlanStore((s) => s.exports[s.plan.id]);
  const link = useCloudStore((s) => s.links[plan.id]);
  const pub = useCloudStore((s) => (link ? s.published[link.athleteId] : undefined));
  const hash = useMemo(() => planFingerprint(plan), [plan]);
  const cloud = !!link && mode === 'auto';
  const last = cloud ? (pub ? { at: Date.parse(pub.at), hash: pub.hash } : undefined) : exported;
  const state: 'never' | 'fresh' | 'stale' = !last ? 'never' : last.hash === hash ? 'fresh' : 'stale';
  return { state, last, hash, cloud };
}

/** Banner del panel de exportación con re-exportación en un clic. */
export function ExportFreshness({ onReexport, busy }: { onReexport: () => void; busy?: boolean }) {
  const { state, last } = useExportFreshness('file');
  if (state === 'fresh' && last)
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-cyan-hud/30 bg-cyan-hud/[0.06] px-3 py-2.5 text-[12.5px] text-steel">
        <CheckCircle2 className="h-4 w-4 flex-none text-cyan-hud" />
        <span>
          <b className="text-ink">Plan al día.</b> Exportado {timeAgo(last.at)}: el atleta tiene la última versión (si ya subiste ese archivo).
        </span>
      </div>
    );
  return (
    <div
      role="alert"
      className={
        'mb-3 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 text-[12.5px] ' +
        (state === 'stale' ? 'border-fire/60 bg-fire/[0.1] text-ink' : 'border-line bg-white/[0.03] text-steel')
      }
    >
      <AlertTriangle className={'h-4 w-4 flex-none ' + (state === 'stale' ? 'text-fire' : 'text-mute')} />
      <span className="min-w-0 flex-1">
        {state === 'stale' && last ? (
          <>
            <b className="text-fire">Plan desactualizado.</b> Lo editaste después de la última exportación ({timeAgo(last.at)}). El atleta sigue viendo la versión anterior hasta que subas el nuevo index.html.
          </>
        ) : (
          <>
            <b className="text-ink">Todavía no exportaste este plan.</b> Generá el index.html para publicarlo en la app del atleta.
          </>
        )}
      </span>
      <button
        onClick={onReexport}
        disabled={busy}
        className="flex flex-none items-center gap-1.5 rounded-lg bg-fire px-3 py-2 text-[12px] font-bold text-white shadow-[0_6px_18px_-8px_rgba(249,115,22,.9)] hover:bg-fire/90 disabled:opacity-50"
      >
        <Zap className="h-3.5 w-3.5" /> {state === 'stale' ? 'Re-exportar ahora' : 'Exportar ahora'}
      </button>
    </div>
  );
}
