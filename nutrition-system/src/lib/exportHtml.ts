import runtime from '@/pwa/athleteRuntime';
import cloudBoot from '@/pwa/cloudBoot';
import styles from '@/pwa/athleteStyles';
import { computeTelemetry, isMpsMeal, LEUCINE_THRESHOLD, PHASE_LABEL, trainingWeekdays } from './bioenergetics';
import { BRAND, nutritionSvg, shieldSvg } from './brand';
import { CITES } from './evidence';
import { FOOD_BY_ID, FOODS, GROUP_ANCHOR, GROUP_LABEL, type SwapGroup } from './foods';
import { SCAN_PROMPT } from './scanner';
import { byTime, consolidateMeal } from './schedule';
import { autoTechnique, autoTitle, fixTechnique, optionSteps, prepMinutes } from './menuOptions';
import { fitsSlot, foodSlots } from './mealSlots';
import { friendlyMealName, modernizeName } from './foodBrandDb';
import { BRAND_TIERS, TIER_LABEL, TIER_OF_BUDGET } from './brandTiers';
import { HAND, HOUSE, SHOP_PACKS } from './household';
import { sanitizeAnamnesis } from './anamnesisPro';
import type { AthletePlan, DayMode, FoodItem, Meal } from './types';

export const DISCIPLINE_LABEL = { bodybuilding: 'SPORTS & BODYBUILDING', hybrid: 'CROSSFIT & HYROX' } as const;

/** Secciones de la lista de compras, en el orden del recorrido: verdulería → carnicería → almacén. */
const SHOP_CATEGORY: Record<SwapGroup, string> = {
  fruit: 'Verdulería',
  veg: 'Verdulería',
  'lean-protein': 'Carnicería / Pescadería',
  eggs: 'Almacén · Lácteos y huevos',
  'dairy-protein': 'Almacén · Lácteos y huevos',
  starch: 'Almacén',
  cereal: 'Almacén',
  'sport-carb': 'Almacén',
  'protein-snack': 'Almacén',
  fat: 'Almacén',
  whey: 'Suplementos',
  plato: 'Platos preparados',
};
const SHOP_ORDER = ['Verdulería', 'Carnicería / Pescadería', 'Almacén', 'Almacén · Lácteos y huevos', 'Platos preparados', 'Suplementos', 'Otros'];


/**
 * Reglas de compra por alimento (pesos del plan en cocido → peso de compra):
 *  · carnes ×1,3 (crudo) · arroz / fideos / legumbres ÷2,5 (seco, en paquetes de 500 g);
 *  · variedades idénticas unificadas (avena) · mínimos comerciales (frutos secos: bolsita de 100 g).
 */
const SHOP_RULES: Record<string, { name?: string; key?: string; factor?: number; state?: 'raw' | 'dry'; pack?: number; min?: number; minLabel?: string; section?: string; byUnit?: number; unitLabel?: string }> = {
  pollo: { name: 'Pechuga de pollo (cruda)', factor: 1.3, state: 'raw' },
  cuadril: { name: 'Cuadril magro (crudo)', factor: 1.3, state: 'raw' },
  lomo: { name: 'Lomo vacuno (crudo)', factor: 1.3, state: 'raw' },
  nalga: { name: 'Nalga / peceto (crudo)', factor: 1.3, state: 'raw' },
  picada: { name: 'Carne picada especial 5 % (cruda)', factor: 1.3, state: 'raw' },
  merluza: { name: 'Merluza (filet crudo)', factor: 1.3, state: 'raw' },
  cerdo: { name: 'Bondiola / carré magro de cerdo (crudo)', factor: 1.3, state: 'raw' },
  arroz: { name: 'Arroz blanco (paquete)', factor: 1 / 2.5, state: 'dry', pack: 500 },
  yamani: { name: 'Arroz yamaní (paquete)', factor: 1 / 2.5, state: 'dry', pack: 500 },
  fideos: { name: 'Fideos secos (paquete)', factor: 1 / 2.5, state: 'dry', pack: 500 },
  lentejas: { name: 'Lentejas secas (paquete)', factor: 1 / 2.5, state: 'dry', pack: 500 },
  papa: { section: 'Verdulería', name: 'Papa' },
  batata: { section: 'Verdulería', name: 'Batata' },
  isotonica: { name: 'Bebida isotónica (500 ml)', byUnit: 500, unitLabel: 'botellas' },
  oliva: { name: 'Aceite de oliva extra virgen', min: 500, minLabel: '1 botella (500 ml)' },
  palta: { section: 'Verdulería' },
  avena: { key: 'avena', name: 'Avena (entera o instantánea)' },
  'avena-instantanea': { key: 'avena', name: 'Avena (entera o instantánea)' },
  nueces: { name: 'Nueces / frutos secos', min: 100, minLabel: '1 bolsita (100 g)' },
};
const SHOP_ORDER_FALLBACK = 'Otros';

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'atleta'
  );
}

