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
  };

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

  function unitHintFor(foodId, grams) {
    var ref = foodId && D.foods[foodId];
    if (!ref || !ref.unit) return '';
    var q = grams / ref.unit.grams;
    if (q < 0.5) return '';
    var qq = Math.round(q * 2) / 2, lab = ref.unit.label;
    return '≈ ' + n1(qq) + ' ' + esc(qq > 1 && lab.length > 3 ? lab + 's' : lab);
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

  function gauge(tgt, eaten) {
    var r = 118, len = Math.PI * r, pct = tgt.kcal ? Math.min(1, eaten.k / tgt.kcal) : 0;
    var left = tgt.kcal - eaten.k;
    var ticks = '';
    for (var i = 0; i <= 20; i++) {
      var a = Math.PI - (i / 20) * Math.PI, r1 = i % 5 ? 132 : 128, r2 = 138;
      ticks += '<line x1="' + (150 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (146 - r1 * Math.sin(a)).toFixed(1) + '" x2="' + (150 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (146 - r2 * Math.sin(a)).toFixed(1) + '" stroke="rgba(148,163,184,' + (i % 5 ? '.25' : '.55') + ')" stroke-width="1.2"/>';
    }
    var h = '<div class="gauge"><svg viewBox="0 0 300 156" aria-hidden="true">' + ticks;
    h += '<path d="' + arcD(150, 146, r) + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="12" stroke-linecap="round"/>';
    h += '<path d="' + arcD(150, 146, r) + '" fill="none" stroke="' + (left < 0 ? '#F97316' : '#38BDF8') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + (len * (1 - pct)).toFixed(1) + '" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)"/>';
    h += '</svg><div class="gv"><div class="glabel">' + (left >= 0 ? 'KCAL RESTANTES' : 'KCAL EXCEDIDAS') + '</div><div class="gnum' + (left < 0 ? ' over' : '') + '">' + n0(Math.abs(left)) + '</div><div class="gsub">' + n0(eaten.k) + ' / ' + n0(tgt.kcal) + ' kcal</div></div></div>';
    h += '<div class="minis">' + mini('PROTEÍNA', eaten.p, tgt.p, '#38BDF8') + mini('CARBOS', eaten.c, tgt.c, '#7DD3FC') + mini('GRASAS', eaten.f, tgt.f, '#F97316') + '</div>';
    return h;
  }

  function mini(label, cur, tgt, color) {
    var r = 34, len = Math.PI * r, pct = tgt ? Math.min(1, cur / tgt) : 0;
    return '<div class="mini"><svg viewBox="0 0 84 46" aria-hidden="true"><path d="' + arcD(42, 42, r) + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6" stroke-linecap="round"/><path d="' + arcD(42, 42, r) + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + (len * (1 - pct)).toFixed(1) + '" style="transition:stroke-dashoffset .6s"/></svg><b>' + n0(cur) + '<i>/' + n0(tgt) + ' g</i></b><span>' + label + '</span></div>';
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
    var s = '<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="86" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="10"/>';
    if (mode === 'on') {
      s += '<path d="' + arc(86, (start - 90 + 1440) % 1440, (end + 60) % 1440) + '" fill="none" stroke="rgba(56,189,248,.22)" stroke-width="16"/>';
      s += '<path d="' + arc(86, start, end % 1440) + '" fill="none" stroke="#F97316" stroke-width="10" stroke-linecap="round"/>';
    }
    for (var hr = 0; hr < 24; hr++) {
      var a = polar(hr % 6 ? 74 : 70, hr * 60), b = polar(78, hr * 60);
      s += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="rgba(148,163,184,' + (hr % 6 ? '.25' : '.6') + ')" stroke-width="1.2"/>';
      if (hr % 6 === 0) { var t = polar(58, hr * 60); s += '<text x="' + t[0].toFixed(1) + '" y="' + (t[1] + 3.5).toFixed(1) + '" text-anchor="middle" class="dl">' + (hr < 10 ? '0' : '') + hr + '</text>'; }
    }
    list.forEach(function (x) {
      var p = polar(86, toMin(x.m.time)), done = !!S.checks[x.m.id], peri = x.m.role === 'peri' || x.m.role === 'post';
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5.5" fill="' + (done ? '#38BDF8' : '#131B2A') + '" stroke="' + (peri ? '#F97316' : '#38BDF8') + '" stroke-width="2"/>';
    });
    var hand = polar(48, nowMin);
    s += '<line x1="110" y1="110" x2="' + hand[0].toFixed(1) + '" y2="' + hand[1].toFixed(1) + '" stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"/><circle cx="110" cy="110" r="3" fill="#FFFFFF"/></svg>';

    var next = null;
    list.forEach(function (x) { var t = toMin(x.m.time); if (!S.checks[x.m.id] && t >= nowMin && (!next || t < toMin(next.m.time))) next = x; });
    var info = next
      ? '<b>' + esc(next.m.name) + '</b><span>' + esc(next.m.time) + ' · en ' + fmtDur(toMin(next.m.time) - nowMin) + '</span>'
      : '<b>Sin comidas pendientes</b><span>Plan del día al día</span>';
    var sess = mode === 'on'
      ? (nowMin >= start - 90 && nowMin <= end + 60 ? '<em class="hot">VENTANA PERI-ENTRENO ACTIVA</em>' : '<em>Sesión ' + esc(D.training.time) + ' · ' + D.training.minutes + ' min</em>')
      : '<em>DÍA OFF · sin sesión</em>';
    var h = '<section class="card"><span class="tag">[ DIAL PERI-ENTRENO · 24 H ]</span><div class="dial">' + s + '<div class="dinfo"><small>PRÓXIMA INGESTA</small>' + info + sess + '</div></div>';
    h += '<div class="legend"><span><i class="lg-s"></i>Sesión</span><span><i class="lg-w"></i>Ventana peri</span><span><i class="lg-m"></i>Comida</span><span><i class="lg-p"></i>Peri / post</span></div></section>';
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
      var meals = mealsFor(S.mode);
      var h4 = '<div class="tag">[ REVISIÓN DE COMIDA · FOTO → COACH ]</div><h3>Mandale tu plato al coach</h3>';
      h4 += '<p class="muted" style="font-size:12.5px">Tu app no guarda claves de IA: la foto viaja a tu coach, que la analiza con el escáner de su consola y te ajusta el plan.</p>';
      if (S.photo) h4 += '<img class="ph" src="' + S.photo.url + '" alt="Foto del plato">';
      h4 += '<label class="lbl">¿Qué comida es?</label><select id="ph-meal" class="inp">' + meals.map(function (x) { return '<option>' + esc(x.m.time + ' · ' + x.m.name) + '</option>'; }).join('') + '<option>Fuera del plan</option></select>';
      h4 += '<label class="lbl">Nota (opcional)</label><textarea id="ph-note" class="inp" rows="2" placeholder="Ej: comí afuera, cambié el arroz por papas"></textarea>';
      h4 += '<div class="wbtns" style="margin-top:12px"><button data-photo="retake" class="ghost">Otra foto</button><button data-photo="send" class="cta">Enviar al coach</button></div>';
      return open(bg, sh, h4);
    }
  }

  function renderSheet() {
    var bg = $('#sheet-bg'), sh = $('#sheet');
    if (S.panel) return renderPanel(bg, sh);
    if (!S.sheet) { bg.className = 'sheet-bg'; sh.className = 'sheet'; return; }
    var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
    var orig = meal && meal.items.filter(function (i) { return i.id === S.sheet.item; })[0];
    if (!orig) { S.sheet = null; return renderSheet(); }
    var from = D.foods[orig.foodId];
    var anchor = D.anchors[from.group];
    var cur = S.swaps[orig.id] || orig.foodId;
    var label = { p: 'proteína', c: 'carbohidratos', f: 'grasas' }[anchor];
    var h = '<div class="tag">[ SMART SWAP · ' + esc(D.groupLabels[from.group]) + ' ]</div>';
    h += '<p class="muted" style="font-size:13px;margin:6px 0 4px">Cualquiera de estas opciones aporta lo mismo en ' + label + ' (' + n0(from[anchor] * orig.grams / 100) + ' g).</p>';
    Object.keys(D.foods).forEach(function (id) {
      var f = D.foods[id];
      if (f.group !== from.group || !(f[anchor] > 0)) return;
      var g = id === orig.foodId ? orig.grams : Math.round((from[anchor] * orig.grams) / f[anchor] / 5) * 5;
      var k = g / 100;
      h += '<button class="opt' + (id === cur ? ' cur' : '') + '" data-pick="' + id + '"><span class="g">' + n0(g) + ' g</span><span class="fd">' + esc(f.name) + (id === orig.foodId ? ' · original' : '') + '<span>' + (unitHintFor(id, g) ? unitHintFor(id, g) + ' · ' : '') + n0(f.p * k) + ' g proteína · ' + n0(f.c * k) + ' g carbos · ' + n0(f.f * k) + ' g grasas</span></span></button>';
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
    var list = mealsFor(mode);
    var eaten = list.reduce(function (a, x) {
      if (!S.checks[x.m.id]) return a;
      return { p: a.p + x.t.p, c: a.c + x.t.c, f: a.f + x.t.f, k: a.k + x.kcal };
    }, { p: 0, c: 0, f: 0, k: 0 });
    var doneCount = list.filter(function (x) { return S.checks[x.m.id]; }).length;
    var h = '';

    h += '<header class="top">' + D.mark + '<div><div class="brand">COACH JP</div><div class="badge">[ BIOENERGETICS &amp; NUTRITION ]</div></div><div class="phase">' + esc(D.athlete.phase) + '</div></header>';
    h += '<div class="tag">[ PLAN NUTRICIONAL · ' + esc(D.athlete.discipline) + ' ]</div>';
    h += '<h1>' + esc(D.athlete.name) + '</h1>';
    if (D.coachNote) h += '<p class="note">' + esc(D.coachNote) + '</p>';

    h += '<div class="switch ' + mode + '"><span class="knob"></span><button data-mode="on" class="' + (mode === 'on' ? 'on' : '') + '">MODO DÍA ON</button><button data-mode="off" class="' + (mode === 'off' ? 'on' : '') + '">MODO DÍA OFF</button></div>';

    h += '<section class="card"><div class="row"><span class="tag">[ TELEMETRÍA · ' + (mode === 'on' ? 'DÍA ON · ENTRENO' : 'DÍA OFF · DESCANSO') + ' ]</span><span class="hv">' + doneCount + '/' + list.length + ' COMIDAS</span></div>' + gauge(tgt, eaten) + '</section>';

    h += '<div class="actions"><button data-panel="shop">[ LISTA DE COMPRAS ]</button><button data-panel="out">[ COMER FUERA ]</button><button data-photo="pick">[ FOTO → COACH ]</button></div>';

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
      x.items.forEach(function (it) {
        var canSwap = (it.foodId && D.foods[it.foodId] && D.swapGroups[D.foods[it.foodId].group] > 1) || it.swappedFrom;
        var hint = unitHintFor(it.foodId, it.grams);
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
        S.sheet = null; S.panel = 'photo'; renderSheet();
      }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { toast('No se pudo leer la foto'); };
    img.src = url;
    photoInput.value = '';
  });

  function sendPhoto() {
    var meal = ($('#ph-meal') || {}).value || '', note = ($('#ph-note') || {}).value || '';
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
    var el = e.target.closest('[data-mode],[data-check],[data-swap],[data-pick],[data-itab],[data-panel],[data-cup],[data-water],[data-shopcheck],[data-copyshop],[data-shopreset],[data-photo],#sheet-bg,#install,#reset');
    if (!el) return;
    var ds = el.dataset;
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
      if (ds.pick === orig.foodId) delete S.swaps[orig.id];
      else S.swaps[orig.id] = ds.pick;
      store.set('swaps', S.swaps);
      S.sheet = null;
      haptic();
      render();
      toast('Alimento cambiado · porciones recalculadas');
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

  // ---------- Instalación PWA (prompt nativo o guía iOS / Android) ----------
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
