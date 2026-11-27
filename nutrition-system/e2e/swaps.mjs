// App del alumno: «Cambiar» ofrece Arroz yamaní → Fideos (misma familia) y Carne → Opción vegetariana con gramos
// calculados, y el Service Worker entrega la versión nueva de la app en la primera recarga. Uso: npm run test:e2e
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
}
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails++;
};

const dir = mkdtempSync(join(tmpdir(), 'cjp-swaps-'));
const lunchId = execFileSync('npx', ['tsx', 'e2e/fixtures/swapFixtures.ts', dir], { encoding: 'utf8' }).trim().split('\n').pop();
const browser = await chromium.launch();

// 1 · Reemplazos en la app del alumno.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + join(dir, 'file', 'index.html'));
  await page.waitForTimeout(500);
  const welcome = page.getByText('Entendido, arrancar');
  if (await welcome.count()) await welcome.click();
  const open = async (name) => {
    await page.locator(`[data-swap^="${lunchId}|"]`, { hasText: name }).first().click();
    await page.waitForSelector('#sheet [data-pick]');
  };
  // Arroz yamaní → Fideos (misma familia) + otras familias.
  await open('Arroz yamaní');
  const fideos = page.locator('#sheet [data-same-pick]', { hasText: /^.*Fideos/ }).first();
  const fTxt = (await fideos.count()) ? (await fideos.innerText()).replace(/\s+/g, ' ') : '';
  check(/\d+ g/.test(fTxt) && /Fideos/.test(fTxt), `App: Arroz yamaní → Fideos con gramos (${fTxt.slice(0, 70)})`);
  check((await page.locator('#sheet [data-same-pick]', { hasText: /Papa/ }).count()) > 0 && (await page.locator('#sheet [data-same-pick]', { hasText: /Batata/ }).count()) > 0, 'App: Arroz yamaní → Papa y Batata en la misma familia');
  check((await page.locator('#sheet [data-cross-head]').count()) === 1 && (await page.locator('#sheet [data-cross-pick]', { hasText: /Masa de tarta|Pan/ }).count()) > 0, 'App: Arroz yamaní → Otras familias (masa de tarta, pan)');
  await fideos.click();
  await page.waitForTimeout(200);
  check((await page.locator(`[data-swap^="${lunchId}|"]`, { hasText: /Fideos/ }).count()) > 0, 'App: al tocar Fideos el almuerzo muestra los fideos');
  // Carne (pollo) → Opción vegetariana.
  await open('Pechuga de pollo');
  const veg = page.locator('#sheet [data-veg-pick]');
  const nVeg = await veg.count();
  const vTxt = (await veg.allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
  check((await page.locator('#sheet [data-veg-head]').count()) === 1 && nVeg >= 4, `App: Carne → ${nVeg} opciones vegetarianas`);
  for (const re of [/Huevos/, /Claras \+ ricota/, /Tofu/, /Soja texturizada/, /Lentejas \+ huevo/]) check(vTxt.some((t) => re.test(t) && /\d+ g/.test(t)), `App: opción vegetariana ${re.source.replace(/\\/g, '')} con gramos calculados`);
  // Proteína dentro de ±15-20 % de la del pollo (56 g).
  const prots = vTxt.map((t) => +(/(\d+) g prot\./.exec(t) || [])[1]).filter((x) => x > 0);
  check(prots.length === nVeg && prots.every((x) => x >= 56 * 0.85 - 1 && x <= 56 * 1.2 + 1), `App: proteína de las opciones vegetarianas ${prots.join(' / ')} g (pollo 56 g)`);
  await veg.filter({ hasText: /Tofu/ }).first().click();
  await page.waitForTimeout(200);
  check((await page.locator(`[data-swap^="${lunchId}|"]`, { hasText: /Tofu/ }).count()) > 0, 'App: al elegir tofu el almuerzo lo muestra (con su complemento)');
  check(errs.length === 0, `App: sin errores de JS ${errs.join(' | ')}`);
  await ctx.close();
}

// 2 · Service Worker: al recargar el link entra la versión nueva de la app (sin quedar en una vieja cacheada).
// Lee la marca de versión tolerando la recarga automática que hace la app cuando entra un Service Worker nuevo.
const verOf = async (page) => {
  for (let i = 0; i < 20; i++) {
    try {
      await page.waitForLoadState('load');
      return await page.evaluate(() => document.getElementById('cjp-ver')?.textContent);
    } catch {
      await page.waitForTimeout(250);
    }
  }
  return null;
};
const serve = (root) =>
  new Promise((res) => {
    const srv = createServer((req, r) => {
      const u = new URL(req.url, 'http://x');
      let f = join(root, decodeURIComponent(u.pathname));
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
      if (!existsSync(f)) {
        r.statusCode = 404;
        return r.end('<!doctype html><title>404</title>404');
      }
      r.setHeader('Content-Type', extname(f) === '.js' ? 'text/javascript' : 'text/html; charset=utf-8');
      r.setHeader('Cache-Control', 'max-age=600');
      r.end(readFileSync(f));
    }).listen(0, () => res(srv));
  });
for (const [kind, sub, path] of [['App en archivo', 'file', '/file/'], ['Link fijo /plan/', 'plan', '/plan/']]) {
  const srv = await serve(dir);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const file = join(dir, sub, 'index.html');
  const v1 = readFileSync(file, 'utf8');
  writeFileSync(file, v1.replace('</body>', '<i id="cjp-ver">v1</i></body>'));
  await page.goto(base + path);
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
    await page.reload();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(600);
  const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => true);
  check(ctl, `${kind}: Service Worker activo`);
  // Nueva versión publicada (runtime nuevo + sw.js nuevo).
  writeFileSync(file, v1.replace('</body>', '<i id="cjp-ver">v2</i></body>'));
  const sw = join(dir, sub, 'sw.js');
  writeFileSync(sw, readFileSync(sw, 'utf8') + '\n// v2');
  await page.reload();
  await page.waitForTimeout(1200);
  const ver = await verOf(page);
  check(ver === 'v2', `${kind}: la primera recarga muestra la versión nueva (${ver})`);
  if (sub === 'plan') {
    await page.goto(base + '/plan/juan-perez');
    await page.waitForTimeout(800);
    check((await verOf(page)) === 'v2', 'Link fijo /plan/<alumno>: abre la app nueva');
  }
  await ctx.close();
  srv.close();
}
await browser.close();
if (fails) {
  console.error(`\n${fails} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nReemplazos de la app y actualización OK');
