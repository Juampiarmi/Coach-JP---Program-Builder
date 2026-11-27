/* ============================================================
   BUILDER · PRESETS DEL COACH (Fase 3, 2026-11)
   ------------------------------------------------------------
   El coach guarda un bloque escrito (texto libre / Pizarra) como «mi preset» y lo reusa:
     · «Guardar como preset» debajo del texto de cada bloque (pide el nombre; mismo nombre = se actualiza)
     · «Desde preset» junto a AGREGAR BLOQUE y en Ctrl + K: inserta el bloque completo (ejercicios, dosis, tips y objetivo) con un id nuevo
     · «/» en el texto de un bloque: los presets aparecen junto a las plantillas (biset, triset…) e insertan sus renglones
     · panel de presets: buscar, usar y borrar
   CLAVE NUEVA Y SEPARADA, aprobada por el coach: localStorage «coachjp_presets_v1»
     { v: 1, t: <última escritura>, presets: [ { id, nombre, tipo: 'bloque', disciplina: 'sports' | 'crossfit',
       bloque: { tipo, sportsPizarra, titulo, category, modalidad, items: [...], tips, objective }   ← copia SIN id
       creado, usos, ultimoUso } ] }
   No entra en los planes, ni en el backup JSON, ni en la nube. Nunca toca un plan guardado: usar un preset solo agrega un bloque nuevo al
   día que se está editando (igual que AGREGAR BLOQUE), con deshacer. API para los tests: window.JPS.
   ============================================================ */
