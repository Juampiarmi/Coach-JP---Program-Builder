// Prueba de punta a punta con la nube: Builder (login, publicar, link, PIN, versiones, revocar, borrador entre
// dispositivos, panel del coach) ↔ app del atleta (/plan/<slug>#k=…: vinculación, bienvenida, registros,
// sin señal, actualización del plan, celular nuevo) contra el Supabase de prueba (Postgres real + RLS).
//
// Uso: npm run test:cloud  (compila con la URL de prueba y corre esto; requiere Postgres: PGHOST/PGPORT/PGUSER)
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { startFakeSupabase } from './fake-supabase.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
}

export const E2E_SUPABASE_PORT = 54400;
const OUT = new URL('../out/', import.meta.url).pathname;
const NOT_FOUND = readFileSync(new URL('../gh-pages/404.html', import.meta.url));
const BASE = (process.env.BASE_PATH || '/Coach-JP---Program-Builder/nutrition').replace(/\/$/, '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

// Hosting estático como GitHub Pages: rutas desconocidas → 404.html (con su redirección de /plan/<slug>).
const site = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith(BASE)) {
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

const SHOTS = process.env.SHOTS || '';
const shot = (page, name, loc) => (SHOTS ? (loc ?? page).screenshot({ path: `${SHOTS}/${name}.png` }).catch(() => {}) : null);
const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) fails.push(msg);
};
const until = async (fn, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if (await fn()) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

const sb = await startFakeSupabase({ port: E2E_SUPABASE_PORT, users: [{ email: 'coach@jp.com', password: 'clave-segura-1' }] });
const browser = await chromium.launch();
const errors = [];
const watch = (page, who) => page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));

