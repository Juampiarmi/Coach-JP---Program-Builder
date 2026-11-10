'use client';

import { useUnidades } from '@/lib/useUnidades';

/** Filtro de unidad en chips (una fila con scroll horizontal en móvil). "" = todas. */
export function UnidadFiltro({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { unidades } = useUnidades();
  const opciones = ['', ...unidades];
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Filtrar por unidad">
      <div className="flex w-max gap-2">
        {opciones.map((u) => {
          const on = value === u;
          return (
            <button
              key={u || 'todas'}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(u)}
              className={`chip ${
                on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {u || 'Todas'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
