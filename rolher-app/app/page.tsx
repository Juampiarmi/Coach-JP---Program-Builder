'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Clock, PlusCircle, Scale, Wallet } from 'lucide-react';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { ConfigBanner } from '@/components/ConfigBanner';
import { UnidadFiltro } from '@/components/UnidadFiltro';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { FlujoChart } from '@/components/dashboard/FlujoChart';
import { fetchCuotas, fetchMovimientos } from '@/lib/data';
import { calcularKpis, flujoMensual } from '@/lib/finance';
import { formatFecha, formatMoneda } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import type { Cuota, Movimiento, Result } from '@/lib/types';

async function cargarDashboard(): Promise<Result<{ movs: Movimiento[]; cuotas: Cuota[] }>> {
  const [movs, cuotas] = await Promise.all([fetchMovimientos(), fetchCuotas()]);
  if (movs.error !== null) return { data: null, error: movs.error };
  if (cuotas.error !== null) return { data: null, error: cuotas.error };
  return { data: { movs: movs.data, cuotas: cuotas.data }, error: null };
}

export default function DashboardPage() {
  const [unidad, setUnidad] = useState('');
  const { data, error, cargando, recargar } = useAsync(cargarDashboard);
  const filtro = unidad || null;

  const kpis = useMemo(() => (data ? calcularKpis(data.movs, data.cuotas, filtro) : null), [data, filtro]);
  const flujo = useMemo(() => (data ? flujoMensual(data.movs, filtro) : []), [data, filtro]);
  const recientes = useMemo(
    () => (data ? data.movs.filter((m) => !filtro || m.unidad === filtro).slice(0, 8) : []),
    [data, filtro],
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resultado acumulado y caja real disponible"
        action={
          <Link href="/carga" className="btn-primary w-full sm:w-auto">
            <PlusCircle className="h-5 w-5" aria-hidden /> Nueva carga
          </Link>
        }
      />
      <ConfigBanner />

      <div className="mb-5">
        <UnidadFiltro value={unidad} onChange={setUnidad} />
      </div>

      {cargando && !data ? (
        <LoadingState texto="Cargando indicadores…" />
      ) : error ? (
        <ErrorState mensaje={error} onRetry={() => void recargar()} />
      ) : kpis ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Caja real disponible"
              valor={formatMoneda(kpis.cajaReal)}
              detalle="Contado + cuotas cobradas − egresos"
              icon={Wallet}
              destacado
              negativo={kpis.cajaReal < 0}
            />
            <KpiCard label="Ingresos" valor={formatMoneda(kpis.ingresos)} icon={ArrowUpRight} />
            <KpiCard label="Egresos" valor={formatMoneda(kpis.egresos)} icon={ArrowDownRight} />
            <KpiCard
              label="Resultado"
              valor={formatMoneda(kpis.resultado)}
              detalle={kpis.margen === null ? 'Sin ingresos' : `Margen ${(kpis.margen * 100).toFixed(1)}%`}
              icon={Scale}
              negativo={kpis.resultado < 0}
            />
          </div>

          {kpis.porCobrar > 0 && (
            <Link
              href="/cuotas"
              className="card flex items-center justify-between gap-3 p-4 transition hover:border-slate-300"
            >
              <span className="flex items-center gap-3 text-sm text-slate-600">
                <Clock className="h-5 w-5 text-slate-400" aria-hidden />
                Cuotas pendientes de cobro
              </span>
              <span className="font-semibold tabular-nums">{formatMoneda(kpis.porCobrar)}</span>
            </Link>
          )}

          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">Ingresos vs. egresos · últimos 6 meses</h2>
            <FlujoChart data={flujo} />
          </Card>

          <Card>
            <h2 className="border-b border-slate-100 px-4 py-3 text-base font-semibold sm:px-5">Últimos movimientos</h2>
            {recientes.length === 0 ? (
              <EmptyState
                titulo="Todavía no hay movimientos"
                texto="Registrá el primer ingreso o egreso desde Carga Rápida."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recientes.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {m.categoria}
                        {m.descripcion ? <span className="font-normal text-slate-500"> · {m.descripcion}</span> : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.unidad} · {formatFecha(m.fecha)}
                        {m.cuotas > 1 ? ` · ${m.cuotas} cuotas` : ''}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {m.tipo === 'INGRESO' ? '+' : '−'}
                      {formatMoneda(m.monto)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
