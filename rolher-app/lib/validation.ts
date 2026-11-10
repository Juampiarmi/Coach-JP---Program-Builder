import {
  CUOTAS_PERMITIDAS,
  MEDIOS_PAGO,
  TIPOS_MOVIMIENTO,
  type CantidadCuotas,
  type MedioPago,
  type NuevoMovimiento,
  type NuevoVehiculo,
  type TipoMovimiento,
} from './types';
import { parseISODate } from './format';

// ---------------------------------------------------------------------------
// Patentes argentinas
//   Formato viejo (1995–2016):  AAA999   → ej. ABC123
//   Formato Mercosur (2016+):   AA999AA  → ej. AB123CD
// Se aceptan con espacios o guiones al tipear; se guardan normalizadas.
// ---------------------------------------------------------------------------

const RE_PATENTE_VIEJA = /^[A-Z]{3}\d{3}$/;
const RE_PATENTE_MERCOSUR = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

export type FormatoPatente = 'VIEJA' | 'MERCOSUR';

export function normalizarPatente(raw: string): string {
  return raw.toUpperCase().replace(/[\s.\-]/g, '');
}

export function formatoPatente(raw: string): FormatoPatente | null {
  const p = normalizarPatente(raw);
  if (RE_PATENTE_VIEJA.test(p)) return 'VIEJA';
  if (RE_PATENTE_MERCOSUR.test(p)) return 'MERCOSUR';
  return null;
}

/** Presentación legible: ABC 123 / AB 123 CD. */
export function mostrarPatente(raw: string): string {
  const p = normalizarPatente(raw);
  if (RE_PATENTE_VIEJA.test(p)) return `${p.slice(0, 3)} ${p.slice(3)}`;
  if (RE_PATENTE_MERCOSUR.test(p)) return `${p.slice(0, 2)} ${p.slice(2, 5)} ${p.slice(5)}`;
  return p;
}

// ---------------------------------------------------------------------------
// Montos: acepta formato argentino ("1.234,56") y simple ("1234.56").
// ---------------------------------------------------------------------------

