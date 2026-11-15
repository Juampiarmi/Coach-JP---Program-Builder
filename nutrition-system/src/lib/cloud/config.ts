/**
 * Conexión a Supabase, en este orden:
 *  1. La fijada en el sitio publicado (variables del build o cloud.config.json): la ven el coach y todos los alumnos.
 *  2. Una conexión de prueba pegada en el asistente "Conectar nube" del Builder: vale sólo en este navegador
 *     (localStorage) para probar al instante antes de fijarla para todos.
 * Sin ninguna, el Builder funciona en modo local como siempre.
 * La clave pública (anon) puede viajar en el código: la seguridad la dan los permisos por fila de la base.
 */
export const OVERRIDE_KEY = 'coachjp-cloud-override';

const BUILD_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const BUILD_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export function validCloud(url: string, key: string) {
  return (/^https:\/\/.+/.test(url) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) && key.length > 20;
}

function readOverride(): { url: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const o = JSON.parse(localStorage.getItem(OVERRIDE_KEY) ?? 'null');
    return o && validCloud(o.url, o.key) ? o : null;
  } catch {
    return null;
  }
}

const builtIn = validCloud(BUILD_URL, BUILD_KEY);
const override = builtIn ? null : readOverride();

export const SUPABASE_URL = builtIn ? BUILD_URL : (override?.url ?? '');
export const SUPABASE_ANON_KEY = builtIn ? BUILD_KEY : (override?.key ?? '');
export const cloudConfigured = builtIn || !!override;
/** La conexión es de prueba (sólo este navegador): los alumnos todavía no la ven. */
export const cloudIsTrial = !builtIn && !!override;
export const cloudBuiltIn = builtIn;

export function saveOverride(url: string, key: string) {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ url, key }));
}
export function clearOverride() {
  localStorage.removeItem(OVERRIDE_KEY);
}

/** Base del sitio publicado (…/nutrition) para armar los links fijos de los atletas. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

/** Link fijo del atleta: …/nutrition/plan/<slug>#k=<token>. */
export function athleteLink(slug: string, token?: string | null) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${BASE_PATH}/plan/${slug}${token ? `#k=${token}` : ''}`;
}
