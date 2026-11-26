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
      // Plan en la nube: avisa qué cambió para subirlo a tu coach (cola de envío del arranque).
      if (window.__cjpCloud) try { window.__cjpCloud.dirty(k); } catch (e) {}
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
    help: '',
    hyOpen: store.get('hyOpen', false),
    weights: store.get('weights', {}),
    checkins: store.get('checkins', {}),
    ci: null,
    dirOpen: false,
    extras: store.get('extras:' + today, {}),
    free: store.get('free:' + today, {}),
    opt: store.get('opt:' + today, {}),
    dsClosed: store.get('dsClosed', {}),
    rebal: store.get('rebal:' + today, {}),
    outDrinks: [],
    outFoods: [],
    shopCouple: !!store.get('shopCouple', false),
    outRebal: true,
    batchMode: store.get('batchMode', 'on'),
    batchDone: store.get('batch:' + weekKey, {}),
    fridge: { meal: '', ing: ['', '', ''], result: null },
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

  // Inicio del plan en este dispositivo (Día X · Semana Y de la Storycard).
  if (!D.preview && !store.get('start', null)) store.set('start', today);

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
    if (!(to[a] > 0)) return grams;
    // Huevos, claras y barras en unidades enteras; el resto de a 5 g.
    var st = (D.units && to.id && D.units[to.id]) || 5;
    return Math.max(st, Math.round((src[a] * grams) / to[a] / st) * st);
  }

  // Equivalencias calculadas: mismo aporte del macro ancla, ordenadas por densidad calórica más parecida.
  // Franja del día de cada comida: los swaps nunca proponen parrilla en el desayuno ni platos pesados peri-entreno.
  var SLOT = { breakfast: 'am', snack: 'am', lunch: 'main', dinner: 'main', peri: 'peri', post: 'peri' };
  function swapOptions(orig, role) {
    var src = orig && srcOf(orig);
    if (!src) return [];
    var dens = kcal100(src), slot = SLOT[role];
    return Object.keys(D.foods)
      .filter(function (id) { var f = D.foods[id]; return id !== orig.foodId && !(D.avoid && D.avoid.indexOf(id) >= 0) && src.groups.indexOf(f.group) >= 0 && f[src.anchor] > 0 && (!slot || !f.slots || f.slots.indexOf(slot) >= 0); })
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
  function mealName(m, mode) { return isOffPeri(m, mode) ? 'Merienda · Día de Descanso' : m.name; }

  // Comida libre controlada (Comer fuera): bloque promedio balanceado que reemplaza la comida en la telemetría.
  var FREE_MEAL = { p: 45, c: 70, f: 32 };
  // Bebidas sociales: el alcohol / azúcar se computa como carbos equivalentes (7 kcal/g de alcohol ≈ 1,75 g de carbo).
  // Valores aproximados por unidad típica en Argentina (copa 150 ml, pinta 500 ml, vaso de trago 350 ml).
  // nc: carbos netos reales (azúcares) por unidad, para los protocolos Keto / Low Carb; sug: azúcar del mixer.
  var OUT_DRINKS = [
    { id: 'fernet', icon: '🥃', label: 'Fernet con Coca Zero / Sin Azúcar (recomendado)', c: 32, nc: 8, sug: 0 },
    { id: 'fernet-comun', icon: '🥃', label: 'Fernet con Coca común', c: 52, nc: 45, sug: 37 },
    { id: 'vino', icon: '🍷', label: 'Copa de vino', c: 31, nc: 4 },
    { id: 'cerveza', al: ['gluten'], icon: '🍺', label: 'Pinta de cerveza', c: 54, nc: 18 },
    { id: 'gin-light', icon: '🍸', label: 'Gin tonic con tónica light', c: 28, nc: 2 },
    { id: 'gin', icon: '🍸', label: 'Gin tonic', c: 44, nc: 14 },
  ];
  // Catálogo argentino para salir a comer: kcal y macros aproximados por porción real.
  var OUT_FOODS = [
    { cat: 'Empanadas', id: 'emp-carne-h', al: ['gluten', 'veg'], label: 'Empanada de carne al horno', unit: '1 u', p: 11, c: 27, f: 13 },
    { cat: 'Empanadas', id: 'emp-carne-f', al: ['gluten', 'veg'], label: 'Empanada de carne frita', unit: '1 u', p: 11, c: 27, f: 21 },
    { cat: 'Empanadas', id: 'emp-pollo-h', al: ['gluten', 'veg'], label: 'Empanada de pollo al horno', unit: '1 u', p: 12, c: 26, f: 9 },
    { cat: 'Empanadas', id: 'emp-pollo-f', al: ['gluten', 'veg'], label: 'Empanada de pollo frita', unit: '1 u', p: 12, c: 26, f: 16 },
    { cat: 'Parrilla', id: 'asado-tira', al: ['veg'], label: 'Asado de tira', unit: '200 g cocido', p: 48, c: 0, f: 44 },
    { cat: 'Parrilla', id: 'vacio', al: ['veg'], label: 'Vacío', unit: '200 g cocido', p: 50, c: 0, f: 34 },
    { cat: 'Parrilla', id: 'chorizo', al: ['veg'], label: 'Chorizo', unit: '1 u (100 g)', p: 14, c: 2, f: 27 },
    { cat: 'Parrilla', id: 'provoleta', al: ['lactose', 'dairy'], label: 'Provoleta', unit: '1 porción (100 g)', p: 25, c: 2, f: 27 },
    { cat: 'Sánguches', id: 'milanga', al: ['gluten', 'veg', 'egg', 'lactose', 'dairy'], label: 'Sánguche de milanesa completo', unit: '1 u', p: 45, c: 85, f: 48 },
    { cat: 'Sánguches', id: 'lomito', al: ['gluten', 'veg', 'egg', 'lactose', 'dairy'], label: 'Lomito completo', unit: '1 u', p: 55, c: 75, f: 52 },
    { cat: 'Pizza', id: 'pizza-muzza', al: ['gluten', 'lactose', 'dairy'], label: 'Pizza de muzzarella', unit: '1 porción (1/8)', p: 12, c: 30, f: 11 },
    { cat: 'Pizza', id: 'pizza-fuga', al: ['gluten', 'lactose', 'dairy'], label: 'Fugazzeta', unit: '1 porción (1/8)', p: 13, c: 30, f: 14 },
    { cat: 'Postres y helado', id: 'helado-bocha', al: ['lactose', 'dairy'], label: 'Helado de crema', unit: '1 bocha', p: 2.5, c: 18, f: 6.5 },
    { cat: 'Postres y helado', id: 'helado-agua', al: [], label: 'Helado al agua / frutal', unit: '1 bocha', p: 0.5, c: 22, f: 0.5 },
    { cat: 'Postres y helado', id: 'helado-cuarto', al: ['lactose', 'dairy'], label: 'Helado de crema', unit: '¼ kg', p: 9, c: 63, f: 23 },
    { cat: 'Postres y helado', id: 'flan-ddl', al: ['egg', 'lactose', 'dairy'], label: 'Flan con dulce de leche', unit: '1 porción', p: 7, c: 50, f: 11 },
    { cat: 'Postres y helado', id: 'flan', al: ['egg', 'lactose', 'dairy'], label: 'Flan solo', unit: '1 porción', p: 5, c: 30, f: 5.5 },
    { cat: 'Postres y helado', id: 'panqueque-ddl', al: ['gluten', 'egg', 'lactose', 'dairy'], label: 'Panqueque con dulce de leche', unit: '1 u', p: 7, c: 52, f: 12 },
  ];
  // Lo que el alumno no puede comer (alergias o vegetariano) directamente no aparece.
  // Protocolo Keto / Low Carb: sólo lo que entra en su tope de carbos por porción (keto ≤ 6 g por plato / 8 g por
  // trago; low carb ≤ 15 / 18 g). Alergias y vegetariano: directamente no aparece.
  function outProto() { var a = D.allergies || []; return a.indexOf('keto') >= 0 ? 'keto' : a.indexOf('lowcarb') >= 0 ? 'lowcarb' : ''; }
  function outOk(x) {
    if ((x.al || []).some(function (a) { return (D.allergies || []).indexOf(a) >= 0; })) return false;
    var pr = outProto();
    if (!pr) return true;
    var c = x.nc != null ? x.nc : x.c, drink = !x.unit;
    return c <= (pr === 'keto' ? (drink ? 8 : 6) : (drink ? 18 : 15));
  }
  function outFood(id) { return OUT_FOODS.filter(function (x) { return x.id === id; })[0]; }
  function outDrink(id) { return OUT_DRINKS.filter(function (x) { return x.id === id; })[0]; }
  function kcalOf(x) { return x.p * 4 + x.c * 4 + x.f * 9; }
  // Cuenta repeticiones (["vino","vino"] → { vino: 2 }).
  function countOf(list) { var o = {}; (list || []).forEach(function (id) { o[id] = (o[id] || 0) + 1; }); return o; }
  function sceneOf(id) { return OUT_SCENES.filter(function (o) { return o.id === id; })[0]; }
  // Comida libre: con los macros EXACTOS de la comida que reemplaza (planes viejos: bloque fijo de 748 kcal).
  function freeItems(m, fr) {
    var sc = typeof fr === 'object' ? fr.scene : fr, o = sceneOf(sc), lbl = (o || {}).label || 'Salida';
    var mac = typeof fr === 'object' && fr.p !== undefined ? fr : FREE_MEAL;
    var foods = typeof fr === 'object' && fr.foods ? countOf(fr.foods) : null;
    var out = foods && Object.keys(foods).length
      ? Object.keys(foods).map(function (id) { var x = outFood(id) || { label: id, unit: '', p: 0, c: 0, f: 0 }, n = foods[id]; return { id: 'out-' + id, food: n + ' × ' + x.label + (x.unit ? ' (' + x.unit + ')' : '') + ' · ' + lbl, grams: 0, p: x.p * n, c: x.c * n, f: x.f * n, leucine: x.p * n * 0.08, free: true }; })
      : [{ id: 'free-' + m.id, food: 'Comida libre controlada · ' + lbl, grams: 0, p: mac.p, c: mac.c, f: mac.f, leucine: mac.p * 0.08, free: true }];
    var dc = countOf((typeof fr === 'object' && fr.drinks) || []);
    Object.keys(dc).forEach(function (d) {
      var dr = outDrink(d);
      if (dr) out.push({ id: 'drink-' + d, food: dr.icon + ' ' + (dc[d] > 1 ? dc[d] + ' × ' : '') + dr.label, grams: 0, p: 0, c: dr.c * dc[d], f: 0, leucine: 0, free: true, drink: true });
    });
    return out;
  }
  // Rebalanceo post-salida: la comida siguiente baja ~18 % sus carbos y grasas (la proteína queda igual).
  var REBAL = 0.82;
  var CARB_FAT = { starch: 1, cereal: 1, fruit: 1, 'sport-carb': 1, fat: 1 };
  function rebalance(items) {
    return items.map(function (it) {
      var f = it.foodId && D.foods[it.foodId];
      if (!f || !CARB_FAT[f.group] || !(it.grams > 0)) return it;
      var g = Math.max(5, Math.round((it.grams * REBAL) / 5) * 5), k = g / it.grams;
      return Object.assign({}, it, { grams: g, p: it.p * k, c: it.c * k, f: it.f * k, leucine: it.leucine * k, rebal: it.grams });
    });
  }

  // Swap matrix: el alimento nuevo iguala el macro ancla y la grasa / el almidón de la misma comida compensan el resto.
  function compensateResolved(orig, res) {
    var out = res.slice();
    var tweak = function (macro, delta, groups, tol, skip) {
      if (Math.abs(delta) <= tol) return;
      var best = -1;
      out.forEach(function (it, i) {
        var ref = it.foodId && D.foods[it.foodId];
        if (i === skip || it.swappedFrom || !ref || groups.indexOf(ref.group) < 0 || !(ref[macro] > 0)) return;
        if (best < 0 || it[macro] > out[best][macro]) best = i;
      });
      if (best < 0) return;
      var host = out[best], ref = D.foods[host.foodId];
      var g = Math.max(0, Math.round((host.grams - delta / (ref[macro] / 100)) / 5) * 5);
      if (g === host.grams) return;
      var k = g / 100;
      out[best] = { id: host.id, foodId: host.foodId, food: host.food, grams: g, p: ref.p * k, c: ref.c * k, f: ref.f * k, leucine: ref.leucine * k, adjusted: host.grams };
    };
    res.forEach(function (it, i) {
      if (!it.swappedFrom) return;
      tweak('f', it.f - orig[i].f, ['fat'], 2, i);
      tweak('c', it.c - orig[i].c, ['starch', 'cereal', 'fruit', 'sport-carb'], 5, i);
    });
    // Lo que quedó en 0 g por compensación se sigue mostrando ("Ajustado por SWAP: 8 → 0 g").
    return out.filter(function (it) { return it.grams > 0 || it.adjusted; });
  }

  // Opciones 2 a 5 (los planes exportados antes de las 5 opciones traen una sola en "alt").
  function mealAlts(m) { return m.alts && m.alts.length ? m.alts : m.alt && m.alt.items ? [m.alt] : []; }

  function mealsFor(mode, extras, free, opt, rebal) {
    extras = extras || S.extras;
    free = free || S.free;
    opt = opt || S.opt;
    rebal = rebal || (free === S.free ? S.rebal : {});
    var base = D.meals.filter(function (m) { return m.day === 'both' || m.day === mode; });
    var out = extras.__out;
    if (out && out.length) base = base.concat([{ id: '__out', name: 'Fuera del plan · análisis IA', time: out[0].at || '12:00', day: mode, role: 'snack', mps: false, items: [] }]);
    return base
      // Orden cronológico inquebrantable: 00:00-03:59 cuenta como final del día (nunca antes del desayuno).
      .sort(function (a, b) { return timeToMinutes(a.time) - timeToMinutes(b.time); })
      .map(function (m) {
        var fr = free[m.id];
        // Opción culinaria elegida por el atleta (1 = sugerida, 2 a 5 = alternativas equivalentes).
        var alts = mealAlts(m), on = +opt[m.id] || 1, alt = on > 1 ? alts[on - 2] : null;
        if (!alt || !alt.items || !alt.items.length) { alt = null; on = 1; }
        var src = alt ? alt.items : m.items;
        var items = fr && typeof fr === 'object' && fr.items ? fr.items : fr ? freeItems(m, fr) : compensateResolved(src, src.map(resolveItem)).concat(extras[m.id] || []);
        if (!fr && rebal[m.id]) items = rebalance(items);
        var t = items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
        return { m: m, items: items, src: src, opt: on, alt: alt, t: t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
      });
  }

  // Cumplimiento: todas las comidas tildadas y kcal dentro de ±5 % del plan.
  var ADHERENCE_TOL = 0.05;

  function daySummary(iso) {
    var cur = iso === S.date;
    var checks = cur ? S.checks : store.get('checks:' + iso, {});
    var mode = cur ? S.mode : modeFor(iso);
    var list = mealsFor(mode, cur ? S.extras : store.get('extras:' + iso, {}), cur ? S.free : store.get('free:' + iso, {}), cur ? S.opt : store.get('opt:' + iso, {}), cur ? S.rebal : store.get('rebal:' + iso, {}));
    var tgt = D.targets[mode];
    var done = 0, k = 0, mp = 0, mc = 0, mf = 0, missed = [];
    list.forEach(function (x) {
      if (checks[x.m.id]) { done++; k += x.kcal; mp += x.t.p; mc += x.t.c; mf += x.t.f; }
      else missed.push(mealName(x.m, mode));
    });
    var pct = tgt.kcal ? k / tgt.kcal : 0;
    return { date: iso, mode: mode, done: done, total: list.length, kcal: Math.round(k), target: tgt.kcal, pct: Math.round(pct * 100), adherent: list.length > 0 && done === list.length && Math.abs(pct - 1) <= ADHERENCE_TOL, p: Math.round(mp), c: Math.round(mc), f: Math.round(mf), missed: missed };
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
    S.opt = store.get('opt:' + iso, {});
    S.rebal = store.get('rebal:' + iso, {});
    if (!D.preview) S.mode = modeFor(iso);
  }

  // ---------- Medidas caseras en lenguaje cotidiano (misma lógica que src/lib/household.ts) ----------
  function humanQty(q, m) {
    var h = q >= 3 ? Math.round(q) : Math.round(q * 2) / 2, half = m.f ? 'media' : 'medio', of = m.of || '';
    if (q < 0.875 && q >= 0.625) return '3/4 de ' + m.one + of;
    if (h <= 0.5) return half + ' ' + m.one + of;
    if (h === 1) return '1 ' + m.one + of;
    if (h === 1.5) return '1 ' + m.one + ' y ' + half + of;
    if (h % 1) return Math.floor(h) + ' ' + m.many + ' y ' + half + of;
    return h + ' ' + m.many + of;
  }
  function pickMeasure(list, grams) {
    var fit = list.filter(function (m) { return grams / m.g >= 0.95; });
    return fit.length ? fit[fit.length - 1] : list[0];
  }
  function pluralFirst(label) {
    var parts = label.split(' '), w = parts[0], p = w;
    if (/ón$/.test(w)) p = w.slice(0, -2) + 'ones';
    else if (/d$/.test(w)) p = w + 'es';
    else if (!/s$/.test(w)) p = w + 's';
    parts[0] = p;
    return parts.join(' ');
  }
  // "≈ 2 potes de 200 g", "≈ 1 bife mediano", "≈ 5 cdas soperas", "≈ 2 unidades" (nada de "2 2 unidadess").
  function unitHintFor(foodId, grams) {
    if (!foodId || !(grams > 0)) return '';
    var list = D.house && D.house[foodId];
    if (list && list.length) { var m = pickMeasure(list, grams); return '≈ ' + esc(humanQty(grams / m.g, m)); }
    var ref = D.foods[foodId];
    if (!ref || !ref.unit) return '';
    var mm = /^(\d+)\s+(.+)$/.exec(ref.unit.label), label = mm ? mm[2] : ref.unit.label, per = mm ? ref.unit.grams / +mm[1] : ref.unit.grams;
    if (/^\d|\//.test(label)) return '';
    var one = mm ? label.replace(/ones\b/, 'ón').replace(/(unidad)es\b/, '$1').replace(/([^s])s\b/, '$1') : label;
    return '≈ ' + esc(humanQty(grams / per, { g: per, one: one, many: pluralFirst(one), f: /^(porción|unidad|taza|copa|pinta|brochette)/.test(one) }));
  }


  // Ayuda contextual (?): una explicación por tema, se abre con un toque y se cierra con otro.
  var HELP = {
    mode: '<b>Día de entreno:</b> el plan trae más carbohidratos para que rindas y te recuperes. <b>Día de descanso:</b> menos carbohidratos, más grasas buenas y la misma proteína. La app elige sola según tus días de entreno; si hoy cambiaste, tocá el otro.',
    swap: 'Tocá <b>Cambiar</b> al lado de un alimento y elegí otro de la lista: los gramos ya vienen calculados para que aporte lo mismo (proteínas, carbos o grasas). Tu día sigue cuadrando.',
    leu: 'La <b>leucina</b> es el aminoácido de la proteína que le da la orden al músculo de construirse (los científicos lo llaman «vía mTOR»). Con unos <b>2,5-3 g por comida principal</b> esa orden se activa al máximo. En las colaciones no hace falta llegar.',
    weight: 'Pesate en ayunas, después del baño y siempre a la misma hora. El peso sube y baja día a día por agua y comida: <b>lo que importa es la tendencia de la curva</b> en varias semanas.',
  };
  function helpBtn(k) { return '<button class="qh' + (S.help === k ? ' on' : '') + '" data-help="' + k + '" aria-label="¿Qué significa?" aria-expanded="' + (S.help === k) + '">?</button>'; }
  function helpLine(k) { return S.help === k ? '<p class="help-pop">' + HELP[k] + '</p>' : ''; }
  // Macros con nombre completo (la app no usa siglas sueltas tipo P / C / G).
  function mtxt(p, c, f) { return 'Proteínas ' + n0(p) + ' g · Carbos ' + n0(c) + ' g · Grasas ' + n0(f) + ' g'; }
  function mshort(p, c, f) { return n0(p) + ' g prot. · ' + n0(c) + ' g carbos · ' + n0(f) + ' g grasas'; }

  function leuTip(need) {
    var egg = D.foods.huevo ? D.foods.huevo.leucine * 0.6 : 0.65;
    var whey = D.foods.whey ? D.foods.whey.leucine / 100 : 0.085;
    var eggs = Math.max(1, Math.ceil(need / egg));
    var g = Math.max(5, Math.ceil(need / whey / 5) * 5);
    return 'sumá ' + eggs + ' huevo' + (eggs > 1 ? 's' : '') + ' o ' + g + ' g de proteína en polvo (whey)';
  }

  function timeToMinutes(hhmm) {
    var p = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    if (!p) return 720;
    var t = (+p[1] % 24) * 60 + +p[2];
    return t < 240 ? t + 1440 : t;
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
      h += '</svg><div class="gv done"><div class="glabel">[ ¡DÍA CUMPLIDO! · 100 % DEL PLAN ]</div><div class="gnum">100%</div><div class="gsub">' + n0(eaten.k) + ' / ' + n0(tgt.kcal) + ' kcal · OBJETIVO</div></div></div>';
    } else {
      h += '</svg><div class="gv"><div class="glabel">' + (left >= 0 ? 'CALORÍAS QUE TE FALTAN' : 'CALORÍAS DE MÁS') + '</div><div class="gnum' + (left < 0 ? ' over' : '') + '">' + n0(Math.abs(left)) + '</div><div class="gsub">comiste ' + n0(eaten.k) + ' de ' + n0(tgt.kcal) + ' kcal</div></div></div>';
    }
    h += '<div class="minis">' + mini('PROTEÍNA', eaten.p, tgt.p, '#38BDF8', complete) + mini('CARBOS', eaten.c, tgt.c, '#7DD3FC', complete) + mini('GRASAS', eaten.f, tgt.f, '#F97316', complete) + '</div>';
    if (run > 0) h += '<div class="streak' + (complete ? ' hot' : '') + '">🔥 ' + run + ' día' + (run > 1 ? 's' : '') + ' seguidos en adherencia</div>';
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
    var cups = Math.ceil(goal / 250), full = Math.floor(S.water / 250), pct = goal ? Math.min(100, Math.round((S.water / goal) * 100)) : 0;
    // Plegado por defecto: el encabezado muestra el progreso y se expande al tocarlo.
    var h = '<section class="card fold"><button class="fold-hd" data-hy="1" aria-expanded="' + (S.hyOpen ? 'true' : 'false') + '"><span class="tag">[ HIDRATACIÓN ]</span><span class="fold-peek">' + L(S.water) + ' / ' + L(goal) + ' L' + (S.water >= goal ? ' · ✓' : '') + '</span><span class="chev' + (S.hyOpen ? ' up' : '') + '"></span></button>';
    h += '<div class="fold-bar"><i style="width:' + pct + '%"></i></div>';
    if (!S.hyOpen) return h + '</section>';
    h += '<div class="fold-body"><p class="fold-sub">Meta del día ' + (mode === 'on' ? 'de entreno' : 'de descanso') + ': ' + L(goal) + ' L · cada vaso son 250 ml</p>';
    h += '<p class="hy-note">💧 Sumá sólo agua, soda o la isotónica del entreno. <b>El mate, café, té y las gaseosas no suman</b> en este contador.</p><div class="cups">';
    for (var i = 0; i < cups; i++) h += '<button class="cup' + (i < full ? ' on' : '') + '" data-cup="' + i + '" aria-label="Vaso ' + (i + 1) + '"><i></i></button>';
    h += '</div><div class="wbtns"><button data-water="250">+250 ml</button><button data-water="500">+500 ml</button><button data-water="0" class="ghost">Reiniciar</button></div>';
    if (S.water >= goal) h += '<div class="ok-line">✓ Meta de hidratación cumplida</div>';
    return h + '</div></section>';
  }

  // ---------- 1b · Próxima comida (según la hora) ----------
  function nextMeal(list) {
    var pending = list.filter(function (x) { return !S.checks[x.m.id]; });
    if (!pending.length) return null;
    if (S.date !== today) return pending[0];
    var nowMin = now.getHours() * 60 + now.getMinutes();
    // La comida en curso (hasta 60 min tarde) o la siguiente; si todas quedaron atrás, la pendiente más reciente.
    var up = pending.filter(function (x) { return toMin(x.m.time) >= nowMin - 60; });
    return up.length ? up[0] : pending[pending.length - 1];
  }
  function nextCard(list, mode) {
    var x = nextMeal(list);
    if (!list.length) return '';
    if (!x) return '<section class="next-card done"><div class="nx-k">Próxima comida</div><div class="nx-name">✓ Todas las comidas del día cumplidas</div><p class="nx-sub">Buen trabajo. Mañana seguimos con el mismo plan.</p></section>';
    var nowMin = now.getHours() * 60 + now.getMinutes(), t = toMin(x.m.time), when = '';
    if (S.date === today) when = t > nowMin ? 'en ' + fmtDur(t - nowMin) : t >= nowMin - 60 ? 'ahora' : 'pendiente desde las ' + esc(x.m.time);
    var title = x.alt ? x.alt.title : x.m.title;
    var h = '<section class="next-card"><div class="nx-top"><span class="nx-k">Próxima comida' + (when ? ' · ' + when : '') + '</span><span class="nx-time">' + esc(x.m.time) + '</span></div>';
    h += '<div class="nx-name">' + esc(mealName(x.m, mode)) + '</div>';
    if (title) h += '<div class="nx-dish">' + esc(title) + (x.opt > 1 ? ' · opción ' + x.opt : '') + '</div>';
    h += '<div class="nx-macros"><b>' + n0(x.kcal) + '</b> kcal · ' + mtxt(x.t.p, x.t.c, x.t.f) + '</div>';
    var its = x.items.filter(function (it) { return !it.free; }).slice(0, 5);
    if (its.length) h += '<ul class="nx-items">' + its.map(function (it) { var hint = unitHintFor(it.foodId, it.grams); return '<li><span>' + n0(it.grams) + ' g</span>' + esc(it.food) + (hint ? ' <em>' + hint + '</em>' : '') + '</li>'; }).join('') + '</ul>';
    h += '<div class="nx-btns"><button class="nx-check" data-check="' + esc(x.m.id) + '">✓ Marcar como cumplida</button><button class="nx-go" data-goto="' + esc(x.m.id) + '">Ver detalle ↓</button></div></section>';
    return h;
  }

  // ---------- 1c · Peso corporal: registro diario opcional + curva de 4 semanas ----------
  function weightSeries(endIso, days) {
    var pts = [];
    for (var i = days - 1; i >= 0; i--) { var d = addDays(endIso, -i), v = S.weights[d]; if (v > 0) pts.push({ i: days - 1 - i, d: d, v: v }); }
    return pts;
  }
  function weightDelta(pts, back) {
    if (pts.length < 2) return null;
    var last = pts[pts.length - 1], ref = null;
    pts.forEach(function (p) { if (p.i <= last.i - back + 3 && (!ref || p.i > ref.i)) ref = p; });
    if (!ref) ref = pts[0];
    return ref === last ? null : Math.round((last.v - ref.v) * 10) / 10;
  }
  function weightCard() {
    var pts = weightSeries(S.date, 28), cur = S.weights[S.date];
    var last = pts.length ? pts[pts.length - 1] : null;
    var h = '<section class="card wcard"><div class="row"><span class="tag">[ PESO CORPORAL ]</span><span class="hv">' + (last ? n1(last.v) + ' kg' : 'Sin registros') + '</span></div>';
    h += '<div class="w-in"><input id="w-in" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="' + (last ? n1(last.v) : 'Ej. 78,5') + '" value="' + (cur ? cur : '') + '" aria-label="Peso en kg"><span>kg</span><button data-wsave="1">' + (cur ? 'Actualizar' : 'Registrar') + '</button></div>';
    h += '<p class="w-hint">Opcional · en ayunas, después del baño, mismo horario' + (S.date !== today ? ' · se guarda para el ' + dateLabel(S.date) : '') + ' ' + helpBtn('weight') + '</p>' + helpLine('weight');
    if (pts.length >= 2) {
      var W = 300, Hh = 74, pad = 6, min = Infinity, max = -Infinity;
      pts.forEach(function (p) { min = Math.min(min, p.v); max = Math.max(max, p.v); });
      if (max - min < 1) { var mid = (max + min) / 2; min = mid - 0.5; max = mid + 0.5; }
      var X = function (i) { return pad + (i / 27) * (W - pad * 2); }, Y = function (v) { return pad + (1 - (v - min) / (max - min)) * (Hh - pad * 2); };
      var line = pts.map(function (p) { return X(p.i).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join(' ');
      var grid = '';
      [7, 14, 21].forEach(function (g) { grid += '<line x1="' + X(g).toFixed(1) + '" y1="0" x2="' + X(g).toFixed(1) + '" y2="' + Hh + '" stroke="rgba(255,255,255,.06)"/>'; });
      h += '<svg class="w-chart" viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="none" aria-label="Curva de peso de 4 semanas">' + grid + '<polyline points="' + line + '" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
      pts.forEach(function (p, k) { h += '<circle cx="' + X(p.i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="' + (k === pts.length - 1 ? 3.4 : 2) + '" fill="' + (k === pts.length - 1 ? '#F97316' : '#38BDF8') + '"/>'; });
      h += '</svg><div class="w-axis"><span>hace 4 sem</span><span>hace 2 sem</span><span>' + (S.date === today ? 'hoy' : dateLabel(S.date)) + '</span></div>';
      var d7 = weightDelta(pts, 7), d28 = weightDelta(pts, 28), sg = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + n1(Math.abs(v)) + ' kg'; };
      h += '<div class="w-stats"><span>Mín <b>' + n1(Math.min.apply(null, pts.map(function (p) { return p.v; }))) + '</b></span><span>Máx <b>' + n1(Math.max.apply(null, pts.map(function (p) { return p.v; }))) + '</b></span>' + (d7 !== null ? '<span>7 días <b>' + sg(d7) + '</b></span>' : '') + (d28 !== null ? '<span>4 sem <b>' + sg(d28) + '</b></span>' : '') + '</div>';
    } else h += '<p class="w-hint">Registrá tu peso 2 días o más para ver la curva de las últimas 4 semanas.</p>';
    return h + '</section>';
  }
  // ---------- Check-in semanal (30 segundos) ----------
  var CI_ENERGY = ['Agotado', 'Cansado', 'Normal', 'Bien', 'A full'];
  var CI_HUNGER = ['Nada de hambre', 'Poca', 'Normal', 'Bastante', 'Mucha hambre'];
  function checkinCard() {
    var c = S.checkins[weekKey];
    var h = '<section class="card cicard" id="checkin-card"><div class="row"><span class="tag">[ CHECK-IN SEMANAL ]</span><span class="hv">' + (c ? '✓ Enviado' : '30 segundos') + '</span></div>';
    if (c) {
      h += '<div class="ci-sum"><span>⚡ Energía <b>' + c.energy + '/5</b></span><span>🍽 Hambre <b>' + c.hunger + '/5</b></span><span>' + (c.heavy ? '🫃 Algo te cayó pesado' : '✓ Buena digestión') + '</span>' + (c.kg ? '<span>⚖ <b>' + n1(c.kg) + ' kg</b></span>' : '') + '</div>';
      h += '<button class="ci-edit" data-panel="checkin">Editar el check-in de esta semana</button>';
    } else {
      h += '<p class="muted" style="font-size:13px;margin-top:6px">Contale a tu coach cómo venís: energía, hambre, digestión y tu peso. Con esto ajusta tu plan.</p>';
      h += '<button class="ci-go" data-panel="checkin">📋 Hacer mi check-in</button>';
    }
    return h + '</section>';
  }
  function ciScale(key, val, labels) {
    var h = '<div class="ci-scale">';
    for (var i = 1; i <= 5; i++) h += '<button data-ci="' + key + '|' + i + '" class="' + (val === i ? 'on' : '') + '" aria-label="' + labels[i - 1] + '"><b>' + i + '</b><span>' + labels[i - 1] + '</span></button>';
    return h + '</div>';
  }
  function checkinPanel() {
    if (!S.ci) {
      var prev = S.checkins[weekKey], pts = weightSeries(today, 28), lastW = pts.length ? pts[pts.length - 1].v : null;
      S.ci = prev ? JSON.parse(JSON.stringify(prev)) : { energy: 0, hunger: 0, heavy: null, note: '', kg: S.weights[today] || lastW || '', photo: '' };
      // La nota guardada junta digestión y observaciones ("la cena · Obs.: dormí poco"): se separan para editar.
      if (!S.ci.obs && /Obs\.: /.test(S.ci.note || '')) { var np = S.ci.note.split(/(?: · )?Obs\.: /); S.ci.note = np[0]; S.ci.obs = np[1] || ''; }
    }
    var c = S.ci;
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ CHECK-IN SEMANAL · SEMANA DEL ' + weekKey.split('-').reverse().join('/') + ' ]</div><h3>¿Cómo venís esta semana?</h3>';
    h += '<div class="ci-q">⚡ Energía y descanso</div>' + ciScale('energy', c.energy, CI_ENERGY);
    h += '<div class="ci-q">🍽 Hambre y saciedad</div>' + ciScale('hunger', c.hunger, CI_HUNGER);
    h += '<div class="ci-q">🫃 ¿Alguna comida te cayó pesada?</div><div class="ci-yn"><button data-ci="heavy|1" class="' + (c.heavy === true ? 'on' : '') + '">Sí</button><button data-ci="heavy|0" class="' + (c.heavy === false ? 'on' : '') + '">No</button></div>';
    if (c.heavy) h += '<textarea id="ci-note" maxlength="280" rows="2" placeholder="¿Cuál? (opcional) Ej: la cena del martes, el licuado antes de entrenar">' + esc(c.note || '') + '</textarea>';
    h += '<div class="ci-q">📝 Observaciones <span class="muted">(opcional)</span></div><textarea id="ci-obs" maxlength="200" rows="2" placeholder="Ej: semana con viajes, dormí poco, me costó la merienda">' + esc(c.obs || '') + '</textarea>';
    h += '<div class="ci-q">⚖ Tu peso de esta semana</div><div class="w-in"><input id="ci-kg" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="' + (c.kg || '') + '" aria-label="Peso en kg"><span>kg</span></div>';
    h += '<div class="ci-q">📷 Foto de progreso <span class="muted">(opcional, sólo la ve tu coach)</span></div>';
    h += c.photo ? '<div class="ci-photo"><img src="' + c.photo + '" alt="Foto de progreso"><button data-ci="photo|0" class="ghost">Quitar foto</button></div>' : '<label class="ci-pick">Elegir o sacar una foto<input id="ci-photo" type="file" accept="image/*" capture="environment" hidden></label>';
    var ok = c.energy && c.hunger && c.heavy !== null;
    h += '<button class="ci-save" data-cisave="1"' + (ok ? '' : ' disabled') + '>' + (ok ? 'Enviar a mi coach' : 'Completá energía, hambre y digestión') + '</button>';
    return h;
  }
  function saveCheckin() {
    var c = S.ci;
    if (!c || !c.energy || !c.hunger || c.heavy === null) return;
    var kg = parseFloat(String(c.kg).replace(',', '.'));
    var obs = String(c.obs || '').trim().slice(0, 200);
    var row = { energy: c.energy, hunger: c.hunger, heavy: !!c.heavy, note: [c.heavy ? String(c.note || '').trim() : '', obs ? 'Obs.: ' + obs : ''].filter(Boolean).join(' · ').slice(0, 280), obs: obs, kg: kg >= 30 && kg <= 250 ? Math.round(kg * 10) / 10 : null, photo: c.photo || '', at: Date.now() };
    S.checkins[weekKey] = row;
    store.set('checkins', S.checkins);
    if (row.kg && S.weights[today] !== row.kg) { S.weights[today] = row.kg; store.set('weights', S.weights); }
    // Además de la nube: WhatsApp con el resumen ya redactado, dirigido al número del coach (listo para Enviar).
    // Se abre en el mismo toque (si se demora, iOS / Android bloquean la ventana).
    var url = 'https://wa.me/' + (D.coachPhone || '') + '?text=' + encodeURIComponent(checkinText(row));
    try { window.open(url, '_blank'); } catch (e) { /* sin ventanas emergentes: queda guardado igual */ }
    S.ci = null; S.panel = null; haptic(); render();
    toast('¡Check-in guardado! Abrimos WhatsApp para mandárselo a tu coach 🙌');
  }
  // Resumen del check-in en texto plano para WhatsApp: peso, adherencia de la semana, energía, hambre y digestión.
  function checkinText(c) {
    var days = [], adh = 0, logged = 0;
    for (var i = 1; i <= 7; i++) days.push(addDays(today, -i));
    days.forEach(function (d) { var h = H[d]; if (h && h.done) { logged++; if (h.adherent) adh++; } });
    var prevW = null, ws = Object.keys(S.weights).filter(function (d) { return d < weekKey; }).sort();
    if (ws.length) prevW = S.weights[ws[ws.length - 1]];
    var t = '📋 *Check-in semanal* · ' + D.athlete.name + '\nSemana del ' + weekKey.split('-').reverse().join('/') + '\n\n';
    if (c.kg) t += '⚖ Peso: ' + n1(c.kg) + ' kg' + (prevW ? ' (' + (c.kg - prevW > 0 ? '+' : c.kg - prevW < 0 ? '−' : '±') + n1(Math.abs(c.kg - prevW)) + ' kg vs. antes)' : '') + '\n';
    t += '✅ Adherencia: ' + adh + ' de 7 días cumplidos' + (logged ? ' (' + logged + ' con registro)' : '') + '\n';
    t += '⚡ Energía y descanso: ' + c.energy + '/5 (' + CI_ENERGY[c.energy - 1] + ')\n';
    t += '🍽 Hambre: ' + c.hunger + '/5 (' + CI_HUNGER[c.hunger - 1] + ')\n';
    var heavyNote = String(c.note || '').split(/(?: · )?Obs\.: /)[0];
    t += '🫃 Digestión: ' + (c.heavy ? 'algo me cayó pesado' + (heavyNote ? ' — ' + heavyNote : '') : 'bien') + '\n';
    if (c.obs) t += '📝 Observaciones: ' + c.obs + '\n';
    if (c.photo) t += '📷 Foto de progreso cargada en la app\n';
    return t + '\n' + D.handle;
  }
  // Foto chica (lado mayor 480 px, JPEG): entra en el check-in sin gastar datos.
  function ciPhoto(file) {
    if (!file || !S.ci) return;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 480 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var url = cv.toDataURL('image/jpeg', 0.7);
        if (url.length > 290000) url = cv.toDataURL('image/jpeg', 0.45);
        if (url.length > 290000) return toast('La foto es muy pesada, probá con otra');
        S.ci.photo = url; renderSheet();
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  function saveWeight() {
    var el = $('#w-in'), v = el ? parseFloat(String(el.value).replace(',', '.')) : NaN;
    if (el && !String(el.value).trim()) { delete S.weights[S.date]; store.set('weights', S.weights); toast('Registro de peso borrado'); return render(); }
    if (!(v >= 30 && v <= 250)) return toast('Ingresá un peso válido en kg (30 a 250)');
    S.weights[S.date] = Math.round(v * 10) / 10;
    store.set('weights', S.weights);
    haptic();
    render();
    toast('Peso registrado · ' + n1(S.weights[S.date]) + ' kg');
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
      ? list.length + ' comidas · ' + (mode === 'on' ? 'entreno ' + hhmm(start) + '–' + hhmm(end) : 'día de descanso')
      : next ? 'Próxima: ' + esc(mealName(next.m, mode)) + ' · ' + esc(next.m.time) : 'No te quedan comidas pendientes';

    var h = '<section class="card tlcard"><button class="tl-hd" data-tl="1" aria-expanded="' + (S.tlOpen ? 'true' : 'false') + '" aria-label="' + esc(peek.replace(/<[^>]+>/g, '')) + '"><span class="tag">[ TU DÍA HORA POR HORA ]</span><span class="chev' + (S.tlOpen ? ' up' : '') + '"></span></button>';
    // Rescate social del día: badge visible aunque el timeline esté plegado.
    list.forEach(function (x) {
      var fr = S.free[x.m.id], sc = fr && !fr.items ? sceneOf(typeof fr === 'object' ? fr.scene : fr) : null;
      if (fr && !fr.items) h += '<div class="tl-social">[ ' + (sc ? sc.icon : '🛡') + ' COMIDA AFUERA: ' + esc((sc ? sc.label : 'SALIDA').toUpperCase()) + ' ] <span>' + esc(x.m.time + ' · ' + mealName(x.m, mode)) + '</span></div>';
    });
    if (!S.tlOpen) return h + '</section>';

    var track = '';
    if (mode === 'on') {
      track += '<div class="tl-win" style="left:' + tx(start - 90).toFixed(2) + '%;width:' + (tx(end + 60) - tx(start - 90)).toFixed(2) + '%"></div>';
      track += '<div class="tl-train" style="left:' + tx(start).toFixed(2) + '%;width:' + Math.max(1.5, tx(end) - tx(start)).toFixed(2) + '%"></div>';
    }
    list.forEach(function (x) {
      var t = toMin(x.m.time), done = !!S.checks[x.m.id];
      track += '<span class="tl-dot' + (done ? ' done' : '') + (S.free[x.m.id] && !S.free[x.m.id].items ? ' social' : '') + (next && next.m.id === x.m.id ? ' next' : '') + '" style="left:' + tx(t).toFixed(2) + '%" title="' + esc(x.m.time + ' · ' + mealName(x.m, mode)) + '"></span>';
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
    else if (next) info = 'Próxima comida: <b>' + esc(mealName(next.m, mode)) + '</b> en ' + fmtDur(toMin(next.m.time) - nowMin);
    else info = '<b>No te queda ninguna comida pendiente</b> · día al día';
    var rel = '';
    if (mode === 'on' && live) {
      if (nowMin < start) rel = 'Entreno ' + hhmm(start) + '–' + hhmm(end) + ' · en ' + fmtDur(start - nowMin);
      else if (nowMin <= end) rel = '<em class="hot">SESIÓN EN CURSO · quedan ' + fmtDur(end - nowMin) + '</em>';
      else rel = 'Entreno terminado hace ' + fmtDur(nowMin - end) + ' · ventana de recuperación';
    } else if (mode === 'on') rel = 'Entreno ' + hhmm(start) + '–' + hhmm(end);
    else rel = 'Día de descanso · sin entreno';

    h += '<div class="tl"><div class="tl-labels">' + labels + '</div><div class="tl-track">' + track + '</div><div class="tl-axis">' + axis + '</div></div>';
    h += '<div class="tl-info"><div>' + info + '</div><span>' + rel + '</span></div>';
    h += '<div class="legend"><span><i class="lg-s"></i>Entreno</span><span><i class="lg-w"></i>Antes y después de entrenar</span><span><i class="lg-m"></i>Comida</span><span><i class="lg-n"></i>Ahora</span></div></section>';
    return h;
  }

  // ---------- 4 · Lista de compras semanal ----------
  // Reparto semanal de la verdura del plan (crudo) y peso de cada unidad en la verdulería.
  var VERDU = [
    { id: 'tomate', name: 'Tomate', share: 0.24, u: 150, one: 'tomate', many: 'tomates' },
    { id: 'lechuga', name: 'Lechuga (o rúcula / espinaca)', share: 0.12, u: 250, one: 'planta', many: 'plantas' },
    { id: 'zanahoria', name: 'Zanahoria', share: 0.14, u: 100, one: 'zanahoria', many: 'zanahorias' },
    { id: 'zucchini', name: 'Zapallito o zucchini', share: 0.14, u: 200, one: 'unidad', many: 'unidades' },
    { id: 'cebolla', name: 'Cebolla (común o morada)', share: 0.1, u: 150, one: 'cebolla', many: 'cebollas' },
    { id: 'morron', name: 'Morrón (rojo o verde)', share: 0.1, u: 180, one: 'morrón', many: 'morrones' },
    { id: 'brocoli', name: 'Brócoli', share: 0.16, u: 400, one: 'planta', many: 'plantas' },
  ];
  // Ensaladas y salteados rápidos con el aliño medido (1 cdita de aceite = 5 ml ≈ 45 kcal).
  var SALADS = [
    { t: 'Criolla', d: 'Tomate + cebolla morada + morrón en cubitos.', a: '1 cdita de aceite de oliva + 1 cda de vinagre, sal y orégano.' },
    { t: 'Mixta clásica', d: 'Lechuga + tomate + zanahoria rallada.', a: '1 cdita de aceite de oliva + jugo de ½ limón y sal.' },
    { t: 'Zanahoria y repollo', d: 'Zanahoria y repollo rallados finitos (aguanta 3 días en la heladera).', a: '1 cdita de aceite + 1 cda de vinagre de manzana + 1 cdita de semillas.' },
    { t: 'Salteado de zucchini', d: 'Zapallito o zucchini + cebolla + morrón en tiras, 5-6 min en sartén antiadherente.', a: '1 cdita de aceite de oliva, ajo, sal y pimienta.' },
    { t: 'Brócoli al vapor', d: 'Ramitos de brócoli 5 min al vapor o 3 min en el microondas con un chorrito de agua.', a: '1 cdita de aceite de oliva + limón y una pizca de sal.' },
    { t: 'Tomates asados con rúcula', d: 'Tomates en mitades 20 min a 200 °C sobre una cama de rúcula o espinaca.', a: '1 cdita de aceite de oliva + 1 cda de aceto balsámico.' },
  ];
  function saladsBlock() {
    var h = '<details class="salads"><summary>🥗 6 ensaladas y salteados rápidos para tu verdura</summary>';
    SALADS.forEach(function (x) { h += '<div class="salad"><b>' + esc(x.t) + ':</b> ' + esc(x.d) + '<i>Aliño: ' + esc(x.a) + '</i></div>'; });
    return h + '<p class="sl-note">Si tu comida ya trae aceite en el plan, ese es el aliño: no sumes otra cucharadita. Limón, vinagre, mostaza, hierbas y especias son libres.</p></details>';
  }

  function shoppingList() {
    var onDays = Math.max(0, Math.min(7, D.trainingDays)), mult = { on: onDays, off: 7 - onDays, both: 7 };
    var rules = D.shopRules || {};
    var acc = {};
    var addMeals = function (meals, mlt, resolve) {
      meals.forEach(function (m) {
        m.items.map(resolve).forEach(function (it) {
          var rule = (it.foodId && rules[it.foodId]) || {};
          var key = rule.key || it.foodId || 'x:' + it.food;
          if (!acc[key]) acc[key] = { foodId: it.foodId, name: rule.name || it.food, rule: rule, grams: 0 };
          else if (!acc[key].foodId) acc[key].foodId = it.foodId;
          acc[key].grams += it.grams * mlt[m.day];
        });
      });
    };
    // Cada comida suma el plato que el alumno eligió (opción 1 a 5); si cambia de plato, la lista se rearma sola.
    var pref = store.get('optPref', {});
    addMeals(D.meals.map(function (m) {
      var n = +pref[m.id] || 1, alt = n > 1 ? mealAlts(m)[n - 2] : null;
      return alt && alt.items && alt.items.length ? { day: m.day, items: alt.items } : m;
    }), mult, resolveItem);
    // Modo Parejas: lista combinada (lo de los dos, cada uno con sus gramos y sus días de entreno).
    if (S.shopCouple && D.partner) {
      var pOn = Math.max(0, Math.min(7, D.partner.trainingDays || onDays));
      addMeals(D.partner.meals, { on: pOn, off: 7 - pOn, both: 7 }, function (it) { return it; });
    }
    // Verdulería concreta: la «verdura» del plan se reparte en verduras reales con unidades de verdulería.
    var vk = Object.keys(acc).filter(function (k) { return acc[k].foodId === 'vegetales'; })[0];
    if (vk) {
      var vg = acc[vk].grams;
      delete acc[vk];
      VERDU.forEach(function (v) { acc['veg:' + v.id] = { foodId: null, name: v.name, rule: { section: 'Verdulería' }, grams: vg * v.share, verdu: v }; });
      acc['veg:limon'] = { foodId: null, name: 'Limón (para aliñar)', rule: { section: 'Verdulería' }, grams: 0, verdu: { fixed: '4 u' } };
    }
    var groups = {};
    Object.keys(acc).forEach(function (k) {
      var it = acc[k], ref = it.foodId && D.foods[it.foodId], r = it.rule;
      if (it.verdu) {
        var vv = it.verdu, vrow = { key: k, foodId: null, name: it.name, grams: Math.max(vv.u || 0, Math.ceil(it.grams / 50) * 50), hint: '', note: '' };
        if (vv.fixed) { vrow.label = vv.fixed; vrow.grams = 0; }
        else { var nu = Math.max(1, Math.round(vrow.grams / vv.u)); vrow.note = '≈ ' + nu + ' ' + (nu > 1 ? vv.many : vv.one); }
        (groups['Verdulería'] = groups['Verdulería'] || []).push(vrow);
        return;
      }
      var cat = r.section || (ref ? D.categories[ref.group] : '') || D.shopFallback || 'Otros';
      var row = { key: k, foodId: it.foodId, name: it.name, grams: it.grams, cooked: it.grams, hint: '', note: '' };
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
      row.pack = packText(it.foodId, row.grams);
      row.brands = it.foodId && D.brands ? D.brands[it.foodId] : null;
      row.seal = !!(it.foodId && D.glutenSeal && D.glutenSeal.indexOf(it.foodId) >= 0);
      (groups[cat] = groups[cat] || []).push(row);
    });
    if (D.supplements.length) groups['Suplementos'] = (groups['Suplementos'] || []).concat(D.supplements.map(function (s) { return { key: 'sup:' + s.id, name: s.name, dose: s.dose }; }));
    return D.categoryOrder.filter(function (c) { return groups[c]; }).map(function (c) {
      return { cat: c, items: groups[c].sort(function (a, b) { return (b.grams || 0) - (a.grams || 0); }) };
    });
  }

  // Plural de un envase: todas las palabras antes de "de" / "(" ("pote individual" → "potes individuales").
  function pluralPack(label) {
    var m = /^(.*?)( de .*| \(.*)?$/.exec(label), head = m[1], tail = m[2] || '';
    return head.split(' ').map(function (w) {
      if (w === '/' || /s$/.test(w)) return w;
      if (/ón$/.test(w)) return w.slice(0, -2) + 'ones';
      if (/[lrnd]$/.test(w)) return w + 'es';
      return w + 's';
    }).join(' ') + tail;
  }
  // "720 g Pan integral ≈ 2 paquetes de 500 g" · claras: huevos frescos para separar, siempre hacia arriba
  // ("1,5 kg Claras ≈ comprá 48 huevos (1 maple de 30 + 1 docena + 1 media docena) para separar claras; ...").
  function packText(foodId, grams) {
    var packs = foodId && D.shopPacks && D.shopPacks[foodId];
    if (!packs || !(grams > 0)) return '';
    var eggs = foodId === 'claras', tol = eggs ? 0 : 0.15, rest = grams, parts = [], bought = 0;
    packs.forEach(function (pk, i) {
      var last = i === packs.length - 1, n = last ? Math.max(0, Math.ceil((rest - pk[0] * tol) / pk[0])) : Math.floor(rest / pk[0]);
      if (last && n === 0 && rest > pk[0] * tol) n = 1;
      if (n > 0) {
        var lab = eggs ? pk[1].replace(/ huevos$/, '') : pk[1];
        parts.push(n + ' ' + (n > 1 ? pluralPack(lab) : lab)); rest -= n * pk[0]; bought += n * pk[0];
      }
    });
    if (!parts.length) { parts.push('1 ' + packs[packs.length - 1][1]); bought = packs[packs.length - 1][0]; }
    if (eggs) return '≈ comprá ' + Math.round(bought / 33) + ' huevos (' + parts.join(' + ') + ') para separar claras; las yemas no entran en tu plan';
    return '≈ ' + parts.join(' + ');
  }
  function qty(g) { return g >= 1000 ? n1(Math.round(g / 100) / 10) + ' kg' : n0(Math.round(g / 10) * 10) + ' g'; }
  function shopQty(i) {
    if (i.dose) return i.dose;
    if (i.label) return i.label;
    return (i.raw ? '~' : '') + qty(i.grams);
  }

  function shopText(list) {
    var t = '🛒 *LISTA DE COMPRAS SEMANAL* · ' + D.athlete.name + (S.shopCouple && D.partner ? ' + ' + D.partner.name + ' (pareja)' : '') + '\nSemana del ' + weekKey.split('-').reverse().join('/') + ' · ' + D.trainingDays + ' días de entreno + ' + (7 - D.trainingDays) + ' de descanso\n';
    list.forEach(function (g) {
      t += '\n*' + g.cat.toUpperCase() + '*\n';
      g.items.forEach(function (i) {
        t += '▢ ' + i.name + ': *' + shopQty(i) + '*' + (i.pack ? ' ' + i.pack : '') + (i.note ? ' (' + i.note + ')' : !i.pack && i.hint ? ' (' + i.hint.replace('≈ ', '≈') + ')' : '') + '\n';
        if (i.brands) t += '   ↳ Marca sugerida: ' + i.brands[D.brandTier || 0] + (i.seal ? ' (con logo Sin TACC)' : '') + '\n';
        else if (i.seal) t += '   ↳ Marca a elección, con logo Sin TACC\n';
      });
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
    if (S.panel === 'checkin') return open(bg, sh, checkinPanel());
    if (S.panel === 'shop') {
      var list = shoppingList();
      var h2 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ LISTA DE COMPRAS · SEMANA DEL ' + weekKey.split('-').reverse().join('/') + ' ]</div><h3>Totales para 7 días</h3><p class="muted" style="font-size:12.5px">' + D.trainingDays + ' días de entreno + ' + (7 - D.trainingDays) + ' de descanso · con los platos que elegiste en cada comida (si cambiás de opción, la lista se actualiza sola). Carnes en peso crudo, arroz y fideos en seco. Pan, galletas, carnes, leche, arroz, fideos, avena, frutas y verduras: <b>marca a elección</b>' + (D.glutenSeal && D.glutenSeal.length ? ' (siempre con el logo oficial Sin TACC en los envasados)' : '') + '.</p>';
      if (D.partner) h2 += '<div class="tabs shop-couple"><button data-shopcouple="0" class="' + (S.shopCouple ? '' : 'on') + '">SÓLO MI LISTA</button><button data-shopcouple="1" class="' + (S.shopCouple ? 'on' : '') + '">PAREJA · YO + ' + esc(D.partner.name.toUpperCase()) + '</button></div>' + (S.shopCouple ? '<p class="muted" style="font-size:12px">Suma lo de los dos (cada uno con sus porciones): una sola compra para la semana.</p>' : '');
      h2 += '<button class="wa-btn" data-washop="1">[ 📲 Mandar lista por WhatsApp ]</button>';
      h2 += '<button class="batch-btn" data-panel="batch">[ 🍳 GUÍA DE BATCH COOKING DEL FIN DE SEMANA ]</button>';
      list.forEach(function (g) {
        h2 += '<div class="shop-cat">' + esc(g.cat) + '</div>';
        g.items.forEach(function (i) {
          var on = !!S.shop[i.key];
          var tier = D.brandTier || 0;
          h2 += '<button class="shop-item' + (on ? ' done' : '') + '" data-shopcheck="' + esc(i.key) + '"><span class="chk">' + CHECK + '</span><span class="sn">' + esc(i.name) + (i.brands ? '<em class="br">Marca sugerida: ' + esc(i.brands[tier]) + (i.seal ? ' · con logo Sin TACC' : '') + '</em>' : i.foodId ? '<em class="br">Marca a elección' + (i.seal ? ' · con logo Sin TACC' : '') + '</em>' : '') + '</span><span class="sq">' + esc(shopQty(i)) + (i.pack ? '<em>' + esc(i.pack) + '</em>' : '') + (i.note ? '<em>' + esc(i.note) + '</em>' : !i.pack && i.hint ? '<em>' + i.hint + '</em>' : '') + '</span></button>';
        });
      });
      if (list.some(function (g) { return g.items.some(function (i) { return /^veg:/.test(i.key); }); })) h2 += saladsBlock();
      h2 += '<div class="wbtns" style="margin-top:14px"><button data-copyshop="1">Copiar lista</button><button data-shopreset="1" class="ghost">Desmarcar todo</button></div>';
      return open(bg, sh, h2);
    }
    if (S.panel === 'out') {
      var sc = OUT_SCENES.filter(function (o) { return o.id === S.outScene; })[0];
      var h3 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ COMER AFUERA ]</div><h3>¿Dónde vas a comer?</h3>';
      h3 += '<div class="scenes">' + OUT_SCENES.map(function (o) { return '<button data-scene="' + o.id + '" class="' + (o.id === S.outScene ? 'on' : '') + '">' + o.icon + ' ' + esc(o.label) + '</button>'; }).join('') + '</div>';
      if (!sc) {
        h3 += '<p class="muted" style="font-size:12.5px;margin-top:10px">Elegí el lugar y te decimos qué pedir, con qué acompañar, qué tomar y qué evitar. Después la registrás en lugar de una comida del plan y, si querés, compensamos la siguiente.</p>';
        return open(bg, sh, h3);
      }
      var mode = S.mode;
      h3 += '<div class="d321"><div class="tag">[ QUÉ PEDIR · ' + esc(sc.label.toUpperCase()) + ' · ' + (mode === 'on' ? 'DÍA DE ENTRENO' : 'DÍA DE DESCANSO') + ' ]</div>';
      h3 += '<div class="d-row"><span class="n">3</span><div><b>Principal</b><p>' + esc(sc.main) + '</p></div></div>';
      h3 += '<div class="d-row"><span class="n">2</span><div><b>Acompañamiento</b><p>' + esc(mode === 'on' ? sc.sideOn : sc.sideOff) + '</p></div></div>';
      h3 += '<div class="d-row"><span class="n">1</span><div><b>Bebida</b><p>' + esc(sc.drink) + '</p></div></div>';
      h3 += '<div class="d-row avoid"><span class="n">✕</span><div><b>Evitar</b><p>' + esc(sc.avoid) + '</p></div></div></div>';
      // Cualquier comida del día se puede reemplazar: el bloque libre toma SUS kcal y macros (un pre-WOD chico sigue siendo chico).
      var targets = mealsFor(mode).filter(function (x) { return x.m.id !== '__out' && !S.free[x.m.id]; });
      if (targets.length) {
        var nowMin2 = now.getHours() * 60 + now.getMinutes();
        var dflt = targets.filter(function (x) { return (x.m.role === 'lunch' || x.m.role === 'dinner') && !S.checks[x.m.id] && toMin(x.m.time) >= nowMin2 - 60; })[0] || targets.filter(function (x) { return x.m.role === 'dinner'; })[0] || targets[targets.length - 1];
        var def = S.outMeal && targets.some(function (x) { return x.m.id === S.outMeal; }) ? S.outMeal : dflt.m.id;
        S.outMeal = def;
        var tsel = targets.filter(function (x) { return x.m.id === def; })[0];
        h3 += '<label class="lbl">¿Qué comida reemplaza?</label><select id="out-meal" class="inp">' + targets.map(function (x) { return '<option value="' + esc(x.m.id) + '"' + (x.m.id === def ? ' selected' : '') + '>' + esc(x.m.time + ' · ' + mealName(x.m, mode) + ' · ' + n0(x.kcal) + ' kcal') + '</option>'; }).join('') + '</select>';
        // Catálogo argentino: si elegís lo que vas a comer, se registra con esos números (si no, con los de tu comida).
        var oc = countOf(S.outFoods), cats = [];
        OUT_FOODS.filter(outOk).forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
        if (outProto()) h3 += '<p class="out-proto" data-out-proto>🥑 Protocolo ' + (outProto() === 'keto' ? 'Keto: sólo opciones con ≤ 6 g de carbos netos por porción (y tragos sin azúcar)' : 'Low Carb: sólo opciones con ≤ 15 g de carbos netos por porción') + '. Pedí carne, pescado o pollo con ensalada y sin pan.</p>';
        h3 += '<details class="out-cat"' + (S.outFoods.length ? ' open' : '') + '><summary>🇦🇷 ¿Qué vas a comer? Calorías y macros de lo típico (opcional)</summary>';
        cats.forEach(function (c) {
          h3 += '<div class="oc-h">' + esc(c) + '</div>';
          OUT_FOODS.filter(function (x) { return x.cat === c && outOk(x); }).forEach(function (x) {
            var nn = oc[x.id] || 0;
            h3 += '<div class="oc-row' + (nn ? ' on' : '') + '"><span class="oc-n">' + esc(x.label) + '<i>' + esc(x.unit) + ' · P ' + n0(x.p) + ' · C ' + n0(x.c) + ' · G ' + n0(x.f) + '</i></span><b>' + n0(kcalOf(x)) + ' kcal</b>' + (nn ? '<button data-outfoodrm="' + x.id + '" aria-label="Quitar uno">−</button><em>' + nn + '</em>' : '') + '<button data-outfood="' + x.id + '" aria-label="Sumar uno">+</button></div>';
          });
        });
        h3 += '</details>';
        var dcnt = countOf(S.outDrinks);
        h3 += '<label class="lbl">Bebida social (opcional · tocá varias veces para sumar)</label><div class="scenes drinks">' + OUT_DRINKS.filter(outOk).map(function (d) { var q = dcnt[d.id] || 0; return '<button data-drink="' + d.id + '" class="' + (q ? 'on' : '') + '">' + d.icon + ' ' + (q > 1 ? q + ' × ' : '') + esc(d.label) + '<i>+' + n0(d.c * 4) + ' kcal c/u' + (d.sug != null ? ' · ' + (d.sug ? d.sug + ' g de azúcar' : '0 g de azúcar') : '') + '</i></button>'; }).join('') + (S.outDrinks.length ? '<button data-drink="__none" class="ghost">✕ sin bebida</button>' : '') + '</div>';
        var dk = S.outDrinks.reduce(function (a, id) { var d = outDrink(id); return a + (d ? d.c * 4 : 0); }, 0);
        // Trueques de alcohol: lo que "cuesta" la bebida en comida real.
        var EMP = outFood('emp-carne-h'), BOCHA = outFood('helado-bocha');
        h3 += '<div class="out-swap"><b>🔁 Trueques</b>' + (dk ? '<p>Lo que elegiste para tomar (' + n0(dk) + ' kcal) ≈ <b>' + n1(dk / kcalOf(EMP)) + ' empanadas de carne al horno</b> o <b>' + n1(dk / kcalOf(BOCHA)) + ' bochas de helado</b>.</p>' : '') + '<p>2 copas de vino o 1 pinta de cerveza ≈ 1 empanada de carne al horno o 2 bochas de helado.</p><p>Fernet con coca zero en vez de común: −' + n0((outDrink('fernet-comun').c - outDrink('fernet').c) * 4) + ' kcal por vaso. Gin tonic con tónica light: −' + n0((outDrink('gin').c - outDrink('gin-light').c) * 4) + ' kcal. Intercalá un vaso de agua o soda entre trago y trago.</p></div>';
        var after = targets.filter(function (x) { return toMin(x.m.time) > toMin(tsel.m.time) && !S.checks[x.m.id]; })[0];
        h3 += '<button class="rebal' + (S.outRebal ? ' on' : '') + '" data-outrebal="1"><span class="bk-chk">' + (S.outRebal ? '✓' : '') + '</span><span><b>🛡 Compensar en la próxima comida</b>' + (after ? 'Baja un ' + Math.round((1 - REBAL) * 100) + ' % los carbos y grasas de ' + esc(mealName(after.m, mode)) + ' (' + esc(after.m.time) + ') para amortiguar la salida.' : 'No queda otra comida pendiente después de esta.') + '</span></button>';
        var fm = S.outFoods.reduce(function (a, id) { var x = outFood(id); return x ? { p: a.p + x.p, c: a.c + x.c, f: a.f + x.f } : a; }, { p: 0, c: 0, f: 0 });
        var base = S.outFoods.length ? fm : tsel.t, bk = kcalOf(base);
        h3 += '<div class="out-sum">Se registra como <b>' + n0(bk + dk) + ' kcal</b> · ' + mtxt(base.p, base.c + dk / 4, base.f) + (dk ? ' (incluye ' + n0(dk) + ' kcal de bebida)' : '') + (S.outFoods.length ? '<br>Tu comida del plan era de ' + n0(tsel.kcal) + ' kcal: ' + (bk + dk > tsel.kcal ? '<b>+' + n0(bk + dk - tsel.kcal) + ' kcal</b> (activá «Compensar» si querés amortiguarlo).' : 'quedás dentro de lo planeado.') : '') + '</div>';
        h3 += '<button class="add-meal" data-imputar="1">✓ Registrar esta comida afuera</button>';
        h3 += '<p class="muted" style="font-size:11.5px;margin-top:6px">Cuenta como la comida de tu plan (mismas calorías y nutrientes), así tu día sigue cuadrando. Para deshacerlo, tocá la ✕ en esa comida.</p>';
      }
      return open(bg, sh, h3);
    }
    if (S.panel === 'fridge') return open(bg, sh, fridgePanel());
    if (S.panel === 'portions') return open(bg, sh, portionsPanel());
    if (S.panel === 'batch') return open(bg, sh, batchPanel());
    if (S.panel === 'story') { open(bg, sh, storyPanel()); return paintStory(); }
    if (S.panel === 'guide') {
      var g = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ ? AYUDA · CÓMO USAR TU PLAN ]</div><h3>Cómo funciona tu plan</h3>';
      g += '<p class="muted" style="font-size:12.5px">Tocá cada tema para abrirlo y probá la herramienta desde acá.</p>';
      GUIDE.forEach(function (r, i) {
        var meta = GUIDE_META[i] || {};
        g += '<details class="rule"' + (i === 0 ? ' open' : '') + '><summary><span class="n">' + (i + 1) + '</span>[ ' + esc(r[0]) + ' ]<span class="chev"></span></summary>' + r[1].map(function (p) { return '<p>' + p + '</p>'; }).join('');
        if (meta.gold) g += '<div class="gold"><b>⭐ REGLA DE ORO</b>' + meta.gold + '</div>';
        if (meta.go) g += '<div class="wbtns gbtns"><button ' + meta.go[1] + ' class="cta">' + meta.go[0] + '</button></div>';
        g += '</details>';
      });
      return open(bg, sh, g);
    }
    if (S.panel === 'photo') {
      var meals = mealsFor(S.mode).filter(function (x) { return x.m.id !== '__out'; });
      var key = getKey();
      var lbl = S.scanTab === 'label';
      var h4 = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ 📷 ESCANEAR PLATO · IA MULTIMODAL ]</div><h3>' + (key ? (lbl ? 'Escaneá la tabla nutricional' : 'Analizá tu plato con IA') : 'Mandale tu foto al coach') + '</h3>';
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

  // Target de la comida elegida en el escáner (la opción que el atleta tiene seleccionada ese día).
  function scanTarget() {
    var id = S.phMeal || (($('#ph-meal') || {}).value) || '';
    var x = mealsFor(S.mode).filter(function (q) { return q.m.id === id && id !== '__out'; })[0];
    if (!x) return null;
    return { name: mealName(x.m, S.mode).toUpperCase(), label: x.m.time + ' · ' + mealName(x.m, S.mode), kcal: x.kcal, p: x.t.p, c: x.t.c, f: x.t.f };
  }

  function scanCard(r) {
    var color = r.score >= 70 ? '#38BDF8' : r.score >= 40 ? '#F97316' : '#EF4444';
    var h = '<div class="scan"><div class="row"><div style="min-width:0"><div class="tag">[ DESGLOSE DEL PLATO ]</div><b class="scan-nm">' + esc(r.dishName) + '</b></div>';
    h += '<div class="score" style="border-color:' + color + ';color:' + color + '"><b>' + r.score + '</b><span>PUNTAJE</span></div></div>';
    if (r.reason) h += '<p class="muted" style="font-size:12px;margin-top:4px">' + esc(r.reason) + '</p>';
    h += '<div class="scan-items">';
    r.items.forEach(function (i) {
      h += '<div class="scan-it"><span class="g">' + n0(i.grams) + ' g</span><span class="fd">' + esc(i.food) + '</span><span class="mc">' + n0(i.p) + ' prot · ' + n0(i.c) + ' carb · ' + n0(i.f) + ' gras</span></div>';
    });
    var t = r.items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, l: a.l + i.leucine }; }, { p: 0, c: 0, f: 0, l: 0 });
    h += '</div><div class="scan-tot"><b>' + n0(t.p * 4 + t.c * 4 + t.f * 9) + ' kcal</b><span>Proteínas ' + n0(t.p) + ' g</span><span>Carbos ' + n0(t.c) + ' g</span><span>Grasas ' + n0(t.f) + ' g</span><span class="' + (t.l >= D.threshold ? 'ok' : 'lo') + '">Leucina ' + n1(t.l) + ' g</span></div>';
    var tg = scanTarget();
    if (tg) {
      var cmp = function (l, a, b, u) {
        var d = b ? Math.round((a / b - 1) * 100) : 0, ok = Math.abs(d) <= 10;
        return '<div class="cmp-row"><span>' + l + '</span><i>' + n0(a) + u + '</i><i>' + n0(b) + u + '</i><b class="' + (ok ? 'ok' : 'lo') + '">' + (d > 0 ? '+' : '') + d + ' %</b></div>';
      };
      h += '<div class="cmp"><div class="tag">[ COMPARADO CON TU PLAN · ' + esc(tg.label) + ' ]</div><div class="cmp-row hd"><span></span><i>PLATO</i><i>PLAN</i><b>DESVÍO</b></div>';
      h += cmp('Kcal', t.p * 4 + t.c * 4 + t.f * 9, tg.kcal, '') + cmp('Proteína', t.p, tg.p, ' g') + cmp('Carbos', t.c, tg.c, ' g') + cmp('Grasas', t.f, tg.f, ' g') + '</div>';
    }
    if (r.tips && r.tips.length) h += '<ul class="tips">' + r.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    h += '<button class="add-meal" data-photo="add">[ + AGREGAR A LA COMIDA SELECCIONADA ]</button>';
    h += '<button class="add-meal story-go" data-scanstory="1">[ 📸 GENERAR STORYCARD DE ESTE PLATO ]</button></div>';
    return h;
  }

  function renderSheet() {
    var bg = $('#sheet-bg'), sh = $('#sheet');
    if (S.panel) return renderPanel(bg, sh);
    if (!S.sheet) { bg.className = 'sheet-bg'; sh.className = 'sheet'; return; }
    var meal = D.meals.filter(function (m) { return m.id === S.sheet.meal; })[0];
    var orig = meal && findItem(meal, S.sheet.item);
    if (!orig) { S.sheet = null; return renderSheet(); }
    var src = srcOf(orig);
    if (!src) { S.sheet = null; return renderSheet(); }
    var cur = S.swaps[orig.id];
    var opts = swapOptions(orig, meal.role);
    var ok = function (f, g) { var k = g / 100; return mshort(f.p * k, f.c * k, f.f * k); };
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ CAMBIAR ALIMENTO · ' + esc(src.group ? D.groupLabels[src.group] : 'MISMA ' + ANCHOR_LABEL[src.anchor].toUpperCase()) + ' ]</div>';
    h += '<h3>Cambiar ' + esc(src.name) + ' por…</h3>';
    h += '<p class="muted" style="font-size:13px;margin:2px 0 4px">Todas aportan lo mismo en ' + ANCHOR_LABEL[src.anchor] + ' (' + n0(src[src.anchor] * orig.grams / 100) + ' g), así tu día sigue cuadrando. Tocá una para reemplazarlo.</p>';
    h += '<button class="opt' + (!cur ? ' cur' : '') + '" data-pick="__orig"><span class="g">' + n0(orig.grams) + ' g</span><span class="fd">' + esc(orig.food) + ' · el de tu plan<span>' + mshort(orig.p, orig.c, orig.f) + '</span></span></button>';
    opts.forEach(function (o) {
      var hint = unitHintFor(o.id, o.g);
      h += '<button class="opt' + (o.id === cur ? ' cur' : '') + '" data-pick="' + esc(o.id) + '"><span class="g">' + n0(o.g) + ' g</span><span class="fd">' + esc(o.f.name) + '<span>' + (hint ? hint + ' · ' : '') + ok(o.f, o.g) + '</span></span><span class="go">›</span></button>';
    });
    open(bg, sh, h);
  }


  function findItem(meal, id) {
    var all = meal.items.slice();
    mealAlts(meal).forEach(function (a) { all = all.concat(a.items || []); });
    return all.filter(function (i) { return i.id === id; })[0];
  }

  // Sello NutrirCe: logo oficial subido por el coach o isotipo (mano + tenedor) con la palabra «Nutrir» verde y «Ce» naranja.
  function ncLogo(small) {
    if (D.nutri.logo) return '<img src="' + esc(D.nutri.logo) + '" alt="NutrirCe" class="nc-img' + (small ? ' sm' : '') + '">';
    return small ? D.nutri.markSm : D.nutri.mark + '<b class="brand ncw"><i>Nutrir</i><em>Ce</em></b>';
  }

  // Desglose táctico: ingredientes de los platos (receta escalada a la porción), técnica y condimentos.
  function desglose(m, x) {
    var o = x.alt || m, tech = o.technique, steps = o.steps || [];
    var rows = '';
    x.items.forEach(function (it) {
      var ref = it.foodId && D.foods[it.foodId];
      if (!ref || !(ref.recipe || ref.detail)) return;
      if (ref.recipe && ref.recipe.length) {
        var base = (ref.unit && ref.unit.grams) || ref.recipe.reduce(function (a, r) { return a + r.grams; }, 0) || it.grams;
        var k = it.grams / base;
        rows += '<li><b>' + esc(ref.name) + '</b>: ' + ref.recipe.map(function (r) { return esc(r.name) + ' ' + n0(r.grams * k) + ' g'; }).join(' · ') + '</li>';
      } else rows += '<li><b>' + esc(ref.name) + '</b>: ' + esc(ref.detail) + (ref.unit && it.grams !== ref.unit.grams ? ' (porción base ' + n0(ref.unit.grams) + ' g, la tuya ' + n0(it.grams) + ' g)' : '') + '</li>';
    });
    var ing = '<ul class="ing">' + x.items.filter(function (it) { return it.grams > 0 && !it.free; }).map(function (it) { return '<li><b>' + n0(it.grams) + ' g</b> ' + esc(it.food) + (unitHintFor(it.foodId, it.grams) ? ' <em>' + unitHintFor(it.foodId, it.grams) + '</em>' : '') + (D.brands && D.brands[it.foodId] ? ' <em class="br">· ' + esc(D.brands[it.foodId][D.brandTier || 0]) + '</em>' : '') + '</li>'; }).join('') + '</ul>';
    // Rendimiento: porción individual o receta de molde / tanda (cuánto rinde y qué fracción es la porción) + conservación.
    var yi = o.yieldInfo, batch = yi && yi.yieldType === 'batch';
    var yb = yi ? '<div class="yield ' + (batch ? 'batch' : 'ind') + '" data-yield="' + (batch ? 'batch' : 'individual') + '">' + (batch ? '<b>🥧 ' + esc(yi.tag) + '</b><span>' + esc(yi.label) + '</span>' : '<span>🍽 ' + esc(yi.label) + '</span>') + '</div>' : '';
    var mold = batch ? '<div class="dsub">RECETA ENTERA · ' + yi.servings + ' PORCIONES</div><p class="mold" data-mold>' + x.items.filter(function (it) { return it.grams > 0 && !it.free; }).map(function (it) { return '<b>' + n0(it.grams * yi.servings) + ' g</b> ' + esc(it.food); }).join(' · ') + '</p>' : '';
    var keep = yi && batch && yi.storage ? '<p class="keep">❄️ <b>Conservación:</b> ' + esc(yi.storage) + '</p>' : '';
    var how = steps.length ? '<ol class="psteps">' + steps.map(function (st) { return '<li>' + esc(st) + '</li>'; }).join('') + '</ol>' : '';
    // Abierto por defecto (los pasos a la vista); si el atleta lo cierra, queda cerrado para esa comida y opción.
    var dk = m.id + '|' + x.opt, mins = (x.alt || m).prepMin;
    return yb + '<details class="desglose" data-ds="' + esc(dk) + '"' + (S.dsClosed[dk] ? '' : ' open') + '><summary>[ ' + (mins ? '⏱ ' + mins + ' MIN · ' : '') + 'PREPARACIÓN PASO A PASO ]</summary>' + how + '<div class="dsub">' + (batch ? 'TU PORCIÓN · INGREDIENTES Y MARCAS' : 'INGREDIENTES Y MARCAS') + '</div>' + ing + mold + keep + (rows ? '<div class="dsub">COMPOSICIÓN DE LOS PLATOS</div><ul>' + rows + '</ul>' : '') + (tech ? '<p><b>Tip:</b> ' + esc(tech) + '</p>' : '') + '</details>';
  }

  // =================== HERRAMIENTAS TÁCTICAS ===================

  // ---------- Porciones visuales (sin balanza) ----------
  // Porción sin balanza: palma / puño / mano ahuecada / pulgar; si el alimento tiene medida propia (pote, scoop, huevo), esa.
  var OWN_UNIT = /scoop|huevo|clara|galleta|tostada|rebanada|cda|cdita|feta|botell|pote|lata|taza chica/;
  function visualHint(foodId, grams) {
    var ref = foodId && D.foods[foodId];
    if (!ref || !(grams > 0)) return '';
    var hand = D.hand && D.hand[ref.group], own = D.house && D.house[foodId];
    if (hand && ref.group !== 'dairy-protein' && !(own && own.some(function (m) { return OWN_UNIT.test(m.one); }))) return humanQty(grams / hand.g, hand);
    return unitHintFor(foodId, grams).replace(/^≈ /, '');
  }

  function portionsPanel() {
    var list = mealsFor(S.mode).filter(function (x) { return x.m.id !== '__out'; });
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ CALCULADORA DE PORCIONES VISUALES · SIN BALANZA ]</div><h3>Tu mano es la medida</h3>';
    h += '<div class="hands"><div><b>✋ 1 palma de la mano</b><span>≈ 120 g de carne, pollo o pescado cocido (el grosor y el tamaño de tu palma, sin los dedos)</span></div><div><b>✊ 1 puño</b><span>≈ 150 g de arroz, fideos o papa cocidos · 1 fruta mediana</span></div><div><b>🤲 1 mano ahuecada</b><span>≈ 30 g de avena, tutucas o cereal</span></div><div><b>👍 1 pulgar</b><span>≈ 15 g de frutos secos o pasta de maní</span></div><div><b>🥄 1 cda</b><span>≈ 13 g de aceite · 20 g de miel · 15 g de queso untable</span></div><div><b>🥛 1 pote</b><span>≈ 190-200 g de yogur griego o proteico</span></div></div>';
    if (D.quickSwaps && D.quickSwaps.length) {
      h += '<div class="qswaps"><div class="tag" style="margin-top:12px">[ REEMPLAZOS RÁPIDOS 1 A 1 ]</div><p class="muted" style="font-size:12px">Cada fila aporta lo mismo: cambiá una fuente por otra sin desarmar tu plan.</p>';
      D.quickSwaps.forEach(function (g) { if (g.items.length) h += '<div class="qs-row"><b>' + esc(g.title) + ' <i>' + esc(g.ref) + '</i></b><span>' + g.items.map(esc).join(' <em>≈</em> ') + '</span></div>'; });
      h += '</div>';
    }
    h += '<p class="muted" style="font-size:12px;margin-top:10px">Equivalencias de lo que elegiste hoy (día ' + S.mode.toUpperCase() + '). Si cambiás de opción en una comida, esta lista se actualiza:</p>';
    list.forEach(function (x) {
      var otl = x.alt ? x.alt.title : x.m.title;
      h += '<div class="shop-cat">' + esc(x.m.time + ' · ' + mealName(x.m, S.mode)) + ' · OPCIÓN ' + x.opt + (otl ? '<span class="pv-opt">' + esc(otl) + '</span>' : '') + '</div>';
      x.items.forEach(function (it) {
        var v = it.free && !it.salva ? '' : visualHint(it.foodId, it.grams);
        h += '<div class="pv-row"><span class="pv-g">' + (it.grams ? n0(it.grams) + ' g' : '—') + '</span><span class="pv-f">' + esc(it.food) + '</span><span class="pv-v">' + (v ? esc(v) : '<i>a ojo</i>') + '</span></div>';
      });
    });
    return h;
  }

  // ---------- Mi heladera / Salvadías ----------
  // Resuelve gramos de 1-3 ingredientes para acercarse a P / C / G de la comida (mínimos cuadrados ponderados, sin negativos).
  // must = cuántos de los primeros ingredientes eligió el atleta: esos siempre entran (las sugerencias son opcionales).
  function solveGrams(foods, t, must) {
    // Pisos de peso: en colaciones chicas, 2-3 g de grasa o proteína de diferencia no deben descartar un ingrediente.
    var w = [1 / Math.max(t.p, 15), 1 / Math.max(t.c, 15), 1 / Math.max(t.f, 8)];
    var row = function (f) { return [f.p / 100, f.c / 100, f.f / 100]; };
    // Mínimos cuadrados ponderados para los índices idx contra el objetivo tv (null si es singular).
    var ls = function (idx, tv) {
      var n = idx.length, M = [], v = [];
      for (var a = 0; a < n; a++) { M.push([]); v.push(0); for (var b2 = 0; b2 < n; b2++) M[a].push(0); }
      for (var k = 0; k < 3; k++) {
        for (var a2 = 0; a2 < n; a2++) {
          var ra = row(foods[idx[a2]])[k];
          v[a2] += w[k] * w[k] * ra * tv[k];
          for (var b3 = 0; b3 < n; b3++) M[a2][b3] += w[k] * w[k] * ra * row(foods[idx[b3]])[k];
        }
      }
      return n ? gauss(M, v) : [];
    };
    var best = null, req = (1 << (must || 0)) - 1, tv0 = [t.p, t.c, t.f];
    for (var mask = 1; mask < 1 << foods.length; mask++) {
      if ((mask & req) !== req) continue;
      var idx = [];
      for (var i = 0; i < foods.length; i++) if (mask & (1 << i)) idx.push(i);
      var g = foods.map(function () { return 0; });
      var x = ls(idx, tv0);
      if (x && x.some(function (q, j) { return !(q >= 0) && idx[j] < must; })) {
        // Lo que eligió el atleta nunca queda afuera: se fija en una porción mínima y el resto cubre lo que falta.
        var pin = idx.filter(function (ii) { return ii < must; }), free = idx.filter(function (ii) { return ii >= must; });
        pin.forEach(function (ii) { g[ii] = frSnap(foods[ii], 0, true); });
        var fixed = macrosOf(foods, g), rest = [Math.max(0, t.p - fixed.p), Math.max(0, t.c - fixed.c), Math.max(0, t.f - fixed.f)];
        var x2 = ls(free, rest);
        if (!x2 || x2.some(function (q) { return !(q >= 0); })) continue;
        free.forEach(function (ii, j) { g[ii] = frSnap(foods[ii], x2[j]); });
      } else {
        if (!x || x.some(function (q) { return !(q >= 0); })) continue;
        // Porciones reales: un solo alimento nunca "cubre" el bloque entero (nada de 130 g de avena sola).
        idx.forEach(function (ii, j) { g[ii] = frSnap(foods[ii], x[j]); });
      }
      var tot = macrosOf(foods, g);
      var err = w[0] * w[0] * Math.pow(tot.p - t.p, 2) + w[1] * w[1] * Math.pow(tot.c - t.c, 2) + w[2] * w[2] * Math.pow(tot.f - t.f, 2);
      if (!best || err < best.err) best = { grams: g, tot: tot, err: err };
    }
    return best || (must ? solveGrams(foods, t, 0) : null);
  }
  function gauss(M, v) {
    var n = v.length, A = M.map(function (r, i) { return r.concat([v[i]]); });
    for (var c = 0; c < n; c++) {
      var piv = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (Math.abs(A[piv][c]) < 1e-9) return null;
      var tmp = A[c]; A[c] = A[piv]; A[piv] = tmp;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === c) continue;
        var k = A[r2][c] / A[c][c];
        for (var cc = c; cc <= n; cc++) A[r2][cc] -= k * A[c][cc];
      }
    }
    return A.map(function (r, i) { return r[n] / r[i]; });
  }
  function macrosOf(foods, g) {
    return foods.reduce(function (a, f, i) { var k = g[i] / 100; return { p: a.p + f.p * k, c: a.c + f.c * k, f: a.f + f.f * k, l: a.l + f.leucine * k }; }, { p: 0, c: 0, f: 0, l: 0 });
  }

  // Tope y porción mínima por toma (Tabla Única del plan, según el sexo y el momento del día) y unidades enteras.
  var FR_CAP = { 'lean-protein': 250, starch: 300, cereal: 100, fat: 20, fruit: 250, 'dairy-protein': 400, whey: 50, eggs: 200, 'sport-carb': 40, 'protein-snack': 100, plato: 450, veg: 250 };
  function frSlot() { return S.fridge.slot || 'main'; }
  function fridgeRange(f) {
    var cs = D.fridgeCaps && D.fridgeCaps[frSlot()], c = cs && f && cs[f.id];
    if (c) return { min: c[0], max: c[1] };
    return { min: 0, max: f.id === 'palta' ? 50 : FR_CAP[f.group] || 300 };
  }
  function fridgeCap(f) { return fridgeRange(f).max; }
  // Gramos reales: huevos, claras y barras en unidades enteras; el resto de a 5 g; dentro de la porción mínima y el tope.
  function frSnap(f, x, pinned) {
    var rg = fridgeRange(f), st = (D.units && D.units[f.id]) || 5;
    var v = Math.min(rg.max, Math.round(Math.max(0, x) / st) * st);
    if (v > 0 && v < rg.min) v = x >= rg.min / 2 ? rg.min : 0;
    if (pinned && v === 0) v = Math.max(st, rg.min);
    return v;
  }
  // Tipo de un alimento por su aporte energético dominante.
  function macroKind(f) {
    var k = kcal100(f) || 1;
    if ((f.p * 4) / k >= 0.35) return 'p';
    if ((f.f * 9) / k >= 0.5) return 'f';
    return f.group === 'fruit' ? 'fruit' : 'c';
  }
  // Sugerencias para completar la comida según la franja del día (proteína y grasa / fruta compatibles).
  var FR_FILL = {
    am: { p: ['yogur', 'whey', 'claras'], f: ['nueces', 'mani', 'banana'] },
    peri: { p: ['yogur', 'whey', 'yogur-proteico'], f: ['banana', 'nueces'] },
    main: { p: ['pollo', 'claras', 'atun'], f: ['oliva', 'palta'] },
  };
  function frAvoid(id) { return !!(D.avoid && D.avoid.indexOf(id) >= 0); }
  function fridgeFill(picked, role, t) {
    var slot = S.fridge.slot || SLOT[role] || 'main', fill = FR_FILL[slot], have = picked.map(macroKind), add = [];
    var ok = function (id) { var f = D.foods[id]; return f && !frAvoid(id) && picked.indexOf(f) < 0 && (!f.slots || f.slots.indexOf(slot) >= 0); };
    var pick = function (list) { return list.filter(ok)[0]; };
    if (have.indexOf('p') < 0 && t.p >= 10 && picked.length + add.length < 4) { var pid = pick(fill.p); if (pid) add.push({ id: pid, why: 'proteína' }); }
    if (have.indexOf('f') < 0 && have.indexOf('fruit') < 0 && t.f + t.c >= 15 && picked.length + add.length < 4) { var fid = pick(fill.f); if (fid) add.push({ id: fid, why: D.foods[fid].group === 'fruit' ? 'fruta' : 'grasa' }); }
    return add;
  }

  function fridgeTarget(m) {
    var t = m.items.map(resolveItem).reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }; }, { p: 0, c: 0, f: 0 });
    return t;
  }

  // Lo que falta hoy: objetivo del día menos las comidas ya marcadas; y las comidas que quedan sin marcar.
  function pendingToday() {
    var tgt = D.targets[S.mode] || { p: 0, c: 0, f: 0 }, eaten = { p: 0, c: 0, f: 0 }, left = [];
    mealsFor(S.mode).forEach(function (x) {
      if (S.checks[x.m.id]) { eaten.p += x.t.p; eaten.c += x.t.c; eaten.f += x.t.f; }
      else if (x.m.id !== '__out' && x.m.items.length) left.push(x);
    });
    return { p: Math.max(0, tgt.p - eaten.p), c: Math.max(0, tgt.c - eaten.c), f: Math.max(0, tgt.f - eaten.f), left: left };
  }

  // Sólo ingredientes crudos o básicos: nada de platos armados (milanesas, guisos, empanadas, cortes a la parrilla).
  var FR_DISH = /milanesa|guiso|empanada|parrilla|asado|chinchul|arroz con|tarta|pizza|s[aá]ndwich|s[aá]nguche|tostado|hamburguesa|lomito|locro|estofado|canel|ravio|sorrentin|lasa[gñ]|pastel|tortilla|wok|salteado|ensalada|pur[eé]|al horno|plato|completo|choripan|helado|alfajor de|medialuna|factura/i;
  var FR_GROUPS = [['Carnes, pescados y huevos', ['lean-protein', 'eggs']], ['Lácteos y proteína', ['dairy-protein', 'whey', 'protein-snack']], ['Panes, cereales y almidones', ['starch', 'cereal']], ['Frutas', ['fruit']], ['Verduras', ['veg']], ['Grasas y frutos secos', ['fat']], ['Para el entreno', ['sport-carb']]];
  function fridgeOk(id) {
    var f = D.foods[id];
    return !!f && f.group !== 'plato' && !f.custom && !FR_DISH.test(f.name) && kcal100(f) > 0 && !frAvoid(id);
  }

  // Lo que falta para cerrar, con una sugerencia concreta en gramos o unidades y un botón para sumarla.
  function frMissing(t, tot, slot) {
    var out = [], mp = t.p - tot.p, mc = t.c - tot.c, mf = t.f - tot.f;
    var okf = function (id) { return D.foods[id] && fridgeOk(id) && S.fridge.ing.indexOf(id) < 0 && (!D.foods[id].slots || D.foods[id].slots.indexOf(slot) >= 0); };
    var food = function (id) { var f = D.foods[id]; if (!f.id) f.id = id; return f; };
    var grams = function (id, need, k) { var f = food(id); return frSnap(f, need / (f[k] / 100)); };
    var nm = function (id) { return D.foods[id].name.split(' (')[0].toLowerCase(); };
    if (mp >= 6 && t.p >= 10) {
      var alts = [];
      var pid = (slot === 'main' ? ['pollo', 'cuadril', 'merluza', 'atun', 'tofu'] : ['yogur', 'whey', 'queso-light', 'ricota']).filter(okf)[0];
      if (pid) alts.push({ txt: n0(grams(pid, mp, 'p')) + ' g de ' + nm(pid), add: pid });
      if (okf('huevo') && okf('claras')) {
        var eP = D.foods.huevo.p * 0.6, cP = D.foods.claras.p * 0.33;
        var ne = Math.max(1, Math.min(3, Math.round((mp * 0.6) / eP))), nc = Math.max(0, Math.min(6, Math.ceil((mp - ne * eP) / cP)));
        if (nc === 1) nc = 2;
        alts.push({ txt: ne + ' huevo' + (ne > 1 ? 's' : '') + (nc ? ' + ' + nc + ' claras' : ''), add: nc ? 'huevo,claras' : 'huevo' });
      } else if (okf('huevo')) {
        var n1e = Math.max(1, Math.min(4, Math.round(mp / (D.foods.huevo.p * 0.6))));
        alts.push({ txt: n1e + ' huevo' + (n1e > 1 ? 's' : ''), add: 'huevo' });
      }
      if (alts.length) out.push({ txt: 'Te faltan ~' + n0(mp) + ' g de proteína', alts: alts });
    }
    if (mc >= 12) {
      var cl = (slot === 'main' ? ['arroz', 'papa', 'fideos', 'batata', 'pan'] : slot === 'peri' ? ['banana', 'galletas-arroz', 'miel'] : ['pan', 'banana', 'avena', 'galletas-arroz']).filter(okf).slice(0, 2);
      if (cl.length) out.push({ txt: 'Te faltan ~' + n0(mc) + ' g de carbohidratos', alts: cl.map(function (id) { return { txt: n0(grams(id, mc, 'c')) + ' g de ' + nm(id) + (unitHintFor(id, grams(id, mc, 'c')) ? ' (' + unitHintFor(id, grams(id, mc, 'c')).replace('≈ ', '≈') + ')' : ''), add: id }; }) });
    }
    if (mf >= 5) {
      var fl = (slot === 'main' ? ['oliva', 'palta'] : ['nueces', 'mani', 'semillas']).filter(okf).slice(0, 2);
      if (fl.length) out.push({ txt: 'Te faltan ~' + n0(mf) + ' g de grasas', alts: fl.map(function (id) { return { txt: n0(grams(id, mf, 'f')) + ' g de ' + nm(id), add: id }; }) });
    }
    return out;
  }

  function fridgePanel() {
    var pend = pendingToday(), left = pend.left;
    var meals = mealsFor(S.mode).filter(function (x) { return x.m.id !== '__out' && x.m.items.length; });
    var rest = S.fridge.meal === '__rest' && left.length >= 2;
    if (!rest && (!S.fridge.meal || !meals.some(function (x) { return x.m.id === S.fridge.meal; }))) {
      var nowMin = now.getHours() * 60 + now.getMinutes();
      var nx = meals.filter(function (x) { return !S.checks[x.m.id] && timeToMinutes(x.m.time) >= nowMin - 30; })[0] || left[0] || meals[0];
      S.fridge.meal = nx ? nx.m.id : '';
    }
    var meal = rest ? null : D.meals.filter(function (m) { return m.id === S.fridge.meal; })[0];
    var lastOne = !rest && meal && left.length === 1 && left[0].m.id === meal.id;
    var n = rest ? left.length : 1;
    // Objetivo: la comida del plan; si es la última del día o «todo lo que queda», lo que falta hoy (repartido por comida).
    var t = rest || lastOne ? { p: pend.p / n, c: pend.c / n, f: pend.f / n } : meal ? fridgeTarget(meal) : { p: 0, c: 0, f: 0 };
    S.fridge.slot = rest ? (left.some(function (x) { return SLOT[x.m.role] === 'main'; }) ? 'main' : 'am') : (SLOT[meal ? meal.role : 'lunch'] || 'main');
    var slot = S.fridge.slot;
    var opts = Object.keys(D.foods).filter(fridgeOk);
    var sel = function (k) {
      var h0 = '<select class="inp" id="fr-' + k + '" data-fr="' + k + '"><option value="">— ingrediente ' + (k + 1) + ' —</option>';
      FR_GROUPS.forEach(function (g) {
        var ids = opts.filter(function (id) { return g[1].indexOf(D.foods[id].group) >= 0; }).sort(function (a, b) { return D.foods[a].name.localeCompare(D.foods[b].name); });
        if (ids.length) h0 += '<optgroup label="' + esc(g[0]) + '">' + ids.map(function (id) { return '<option value="' + esc(id) + '"' + (S.fridge.ing[k] === id ? ' selected' : '') + '>' + esc(D.foods[id].name) + '</option>'; }).join('') + '</optgroup>';
      });
      return h0 + '</select>';
    };
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ MI HELADERA ]</div><h3>¿Qué tenés en casa?</h3>';
    h += '<div class="fr-pend"><span>Hoy te falta</span><b>' + n0(pend.p * 4 + pend.c * 4 + pend.f * 9) + ' kcal</b><em>P ' + n0(pend.p) + ' g · C ' + n0(pend.c) + ' g · G ' + n0(pend.f) + ' g</em><i>' + (left.length ? left.length + ' comida' + (left.length > 1 ? 's' : '') + ' sin marcar' : 'ya marcaste todas tus comidas') + '</i></div>';
    h += '<p class="muted" style="font-size:12.5px">Elegí 2-4 ingredientes crudos o básicos que tengas: la app calcula los gramos exactos y la medida casera, con porciones reales (huevos enteros, nunca menos de lo que se ve en el plato).</p>';
    h += '<label class="lbl">¿Qué querés cubrir?</label><select class="inp" id="fr-meal">' + meals.map(function (x) { return '<option value="' + esc(x.m.id) + '"' + (!rest && x.m.id === S.fridge.meal ? ' selected' : '') + '>' + esc(x.m.time + ' · ' + mealName(x.m, S.mode)) + (S.checks[x.m.id] ? ' ✓' : '') + '</option>'; }).join('') + (left.length >= 2 ? '<option value="__rest"' + (rest ? ' selected' : '') + '>Todo lo que me queda hoy (' + left.length + ' comidas)</option>' : '') + '</select>';
    h += '<div class="fr-target">' + (rest ? 'En cada una de tus ' + n + ' comidas: ' : lastOne ? 'Es tu última comida, cerramos el día: ' : 'Tiene que aportar: ') + '<b>' + mtxt(t.p, t.c, t.f) + '</b> · ' + n0(t.p * 4 + t.c * 4 + t.f * 9) + ' kcal</div>';
    var nSel = Math.min(5, Math.max(3, S.fridge.ing.filter(Boolean).length + 1));
    var sels = '';
    for (var k = 0; k < nSel; k++) sels += sel(k);
    h += '<label class="lbl">Ingredientes disponibles</label><div class="fr-ings">' + sels + '</div>';
    var picked = S.fridge.ing.filter(Boolean).map(function (id) { var f = D.foods[id]; if (f && !f.id) f.id = id; return f; }).filter(Boolean);
    var auto = picked.length && !S.fridge.noAuto ? fridgeFill(picked, meal ? meal.role : 'lunch', t) : [];
    var foods = picked.concat(auto.map(function (a) { var f = D.foods[a.id]; if (!f.id) f.id = a.id; return f; }));
    var r = foods.length ? solveGrams(foods, t, picked.length) : null;
    // Sólo se anuncian las sugerencias que realmente suman a la comida.
    var used = auto.filter(function (a, i) { return r && r.grams[picked.length + i] > 0; });
    if (used.length) h += '<div class="fr-auto">➕ Sumado para equilibrar la comida: ' + used.map(function (a) { return '<b>' + esc(D.foods[a.id].name) + '</b> (' + a.why + ')'; }).join(' · ') + '<button data-frauto="off">quitar sugerencias</button></div>';
    else if (S.fridge.noAuto && picked.length) h += '<div class="fr-auto">Sugerencias desactivadas<button data-frauto="on">volver a sugerir</button></div>';
    S.fridge.result = null;
    if (foods.length) {
      if (!r) h += '<div class="scan-err">Con esos ingredientes no llegamos a lo que pide la comida. Probá sumar una proteína o un carbohidrato.</div>';
      else {
        S.fridge.result = { foods: foods, grams: r.grams, rest: rest ? left.map(function (x) { return x.m.id; }) : null };
        h += '<div class="scan"><div class="tag">[ ' + (rest ? 'CANTIDADES POR COMIDA · ×' + n : 'CANTIDADES CALCULADAS') + ' ]</div>';
        foods.forEach(function (f, i) {
          if (!r.grams[i]) return;
          var fid = f.id || Object.keys(D.foods).filter(function (id) { return D.foods[id] === f; })[0];
          var hm = unitHintFor(fid, r.grams[i]) || ('≈ ' + esc(visualHint(fid, r.grams[i])));
          h += '<div class="scan-it"><span class="g">' + n0(r.grams[i]) + ' g</span><span class="fd">' + esc(f.name) + '<em class="vh">' + hm + '</em></span></div>';
        });
        var dv = function (a, b2) { return b2 ? Math.round((a / b2 - 1) * 100) : 0; };
        h += '<div class="scan-tot"><b>' + n0(r.tot.p * 4 + r.tot.c * 4 + r.tot.f * 9) + ' kcal</b><span>P ' + n0(r.tot.p) + ' (' + dv(r.tot.p, t.p) + '%)</span><span>C ' + n0(r.tot.c) + ' (' + dv(r.tot.c, t.c) + '%)</span><span>G ' + n0(r.tot.f) + ' (' + dv(r.tot.f, t.f) + '%)</span></div>';
        if (picked.some(function (f, i) { return !r.grams[i]; })) h += '<p class="muted" style="font-size:11.5px;margin-top:6px">Algún ingrediente quedó en 0 g: no hace falta para esta comida.</p>';
        frMissing(t, r.tot, slot).forEach(function (ms) {
          h += '<div class="fr-warn">⚠️ ' + esc(ms.txt) + ': agregá ' + ms.alts.map(function (a) { return '<button class="fr-add" data-fradd="' + esc(a.add) + '">+ ' + esc(a.txt) + '</button>'; }).join(' <span>o</span> ') + '</div>';
        });
        if (rest) h += '<button class="add-meal" data-fridgeuse="1">[ ✓ USAR EN MIS ' + n + ' COMIDAS QUE QUEDAN ]</button></div>';
        else h += '<button class="add-meal" data-fridgeuse="done">[ ✓ REGISTRAR: ' + esc(mealLabel(S.fridge.meal).toUpperCase()) + ' HECHA ]</button><button class="add-meal ghost" data-fridgeuse="1">Guardar para más tarde (sin marcar)</button></div>';
      }
    }
    return h;
  }

  function useFridge(done) {
    var r = S.fridge.result;
    if (!r || !S.fridge.meal) return;
    var ids = Object.keys(D.foods);
    var items = r.foods.map(function (f, i) {
      var g = r.grams[i], k = g / 100, id = ids.filter(function (x) { return D.foods[x] === f; })[0];
      return { id: 'salva-' + i, foodId: id, food: f.name, grams: g, p: f.p * k, c: f.c * k, f: f.f * k, leucine: f.leucine * k, free: true, salva: true };
    }).filter(function (x) { return x.grams > 0; });
    var targets = r.rest || [S.fridge.meal];
    targets.forEach(function (id) {
      S.free[id] = { items: items.map(function (x) { return Object.assign({}, x); }) };
      if (done && !r.rest) S.checks[id] = true;
    });
    store.set('free:' + S.date, S.free);
    if (done) store.set('checks:' + S.date, S.checks);
    S.panel = null; haptic(); render();
    toast(r.rest ? 'Listo: armamos tus ' + targets.length + ' comidas que quedan con tu heladera' : done ? 'Registrada: ' + mealLabel(S.fridge.meal) + ' hecha con tu heladera' : 'Listo: comida armada con tu heladera · ' + mealLabel(S.fridge.meal));
  }

  // ---------- Guía de batch cooking ----------
  var COOK = {
    pollo: 'Mandalo al horno a 200 °C 25-30 min (o a la plancha 6-8 min por lado)',
    cuadril: 'A la plancha o grill 4-5 min por lado, o al horno a 200 °C 20 min',
    lomo: 'A la plancha 4 min por lado y dejalo reposar 5 min',
    nalga: 'A la plancha, o en milanesas al horno a 200 °C 20 min',
    picada: 'Sarteneala 10-12 min con spray antiadherente (para salsa, albóndigas o relleno)',
    merluza: 'Mandala al horno a 180 °C 15-18 min o al vapor',
    cerdo: 'Mandala al horno a 200 °C 30-35 min',
    arroz: 'Hervir 1 taza de arroz por 2 de agua con sal, 15-18 min tapado',
    yamani: 'Hervir 1 taza por 2½ de agua, 35-40 min tapado',
    fideos: 'Hervir al dente 8-10 min y enfrialos con un chorrito de oliva para que no se peguen',
    papa: 'Hervir 20 min o mandala al horno a 200 °C 35-40 min',
    batata: 'Mandala al horno a 200 °C 35-40 min',
    lentejas: 'Remojo 2 h · hervir 20-25 min',
    vegetales: 'Mandalos al horno en bandeja a 200 °C 25 min, o lavalos y cortalos crudos',
  };
  // Estructura semanal: sólo los días de entrenamiento (ON) o los 7 días completos.
  var WD_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  function batchDays() {
    var on = Math.max(0, Math.min(7, D.trainingDays));
    return S.batchMode === 'all' ? { on: on, off: 7 - on, label: '7 días completos', days: 'de lunes a domingo' } : { on: on, off: 0, label: on + ' días de entrenamiento (ON)', days: onDaysLabel() };
  }
  function onDaysLabel() {
    var wd = (D.trainingWeekdays || []).slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
    if (!wd.length) return 'de tus días de entreno';
    if (wd.length >= 3 && wd.every(function (d, i) { return i === 0 || ((d + 6) % 7) === ((wd[i - 1] + 6) % 7) + 1; })) return 'de ' + WD_LONG[wd[0]] + ' a ' + WD_LONG[wd[wd.length - 1]];
    return 'de ' + wd.map(function (d) { return WD_LONG[d]; }).join(', ');
  }
  var ROLE_TUPPER = { lunch: 'almuerzos', dinner: 'cenas', breakfast: 'desayunos', snack: 'meriendas', post: 'post-entrenos', peri: 'pre-entrenos' };
  function weeklyCooked() {
    var bd = batchDays(), mult = { on: bd.on, off: bd.off, both: bd.on + bd.off };
    var acc = {};
    D.meals.forEach(function (m) {
      var times = mult[m.day];
      if (!times) return;
      m.items.map(resolveItem).forEach(function (it) {
        if (!it.foodId || !COOK[it.foodId] && it.foodId !== 'huevo') return;
        var a = acc[it.foodId] || (acc[it.foodId] = { grams: 0, times: 0, roles: {} });
        a.grams += it.grams * times;
        a.times += times;
        a.roles[m.role] = 1;
      });
    });
    return acc;
  }
  // 3 bloques que se cocinan en simultáneo: horno, hornallas y plancha.
  var BATCH_BLOCKS = [
    { id: 'horno', t: '🔥 HORNO 200 °C', ids: ['pollo', 'cerdo', 'merluza', 'papa', 'batata', 'vegetales'], hint: 'Arrancá por acá: todo entra en 2 bandejas y se cocina solo mientras hacés lo demás.' },
    { id: 'olla', t: '🍲 HORNALLAS / OLLAS', ids: ['arroz', 'yamani', 'fideos', 'lentejas', 'huevo'], hint: 'Mientras el horno trabaja: arroz, fideos y huevos duros en las hornallas.' },
    { id: 'plancha', t: '🥩 PLANCHA / GRILL', ids: ['cuadril', 'lomo', 'nalga', 'picada'], hint: 'Al final, las carnes de cocción rápida (se secan menos si se hacen último).' },
  ];
  var BLOCK_MIN = { pollo: 30, cerdo: 35, merluza: 18, papa: 40, batata: 40, vegetales: 25, arroz: 18, yamani: 40, fideos: 10, lentejas: 25, huevo: 10, cuadril: 10, lomo: 10, nalga: 10, picada: 12 };
  function batchSteps() {
    var acc = weeklyCooked(), rules = D.shopRules || {}, bd = batchDays(), out = [];
    BATCH_BLOCKS.forEach(function (bl) {
      var steps = [], mins = 0;
      bl.ids.forEach(function (id) {
        var a = acc[id];
        if (!a) return;
        mins = Math.max(mins, BLOCK_MIN[id] || 0);
        if (id === 'huevo') { steps.push({ id: id, t: 'Huevos duros', d: 'Hervir ' + Math.ceil(a.grams / 60) + ' huevos 9-10 min y cortá la cocción con agua fría. Se conservan 5 días en la heladera con cáscara.' }); return; }
        var r = rules[id] || {}, f = D.foods[id], each = Math.round(a.grams / Math.max(1, a.times) / 5) * 5;
        var buy = r.factor ? a.grams * r.factor : a.grams;
        var what = r.state === 'raw' ? 'Comprá ' + qty(buy) + ' en crudo (rinde ~' + qty(a.grams) + ' cocido)' : r.state === 'dry' ? qty(buy) + ' en seco (rinde ~' + qty(a.grams) + ' cocido)' : qty(a.grams);
        var forRoles = Object.keys(a.roles).map(function (k) { return ROLE_TUPPER[k]; }).filter(Boolean).join(' y ');
        steps.push({ id: id, t: f ? f.name.replace(/ \(.*\)$/, '') : id, d: what + '. ' + COOK[id] + '.', tup: 'Porcioná en ' + a.times + ' tuppers de ~' + n0(each) + ' g' + (forRoles ? ' para tus ' + forRoles : '') + ' ' + bd.days + '.', each: each });
      });
      if (steps.length) out.push({ id: bl.id, t: bl.t + (mins ? ' · ~' + mins + ' MIN' : ''), hint: bl.hint, steps: steps });
    });
    return out;
  }
  function batchPanel() {
    var blocks = batchSteps(), bd = batchDays(), done = S.batchDone, total = 0, ok = 0;
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ COCINAR PARA LA SEMANA · BATCH COOKING ]</div><h3>Cociná una vez, comé toda la semana</h3>';
    h += '<div class="tabs scantabs"><button data-batchmode="on" class="' + (S.batchMode !== 'all' ? 'on' : '') + '">[ 🏋️ ' + Math.max(0, Math.min(7, D.trainingDays)) + ' DÍAS DE ENTRENAMIENTO (ON) ]</button><button data-batchmode="all" class="' + (S.batchMode === 'all' ? 'on' : '') + '">[ 📆 7 DÍAS COMPLETOS ]</button></div>';
    if (!blocks.length) h += '<p class="muted" style="margin-top:10px">Tu plan no tiene preparaciones para cocinar en lote.</p>';
    var body = '';
    blocks.forEach(function (bl, bi) {
      body += '<div class="bk-block"><div class="bk-hd"><span class="n">' + (bi + 1) + '</span><b>' + esc(bl.t) + '</b></div><p class="bk-hint">' + esc(bl.hint) + '</p>';
      bl.steps.forEach(function (st) {
        total++; var on = !!done[st.id]; if (on) ok++;
        body += '<button class="bk-card' + (on ? ' done' : '') + '" data-batchdone="' + esc(st.id) + '"><span class="bk-chk">' + (on ? '✓' : '') + '</span><span class="bk-tx"><b>' + esc(st.t) + '</b><span>' + esc(st.d) + '</span>' + (st.tup ? '<em>🥡 ' + esc(st.tup) + '</em>' : '') + '</span></button>';
      });
      body += '</div>';
    });
    if (total) h += '<div class="bk-prog"><span>' + ok + ' / ' + total + ' cocinado</span><i style="width:' + Math.round((ok / total) * 100) + '%"></i></div>';
    h += body;
    if (total) {
      var ex = [];
      blocks.forEach(function (bl) { bl.steps.forEach(function (st) { if (st.each && ex.length < 2) ex.push(esc(st.t) + ' ' + n0(st.each) + ' g'); }); });
      h += '<div class="bk-label"><div class="tag">[ ROTULÁ TUS TUPPERS ]</div><div class="bk-tag"><b>ALMUERZO · LUNES</b><span>' + ex.join(' + ') + '</span><i>Cocinado: ' + dateLabel(today).replace(/^HOY, /, '') + ' · Consumir antes de 4 días</i></div><p class="muted" style="font-size:12px;margin-top:6px">Cinta de papel + marcador: comida, día, contenido y fecha de cocción. Lo más viejo, adelante en la heladera.</p></div>';
    }
    h += '<div class="d321" style="margin-top:12px"><div class="tag">[ CONSERVACIÓN ]</div><p class="muted" style="font-size:12.5px;margin-top:6px">Heladera: 3-4 días en tuppers cerrados (cociná el domingo y repetí el miércoles). Freezer: carnes y arroz porcionados hasta 2-3 meses; descongelalos en la heladera la noche anterior. Al momento de comer, cociná a fuego medio (o en microondas) hasta que humee y no lo vuelvas a congelar.</p></div>';
    h += '<div class="wbtns" style="margin-top:12px"><button data-batchwa="1" class="wa">📲 Mandar por WhatsApp</button><button data-batchcopy="1" class="ghost">Copiar guía</button>' + (ok ? '<button data-batchreset="1" class="ghost">Reiniciar checklist</button>' : '') + '</div>';
    return h;
  }
  function batchText() {
    var bd = batchDays(), t = '🍳 *BATCH COOKING · ' + D.athlete.name + '*\n_' + bd.label + '_\n';
    batchSteps().forEach(function (bl) {
      t += '\n*' + bl.t + '*\n';
      bl.steps.forEach(function (st) { t += (S.batchDone[st.id] ? '✅ ' : '▢ ') + '*' + st.t + '*: ' + st.d + (st.tup ? '\n   🥡 ' + st.tup : '') + '\n'; });
    });
    return t + '\n🏷 Rotulá cada tupper: comida, día, contenido y fecha.\n❄️ Heladera 3-4 días · freezer 2-3 meses.\n' + D.handle;
  }

  // ---------- Storycard 9:16 (1080 × 1920) · foto del atleta + overlay táctico ----------
  // kind: 'day' (resumen general) | 'meal' (bloque / comida del plan) | 'scan' (plato recién escaneado con IA).
  function storyState() {
    if (!S.story) S.story = { kind: 'day', meal: '', metric: 'kcal', img: null, url: '', scan: null };
    return S.story;
  }
  // Día X · Semana Y desde la primera vez que el atleta abrió su plan en este dispositivo.
  function planDay(iso) {
    var start = store.get('start', null) || today;
    var d = Math.round((new Date(iso + 'T12:00:00') - new Date(start + 'T12:00:00')) / 864e5) + 1;
    d = Math.max(1, d);
    return { day: d, week: Math.ceil(d / 7) };
  }
  function storyMeals() { return mealsFor(S.mode).filter(function (x) { return x.m.id !== '__out'; }); }
  function storyPanel() {
    var st = storyState(), list = storyMeals();
    if (st.kind === 'meal' && !list.some(function (x) { return x.m.id === st.meal; })) st.meal = (list.filter(function (x) { return S.checks[x.m.id]; }).pop() || list[0] || { m: {} }).m.id || '';
    var h = '<button class="xclose" data-close="1" aria-label="Cerrar">✕</button><div class="tag">[ COMPARTIR EN INSTAGRAM · HISTORIA 9:16 ]</div><h3>' + (st.kind === 'scan' ? 'Story de tu plato' : st.kind === 'meal' ? 'Story de tu comida' : 'Story de tu día') + '</h3>';
    h += '<div class="tabs scantabs"><button data-storykind="day" class="' + (st.kind === 'day' ? 'on' : '') + '">[ RESUMEN DEL DÍA ]</button><button data-storykind="meal" class="' + (st.kind !== 'day' ? 'on' : '') + '">[ BLOQUE / COMIDA ]</button></div>';
    if (st.kind === 'meal') h += '<label class="lbl">Comida</label><select id="story-meal" class="inp">' + list.map(function (x) { return '<option value="' + esc(x.m.id) + '"' + (x.m.id === st.meal ? ' selected' : '') + '>' + esc(x.m.time + ' · ' + mealName(x.m, S.mode)) + (S.checks[x.m.id] ? ' ✓' : '') + '</option>'; }).join('') + '</select>';
    if (st.kind === 'scan' && st.scan) h += '<p class="muted" style="font-size:12px;margin-top:8px">Plato escaneado: <b>' + esc(st.scan.dishName) + '</b>' + (st.target ? ' · vs ' + esc(st.target.label) : '') + '</p>';
    if (st.kind === 'day') h += '<div class="tabs scantabs" style="margin-top:8px"><button data-storymetric="kcal" class="' + (st.metric !== 'pct' ? 'on' : '') + '">[ KCAL DEL DÍA ]</button><button data-storymetric="pct" class="' + (st.metric === 'pct' ? 'on' : '') + '">[ % CUMPLIMIENTO ]</button></div>';
    h += '<div class="wbtns" style="margin-top:10px"><button data-storyphoto="pick">[ 📷 ' + (st.url ? 'CAMBIAR FOTO' : 'SUBIR FOTO / CÁMARA') + ' ]</button>' + (st.url ? '<button data-storyphoto="clear" class="ghost">Sin foto</button>' : '') + '</div>';
    h += '<canvas id="story-cv" width="1080" height="1920" class="story-cv"></canvas><div class="wbtns" style="margin-top:12px"><button data-storyshare="1" class="cta">Compartir / descargar PNG</button></div>';
    return h;
  }
  function loadStoryImg(url) {
    var st = storyState(), img = new Image();
    img.onload = function () { st.img = img; st.url = url; if (S.panel === 'story') { renderSheet(); } };
    img.onerror = function () { toast('No se pudo leer la foto'); };
    img.src = url;
  }
  var storyInput = document.getElementById('story-photo');
  if (storyInput) storyInput.addEventListener('change', function () {
    var file = storyInput.files && storyInput.files[0];
    if (!file) return;
    var st = storyState();
    if (st.url && st.own) URL.revokeObjectURL(st.url);
    st.own = true;
    loadStoryImg(URL.createObjectURL(file));
    storyInput.value = '';
  });
  // Plato escaneado → story con su foto, macros detectados y la comparación contra el plan.
  function storyFromScan() {
    if (!S.scan || !S.photo) return;
    var st = storyState(), tgt = scanTarget();
    st.kind = 'scan'; st.scan = S.scan; st.target = tgt; st.own = false; st.img = null; st.url = '';
    loadStoryImg(S.photo.url);
    S.sheet = null; S.panel = 'story'; renderSheet();
  }

  var FLUOR = '#FF6A00', CYAN = '#38BDF8';
  function clip(x, txt, width) {
    txt = String(txt);
    if (x.measureText(txt).width <= width) return txt;
    while (txt.length > 1 && x.measureText(txt + '…').width > width) txt = txt.slice(0, -1);
    return txt.replace(/\s+$/, '') + '…';
  }
  // Datos de la placa: métrica rey, fila de 3 stats y resumen (principal + grilla de 2 columnas).
  function storyData() {
    var st = storyState(), list = storyMeals(), tgt = D.targets[S.mode], sum = daySummary(S.date);
    var stats = function (p, c, f) { return [[n0(p), 'PROTEÍNA (G)'], [n0(c), 'CARBOHIDRATOS (G)'], [n0(f), 'GRASAS (G)']]; };
    var kc = function (i) { return i.p * 4 + i.c * 4 + i.f * 9; };
    var ingGrid = function (items) { return items.filter(function (i) { return i.grams > 0; }).map(function (i) { return { n: i.food, v: n0(i.grams) + ' G · ' + n0(kc(i)) + ' KCAL', r: n0(i.p) + ' P' }; }); };
    if (st.kind === 'scan' && st.scan) {
      var t = st.scan.items.reduce(function (a, i) { return { p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }; }, { p: 0, c: 0, f: 0 });
      var k = kc(t), tg = st.target, dv = tg ? Math.round((k / (tg.kcal || 1) - 1) * 100) : null;
      return {
        label: '[ PLATO ESCANEADO · IA ]', big: n0(k), unit: 'KCAL', stats: stats(t.p, t.c, t.f), sumTitle: '[ DESGLOSE DEL PLATO ]',
        mainLbl: tg ? 'BLOQUE · ' + tg.name : 'PLATO', mainName: st.scan.dishName, mainRight: dv === null ? 'ESTIMACIÓN IA' : (dv > 0 ? '+' : '') + dv + ' % VS PLAN', mainSub: tg ? 'TARGET ' + n0(tg.kcal) + ' KCAL' : 'GEMINI FLASH',
        grid: ingGrid(st.scan.items), done: true,
      };
    }
    if (st.kind === 'meal') {
      var x = list.filter(function (q) { return q.m.id === st.meal; })[0] || list[0];
      if (x) {
        return {
          label: '[ ENERGÍA DEL BLOQUE ]', big: n0(x.kcal), unit: 'KCAL', stats: stats(x.t.p, x.t.c, x.t.f), sumTitle: '[ RESUMEN DEL BLOQUE ]',
          mainLbl: mealName(x.m, S.mode).toUpperCase() + ' · ' + x.m.time, mainName: (x.alt ? x.alt.title : x.m.title) || mealName(x.m, S.mode),
          mainRight: Math.round((x.kcal / (tgt.kcal || 1)) * 100) + ' % DEL DÍA', mainSub: 'OPCIÓN ' + x.opt + (S.checks[x.m.id] ? ' · CUMPLIDA' : ''),
          grid: ingGrid(x.items), done: !!S.checks[x.m.id],
        };
      }
    }
    var pct = st.metric === 'pct', done = list.filter(function (q) { return S.checks[q.m.id]; });
    var eaten = done.reduce(function (a, q) { return { p: a.p + q.t.p, c: a.c + q.t.c, f: a.f + q.t.f }; }, { p: 0, c: 0, f: 0 });
    var pool = done.length ? done : list, main = pool.slice().sort(function (a, b) { return b.kcal - a.kcal; })[0];
    var rest = list.filter(function (q) { return q !== main; });
    return {
      label: pct ? '[ CUMPLIMIENTO NUTRICIONAL ]' : '[ ENERGÍA TOTAL DEL DÍA ]', big: pct ? String(sum.pct) : n0(sum.kcal), unit: pct ? '%' : 'KCAL',
      stats: stats(eaten.p, eaten.c, eaten.f), sumTitle: '[ RESUMEN DEL DÍA · ' + sum.done + '/' + sum.total + ' COMIDAS ]',
      mainLbl: main ? 'COMIDA PRINCIPAL · ' + main.m.time : '', mainName: main ? mealName(main.m, S.mode) : '',
      mainRight: main ? Math.round((main.kcal / (tgt.kcal || 1)) * 100) + ' % DEL DÍA' : '', mainSub: main ? ((main.alt ? main.alt.title : main.m.title) || '') : '',
      grid: rest.map(function (q) { return { n: (q.alt ? q.alt.title : q.m.title) || mealName(q.m, S.mode), v: n0(q.kcal) + ' KCAL · ' + n0(q.t.p) + ' P', r: q.m.time, off: !S.checks[q.m.id] }; }),
      done: sum.adherent,
    };
  }
  // Logo: escudo naranja con rayo (dibujado, no emoji: se ve igual en todos los celulares).
  // Isotipo NutrirCe (mano + tenedor) y logo oficial subido por el coach (se carga una vez y redibuja la story).
  function drawNc(x, px, py, s) {
    x.save(); x.translate(px, py); x.scale(s / 100, s / 100);
    x.fillStyle = '#F97316'; x.fill(new Path2D(D.nutri.fork));
    x.fillStyle = '#22C55E'; x.fill(new Path2D(D.nutri.hand));
    x.strokeStyle = 'rgba(11,15,23,.5)'; x.lineWidth = 2.2; x.lineCap = 'round'; x.stroke(new Path2D(D.nutri.crease));
    x.restore();
  }
  var NCIMG = null, CJIMG = null;
  function cjImg() {
    if (!D.nutri || !D.nutri.cj) return null;
    if (!CJIMG) { CJIMG = new Image(); CJIMG.onload = function () { if (S.panel === 'story') drawStory(); }; CJIMG.src = D.nutri.cj; }
    return CJIMG.complete && CJIMG.naturalWidth ? CJIMG : null;
  }
  try { if (D.nutri) setTimeout(cjImg, 0); } catch (e) {}
  try { if (D.nutri && D.nutri.logo) setTimeout(ncImg, 0); } catch (e) {}
  function ncImg() {
    if (!D.nutri || !D.nutri.logo) return null;
    if (!NCIMG) { NCIMG = new Image(); NCIMG.onload = function () { if (S.panel === 'story') drawStory(); }; NCIMG.src = D.nutri.logo; }
    return NCIMG.complete && NCIMG.naturalWidth ? NCIMG : null;
  }
  function drawLogo(x, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100);
    x.beginPath(); x.moveTo(0, -50); x.lineTo(42, -34); x.lineTo(42, 6); x.quadraticCurveTo(38, 36, 0, 52); x.quadraticCurveTo(-38, 36, -42, 6); x.lineTo(-42, -34); x.closePath();
    x.lineWidth = 9; x.strokeStyle = FLUOR; x.stroke();
    x.beginPath(); x.moveTo(8, -32); x.lineTo(-18, 6); x.lineTo(-2, 6); x.lineTo(-8, 34); x.lineTo(18, -4); x.lineTo(2, -4); x.closePath();
    x.fillStyle = FLUOR; x.fill();
    x.restore();
  }
  function drawStory() {
    var cv = document.getElementById('story-cv');
    if (!cv || !cv.getContext) return;
    var x = cv.getContext('2d'), W = 1080, H = 1920, st = storyState(), dt = storyData();
    var F = '"Chakra Petch", "Rajdhani", system-ui, sans-serif';
    var font = function (w, sz) { x.font = w + ' ' + sz + 'px ' + F; };
    var GRAY = '#9CA3AF', WHITE = '#F8FAFC';
    x.save();
    x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    // 1 · Fondo: foto (cover) o carbono táctico.
    x.fillStyle = '#05080E'; x.fillRect(0, 0, W, H);
    if (st.img) {
      var iw = st.img.naturalWidth, ih = st.img.naturalHeight, k = Math.max(W / iw, H / ih);
      x.drawImage(st.img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
    } else {
      var bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#111827'); bg.addColorStop(1, '#05080E');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(56,189,248,.05)'; x.lineWidth = 2;
      for (var gx = 0; gx <= W; gx += 60) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
      for (var gy = 0; gy <= H; gy += 60) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
    }
    // 2 · Overlay oscuro + viñeta: la foto se ve arriba y el texto se lee abajo.
    x.fillStyle = 'rgba(3,6,12,.30)'; x.fillRect(0, 0, W, H);
    var top = x.createLinearGradient(0, 0, 0, 520); top.addColorStop(0, 'rgba(3,6,12,.70)'); top.addColorStop(1, 'rgba(3,6,12,0)');
    x.fillStyle = top; x.fillRect(0, 0, W, 520);
    var bot = x.createLinearGradient(0, 700, 0, H); bot.addColorStop(0, 'rgba(3,6,12,0)'); bot.addColorStop(.3, 'rgba(3,6,12,.62)'); bot.addColorStop(1, 'rgba(3,6,12,.94)');
    x.fillStyle = bot; x.fillRect(0, 700, W, H - 700);
    var vg = x.createRadialGradient(W / 2, H * 0.45, 420, W / 2, H * 0.45, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    // 3 · Brackets naranja flúor en las 4 esquinas.
    x.strokeStyle = FLUOR; x.lineWidth = 7; x.lineCap = 'square';
    var br = function (cx, cy, dx, dy) { x.beginPath(); x.moveTo(cx, cy + dy * 110); x.lineTo(cx, cy); x.lineTo(cx + dx * 110, cy); x.stroke(); };
    br(56, 56, 1, 1); br(W - 56, 56, -1, 1); br(56, H - 56, 1, -1); br(W - 56, H - 56, -1, -1);
    x.lineCap = 'butt';
    var L = 104, R = W - 104, CW = R - L;
    // 4 · Encabezado.
    var pd = planDay(S.date), dd = new Date(S.date + 'T12:00:00');
    font(600, 34); x.fillStyle = CYAN; x.fillText('[ DÍA ' + pd.day + ' · SEMANA ' + pd.week + ' ]', L, 236);
    x.fillStyle = FLUOR; x.fillRect(L, 262, 150, 6);
    var dateTxt = pad2(dd.getDate()) + ' ' + MO[dd.getMonth()] + ' ' + dd.getFullYear();
    if (D.nutri) {
      // Encabezado 50/50: COACH JP & NUTRIRCE con el mismo tamaño y peso; la fecha pasa debajo del rótulo.
      font(500, 26); x.fillStyle = GRAY; x.fillText(dateTxt, L + 170, 270);
      font(600, 34); var tagW = x.measureText('[ DÍA ' + pd.day + ' · SEMANA ' + pd.week + ' ]').width, hs = 30; font(700, hs);
      var cbW = function () { return x.measureText('COACH JP  &  NUTRIRCE').width; };
      while (hs > 20 && L + tagW + 40 + cbW() > R) { hs -= 1; font(700, hs); }
      var hx = R - cbW();
      x.fillStyle = WHITE; x.fillText('COACH ', hx, 236); hx += x.measureText('COACH ').width;
      x.fillStyle = '#F97316'; x.fillText('JP', hx, 236); hx += x.measureText('JP').width;
      x.fillStyle = 'rgba(203,213,225,.6)'; x.fillText('  &  ', hx, 236); hx += x.measureText('  &  ').width;
      x.fillStyle = '#22C55E'; x.fillText('NUTRIR', hx, 236); hx += x.measureText('NUTRIR').width;
      x.fillStyle = '#F97316'; x.fillText('CE', hx, 236);
    } else { x.textAlign = 'right'; font(500, 32); x.fillStyle = GRAY; x.fillText(dateTxt, R, 236); x.textAlign = 'left'; }
    // 5 · Atleta: nombre en blanco, apellido en naranja, barra lateral + disciplina.
    var words = String(D.athlete.name || 'ATLETA').toUpperCase().split(/\s+/).filter(Boolean);
    var lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : [words[0]];
    var NX = L + 44, nfs = 120;
    lines.forEach(function (ln) { font(700, nfs); while (nfs > 60 && x.measureText(ln).width > R - NX) { nfs -= 4; font(700, nfs); } });
    font(700, nfs);
    var y0 = 318, lh = nfs * 1.0;
    lines.forEach(function (ln, i) { x.fillStyle = i === 0 ? WHITE : FLUOR; x.fillText(ln, NX, y0 + nfs * 0.82 + i * lh); });
    var nameBottom = y0 + nfs * 0.82 + (lines.length - 1) * lh;
    x.fillStyle = FLUOR; x.fillRect(L, y0, 8, nameBottom - y0 + 6);
    font(500, 32); x.fillStyle = GRAY; x.fillText(clip(x, String(D.athlete.discipline || '').toUpperCase(), CW - 44), NX, nameBottom + 56);
    // 6 · Métrica rey.
    var my = Math.max(nameBottom + 150, 700);
    font(600, 32); x.fillStyle = CYAN; x.fillText(dt.label, L, my);
    var bfs = 230; font(700, bfs); while (bfs > 130 && x.measureText(dt.big).width > CW - 230) { bfs -= 6; font(700, bfs); }
    x.fillStyle = WHITE; x.fillText(dt.big, L - 4, my + bfs * 0.86);
    var bw = x.measureText(dt.big).width;
    font(700, Math.round(bfs * 0.4)); x.fillStyle = FLUOR; x.fillText(dt.unit, L + bw + 24, my + bfs * 0.86);
    // 7 · Fila de 3 stats con separadores verticales.
    var sy = my + bfs * 0.86 + 108, colW = CW / 3;
    dt.stats.forEach(function (sv, i) {
      var cx = L + i * colW + (i ? 34 : 0);
      if (i) { x.fillStyle = 'rgba(248,250,252,.35)'; x.fillRect(L + i * colW, sy - 78, 3, 112); }
      font(700, 90); x.fillStyle = WHITE; x.fillText(sv[0], cx, sy);
      font(500, 24); x.fillStyle = GRAY; x.fillText(sv[1], cx, sy + 40);
    });
    // 8 · Resumen: principal + grilla de 2 columnas.
    var ry = sy + 128;
    font(600, 32); x.fillStyle = CYAN; x.fillText(dt.sumTitle, L, ry);
    if (dt.mainName) {
      font(500, 24); x.fillStyle = GRAY; x.fillText(clip(x, dt.mainLbl, CW * 0.55), L, ry + 66);
      x.textAlign = 'right'; font(700, 32); x.fillStyle = FLUOR; x.fillText(dt.mainRight, R, ry + 70);
      font(500, 22); x.fillStyle = GRAY; x.fillText(clip(x, dt.mainSub.toUpperCase(), CW * 0.42), R, ry + 108); x.textAlign = 'left';
      var mfs = 68; font(700, mfs); while (mfs > 38 && x.measureText(dt.mainName.toUpperCase()).width > CW * 0.6) { mfs -= 4; font(700, mfs); }
      x.fillStyle = WHITE; x.fillText(clip(x, dt.mainName.toUpperCase(), CW * 0.6), L, ry + 66 + mfs * 0.95);
    }
    var gy0 = ry + 196, rh = 86, gw = (CW - 48) / 2, foot = H - (D.nutri ? 400 : 226);
    var maxRows = Math.max(1, Math.floor((foot - gy0) / rh)), cap = maxRows * 2, grid = dt.grid;
    var more = grid.length > cap ? grid.length - (cap - 1) : 0;
    if (more) grid = grid.slice(0, cap - 1);
    grid.forEach(function (g, i) {
      var gx2 = L + (i % 2) * (gw + 48), y = gy0 + Math.floor(i / 2) * rh;
      font(700, 27); x.fillStyle = g.off ? GRAY : WHITE; x.fillText(clip(x, g.n.toUpperCase(), gw), gx2, y);
      x.textAlign = 'right'; font(500, 22); x.fillStyle = GRAY; x.fillText(g.r, gx2 + gw, y + 38); var rw = x.measureText(g.r).width; x.textAlign = 'left';
      font(700, 30); x.fillStyle = g.off ? 'rgba(255,106,0,.55)' : FLUOR; x.fillText(clip(x, g.v, gw - rw - 16), gx2, y + 40);
    });
    if (more) { var mi = grid.length, mx = L + (mi % 2) * (gw + 48), myy = gy0 + Math.floor(mi / 2) * rh + 20; font(700, 30); x.fillStyle = CYAN; x.fillText('+ ' + more + (st.kind === 'day' ? ' COMIDAS' : ' INGREDIENTES') + ' MÁS', mx, myy); }
    if (D.nutri) {
      // 9 · Bloque de firma 50/50: [escudo] COACH JP  &  [logo] NUTRIRCE, mismo tamaño y peso, dentro de la
      // zona segura de Instagram; debajo la firma de la nutricionista y el estado del plan.
      var dv = x.createLinearGradient(L, 0, R, 0); dv.addColorStop(0, 'rgba(56,189,248,.45)'); dv.addColorStop(.5, 'rgba(34,197,94,.45)'); dv.addColorStop(1, 'rgba(249,115,22,.45)');
      x.fillStyle = dv; x.fillRect(L, H - 382, CW, 2);
      var IS = 64, GAP = 18, fsz = 44, XG = 30;
      font(700, fsz);
      var wA = x.measureText('COACH JP').width, wB = x.measureText('NUTRIRCE').width;
      while (fsz > 30 && IS * 2 + GAP * 2 + wA + wB + XG * 2 + 30 > CW) { fsz -= 2; font(700, fsz); wA = x.measureText('COACH JP').width; wB = x.measureText('NUTRIRCE').width; }
      var lw = Math.max(IS + GAP + wA, IS + GAP + wB), xw = x.measureText('&').width;
      var x0 = W / 2 - lw - XG - xw / 2, yb = H - 300, iy = yb - IS + 10;
      // Escudo oficial (PNG) con la misma altura que el logo de NutrirCe; si todavía no cargó, el vector.
      var cjI = cjImg(), LH = IS * 1.3;
      if (cjI) { var cwI = LH * cjI.naturalWidth / cjI.naturalHeight; x.drawImage(cjI, x0 + IS / 2 - cwI / 2, iy + IS / 2 - LH / 2, cwI, LH); } else drawLogo(x, x0 + IS / 2, iy + IS / 2, IS);
      x.fillStyle = WHITE; x.fillText('COACH ', x0 + IS + GAP, yb); x.fillStyle = '#F97316'; x.fillText('JP', x0 + IS + GAP + x.measureText('COACH ').width, yb);
      x.fillStyle = 'rgba(203,213,225,.6)'; font(400, fsz); x.fillText('&', W / 2 - xw / 2, yb); font(700, fsz);
      var xb = W / 2 + xw / 2 + XG, img = ncImg();
      if (img) {
        // Logo oficial apilado (isotipo + NUTRIR Ce.): mismo ancho visual que el bloque de Coach JP, centrado en la fila.
        var k = Math.min(lw / img.naturalWidth, (IS * 1.65) / img.naturalHeight), lwI = img.naturalWidth * k, lhI = img.naturalHeight * k;
        x.drawImage(img, xb + (lw - lwI) / 2, iy + IS / 2 - lhI / 2, lwI, lhI);
      } else {
        drawNc(x, xb, iy, IS);
        x.fillStyle = '#22C55E'; x.fillText('NUTRIR', xb + IS + GAP, yb); x.fillStyle = '#F97316'; x.fillText('CE', xb + IS + GAP + x.measureText('NUTRIR').width, yb);
      }
      x.textAlign = 'center'; font(600, 25); x.fillStyle = '#CBD5E1';
      x.fillText(clip(x, D.nutri.story, CW), W / 2, H - 236);
      x.textAlign = 'left'; font(500, 24); x.fillStyle = GRAY; x.fillText(D.handle, L, H - 184);
      x.textAlign = 'right'; font(700, 24); x.fillStyle = dt.done ? FLUOR : GRAY;
      x.fillText(dt.done ? '// PLAN NUTRICIONAL COMPLETADO' : '// PLAN NUTRICIONAL EN CURSO', R, H - 184);
      x.textAlign = 'left';
    } else {
    // 9 · Footer de marca.
    drawLogo(x, L + 34, H - 168, 70);
    font(700, 46); x.fillStyle = WHITE; x.fillText('COACH ', L + 88, H - 160); var cw0 = x.measureText('COACH ').width; x.fillStyle = FLUOR; x.fillText('JP', L + 88 + cw0, H - 160);
    font(500, 26); x.fillStyle = GRAY; x.fillText(D.handle, L + 88, H - 120);
    x.textAlign = 'right'; font(700, 26); x.fillStyle = dt.done ? FLUOR : GRAY;
    x.fillText(dt.done ? '// PLAN NUTRICIONAL COMPLETADO' : '// PLAN NUTRICIONAL EN CURSO', R, H - 140);
    }
    x.restore();
  }
  function paintStory() {
    drawStory();
    // Re-dibuja cuando termina de cargar Chakra Petch (red lenta o primera apertura).
    try {
      if (document.fonts && document.fonts.load) Promise.all(['700 100px "Chakra Petch"', '600 40px "Chakra Petch"', '500 40px "Chakra Petch"'].map(function (f) { return document.fonts.load(f); })).then(function () { if (S.panel === 'story') drawStory(); }, function () {});
    } catch (e) {}
  }
  function shareStory() {
    var cv = document.getElementById('story-cv');
    if (!cv) return;
    cv.toBlob(function (blob) {
      var file = new File([blob], 'story-' + S.date + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Mi día · Coach JP' }).catch(function () {});
        return;
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      toast('Story descargada · subila a Instagram');
    }, 'image/png');
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
    ['⚡ DÍA DE ENTRENO vs DÍA DE DESCANSO', [
      'Los carbohidratos son el combustible del entreno intenso: se guardan como <b>glucógeno</b> en músculo e hígado. Los días que entrenás (<b>Día de entreno</b>, o ON) el plan sube los carbos para llegar con el tanque lleno y recargar después.',
      'Los días de descanso (<b>Día de descanso</b>, o OFF) la demanda de glucógeno baja: se recortan carbos, se suben un poco las grasas y la proteína queda igual. Así sostenés el déficit sin perder rendimiento.',
      'La app elige sola según tus días de entreno. Si cambiás la rutina, tocá el otro botón arriba: queda guardado para ese día.',
    ]],
    ['🥩 PROTEÍNA Y MÚSCULO (LEUCINA)', [
      'La <b>leucina</b> es el aminoácido de la proteína que le da la orden al músculo de construirse (los científicos lo llaman «vía mTOR»). Con <b>~2,7 g por comida</b> esa orden se activa al máximo.',
      'Por eso cuidamos el umbral en las <b>comidas principales</b>: desayuno, almuerzo y cena. Ahí se juega la ganancia y la preservación de músculo.',
      'Las colaciones, las meriendas y lo que comés antes y después de entrenar son <b>comidas de apoyo</b>: controlan el hambre y la energía. No necesitan llegar a ese número: no hace falta agregarles huevo ni proteína en polvo.',
    ]],
    ['↺ CÓMO CAMBIAR UN ALIMENTO (SWAP)', [
      'Tocá <b>Cambiar</b> al lado de cualquier alimento y elegí otro de la lista: los gramos ya vienen calculados para aportar lo mismo de lo que importa (proteínas, carbos o grasas).',
      'Ejemplo: 180 g de pechuga de pollo equivalen a ~190 g de cuadril magro o ~240 g de merluza. El balance del día se mantiene.',
      'Para volver al alimento original, tocá Cambiar otra vez y elegí el marcado como «el de tu plan». Pesá siempre en cocido (carnes, arroz, fideos, papa).',
    ]],
    ['🍔 COMER AFUERA', [
      '<b>Asado / parrilla:</b> priorizá cortes magros (vacío desgrasado, entraña, lomo, pollo). Achuras y chorizo, de a uno y compartido. Ensalada en vez de pan.',
      '<b>Eventos y salidas:</b> proteína primero, carbos según el día. Aderezos aparte y nada de rebozados. Si sabés que salís, guardá 20-30 % de los carbos del día.',
      '<b>Alcohol:</b> máximo 1-2 copas y nunca justo después de entrenar. Agua o soda en el medio.',
      '<b>Si te pasaste:</b> no compenses salteando comidas. Retomá el plan en la próxima comida y seguí la racha.',
    ]],
    ['⚖️ CÓMO REGISTRAR TU PESO', [
      'Pesate <b>en ayunas</b>, después del baño, con poca ropa y siempre a la misma hora. Anotalo en la tarjeta <b>Peso corporal</b>: es opcional, pero con 2-3 veces por semana ya se ve la tendencia.',
      'El peso sube y baja día a día por agua, sal y comida. <b>Lo que importa es la curva de varias semanas</b>, no el número de un día. Tu coach la ve y ajusta el plan si hace falta.',
    ]],
  ];

  // Regla de oro y acceso directo a la herramienta de cada tema de la guía.
  var GUIDE_META = [
    { gold: 'El selector Entreno / Descanso manda: si cambiaste el día de entreno, tocalo y tu plan se reacomoda solo.', go: ['[ ⚡ VER MI DÍA ]', 'data-close="1"'] },
    { gold: 'En desayuno, almuerzo y cena buscá la línea verde <b>«Proteína suficiente para tu músculo»</b>.', go: ['[ 📋 VER MIS COMIDAS ]', 'data-close="1"'] },
    { gold: 'Pesá siempre en cocido. El cambio de alimento ya te da los gramos equivalentes: no los redondees a ojo.', go: ['[ 🚀 PROBAR CAMBIAR UN ALIMENTO ]', 'data-guidego="swap"'] },
    { gold: 'Proteína primero, nada de rebozados y como mucho 1-2 copas. Si te pasaste, seguí el plan en la próxima comida: no compenses salteando.', go: ['[ 🍔 ABRIR COMER AFUERA ]', 'data-panel="out"'] },
    { gold: 'Mirá la curva, no el número del día.', go: ['[ ⚖️ IR A MI PESO ]', 'data-close="1"'] },
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
    // Co-branding 50/50: [Coach JP] & [NutrirCe] con el mismo peso visual (o el logo oficial que subió el coach).
    if (D.nutri) h += '<header class="top cob"><div class="cobrand" data-cobrand><span class="cb"><img src="' + esc(D.nutri.cj) + '" alt="Coach JP" class="cj-img"><b class="brand">COACH <span class="jp">JP</span></b></span><span class="cbx">&amp;</span><span class="cb">' + ncLogo() + '</span></div><button class="guide-btn" data-panel="guide" aria-label="Ayuda: cómo usar tu plan">?<span class="gbt"> Ayuda</span></button></header>';
    else h += '<header class="top">' + D.markSm + '<div class="tb"><div class="brand">COACH <span class="jp">JP</span></div><div class="badge">[ NUTRICIÓN DE ALTO RENDIMIENTO ]</div></div><div class="phase">' + esc(D.athlete.phase) + '</div><button class="guide-btn" data-panel="guide" aria-label="Ayuda: cómo usar tu plan">? Ayuda</button></header>';
    // Fila 2 · atleta + selector de fecha.
    h += '<div class="idrow"><div class="who"><b>' + esc(D.athlete.name) + '</b><span>' + esc(D.athlete.discipline) + (D.nutri ? ' · ' + esc(D.athlete.phase) : '') + '</span></div>';
    h += '<div class="datesel"><button data-day="-1" aria-label="Día anterior">◀</button><span class="dlab' + (S.date === today ? ' now' : '') + '">' + dateLabel(S.date) + '</span><button data-day="1" aria-label="Día siguiente">▶</button></div></div>';
    if (D.nutri) h += '<div class="nutri-line" data-nutri-line><svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M8 1.5 13.5 4v4c0 3.2-2.4 5.6-5.5 6.5C4.9 13.6 2.5 11.2 2.5 8V4L8 1.5Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m5.6 8.1 1.7 1.7 3.2-3.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + esc(D.nutri.header) + '</span></div>';
    if (D.cloud && window.__cjpCloud) {
      var cs = window.__cjpCloud.status();
      h += '<div class="sync-chip ' + cs.state + '" title="' + esc(cs.tip || '') + '">' + esc(cs.text) + '</div>';
    }
    if (S.date !== today) h += '<button class="back-today" data-day="0">' + (S.date < today ? '◷ Estás viendo un día anterior' : '◷ Estás viendo un día que viene') + ' · Volver a hoy</button>';
    if (D.coachNote) {
      var head = D.coachNote.split(/[.!?](\s|$)/)[0];
      h += '<div class="directive' + (S.dirOpen ? ' open' : '') + '"><button data-dir="1"><span class="dh">🎯 <b>Mensaje de tu coach:</b> ' + esc(head.length > 64 ? head.slice(0, 62) + '…' : head) + '</span><span class="dv">[ ' + (S.dirOpen ? 'Ocultar' : 'Leer') + ' ' + (S.dirOpen ? '▴' : '▾') + ' ]</span></button>' + (S.dirOpen ? '<p>' + esc(D.coachNote) + '</p>' : '') + '</div>';
    }

    h += '<div class="switch ' + mode + '"><span class="knob"></span><button data-mode="on" class="' + (mode === 'on' ? 'on' : '') + '">🏋️ DÍA DE ENTRENO</button><button data-mode="off" class="' + (mode === 'off' ? 'on' : '') + '">😴 DÍA DE DESCANSO</button></div>';
    h += '<div class="mode-line"><span>' + (mode === 'on' ? 'Hoy entrenás: más carbohidratos para rendir y recuperarte.' : 'Hoy descansás: menos carbohidratos y la misma proteína.') + '</span>' + helpBtn('mode') + '</div>' + helpLine('mode');

    if (D.migrateTo && !D.cloud && !D.preview) h += '<section class="migrate-card"><div class="mg-k">📲 Tu plan se mudó a un link fijo</div><p>Desde ahora tu plan vive en un link nuevo que tu coach actualiza solo. Pasá tu historial (comidas, agua y peso) con un toque:</p><button data-migrate="1">Pasar mi historial a mi link nuevo</button></section>';
    h += nextCard(list, mode);

    h += '<section class="card"><div class="row"><span class="tag">[ TU DÍA EN NÚMEROS ]</span><span class="hv">' + doneCount + ' de ' + list.length + ' comidas</span></div>' + gauge(tgt, eaten, complete, streak()) + '</section>';

    h += '<button class="scan-cta" data-photo="pick">📷 Escanear plato / subir foto<span>' + (getKey() ? 'Sacale una foto: la IA te dice qué tiene, cuánto pesa y cómo se compara con tu plan' : 'Mandásela a tu coach, o activá el análisis con IA en tu celular') + '</span></button>';
    // Herramientas en una grilla compacta 2 × 3 (sin scroll extra en el celular).
    h += '<div class="toolgrid">' + [
      ['shop', '🛒', 'Lista de compras'], ['out', '🍔', 'Comer afuera'],
      ['fridge', '🧊', 'Mi heladera'], ['portions', '✋', 'Porciones sin balanza'],
      ['batch', '🍳', 'Cocinar para la semana'], ['story', '📸', 'Compartir en Instagram'],
    ].map(function (b) { return '<button data-panel="' + b[0] + '"><span class="ti">' + b[1] + '</span><span>' + b[2] + '</span></button>'; }).join('') + '</div>';

    h += hydration(mode);
    h += timeline(mode, list);
    if (!D.preview) h += weightCard() + checkinCard();

    D.protocols.forEach(function (p) {
      h += '<section class="card alert"><div class="tag" style="margin-bottom:6px">[ ' + esc(p.tag) + ' ]</div><div style="font-weight:700;font-size:16px;color:#FFFFFF">' + esc(p.title) + '</div><p class="muted" style="font-size:13px;margin-top:4px">' + esc(p.body) + '</p></section>';
    });

    h += '<div class="sec"><span class="tag">[ COMIDAS DEL DÍA ]</span><span class="prog">Tocá <b>Cambiar</b> para elegir otro alimento ' + helpBtn('swap') + '</span></div>' + helpLine('swap');
    list.forEach(function (x) {
      var m = x.m;
      var done = !!S.checks[m.id];
      h += '<section class="card meal' + (done ? ' done' : '') + '" id="meal-' + esc(m.id) + '">';
      h += '<div class="hd"><span class="time">' + esc(m.time) + '</span><div><div class="nm">' + esc(mealName(m, mode)) + '</div><div class="mm">' + n0(x.kcal) + ' kcal · ' + n0(x.t.p) + ' g de proteína</div></div><button class="chk" data-check="' + m.id + '" aria-label="Marcar comida">' + CHECK + '</button></div>';
      var malts = mealAlts(m);
      if (m.title || malts.length) {
        if (malts.length) {
          h += '<div class="opt-tabs' + (malts.length > 2 ? ' many' : '') + '">';
          for (var on = 1; on <= malts.length + 1; on++) h += '<button data-opt="' + esc(m.id) + '|' + on + '" class="' + (x.opt === on ? 'on' : '') + '">Opción ' + on + '</button>';
          h += '</div>';
        }
        var otitle = x.alt ? x.alt.title : m.title;
        var omin = (x.alt || m).prepMin;
        if (otitle) h += '<div class="dish"><span class="dtag">' + (x.alt ? 'Opción ' + x.opt + ' · alternativa con los mismos nutrientes' : 'Opción 1 · la recomendada') + '</span><b>' + esc(otitle) + '</b><span class="obadges">' + (omin ? '<i class="t">⏱ ' + omin + ' min</i>' : '') + '<i>' + n0(x.kcal) + ' kcal · ' + mtxt(x.t.p, x.t.c, x.t.f) + '</i></span></div>';
        // Sellos de aptitud del plato (según las restricciones del alumno) y aviso fijo para celíacos.
        var oseals = (x.alt || m).seals || [];
        if (oseals.length) h += '<div class="seals">' + oseals.map(function (z) { return '<i>✓ ' + esc(z) + '</i>'; }).join('') + '</div>';
        if (D.celiacWarning) h += '<div class="xwarn">⚠ ' + esc(D.celiacWarning) + '</div>';
      }
      h += '<div class="items">';
      x.items.forEach(function (it, idx) {
        var hint = unitHintFor(it.foodId, it.grams);
        if (it.salva) {
          h += '<div class="item extra free salva"><span class="g">' + n0(it.grams) + ' g' + (visualHint(it.foodId, it.grams) ? '<em>' + visualHint(it.foodId, it.grams) + '</em>' : '') + '</span><span class="fd">' + esc(it.food) + '<s class="ia">De tu heladera · ' + mshort(it.p, it.c, it.f) + '</s></span><button class="rm" data-unfree="' + esc(m.id) + '" aria-label="Volver al plan">✕</button></div>';
          return;
        }
        if (it.free) {
          h += '<div class="item extra free"><span class="g">~' + n0(it.p * 4 + it.c * 4 + it.f * 9) + '<em>kcal</em></span><span class="fd">' + esc(it.food) + '<s class="ia">' + (it.drink ? 'Bebida en la salida · equivale a ' + n0(it.c) + ' g de carbos' : 'Cuenta como tu comida del plan · ' + mshort(it.p, it.c, it.f)) + '</s></span><button class="rm" data-unfree="' + esc(m.id) + '" aria-label="Deshacer comida libre">✕</button></div>';
          return;
        }
        if (it.extra) {
          h += '<div class="item extra"><span class="g">' + n0(it.grams) + ' g</span><span class="fd">' + esc(it.food) + '<s class="ia">Agregado desde la foto · ' + mshort(it.p, it.c, it.f) + '</s></span><button class="rm" data-rmextra="' + esc(m.id) + '|' + esc(it.id) + '" aria-label="Quitar">✕</button></div>';
          return;
        }
        var canSwap = !it.adjusted && (!!it.swappedFrom || (x.src[idx] && x.src[idx].id === it.id && swapOptions(x.src[idx], m.role).length > 0));
        h += '<button class="item" ' + (canSwap ? 'data-swap="' + m.id + '|' + it.id + '"' : 'disabled') + '><span class="g">' + n0(it.grams) + ' g' + (hint ? '<em>' + hint + '</em>' : '') + '</span><span class="fd">' + esc(it.food) + (it.swappedFrom ? '<s>Reemplaza a: ' + esc(it.swappedFrom) + '</s>' : '') + (it.adjusted ? '<s class="adj">Ajustado por el cambio de alimento: ' + n0(it.adjusted) + ' → ' + n0(it.grams) + ' g (mismos nutrientes)</s>' : '') + (it.rebal ? '<s class="adj">🛡 Ajustado por tu comida afuera: ' + n0(it.rebal) + ' → ' + n0(it.grams) + ' g</s>' : '') + '</span>' + (canSwap ? '<span class="sw">Cambiar</span>' : '') + '</button>';
      });
      h += '</div>';
      h += desglose(m, x);
      // Umbral mTOR sólo en comidas principales; el resto son ingestas auxiliares (sin sugerir huevo o whey).
      if (!m.mps) h += '<div class="leu na"><span class="dot"></span>' + (isOffPeri(m, mode) || (mode === 'off' && m.role !== 'snack') ? 'Comida liviana: controla el hambre y la energía' : m.role === 'peri' ? '⚡ Energía para entrenar' : m.role === 'post' ? '🔄 Recuperación después de entrenar' : 'Colación: controla el hambre y la energía') + '</div>';
      else if (x.t.l >= D.threshold) h += '<div class="leu ok"><span class="dot"></span><span class="leu-t">💪 Proteína suficiente para tu músculo <i>' + n1(x.t.l) + ' g de leucina</i></span>' + helpBtn('leu') + '</div>';
      else h += '<div class="leu low"><span class="dot"></span><span class="leu-t">Le falta un poco de proteína para tu músculo: ' + leuTip(D.threshold - x.t.l) + ' <i>' + n1(x.t.l) + ' de ' + n1(D.threshold) + ' g de leucina</i></span>' + helpBtn('leu') + '</div>';
      if (m.mps) h += helpLine('leu');
      h += '</section>';
    });

    if (D.supplements.length) {
      h += '<div class="sec"><span class="tag">[ SUPLEMENTOS ]</span><span class="prog">Sólo los de respaldo científico fuerte</span></div><section class="card">';
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
    if (D.nutri) h += '<footer class="foot cob" data-cobrand-foot><div class="fmarks"><img src="' + esc(D.nutri.cj) + '" alt="Coach JP" class="cj-img sm"><span class="cbx">&amp;</span>' + ncLogo(true) + '</div><div><div class="brand" style="font-size:12.5px">COACH <span class="jp">JP</span> <span class="muted" style="font-weight:500">HIGH PERFORMANCE SYSTEM</span> <span class="cbx">&amp;</span> <span class="ncw"><i>Nutrir</i><em>Ce</em></span></div><div class="handle">' + esc(D.handle) + ' · ACTUALIZADO ' + esc(D.generatedLabel) + '</div><div class="credit" data-nutri-credit>' + esc(D.nutri.credit) + '</div></div></footer>';
    else h += '<footer class="foot">' + D.shieldSm + '<div><div class="brand" style="font-size:13px">COACH <span class="jp">JP</span> · <span class="muted" style="font-weight:500">HIGH PERFORMANCE SYSTEM</span></div><div class="handle">' + esc(D.handle) + ' · ACTUALIZADO ' + esc(D.generatedLabel) + '</div>' + (D.nutri ? '<div class="credit" data-nutri-credit>' + esc(D.nutri.credit) + '</div>' : '') + '</div></footer>';

    if (!D.preview && !store.get('welcomed', false)) h += welcomeCard();
    var y = window.scrollY;
    $('#app').innerHTML = h;
    window.scrollTo(0, y);
    renderSheet();
  }

  // Traspaso del historial de este archivo al link fijo (otro dominio): viaja dentro del link, sin pasar por servidores.
  function migrateHistory() {
    var since = addDays(today, -90), data = {}, n = 0, days = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var full = localStorage.key(i);
        if (full.indexOf(KEY + ':') !== 0) continue;
        var k = full.slice(KEY.length + 1), m = /^(checks|opt|water|mode|free|rebal):(\d{4}-\d{2}-\d{2})$/.exec(k);
        if (m ? m[2] >= since : /^(history|weights|swaps|start)$/.test(k)) { data[k] = JSON.parse(localStorage.getItem(full)); n++; if (m) days[m[2]] = 1; }
      }
    } catch (e) {}
    if (!n) return toast('No hay historial para pasar en este celular');
    var b64 = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, d: data })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    toast('Abriendo tu link nuevo con ' + Object.keys(days).length + ' días de historial…');
    setTimeout(function () { location.href = D.migrateTo + (D.migrateTo.indexOf('#') >= 0 ? '&' : '#') + 'm=' + b64; }, 400);
  }

  // Bienvenida (primera vez): 3 pasos y a usar la app.
  function welcomeCard() {
    var first = String(D.athlete.name || '').split(' ')[0];
    return '<div class="welcome-bg"><section class="welcome" role="dialog" aria-modal="true" aria-label="Bienvenida">'
      + '<div class="wl-k">Tu plan de nutrición</div><h2>¡Hola' + (first ? ' ' + esc(first) : '') + '! 👋</h2>'
      + '<p class="wl-sub">Así se usa, en 3 pasos:</p><ol class="wl-steps">'
      + '<li><b>1</b><span><strong>Tildá lo que vas comiendo.</strong> Tocá el círculo de cada comida cuando la termines.</span></li>'
      + '<li><b>2</b><span><strong>Tocá «Cambiar» si querés otro alimento.</strong> Te da opciones con los mismos nutrientes.</span></li>'
      + '<li><b>3</b><span><strong>Anotá tu peso en ayunas.</strong> Una vez por día, apenas te levantás.</span></li>'
      + '</ol>' + (D.cloud ? '<p class="wl-note">Tu coach ve tu avance y, cuando actualice tu plan, lo vas a ver acá solo.</p>' : '')
      + '<button class="wl-go" data-welcome="1">Entendido, arrancar</button></section></div>';
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
        // Comida por defecto: la próxima pendiente (la comparativa vs target usa esa).
        if (!S.phMeal) {
          var nm = now.getHours() * 60 + now.getMinutes(), pend = mealsFor(S.mode).filter(function (q) { return q.m.id !== '__out' && !S.checks[q.m.id]; });
          var near = pend.filter(function (q) { return toMin(q.m.time) >= nm - 90; })[0] || pend[pend.length - 1];
          if (near) S.phMeal = near.m.id;
        }
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'w-in') { e.preventDefault(); saveWeight(); } });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-mode],[data-check],[data-swap],[data-pick],[data-itab],[data-panel],[data-cup],[data-water],[data-shopcheck],[data-copyshop],[data-shopreset],[data-photo],[data-aicfg],[data-tl],[data-close],[data-rmextra],[data-day],[data-dir],[data-scantab],[data-portion],[data-scene],[data-imputar],[data-drink],[data-outfood],[data-outfoodrm],[data-outrebal],[data-unfree],[data-washop],[data-shopcouple],[data-fridgeuse],[data-fradd],[data-guidego],[data-frauto],[data-batchcopy],[data-batchwa],[data-batchmode],[data-batchdone],[data-batchreset],[data-storyshare],[data-storykind],[data-storymetric],[data-storyphoto],[data-scanstory],[data-opt],[data-hy],[data-wsave],[data-ci],[data-cisave],[data-goto],[data-welcome],[data-migrate],[data-help],#sheet-bg,#install,#reset');
    if (!el) return;
    var ds = el.dataset;
    if (ds.close) { S.ci = null; return closeSheet(); }
    if (ds.ci) {
      var cp = ds.ci.split('|');
      if (S.ci) {
        if (cp[0] === 'heavy') S.ci.heavy = cp[1] === '1';
        else if (cp[0] === 'photo') S.ci.photo = '';
        else S.ci[cp[0]] = +cp[1];
      }
      haptic();
      return renderSheet();
    }
    if (ds.cisave) return saveCheckin();
    if (ds.scene) { S.outScene = ds.scene; S.outMeal = ''; haptic(); return renderSheet(); }
    if (ds.imputar) {
      var om = (($('#out-meal') || {}).value) || S.outMeal;
      var lst = mealsFor(S.mode), xo = lst.filter(function (q) { return q.m.id === om; })[0];
      if (!om || !xo) return;
      var fm2 = S.outFoods.reduce(function (a, id) { var x = outFood(id); return x ? { p: a.p + x.p, c: a.c + x.c, f: a.f + x.f } : a; }, { p: 0, c: 0, f: 0 });
      var b2 = S.outFoods.length ? fm2 : xo.t;
      S.free[om] = { scene: S.outScene || 'salida', p: Math.round(b2.p), c: Math.round(b2.c), f: Math.round(b2.f), drinks: S.outDrinks.slice(), foods: S.outFoods.slice() };
      S.checks[om] = true;
      var nxt = S.outRebal ? lst.filter(function (q) { return q.m.id !== '__out' && toMin(q.m.time) > toMin(xo.m.time) && !S.checks[q.m.id] && !S.free[q.m.id]; })[0] : null;
      if (nxt) { S.rebal[nxt.m.id] = om; store.set('rebal:' + S.date, S.rebal); }
      store.set('free:' + S.date, S.free);
      store.set('checks:' + S.date, S.checks);
      S.outDrinks = []; S.outFoods = []; S.panel = null; haptic(); render();
      return toast('Comida afuera registrada' + (nxt ? ' · ajustamos ' + mealName(nxt.m, S.mode) : ''));
    }
    if (ds.drink) { if (ds.drink === '__none') S.outDrinks = []; else if (S.outDrinks.filter(function (x) { return x === ds.drink; }).length < 6) S.outDrinks.push(ds.drink); haptic(); return renderSheet(); }
    if (ds.outfood) { if (S.outFoods.length < 20) S.outFoods.push(ds.outfood); haptic(); return renderSheet(); }
    if (ds.outfoodrm) { var fi = S.outFoods.indexOf(ds.outfoodrm); if (fi >= 0) S.outFoods.splice(fi, 1); haptic(); return renderSheet(); }
    if (ds.outrebal) { S.outRebal = !S.outRebal; return renderSheet(); }
    if (ds.unfree) {
      delete S.free[ds.unfree];
      // Si la salida había rebalanceado la comida siguiente, se deshace también.
      Object.keys(S.rebal).forEach(function (k) { if (S.rebal[k] === ds.unfree) delete S.rebal[k]; });
      store.set('rebal:' + S.date, S.rebal);
      store.set('free:' + S.date, S.free);
      return render();
    }
    if (ds.opt) {
      var po = ds.opt.split('|');
      if (+po[1] > 1) S.opt[po[0]] = +po[1];
      else delete S.opt[po[0]];
      store.set('opt:' + S.date, S.opt);
      // Lista de compras: recuerda el plato que el alumno elige para cada comida (se recalcula con esa opción).
      var pref = store.get('optPref', {});
      if (+po[1] > 1) pref[po[0]] = +po[1];
      else delete pref[po[0]];
      store.set('optPref', pref);
      haptic();
      return render();
    }
    if (ds.fridgeuse) return useFridge(ds.fridgeuse === 'done');
    if (ds.fradd) {
      ds.fradd.split(',').forEach(function (id) {
        if (S.fridge.ing.indexOf(id) >= 0) return;
        var slotI = S.fridge.ing.indexOf('');
        if (slotI < 0) slotI = S.fridge.ing.length;
        if (slotI < 5) S.fridge.ing[slotI] = id;
      });
      S.fridge.result = null; haptic();
      return renderSheet();
    }
    if (ds.guidego === 'swap') {
      // Abre el SWAP del primer alimento intercambiable de la próxima comida.
      var btn = document.querySelector('#app [data-swap]');
      S.panel = null;
      if (btn) { var sp = btn.getAttribute('data-swap').split('|'); S.sheet = { meal: sp[0], item: sp[1] }; }
      return renderSheet();
    }
    if (ds.frauto) { S.fridge.noAuto = ds.frauto === 'off'; return renderSheet(); }
    if (ds.batchcopy) return copy(batchText());
    if (ds.batchmode) { S.batchMode = ds.batchmode; store.set('batchMode', S.batchMode); haptic(); return renderSheet(); }
    if (ds.batchdone) { if (S.batchDone[ds.batchdone]) delete S.batchDone[ds.batchdone]; else S.batchDone[ds.batchdone] = 1; store.set('batch:' + weekKey, S.batchDone); haptic(); return renderSheet(); }
    if (ds.batchreset) { S.batchDone = {}; store.set('batch:' + weekKey, S.batchDone); return renderSheet(); }
    if (ds.batchwa) return window.open('https://wa.me/?text=' + encodeURIComponent(batchText()), '_blank');
    if (ds.storyshare) return shareStory();
    if (ds.storykind) { storyState().kind = ds.storykind; haptic(); return renderSheet(); }
    if (ds.storymetric) { storyState().metric = ds.storymetric; return renderSheet(); }
    if (ds.storyphoto === 'pick') { if (storyInput) storyInput.click(); return; }
    if (ds.storyphoto === 'clear') { var sc0 = storyState(); if (sc0.url && sc0.own) URL.revokeObjectURL(sc0.url); sc0.img = null; sc0.url = ''; return renderSheet(); }
    if (ds.scanstory) return storyFromScan();
    if (ds.shopcouple !== undefined) { S.shopCouple = ds.shopcouple === '1'; store.set('shopCouple', S.shopCouple); return renderSheet(); }
    if (ds.washop) return window.open('https://wa.me/?text=' + encodeURIComponent(shopText(shoppingList())), '_blank');
    if (ds.help) { S.help = S.help === ds.help ? '' : ds.help; return render(); }
    if (ds.migrate) return migrateHistory();
    if (ds.welcome) { store.set('welcomed', true); haptic(); return render(); }
    if (ds.hy) { S.hyOpen = !S.hyOpen; store.set('hyOpen', S.hyOpen); haptic(); return render(); }
    if (ds.wsave) return saveWeight();
    if (ds.goto) { var mt = document.getElementById('meal-' + ds.goto); if (mt) mt.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
      var orig = findItem(meal, S.sheet.item);
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

  // Desglose: se recuerda qué comidas cerró el atleta (por defecto, los pasos se ven abiertos).
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || !d.dataset || !d.dataset.ds) return;
    if (d.open) delete S.dsClosed[d.dataset.ds]; else S.dsClosed[d.dataset.ds] = 1;
    store.set('dsClosed', S.dsClosed);
  }, true);

  document.addEventListener('input', function (e) {
    if (e.target.id === 'ph-note') S.phNote = e.target.value;
    if (e.target.id === 'ci-note' && S.ci) S.ci.note = e.target.value;
    if (e.target.id === 'ci-obs' && S.ci) S.ci.obs = e.target.value;
    if (e.target.id === 'ci-kg' && S.ci) S.ci.kg = e.target.value;
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'ci-photo') return ciPhoto(e.target.files && e.target.files[0]);
    if (e.target.id === 'out-meal') { S.outMeal = e.target.value; return renderSheet(); }
    if (e.target.id === 'fr-meal') { S.fridge.meal = e.target.value; S.fridge.result = null; return renderSheet(); }
    if (e.target.dataset && e.target.dataset.fr !== undefined) { S.fridge.ing[+e.target.dataset.fr] = e.target.value; S.fridge.result = null; return renderSheet(); }
    if (e.target.id === 'ph-meal') { S.phMeal = e.target.value; if (S.scan) renderSheet(); }
    if (e.target.id === 'story-meal') { storyState().meal = e.target.value; drawStory(); }
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
        S.batchDone = store.get('batch:' + weekKey, {});
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

  // Puente con el arranque en la nube (/plan/): fila del día para enviar a tu coach y re-render del estado de envío.
  function dayRow(iso) {
    var sm = daySummary(iso), cur = iso === S.date;
    return {
      day: iso, mode: sm.mode, plan_version: D.version || null,
      checks: cur ? S.checks : store.get('checks:' + iso, {}), opts: cur ? S.opt : store.get('opt:' + iso, {}), swaps: S.swaps,
      social: cur ? S.free : store.get('free:' + iso, {}), extras: cur ? S.extras : store.get('extras:' + iso, {}), rebal: cur ? S.rebal : store.get('rebal:' + iso, {}),
      water_ml: Math.round(cur ? S.water : store.get('water:' + iso, 0)), water_target_ml: sm.mode === 'on' ? D.hydration.onMl : D.hydration.offMl,
      meals_done: sm.done, meals_total: sm.total, missed: sm.missed, kcal: sm.kcal, kcal_target: sm.target,
      p: sm.p, c: sm.c, f: sm.f, p_target: D.targets[sm.mode].p, adherent: sm.adherent,
    };
  }
  window.__cjpApi = { dayRow: dayRow, today: function () { return today; }, render: function () { if (!S.sheet && !S.panel) render(); }, toast: toast };

  render();
  if (window.__cjpBootMsg) { toast(window.__cjpBootMsg); window.__cjpBootMsg = ''; }
})();
`;

export default runtime;
