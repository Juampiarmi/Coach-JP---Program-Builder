'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { Field } from '@/components/ui';
import { UnidadSelect } from '@/components/UnidadSelect';
import { insertVehiculo } from '@/lib/data';
import type { Vehiculo } from '@/lib/types';
import {
  formatoPatente,
  mostrarPatente,
  normalizarPatente,
  sinErrores,
  validarVehiculo,
  vehiculoDesdeForm,
  type VehiculoForm,
} from '@/lib/validation';

const VACIO: VehiculoForm = {
  patente: '',
  marca: '',
  modelo: '',
  anio: '',
  unidad: '',
  km_actual: '',
  service_km_proximo: '',
  vtv_vencimiento: '',
  seguro_vencimiento: '',
};

type Campo = keyof VehiculoForm;

interface Props {
  abierto: boolean;
  onClose: () => void;
  onCreado: (v: Vehiculo) => void;
  /** Patentes ya cargadas (normalizadas) para detectar duplicados antes de ir a la base. */
  patentesExistentes: Set<string>;
}

export function VehiculoModal({ abierto, onClose, onCreado, patentesExistentes }: Props) {
  const [form, setForm] = useState<VehiculoForm>(VACIO);
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const primerCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setForm(VACIO);
    setTocados({});
    setErrorServidor(null);
    const t = setTimeout(() => primerCampo.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [abierto, onClose]);

  const errores = useMemo(() => {
    const e = validarVehiculo(form);
    if (!e.patente && patentesExistentes.has(normalizarPatente(form.patente)))
      e.patente = 'Esta patente ya está en la flota.';
    return e;
  }, [form, patentesExistentes]);
  const valido = sinErrores(errores);
  const formato = formatoPatente(form.patente);

  if (!abierto) return null;

  const set = (campo: Campo, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));
  const tocar = (campo: Campo) => setTocados((t) => ({ ...t, [campo]: true }));
  const err = (campo: Campo) => (tocados[campo] ? errores[campo] : undefined);
  const cls = (campo: Campo) => `input ${err(campo) ? 'input-error' : ''}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido || guardando) {
      setTocados(Object.fromEntries(Object.keys(VACIO).map((k) => [k, true])));
      return;
    }
    setGuardando(true);
    setErrorServidor(null);
    const res = await insertVehiculo(vehiculoDesdeForm(form));
    setGuardando(false);
    if (res.error !== null) {
      setErrorServidor(res.error);
      return;
    }
    onCreado(res.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="vehiculo-modal-titulo">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-2xl border border-slate-200/80 bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <h2 id="vehiculo-modal-titulo" className="text-lg font-semibold">
            Alta de vehículo
          </h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Patente"
                htmlFor="patente"
                required
                error={err('patente')}
                hint={formato ? `${mostrarPatente(form.patente)} · ${formato === 'MERCOSUR' ? 'Mercosur' : 'Formato viejo'}` : 'ABC123 o AB123CD'}
              >
                <input
                  ref={primerCampo}
                  id="patente"
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={9}
                  placeholder="AB123CD"
                  value={form.patente}
                  onChange={(e) => set('patente', e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
                  onBlur={() => tocar('patente')}
                  aria-invalid={Boolean(err('patente')) || undefined}
                  className={`${cls('patente')} font-mono uppercase tracking-widest`}
                />
              </Field>

              <Field label="Unidad" htmlFor="v-unidad" required error={err('unidad')}>
                <UnidadSelect
                  id="v-unidad"
                  value={form.unidad}
                  onChange={(v) => {
                    set('unidad', v);
                    tocar('unidad');
                  }}
                  invalid={Boolean(err('unidad'))}
                />
              </Field>

              <Field label="Marca" htmlFor="marca" required error={err('marca')}>
                <input id="marca" type="text" placeholder="Toyota" value={form.marca} onChange={(e) => set('marca', e.target.value)} onBlur={() => tocar('marca')} className={cls('marca')} />
              </Field>

              <Field label="Modelo" htmlFor="modelo" required error={err('modelo')}>
                <input id="modelo" type="text" placeholder="Etios" value={form.modelo} onChange={(e) => set('modelo', e.target.value)} onBlur={() => tocar('modelo')} className={cls('modelo')} />
              </Field>

              <Field label="Año" htmlFor="anio" error={err('anio')}>
                <input id="anio" type="text" inputMode="numeric" placeholder="2022" maxLength={4} value={form.anio} onChange={(e) => set('anio', e.target.value.replace(/\D/g, ''))} onBlur={() => tocar('anio')} className={cls('anio')} />
              </Field>

              <Field label="Km actual" htmlFor="km_actual" error={err('km_actual')}>
                <input id="km_actual" type="text" inputMode="numeric" placeholder="85000" value={form.km_actual} onChange={(e) => set('km_actual', e.target.value.replace(/\D/g, ''))} onBlur={() => tocar('km_actual')} className={cls('km_actual')} />
              </Field>

              <Field label="Próximo service (km)" htmlFor="service_km_proximo" error={err('service_km_proximo')}>
                <input id="service_km_proximo" type="text" inputMode="numeric" placeholder="90000" value={form.service_km_proximo} onChange={(e) => set('service_km_proximo', e.target.value.replace(/\D/g, ''))} onBlur={() => tocar('service_km_proximo')} className={cls('service_km_proximo')} />
              </Field>

              <Field label="Vencimiento VTV" htmlFor="vtv_vencimiento" error={err('vtv_vencimiento')}>
                <input id="vtv_vencimiento" type="date" value={form.vtv_vencimiento} onChange={(e) => set('vtv_vencimiento', e.target.value)} onBlur={() => tocar('vtv_vencimiento')} className={cls('vtv_vencimiento')} />
              </Field>

              <Field label="Vencimiento seguro" htmlFor="seguro_vencimiento" error={err('seguro_vencimiento')} className="sm:col-span-2">
                <input id="seguro_vencimiento" type="date" value={form.seguro_vencimiento} onChange={(e) => set('seguro_vencimiento', e.target.value)} onBlur={() => tocar('seguro_vencimiento')} className={cls('seguro_vencimiento')} />
              </Field>
            </div>

            {errorServidor && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {errorServidor}
              </p>
            )}
          </div>

          <div className="safe-bottom flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button type="submit" disabled={!valido || guardando} className="btn-primary w-full sm:w-auto">
              {guardando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
              {guardando ? 'Guardando…' : 'Guardar vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
