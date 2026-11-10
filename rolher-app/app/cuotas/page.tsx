'use client';

import { useMemo, useState } from 'react';
import { AlertOctagon, CheckCircle2, Clock, Loader2, RotateCcw, type LucideIcon } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LoadingState, PageHeader, type Tono } from '@/components/ui';
import { ConfigBanner } from '@/components/ConfigBanner';
import { UnidadFiltro } from '@/components/UnidadFiltro';
import { fetchCuotas, marcarCuota } from '@/lib/data';
import { DIAS_ALERTA_CUOTA, proyeccionCobros, semaforoCuota, type Semaforo } from '@/lib/finance';
import { diasHasta, formatFecha, formatMoneda, hoyISO } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import type { Cuota } from '@/lib/types';

const GRUPOS: { key: Semaforo; titulo: string; tono: Tono; icon: LucideIcon }[] = [
  { key: 'VENCIDA', titulo: 'Vencidas', tono: 'rose', icon: AlertOctagon },
  { key: 'PROXIMA', titulo: `Vencen en ${DIAS_ALERTA_CUOTA} días`, tono: 'amber', icon: Clock },
  { key: 'AL_DIA', titulo: 'Al día', tono: 'emerald', icon: CheckCircle2 },
];

function textoDias(c: Cuota): string {
  const d = diasHasta(c.fecha_vencimiento);
  if (d === null) return '';
  if (d < 0) return `Vencida hace ${-d} ${-d === 1 ? 'día' : 'días'}`;
  if (d === 0) return 'Vence hoy';
  return `Vence en ${d} ${d === 1 ? 'día' : 'días'}`;
}

export default function CuotasPage() {
  const [unidad, setUnidad] = useState('');
  const [verCobradas, setVerCobradas] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const { data, setData, error, cargando, recargar } = useAsync(fetchCuotas);
  const filtro = unidad || null;

  const visibles = useMemo(() => (data ?? []).filter((c) => !filtro || c.unidad === filtro), [data, filtro]);
  const proy = useMemo(() => proyeccionCobros(data ?? [], filtro), [data, filtro]);
  const porGrupo = useMemo(() => {
    const g: Record<Semaforo, Cuota[]> = { VENCIDA: [], PROXIMA: [], AL_DIA: [], COBRADA: [] };
    for (const c of visibles) g[semaforoCuota(c)].push(c);
    g.COBRADA.sort((a, b) => (b.fecha_cobro ?? '').localeCompare(a.fecha_cobro ?? ''));
    return g;
  }, [visibles]);

  async function toggle(c: Cuota) {
    const cobrar = c.estado === 'PENDIENTE';
    setProcesando(c.id);
    setErrorAccion(null);
    const res = await marcarCuota(c.id, cobrar);
    setProcesando(null);
    if (res.error !== null) {
      setErrorAccion(res.error);
      return;
    }
    setData((prev) =>
      (prev ?? []).map((x) =>
        x.id === c.id
          ? { ...x, estado: cobrar ? 'COBRADA' : 'PENDIENTE', fecha_cobro: cobrar ? hoyISO() : null }
          : x,
      ),
    );
  }

  const fila = (c: Cuota) => (
    <li key={c.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {c.categoria || 'Venta en cuotas'}
          {c.descripcion ? <span className="font-normal text-slate-500"> · {c.descripcion}</span> : null}
        </p>
        <p className="text-xs text-slate-500">
          {c.unidad} · Cuota {c.numero}/{c.total_cuotas} · {formatFecha(c.fecha_vencimiento)}
          {c.estado === 'PENDIENTE' ? ` · ${textoDias(c)}` : c.fecha_cobro ? ` · Cobrada ${formatFecha(c.fecha_cobro)}` : ''}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-base font-semibold tabular-nums">{formatMoneda(c.monto)}</span>
        <button
          type="button"
          onClick={() => void toggle(c)}
          disabled={procesando !== null}
          className={c.estado === 'PENDIENTE' ? 'btn-primary h-10 px-4 text-sm' : 'btn-secondary h-10 px-4 text-sm'}
        >
          {procesando === c.id ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : c.estado === 'PENDIENTE' ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden />
          )}
          {c.estado === 'PENDIENTE' ? 'Cobrada' : 'Deshacer'}
        </button>
      </div>
    </li>
  );

  return (
    <>
      <PageHeader title="Cobro de cuotas" subtitle="Semáforo de vencimientos y proyección de ingresos" />
      <ConfigBanner />
      <div className="mb-5">
        <UnidadFiltro value={unidad} onChange={setUnidad} />
      </div>

      {cargando && !data ? (
        <LoadingState texto="Cargando cuotas…" />
      ) : error ? (
        <ErrorState mensaje={error} onRetry={() => void recargar()} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-medium text-slate-500">Vencido sin cobrar</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${proy.vencido > 0 ? 'text-rose-600' : ''}`}>
                {formatMoneda(proy.vencido)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-slate-500">A cobrar en 30 días</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoneda(proy.a30)}</p>
              <p className="mt-1 text-xs text-slate-500">Incluye vencido</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-slate-500">A cobrar en 60 días</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoneda(proy.a60)}</p>
              <p className="mt-1 text-xs text-slate-500">Acumulado</p>
            </Card>
          </div>

          {errorAccion && <ErrorState mensaje={errorAccion} />}

          {visibles.length === 0 ? (
            <Card>
              <EmptyState
                titulo="No hay cuotas registradas"
                texto="Al cargar un ingreso con tarjeta en 3 o 6 cuotas, el plan de cobro aparece acá automáticamente."
              />
            </Card>
          ) : (
            <>
              {GRUPOS.map(({ key, titulo, tono, icon: Icon }) =>
                porGrupo[key].length === 0 ? null : (
                  <Card key={key}>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                      <h2 className="flex items-center gap-2 text-base font-semibold">
                        <Icon className="h-4 w-4 text-slate-500" aria-hidden />
                        {titulo}
                      </h2>
                      <Badge tono={tono}>
                        {porGrupo[key].length} · {formatMoneda(porGrupo[key].reduce((s, c) => s + c.monto, 0))}
                      </Badge>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {porGrupo[key].map(fila)}
                    </ul>
                  </Card>
                ),
              )}

              {porGrupo.COBRADA.length > 0 && (
                <Card>
                  <button
                    type="button"
                    onClick={() => setVerCobradas((v) => !v)}
                    aria-expanded={verCobradas}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
                  >
                    <span className="text-base font-semibold">Cobradas</span>
                    <span className="text-sm text-slate-500">
                      {porGrupo.COBRADA.length} · {verCobradas ? 'Ocultar' : 'Mostrar'}
                    </span>
                  </button>
                  {verCobradas && (
                    <ul className="divide-y divide-slate-100 border-t border-slate-100">
                      {porGrupo.COBRADA.map(fila)}
                    </ul>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
