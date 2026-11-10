import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  valor: string;
  detalle?: string;
  icon: LucideIcon;
  destacado?: boolean;
  negativo?: boolean;
}

export function KpiCard({ label, valor, detalle, icon: Icon, destacado, negativo }: Props) {
  return (
    <div className={`card p-4 ${destacado ? 'border-slate-900 bg-slate-900 text-white' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-medium ${destacado ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
        <Icon className={`h-4 w-4 shrink-0 ${destacado ? 'text-slate-400' : 'text-slate-400'}`} aria-hidden />
      </div>
      <p
        className={`mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight ${
          negativo ? (destacado ? 'text-rose-300' : 'text-rose-600') : ''
        }`}
      >
        {valor}
      </p>
      {detalle && <p className={`mt-1 text-xs ${destacado ? 'text-slate-400' : 'text-slate-500'}`}>{detalle}</p>}
    </div>
  );
}
