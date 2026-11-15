/**
 * Conexión a Supabase. URL y clave pública llegan por variables de entorno del build
 * (GitHub → Settings → Variables: SUPABASE_URL / SUPABASE_ANON_KEY). Sin ellas, el Builder funciona en modo local.
 * La clave pública (anon) puede viajar en el código: la seguridad la dan los permisos por fila de la base.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
export const cloudConfigured = (/^https:\/\/.+/.test(SUPABASE_URL) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(SUPABASE_URL)) && SUPABASE_ANON_KEY.length > 20;

/** Base del sitio publicado (…/nutrition) para armar los links fijos de los atletas. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

/** Link fijo del atleta: …/nutrition/plan/<slug>#k=<token>. */
export function athleteLink(slug: string, token?: string | null) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${BASE_PATH}/plan/${slug}${token ? `#k=${token}` : ''}`;
}
