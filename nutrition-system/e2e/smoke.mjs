// Smoke test en navegador del Builder exportado (out/) y de la PWA del atleta que genera.
// Uso: npm run build && node e2e/smoke.mjs   (BASE_PATH=/repo/nutrition si el build tiene basePath)
// Corre en el workflow de Pages antes de publicar: si falla, no se despliega.
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  // Entorno local con Playwright global preinstalado.
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
}

const OUT = new URL('../out/', import.meta.url).pathname;
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || '/';
  let file = normalize(join(OUT, p));
  if (!file.startsWith(OUT)) return res.writeHead(403).end();
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ROOT = `http://127.0.0.1:${server.address().port}${BASE}/`;

const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails.push(msg);
};

const browser = await chromium.launch();
try {
  // ---------- Builder ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(ROOT, { waitUntil: 'networkidle' });
  check(await page.getByText('COACH JP').first().isVisible(), 'Builder carga');

  await page.getByText('03 · Ingestas & leucina').first().click();
  const meals = page.locator('input[type="time"]');
  const n0 = await meals.count();
  check(n0 > 0, `Plan con comidas (${n0})`);

  await page.getByText('[ ⚡ COMPLETAR 5 OPCIONES EN TODO EL PLAN ]').click();
  await page.waitForTimeout(300);
  const cmp = page.getByRole('button', { name: 'Comparar' }).first();
  check(await cmp.isVisible(), 'Opciones generadas: aparece el selector Tarjetas / Comparar');
  await cmp.click();
  const rows = await page.locator('table tbody tr').count();
  check(rows >= 2, `Tabla comparativa con ${rows} opciones`);

  // Deshacer: borrar una comida y recuperarla con Ctrl+Z.
  await page.getByTitle('Eliminar comida').first().click();
  await page.waitForTimeout(150);
  check((await meals.count()) === n0 - 1, 'Borrar comida');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  check((await meals.count()) === n0, 'Ctrl+Z recupera la comida borrada');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await page.waitForTimeout(150);
  check((await page.getByRole('button', { name: 'Comparar' }).count()) === 0, 'Botón Deshacer revierte el autollenado de opciones');
  await page.getByRole('button', { name: 'Rehacer' }).click();
  await page.waitForTimeout(150);

  // Exportación + indicador de plan desactualizado.
  await page.getByRole('button', { name: /PWA Deploy/ }).click();
  check(await page.getByText('Todavía no exportaste este plan.').isVisible(), 'Indicador: plan nunca exportado');
  const dir = mkdtempSync(join(tmpdir(), 'cjp-smoke-'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar index.html/ }).click()]);
  const html = join(dir, 'index.html');
  await dl.saveAs(html);
  check(await page.getByText('Plan al día.').isVisible(), 'Indicador: plan al día después de exportar');
  await page.getByText('03 · Ingestas & leucina').first().click();
  await page.getByTitle('Eliminar comida').first().click();
  await page.getByRole('button', { name: /PWA Deploy/ }).click();
  check(await page.getByText('Plan desactualizado.').isVisible(), 'Indicador: plan desactualizado después de editar');
  check(errs.length === 0, `Builder sin errores de JS ${errs.length ? JSON.stringify(errs) : ''}`);
  await ctx.close();

  // ---------- PWA del atleta ----------
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pwa = await pctx.newPage();
  const perrs = [];
  pwa.on('pageerror', (e) => perrs.push(e.message));
  await pwa.goto('file://' + html, { waitUntil: 'load' });
  await pwa.waitForTimeout(500);
  check(await pwa.locator('.next-card').isVisible(), 'PWA: tarjeta Próxima comida');
  const firstName = await pwa.locator('.next-card .nx-name').innerText();
  await pwa.locator('.next-card .nx-check').click();
  await pwa.waitForTimeout(150);
  check((await pwa.locator('.next-card .nx-name').innerText()) !== firstName, 'PWA: tildar desde la tarjeta avanza a la siguiente comida');
  check((await pwa.locator('.cups').count()) === 0, 'PWA: hidratación plegada por defecto');
  await pwa.locator('[data-hy]').click();
  check((await pwa.locator('.cups').count()) === 1, 'PWA: hidratación se expande al tocarla');
  check((await pwa.locator('.tl-track').count()) === 0, 'PWA: timeline plegado por defecto');
  await pwa.fill('#w-in', '80.4');
  await pwa.locator('[data-wsave]').click();
  await pwa.locator('[data-day="-1"]').click();
  await pwa.fill('#w-in', '81');
  await pwa.locator('[data-wsave]').click();
  await pwa.locator('[data-day="0"]').click();
  check(await pwa.locator('.w-chart').isVisible(), 'PWA: curva de peso con 2 registros');
  await pwa.locator('.toolgrid [data-panel="shop"]').click();
  await pwa.waitForTimeout(200);
  check((await pwa.locator('.shop-item').count()) > 0, 'PWA: lista de compras');
  check(perrs.length === 0, `PWA sin errores de JS ${perrs.length ? JSON.stringify(perrs) : ''}`);
  await pctx.close();
} catch (e) {
  fails.push(String(e && e.stack ? e.stack : e));
  console.error(e);
} finally {
  await browser.close();
  server.close();
}
if (fails.length) {
  console.error(`\n${fails.length} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nSmoke test OK');
