/**
 * Normalización de la anamnesis (notas del coach) frente a la respuesta de la IA:
 * horario real de entrenamiento y nombre del atleta sin apodos alucinados.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const pad = (n: number) => String(n).padStart(2, '0');
const TRAIN_WORDS = /(entren|wod|sesion|gym|gimnasio|clase|box|crossfit|hyrox|fuerza|pesas|rutina|correr|running)/;

/**
 * Busca en las notas la franja de entrenamiento ("entreno de 16 a 18 hs", "WOD 16:30-18", "entreno a las 7").
 * Devuelve el inicio (HH:MM) y la duración en minutos; null si no hay un horario inequívoco.
 */
export function parseTrainingWindow(notes: string): { time: string; minutes: number | null } | null {
  const n = norm(notes);
  const range = /(\d{1,2})(?:[:.h](\d{2}))?\s*(?:hs?\.?|horas)?\s*(?:a|-|–|hasta)\s*(?:las\s*)?(\d{1,2})(?:[:.h](\d{2}))?\s*(?:hs?\b|horas\b)?/g;
  let m: RegExpExecArray | null;
  while ((m = range.exec(n))) {
    const before = n.slice(Math.max(0, m.index - 60), m.index);
    if (!TRAIN_WORDS.test(before)) continue;
    const h1 = +m[1];
    const m1 = +(m[2] ?? 0);
    const h2 = +m[3];
    const m2 = +(m[4] ?? 0);
    if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59) continue;
    const dur = h2 * 60 + m2 - (h1 * 60 + m1);
    if (dur < 20 || dur > 300) continue;
    return { time: `${pad(h1)}:${pad(m1)}`, minutes: dur };
  }
  const single = /(entren\w*|wod|sesion|gym|clase)[^.\n]{0,25}?a las\s*(\d{1,2})(?:[:.h](\d{2}))?/.exec(n);
  if (single && +single[2] <= 23) return { time: `${pad(+single[2])}:${pad(+(single[3] ?? 0))}`, minutes: null };
  return null;
}

/** Nombre explícito en las notas ("Nombre: Juan Pablo Armiñana", "Atleta: …"). */
function nameFromNotes(notes: string) {
  const W = '[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñü]+';
  const tagged = new RegExp(`(?:[Nn]ombre|[Aa]tleta|[Aa]lumn[oa]|[Cc]liente)\\s*[:\\-–]\\s*(${W}(?:\\s+${W}){0,3})`).exec(notes);
  if (tagged) return tagged[1].trim();
  // Notas que arrancan con el nombre: "Juan Pablo Armiñana, 34 años…"
  const lead = new RegExp(`^\\s*(${W}(?:\\s+${W}){1,3})\\s*[,.:\\-–(]`).exec(notes);
  const name = lead?.[1]?.trim();
  return name && !/^(atleta|hombre|mujer|varon|paciente|objetivo|deportista|alumn[oa]|cliente)\b/i.test(name) ? name : undefined;
}

/**
 * La IA a veces inventa apodos ("Atila" para Juan Pablo). Se acepta su nombre sólo si alguna palabra
 * aparece en las notas; si no, se usa el nombre explícito de las notas o el del perfil actual.
 */
export function resolveAthleteName(aiName: string | undefined, notes: string, current: string) {
  const explicit = nameFromNotes(notes);
  if (explicit) return explicit;
  const n = norm(notes);
  const ai = aiName?.trim();
  if (!ai) return current;
  if (!n.trim()) return ai;
  const words = norm(ai)
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return words.some((w) => n.includes(w)) ? ai : current;
}

/** Reemplaza en la directiva el nombre inventado por el real (primer nombre). */
export function fixGreeting(note: string, aiName: string | undefined, realName: string) {
  const fake = aiName?.trim().split(/\s+/)[0];
  const real = realName.trim().split(/\s+/)[0];
  if (!note || !fake || !real || norm(fake) === norm(real)) return note;
  return note.replace(new RegExp(`\\b${fake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), real);
}

/** Bloques peri / pre-entreno que quedan en un día OFF: no hay sesión, son merienda de saciedad. */
export const OFF_PERI_NAME = 'Merienda Táctica OFF';
export const PERI_WORDS = /pre.?entreno|pre.?wod|peri.?wod|peri.?entreno|intra|glucol[ií]tico|para entrenar/i;