(function(){
  'use strict';
  if(window.JPS) return;
  var CLAVE = 'coachjp_presets_v1', MAX = 200;

  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function plano(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function nz(s){ return plano(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function aviso(t, k){ try{ if(typeof window.toast === 'function') window.toast(t, k); }catch(e){} }
  function V(){ return document.getElementById('v-builder'); }
  function planActivo(){ try{ return (typeof S !== 'undefined' && S.activeId && typeof window.plan === 'function') ? window.plan(S.activeId) : null; }catch(e){ return null; } }
  function disciplina(){ var p = planActivo(); return p && p.meta && p.meta.mesoDisc === 'crossfit' ? 'crossfit' : 'sports'; }

  /* ---------- la clave ---------- */
  function vacio(){ return { v: 1, t: 0, presets: [] }; }
  function leer(){
    try{ var raw = window.localStorage.getItem(CLAVE); if(!raw) return vacio(); var o = JSON.parse(raw); return (o && Array.isArray(o.presets)) ? o : vacio(); }
    catch(e){ return vacio(); }
  }
  function escribir(o){
    try{ window.localStorage.setItem(CLAVE, JSON.stringify({ v: 1, t: Date.now(), presets: o.presets })); return true; }
    catch(e){ aviso('No se pudo guardar el preset (almacenamiento lleno)', 'err'); return false; }
  }
  function nuevoId(){ return 'pr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function copiaBloque(b){
    return { tipo: b.tipo || 'list', sportsPizarra: !!b.sportsPizarra, titulo: String(b.titulo || ''), category: String(b.category || ''), modalidad: String(b.modalidad || ''),
      items: (b.items || []).map(function(x){ return String(x); }), tips: String(b.tips || ''), objective: String(b.objective || '') };
  }

  /* ---------- guardar / usar / borrar ---------- */
  function guardarPreset(bid, nombre){
    var b = null; try{ b = window.findBlock(bid); }catch(e){}
    if(!b || !Array.isArray(b.items) || !b.items.length){ aviso('Solo se guardan como preset los bloques escritos como texto', 'warn'); return null; }
    nombre = plano(nombre) || plano(b.titulo) || 'Preset';
    var o = leer(), ya = o.presets.filter(function(x){ return nz(x.nombre) === nz(nombre); })[0];
    if(ya){ ya.bloque = copiaBloque(b); ya.disciplina = disciplina(); }
    else {
      if(o.presets.length >= MAX){ aviso('Llegaste al tope de ' + MAX + ' presets: borrá alguno para guardar otro', 'warn'); return null; }
      ya = { id: nuevoId(), nombre: nombre, tipo: 'bloque', disciplina: disciplina(), bloque: copiaBloque(b), creado: Date.now(), usos: 0, ultimoUso: 0 };
      o.presets.push(ya);
    }
    if(!escribir(o)) return null;
    sincronizarBarra(); pintarPanel();
    aviso('Preset guardado: ' + nombre);
    return ya;
  }
  function usarPreset(id){
    var o = leer(), pr = o.presets.filter(function(x){ return x.id === id; })[0];
    var d = null; try{ d = window.curDay(); }catch(e){}
    if(!pr || !d) return null;
    if(window.CoachUndo && typeof window.CoachUndo.vigilar === 'function') window.CoachUndo.vigilar('Insertar preset ' + pr.nombre);
    var src = pr.bloque || {}, nb = window.newBlock(src.tipo || 'list');
    nb.sportsPizarra = !!src.sportsPizarra; nb.titulo = src.titulo || pr.nombre; if(src.category) nb.category = src.category; if(src.modalidad) nb.modalidad = src.modalidad;
    nb.items = (src.items || []).slice(); nb.tips = src.tips || ''; nb.objective = src.objective || '';
    d.bloques.push(nb);
    pr.usos = (+pr.usos || 0) + 1; pr.ultimoUso = Date.now(); escribir(o);
    try{ window.save(); }catch(e){} try{ window.renderBuilder(); }catch(e){}
    aviso('Preset insertado: ' + pr.nombre);
    return nb;
  }
  function borrarPreset(id){
    var o = leer(), n = o.presets.length;
    o.presets = o.presets.filter(function(x){ return x.id !== id; });
    if(o.presets.length === n) return false;
    escribir(o); sincronizarBarra(); pintarPanel();
    return true;
  }

  /* ---------- «/» en el texto del bloque: los presets junto a las plantillas ---------- */
  function slug(s){ return nz(s).replace(/[^a-z]+/g, ''); }      /* el menú de «/» solo reconoce letras después de la barra («/bis» → plantilla Biset y los presets que empiezan con «bis») */
  function sincronizarBarra(){
    var ac = window.jpAutoComp; if(!ac || !Array.isArray(ac.plantillas)) return;
    for(var i = ac.plantillas.length - 1; i >= 0; i--) if(ac.plantillas[i] && ac.plantillas[i].jpPreset) ac.plantillas.splice(i, 1);
    leer().presets.filter(function(p){ return p.disciplina === disciplina(); }).forEach(function(p){
      var tx = (p.bloque && p.bloque.items || []).join('\n');
      ac.plantillas.push({ k: slug(p.nombre) || 'preset', lb: 'Preset · ' + p.nombre, texto: tx, cursor: tx.length, jpPreset: p.id });
    });
  }

  /* ---------- guardar: diálogo con el nombre ---------- */
  function dialogoGuardar(bid){
    var b = null; try{ b = window.findBlock(bid); }catch(e){}
    if(!b) return null;
    var m = document.getElementById('jpsGuardar');
    if(!m){
      m = document.createElement('div'); m.id = 'jpsGuardar'; m.className = 'jpp-modal jps-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Guardar como preset'); m.hidden = true;
      m.innerHTML = '<div class="jpp-modal-c"><div class="jpp-pop-h"><b>Guardar como preset</b><button type="button" data-jps="g-x" aria-label="Cerrar">×</button></div>' +
        '<label class="jps-lb" for="jpsNombre">Nombre del preset</label><input id="jpsNombre" type="text" maxlength="80" autocomplete="off" spellcheck="false">' +
        '<p class="jps-ayuda">Se guarda el bloque completo (ejercicios, dosis, tips y objetivo) en tus presets. Con el mismo nombre se actualiza.</p><div class="jps-res"></div>' +
        '<div class="jpp-pie"><button type="button" class="jpm-b" data-jps="g-x">Cancelar</button><button type="button" class="jpm-b jpp-prim" data-jps="g-ok">Guardar preset</button></div></div>';
      document.body.appendChild(m);
      m.querySelector('#jpsNombre').addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); confirmarGuardar(); } else if(e.key === 'Escape'){ e.preventDefault(); m.hidden = true; } });
    }
    m.setAttribute('data-b', bid);
    var inp = m.querySelector('#jpsNombre'); inp.value = plano(b.titulo) || 'Mi preset';
    var res = m.querySelector('.jps-res'), r = (window.JPB && window.JPB.resumenBloque) ? window.JPB.resumenBloque(b) : '';
    res.textContent = r; res.hidden = !r;
    m.hidden = false;
    try{ inp.focus(); inp.select(); }catch(e){}
    return m;
  }
  function confirmarGuardar(){
    var m = document.getElementById('jpsGuardar'); if(!m) return null;
    var pr = guardarPreset(m.getAttribute('data-b'), m.querySelector('#jpsNombre').value);
    if(pr) m.hidden = true;
    return pr;
  }

  /* ---------- panel de presets ---------- */
  var PANEL = { q: '', borrar: '' };
  function pintarPanel(){
    var m = document.getElementById('jpsPanel'); if(!m || m.hidden) return;
    var todos = leer().presets.filter(function(p){ return p.disciplina === disciplina(); }), toks = nz(PANEL.q).split(' ').filter(Boolean);
    var vis = todos.filter(function(p){ var s = nz(p.nombre + ' ' + (p.bloque && p.bloque.items || []).join(' ')); return toks.every(function(t){ return s.indexOf(t) >= 0; }); })
      .sort(function(a, b){ return (b.ultimoUso || b.creado || 0) - (a.ultimoUso || a.creado || 0); });
    var h = vis.length ? vis.map(function(p){
      var r = (window.JPB && window.JPB.resumenBloque) ? window.JPB.resumenBloque(p.bloque) : '';
      return '<div class="jps-i" data-id="' + esc(p.id) + '"><div class="jps-i-t"><b>' + esc(p.nombre) + '</b>' + (r ? '<small>' + esc(r) + '</small>' : '') + '<em>' + (p.usos ? p.usos + (p.usos === 1 ? ' uso' : ' usos') : 'sin usar') + '</em></div>' +
        '<button type="button" class="jpm-b" data-jps="usar" data-id="' + esc(p.id) + '">Usar</button><button type="button" class="jpm-b jps-del' + (PANEL.borrar === p.id ? ' on' : '') + '" data-jps="borrar" data-id="' + esc(p.id) + '">' + (PANEL.borrar === p.id ? '¿Borrar?' : 'Borrar') + '</button></div>';
    }).join('') : '<p class="jps-v">' + (todos.length ? 'Ningún preset coincide.' : 'Todavía no guardaste presets. Abrí un bloque escrito y tocá «Guardar como preset».') + '</p>';
    m.querySelector('.jps-l').innerHTML = h;
    m.querySelector('.jps-n').textContent = todos.length + (todos.length === 1 ? ' preset' : ' presets');
  }
  function panel(ab){
    var m = document.getElementById('jpsPanel');
    if(!m){
      m = document.createElement('div'); m.id = 'jpsPanel'; m.className = 'jpp-modal jps-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Presets del coach'); m.hidden = true;
      m.innerHTML = '<div class="jpp-modal-c"><div class="jpp-pop-h"><b>Mis presets <span class="jps-n"></span></b><button type="button" data-jps="p-x" aria-label="Cerrar">×</button></div>' +
        '<input type="search" class="jps-q" placeholder="Buscar por nombre o ejercicio…" aria-label="Buscar preset" autocomplete="off" spellcheck="false"><div class="jps-l"></div>' +
        '<p class="jps-ayuda">«Usar» agrega el bloque al final del día que estás editando (se puede deshacer). En el texto de un bloque, «/» también los ofrece junto a las plantillas.</p></div>';
      document.body.appendChild(m);
      m.querySelector('.jps-q').addEventListener('input', function(){ PANEL.q = this.value; PANEL.borrar = ''; pintarPanel(); });
      m.querySelector('.jps-q').addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.preventDefault(); panel(false); } });
    }
    ab = ab == null ? m.hidden : !!ab;
    m.hidden = !ab;
    if(ab){ PANEL.q = ''; PANEL.borrar = ''; m.querySelector('.jps-q').value = ''; pintarPanel(); try{ m.querySelector('.jps-q').focus(); }catch(e){} }
    return m;
  }

  /* ---------- botones en el Builder ---------- */
  function aplicar(){
    var acc = document.querySelector('#dayPanel .jp-dayactions');
    if(acc && !acc.querySelector('[data-jps="panel"]')){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn jps-desde'; b.setAttribute('data-jps', 'panel'); b.textContent = 'Desde preset';
      b.title = 'Agrega un bloque desde tus presets guardados';
      var ref = acc.querySelector('[data-addsportsblock], [data-add]'); if(ref && ref.nextSibling) acc.insertBefore(b, ref.nextSibling); else acc.appendChild(b);
    }
    [].forEach.call(document.querySelectorAll('#dayPanel .block'), function(el){
      var ta = el.querySelector('textarea[data-bf="items"]'); if(!ta) return;
      var id = ta.getAttribute('data-b'), ref = ta.parentNode.querySelector(':scope > .jpm-dosis') || ta;
      var fila = ta.parentNode.querySelector(':scope > .jps-row');
      if(!fila){ fila = document.createElement('div'); fila.className = 'jps-row'; fila.innerHTML = '<button type="button" class="jpm-b" data-jps="guardar">Guardar como preset</button>'; }
      fila.querySelector('[data-jps="guardar"]').setAttribute('data-b', id);
      if(fila.previousSibling !== ref) ref.parentNode.insertBefore(fila, ref.nextSibling);
    });
    if(!aplicar.__sync){ aplicar.__sync = 1; sincronizarBarra(); }
  }
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target : null; if(!t) return;
    if(t.id === 'jpsPanel'){ panel(false); return; }
    if(t.id === 'jpsGuardar'){ t.hidden = true; return; }
    var m = t.closest('[data-jps]'); if(!m) return;
    var k = m.getAttribute('data-jps');
    if(k === 'panel') panel(true);
    else if(k === 'p-x') panel(false);
    else if(k === 'guardar') dialogoGuardar(m.getAttribute('data-b'));
    else if(k === 'g-x'){ var g = document.getElementById('jpsGuardar'); if(g) g.hidden = true; }
    else if(k === 'g-ok') confirmarGuardar();
    else if(k === 'usar'){ panel(false); usarPreset(m.getAttribute('data-id')); }
    else if(k === 'borrar'){ var id = m.getAttribute('data-id'); if(PANEL.borrar === id){ PANEL.borrar = ''; borrarPreset(id); } else { PANEL.borrar = id; pintarPanel(); } }
  });

  /* Ctrl + K: el panel y cada preset como comando */
  function comandos(){
    var out = [{ g: 'Acción', t: 'Mis presets…', run: function(){ panel(true); } }];
    leer().presets.filter(function(p){ return p.disciplina === disciplina(); }).forEach(function(p){ out.push({ g: 'Preset', t: p.nombre, run: function(){ usarPreset(p.id); } }); });
    return out;
  }

  var obs = null, pend = 0, discUlt = '';
  function correr(){
    pend = 0;
    if(obs) obs.disconnect();
    try{ aplicar(); var dsc = disciplina(); if(dsc !== discUlt){ discUlt = dsc; sincronizarBarra(); } }catch(e){ console.warn('presets', e); }
    var v = V(); if(obs && v) obs.observe(v, { childList: true, subtree: true });
  }
  function programar(){ if(!pend) pend = setTimeout(correr, 120); }
  function montar(){
    if(!V()) return;
    if(!obs && window.MutationObserver) obs = new MutationObserver(programar);
    if(window.JPP && typeof window.JPP.sumarComandos === 'function' && !montar.__cmd){ montar.__cmd = 1; window.JPP.sumarComandos(comandos); }
    correr();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  [800, 2500, 6000].forEach(function(ms){ setTimeout(function(){ montar(); }, ms); });
  window.JPS = { CLAVE: CLAVE, leer: leer, guardarPreset: guardarPreset, usarPreset: usarPreset, borrarPreset: borrarPreset, panel: panel, dialogoGuardar: dialogoGuardar,
    confirmarGuardar: confirmarGuardar, sincronizarBarra: sincronizarBarra, comandos: comandos };
})();
