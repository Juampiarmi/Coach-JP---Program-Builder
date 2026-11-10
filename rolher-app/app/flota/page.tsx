'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { ConfigBanner } from '@/components/ConfigBanner';
import { UnidadFiltro } from '@/components/UnidadFiltro';
import { VehiculoCard } from '@/components/flota/VehiculoCard';
import { VehiculoModal } from '@/components/flota/VehiculoModal';
import { fetchMovimientos, fetchVehiculos, mapVehiculo } from '@/lib/data';
import { costosPorVehiculo, nivelService, nivelVencimiento } from '@/lib/finance';
import { getSupabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';
import type { Movimiento, Result, Vehiculo } from '@/lib/types';

async function cargarFlota(): Promise<Result<{ vehiculos: Vehiculo[]; movs: Movimiento[] }>> {
  const [v, m] = await Promise.all([fetchVehiculos(), fetchMovimientos()]);
  if (v.error !== null) return { data: null, error: v.error };
  // Si fallan los movimientos la flota sigue visible, solo sin costos.
  return { data: { vehiculos: v.data, movs: m.error === null ? m.data : [] }, error: null };
}

const ordenar = (lista: Vehiculo[]) => [...lista].sort((a, b) => a.patente.localeCompare(b.patente));

export default function FlotaPage() {
  const [unidad, setUnidad] = useState('');
  const [modal, setModal] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const { data, setData, error, cargando, recargar } = useAsync(cargarFlota);

  const upsert = useCallback(
    (v: Vehiculo) =>
      setData((prev) => {
        if (!prev) return prev;
        const resto = prev.vehiculos.filter((x) => x.id !== v.id);
        return { ...prev, vehiculos: v.activo ? ordenar([...resto, v]) : resto };
      }),
    [setData],
  );

  // Realtime: altas/ediciones hechas desde otro dispositivo aparecen sin recargar.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const canal = sb
      .channel('flota-vehiculos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehiculos' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id;
          if (id) setData((prev) => (prev ? { ...prev, vehiculos: prev.vehiculos.filter((x) => x.id !== id) } : prev));
        } else {
          upsert(mapVehiculo(payload.new as Record<string, unknown>));
        }
      })
      .subscribe((status) => setEnVivo(status === 'SUBSCRIBED'));
    return () => {
      void sb.removeChannel(canal);
    };
  }, [setData, upsert]);

  const costos = useMemo(() => costosPorVehiculo(data?.movs ?? []), [data]);
  const patentes = useMemo(() => new Set((data?.vehiculos ?? []).map((v) => v.patente)), [data]);
  const visibles = useMemo(
    () => (data?.vehiculos ?? []).filter((v) => !unidad || v.unidad === unidad),
    [data, unidad],
  );
  const alertas = useMemo(
    () =>
      visibles.filter((v) =>
        [nivelVencimiento(v.vtv_vencimiento).nivel, nivelVencimiento(v.seguro_vencimiento).nivel, nivelService(v).nivel].some(
          (n) => n === 'vencida' || n === 'proxima',
        ),
      ).length,
    [visibles],
  );
  const cerrarModal = useCallback(() => setModal(false), []);

  return (
    <>
      <PageHeader
        title="Flota"
        subtitle={
          data
            ? `${visibles.length} ${visibles.length === 1 ? 'vehículo' : 'vehículos'}${alertas ? ` · ${alertas} con alertas` : ''}`
            : 'Fichas por patente, costos y vencimientos'
        }
        action={
          <button type="button" onClick={() => setModal(true)} className="btn-primary w-full sm:w-auto">
            <Plus className="h-5 w-5" aria-hidden /> Agregar vehículo
          </button>
        }
      />
      <ConfigBanner />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <UnidadFiltro value={unidad} onChange={setUnidad} />
        {enVivo && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Radio className="h-3.5 w-3.5" aria-hidden /> En vivo
          </span>
        )}
      </div>

      {cargando && !data ? (
        <LoadingState texto="Cargando flota…" />
      ) : error ? (
        <ErrorState mensaje={error} onRetry={() => void recargar()} />
      ) : visibles.length === 0 ? (
        <Card>
          <EmptyState
            titulo={unidad ? `Sin vehículos en ${unidad}` : 'La flota está vacía'}
            texto="Agregá el primer vehículo para seguir sus costos y vencimientos."
            action={
              <button type="button" onClick={() => setModal(true)} className="btn-primary">
                <Plus className="h-5 w-5" aria-hidden /> Agregar vehículo
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((v) => (
            <VehiculoCard key={v.id} v={v} costoAcumulado={costos.get(v.id) ?? 0} />
          ))}
        </div>
      )}

      <VehiculoModal abierto={modal} onClose={cerrarModal} onCreado={upsert} patentesExistentes={patentes} />
    </>
  );
}