export interface ExportIcons {
  icon192: string;
  icon512: string;
  maskable512: string;
  apple180: string;
}

export function buildPayload(plan: AthletePlan, opts: { preview: boolean; mode: DayMode; icons?: ExportIcons }) {
  const t = computeTelemetry(plan);
  const pr = plan.profile;
  const per = plan.periodization;
  const slug = slugify(pr.name);
  const protocols: { tag: string; title: string; body: string }[] = [];
  if (per.refeed.enabled && t.refeedGrams) {
    protocols.push({
      tag: 'PROTOCOLO · REFEED ' + per.refeed.hours + 'H',
      title: `Refeed programado · ${Math.round(t.refeedKcal!)} kcal/día`,
      body: `Durante ${per.refeed.hours} h: carbos ${t.refeedGrams.c} g (${per.refeed.carbsGkg} g/kg), proteína ${t.refeedGrams.p} g, grasas ${t.refeedGrams.f} g. Recarga de glucógeno y leptina; volvé a la matriz ON/OFF al terminar.`,
    });
  }
  if (per.dietBreak.enabled) {
    protocols.push({
      tag: 'PROTOCOLO · DIET BREAK',
      title: `Diet break · ${per.dietBreak.days} días en mantenimiento`,
      body: `Subí la ingesta a ~${Math.round(t.tdeeWeekly)} kcal/día (mantenimiento) con proteína constante. Atenúa la termogénesis adaptativa (MATADOR).`,
    });
  }
  const usedGroups: Record<string, number> = {};
  FOODS.forEach((f) => (usedGroups[f.group] = (usedGroups[f.group] ?? 0) + 1));
  const manifest = {
    name: `Coach JP Nutrition · ${pr.name}`,
    short_name: pr.name.split(' ')[0].slice(0, 12) || 'JP Nutrition',
    description: 'Plan nutricional personalizado · Coach JP Nutrition · High Performance System',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BRAND.colors.carbon,
    theme_color: BRAND.colors.carbon,
    lang: 'es-AR',
  };
  const d = new Date(plan.updatedAt);
  return {
    slug,
    preview: opts.preview,
    initialMode: opts.mode,
    handle: BRAND.handle,
    mark: nutritionSvg(40, 'hd'),
    markSm: nutritionSvg(34, 'sh'),
    shieldSm: shieldSvg(26),
    athlete: {
      name: pr.name,
      weightKg: pr.weightKg,
      phase: PHASE_LABEL[pr.phase],
      discipline: DISCIPLINE_LABEL[pr.discipline],
    },
    coachNote: plan.coachNote,
    targets: {
      on: { kcal: Math.round(t.kcalOn), ...t.gramsOn },
      off: { kcal: Math.round(t.kcalOff), ...t.gramsOff },
    },
    threshold: LEUCINE_THRESHOLD,
    // Ingredientes repetidos fusionados y orden cronológico estricto antes de exportar.
    // Opciones culinarias: título, técnica y pasos de la Opción 1 (automáticos si el coach no los cargó) y opciones 2 a 5.
    meals: [...plan.meals].sort(byTime).map((m) => {
      const c = modernizeMeal(consolidateMeal(m));
      return {
        ...c,
        mps: isMpsMeal(m),
        title: c.title || autoTitle(c.items),
        technique: fixTechnique(c.technique, c.items, c.title) || autoTechnique(c.items),
        steps: optionSteps(c),
        prepMin: prepMinutes(c.items),
        // Opciones 2 a 5 con nombre, técnica y preparación paso a paso (automáticos si el coach no los cargó).
        // Las alternativas fuera de la franja del día (planes viejos) no llegan al atleta.
        alts: (c.alts ?? [])
          .filter((a) => a.items.length && a.items.every((i) => !i.foodId || fitsSlot(FOOD_BY_ID[i.foodId], m.role)))
          .map((a) => ({ ...a, title: a.title || autoTitle(a.items), technique: fixTechnique(a.technique, a.items, a.title) || autoTechnique(a.items), steps: optionSteps(a), prepMin: prepMinutes(a.items) })),
      };
    }),
    // Marca sugerida por ingrediente según el presupuesto del atleta (Nivel 1 / 2 / 3).
    brands: Object.fromEntries(
      [...new Set(plan.meals.flatMap((m) => [...m.items, ...(m.alts ?? []).flatMap((a) => a.items)]).map((i) => i.foodId).filter((id): id is string => !!id && !!BRAND_TIERS[id]))].map((id) => [id, BRAND_TIERS[id]]),
    ),
    brandTier: TIER_OF_BUDGET[sanitizeAnamnesis(plan.anamnesis).budget],
    // Medidas caseras y porciones sin balanza (lenguaje cotidiano).
    house: HOUSE,
    hand: HAND,
    // Cada alimento viaja con sus franjas del día (filtro estricto de los swaps en la PWA).
    foods: Object.fromEntries(FOODS.map((f) => [f.id, { ...f, slots: foodSlots(f) }])),
    anchors: GROUP_ANCHOR,
    groupLabels: GROUP_LABEL,
    swapGroups: usedGroups,
    supplements: plan.supplements.filter((s) => s.enabled),
    protocols,
    citations: [CITES.morton, CITES.aragon, CITES.leucine, CITES.carbs, CITES.ea],
    generatedLabel: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hydration: plan.hydration,
    // Franja exacta del entreno (inicio HH:MM + minutos numéricos): el timeline no puede quedar corrido ni infinito.
    training: {
      time: /^\d{1,2}:\d{2}$/.test(pr.trainingTime ?? '') ? pr.trainingTime.padStart(5, '0') : '18:00',
      minutes: Math.min(300, Math.max(15, Math.round(Number(pr.sessionMinutes) || 60))),
    },
    trainingDays: pr.trainingDaysPerWeek,
    trainingWeekdays: trainingWeekdays(pr),
    categories: SHOP_CATEGORY,
    categoryOrder: SHOP_ORDER,
    shopRules: SHOP_RULES,
    shopPacks: SHOP_PACKS,
    tierLabels: TIER_LABEL,
    shopFallback: SHOP_ORDER_FALLBACK,
    manifest: { ...manifest, icons: [] },
    // Prompt del análisis de foto en el celular del atleta (la API key la carga el atleta en su dispositivo; nunca viaja en el plan).
    scanPrompt: `${SCAN_PROMPT}\nAgregá a cada item "leucine" (g estimados de leucina para esa porción).`,
    labelPrompt: LABEL_PROMPT,
  };
}

