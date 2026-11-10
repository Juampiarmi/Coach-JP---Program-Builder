'use client';

import { RefreshCw } from 'lucide-react';
import { useUnidades } from '@/lib/useUnidades';

interface Props {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  /** Si se pasa, agrega la opción "Todas" con este texto (valor ""). */
  opcionTodas?: string;
  placeholder?: string;
}

/** Selector de unidad de negocio con fallback automático y botón de reintento. */
export function UnidadSelect({ id, value, onChange, invalid, opcionTodas, placeholder = 'Elegí una unidad' }: Props) {
  const { unidades, origen, reintentar } = useUnidades();

  return (
    <div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`input ${invalid ? 'input-error' : ''}`}
      >
        {opcionTodas !== undefined ? <option value="">{opcionTodas}</option> : <option value="" disabled>{placeholder}</option>}
        {unidades.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      {origen === 'fallback' && (
        <button
          type="button"
          onClick={() => void reintentar()}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Usando lista local · Reintentar
        </button>
      )}
    </div>
  );
}
