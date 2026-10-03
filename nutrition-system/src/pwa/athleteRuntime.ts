// Runtime vanilla JS de la PWA del atleta. Se embebe como texto inline en el index.html exportado.
// Es un string (no un módulo importado) para que ningún bundler le inyecte código de HMR o helpers.
// Regla: sin backticks ni interpolaciones de template dentro del runtime.
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

  function isoDay(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  var now = new Date();
  var today = isoDay(now);
  var monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  var weekKey = isoDay(monday);

  var S = {
    mode: D.preview ? D.initialMode : store.get('mode', D.initialMode),
    checks: store.get('checks:' + today, {}),
    swaps: store.get('swaps', {}),
    water: store.get('water:' + today, 0),
    shop: store.get('shop:' + weekKey, {}),
    sheet: null,
    panel: null,
    itab: 'ios',
    photo: null,
    dialOpen: store.get('dialOpen', false),
    extras: store.get('extras:' + today, {}),
    aiCfg: false,
    scan: null,
    scanBusy: false,
    scanErr: null,
    phMeal: '',
    phNote: '',
  };

  // Clave de IA propia del atleta: vive SOLO en el localStorage de este dispositivo (nunca en el plan exportado).
  var AI_KEY = 'coachjp-pwa:gemini-key';
  function getKey() { try { return localStorage.getItem(AI_KEY) || ''; } catch (e) { return mem[AI_KEY] || ''; } }
  function setKey(v) { mem[AI_KEY] = v; try { v ? localStorage.setItem(AI_KEY, v) : localStorage.removeItem(AI_KEY); } catch (e) {} }

  function isStandalone() {
    try { return !!(window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
  }

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var n0 = function (n) { return Math.round(n).toLocaleString('es-AR'); };
  var n1 = function (n) { return (Math.round(n * 10) / 10).toLocaleString('es-AR'); };
  var L = function (ml) { return (Math.round(ml / 50) / 20).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  // ---------- Datos del día ----------
  var MACRO_GROUPS = { p: ['lean-protein', 'dairy-protein', 'eggs'], c: ['cereal', 'starch', 'fruit', 'sport-carb'], f: ['fat'] };
  var ANCHOR_LABEL = { p: 'proteína', c: 'carbohidratos', f: 'grasas' };
  function kcal100(f) { return f.p * 4 + f.c * 4 + f.f * 9; }

  // Origen de un swap (valores por 100 g): alimento de la base o alimento libre (IA) por macro principal.
  function srcOf(it) {
    if (it.foodId && D.foods[it.foodId]) {
      var f = D.foods[it.foodId], an = D.anchors[f.group];
      return { name: f.name, group: f.group, anchor: an, p: f.p, c: f.c, f: f.f, groups: [f.group] };
    }
    if (!(it.grams > 0)) return null;
    var k = 100 / it.grams, p = it.p * k, c = it.c * k, fa = it.f * k;
    if (p + c + fa <= 0) return null;
    var mp = it.macroPrincipal;
    var a = mp === 'protein' ? 'p' : mp === 'carbs' ? 'c' : mp === 'fat' ? 'f' : (p * 4 >= c * 4 && p * 4 >= fa * 9 ? 'p' : c * 4 >= fa * 9 ? 'c' : 'f');
    return { name: it.food, group: null, anchor: a, p: p, c: c, f: fa, groups: MACRO_GROUPS[a] };
  }

  function eqGrams(src, grams, to) {
    var a = src.anchor;
    return to[a] > 0 ? Math.max(5, Math.round((src[a] * grams) / to[a] / 5) * 5) : grams;
  }

  // Equivalencias calculadas: mismo aporte del macro ancla, ordenadas por densidad calórica más parecida.
  function swapOptions(orig) {
    var src = orig && srcOf(orig);
    if (!src) return [];
    var dens = kcal100(src);
    return Object.keys(D.foods)
      .filter(function (id) { var f = D.foods[id]; return id !== orig.foodId && src.groups.indexOf(f.group) >= 0 && f[src.anchor] > 0; })
      .map(function (id) { var f = D.foods[id]; return { id: id, f: f, g: eqGrams(src, orig.grams, f), d: Math.abs(kcal100(f) - dens) }; })
      .sort(function (a, b) { return a.d - b.d; })
      .slice(0, 6);
  }

  function resolveItem(it) {
    var sw = S.swaps[it.id];
    if (!sw || !D.foods[sw]) return it;
    var src = srcOf(it);
    if (!src) return it;
    var to = D.foods[sw];
    var grams = eqGrams(src, it.grams, to);
    var k = grams / 100;
    return { id: it.id, foodId: sw, food: to.name, grams: grams, p: to.p * k, c: to.c * k, f: to.f * k, leucine: to.leucine * k, swappedFrom: src.name };
  }

  function mealsFor(mode) {
    var base = D.meals.filter(function (m) { return m.day === 'both' || m.day === mode; });
    var out = S.extras.__out;
    if (out && out.length) base = base.concat([{ id: '__out', name: 'Fuera del plan · análisis IA', time: out[0].at || '12:00', day: mode, role: 'snack', mps: false, items: [] }]);
    return base
      .sort(function (a, b) { return a.time.localeCompare(b.time); })
      .map(function (m) {
        var items = m.items.map(resolveItem).concat(S.extras[m.id] || []);
        var t = items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
        return { m: m, items: items, t: t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
      });
  }

  function unitHintFor(foodId, grams) {
    var ref = foodId && D.foods[foodId];
    if (!ref || !ref.unit) return '';
    var q = grams / ref.unit.grams;
    if (q < 0.5) return '';
    var qq = Math.round(q * 2) / 2, lab = ref.unit.label;
    return '≈ ' + n1(qq) + ' ' + esc(qq > 1 && lab.length > 3 ? (/ón$/.test(lab) ? lab.slice(0, -2) + 'ones' : lab + 's') : lab);
  }

  function leuTip(need) {
    var egg = D.foods.huevo ? D.foods.huevo.leucine * 0.5 : 0.55;
    var whey = D.foods.whey ? D.foods.whey.leucine / 100 : 0.085;
    var eggs = Math.max(1, Math.ceil(need / egg));
    var g = Math.max(5, Math.ceil(need / whey / 5) * 5);
    return 'Sumá ' + eggs + ' huevo' + (eggs > 1 ? 's' : '') + ' o ' + g + ' g de whey';
  }

  function toMin(hhmm) { var p = String(hhmm || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function fmtDur(min) { var h = Math.floor(min / 60), m = Math.round(min % 60); return h ? h + ' h ' + (m < 10 ? '0' : '') + m + ' min' : m + ' min'; }

  // ---------- 1 · Gauge semi-arco ----------
  function arcD(cx, cy, r) { return 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy; }

  // Día completado: todas las comidas tildadas y kcal dentro de ±10 % del plan → adherencia total (no "faltan" kcal).
  var ADHERENCE_TOL = 0.1;

  function gauge(tgt, eaten, complete) {
    var r = 118, len = Math.PI * r, pct = complete ? 1 : tgt.kcal ? Math.min(1, eaten.k / tgt.kcal) : 0;
    var left = tgt.kcal - eaten.k;
    var ticks = '';
    for (var i = 0; i <= 20; i++) {
      var a = Math.PI - (i / 20) * Math.PI, r1 = i % 5 ? 132 : 128, r2 = 138;
      ticks += '<line x1="' + (150 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (146 - r1 * Math.sin(a)).toFixed(1) + '" x2="' + (150 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (146 - r2 * Math.sin(a)).toFixed(1) + '" stroke="rgba(148,163,184,' + (i % 5 ? '.25' : '.55') + ')" stroke-width="1.2"/>';
    }
    var h = '<div class="gauge"><svg viewBox="0 0 300 156" aria-hidden="true">' + ticks;
    h += '<path d="' + arcD(150, 146, r) + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="12" stroke-linecap="round"/>';
    h += '<path d="' + arcD(150, 146, r) + '" fill="none" stroke="' + (!complete && left < 0 ? '#F97316' : '#38BDF8') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + (len * (1 - pct)).toFixed(1) + '" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)"' + (complete ? ' class="glow"' : '') + '/>';
    if (complete) {
      h += '</svg><div class="gv done"><div class="glabel">[ DÍA COMPLETADO · ADHERENCIA TOTAL ]</div><div class="gnum">OBJETIVO</div><div class="gsub">' + n0(eaten.k) + ' / ' + n0(tgt.kcal) + ' kcal · ' + n0((eaten.k / tgt.kcal) * 100) + ' % del plan</div></div></div>';
    } else {
      h += '</svg><div class="gv"><div class="glabel">' + (left >= 0 ? 'KCAL RESTANTES' : 'KCAL EXCEDIDAS') + '</div><div class="gnum' + (left < 0 ? ' over' : '') + '">' + n0(Math.abs(left)) + '</div><div class="gsub">' + n0(eaten.k) + ' / ' + n0(tgt.kcal) + ' kcal</div></div></div>';
    }
    h += '<div class="minis">' + mini('PROTEÍNA', eaten.p, tgt.p, '#38BDF8', complete) + mini('CARBOS', eaten.c, tgt.c, '#7DD3FC', complete) + mini('GRASAS', eaten.f, tgt.f, '#F97316', complete) + '</div>';
    return h;
  }

  function mini(label, cur, tgt, color, complete) {
    var r = 34, len = Math.PI * r, pct = complete ? 1 : tgt ? Math.min(1, cur / tgt) : 0;
    if (complete) color = '#38BDF8';
    return '<div class="mini' + (complete ? ' done' : '') + '"><svg viewBox="0 0 84 46" aria-hidden="true"><path d="' + arcD(42, 42, r) + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6" stroke-linecap="round"/><path d="' + arcD(42, 42, r) + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + (len * (1 - pct)).toFixed(1) + '" style="transition:stroke-dashoffset .6s"/></svg><b>' + n0(cur) + '<i>/' + n0(tgt) + ' g</i></b><span>' + label + '</span></div>';
  }

  // ---------- 2 · Hidratación ----------
  function hydration(mode) {
    var goal = mode === 'on' ? D.hydration.onMl : D.hydration.offMl;
    var cups = Math.ceil(goal / 250), full = Math.floor(S.water / 250);
    var h = '<section class="card"><div class="row"><span class="tag">[ HIDRATACIÓN · META ' + L(goal) + ' L · DÍA ' + mode.toUpperCase() + ' ]</span><span class="hv">' + L(S.water) + ' / ' + L(goal) + ' L</span></div><div class="cups">';
    for (var i = 0; i < cups; i++) h += '<button class="cup' + (i < full ? ' on' : '') + '" data-cup="' + i + '" aria-label="Vaso ' + (i + 1) + '"><i></i></button>';
    h += '</div><div class="wbtns"><button data-water="250">+250 ml</button><button data-water="500">+500 ml</button><button data-water="0" class="ghost">Reiniciar</button></div>';
    if (S.water >= goal) h += '<div class="ok-line">✓ META DE HIDRATACIÓN CUMPLIDA</div>';
    return h + '</section>';
  }

  // ---------- 3 · Dial peri-entreno 24 h ----------
  function polar(r, min) { var a = (min / 1440) * 2 * Math.PI - Math.PI / 2; return [110 + r * Math.cos(a), 110 + r * Math.sin(a)]; }
  function arc(r, m0, m1) {
    if (m1 < m0) m1 += 1440;
    var p0 = polar(r, m0), p1 = polar(r, m1), large = m1 - m0 > 720 ? 1 : 0;
    return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }

  function dial(mode, list) {
    var start = toMin(D.training.time), end = start + D.training.minutes, nowMin = now.getHours() * 60 + now.getMinutes();
    var inWindow = mode === 'on' && nowMin >= start - 90 && nowMin <= end + 60;
    var next = null;
    list.forEach(function (x) { var t = toMin(x.m.time); if (!S.checks[x.m.id] && t >= nowMin && (!next || t < toMin(next.m.time))) next = x; });
    var info = next
      ? '<b>' + esc(next.m.name) + '</b><span>' + esc(next.m.time) + ' · en ' + fmtDur(toMin(next.m.time) - nowMin) + '</span>'
      : '<b>Sin comidas pendientes</b><span>Plan del día al día</span>';
    var rel = '';
    if (mode === 'on') {
      if (nowMin < start) rel = 'Sesión ' + esc(D.training.time) + ' · en ' + fmtDur(start - nowMin);
      else if (nowMin <= end) rel = 'SESIÓN EN CURSO · quedan ' + fmtDur(end - nowMin);
      else rel = 'Sesión terminada hace ' + fmtDur(nowMin - end);
    }
    var sess = mode === 'on'
      ? '<em class="' + (inWindow ? 'hot' : '') + '">' + (inWindow ? 'VENTANA PERI-ENTRENO ACTIVA · ' : '') + rel + '</em>'
      : '<em>DÍA OFF · sin sesión</em>';
    var nowLbl = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

    var h = '<section class="card dialcard"><button class="dial-hd" data-dial="1" aria-expanded="' + (S.dialOpen ? 'true' : 'false') + '"><span class="tag">[ DIAL PERI-ENTRENO · 24 H ]</span>';
    h += '<span class="dial-peek">' + (S.dialOpen ? '' : (next ? esc(next.m.time) + ' · ' + esc(next.m.name) : 'Día completo')) + '</span><span class="chev' + (S.dialOpen ? ' up' : '') + '"></span></button>';
    if (!S.dialOpen) return h + '</section>';

    var hand = inWindow ? '#F97316' : '#38BDF8';
    var s = '<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="86" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="10"/>';
    if (mode === 'on') {
      s += '<path d="' + arc(86, (start - 90 + 1440) % 1440, (end + 60) % 1440) + '" fill="none" stroke="rgba(56,189,248,.22)" stroke-width="16"/>';
      s += '<path d="' + arc(86, start, end % 1440) + '" fill="none" stroke="#F97316" stroke-width="10" stroke-linecap="round"/>';
    }
    for (var hr = 0; hr < 24; hr++) {
      var a = polar(hr % 6 ? 74 : 69, hr * 60), b = polar(78, hr * 60);
      s += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="rgba(148,163,184,' + (hr % 6 ? '.25' : '.7') + ')" stroke-width="' + (hr % 6 ? 1.2 : 1.8) + '"/>';
    }
    [[0, '24:00'], [6, '06:00'], [12, '12:00'], [18, '18:00']].forEach(function (q) {
      var t = polar(q[0] % 12 ? 50 : 56, q[0] * 60);
      s += '<text x="' + t[0].toFixed(1) + '" y="' + (t[1] + 3.5).toFixed(1) + '" text-anchor="middle" class="dl">' + q[1] + '</text>';
    });
    list.forEach(function (x) {
      var p = polar(86, toMin(x.m.time)), done = !!S.checks[x.m.id], peri = x.m.role === 'peri' || x.m.role === 'post';
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5.5" fill="' + (done ? '#38BDF8' : '#131B2A') + '" stroke="' + (peri ? '#F97316' : '#38BDF8') + '" stroke-width="2"/>';
    });
    // Aguja de la hora actual: llega al anillo, con halo y color de la ventana (naranja = peri-entreno activo).
    var tip = polar(86, nowMin);
    s += '<line x1="110" y1="110" x2="' + tip[0].toFixed(1) + '" y2="' + tip[1].toFixed(1) + '" stroke="' + hand + '" stroke-width="2.4" stroke-linecap="round"/>';
    s += '<circle cx="' + tip[0].toFixed(1) + '" cy="' + tip[1].toFixed(1) + '" r="9" fill="' + hand + '" opacity=".25"><animate attributeName="r" values="7;11;7" dur="2s" repeatCount="indefinite"/></circle>';
    s += '<circle cx="' + tip[0].toFixed(1) + '" cy="' + tip[1].toFixed(1) + '" r="4.5" fill="' + hand + '" stroke="#0B0F17" stroke-width="1.5"/>';
    s += '<circle cx="110" cy="110" r="3.5" fill="#FFFFFF"/>';
    s += '<text x="110" y="132" text-anchor="middle" class="dnow" fill="' + hand + '">AHORA ' + nowLbl + '</text></svg>';

    h += '<div class="dial">' + s + '<div class="dinfo"><small>PRÓXIMA INGESTA</small>' + info + sess + '</div></div>';
    h += '<div class="legend"><span><i class="lg-s"></i>Sesión</span><span><i class="lg-w"></i>Ventana peri</span><span><i class="lg-m"></i>Comida</span><span><i class="lg-p"></i>Peri / post</span><span><i class="lg-n"></i>Ahora</span></div></section>';
    return h;
  }

  // ---------- 4 · Lista de compras semanal ----------
  function shoppingList() {
    var onDays = Math.max(0, Math.min(7, D.trainingDays)), mult = { on: onDays, off: 7 - onDays, both: 7 };
    var acc = {};
    D.meals.forEach(function (m) {
      m.items.map(resolveItem).forEach(function (it) {
        var key = it.foodId || 'x:' + it.food;
        if (!acc[key]) acc[key] = { name: it.food, foodId: it.foodId, grams: 0 };
        acc[key].grams += it.grams * mult[m.day];
      });
    });
    var groups = {};
    Object.keys(acc).forEach(function (k) {
      var it = acc[k], ref = it.foodId && D.foods[it.foodId];
      var cat = ref ? D.categories[ref.group] || 'Otros' : 'Otros';
      (groups[cat] = groups[cat] || []).push({ key: k, name: it.name, grams: it.grams, hint: unitHintFor(it.foodId, it.grams) });
    });
    if (D.supplements.length) groups['Suplementos'] = (groups['Suplementos'] || []).concat(D.supplements.map(function (s) { return { key: 'sup:' + s.id, name: s.name, dose: s.dose }; }));
    return D.categoryOrder.filter(function (c) { return groups[c]; }).map(function (c) {
      return { cat: c, items: groups[c].sort(function (a, b) { return (b.grams || 0) - (a.grams || 0); }) };
    });
  }

  function qty(g) { return g >= 1000 ? n1(g / 1000) + ' kg' : n0(Math.round(g / 10) * 10) + ' g'; }

  function shopText(list) {
    var t = 'LISTA DE COMPRAS SEMANAL · ' + D.athlete.name + '\n';
    list.forEach(function (g) {
      t += '\n' + g.cat.toUpperCase() + '\n';
      g.items.forEach(function (i) { t += '- ' + i.name + ': ' + (i.dose ? i.dose : qty(i.grams) + (i.hint ? ' (' + i.hint.replace('≈ ', '≈') + ')' : '')) + '\n'; });
    });
    return t + '\n' + D.handle;
  }

  // ---------- Paneles (sheet inferior) ----------
  function open(bg, sh, h) { sh.innerHTML = '<div class="grab"></div>' + h; bg.className = 'sheet-bg open'; sh.className = 'sheet open'; }

  function renderPanel(bg, sh) {
    if (S.panel === 'install') {
      var steps = S.itab === 'ios'
        ? ['Abrí este link en <b>Safari</b> (en Chrome de iPhone no aparece la opción).', 'Tocá <b>Compartir</b> (cuadrado con flecha hacia arriba ⬆).', 'Deslizá y elegí <b>«Agregar a inicio»</b>.', 'Tocá <b>Agregar</b>: el ícono Nutrition queda en tu pantalla.']
        : ['Abrí este link en <b>Chrome</b>.', 'Tocá el menú <b>⋮</b> (arriba a la derecha).', 'Elegí <b>«Instalar app»</b> o «Agregar a la pantalla principal».', 'Confirmá <b>Instalar</b>: la app abre a pantalla completa y funciona sin señal.'];
      var h = D.markSm + '<div class="tag" style="margin-top:10px">[ INSTALAR APP · GUÍA PASO A PASO ]</div><h3>Llevá tu plan en el celular</h3>';
      h += '<div class="tabs"><button data-itab="ios" class="' + (S.itab === 'ios' ? 'on' : '') + '">IPHONE</button><button data-itab="android" class="' + (S.itab === 'android' ? 'on' : '') + '">ANDROID</button></div>';
      h += '<ol class="steps">' + steps.map(function (t, i) { return '<li><span class="n">' + (i + 1) + '</span><span>' + t + '</span></li>'; }).join('') + '</ol>';
      return open(bg, sh, h);
    }
    if (S.panel === 'shop') {
      var list = shoppingList();
      var h2 = '<div class="tag">[ LISTA DE COMPRAS · SEMANA DEL ' + weekKey.split('-').reverse().join('/') + ' ]</div><h3>Totales para 7 días</h3><p class="muted" style="font-size:12.5px">' + D.trainingDays + ' días ON + ' + (7 - D.trainingDays) + ' días OFF · incluye tus cambios de alimentos. Pesos en cocido.</p>';
      list.forEach(function (g) {
        h2 += '<div class="shop-cat">' + esc(g.cat) + '</div>';
        g.items.forEach(function (i) {
          var on = !!S.shop[i.key];
          h2 += '<button class="shop-item' + (on ? ' done' : '') + '" data-shopcheck="' + esc(i.key) + '"><span class="chk">' + CHECK + '</span><span class="sn">' + esc(i.name) + '</span><span class="sq">' + (i.dose ? esc(i.dose) : qty(i.grams) + (i.hint ? '<em>' + i.hint + '</em>' : '')) + '</span></button>';
        });
      });
      h2 += '<div class="wbtns" style="margin-top:14px"><button data-copyshop="1">Copiar lista</button><button data-shopreset="1" class="ghost">Desmarcar todo</button></div>';
      return open(bg, sh, h2);
    }
    if (S.panel === 'out') {
      var rules = [
        ['Proteína primero', 'Elegí una proteína del tamaño de tu palma (bife, pollo, pescado a la plancha): ~30-40 g de proteína.'],
        ['Carbos según el día', 'Día ON: 1 porción de arroz, papa o pasta. Día OFF: cambiala por ensalada o vegetales grillados.'],
        ['Grasas a la vista', 'Aderezos aparte. Evitá frituras y rebozados: milanesa al horno antes que frita.'],
        ['Parrilla inteligente', 'Cortes magros (lomo, entraña, vacío desgrasado, pollo). Achuras y chorizo, de a uno y compartido.'],
        ['Pizza / empanadas', '2-3 porciones + ensalada. Sumá una fuente de proteína en la comida siguiente.'],
        ['Bebidas', 'Agua o soda. Alcohol: máximo 1-2 copas y nunca en la ventana post-entreno.'],
        ['Postre', 'Fruta o compartido. Si te pasaste, no compenses salteando comidas: retomá el plan en la próxima.'],
        ['Si sabés que salís', 'Guardá ~20-30 % de los carbos del día (menos en el almuerzo) y usá ese margen en la salida.'],
      ];
      var h3 = '<div class="tag">[ GUÍA TÁCTICA · COMER FUERA DE CASA ]</div><h3>Rescate gastronómico</h3><p class="muted" style="font-size:12.5px">Reglas directas para eventos sociales. Tocá cada regla para expandirla.</p>';
      rules.forEach(function (r, i) { h3 += '<details class="rule"' + (i === 0 ? ' open' : '') + '><summary><span class="n">' + (i + 1) + '</span>' + esc(r[0]) + '</summary><p>' + esc(r[1]) + '</p></details>'; });
      return open(bg, sh, h3);
    }
    if (S.panel === 'photo') {
      var meals = mealsFor(S.mode).filter(function (x) { return x.m.id !== '__out'; });
      var key = getKey();
      var h4 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ REVISIÓN DE COMIDA · FOTO ]</div><h3>' + (key ? 'Analizá tu plato con IA' : 'Mandale tu plato al coach') + '</h3>';
      h4 += '<p class="muted" style="font-size:12.5px">' + (key
        ? 'El análisis corre directo en tu celular con tu propia clave de Gemini. También podés mandarle la foto a tu coach.'
        : 'La foto viaja a tu coach por WhatsApp. Si cargás tu propia clave de Gemini, la app analiza el plato acá mismo.') + '</p>';
      if (S.photo) h4 += '<img class="ph" src="' + S.photo.url + '" alt="Foto del plato">';
      h4 += '<label class="lbl">¿Qué comida es?</label><select id="ph-meal" class="inp">' + meals.map(function (x) {
        return '<option value="' + esc(x.m.id) + '"' + (S.phMeal === x.m.id ? ' selected' : '') + '>' + esc(x.m.time + ' · ' + x.m.name) + '</option>';
      }).join('') + '<option value="__out"' + (S.phMeal === '__out' ? ' selected' : '') + '>Fuera del plan</option></select>';
      h4 += '<label class="lbl">Nota (opcional)</label><textarea id="ph-note" class="inp" rows="2" placeholder="Ej: comí afuera, cambié el arroz por papas">' + esc(S.phNote) + '</textarea>';

      if (S.scanBusy) h4 += '<div class="scan-busy"><span class="spin"></span>' + esc(S.scanBusy) + '</div>';
      if (S.scanErr) h4 += '<div class="scan-err">⚠ ' + esc(S.scanErr) + '</div>';
      if (S.scan) h4 += scanCard(S.scan);

      h4 += '<div class="wbtns" style="margin-top:12px"><button data-photo="retake" class="ghost">Otra foto</button>';
      if (key) h4 += '<button data-photo="ai" class="cta"' + (S.scanBusy ? ' disabled' : '') + '>[ ANALIZAR PLATO CON IA ]</button></div><div class="wbtns"><button data-photo="send" class="ghost">Enviar foto por WhatsApp al coach</button></div>';
      else h4 += '<button data-photo="send" class="cta">Enviar foto por WhatsApp al coach</button></div>';

      h4 += '<button class="cfg-link" data-aicfg="toggle">[ ⚙ CONFIGURAR MOTOR IA ]' + (key ? ' · CLAVE ACTIVA' : '') + '</button>';
      if (S.aiCfg) {
        h4 += '<div class="cfg"><label class="lbl" style="margin-top:0">API Key de Google Gemini</label><input id="ai-key" class="inp" type="password" autocomplete="off" spellcheck="false" placeholder="AIza..." value="' + esc(key) + '">';
        h4 += '<p class="muted" style="font-size:11.5px;margin-top:6px">Se guarda solo en este dispositivo (localStorage), nunca se envía a tu coach ni queda en el plan. Modelo: gemini-3.5-flash-lite con respaldo gemini-3.5-flash. Creá tu clave gratis en aistudio.google.com.</p>';
        h4 += '<div class="wbtns"><button data-aicfg="save">Guardar clave</button>' + (key ? '<button data-aicfg="clear" class="ghost">Borrar clave</button>' : '') + '</div></div>';
      }
      return open(bg, sh, h4);
    }
  }

  function scanCard(r) {
    var color = r.score >= 70 ? '#38BDF8' : r.score >= 40 ? '#F97316' : '#EF4444';
    var h = '<div class="scan"><div class="row"><div style="min-width:0"><div class="tag">[ DESGLOSE DEL PLATO ]</div><b class="scan-nm">' + esc(r.dishName) + '</b></div>';
    h += '<div class="score" style="border-color:' + color + ';color:' + color + '"><b>' + r.score + '</b><span>SCORE TÁCTICO</span></div></div>';
    if (r.reason) h += '<p class="muted" style="font-size:12px;margin-top:4px">' + esc(r.reason) + '</p>';
    h += '<div class="scan-items">';
    r.items.forEach(function (i) {
      h += '<div class="scan-it"><span class="g">' + n0(i.grams) + ' g</span><span class="fd">' + esc(i.food) + '</span><span class="mc">P' + n0(i.p) + ' C' + n0(i.c) + ' G' + n0(i.f) + '</span></div>';
    });
    var t = r.items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
    h += '</div><div class="scan-tot"><b>' + n0(t.p * 4 + t.c * 4 + t.f * 9) + ' kcal</b><span>P ' + n0(t.p) + ' g</span><span>C ' + n0(t.c) + ' g</span><span>G ' + n0(t.f) + ' g</span><span class="' + (t.l >= D.threshold ? 'ok' : 'lo') + '">LEU ' + n1(t.l) + ' g</span></div>';
    if (r.tips && r.tips.length) h += '<ul class="tips">' + r.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    h += '<button class="add-meal" data-photo="add">[ + AGREGAR A LA COMIDA SELECCIONADA ]</button></div>';
    return h;
  }

  function renderSheet() {
    var bg = $('#sheet-bg'), sh = $('#sheet');
    if (S.panel) return renderPanel(bg, sh);
    if (!S.sheet) { bg.className = 'sheet-bg'; sh.className = 'sheet'; return; }
    var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
    var orig = meal && meal.items.filter(function (i) { return i.id === S.sheet.item; })[0];
    if (!orig) { S.sheet = null; return renderSheet(); }
    var src = srcOf(orig);
    if (!src) { S.sheet = null; return renderSheet(); }
    var cur = S.swaps[orig.id];
    var opts = swapOptions(orig);
    var ok = function (f, g) { var k = g / 100; return n0(f.p * k) + ' P · ' + n0(f.c * k) + ' C · ' + n0(f.f * k) + ' G'; };
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ SMART SWAP · ' + esc(src.group ? D.groupLabels[src.group] : 'EQUIVALENCIA POR ' + ANCHOR_LABEL[src.anchor].toUpperCase()) + ' ]</div>';
    h += '<h3>' + esc(src.name) + ' → equivalencias</h3>';
    h += '<p class="muted" style="font-size:13px;margin:2px 0 4px">Todas aportan lo mismo en ' + ANCHOR_LABEL[src.anchor] + ' (' + n0(src[src.anchor] * orig.grams / 100) + ' g). Tocá una para reemplazar.</p>';
    h += '<button class="opt' + (!cur ? ' cur' : '') + '" data-pick="__orig"><span class="g">' + n0(orig.grams) + ' g</span><span class="fd">' + esc(orig.food) + ' · original<span>' + n0(orig.p) + ' P · ' + n0(orig.c) + ' C · ' + n0(orig.f) + ' G</span></span></button>';
    opts.forEach(function (o) {
      var hint = unitHintFor(o.id, o.g);
      h += '<button class="opt' + (o.id === cur ? ' cur' : '') + '" data-pick="' + esc(o.id) + '"><span class="g">' + n0(o.g) + ' g</span><span class="fd">' + esc(o.f.name) + '<span>' + (hint ? hint + ' · ' : '') + ok(o.f, o.g) + '</span></span><span class="go">›</span></button>';
    });
    open(bg, sh, h);
  }

  // ---------- Render principal ----------
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
    syncInstall();
    var list = mealsFor(mode);
    var eaten = list.reduce(function (a, x) {
      if (!S.checks[x.m.id]) return a;
      return { p: a.p + x.t.p, c: a.c + x.t.c, f: a.f + x.t.f, k: a.k + x.kcal };
    }, { p: 0, c: 0, f: 0, k: 0 });
    var doneCount = list.filter(function (x) { return S.checks[x.m.id]; }).length;
    var complete = list.length > 0 && doneCount === list.length && tgt.kcal > 0 && Math.abs(eaten.k / tgt.kcal - 1) <= ADHERENCE_TOL;
    var h = '';

    h += '<header class="top">' + D.mark + '<div><div class="brand">COACH JP</div><div class="badge">[ BIOENERGETICS &amp; NUTRITION ]</div></div><div class="phase">' + esc(D.athlete.phase) + '</div></header>';
    h += '<div class="tag">[ PLAN NUTRICIONAL · ' + esc(D.athlete.discipline) + ' ]</div>';
    h += '<h1>' + esc(D.athlete.name) + '</h1>';
    if (D.coachNote) h += '<p class="note">' + esc(D.coachNote) + '</p>';

    h += '<div class="switch ' + mode + '"><span class="knob"></span><button data-mode="on" class="' + (mode === 'on' ? 'on' : '') + '">MODO DÍA ON</button><button data-mode="off" class="' + (mode === 'off' ? 'on' : '') + '">MODO DÍA OFF</button></div>';

    h += '<section class="card"><div class="row"><span class="tag">[ TELEMETRÍA · ' + (mode === 'on' ? 'DÍA ON · ENTRENO' : 'DÍA OFF · DESCANSO') + ' ]</span><span class="hv">' + doneCount + '/' + list.length + ' COMIDAS</span></div>' + gauge(tgt, eaten, complete) + '</section>';

    h += '<div class="actions"><button data-panel="shop">[ LISTA DE COMPRAS ]</button><button data-panel="out">[ COMER FUERA ]</button><button data-photo="pick">' + (getKey() ? '[ FOTO · IA ]' : '[ FOTO → COACH ]') + '</button></div>';

    h += hydration(mode);
    h += dial(mode, list);

    D.protocols.forEach(function (p) {
      h += '<section class="card alert"><div class="tag" style="margin-bottom:6px">[ ' + esc(p.tag) + ' ]</div><div style="font-weight:700;font-size:16px;color:#FFFFFF">' + esc(p.title) + '</div><p class="muted" style="font-size:13px;margin-top:4px">' + esc(p.body) + '</p></section>';
    });

    h += '<div class="sec"><span class="tag">[ COMIDAS DEL DÍA ]</span><span class="prog">Tocá un alimento para cambiarlo</span></div>';
    list.forEach(function (x) {
      var m = x.m;
      var done = !!S.checks[m.id];
      h += '<section class="card meal' + (done ? ' done' : '') + '">';
      h += '<div class="hd"><span class="time">' + esc(m.time) + '</span><div><div class="nm">' + esc(m.name) + '</div><div class="mm">' + n0(x.kcal) + ' kcal · ' + n0(x.t.p) + ' g de proteína</div></div><button class="chk" data-check="' + m.id + '" aria-label="Marcar comida">' + CHECK + '</button></div>';
      h += '<div class="items">';
      x.items.forEach(function (it, idx) {
        var hint = unitHintFor(it.foodId, it.grams);
        if (it.extra) {
          h += '<div class="item extra"><span class="g">' + n0(it.grams) + ' g</span><span class="fd">' + esc(it.food) + '<s class="ia">Agregado por análisis IA · ' + n0(it.p) + ' P · ' + n0(it.c) + ' C · ' + n0(it.f) + ' G</s></span><button class="rm" data-rmextra="' + esc(m.id) + '|' + esc(it.id) + '" aria-label="Quitar">✕</button></div>';
          return;
        }
        var canSwap = !!it.swappedFrom || swapOptions(m.items[idx]).length > 0;
        h += '<button class="item" ' + (canSwap ? 'data-swap="' + m.id + '|' + it.id + '"' : 'disabled') + '><span class="g">' + n0(it.grams) + ' g' + (hint ? '<em>' + hint + '</em>' : '') + '</span><span class="fd">' + esc(it.food) + (it.swappedFrom ? '<s>Reemplaza a: ' + esc(it.swappedFrom) + '</s>' : '') + '</span>' + (canSwap ? '<span class="sw">SWAP</span>' : '') + '</button>';
      });
      h += '</div>';
      if (!m.mps) h += '<div class="leu na"><span class="dot"></span>[ BLOQUE GLUCOLÍTICO · ENERGÍA PARA ENTRENAR ]</div>';
      else if (x.t.l >= D.threshold) h += '<div class="leu ok"><span class="dot"></span>[ mTOR / MPS: ACTIVADO • ' + n1(x.t.l) + ' g LEUCINA ]</div>';
      else h += '<div class="leu low"><span class="dot"></span>[ SUB-UMBRAL mTOR • ' + n1(x.t.l) + ' g LEUCINA ] · ' + leuTip(D.threshold - x.t.l) + '</div>';
      h += '</section>';
    });

    if (D.supplements.length) {
      h += '<div class="sec"><span class="tag">[ SUPLEMENTOS · AIS GRUPO A ]</span></div><section class="card">';
      D.supplements.forEach(function (s) {
        var done = !!S.checks['sup:' + s.id];
        h += '<button class="sup' + (done ? ' done' : '') + '" data-check="sup:' + esc(s.id) + '"><span class="chk">' + CHECK + '</span><span style="flex:1"><b>' + esc(s.name) + '</b><div class="ds"><em>Cuánto</em>' + esc(s.dose) + '</div><div class="tm"><em>Cuándo</em>' + esc(s.timing) + '</div>' + (s.doi ? '<a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener">[ ' + esc(s.evidence) + ' ]</a>' : '') + '</span></button>';
      });
      h += '</section>';
    }

    h += '<div class="cites">' + D.citations.map(function (c) {
      return c.doi ? '<a href="https://doi.org/' + esc(c.doi) + '" target="_blank" rel="noopener">[ ' + esc(c.label) + ' ]</a>' : '[ ' + esc(c.label) + ' ]';
    }).join('<br>') + '</div>';
    h += '<footer class="foot">' + D.shieldSm + '<div><div class="brand" style="font-size:13px">COACH JP · <span class="muted" style="font-weight:500">HIGH PERFORMANCE SYSTEM</span></div><div class="handle">' + esc(D.handle) + ' · ACTUALIZADO ' + esc(D.generatedLabel) + '</div></div></footer>';

    var y = window.scrollY;
    $('#app').innerHTML = h;
    window.scrollTo(0, y);
    renderSheet();
  }

  // ---------- Utilidades ----------
  var tt;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(tt);
    tt = setTimeout(function () { t.className = 'toast'; }, 2200);
  }
  function haptic() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function copy(text) {
    var done = function () { toast('Copiado al portapapeles'); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    fallbackCopy(text); done();
  }
  function fallbackCopy(text) { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  function setWater(ml) { S.water = Math.max(0, Math.min(8000, ml)); store.set('water:' + today, S.water); haptic(); render(); }
  function closeSheet() { S.sheet = null; S.panel = null; renderSheet(); }

  // ---------- Foto → coach (sin claves de IA en el dispositivo) ----------
  var photoInput = document.getElementById('photo');
  if (photoInput) photoInput.addEventListener('change', function () {
    var file = photoInput.files && photoInput.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        if (S.photo) URL.revokeObjectURL(S.photo.url);
        S.photo = { blob: blob, url: URL.createObjectURL(blob) };
        S.scan = null; S.scanErr = null; S.scanBusy = false;
        S.sheet = null; S.panel = 'photo'; renderSheet();
      }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { toast('No se pudo leer la foto'); };
    img.src = url;
    photoInput.value = '';
  });

  function mealLabel(id) {
    if (id === '__out') return 'Fuera del plan';
    var m = D.meals.filter(function (x) { return x.id === id; })[0];
    return m ? m.time + ' · ' + m.name : '';
  }

  // ---------- Análisis de foto con IA en el dispositivo (Gemini, clave propia del atleta) ----------
  var GEMINI_CHAIN = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];

  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('No se pudo leer la foto')); };
      r.readAsDataURL(blob);
    });
  }

  function callGemini(key, body, i) {
    var model = GEMINI_CHAIN[i];
    S.scanBusy = i === 0 ? 'ANALIZANDO PLATO · ' + model : '[ ! ] CAMBIANDO A MODELO DE RESPALDO (' + model + ')...';
    renderSheet();
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok) {
          var parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
          var text = parts.map(function (p) { return p.text || ''; }).join('');
          if (!text) throw new Error(model + ' no devolvió contenido');
          return text;
        }
        var msg = (data.error && data.error.message) || ('Gemini respondió ' + res.status);
        var retry = res.status === 503 || res.status === 429 || res.status === 404 || res.status >= 500 || /UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|quota|no longer available|not found/i.test(msg);
        if (retry && i + 1 < GEMINI_CHAIN.length) return callGemini(key, body, i + 1);
        if (res.status === 400 && /api key|API_KEY/i.test(msg)) msg = 'La API Key no es válida. Revisala en [ ⚙ CONFIGURAR MOTOR IA ].';
        throw new Error(msg);
      });
    });
  }

  function num(v, fb) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : fb; }

  function localScore(items) {
    var t = items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
    var kc = t.p * 4 + t.c * 4 + t.f * 9 || 1, ps = (t.p * 4) / kc, fs = (t.f * 9) / kc;
    var veg = items.some(function (i) { return /ensalada|verdura|vegetal|tomate|lechuga|brocoli|zanahoria|zapallo|fruta|manzana|banana/i.test(i.food); });
    var sc = Math.min(1, ps / 0.3) * 35 + Math.min(1, t.l / D.threshold) * 25 + (veg ? 20 : 0) + (fs <= 0.35 ? 20 : Math.max(0, 20 - (fs - 0.35) * 80));
    return Math.round(Math.max(0, Math.min(100, sc)));
  }

  function analyzePhoto() {
    var key = getKey();
    if (!key || !S.photo || S.scanBusy) return;
    S.scan = null; S.scanErr = null;
    blobToB64(S.photo.blob)
      .then(function (b64) {
        return callGemini(key, {
          contents: [{ role: 'user', parts: [{ text: D.scanPrompt }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }, 0);
      })
      .then(function (text) {
        var a = text.indexOf('{'), b = text.lastIndexOf('}');
        var json = JSON.parse(a >= 0 ? text.slice(a, b + 1) : text);
        var items = (json.items || []).filter(function (i) { return i && i.food && num(i.grams, 0) > 0; }).map(function (i) {
          var p = Math.max(0, num(i.p, 0));
          return { food: String(i.food), grams: Math.round(num(i.grams, 0)), p: p, c: Math.max(0, num(i.c, 0)), f: Math.max(0, num(i.f, 0)), leucine: Math.max(0, num(i.leucine, p * 0.08)) };
        });
        if (!items.length) throw new Error('No se reconocieron alimentos en la foto. Probá con otra toma, más cerca y con buena luz.');
        var sc = num(json.score, NaN);
        S.scan = { dishName: String(json.dishName || 'Plato analizado'), items: items, score: isFinite(sc) ? Math.round(Math.max(0, Math.min(100, sc))) : localScore(items), reason: json.scoreReason || '', tips: (json.tips || []).slice(0, 3) };
      })
      .catch(function (err) { S.scanErr = (err && err.message) || String(err); })
      .then(function () { S.scanBusy = false; renderSheet(); });
  }

  function addScanToMeal() {
    if (!S.scan) return;
    var id = S.phMeal || (($('#ph-meal') || {}).value) || '__out';
    var at = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    var stamp = Date.now().toString(36);
    var add = S.scan.items.map(function (i, k) { return { id: 'ia-' + stamp + '-' + k, food: i.food, grams: i.grams, p: i.p, c: i.c, f: i.f, leucine: i.leucine, extra: true, at: at }; });
    S.extras[id] = (S.extras[id] || []).concat(add);
    store.set('extras:' + today, S.extras);
    S.scan = null; S.panel = null;
    haptic();
    render();
    toast(add.length + ' alimentos agregados a ' + mealLabel(id));
  }

  function sendPhoto() {
    var meal = mealLabel(S.phMeal || (($('#ph-meal') || {}).value) || ''), note = ($('#ph-note') || {}).value || '';
    var text = 'Revisión de comida · ' + D.athlete.name + '\nDía ' + S.mode.toUpperCase() + ' · ' + meal + (note ? '\nNota: ' + note : '') + '\n' + D.handle;
    var file = new File([S.photo.blob], 'plato-' + today + '.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], text: text, title: 'Revisión de comida' }).then(function () { toast('Enviado'); closeSheet(); }, function () {});
      return;
    }
    // Sin Web Share con archivos: descarga la foto y abre WhatsApp con el texto para adjuntarla.
    var a = document.createElement('a'); a.href = S.photo.url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    toast('Foto guardada · adjuntala en el chat con tu coach');
  }

  // ---------- Eventos ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-mode],[data-check],[data-swap],[data-pick],[data-itab],[data-panel],[data-cup],[data-water],[data-shopcheck],[data-copyshop],[data-shopreset],[data-photo],[data-aicfg],[data-dial],[data-close],[data-rmextra],#sheet-bg,#install,#reset');
    if (!el) return;
    var ds = el.dataset;
    if (ds.close) return closeSheet();
    if (ds.dial) { S.dialOpen = !S.dialOpen; store.set('dialOpen', S.dialOpen); haptic(); return render(); }
    if (ds.rmextra) {
      var q = ds.rmextra.split('|');
      S.extras[q[0]] = (S.extras[q[0]] || []).filter(function (x) { return x.id !== q[1]; });
      if (!S.extras[q[0]].length) delete S.extras[q[0]];
      store.set('extras:' + today, S.extras);
      return render();
    }
    if (ds.aicfg === 'toggle') { S.aiCfg = !S.aiCfg; return renderSheet(); }
    if (ds.aicfg === 'save') {
      var kv = (($('#ai-key') || {}).value || '').trim();
      if (!kv) return toast('Pegá tu API Key de Gemini');
      setKey(kv); S.aiCfg = false; S.scanErr = null; toast('Motor IA activado en este dispositivo'); render(); return;
    }
    if (ds.aicfg === 'clear') { setKey(''); S.aiCfg = false; S.scan = null; toast('Clave borrada de este dispositivo'); render(); return; }
    if (ds.photo === 'ai') return analyzePhoto();
    if (ds.photo === 'add') return addScanToMeal();
    if (ds.itab) { S.itab = ds.itab; return renderSheet(); }
    if (ds.panel) { S.sheet = null; S.panel = ds.panel; return renderSheet(); }
    if (ds.cup !== undefined) {
      var i = +ds.cup, full = Math.floor(S.water / 250);
      return setWater(i + 1 === full ? i * 250 : (i + 1) * 250);
    }
    if (ds.water !== undefined) return setWater(+ds.water === 0 ? 0 : S.water + +ds.water);
    if (ds.shopcheck) { S.shop[ds.shopcheck] = !S.shop[ds.shopcheck]; store.set('shop:' + weekKey, S.shop); haptic(); return renderSheet(); }
    if (ds.copyshop) return copy(shopText(shoppingList()));
    if (ds.shopreset) { S.shop = {}; store.set('shop:' + weekKey, S.shop); return renderSheet(); }
    if (ds.photo === 'pick' || ds.photo === 'retake') { if (photoInput) photoInput.click(); return; }
    if (ds.photo === 'send') { if (S.photo) sendPhoto(); return; }
    if (ds.mode) {
      S.mode = ds.mode;
      store.set('mode', S.mode);
      haptic();
      if (D.preview) parent.postMessage({ type: 'coachjp:mode', mode: S.mode }, '*');
      render();
    } else if (ds.check) {
      S.checks[ds.check] = !S.checks[ds.check];
      store.set('checks:' + today, S.checks);
      haptic();
      render();
    } else if (ds.swap) {
      var p = ds.swap.split('|');
      S.panel = null;
      S.sheet = { meal: p[0], item: p[1] };
      renderSheet();
    } else if (ds.pick) {
      var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
      var orig = meal.items.filter(function (it) { return it.id === S.sheet.item; })[0];
      if (ds.pick === '__orig' || ds.pick === orig.foodId) delete S.swaps[orig.id];
      else S.swaps[orig.id] = ds.pick;
      store.set('swaps', S.swaps);
      S.sheet = null;
      haptic();
      render();
      toast(ds.pick === '__orig' ? 'Volviste al alimento original' : 'Alimento cambiado · porciones recalculadas');
    } else if (el.id === 'sheet-bg') {
      closeSheet();
    } else if (el.id === 'install') {
      install();
    } else if (el.id === 'reset') {
      S.checks = {};
      store.set('checks:' + today, S.checks);
      setWater(0);
      toast('Checklist e hidratación del día reiniciados');
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'ph-note') S.phNote = e.target.value;
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'ph-meal') S.phMeal = e.target.value;
  });

  // ---------- Instalación PWA (prompt nativo o guía iOS / Android) ----------
  // Instalada (pantalla de inicio): el botón [ INSTALAR APP ] desaparece por completo.
  function syncInstall() {
    var btn = document.getElementById('install');
    var solo = isStandalone();
    document.body.classList.toggle('standalone', solo);
    if (btn) btn.hidden = solo;
  }
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', syncInstall); } catch (e) {}
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { deferred = null; syncInstall(); toast('App instalada · ya la tenés en tu inicio'); });
  function install() {
    if (isStandalone()) return toast('YA ESTÁ INSTALADA EN TU PANTALLA DE INICIO');
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; });
    } else {
      S.sheet = null;
      S.itab = isIOS() ? 'ios' : 'android';
      S.panel = 'install';
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
    // El dial y la próxima comida se actualizan solos cada minuto.
    setInterval(function () { now = new Date(); if (!S.sheet && !S.panel) render(); }, 60000);
  } else {
    window.addEventListener('message', function (e) {
      var msg = e.data || {};
      if (msg.type === 'coachjp:payload') {
        D = msg.payload;
        S.mode = D.initialMode;
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
