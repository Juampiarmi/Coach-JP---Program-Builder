/** Modelo de dominio de RolHer App. Espejo de supabase/schema.sql. */

export const UNIDADES_FALLBACK = ['UBER', 'TRY', 'HOTEL'] as const;
export type Unidad = string;

export const TIPOS_MOVIMIENTO = ['INGRESO', 'EGRESO'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'TARJETA'] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  TARJETA: 'Tarjeta',
};

export const CUOTAS_PERMITIDAS = [1, 3, 6] as const;
export type CantidadCuotas = (typeof CUOTAS_PERMITIDAS)[number];

export const CATEGORIAS: Record<TipoMovimiento, readonly string[]> = {
  INGRESO: ['Viajes', 'Alquiler', 'Hospedaje', 'Servicios', 'Ventas', 'Otros ingresos'],
  EGRESO: [
    'Combustible',
    'Mantenimiento',
    'Seguro',
    'VTV',
    'Patente / Impuestos',
    'Sueldos',
    'Insumos',
    'Servicios',
    'Comisiones',
    'Otros egresos',
  ],
};

export interface Movimiento {
  id: string;
  fecha: string; // YYYY-MM-DD
  unidad: Unidad;
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  medio_pago: MedioPago;
  cuotas: CantidadCuotas;
  vehiculo_id: string | null;
  descripcion: string | null;
  created_at: string;
}

export type NuevoMovimiento = Omit<Movimiento, 'id' | 'created_at'>;

export type EstadoCuota = 'PENDIENTE' | 'COBRADA';

export interface Cuota {
  id: string;
  movimiento_id: string;
  numero: number;
  total_cuotas: number;
  monto: number;
  fecha_vencimiento: string;
  estado: EstadoCuota;
  fecha_cobro: string | null;
  /** Datos del movimiento de origen (join). */
  unidad: Unidad;
  categoria: string;
  descripcion: string | null;
}

export interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  unidad: Unidad;
  km_actual: number | null;
  service_km_proximo: number | null;
  vtv_vencimiento: string | null;
  seguro_vencimiento: string | null;
  activo: boolean;
  created_at: string;
}

export type NuevoVehiculo = Omit<Vehiculo, 'id' | 'created_at' | 'activo'>;

/** Resultado uniforme de la capa de datos: nunca lanza, siempre devuelve data o error. */
export type Result<T> = { data: T; error: null } | { data: null; error: string };
