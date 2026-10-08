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

/** Contextos que NO son el entreno aunque la frase lo mencione (sueño, trabajo, ayuno…). */
const NON_TRAIN_WORDS = /(duerm|sueno|dormir|trabaj|oficina|ayun|estudi|facultad|colegio)/g;
/** Unidades que delatan que "N a M" no es un horario ("20 a 24 series", "3 a 4 veces", "7 a 8 horas de sueño"). */
const NOT_A_TIME = /^\s*(series|rondas|reps?\b|repeticiones|veces|d[ií]as|kg|kilos|a[ñn]os|semanas|meses|min\b|minutos|km|comidas|litros|gr?\b|porciones|cucharadas|vasos)/;

/**
 * Busca en las notas la franja de entrenamiento ("entreno de 16 a 18 hs", "WOD 16:30-18", "de 4 a 6 de la tarde").
 * Cada candidato "N a M" se valida dentro de su oración: tiene que haber una palabra de entreno antes (y no una de
 * sueño / trabajo más cerca), no puede ir seguido de una unidad ("series", "rondas", "veces"…) y tiene que caer en
 * un horario plausible (05:00-23:59). Gana el candidato con marcas horarias explícitas ("hs", ":mm", "de la tarde").
 */
export function parseTrainingWindow(notes: string): { time: string; minutes: number | null } | null {
  const n = norm(notes);
  // 1ª pasada estricta (misma oración); 2ª relajada (60 caracteres previos) para notas con puntos suspensivos o listas.
  const best = scanWindows(n, false) ?? scanWindows(n, true);
  if (best) return best;
  const single = /(entren\w*|wod|sesion|gym|clase)[^.\n]{0,25}?a las\s*(\d{1,2})(?:[:.h](\d{2}))?(\s*(?:hs?\s*)?(?:de la )?(?:tarde|noche))?/.exec(n);
  if (single && +single[2] <= 23) {
    let h = +single[2];
    if (single[4] && h < 12) h += 12;
    return { time: `${pad(h)}:${pad(+(single[3] ?? 0))}`, minutes: null };
  }
  return null;
}

function scanWindows(n: string, relaxed: boolean): { time: string; minutes: number } | null {
  const range = /(\d{1,2})(?:[:.h](\d{2}))?\s*(hs?\.?|horas)?\s*(?:a|-|–|hasta)\s*(?:las\s*)?(\d{1,2})(?:[:.h](\d{2}))?\s*(hs?\b\.?|horas\b)?/g;
  let best: { time: string; minutes: number; score: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = range.exec(n))) {
    // Contexto: sólo la oración / cláusula actual.
    const head = n.slice(Math.max(0, m.index - 60), m.index);
    const clause = relaxed ? head : head.slice(Math.max(head.lastIndexOf('.'), head.lastIndexOf(';'), head.lastIndexOf('\n')) + 1);
    const trainAt = lastIndex(clause, new RegExp(TRAIN_WORDS.source, 'g'));
    if (trainAt < 0 || lastIndex(clause, NON_TRAIN_WORDS) > trainAt) continue;
    const tail = n.slice(range.lastIndex, range.lastIndex + 24);
    if (NOT_A_TIME.test(tail)) continue;
    let h1 = +m[1];
    let h2 = +m[4];
    const m1 = +(m[2] ?? 0);
    const m2 = +(m[5] ?? 0);
    const pm = /^\s*(?:de la )?(tarde|noche)/.test(tail);
    if (pm && h1 < 12) h1 += 12;
    if (pm && h2 < 12) h2 += 12;
    if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59) continue;
    const start = h1 * 60 + m1;
    const dur = h2 * 60 + m2 - start;
    if (dur < 20 || dur > 300 || start < 5 * 60) continue;
    const score = (m[2] || m[5] ? 2 : 0) + (m[3] || m[6] ? 2 : 0) + (pm ? 2 : 0) + (/(entren|wod|sesion|clase)/.test(clause) ? 1 : 0);
    if (!best || score > best.score) best = { time: `${pad(h1)}:${pad(m1)}`, minutes: dur, score };
  }
  return best ? { time: best.time, minutes: best.minutes } : null;
}

function lastIndex(s: string, re: RegExp) {
  let at = -1;
  let x: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((x = re.exec(s))) at = x.index;
  return at;
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
