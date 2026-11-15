/**
 * Chequeo de una conexión a Supabase antes de usarla (asistente "Conectar nube" del Builder).
 * Sólo usa la clave pública: verifica que el proyecto responda, que la base tenga las tablas de Coach JP
 * y que esté habilitado el acceso de alumnos sin cuenta.
 */
export type CheckState = 'ok' | 'fail' | 'warn';
export interface ProbeResult {
  url: string;
  ref: string | null;
  project: { state: CheckState; text: string };
  database: { state: CheckState; text: string };
  anonymous: { state: CheckState; text: string };
  signup: { state: CheckState; text: string };
  ready: boolean;
}

/** Acepta la URL del proyecto, el dominio, el link del panel de Supabase o sólo el "project ref". */
export function normalizeUrl(input: string): { url: string; ref: string | null } {
  const s = input.trim().replace(/\/+$/, '');
  const dash = /supabase\.com\/dashboard\/project\/([a-z0-9]{15,30})/i.exec(s);
  if (dash) return { url: `https://${dash[1].toLowerCase()}.supabase.co`, ref: dash[1].toLowerCase() };
  if (/^[a-z0-9]{15,30}$/i.test(s)) return { url: `https://${s.toLowerCase()}.supabase.co`, ref: s.toLowerCase() };
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  const m = /^https:\/\/([a-z0-9]{15,30})\.supabase\.co$/i.exec(withProto);
  return { url: withProto.replace(/\/(rest|auth)\/v1.*$/, ''), ref: m ? m[1].toLowerCase() : null };
}

export async function probeSupabase(rawUrl: string, rawKey: string): Promise<ProbeResult> {
  const { url, ref } = normalizeUrl(rawUrl);
  const key = rawKey.trim();
  const res: ProbeResult = {
    url,
    ref,
    project: { state: 'fail', text: '' },
    database: { state: 'fail', text: 'Sin verificar' },
    anonymous: { state: 'warn', text: 'Sin verificar' },
    signup: { state: 'warn', text: 'Sin verificar' },
    ready: false,
  };
  const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  // 1 · Proyecto y clave
  let settings: { external?: Record<string, boolean>; disable_signup?: boolean; mailer_autoconfirm?: boolean } | null = null;
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: h });
    if (r.status === 401 || r.status === 403) {
      res.project.text = 'La clave no corresponde a este proyecto. Copiá la clave "anon / public" (no la service_role).';
      return res;
    }
    if (!r.ok) {
      res.project.text = `El proyecto respondió con un error (${r.status}). Revisá la URL.`;
      return res;
    }
    settings = await r.json();
    res.project = { state: 'ok', text: 'Proyecto encontrado y clave correcta' };
  } catch {
    res.project.text = 'No encontramos el proyecto. Revisá la URL (termina en .supabase.co) o si el proyecto está pausado.';
    return res;
  }

  // 2 · Base preparada: la función existe pero la clave pública sola no puede usarla (eso es lo correcto).
  try {
    const r = await fetch(`${url}/rest/v1/rpc/slug_available`, { method: 'POST', headers: h, body: JSON.stringify({ p_slug: 'prueba' }) });
    const body = await r.json().catch(() => ({}));
    if (r.status === 404 || body?.code === 'PGRST202') res.database = { state: 'fail', text: 'Falta preparar la base: copiá el SQL y ejecutalo una vez en el editor SQL de Supabase.' };
    else if (r.ok || body?.code === '42501' || r.status === 401 || r.status === 403) res.database = { state: 'ok', text: 'Base preparada (tablas y permisos de Coach JP)' };
    else res.database = { state: 'warn', text: `No pudimos confirmar la base (${body?.message ?? r.status}).` };
  } catch {
    res.database = { state: 'warn', text: 'No pudimos confirmar la base (sin respuesta).' };
  }

  // 3 · Acceso de alumnos sin cuenta (sesiones anónimas)
  const anon = settings?.external?.anonymous_users;
  res.anonymous =
    anon === true
      ? { state: 'ok', text: 'Acceso de alumnos sin cuenta habilitado' }
      : anon === false
        ? { state: 'fail', text: 'Activá "Allow anonymous sign-ins" (Authentication → Sign In / Providers) para que tus alumnos entren con su link.' }
        : { state: 'warn', text: 'No pudimos confirmar el acceso de alumnos sin cuenta: revisá que "Allow anonymous sign-ins" esté activado.' };

  // 4 · Registro del coach
  res.signup = settings?.disable_signup
    ? { state: 'warn', text: 'Los registros nuevos están desactivados: creá tu usuario de coach desde Authentication → Users.' }
    : settings?.mailer_autoconfirm
      ? { state: 'ok', text: 'Podés crear tu cuenta de coach desde el Builder al instante' }
      : { state: 'ok', text: 'Podés crear tu cuenta de coach desde el Builder (te llega un email para confirmarla)' };

  res.ready = res.project.state === 'ok' && res.database.state === 'ok' && res.anonymous.state !== 'fail';
  return res;
}
