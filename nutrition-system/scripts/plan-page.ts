/**
 * Post-build: genera la app del atleta con link fijo en out/plan/ (index.html + sw.js).
 * Toma la conexión a Supabase de las mismas variables que el Builder (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPlanServiceWorker, buildPlanShell } from '../src/lib/exportHtml';

const out = join(process.cwd(), 'out', 'plan');
mkdirSync(out, { recursive: true });
let file: { supabaseUrl?: string; anonKey?: string } = {};
try {
  file = JSON.parse(readFileSync(join(process.cwd(), 'cloud.config.json'), 'utf8'));
} catch {}
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || file.supabaseUrl || '').trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || file.anonKey || '').trim();
// El asistente "Conectar nube" del Builder ofrece copiar este SQL si la base todavía no está preparada.
copyFileSync(join(process.cwd(), 'supabase', 'migrations', '20261115000100_core.sql'), join(process.cwd(), 'out', 'supabase-setup.sql'));
const html = buildPlanShell({
  supabaseUrl,
  anonKey,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
});
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'sw.js'), buildPlanServiceWorker());
console.log(`✓ App del atleta (link fijo) · out/plan/index.html ${(html.length / 1024).toFixed(0)} KB${supabaseUrl ? '' : ' · sin Supabase configurado (muestra "todavía no disponible")'}`);
