import { DatabaseZap } from 'lucide-react';
import { supabaseConfigurado } from '@/lib/supabase';

/** Aviso visible cuando la app corre sin credenciales de Supabase. */
export function ConfigBanner() {
  if (supabaseConfigurado) return null;
  return (
    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <p>
        <strong className="font-semibold">Modo sin conexión a datos.</strong> Copiá <code>.env.example</code> a{' '}
        <code>.env.local</code> con la URL y la anon key de Supabase y ejecutá <code>supabase/schema.sql</code>.
      </p>
    </div>
  );
}