/** Nombres profesionales: platos renombrados y comidas con nombre de versiones anteriores. */
function modernizeMeal(m: Meal): Meal {
  const fixItems = (items: FoodItem[]) => items.map((i) => ({ ...i, food: i.foodId && FOOD_BY_ID[i.foodId] ? FOOD_BY_ID[i.foodId].name : modernizeName(i.food) }));
  return {
    ...m,
    name: friendlyMealName(m.name),
    title: m.title && modernizeName(m.title),
    items: fixItems(m.items),
    alts: m.alts?.map((a) => ({ ...a, title: modernizeName(a.title), items: fixItems(a.items), steps: a.steps?.map(modernizeName) })),
  };
}

const safeJson = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');

/** Lectura de la tabla de información nutricional de un envase (escáner dual de la PWA). */
const LABEL_PROMPT = `Actuás como lector de etiquetas de Coach JP. Recibís la foto de la TABLA DE INFORMACIÓN NUTRICIONAL de un producto envasado
(formato argentino / Mercosur: "Porción X g", "Valor energético", "Carbohidratos", "Proteínas", "Grasas totales", "Sodio").
Leé los valores tal como figuran. Si la tabla trae columna por 100 g, usala; si sólo trae por porción, completá perServing.
Devolvé OBLIGATORIAMENTE sólo un JSON válido, sin texto extra:
{ "productName": string, "brand": string, "servingG": number,
  "per100": { "kcal": number, "p": number, "c": number, "f": number, "sodiumMg": number },
  "perServing": { "kcal": number, "p": number, "c": number, "f": number, "sodiumMg": number } }
Usá null en lo que no se lea con claridad. Kcal en kcal (no kJ).
Si la foto NO es una tabla nutricional sino un plato de comida servido (sin texto de etiqueta), devolvé sólo: { "isLabel": false, "looksLike": "plate" }.`;

