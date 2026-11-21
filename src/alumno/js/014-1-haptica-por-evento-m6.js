(function(){
  'use strict';
  var CFG    = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG) || {};
  var ATH    = CFG.athleteName || 'Atleta';
  var ATHID  = CFG.athleteId || '';
  var SYNC   = CFG.sync || null;                       /* {url,key,table,clave} — sólo si el coach lo habilitó */
  var KHUB   = (typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'coachjp') + '_prhub_v1';
  var KOUT   = 'coachjp_athlete_outbox_v1';
  var RANGOS = [1, 3, 5, 10];

  /* =========================================================
     1 · HÁPTICA POR EVENTO (M6.1)
  ========================================================= */
  var PAT = { serie:[30], descanso:[100,50,100], pr:[50,50,50,50,100], tap:[15] };
  function vib(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  window.CoachHaptics = { patrones: PAT, vibrar: vib };

  /* =========================================================
     2 · PERSISTENCIA OFFLINE (M3.2) — IndexedDB + espejo local
  ========================================================= */
  var DB = null, DBname = 'coachjp-athlete', STORE = 'outbox';
  function abrirDB(){
    return new Promise(function(res){
      if(DB) return res(DB);
      if(!('indexedDB' in window)) return res(null);
      var rq;
      try{ rq = indexedDB.open(DBname, 1); }catch(e){ return res(null); }
      rq.onupgradeneeded = function(){
        var d = rq.result;
        if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath:'id', autoIncrement:true });
        if(!d.objectStoreNames.contains('progreso')) d.createObjectStore('progreso', { keyPath:'k' });
      };
      rq.onsuccess = function(){ DB = rq.result; res(DB); };
      rq.onerror = function(){ res(null); };
    });
  }
  function idbPut(store, obj){
    return abrirDB().then(function(d){
      if(!d) return false;
      return new Promise(function(res){
        try{
          var tx = d.transaction(store, 'readwrite');
          tx.objectStore(store).put(obj);
          tx.oncomplete = function(){ res(true); };
          tx.onerror = function(){ res(false); };
        }catch(e){ res(false); }
      });
    });
  }
  function idbTodo(store){
    return abrirDB().then(function(d){
      if(!d) return [];
      return new Promise(function(res){
        try{
          var tx = d.transaction(store, 'readonly');
          var rq = tx.objectStore(store).getAll();
          rq.onsuccess = function(){ res(rq.result || []); };
          rq.onerror = function(){ res([]); };
        }catch(e){ res([]); }
      });
    });
  }
  function idbLimpiar(store, ids){
    return abrirDB().then(function(d){
      if(!d) return false;
      return new Promise(function(res){
        try{
          var tx = d.transaction(store, 'readwrite');
          var os = tx.objectStore(store);
          ids.forEach(function(i){ os.delete(i); });
          tx.oncomplete = function(){ res(true); };
          tx.onerror = function(){ res(false); };
        }catch(e){ res(false); }
      });
    });
  }

  function espejo(){
    try{ return JSON.parse(localStorage.getItem(KOUT) || '[]') || []; }catch(e){ return []; }
  }
  function guardarEspejo(a){ try{ localStorage.setItem(KOUT, JSON.stringify(a.slice(-200))); }catch(e){} }

  function encolar(item){
    item.ath = item.ath || ATH;
    item.athId = item.athId || ATHID;
    item.ts = item.ts || Date.now();
    var a = espejo(); a.push(item); guardarEspejo(a);      /* el panel del coach lo lee de acá */
    idbPut(STORE, item);                                    /* y queda a salvo aunque se limpie el storage rápido */
    /* la app del alumno también puede correr dentro del panel */
    try{ if(window.parent && window.parent !== window) window.parent.postMessage(Object.assign({ canal:'coachjp' }, item), '*'); }catch(e){}
    pintarOffline();
    enviar();
    return item;
  }
  window.CoachOutbox = { encolar: encolar, pendientes: espejo };

  var enviando = false;
  function enviar(){
    if(enviando) return Promise.resolve(0);
    if(!navigator.onLine){ pintarOffline(); return Promise.resolve(0); }
    if(!SYNC || !SYNC.url || !SYNC.key){ pintarOffline(); return Promise.resolve(0); }
    enviando = true;
    return idbTodo(STORE).then(function(items){
      if(!items.length){ enviando = false; return 0; }
      /* FIX (28/08, feed de actividad del coach) — antes, la 'clave' de las
         3 líneas de acá abajo era SIEMPRE la misma para un mismo atleta,
         sin importar el tipo de evento (pr/readiness_sueno/feedback/etc).
         Supabase upsertea por 'clave' (ver ?on_conflict=clave en el módulo
         de Nube Multi-Dispositivo, misma tabla) — con una clave constante
         por atleta, CADA evento nuevo pisaba al anterior en la fila, así
         que la nube nunca acumulaba un historial real: solo sobrevivía el
         último evento sincronizado por atleta. Se suma tipo+timestamp+un
         sufijo random como parte de la clave para que cada evento quede en
         su propia fila — no se toca la clave de eventos YA sincronizados
         (esto solo cambia lo que se genera de acá en adelante), así que
         ninguna fila existente en Supabase se altera ni se pierde. */
      var filas = items.map(function(it){
        return { clave: (SYNC.clave || 'coachjp') + '_pr_' + (ATHID || ATH) + '_' +
                   (it.tipo || 'evt') + '_' + it.ts + '_' + Math.random().toString(36).slice(2, 7),
                 data: JSON.stringify(it), updated_at: it.ts, device: 'atleta' };
      });
      return fetch(SYNC.url.replace(/\/+$/, '') + '/rest/v1/' + (SYNC.table || 'coachjp_sync'),
        { method:'POST',
          headers:{ apikey:SYNC.key, Authorization:'Bearer ' + SYNC.key,
                    'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(filas) })
        .then(function(r){
          if(!r.ok) throw new Error('HTTP ' + r.status);
          return idbLimpiar(STORE, items.map(function(i){ return i.id; })).then(function(){
            enviando = false;
            /* lo que ya viajó a la nube no necesita quedar en el espejo local */
            guardarEspejo([]);
            pintarOffline(true);
            /* si entró algo nuevo mientras subíamos, va en la próxima vuelta */
            setTimeout(function(){ enviar(); }, 400);
            return items.length;
          });
        })
        .catch(function(){ enviando = false; pintarOffline(); return 0; });
    }).catch(function(){ enviando = false; return 0; });
  }

  function pintarOffline(exito){
    var p = document.getElementById('offPill'); if(!p) return;
    var pend = espejo().length;
    if(!navigator.onLine){
      p.className = 'off-pill on';
      p.querySelector('.tx').textContent = 'Sin conexión — tus series se guardan en el teléfono' +
        (pend ? ' (' + pend + ' por subir)' : '');
      return;
    }
    if(exito){
      p.className = 'off-pill on ok';
      p.querySelector('.tx').textContent = '☁️ Marcas sincronizadas';
      setTimeout(function(){ p.className = 'off-pill'; }, 2600);
      return;
    }
    p.className = 'off-pill';
  }
  window.addEventListener('online', function(){ pintarOffline(); enviar(); });
  window.addEventListener('offline', pintarOffline);

  /* el progreso también se respalda en IndexedDB en cada guardado */
  if(typeof window._spFlush === 'function'){
    var _flushExtraIDB = window._spFlush;
    window._spFlush = function(){
      var r = _flushExtraIDB.apply(this, arguments);
      try{ idbPut('progreso', { k:'state', v: JSON.stringify(state), ts: Date.now() }); }catch(e){}
      return r;
    };
  }

  /* =========================================================
     3 · PR HUB (M4.1)
  ========================================================= */
  function hub(){
    var o = null;
    try{ o = JSON.parse(localStorage.getItem(KHUB) || 'null'); }catch(e){}
    if(!o || typeof o !== 'object') o = { marcas:{} };
    o.marcas = o.marcas || {};
    /* siembra inicial con los 1RM que cargó el coach */
    if(!o.sembrado){
      var seed = (CFG.prs || {});
      Object.keys(seed).forEach(function(k){
        var kg = parseFloat(seed[k]); if(!(kg > 0)) return;
        o.marcas[k] = o.marcas[k] || {};
        if(!o.marcas[k]['1']) o.marcas[k]['1'] = { kg: kg, fecha: hoy(), origen:'coach' };
      });
      o.sembrado = 1;
    }
    return o;
  }
  function guardarHub(o){ try{ localStorage.setItem(KHUB, JSON.stringify(o)); }catch(e){} }
  function hoy(){ var d = new Date(); return d.toISOString().slice(0, 10); }
  function e1rm(kg, reps){
    var k = parseFloat(kg) || 0, r = parseInt(reps, 10) || 1;
    if(!(k > 0)) return 0;
    if(r <= 1) return k;
    var rCap = Math.min(r, 12);
    return Math.round(k * (1 + rCap / 30) * 10) / 10;
  }
  window.CoachE1RM = e1rm;

  function rangoDe(reps){
    var r = parseInt(reps, 10) || 1;
    var best = RANGOS[0];
    for(var i = 0; i < RANGOS.length; i++){ if(r >= RANGOS[i]) best = RANGOS[i]; }
    return String(best);
  }
  function mejor1RM(ex){
    var o = hub(), m = o.marcas[ex] || {}, best = 0;
    Object.keys(m).forEach(function(r){ best = Math.max(best, e1rm(m[r].kg, r)); });
    return Math.round(best * 10) / 10;
  }
  window.CoachPRHub = { mejor1RM: mejor1RM, datos: hub };

  function anotarMarca(ex, kg, reps, origen){
    if(!ex || !(parseFloat(kg) > 0)) return null;
    var o = hub(), r = rangoDe(reps);
    o.marcas[ex] = o.marcas[ex] || {};
    var prev = o.marcas[ex][r] ? parseFloat(o.marcas[ex][r].kg) || 0 : 0;
    if(kg <= prev) return null;
    var antes1rm = mejor1RM(ex);
    var primera = antes1rm <= 0;                       /* nunca hubo nada cargado de este ejercicio */
    o.marcas[ex][r] = { kg: parseFloat(kg), reps: parseInt(reps, 10) || 1, fecha: hoy(), origen: origen || 'sesion' };
    guardarHub(o);
    var nuevo1rm = mejor1RM(ex);
    var esPR = !primera && nuevo1rm > antes1rm;
    /* al coach le viajan los récords y lo que el alumno carga a mano; la primera anotación
       automática sólo queda guardada como referencia */
    if(esPR || origen === 'manual')
      encolar({ tipo:'pr', ex: ex, kg: parseFloat(kg), reps: parseInt(reps, 10) || 1, e1rm: nuevo1rm });
    pintarHub();
    return { ex: ex, kg: kg, reps: reps, e1rm: nuevo1rm, esPR: esPR, primera: primera,
             mejora: Math.round((nuevo1rm - antes1rm) * 10) / 10, prevKg: prev };
  }
  window.CoachAnotarMarca = anotarMarca;

  var catActiva = 'todos';
  function pintarHub(){
    var g = document.getElementById('phGrid'); if(!g) return;
    /* directiva maestra ("Rediseño del Modal de Historial") -- se eliminan
       las pestañas circulares [1RM][3RM][5RM][10RM]: lista vertical única
       (catActiva queda fija en 'todos'), cada rango de repeticiones se
       lee en la línea de detalle de su propia tarjeta. */
    var o = hub(), exs = Object.keys(o.marcas).sort();
    var filas = [];
    exs.forEach(function(ex){
      var m = o.marcas[ex];
      Object.keys(m).sort(function(a, b){ return (+a) - (+b); }).forEach(function(r){
        if(catActiva !== 'todos' && r !== catActiva) return;
        filas.push({ ex: ex, r: r, kg: m[r].kg, fecha: m[r].fecha, origen: m[r].origen, est: e1rm(m[r].kg, r) });
      });
    });
    if(!filas.length){
      g.innerHTML = '<div class="ph-sub" style="padding:14px;border:1px dashed rgba(255,255,255,.16);border-radius:12px">' +
        'Todavía no cargaste marcas. Anotá tu mejor levantamiento abajo y el sistema calcula tu 1RM estimado.</div>';
      return;
    }
    g.innerHTML = filas.map(function(f){
      var top = f.est >= mejor1RM(f.ex) - 0.01;
      return '<div class="ph-row' + (top ? ' record' : '') + '" data-ex="' + escAttr(f.ex) + '" data-r="' + f.r + '">' +
        '<div><div class="ex">' + escTxt(f.ex) + '</div>' +
        '<div class="mt">' + f.r + 'RM · 1RM est. (Epley) ' + f.est + ' kg · ' + f.fecha +
        (f.origen === 'coach' ? ' · cargado por Coach JP' : '') + '</div></div>' +
        '<label class="ph-mark"><input class="ph-edit" type="number" step="0.5" min="0" inputmode="decimal" value="' + f.kg + '" /><span>KG</span></label>' +
      '</div>';
    }).join('');
    var sy = document.getElementById('phSync');
    if(sy){
      var pend = espejo().length;
      sy.className = 'ph-sync' + (pend ? ' off' : '');
      sy.querySelector('.tx').textContent = pend
        ? pend + ' marca(s) esperando conexión para viajar a Coach JP'
        : 'Todo sincronizado con Coach JP';
    }
  }
  function escTxt(s){ var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  function escAttr(s){ return escTxt(s).replace(/"/g, '&quot;'); }

  function montarHub(){
    var wrap = document.getElementById('prHubWrap'); if(!wrap) return;
    document.getElementById('phClose').addEventListener('click', cerrarHub);
    wrap.addEventListener('click', function(e){ if(e.target === wrap) cerrarHub(); });
    document.getElementById('phSave').addEventListener('click', function(){
      var ex = (document.getElementById('phEx').value || '').trim();
      var kg = parseFloat(document.getElementById('phKg').value);
      var rp = parseInt(document.getElementById('phRp').value, 10) || 1;
      if(!ex || !(kg > 0)){ alert('Escribí el ejercicio y los kilos.'); return; }
      var r = anotarMarca(ex, kg, rp, 'manual');
      if(!r) alert('Ya tenés una marca igual o mejor en ese rango de repeticiones.');
      else vib(PAT.pr);                 /* sólo háptica: guardar una marca es silencioso */
      document.getElementById('phEx').value = '';
      document.getElementById('phKg').value = '';
      document.getElementById('phRp').value = '';
      pintarHub();
      /* el modal NO se cierra: se limpian los inputs, la lista ya se repintó y
         la fila guardada (más la barra de carga) destella verde/dorado */
      if(r){
        var rangoGuardado = rangoDe(rp), filasHub = document.querySelectorAll('#phGrid .ph-row');
        for(var hi = 0; hi < filasHub.length; hi++){
          if(filasHub[hi].dataset.ex === ex && filasHub[hi].dataset.r === rangoGuardado){
            filasHub[hi].classList.add('flash-ok'); filasHub[hi].scrollIntoView({ block:'nearest' }); break;
          }
        }
        var barraAdd = document.querySelector('.prhub .ph-add');
        if(barraAdd){ barraAdd.classList.remove('flash-ok'); void barraAdd.offsetWidth; barraAdd.classList.add('flash-ok'); setTimeout(function(){ barraAdd.classList.remove('flash-ok'); }, 1300); }
      }
    });
    document.getElementById('phGrid').addEventListener('change', function(e){
      var i = e.target.closest('.ph-edit'); if(!i) return;
      var row = i.closest('.ph-row');
      var o = hub(), ex = row.dataset.ex, r = row.dataset.r;
      var v = parseFloat(i.value);
      if(!(v > 0) || !o.marcas[ex] || !o.marcas[ex][r]) return;
      o.marcas[ex][r].kg = v; o.marcas[ex][r].fecha = hoy(); o.marcas[ex][r].origen = 'manual';
      guardarHub(o);
      encolar({ tipo:'pr', ex: ex, kg: v, reps: parseInt(r, 10), e1rm: mejor1RM(ex) });
      pintarHub();
    });
    botonHub();
    pintarHub();
    /* pestañas: Progresión de cargas | Mis récords */
    [].forEach.call(document.querySelectorAll('#prHubWrap [data-phtab]'), function(t){
      t.addEventListener('click', function(){ selTabHub(t.dataset.phtab); });
    });
    var selP = document.getElementById('phProgSel');
    if(selP) selP.addEventListener('change', pintarProg);
    var daysP = document.getElementById('phDays');
    if(daysP) daysP.addEventListener('click', function(e){
      var b = e.target.closest('[data-phday]'); if(!b) return;
      phDia = b.getAttribute('data-phday'); if(selP) selP.dataset.firma = ''; pintarProg();
    });
    var shB = document.getElementById('phShare');
    if(shB) shB.addEventListener('click', function(){
      var o = hub(), lin = ['🏆 Mis récords · Coach JP'];
      Object.keys(o.marcas).sort().forEach(function(ex){
        var m = o.marcas[ex];
        Object.keys(m).sort(function(a, b){ return (+a) - (+b); }).forEach(function(r){ lin.push(ex + ' · ' + r + 'RM: ' + m[r].kg + ' kg (1RM est. ' + e1rm(m[r].kg, r) + ' kg)'); });
      });
      var txt = lin.join('\n');
      if(navigator.share){ navigator.share({ title: 'Mis récords', text: txt }).catch(function(){}); }
      else if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(function(){ shB.textContent = '✓ Copiado'; setTimeout(function(){ shB.textContent = '📤 Compartir mis marcas'; }, 1600); }); }
    });
  }
  function selTabHub(t){
    [].forEach.call(document.querySelectorAll('#prHubWrap [data-phtab]'), function(b){ b.classList.toggle('on', b.dataset.phtab === t); });
    var p1 = document.getElementById('phPaneProg'), p2 = document.getElementById('phPanePrs');
    if(p1) p1.style.display = (t === 'prog') ? '' : 'none';
    if(p2) p2.style.display = (t === 'prs') ? '' : 'none';
    if(t === 'prog') pintarProg(); else pintarHub();
  }
  /* ejercicios de la rutina activa que llevan series (simples y estaciones de bisets) */
  /* sólo nombres reales de ejercicio: nunca "DÍA 1 · 3 Sets" ni líneas de dosis */
  function nombreEjValido(n){
    n = String(n || '').trim();
    if(!n || /^(?:d[ií]a|day)\s*\d+/i.test(n) || /^\d+\s*(?:sets?|series?|rondas?|x|\u00d7)/i.test(n)) return false;
    if(/^(?:rest|tempo|rir|nota)\b/i.test(n)) return false;
    return n.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4;
  }
  function progEjercicios(){
    var out = [];
    try{
      DAYS.forEach(function(day){
        (day.blocks || []).forEach(function(b){
          if(!b.sportsPizarra || typeof window.parsearPizarraSB !== 'function') return;
          var lin = itemsDeSemana(b, state.currentWeek || 0).filter(function(l){ return l != null && String(l).trim(); });
          window.parsearPizarraSB(lin, { titulo: b.title }).forEach(function(en, idx){
            var add = function(nombre, exIdx){
              if(nombreEjValido(nombre)) out.push({ id: day.id + '|' + b.id + '|' + exIdx, dayId: day.id, diaN: DAYS.indexOf(day) + 1, blockId: b.id, exIdx: exIdx, nombre: nombre, dia: day.short || '' });
            };
            if(en.tipo === 'simple' && en.sets) add(en.titulo, 'e' + idx);
            else if(en.tipo === 'biserie') en.subs.forEach(function(s, si){ add(s.nombre, 'b' + idx + 's' + si); });
          });
        });
      });
    }catch(e){}
    return out;
  }
  var phDia = null;
  /* mismo ejercicio en otra semana: se busca por NOMBRE en el bloque de esa semana (si el orden de las líneas cambió, el índice 'e1' ya no es el mismo ejercicio) */
  function nomLimpioHist(n){ return nrmHist(String(n || '').replace(/^[A-Fa-f]\d{1,2}[.):\-]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '')); }
  function exIdxSemana(ex, w){
    try{
      var day = DAYS.filter(function(d){ return d.id === ex.dayId; })[0], b = day && (day.blocks || []).filter(function(x){ return x.id === ex.blockId; })[0];
      if(!b || !b.sportsPizarra || typeof window.parsearPizarraSB !== 'function') return ex.exIdx;
      var lin = itemsDeSemana(b, w).filter(function(l){ return l != null && String(l).trim(); }), obj = nomLimpioHist(ex.nombre), hit = null;
      window.parsearPizarraSB(lin, { titulo: b.title }).forEach(function(en, idx){
        var add = function(nm, id){ if(!hit && nomLimpioHist(nm) === obj) hit = id; };
        if(en.tipo === 'simple' && en.sets) add(en.titulo, 'e' + idx);
        else if(en.tipo === 'biserie') (en.subs || []).forEach(function(s, si){ add(s.nombre, 'b' + idx + 's' + si); });
      });
      return hit || ex.exIdx;
    }catch(e){ return ex.exIdx; }
  }
  function pintarProg(){
    var daysEl = document.getElementById('phDays'), sel = document.getElementById('phProgSel'), out = document.getElementById('phProgOut');
    if(!sel || !out) return;
    var lista = progEjercicios();
    if(!lista.length){ if(daysEl) daysEl.innerHTML = ''; sel.innerHTML = ''; out.innerHTML = '<div class="ph-sub ph-empty">Todavía no hay ejercicios con series en tu rutina.</div>'; return; }
    var dias = [];
    lista.forEach(function(x){ if(!dias.some(function(d){ return d.id === x.dayId; })) dias.push({ id: x.dayId, lb: 'D' + x.diaN }); });
    if(!phDia || !dias.some(function(d){ return d.id === phDia; })) phDia = dias.some(function(d){ return d.id === state.currentDay; }) ? state.currentDay : dias[0].id;
    if(daysEl) daysEl.innerHTML = dias.map(function(d){ return '<button type="button" class="ph-day' + (d.id === phDia ? ' on' : '') + '" data-phday="' + escAttr(d.id) + '">' + d.lb + '</button>'; }).join('');
    var delDia = lista.filter(function(x){ return x.dayId === phDia; });
    var firma = delDia.map(function(x){ return x.id; }).join(',');
    if(sel.dataset.firma !== firma){
      sel.innerHTML = delDia.map(function(x){ return '<option value="' + escAttr(x.id) + '">' + escTxt(x.nombre) + '</option>'; }).join('');
      sel.dataset.firma = firma;
    }
    var ex = delDia.filter(function(x){ return x.id === sel.value; })[0] || delDia[0];
    sel.value = ex.id;
    var semanas = (typeof WEEKS_META !== 'undefined' && WEEKS_META.length) ? WEEKS_META.length : 4;
    var filas = '', volTotal = 0, hayDatos = false, volPrev = 0;
    for(var w = 0; w < semanas; w++){
      var sets = [], vol = 0;
      var idxW = exIdxSemana(ex, w);
      for(var si = 1; si <= 12; si++){
        var l = state.loads[getLoadKey(w, ex.dayId, ex.blockId, idxW, si)];
        if(!l) continue;
        /* solo series COMPLETADAS (✓) y, si la marca trae el nombre del ejercicio, que sea exactamente este */
        if(l.done !== true) continue;
        if(l.ex && nomLimpioHist(l.ex) !== nomLimpioHist(ex.nombre)) continue;
        var kg = parseFloat(l.kg), rp = parseFloat(l.reps);
        if(!(kg > 0) && !(rp > 0)) continue;
        sets.push((kg > 0 ? kg : 'BW') + '\u00d7' + (rp > 0 ? rp : '–'));
        vol += jpTonelajeSerie(l);
      }
      if(sets.length) hayDatos = true;
      volTotal += vol;
      var delta = '';
      if(vol > 0 && volPrev > 0){ var pc = Math.round((vol - volPrev) / volPrev * 100); delta = '<i class="ph-delta ' + (pc >= 0 ? 'up' : 'down') + '">' + (pc > 0 ? '+' : '') + pc + '%</i>'; }
      else if(vol > 0) delta = '<i class="ph-delta">base</i>';
      if(vol > 0) volPrev = vol;
      filas += '<div class="ph-prow' + (sets.length ? '' : ' vacio') + '"><b>S' + (w + 1) + '</b><span>' + (sets.length ? sets.join(' · ') : 'sin registro') + '</span><em>' + (vol ? Math.round(vol).toLocaleString('es-AR') + ' kg' : '') + '</em>' + (delta || '<i class="ph-delta"></i>') + '</div>';
    }
    out.innerHTML = '<div class="ph-pmat">' + filas + '</div>' +
      '<div class="ph-ptot">Volumen total acumulado <b>' + Math.round(volTotal).toLocaleString('es-AR') + ' kg</b></div>' +
      (hayDatos ? '' : '<div class="ph-sub ph-empty">Todavía no registraste series de este ejercicio.</div>');
  }
  function abrirHub(){ document.getElementById('prHubWrap').classList.add('on'); selTabHub('prog'); vib(PAT.tap); }
  function cerrarHub(){ document.getElementById('prHubWrap').classList.remove('on'); }
  function botonHub(){
    if(document.getElementById('prHubBtn')) return;
    var host = document.querySelector('.hd-actions') || document.querySelector('.masthead');
    if(!host) return;
    var b = document.createElement('button');
    b.id = 'prHubBtn'; b.type = 'button'; b.className = 'nav-pill';
    b.innerHTML = '🏆<span class="lbl"> Mis Marcas</span>';
    b.title = 'Récords personales y 1RM';
    b.addEventListener('click', abrirHub);
    host.appendChild(b);
  }
  window.CoachHubUI = { abrir: abrirHub, cerrar: cerrarHub, pintar: pintarHub };

  /* =========================================================
     4 · CALCULADORA DE DISCOS Y SERIES DE APROXIMACIÓN (M6.3 y M6.4)
  ========================================================= */
  /* discos estándar de la barra olímpica de 20 kg, tal como se cargan en el gimnasio */
  var DISCOS = [20, 15, 10, 5, 2.5, 1.25];
  function discos(total, barra){
    barra = barra || 20;
    var porLado = (total - barra) / 2, res = [], resto = porLado;
    if(porLado <= 0) return { ok:false, barra: barra, porLado: 0, lista: [], sobra: 0 };
    DISCOS.forEach(function(d){
      var n = Math.floor((resto + 1e-6) / d);
      if(n > 0){ res.push({ d: d, n: n }); resto = Math.round((resto - n * d) * 100) / 100; }
    });
    return { ok:true, barra: barra, porLado: Math.round(porLado * 100) / 100, lista: res, sobra: Math.round(resto * 100) / 100 };
  }
  window.CoachDiscos = discos;
  /* alturas relativas de cada disco, aprox. proporcional al diámetro real
     de un disco olímpico de gimnasio (20kg más grande, 1.25kg más chico) */
  var DISCO_ALTO = { 20:56, 15:49, 10:41, 5:31, 2.5:24, 1.25:19 };
  function discBarHtml(d){
    if(!d || !d.ok || !d.lista.length) return '';
    var placas = '';
    d.lista.forEach(function(x){
      var h = DISCO_ALTO[x.d] || 20;
      for(var i = 0; i < x.n; i++){
        placas += '<div class="db-plate" style="height:' + h + 'px" title="' + x.d + ' kg"></div>';
      }
    });
    return '<div class="disc-bar"><div class="db-sleeve"></div>' + placas + '<div class="db-clip"></div></div>';
  }
  window.CoachDiscoBar = discBarHtml;

  function rampa(objetivo){
    return [0.5, 0.7, 0.8, 0.9].map(function(p){
      return { pct: Math.round(p * 100), kg: Math.round(objetivo * p * 2) / 2,
               reps: p <= 0.5 ? 5 : p <= 0.7 ? 4 : p <= 0.8 ? 3 : 2 };
    });
  }
  window.CoachRampa = rampa;

  function pesoDe(scope){
    /* toma el peso objetivo del bloque: primero lo cargado, después lo sugerido */
    var kg = 0;
    scope.querySelectorAll('.set-kg').forEach(function(i){
      var v = parseFloat(i.value); if(v > kg) kg = v;
    });
    if(kg > 0) return kg;
    var ls = scope.querySelector('.load-suggest');
    if(ls){
      var m = ls.textContent.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*kg/i);
      if(m) return parseFloat(m[1]);
    }
    var nom = nombreDelBloque(scope);
    var rm = mejor1RM(nom);
    if(rm > 0){
      var p = (ls ? (ls.textContent.match(/(\d{2,3})\s*%/) || [])[1] : 0) || 75;
      return Math.round(rm * p / 100 * 2) / 2;
    }
    return 0;
  }
  function nombreDelBloque(bl){
    var ex = bl.querySelector('.ex-name');
    if(ex && ex.childNodes[0]) return (ex.childNodes[0].textContent || '').trim();
    var t = bl.querySelector('.block-label, .block-title, h4');
    return t ? t.textContent.trim() : '';
  }

  function herramientas(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(bl.querySelector('.jp-tools')) return;
      if(!bl.querySelector('.set-row')) return;
      var box = document.createElement('div');
      box.className = 'jp-tools';
      box.innerHTML =
        '<button type="button" class="jp-tool" data-tool="discos">🏋️ Discos por lado</button>' +
        '<button type="button" class="jp-tool" data-tool="rampa">🔥 Series de Aproximación</button>';
      var out = document.createElement('div');
      out.className = 'jp-out'; out.style.display = 'none';
      var ancla = bl.querySelector('.set-tracker') || bl.querySelector('.load-suggest');
      if(ancla && ancla.parentNode){ ancla.parentNode.insertBefore(box, ancla); ancla.parentNode.insertBefore(out, box.nextSibling); }
      else { bl.appendChild(box); bl.appendChild(out); }
      box.addEventListener('click', function(e){
        var b = e.target.closest('[data-tool]'); if(!b) return;
        vib(PAT.tap);
        var abierto = b.classList.contains('on');
        box.querySelectorAll('.jp-tool').forEach(function(x){ x.classList.remove('on'); });
        if(abierto){ out.style.display = 'none'; return; }
        b.classList.add('on');
        var kg = pesoDe(bl);
        if(!(kg > 0)){
          out.innerHTML = '<b>Falta el peso</b><div>Cargá los kilos de la serie (o esperá el peso sugerido) y volvé a tocar el botón.</div>';
          out.style.display = ''; return;
        }
        if(b.dataset.tool === 'discos'){
          var d = discos(kg, 20);
          if(!d.ok){
            out.innerHTML = '<b>Barra sola</b><div>' + kg + ' kg es menos que la barra olímpica de 20 kg. Usá barra corta, mancuernas o suma discos chicos.</div>';
          } else {
            out.innerHTML = '<b>' + kg + ' kg = barra 20 kg + ' + d.porLado + ' kg por lado</b>' +
              '<div class="pl">' + d.lista.map(function(x){ return '<span>' + x.n + ' × ' + x.d + ' kg</span>'; }).join('') + '</div>' +
              (d.sobra > 0 ? '<div style="margin-top:6px;color:#E8965E">Quedan ' + d.sobra + ' kg por lado que no se arman con discos estándar — redondeá a ' +
                (kg - d.sobra * 2) + ' kg o ' + (kg - d.sobra * 2 + 2.5) + ' kg.</div>' : '');
          }
        } else {
          var r = rampa(kg);
          out.innerHTML = '<b>Aproximación hasta ' + kg + ' kg</b>' +
            '<div class="ramp">' + r.map(function(x){
              return '<div><span>' + x.pct + '% · ' + x.reps + ' reps</span><b>' + x.kg + ' kg</b></div>';
            }).join('') + '</div>' +
            '<div style="margin-top:6px;color:#A0A8B4">Descansá 60-90 s entre aproximaciones. No las cuentes como series efectivas.</div>';
        }
        out.style.display = '';
      });
    });
  }

  /* =========================================================
     5 · RIR Y REPORTE "CERO DOLOR" (M6.5)
  ========================================================= */
  function claveBloque(bl){
    var id = bl.dataset.blockId || bl.id || nombreDelBloque(bl);
    return state.currentWeek + '|' + state.currentDay + '|' + id;
  }
  function rirBar(){
    document.querySelectorAll('.block').forEach(function(bl){
      if(bl.querySelector('.rir-bar')) return;
      if(!bl.querySelector('.set-row')) return;
      /* directiva ("Bug crítico athlete-side"): esta barra es UNA sola
         por bloque (RIR del ejercicio completo), pensada para la tarjeta
         clásica de un solo ancla -- en un Bloque de Pizarra Sports puede
         haber varios ejercicios/bisets con sus propios .set-tracker, y la
         barra se insertaba pegada al PRIMERO de ellos, viéndose
         "flotando" y sin asociación clara a ninguna serie puntual (el bug
         reportado). Se retira sólo de bloques de Pizarra -- un bloque
         CLÁSICO de Sports fuera de la Pizarra la sigue mostrando igual
         que siempre. */
      if(bl.querySelector('.jp-sb-board')) return;
      var k = claveBloque(bl);
      state.rir = state.rir || {}; state.dolor = state.dolor || {};
      var bar = document.createElement('div');
      bar.className = 'rir-bar';
      /* Athlete D+F -- botón colapsable [ 📝 Nota ] en la misma barra de
         RIR: NO crea un sistema de notas nuevo, apunta al mismo
         .block-notes/.block-note-input de siempre (bloqueNotasHtml(),
         más abajo en el archivo) -- solo lo pliega por defecto (nunca lo
         oculta si el alumno ya tenía algo escrito) y lo revela con este
         botón en vez de ocupar espacio fijo abajo de cada bloque. */
      var notasEl = bl.querySelector('.block-notes');
      var yaEscrito = !!(notasEl && (notasEl.querySelector('.block-note-input') || {}).value);
      bar.innerHTML = '<span class="lb">RIR de hoy</span>' +
        [0,1,2,3].map(function(n){
          var on = state.rir[k] === n;
          return '<button type="button" class="rir-chip r' + n + (on ? ' on' : '') + '" data-rir="' + n + '">RIR ' + n + (n === 3 ? '+' : '') + '</button>';
        }).join('') +
        (notasEl ? '<button type="button" class="rir-note-btn' + (yaEscrito ? ' on' : '') + '" data-notetoggle="1" aria-expanded="' + (yaEscrito ? 'true' : 'false') + '">📝 Nota</button>' : '');
      if(notasEl && !yaEscrito) notasEl.classList.add('bn-collapsed');
      var nota = document.createElement('div');
      nota.className = 'pain-note'; nota.style.display = state.dolor[k] ? '' : 'none';
      if(state.dolor[k]) nota.textContent = 'Reporte enviado a Coach JP. Bajá la carga, acortá el rango y no fuerces el movimiento.';
      var tracker = bl.querySelector('.set-tracker');
      if(tracker && tracker.parentNode){ tracker.parentNode.insertBefore(bar, tracker.nextSibling); tracker.parentNode.insertBefore(nota, bar.nextSibling); }
      else { bl.appendChild(bar); bl.appendChild(nota); }

      bar.addEventListener('click', function(e){
        var r = e.target.closest('[data-rir]');
        if(r){
          var n = parseInt(r.dataset.rir, 10);
          state.rir[k] = n;
          bar.querySelectorAll('.rir-chip').forEach(function(x){ x.classList.toggle('on', x === r); });
          vib(PAT.tap); saveProgress();
          if(n === 0) revisarFatiga(nombreDelBloque(bl));
          return;
        }
        var nb = e.target.closest('[data-notetoggle]');
        if(nb){
          if(!notasEl) return;
          var abierto = notasEl.classList.toggle('bn-collapsed') === false;
          nb.classList.toggle('on', abierto);
          nb.setAttribute('aria-expanded', abierto ? 'true' : 'false');
          if(abierto){
            var ta = notasEl.querySelector('.block-note-input');
            if(ta) setTimeout(function(){ try{ ta.focus(); }catch(err){} }, 60);
          }
          return;
        }
        var p = e.target.closest('[data-pain]');
        if(p){
          var activo = !state.dolor[k];
          state.dolor[k] = activo;
          p.classList.toggle('on', activo);
          nota.style.display = activo ? '' : 'none';
          if(activo){
            nota.textContent = 'Reporte enviado a Coach JP. Bajá la carga, acortá el rango y no fuerces el movimiento — te va a llegar un reemplazo.';

            vib(PAT.descanso);
          }
          saveProgress();
        }
      });
    });
  }
  /* tres RIR 0 en la misma semana = aviso de fatiga al Builder */
  function revisarFatiga(ex){
    state.rir = state.rir || {};
    var pref = state.currentWeek + '|';
    var ceros = Object.keys(state.rir).filter(function(k){ return k.indexOf(pref) === 0 && state.rir[k] === 0; }).length;
    if(ceros < 3) return;
    state.fatigaAvisada = state.fatigaAvisada || {};
    if(state.fatigaAvisada[state.currentWeek]) return;
    state.fatigaAvisada[state.currentWeek] = 1;
    encolar({ tipo:'fatiga', ex: ex || 'Sesión completa',
              nota:'Tres o más bloques a RIR 0 en la semana ' + (state.currentWeek + 1) });
    saveProgress();
  }

  /* =========================================================
     6 · NUEVO PR → HUB + BUZÓN (M4.1 y M4.2)
  ========================================================= */
  function capturarPR(row){
    var kgIn = row.querySelector('.set-kg'), rpIn = row.querySelector('.set-reps');
    var kg = parseFloat(kgIn && kgIn.value), reps = parseInt(rpIn && rpIn.value, 10) || 1;
    if(!(kg > 0)) return;
    var bl = row.closest('.block'); if(!bl) return;
    var ex = nombreDelBloque(bl); if(!ex) return;
    var r = anotarMarca(ex, kg, reps, 'sesion');
    if(r && r.esPR){
      vib(PAT.pr);
      state.session = state.session || {};
      state.session.prs = state.session.prs || [];
      if(state.session.prs.indexOf(ex) < 0) state.session.prs.push(ex);
      state.session.prDetalle = state.session.prDetalle || [];
      /* directiva (reparación reporte WhatsApp): prDetalle es el log real
         de marcas de TODO el mesociclo (nunca se resetea, ver comentario
         junto a renderContextoSesion más arriba en el archivo) -- para
         que el reporte de WhatsApp pueda filtrar "sólo los PR de HOY" en
         vez de arrastrar el historial completo, cada entrada suma su
         propia fecha. delta/prevKg quedan también para poder mostrar
         "70kg × 10 (+5kg)" en vez de sólo el nombre suelto. */
      state.session.prDetalle.push({ ex: ex, kg: kg, reps: reps, e1rm: r.e1rm,
        fecha: hoy(), prevKg: r.prevKg, delta: (r.prevKg > 0) ? Math.round((kg - r.prevKg) * 100) / 100 : null });
      saveProgress();
    }
  }
  /* el badge 🔥 NEW PR lo pone el módulo previo: lo escuchamos y lo propagamos */
  var obsPR = new MutationObserver(function(muts){
    muts.forEach(function(m){
      Array.prototype.forEach.call(m.addedNodes || [], function(n){
        if(n.nodeType !== 1) return;
        if(n.classList && n.classList.contains('pr-badge')){
          var row = n.closest('.set-row'); if(row) capturarPR(row);
        }
      });
    });
  });

  /* háptica exacta al completar una serie + registro en el historial de marcas */
  document.addEventListener('change', function(e){
    var c = e.target.closest('.set-check');
    if(c && c.checked){
      vib(PAT.serie);
      var row = c.closest('.set-row');
      if(row) setTimeout(function(){ capturarPR(row); }, 40);
    }
  }, true);

  /* =========================================================
     7 · STORY CARDS: DOS ESTILOS (M5)
  ========================================================= */
  var W = 1080, HH = 1920, estilo = 'cyber';
  /* corta un texto en líneas que entren en maxW; marca .recortado si sobra */
  function envolverTexto(g, txt, maxW, maxLineas){
    var palabras = String(txt || '').split(/\s+/).filter(Boolean);
    var lineas = [], actual = '';
    for(var i = 0; i < palabras.length; i++){
      var prueba = actual ? actual + ' ' + palabras[i] : palabras[i];
      if(g.measureText(prueba).width <= maxW || !actual){ actual = prueba; continue; }
      lineas.push(actual); actual = palabras[i];
      if(lineas.length === maxLineas) break;
    }
    if(lineas.length < maxLineas && actual) lineas.push(actual);
    var usadas = lineas.join(' ').split(/\s+/).filter(Boolean).length;
    if(usadas < palabras.length){
      lineas.recortado = true;
      var ult = lineas[lineas.length - 1] || '';
      while(ult && g.measureText(ult + '…').width > maxW) ult = ult.slice(0, -1);
      lineas[lineas.length - 1] = ult.replace(/\s+$/, '') + '…';
    }
    return lineas;
  }
  window.CoachEnvolverTexto = envolverTexto;

  function rr(g, x, y, w, h, r){
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function escudoCanvas(g, cx, cy, alto){
    var s = alto / 74;
    g.save(); g.translate(cx - 32 * s, cy); g.scale(s, s);
    var grad = g.createLinearGradient(0, 0, 64, 74);
    grad.addColorStop(0, '#FFE873'); grad.addColorStop(.38, '#FFD600');
    grad.addColorStop(.72, '#C9A100'); grad.addColorStop(1, '#8A6B00');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(32,2); g.lineTo(60,12); g.lineTo(60,36);
    g.bezierCurveTo(60,54,47,66,32,72); g.bezierCurveTo(17,66,4,54,4,36);
    g.lineTo(4,12); g.closePath(); g.fill();
    g.strokeStyle = '#FFF0A8'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#07080A';
    g.beginPath(); g.moveTo(36,18); g.lineTo(21,40); g.lineTo(30,40);
    g.lineTo(27,58); g.lineTo(43,34); g.lineTo(33,34); g.closePath(); g.fill();
    g.restore();
  }
  /* achica la tipografía hasta que el texto entre en el ancho disponible */
  function ajustar(g, txt, maxW, base, minimo){
    var t = base;
    g.font = '700 ' + t + 'px "Chakra Petch", sans-serif';
    while(g.measureText(txt).width > maxW && t > (minimo || 28)){
      t -= 2;
      g.font = '700 ' + t + 'px "Chakra Petch", sans-serif';
    }
    return t;
  }
  window.CoachAjustarTexto = ajustar;

  function champion(d){
    var c = document.getElementById('storyCanvas'), g = c.getContext('2d');
    g.clearRect(0, 0, W, HH);
    window.__storyLast = { tipo: 'cyber', d: d };
    /* fondo -- foto de la sesión si hay, si no Dark Stealth Tactical, mismo
       tratamiento que dibujar() para que los dos estilos de Story Card
       (Cyber-Grit / PR Champion) no desentonen al cambiar de uno a otro. */
    window.storyFondoFoto(g, W, HH, function(){
      var bgCh = g.createLinearGradient(0, 0, 0, HH);
      bgCh.addColorStop(0, '#0a0c10'); bgCh.addColorStop(1, '#121820');
      g.fillStyle = bgCh; g.fillRect(0, 0, W, HH);
      var vigCh = g.createRadialGradient(W / 2, HH / 2, HH * .28, W / 2, HH / 2, HH * .72);
      vigCh.addColorStop(0, 'rgba(0,0,0,0)'); vigCh.addColorStop(1, 'rgba(0,0,0,.45)');
      g.fillStyle = vigCh; g.fillRect(0, 0, W, HH);
      var r1 = g.createRadialGradient(W / 2, 520, 60, W / 2, 520, 1000);
      r1.addColorStop(0, 'rgba(210,121,63,.24)'); r1.addColorStop(1, 'rgba(210,121,63,0)');
      g.fillStyle = r1; g.fillRect(0, 0, W, HH);
      var r2 = g.createRadialGradient(W / 2, HH - 260, 40, W / 2, HH - 260, 760);
      r2.addColorStop(0, 'rgba(124,197,232,.14)'); r2.addColorStop(1, 'rgba(124,197,232,0)');
      g.fillStyle = r2; g.fillRect(0, 0, W, HH);
    });
    /* marco cepillado -- Luxury Stealth: dorado en vez de naranja */
    g.strokeStyle = 'rgba(229,195,120,.55)'; g.lineWidth = 4;
    rr(g, 46, 46, W - 92, HH - 92, 34); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 2;
    rr(g, 64, 64, W - 128, HH - 128, 26); g.stroke();

    g.textAlign = 'center'; g.textBaseline = 'middle';
    ajustar(g, (d.atleta || 'ATLETA').toUpperCase(), W - 200, 96, 46);
    g.fillStyle = '#FFFFFF';
    g.fillText((d.atleta || 'ATLETA').toUpperCase(), W / 2, 260);
    g.fillStyle = 'rgba(245,197,24,.9)'; g.font = '700 28px "JetBrains Mono", ui-monospace, monospace';
    g.fillText(window.jpFechaMil ? window.jpFechaMil() : (d.fecha || ''), W / 2, 340);
    g.fillStyle = '#E5C378'; g.fillRect(W / 2 - 75, 400, 150, 6);

    var pr = (d.prDetalle && d.prDetalle[0]) || null;
    var sinPR = !pr && !(d.prs && d.prs.length);
    var tituloCh = sinPR ? 'PR CHAMPION // EN PROCESO' : '🏆 NEW PERSONAL RECORD';
    ajustar(g, tituloCh, W - 200, 92, 46);
    g.fillStyle = '#FFFFFF';
    g.fillText(tituloCh, W / 2, sinPR ? 540 : 560);
    if(sinPR){
      g.font = '500 32px Inter, sans-serif'; g.fillStyle = '#A0A8B4';
      envolverTexto(g, 'Sesión de sobrecarga y acumulación completada. Cada repetición construye el próximo récord.', W - 260, 3)
        .forEach(function(ln, i){ g.fillText(ln, W / 2, 612 + i * 44); });
    }
    var nombre = pr ? pr.ex : ((d.prs && d.prs[0]) || 'NUEVA MARCA');
    var kilos  = pr ? (pr.kg + ' KG × ' + pr.reps) : '';
    var est    = pr ? pr.e1rm : 0;

    var cy0 = sinPR ? 780 : 640, ch0 = sinPR ? 330 : 470;
    g.fillStyle = 'rgba(229,195,120,.12)';
    rr(g, 100, cy0, W - 200, ch0, 30); g.fill();
    g.strokeStyle = 'rgba(229,195,120,.6)'; g.lineWidth = 3;
    rr(g, 100, cy0, W - 200, ch0, 30); g.stroke();
    if(sinPR){
      var vTot = d.vol || 0, mejorSet = (d.topSets && d.topSets[0]) || null;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#E5C378'; g.font = '700 36px "Chakra Petch", sans-serif';
      g.fillText(vTot > 0 ? 'TONELAJE TOTAL MOVIDO' : 'SERIES COMPLETADAS', W / 2, cy0 + 64);
      var bigTxt = vTot > 0 ? vTot.toLocaleString('es-AR') + ' KG' : String(d.series || 0) + ' SERIES';
      ajustar(g, bigTxt, W - 300, 150, 70);
      g.fillStyle = '#FFFFFF'; g.fillText(bigTxt, W / 2, cy0 + 185);
      if(mejorSet){
        var tm = 'MEJOR LEVANTAMIENTO · ' + String(mejorSet.ex).toUpperCase() + ' ' + mejorSet.kg + ' KG × ' + mejorSet.reps;
        g.fillStyle = '#A0A8B4'; g.font = '500 30px Inter, sans-serif';
        while(tm.length > 12 && g.measureText(tm).width > W - 260){ tm = tm.slice(0, -2); }
        g.fillText(tm, W / 2, cy0 + 285);
      }
    }

    /* directiva maestra ("Blindaje de márgenes y desbordes en la StoryCard")
       -- el nombre del PR sólo bajaba de 74 a 54px y, si seguía sin
       entrar, se salía del borde dorado. Ahora achica hasta 44px y, si
       aun así no entra, salta a 2 líneas (con elipsis) dentro del marco. */
    if(!sinPR){
    var nm = nombre.toUpperCase();
    ajustar(g, nm, W - 260, 74, 44);
    g.fillStyle = '#E5C378';
    if(g.measureText(nm).width > W - 260){
      envolverTexto(g, nm, W - 260, 2).forEach(function(ln, i){ g.fillText(ln, W / 2, 706 + i * 56); });
    } else {
      g.fillText(nm, W / 2, 740);
    }
    if(kilos){
      g.fillStyle = '#FFFFFF'; g.font = '700 150px "Chakra Petch", sans-serif';
      g.fillText(kilos, W / 2, 890);
    }
    if(est){
      g.fillStyle = '#A0A8B4'; g.font = '500 34px Inter, sans-serif';
      g.fillText('1RM ESTIMADO · ' + est + ' KG', W / 2, 1020);
    }
    }

    /* solo datos reales: sin tiempo medido no se muestra un tiempo (antes caía a "55 min" fijos) y sin tonelaje no se dibuja un "0 KG" */
    var cajas = [
      (d.vol > 0) ? { k:'VOLUMEN', v: (d.vol || 0).toLocaleString('es-AR'), u:'KG' } : null,
      { k:'SERIES',  v: String(d.series || 0), u:'SERIES' },
      d.tiempo ? { k:'TIEMPO',  v: String(d.tiempo), u:'' } : null
    ].filter(Boolean);
    var x = 100, ancho = (W - 200 - 20 * (cajas.length - 1)) / cajas.length;
    cajas.forEach(function(b, i){
      var bx = x + i * (ancho + 20);
      g.fillStyle = 'rgba(255,255,255,.05)'; rr(g, bx, 1150, ancho, 206, 24); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; rr(g, bx, 1150, ancho, 206, 24); g.stroke();
      g.fillStyle = '#A0A8B4'; g.font = '700 26px "Chakra Petch", sans-serif';
      g.fillText(b.k, bx + ancho / 2, 1196);
      ajustar(g, b.v, ancho - 30, 78, 44);
      g.fillStyle = '#E5C378';
      g.fillText(b.v, bx + ancho / 2, 1272);
      g.fillStyle = '#A0A8B4'; g.font = '700 28px "Chakra Petch", sans-serif';
      g.fillText(b.u, bx + ancho / 2, 1328);
    });

    var tituloPie = String(d.tituloSesion || d.sesion || '').toUpperCase();
    if(tituloPie){
      ajustar(g, tituloPie, W - 220, 52, 28);
      g.fillStyle = '#FFFFFF';
      g.fillText(tituloPie, W / 2, 1440);
    }

    /* racha, top lift y firma los agrega el módulo de métricas */
    return c;
  }

  var ultimo = null, cyber = null;
  function estilos(){
    var box = document.querySelector('#storyWrap .story-box');
    if(!box || document.getElementById('scStyles')) return;
    var s = document.createElement('div');
    s.className = 'sc-styles'; s.id = 'scStyles';
    s.innerHTML = '<button type="button" class="sc-style on" data-st="cyber">⚡ Cyber-Grit</button>' +
                  '<button type="button" class="sc-style champ" data-st="champ">🏆 PR Champion</button>';
    box.insertBefore(s, box.firstChild);
    s.addEventListener('click', function(e){
      var b = e.target.closest('[data-st]'); if(!b) return;
      estilo = b.dataset.st;
      s.querySelectorAll('.sc-style').forEach(function(x){ x.classList.toggle('on', x === b); });
      vib(PAT.tap);
      redibujar();
    });
  }
  function redibujar(){
    if(!ultimo) return;
    if(typeof window.CoachStoryMarca === 'function' && window.COACH_DISCIPLINA === 'sports'){ window.CoachStoryMarca(ultimo); return; }
    if(estilo === 'champ') champion(ultimo);
    else if(cyber) cyber(ultimo);
  }
  window.CoachStoryStyles = { fijar: function(e){ estilo = e; redibujar(); }, actual: function(){ return estilo; },
                              champion: champion };

  /* =========================================================
     8 · MONTAJE
  ========================================================= */
  function repintar(){
    try{ herramientas(); rirBar(); }catch(e){}
  }
  function mount(){
    montarHub();
    pintarOffline();
    enviar();
    repintar();
    var main = document.getElementById('mainContent') || document.body;
    obsPR.observe(main, { childList:true, subtree:true });
    window.CoachRepaintBus.register(function(){ repintar(); }, main);

    if(typeof window.renderMain === 'function'){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(repintar, 40);
        return r;
      };
    }
    /* engancha los estilos de Story Card sobre el módulo previo */
    if(window.CoachStory && typeof window.CoachStory.abrir === 'function'){
      cyber = window.CoachStory.dibujar;
      var _ab = window.CoachStory.abrir;
      window.CoachStory.abrir = function(d){
        d = d || {};
        d.prDetalle = (state.session && state.session.prDetalle) || d.prDetalle || [];
        ultimo = d;
        estilo = (d.prs && d.prs.length) ? 'champ' : 'cyber';
        var r = _ab.apply(this, arguments);
        estilos();
        var s = document.getElementById('scStyles');
        if(s) s.querySelectorAll('.sc-style').forEach(function(x){ x.classList.toggle('on', x.dataset.st === estilo); });
        setTimeout(redibujar, 60);
        return r;
      };
      var btn = document.getElementById('scStory');
      if(btn) btn.addEventListener('click', function(){ setTimeout(function(){ estilos(); redibujar(); }, 120); });
      document.addEventListener('click', function(e){
        if(e.target.closest('#scStory')) setTimeout(function(){ estilos(); redibujar(); }, 160);
      });
    }
    window.CoachElite = { discos: discos, rampa: rampa, hub: hub, anotar: anotarMarca,
                          encolar: encolar, enviar: enviar, repintar: repintar, e1rm: e1rm };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(mount, 30); });
  else setTimeout(mount, 30);
})();
