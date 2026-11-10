import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true si las variables de entorno de Supabase están presentes. */
export const supabaseConfigurado = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Cliente singleton del navegador. Devuelve null si faltan las variables de entorno,
 * para que la app compile y renderice estados vacíos en lugar de romper.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export const MENSAJE_SIN_CONFIG =
  'Supabase no está configurado. Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.';
