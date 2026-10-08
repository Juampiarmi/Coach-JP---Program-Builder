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
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDay(d); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function weekOf(d) { var m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDay(m); }
  var now = new Date();
  var today = isoDay(now);
  var weekKey = weekOf(now);
  var WD = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  var MO = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  function dateLabel(iso) {
    var d = new Date(iso + 'T12:00:00');
    var rel = iso === today ? 'HOY, ' : iso === addDays(today, -1) ? 'AYER, ' : iso === addDays(today, 1) ? 'MAÑANA, ' : '';
    return rel + WD[d.getDay()] + ' ' + pad2(d.getDate()) + ' ' + MO[d.getMonth()];
  }

  // ON / OFF automático según el cronograma semanal del atleta; el switch manual guarda una excepción por fecha.
  function scheduledMode(iso) {
    var wd = D.trainingWeekdays;
    if (!wd || !wd.length) return D.initialMode;
    return wd.indexOf(new Date(iso + 'T12:00:00').getDay()) >= 0 ? 'on' : 'off';
  }
  function modeFor(iso) { return store.get('mode:' + iso, null) || scheduledMode(iso); }

  var S = {
    date: today,
    mode: D.preview ? D.initialMode : modeFor(today),
    checks: store.get('checks:' + today, {}),
    swaps: store.get('swaps', {}),
    water: store.get('water:' + today, 0),
    shop: store.get('shop:' + weekKey, {}),
    sheet: null,
    panel: null,
    itab: 'ios',
    photo: null,
    tlOpen: store.get('tlOpen', false),
    dirOpen: false,
    extras: store.get('extras:' + today, {}),
    free: store.get('free:' + today, {}),
    outScene: null,
    outMeal: '',
    scanTab: 'plate',
    portions: 1,
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
  var MACRO_GROUPS = { p: ['lean-protein', 'dairy-protein', 'eggs', 'protein-snack'], c: ['cereal', 'starch', 'fruit', 'sport-carb'], f: ['fat'] };
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

  // Día OFF: no hay sesión → los bloques pre / peri-entreno se muestran como merienda de saciedad.
  var PERI_RE = /pre.?entreno|pre.?wod|peri.?wod|peri.?entreno|intra|glucol[ií]tico|para entrenar/i;
  function isOffPeri(m, mode) { return mode === 'off' && (m.role === 'peri' || PERI_RE.test(m.name)); }
  function mealName(m, mode) { return isOffPeri(m, mode) ? 'Merienda Táctica OFF' : m.name; }

  // Comida libre controlada (Comer fuera): bloque promedio balanceado que reemplaza la comida en la telemetría.
  var FREE_MEAL = { p: 45, c: 70, f: 32 };
  function freeItem(m, sc) {
    var lbl = (OUT_SCENES.filter(function (o) { return o.id === sc; })[0] || {}).label || 'Salida';
    return { id: 'free-' + m.id, food: 'Comida libre controlada · ' + lbl, grams: 0, p: FREE_MEAL.p, c: FREE_MEAL.c, f: FREE_MEAL.f, leucine: FREE_MEAL.p * 0.08, free: true };
  }

  function mealsFor(mode, extras, free) {
    extras = extras || S.extras;
    free = free || S.free;
    var base = D.meals.filter(function (m) { return m.day === 'both' || m.day === mode; });
    var out = extras.__out;
    if (out && out.length) base = base.concat([{ id: '__out', name: 'Fuera del plan · análisis IA', time: out[0].at || '12:00', day: mode, role: 'snack', mps: false, items: [] }]);
    return base
      .sort(function (a, b) { return a.time.localeCompare(b.time); })
      .map(function (m) {
        var items = free[m.id] ? [freeItem(m, free[m.id])] : m.items.map(resolveItem).concat(extras[m.id] || []);
        var t = items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
        return { m: m, items: items, t: t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
      });
  }

  // Cumplimiento: todas las comidas tildadas y kcal dentro de ±5 % del plan.
  var ADHERENCE_TOL = 0.05;

  function daySummary(iso) {
    var cur = iso === S.date;
    var checks = cur ? S.checks : store.get('checks:' + iso, {});
    var mode = cur ? S.mode : modeFor(iso);
    var list = mealsFor(mode, cur ? S.extras : store.get('extras:' + iso, {}), cur ? S.free : store.get('free:' + iso, {}));
    var tgt = D.targets[mode];
    var done = 0, k = 0;
    list.forEach(function (x) { if (checks[x.m.id]) { done++; k += x.kcal; } });
    var pct = tgt.kcal ? k / tgt.kcal : 0;
    return { date: iso, mode: mode, done: done, total: list.length, kcal: Math.round(k), target: tgt.kcal, pct: Math.round(pct * 100), adherent: list.length > 0 && done === list.length && Math.abs(pct - 1) <= ADHERENCE_TOL };
  }

  var H = store.get('history', {});
  function archive(iso) {
    if (D.preview || iso > today) return;
    var sum = daySummary(iso);
    // Sin registros locales para esa fecha: se conserva lo ya archivado (nunca se pisa con un día vacío).
    if (!sum.done && (iso === S.date ? !Object.keys(S.checks).length : store.get('checks:' + iso, null) === null)) return;
    H[iso] = sum;
    store.set('history', H);
  }

  // Racha: días consecutivos en adherencia total hasta hoy (hoy cuenta sólo si ya está cumplido).
  function streak() {
    var n = daySummary(today).adherent ? 1 : 0;
    var d = addDays(today, -1);
    for (var i = 0; i < 400; i++) {
      var h = H[d];
      if (!h || !h.adherent) break;
      n++;
      d = addDays(d, -1);
    }
    return n;
  }

  // Cambia el día consultado (historial hacia atrás, vista previa del plan hacia adelante).
  function loadDay(iso) {
    if (S.date !== iso) archive(S.date);
    S.date = iso;
    S.checks = store.get('checks:' + iso, {});
    S.water = store.get('water:' + iso, 0);
    S.extras = store.get('extras:' + iso, {});
    S.free = store.get('free:' + iso, {});
    if (!D.preview) S.mode = modeFor(iso);
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

  function gauge(tgt, eaten, complete, run) {
    var r = 118, len = Math.PI * r, pct = complete ? 1 : tgt.kcal ? Math.min(1, eaten.k / tgt.kcal) : 0;
    var left = tgt.kcal - eaten.k;
    var ticks = '';
    for (var i = 0; i <= 20; i++) {
      var a = Math.PI - (i / 20) * Math.PI, r1 = i % 5 ? 132 : 128, r2 = 138;
      ticks += '<line x1="' + (150 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (146 - r1 * Math.sin(a)).toFixed(1) + '" x2="' + (150 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (146 - r2 * Math.sin(a)).toFixed(1) + '" stroke="rgba(148,163,184,' + (i % 5 ? '.25' : '.55') + ')" stroke-width="1.2"/>';
    }
    var h = '<div class="gauge' + (complete ? ' won' : '') + '"><svg viewBox="0 0 300 156" aria-hidden="true">' + ticks;
    h += '<path d="' + arcD(150, 146, r) + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="12" stroke-linecap="round"/>';
    h += '<path d="' + arcD(150, 146, r) + '" fill="none" stroke="' + (!complete && left < 0 ? '#F97316' : '#38BDF8') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + (len * (1 - pct)).toFixed(1) + '" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)"' + (complete ? ' class="glow"' : '') + '/>';
    if (complete) {
      h += '</svg><div class="gv done"><div class="glabel">[ PROTOCOLO CUMPLIDO · ADHERENCIA TOTAL ]</div><div class="gnum">100%</div><div class="gsub">' + n0(eaten.k) + ' / ' + n0(tgt.kcal) + ' kcal · OBJETIVO</div></div></div>';
    } else {
      h += '</svg><div class="gv"><div class="glabel">' + (left >= 0 ? 'KCAL RESTANTES' : 'KCAL EXCEDIDAS') + '</div><div class="gnum' + (left < 0 ? ' over' : '') + '">' + n0(Math.abs(left)) + '</div><div class="gsub">' + n0(eaten.k) + ' / ' + n0(tgt.kcal) + ' kcal</div></div></div>';
    }
    h += '<div class="minis">' + mini('PROTEÍNA', eaten.p, tgt.p, '#38BDF8', complete) + mini('CARBOS', eaten.c, tgt.c, '#7DD3FC', complete) + mini('GRASAS', eaten.f, tgt.f, '#F97316', complete) + '</div>';
    if (run > 0) h += '<div class="streak' + (complete ? ' hot' : '') + '">🔥 ' + run + ' DÍA' + (run > 1 ? 'S' : '') + ' EN ADHERENCIA</div>';
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

  // ---------- 3 · Timeline peri-entreno 06:00 → 23:00 ----------
  var T0 = 6 * 60, T1 = 23 * 60;
  function tx(min) { return Math.max(0, Math.min(100, ((min - T0) / (T1 - T0)) * 100)); }
  function hhmm(min) { min = ((min % 1440) + 1440) % 1440; return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60); }

  function timeline(mode, list) {
    var start = toMin(D.training.time), end = start + Math.max(15, Number(D.training.minutes) || 60), nowMin = now.getHours() * 60 + now.getMinutes();
    var live = S.date === today;
    var next = null;
    if (live) list.forEach(function (x) { var t = toMin(x.m.time); if (!S.checks[x.m.id] && t >= nowMin && (!next || t < toMin(next.m.time))) next = x; });
    var peek = !live
      ? list.length + ' comidas · ' + (mode === 'on' ? 'entreno ' + hhmm(start) + '–' + hhmm(end) : 'día OFF')
      : next ? 'Próxima: ' + esc(mealName(next.m, mode)) + ' · ' + esc(next.m.time) : 'Sin ingestas pendientes';

    var h = '<section class="card tlcard"><button class="tl-hd" data-tl="1" aria-expanded="' + (S.tlOpen ? 'true' : 'false') + '" aria-label="' + esc(peek.replace(/<[^>]+>/g, '')) + '"><span class="tag">[ TIMELINE PERI-ENTRENO · 24H ]</span><span class="chev' + (S.tlOpen ? ' up' : '') + '"></span></button>';
    if (!S.tlOpen) return h + '</section>';

    var track = '';
    if (mode === 'on') {
      track += '<div class="tl-win" style="left:' + tx(start - 90).toFixed(2) + '%;width:' + (tx(end + 60) - tx(start - 90)).toFixed(2) + '%"></div>';
      track += '<div class="tl-train" style="left:' + tx(start).toFixed(2) + '%;width:' + Math.max(1.5, tx(end) - tx(start)).toFixed(2) + '%"></div>';
    }
    list.forEach(function (x) {
      var t = toMin(x.m.time), done = !!S.checks[x.m.id];
      track += '<span class="tl-dot' + (done ? ' done' : '') + (next && next.m.id === x.m.id ? ' next' : '') + '" style="left:' + tx(t).toFixed(2) + '%" title="' + esc(x.m.time + ' · ' + mealName(x.m, mode)) + '"></span>';
    });
    if (live && nowMin >= T0 && nowMin <= T1) track += '<div class="tl-now" style="left:' + tx(nowMin).toFixed(2) + '%"><span>' + hhmm(nowMin) + '</span></div>';

    var axis = '';
    var showNow = live && nowMin >= T0 && nowMin <= T1;
    [6, 9, 12, 15, 18, 23].forEach(function (hr) {
      // La etiqueta de la hora actual reemplaza a la marca del eje que tendría encima.
      if (showNow && Math.abs(tx(hr * 60) - tx(nowMin)) < 7) return;
      axis += '<span style="left:' + tx(hr * 60).toFixed(2) + '%">' + pad2(hr) + ':00</span>';
    });
    var labels = '';
    list.forEach(function (x, i) { labels += '<span class="' + (i % 2 ? 'dn' : 'up') + '" style="left:' + tx(toMin(x.m.time)).toFixed(2) + '%">' + esc(x.m.time) + '</span>'; });

    var info;
    if (!live) info = '<b>' + (S.date < today ? 'Registro del ' : 'Plan del ') + dateLabel(S.date) + '</b>';
    else if (next) info = 'Próxima ingesta: <b>' + esc(mealName(next.m, mode)) + '</b> en ' + fmtDur(toMin(next.m.time) - nowMin);
    else info = '<b>Sin ingestas pendientes</b> · plan del día al día';
    var rel = '';
    if (mode === 'on' && live) {
      if (nowMin < start) rel = 'Entreno ' + hhmm(start) + '–' + hhmm(end) + ' · en ' + fmtDur(start - nowMin);
      else if (nowMin <= end) rel = '<em class="hot">SESIÓN EN CURSO · quedan ' + fmtDur(end - nowMin) + '</em>';
      else rel = 'Entreno terminado hace ' + fmtDur(nowMin - end) + ' · ventana de recuperación';
    } else if (mode === 'on') rel = 'Entreno ' + hhmm(start) + '–' + hhmm(end);
    else rel = 'DÍA OFF · sin sesión';

    h += '<div class="tl"><div class="tl-labels">' + labels + '</div><div class="tl-track">' + track + '</div><div class="tl-axis">' + axis + '</div></div>';
    h += '<div class="tl-info"><div>' + info + '</div><span>' + rel + '</span></div>';
    h += '<div class="legend"><span><i class="lg-s"></i>Entreno</span><span><i class="lg-w"></i>Ventana peri</span><span><i class="lg-m"></i>Comida</span><span><i class="lg-n"></i>Ahora</span></div></section>';
    return h;
  }

  // ---------- 4 · Lista de compras semanal ----------
  function shoppingList() {
    var onDays = Math.max(0, Math.min(7, D.trainingDays)), mult = { on: onDays, off: 7 - onDays, both: 7 };
    var rules = D.shopRules || {};
    var acc = {};
    D.meals.forEach(function (m) {
      m.items.map(resolveItem).forEach(function (it) {
        var rule = (it.foodId && rules[it.foodId]) || {};
        var key = rule.key || it.foodId || 'x:' + it.food;
        if (!acc[key]) acc[key] = { foodId: it.foodId, name: rule.name || it.food, rule: rule, grams: 0 };
        acc[key].grams += it.grams * mult[m.day];
      });
    });
    var groups = {};
    Object.keys(acc).forEach(function (k) {
      var it = acc[k], ref = it.foodId && D.foods[it.foodId], r = it.rule;
      var cat = r.section || (ref ? D.categories[ref.group] : '') || D.shopFallback || 'Otros';
      var row = { key: k, name: it.name, grams: it.grams, cooked: it.grams, hint: '', note: '' };
      if (r.factor) {
        row.grams = it.grams * r.factor;
        if (r.pack) row.grams = Math.max(r.pack, Math.ceil(row.grams / r.pack) * r.pack);
        row.note = r.state === 'raw' ? 'equivale a ' + qty(it.grams) + ' cocido' : 'rinde ~' + qty(row.grams * 2.5) + ' cocido';
        row.raw = r.state === 'raw';
      } else {
        row.hint = unitHintFor(it.foodId, it.grams);
      }
      if (r.min && row.grams < r.min) { row.grams = r.min; row.label = r.minLabel; row.hint = ''; }
      if (r.byUnit) { var u = Math.ceil(it.grams / r.byUnit); row.label = u + ' ' + (u > 1 ? r.unitLabel : r.unitLabel.replace(/s$/, '')); row.hint = ''; }
      (groups[cat] = groups[cat] || []).push(row);
    });
    if (D.supplements.length) groups['Suplementos'] = (groups['Suplementos'] || []).concat(D.supplements.map(function (s) { return { key: 'sup:' + s.id, name: s.name, dose: s.dose }; }));
    return D.categoryOrder.filter(function (c) { return groups[c]; }).map(function (c) {
      return { cat: c, items: groups[c].sort(function (a, b) { return (b.grams || 0) - (a.grams || 0); }) };
    });
  }

  function qty(g) { return g >= 1000 ? n1(Math.round(g / 100) / 10) + ' kg' : n0(Math.round(g / 10) * 10) + ' g'; }
  function shopQty(i) {
    if (i.dose) return i.dose;
    if (i.label) return i.label;
    return (i.raw ? '~' : '') + qty(i.grams);
  }

  function shopText(list) {
    var t = '🛒 *LISTA DE COMPRAS SEMANAL* · ' + D.athlete.name + '\nSemana del ' + weekKey.split('-').reverse().join('/') + ' · ' + D.trainingDays + ' días ON + ' + (7 - D.trainingDays) + ' OFF\n';
    list.forEach(function (g) {
      t += '\n*' + g.cat.toUpperCase() + '*\n';
      g.items.forEach(function (i) { t += '▢ ' + i.name + ': *' + shopQty(i) + '*' + (i.note ? ' (' + i.note + ')' : i.hint ? ' (' + i.hint.replace('≈ ', '≈') + ')' : '') + '\n'; });
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
      var h2 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ LISTA DE COMPRAS · SEMANA DEL ' + weekKey.split('-').reverse().join('/') + ' ]</div><h3>Totales para 7 días</h3><p class="muted" style="font-size:12.5px">' + D.trainingDays + ' días ON + ' + (7 - D.trainingDays) + ' días OFF · incluye tus cambios. Carnes en peso crudo, arroz y fideos en seco.</p>';
      h2 += '<button class="wa-btn" data-washop="1">[ 📲 Mandar lista por WhatsApp ]</button>';
      list.forEach(function (g) {
        h2 += '<div class="shop-cat">' + esc(g.cat) + '</div>';
        g.items.forEach(function (i) {
          var on = !!S.shop[i.key];
          h2 += '<button class="shop-item' + (on ? ' done' : '') + '" data-shopcheck="' + esc(i.key) + '"><span class="chk">' + CHECK + '</span><span class="sn">' + esc(i.name) + '</span><span class="sq">' + esc(shopQty(i)) + (i.note ? '<em>' + esc(i.note) + '</em>' : i.hint ? '<em>' + i.hint + '</em>' : '') + '</span></button>';
        });
      });
      h2 += '<div class="wbtns" style="margin-top:14px"><button data-copyshop="1">Copiar lista</button><button data-shopreset="1" class="ghost">Desmarcar todo</button></div>';
      return open(bg, sh, h2);
    }
    if (S.panel === 'out') {
      var sc = OUT_SCENES.filter(function (o) { return o.id === S.outScene; })[0];
      var h3 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ COMER FUERA · RESCATE SOCIAL ]</div><h3>¿Dónde comés?</h3>';
      h3 += '<div class="scenes">' + OUT_SCENES.map(function (o) { return '<button data-scene="' + o.id + '" class="' + (o.id === S.outScene ? 'on' : '') + '">' + o.icon + ' ' + esc(o.label) + '</button>'; }).join('') + '</div>';
      if (!sc) {
        h3 += '<p class="muted" style="font-size:12.5px;margin-top:10px">Elegí el escenario y te damos la directiva 3-2-1 al instante: qué pedir, con qué acompañar, qué tomar y qué evitar.</p>';
        return open(bg, sh, h3);
      }
      var mode = S.mode;
      h3 += '<div class="d321"><div class="tag">[ DIRECTIVA 3-2-1 · ' + esc(sc.label.toUpperCase()) + ' · DÍA ' + mode.toUpperCase() + ' ]</div>';
      h3 += '<div class="d-row"><span class="n">3</span><div><b>Principal</b><p>' + esc(sc.main) + '</p></div></div>';
      h3 += '<div class="d-row"><span class="n">2</span><div><b>Acompañamiento</b><p>' + esc(mode === 'on' ? sc.sideOn : sc.sideOff) + '</p></div></div>';
      h3 += '<div class="d-row"><span class="n">1</span><div><b>Bebida</b><p>' + esc(sc.drink) + '</p></div></div>';
      h3 += '<div class="d-row avoid"><span class="n">✕</span><div><b>Evitar</b><p>' + esc(sc.avoid) + '</p></div></div></div>';
      var targets = mealsFor(mode).filter(function (x) { return x.m.id !== '__out' && (x.m.role === 'lunch' || x.m.role === 'dinner'); });
      if (targets.length) {
        var nowMin2 = now.getHours() * 60 + now.getMinutes();
        var def = S.outMeal || (targets.filter(function (x) { return !S.checks[x.m.id] && toMin(x.m.time) >= nowMin2 - 60; })[0] || targets[targets.length - 1]).m.id;
        h3 += '<label class="lbl">¿Qué comida reemplaza?</label><select id="out-meal" class="inp">' + targets.map(function (x) { return '<option value="' + esc(x.m.id) + '"' + (x.m.id === def ? ' selected' : '') + '>' + esc(x.m.time + ' · ' + x.m.name) + '</option>'; }).join('') + '</select>';
        h3 += '<button class="add-meal" data-imputar="1">[ ⚡ IMPUTAR COMO COMIDA LIBRE CONTROLADA ]</button>';
        h3 += '<p class="muted" style="font-size:11.5px;margin-top:6px">Marca la comida como hecha con un bloque promedio de ~' + n0(FREE_MEAL.p * 4 + FREE_MEAL.c * 4 + FREE_MEAL.f * 9) + ' kcal (' + FREE_MEAL.p + ' g P · ' + FREE_MEAL.c + ' g C · ' + FREE_MEAL.f + ' g G) sin desarmar tu telemetría. Se deshace con la ✕ en la comida.</p>';
      }
      return open(bg, sh, h3);
    }
    if (S.panel === 'guide') {
      var g = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ ? GUÍA · MANUAL TÁCTICO DEL ATLETA ]</div><h3>Cómo funciona tu plan</h3>';
      g += '<p class="muted" style="font-size:12.5px">Lenguaje directo. Tocá cada tema para abrirlo.</p>';
      GUIDE.forEach(function (r, i) {
        g += '<details class="rule"' + (i === 0 ? ' open' : '') + '><summary><span class="n">' + (i + 1) + '</span>' + esc(r[0]) + '</summary>' + r[1].map(function (p) { return '<p>' + p + '</p>'; }).join('') + '</details>';
      });
      return open(bg, sh, g);
    }
    if (S.panel === 'photo') {
      var meals = mealsFor(S.mode).filter(function (x) { return x.m.id !== '__out'; });
      var key = getKey();
      var lbl = S.scanTab === 'label';
      var h4 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ FOTO · IA · ESCÁNER DUAL ]</div><h3>' + (key ? (lbl ? 'Escaneá la tabla nutricional' : 'Analizá tu plato con IA') : 'Mandale tu foto al coach') + '</h3>';
      if (key) h4 += '<div class="tabs scantabs"><button data-scantab="plate" class="' + (!lbl ? 'on' : '') + '">[ PLATO DE COMIDA ]</button><button data-scantab="label" class="' + (lbl ? 'on' : '') + '">[ TABLA NUTRICIONAL ]</button></div>';
      h4 += '<p class="muted" style="font-size:12.5px;margin-top:8px">' + (key
        ? (lbl ? 'Sacale foto a la tabla de información nutricional del envase: se extraen porción, kcal, proteínas, carbos, grasas y sodio.' : 'Volumen visual, ingredientes, macros y calorías estimadas, directo en tu celular con tu clave de Gemini.')
        : 'La foto viaja a tu coach por WhatsApp. Si cargás tu propia API Key de Gemini, la app analiza platos y tablas nutricionales acá mismo.') + '</p>';
      if (S.photo) h4 += '<img class="ph" src="' + S.photo.url + '" alt="Foto a analizar">';
      h4 += '<label class="lbl">¿Qué comida es?</label><select id="ph-meal" class="inp">' + meals.map(function (x) {
        return '<option value="' + esc(x.m.id) + '"' + (S.phMeal === x.m.id ? ' selected' : '') + '>' + esc(x.m.time + ' · ' + x.m.name) + '</option>';
      }).join('') + '<option value="__out"' + (S.phMeal === '__out' ? ' selected' : '') + '>Fuera del plan</option></select>';
      h4 += '<label class="lbl">Nota (opcional)</label><textarea id="ph-note" class="inp" rows="2" placeholder="Ej: comí afuera, cambié el arroz por papas">' + esc(S.phNote) + '</textarea>';

      if (S.scanBusy) h4 += '<div class="scan-busy"><span class="spin"></span>' + esc(S.scanBusy) + '</div>';
      if (S.scanErr && S.scanErrKind === 'plate') h4 += '<div class="scan-info">🍽 ' + esc(S.scanErr) + '<button data-scantab="plate" data-autoscan="1">[ PLATO DE COMIDA ] · ANALIZAR</button></div>';
      else if (S.scanErr && S.scanErrKind === 'slow') h4 += '<div class="scan-err">⚠ ' + esc(S.scanErr) + '<div class="wbtns"><button data-photo="ai">↻ Reintentar</button><button data-photo="send" class="ghost">WhatsApp al Coach</button></div></div>';
      else if (S.scanErr) h4 += '<div class="scan-err">⚠ ' + esc(S.scanErr) + '</div>';
      if (S.scan) h4 += S.scan.kind === 'label' ? labelCard(S.scan) : scanCard(S.scan);

      h4 += '<div class="wbtns" style="margin-top:12px"><button data-photo="retake" class="ghost">Otra foto</button>';
      if (key) h4 += '<button data-photo="ai" class="cta"' + (S.scanBusy ? ' disabled' : '') + '>' + (lbl ? '[ LEER TABLA NUTRICIONAL ]' : '[ ANALIZAR PLATO CON IA ]') + '</button></div><div class="wbtns"><button data-photo="send" class="ghost">Enviar foto por WhatsApp al coach</button></div>';
      else h4 += '<button data-photo="send" class="cta">Enviar foto por WhatsApp al coach</button></div>';

      h4 += '<button class="cfg-link" data-aicfg="toggle">[ ⚙ CONFIGURAR API KEY GEMINI ]' + (key ? ' · CLAVE ACTIVA' : '') + '</button>';
      if (S.aiCfg) {
        h4 += '<div class="cfg"><label class="lbl" style="margin-top:0">API Key de Google Gemini</label><input id="ai-key" class="inp" type="password" autocomplete="off" spellcheck="false" placeholder="AIza..." value="' + esc(key) + '">';
        h4 += '<p class="muted" style="font-size:11.5px;margin-top:6px">Se guarda solo en este dispositivo (localStorage), nunca se envía a tu coach ni queda en el plan. Modelo: gemini-3.5-flash-lite con respaldo gemini-3.5-flash. Creá tu clave gratis en aistudio.google.com.</p>';
        h4 += '<div class="wbtns"><button data-aicfg="save">Guardar clave</button>' + (key ? '<button data-aicfg="clear" class="ghost">Borrar clave</button>' : '') + '</div></div>';
      }
      return open(bg, sh, h4);
    }
  }

  function labelCard(r) {
    var k = (r.servingG * S.portions) / 100;
    var row = function (l, v, u) { return '<div class="lt-row"><span>' + l + '</span><b>' + v + (u ? ' ' + u : '') + '</b></div>'; };
    var h = '<div class="scan"><div class="tag">[ TABLA NUTRICIONAL · ' + esc(r.brand || 'PRODUCTO') + ' ]</div><b class="scan-nm">' + esc(r.name) + '</b>';
    h += '<div class="lt"><div class="lt-hd"><span>Por porción (' + n0(r.servingG) + ' g)</span><span>Consumido</span></div>';
    [['Energía', 'kcal', 'kcal'], ['Proteínas', 'p', 'g'], ['Carbohidratos', 'c', 'g'], ['Grasas', 'f', 'g'], ['Sodio', 'sodium', 'mg']].forEach(function (q) {
      var per = r.per100[q[1]] * r.servingG / 100;
      h += '<div class="lt-row"><span>' + q[0] + '</span><i>' + (q[1] === 'sodium' ? n0(per) : n1(per)) + ' ' + q[2] + '</i><b>' + (q[1] === 'sodium' ? n0(r.per100[q[1]] * k) : n1(r.per100[q[1]] * k)) + ' ' + q[2] + '</b></div>';
    });
    h += '</div><label class="lbl">Porciones consumidas</label><div class="portions"><button data-portion="-0.5">−</button><b>' + n1(S.portions) + '</b><button data-portion="0.5">+</button><span>= ' + n0(r.servingG * S.portions) + ' g</span></div>';
    h += '<button class="add-meal" data-photo="add">[ + SUMAR A LA INGESTA SELECCIONADA ]</button></div>';
    return h;
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

  // ---------- Comer fuera: escenarios 3-2-1 ----------
  var OUT_SCENES = [
    { id: 'parrilla', icon: '🥩', label: 'Parrilla / Asado', main: 'Un corte magro del tamaño de tu mano: vacío desgrasado, entraña, lomo, colita o pollo. Achuras y chorizo: uno, compartido.', sideOn: 'Ensalada completa + 1 papa o batata al rescoldo (o 1 pan).', sideOff: 'Ensalada completa o verduras grilladas. Sin pan ni papas.', drink: 'Agua o soda. Máximo 1 copa de vino o 1 cerveza.', avoid: 'Picadas largas de fiambre, pan con chimichurri en cantidad y repetir carne.' },
    { id: 'pizza', icon: '🍕', label: 'Pizza / Empanadas', main: '2-3 porciones de pizza (mejor muzza o napolitana) o 3 empanadas de carne / pollo al horno.', sideOn: 'Ensalada de hojas antes de empezar para llegar con menos hambre.', sideOff: 'Ensalada grande primero y quedate en 2 porciones o 2 empanadas.', drink: 'Agua o gaseosa cero. Alcohol: 1 vaso, no más.', avoid: 'Fugazzeta rellena, empanadas fritas y las porciones extra «porque quedaron».' },
    { id: 'burger', icon: '🍔', label: 'Hamburguesería', main: 'Hamburguesa simple o doble de carne, con lechuga y tomate. Queso: una feta.', sideOn: 'Papas para compartir o media porción.', sideOff: 'Cambiá las papas por ensalada. Si el pan es gigante, dejá la mitad.', drink: 'Agua o gaseosa cero.', avoid: 'Triple con panceta y cheddar extra, papas con cheddar, salsas en cantidad y milkshakes.' },
    { id: 'sushi', icon: '🍣', label: 'Sushi / Pastas', main: 'Sushi: 12-15 piezas priorizando sashimi y niguiris. Pastas: 1 plato de fideos o ñoquis con salsa roja (filetto, bolognesa).', sideOn: 'Ensalada o sopa miso. Pasta en porción normal, no fuente.', sideOff: 'Más sashimi y menos arroz. Pasta: media porción + ensalada.', drink: 'Agua, soda o té verde.', avoid: 'Rolls tempura / philadelphia en cantidad, salsas cremosas (4 quesos, crema) y pan con manteca.' },
    { id: 'cafe', icon: '☕', label: 'Café / Brunch', main: 'Tostado de jamón y queso, huevos revueltos con tostadas o yogur con granola y fruta.', sideOn: 'Fruta o jugo exprimido chico.', sideOff: 'Fruta. Una tostada en vez de dos.', drink: 'Café o latte sin azúcar (o con edulcorante).', avoid: 'Medialunas en serie, facturas, alfajores y licuados con helado.' },
  ];

  // ---------- Manual y glosario táctico ----------
  var GUIDE = [
    ['¿DÍA ON vs DÍA OFF?', [
      'Los carbohidratos son el combustible del entreno intenso: se guardan como <b>glucógeno</b> en músculo e hígado. Los días que entrenás (<b>ON</b>) el plan sube los carbos para llegar con el tanque lleno y recargar después.',
      'Los días de descanso (<b>OFF</b>) la demanda de glucógeno baja: se recortan carbos, se suben un poco las grasas y la proteína queda igual. Así sostenés el déficit sin perder rendimiento.',
      'La app elige ON u OFF sola según tu cronograma semanal. Si cambiás la rutina, usá el switch: queda guardado para ese día.',
    ]],
    ['¿QUÉ ES EL UMBRAL DE LEUCINA (mTOR)?', [
      'La <b>leucina</b> es el aminoácido que «enciende» la síntesis de proteína muscular (la vía mTOR). Hace falta llegar a <b>~2,7 g por comida</b> para activarla al máximo.',
      'Por eso cuidamos el umbral en las <b>comidas principales</b>: desayuno, almuerzo, cena y post-entreno. Ahí se juega la ganancia y la preservación de músculo.',
      'Las colaciones, meriendas y snacks son <b>ingestas auxiliares</b>: sirven para controlar el hambre y la glucemia. No necesitan llegar al umbral, no hace falta agregarles huevo ni proteína en polvo.',
    ]],
    ['CÓMO USAR LOS INTERCAMBIOS (SWAP)', [
      'Tocá <b>SWAP</b> al lado de cualquier alimento y elegí otro de la lista: los gramos ya vienen calculados para aportar lo mismo del macro que importa (proteína, carbos o grasas).',
      'Ejemplo: 180 g de pechuga de pollo equivalen a ~190 g de cuadril magro o ~240 g de merluza. El balance del día se mantiene.',
      'Para volver al alimento original, abrí el SWAP otra vez y elegí el marcado como «original». Pesá siempre en cocido (carnes, arroz, fideos, papa).',
    ]],
    ['PROTOCOLO DE RESCATE SOCIAL', [
      '<b>Asado / parrilla:</b> priorizá cortes magros (vacío desgrasado, entraña, lomo, pollo). Achuras y chorizo, de a uno y compartido. Ensalada en vez de pan.',
      '<b>Eventos y salidas:</b> proteína primero, carbos según el día. Aderezos aparte y nada de rebozados. Si sabés que salís, guardá 20-30 % de los carbos del día.',
      '<b>Alcohol:</b> máximo 1-2 copas y nunca en la ventana post-entreno. Agua o soda en el medio.',
      '<b>Si te pasaste:</b> no compenses salteando comidas. Retomá el plan en la próxima ingesta y seguí la racha.',
    ]],
  ];

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

    // Fila 1 · HUD: logo + marca + fase + guía.
    h += '<header class="top">' + D.markSm + '<div class="tb"><div class="brand">COACH JP</div><div class="badge">[ BIOENERGETICS &amp; NUTRITION ]</div></div><div class="phase">' + esc(D.athlete.phase) + '</div><button class="guide-btn" data-panel="guide" aria-label="Guía">[ ? GUÍA ]</button></header>';
    // Fila 2 · atleta + selector de fecha.
    h += '<div class="idrow"><div class="who"><b>' + esc(D.athlete.name) + '</b><span>' + esc(D.athlete.discipline) + '</span></div>';
    h += '<div class="datesel"><button data-day="-1" aria-label="Día anterior">◀</button><span class="dlab' + (S.date === today ? ' now' : '') + '">' + dateLabel(S.date) + '</span><button data-day="1" aria-label="Día siguiente">▶</button></div></div>';
    if (S.date !== today) h += '<button class="back-today" data-day="0">' + (S.date < today ? '◷ REGISTRO HISTÓRICO' : '◷ VISTA ANTICIPADA DEL PLAN') + ' · VOLVER A HOY</button>';
    if (D.coachNote) {
      var head = D.coachNote.split(/[.!?](\s|$)/)[0];
      h += '<div class="directive' + (S.dirOpen ? ' open' : '') + '"><button data-dir="1"><span class="dh">🎯 <b>Directiva:</b> ' + esc(head.length > 64 ? head.slice(0, 62) + '…' : head) + '</span><span class="dv">[ ' + (S.dirOpen ? 'Ocultar' : 'Ver directiva') + ' ' + (S.dirOpen ? '▴' : '▾') + ' ]</span></button>' + (S.dirOpen ? '<p>' + esc(D.coachNote) + '</p>' : '') + '</div>';
    }

    h += '<div class="switch ' + mode + '"><span class="knob"></span><button data-mode="on" class="' + (mode === 'on' ? 'on' : '') + '">MODO DÍA ON</button><button data-mode="off" class="' + (mode === 'off' ? 'on' : '') + '">MODO DÍA OFF</button></div>';

    h += '<section class="card"><div class="row"><span class="tag">[ TELEMETRÍA · ' + (mode === 'on' ? 'DÍA ON · ENTRENO' : 'DÍA OFF · DESCANSO') + ' ]</span><span class="hv">' + doneCount + '/' + list.length + ' COMIDAS</span></div>' + gauge(tgt, eaten, complete, streak()) + '</section>';

    h += '<div class="actions"><button data-panel="shop">[ LISTA DE COMPRAS ]</button><button data-panel="out">[ COMER FUERA ]</button><button data-photo="pick">' + (getKey() ? '[ FOTO · IA ]' : '[ FOTO → COACH ]') + '</button></div>';

    h += hydration(mode);
    h += timeline(mode, list);

    D.protocols.forEach(function (p) {
      h += '<section class="card alert"><div class="tag" style="margin-bottom:6px">[ ' + esc(p.tag) + ' ]</div><div style="font-weight:700;font-size:16px;color:#FFFFFF">' + esc(p.title) + '</div><p class="muted" style="font-size:13px;margin-top:4px">' + esc(p.body) + '</p></section>';
    });

    h += '<div class="sec"><span class="tag">[ COMIDAS DEL DÍA ]</span><span class="prog">Tocá un alimento para cambiarlo</span></div>';
    list.forEach(function (x) {
      var m = x.m;
      var done = !!S.checks[m.id];
      h += '<section class="card meal' + (done ? ' done' : '') + '">';
      h += '<div class="hd"><span class="time">' + esc(m.time) + '</span><div><div class="nm">' + esc(mealName(m, mode)) + '</div><div class="mm">' + n0(x.kcal) + ' kcal · ' + n0(x.t.p) + ' g de proteína</div></div><button class="chk" data-check="' + m.id + '" aria-label="Marcar comida">' + CHECK + '</button></div>';
      h += '<div class="items">';
      x.items.forEach(function (it, idx) {
        var hint = unitHintFor(it.foodId, it.grams);
        if (it.free) {
          h += '<div class="item extra free"><span class="g">~' + n0(it.p * 4 + it.c * 4 + it.f * 9) + '<em>kcal</em></span><span class="fd">' + esc(it.food) + '<s class="ia">Bloque balanceado · ' + n0(it.p) + ' P · ' + n0(it.c) + ' C · ' + n0(it.f) + ' G</s></span><button class="rm" data-unfree="' + esc(m.id) + '" aria-label="Deshacer comida libre">✕</button></div>';
          return;
        }
        if (it.extra) {
          h += '<div class="item extra"><span class="g">' + n0(it.grams) + ' g</span><span class="fd">' + esc(it.food) + '<s class="ia">Agregado por análisis IA · ' + n0(it.p) + ' P · ' + n0(it.c) + ' C · ' + n0(it.f) + ' G</s></span><button class="rm" data-rmextra="' + esc(m.id) + '|' + esc(it.id) + '" aria-label="Quitar">✕</button></div>';
          return;
        }
        var canSwap = !!it.swappedFrom || swapOptions(m.items[idx]).length > 0;
        h += '<button class="item" ' + (canSwap ? 'data-swap="' + m.id + '|' + it.id + '"' : 'disabled') + '><span class="g">' + n0(it.grams) + ' g' + (hint ? '<em>' + hint + '</em>' : '') + '</span><span class="fd">' + esc(it.food) + (it.swappedFrom ? '<s>Reemplaza a: ' + esc(it.swappedFrom) + '</s>' : '') + '</span>' + (canSwap ? '<span class="sw">SWAP</span>' : '') + '</button>';
      });
      h += '</div>';
      // Umbral mTOR sólo en comidas principales; el resto son ingestas auxiliares (sin sugerir huevo o whey).
      if (!m.mps) h += '<div class="leu na"><span class="dot"></span>' + (isOffPeri(m, mode) || (mode === 'off' && m.role !== 'snack') ? '[ MODULACIÓN GLUCÉMICA / SACIEDAD ]' : m.role === 'peri' ? '[ BLOQUE GLUCOLÍTICO · ENERGÍA PARA ENTRENAR ]' : '[ INGESTA AUXILIAR / MODULACIÓN GLUCÉMICA ]') + '</div>';
      else if (x.t.l >= D.threshold) h += '<div class="leu ok"><span class="dot"></span>[ mTOR / MPS: ACTIVADO • ' + n1(x.t.l) + ' g LEUCINA ]</div>';
      else h += '<div class="leu low"><span class="dot"></span>[ SUB-UMBRAL mTOR • ' + n1(x.t.l) + ' g LEUCINA ] · ' + leuTip(D.threshold - x.t.l) + '</div>';
      h += '</section>';
    });

    if (D.supplements.length) {
      h += '<div class="sec"><span class="tag">[ SUPLEMENTOS · AIS GRUPO A ]</span></div><section class="card">';
      D.supplements.forEach(function (s) {
        var done = !!S.checks['sup:' + s.id];
        h += '<button class="sup' + (done ? ' done' : '') + '" data-check="sup:' + esc(s.id) + '"><span class="chk">' + CHECK + '</span><span style="flex:1"><b>' + esc(s.name) + '</b><div class="ds"><em>Cuánto</em>' + esc(s.dose) + '</div><div class="tm"><em>Cuándo</em>' + esc(mode === 'off' && /caf/i.test(s.id + ' ' + s.name) ? 'Consumo matutino habitual (café/mate) - Evitar tomas pre-workout' : s.timing) + '</div>' + (s.doi ? '<a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener">[ ' + esc(s.evidence) + ' ]</a>' : '') + '</span></button>';
      });
      h += '</section>';
    }

    h += '<div class="cites">' + D.citations.map(function (c) {
      return c.doi ? '<a href="https://doi.org/' + esc(c.doi) + '" target="_blank" rel="noopener">[ ' + esc(c.label) + ' ]</a>' : '[ ' + esc(c.label) + ' ]';
    }).join('<br>') + '</div>';
    h += '<div class="reset-row"><button id="reset" class="reset-link">↺ Reiniciar checklist e hidratación de este día</button></div>';
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
  function setWater(ml) { S.water = Math.max(0, Math.min(8000, ml)); store.set('water:' + S.date, S.water); haptic(); render(); }
  function closeSheet() { S.sheet = null; S.panel = null; renderSheet(); }

  // ---------- Foto → coach (sin claves de IA en el dispositivo) ----------
  var photoInput = document.getElementById('photo');
  if (photoInput) photoInput.addEventListener('change', function () {
    var file = photoInput.files && photoInput.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      // Compresión client-side: máx. 1024 px y JPEG 0,75 → de ~8 MB a < 250 KB (respuesta de Gemini en 2-4 s).
      var k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        if (S.photo) URL.revokeObjectURL(S.photo.url);
        S.photo = { blob: blob, url: URL.createObjectURL(blob) };
        S.scan = null; S.scanErr = null; S.scanBusy = false;
        S.sheet = null; S.panel = 'photo'; renderSheet();
      }, 'image/jpeg', 0.75);
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
  var SCAN_TIMEOUT_MS = 12000;
  var SLOW_MSG = 'Conexión lenta. Reintentar o enviar foto al Coach por WhatsApp';

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
    S.scanBusy = i === 0 ? (S.scanTab === 'label' ? 'LEYENDO TABLA NUTRICIONAL · ' : 'ANALIZANDO PLATO · ') + model : '[ ! ] CAMBIANDO A MODELO DE RESPALDO (' + model + ')...';
    renderSheet();
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, SCAN_TIMEOUT_MS);
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined,
    }).then(function (res) {
      clearTimeout(timer);
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
        if (res.status === 400 && /api key|API_KEY/i.test(msg)) msg = 'La API Key no es válida. Revisala en [ ⚙ CONFIGURAR API KEY GEMINI ].';
        throw new Error(msg);
      });
    }, function (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') { var e = new Error(SLOW_MSG); e.slow = true; throw e; }
      throw err;
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
    S.scan = null; S.scanErr = null; S.scanErrKind = '';
    var asLabel = S.scanTab === 'label';
    blobToB64(S.photo.blob)
      .then(function (b64) {
        return callGemini(key, {
          contents: [{ role: 'user', parts: [{ text: asLabel ? D.labelPrompt : D.scanPrompt }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }, 0);
      })
      .then(function (text) {
        var a = text.indexOf('{'), b = text.lastIndexOf('}');
        var json = JSON.parse(a >= 0 ? text.slice(a, b + 1) : text);
        if (asLabel) return readLabel(json);
        var items = (json.items || []).filter(function (i) { return i && i.food && num(i.grams, 0) > 0; }).map(function (i) {
          var p = Math.max(0, num(i.p, 0));
          return { food: String(i.food), grams: Math.round(num(i.grams, 0)), p: p, c: Math.max(0, num(i.c, 0)), f: Math.max(0, num(i.f, 0)), leucine: Math.max(0, num(i.leucine, p * 0.08)) };
        });
        if (!items.length) throw new Error('No se reconocieron alimentos en la foto. Probá con otra toma, más cerca y con buena luz.');
        var sc = num(json.score, NaN);
        S.scan = { dishName: String(json.dishName || 'Plato analizado'), items: items, score: isFinite(sc) ? Math.round(Math.max(0, Math.min(100, sc))) : localScore(items), reason: json.scoreReason || '', tips: (json.tips || []).slice(0, 3) };
      })
      .catch(function (err) { S.scanErr = (err && err.message) || String(err); S.scanErrKind = err && err.slow ? 'slow' : err && err.plate ? 'plate' : ''; })
      .then(function () { S.scanBusy = false; renderSheet(); });
  }

  // Tabla nutricional → valores por 100 g (de la columna por porción si es lo único legible).
  function readLabel(json) {
    if (json && (json.isLabel === false || json.looksLike === 'plate')) {
      var pe = new Error('Detectamos un plato preparado. Cambiá a la pestaña [ PLATO DE COMIDA ] para analizar sus porciones y macros');
      pe.plate = true;
      throw pe;
    }
    var serving = Math.max(1, num(json.servingG, 100));
    var per = json.per100 || {};
    var ps = json.perServing || {};
    var pick = function (k) { var v = num(per[k], NaN); return isFinite(v) ? v : num(ps[k], 0) * 100 / serving; };
    var p100 = { kcal: pick('kcal'), p: pick('p'), c: pick('c'), f: pick('f'), sodium: pick('sodiumMg') };
    if (!(p100.kcal > 0) && p100.p + p100.c + p100.f > 0) p100.kcal = p100.p * 4 + p100.c * 4 + p100.f * 9;
    if (!(p100.kcal > 0)) throw new Error('No se pudo leer la tabla. Encuadrá solo la tabla, de frente y con buena luz.');
    S.portions = 1;
    S.scan = { kind: 'label', name: String(json.productName || 'Producto'), brand: json.brand ? String(json.brand) : '', servingG: serving, per100: p100 };
  }

  function addScanToMeal() {
    if (!S.scan) return;
    if (S.scan.kind === 'label') {
      var r = S.scan, g = Math.round(r.servingG * S.portions), kk = g / 100;
      S.scan = { items: [{ food: r.name + (r.brand ? ' · ' + r.brand : ''), grams: g, p: r.per100.p * kk, c: r.per100.c * kk, f: r.per100.f * kk, leucine: r.per100.p * kk * 0.08 }] };
    }
    var id = S.phMeal || (($('#ph-meal') || {}).value) || '__out';
    var at = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    var stamp = Date.now().toString(36);
    var add = S.scan.items.map(function (i, k) { return { id: 'ia-' + stamp + '-' + k, food: i.food, grams: i.grams, p: i.p, c: i.c, f: i.f, leucine: i.leucine, extra: true, at: at }; });
    S.extras[id] = (S.extras[id] || []).concat(add);
    store.set('extras:' + S.date, S.extras);
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
    var el = e.target.closest('[data-mode],[data-check],[data-swap],[data-pick],[data-itab],[data-panel],[data-cup],[data-water],[data-shopcheck],[data-copyshop],[data-shopreset],[data-photo],[data-aicfg],[data-tl],[data-close],[data-rmextra],[data-day],[data-dir],[data-scantab],[data-portion],[data-scene],[data-imputar],[data-unfree],[data-washop],#sheet-bg,#install,#reset');
    if (!el) return;
    var ds = el.dataset;
    if (ds.close) return closeSheet();
    if (ds.scene) { S.outScene = ds.scene; S.outMeal = ''; haptic(); return renderSheet(); }
    if (ds.imputar) {
      var om = (($('#out-meal') || {}).value) || S.outMeal;
      if (!om) return;
      S.free[om] = S.outScene || 'salida';
      S.checks[om] = true;
      store.set('free:' + S.date, S.free);
      store.set('checks:' + S.date, S.checks);
      S.panel = null; haptic(); render();
      return toast('Comida libre controlada imputada · telemetría actualizada');
    }
    if (ds.unfree) {
      delete S.free[ds.unfree];
      store.set('free:' + S.date, S.free);
      return render();
    }
    if (ds.washop) return window.open('https://wa.me/?text=' + encodeURIComponent(shopText(shoppingList())), '_blank');
    if (ds.tl) { S.tlOpen = !S.tlOpen; store.set('tlOpen', S.tlOpen); haptic(); return render(); }
    if (ds.dir) { S.dirOpen = !S.dirOpen; return render(); }
    if (ds.day !== undefined) {
      var dd = +ds.day;
      loadDay(dd === 0 ? today : addDays(S.date, dd));
      haptic();
      return render();
    }
    if (ds.scantab) {
      S.scanTab = ds.scantab; S.scan = null; S.scanErr = null; S.scanErrKind = '';
      if (ds.autoscan) return analyzePhoto();
      return renderSheet();
    }
    if (ds.portion) { S.portions = Math.max(0.5, Math.min(10, S.portions + +ds.portion)); return renderSheet(); }
    if (ds.rmextra) {
      var q = ds.rmextra.split('|');
      S.extras[q[0]] = (S.extras[q[0]] || []).filter(function (x) { return x.id !== q[1]; });
      if (!S.extras[q[0]].length) delete S.extras[q[0]];
      store.set('extras:' + S.date, S.extras);
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
      if (!D.preview) store.set('mode:' + S.date, S.mode);
      haptic();
      if (D.preview) parent.postMessage({ type: 'coachjp:mode', mode: S.mode }, '*');
      render();
    } else if (ds.check) {
      S.checks[ds.check] = !S.checks[ds.check];
      store.set('checks:' + S.date, S.checks);
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
      if (!confirm('¿Reiniciar el checklist y la hidratación de este día?')) return;
      S.checks = {};
      S.free = {};
      store.set('checks:' + S.date, S.checks);
      store.set('free:' + S.date, S.free);
      setWater(0);
      toast('Checklist e hidratación del día reiniciados');
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'ph-note') S.phNote = e.target.value;
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'out-meal') S.outMeal = e.target.value;
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
    // Ciclo diario: al abrir en una fecha nueva se archiva la última jornada usada.
    var last = store.get('lastOpen', null);
    if (last && last < today) { var keep = S.date; S.date = last; S.checks = store.get('checks:' + last, {}); S.extras = store.get('extras:' + last, {}); S.mode = modeFor(last); archive(last); loadDay(keep); }
    store.set('lastOpen', today);
    // A las 00:00 se archiva el día, se arranca la jornada en cero (checks y vasos) y se aplica el ON / OFF del cronograma.
    setInterval(function () {
      now = new Date();
      var t = isoDay(now);
      if (t !== today) {
        var wasToday = S.date === today;
        archive(today);
        today = t;
        weekKey = weekOf(now);
        S.shop = store.get('shop:' + weekKey, {});
        store.set('lastOpen', today);
        if (wasToday) { loadDay(today); toast('NUEVA JORNADA · checklist e hidratación en cero'); }
      }
      if (!S.sheet && !S.panel) render();
    }, 30000);
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
