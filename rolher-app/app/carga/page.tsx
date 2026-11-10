'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { Card, Field, PageHeader } from '@/components/ui';
import { ConfigBanner } from '@/components/ConfigBanner';
import { UnidadSelect } from '@/components/UnidadSelect';
import { fetchVehiculos, insertMovimiento } from '@/lib/data';
import { formatMoneda, hoyISO } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import {
  CATEGORIAS,
  MEDIOS_PAGO,
  MEDIO_PAGO_LABEL,
  type CantidadCuotas,
  type MedioPago,
  type TipoMovimiento,
} from '@/lib/types';
import {
  mostrarPatente,
  movimientoDesdeForm,
  parseMonto,
  sinErrores,
  validarMovimiento,
  type MovimientoForm,
} from '@/lib/validation';

const formInicial = (): MovimientoForm => ({
  unidad: '',
  fecha: hoyISO(),
  tipo: 'INGRESO',
  categoria: '',
  monto: '',
  medio_pago: 'EFECTIVO',
  cuotas: 1,
  vehiculo_id: '',
  descripcion: '',
});

type Campo = keyof MovimientoForm;

export default function CargaPage() {
  const [form, setForm] = useState<MovimientoForm>(formInicial);
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const vehiculos = useAsync(fetchVehiculos);

  const errores = useMemo(() => validarMovimiento(form), [form]);
  const valido = sinErrores(errores);
  const admiteCuotas = form.tipo === 'INGRESO' && form.medio_pago === 'TARJETA';
  const montoNum = parseMonto(form.monto);

  const set = <K extends Campo>(campo: K, valor: MovimientoForm[K]) => {
    setExito(null);
    setForm((f) => {
      const next = { ...f, [campo]: valor };
      // Coherencia de dependencias: categoría por tipo y cuotas solo en ingreso con tarjeta.
      if (campo === 'tipo') next.categoria = '';
      if (!(next.tipo === 'INGRESO' && next.medio_pago === 'TARJETA')) next.cuotas = 1;
      return next;
    });
  };
  const tocar = (campo: Campo) => setTocados((t) => ({ ...t, [campo]: true }));
  const err = (campo: Campo) => (tocados[campo] ? errores[campo] : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido || guardando) {
      setTocados({ unidad: true, fecha: true, categoria: true, monto: true, cuotas: true, descripcion: true });
      return;
    }
    setGuardando(true);
    setErrorServidor(null);
    const payload = movimientoDesdeForm(form);
    const res = await insertMovimiento(payload);
    setGuardando(false);
    if (res.error !== null) {
      setErrorServidor(res.error);
      return;
    }
    setExito(
      `${payload.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} de ${formatMoneda(payload.monto)} guardado en ${payload.unidad}` +
        (payload.cuotas > 1 ? ` · plan de ${payload.cuotas} cuotas generado.` : '.'),
    );
    // Se conservan unidad, fecha y tipo para agilizar cargas sucesivas.
    setForm((f) => ({ ...formInicial(), unidad: f.unidad, fecha: f.fecha, tipo: f.tipo }));
    setTocados({});
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Carga rápida" subtitle="Registrá un ingreso o egreso en segundos" />
      <ConfigBanner />

      <Card className="p-4 sm:p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {/* Tipo de movimiento */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Tipo de movimiento">
            {(['INGRESO', 'EGRESO'] as TipoMovimiento[]).map((t) => {
              const on = form.tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set('tipo', t)}
                  className={`h-11 rounded-lg text-base font-semibold transition ${
                    on ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500'
                  }`}
                >
                  {t === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Unidad" htmlFor="unidad" required error={err('unidad')}>
              <UnidadSelect
                id="unidad"
                value={form.unidad}
                onChange={(v) => {
                  set('unidad', v);
                  tocar('unidad');
                }}
                invalid={Boolean(err('unidad'))}
              />
            </Field>

            <Field label="Fecha" htmlFor="fecha" required error={err('fecha')}>
              <input
                id="fecha"
                type="date"
                value={form.fecha}
                max="2100-12-31"
                onChange={(e) => set('fecha', e.target.value)}
                onBlur={() => tocar('fecha')}
                aria-invalid={Boolean(err('fecha')) || undefined}
                className={`input ${err('fecha') ? 'input-error' : ''}`}
              />
            </Field>

            <Field label="Categoría" htmlFor="categoria" required error={err('categoria')}>
              <select
                id="categoria"
                value={form.categoria}
                onChange={(e) => {
                  set('categoria', e.target.value);
                  tocar('categoria');
                }}
                aria-invalid={Boolean(err('categoria')) || undefined}
                className={`input ${err('categoria') ? 'input-error' : ''}`}
              >
                <option value="" disabled>
                  Elegí una categoría
                </option>
                {CATEGORIAS[form.tipo].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Monto (ARS)"
              htmlFor="monto"
              required
              error={err('monto')}
              hint={montoNum && montoNum > 0 ? formatMoneda(montoNum) : 'Ej. 15000 o 15.000,50'}
            >
              <input
                id="monto"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={form.monto}
                onChange={(e) => set('monto', e.target.value.replace(/[^\d.,]/g, ''))}
                onBlur={() => tocar('monto')}
                aria-invalid={Boolean(err('monto')) || undefined}
                className={`input tabular-nums ${err('monto') ? 'input-error' : ''}`}
              />
            </Field>

            <Field label="Medio de pago" htmlFor="medio_pago" required>
              <select
                id="medio_pago"
                value={form.medio_pago}
                onChange={(e) => set('medio_pago', e.target.value as MedioPago)}
                className="input"
              >
                {MEDIOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {MEDIO_PAGO_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Cuotas"
              htmlFor="cuotas"
              error={err('cuotas')}
              hint={admiteCuotas ? 'Se genera el plan de cobro automáticamente' : 'Solo ingresos con tarjeta'}
            >
              <select
                id="cuotas"
                value={form.cuotas}
                disabled={!admiteCuotas}
                onChange={(e) => {
                  set('cuotas', Number(e.target.value) as CantidadCuotas);
                  tocar('cuotas');
                }}
                className="input"
              >
                <option value={1}>Un pago</option>
                <option value={3}>3 cuotas</option>
                <option value={6}>6 cuotas</option>
              </select>
            </Field>

            <Field
              label="Vehículo (opcional)"
              htmlFor="vehiculo"
              hint={vehiculos.error ? 'No se pudo cargar la flota' : 'Asigna el costo a la ficha del vehículo'}
              className="sm:col-span-2"
            >
              <select
                id="vehiculo"
                value={form.vehiculo_id}
                onChange={(e) => set('vehiculo_id', e.target.value)}
                disabled={vehiculos.cargando || Boolean(vehiculos.error)}
                className="input"
              >
                <option value="">Sin vehículo</option>
                {(vehiculos.data ?? [])
                  .filter((v) => !form.unidad || v.unidad === form.unidad)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {mostrarPatente(v.patente)} · {v.marca} {v.modelo}
                    </option>
                  ))}
              </select>
            </Field>

            <Field
              label="Descripción (opcional)"
              htmlFor="descripcion"
              error={err('descripcion')}
              className="sm:col-span-2"
            >
              <input
                id="descripcion"
                type="text"
                maxLength={280}
                placeholder="Ej. Carga de nafta YPF"
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                onBlur={() => tocar('descripcion')}
                className="input"
              />
            </Field>
          </div>

          {errorServidor && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorServidor}
            </p>
          )}
          {exito && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {exito}
            </p>
          )}

          <button type="submit" disabled={!valido || guardando} className="btn-primary w-full">
            {guardando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          {!valido && (
            <p className="-mt-2 text-center text-xs text-slate-500">
              Completá unidad, fecha, categoría y un monto mayor a 0 para habilitar el guardado.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