try {
  // ================= Builder · dispositivo 1 =================
  const cctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const coach = await cctx.newPage();
  watch(coach, 'builder');
  coach.on('dialog', (d) => d.accept());
  coach.on('console', (m) => m.type() === 'warning' && /plantilla/i.test(m.text()) && console.log('  ⚠ ' + m.text()));
  await coach.goto(ROOT, { waitUntil: 'networkidle' });
  await coach.getByRole('button', { name: 'Entrar a la nube' }).first().click();
  await coach.getByLabel('Email').fill('coach@jp.com');
  await coach.getByLabel('Contraseña').fill('mal');
  await coach.locator('form').getByRole('button', { name: 'Entrar' }).click();
  check(await until(() => coach.getByText('Email o contraseña incorrectos.').isVisible()), 'Login: contraseña incorrecta con mensaje claro');
  await coach.getByLabel('Contraseña').fill('clave-segura-1');
  await coach.locator('form').getByRole('button', { name: 'Entrar' }).click();
  check(await until(() => coach.getByText('Sólo en esta compu').first().isVisible()), 'Login: el coach entra y ve el estado "Sólo en esta compu"');

  await coach.locator('aside nav button', { hasText: 'Publicar' }).click();
  await coach.getByRole('button', { name: 'Publicar y crear su link' }).click();
  check(await until(() => coach.getByText('¡Plan publicado! Ya lo ve tu alumno en su link.').isVisible()), 'Publicar: confirmación "¡Plan publicado!"');
  check(await until(() => coach.getByText('Guardado en la nube').first().isVisible()), 'Borrador: "Guardado en la nube"');
  const wa = await coach.getByRole('link', { name: 'Mandar por WhatsApp' }).getAttribute('href');
  const link = /(http\S+\/plan\/[a-z0-9-]+#k=[\w-]+)/.exec(decodeURIComponent(wa.split('text=')[1]))[1];
  check(/\/plan\/[a-z0-9-]+#k=/.test(link), `Link fijo con llave: ${link.replace(/#k=.*/, '#k=…')}`);
  const pretty = link.split('#')[0];
  await shot(coach, 'cloud-publish', coach.locator('aside'));
  const db1 = await sb.sql('select version, is_active from published_plans');
  check(db1.length === 1 && db1[0].version === 1 && db1[0].is_active, 'Base: versión 1 activa');

  // ================= App del atleta · celular 1 =================
  const actx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ath = await actx.newPage();
  watch(ath, 'atleta');
  await ath.goto(link, { waitUntil: 'load' });
  check(await until(() => ath.getByText('Entendido, arrancar').isVisible(), 12000), 'Atleta: abre el link fijo y ve la bienvenida de 3 pasos');
  check(new URL(ath.url()).pathname.endsWith('/plan/' + pretty.split('/plan/')[1]), 'Atleta: la barra muestra la URL limpia /plan/<slug>');
  await shot(ath, 'cloud-welcome');
  await ath.getByText('Entendido, arrancar').click();
  check(await ath.locator('.next-card').isVisible(), 'Atleta: plan cargado (tarjeta Próxima comida)');
  await ath.locator('.next-card .nx-check').click();
  check(await until(() => ath.locator('.sync-chip.synced').isVisible()), 'Atleta: "✓ Todo enviado a tu coach"');
  let rows = await sb.sql('select meals_done, meals_total, kcal, kcal_target from daily_logs');
  check(rows.length === 1 && rows[0].meals_done === 1 && rows[0].meals_total > 1 && rows[0].kcal > 0, `Base: registro del día (${rows[0]?.meals_done}/${rows[0]?.meals_total} comidas, ${rows[0]?.kcal} kcal)`);
  await ath.fill('#w-in', '79.5');
  await ath.locator('[data-wsave]').click();
  check(await until(async () => (await sb.sql('select kg from weight_logs')).some((r) => Number(r.kg) === 79.5)), 'Base: peso 79,5 kg registrado');

  // Sin señal: queda en el celular y se envía al volver.
  await actx.setOffline(true);
  await ath.locator('.next-card .nx-check').click();
  check(await until(() => ath.locator('.sync-chip.offline').isVisible()), 'Sin señal: "Guardado en tu celular · esperando señal"');
  await shot(ath, 'cloud-offline');
  await actx.setOffline(false);
  check(await until(async () => (await sb.sql('select meals_done from daily_logs'))[0].meals_done === 2, 10000), 'Vuelve la señal: el registro pendiente llega solo (2 comidas)');
  check(await until(() => ath.locator('.sync-chip.synced').isVisible()), 'Atleta: vuelve a "Todo enviado"');

  // ================= El coach actualiza el plan =================
  const mealsBefore = await ath.locator('.card.meal').count();
  await coach.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  // Se borra una comida del mismo tipo de día que está viendo el alumno (entreno o descanso), sea cual sea el día de la semana.
  const athMode = (await ath.locator('.switch').getAttribute('class')).includes(' on') ? 'Entreno' : 'Descanso';
  await coach.getByRole('button', { name: athMode, exact: true }).first().click();
  await coach.getByTitle('Eliminar comida').first().click();
  await coach.getByRole('button', { name: 'Todas', exact: true }).first().click().catch(() => {});
  await coach.locator('aside nav button', { hasText: 'Publicar' }).click();
  check(await until(() => coach.getByText('Tenés cambios sin publicar.', { exact: false }).first().isVisible()), 'Builder: "Tenés cambios sin publicar"');
  await coach.getByRole('button', { name: 'Publicar cambios' }).click();
  check(await until(() => coach.getByText('(versión 2)').isVisible()), 'Publicar: versión 2');
  await ath.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  check(await until(() => ath.locator('#cjp-update').isVisible()), 'Atleta: aviso "Tu coach actualizó tu plan"');
  await ath.locator('#cjp-update').click();
  await ath.waitForLoadState('load');
  check(await until(() => ath.locator('#toast').innerText().then((t) => /actualizó tu plan/.test(t))), 'Atleta: confirmación al abrir la versión nueva');
  check(await until(async () => (await ath.locator('.card.meal').count()) === mealsBefore - 1), `Atleta: ve el plan nuevo (${mealsBefore} → ${mealsBefore - 1} comidas)`);

  // Sin señal desde el arranque: abre igual con el plan guardado.
  await actx.setOffline(true);
  await ath.reload({ waitUntil: 'load' }).catch(() => {});
  check(await until(() => ath.locator('.next-card, .card.meal').first().isVisible()), 'Sin señal desde el arranque: la app abre con el plan guardado');
  await actx.setOffline(false);

  // ================= Celular nuevo: recupera historial =================
  const nctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ath2 = await nctx.newPage();
  watch(ath2, 'atleta-2');
  await ath2.goto(link, { waitUntil: 'load' });
  await until(() => ath2.getByText('Entendido, arrancar').isVisible(), 12000);
  await ath2.getByText('Entendido, arrancar').click();
  check(await until(() => ath2.locator('.wcard .hv').innerText().then((t) => /79,5/.test(t))), 'Celular nuevo: recupera el peso registrado');
  check(await until(async () => (await ath2.locator('.card.meal.done').count()) >= 1), 'Celular nuevo: recupera las comidas tildadas de hoy');

  // ================= PIN =================
  await coach.getByRole('button', { name: 'Opciones del link y seguridad' }).click();
  await coach.getByPlaceholder('Ej. 4821').fill('4821');
  await coach.getByRole('button', { name: 'Guardar', exact: true }).click();
  check(await until(() => coach.getByText('PIN guardado: 4821', { exact: false }).isVisible()), 'Builder: PIN guardado');
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ath3 = await pctx.newPage();
  watch(ath3, 'atleta-pin');
  await ath3.goto(pretty, { waitUntil: 'load' });
  check(await until(() => ath3.getByText('Ingresá tu PIN').isVisible(), 12000), 'Link sin llave: pide el PIN');
  await shot(ath3, 'cloud-pin');
  await ath3.fill('#pin-i', '1111');
  await ath3.locator('#pin-f button').click();
  check(await until(() => ath3.getByText('PIN incorrecto.').isVisible()), 'PIN incorrecto: mensaje claro');
  await ath3.fill('#pin-i', '4821');
  await ath3.locator('#pin-f button').click();
  check(await until(() => ath3.getByText('Entendido, arrancar').isVisible(), 12000), 'PIN correcto: entra al plan');

  // ================= Traspaso de historial desde la app en archivo =================
  const dir = mkdtempSync(join(tmpdir(), 'cjp-cloud-'));
  // Con la nube, la descarga manual vive en «Opciones avanzadas / Respaldo».
  const adv = coach.locator('[data-export-advanced]');
  if ((await adv.count()) && !(await adv.evaluate((e) => e.open))) await adv.locator('summary').click();
  const [dl] = await Promise.all([coach.waitForEvent('download'), coach.getByRole('button', { name: /Descargar index.html/ }).click()]);
  const file = join(dir, 'index.html');
  await dl.saveAs(file);
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const old = await mctx.newPage();
  watch(old, 'archivo');
  await old.goto('file://' + file, { waitUntil: 'load' });
  const iso = (n) => { const d = new Date(Date.now() - n * 864e5); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  await old.evaluate(([d3, d2]) => {
    const K = Object.keys(localStorage).find((k) => /^coachjp-pwa:.+:start$/.test(k)).replace(/start$/, '');
    localStorage.setItem(K + 'weights', JSON.stringify({ [d3]: 81.2, [d2]: 80.9 }));
    localStorage.setItem(K + 'water:' + d2, '2500');
    localStorage.setItem(K + 'welcomed', 'true');
  }, [iso(3), iso(2)]);
  await old.reload({ waitUntil: 'load' });
  check(await until(() => old.getByRole('button', { name: 'Pasar mi historial a mi link nuevo' }).isVisible()), 'Archivo de respaldo: botón "Pasar mi historial a mi link nuevo"');
  await old.getByRole('button', { name: 'Pasar mi historial a mi link nuevo' }).click();
  await until(() => old.getByText('Entendido, arrancar').isVisible(), 15000);
  check(!/[#&]m=/.test(old.url()), 'Link nuevo: el historial no queda en la URL');
  await old.getByText('Entendido, arrancar').click();
  check(await until(() => old.locator('#toast').innerText().then((t) => /pasamos tu historial/.test(t)), 5000), 'Link nuevo: "Listo: pasamos tu historial"');
  check(await until(async () => (await sb.sql('select kg from weight_logs where day = $1', [iso(3)])).some((r) => Number(r.kg) === 81.2), 10000), 'Base: el peso del historial viejo llegó al coach');
  check(await until(async () => (await sb.sql('select water_ml from daily_logs where day = $1', [iso(2)]))[0]?.water_ml === 2500, 10000), 'Base: el agua de un día viejo llegó al coach');

  // ================= Borrador entre dispositivos del coach =================
  const c2ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const coach2 = await c2ctx.newPage();
  watch(coach2, 'builder-2');
  await coach2.goto(ROOT, { waitUntil: 'networkidle' });
  await coach2.getByRole('button', { name: 'Entrar a la nube' }).first().click();
  await coach2.getByLabel('Email').fill('coach@jp.com');
  await coach2.getByLabel('Contraseña').fill('clave-segura-1');
  await coach2.locator('form').getByRole('button', { name: 'Entrar' }).click();
  check(await until(() => coach2.getByText('2 EN BASE LOCAL').isVisible()), 'Otro dispositivo del coach: trae al atleta de la nube');

  // ================= Check-in semanal del atleta =================
  await ath.bringToFront();
  await ath.locator('#checkin-card [data-panel="checkin"]').click();
  await ath.locator('[data-ci="energy|2"]').click();
  await ath.locator('[data-ci="hunger|5"]').click();
  await ath.locator('[data-ci="heavy|1"]').click();
  await ath.locator('#ci-note').fill('La cena del martes');
  await ath.locator('#ci-obs').fill('Semana con viajes');
  await ath.context().route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
  const [waPage] = await Promise.all([ath.context().waitForEvent('page', { timeout: 10000 }).catch(() => null), ath.locator('[data-cisave]').click()]);
  const waUrl = waPage ? decodeURIComponent(waPage.url()) : '';
  check(/wa\.me\/.*Check-in|wa\.me\/.*CHECK-IN/i.test(waUrl) && /Energ/i.test(waUrl) && /Hambre/i.test(waUrl) && /Digesti/i.test(waUrl) && /Semana con viajes/.test(waUrl), 'Atleta: el check-in abre WhatsApp con el resumen para el coach');
  if (waPage) await waPage.close().catch(() => {});
  await ath.bringToFront();
  check(await until(() => ath.locator('#checkin-card').innerText().then((t) => /Enviado/.test(t))), 'Atleta: check-in semanal enviado (30 segundos)');
  check(await until(async () => (await sb.sql('select energy, hunger, heavy, note from checkins'))[0]?.hunger === 5, 10000), 'Base: el check-in llegó a Supabase (energía 2 · hambre 5 · digestión)');

  // ================= Plantillas propias en la nube =================
  await coach.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  coach.removeAllListeners('dialog');
  coach.once('dialog', (d) => d.accept('Plantilla nube e2e'));
  await coach.locator('[data-save-template]').click();
  await coach.waitForTimeout(200);
  coach.on('dialog', (d) => d.accept());
  check(await until(async () => (await sb.sql('select name from coach_templates')).some((r) => r.name === 'Plantilla nube e2e'), 10000), 'Plantillas: «Guardar como plantilla» la sube a Supabase');
  await coach2.reload({ waitUntil: 'networkidle' });
  await coach2.locator('section nav button', { hasText: 'Planes listos' }).click();
  check(await until(() => coach2.locator('[data-template-card]', { hasText: 'Plantilla nube e2e' }).isVisible(), 10000), 'Plantillas: aparecen en el otro dispositivo del coach');

  // ================= Panel del coach =================
  await coach.getByRole('button', { name: /Mis atletas/ }).first().click();
  check(await until(() => coach.locator('[data-athlete-row]').first().isVisible()), 'Panel: fila del atleta');
  const rowText = await coach.locator('[data-athlete-row]').first().innerText();
  check(/79,5/.test(rowText), 'Panel: muestra el último peso');
  await coach.locator('[data-athlete-row]').first().click();
  await coach.waitForTimeout(300);
  await shot(coach, 'cloud-board');
  check(/Hoy 2\/\d+ comidas/.test(rowText), 'Panel: muestra las comidas tildadas de hoy');
  check(await until(() => coach.locator('[data-checkin]').innerText().then((t) => /Hambre: 5\/5/.test(t) && /La cena del martes/.test(t))), 'Panel: muestra el último check-in (hambre, energía, digestión)');
  check(await coach.getByText('Hambre alta y poca energía').first().isVisible(), 'Panel: alerta cruzada con el check-in');
  await coach.locator('[data-board-filter="adjust"]').click();
  check((await coach.locator('[data-athlete-row]').count()) === 1, 'Panel: filtro «Requieren ajuste»');
  await coach.locator('[data-board-search]').fill('nadie-asi');
  check((await coach.locator('[data-athlete-row]').count()) === 0, 'Panel: buscador por nombre');
  await coach.locator('[data-board-search]').fill('');
  await coach.locator('[data-board-filter="all"]').click();
  check((await coach.locator('[data-row-wa]').count()) === 1 && (await coach.locator('[data-row-edit]').count()) === 1, 'Panel: accesos directos Editar plan y Copiar link WhatsApp');
  const vBefore = (await sb.sql('select max(version) as v from published_plans'))[0].v;
  await coach.locator('[data-row-adjust]').first().click();
  const am = coach.locator('[data-adjust-modal]');
  check(await am.getByText('Subir 150 kcal en días de entreno').isVisible(), 'Ajuste sugerido: «Subir 150 kcal en días de entreno» con vista previa');
  await am.locator('[data-adjust-apply]').click();
  check(await until(async () => (await sb.sql('select max(version) as v from published_plans'))[0].v === vBefore + 1, 15000), `Aplicar y publicar: versión ${vBefore + 1} publicada en un clic`);
  check(await until(async () => (await coach.locator('[data-adjust-modal]').count()) === 0), 'Aplicar y publicar: la vista previa se cierra');

  // ================= Cerrar sesiones (celular perdido) =================
  await coach.locator('aside nav button', { hasText: 'Publicar' }).click();
  await coach.getByRole('button', { name: 'Cerrar sesiones' }).click();
  check(await until(() => coach.getByText('Listo: sesiones cerradas', { exact: false }).isVisible()), 'Builder: sesiones cerradas');
  await ath.reload({ waitUntil: 'load' });
  check(await until(() => ath.getByText('Este link ya no funciona').isVisible(), 12000), 'Celular perdido: deja de ver el plan y pide el link nuevo');

  check(errors.length === 0, `Sin errores de JS ${errors.length ? JSON.stringify(errors) : ''}`);
} catch (e) {
  fails.push(String(e?.stack ?? e));
  console.error(e);
} finally {
  await browser.close();
  site.close();
  await sb.stop();
}
if (fails.length) {
  console.error(`\n${fails.length} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nPrueba con la nube OK');