export function parseMonto(raw: string): number | null {
  const s = raw.trim().replace(/[$\s]/g, '');
  if (!s) return null;
  let normal: string;
  if (s.includes(',')) {
    // Coma decimal: los puntos son separadores de miles.
    normal = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234.567" sin decimales: puntos de miles.
    normal = s.replace(/\./g, '');
  } else {
    normal = s;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export const MONTO_MAXIMO = 999_999_999_999.99;

// ---------------------------------------------------------------------------
// Validadores de formularios. Devuelven un mapa campo → mensaje (vacío = válido).
// ---------------------------------------------------------------------------

export type Errores<K extends string> = Partial<Record<K, string>>;

export interface MovimientoForm {
  unidad: string;
  fecha: string;
  tipo: TipoMovimiento;
  categoria: string;
  monto: string;
  medio_pago: MedioPago;
  cuotas: CantidadCuotas;
  vehiculo_id: string;
  descripcion: string;
}

export function validarMovimiento(f: MovimientoForm): Errores<keyof MovimientoForm> {
  const e: Errores<keyof MovimientoForm> = {};
  if (!f.unidad.trim()) e.unidad = 'Elegí una unidad de negocio.';
  if (!f.fecha || !parseISODate(f.fecha)) e.fecha = 'Ingresá una fecha válida.';
  if (!TIPOS_MOVIMIENTO.includes(f.tipo)) e.tipo = 'Tipo inválido.';
  if (!f.categoria.trim()) e.categoria = 'Elegí una categoría.';

  const monto = parseMonto(f.monto);
  if (monto === null) e.monto = 'Ingresá un monto numérico (ej. 15000 o 15.000,50).';
  else if (monto <= 0) e.monto = 'El monto debe ser mayor a 0.';
  else if (monto > MONTO_MAXIMO) e.monto = 'El monto es demasiado grande.';

  if (!MEDIOS_PAGO.includes(f.medio_pago)) e.medio_pago = 'Medio de pago inválido.';
  if (!CUOTAS_PERMITIDAS.includes(f.cuotas)) e.cuotas = 'Cantidad de cuotas inválida.';
  else if (f.cuotas > 1 && !(f.tipo === 'INGRESO' && f.medio_pago === 'TARJETA'))
    e.cuotas = 'Solo un ingreso con tarjeta puede ser en cuotas.';

  if (f.descripcion.length > 280) e.descripcion = 'Máximo 280 caracteres.';
  return e;
}

/** Convierte un formulario ya validado al payload de inserción. */
export function movimientoDesdeForm(f: MovimientoForm): NuevoMovimiento {
  const monto = parseMonto(f.monto);
  if (monto === null || monto <= 0) throw new Error('Monto inválido');
  return {
    unidad: f.unidad.trim().toUpperCase(),
    fecha: f.fecha,
    tipo: f.tipo,
    categoria: f.categoria.trim(),
    monto: Math.round(monto * 100) / 100,
    medio_pago: f.medio_pago,
    cuotas: f.tipo === 'INGRESO' && f.medio_pago === 'TARJETA' ? f.cuotas : 1,
    vehiculo_id: f.vehiculo_id || null,
    descripcion: f.descripcion.trim() || null,
  };
}

export interface VehiculoForm {
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  unidad: string;
  km_actual: string;
  service_km_proximo: string;
  vtv_vencimiento: string;
  seguro_vencimiento: string;
}

const parseEntero = (s: string): number | null => {
  const t = s.trim().replace(/\./g, '');
  if (!t) return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
};

export function validarVehiculo(f: VehiculoForm): Errores<keyof VehiculoForm> {
  const e: Errores<keyof VehiculoForm> = {};
  if (!f.patente.trim()) e.patente = 'Ingresá la patente.';
  else if (!formatoPatente(f.patente))
    e.patente = 'Patente inválida. Formatos: ABC123 (viejo) o AB123CD (Mercosur).';
  if (!f.marca.trim()) e.marca = 'Ingresá la marca.';
  if (!f.modelo.trim()) e.modelo = 'Ingresá el modelo.';
  if (!f.unidad.trim()) e.unidad = 'Elegí una unidad.';

  const anio = parseEntero(f.anio);
  const anioMax = new Date().getFullYear() + 1;
  if (anio !== null && (Number.isNaN(anio) || anio < 1980 || anio > anioMax))
    e.anio = `Año entre 1980 y ${anioMax}.`;

  const km = parseEntero(f.km_actual);
  if (km !== null && Number.isNaN(km)) e.km_actual = 'Kilometraje inválido.';
  const kmService = parseEntero(f.service_km_proximo);
  if (kmService !== null && Number.isNaN(kmService)) e.service_km_proximo = 'Kilometraje inválido.';
  else if (kmService !== null && km !== null && !Number.isNaN(km) && kmService < km)
    e.service_km_proximo = 'Debe ser mayor o igual al km actual.';

  if (f.vtv_vencimiento && !parseISODate(f.vtv_vencimiento)) e.vtv_vencimiento = 'Fecha inválida.';
  if (f.seguro_vencimiento && !parseISODate(f.seguro_vencimiento))
    e.seguro_vencimiento = 'Fecha inválida.';
  return e;
}

export function vehiculoDesdeForm(f: VehiculoForm): NuevoVehiculo {
  const num = (s: string) => {
    const n = parseEntero(s);
    return n === null || Number.isNaN(n) ? null : n;
  };
  return {
    patente: normalizarPatente(f.patente),
    marca: f.marca.trim(),
    modelo: f.modelo.trim(),
    anio: num(f.anio),
    unidad: f.unidad.trim().toUpperCase(),
    km_actual: num(f.km_actual),
    service_km_proximo: num(f.service_km_proximo),
    vtv_vencimiento: f.vtv_vencimiento || null,
    seguro_vencimiento: f.seguro_vencimiento || null,
  };
}

export const sinErrores = (e: object) => Object.keys(e).length === 0;