// Chakra Petch: tipografía de la Storycard 9:16 (todo el texto de la placa).
const FONTS = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

export function buildAthleteHtml(plan: AthletePlan, opts: { preview?: boolean; mode?: DayMode; icons?: ExportIcons; migrateTo?: string } = {}) {
  // migrateTo: link fijo del atleta (nube) → el archivo muestra el botón para pasar el historial a ese link.
  const payload = { ...buildPayload(plan, { preview: !!opts.preview, mode: opts.mode ?? 'on', icons: opts.icons }), migrateTo: opts.migrateTo || undefined };
  const manifestIcons = opts.icons
    ? [
        { src: opts.icons.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: opts.icons.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: opts.icons.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : [];
  const manifestUri =
    'data:application/manifest+json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify({ ...payload.manifest, icons: manifestIcons }))));
  const title = `${plan.profile.name} · Coach JP`;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="Directiva nutricional personalizada · Coach JP High Performance System · ${BRAND.handle}">
<meta name="theme-color" content="${BRAND.colors.carbon}">
<meta name="color-scheme" content="dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${esc(payload.manifest.short_name)}">
<link rel="manifest" href="${manifestUri}">
${opts.icons ? `<link rel="icon" type="image/png" sizes="192x192" href="${opts.icons.icon192}">\n<link rel="apple-touch-icon" sizes="180x180" href="${opts.icons.apple180}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${styles}</style>
<script>
/* Guardián de arranque: cualquier error de script se muestra como tarjeta visible (nunca pantalla negra). */
(function () {
  var shown = false;
  window.__cjpFail = function (err) {
    var msg = (err && (err.message || err)) + '';
    try { parent !== window && parent.postMessage({ type: 'coachjp:error', message: msg }, '*'); } catch (e) {}
    if (shown) return;
    shown = true;
    var paint = function () {
      var app = document.getElementById('app') || document.body;
      app.innerHTML = '<section style="margin:24px 0;padding:18px;border:1px solid rgba(249,115,22,.45);border-radius:14px;background:#131B2A;color:#FFFFFF;font-family:system-ui,sans-serif">'
        + '<div style="font:600 11px ui-monospace,monospace;letter-spacing:.2em;color:#F97316">[ ERROR DE RENDER · PWA ]</div>'
        + '<p style="margin-top:8px;font-size:14px;line-height:1.45">La app no pudo cargarse. Recargá la página; si persiste, avisale a tu coach.</p>'
        + '<pre style="margin-top:10px;white-space:pre-wrap;font:11px ui-monospace,monospace;color:#94A3B8"></pre></section>';
      var pre = app.querySelector('pre');
      if (pre) pre.textContent = msg;
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', paint) : paint();
  };
  window.addEventListener('error', function (e) { window.__cjpFail(e.error || e.message); });
})();
</script>
</head>
<body>
<main id="app"></main>
<div class="dock"><button class="btn fire" id="install">[ Instalar app ]</button></div>
<div id="sheet-bg" class="sheet-bg"></div>
<div id="sheet" class="sheet"></div>
<div id="toast" class="toast"></div>
<input id="photo" type="file" accept="image/*" hidden>
<input id="story-photo" type="file" accept="image/*" hidden>
<script id="cjp-data" type="application/json">${safeJson(payload)}</script>
<script>${runtime}</script>
</body>
</html>
`;
}

/** Service Worker opcional (offline total). Se sube al lado del index.html. */
export function buildServiceWorker(slug: string) {
  return `// Coach JP · ${BRAND.handle} · Service Worker de la PWA del atleta
const CACHE = 'coachjp-${slug}-v' + ${JSON.stringify(Date.now().toString(36))};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Network-first: el atleta siempre ve la última directiva; sin señal, la caché.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
  } else if (/fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
`;
}

const BOOT_CSS = `.boot-card{margin:12vh auto 0;max-width:420px;padding:24px 20px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:#131B2A;text-align:center}
.boot-k{font-size:12px;font-weight:600;color:#FDBA74}.boot-card h2{margin-top:6px;font-size:22px;color:#fff}.boot-card p{margin-top:8px;font-size:14.5px;line-height:1.5;color:#94A3B8}
.boot-err{color:#FCA5A5}.boot-spin{width:34px;height:34px;margin:18px auto 0;border-radius:50%;border:3px solid rgba(56,189,248,.2);border-top-color:#38BDF8;animation:bspin .8s linear infinite}
@keyframes bspin{to{transform:rotate(360deg)}}.boot-btn,.boot-pin button{margin-top:16px;padding:12px 20px;border-radius:11px;background:#F97316;color:#fff;font-size:15px;font-weight:700}
.boot-pin{display:flex;gap:8px;justify-content:center;margin-top:16px}.boot-pin input{width:130px;padding:12px;border-radius:11px;border:1px solid rgba(255,255,255,.15);background:#0B0F17;color:#fff;font:700 22px "JetBrains Mono",monospace;letter-spacing:.3em;text-align:center}
.boot-pin button{margin-top:0}
.cjp-update{position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:70;padding:13px;border-radius:12px;background:#38BDF8;color:#0B0F17;font-size:14px;font-weight:700;box-shadow:0 12px 30px -10px rgba(56,189,248,.8)}`;

/**
 * Página única de la app del atleta con link fijo (…/nutrition/plan/<slug>#k=…). No trae datos de ningún atleta:
 * el arranque (cloudBoot) vincula el celular, baja el plan publicado y recién ahí ejecuta el mismo runtime del export.
 */
export function buildPlanShell(opts: { supabaseUrl: string; anonKey: string; basePath: string }) {
  const boot = { url: opts.supabaseUrl.replace(/\/$/, ''), key: opts.anonKey, base: opts.basePath.replace(/\/$/, '') };
  const icons = `${boot.base}/icons/`;
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Tu plan · Coach JP</title>
<meta name="description" content="Tu plan de nutrición personalizado · Coach JP · ${BRAND.handle}">
<meta name="theme-color" content="${BRAND.colors.carbon}">
<meta name="color-scheme" content="dark">
<meta name="robots" content="noindex">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mi plan">
<link rel="manifest" href="data:application/manifest+json,%7B%7D">
<link rel="icon" type="image/png" sizes="192x192" href="${icons}icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="${icons}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${styles}
${BOOT_CSS}</style>
<script>
window.__cjpFail = function (err) {
  var app = document.getElementById('app');
  if (app) app.innerHTML = '<section class="boot-card"><div class="boot-k">Coach JP · Tu plan</div><h2>No pudimos abrir tu plan</h2><p>Recargá la página. Si sigue pasando, avisale a tu coach.</p><button class="boot-btn" onclick="location.reload()">Recargar</button></section>';
  try { console.error(err); } catch (e) {}
};
window.addEventListener('error', function (e) { window.__cjpFail(e.error || e.message); });
</script>
</head>
<body>
<main id="app"></main>
<div class="dock"><button class="btn fire" id="install">[ Instalar app ]</button></div>
<div id="sheet-bg" class="sheet-bg"></div>
<div id="sheet" class="sheet"></div>
<div id="toast" class="toast"></div>
<input id="photo" type="file" accept="image/*" hidden>
<input id="story-photo" type="file" accept="image/*" hidden>
<script id="cjp-boot" type="application/json">${safeJson(boot)}</script>
<script id="cjp-data" type="application/json">{}</script>
<script id="cjp-runtime" type="text/plain">${runtime}</script>
<script>${cloudBoot}</script>
</body>
</html>
`;
}

/** Service Worker de la app del atleta con link fijo: la página abre aunque no haya señal (también en /plan/<slug>). */
export function buildPlanServiceWorker() {
  return `// Coach JP · app del atleta (link fijo) · Service Worker
const CACHE = 'cjp-plan-' + ${JSON.stringify(Date.now().toString(36))};
const SCOPE = self.registration.scope;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('cjp-plan-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.href.startsWith(SCOPE)) {
    // Network-first; sin señal (o un /plan/<slug> que el hosting no conoce) → la página única guardada.
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && url.href.split('?')[0] === SCOPE) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(SCOPE, copy)); }
      return res;
    }).catch(() => caches.match(SCOPE)));
  } else if (url.origin === location.origin && url.pathname.includes('/icons/')) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  } else if (/fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
`;
}
