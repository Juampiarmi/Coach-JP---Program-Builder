/** Formato y fechas. Las fechas de negocio son strings YYYY-MM-DD en hora local (sin UTC). */

const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const arsCentavos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const arsCompacto = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Pesos sin decimales si el monto es entero; con centavos si los tiene (nunca redondea en silencio). */
export function formatMoneda(n: number): string {
  const v = Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  return Number.isInteger(v) ? ars.format(v) : arsCentavos.format(v);
}
export const formatMonedaCompacta = (n: number) => arsCompacto.format(Number.isFinite(n) ? n : 0);

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hoyISO(): string {
  return toISODate(new Date());
}

/** Parsea YYYY-MM-DD como fecha local (evita el corrimiento de un día por UTC). */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Días desde hoy hasta la fecha (negativo si ya pasó). null si la fecha es inválida. */
export function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = parseISODate(iso);
  if (!d) return null;
  const hoy = parseISODate(hoyISO())!;
  return Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
}

export function sumarDias(iso: string, dias: number): string {
  const d = parseISODate(iso) ?? new Date();
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}

export function formatFecha(iso: string | null | undefined): string {
  const d = iso ? parseISODate(iso) : null;
  if (!d) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Clave de mes YYYY-MM. */
export const claveMes = (iso: string) => iso.slice(0, 7);

export function etiquetaMes(clave: string): string {
  const d = parseISODate(`${clave}-01`);
  if (!d) return clave;
  const txt = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** Últimas `n` claves de mes terminando en el mes actual, en orden cronológico. */
export function ultimosMeses(n: number): string[] {
  const hoy = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}
