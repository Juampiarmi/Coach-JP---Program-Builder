/** Cálculos financieros puros (sin I/O) para el dashboard, cuotas y flota. */
import type { Cuota, Movimiento, Vehiculo } from './types';
import { claveMes, diasHasta, hoyISO, sumarDias, ultimosMeses } from './format';

const redondear = (n: number) => Math.round(n * 100) / 100;

export interface Kpis {
  ingresos: number;
  egresos: number;
  resultado: number;
  /** Dinero efectivamente disponible: ingresos cobrados − egresos. */
  cajaReal: number;
  /** Cuotas pendientes de cobro. */
  porCobrar: number;
  margen: number | null;
}

/**
 * - Ingresos/Egresos/Resultado: devengado (monto total del movimiento).
 * - Caja real: ingresos de contado + cuotas efectivamente cobradas − egresos.
 *   Una venta en 3/6 cuotas no entra a caja hasta que se cobra cada cuota.
 */
export function calcularKpis(movs: Movimiento[], cuotas: Cuota[], unidad: string | null): Kpis {
  const enUnidad = (u: string) => unidad === null || u === unidad;
  let ingresos = 0;
  let egresos = 0;
  let ingresosContado = 0;

  for (const m of movs) {
    if (!enUnidad(m.unidad)) continue;
    if (m.tipo === 'INGRESO') {
      ingresos += m.monto;
      if (m.cuotas === 1) ingresosContado += m.monto;
    } else {
      egresos += m.monto;
    }
  }

  let cobradas = 0;
  let porCobrar = 0;
  for (const c of cuotas) {
    if (!enUnidad(c.unidad)) continue;
    if (c.estado === 'COBRADA') cobradas += c.monto;
    else porCobrar += c.monto;
  }

  const resultado = ingresos - egresos;
  return {
    ingresos: redondear(ingresos),
    egresos: redondear(egresos),
    resultado: redondear(resultado),
    cajaReal: redondear(ingresosContado + cobradas - egresos),
    porCobrar: redondear(porCobrar),
    margen: ingresos > 0 ? resultado / ingresos : null,
  };
}

export interface PuntoFlujo {
  mes: string;
  ingresos: number;
  egresos: number;
}

export function flujoMensual(movs: Movimiento[], unidad: string | null, meses = 6): PuntoFlujo[] {
  const claves = ultimosMeses(meses);
  const mapa = new Map(claves.map((k) => [k, { mes: k, ingresos: 0, egresos: 0 }]));
  for (const m of movs) {
    if (unidad !== null && m.unidad !== unidad) continue;
    const p = mapa.get(claveMes(m.fecha));
    if (!p) continue;
    if (m.tipo === 'INGRESO') p.ingresos += m.monto;
    else p.egresos += m.monto;
  }
  return claves.map((k) => {
    const p = mapa.get(k)!;
    return { mes: k, ingresos: redondear(p.ingresos), egresos: redondear(p.egresos) };
  });
}

// ---------------------------------------------------------------------------
// Semáforo de cuotas
// ---------------------------------------------------------------------------

export type Semaforo = 'VENCIDA' | 'PROXIMA' | 'AL_DIA' | 'COBRADA';

/** Ventana (días) en la que una cuota pendiente se considera "próxima a vencer". */
export const DIAS_ALERTA_CUOTA = 7;

export function semaforoCuota(c: Cuota): Semaforo {
  if (c.estado === 'COBRADA') return 'COBRADA';
  const d = diasHasta(c.fecha_vencimiento);
  if (d === null) return 'AL_DIA';
  if (d < 0) return 'VENCIDA';
  if (d <= DIAS_ALERTA_CUOTA) return 'PROXIMA';
  return 'AL_DIA';
}

export interface Proyeccion {
  vencido: number;
  a30: number;
  a60: number;
}

/** Proyección de cobros pendientes: vencido + acumulado a 30 y 60 días. */
export function proyeccionCobros(cuotas: Cuota[], unidad: string | null): Proyeccion {
  const hoy = hoyISO();
  const lim30 = sumarDias(hoy, 30);
  const lim60 = sumarDias(hoy, 60);
  const out: Proyeccion = { vencido: 0, a30: 0, a60: 0 };
  for (const c of cuotas) {
    if (c.estado === 'COBRADA') continue;
    if (unidad !== null && c.unidad !== unidad) continue;
    const f = c.fecha_vencimiento;
    if (f < hoy) out.vencido += c.monto;
    if (f <= lim30) out.a30 += c.monto;
    if (f <= lim60) out.a60 += c.monto;
  }
  return { vencido: redondear(out.vencido), a30: redondear(out.a30), a60: redondear(out.a60) };
}

// ---------------------------------------------------------------------------
// Flota
// ---------------------------------------------------------------------------

export type NivelAlerta = 'ok' | 'proxima' | 'vencida' | 'sin_dato';

/** Días de anticipación para alertar vencimientos de VTV y seguro. */
export const DIAS_ALERTA_VENCIMIENTO = 30;
export const KM_ALERTA_SERVICE = 1000;

export function nivelVencimiento(iso: string | null): { nivel: NivelAlerta; dias: number | null } {
  const dias = diasHasta(iso);
  if (dias === null) return { nivel: 'sin_dato', dias: null };
  if (dias < 0) return { nivel: 'vencida', dias };
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return { nivel: 'proxima', dias };
  return { nivel: 'ok', dias };
}

export function nivelService(v: Vehiculo): { nivel: NivelAlerta; kmRestantes: number | null } {
  if (v.km_actual === null || v.service_km_proximo === null) return { nivel: 'sin_dato', kmRestantes: null };
  const km = v.service_km_proximo - v.km_actual;
  if (km <= 0) return { nivel: 'vencida', kmRestantes: km };
  if (km <= KM_ALERTA_SERVICE) return { nivel: 'proxima', kmRestantes: km };
  return { nivel: 'ok', kmRestantes: km };
}

/** Egresos acumulados por vehículo (id → total). */
export function costosPorVehiculo(movs: Movimiento[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of movs) {
    if (m.tipo !== 'EGRESO' || !m.vehiculo_id) continue;
    out.set(m.vehiculo_id, redondear((out.get(m.vehiculo_id) ?? 0) + m.monto));
  }
  return out;
}
