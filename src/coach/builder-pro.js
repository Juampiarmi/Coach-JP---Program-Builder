/* ============================================================
   BUILDER · FUNCIONES NUEVAS (Fase 3, 2026-11)
   ------------------------------------------------------------
   Capa sobre la mesa de trabajo (Fase 2); no reescribe ningún módulo ni cambia el modelo ni las claves de guardado:
     1 · indicadores de sesión en vivo en la barra: duración, series del día (por grupo) y avisos en semáforo (estaciones incompatibles
         en un biset, restricciones del alumno, bloques sin descanso, dosis sin RIR / RPE, ejercicios sin video, tips sin rótulo)
     2 · vista previa fiel: la vista dividida (la app REAL del alumno) abre en el día y la semana que estás editando y se refresca con
         cada guardado, no solo al tipear
     3 · «Duplicar día como variante B»: copia el día al final del mesociclo (bloques con ids nuevos), con deshacer
     4 · revisión «listo para enviar»: al marcar la planificación como COMPLETADA se revisa todo el plan; si hay algo para mirar se
         muestra la lista (con «Ir» a cada día) y se puede marcar igual
     5 · paleta de comandos (Ctrl + K): saltar a un día, una semana o un alumno y correr cualquier acción de la barra
   Las ediciones (variante B) usan las mismas funciones del Builder (plan, save, renderBuilder, renumerarDias, CoachUndo).
   API para los tests: window.JPP.
   ============================================================ */
