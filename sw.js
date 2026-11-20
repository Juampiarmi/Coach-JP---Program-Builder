/* Coach JP · Service Worker de la app del alumno (y del panel).
   - Network-first: siempre trae la versión fresca; usa la caché sólo sin conexión.
   - Push remoto (infraestructura lista) y click de notificación.
   - Aviso de timer en segundo plano: la página manda
       { tipo:'jp-timer', accion:'programar', at:<epoch ms>, titulo, cuerpo }
     o { tipo:'jp-timer', accion:'cancelar' }. A la hora `at` se muestra la
     notificación local "tiempo cumplido" SÓLO si ninguna ventana de la app
     está visible (si el alumno la está mirando, el propio timer ya avisó).
     Best effort: el sistema operativo puede dormir el SW antes de tiempo. */
/* Voz del timer (voz/manifest.json + voz/<idioma>/<frase>.mp3?v=<hash>): caché PROPIA, que no se borra al subir de versión (su nombre no empieza con "coachjp-athlete-").
   Los mp3 se sirven cache-first (el hash ?v= del manifest cambia la URL cuando una frase cambia); el manifest, network-first con respaldo en esta caché.
   La página manda { tipo:'jp-voz', accion:'precachear', urls:[...] } al activar la voz: se guardan todos los clips del idioma y se descartan los que ya no están en la lista. */
const VOZ = 'coachjp-voz-v1';
const esVoz = u => /\/voz\/(manifest\.json|[a-z]{2}\/[\w-]+\.mp3)$/.test(u.pathname);
const CACHE = 'coachjp-athlete-v14';   /* v14: voz del timer (caché propia coachjp-voz-v1). v13: rótulos de la tarjeta del bloque desde el diccionario (i18n), vocabulario acostado/tibias. v12: invalida las cachés v11 al activarse (circuitos de cardio / metabólico con todas las estaciones iguales: número, nombre, cantidad y aclaración) */
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(Promise.all([
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf('coachjp-athlete-') === 0).map(k => caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  const uV = new URL(e.request.url);
  if (esVoz(uV)) {
    if (/manifest\.json$/.test(uV.pathname)) {
      e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
        if (res && res.status === 200) { const c = res.clone(); caches.open(VOZ).then(k => k.put(e.request, c)); }
        return res;
      }).catch(() => caches.open(VOZ).then(k => k.match(e.request)).then(r => r || Response.error())));
    } else {
      e.respondWith(caches.open(VOZ).then(k => k.match(e.request).then(r => r || fetch(e.request).then(res => {
        if (res && res.status === 200) k.put(e.request, res.clone());
        return res;
      }))));
    }
    return;
  }
  /* cache:'no-cache' = revalidar siempre contra el servidor (ETag): así nunca se sirve del caché HTTP una versión vieja de la app mientras arranca */
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
    if(!res || res.status !== 200 || res.type === 'opaque') return res;
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
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo !== 'jp-voz' || d.accion !== 'precachear' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(VOZ).then(async k => {
    for (const u of d.urls) { try { if (!(await k.match(u))) { const r = await fetch(u); if (r && r.status === 200) await k.put(u, r); } } catch (err) {} }
    /* clips de versiones anteriores (otro ?v=) o frases que ya no existen: se descartan (los de otros idiomas ya guardados se conservan) */
    const base = u => u.split('?')[0];
    const vivos = new Set(d.urls), porBase = new Map(d.urls.map(u => [base(u), u]));
    for (const r of await k.keys()) { if (porBase.has(base(r.url)) && !vivos.has(r.url)) await k.delete(r); }
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
