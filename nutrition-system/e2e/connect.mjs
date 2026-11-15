// Asistente "Conectar nube en 1 paso" sobre el Builder publicado SIN nube fija: prueba de conexión (base sin
// preparar → copiar SQL; base lista → OK), conexión de prueba en este navegador, cuenta de coach nueva,
// publicar y abrir el link del alumno en el mismo navegador. Uso: npm run build && node e2e/connect.mjs
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { startFakeSupabase } from './fake-supabase.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
}
const OUT = new URL('../out/', import.meta.url).pathname;
const NOT_FOUND = readFileSync(new URL('../gh-pages/404.html', import.meta.url));
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.sql': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const site = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!BASE || p.startsWith(BASE)) {
    let file = normalize(join(OUT, p.slice(BASE.length) || '/'));
    try {
      if (file.startsWith(OUT)) {
        if (statSync(file).isDirectory()) file = join(file, 'index.html');
        return res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
      }
    } catch {}
  }
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(NOT_FOUND);
});
await new Promise((r) => site.listen(0, '127.0.0.1', r));
const ROOT = `http://127.0.0.1:${site.address().port}${BASE}/`;
const KEY = 'e2e-anon-key-0000000000000000';

const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails.push(msg);
};
const until = async (fn, ms = 8000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await new Promise((r) => setTimeout(r, 200))) {
    try {
      if (await fn()) return true;
    } catch {}
  }
  return false;
};

const empty = await startFakeSupabase({ migrate: false });
const ready = await startFakeSupabase();
const browser = await chromium.launch();
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(ROOT, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Conectar nube/ }).first().click();
  check(await page.getByText('Conectar nube en 1 paso').first().isVisible(), 'Asistente abierto desde "Modo local · Conectar nube"');

  // Proyecto sin preparar: ofrece copiar el SQL.
  await page.getByPlaceholder('https://xxxxxxxx.supabase.co').fill(empty.url);
  await page.getByPlaceholder(/eyJhbGciOi/).fill(KEY);
  await page.getByRole('button', { name: 'Probar conexión' }).click();
  check(await until(() => page.getByText('Proyecto encontrado y clave correcta').isVisible()), 'Prueba: proyecto encontrado');
  check(await until(() => page.getByText(/Falta preparar la base/).isVisible()), 'Prueba: detecta la base sin preparar');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/connect-sql.png' });
  await page.getByRole('button', { name: '1. Copiar SQL' }).click();
  check(await until(async () => /create table public\.athletes/.test(await page.evaluate(() => navigator.clipboard.readText()))), 'Copiar SQL: el script de la base queda en el portapapeles');
  check((await page.getByRole('button', { name: /Usar esta conexión/ }).count()) === 0, 'Sin base preparada no deja usar la conexión');

  // Proyecto listo.
  await page.getByPlaceholder('https://xxxxxxxx.supabase.co').fill(ready.url);
  await page.getByRole('button', { name: 'Probar conexión' }).click();
  check(await until(() => page.getByText('Base preparada', { exact: false }).isVisible()), 'Prueba: base preparada');
  check(await page.getByText('Acceso de alumnos sin cuenta habilitado').isVisible(), 'Prueba: acceso de alumnos sin cuenta');
  check(await page.getByText('SUPABASE_ANON_KEY').isVisible(), 'Muestra las 2 variables listas para copiar a GitHub');
  if (process.env.SHOTS) { await page.setViewportSize({ width: 1000, height: 1300 }); await page.screenshot({ path: process.env.SHOTS + '/connect-ready.png' }); await page.setViewportSize({ width: 1440, height: 1000 }); };
  await page.getByRole('button', { name: /Usar esta conexión en este navegador/ }).click();
  await page.waitForLoadState('networkidle');
  check(await until(() => page.getByRole('button', { name: 'Nube de prueba' }).isVisible()), 'Conexión de prueba activa ("Nube de prueba")');

  // Cuenta de coach nueva desde el Builder.
  await page.getByRole('button', { name: 'Entrar a la nube' }).first().click();
  await page.getByRole('button', { name: /Crear mi cuenta de coach/ }).click();
  await page.getByLabel('Email').fill('nuevo@coach.com');
  await page.getByLabel('Contraseña').fill('corta');
  await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click();
  check(await until(() => page.getByText(/al menos 8 caracteres/).isVisible()), 'Crear cuenta: contraseña corta con mensaje claro');
  await page.getByLabel('Contraseña').fill('clave-larga-segura');
  await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click();
  check(await until(() => page.getByRole('heading', { name: /Mis atletas/ }).isVisible()), 'Cuenta creada: entra directo al panel "Mis atletas"');
  check((await ready.sql('select email from coaches')).some((r) => r.email === 'nuevo@coach.com'), 'Base: el coach quedó dado de alta');

  // Publicar y abrir el link del alumno en el mismo navegador (conexión de prueba).
  await page.locator('aside nav button', { hasText: 'Publicar' }).click();
  await page.getByRole('button', { name: 'Publicar y crear su link' }).click();
  check(await until(() => page.getByText('¡Plan publicado!', { exact: false }).isVisible()), 'Publicar con la conexión de prueba');
  const wa = await page.getByRole('link', { name: 'Mandar por WhatsApp' }).getAttribute('href');
  const link = /(http\S+\/plan\/[a-z0-9-]+#k=[\w-]+)/.exec(decodeURIComponent(wa.split('text=')[1]))[1];
  const ath = await ctx.newPage();
  ath.on('pageerror', (e) => errors.push('atleta: ' + e.message));
  await ath.goto(link.replace(/\/plan\/([a-z0-9-]+)#/, '/plan/?a=$1#'), { waitUntil: 'load' });
  check(await until(() => ath.getByText('Entendido, arrancar').isVisible(), 12000), 'Link del alumno abre en este navegador con la conexión de prueba');
  check(errors.length === 0, `Sin errores de JS ${errors.length ? JSON.stringify(errors) : ''}`);
} catch (e) {
  fails.push(String(e?.stack ?? e));
  console.error(e);
} finally {
  await browser.close();
  site.close();
  await empty.stop();
  await ready.stop();
}
if (fails.length) {
  console.error(`\n${fails.length} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nAsistente "Conectar nube" OK');
