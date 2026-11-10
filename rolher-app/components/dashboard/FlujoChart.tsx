'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PuntoFlujo } from '@/lib/finance';
import { etiquetaMes, formatMoneda, formatMonedaCompacta } from '@/lib/format';

// Paleta validada (CVD ΔE ≥ 13 en protanopia). Debe coincidir con tailwind.config.ts.
const COLOR_INGRESO = '#0d9488';
const COLOR_EGRESO = '#ea580c';

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: { dataKey?: string | number; value?: number }[];
}

function FlujoTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const ing = Number(payload.find((p) => p.dataKey === 'ingresos')?.value ?? 0);
  const egr = Number(payload.find((p) => p.dataKey === 'egresos')?.value ?? 0);
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-medium text-slate-900">{etiquetaMes(label)}</p>
      <Fila color={COLOR_INGRESO} texto="Ingresos" valor={ing} />
      <Fila color={COLOR_EGRESO} texto="Egresos" valor={egr} />
      <div className="mt-1 border-t border-slate-100 pt-1">
        <p className="flex justify-between gap-6 text-slate-600">
          Resultado <span className="font-medium tabular-nums text-slate-900">{formatMoneda(ing - egr)}</span>
        </p>
      </div>
    </div>
  );
}

function Fila({ color, texto, valor }: { color: string; texto: string; valor: number }) {
  return (
    <p className="flex items-center justify-between gap-6 text-slate-600">
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden />
        {texto}
      </span>
      <span className="font-medium tabular-nums text-slate-900">{formatMoneda(valor)}</span>
    </p>
  );
}

export function FlujoChart({ data }: { data: PuntoFlujo[] }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-slate-600" aria-hidden>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_INGRESO }} /> Ingresos
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_EGRESO }} /> Egresos
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="mes"
              tickFormatter={etiquetaMes}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v: number) => formatMonedaCompacta(v)}
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip content={<FlujoTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill={COLOR_INGRESO} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="egresos" name="Egresos" fill={COLOR_EGRESO} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Vista tabular accesible para lectores de pantalla */}
      <table className="sr-only">
        <caption>Ingresos y egresos por mes</caption>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Ingresos</th>
            <th>Egresos</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.mes}>
              <td>{etiquetaMes(p.mes)}</td>
              <td>{formatMoneda(p.ingresos)}</td>
              <td>{formatMoneda(p.egresos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
