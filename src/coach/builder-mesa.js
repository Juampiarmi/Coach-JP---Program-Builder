/* ============================================================
   BUILDER · MESA DE TRABAJO (Fase 2 · productividad, 2026-11)
   ------------------------------------------------------------
   Capa sobre lo que ya existe (no reescribe ningún módulo):
     1 · barra fija arriba: alumno · semanas S1–S4 (con su RPE) · días · duración · ✓ guardado · vista del alumno · Copiar… · Herramientas · ?
     2 · un solo control para cada cosa: el selector de alumno vive en la barra, las semanas y los días se eligen ahí, y «Copiar…» junta
         copiar día / semana / plan (los botones de siempre quedan en el DOM y se usan por debajo); plantillas, IA, configuración y la
         barra del mesociclo pasan a «Herramientas» (plegado)
     3 · chips de dosis bajo el texto de cada bloque: series, RIR (con su RPE) y descanso con − / +. Escriben el MISMO texto de siempre en
         el cuadro del bloque y disparan su evento input: guarda el handler del Builder, igual que si el coach lo tipeara
     4 · biset / triset en un toque: «Unir con el bloque siguiente» (renumera A1 / A2 / A3) y «Separar estaciones», con deshacer (CoachUndo)
     5 · tips: paleta de rótulos (NOTA DEL DÍA, APROXIMACIÓN, POR QUÉ ESTA CANTIDAD DE SERIES, SET-UP, CLAVE, CUIDADO, TRANSICIÓN) y la
         vista plegada tal como la verá el alumno, con aviso en los renglones sin rótulo
     6 · atajos a la vista: «?» abre la hoja de atajos; Alt+↑ / Alt+↓ mueven el bloque con el foco; Alt+1…4 cambian de semana
   No toca el modelo ni las claves de guardado: lo que cambia un plan pasa por los mismos campos y funciones del Builder
   (cuadro data-bf, setBlockField, save, renderBuilder). API para los tests: window.JPM.
   ============================================================ */
