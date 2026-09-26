(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('cjp-data').textContent);
  var KEY = 'coachjp-pwa:' + D.slug;
  var mem = {};
  var store = {
    get: function (k, fb) {
      try {
        var v = localStorage.getItem(KEY + ':' + k);
        return v ? JSON.parse(v) : fb;
      } catch (e) {
        return k in mem ? mem[k] : fb;
      }
    },
    set: function (k, v) {
      mem[k] = v;
      try {
        localStorage.setItem(KEY + ':' + k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  var today = new Date().toISOString().slice(0, 10);
  var S = {
    mode: D.preview ? D.initialMode : store.get('mode', D.initialMode),
    checks: store.get('checks:' + today, {}),
    swaps: store.get('swaps', {}),
    sheet: null,
  };

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var n0 = function (n) { return Math.round(n).toLocaleString('es-AR'); };
  var n1 = function (n) { return (Math.round(n * 10) / 10).toLocaleString('es-AR'); };
  var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B0E14" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function resolveItem(it) {
    var sw = S.swaps[it.id];
    if (!sw || !D.foods[sw] || !it.foodId || !D.foods[it.foodId]) return it;
    var from = D.foods[it.foodId];
    var to = D.foods[sw];
    var anchor = D.anchors[from.group];
    var base = from[anchor] * it.grams;
    var grams = to[anchor] > 0 ? Math.round(base / to[anchor] / 5) * 5 : it.grams;
    var k = grams / 100;
    return { id: it.id, foodId: sw, food: to.name, grams: grams, p: to.p * k, c: to.c * k, f: to.f * k, leucine: to.leucine * k, swappedFrom: from.name };
  }

  function mealsFor(mode) {
    return D.meals
      .filter(function (m) { return m.day === 'both' || m.day === mode; })
      .sort(function (a, b) { return a.time.localeCompare(b.time); })
      .map(function (m) {
        var items = m.items.map(resolveItem);
        var t = items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
        return { m: m, items: items, t: t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
      });
  }

  function unitHint(it) {
    var ref = it.foodId && D.foods[it.foodId];
    if (!ref || !ref.unit) return '';
    var q = it.grams / ref.unit.grams;
    if (q < 0.5) return '';
    return '≈ ' + n1(Math.round(q * 2) / 2) + ' ' + esc(ref.unit.label);
  }

  function ring(pct, color) {
    var r = 46, c = 2 * Math.PI * r, off = c * (1 - Math.min(1, pct));
    return '<svg width="108" height="108" viewBox="0 0 108 108"><circle cx="54" cy="54" r="' + r + '" fill="none" stroke="#1A222D" stroke-width="8"/><circle cx="54" cy="54" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 0 6px ' + color + ')"/></svg>';
  }

  function bar(cls, label, cur, tgt) {
    var pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;
    return '<div class="bar ' + cls + '"><div class="l"><span>' + label + '</span><span><b>' + n0(cur) + '</b><span class="muted"> / ' + n0(tgt) + ' g</span></span></div><div class="t"><i style="width:' + pct + '%"></i></div></div>';
  }

  function render() {
    var mode = S.mode;
    var tgt = D.targets[mode];
    var list = mealsFor(mode);
    var eaten = list.reduce(function (a, x) {
      if (!S.checks[x.m.id]) return a;
      return { p: a.p + x.t.p, c: a.c + x.t.c, f: a.f + x.t.f, k: a.k + x.kcal };
    }, { p: 0, c: 0, f: 0, k: 0 });
    var doneCount = list.filter(function (x) { return S.checks[x.m.id]; }).length;
    var color = mode === 'on' ? '#00E5FF' : '#FFD600';
    var h = '';

    h += '<header class="top">' + D.shield + '<div><div class="brand">COACH <b>JP</b></div><div class="handle">' + esc(D.handle) + '</div></div><div class="phase">' + esc(D.athlete.phase) + '</div></header>';
    h += '<div class="tag">[ DIRECTIVA NUTRICIONAL · ' + esc(D.athlete.discipline) + ' ]</div>';
    h += '<h1>' + esc(D.athlete.name) + '</h1>';
    if (D.coachNote) h += '<p class="note">' + esc(D.coachNote) + '</p>';

    h += '<div class="switch ' + mode + '"><span class="knob"></span><button data-mode="on" class="' + (mode === 'on' ? 'on' : '') + '">MODO DÍA ON</button><button data-mode="off" class="' + (mode === 'off' ? 'on' : '') + '">MODO DÍA OFF</button></div>';

    h += '<section class="card"><div class="tag" style="margin-bottom:10px">[ TELEMETRÍA · ' + (mode === 'on' ? 'ALTA DEMANDA GLUCOLÍTICA' : 'RECUPERACIÓN · GRASAS HORMONALES') + ' ]</div>';
    h += '<div class="hero"><div class="ring">' + ring(tgt.kcal ? eaten.k / tgt.kcal : 0, color) + '<div class="v"><b>' + Math.round(tgt.kcal ? (eaten.k / tgt.kcal) * 100 : 0) + '%</b><span>CARGADO</span></div></div>';
    h += '<div><div class="kcal ' + (mode === 'on' ? 'on-c' : 'off-c') + '">' + n0(tgt.kcal) + '<small>KCAL</small></div><div class="prog" style="margin-top:8px">' + n0(eaten.k) + ' KCAL INGERIDAS · ' + doneCount + '/' + list.length + ' BLOQUES</div></div></div>';
    h += '<div class="bars">' + bar('p', 'PROTEÍNA', eaten.p, tgt.p) + bar('c', 'CARBOHIDRATOS', eaten.c, tgt.c) + bar('f', 'GRASAS', eaten.f, tgt.f) + '</div>';
    h += '<div class="grid3"><div class="stat"><b>' + n1(tgt.p / D.athlete.weightKg) + '</b><span>P G/KG</span></div><div class="stat"><b>' + n1(tgt.c / D.athlete.weightKg) + '</b><span>C G/KG</span></div><div class="stat"><b>' + n1(tgt.f / D.athlete.weightKg) + '</b><span>F G/KG</span></div></div>';
    h += '</section>';

    D.protocols.forEach(function (p) {
      h += '<section class="card alert"><div class="tag" style="margin-bottom:6px">[ ' + esc(p.tag) + ' ]</div><div style="font-family:Chakra Petch,sans-serif;font-weight:700;font-size:17px;text-transform:uppercase">' + esc(p.title) + '</div><p class="muted" style="font-size:13px;margin-top:4px">' + esc(p.body) + '</p></section>';
    });

    h += '<div class="sec"><span class="tag">[ BLOQUES DE INGESTA · MPS / LEUCINA ]</span><span class="prog">TOCÁ UN ALIMENTO → SWAP</span></div>';
    list.forEach(function (x) {
      var m = x.m;
      var done = !!S.checks[m.id];
      h += '<section class="card meal' + (done ? ' done' : '') + '">';
      h += '<div class="hd"><span class="time">' + esc(m.time) + '</span><div><div class="nm">' + esc(m.name) + '</div><div class="mm">' + n0(x.kcal) + ' KCAL · P ' + n0(x.t.p) + ' · C ' + n0(x.t.c) + ' · F ' + n0(x.t.f) + '</div></div><button class="chk" data-check="' + m.id + '" aria-label="Marcar bloque">' + CHECK + '</button></div>';
      h += '<div class="items">';
      x.items.forEach(function (it) {
        var canSwap = it.foodId && D.foods[it.foodId] && D.swapGroups[D.foods[it.foodId].group] > 1 || it.swappedFrom;
        var hint = unitHint(it);
        h += '<button class="item" ' + (canSwap ? 'data-swap="' + m.id + '|' + it.id + '"' : 'disabled') + '><span class="g">' + n0(it.grams) + ' g' + (hint ? '<em>' + hint + '</em>' : '') + '</span><span class="fd">' + esc(it.food) + (it.swappedFrom ? '<s>SWAP · ORIGINAL: ' + esc(it.swappedFrom) + '</s>' : '') + '</span>' + (canSwap ? '<span class="sw">SWAP</span>' : '') + '</button>';
      });
      h += '</div>';
      if (!m.mps) h += '<div class="leu na"><span class="dot"></span>BLOQUE GLUCOLÍTICO · LEUCINA ' + n1(x.t.l) + ' G · N/A</div>';
      else if (x.t.l >= D.threshold) h += '<div class="leu ok"><span class="dot"></span>LEUCINA ' + n1(x.t.l) + ' G · UMBRAL mTOR/MPS ALCANZADO</div>';
      else h += '<div class="leu low"><span class="dot"></span>LEUCINA ' + n1(x.t.l) + ' G · SUB-UMBRAL (&lt; ' + n1(D.threshold) + ' G)</div>';
      h += '</section>';
    });

    if (D.supplements.length) {
      h += '<div class="sec"><span class="tag">[ SUPLEMENTACIÓN · AIS GRUPO A ]</span></div><section class="card">';
      D.supplements.forEach(function (s) {
        var done = !!S.checks['sup:' + s.id];
        h += '<button class="sup' + (done ? ' done' : '') + '" data-check="sup:' + esc(s.id) + '"><span class="chk">' + CHECK + '</span><span style="flex:1"><b>' + esc(s.name) + '</b><span class="ds">' + esc(s.dose) + '</span><div class="tm">' + esc(s.timing) + '</div>' + (s.doi ? '<a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener">[ ' + esc(s.evidence) + ' · DOI ' + esc(s.doi) + ' ]</a>' : '') + '</span></button>';
      });
      h += '</section>';
    }

    h += '<div class="cites">' + D.citations.map(function (c) {
      return c.doi ? '<a href="https://doi.org/' + esc(c.doi) + '" target="_blank" rel="noopener">[ ' + esc(c.label) + ' ]</a>' : '[ ' + esc(c.label) + ' ]';
    }).join('<br>') + '</div>';
    h += '<footer class="foot">' + D.shieldSm + '<div><div class="brand">COACH <b>JP</b> · <span class="muted" style="font-weight:500">HIGH PERFORMANCE SYSTEM</span></div><div class="handle">' + esc(D.handle) + ' · ACTUALIZADO ' + esc(D.generatedLabel) + '</div></div></footer>';

    var y = window.scrollY;
    $('#app').innerHTML = h;
    window.scrollTo(0, y);
    renderSheet();
  }

  function renderSheet() {
    var bg = $('#sheet-bg'), sh = $('#sheet');
    if (!S.sheet) { bg.className = 'sheet-bg'; sh.className = 'sheet'; return; }
    var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
    var orig = meal && meal.items.filter(function (i) { return i.id === S.sheet.item; })[0];
    if (!orig) { S.sheet = null; return renderSheet(); }
    var from = D.foods[orig.foodId];
    var anchor = D.anchors[from.group];
    var cur = S.swaps[orig.id] || orig.foodId;
    var label = { p: 'PROTEÍNA', c: 'CARBOHIDRATOS', f: 'GRASAS' }[anchor];
    var h = '<div class="grab"></div><div class="tag">[ SMART SWAP · ' + esc(D.groupLabels[from.group]) + ' ]</div>';
    h += '<p class="muted" style="font-size:13px;margin:6px 0 4px">Equivalencia por ' + label.toLowerCase() + ': ' + n1(from[anchor] * orig.grams / 100) + ' g del macro ancla.</p>';
    Object.keys(D.foods).forEach(function (id) {
      var f = D.foods[id];
      if (f.group !== from.group || !(f[anchor] > 0)) return;
      var g = id === orig.foodId ? orig.grams : Math.round((from[anchor] * orig.grams) / f[anchor] / 5) * 5;
      var k = g / 100;
      h += '<button class="opt' + (id === cur ? ' cur' : '') + '" data-pick="' + id + '"><span class="g">' + n0(g) + ' g</span><span class="fd">' + esc(f.name) + (id === orig.foodId ? ' · ORIGINAL' : '') + '<span>P ' + n1(f.p * k) + ' · C ' + n1(f.c * k) + ' · F ' + n1(f.f * k) + ' · LEU ' + n1(f.leucine * k) + '</span></span></button>';
    });
    sh.innerHTML = h;
    bg.className = 'sheet-bg open';
    sh.className = 'sheet open';
  }

  var tt;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(tt);
    tt = setTimeout(function () { t.className = 'toast'; }, 2200);
  }

  function haptic() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-mode],[data-check],[data-swap],[data-pick],#sheet-bg,#install,#reset');
    if (!el) return;
    if (el.dataset.mode) {
      S.mode = el.dataset.mode;
      store.set('mode', S.mode);
      haptic();
      if (D.preview) parent.postMessage({ type: 'coachjp:mode', mode: S.mode }, '*');
      render();
    } else if (el.dataset.check) {
      var k = el.dataset.check;
      S.checks[k] = !S.checks[k];
      store.set('checks:' + today, S.checks);
      haptic();
      render();
    } else if (el.dataset.swap) {
      var p = el.dataset.swap.split('|');
      S.sheet = { meal: p[0], item: p[1] };
      renderSheet();
    } else if (el.dataset.pick) {
      var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
      var orig = meal.items.filter(function (i) { return i.id === S.sheet.item; })[0];
      if (el.dataset.pick === orig.foodId) delete S.swaps[orig.id];
      else S.swaps[orig.id] = el.dataset.pick;
      store.set('swaps', S.swaps);
      S.sheet = null;
      haptic();
      render();
      toast('SWAP APLICADO · MACROS RECALCULADOS');
    } else if (el.id === 'sheet-bg') {
      S.sheet = null;
      renderSheet();
    } else if (el.id === 'install') {
      install();
    } else if (el.id === 'reset') {
      S.checks = {};
      store.set('checks:' + today, S.checks);
      render();
      toast('CHECKLIST DEL DÍA REINICIADO');
    }
  });

  // ---- Instalación PWA (Chrome/Android: prompt nativo · iOS: Compartir → Agregar a inicio)
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  function install() {
    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return toast('YA ESTÁ INSTALADA EN TU PANTALLA DE INICIO');
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; });
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      toast('SAFARI → COMPARTIR ⬆ → «AGREGAR A INICIO»');
    } else {
      toast('MENÚ ⋮ DEL NAVEGADOR → «INSTALAR APP»');
    }
  }

  if (!D.preview) {
    // Manifest en memoria con URLs absolutas (el data URI del <head> trae los iconos y es el respaldo).
    try {
      var here = location.href.split('#')[0].split('?')[0];
      var link = document.querySelector('link[rel="manifest"]');
      fetch(link.href)
        .then(function (r) { return r.json(); })
        .then(function (mf) {
          mf.start_url = here;
          mf.scope = here.replace(/[^/]*$/, '');
          mf.id = here;
          link.href = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: 'application/manifest+json' }));
        })
        .catch(function () {});
    } catch (e) {}
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  } else {
    window.addEventListener('message', function (e) {
      var msg = e.data || {};
      if (msg.type === 'coachjp:payload') {
        var keepSheet = S.sheet;
        D = msg.payload;
        S.mode = D.initialMode;
        S.sheet = keepSheet;
        render();
      } else if (msg.type === 'coachjp:mode') {
        S.mode = msg.mode;
        render();
      }
    });
  }

  render();
})();
