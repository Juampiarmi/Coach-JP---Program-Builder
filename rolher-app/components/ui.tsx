import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = '',
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function LoadingState({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {texto}
    </div>
  );
}

export function ErrorState({ mensaje, onRetry }: { mensaje: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-start gap-3 border-rose-200 bg-rose-50/60 p-4 sm:flex-row sm:items-center">
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />
      <p className="flex-1 text-sm text-rose-800">{mensaje}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary h-10 px-4 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden /> Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ titulo, texto, action }: { titulo: string; texto?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <Inbox className="h-6 w-6 text-slate-400" aria-hidden />
      </div>
      <p className="font-medium text-slate-900">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const TONOS = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
} as const;

export type Tono = keyof typeof TONOS;

export function Badge({ tono = 'slate', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONOS[tono]}`}>
      {children}
    </span>
  );
}