(function(){
  'use strict';
  if(window.JPM) return;

  var UI = { herr: false, ayuda: false };
  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function plano(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function V(){ return document.getElementById('v-builder'); }
  function visibleBuilder(){ var v = V(); return !!v && v.style.display !== 'none' && !!v.offsetParent; }
  function aviso(t, k){ try{ if(typeof window.toast === 'function') window.toast(t, k); }catch(e){} }
  function dosis(t){ try{ return typeof window.jpDosisCanon === 'function' ? window.jpDosisCanon(t) : {}; }catch(e){ return {}; } }
  function rpeDeRir(r){
    var m = /^(\d+)\s*(?:[-–]\s*(\d+))?\s*(\+)?$/.exec(String(r || '').replace(/^\s*RIR\s*/i, '').trim()); if(!m) return '';
    if(m[3]) return '≤' + Math.max(1, 10 - (+m[1]));
    var a = 10 - (+m[1]), b = m[2] != null ? 10 - (+m[2]) : a, lo = Math.max(1, Math.min(a, b)), hi = Math.min(10, Math.max(a, b));
    return lo === hi ? String(lo) : lo + '-' + hi;
  }

  /* ---------- guardado a la vista (solo observa: el guardado sigue siendo el de siempre) ---------- */
  var EST = { pend: false, t: 0 };
  function hora(t){ var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function pintarGuardado(){
    var g = document.querySelector('#jpbMesa .jpm-guard'); if(!g) return;
    var tx = EST.pend ? 'Guardando…' : (EST.t ? hora(EST.t) : 'Guardado'), ti = EST.pend ? 'Guardando los cambios…' : (EST.t ? 'Guardado a las ' + hora(EST.t) : 'Todo guardado');
    if(g.textContent !== tx){ g.textContent = tx; }
    if(g.title !== ti) g.title = ti;
    g.classList.toggle('pend', EST.pend);
  }
  function envolverGuardado(){
    if(typeof window.save === 'function' && !window.save.__jpm){
      var s0 = window.save, ws = function(){ var r = s0.apply(this, arguments); try{ EST.pend = true; pintarGuardado(); }catch(e){} return r; };
      ws.__jpm = 1; window.save = ws;
    }
    if(typeof window.pintarBadgeAlmacen === 'function' && !window.pintarBadgeAlmacen.__jpm){
      var p0 = window.pintarBadgeAlmacen, wp = function(){ var r = p0.apply(this, arguments); try{ if(EST.pend){ EST.pend = false; EST.t = Date.now(); pintarGuardado(); } }catch(e){} return r; };
      wp.__jpm = 1; window.pintarBadgeAlmacen = wp;
    }
  }

  /* ---------- 1 · la barra ---------- */
  function botonesSemana(){
    var b = [].slice.call(document.querySelectorAll('#jpWkBar [data-wkjump]'));
    return b.length ? b : [].slice.call(document.querySelectorAll('#v-builder [data-cfwk]'));
  }
  function pestanasDia(){ return [].slice.call(document.querySelectorAll('#dayTabs .tab[data-day]')); }
  function pintarSemanas(bar){
    var src = botonesSemana(), box = bar.querySelector('.jpm-sem');
    var h = src.map(function(b, i){
      var on = b.classList.contains('on') || b.classList.contains('cf-wk-activa') || b.getAttribute('aria-current') === 'true';
      return '<button type="button" class="jpm-s' + (on ? ' on' : '') + '" data-jpmwk="' + i + '" title="' + esc(b.title || '') + ' (Alt+' + (i + 1) + ')" aria-pressed="' + on + '">' + esc(plano(b.textContent).replace(/^✓\s*/, '')) + '</button>';
    }).join('');
    var rir = document.querySelector('#jpWkBar .wk-rir');
    if(rir){ var rt = plano(rir.textContent).replace(/^S\d+\s*/, ''), rc = /RPE\s*[\d.,]+(?:\s*[-–]\s*[\d.,]+)?/i.exec(rt); h += '<span class="jpm-rpe" title="Esfuerzo de la semana activa: ' + esc(rt) + '">' + esc(rc ? rc[0] : rt) + '</span>'; }
    if(box.__h !== h){ box.__h = h; box.innerHTML = h; }
  }
  function pintarDias(bar){
    var tabs = pestanasDia(), box = bar.querySelector('.jpm-dia'), act = null, h;
    h = tabs.map(function(t, i){
      var on = t.classList.contains('on'); if(on) act = t;
      var lb = plano((t.querySelector('.tab-label') || {}).textContent || '');
      return '<button type="button" class="jpm-d' + (on ? ' on' : '') + '" data-jpmdia="' + esc(t.getAttribute('data-day')) + '" title="' + esc('DÍA ' + (i + 1) + (lb ? ' · ' + lb : '')) + '" aria-pressed="' + on + '">D' + (i + 1) + '</button>';
    }).join('');
    if(act){ var lb2 = plano((act.querySelector('.tab-label') || {}).textContent || ''), gr = plano((act.querySelector('.tab-grp') || {}).textContent || '');
      if(/^d[ií]a\s*\d+$/i.test(lb2)) lb2 = '';      /* «Día 1» ya lo dice D1 */
      if(lb2 || gr) h += '<span class="jpm-dl" title="' + esc([lb2, gr].filter(Boolean).join(' · ')) + '">' + esc(lb2) + (gr ? (lb2 ? ' ' : '') + '<i>' + esc(gr) + '</i>' : '') + '</span>'; }
    if(box.__h !== h){ box.__h = h; box.innerHTML = h; }
  }
  function pintarDuracion(bar){
    var d = document.querySelector('#durChip b'), el = bar.querySelector('.jpm-dur'), tx = d ? plano(d.textContent) : '';
    if(el.textContent !== tx) el.textContent = tx;
    el.hidden = !tx;
    if(d) el.title = 'Duración estimada de la sesión';
  }
  function montarBarra(){
    var v = V(); if(!v) return null;
    var bar = document.getElementById('jpbMesa');
    if(!bar){
      bar = document.createElement('div'); bar.id = 'jpbMesa'; bar.className = 'jpb-mesa'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Mesa de trabajo');
      bar.innerHTML = '<div class="jpm-alumno"></div><div class="jpm-sem" role="group" aria-label="Semana"></div><div class="jpm-dia" role="group" aria-label="Día"></div>' +
        '<span class="jpm-sp"></span><span class="jpm-dur" hidden></span><span class="jpm-guard" aria-live="polite">Guardado</span>' +
        '<button type="button" class="jpm-b" data-jpm="vista" title="Vista dividida con la app del alumno en vivo (o vista rápida en pantallas chicas)">Vista alumno</button>' +
        '<div class="jpm-menu"><button type="button" class="jpm-b" data-jpm="copiar" aria-haspopup="menu" aria-expanded="false">Copiar</button>' +
          '<div class="jpm-pop" role="menu" hidden><button type="button" role="menuitem" data-jpm="c-dia">Copiar este día…</button><button type="button" role="menuitem" data-jpm="c-sem">Copiar la semana…</button><button type="button" role="menuitem" data-jpm="c-plan">Copiar el plan completo…</button></div></div>' +
        '<button type="button" class="jpm-b" data-jpm="herr" aria-expanded="false" title="Configuración, plantillas, IA, mesociclo, backup, auditoría y exportar">Herramientas</button>' +
        '<button type="button" class="jpm-b jpm-ayuda" data-jpm="ayuda" title="Atajos de teclado (?)" aria-label="Atajos de teclado">?</button>';
      v.insertBefore(bar, v.firstChild);
    }
    /* el selector de alumno (CoachBuilderPicker) se muda a la barra: mismo elemento, mismos eventos */
    var pick = document.getElementById('bPick'), slot = bar.querySelector('.jpm-alumno');
    if(pick && pick.parentNode !== slot){ var f = pick.closest('#stepBar > *'); slot.appendChild(pick); if(f) f.classList.add('jpb-vacio'); }
    pintarSemanas(bar); pintarDias(bar); pintarDuracion(bar); pintarGuardado();
    v.classList.toggle('jpm-herr-off', !UI.herr);
    var bh = bar.querySelector('[data-jpm="herr"]'); if(bh.getAttribute('aria-expanded') !== String(UI.herr)) bh.setAttribute('aria-expanded', String(UI.herr));
    var cs = document.getElementById('btnCopiarSemana'), it = bar.querySelector('[data-jpm="c-sem"]');
    if(it) it.disabled = !cs;
    return bar;
  }
  function herramientas(ab){ UI.herr = ab == null ? !UI.herr : !!ab; montarBarra(); }
  function menuCopiar(ab){
    var b = document.querySelector('#jpbMesa [data-jpm="copiar"]'), p = document.querySelector('#jpbMesa .jpm-pop'); if(!b || !p) return;
    ab = ab == null ? p.hidden : !!ab; p.hidden = !ab; b.setAttribute('aria-expanded', String(ab));
  }
  function clickId(id){ var e = document.getElementById(id); if(e){ e.click(); return true; } return false; }
  function vistaAlumno(){
    if(window.innerWidth >= 1200 && clickId('btnSplitView')) return 'dividida';
    if(clickId('btnQuickPreview')) return 'rapida';
    aviso('La vista del alumno no está disponible', 'warn'); return '';
  }

  /* ---------- 3 · chips de dosis ---------- */
  var RX_RESTO = /^(?:rest|descanso|pausa)\b/i, RX_META = /^(?:tempo|rir|rpe|nota|notas|obs)\b/i, RX_PREF = /^(?:[A-F]?\d+[.)]\s+)/i;
  function analizar(lineas){
    var filas = [], resto = -1, nombre = '';
    lineas.forEach(function(l, i){
      var t = plano(l); if(!t) return;
      if(RX_RESTO.test(t)){ if(resto < 0) resto = i; return; }
      var d = dosis(t);
      if(d.sets && d.reps){ filas.push({ i: i, nombre: nombre, sets: d.sets, reps: d.reps, rir: d.rir ? String(d.rir).replace(/^\s*RIR\s*/i, '') : '', setsOk: /^\s*\d+\s*[x×]/i.test(t) }); return; }
      if(!RX_META.test(t) && /[A-Za-zÁÉÍÓÚáéíóúñÑ]{3}/.test(t)) nombre = t;
    });
    return { filas: filas, resto: resto };
  }
  function lim(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function cambiarSets(l, d){ return l.replace(/^(\s*)(\d+)(\s*[x×])/i, function(m, a, n, c){ return a + lim(+n + d, 1, 12) + c; }); }
  function cambiarRir(l, d){
    var m = /\bRIR\s*(\d+)(?:\s*([-–])\s*(\d+))?/i.exec(l);
    if(!m) return l.replace(/\s+$/, '') + ' | RIR 2';
    var a = lim(+m[1] + d, 0, 5), nuevo = 'RIR ' + a + (m[3] != null ? m[2] + lim(+m[3] + d, 0, 5) : '');
    return l.slice(0, m.index) + nuevo + l.slice(m.index + m[0].length);
  }
  function cambiarDescanso(l, d){
    var m = /^(\s*(?:rest|descanso|pausa)\s*:?\s*)(\d+)(?:\s*([-–])\s*(\d+))?\s*(s\b|seg\w*|min\w*|')?(.*)$/i.exec(l); if(!m) return l;
    var k = /^(?:min|')/i.test(m[5] || '') ? 60 : 1, a = lim(+m[2] * k + d, 0, 900), b = m[4] != null ? lim(+m[4] * k + d, 0, 900) : null;
    return m[1] + a + (b != null ? m[3] + b : '') + 's' + m[6];
  }
  function escribir(ta, lineas){ ta.value = lineas.join('\n'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  function nombreCorto(n){ var t = plano(n), m = /^([A-F]?\d+)[.)]\s+(.*)$/i.exec(t); return m ? m[1].toUpperCase() + ' · ' + m[2] : t; }
  function chipsHtml(ta){
    var ls = String(ta.value).split('\n'), an = analizar(ls), h = '';
    an.filas.forEach(function(f){
      var rp = rpeDeRir(f.rir);
      h += '<div class="jpm-fila" data-l="' + f.i + '"><span class="jpm-ej" title="' + esc(f.nombre) + '">' + esc(nombreCorto(f.nombre) || 'Ejercicio') + '</span>' +
        (f.setsOk ? '<span class="jpm-ch"><button type="button" data-jpmd="s-" aria-label="Una serie menos">−</button><b>' + esc(f.sets) + '</b><small>series</small><button type="button" data-jpmd="s+" aria-label="Una serie más">+</button></span>'
                  : '<span class="jpm-ch jpm-ro"><b>' + esc(f.sets) + '</b><small>series</small></span>') +
        '<span class="jpm-x">× ' + esc(f.reps) + '</span>' +
        '<span class="jpm-ch jpm-rir"><button type="button" data-jpmd="r-" aria-label="Un RIR menos (más duro)">−</button><b>' + (f.rir ? 'RIR ' + esc(f.rir) : 'RIR —') + '</b>' + (rp ? '<small>RPE ' + esc(rp) + '</small>' : '') + '<button type="button" data-jpmd="r+" aria-label="Un RIR más (más liviano)">+</button></span></div>';
    });
    if(an.resto >= 0){
      var d = dosis(plano(ls[an.resto])), s = d.restLabel || (d.rest ? d.rest + 's' : '');
      h += '<div class="jpm-fila" data-l="' + an.resto + '"><span class="jpm-ej">Descanso</span><span class="jpm-ch"><button type="button" data-jpmd="d-" aria-label="15 segundos menos">−</button><b>' + esc(s ? s.replace(/s$/, ' s') : '—') + '</b><button type="button" data-jpmd="d+" aria-label="15 segundos más">+</button></span></div>';
    }
    return h;
  }
  function accionesHtml(blEl, b){
    var est = estaciones(b.items || []).est.length, sig = siguiente(b), puede = !!(sig && Array.isArray(sig.items) && sig.tipo === 'list');
    return '<div class="jpm-acc">' +
      (puede ? '<button type="button" class="jpm-b" data-jpmd="unir" title="Junta este bloque y el siguiente en un biset / triset (A1, A2, A3) — se puede deshacer">Unir con el bloque siguiente</button>' : '') +
      (est >= 2 ? '<button type="button" class="jpm-b" data-jpmd="separar" title="Separa cada estación en su propio bloque — se puede deshacer">Separar estaciones</button>' : '') + '</div>';
  }

  /* ---------- 4 · biset / triset ---------- */
  function estaciones(items){
    var est = [], resto = [], cur = null;
    (items || []).forEach(function(l){
      var t = plano(l); if(!t) return;
      if(RX_RESTO.test(t)){ resto.push(t); return; }
      var d = dosis(t);
      if(!(d.sets && d.reps) && !RX_META.test(t) && /[A-Za-zÁÉÍÓÚáéíóúñÑ]{3}/.test(t)){ cur = { nombre: t.replace(RX_PREF, ''), lineas: [] }; est.push(cur); return; }
      if(cur) cur.lineas.push(t); else resto.push(t);
    });
    return { est: est, resto: resto };
  }
  function dia(){ try{ return typeof window.curDay === 'function' ? window.curDay() : null; }catch(e){ return null; } }
  function siguiente(b){ var d = dia(); if(!d || !b) return null; var i = d.bloques.indexOf(b); return i >= 0 ? d.bloques[i + 1] || null : null; }
  function letraDe(items, i){ var m = null; (items || []).some(function(l){ m = /^\s*([A-F])\d+[.)]/i.exec(l); return !!m; }); return m ? m[1].toUpperCase() : String.fromCharCode(65 + Math.min(5, Math.max(0, i))); }
  function ponerItems(b, items){
    var prev = Array.isArray(b.items) ? b.items.slice() : [];
    if(typeof window.setBlockField === 'function') window.setBlockField(b, 'items', items.join('\n')); else b.items = items.slice();
    try{ if(typeof window.jpSyncTituloPizarra === 'function') window.jpSyncTituloPizarra(b, prev); }catch(e){}
  }
  function guardarYDibujar(){ try{ window.save(); }catch(e){} try{ window.renderBuilder(); }catch(e){} }
  function unir(id){
    var d = dia(), b = d && window.findBlock(id); if(!b) return false;
    var i = d.bloques.indexOf(b), s = d.bloques[i + 1];
    if(!s || !Array.isArray(s.items) || s.tipo !== 'list'){ aviso('El bloque siguiente no se escribe como texto: no se puede unir', 'warn'); return false; }
    var ea = estaciones(b.items), eb = estaciones(s.items), todas = ea.est.concat(eb.est);
    if(todas.length < 2 || todas.length > 4){ aviso('Un biset / triset junta de 2 a 4 ejercicios (quedarían ' + todas.length + ')', 'warn'); return false; }
    if(window.CoachUndo && typeof window.CoachUndo.vigilar === 'function') window.CoachUndo.vigilar('Unir bloques en ' + (todas.length === 2 ? 'biset' : todas.length === 3 ? 'triset' : 'circuito'));
    var L = letraDe(b.items, i), items = [];
    todas.forEach(function(e, k){ items.push(L + (k + 1) + '. ' + e.nombre); e.lineas.forEach(function(x){ items.push(x); }); });
    items = items.concat(ea.resto.length ? ea.resto : eb.resto);
    ponerItems(b, items);
    if(plano(s.tips)) b.tips = (plano(b.tips) ? String(b.tips).replace(/\s+$/, '') + '\n' : '') + String(s.tips).trim();
    d.bloques.splice(i + 1, 1);
    guardarYDibujar();
    aviso('Bloques unidos: ' + (todas.length === 2 ? 'biset' : todas.length === 3 ? 'triset' : 'circuito') + ' ' + L + '1–' + L + todas.length);
    return true;
  }
  function separar(id){
    var d = dia(), b = d && window.findBlock(id); if(!b) return false;
    var i = d.bloques.indexOf(b), ea = estaciones(b.items);
    if(ea.est.length < 2) return false;
    if(window.CoachUndo && typeof window.CoachUndo.vigilar === 'function') window.CoachUndo.vigilar('Separar ' + (b.titulo || 'bloque'));
    var nuevos = [];
    ea.est.forEach(function(e, k){
      var items = [e.nombre].concat(e.lineas).concat(ea.resto);
      if(k === 0){ ponerItems(b, items); return; }
      var nb = window.newBlock('list'); nb.sportsPizarra = !!b.sportsPizarra; nb.category = b.category; nb.titulo = e.nombre; nb.items = items;
      if(b.modalidad) nb.modalidad = b.modalidad;
      nuevos.push(nb);
    });
    Array.prototype.splice.apply(d.bloques, [i + 1, 0].concat(nuevos));
    guardarYDibujar();
    aviso('Estaciones separadas en ' + ea.est.length + ' bloques');
    return true;
  }

  /* ---------- 5 · tips: paleta de rótulos y vista del alumno ---------- */
  var ROTULOS = ['NOTA DEL DÍA', 'SERIES DE APROXIMACIÓN', 'POR QUÉ ESTA CANTIDAD DE SERIES', 'SET-UP', 'CLAVE', 'CUIDADO', 'TRANSICIÓN'];
  var RX_ROT = /^([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 &\/\-–·().,]{1,70}?):\s*(.*)$/;
  function tipsPrevHtml(v){
    var ls = String(v || '').split('\n').map(plano).filter(Boolean); if(!ls.length) return '';
    var sinR = 0;
    var h = ls.map(function(l){
      var m = RX_ROT.exec(l), lb = m ? m[1] : 'Nota', tx = m ? m[2] : l; if(!m) sinR++;
      return '<details class="jpm-tip' + (m ? '' : ' sin') + '"><summary><b>' + esc(lb) + '</b>' + (m ? '' : '<em>sin rótulo</em>') + '</summary><div>' + esc(tx) + '</div></details>';
    }).join('');
    return '<div class="jpm-tprev-t">Así lo ve el alumno<span>' + ls.length + (ls.length === 1 ? ' tip' : ' tips') + (sinR ? ' · ' + sinR + ' sin rótulo' : '') + '</span></div>' + h;
  }
  function insertarRotulo(ta, lb){
    var v = ta.value, pos = (document.activeElement === ta && typeof ta.selectionEnd === 'number') ? ta.selectionEnd : v.length;
    var antes = v.slice(0, pos), despues = v.slice(pos), ins = (antes && !/\n$/.test(antes) ? '\n' : '') + lb + ': ';
    ta.value = antes + ins + despues;
    var c = (antes + ins).length;
    try{ ta.focus(); ta.setSelectionRange(c, c); }catch(e){}
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ---------- montaje por bloque ---------- */
  function aplicarBloques(){
    [].forEach.call(document.querySelectorAll('#dayPanel .block'), function(el){
      var ta = el.querySelector('textarea[data-bf="items"]'), id = ta && ta.getAttribute('data-b'), b = null;
      try{ b = id ? window.findBlock(id) : null; }catch(e){}
      if(ta && b && b.tipo === 'list'){
        var box = ta.parentNode.querySelector(':scope > .jpm-dosis[data-b="' + id + '"]');
        if(!box){ box = document.createElement('div'); box.className = 'jpm-dosis'; box.setAttribute('data-b', id); ta.parentNode.insertBefore(box, ta.nextSibling); }
        var h = chipsHtml(ta) + accionesHtml(el, b);
        if(box.__h !== h){ box.__h = h; box.innerHTML = h; }
        box.hidden = !h.replace(/<div class="jpm-acc"><\/div>/, '');
      }
      var tt = el.querySelector('textarea[data-bf="tips"]');
      if(tt){
        var pal = tt.parentNode.querySelector(':scope > .jpm-rot');
        if(!pal){
          pal = document.createElement('div'); pal.className = 'jpm-rot'; pal.setAttribute('role', 'group'); pal.setAttribute('aria-label', 'Insertar rótulo de tip');
          pal.innerHTML = ROTULOS.map(function(r){ return '<button type="button" data-jpmrot="' + esc(r) + '">' + esc(r) + '</button>'; }).join('');
          tt.parentNode.insertBefore(pal, tt);
        }
        var pv = tt.parentNode.querySelector(':scope > .jpm-tprev');
        if(!pv){ pv = document.createElement('div'); pv.className = 'jpm-tprev'; tt.parentNode.insertBefore(pv, tt.nextSibling); }
        var hp = tipsPrevHtml(tt.value);
        if(pv.__h !== hp){ pv.__h = hp; pv.innerHTML = hp; }
        pv.hidden = !hp;
      }
    });
  }

  /* ---------- 6 · atajos ---------- */
  var ATAJOS = [
    ['?', 'Abre o cierra esta hoja de atajos'], ['Ctrl + K', 'Paleta de comandos del Builder: saltar a un día, una semana, un alumno o correr una acción (en las demás vistas sigue siendo la búsqueda global)'], ['Ctrl + S', 'Guarda en el acto'], ['Ctrl + D', 'Duplica el bloque donde está el foco'],
    ['Alt + ↑ / Alt + ↓', 'Sube o baja el bloque donde está el foco'], ['Alt + 1 … 4', 'Cambia a la semana S1 … S4'],
    ['/', 'En el texto de un bloque: plantillas (biset, triset, pirámide, multi-serie, myo-reps)'], ['Ctrl + Enter', 'En el importador rápido: importa directo'], ['Esc', 'Cierra menús y ventanas']
  ];
  function ayuda(ab){
    var o = document.getElementById('jpbAtajos');
    if(!o){
      o = document.createElement('div'); o.id = 'jpbAtajos'; o.className = 'jpm-atajos'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Atajos de teclado'); o.hidden = true;
      o.innerHTML = '<div class="jpm-at-c"><div class="jpm-at-h"><b>Atajos de teclado</b><button type="button" data-jpm="ayuda-x" aria-label="Cerrar">×</button></div><dl>' +
        ATAJOS.map(function(a){ return '<dt><kbd>' + esc(a[0]) + '</kbd></dt><dd>' + esc(a[1]) + '</dd>'; }).join('') + '</dl></div>';
      document.body.appendChild(o);
    }
    UI.ayuda = ab == null ? o.hidden : !!ab; o.hidden = !UI.ayuda;
  }
  function escribiendo(t){ return !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')); }
  function moverBloque(blEl, dir){
    var btn = blEl.querySelector('.block-h [data-bmove="' + dir + '"]'), inp = blEl.querySelector('.block-h [data-b]'), id = inp && inp.getAttribute('data-b');
    if(!btn) return false;
    btn.click();
    setTimeout(function(){ var nuevo = id && document.querySelector('#dayPanel .block-h [data-bf="titulo"][data-b="' + id + '"]'); if(nuevo){ try{ nuevo.focus(); }catch(e){} } }, 60);
    return true;
  }
  document.addEventListener('keydown', function(e){
    if(!visibleBuilder()) return;
    if(e.key === 'Escape'){ if(UI.ayuda) ayuda(false); menuCopiar(false); return; }
    if(e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !escribiendo(e.target)){ e.preventDefault(); ayuda(); return; }
    if(e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){
      var bl = e.target && e.target.closest ? e.target.closest('#dayPanel .block') : null;
      if(bl){ e.preventDefault(); moverBloque(bl, e.key === 'ArrowUp' ? 'up' : 'down'); }
      return;
    }
    if(e.altKey && !e.ctrlKey && !e.metaKey && /^[1-4]$/.test(e.key) && !document.querySelector('#v-builder [data-cfwk]')){
      var s = document.querySelector('#jpbMesa [data-jpmwk="' + (+e.key - 1) + '"]'); if(s){ e.preventDefault(); s.click(); }
    }
  });

  /* ---------- clicks ---------- */
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target : null; if(!t) return;
    var m = t.closest('#jpbMesa [data-jpm], #jpbAtajos [data-jpm]');
    if(!m){
      var pop = document.querySelector('#jpbMesa .jpm-pop'); if(pop && !pop.hidden && !t.closest('#jpbMesa .jpm-menu')) menuCopiar(false);
      if(UI.ayuda && t.id === 'jpbAtajos') ayuda(false);
    } else {
      var k = m.getAttribute('data-jpm');
      if(k === 'herr') herramientas();
      else if(k === 'copiar') menuCopiar();
      else if(k === 'c-dia'){ menuCopiar(false); clickId('btnCopiarDia'); }
      else if(k === 'c-sem'){ menuCopiar(false); clickId('btnCopiarSemana'); }
      else if(k === 'c-plan'){ menuCopiar(false); clickId('btnCopiarPlan'); }
      else if(k === 'vista') vistaAlumno();
      else if(k === 'ayuda') ayuda();
      else if(k === 'ayuda-x') ayuda(false);
      return;
    }
    var wk = t.closest('#jpbMesa [data-jpmwk]');
    if(wk){ var src = botonesSemana()[+wk.getAttribute('data-jpmwk')]; if(src) src.click(); return; }
    var dd = t.closest('#jpbMesa [data-jpmdia]');
    if(dd){ var tab = document.querySelector('#dayTabs .tab[data-day="' + dd.getAttribute('data-jpmdia') + '"]'); if(tab) tab.click(); return; }
    var ch = t.closest('.jpm-dosis [data-jpmd]');
    if(ch){
      var box = ch.closest('.jpm-dosis'), id = box.getAttribute('data-b'), a = ch.getAttribute('data-jpmd');
      if(a === 'unir'){ unir(id); return; }
      if(a === 'separar'){ separar(id); return; }
      var ta = box.parentNode.querySelector('textarea[data-bf="items"][data-b="' + id + '"]'), fila = ch.closest('[data-l]'); if(!ta || !fila) return;
      var ls = String(ta.value).split('\n'), i = +fila.getAttribute('data-l'), l = ls[i]; if(l == null) return;
      ls[i] = a === 's+' ? cambiarSets(l, 1) : a === 's-' ? cambiarSets(l, -1) : a === 'r+' ? cambiarRir(l, 1) : a === 'r-' ? cambiarRir(l, -1) : a === 'd+' ? cambiarDescanso(l, 15) : a === 'd-' ? cambiarDescanso(l, -15) : l;
      if(ls[i] !== l){ escribir(ta, ls); programar(); }
      return;
    }
    var rot = t.closest('.jpm-rot [data-jpmrot]');
    if(rot){ var tt = rot.parentNode.parentNode.querySelector('textarea[data-bf="tips"]'); if(tt){ insertarRotulo(tt, rot.getAttribute('data-jpmrot')); programar(); } }
  });
  document.addEventListener('input', function(e){ if(e.target && e.target.closest && e.target.closest('#dayPanel')) programar(); }, true);

  /* ---------- montaje ---------- */
  var obs = null, pend = 0;
  function aplicar(){
    pend = 0;
    if(obs) obs.disconnect();
    try{ envolverGuardado(); montarBarra(); aplicarBloques(); }catch(e){ console.warn('mesa de trabajo', e); }
    var v = V();
    if(obs && v) obs.observe(v, { childList: true, subtree: true });
  }
  function programar(){ if(!pend) pend = setTimeout(aplicar, 60); }
  function montar(){
    if(!V()) return;
    if(!obs && window.MutationObserver) obs = new MutationObserver(programar);
    aplicar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  [600, 2000, 5500].forEach(function(ms){ setTimeout(programar, ms); });      /* el selector de alumno se monta con retraso */
  window.JPM = { aplicar: aplicar, unir: unir, separar: separar, estaciones: estaciones, herramientas: herramientas, ayuda: ayuda, vistaAlumno: vistaAlumno,
    cambiarSets: cambiarSets, cambiarRir: cambiarRir, cambiarDescanso: cambiarDescanso, estado: function(){ return { herr: UI.herr, ayuda: UI.ayuda, guardado: EST }; } };
})();