(function(){
  'use strict';
  if(window.JPP) return;

  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function plano(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function nz(s){ return plano(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function V(){ return document.getElementById('v-builder'); }
  function visibleBuilder(){ var v = V(); return !!v && v.style.display !== 'none' && !!v.offsetParent; }
  function aviso(t, k){ try{ if(typeof window.toast === 'function') window.toast(t, k); }catch(e){} }
  function dosis(t){ try{ return typeof window.jpDosisCanon === 'function' ? window.jpDosisCanon(t) : {}; }catch(e){ return {}; } }
  function planActivo(){ try{ return (typeof S !== 'undefined' && S.activeId && typeof window.plan === 'function') ? window.plan(S.activeId) : null; }catch(e){ return null; } }
  function ui(){ try{ return (typeof S !== 'undefined' && S.ui) || {}; }catch(e){ return {}; } }

  /* ---------- revisión (indicadores y «listo para enviar») ---------- */
  var RX_RESTO = /^(?:rest|descanso|pausa)\b/i, RX_META = /^(?:tempo|rir|rpe|nota|notas|obs)\b/i, RX_PREF = /^(?:[A-F]?\d+[.)]\s+)/i;
  var RX_ROT = /^([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 &\/\-–·().,]{1,70}?):\s*(.*)$/;
  function ejercicio(nombre){ try{ return typeof window.resolverExSports === 'function' ? window.resolverExSports(nombre) : null; }catch(e){ return null; } }
  function estacion(ex){ try{ return typeof window.jpEstacion === 'function' ? window.jpEstacion(ex) : ''; }catch(e){ return ''; } }
  function compatibles(a, b){ try{ return typeof window.jpEstacionCompat === 'function' ? window.jpEstacionCompat(a, b) : true; }catch(e){ return true; } }
  function revisarBloque(b, out, diaIdx){
    if(!b) return;
    var tit = plano(b.titulo || b.title || 'Bloque'), add = function(nivel, k, msg){ out.push({ nivel: nivel, k: k, dia: diaIdx, b: b.id, bloque: tit, msg: msg }); };
    if(Array.isArray(b.items) && b.items.length){
      var nombres = [], dosisN = 0, sinRir = 0, conResto = false, letras = 0;
      b.items.forEach(function(l){
        var t = plano(l); if(!t) return;
        if(RX_RESTO.test(t)){ conResto = true; return; }
        var d = dosis(t);
        if(d.sets && d.reps){ dosisN++; if(!d.rir && !/\bRPE\b/i.test(t)) sinRir++; if(d.rest) conResto = true; return; }
        if(!RX_META.test(t) && /[A-Za-zÁÉÍÓÚáéíóúñÑ]{3}/.test(t)){ if(/^[A-F]\d+[.)]\s/i.test(t)) letras++; nombres.push(t.replace(RX_PREF, '')); }
      });
      if(dosisN && !conResto && b.category !== 'warmup') add('aviso', 'descanso', 'Sin descanso indicado');
      if(sinRir) add('aviso', 'rir', sinRir === 1 ? '1 dosis sin RIR / RPE' : sinRir + ' dosis sin RIR / RPE');
      var exs = nombres.map(function(n){ return { n: n, ex: ejercicio(n) }; });
      var sinVid = exs.filter(function(x){ return !x.ex || !x.ex.videoId; });
      if(sinVid.length) add('aviso', 'video', 'Sin video: ' + sinVid.map(function(x){ return x.n; }).slice(0, 3).join(', ') + (sinVid.length > 3 ? '…' : ''));
      /* regla anti-colisión: las estaciones de un biset / triset se tienen que poder usar juntas (nunca dos poleas o dos máquinas fijas) */
      if(letras >= 2){
        for(var k = 0; k < exs.length - 1; k++){
          var ea = exs[k].ex ? estacion(exs[k].ex) : '', eb = exs[k + 1].ex ? estacion(exs[k + 1].ex) : '';
          if(ea && eb && !compatibles(ea, eb)) add('error', 'estacion', 'Estaciones incompatibles en el biset: «' + exs[k].n + '» + «' + exs[k + 1].n + '»');
        }
      }
    } else if(Array.isArray(b.ejercicios) || Array.isArray(b.ex)){
      if((b.tipo === 'block' || b.tipo === 'superset') && !(+b.restSeconds > 0)) add('aviso', 'descanso', 'Sin descanso indicado');
    }
    var tips = String(b.tips || '').split('\n').map(plano).filter(Boolean), sinRot = tips.filter(function(l){ return !RX_ROT.test(l); }).length;
    if(sinRot) add('aviso', 'tips', sinRot === 1 ? '1 tip sin rótulo (el alumno lo ve como «Nota»)' : sinRot + ' tips sin rótulo (el alumno los ve como «Nota»)');
  }
  function revisarDia(d, i){
    var out = [];
    if(!d) return out;
    var bl = d.bloques || [];
    if(!bl.length) out.push({ nivel: 'aviso', k: 'vacio', dia: i, b: '', bloque: '', msg: 'Día sin bloques' });
    bl.forEach(function(b){ revisarBloque(b, out, i); });
    return out;
  }
  function revisarPlan(p){
    p = p || planActivo(); var out = [];
    if(!p) return out;
    (p.dias || []).forEach(function(d, i){ out = out.concat(revisarDia(d, i)); });
    return out;
  }
  function restriccionesDOM(){
    return [].map.call(document.querySelectorAll('#alertsPanel .alert:not(.good)'), function(a){ return { nivel: /\bbad\b|\berr|danger|red/.test(a.className) ? 'error' : 'aviso', k: 'restriccion', dia: ui().day || 0, b: '', bloque: '', msg: plano(a.textContent).slice(0, 160) }; });
  }

  /* ---------- 1 · indicadores en la barra ---------- */
  function seriesPorGrupo(){
    var tab = document.querySelector('#dayTabs .tab.on'), t = tab ? String(tab.title || '') : '', i = t.indexOf('|'), grupos = [], total = 0;
    if(i >= 0) t.slice(i + 1).replace(/series?\s*$/i, '').split('·').forEach(function(x){ var m = /^\s*(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/.exec(x); if(m){ var n = parseFloat(m[2].replace(',', '.')); grupos.push({ g: m[1], n: n }); total += n; } });
    return { grupos: grupos, total: Math.round(total * 10) / 10 };
  }
  function datosIndicador(){
    var p = planActivo(), u = ui(), d = p && p.dias ? p.dias[u.day || 0] : null;
    var avisos = revisarDia(d, u.day || 0).concat(restriccionesDOM());
    var dur = document.querySelector('#durChip b'), det = document.querySelector('#durChip .det'), sg = seriesPorGrupo();
    var errores = avisos.filter(function(a){ return a.nivel === 'error'; }).length;
    return { dur: dur ? plano(dur.textContent) : '', durDet: det ? plano(det.textContent) : '', series: sg, avisos: avisos, errores: errores, estado: errores ? 'rojo' : (avisos.length ? 'amarillo' : 'verde') };
  }
  function pintarIndicador(){
    var bar = document.getElementById('jpbMesa'); if(!bar) return;
    var bt = bar.querySelector('.jpp-ind');
    if(!bt){
      bt = document.createElement('button'); bt.type = 'button'; bt.className = 'jpm-b jpp-ind'; bt.setAttribute('data-jpp', 'ind'); bt.setAttribute('aria-haspopup', 'dialog'); bt.setAttribute('aria-expanded', 'false');
      var g = bar.querySelector('.jpm-guard'); bar.insertBefore(bt, g || null);
    }
    var D = datosIndicador(), partes = [], nAv = D.avisos.length;
    if(D.dur) partes.push(D.dur.replace(/^≈\s*/, ''));
    if(D.series.total) partes.push(D.series.total + ' series');
    var h = '<i class="jpp-dot ' + D.estado + '" aria-hidden="true"></i>' + esc(partes.join(' · ')) + '<b class="jpp-n ' + D.estado + '">' + (nAv ? nAv : '✓') + '</b>';
    if(bt.__h !== h){ bt.__h = h; bt.innerHTML = h; }
    bt.title = 'Indicadores de la sesión: ' + (D.dur ? D.dur + ' · ' : '') + (D.series.total ? D.series.total + ' series · ' : '') + (nAv ? nAv + (nAv === 1 ? ' aviso' : ' avisos') : 'sin avisos') + (D.errores ? ' (' + D.errores + (D.errores === 1 ? ' error' : ' errores') + ')' : '');
    bt.setAttribute('aria-label', bt.title);
    bt.setAttribute('data-estado', D.estado);
    var pop = document.getElementById('jppIndPop'); if(pop && !pop.hidden) pintarPopIndicador(pop, D);
  }
  function pintarPopIndicador(pop, D){
    D = D || datosIndicador();
    var h = '<div class="jpp-pop-h"><b>Indicadores de la sesión</b><button type="button" data-jpp="ind-x" aria-label="Cerrar">×</button></div>';
    h += '<div class="jpp-sec"><span>Duración</span><b>' + esc(D.dur || '—') + '</b>' + (D.durDet ? '<small>' + esc(D.durDet) + '</small>' : '') + '</div>';
    h += '<div class="jpp-sec"><span>Series del día</span><b>' + esc(D.series.total || 0) + '</b>' + (D.series.grupos.length ? '<div class="jpp-grupos">' + D.series.grupos.map(function(x){ return '<i>' + esc(x.g) + ' <b>' + esc(x.n) + '</b></i>'; }).join('') + '</div>' : '') + '</div>';
    h += '<div class="jpp-sec jpp-avisos"><span>Avisos del día</span>' + (D.avisos.length ? '<ul>' + D.avisos.map(function(a){ return '<li class="' + a.nivel + '"><i aria-hidden="true"></i><span>' + (a.bloque ? '<b>' + esc(a.bloque) + '</b> · ' : '') + esc(a.msg) + '</span>' + (a.b ? '<button type="button" data-jpp="ir" data-b="' + esc(a.b) + '">Ir</button>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="ok">Todo en orden para este día.</p>') + '</div>';
    h += '<div class="jpp-pie"><button type="button" class="jpm-b" data-jpp="revisar">Revisar todo el plan</button></div>';
    if(pop.__h !== h){ pop.__h = h; pop.innerHTML = h; }
  }
  function indicador(ab){
    var bt = document.querySelector('#jpbMesa .jpp-ind'); if(!bt) return;
    var pop = document.getElementById('jppIndPop');
    if(!pop){ pop = document.createElement('div'); pop.id = 'jppIndPop'; pop.className = 'jpp-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Indicadores de la sesión'); pop.hidden = true; document.getElementById('jpbMesa').appendChild(pop); }
    ab = ab == null ? pop.hidden : !!ab;
    if(ab) pintarPopIndicador(pop);
    pop.hidden = !ab; bt.setAttribute('aria-expanded', String(ab));
  }
  function irABloque(id){
    var inp = id && document.querySelector('#dayPanel .block-h [data-b="' + id + '"]'), bl = inp && inp.closest('.block');
    if(!bl) return false;
    if(bl.classList.contains('jp-col')){ var cv = bl.querySelector('.jp-cv'); if(cv) cv.click(); }
    setTimeout(function(){ var i2 = document.querySelector('#dayPanel .block-h [data-b="' + id + '"]'), b2 = i2 && i2.closest('.block'); if(b2){ try{ b2.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch(e){ b2.scrollIntoView(); } try{ i2.focus({ preventScroll: true }); }catch(e){} } }, 80);
    return true;
  }
  function irADia(i){ var t = document.querySelector('#dayTabs .tab[data-day="' + i + '"]'); if(t && !t.classList.contains('on')) t.click(); return !!t; }

  /* ---------- 2 · vista previa fiel ---------- */
  var VP = { t: 0, ultimo: '' };
  function splitActivo(){ return document.body.classList.contains('split-view-on'); }
  function llevarAlDia(){
    var ifr = document.getElementById('splitViewFrame'); if(!ifr || !splitActivo()) return false;
    var w = null; try{ w = ifr.contentWindow; if(!w || !w.document) return false; }catch(e){ return false; }
    var p = planActivo(), u = ui(), d = p && p.dias ? p.dias[u.day || 0] : null; if(!d) return false;
    try{
      var pills = w.document.querySelectorAll('#weekSelector .week-pill'), pill = pills[u.week || 0];
      if(pill && !pill.classList.contains('active')) pill.click();
      var tab = w.document.querySelector('.day-tab[data-day="' + d.id + '"]');
      if(tab && !tab.classList.contains('active')) tab.click();
      VP.ultimo = d.id + '|' + (u.week || 0);
      return !!tab;
    }catch(e){ return false; }
  }
  function refrescarVista(){
    clearTimeout(VP.t);
    VP.t = setTimeout(function(){
      if(!splitActivo()) return;
      var ifr = document.getElementById('splitViewFrame'), a = null;
      try{ a = typeof window.active === 'function' ? window.active() : null; }catch(e){}
      if(!ifr || !a || typeof window.compile !== 'function') return;
      try{ if(typeof window.totalEjercicios === 'function' && !window.totalEjercicios(window.plan(a.id))) return; ifr.srcdoc = window.compile(a); }catch(e){ console.warn('vista previa', e); }
    }, 900);
  }
  /* el iframe de la vista dividida se crea al abrirla: su «load» se escucha en captura desde el documento */
  document.addEventListener('load', function(e){ if(e.target && e.target.id === 'splitViewFrame') setTimeout(llevarAlDia, 120); }, true);
  function engancharVista(){
    if(typeof window.save === 'function' && !window.save.__jpp){
      var s0 = window.save, ws = function(){ var r = s0.apply(this, arguments); try{ if(splitActivo()) refrescarVista(); }catch(e){} return r; };
      ws.__jpp = 1; ws.__jpm = s0.__jpm; window.save = ws;
    }
    var u = ui(), p = planActivo(), d = p && p.dias ? p.dias[u.day || 0] : null, clave = d ? d.id + '|' + (u.week || 0) : '';
    if(splitActivo() && clave && clave !== VP.ultimo) llevarAlDia();
  }

  /* ---------- 3 · duplicar día como variante B ---------- */
  function duplicarVariante(){
    var p = planActivo(); if(!p || !p.dias) return null;
    var max = (typeof MAX_DIAS !== 'undefined') ? MAX_DIAS : 7;
    if(p.dias.length >= max){ aviso('Máximo ' + max + ' días por mesociclo: no hay lugar para la variante', 'err'); return null; }
    var u = ui(), src = p.dias[u.day || 0]; if(!src) return null;
    if(window.CoachUndo && typeof window.CoachUndo.vigilar === 'function') window.CoachUndo.vigilar('Duplicar ' + (src.short || 'día') + ' como variante');
    var copia = JSON.parse(JSON.stringify(src)), ids = {};
    var nuevoId = function(viejo){ if(!ids[viejo]) ids[viejo] = (typeof window.uid === 'function' ? window.uid('b') : 'b_' + Math.random().toString(36).slice(2, 12)); return ids[viejo]; };
    (function reid(o){
      if(Array.isArray(o)){ o.forEach(reid); return; }
      if(!o || typeof o !== 'object') return;
      if(typeof o.id === 'string' && typeof o.tipo === 'string' && o !== copia) o.id = nuevoId(o.id);
      Object.keys(o).forEach(function(k){ if(o[k] && typeof o[k] === 'object') reid(o[k]); });
    })(copia);
    var usados = {}; p.dias.forEach(function(x){ usados[x.id] = 1; });
    var k = p.dias.length + 1; while(usados['dia' + k]) k++;
    copia.id = 'dia' + k;
    var base = plano(src.title || src.short || 'Día'), letra = 'B';
    while(p.dias.some(function(x){ return plano(x.title) === 'Variante ' + letra + ' · ' + base; }) && letra < 'F') letra = String.fromCharCode(letra.charCodeAt(0) + 1);
    copia.title = 'Variante ' + letra + ' · ' + base;
    copia.short = 'DÍA ' + (p.dias.length + 1);
    if(/^Sesi[oó]n\s*\d+$/i.test(plano(copia.label))) copia.label = 'Sesión ' + (p.dias.length + 1);
    p.dias.push(copia);
    try{ if(typeof window.renumerarDias === 'function') window.renumerarDias(p); }catch(e){}
    S.ui.day = p.dias.length - 1;
    try{ window.save(); }catch(e){} try{ window.renderBuilder(); }catch(e){}
    aviso('Variante ' + letra + ' creada: ' + copia.short + ' (copia de ' + (src.short || base) + ')');
    return copia;
  }

  /* ---------- 4 · revisión «listo para enviar» ---------- */
  var PASAR = false;
  function modalRevision(items){
    var m = document.getElementById('jppRevision');
    if(!m){ m = document.createElement('div'); m.id = 'jppRevision'; m.className = 'jpp-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Revisión antes de enviar'); m.hidden = true; document.body.appendChild(m); }
    var p = planActivo(), porDia = {};
    items.forEach(function(a){ (porDia[a.dia] = porDia[a.dia] || []).push(a); });
    var err = items.filter(function(a){ return a.nivel === 'error'; }).length;
    var h = '<div class="jpp-modal-c"><div class="jpp-pop-h"><b>Antes de marcarla como completada</b><button type="button" data-jpp="rev-x" aria-label="Cerrar">×</button></div>' +
      '<p class="jpp-rev-res">' + (err ? '<b class="error">' + err + (err === 1 ? ' error' : ' errores') + '</b> · ' : '') + items.length + (items.length === 1 ? ' punto para mirar' : ' puntos para mirar') + ' en ' + Object.keys(porDia).length + (Object.keys(porDia).length === 1 ? ' día' : ' días') + '.</p><div class="jpp-rev-l">';
    Object.keys(porDia).sort(function(a, b){ return a - b; }).forEach(function(di){
      var d = p && p.dias ? p.dias[di] : null;
      h += '<div class="jpp-rev-d"><div class="jpp-rev-dh"><b>' + esc(d ? (d.short || '') + (d.title && !/^d[ií]a\s*\d+$/i.test(d.title) ? ' · ' + d.title : '') : 'Día') + '</b><button type="button" class="jpm-b" data-jpp="rev-ir" data-dia="' + di + '" data-b="' + esc((porDia[di].filter(function(a){ return a.b; })[0] || {}).b || '') + '">Ir</button></div><ul>' +
        porDia[di].map(function(a){ return '<li class="' + a.nivel + '"><i aria-hidden="true"></i><span>' + (a.bloque ? '<b>' + esc(a.bloque) + '</b> · ' : '') + esc(a.msg) + '</span></li>'; }).join('') + '</ul></div>';
    });
    h += '</div><div class="jpp-pie"><button type="button" class="jpm-b" data-jpp="rev-x">Seguir editando</button><button type="button" class="jpm-b jpp-prim" data-jpp="rev-ok">Marcar como completada igual</button></div></div>';
    m.innerHTML = h; m.hidden = false;
    return m;
  }
  function cerrarRevision(){ var m = document.getElementById('jppRevision'); if(m) m.hidden = true; }
  function revisar(){ var items = revisarPlan(); if(!items.length){ aviso('Revisión: todo en orden en los ' + ((planActivo() || {}).dias || []).length + ' días'); cerrarRevision(); return []; } modalRevision(items); return items; }
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('#btnPlanEstado') : null; if(!b) return;
    if(PASAR){ PASAR = false; return; }
    var p = planActivo(); if(!p || p.estado === 'listo') return;      /* volver a borrador no se revisa */
    var items = revisarPlan(p); if(!items.length) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    modalRevision(items);
  }, true);

  /* ---------- 5 · paleta de comandos (Ctrl + K) ---------- */
  var CMD = { sel: 0, vis: [] }, EXTRA = [];
  function comandos(){
    var out = [], clickId = function(id){ return function(){ var x = document.getElementById(id); if(x) x.click(); }; };
    [].forEach.call(document.querySelectorAll('#dayTabs .tab[data-day]'), function(t, i){
      var lb = plano((t.querySelector('.tab-label') || {}).textContent || ''), gr = plano((t.querySelector('.tab-grp') || {}).textContent || '');
      out.push({ g: 'Día', t: 'Ir al DÍA ' + (i + 1) + (lb && !/^d[ií]a\s*\d+$/i.test(lb) ? ' · ' + lb : '') + (gr ? ' — ' + gr : ''), run: function(){ irADia(t.getAttribute('data-day')); } });
    });
    [].forEach.call(document.querySelectorAll('#jpbMesa [data-jpmwk]'), function(b){ out.push({ g: 'Semana', t: 'Ir a la semana ' + plano(b.textContent) + (b.title ? ' — ' + plano(b.title.replace(/\s*\(Alt\+\d\)\s*$/, '')) : ''), run: function(){ b.click(); } }); });
    var acciones = [
      ['Agregar bloque', function(){ var x = document.querySelector('#dayPanel [data-addsportsblock], #dayPanel [data-add], .tools [data-add]'); if(x) x.click(); }],
      ['Duplicar este día como variante B', duplicarVariante],
      ['Copiar este día…', clickId('btnCopiarDia')], ['Copiar la semana…', clickId('btnCopiarSemana')], ['Copiar el plan completo…', clickId('btnCopiarPlan')],
      ['Vista del alumno', function(){ if(window.JPM) window.JPM.vistaAlumno(); }], ['Herramientas (mostrar u ocultar)', function(){ if(window.JPM) window.JPM.herramientas(); }],
      ['Revisar todo el plan', revisar], ['Indicadores de la sesión', function(){ indicador(true); }], ['Atajos de teclado', function(){ if(window.JPM) window.JPM.ayuda(true); }],
      ['Guardar ahora', function(){ try{ window.save(); aviso('Guardado'); }catch(e){} }], ['Ir a Exportar', function(){ try{ window.go('exportar'); }catch(e){} }],
      ['Búsqueda global (vistas y acciones de toda la app)', function(){ try{ PASO_K = true; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); }catch(e){} PASO_K = false; }]
    ];
    acciones.forEach(function(a){ out.push({ g: 'Acción', t: a[0], run: a[1] }); });
    EXTRA.forEach(function(fn){ try{ out = out.concat(fn() || []); }catch(e){} });      /* comandos que suman otras capas (presets del coach) */
    try{
      var lista = (typeof window.jpAthAZ === 'function') ? window.jpAthAZ(S.athletes) : (S.athletes || []).slice();
      lista.forEach(function(a){ var n = plano((a.nombre || '') + ' ' + (a.apellido || '')) || 'Sin nombre'; out.push({ g: 'Alumno', t: n + (a.id === S.activeId ? ' (activo)' : ''), run: function(){ elegirAlumno(a.id); } }); });
    }catch(e){}
    return out;
  }
  function elegirAlumno(id){
    try{
      if(id === S.activeId) return;
      var nat = document.getElementById('sbAth');
      if(nat){ nat.value = id; nat.dispatchEvent(new Event('change', { bubbles: true })); }
      else if(typeof window.jpActivarAlumno === 'function'){ window.jpActivarAlumno(id); window.save(); window.renderBuilder(); }
      if(window.CoachBuilderPicker) window.CoachBuilderPicker.etiqueta();
    }catch(e){ console.warn('elegir alumno', e); }
  }
  function pintarPaleta(){
    var o = document.getElementById('jppCmd'); if(!o) return;
    var q = o.querySelector('input'), toks = nz(q.value).split(' ').filter(Boolean), todos = comandos();
    CMD.vis = toks.length ? todos.filter(function(c){ var s = nz(c.g + ' ' + c.t); return toks.every(function(t){ return s.indexOf(t) >= 0; }); }) : todos;
    CMD.vis = CMD.vis.slice(0, 14);
    if(CMD.sel >= CMD.vis.length) CMD.sel = Math.max(0, CMD.vis.length - 1);
    o.querySelector('.jpp-cmd-l').innerHTML = CMD.vis.length ? CMD.vis.map(function(c, i){ return '<button type="button" role="option" class="jpp-cmd-i' + (i === CMD.sel ? ' on' : '') + '" data-jppi="' + i + '" aria-selected="' + (i === CMD.sel) + '"><small>' + esc(c.g) + '</small><span>' + esc(c.t) + '</span></button>'; }).join('') : '<p class="jpp-cmd-v">Nada coincide.</p>';
  }
  function paleta(ab){
    var o = document.getElementById('jppCmd');
    if(!o){
      o = document.createElement('div'); o.id = 'jppCmd'; o.className = 'jpp-modal jpp-cmd'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Paleta de comandos'); o.hidden = true;
      o.innerHTML = '<div class="jpp-modal-c"><input type="search" autocomplete="off" spellcheck="false" placeholder="Buscá un día, una semana, un alumno o una acción…" aria-label="Buscar comando"><div class="jpp-cmd-l" role="listbox"></div><div class="jpp-cmd-pie">↑ ↓ para elegir · Enter para correr · Esc para cerrar</div></div>';
      document.body.appendChild(o);
      var q = o.querySelector('input');
      q.addEventListener('input', function(){ CMD.sel = 0; pintarPaleta(); });
      q.addEventListener('keydown', function(e){
        if(e.key === 'ArrowDown'){ e.preventDefault(); CMD.sel = Math.min(CMD.vis.length - 1, CMD.sel + 1); pintarPaleta(); }
        else if(e.key === 'ArrowUp'){ e.preventDefault(); CMD.sel = Math.max(0, CMD.sel - 1); pintarPaleta(); }
        else if(e.key === 'Enter'){ e.preventDefault(); correr(CMD.sel); }
        else if(e.key === 'Escape'){ e.preventDefault(); paleta(false); }
      });
    }
    ab = ab == null ? o.hidden : !!ab;
    o.hidden = !ab;
    if(ab){ var q2 = o.querySelector('input'); q2.value = ''; CMD.sel = 0; pintarPaleta(); try{ q2.focus(); }catch(e){} }
    return o;
  }
  function correr(i){ var c = CMD.vis[i]; if(!c) return false; paleta(false); try{ c.run(); }catch(e){ console.warn('comando', e); } return true; }
  /* en el Builder, Ctrl + K abre ESTA paleta (antes que la búsqueda global de la app, que sigue en todas las demás vistas y como comando acá) */
  var PASO_K = false;      /* el comando «Búsqueda global» deja pasar un Ctrl + K hacia la búsqueda de la app */
  window.addEventListener('keydown', function(e){
    if(!visibleBuilder() || PASO_K) return;
    if((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key || '').toLowerCase() === 'k'){
      var ms = document.getElementById('mSearch'); if(ms && ms.classList.contains('on')) return;      /* la búsqueda global ya está abierta: la maneja ella */
      e.preventDefault(); e.stopPropagation(); paleta();
    }
  }, true);
  document.addEventListener('keydown', function(e){
    if(!visibleBuilder()) return;
    if(e.key === 'Escape'){ var pop = document.getElementById('jppIndPop'); if(pop && !pop.hidden) indicador(false); var r = document.getElementById('jppRevision'); if(r && !r.hidden) cerrarRevision(); }
  });

  /* ---------- clicks ---------- */
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target : null; if(!t) return;
    var it = t.closest('#jppCmd [data-jppi]'); if(it){ correr(+it.getAttribute('data-jppi')); return; }
    if(t.id === 'jppCmd'){ paleta(false); return; }
    if(t.id === 'jppRevision'){ cerrarRevision(); return; }
    var m = t.closest('[data-jpp]');
    if(!m){ var pop = document.getElementById('jppIndPop'); if(pop && !pop.hidden && !t.closest('#jppIndPop, .jpp-ind')) indicador(false); return; }
    var k = m.getAttribute('data-jpp');
    if(k === 'ind') indicador();
    else if(k === 'ind-x') indicador(false);
    else if(k === 'ir'){ indicador(false); irABloque(m.getAttribute('data-b')); }
    else if(k === 'revisar'){ indicador(false); revisar(); }
    else if(k === 'rev-x') cerrarRevision();
    else if(k === 'rev-ok'){ cerrarRevision(); var bt = document.getElementById('btnPlanEstado'); if(bt){ PASAR = true; bt.click(); } }
    else if(k === 'rev-ir'){ cerrarRevision(); var di = m.getAttribute('data-dia'), bid = m.getAttribute('data-b'); irADia(di); if(bid) setTimeout(function(){ irABloque(bid); }, 250); }
    else if(k === 'variante'){ var pop2 = document.querySelector('#jpbMesa .jpm-pop'); if(pop2) pop2.hidden = true; duplicarVariante(); }
  });

  /* ---------- montaje: se suma a la barra de la Fase 2 ---------- */
  var obs = null, pend = 0;
  function aplicar(){
    pend = 0;
    if(obs) obs.disconnect();
    try{
      var pop = document.querySelector('#jpbMesa .jpm-pop');
      if(pop && !pop.querySelector('[data-jpp="variante"]')){ var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.setAttribute('data-jpp', 'variante'); b.textContent = 'Duplicar este día como variante B'; pop.appendChild(b); }
      pintarIndicador(); engancharVista();
    }catch(e){ console.warn('builder pro', e); }
    var v = V(); if(obs && v) obs.observe(v, { childList: true, subtree: true });
  }
  function programar(){ if(!pend) pend = setTimeout(aplicar, 120); }
  function montar(){ if(!V()) return; if(!obs && window.MutationObserver) obs = new MutationObserver(programar); aplicar(); }
  document.addEventListener('input', function(e){ if(e.target && e.target.closest && e.target.closest('#dayPanel')) programar(); }, true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  [700, 2200, 6000].forEach(function(ms){ setTimeout(programar, ms); });
  window.JPP = { aplicar: aplicar, revisarPlan: revisarPlan, revisarDia: revisarDia, datosIndicador: datosIndicador, indicador: indicador, duplicarVariante: duplicarVariante,
    revisar: revisar, paleta: paleta, comandos: comandos, correr: correr, llevarAlDia: llevarAlDia, refrescarVista: refrescarVista,
    sumarComandos: function(fn){ if(typeof fn === 'function') EXTRA.push(fn); } };
})();
