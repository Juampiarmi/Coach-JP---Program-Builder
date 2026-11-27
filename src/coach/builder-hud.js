/* ============================================================
   BUILDER HUD · capa propia del Builder (Fase 0 y Fase 1, 2026-11)
   ------------------------------------------------------------
   Lleva al Builder el lenguaje de la app del alumno («menos es más»): los paneles secundarios arrancan plegados con un resumen
   de una línea y cada bloque plegado muestra su resumen (tipo · series × reps · descanso · RIR / RPE) en lugar de todos sus controles.
   SOLO PRESENTACIÓN: nunca escribe en S, nunca llama a save() y no guarda nada en localStorage. Lo abierto se recuerda en memoria
   mientras dura la sesión de la página. Va al final del documento (después de todos los módulos) y su CSS en coach/estilos/builder-hud.css.
   API para los tests: window.JPB = { aplicar, resumenBloque, abrir, cerrar, paneles }.
   ============================================================ */
(function(){
  'use strict';
  if(window.JPB) return;

  var ABIERTOS = {};                       /* paneles que el coach abrió en esta sesión (en memoria) */
  function plano(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function corto(s, n){ s = plano(s); n = n || 70; return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:.]+$/, '') + '…' : s; }
  function valor(raiz, sel){ var e = raiz.querySelector(sel); return e ? plano(e.value != null ? e.value : e.textContent) : ''; }

  /* ---------- 1 · paneles secundarios plegados con resumen ---------- */
  var PANELES = [
    /* configuración de la sesión: el selector de alumno queda siempre a la vista; sede, modalidad y herramientas se pliegan */
    { k: 'cfg', sel: '#stepBar', head: ':scope > .sb-t', tit: 'Configuración de la sesión',
      keep: function(p){ var b = p.querySelector('#bPick'); return b ? [b.closest('#stepBar > *')] : []; },
      sum: function(p){
        var mod = p.querySelector('button.on, .on[data-mod], [aria-pressed="true"]'), sede = p.querySelector('#sbSede');
        var tx = sede && sede.selectedIndex >= 0 ? plano(sede.options[sede.selectedIndex].text) : '';
        return [tx, mod ? plano(mod.textContent) : ''].filter(Boolean).join(' · ');
      } },
    { k: 'ctx', sel: '#ctxCard', head: ':scope > .ctx-head', tit: 'Contexto y objetivos del atleta',
      sum: function(p){ var t = ''; [].some.call(p.querySelectorAll('textarea'), function(x){ if(plano(x.value)){ t = x.value; return true; } return false; }); return t ? corto(t, 80) : 'Sin contexto cargado'; } },
    { k: 'gs', sel: '#gsCard', head: ':scope > h3', tit: 'Generador de sesión con IA', sum: function(){ return 'Arma la sesión desde la ficha táctica'; } },
    { k: 'vol', sel: '#volCard > .vol-card', head: ':scope > .vol-head', tit: 'Volumen semanal' },
    { k: 'ld', sel: '#jpLecturaDia > .ld-card', head: ':scope > .ld-h', tit: 'Lectura del día' },
    { k: 'wu', sel: '#dayPanel > .prep-card.wu', head: ':scope > h3', tit: 'Warm-up del día',
      sum: function(p){ var n = p.querySelectorAll('li, .wu-item, .wu-phase').length; return n ? n + ' elementos' : 'Sin generar'; } },
    { k: 'obj', sel: '#dayPanel > .cf-obj-card', head: ':scope > .row:first-child', tit: 'Objetivo de la semana',
      sum: function(p){ var t = valor(p, '#cfObjSemana textarea'); return t ? corto(t, 80) : 'Sin objetivo cargado'; } },
    { k: 'ficha', sel: '#dayPanel > .card', filtro: function(p){ var h = p.querySelector(':scope > h3'); return !!h && /ficha del d/i.test(h.textContent); }, head: ':scope > h3', tit: 'Ficha del día',
      sum: function(p){ var ins = p.querySelectorAll('input[type="text"], input:not([type]), textarea'), nom = ins[0] ? plano(ins[0].value) : '', foco = ins[1] ? plano(ins[1].value) : ''; return corto((nom || 'Sin nombre') + (foco ? ' · ' + foco : ''), 80); } }
  ];
  function panelesDe(def){
    return [].filter.call(document.querySelectorAll(def.sel), function(p){ return !def.filtro || def.filtro(p); });
  }
  function marcarPanel(def, p){
    var head = p.querySelector(def.head); if(!head) return;
    if(!p.classList.contains('jpb-pleg')){ p.classList.add('jpb-pleg'); p.setAttribute('data-jpb', def.k); }
    if(!head.classList.contains('jpb-head')) head.classList.add('jpb-head');
    if(def.keep){ try{ def.keep(p).forEach(function(x){ if(x && !x.classList.contains('jpb-keep')) x.classList.add('jpb-keep'); }); }catch(eK){} }
    var tog = head.querySelector(':scope > .jpb-tog');
    if(!tog){
      tog = document.createElement('button'); tog.type = 'button'; tog.className = 'jpb-tog';
      tog.setAttribute('data-jpbk', def.k); tog.setAttribute('aria-label', 'Abrir o cerrar: ' + def.tit);
      tog.innerHTML = '<span class="jpb-sum"></span><i aria-hidden="true"></i>';
      head.appendChild(tog);
    }
    var ab = !!ABIERTOS[def.k];
    p.classList.toggle('jpb-cerrado', !ab);
    if(tog.getAttribute('aria-expanded') !== String(ab)) tog.setAttribute('aria-expanded', String(ab));
    var s = '';
    try{ s = def.sum ? def.sum(p) : ''; }catch(e){}
    var sp = tog.querySelector('.jpb-sum'); if(sp && sp.textContent !== s) sp.textContent = s;
  }
  function aplicarPaneles(){ PANELES.forEach(function(def){ panelesDe(def).forEach(function(p){ marcarPanel(def, p); }); }); }
  function alternar(k, ab){
    if(ab == null) ab = !ABIERTOS[k];
    if(ab) ABIERTOS[k] = 1; else delete ABIERTOS[k];
    PANELES.forEach(function(def){ if(def.k === k) panelesDe(def).forEach(function(p){ marcarPanel(def, p); }); });
  }

  /* ---------- 2 · resumen del bloque plegado (solo lectura del bloque) ---------- */
  function rpeDeRir(r){
    var m = /^(\d+)\s*(?:[-–]\s*(\d+))?\s*(\+)?$/.exec(String(r || '').replace(/^\s*RIR\s*/i, '').trim()); if(!m) return '';
    if(m[3]) return '≤' + Math.max(1, 10 - (+m[1]));
    var a = 10 - (+m[1]), b = m[2] != null ? 10 - (+m[2]) : a, lo = Math.max(1, Math.min(a, b)), hi = Math.min(10, Math.max(a, b));
    return lo === hi ? String(lo) : lo + '-' + hi;
  }
  function dosis(t){ try{ return typeof window.jpDosisCanon === 'function' ? window.jpDosisCanon(t) : {}; }catch(e){ return {}; } }
  function segs(n){ n = +n || 0; if(!n) return ''; return n >= 60 && n % 60 === 0 ? (n / 60) + ' min' : n + ' s'; }
  function resumenBloque(b){
    if(!b) return '';
    var est = [], rest = '', rir = '', rirs = [], nombres = 0, letras = 0;
    if(Array.isArray(b.items) && b.items.length){
      b.items.forEach(function(l){
        var t = plano(l); if(!t) return;
        var d = dosis(t);
        if(/^(?:rest|descanso|pausa)\b/i.test(t)){ if(d.rest) rest = d.restLabel ? d.restLabel.replace(/s$/, ' s') : segs(d.rest); return; }
        if(d.sets && d.reps){ est.push(d.sets + '×' + d.reps); if(d.rir) rirs.push(String(d.rir)); if(d.rest && !rest) rest = segs(d.rest); return; }
        if(/^[A-F]\d+[.)]\s/i.test(t)) letras++;
        if(/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3}/.test(t) && !/^(?:nota|notas|tempo|rir|rpe)\b/i.test(t)) nombres++;
      });
    } else if(Array.isArray(b.ex) && b.ex.length){
      b.ex.forEach(function(e){ if(!e) return; var s = e.sets || b.sets, r = e.reps || e.repsRange; if(s && r) est.push(s + '×' + r); else if(r) est.push(r + ' reps'); if(e.rir) rirs.push(String(e.rir)); });
      nombres = b.ex.length;
      if(b.restSeconds) rest = segs(b.restSeconds);
    }
    /* RIR del bloque: si las estaciones difieren se muestra el rango (triset con RIR 1, 1 y 0 → «RIR 0-1») */
    var nums = [], todosSimples = rirs.length > 0;
    rirs.forEach(function(x){ var m = /^\s*(?:RIR\s*)?(\d+)(?:\s*[-–]\s*(\d+))?\s*$/i.exec(x); if(!m){ todosSimples = false; return; } nums.push(+m[1]); if(m[2] != null) nums.push(+m[2]); });
    if(todosSimples && nums.length){ var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums); rir = lo === hi ? String(lo) : lo + '-' + hi; }
    else if(rirs.length) rir = rirs[0];
    var n = Math.max(letras, est.length > 1 ? est.length : 0);
    var tipo = letras >= 2 ? (letras === 2 ? 'Biset' : letras === 3 ? 'Triset' : 'Circuito · ' + letras) : (b.tipo === 'superset' && n >= 2 ? (n === 2 ? 'Biset' : 'Triset') : (nombres > 1 ? nombres + ' ejercicios' : (nombres === 1 ? 'Serie recta' : '')));
    var partes = [];
    if(tipo) partes.push(tipo);
    if(est.length) partes.push(est.join(' / '));
    if(rest) partes.push(rest);
    if(rir){ var rp = rpeDeRir(rir); partes.push('RIR ' + rir.replace(/^\s*RIR\s*/i, '') + (rp ? ' (RPE ' + rp + ')' : '')); }
    return partes.join(' · ');
  }
  function bloqueDe(el){
    var inp = el.querySelector('.block-h [data-b]'), id = inp ? inp.getAttribute('data-b') : '';
    if(!id) return null;
    try{ return typeof window.findBlock === 'function' ? window.findBlock(id) : null; }catch(e){ return null; }
  }
  function aplicarBloques(){
    [].forEach.call(document.querySelectorAll('#dayPanel .block'), function(el){
      var h = el.querySelector(':scope > .block-h'); if(!h) return;
      var txt = resumenBloque(bloqueDe(el));
      var sp = h.querySelector(':scope > .jpb-bres');
      if(!txt){ if(sp) sp.parentNode.removeChild(sp); return; }
      if(!sp){ sp = document.createElement('span'); sp.className = 'jpb-bres'; h.appendChild(sp); }
      if(sp.textContent !== txt) sp.textContent = txt;
      if(!el.classList.contains('jpb-blk')) el.classList.add('jpb-blk');
    });
  }

  /* ---------- 3 · montaje: se reaplica cuando el Builder se redibuja ---------- */
  var obs = null, pend = 0;
  function aplicar(){
    pend = 0;
    if(obs) obs.disconnect();
    try{ aplicarPaneles(); aplicarBloques(); }catch(e){ console.warn('builder HUD', e); }
    var v = document.getElementById('v-builder');
    if(obs && v) obs.observe(v, { childList: true, subtree: true });
  }
  function programar(){ if(!pend) pend = setTimeout(aplicar, 60); }
  document.addEventListener('click', function(ev){
    var t = ev.target && ev.target.closest ? ev.target : null; if(!t) return;
    var tog = t.closest('.jpb-tog');
    if(tog){ ev.preventDefault(); ev.stopPropagation(); alternar(tog.getAttribute('data-jpbk')); return; }
    /* tocar el encabezado de un panel plegado (fuera de sus botones y campos) también lo abre */
    var head = t.closest('.jpb-pleg.jpb-cerrado > .jpb-head');
    if(head && !t.closest('button, input, select, textarea, a, label, [contenteditable]')){ var p = head.parentNode; alternar(p.getAttribute('data-jpb'), true); }
  }, true);
  /* al escribir en un bloque, su resumen se actualiza (el modelo lo actualiza el Builder; acá solo se vuelve a leer) */
  document.addEventListener('input', function(ev){ if(ev.target && ev.target.closest && ev.target.closest('#dayPanel')) programar(); }, true);
  function montar(){
    var v = document.getElementById('v-builder'); if(!v) return;
    if(!obs && window.MutationObserver) obs = new MutationObserver(programar);
    aplicar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  window.JPB = { aplicar: aplicar, resumenBloque: resumenBloque, abrir: function(k){ alternar(k, true); }, cerrar: function(k){ alternar(k, false); }, paneles: PANELES.map(function(d){ return d.k; }) };
})();
