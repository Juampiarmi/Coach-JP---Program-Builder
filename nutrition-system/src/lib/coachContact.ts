/**
 * WhatsApp del coach: viaja dentro del plan publicado para que el alumno le mande el check-in semanal con un toque.
 * Se guarda en formato internacional sin signos (wa.me), ej. Argentina celular: 5491122334455.
 */
let phone = '';

/** Normaliza lo que escribe el coach: "11 2233-4455", "+54 9 11 2233 4455", "011 15 2233 4455" → 5491122334455. */
export function normalizePhone(raw: string) {
  let d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  // Formato local viejo con "15" después del código de área (11 15 2233 4455 → 11 2233 4455).
  const m = /^(\d{2,4})15(\d{6,8})$/.exec(d);
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  return d.length === 10 ? `549${d}` : raw.replace(/\D/g, '');
}

export const setCoachPhone = (p: string) => (phone = normalizePhone(p));
export const coachPhone = () => phone;
