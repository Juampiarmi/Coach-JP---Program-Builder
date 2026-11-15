'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloudConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** Cliente único del Builder (sesión del coach guardada en este navegador). */
export function supa(): SupabaseClient {
  if (!cloudConfigured) throw new Error('La nube no está configurada');
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'coachjp-cloud-auth' },
  });
  return client;
}

/** Mensajes de error en lenguaje humano (nunca códigos crudos de la base). */
export function humanError(e: unknown): string {
  const err = e as { message?: string; code?: string; status?: number } | null;
  const msg = err?.message ?? String(e);
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sin conexión. Tus cambios quedan guardados en esta compu y se suben cuando vuelva la señal.';
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Todavía no confirmaste tu email: revisá tu casilla.';
  if (/no está habilitado como coach/i.test(msg)) return 'Este email no está habilitado como coach. Pedile a tu coach principal que te invite.';
  if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.';
  if (/duplicate key.*slug|athletes_slug_key/i.test(msg)) return 'Ese link ya lo usa otro atleta. Probá con otro nombre de link.';
  if (/JWT|session|not authenticated/i.test(msg) || err?.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
  return msg;
}
