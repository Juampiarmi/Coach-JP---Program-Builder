import runtime from '@/pwa/athlete.raw.js';
import styles from '@/pwa/athleteStyles';
import { computeTelemetry, isMpsMeal, LEUCINE_THRESHOLD, PHASE_LABEL } from './bioenergetics';
import { BRAND, shieldSvg } from './brand';
import { CITES } from './evidence';
import { FOODS, GROUP_ANCHOR, GROUP_LABEL } from './foods';
import type { AthletePlan, DayMode } from './types';

export const DISCIPLINE_LABEL = { bodybuilding: 'SPORTS & BODYBUILDING', hybrid: 'CROSSFIT & HYROX' } as const;

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
    name: `Coach JP · ${pr.name}`,
    short_name: pr.name.split(' ')[0].slice(0, 12) || 'Coach JP',
    description: 'Directiva nutricional personalizada · Coach JP High Performance System',
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
    shield: shieldSvg(34),
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
    meals: plan.meals.map((m) => ({ ...m, mps: isMpsMeal(m) })),
    foods: Object.fromEntries(FOODS.map((f) => [f.id, f])),
    anchors: GROUP_ANCHOR,
    groupLabels: GROUP_LABEL,
    swapGroups: usedGroups,
    supplements: plan.supplements.filter((s) => s.enabled),
    protocols,
    citations: [CITES.morton, CITES.aragon, CITES.leucine, CITES.carbs, CITES.ea],
    generatedLabel: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    manifest: { ...manifest, icons: [] },
  };
}

const safeJson = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');

const FONTS =
  'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap';

export function buildAthleteHtml(plan: AthletePlan, opts: { preview?: boolean; mode?: DayMode; icons?: ExportIcons } = {}) {
  const payload = buildPayload(plan, { preview: !!opts.preview, mode: opts.mode ?? 'on', icons: opts.icons });
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
</head>
<body>
<main id="app"></main>
<div class="dock"><button class="btn ghost" id="reset">Reiniciar día</button><button class="btn fire" id="install">Instalar app</button></div>
<div id="sheet-bg" class="sheet-bg"></div>
<div id="sheet" class="sheet"></div>
<div id="toast" class="toast"></div>
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
