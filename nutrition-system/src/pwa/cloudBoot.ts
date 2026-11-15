// Arranque de la app del atleta con link fijo (/plan/<slug>#k=<token>). Vanilla JS embebido como texto,
// misma regla que el runtime: sin backticks ni interpolaciones de template.
//
// 1. Abre al instante con el último plan guardado en el celular (funciona sin señal en el box).
// 2. Con señal: sesión anónima de Supabase → vinculación con el link (#k) o el PIN → plan activo.
// 3. Cola de envío: cada registro (comidas, agua, salidas, peso) se guarda primero en el celular y se sube
//    solo a los 2 s, al volver la señal, al minimizar la app y al abrirla.
const cloudBoot = String.raw`
(function () {
  'use strict';
  var B = JSON.parse(document.getElementById('cjp-boot').textContent);
  // Conexión de prueba del coach (asistente "Conectar nube" del Builder, mismo navegador): sirve para probar
  // el link antes de fijar la conexión para todos los alumnos.
  if (!B.url || !B.key) try {
    var ov = JSON.parse(localStorage.getItem('coachjp-cloud-override') || 'null');
    if (ov && ov.url && ov.key) { B.url = String(ov.url).replace(/\/$/, ''); B.key = ov.key; }
  } catch (e) {}
  var app = document.getElementById('app');
  var qs = new URLSearchParams(location.search);
  var pm = /\/plan\/([a-z0-9-]{2,60})\/?$/i.exec(location.pathname);
  var slug = String(qs.get('a') || (pm ? pm[1] : '')).toLowerCase().replace(/[^a-z0-9-]/g, '');
  var hashTok = (/[#&]k=([A-Za-z0-9_-]{16,})/.exec(location.hash) || [])[1] || '';
  var NS = 'coachjp-cloud:' + slug + ':';
  var mem = {};
  function lsGet(k, fb) { try { var v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : fb; } catch (e) { return k in mem ? mem[k] : fb; } }
  function lsSet(k, v) { mem[k] = v; try { v === null ? localStorage.removeItem(NS + k) : localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // URL limpia (…/plan/juan-pablo) conservando la llave para la app instalada en el inicio del celular.
  if (slug && qs.get('a')) try { history.replaceState(null, '', B.base + '/plan/' + slug + location.hash); } catch (e) {}
  // La llave se recuerda en el celular: si el link se abre después sin #k (ícono de inicio), no hace falta pedirla.
  if (hashTok) lsSet('tok', hashTok);
  // Historial traído desde la app en archivo (#…&m=…): se guarda para importarlo al abrir el plan y se saca de la URL.
  var mig = (/[#&]m=([A-Za-z0-9_-]+)/.exec(location.hash) || [])[1];
  if (mig) {
    try {
      var bin = mig.replace(/-/g, '+').replace(/_/g, '/');
      lsSet('import', JSON.parse(decodeURIComponent(escape(atob(bin + '==='.slice((bin.length + 3) % 4))))));
    } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search + (hashTok ? '#k=' + hashTok : '')); } catch (e) {}
  }
  var token = hashTok || lsGet('tok', '');

  var dock = document.querySelector('.dock');
  function screen(title, body, extra) {
    if (dock) dock.style.display = 'none'; // "Instalar app" recién cuando el plan está abierto
    app.innerHTML = '<section class="boot-card"><div class="boot-k">Coach JP · Tu plan</div><h2>' + esc(title) + '</h2><p>' + body + '</p>' + (extra || '') + '</section>';
  }
  function loading(msg) { screen(msg || 'Cargando tu plan…', 'Un segundo, estamos trayendo tu plan.', '<div class="boot-spin"></div>'); }

  if (!slug) return screen('Abrí el link que te mandó tu coach', 'Este es el lugar de tu plan de nutrición, pero falta tu link personal. Buscalo en el mensaje de tu coach y abrilo desde ahí.');
  if (!B.url || !B.key) return screen('Tu plan todavía no está disponible', 'Tu coach está terminando de configurar la app. Probá de nuevo en un rato.');

  // ---------- Supabase por REST (sin librerías) ----------
  var sess = lsGet('sess', null);
  function headers(extra) {
    var h = { apikey: B.key, 'Content-Type': 'application/json' };
    if (sess && sess.access_token) h.Authorization = 'Bearer ' + sess.access_token;
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }
  function req(method, path, body, extra, keepalive) {
    return fetch(B.url + path, { method: method, headers: headers(extra), body: body === undefined ? undefined : JSON.stringify(body), keepalive: !!keepalive }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { data = t; }
        if (!r.ok) { var err = new Error((data && (data.message || data.msg || data.error_description)) || ('HTTP ' + r.status)); err.status = r.status; err.code = data && data.code; throw err; }
        return data;
      });
    });
  }
  function saveSess(d) {
    sess = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), uid: d.user && d.user.id };
    lsSet('sess', sess);
  }
  function anonSignIn() { sess = null; return req('POST', '/auth/v1/signup', { data: {} }).then(saveSess); }
  function ensureSession() {
    if (sess && sess.access_token && sess.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
    if (sess && sess.refresh_token) {
      var rt = sess.refresh_token;
      sess = null;
      return req('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: rt }).then(saveSess, function (e) {
        if (e.status >= 400 && e.status < 500) { lsSet('aid', null); return anonSignIn(); }
        throw e;
      });
    }
    return anonSignIn();
  }
  // Reintenta una vez si la sesión venció en el medio.
  function api(method, path, body, extra, keepalive) {
    return ensureSession().then(function () { return req(method, path, body, extra, keepalive); }).catch(function (e) {
      if (e.status !== 401) throw e;
      sess = sess ? { refresh_token: sess.refresh_token, expires_at: 0 } : null;
      return ensureSession().then(function () { return req(method, path, body, extra, keepalive); });
    });
  }
  function isNetErr(e) { return !e || !e.status; }

  // ---------- Vinculación ----------
  function claim(pin) {
    return api('POST', '/rest/v1/rpc/claim_athlete', { p_slug: slug, p_token: pin ? null : token || null, p_pin: pin || null, p_label: (navigator.userAgent.match(/iPhone|iPad|Android|Mac|Windows/) || ['Celular'])[0] }).then(function (r) {
      if (!r || !r.ok) return null;
      lsSet('aid', r.athlete_id);
      return r.athlete_id;
    });
  }
  function askPin(msg) {
    screen('Ingresá tu PIN', (msg ? '<b class="boot-err">' + esc(msg) + '</b><br>' : '') + 'Tu coach te pasó un PIN de 4 números. Si no lo tenés, pedile el link de nuevo.',
      '<form id="pin-f" class="boot-pin"><input id="pin-i" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" placeholder="••••" aria-label="PIN"><button>Entrar</button></form>');
    var f = document.getElementById('pin-f'), i = document.getElementById('pin-i');
    i.focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!/^[0-9]{4}$/.test(i.value)) return askPin('El PIN tiene 4 números.');
      loading('Verificando…');
      claim(i.value).then(function (aid) { aid ? firstLoad() : askPin('PIN incorrecto.'); }, function (e) {
        askPin(/intentos/i.test(e.message) ? 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.' : isNetErr(e) ? 'Sin conexión. Probá cuando tengas señal.' : 'No pudimos verificar el PIN.');
      });
    });
  }
  function link() {
    var aid = lsGet('aid', null);
    if (aid) return Promise.resolve(aid);
    return claim(null).catch(function (e) {
      if (e.code === 'P0002') { var x = new Error('gone'); x.gone = true; throw x; }
      throw e;
    });
  }

  // ---------- Plan ----------
  function fetchPlan(aid, withPayload) {
    return api('GET', '/rest/v1/published_plans?select=version' + (withPayload ? ',payload' : '') + '&athlete_id=eq.' + aid + '&is_active=is.true').then(function (rows) { return rows && rows[0] ? rows[0] : null; });
  }

  // Celular nuevo: trae los últimos 60 días para recuperar racha, historial y curva de peso.
  function restoreHistory(aid, payloadSlug) {
    var since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    var K = 'coachjp-pwa:' + payloadSlug + ':';
    function put(k, v) { try { if (localStorage.getItem(K + k) === null) localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) {} }
    return Promise.all([
      api('GET', '/rest/v1/daily_logs?select=*&athlete_id=eq.' + aid + '&day=gte.' + since + '&order=day.asc'),
      api('GET', '/rest/v1/weight_logs?select=day,kg&athlete_id=eq.' + aid + '&day=gte.' + since),
    ]).then(function (res) {
      var hist = {}, swaps = null, first = null;
      (res[0] || []).forEach(function (r) {
        put('checks:' + r.day, r.checks || {}); put('opt:' + r.day, r.opts || {}); put('extras:' + r.day, r.extras || {});
        put('free:' + r.day, r.social || {}); put('rebal:' + r.day, r.rebal || {}); put('water:' + r.day, r.water_ml || 0);
        put('mode:' + r.day, r.mode);
        hist[r.day] = { date: r.day, mode: r.mode, done: r.meals_done, total: r.meals_total, kcal: r.kcal, target: r.kcal_target, pct: r.kcal_target ? Math.round((r.kcal / r.kcal_target) * 100) : 0, adherent: !!r.adherent };
        if (r.swaps && Object.keys(r.swaps).length) swaps = r.swaps;
        if (!first) first = r.day;
      });
      if (Object.keys(hist).length) put('history', hist);
      if (swaps) put('swaps', swaps);
      if (first) put('start', first);
      var w = {};
      (res[1] || []).forEach(function (r) { w[r.day] = Number(r.kg); });
      if (Object.keys(w).length) { put('weights', w); lsSet('wsynced', w); }
    }).catch(function () {});
  }

  function setManifest(payload) {
    try {
      var start = location.origin + B.base + '/plan/' + slug + (token ? '#k=' + token : '');
      var icon = location.origin + B.base + '/icons/';
      var m = { name: 'Coach JP · ' + payload.athlete.name, short_name: String(payload.athlete.name).split(' ')[0].slice(0, 12) || 'Mi plan', start_url: start, scope: location.origin + B.base + '/plan/', display: 'standalone', orientation: 'portrait', background_color: '#0B0F17', theme_color: '#0B0F17', lang: 'es-AR',
        icons: [{ src: icon + 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: icon + 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: icon + 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
      var l = document.querySelector('link[rel=manifest]');
      if (l) l.href = 'data:application/manifest+json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(m))));
      document.title = payload.athlete.name + ' · Coach JP';
    } catch (e) {}
  }

  var started = false;
  function start(cached) {
    if (started) return;
    started = true;
    var payload = cached.payload;
    payload.preview = false;
    payload.cloud = true;
    payload.version = cached.version;
    payload.slug = payload.slug || slug;
    KEY = 'coachjp-pwa:' + payload.slug + ':';
    setManifest(payload);
    if (dock) dock.style.display = '';
    importHistory(payload.slug);
    document.getElementById('cjp-data').textContent = JSON.stringify(payload);
    if (sessionStorage.getItem('cjp-updated')) { window.__cjpBootMsg = 'Tu coach actualizó tu plan ✓'; sessionStorage.removeItem('cjp-updated'); }
    var s = document.createElement('script');
    s.textContent = document.getElementById('cjp-runtime').textContent;
    document.body.appendChild(s);
    setTimeout(flush, 800);
  }

  // Escribe el historial importado sin pisar lo que ya haya en este celular y lo encola para tu coach.
  function importHistory(pslug) {
    var imp = lsGet('import', null);
    if (!imp || !imp.d) return;
    var K = 'coachjp-pwa:' + pslug + ':', days = 0;
    Object.keys(imp.d).forEach(function (k) {
      try {
        var cur = localStorage.getItem(K + k);
        if (cur === null) localStorage.setItem(K + k, JSON.stringify(imp.d[k]));
        else if (k === 'weights' || k === 'history') {
          // Mapas por día: se suman los días que faltan (lo que ya hay en este celular o en la nube gana).
          var merged = JSON.parse(cur) || {}, add = imp.d[k] || {};
          for (var dk in add) if (!(dk in merged)) merged[dk] = add[dk];
          localStorage.setItem(K + k, JSON.stringify(merged));
        }
      } catch (e) {}
      var m = /^(checks|water|opt|mode|free|rebal):(\d{4}-\d{2}-\d{2})$/.exec(k);
      if (m && !out.days[m[2]]) { out.days[m[2]] = Date.now(); days++; }
      if (k === 'weights') out.weights = true;
    });
    lsSet('outbox', out);
    lsSet('import', null);
    window.__cjpBootMsg = 'Listo: pasamos tu historial (' + days + ' días) ✓';
  }

  function firstLoad() {
    loading();
    link().then(function (aid) {
      if (!aid) return token ? screen('Este link ya no funciona', 'Tu coach generó un link nuevo. Pedíselo por mensaje y abrilo desde ahí.') : askPin();
      return fetchPlan(aid, true).then(function (row) {
        if (!row) {
          lsSet('aid', null);
          return screen('Tu plan todavía no está publicado', 'Tu coach lo está terminando. Cuando lo publique, abrí este mismo link y lo vas a ver.');
        }
        lsSet('plan', { version: row.version, payload: row.payload });
        return restoreHistory(aid, row.payload.slug || slug).then(function () { start(lsGet('plan', null)); });
      });
    }).catch(function (e) {
      if (e.gone) return screen('Este link no existe', 'Puede que tu coach lo haya desactivado. Pedile el link nuevo.');
      if (isNetErr(e)) return screen('Sin conexión', 'Para abrir tu plan la primera vez necesitás señal. Después funciona aunque no tengas internet.', '<button class="boot-btn" onclick="location.reload()">Reintentar</button>');
      screen('No pudimos abrir tu plan', esc(e.message) + '<br>Probá de nuevo en un rato.', '<button class="boot-btn" onclick="location.reload()">Reintentar</button>');
    });
  }

  // ---------- Actualizaciones del plan ----------
  var checking = false;
  function checkUpdate(silentReload) {
    var cur = lsGet('plan', null), aid = lsGet('aid', null);
    if (checking || !cur || !navigator.onLine) return;
    checking = true;
    (aid ? Promise.resolve(aid) : link()).then(function (a) {
      if (!a) return;
      return fetchPlan(a, false).then(function (row) {
        if (!row) {
          // Sin plan visible: el coach cerró la sesión de este celular (o dio de baja al atleta).
          // Se reintenta con la llave guardada; si ya no sirve, el plan se borra del celular (celular perdido).
          lsSet('aid', null);
          return link().then(function (again) {
            if (again) return;
            lsSet('plan', null);
            location.reload();
          }, function (e) { if (e && e.gone) { lsSet('plan', null); location.reload(); } });
        }
        if (row.version === cur.version) return;
        return fetchPlan(a, true).then(function (full) {
          if (!full) return;
          lsSet('plan', { version: full.version, payload: full.payload });
          if (silentReload || document.visibilityState === 'hidden') { sessionStorage.setItem('cjp-updated', '1'); location.reload(); }
          else showUpdate();
        });
      });
    }).catch(function () {}).then(function () { checking = false; });
  }
  function showUpdate() {
    if (document.getElementById('cjp-update')) return;
    var b = document.createElement('button');
    b.id = 'cjp-update';
    b.className = 'cjp-update';
    b.textContent = 'Tu coach actualizó tu plan · Tocá para verlo';
    b.onclick = function () { sessionStorage.setItem('cjp-updated', '1'); location.reload(); };
    document.body.appendChild(b);
  }

  // ---------- Cola de envío de registros ----------
  var KEY = '';
  var out = lsGet('outbox', { days: {}, weights: false });
  var state = 'synced', timer = null, flushing = false;
  function setState(s) {
    if (s === state) return;
    state = s;
    if (window.__cjpApi) window.__cjpApi.render();
  }
  function pending() { return Object.keys(out.days).length > 0 || out.weights; }
  window.__cjpCloud = {
    dirty: function (k) {
      var m = /^(checks|water|extras|free|opt|rebal|mode):(\d{4}-\d{2}-\d{2})$/.exec(k);
      if (m) out.days[m[2]] = Date.now();
      else if (k === 'swaps' && window.__cjpApi) out.days[window.__cjpApi.today()] = Date.now();
      else if (k === 'weights') out.weights = true;
      else return;
      lsSet('outbox', out);
      setState(navigator.onLine ? 'pending' : 'offline');
      clearTimeout(timer);
      timer = setTimeout(flush, 2000);
    },
    status: function () {
      if (state === 'offline' || (pending() && !navigator.onLine)) return { state: 'offline', text: '📱 Guardado en tu celular · esperando señal', tip: 'Se envía solo a tu coach cuando vuelva la conexión.' };
      if (pending()) return { state: 'pending', text: 'Enviando tus registros…', tip: 'Tus registros se están enviando a tu coach.' };
      return { state: 'synced', text: '✓ Todo enviado a tu coach', tip: 'Tu coach ya ve tus comidas, hidratación y peso.' };
    },
  };

  function flush(keepalive) {
    if (flushing || !pending() || !window.__cjpApi) return;
    if (!navigator.onLine) return setState('offline');
    var aid = lsGet('aid', null);
    flushing = true;
    var snap = JSON.parse(JSON.stringify(out));
    (aid ? Promise.resolve(aid) : link()).then(function (a) {
      if (!a) throw new Error('unlinked');
      aid = a;
      var jobs = [];
      var days = Object.keys(snap.days);
      if (days.length) {
        var rows = days.map(function (d) { var r = window.__cjpApi.dayRow(d); r.athlete_id = aid; r.client_updated_at = new Date(snap.days[d]).toISOString(); return r; });
        jobs.push(api('POST', '/rest/v1/daily_logs?on_conflict=athlete_id,day', rows, { Prefer: 'resolution=merge-duplicates,return=minimal' }, keepalive));
      }
      if (snap.weights) {
        var w = {}, synced = lsGet('wsynced', {});
        try { w = JSON.parse(localStorage.getItem(KEY + 'weights') || '{}') || {}; } catch (e) {}
        var up = Object.keys(w).filter(function (d) { return synced[d] !== w[d]; }).map(function (d) { return { athlete_id: aid, day: d, kg: w[d], client_updated_at: new Date().toISOString() }; });
        var del = Object.keys(synced).filter(function (d) { return !(d in w); });
        if (up.length) jobs.push(api('POST', '/rest/v1/weight_logs?on_conflict=athlete_id,day', up, { Prefer: 'resolution=merge-duplicates,return=minimal' }, keepalive));
        del.forEach(function (d) { jobs.push(api('DELETE', '/rest/v1/weight_logs?athlete_id=eq.' + aid + '&day=eq.' + d, undefined, { Prefer: 'return=minimal' }, keepalive)); });
        jobs.push(Promise.resolve().then(function () { snap.wmap = w; }));
      }
      return Promise.all(jobs);
    }).then(function () {
      // Sólo se limpia lo enviado (si hubo cambios nuevos en el medio, quedan en la cola).
      Object.keys(snap.days).forEach(function (d) { if (out.days[d] === snap.days[d]) delete out.days[d]; });
      if (snap.weights) { out.weights = false; lsSet('wsynced', snap.wmap || {}); }
      lsSet('outbox', out);
      setState(pending() ? 'pending' : 'synced');
    }, function (e) {
      if (e && e.status === 409) { out.days = {}; lsSet('outbox', out); }
      if (e && e.message === 'unlinked') lsSet('aid', null);
      setState(navigator.onLine ? 'pending' : 'offline');
    }).then(function () { flushing = false; if (pending() && navigator.onLine) { clearTimeout(timer); timer = setTimeout(flush, 15000); } });
  }

  window.addEventListener('online', function () { setState(pending() ? 'pending' : 'synced'); flush(); checkUpdate(false); });
  window.addEventListener('offline', function () { if (pending()) setState('offline'); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
    else { flush(); checkUpdate(false); }
  });
  setInterval(function () { flush(); }, 60000);
  setInterval(function () { checkUpdate(false); }, 5 * 60000);

  if ('serviceWorker' in navigator) try { navigator.serviceWorker.register(B.base + '/plan/sw.js', { scope: B.base + '/plan/' }); } catch (e) {}

  // ---------- Arranque ----------
  var cached = lsGet('plan', null);
  if (cached && cached.payload) {
    start(cached);
    setTimeout(function () { checkUpdate(false); }, 1200);
  } else firstLoad();
})();
`;

export default cloudBoot;
