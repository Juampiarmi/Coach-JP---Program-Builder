// Runtime vanilla JS de la PWA del atleta. Se embebe como texto inline en el index.html exportado.
// Es un string (no un módulo importado) para que ningún bundler le inyecte código de HMR o helpers.
// Regla: sin backticks ni ${ } dentro del runtime.
const runtime = String.raw`
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
    install: null,
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

  function unitHint(it) { return unitHintFor(it.foodId, it.grams); }

  function unitHintFor(foodId, grams) {
    var ref = foodId && D.foods[foodId];
    if (!ref || !ref.unit) return '';
    var q = grams / ref.unit.grams;
    if (q < 0.5) return '';
    return '≈ ' + n1(Math.round(q * 2) / 2) + ' ' + esc(ref.unit.label);
  }

  /** Sugerencia concreta para llegar al umbral de leucina (huevo de 50 g o whey). */
  function leuTip(need) {
    var egg = D.foods.huevo ? D.foods.huevo.leucine * 0.5 : 0.55;
    var whey = D.foods.whey ? D.foods.whey.leucine / 100 : 0.085;
    var eggs = Math.max(1, Math.ceil(need / egg));
    var g = Math.max(5, Math.ceil(need / whey / 5) * 5);
    return 'Sumá ' + eggs + ' huevo' + (eggs > 1 ? 's' : '') + ' o ' + g + ' g de whey';
  }

  function ring(pct, color) {
    var r = 46, c = 2 * Math.PI * r, off = c * (1 - Math.min(1, pct));
    return '<svg width="108" height="108" viewBox="0 0 108 108"><circle cx="54" cy="54" r="' + r + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="6"/><circle cx="54" cy="54" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)"/></svg>';
  }

  function bar(cls, label, cur, tgt) {
    var pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;
    return '<div class="bar ' + cls + '"><div class="l"><span>' + label + '</span><span><b>' + n0(cur) + '</b><span class="muted"> / ' + n0(tgt) + ' g</span></span></div><div class="t"><i style="width:' + pct + '%"></i></div></div>';
  }

  function render() {
    try {
      renderUnsafe();
      if (D.preview) parent.postMessage({ type: 'coachjp:ready' }, '*');
    } catch (err) {
      window.__cjpFail && window.__cjpFail(err);
    }
  }

  function renderUnsafe() {
    var mode = S.mode;
    var tgt = D.targets[mode];
    var list = mealsFor(mode);
    var eaten = list.reduce(function (a, x) {
      if (!S.checks[x.m.id]) return a;
      return { p: a.p + x.t.p, c: a.c + x.t.c, f: a.f + x.t.f, k: a.k + x.kcal };
    }, { p: 0, c: 0, f: 0, k: 0 });
    var doneCount = list.filter(function (x) { return S.checks[x.m.id]; }).length;
    var color = '#38BDF8';
    var h = '';

    h += '<header class="top">' + D.mark + '<div><div class="brand">Coach JP <b>Nutrition</b></div><div class="handle">' + esc(D.handle) + '</div></div><div class="phase">' + esc(D.athlete.phase) + '</div></header>';
    h += '<div class="tag">[ PLAN NUTRICIONAL · ' + esc(D.athlete.discipline) + ' ]</div>';
    h += '<h1>' + esc(D.athlete.name) + '</h1>';
    if (D.coachNote) h += '<p class="note">' + esc(D.coachNote) + '</p>';

    h += '<div class="switch ' + mode + '"><span class="knob"></span><button data-mode="on" class="' + (mode === 'on' ? 'on' : '') + '">MODO DÍA ON</button><button data-mode="off" class="' + (mode === 'off' ? 'on' : '') + '">MODO DÍA OFF</button></div>';

    h += '<section class="card"><div class="tag" style="margin-bottom:10px">[ OBJETIVO DE HOY · ' + (mode === 'on' ? 'DÍA ON · ENTRENO' : 'DÍA OFF · DESCANSO') + ' ]</div>';
    h += '<div class="hero"><div class="ring">' + ring(tgt.kcal ? eaten.k / tgt.kcal : 0, color) + '<div class="v"><b>' + Math.round(tgt.kcal ? (eaten.k / tgt.kcal) * 100 : 0) + '%</b><span>DEL DÍA</span></div></div>';
    h += '<div><div class="kcal">' + n0(tgt.kcal) + '<small>KCAL</small></div><div class="prog" style="margin-top:8px">' + n0(eaten.k) + ' kcal comidas · ' + doneCount + ' de ' + list.length + ' comidas</div></div></div>';
    h += '<div class="bars">' + bar('p', 'Proteína', eaten.p, tgt.p) + bar('c', 'Carbohidratos', eaten.c, tgt.c) + bar('f', 'Grasas', eaten.f, tgt.f) + '</div>';
    h += '</section>';

    D.protocols.forEach(function (p) {
      h += '<section class="card alert"><div class="tag" style="margin-bottom:6px">[ ' + esc(p.tag) + ' ]</div><div style="font-weight:700;font-size:16px;color:#FFFFFF">' + esc(p.title) + '</div><p class="muted" style="font-size:13px;margin-top:4px">' + esc(p.body) + '</p></section>';
    });

    h += '<div class="sec"><span class="tag">[ COMIDAS DEL DÍA ]</span><span class="prog">Tocá un alimento para cambiarlo</span></div>';
    list.forEach(function (x) {
      var m = x.m;
      var done = !!S.checks[m.id];
      h += '<section class="card meal' + (done ? ' done' : '') + '">';
      h += '<div class="hd"><span class="time">' + esc(m.time) + '</span><div><div class="nm">' + esc(m.name) + '</div><div class="mm">' + n0(x.kcal) + ' kcal · ' + n0(x.t.p) + ' g de proteína</div></div><button class="chk" data-check="' + m.id + '" aria-label="Marcar bloque">' + CHECK + '</button></div>';
      h += '<div class="items">';
      x.items.forEach(function (it) {
        var canSwap = it.foodId && D.foods[it.foodId] && D.swapGroups[D.foods[it.foodId].group] > 1 || it.swappedFrom;
        var hint = unitHint(it);
        h += '<button class="item" ' + (canSwap ? 'data-swap="' + m.id + '|' + it.id + '"' : 'disabled') + '><span class="g">' + n0(it.grams) + ' g' + (hint ? '<em>' + hint + '</em>' : '') + '</span><span class="fd">' + esc(it.food) + (it.swappedFrom ? '<s>Reemplaza a: ' + esc(it.swappedFrom) + '</s>' : '') + '</span>' + (canSwap ? '<span class="sw">Cambiar</span>' : '') + '</button>';
      });
      h += '</div>';
      if (!m.mps) h += '<div class="leu na"><span class="dot"></span>Energía para entrenar · carbohidratos de rápida absorción</div>';
      else if (x.t.l >= D.threshold) h += '<div class="leu ok"><span class="dot"></span>[ mTOR / MPS: ACTIVADO • ' + n1(x.t.l) + ' g LEUCINA ]</div>';
      else h += '<div class="leu low"><span class="dot"></span>[ SUB-UMBRAL mTOR • ' + n1(x.t.l) + ' g LEUCINA ] · ' + leuTip(D.threshold - x.t.l) + '</div>';
      h += '</section>';
    });

    if (D.supplements.length) {
      h += '<div class="sec"><span class="tag">[ SUPLEMENTOS ]</span></div><section class="card">';
      D.supplements.forEach(function (s) {
        var done = !!S.checks['sup:' + s.id];
        h += '<button class="sup' + (done ? ' done' : '') + '" data-check="sup:' + esc(s.id) + '"><span class="chk">' + CHECK + '</span><span style="flex:1"><b>' + esc(s.name) + '</b><div class="ds"><em>Cuánto</em>' + esc(s.dose) + '</div><div class="tm"><em>Cuándo</em>' + esc(s.timing) + '</div>' + (s.doi ? '<a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener">[ ' + esc(s.evidence) + ' ]</a>' : '') + '</span></button>';
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
    if (S.install) return renderInstall(bg, sh);
    if (!S.sheet) { bg.className = 'sheet-bg'; sh.className = 'sheet'; return; }
    var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
    var orig = meal && meal.items.filter(function (i) { return i.id === S.sheet.item; })[0];
    if (!orig) { S.sheet = null; return renderSheet(); }
    var from = D.foods[orig.foodId];
    var anchor = D.anchors[from.group];
    var cur = S.swaps[orig.id] || orig.foodId;
    var label = { p: 'proteína', c: 'carbohidratos', f: 'grasas' }[anchor];
    var h = '<div class="grab"></div><div class="tag">[ CAMBIAR ALIMENTO · ' + esc(D.groupLabels[from.group]) + ' ]</div>';
    h += '<p class="muted" style="font-size:13px;margin:6px 0 4px">Cualquiera de estas opciones aporta lo mismo en ' + label + ' (' + n0(from[anchor] * orig.grams / 100) + ' g).</p>';
    Object.keys(D.foods).forEach(function (id) {
      var f = D.foods[id];
      if (f.group !== from.group || !(f[anchor] > 0)) return;
      var g = id === orig.foodId ? orig.grams : Math.round((from[anchor] * orig.grams) / f[anchor] / 5) * 5;
      var k = g / 100;
      h += '<button class="opt' + (id === cur ? ' cur' : '') + '" data-pick="' + id + '"><span class="g">' + n0(g) + ' g</span><span class="fd">' + esc(f.name) + (id === orig.foodId ? ' · original' : '') + '<span>' + (unitHintFor(id, g) ? unitHintFor(id, g) + ' · ' : '') + n0(f.p * k) + ' g proteína · ' + n0(f.c * k) + ' g carbos · ' + n0(f.f * k) + ' g grasas</span></span></button>';
    });
    sh.innerHTML = h;
    bg.className = 'sheet-bg open';
    sh.className = 'sheet open';
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /** Guía táctica de instalación paso a paso (cuando no hay prompt nativo). */
  function renderInstall(bg, sh) {
    var tab = S.install;
    var steps = tab === 'ios'
      ? ['Abrí este link en <b>Safari</b> (en Chrome de iPhone no aparece la opción).', 'Tocá <b>Compartir</b> (cuadrado con flecha hacia arriba ⬆).', 'Deslizá y elegí <b>«Agregar a inicio»</b>.', 'Tocá <b>Agregar</b>: el ícono Nutrition queda en tu pantalla.']
      : ['Abrí este link en <b>Chrome</b>.', 'Tocá el menú <b>⋮</b> (arriba a la derecha).', 'Elegí <b>«Instalar app»</b> o «Agregar a la pantalla principal».', 'Confirmá <b>Instalar</b>: la app abre a pantalla completa y funciona sin señal.'];
    var h = '<div class="grab"></div>' + D.markSm + '<div class="tag" style="margin-top:10px">[ INSTALAR APP · GUÍA PASO A PASO ]</div><h3>Llevá tu plan en el celular</h3>';
    h += '<div class="tabs"><button data-itab="ios" class="' + (tab === 'ios' ? 'on' : '') + '">IPHONE</button><button data-itab="android" class="' + (tab === 'android' ? 'on' : '') + '">ANDROID</button></div>';
    h += '<ol class="steps">' + steps.map(function (t, i) { return '<li><span class="n">' + (i + 1) + '</span><span>' + t + '</span></li>'; }).join('') + '</ol>';
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
    var el = e.target.closest('[data-mode],[data-check],[data-swap],[data-pick],[data-itab],#sheet-bg,#install,#reset');
    if (!el) return;
    if (el.dataset.itab) {
      S.install = el.dataset.itab;
      return renderSheet();
    }
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
      S.install = null;
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
      toast('Alimento cambiado · porciones recalculadas');
    } else if (el.id === 'sheet-bg') {
      S.sheet = null;
      S.install = null;
      renderSheet();
    } else if (el.id === 'install') {
      install();
    } else if (el.id === 'reset') {
      S.checks = {};
      store.set('checks:' + today, S.checks);
      render();
      toast('Checklist del día reiniciado');
    }
  });

  // ---- Instalación PWA (Chrome/Android: prompt nativo · iOS: Compartir → Agregar a inicio)
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { deferred = null; toast('App instalada · ya la tenés en tu inicio'); });
  function install() {
    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return toast('YA ESTÁ INSTALADA EN TU PANTALLA DE INICIO');
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; });
    } else {
      S.sheet = null;
      S.install = isIOS() ? 'ios' : 'android';
      renderSheet();
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
`;

export default runtime;
