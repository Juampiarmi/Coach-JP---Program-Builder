/**
 * Post-build: genera la app del atleta con link fijo en out/plan/ (index.html + sw.js).
 * Toma la conexión a Supabase de las mismas variables que el Builder (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPlanServiceWorker, buildPlanShell } from '../src/lib/exportHtml';

const out = join(process.cwd(), 'out', 'plan');
mkdirSync(out, { recursive: true });
const html = buildPlanShell({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
});
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'sw.js'), buildPlanServiceWorker());
console.log(`✓ App del atleta (link fijo) · out/plan/index.html ${(html.length / 1024).toFixed(0)} KB${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ' · sin Supabase configurado (muestra "todavía no disponible")'}`);
