/* Coach JP · Service Worker de la app del alumno (y del panel).
   - Network-first: siempre trae la versión fresca; usa la caché sólo sin conexión.
   - Push remoto (infraestructura lista) y click de notificación.
   - Aviso de timer en segundo plano: la página manda
       { tipo:'jp-timer', accion:'programar', at:<epoch ms>, titulo, cuerpo }
     o { tipo:'jp-timer', accion:'cancelar' }. A la hora `at` se muestra la
     notificación local "tiempo cumplido" SÓLO si ninguna ventana de la app
     está visible (si el alumno la está mirando, el propio timer ya avisó).
     Best effort: el sistema operativo puede dormir el SW antes de tiempo. */
const CACHE = 'coachjp-athlete-v2';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(Promise.all([
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf('coachjp-athlete-') === 0).map(k => caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    const c = res.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match(self.location.origin + '/'))));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) {}
  const title = d.title || 'Coach JP';
  const opts = { body: d.body || '', icon: d.icon, badge: d.badge, vibrate: d.vibrate || [200, 100, 200], data: d.data || d, tag: d.tag || 'coachjp' };
  e.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});
let jpT = null, jpRes = null;
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo !== 'jp-timer') return;
  if (jpT) { clearTimeout(jpT); jpT = null; }
  if (jpRes) { jpRes(); jpRes = null; }
  if (d.accion !== 'programar') return;
  const ms = d.at - Date.now();
  if (!(ms > 0) || ms > 600000) return;
  e.waitUntil(new Promise(res => {
    jpRes = res;
    jpT = setTimeout(() => {
      jpT = null; jpRes = null;
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        if (list.some(c => c.visibilityState === 'visible')) return;
        return self.registration.showNotification(d.titulo || 'Coach JP', { body: d.cuerpo || '', vibrate: [200, 100, 200], tag: 'coachjp-timer', renotify: true });
      }).then(res, res);
    }, ms);
  }));
});
