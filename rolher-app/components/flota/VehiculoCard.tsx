import { CalendarCheck, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import { Badge, type Tono } from '@/components/ui';
import { nivelService, nivelVencimiento, type NivelAlerta } from '@/lib/finance';
import { formatFecha, formatMoneda } from '@/lib/format';
import { formatoPatente, mostrarPatente } from '@/lib/validation';
import type { Vehiculo } from '@/lib/types';

const TONO: Record<NivelAlerta, Tono> = { ok: 'emerald', proxima: 'amber', vencida: 'rose', sin_dato: 'slate' };

function textoVenc(nivel: NivelAlerta, dias: number | null, fecha: string | null): string {
  if (nivel === 'sin_dato') return 'Sin dato';
  if (nivel === 'vencida') return `Vencida (${formatFecha(fecha)})`;
  if (dias === 0) return 'Vence hoy';
  return nivel === 'proxima' ? `Vence en ${dias} días` : `Al día · ${formatFecha(fecha)}`;
}

function Alerta({ icon: Icon, label, nivel, texto }: { icon: LucideIcon; label: string; nivel: NivelAlerta; texto: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden />
        {label}
      </span>
      <Badge tono={TONO[nivel]}>{texto}</Badge>
    </div>
  );
}

export function VehiculoCard({ v, costoAcumulado }: { v: Vehiculo; costoAcumulado: number }) {
  const vtv = nivelVencimiento(v.vtv_vencimiento);
  const seguro = nivelVencimiento(v.seguro_vencimiento);
  const service = nivelService(v);
  const formato = formatoPatente(v.patente);

  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Chapa estilizada */}
          <p className="inline-flex items-center rounded-md border-2 border-slate-900 bg-white px-2.5 py-0.5 font-mono text-lg font-bold tracking-widest text-slate-900">
            {mostrarPatente(v.patente)}
          </p>
          <p className="mt-2 truncate text-sm font-medium text-slate-900">
            {v.marca} {v.modelo}
            {v.anio ? <span className="font-normal text-slate-500"> · {v.anio}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge>{v.unidad}</Badge>
          {formato && <span className="text-[11px] uppercase tracking-wide text-slate-400">{formato === 'MERCOSUR' ? 'Mercosur' : 'Formato viejo'}</span>}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-medium text-slate-500">Costos acumulados</p>
        <p className="text-xl font-semibold tabular-nums">{formatMoneda(costoAcumulado)}</p>
      </div>

      <div className="mt-3 divide-y divide-slate-100">
        <Alerta icon={CalendarCheck} label="VTV" nivel={vtv.nivel} texto={textoVenc(vtv.nivel, vtv.dias, v.vtv_vencimiento)} />
        <Alerta icon={ShieldCheck} label="Seguro" nivel={seguro.nivel} texto={textoVenc(seguro.nivel, seguro.dias, v.seguro_vencimiento)} />
        <Alerta
          icon={Wrench}
          label="Service"
          nivel={service.nivel}
          texto={
            service.kmRestantes === null
              ? 'Sin dato'
              : service.kmRestantes <= 0
                ? `Vencido (${Math.abs(service.kmRestantes).toLocaleString('es-AR')} km)`
                : `Faltan ${service.kmRestantes.toLocaleString('es-AR')} km`
          }
        />
      </div>
    </article>
  );
}
