/**
 * Capa de acceso a datos. Todas las funciones:
 *   - nunca lanzan: devuelven Result<T> con data o un mensaje de error legible;
 *   - normalizan los valores que llegan de PostgREST (numeric → number, nulls).
 */
import { getSupabase, MENSAJE_SIN_CONFIG } from './supabase';
import type {
  CantidadCuotas,
  Cuota,
  EstadoCuota,
  MedioPago,
  Movimiento,
  NuevoMovimiento,
  NuevoVehiculo,
  Result,
  TipoMovimiento,
  Vehiculo,
} from './types';
import { hoyISO } from './format';

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numONull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strONull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function mensajeError(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return 'Error desconocido.';
  if (err.code === '23505') return 'Ya existe un registro con esos datos (duplicado).';
  if (err.code === '23514') return 'Los datos no cumplen las reglas de validación de la base.';
  if (err.code === '23503') return 'Referencia inválida (unidad o vehículo inexistente).';
  if (err.code === '42501') return 'Sin permisos para esta operación (revisá las políticas RLS).';
  if (err.message?.toLowerCase().includes('failed to fetch'))
    return 'Sin conexión con el servidor. Revisá tu red e intentá de nuevo.';
  return err.message || 'Error inesperado.';
}

function mapMovimiento(r: Row): Movimiento {
  return {
    id: str(r.id),
    fecha: str(r.fecha),
    unidad: str(r.unidad),
    tipo: (r.tipo === 'EGRESO' ? 'EGRESO' : 'INGRESO') as TipoMovimiento,
    categoria: str(r.categoria),
    monto: num(r.monto),
    medio_pago: (str(r.medio_pago) || 'EFECTIVO') as MedioPago,
    cuotas: ([1, 3, 6].includes(num(r.cuotas)) ? num(r.cuotas) : 1) as CantidadCuotas,
    vehiculo_id: strONull(r.vehiculo_id),
    descripcion: strONull(r.descripcion),
    created_at: str(r.created_at),
  };
}

export function mapVehiculo(r: Row): Vehiculo {
  return {
    id: str(r.id),
    patente: str(r.patente),
    marca: str(r.marca),
    modelo: str(r.modelo),
    anio: numONull(r.anio),
    unidad: str(r.unidad),
    km_actual: numONull(r.km_actual),
    service_km_proximo: numONull(r.service_km_proximo),
    vtv_vencimiento: strONull(r.vtv_vencimiento),
    seguro_vencimiento: strONull(r.seguro_vencimiento),
    activo: r.activo !== false,
    created_at: str(r.created_at),
  };
}

function mapCuota(r: Row): Cuota {
  const mov = (Array.isArray(r.movimientos) ? r.movimientos[0] : r.movimientos) as Row | null;
  return {
    id: str(r.id),
    movimiento_id: str(r.movimiento_id),
    numero: num(r.numero),
    total_cuotas: num(r.total_cuotas),
    monto: num(r.monto),
    fecha_vencimiento: str(r.fecha_vencimiento),
    estado: (r.estado === 'COBRADA' ? 'COBRADA' : 'PENDIENTE') as EstadoCuota,
    fecha_cobro: strONull(r.fecha_cobro),
    unidad: str(mov?.unidad),
    categoria: str(mov?.categoria),
    descripcion: strONull(mov?.descripcion),
  };
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export async function fetchUnidades(signal?: AbortSignal): Promise<Result<string[]>> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  let q = sb.from('unidades').select('nombre').eq('activa', true).order('id');
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) return { data: null, error: mensajeError(error) };
  const nombres = (data ?? []).map((r: Row) => str(r.nombre).trim().toUpperCase()).filter(Boolean);
  return { data: nombres, error: null };
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export async function fetchMovimientos(opts: { desde?: string } = {}): Promise<Result<Movimiento[]>> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  let q = sb.from('movimientos').select('*').order('fecha', { ascending: false }).limit(5000);
  if (opts.desde) q = q.gte('fecha', opts.desde);
  const { data, error } = await q;
  if (error) return { data: null, error: mensajeError(error) };
  return { data: (data ?? []).map(mapMovimiento), error: null };
}

export async function insertMovimiento(m: NuevoMovimiento): Promise<Result<Movimiento>> {
  // Doble validación: la base también lo impide con CHECK constraints.
  if (!(m.monto > 0)) return { data: null, error: 'El monto debe ser mayor a 0.' };
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  const { data, error } = await sb.from('movimientos').insert(m).select('*').single();
  if (error) return { data: null, error: mensajeError(error) };
  return { data: mapMovimiento(data as Row), error: null };
}

// ---------------------------------------------------------------------------
// Cuotas
// ---------------------------------------------------------------------------

export async function fetchCuotas(): Promise<Result<Cuota[]>> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  const { data, error } = await sb
    .from('plan_cuotas')
    .select('*, movimientos(unidad, categoria, descripcion)')
    .order('fecha_vencimiento', { ascending: true })
    .limit(5000);
  if (error) return { data: null, error: mensajeError(error) };
  return { data: (data ?? []).map(mapCuota), error: null };
}

export async function marcarCuota(id: string, cobrada: boolean): Promise<Result<true>> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  const { error } = await sb
    .from('plan_cuotas')
    .update(cobrada ? { estado: 'COBRADA', fecha_cobro: hoyISO() } : { estado: 'PENDIENTE', fecha_cobro: null })
    .eq('id', id);
  if (error) return { data: null, error: mensajeError(error) };
  return { data: true, error: null };
}

// ---------------------------------------------------------------------------
// Vehículos
// ---------------------------------------------------------------------------

export async function fetchVehiculos(): Promise<Result<Vehiculo[]>> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  const { data, error } = await sb
    .from('vehiculos')
    .select('*')
    .eq('activo', true)
    .order('patente');
  if (error) return { data: null, error: mensajeError(error) };
  return { data: (data ?? []).map(mapVehiculo), error: null };
}

export async function insertVehiculo(v: NuevoVehiculo): Promise<Result<Vehiculo>> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: MENSAJE_SIN_CONFIG };
  const { data, error } = await sb.from('vehiculos').insert(v).select('*').single();
  if (error) {
    if (error.code === '23505') return { data: null, error: `La patente ${v.patente} ya está registrada.` };
    return { data: null, error: mensajeError(error) };
  }
  return { data: mapVehiculo(data as Row), error: null };
}
