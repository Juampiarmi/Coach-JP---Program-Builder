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

  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  const meals = page.locator('input[type="time"]');
  const n0 = await meals.count();
  check(n0 > 0, `Plan con comidas (${n0})`);

  await page.getByText('[ ⚡ COMPLETAR 5 OPCIONES EN TODO EL PLAN ]').click();
  await page.waitForTimeout(300);
  // Vista compacta: las alternativas están plegadas bajo «+ Ver X opciones más».
  // Con 4 alternativas quedan plegadas (con 1-2 variantes de un plan automático, a la vista).
  check((await page.locator('[data-show-alts][aria-expanded="false"]').count()) > 0, 'Comidas: alternativas plegadas bajo «+ Ver X opciones»');
  await page.locator('[data-show-alts][aria-expanded="false"]').first().click();
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
  check((await page.locator('[data-show-alts]').count()) === 0, 'Botón Deshacer revierte el autollenado de opciones');

  await page.getByRole('button', { name: 'Rehacer' }).click();
  await page.waitForTimeout(150);

  // Banco Global por opción: selector filtrado y ordenado, vista previa con gramos escalados, reemplazo en un clic.
  {
    const card = page.locator('[data-bank-swap="0"]').first();
    await card.click();
    await page.waitForSelector('[data-bank-swap-modal]');
    const nCand = await page.locator('[data-bank-cand]').count();
    check(nCand > 0, `Banco Global por opción: ${nCand} platos aptos ordenados por cercanía`);
    const firstTitle = (await page.locator('[data-bank-cand] span').first().innerText()).trim();
    await page.locator('[data-bank-cand]').first().click();
    check((await page.locator('[data-bank-swap-preview] li').count()) > 0, 'Banco Global por opción: vista previa con los gramos ya escalados');
    await page.locator('[data-bank-swap-apply]').click();
    await page.waitForTimeout(250);
    check((await page.locator('[data-bank-swap-modal]').count()) === 0 && (await page.locator(`input[value="${firstTitle.replace(/"/g, '\\"')}"]`).count()) > 0, `Banco Global por opción: Opción 1 reemplazada por «${firstTitle}»`);
    // Reemplazo cruzado por macro en un ingrediente.
    const cs = page.locator('[data-cross-swap]').first();
    check((await page.locator('[data-cross-swap]').count()) > 0, 'Reemplazo cruzado: botón CRUZADO en los ingredientes');
    await cs.click();
    await page.waitForSelector('[data-cross-modal]');
    const nOpt = await page.locator('[data-cross-opt]').count();
    check(nOpt > 0, `Reemplazo cruzado: ${nOpt} opciones de otras familias con gramos calculados`);
    await page.locator('[data-cross-opt]').first().click();
    await page.waitForTimeout(200);
    check((await page.locator('[data-cross-modal]').count()) === 0, 'Reemplazo cruzado: se aplica en un clic');
    check((await page.getByText('Antes de entrenar', { exact: true }).count()) === 0, 'Comidas: «Antes de entrenar» pasó a llamarse «Merienda»');
  }

  // Exportación + indicador de plan desactualizado (con la nube, la descarga manual está en «Opciones avanzadas»).
  const openPublish = async () => {
    await page.locator('aside nav button', { hasText: 'Publicar' }).click();
    const adv = page.locator('[data-export-advanced]');
    if ((await adv.count()) && !(await adv.evaluate((e) => e.open))) await adv.locator('summary').click();
  };
  await openPublish();
  check(await page.getByText('Todavía no exportaste este plan.').isVisible(), 'Indicador: plan nunca exportado');
  const dir = mkdtempSync(join(tmpdir(), 'cjp-smoke-'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar index.html/ }).click()]);
  const html = join(dir, 'index.html');
  await dl.saveAs(html);
  check(await page.getByText('Plan al día.').isVisible(), 'Indicador: plan al día después de exportar');
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  await page.getByTitle('Eliminar comida').first().click();
  await openPublish();
  check(await page.getByText('Plan desactualizado.').isVisible(), 'Indicador: plan desactualizado después de editar');

  // Planes listos: filtrar, abrir la vista previa completa y aplicarlo al alumno.
  await page.locator('section nav button', { hasText: 'Planes listos' }).click();
  check((await page.locator('[data-block="estructura"]').count()) > 0, 'Bloques: Planes listos marcado como «Estructura del día»');
  await page.getByRole('button', { name: 'Sin TACC', exact: true }).click();
  const cards = page.locator('[data-bank-card]');
  check((await cards.count()) === 4, `Planes listos: 4 planes por sexo y variante (${await cards.count()})`);
  await cards.first().click();
  const modal = page.locator('[data-plan-preview]');
  check(await modal.isVisible(), 'Planes listos: vista previa completa antes de aplicar');
  check((await modal.getByText('DÍA DE ENTRENO').count()) > 0 && (await modal.getByText('DÍA DE DESCANSO').count()) > 0, 'Vista previa: día de entreno y de descanso');
  await modal.getByRole('button', { name: /Aplicar a este alumno/ }).click();
  await page.waitForTimeout(250);
  check((await modal.count()) === 0 && (await meals.count()) > 0, 'Planes listos: al aplicar abre Comidas con el plan nuevo');
  check((await page.getByText(/Galletas de arroz|Arroz|Papa|Batata|Polenta/).count()) > 0, 'Planes listos: comidas reemplazadas por las del plan Sin TACC');
  check((await page.locator('[data-block="opciones"]').count()) > 0, 'Bloques: Comidas separa «Estructura del día» y «Opciones por comida»');

  // Ajustar horarios: la cena queda última en cada día.
  await page.getByRole('button', { name: /AJUSTAR HORARIOS AL ENTRENO/ }).click();
  await page.waitForTimeout(150);
  const times = await meals.evaluateAll((els) => els.map((e) => e.value));
  check(times.length > 0 && !times.some((t) => t >= '22:31' || t < '05:00'), `Ajustar horarios: nada después de las 22:30 (${times.join(' ')})`);

  // Plantilla propia: guardar desde Comidas y reaplicarla desde Mis plantillas.
  page.once('dialog', (d) => d.accept('Mi plantilla e2e'));
  await page.locator('[data-save-template]').click();
  await page.waitForTimeout(150);
  await page.locator('section nav button', { hasText: 'Planes listos' }).click();
  const tcard = page.locator('[data-template-card]', { hasText: 'Mi plantilla e2e' });
  check(await tcard.isVisible(), 'Plantillas: el plan guardado aparece en Mis plantillas');
  await tcard.getByRole('button', { name: /Vista previa y aplicar/ }).click();
  check(await modal.isVisible(), 'Plantillas: vista previa escalada antes de aplicar');
  await modal.getByRole('button', { name: /Aplicar a este alumno/ }).click();
  await page.waitForTimeout(250);
  check((await meals.count()) > 0, 'Plantillas: aplicada al alumno');

  // Perfil: deporte + objetivo → precálculo en vivo y plan sugerido.
  await page.locator('section nav button', { hasText: 'Alumno' }).click();
  check((await page.locator('[data-athlete-sheet] [data-block]').count()) >= 3, 'Vista única: Biometría · Horarios y restricciones · Macros en una pantalla');
  const pre = page.locator('[data-precalc]');
  check(await pre.isVisible(), 'Perfil: precálculo en vivo (metabolismo y gasto)');
  const before = await pre.innerText();
  await page.locator('[data-sport="running"]').click();
  await page.locator('[data-goal="hip"]').click();
  await page.waitForTimeout(100);
  check((await pre.innerText()) !== before, 'Perfil: el gasto se recalcula al cambiar el deporte');
  check(await page.getByText(/Hipertrofia · (Hombre|Mujer) activ/).first().isVisible(), 'Perfil: sugiere el plan maestro del objetivo');
  await page.locator('[data-precalc-preview]').click();
  check(await modal.isVisible(), 'Perfil: vista previa del plan sugerido');
  await page.keyboard.press('Escape');
  check((await modal.count()) === 0, 'Vista previa: se cierra con Escape sin aplicar');
  // Seguridad clínica: alergia declarada → marcas en Comidas, publicación frenada, corrección automática y sellos.
  await page.locator('[data-goal="rec"]').click();
  await page.locator('[data-allergy="lactose"]').click();
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  check((await page.locator('[data-allergen-flag]').count()) > 0, 'Alergias: los ingredientes con lactosa quedan marcados en Comidas');
  await openPublish();
  check((await page.locator('[data-quality="blocked"]').count()) === 1, 'Semáforo: publicar frenado por alérgenos');
  check(await page.getByRole('button', { name: /Descargar index.html/ }).isDisabled(), 'Bloqueo duro: no se puede descargar el archivo del alumno');
  check((await page.locator('[data-check]').count()) >= 8, `Semáforo: ${await page.locator('[data-check]').count()} verificaciones en vivo`);
  await page.locator('[data-fix-allergens]').click();
  await page.waitForTimeout(200);
  check((await page.locator('[data-quality="ok"]').count()) === 1, 'Alergias: «Corregir automáticamente» sustituye y destraba la publicación');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar index.html/ }).click()]);
  const html2 = join(dir, 'sin-lactosa.html');
  await dl2.saveAs(html2);
  const exported = readFileSync(html2, 'utf8');
  check(/"seals":\[[^\]]*"Sin lactosa"/.test(exported) && /"avoid":\[[^\]]*"leche"/.test(exported), 'App del alumno: sellos «Sin lactosa» por plato y swaps sin alimentos con lactosa');
  {
    const sp = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await sp.goto('file://' + html2, { waitUntil: 'load' });
    await sp.waitForTimeout(400);
    if (await sp.getByText('Entendido, arrancar').isVisible()) await sp.getByText('Entendido, arrancar').click();
    check((await sp.locator('.seals i', { hasText: 'Sin lactosa' }).count()) > 0, 'App del alumno: sello «✓ Sin lactosa» visible en los platos');
    check((await sp.locator('.xwarn').count()) > 0, 'App del alumno: aviso de contaminación cruzada en los platos (celíaco)');
    await sp.close();
  }
  await page.locator('section nav button', { hasText: 'Planes listos' }).click();
  await page.locator('[data-bank-card]').first().click();
  await page.locator('[data-plan-preview]').getByRole('button', { name: /Aplicar a este alumno/ }).click();
  await page.waitForTimeout(250);
  check((await page.locator('[data-allergen-flag]').count()) === 0, 'Alergias: el plan del banco aplicado llega sin lactosa');
  // Comidas: resumen fijo, cambiar base en toda la comida y copiar al día de descanso.
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  check(await page.locator('[data-sticky-summary]').isVisible(), 'Comidas: resumen fijo con macros, semáforo y Publicar');
  const nBefore = await meals.count();
  await page.locator('[data-base-swap]').first().click();
  const toBtn = page.locator('[data-base-to]').first();
  const toName = (await toBtn.innerText()).trim();
  await toBtn.click();
  await page.waitForTimeout(150);
  check((await page.getByText(toName, { exact: false }).count()) > 0, `Cambiar base: la comida pasa a ${toName} en todas sus opciones`);
  await page.getByRole('button', { name: /Copiar al día de (descanso|entreno)/ }).first().click();
  await page.waitForTimeout(150);
  check((await meals.count()) === nBefore + 1, 'Copiar al día de descanso: la comida se duplica en el otro día');

  // Nuevo plan / Asignar rápido: alumno nuevo en 3 pasos.
  await page.locator('[data-quick-assign]').click();
  const qm = page.locator('[data-quick-modal]');
  await qm.getByRole('button', { name: 'Alumno nuevo' }).click();
  await qm.locator('[data-qa-name]').fill('Lucía Test');
  await qm.locator('[data-qa-goal="def"]').click();
  await qm.getByRole('button', { name: 'Alergia a lácteos / APLV' }).click();
  await qm.locator('[data-qa-next]').click();
  check(await qm.getByText(/Definición · (Mujer|Hombre) activ/).isVisible(), 'Asignar rápido: plan maestro sugerido con vista previa');
  await qm.locator('[data-qa-next]').click();
  await qm.locator('[data-qa-apply]').click();
  await page.waitForTimeout(300);
  check((await page.getByText('Lucía Test').count()) > 0 && (await meals.count()) > 0, 'Asignar rápido: alumno nuevo con su plan aplicado');
  check((await page.locator('[data-allergen-flag]').count()) === 0, 'APLV: el plan asignado llega sin lácteos');

  // Desglose del 100 % calórico y reemplazos rápidos 1 a 1.
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  const split = page.locator('[data-macro-split] [data-split-day="on"]');
  check(await split.isVisible(), 'Macros: desglose del 100 % calórico (entreno y descanso)');
  const pcts = (await split.locator('[data-split]').allInnerTexts()).map((t) => parseInt(/(\d+) %/.exec(t)[1]));
  check(pcts.length === 3 && pcts.reduce((a, b) => a + b, 0) === 100, `Macros: proteínas + carbos + grasas = 100 % (${pcts.join(' + ')})`);
  await page.locator('[data-quick-swaps] > button').click();
  await page.locator('[data-qswap="papa"]').click();
  const applyRow = page.locator('[data-qswap-apply]').first();
  check(await applyRow.isVisible(), 'Reemplazos rápidos: lista los ingredientes que se pueden cambiar con los gramos calculados');
  const papaBefore = await page.getByText(/^Papa/).count();
  await applyRow.click();
  await page.waitForTimeout(150);
  check((await page.getByText(/^Papa/).count()) > papaBefore || (await page.locator('select option:checked', { hasText: /^Papa/ }).count()) > 0, 'Reemplazos rápidos: se aplica en la comida con un clic');
  // Vegetariano: la carne y el pescado desaparecen de los selectores del Builder.
  await page.locator('section nav button', { hasText: 'Alumno' }).click();
  await page.locator('[data-allergy="veg"]').first().click();
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  await page.waitForTimeout(150);
  const pickerOpts = await page.locator('select:has(option:text-matches("Agregar alimento"))').first().locator('option').allInnerTexts();
  check(pickerOpts.length > 5 && !pickerOpts.some((o) => /pollo|cuadril|merluza|atún|jamón|picada/i.test(o)), 'Vegetariano: carnes y pescados no aparecen al agregar alimentos');
  await page.locator('section nav button', { hasText: 'Alumno' }).click();
  await page.locator('[data-allergy="veg"]').first().click();
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  // Protocolo Keto: los selectores dejan de ofrecer cereales, tubérculos y frutas dulces; se vuelve a Estándar.
  await page.locator('section nav button', { hasText: 'Alumno' }).click();
  await page.locator('[data-protocol-opt="keto"]').first().click();
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  await page.waitForTimeout(150);
  const ketoOpts = await page.locator('select:has(option:text-matches("Agregar alimento"))').first().locator('option').allInnerTexts();
  check(ketoOpts.length > 5 && !ketoOpts.some((o) => /arroz|banana|papa|pan integral|avena/i.test(o)), 'Keto: arroz, papa, pan, avena y banana no aparecen al agregar alimentos');
  await page.locator('section nav button', { hasText: 'Alumno' }).click();
  await page.locator('[data-protocol-opt="std"]').first().click();
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  // Modo Parejas: Persona B con el mismo menú y sus gramos, lado a lado, y lista de compras combinada.
  await page.locator('[data-couple-create]').click();
  await page.waitForTimeout(300);
  const ctable = page.locator('[data-couple-table]');
  check(await ctable.isVisible() && (await ctable.locator('tbody tr').count()) > 0, 'Modo Parejas: menú compartido con las porciones de los dos lado a lado');
  const heads = await ctable.locator('thead th').allInnerTexts();
  check(heads.some((h) => /^ÉL/.test(h)) && heads.some((h) => /^ELLA/.test(h)), `Modo Parejas: columnas Él / Ella (${heads.slice(1).join(' · ')})`);
  const firstRow = await ctable.locator('tbody tr').first().locator('td').allInnerTexts();
  check(firstRow[1] !== firstRow[2], 'Modo Parejas: cada uno con sus gramos');
  await page.locator('[data-couple-shop]').click();
  check((await page.locator('[data-couple-shoplist] tr').count()) > 3, 'Modo Parejas: lista de compras combinada (A + B)');
  // Recálculo automático de la Persona B al cambiar su peso (sin «recalcular mis gramos»).
  const bBefore = (await ctable.locator('tbody tr td:nth-child(3)').allInnerTexts()).join('|');
  await page.getByRole('button', { name: /^Abrir a Pareja/ }).click();
  await page.locator('section nav button', { hasText: 'Alumno' }).click();
  const peso = page.getByLabel('Peso', { exact: true }).first();
  await peso.fill('82');
  await peso.press('Tab');
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  await page.waitForTimeout(900);
  const bAfter = (await page.locator('[data-couple-table] tbody tr td:nth-child(3)').allInnerTexts()).join('|');
  check(bAfter !== bBefore && (await page.locator('[data-couple-stale]').count()) === 0, 'Modo Parejas: la Persona B recalcula sus gramos sola al cambiar su peso');

  // Recetario Coach JP: plato aplicado a una comida y lista de compras que se recalcula sola.
  await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).click();
  await page.locator('[data-shop-toggle]').click();
  const shopBefore = await page.locator('[data-shop-list]').innerText();
  check(/VERDULERÍA|CARNICERÍA|ALMACÉN/.test(shopBefore), 'Lista de compras del Builder agrupada por rubro');
  await page.locator('[data-catalog-toggle]').click();
  const counts = await page.locator('[data-catalog-cat]').allInnerTexts();
  check(/Desayuno \((1[3-9]|[2-9]\d)\)/.test(counts.join(' ')) && /Plato principal \((1[89]|[2-9]\d)\)/.test(counts.join(' ')) && /Merienda \(1[2-9]\)/.test(counts.join(' ')) && /Colación \(1[2-9]\)/.test(counts.join(' ')), `Recetario: 13+ desayunos, 18+ principales, 12+ meriendas y 12+ colaciones (${counts.join(' · ')})`);
  await page.locator('[data-catalog-cat="plato_principal"]').click();
  const wok = page.locator('[data-catalog-dish="pp-wok-pollo-fideos-arroz"]');
  await wok.locator('summary').click();
  check(/\d+ g (pechuga de )?pollo/.test(await wok.locator('[data-catalog-preview]').innerText()), 'Recetario: vista previa con los gramos escalados para esa comida');
  await wok.locator('[data-catalog-replace]').click();
  await page.waitForTimeout(200);
  check((await page.getByText(/Wok de pollo con fideos de arroz/).count()) > 0, 'Recetario: el plato queda como opción 1 de la comida');
  const shopAfter = await page.locator('[data-shop-list]').innerText();
  check(shopAfter !== shopBefore && /Fideos de arroz/.test(shopAfter), 'Lista de compras: se recalcula sola al cambiar el plato');

  // Banco Global: explorador, filtros, ficha técnica y asignación auto-escalada con vista previa.
  await page.locator('section nav button', { hasText: 'Banco Global' }).click();
  const bank = page.locator('[data-global-bank]');
  check(await bank.isVisible(), 'Banco Global: pestaña con el explorador');
  const nDishes = await page.locator('[data-bank-item]').count();
  check(nDishes >= 50, `Banco Global: platos armados del Recetario y propios (${nDishes})`);
  await page.locator('[data-bank-view="foods"]').click();
  const nFoods = await page.locator('[data-bank-item]').count();
  const cats = await page.locator('[data-bank-group]').allInnerTexts();
  check(['Carnes y aves', 'Pescados y mariscos', 'Huevos y lácteos', 'Cereales y tubérculos', 'Legumbres', 'Verduras y hortalizas', 'Frutas', 'Grasas saludables y frutos secos', 'Condimentos / extras / infusiones'].every((c) => cats.includes(c)), `Banco Global: categorías reales (${cats.join(' · ')})`);
  await page.locator('[data-bank-group="carnes"]').click();
  const nProt = await page.locator('[data-bank-item]').count();
  check(nFoods > 40 && nProt > 3 && nProt < nFoods, `Banco Global: alimentos base filtrados por categoría (${nFoods} → ${nProt} carnes y aves)`);
  await page.locator('[data-bank-restr="veg"]').click();
  const vegNames = await page.locator('[data-bank-item]').allInnerTexts();
  check(!vegNames.some((t) => /pollo|cuadril|merluza|atún|carne/i.test(t)), 'Banco Global: el filtro Vegetariano oculta carnes y pescados');
  await page.locator('[data-bank-restr="veg"]').click();
  await page.locator('[data-bank-group="all"]').click();
  await page.locator('[data-bank-search]').fill('berenjena');
  check((await page.locator('[data-bank-item]').count()) >= 1, 'Banco Global: buscador en tiempo real (berenjena)');
  await page.locator('[data-bank-item]').first().click();
  check(/Por 100 g/.test(await page.locator('[data-bank-macros]').innerText()), 'Banco Global: ficha con macros por 100 g y por porción');
  await page.locator('[data-bank-view="dishes"]').click();
  await page.locator('[data-bank-search]').fill('wok');
  await page.locator('[data-bank-item]').first().click();
  check((await page.locator('[data-bank-ingredients] li').count()) > 2 && (await page.locator('[data-bank-steps] li').count()) > 0, 'Banco Global: ficha del plato con ingredientes y pasos');
  await page.locator('[data-bank-search]').fill('tarta casera de pollo');
  await page.locator('[data-bank-item]').first().click();
  const yb = page.locator('[data-bank-yield="batch"]');
  check((await yb.count()) === 1 && /Rinde 1 tarta mediana .*= 4 porciones · Los gramos de tu plan corresponden a 1 porción \(¼ de tarta\)/.test(await yb.innerText()) && /Conservación/.test(await yb.innerText()), 'Banco Global: tarta con rendimiento (4 porciones, ¼ por porción) y conservación');
  check((await page.locator('[data-bank-whole]').count()) === 1 && /^Rinde .* porciones\. /.test(await page.locator('[data-bank-steps] li').first().innerText()), 'Banco Global: cantidades de la receta entera y primer paso con el rendimiento');
  await page.locator('[data-bank-search]').fill('wok');
  await page.locator('[data-bank-item]').first().click();
  await page.locator('[data-bank-mode]').selectOption('alt');
  const prev = await page.locator('[data-bank-preview]').innerText();
  check(/\d+ g /.test(prev) && /kcal/.test(prev), 'Banco Global: vista previa con gramos ajustados antes de confirmar');
  await page.locator('[data-bank-confirm]').click();
  check(/Asignado/.test(await page.locator('[data-bank-msg]').innerText()), 'Banco Global: asignado a la comida como alternativa');
  // 3 variantes por comida: Opción 1 + 2 equivalentes auto-escaladas.
  await page.locator('[data-bank-mode]').selectOption('triple');
  check((await page.locator('[data-bank-triple] li').count()) === 3, 'Banco Global: vista previa de 3 variantes equivalentes por comida');
  await page.locator('[data-bank-confirm]').click();
  check(/2 variantes equivalentes/.test(await page.locator('[data-bank-msg]').innerText()), 'Banco Global: asignada la Opción 1 + 2 variantes');
  // Armar plan completo desde el Banco Global.
  await page.locator('[data-bank-build-start]').click();
  await page.locator('[data-bank-build-confirm]').click();
  await page.waitForTimeout(300);
  check((await page.locator('[data-sticky-summary]').count()) > 0 || (await page.locator('section nav button', { hasText: /^\s*Comidas$/ }).count()) > 0, 'Banco Global: plan completo armado (pasa a Comidas)');

  // Nuevos platos: carga rápida (nombre + ingredientes + tip), categoría propia y guardado.
  await page.locator('section nav button', { hasText: 'Alimentos y marcas' }).click();
  await page.getByRole('button', { name: /AGREGAR NUEVO PLATO/ }).first().click();
  const ql = page.locator('[data-quick-load]');
  check(await ql.isVisible(), 'Nuevo plato: bloque de carga rápida con IA');
  await ql.locator('[data-ql-name]').fill('Tortilla de berenjena y zucchini');
  await ql.locator('[data-ql-ingredients]').fill('3 huevos, 1 zucchini, media berenjena, 1 cda aceite de oliva, condimentos');
  await ql.locator('[data-ql-tip]').fill('Hacerla vuelta y vuelta en sartén antiadherente tapada para que quede jugosa');
  await ql.getByRole('button', { name: /Ordenar y calcular/ }).click();
  const qr = page.locator('[data-ql-result]');
  await qr.waitFor({ timeout: 5000 });
  const qrText = await qr.innerText();
  check((await qr.locator('tr').count()) === 4 && /180 g/.test(qrText) && /3 huevos/.test(qrText), `Carga rápida: ingredientes mapeados con gramos y medida casera${process.env.DBG ? qrText : ''}`);
  check(/\d+ kcal · P [\d.]+ g · C [\d.]+ g · G [\d.]+ g/.test(await qr.locator('[data-ql-macros]').innerText()), 'Carga rápida: calorías, proteínas, carbos y grasas');
  check(/Huevo/.test(await qr.locator('[data-ql-allergens]').innerText()), 'Carga rápida: alérgenos etiquetados (huevo)');
  check((await qr.locator('[data-ql-steps] li').count()) >= 4 && /Tip: Hacerla vuelta y vuelta/.test(await qr.locator('[data-ql-steps]').innerText()), 'Carga rápida: pasos ordenados con el tip del coach');
  check(/Tortillas \/ Tartas \/ Revueltos/.test(await qr.innerText()), 'Carga rápida: categoría sugerida (Tortillas / Tartas / Revueltos)');
  check((await qr.locator('[data-ql-yield="individual"]').count()) === 1, 'Carga rápida: rendimiento inferido (tortilla de 3 huevos = porción individual)');
  await qr.locator('[data-ql-use]').click();
  check((await page.locator('[data-dish-yield-type]').count()) === 1 && (await page.locator('[data-dish-storage]').count()) === 1, 'Nuevo plato: campos de Rendimiento y Conservación / Freezer');
  check((await page.locator('[data-cat="ensalada"]').count()) === 1 && (await page.locator('[data-cat="licuado"]').count()) === 1, 'Nuevos platos: categorías ampliadas (ensaladas, licuados…)');
  await page.locator('[data-new-cat]').click();
  await page.locator('[data-new-cat-input]').fill('Tortillas de verduras');
  await page.locator('[data-new-cat-save]').click();
  check((await page.locator('[data-cat-custom="Tortillas de verduras"]').count()) === 1, 'Nuevos platos: «+ Nueva categoría» crea y selecciona una categoría propia');
  check((await page.locator('[data-dish-steps]').inputValue()).split('\n').length >= 4, 'Nuevo plato: los pasos quedan listos para editar');
  await page.getByRole('button', { name: /Guardar \]/ }).click();
  await page.waitForTimeout(200);
  const saved = page.locator('div.py-2\\.5', { hasText: 'Tortilla de Berenjena y Zucchini' }).or(page.locator('div.py-2\\.5', { hasText: 'Tortilla de berenjena y zucchini' }));
  check((await saved.count()) > 0 && /Tortillas de verduras/.test(await saved.first().innerText()), 'Nuevo plato: guardado con su categoría propia');
  check((await page.getByRole('button', { name: /★ Tortillas de verduras/ }).count()) > 0, 'Alimentos y marcas: filtro por la categoría propia');

  check((await page.locator('[data-builder-cobrand] [data-nc-logo]').count()) === 1, 'Builder: cabecera NutrirCe & Coach JP');
  check(await page.locator('[data-builder-cobrand]').evaluate((el) => { const nc = el.querySelector('[data-nc-logo]'), cj = el.querySelector('[data-cobrand-coach]'); return !!nc && !!cj && nc.getBoundingClientRect().left < cj.getBoundingClientRect().left; }), 'Builder: NutrirCe a la izquierda y Coach JP a la derecha');
  // Firma profesional (nutricionista) editable en Publicar, cargada por defecto.
  await page.locator('aside nav button', { hasText: 'Publicar' }).click();
  check((await page.locator('[data-nutri-name]').inputValue()) === 'Lic. María Cecilia Rollán', 'Firma profesional: Lic. María Cecilia Rollán cargada por defecto en el Builder');
  check(errs.length === 0, `Builder sin errores de JS ${errs.length ? JSON.stringify(errs) : ''}`);
  await ctx.close();

  // ---------- Builder en el celular (360 y 390 px) ----------
  for (const w of [360, 390]) {
    const mctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const mp = await mctx.newPage();
    const merrs = [];
    mp.on('pageerror', (e) => merrs.push(e.message));
    await mp.goto(ROOT, { waitUntil: 'load' });
    await mp.waitForTimeout(600);
    const tabsM = await mp.locator('[data-mobile-tab]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-mobile-tab'), h: e.getBoundingClientRect().height, r: e.getBoundingClientRect().right })));
    check(tabsM.length >= 8 && tabsM.every((t) => t.h >= 44 && t.r <= w + 1), `Builder ${w} px: barra de pestañas fija abajo, 8 secciones a la vista y áreas táctiles ≥ 44 px`);
    check(await mp.locator('[data-mobile-macros]').isVisible(), `Builder ${w} px: resumen compacto de calorías y macros fijo arriba`);
    await mp.locator('[data-mobile-macros-toggle]').click();
    check(await mp.locator('[data-mobile-macros-detail]').isVisible(), `Builder ${w} px: el resumen se despliega con entreno y descanso`);
    const overs = [];
    for (const t of tabsM.map((x) => x.id).filter((id) => id !== 'publish')) {
      await mp.locator(`[data-mobile-tab="${t}"]`).click();
      await mp.waitForTimeout(250);
      const o = await mp.evaluate(() => {
        const page = document.documentElement.scrollWidth - window.innerWidth;
        const inner = [...document.querySelectorAll('*')].filter((e) => { const ox = getComputedStyle(e).overflowX; return (ox === 'auto' || ox === 'scroll') && e.scrollWidth > e.clientWidth + 2 && !e.closest('[data-mobile-tabs]') && !e.closest('[data-header-actions]') && e.getBoundingClientRect().width > 0; }).length;
        return page > 0 || inner > 0 ? `${page}/${inner}` : '';
      });
      if (o) overs.push(`${t} (${o})`);
    }
    check(!overs.length, `Builder ${w} px: cero scroll horizontal en todas las pestañas${overs.length ? ' · ' + overs.join(', ') : ''}`);
    // Banco Global: la ficha y la asignación se abren como panel desde abajo.
    await mp.locator('[data-mobile-tab="global"]').click();
    await mp.locator('[data-bank-item]').first().click();
    const sheetBox = await mp.locator('[data-bank-sheet]').evaluate((el) => ({ pos: getComputedStyle(el).position, bottom: Math.round(el.getBoundingClientRect().bottom), h: window.innerHeight, right: el.getBoundingClientRect().right }));
    check(sheetBox.pos === 'fixed' && sheetBox.bottom <= sheetBox.h + 1 && sheetBox.right <= w + 1, `Builder ${w} px: ficha del Banco Global como panel inferior (bottom sheet)`);
    const confirmBox = await mp.locator('[data-bank-confirm]').evaluate((el) => { el.scrollIntoView(); const r = el.getBoundingClientRect(); return r.right <= window.innerWidth && r.height >= 40; });
    check(confirmBox, `Builder ${w} px: botón Confirmar asignación visible y táctil`);
    await mp.locator('[data-bank-sheet-close]').click();
    check((await mp.locator('[data-bank-sheet-close]').count()) === 0, `Builder ${w} px: la ficha se cierra`);
    check(merrs.length === 0, `Builder ${w} px sin errores de JS ${merrs.length ? JSON.stringify(merrs) : ''}`);
    await mctx.close();
  }

  // ---------- PWA del atleta ----------
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pwa = await pctx.newPage();
  const perrs = [];
  pwa.on('pageerror', (e) => perrs.push(e.message));
  await pwa.goto('file://' + html, { waitUntil: 'load' });
  await pwa.waitForTimeout(500);
  check(await pwa.getByText('Entendido, arrancar').isVisible(), 'PWA: bienvenida de 3 pasos la primera vez');
  await pwa.getByText('Entendido, arrancar').click();
  check((await pwa.locator('.welcome').count()) === 0, 'PWA: la bienvenida no vuelve a aparecer');
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
  const shopOpt1 = await pwa.locator('.sheet').innerText();
  await pwa.locator('.sheet .xclose').click();
  const optBtn = pwa.locator('[data-opt$="|2"]').first();
  if (await optBtn.count()) {
    await optBtn.evaluate((el) => el.click());
    await pwa.waitForTimeout(150);
    await pwa.locator('.toolgrid [data-panel="shop"]').click();
    await pwa.waitForTimeout(150);
    const shopOpt2 = await pwa.locator('.sheet').innerText();
    check(shopOpt2 !== shopOpt1, 'PWA: la lista de compras usa el plato elegido en cada comida');
  } else {
    await pwa.locator('.toolgrid [data-panel="shop"]').click();
    await pwa.waitForTimeout(150);
  }
  const shopTxt = await pwa.locator('.sheet').innerText();
  check(/Tomate/.test(shopTxt) && /≈ \d+ tomates?/.test(shopTxt), 'PWA: verdulería detallada (tomates con unidades)');
  check(/marca a elección/i.test(shopTxt), 'PWA: «marca a elección» en genéricos');
  if (await pwa.locator('.salads').count()) {
    await pwa.locator('.salads summary').click();
    check((await pwa.locator('.salad').count()) >= 5, 'PWA: ensaladas y salteados con aliño medido');
  }
  await pwa.locator('.sheet .xclose').click();
  await pwa.waitForTimeout(150);
  check(/El mate, café, té y las gaseosas no suman/.test(await pwa.locator('.hy-note').innerText()), 'PWA: hidratación sólo agua (aviso visible)');
  check(readFileSync(html, 'utf8').includes('boot-skel'), 'PWA: esqueleto de carga embebido (sin pantalla en blanco)');
  // Mi heladera: lo que falta hoy, sólo ingredientes, faltantes con botón y registro en el día.
  await pwa.locator('.toolgrid [data-panel="fridge"]').click();
  await pwa.waitForTimeout(150);
  check(await pwa.locator('.fr-pend').isVisible(), 'Heladera: muestra lo que falta hoy');
  const frOpts = await pwa.locator('#fr-0 option').allInnerTexts();
  check(frOpts.length > 20 && !frOpts.some((o) => /milanesa|chinchul|empanada|guiso|arroz con pollo|parrilla/i.test(o)), 'Heladera: sólo ingredientes crudos o básicos');
  const cena = await pwa.locator('#fr-meal option', { hasText: 'Cena' }).first().getAttribute('value');
  await pwa.selectOption('#fr-meal', cena);
  await pwa.waitForTimeout(100);
  await pwa.selectOption('#fr-0', 'arroz');
  await pwa.waitForTimeout(150);
  if (await pwa.locator('[data-frauto="off"]').count()) await pwa.locator('[data-frauto="off"]').click();
  await pwa.waitForTimeout(150);
  const warn = pwa.locator('.fr-warn .fr-add').first();
  check(await warn.isVisible(), 'Heladera: aviso de faltante con sugerencia en gramos o unidades');
  if (process.env.SHOTS) await pwa.locator('.sheet').screenshot({ path: process.env.SHOTS + '/fridge.png' });
  await warn.click();
  await pwa.waitForTimeout(150);
  check((await pwa.locator('.fr-ings select').count()) >= 3 && (await pwa.locator('.scan-it').count()) >= 2, 'Heladera: la sugerencia se suma y recalcula');
  const eggG = await pwa.locator('.scan-it .g').allInnerTexts();
  check(eggG.every((g) => parseInt(g) % 5 === 0), 'Heladera: gramos redondeados a porciones reales');
  await pwa.locator('[data-fridgeuse="done"]').click();
  await pwa.waitForTimeout(150);
  check((await pwa.locator('.sheet.open').count()) === 0, 'Heladera: comida registrada en el día');
  // Comer afuera: catálogo argentino y trueques de alcohol.
  await pwa.locator('.toolgrid [data-panel="out"]').click();
  await pwa.waitForTimeout(150);
  await pwa.locator('[data-scene]').first().click();
  await pwa.waitForTimeout(100);
  await pwa.locator('.out-cat summary').click();
  await pwa.locator('[data-outfood="emp-carne-h"]').click();
  await pwa.locator('[data-outfood="emp-carne-h"]').click();
  await pwa.locator('[data-drink="vino"]').click();
  await pwa.locator('[data-drink="vino"]').click();
  check((await pwa.locator('.oc-row.on em').innerText()) === '2', 'Comer afuera: catálogo argentino con cantidades');
  check(/empanadas de carne al horno/.test(await pwa.locator('.out-swap').innerText()), 'Comer afuera: trueques de alcohol en comida real');
  check(/Se registra como 786 kcal/.test(await pwa.locator('.out-sum').innerText()), 'Comer afuera: suma 2 empanadas + 2 copas (786 kcal)');
  if (process.env.SHOTS) await pwa.locator('.sheet').screenshot({ path: process.env.SHOTS + '/out.png' });
  await pwa.locator('[data-imputar]').click();
  await pwa.waitForTimeout(150);
  check((await pwa.locator('.sheet.open').count()) === 0, 'Comer afuera: registrada en el día');
  // Firma profesional en la app: cabecera discreta, crédito en el pie y sin desbordes en 360-390 px.
  await pwa.locator('[data-mode="on"]').first().click().catch(() => {});
  const cob = pwa.locator('[data-cobrand]');
  const ncOk = await cob.locator('img.nc-img').evaluate((i) => i.complete && i.naturalWidth > 0 && i.src.startsWith('data:image/png'));
  check(/COACH JP/.test(await cob.innerText()) && ncOk, 'App: cabecera 50/50 [logo oficial NutrirCe en PNG transparente] & [Coach JP]');
  check(await cob.evaluate((el) => { const cbs = el.querySelectorAll('.cb'); return cbs.length === 2 && !cbs[0].querySelector('.cj-img') && !!cbs[1].querySelector('.cj-img') && cbs[0].getBoundingClientRect().left < cbs[1].getBoundingClientRect().left; }), 'App: cabecera [NutrirCe] & [Coach JP] (NutrirCe a la izquierda)');
  const jpColors = await cob.evaluate((el) => {
    const b = el.querySelector('.brand');
    const jp = b && b.querySelector('.jp');
    return b && jp ? [getComputedStyle(b).color, getComputedStyle(jp).color] : null;
  });
  check(!!jpColors && jpColors[0] === 'rgb(255, 255, 255)' && jpColors[1] === 'rgb(249, 115, 22)', `App: logo «COACH» en blanco y «JP» en naranja de la marca (${jpColors})`);
  const [hA, hB] = await cob.locator('.cb').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  check(Math.abs(hA - hB) <= 12, `App: los dos sellos con el mismo peso visual (alto ${hA} / ${hB} px)`);
  check(/Entrenamiento & Nutrición · Lic\. María Cecilia Rollán/.test(await pwa.locator('[data-nutri-line]').innerText()), 'App: bajada «Entrenamiento & Nutrición · Lic. María Cecilia Rollán»');
  check(/NutrirCe & Coach JP High Performance System — Lic\. María Cecilia Rollán \(Nutrición Deportiva y Recomposición Corporal\)/.test(await pwa.locator('[data-nutri-credit]').innerText()), 'App: pie con las dos marcas al mismo nivel (NutrirCe & Coach JP) y la Lic. Rollán');
  check((await pwa.locator('[data-yield]').count()) > 0, 'App: cada plato con su etiqueta de rendimiento');
  // App: reemplazo cruzado (carne → huevos / claras / atún / tofu / whey · arroz → papa, pan, legumbres, masa de tarta).
  {
    const btns = pwa.locator('[data-swap]');
    let crossOk = false;
    for (let i = 0; i < Math.min(await btns.count(), 14) && !crossOk; i++) {
      await btns.nth(i).click();
      await pwa.waitForTimeout(120);
      if ((await pwa.locator('[data-cross-head]').count()) && (await pwa.locator('[data-cross-pick]').count())) {
        const label = (await pwa.locator('[data-cross-pick] .fd').first().innerText()).split('\n')[0];
        await pwa.locator('[data-cross-pick]').first().click();
        await pwa.waitForTimeout(150);
        crossOk = (await pwa.locator('#sheet.open, .sheet.open').count()) === 0;
        check(crossOk, `App: reemplazo cruzado aplicado («${label}»)`);
      } else await pwa.locator('[data-close]').first().click().catch(() => {});
    }
    check(crossOk, 'App: el cambio de alimento ofrece otras familias (reemplazo cruzado)');
    check(!/Antes de entrenar/.test(await pwa.locator('body').innerText()), 'App: sin «Antes de entrenar» (la comida se llama Merienda)');
  }
  for (const w of [360, 375, 390]) {
    await pwa.setViewportSize({ width: w, height: 780 });
    await pwa.waitForTimeout(80);
    const over = await pwa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const lineFits = await pwa.evaluate(() => ['[data-nutri-line]', '[data-cobrand]', '.guide-btn'].every((q) => { const el = document.querySelector(q); return el && el.getBoundingClientRect().right <= window.innerWidth; }));
    check(over <= 0 && lineFits, `App a ${w} px: sin scroll horizontal y la firma entra en pantalla`);
  }
  if (process.env.SHOTS) { await pwa.setViewportSize({ width: 360, height: 780 }); await pwa.screenshot({ path: process.env.SHOTS + '/nutri-top.png' }); await pwa.locator('[data-nutri-credit]').scrollIntoViewIfNeeded(); await pwa.screenshot({ path: process.env.SHOTS + '/nutri-foot.png' }); }
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
