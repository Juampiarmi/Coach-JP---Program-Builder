// Coach JP Nutrition Builder · Service Worker (app shell offline).
// Navegación: network-first (siempre la última versión); assets con hash de Next: cache-first;
// Google Fonts: cache-first. Las llamadas a APIs de IA nunca se cachean.
const VERSION = 'cjp-nutrition-v3';
const SCOPE = self.registration.scope;
const SHELL = [SCOPE, SCOPE + 'manifest.webmanifest', SCOPE + 'icons/icon-192.png', SCOPE + 'icons/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const put = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin && url.href.startsWith(SCOPE)) {
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req).then((r) => r || caches.match(SCOPE))));
    } else if (url.pathname.includes('/_next/static/')) {
      e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => put(req, res))));
    } else {
      e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => put(req, res))));
    }
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => put(req, res))));
  }
});
